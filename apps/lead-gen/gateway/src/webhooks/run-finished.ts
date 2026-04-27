/**
 * POST /internal/run-finished — LangGraph backend callback.
 *
 * Replaces the deleted Vercel webhook at /api/webhooks/langgraph. Verifies
 * the global GATEWAY_HMAC, flips the productIntelRuns row, patches the
 * matching products jsonb column on success, and pushes the terminal event
 * to subscribed WebSocket clients via the JobPubSub Durable Object.
 *
 * Idempotent: a second call on a terminal row is a no-op (status check up
 * front before the UPDATE).
 */

import { eq } from "drizzle-orm";
import { verifyHmac } from "../auth";
import { getDb } from "../db/client";
import { products, productIntelRuns } from "../db/schema";
import { publishToPubSub } from "../graphql/pubsub-publish";
import type { GatewayEnv } from "../graphql/context";

interface WebhookBody {
  appRunId: string;
  status: "success" | "error";
  error?: string;
  output?: Record<string, unknown>;
}

const PRIVATE_OUTPUT_KEYS = new Set([
  "webhook_url",
  "webhook_secret",
  "app_run_id",
  "langsmith_trace_url",
  "langsmith_run_id",
  "tenant_id",
  "lg_run_id",
  "lg_thread_id",
]);

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!PRIVATE_OUTPUT_KEYS.has(k)) out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

export async function handleRunFinished(
  req: Request,
  env: GatewayEnv,
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const bodyText = await req.text();
  const ok = await verifyHmac(
    bodyText,
    req.headers.get("x-signature"),
    env.GATEWAY_HMAC,
  );
  if (!ok) return new Response("Unauthorized", { status: 401 });

  let payload: WebhookBody;
  try {
    payload = JSON.parse(bodyText) as WebhookBody;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  if (!payload.appRunId || (payload.status !== "success" && payload.status !== "error")) {
    return new Response("Bad payload", { status: 400 });
  }

  const db = getDb(env.NEON_DATABASE_URL);

  const [run] = await db
    .select()
    .from(productIntelRuns)
    .where(eq(productIntelRuns.id, payload.appRunId))
    .limit(1);

  if (!run) {
    return new Response(JSON.stringify({ error: "unknown run" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  // Idempotency — terminal rows do not flip again.
  if (
    run.status === "success" ||
    run.status === "error" ||
    run.status === "timeout"
  ) {
    return Response.json({ ok: true, noop: true });
  }

  const finishedAt = new Date();
  const safeOutput = payload.output
    ? (sanitize(payload.output) as Record<string, unknown>)
    : null;

  await db
    .update(productIntelRuns)
    .set({
      status: payload.status,
      finished_at: finishedAt,
      error: payload.error ?? null,
      output: safeOutput,
    })
    .where(eq(productIntelRuns.id, payload.appRunId));

  if (payload.status === "success" && safeOutput) {
    const nowIso = finishedAt.toISOString();
    const patch: Record<string, unknown> = { updated_at: finishedAt };
    switch (run.kind) {
      case "pricing":
        patch.pricing_analysis =
          (safeOutput as { pricing?: unknown }).pricing ?? safeOutput;
        patch.pricing_analyzed_at = nowIso;
        break;
      case "gtm":
        patch.gtm_analysis =
          (safeOutput as { gtm?: unknown }).gtm ?? safeOutput;
        patch.gtm_analyzed_at = nowIso;
        break;
      case "product_intel":
        patch.intel_report =
          (safeOutput as { report?: unknown }).report ?? safeOutput;
        patch.intel_report_at = nowIso;
        break;
      case "icp":
        patch.icp_analysis =
          (safeOutput as { icp?: unknown }).icp ?? safeOutput;
        patch.icp_analyzed_at = nowIso;
        break;
    }
    await db.update(products).set(patch).where(eq(products.id, run.product_id));
  }

  await publishToPubSub(env, {
    productId: run.product_id,
    kind: run.kind,
    intelRun: {
      id: payload.appRunId,
      productId: run.product_id,
      kind: run.kind,
      status: payload.status,
      startedAt: run.started_at.toISOString(),
      finishedAt: finishedAt.toISOString(),
      error: payload.error ?? null,
    },
  });

  return Response.json({ ok: true });
}

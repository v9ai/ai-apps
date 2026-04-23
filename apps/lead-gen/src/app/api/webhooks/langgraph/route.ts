/**
 * Webhook endpoint invoked by the backend LangGraph container when an async
 * run finishes. The graph's `notify_complete` node (see
 * `backend/leadgen_agent/notify.py`) POSTs the final output signed with an
 * HMAC-SHA256 over the raw JSON body, keyed on the per-run secret stored in
 * `product_intel_runs.webhook_secret`.
 *
 * Responsibilities:
 *  - Verify the signature with `timingSafeEqual` against the per-run secret
 *  - Flip the `product_intel_runs` row to `success` / `error`
 *  - For `success`, patch the corresponding products jsonb column
 *    (pricing_analysis / gtm_analysis / intel_report / icp_analysis)
 *  - Be idempotent: a second call on a terminal row is a no-op
 *
 * The graph already writes the same jsonb to `products` from its own asyncpg
 * node (before the webhook fires), so webhook loss is non-fatal — the
 * `product_intel_runs` status stays `running` until the sweeper cron marks it
 * `timeout`. UI polling then either sees `success` (preferred) or `timeout`.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  productIntelRuns,
  productIntelRunSecrets,
  products,
} from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

type WebhookBody = {
  status: "success" | "error";
  error?: string;
  output?: Record<string, unknown>;
};

// Keys that must never end up in a publicly-readable jsonb column. The graphs
// also scrub them on their own write-back path (backend/leadgen_agent/notify.py
// builds the payload from a whitelist), but defense-in-depth here too.
const PRIVATE_KEYS = new Set([
  "webhook_url",
  "webhook_secret",
  "app_run_id",
  "langsmith_trace_url",
  "langsmith_run_id",
  "tenant_id",
  "lg_run_id",
  "lg_thread_id",
]);

function sanitize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sanitize);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([k]) => !PRIVATE_KEYS.has(k))
        .map(([k, val]) => [k, sanitize(val)]),
    );
  }
  return v;
}

export async function POST(req: NextRequest) {
  const body = await req.text(); // raw bytes — must match what the graph signed
  const signature = req.headers.get("x-app-signature") ?? "";
  const appRunId = req.headers.get("x-app-run-id") ?? "";

  if (!appRunId || !signature) {
    return NextResponse.json({ error: "missing headers" }, { status: 400 });
  }

  const [run] = await db
    .select()
    .from(productIntelRuns)
    .where(eq(productIntelRuns.id, appRunId))
    .limit(1);

  // Secret now lives in a sibling table hidden from public_read RLS
  // (migration 0061). Fall back to the legacy column for rows created before
  // the dual-write deploy; a follow-up migration drops that column.
  const [secretRow] = await db
    .select()
    .from(productIntelRunSecrets)
    .where(eq(productIntelRunSecrets.run_id, appRunId))
    .limit(1);
  const secret = secretRow?.secret ?? run?.webhook_secret ?? null;

  if (!run || !secret) {
    return NextResponse.json({ error: "unknown run" }, { status: 404 });
  }

  // Timing-safe HMAC verification against the per-run secret
  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (
    sigBuf.length !== expBuf.length ||
    !timingSafeEqual(sigBuf, expBuf)
  ) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let payload: WebhookBody;
  try {
    payload = JSON.parse(body) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  // Idempotency: ignore a second callback on an already-terminal run.
  if (
    run.status === "success" ||
    run.status === "error" ||
    run.status === "timeout"
  ) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const safeOutput = payload.output
    ? (sanitize(payload.output) as Record<string, unknown>)
    : null;

  await db
    .update(productIntelRuns)
    .set({
      status: payload.status,
      finished_at: now,
      error: payload.error ?? null,
      output: safeOutput,
    })
    .where(eq(productIntelRuns.id, appRunId));

  if (payload.status === "success" && safeOutput) {
    const patch: Record<string, unknown> = { updated_at: nowIso };
    switch (run.kind) {
      case "pricing":
        patch.pricing_analysis =
          (safeOutput as { pricing?: unknown }).pricing ?? safeOutput;
        patch.pricing_analyzed_at = nowIso;
        break;
      case "gtm":
        patch.gtm_analysis = (safeOutput as { gtm?: unknown }).gtm ?? safeOutput;
        patch.gtm_analyzed_at = nowIso;
        break;
      case "product_intel":
        patch.intel_report =
          (safeOutput as { report?: unknown }).report ?? safeOutput;
        patch.intel_report_at = nowIso;
        break;
      case "icp":
        patch.icp_analysis = (safeOutput as { icp?: unknown }).icp ?? safeOutput;
        patch.icp_analyzed_at = nowIso;
        break;
    }
    await db
      .update(products)
      .set(patch)
      .where(eq(products.id, run.product_id));
  }

  return NextResponse.json({ ok: true });
}

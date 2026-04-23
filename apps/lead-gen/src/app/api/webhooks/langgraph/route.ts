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
import { productIntelRuns, products } from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

type WebhookBody = {
  status: "success" | "error";
  error?: string;
  output?: Record<string, unknown>;
};

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

  if (!run) {
    return NextResponse.json({ error: "unknown run" }, { status: 404 });
  }

  // Timing-safe HMAC verification against the per-run secret
  const expected = createHmac("sha256", run.webhook_secret)
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

  await db
    .update(productIntelRuns)
    .set({
      status: payload.status,
      finished_at: now,
      error: payload.error ?? null,
      output: (payload.output ?? null) as Record<string, unknown> | null,
    })
    .where(eq(productIntelRuns.id, appRunId));

  if (payload.status === "success" && payload.output) {
    const out = payload.output;
    const patch: Record<string, unknown> = { updated_at: nowIso };
    switch (run.kind) {
      case "pricing":
        patch.pricing_analysis = (out as { pricing?: unknown }).pricing ?? out;
        patch.pricing_analyzed_at = nowIso;
        break;
      case "gtm":
        patch.gtm_analysis = (out as { gtm?: unknown }).gtm ?? out;
        patch.gtm_analyzed_at = nowIso;
        break;
      case "product_intel":
        patch.intel_report = (out as { report?: unknown }).report ?? out;
        patch.intel_report_at = nowIso;
        break;
      case "icp":
        patch.icp_analysis = (out as { icp?: unknown }).icp ?? out;
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

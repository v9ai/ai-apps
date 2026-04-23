/**
 * Cron sweeper for stale product_intel_runs. Runs every 5 min; marks any row
 * in `running` status older than 15 min as `timeout`.
 *
 * Why this exists: the CF Container posting back to /api/webhooks/langgraph
 * is best-effort — if the container crashed between writing to Neon and
 * posting the webhook, the run row would sit in `running` forever. This
 * sweeper closes the UI loop so polling clients don't hang.
 *
 * The graph's own write to `products.pricing_analysis` (etc.) happens inside
 * the graph's asyncpg transaction before the webhook fires, so a `timeout`
 * here does NOT mean data loss — the analysis jsonb may still be present on
 * the products row.
 */

import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { productIntelRuns } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const now = new Date();

  const rows = await db
    .update(productIntelRuns)
    .set({
      status: "timeout",
      finished_at: now,
      error: "sweeper: exceeded 15min",
    })
    .where(
      and(
        eq(productIntelRuns.status, "running"),
        lt(productIntelRuns.started_at, cutoff),
      ),
    )
    .returning({ id: productIntelRuns.id });

  return Response.json({ swept: rows.length, cutoff: cutoff.toISOString() });
}

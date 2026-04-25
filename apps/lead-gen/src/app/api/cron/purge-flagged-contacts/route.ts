/**
 * Deletion-sweep cron route.
 *
 * Hard-deletes contacts that were soft-flagged (`to_be_deleted = true`)
 * at least 30 days ago. The grace period gives admins time to review
 * and unflag false positives via the admin UI.
 *
 * Schedule (Vercel cron): `0 4 * * 0` — Sunday 04:00 UTC.
 * Cap: 2000 deletions per run, in batches of 500.
 * Audit: writes a summary row to `crawl_logs`.
 */

import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, crawlLogs } from "@/db/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

const MAX_PER_RUN = 2000;
const BATCH_SIZE = 500;

export async function GET(req: Request) {
  // Verify cron secret (matches `followup-scheduler` pattern).
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();

  // 30-day grace predicate. `deletion_flagged_at` is stored as `text`
  // (ISO-8601 from `now()::text` or app code), so cast to `timestamptz`.
  const gracePredicate = and(
    eq(contacts.to_be_deleted, true),
    sql`${contacts.deletion_flagged_at} IS NOT NULL`,
    sql`${contacts.deletion_flagged_at}::timestamptz < NOW() - INTERVAL '30 days'`,
  );

  // Pull up to MAX_PER_RUN candidate IDs in one query, then delete in
  // batches of BATCH_SIZE to keep individual transactions small.
  const candidates = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(gracePredicate)
    .limit(MAX_PER_RUN);

  let deleted = 0;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batchIds = candidates.slice(i, i + BATCH_SIZE).map((r) => r.id);
    if (batchIds.length === 0) break;
    const result = await db
      .delete(contacts)
      .where(inArray(contacts.id, batchIds))
      .returning({ id: contacts.id });
    deleted += result.length;
  }

  const completedAt = new Date().toISOString();
  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

  // Audit row in `crawl_logs`. The table is reused as the closest existing
  // audit/log table; sentinel values populate the notNull columns.
  await db.insert(crawlLogs).values({
    seed_url: "cron://purge-flagged-contacts",
    company_slug: "__deletion_sweep__",
    status: "completed",
    saved: 0,
    skipped: 0,
    filtered: deleted,
    targets: candidates.length,
    visited: candidates.length,
    duration_ms: durationMs,
    entries: JSON.stringify({
      job: "purge-flagged-contacts",
      deleted_count: deleted,
      batch_size: BATCH_SIZE,
      max_per_run: MAX_PER_RUN,
      ran_at: startedAt,
    }),
    started_at: startedAt,
    completed_at: completedAt,
  });

  return NextResponse.json({ ok: true, deleted });
}

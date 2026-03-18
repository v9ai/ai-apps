/**
 * Cloudflare Workers Janitor — ATS Pipeline Orchestrator
 *
 * Runs daily at midnight UTC. Three automatic phases:
 *   1. Sync   — pull new boards from greenhouse_boards / lever_boards / ashby_boards
 *               into the unified job_sources table (INSERT ... ON CONFLICT DO NOTHING).
 *   2. Cleanup — remove dead sources (consecutive_errors >= 5) and archive their jobs.
 *   3. Ingest  — trigger insert-jobs worker to fetch jobs from all stale sources.
 */

import { neon } from "@neondatabase/serverless";
import { log, generateTraceId } from "./lib/logger";

const WORKER = "janitor";

interface Env {
  NEON_DATABASE_URL: string;
  APP_URL: string;
  CRON_SECRET?: string;
  INGESTION_QUEUE?: Queue<{ action: "ingest"; maxSources: number }>;
  INSERT_JOBS_URL?: string;
}

type Queue<T = unknown> = { send(message: T): Promise<void> };
type ScheduledEvent = { scheduledTime: number; cron: string };
type ExecutionContext = { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void };

type JobSource = {
  kind: string;
  company_key: string;
  canonical_url: string | null;
  first_seen_at: string;
  last_synced_at: string | null;
};

async function syncNewBoards(
  sql: ReturnType<typeof neon>,
  traceId: string,
): Promise<{ added: number }> {
  // Greenhouse: filter tokens where >40% chars are digits (spam boards)
  const [ghResult, leverResult, ashbyResult] = await Promise.all([
    sql`
      INSERT INTO job_sources (kind, company_key, canonical_url, first_seen_at)
      SELECT 'greenhouse', token, url, first_seen
      FROM greenhouse_boards
      WHERE is_active = true
        AND LENGTH(REGEXP_REPLACE(token, '[0-9]', '', 'g')) > LENGTH(token) * 0.6
      ON CONFLICT (kind, company_key) DO NOTHING
    `,
    sql`
      INSERT INTO job_sources (kind, company_key, canonical_url, first_seen_at)
      SELECT 'lever', site, url, first_seen
      FROM lever_boards
      WHERE is_active = true
      ON CONFLICT (kind, company_key) DO NOTHING
    `,
    sql`
      INSERT INTO job_sources (kind, company_key, canonical_url, first_seen_at)
      SELECT 'ashby', board_name, 'https://jobs.ashbyhq.com/' || board_name, created_at
      FROM ashby_boards
      WHERE is_active = true
      ON CONFLICT (kind, company_key) DO NOTHING
    `,
  ]);

  const added =
    ((ghResult as unknown as { rowCount?: number }).rowCount ?? 0) +
    ((leverResult as unknown as { rowCount?: number }).rowCount ?? 0) +
    ((ashbyResult as unknown as { rowCount?: number }).rowCount ?? 0);

  if (added > 0) {
    log({ worker: WORKER, action: "sync-boards", level: "info", traceId, metadata: { added } });
  }
  return { added };
}

async function purgeSpamBoards(
  sql: ReturnType<typeof neon>,
  traceId: string,
): Promise<{ purged: number; jobsArchived: number }> {
  const spamRows = await sql<{ id: number; kind: string; company_key: string }>`
    SELECT id, kind, company_key FROM job_sources
    WHERE LENGTH(REGEXP_REPLACE(company_key, '[0-9]', '', 'g')) <= LENGTH(company_key) * 0.6
  `;
  if (spamRows.length === 0) return { purged: 0, jobsArchived: 0 };

  let jobsArchived = 0;
  for (const source of spamRows) {
    log({ worker: WORKER, action: "spam-board-found", level: "warn", traceId,
      metadata: { sourceId: source.id, kind: source.kind, companyKey: source.company_key } });
    const r = await sql`
      UPDATE jobs SET status = 'archived', updated_at = NOW()::text
      WHERE source_id = ${String(source.id)} AND status NOT IN ('reported', 'archived')
    `;
    jobsArchived += (r as unknown as { rowCount?: number }).rowCount ?? 0;
    await sql`DELETE FROM job_sources WHERE id = ${source.id}`;
  }

  log({ worker: WORKER, action: "spam-board-purge", level: "info", traceId,
    metadata: { purged: spamRows.length, jobsArchived } });
  return { purged: spamRows.length, jobsArchived };
}

async function cleanupDeadBoards(
  sql: ReturnType<typeof neon>,
  traceId: string,
  threshold = 5,
): Promise<{ deactivated: number; jobsArchived: number }> {
  const dead = await sql<{ id: number; kind: string; company_key: string }>`
    SELECT id, kind, company_key FROM job_sources WHERE consecutive_errors >= ${threshold}
  `;
  if (dead.length === 0) return { deactivated: 0, jobsArchived: 0 };

  let jobsArchived = 0;
  for (const source of dead) {
    log({ worker: WORKER, action: "dead-board-found", level: "warn", traceId,
      metadata: { sourceId: source.id, kind: source.kind, companyKey: source.company_key } });
    const r = await sql`
      UPDATE jobs SET status = 'archived', updated_at = NOW()::text
      WHERE source_id = ${String(source.id)} AND status NOT IN ('reported', 'archived')
    `;
    jobsArchived += (r as unknown as { rowCount?: number }).rowCount ?? 0;
    await sql`DELETE FROM job_sources WHERE id = ${source.id}`;
  }

  log({ worker: WORKER, action: "dead-board-cleanup", level: "info", traceId,
    metadata: { deactivated: dead.length, jobsArchived } });
  return { deactivated: dead.length, jobsArchived };
}

async function getSourceStats(sql: ReturnType<typeof neon>) {
  const [totalRows, staleRows, kindRows] = await Promise.all([
    sql<{ count: string }>`SELECT COUNT(*) as count FROM job_sources`,
    sql<{ count: string }>`
      SELECT COUNT(*) as count FROM job_sources
      WHERE last_synced_at IS NULL OR last_synced_at < (NOW() - INTERVAL '24 hours')::text
    `,
    sql<{ kind: string; count: string }>`SELECT kind, COUNT(*) as count FROM job_sources GROUP BY kind`,
  ]);
  const byKind: Record<string, number> = {};
  for (const row of kindRows) byKind[row.kind] = Number(row.count);
  return { total: Number(totalRows[0]?.count ?? 0), stale: Number(staleRows[0]?.count ?? 0), byKind };
}

async function triggerIngestion(env: Env, sourceCount: number, traceId: string): Promise<void> {
  if (env.INSERT_JOBS_URL) {
    try {
      const res = await fetch(`${env.INSERT_JOBS_URL}/ingest?limit=${sourceCount}`, {
        method: "GET",
        headers: { Accept: "application/json", "X-Trace-Id": traceId },
      });
      if (res.ok) {
        const data = (await res.json()) as { stats?: { jobsInserted?: number } };
        log({ worker: WORKER, action: "trigger-ingestion", level: "info", traceId,
          metadata: { method: "http", jobsInserted: data.stats?.jobsInserted ?? 0 } });
        return;
      }
    } catch (err) {
      log({ worker: WORKER, action: "trigger-ingestion", level: "error", traceId,
        error: err instanceof Error ? err.message : String(err), metadata: { method: "http" } });
    }
  }
  log({ worker: WORKER, action: "trigger-ingestion", level: "info", traceId,
    metadata: { method: "deferred", reason: "No INSERT_JOBS_URL configured" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const sql = neon(env.NEON_DATABASE_URL);

    if (url.pathname === "/health") {
      try {
        const stats = await getSourceStats(sql);
        return new Response(JSON.stringify({ status: "healthy", ...stats }),
          { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ status: "unhealthy", error: String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    if (url.pathname === "/sources") {
      const limit = Number(url.searchParams.get("limit") || "100");
      const kind = url.searchParams.get("kind");
      const sources = kind
        ? await sql<JobSource>`SELECT * FROM job_sources WHERE kind = ${kind} ORDER BY first_seen_at DESC LIMIT ${limit}`
        : await sql<JobSource>`SELECT * FROM job_sources ORDER BY first_seen_at DESC LIMIT ${limit}`;
      return new Response(JSON.stringify({ sources, count: sources.length }),
        { headers: { "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ message: "ATS pipeline orchestrator. Endpoints: /health, /sources" }),
      { headers: { "Content-Type": "application/json" } },
    );
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const traceId = generateTraceId();
    const start = Date.now();
    const sql = neon(env.NEON_DATABASE_URL);

    log({ worker: WORKER, action: "scheduled-start", level: "info", traceId });

    try {
      const sync = await syncNewBoards(sql, traceId);
      const spamPurge = await purgeSpamBoards(sql, traceId);
      const cleanup = await cleanupDeadBoards(sql, traceId);
      const stats = await getSourceStats(sql);

      log({ worker: WORKER, action: "source-stats", level: "info", traceId,
        metadata: { ...stats, newBoardsSynced: sync.added, spamBoardsPurged: spamPurge.purged,
          spamJobsArchived: spamPurge.jobsArchived, deadBoardsRemoved: cleanup.deactivated,
          jobsArchived: cleanup.jobsArchived } });

      if (stats.stale > 0) {
        ctx.waitUntil(triggerIngestion(env, stats.stale, traceId));
      } else {
        log({ worker: WORKER, action: "no-stale-sources", level: "info", traceId });
      }

      await sql`
        UPDATE job_sources SET last_synced_at = NOW()::text
        WHERE last_synced_at IS NULL OR last_synced_at < (NOW() - INTERVAL '24 hours')::text
      `;

      log({ worker: WORKER, action: "scheduled-complete", level: "info", traceId,
        duration_ms: Date.now() - start,
        metadata: { newBoardsSynced: sync.added, deadBoardsRemoved: cleanup.deactivated,
          jobsArchived: cleanup.jobsArchived } });
    } catch (error) {
      log({ worker: WORKER, action: "scheduled-failed", level: "error", traceId,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - start });
      throw error;
    }
  },
};

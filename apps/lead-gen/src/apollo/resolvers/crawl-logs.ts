import { eq, desc } from "drizzle-orm";
import { crawlLogs } from "@/db/schema";
import type { GraphQLContext } from "../context";

export const crawlLogResolvers = {
  Query: {
    async crawlLogs(
      _parent: unknown,
      args: { limit?: number | null; offset?: number | null },
      context: GraphQLContext,
    ) {
      const limit = Math.min(args.limit ?? 50, 200);
      const offset = args.offset ?? 0;
      const rows = await context.db
        .select()
        .from(crawlLogs)
        .orderBy(desc(crawlLogs.started_at))
        .limit(limit)
        .offset(offset);

      return rows.map(mapRow);
    },

    async crawlLog(
      _parent: unknown,
      args: { id: number },
      context: GraphQLContext,
    ) {
      const rows = await context.db
        .select()
        .from(crawlLogs)
        .where(eq(crawlLogs.id, args.id))
        .limit(1);

      return rows[0] ? mapRow(rows[0]) : null;
    },
  },

  Mutation: {
    async saveCrawlLog(
      _parent: unknown,
      args: { input: SaveCrawlLogInput },
      context: GraphQLContext,
    ) {
      try {
        const { input } = args;
        const result = await context.db
          .insert(crawlLogs)
          .values({
            seed_url: input.seedUrl,
            company_slug: input.companySlug,
            status: input.status as "running" | "completed" | "cancelled" | "error",
            saved: input.saved,
            skipped: input.skipped,
            filtered: input.filtered,
            targets: input.targets,
            visited: input.visited,
            total_remote_jobs: input.totalRemoteJobs ?? 0,
            duration_ms: input.durationMs,
            entries: JSON.stringify(input.entries),
            error: input.error ?? null,
            started_at: input.startedAt,
            completed_at: input.completedAt ?? null,
          })
          .returning();

        return {
          success: true,
          crawlLogId: result[0]?.id ?? null,
          error: null,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[saveCrawlLog] Error:", msg);
        return { success: false, crawlLogId: null, error: msg };
      }
    },
  },
};

interface SaveCrawlLogInput {
  seedUrl: string;
  companySlug: string;
  status: string;
  saved: number;
  skipped: number;
  filtered: number;
  targets: number;
  visited: number;
  totalRemoteJobs?: number | null;
  durationMs: number;
  entries: string[];
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

function mapRow(row: typeof crawlLogs.$inferSelect) {
  return {
    id: row.id,
    seedUrl: row.seed_url,
    companySlug: row.company_slug,
    status: row.status,
    saved: row.saved,
    skipped: row.skipped,
    filtered: row.filtered,
    targets: row.targets,
    visited: row.visited,
    totalRemoteJobs: row.total_remote_jobs,
    durationMs: row.duration_ms,
    entries: row.entries ? JSON.parse(row.entries) : null,
    error: row.error,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

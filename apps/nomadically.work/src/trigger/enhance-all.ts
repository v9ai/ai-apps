import { task, schedules, logger } from "@trigger.dev/sdk/v3";
import { sql } from "drizzle-orm";
import { jobs } from "../db/schema";
import { db } from "../db";
import { enhanceJobTask, type EnhanceJobPayload } from "./enhance-job";

/**
 * Shared logic: find un-enhanced Greenhouse/Ashby jobs and fan out
 * to individual enhance-job tasks.
 */
async function findAndEnhanceJobs(limit?: number) {
  const candidates = await db
    .select({
      id: jobs.id,
      source_kind: jobs.source_kind,
      url: jobs.url,
      company_key: jobs.company_key,
      external_id: jobs.external_id,
    })
    .from(jobs)
    .where(
      sql`${jobs.source_kind} IN ('greenhouse', 'ashby')
          AND (${jobs.status} IS NULL OR ${jobs.status} != 'closed')
          AND ${jobs.absolute_url} IS NULL
          AND ${jobs.ashby_department} IS NULL
          AND ${jobs.departments} IS NULL`,
    )
    .limit(limit ?? 500);

  // Filter out Ashby board-level entries (1 path segment = board, 2+ = job)
  const unenhanced = candidates.filter((job) => {
    if (job.source_kind !== "ashby") return true;
    if (job.url !== job.external_id) return true;
    try {
      const parts = new URL(job.url).pathname.split("/").filter(Boolean);
      return parts.length >= 2;
    } catch {
      return false;
    }
  });

  logger.info(`Found ${unenhanced.length} un-enhanced jobs (${candidates.length} candidates)`);

  if (unenhanced.length === 0) {
    return { total: 0, succeeded: 0, failed: 0 };
  }

  const payloads: { payload: EnhanceJobPayload }[] = unenhanced.map((job) => ({
    payload: {
      jobId: job.id,
      source: job.source_kind,
      url: job.url,
      companyKey: job.company_key,
      externalId: job.external_id,
    },
  }));

  const results = await enhanceJobTask.batchTriggerAndWait(payloads);

  const succeeded = results.runs.filter((r) => r.ok).length;
  const failed = results.runs.filter((r) => !r.ok).length;

  logger.info("Enhancement batch complete", { total: unenhanced.length, succeeded, failed });

  return { total: unenhanced.length, succeeded, failed };
}

/**
 * On-demand enhancement — triggered manually (e.g. "Process All Jobs" button).
 */
export const enhanceJobsOnDemand = task({
  id: "enhance-jobs-on-demand",
  maxDuration: 300,
  queue: { concurrencyLimit: 1 },
  run: async (payload: { limit?: number }) => {
    logger.info("Starting on-demand job enhancement scan...");
    return findAndEnhanceJobs(payload.limit);
  },
});

/**
 * Scheduled enhancement — runs every 6 hours, picks up to 200 un-enhanced jobs.
 */
export const enhanceJobsScheduled = schedules.task({
  id: "enhance-jobs-scheduled",
  cron: "0 */6 * * *",
  maxDuration: 300,
  run: async () => {
    logger.info("Starting scheduled job enhancement scan...");
    return findAndEnhanceJobs(200);
  },
});

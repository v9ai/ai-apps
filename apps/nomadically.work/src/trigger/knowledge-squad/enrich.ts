import { task, logger } from "@trigger.dev/sdk/v3";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import { createD1HttpClient } from "../../db/d1-http";
import { jobs } from "../../db/schema";
import { enrichJobListing } from "../../agents/knowledge-squad/enrich";

function getDb() {
  return drizzle(createD1HttpClient() as any);
}

export const enrichJobsBatch = task({
  id: "know-squad-enrich-batch",
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  queue: { concurrencyLimit: 1 },

  run: async (payload: { limit?: number }) => {
    const db = getDb();
    const limit = payload.limit ?? 20;

    logger.info("Starting enrichment batch", { limit });

    const candidates = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        location: jobs.location,
        description: jobs.description,
        ats_data: jobs.ats_data,
      })
      .from(jobs)
      .where(
        sql`${jobs.is_remote_eu} = 1
            AND (${jobs.enrichment_status} IS NULL OR ${jobs.enrichment_status} = 'pending')
            AND ${jobs.description} IS NOT NULL`,
      )
      .limit(limit);

    logger.info(`Found ${candidates.length} jobs to enrich`);

    let enriched = 0;
    let failed = 0;

    for (const job of candidates) {
      try {
        const result = await enrichJobListing({
          jobTitle: job.title,
          location: job.location || "",
          description: job.description || "",
          atsData: job.ats_data || undefined,
        });

        await db
          .update(jobs)
          .set({
            salary_min: result.salaryMin,
            salary_max: result.salaryMax,
            salary_currency: result.salaryCurrency,
            visa_sponsorship: result.visaSponsorship,
            enrichment_status: "enriched" as const,
            updated_at: new Date().toISOString(),
          })
          .where(sql`id = ${job.id}`);

        enriched++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.warn(`Failed to enrich job ${job.id}: ${msg}`);

        await db
          .update(jobs)
          .set({
            enrichment_status: "failed" as const,
            updated_at: new Date().toISOString(),
          })
          .where(sql`id = ${job.id}`);

        failed++;
      }
    }

    logger.info("Enrichment batch complete", {
      total: candidates.length,
      enriched,
      failed,
    });

    return { total: candidates.length, enriched, failed };
  },
});

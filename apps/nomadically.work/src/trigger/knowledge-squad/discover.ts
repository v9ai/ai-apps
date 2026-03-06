import { task, logger } from "@trigger.dev/sdk/v3";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import { createD1HttpClient } from "../../db/d1-http";
import { companies } from "../../db/schema";
import { discoverSources } from "../../agents/knowledge-squad/discover";

function getDb() {
  return drizzle(createD1HttpClient() as any);
}

export const discoverSourcesTask = task({
  id: "know-squad-discover",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  queue: { concurrencyLimit: 1 },

  run: async (_payload: Record<string, never>) => {
    const db = getDb();
    logger.info("Starting source discovery");

    // Get existing company sources for context
    const existingCompanies = await db
      .select({
        name: companies.name,
        jobBoardUrl: companies.job_board_url,
      })
      .from(companies)
      .where(sql`${companies.job_board_url} IS NOT NULL AND ${companies.is_hidden} = 0`)
      .limit(100);

    const existingSources = existingCompanies
      .filter((c) => c.jobBoardUrl)
      .map((c) => `${c.name}: ${c.jobBoardUrl}`);

    const result = await discoverSources({
      existingSources,
      targetRoles: ["AI Engineer", "ML Engineer", "Machine Learning Engineer", "AI/ML Engineer"],
    });

    logger.info("Discovery complete", {
      sourcesFound: result.sources.length,
      recommendations: result.recommendations.length,
    });

    return {
      sources: result.sources,
      recommendations: result.recommendations,
    };
  },
});

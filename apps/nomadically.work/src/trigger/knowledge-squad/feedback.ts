import { task, logger } from "@trigger.dev/sdk/v3";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import { createD1HttpClient } from "../../db/d1-http";
import { applications } from "../../db/schema";
import { analyzeFeedback } from "../../agents/knowledge-squad/feedback";

function getDb() {
  return drizzle(createD1HttpClient() as any);
}

export const feedbackAnalysisTask = task({
  id: "know-squad-feedback",
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
    logger.info("Starting feedback analysis");

    const apps = await db
      .select({
        id: applications.id,
        jobTitle: applications.job_title,
        companyName: applications.company_name,
        status: applications.status,
        strategy: applications.ai_application_strategy,
        createdAt: applications.created_at,
      })
      .from(applications)
      .where(sql`${applications.status} IN ('reviewed', 'rejected', 'accepted')`)
      .limit(50);

    if (apps.length < 3) {
      logger.info("Not enough applications for feedback analysis", { count: apps.length });
      return { analyzed: 0, insights: 0, reason: "insufficient_data" };
    }

    const result = await analyzeFeedback({
      applications: apps.map((a) => ({
        id: a.id,
        jobTitle: a.jobTitle || "Unknown",
        companyName: a.companyName || "Unknown",
        status: a.status,
        strategy: a.strategy || undefined,
        createdAt: a.createdAt,
      })),
    });

    logger.info("Feedback analysis complete", {
      analyzed: result.applicationsAnalyzed,
      insights: result.insights.length,
    });

    return {
      analyzed: result.applicationsAnalyzed,
      insights: result.insights.length,
      summary: result.summary,
    };
  },
});

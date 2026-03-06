import { task, logger } from "@trigger.dev/sdk/v3";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { createD1HttpClient } from "../../db/d1-http";
import { applications, resumes } from "../../db/schema";
import { generateApplicationStrategy } from "../../agents/knowledge-squad/strategy";

function getDb() {
  return drizzle(createD1HttpClient() as any);
}

export interface StrategyPayload {
  applicationId: number;
}

export const generateStrategyTask = task({
  id: "know-squad-strategy",
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  queue: { concurrencyLimit: 3 },

  run: async (payload: StrategyPayload) => {
    const db = getDb();
    logger.info("Generating application strategy", { applicationId: payload.applicationId });

    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, payload.applicationId))
      .limit(1);

    if (!app) {
      logger.warn("Application not found", { id: payload.applicationId });
      return { success: false, reason: "not_found" };
    }

    if (!app.job_description && !app.job_title) {
      logger.warn("Application has no job description or title", { id: payload.applicationId });
      return { success: false, reason: "no_job_data" };
    }

    // Fetch user resume
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.user_id, app.user_email))
      .limit(1);

    const strategy = await generateApplicationStrategy({
      jobTitle: app.job_title || "Unknown",
      companyName: app.company_name || "Unknown",
      jobDescription: app.job_description || app.job_title || "",
      resumeText: resume?.raw_text || "No resume available",
    });

    const strategyWithTimestamp = {
      ...strategy,
      generatedAt: new Date().toISOString(),
    };

    await db
      .update(applications)
      .set({
        ai_application_strategy: JSON.stringify(strategyWithTimestamp),
        updated_at: new Date().toISOString(),
      })
      .where(eq(applications.id, payload.applicationId));

    logger.info("Strategy generated", {
      applicationId: payload.applicationId,
      angles: strategy.coverLetterAngles.length,
      topics: strategy.interviewTopics.length,
    });

    return { success: true, applicationId: payload.applicationId };
  },
});

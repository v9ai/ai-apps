/**
 * Generate Research Task — Trigger.dev
 *
 * Runs the Mastra generateTherapyResearchWorkflow in a durable Trigger.dev task,
 * preventing Vercel serverless timeouts from killing long-running research pipelines.
 *
 * Payload: { jobId, goalId, userId, userEmail }
 *   - jobId:     generation_jobs row ID (already created by the GraphQL resolver)
 *   - goalId:    the therapeutic goal to research
 *   - userId:    Clerk user ID (used as userEmail inside the workflow)
 *   - userEmail: normalized email — the workflow expects this as `userId` param
 */

import { task, logger } from "@trigger.dev/sdk/v3";
import { generateTherapyResearchWorkflow } from "@/src/workflows/generateTherapyResearch.workflow";
import { d1Tools } from "@/src/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerateResearchPayload {
  jobId: string;
  goalId: number;
  /** Clerk userId — passed through for D1 ownership checks */
  userId: string;
  /** Normalized user email — the workflow uses this as its `userId` field */
  userEmail: string;
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const generateResearchTask = task({
  id: "generate-research",
  // Research pipeline can take 5–15 minutes depending on candidate volume
  maxDuration: 900,
  retry: {
    maxAttempts: 1, // Don't retry — each run creates DB rows; re-running would duplicate
  },
  onFailure: async ({
    payload,
    error,
  }: {
    payload: GenerateResearchPayload;
    error: unknown;
  }) => {
    const message =
      error instanceof Error ? error.message : "Research generation failed";
    logger.error("generate-research.job_failed", {
      jobId: payload.jobId,
      goalId: payload.goalId,
      error: message,
    });
    await d1Tools
      .updateGenerationJob(payload.jobId, {
        status: "FAILED",
        error: JSON.stringify({ message }),
      })
      .catch(() => {});
  },
  run: async (payload: GenerateResearchPayload) => {
    const { jobId, goalId, userEmail } = payload;

    logger.info("generate-research.started", { jobId, goalId });

    // The job row was inserted with status='RUNNING' by the GraphQL resolver.
    // No need to update it here — just run the workflow.

    const run = await generateTherapyResearchWorkflow.createRun();
    const result = await run.start({
      inputData: {
        userId: userEmail,
        goalId,
        jobId,
      },
    });

    if (result.status === "success") {
      logger.info("generate-research.succeeded", {
        jobId,
        goalId,
        count: result.result?.count ?? 0,
      });

      await d1Tools.updateGenerationJob(jobId, {
        status: "SUCCEEDED",
        progress: 100,
        result: JSON.stringify(result.result),
      });

      return { success: true, count: result.result?.count ?? 0 };
    } else {
      const reason = `Workflow finished with status: ${result.status}`;
      logger.warn("generate-research.workflow_non_success", {
        jobId,
        goalId,
        status: result.status,
      });

      await d1Tools.updateGenerationJob(jobId, {
        status: "FAILED",
        error: JSON.stringify({ message: reason, details: String(result.status) }),
      });

      throw new Error(reason);
    }
  },
});

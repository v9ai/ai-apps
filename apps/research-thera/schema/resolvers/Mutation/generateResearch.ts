import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const generateResearch: NonNullable<MutationResolvers['generateResearch']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;

  // Verify the goal exists and belongs to the user (only when goalId is provided)
  if (goalId) {
    await d1Tools.getGoal(goalId, userEmail);
  }

  // Clean up any stale RUNNING jobs (stuck > 15 min) before creating a new one
  await d1Tools.cleanupStaleJobs(15);

  // Create a tracking job (inserted with status='RUNNING')
  const jobId = crypto.randomUUID();
  await d1Tools.createGenerationJob(jobId, userEmail, "RESEARCH", goalId);

  const workerUrl = process.env.RESEARCH_WORKER_URL;
  const workerSecret = process.env.RESEARCH_WORKER_SECRET;

  if (workerUrl && workerSecret) {
    // Cloudflare Python Worker pipeline
    try {
      const response = await fetch(`${workerUrl}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${workerSecret}`,
        },
        body: JSON.stringify({
          job_id: jobId,
          goal_id: goalId ?? undefined,
          user_email: userEmail,
          characteristic_id: args.characteristicId ?? undefined,
          feedback_id: args.feedbackId ?? undefined,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "unknown error");
        await d1Tools.updateGenerationJob(jobId, {
          status: "FAILED",
          error: JSON.stringify({ message: `Worker returned ${response.status}`, details: text }),
        });
        throw new Error(`Research worker failed: ${response.status}`);
      }
    } catch (err) {
      if ((err as Error)?.message?.startsWith("Research worker failed")) throw err;
      await d1Tools.updateGenerationJob(jobId, {
        status: "FAILED",
        error: JSON.stringify({ message: (err as Error).message }),
      });
      throw err;
    }
  } else {
    // Fallback: Trigger.dev
    const { tasks } = await import("@trigger.dev/sdk/v3");
    await tasks.trigger("generate-research", {
      jobId,
      goalId,
      userId: ctx.userId ?? userEmail,
      userEmail,
      characteristicId: args.characteristicId ?? undefined,
      feedbackId: args.feedbackId ?? undefined,
    });
  }

  return {
    success: true,
    message: "Research generation started",
    jobId,
  };
};

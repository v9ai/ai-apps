import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";
import { tasks } from "@trigger.dev/sdk/v3";
import type { generateResearchTask } from "@/src/trigger/generateResearchTask";

export const generateResearch: NonNullable<MutationResolvers['generateResearch']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId;

  // Verify the goal exists and belongs to the user
  await d1Tools.getGoal(goalId, userEmail);

  // Create a tracking job (inserted with status='RUNNING')
  const jobId = crypto.randomUUID();
  await d1Tools.createGenerationJob(jobId, userEmail, "RESEARCH", goalId);

  // Trigger the research task
  await tasks.trigger<typeof generateResearchTask>("generate-research", {
    jobId,
    goalId,
    userId: ctx.userId ?? userEmail,
    userEmail,
  });

  return {
    success: true,
    message: "Research generation started",
    jobId,
  };
};

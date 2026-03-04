import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";
import { tasks } from "@trigger.dev/sdk/v3";
import type { generateStoryTask } from "@/src/trigger/generateStoryTask";

export const generateLongFormText: NonNullable<MutationResolvers['generateLongFormText']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId;

  // Verify the goal exists and belongs to the user
  await d1Tools.getGoal(goalId, userEmail);

  // Safety gates: check characteristic if provided
  if (args.characteristicId) {
    const char = await d1Tools.getCharacteristic(args.characteristicId, userEmail);
    if (char) {
      if (char.riskTier === "SAFEGUARDING_ALERT") {
        throw new Error(
          "SAFEGUARDING_ALERT: Story generation blocked. A supervisor acknowledgment is required before proceeding.",
        );
      }
      if (char.formulationStatus === "DRAFT") {
        throw new Error(
          "FORMULATION_INCOMPLETE: Complete the clinical assessment (severity, impairment domains, duration) before generating a story.",
        );
      }
    }
  }

  // Create a tracking job (inserted with status='RUNNING')
  const jobId = crypto.randomUUID();
  await d1Tools.createGenerationJob(jobId, userEmail, "LONGFORM", goalId);

  // Trigger the durable Trigger.dev task — survives Vercel serverless timeouts
  await tasks.trigger<typeof generateStoryTask>("generate-story", {
    jobId,
    goalId,
    userId: ctx.userId ?? userEmail,
    userEmail,
    language: args.language ?? undefined,
    minutes: args.minutes ?? undefined,
    characteristicId: args.characteristicId ?? undefined,
  });

  return {
    success: true,
    message: "Story generation started",
    jobId,
  };
};

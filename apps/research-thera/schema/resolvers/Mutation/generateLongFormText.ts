import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";
import { runStoryGraph } from "@/src/graphs/generateStory";

export const generateLongFormText: NonNullable<MutationResolvers['generateLongFormText']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const characteristicId = args.characteristicId ?? undefined;

  if (!goalId && !characteristicId) {
    throw new Error("At least one of goalId or characteristicId is required");
  }

  // Verify the goal exists and belongs to the user
  if (goalId) {
    await d1Tools.getGoal(goalId, userEmail);
  }

  // Safety gates: check characteristic if provided
  if (characteristicId) {
    const char = await d1Tools.getCharacteristic(characteristicId, userEmail);
    if (char) {
      if (char.riskTier === "SAFEGUARDING_ALERT") {
        throw new Error(
          "SAFEGUARDING_ALERT: Story generation blocked. A supervisor acknowledgment is required before proceeding.",
        );
      }
    }
  }

  const { storyId, text } = await runStoryGraph({
    goalId,
    characteristicId,
    userEmail,
    language: args.language ?? undefined,
    minutes: args.minutes ?? undefined,
  });

  return {
    success: true,
    message: "Story generated successfully",
    storyId,
    text,
  };
};

import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteGoalStory: NonNullable<MutationResolvers['deleteGoalStory']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteGoalStory(args.id, userEmail);

  return {
    success: true,
    message: "Story deleted successfully",
  };
};

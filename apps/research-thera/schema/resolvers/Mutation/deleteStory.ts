import type { MutationResolvers } from "./../../types.generated";
import { deleteStory as _deleteStory } from "@/src/db";

export const deleteStory: NonNullable<MutationResolvers['deleteStory']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _deleteStory(args.id, userEmail);

  return {
    success: true,
    message: "Story deleted successfully",
  };
};

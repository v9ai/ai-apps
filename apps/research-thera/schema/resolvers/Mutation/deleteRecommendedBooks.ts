import type { MutationResolvers } from "./../../types.generated";
import { deleteRecommendedBooks as deleteBooks } from "@/src/db";

export const deleteRecommendedBooks: NonNullable<MutationResolvers['deleteRecommendedBooks']> = async (_parent, args, ctx) => {
  if (!ctx.userEmail) {
    throw new Error("Authentication required");
  }

  const deletedCount = await deleteBooks(args.goalId);

  return {
    success: true,
    message: `Deleted ${deletedCount} book recommendation${deletedCount === 1 ? "" : "s"}.`,
    deletedCount,
  };
};

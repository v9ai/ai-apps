import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { deleteRecommendedBooks as deleteBooks, getGoal } from "@/src/db";

export const deleteRecommendedBooks: NonNullable<MutationResolvers['deleteRecommendedBooks']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Ownership gate: deleteRecommendedBooks has no user_id filter; enforce via
  // parent goal ownership before delete.
  try {
    await getGoal(args.goalId, userEmail);
  } catch {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const deletedCount = await deleteBooks(args.goalId);

  return {
    success: true,
    message: `Deleted ${deletedCount} book recommendation${deletedCount === 1 ? "" : "s"}.`,
    deletedCount,
  };
};

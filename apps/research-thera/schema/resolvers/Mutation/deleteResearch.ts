import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { deleteTherapyResearch, getGoal } from "@/src/db";

export const deleteResearch: NonNullable<MutationResolvers['deleteResearch']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Ownership gate: deleteTherapyResearch has no user_id filter; enforce via
  // parent goal ownership before delete.
  try {
    await getGoal(args.goalId, userEmail);
  } catch {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  try {
    const deletedCount = await deleteTherapyResearch(args.goalId);
    return {
      success: true,
      deletedCount,
      message:
        deletedCount > 0
          ? `Deleted ${deletedCount} research paper${deletedCount !== 1 ? "s" : ""}`
          : "No research found for this goal",
    };
  } catch (error) {
    console.error("Failed to delete research:", error);
    return {
      success: false,
      deletedCount: 0,
      message:
        error instanceof Error ? error.message : "Failed to delete research",
    };
  }
};

import type { MutationResolvers } from "./../../types.generated";
import { deleteTherapyResearch } from "@/src/db";

export const deleteResearch: NonNullable<MutationResolvers['deleteResearch']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
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

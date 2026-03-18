import type { MutationResolvers } from "./../../types.generated";
import { deleteTherapeuticQuestions as deleteQuestions } from "@/src/db";

export const deleteTherapeuticQuestions: NonNullable<MutationResolvers['deleteTherapeuticQuestions']> = async (_parent, args, ctx) => {
  if (!ctx.userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;

  if (!goalId && !issueId) {
    throw new Error("Either goalId or issueId is required");
  }

  const deletedCount = await deleteQuestions(goalId, issueId);

  return {
    success: true,
    message: `Deleted ${deletedCount} questions.`,
    deletedCount,
  };
};

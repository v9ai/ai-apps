import type { MutationResolvers } from "./../../types.generated";
import { deleteTherapeuticQuestions as deleteQuestions } from "@/src/db";

export const deleteTherapeuticQuestions: NonNullable<MutationResolvers['deleteTherapeuticQuestions']> = async (_parent, args, ctx) => {
  if (!ctx.userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;
  const journalEntryId = args.journalEntryId ?? undefined;

  if (!goalId && !issueId && !journalEntryId) {
    throw new Error("Either goalId, issueId, or journalEntryId is required");
  }

  const deletedCount = await deleteQuestions(goalId, issueId, journalEntryId);

  return {
    success: true,
    message: `Deleted ${deletedCount} questions.`,
    deletedCount,
  };
};

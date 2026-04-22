import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import {
  deleteTherapeuticQuestions as deleteQuestions,
  db,
} from "@/src/db";

export const deleteTherapeuticQuestions: NonNullable<MutationResolvers['deleteTherapeuticQuestions']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;
  const journalEntryId = args.journalEntryId ?? undefined;

  if (!goalId && !issueId && !journalEntryId) {
    throw new Error("Either goalId, issueId, or journalEntryId is required");
  }

  const notFound = () =>
    new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });

  // therapeutic_questions has no user_id; enforce ownership through the
  // parent row (goal / issue / journal entry).
  if (journalEntryId != null) {
    const entry = await db.getJournalEntry(journalEntryId, userEmail);
    if (!entry) throw notFound();
  }
  if (issueId != null) {
    const issue = await db.getIssue(issueId, userEmail);
    if (!issue) throw notFound();
  }
  if (goalId != null) {
    try {
      await db.getGoal(goalId, userEmail);
    } catch {
      throw notFound();
    }
  }

  const deletedCount = await deleteQuestions(goalId, issueId, journalEntryId);

  return {
    success: true,
    message: `Deleted ${deletedCount} questions.`,
    deletedCount,
  };
};

import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db, listTherapeuticQuestions } from "@/src/db";

export const therapeuticQuestions: NonNullable<QueryResolvers['therapeuticQuestions']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const notFound = () =>
    new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });

  // therapeutic_questions has no user_id; ownership flows through
  // goal_id / issue_id / journal_entry_id. All three parent tables are email-keyed.
  if (args.journalEntryId != null) {
    const entry = await db.getJournalEntry(args.journalEntryId, userEmail);
    if (!entry) throw notFound();
  } else if (args.issueId != null) {
    const issue = await db.getIssue(args.issueId, userEmail);
    if (!issue) throw notFound();
  } else if (args.goalId != null) {
    try {
      await db.getGoal(args.goalId, userEmail);
    } catch {
      throw notFound();
    }
  } else {
    // No scope specified — return empty, same as the underlying list helper.
    return [];
  }

  return listTherapeuticQuestions(
    args.goalId ?? undefined,
    args.issueId ?? undefined,
    args.journalEntryId ?? undefined,
  );
};

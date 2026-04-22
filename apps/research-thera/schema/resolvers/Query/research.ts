import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db, listTherapyResearch } from "@/src/db";

export const research: NonNullable<QueryResolvers['research']> = async (
  _parent,
  args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const notFound = () =>
    new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });

  // therapy_research has no user_id; ownership flows through
  // goal_id / issue_id / feedback_id / journal_entry_id.
  if (args.journalEntryId != null) {
    const entry = await db.getJournalEntry(args.journalEntryId, userId);
    if (!entry) throw notFound();
  }
  if (args.issueId != null) {
    const issue = await db.getIssue(args.issueId, userId);
    if (!issue) throw notFound();
  }
  if (args.feedbackId != null) {
    const feedback = await db.getContactFeedback(args.feedbackId, userId);
    if (!feedback) throw notFound();
  }
  if (args.goalId != null) {
    try {
      await db.getGoal(args.goalId, userId);
    } catch {
      throw notFound();
    }
  }

  return listTherapyResearch(
    args.goalId ?? undefined,
    args.issueId ?? undefined,
    args.feedbackId ?? undefined,
    args.journalEntryId ?? undefined,
  );
};

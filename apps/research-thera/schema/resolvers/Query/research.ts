import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db, listTherapyResearch } from "@/src/db";

export const research: NonNullable<QueryResolvers['research']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const notFound = () =>
    new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });

  // therapy_research has no user_id; ownership flows through
  // goal_id / issue_id / feedback_id / journal_entry_id / medication_id.
  if (args.journalEntryId != null) {
    const entry = await db.getJournalEntry(args.journalEntryId, userEmail);
    if (!entry) throw notFound();
  }
  if (args.issueId != null) {
    const issue = await db.getIssue(args.issueId, userEmail);
    if (!issue) throw notFound();
  }
  if (args.feedbackId != null) {
    const feedback = await db.getContactFeedback(args.feedbackId, userEmail);
    if (!feedback) throw notFound();
  }
  if (args.goalId != null) {
    try {
      await db.getGoal(args.goalId, userEmail);
    } catch {
      throw notFound();
    }
  }
  if (args.medicationId != null) {
    const med = await db.getMedicationById(args.medicationId, userEmail);
    if (!med) throw notFound();
  }

  return listTherapyResearch(
    args.goalId ?? undefined,
    args.issueId ?? undefined,
    args.feedbackId ?? undefined,
    args.journalEntryId ?? undefined,
    args.medicationId ?? undefined,
  );
};

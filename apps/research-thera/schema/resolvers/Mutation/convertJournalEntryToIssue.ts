import type { MutationResolvers } from "./../../types.generated";
import { getJournalEntry, createIssue, getIssue } from "@/src/db";

export const convertJournalEntryToIssue: NonNullable<MutationResolvers['convertJournalEntryToIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Get the journal entry to verify ownership
  const entry = await getJournalEntry(args.id, userEmail);
  if (!entry) {
    throw new Error("Journal entry not found");
  }

  // Create a new issue linked to this journal entry
  const issueId = await createIssue({
    journalEntryId: entry.id,
    familyMemberId: args.input.familyMemberId,
    userId: userEmail,
    title: args.input.title || entry.title || `Issue from journal entry #${entry.id}`,
    description: args.input.description || entry.content,
    category: args.input.category,
    severity: args.input.severity,
    recommendations: args.input.recommendations ?? null,
  });

  const issue = await getIssue(issueId, userEmail);

  if (!issue) {
    throw new Error("Failed to retrieve created issue");
  }

  return {
    id: issue.id,
    feedbackId: issue.feedbackId,
    journalEntryId: issue.journalEntryId,
    familyMemberId: issue.familyMemberId,
    createdBy: issue.userId,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    severity: issue.severity,
    recommendations: issue.recommendations,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  } as any;
};

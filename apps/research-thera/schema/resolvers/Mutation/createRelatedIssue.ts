import type { MutationResolvers } from "./../../types.generated";
import { createIssue, getIssue, linkIssues } from "@/src/db";

export const createRelatedIssue: NonNullable<MutationResolvers['createRelatedIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  // Verify source issue exists
  const sourceIssue = await getIssue(args.issueId, userEmail);
  if (!sourceIssue) throw new Error("Source issue not found");

  // Create the new issue
  const newIssueId = await createIssue({
    feedbackId: args.input.feedbackId,
    familyMemberId: args.input.familyMemberId,
    userId: userEmail,
    title: args.input.title,
    description: args.input.description,
    category: args.input.category,
    severity: args.input.severity,
    recommendations: args.input.recommendations ?? null,
  });

  // Link them
  const linkId = await linkIssues(
    args.issueId,
    newIssueId,
    userEmail,
    args.linkType ?? "related",
  );

  const newIssue = await getIssue(newIssueId, userEmail);
  if (!newIssue) throw new Error("Failed to retrieve created issue");

  return {
    id: linkId,
    linkType: args.linkType ?? "related",
    issue: {
      id: newIssue.id,
      feedbackId: newIssue.feedbackId,
      journalEntryId: newIssue.journalEntryId,
      familyMemberId: newIssue.familyMemberId,
      relatedFamilyMemberId: newIssue.relatedFamilyMemberId,
      createdBy: newIssue.userId,
      title: newIssue.title,
      description: newIssue.description,
      category: newIssue.category,
      severity: newIssue.severity,
      recommendations: newIssue.recommendations,
      createdAt: newIssue.createdAt,
      updatedAt: newIssue.updatedAt,
    },
  } as any;
};

import type { MutationResolvers } from "./../../types.generated";
import { linkIssues as _linkIssues, getIssue, getLinkedIssues } from "@/src/db";

export const linkIssues: NonNullable<MutationResolvers['linkIssues']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  if (args.issueId === args.linkedIssueId) {
    throw new Error("Cannot link an issue to itself");
  }

  const linkId = await _linkIssues(
    args.issueId,
    args.linkedIssueId,
    userEmail,
    args.linkType ?? "related",
  );

  const linkedIssue = await getIssue(args.linkedIssueId, userEmail);
  if (!linkedIssue) throw new Error("Linked issue not found");

  return {
    id: linkId,
    linkType: args.linkType ?? "related",
    issue: {
      id: linkedIssue.id,
      feedbackId: linkedIssue.feedbackId,
      journalEntryId: linkedIssue.journalEntryId,
      familyMemberId: linkedIssue.familyMemberId,
      relatedFamilyMemberId: linkedIssue.relatedFamilyMemberId,
      createdBy: linkedIssue.userId,
      title: linkedIssue.title,
      description: linkedIssue.description,
      category: linkedIssue.category,
      severity: linkedIssue.severity,
      recommendations: linkedIssue.recommendations,
      createdAt: linkedIssue.createdAt,
      updatedAt: linkedIssue.updatedAt,
    },
  } as any;
};

import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const issue: NonNullable<QueryResolvers['issue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const issue = await d1Tools.getIssue(args.id, userEmail);

  if (!issue) {
    return null;
  }

  return {
    id: issue.id,
    feedbackId: issue.feedbackId,
    familyMemberId: issue.familyMemberId,
    relatedFamilyMemberId: issue.relatedFamilyMemberId,
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

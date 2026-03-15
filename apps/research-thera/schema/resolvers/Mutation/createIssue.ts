import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createIssue: NonNullable<MutationResolvers['createIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await d1Tools.createIssue({
    feedbackId: args.input.feedbackId,
    familyMemberId: args.input.familyMemberId,
    userId: userEmail,
    title: args.input.title,
    description: args.input.description,
    category: args.input.category,
    severity: args.input.severity,
    recommendations: args.input.recommendations ?? null,
  });

  const issue = await d1Tools.getIssue(id, userEmail);

  if (!issue) {
    throw new Error("Failed to retrieve created issue");
  }

  return {
    id: issue.id,
    feedbackId: issue.feedbackId,
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

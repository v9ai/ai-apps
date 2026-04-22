import type { MutationResolvers } from "./../../types.generated";
import { createIssue as _createIssue, getIssue, assertOwnsFamilyMember } from "@/src/db";

export const createIssue: NonNullable<MutationResolvers['createIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Cross-user write guard: caller must own the referenced family member.
  const userId = ctx.userId;
  if (!userId) throw new Error("Authentication required");
  await assertOwnsFamilyMember(args.input.familyMemberId, userId);

  const id = await _createIssue({
    feedbackId: args.input.feedbackId,
    familyMemberId: args.input.familyMemberId,
    userId: userEmail,
    title: args.input.title,
    description: args.input.description,
    category: args.input.category,
    severity: args.input.severity,
    recommendations: args.input.recommendations ?? null,
  });

  const issue = await getIssue(id, userEmail);

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

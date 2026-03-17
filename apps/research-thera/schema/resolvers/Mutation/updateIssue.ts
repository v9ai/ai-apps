import type { MutationResolvers } from "./../../types.generated";
import { updateIssue as _updateIssue, getIssue } from "@/src/db";

export const updateIssue: NonNullable<MutationResolvers['updateIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _updateIssue(args.id, userEmail, {
    familyMemberId: args.input.familyMemberId ?? undefined,
    relatedFamilyMemberId: args.input.relatedFamilyMemberId !== undefined ? (args.input.relatedFamilyMemberId ?? null) : undefined,
    title: args.input.title ?? undefined,
    description: args.input.description ?? undefined,
    category: args.input.category ?? undefined,
    severity: args.input.severity ?? undefined,
    recommendations: args.input.recommendations ?? undefined,
  });

  const issue = await getIssue(args.id, userEmail);

  if (!issue) {
    throw new Error("Failed to retrieve updated issue");
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

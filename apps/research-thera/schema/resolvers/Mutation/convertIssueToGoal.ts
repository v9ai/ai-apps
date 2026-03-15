import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const convertIssueToGoal: NonNullable<MutationResolvers['convertIssueToGoal']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Get the issue to verify ownership
  const issue = await d1Tools.getIssue(args.id, userEmail);
  if (!issue) {
    throw new Error("Issue not found");
  }

  // Create a new goal from the issue
  const goalId = await d1Tools.createGoal({
    familyMemberId: args.input.familyMemberId || issue.familyMemberId,
    createdBy: userEmail,
    title: args.input.title || issue.title,
    description: args.input.description || `Goal created from issue: ${issue.description}`,
  });

  const goal = await d1Tools.getGoal(goalId, userEmail);

  if (!goal) {
    throw new Error("Failed to retrieve created goal");
  }

  return {
    id: goal.id,
    familyMemberId: goal.familyMemberId,
    createdBy: goal.createdBy,
    slug: goal.slug,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  } as any;
};

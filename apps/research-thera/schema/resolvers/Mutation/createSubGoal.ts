import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createSubGoal: NonNullable<MutationResolvers['createSubGoal']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  // Get the parent goal to verify it exists and get its familyMemberId
  const parentGoal = await d1Tools.getGoal(args.goalId, userEmail);

  const subGoalId = await d1Tools.createGoal({
    familyMemberId: parentGoal.familyMemberId,
    createdBy: userEmail,
    title: args.input.title,
    description: args.input.description || null,
    parentGoalId: args.goalId,
  });

  // Fetch the created sub-goal to return it
  const subGoal = await d1Tools.getGoal(subGoalId, userEmail);

  return {
    id: subGoal.id,
    familyMemberId: subGoal.familyMemberId,
    createdBy: subGoal.createdBy,
    slug: subGoal.slug,
    title: subGoal.title,
    description: subGoal.description,
    status: subGoal.status,
    parentGoalId: subGoal.parentGoalId,
    createdAt: subGoal.createdAt,
    updatedAt: subGoal.updatedAt,
    questions: [],
    stories: [],
    userStories: [],
    notes: [],
    research: [],
    subGoals: [],
    parentGoal: null,
  } as any;
};

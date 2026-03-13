import type { MutationResolvers } from "./../../types.generated";
import { d1Tools, updateGoal as updateGoalDb } from "@/src/db";

export const unlinkGoalFamilyMember: NonNullable<MutationResolvers['unlinkGoalFamilyMember']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await updateGoalDb(args.id, userEmail, { familyMemberId: null });

  const goal = await d1Tools.getGoal(args.id, userEmail);

  return {
    id: goal.id,
    familyMemberId: goal.familyMemberId,
    createdBy: goal.createdBy,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    therapeuticText: goal.therapeuticText,
    therapeuticTextLanguage: goal.therapeuticTextLanguage,
    therapeuticTextGeneratedAt: goal.therapeuticTextGeneratedAt,
    storyLanguage: goal.storyLanguage,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    questions: [],
    stories: [],
    userStories: [],
    notes: [],
    research: [],
  } as any;
};

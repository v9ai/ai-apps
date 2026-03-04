import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";
import { updateGoal as updateGoalDb } from "@/src/db";

export const updateGoal: NonNullable<MutationResolvers['updateGoal']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await updateGoalDb(args.id, userEmail, {
    familyMemberId: args.input.familyMemberId ?? undefined,
    title: args.input.title ?? undefined,
    description: args.input.description ?? undefined,
    status: args.input.status ?? undefined,
    storyLanguage: args.input.storyLanguage ?? undefined,
  });

  // Fetch the updated goal to return it
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

import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const goal: NonNullable<QueryResolvers['goal']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  let goal;

  if (args.slug) {
    goal = await db.getGoalBySlug(args.slug, userEmail);
  } else if (args.id) {
    goal = await db.getGoal(args.id, userEmail);
  } else {
    throw new Error("Either id or slug must be provided");
  }

  return {
    id: goal.id,
    familyMemberId: goal.familyMemberId,
    createdBy: goal.createdBy,
    slug: goal.slug,
    title: goal.title,
    description: goal.description,
    status: goal.status,
    priority: goal.priority,
    targetDate: goal.targetDate,
    parentGoalId: goal.parentGoalId,
    therapeuticText: goal.therapeuticText,
    therapeuticTextLanguage: goal.therapeuticTextLanguage,
    therapeuticTextGeneratedAt: goal.therapeuticTextGeneratedAt,
    parentAdvice: goal.parentAdvice,
    parentAdviceLanguage: goal.parentAdviceLanguage,
    parentAdviceGeneratedAt: goal.parentAdviceGeneratedAt,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    questions: [],
    stories: [],
    notes: [],
    research: [],
    subGoals: [],
    parentGoal: null,
  } as any;
};

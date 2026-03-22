import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const goals: NonNullable<QueryResolvers['goals']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalsList = await db.listGoals(
    userEmail,
    args.familyMemberId ?? undefined,
  );

  // Filter by status if provided
  let filtered = goalsList;
  if (args.status) {
    filtered = goalsList.filter((goal) => goal.status === args.status);
  }

  return filtered.map((goal) => ({
    ...goal,
    createdBy: goal.createdBy,
    research: [],
    questions: [],
    stories: [],
    notes: [],
    subGoals: [],
    parentGoal: null,
  })) as any;
};

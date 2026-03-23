import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const createHabit: NonNullable<MutationResolvers['createHabit']> = async (
  _parent,
  args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) throw new Error("Authentication required");

  const { input } = args;
  const id = await db.createHabit({
    userId,
    goalId: input.goalId ?? null,
    title: input.title,
    description: input.description ?? null,
    frequency: input.frequency?.toLowerCase() ?? "daily",
    targetCount: input.targetCount ?? 1,
  });

  const habit = await db.getHabit(id, userId);
  if (!habit) throw new Error("Habit not found after creation");

  return {
    ...habit,
    frequency: habit.frequency.toUpperCase() as any,
    status: habit.status.toUpperCase() as any,
    logs: [],
    todayLog: null,
  };
};

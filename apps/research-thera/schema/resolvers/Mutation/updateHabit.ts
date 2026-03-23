import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const updateHabit: NonNullable<MutationResolvers["updateHabit"]> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { id, input } = args;
  await db.updateHabit(id, userEmail, {
    title: input.title ?? null,
    description: input.description ?? null,
    frequency: input.frequency ? input.frequency.toLowerCase() : null,
    targetCount: input.targetCount ?? null,
    status: input.status ? input.status.toLowerCase() : null,
    goalId: input.goalId ?? null,
  });

  const habit = await db.getHabit(id, userEmail);
  if (!habit) throw new Error("Habit not found");

  return {
    ...habit,
    frequency: habit.frequency.toUpperCase() as any,
    status: habit.status.toUpperCase() as any,
    logs: [],
    todayLog: null,
  };
};

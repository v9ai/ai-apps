import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const habits: NonNullable<QueryResolvers['habits']> = async (
  _parent,
  args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) throw new Error("Authentication required");

  const list = await db.listHabits(userId, args.status ?? undefined);
  const today = new Date().toISOString().slice(0, 10);

  return Promise.all(
    list.map(async (habit) => {
      const todayLog = await db.getTodayLogForHabit(habit.id, userId, today);
      return {
        ...habit,
        frequency: habit.frequency.toUpperCase() as any,
        status: habit.status.toUpperCase() as any,
        logs: [],
        todayLog: todayLog ?? null,
      };
    }),
  );
};

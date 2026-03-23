import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const logHabit: NonNullable<MutationResolvers['logHabit']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const id = await db.logHabit({
    habitId: args.habitId,
    userId: userEmail,
    loggedDate: args.loggedDate,
    count: args.count ?? 1,
    notes: args.notes ?? null,
  });

  const logs = await db.listHabitLogs(args.habitId, userEmail);
  const log = logs.find((l) => l.id === id);
  if (!log) throw new Error("Habit log not found after creation");

  return log;
};

import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const habit: NonNullable<QueryResolvers["habit"]> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const h = await db.getHabit(args.id, userEmail);
  if (!h) return null;

  const today = new Date().toISOString().slice(0, 10);
  const todayLog = await db.getTodayLogForHabit(h.id, userEmail, today);
  const logs = await db.listHabitLogs(h.id, userEmail);

  return {
    ...h,
    frequency: h.frequency.toUpperCase() as any,
    status: h.status.toUpperCase() as any,
    logs,
    todayLog: todayLog ?? null,
  };
};

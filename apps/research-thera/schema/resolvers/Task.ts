import type { TaskResolvers } from "./../types.generated";
import { db } from "@/src/db";

export const Task: TaskResolvers = {
  subtasks: async (parent, _args, ctx) => {
    if (!ctx.userEmail) return [];
    const rows = await db.getSubtasks(parent.id as string, ctx.userEmail);
    return rows as any;
  },
  blockers: async (parent, _args, ctx) => {
    if (!ctx.userEmail) return [];
    return db.getTaskBlockers(parent.id as string, ctx.userEmail);
  },
  blocked: async (parent, _args, ctx) => {
    if (!ctx.userEmail) return [];
    return db.getTaskBlocked(parent.id as string, ctx.userEmail);
  },
};

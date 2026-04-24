import type { GameResolvers } from "./../types.generated";
import { db } from "@/src/db";

export const Game: GameResolvers = {
  goal: async (parent, _args, ctx) => {
    if (!parent.goalId) return null;
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    const goal = await db.getGoalById(parent.goalId, userEmail);
    return goal ?? null;
  },
  issue: async (parent, _args, ctx) => {
    if (!parent.issueId) return null;
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    const issue = await db.getIssue(parent.issueId, userEmail);
    return (issue as any) ?? null;
  },
  completions: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    return db.listGameCompletions(parent.id, userEmail);
  },
};

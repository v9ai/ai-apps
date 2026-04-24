import type { GameResolvers } from "./../types.generated";
import { db } from "@/src/db";

export const Game: GameResolvers = {
  goal: async (parent, _args, ctx) => {
    if (!parent.goalId) return null;
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    try {
      const goal = await db.getGoal(parent.goalId, userEmail);
      return {
        ...goal,
        notes: [],
        research: [],
        questions: [],
        stories: [],
      } as any;
    } catch {
      return null;
    }
  },
  issue: async (parent, _args, ctx) => {
    if (!parent.issueId) return null;
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;
    try {
      const issue = await db.getIssue(parent.issueId, userEmail);
      if (!issue) return null;
      return {
        ...issue,
        feedback: null,
        familyMember: null,
        relatedFamilyMember: null,
        stories: [],
      } as any;
    } catch {
      return null;
    }
  },
  completions: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return [];
    return db.listGameCompletions(parent.id, userEmail);
  },
};

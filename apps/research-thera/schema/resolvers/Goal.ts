import type { GoalResolvers } from "./../types.generated";
import { d1Tools } from "@/src/db";

export const Goal: GoalResolvers = {
  familyMember: async (parent, _args, _ctx) => {
    if (!parent.familyMemberId) return null;
    const member = await d1Tools.getFamilyMember(parent.familyMemberId);
    if (!member) return null;
    return { ...member, goals: [], shares: [] } as any;
  },

  research: async (parent, _args, _ctx) => {
    const research = await d1Tools.listTherapyResearch(parent.id);
    return research;
  },

  notes: async (parent, _args, _ctx) => {
    const notes = await d1Tools.listNotesForEntity(
      parent.id,
      "Goal",
      parent.createdBy,
    );
    return notes as any; // Field resolvers will populate viewerAccess
  },

  questions: async (parent, _args, _ctx) => {
    const questions = await d1Tools.listTherapeuticQuestions(parent.id);
    return questions;
  },

  stories: async (parent, _args, _ctx) => {
    const stories = await d1Tools.listGoalStories(parent.id);
    return stories.map((story) => ({
      ...story,
      segments: [],
      audioAssets: [],
    }));
  },

  userStories: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) {
      return [];
    }
    return d1Tools.listStories(parent.id, userEmail);
  },

  subGoals: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) {
      return [];
    }
    const allGoals = await d1Tools.listGoals(userEmail);
    return allGoals
      .filter((g) => g.parentGoalId === parent.id)
      .map((g) => ({
        ...g,
        research: [],
        questions: [],
        stories: [],
        userStories: [],
        notes: [],
        subGoals: [],
        parentGoal: null,
      })) as any;
  },

  parentGoal: async (parent, _args, ctx) => {
    const parentGoalId = (parent as any).parentGoalId;
    if (!parentGoalId || !ctx.userEmail) {
      return null;
    }
    try {
      const goal = await d1Tools.getGoal(parentGoalId, ctx.userEmail);
      return {
        ...goal,
        research: [],
        questions: [],
        stories: [],
        userStories: [],
        notes: [],
        subGoals: [],
        parentGoal: null,
      } as any;
    } catch {
      return null;
    }
  },
};

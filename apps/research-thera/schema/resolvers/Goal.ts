import type { GoalResolvers } from "./../types.generated";
import { getFamilyMember, listTherapyResearch, listNotesForEntity, listTherapeuticQuestions, listStories, listGoals, getGoal } from "@/src/db";

export const Goal: GoalResolvers = {
  familyMember: async (parent, _args, _ctx) => {
    if (!parent.familyMemberId) return null;
    const member = await getFamilyMember(parent.familyMemberId);
    if (!member) return null;
    return { ...member, goals: [], shares: [] } as any;
  },

  research: async (parent, _args, _ctx) => {
    const research = await listTherapyResearch(parent.id);
    return research;
  },

  notes: async (parent, _args, _ctx) => {
    const notes = await listNotesForEntity(
      parent.id,
      "Goal",
      parent.createdBy,
    );
    return notes as any; // Field resolvers will populate viewerAccess
  },

  questions: async (parent, _args, _ctx) => {
    const questions = await listTherapeuticQuestions(parent.id);
    return questions;
  },

  stories: async (parent, _args, _ctx) => {
    const stories = await listStories(parent.id);
    return stories.map((story) => ({
      ...story,
      segments: [],
      audioAssets: [],
    }));
  },

  subGoals: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) {
      return [];
    }
    const allGoals = await listGoals(userEmail);
    return allGoals
      .filter((g) => g.parentGoalId === parent.id)
      .map((g) => ({
        ...g,
        research: [],
        questions: [],
        stories: [],
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
      const goal = await getGoal(parentGoalId, ctx.userEmail);
      return {
        ...goal,
        research: [],
        questions: [],
        stories: [],
        notes: [],
        subGoals: [],
        parentGoal: null,
      } as any;
    } catch {
      return null;
    }
  },
};

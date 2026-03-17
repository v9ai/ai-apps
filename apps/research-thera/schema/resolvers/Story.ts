import type { StoryResolvers } from "./../types.generated";
import { getGoal, getTextSegmentsForStory, getAudioAssetsForStory } from "@/src/db";

export const Story: StoryResolvers = {
  goal: async (parent, _args, ctx) => {
    if (!parent.goalId) return null;
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;

    try {
      const goal = await getGoal(parent.goalId, userEmail);
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

  segments: async (parent, _args, _ctx) => {
    return getTextSegmentsForStory(parent.id);
  },

  audioAssets: async (parent, _args, _ctx) => {
    return getAudioAssetsForStory(parent.id);
  },
};

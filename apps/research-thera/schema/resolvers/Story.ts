import type { StoryResolvers } from "./../types.generated";
import { d1Tools } from "@/src/db";

export const Story: StoryResolvers = {
  goal: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) {
      return null;
    }

    try {
      const goal = await d1Tools.getGoal(parent.goalId, userEmail);
      return {
        ...goal,
        notes: [],
        research: [],
        questions: [],
        stories: [],
        userStories: [],
      } as any;
    } catch (error) {
      return null;
    }
  },
};

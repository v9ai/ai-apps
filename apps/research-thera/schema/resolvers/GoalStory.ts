import type { GoalStoryResolvers } from "./../types.generated";
import { d1Tools } from "@/src/db";

export const GoalStory: GoalStoryResolvers = {
  segments: async (parent, _args, _ctx) => {
    const segments = await d1Tools.getTextSegmentsForStory(parent.id);
    return segments;
  },

  audioAssets: async (parent, _args, _ctx) => {
    const assets = await d1Tools.getAudioAssetsForStory(parent.id);
    return assets;
  },
};

import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const goalStory: NonNullable<QueryResolvers['goalStory']> = async (
  _parent,
  args,
  _ctx,
) => {
  const story = await d1Tools.getGoalStory(args.id);

  return {
    id: story.id,
    goalId: story.goalId,
    language: story.language,
    minutes: story.minutes,
    text: story.text,
    audioKey: story.audioKey,
    audioUrl: story.audioUrl,
    audioGeneratedAt: story.audioGeneratedAt,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    segments: [],
    audioAssets: [],
  };
};

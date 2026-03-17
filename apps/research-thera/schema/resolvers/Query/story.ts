import type { QueryResolvers } from "./../../types.generated";
import { getStory } from "@/src/db";

export const story: NonNullable<QueryResolvers['story']> = async (
  _parent,
  args,
  _ctx,
) => {
  const story = await getStory(args.id);
  if (!story) return null;
  return { ...story, segments: [], audioAssets: [] } as any;
};

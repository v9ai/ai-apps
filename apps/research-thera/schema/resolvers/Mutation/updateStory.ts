import type { MutationResolvers } from "./../../types.generated";
import { updateStory as _updateStory, getStory } from "@/src/db";

export const updateStory: NonNullable<MutationResolvers['updateStory']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _updateStory(args.id, userEmail, {
    content: args.input.content ?? undefined,
  });

  const story = await getStory(args.id);
  if (!story) {
    throw new Error("Story not found");
  }

  return { ...story, segments: [], audioAssets: [] } as any;
};

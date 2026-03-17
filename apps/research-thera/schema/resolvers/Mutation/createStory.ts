import type { MutationResolvers } from "./../../types.generated";
import { createStory as _createStory } from "@/src/db";

export const createStory: NonNullable<MutationResolvers['createStory']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const story = await _createStory({
    goalId: args.input.goalId,
    createdBy: userEmail,
    content: args.input.content,
  });

  if (!story) {
    throw new Error("Failed to create story");
  }

  return { ...story, segments: [], audioAssets: [] } as any;
};

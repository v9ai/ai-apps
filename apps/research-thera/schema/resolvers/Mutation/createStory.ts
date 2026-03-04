import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createStory: NonNullable<MutationResolvers['createStory']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const storyId = await d1Tools.createStory({
    goalId: args.input.goalId,
    createdBy: userEmail,
    content: args.input.content,
  });

  const story = await d1Tools.getStory(storyId, userEmail);
  if (!story) {
    throw new Error("Failed to create story");
  }

  return story;
};

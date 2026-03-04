import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateStory: NonNullable<MutationResolvers['updateStory']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateStory(args.id, userEmail, {
    content: args.input.content ?? undefined,
  });

  const story = await d1Tools.getStory(args.id, userEmail);
  if (!story) {
    throw new Error("Story not found");
  }

  return story;
};

import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const allStories: NonNullable<QueryResolvers['allStories']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  return d1Tools.getAllStoriesForUser(userEmail) as any;
};

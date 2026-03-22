import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const allStories: NonNullable<QueryResolvers['allStories']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  return db.getAllStoriesForUser(userEmail) as any;
};

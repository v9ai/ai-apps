import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const stories: NonNullable<QueryResolvers['stories']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  return db.listStories(args.goalId) as any;
};

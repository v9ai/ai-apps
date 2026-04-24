import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const latestBogdanDiscussion: NonNullable<QueryResolvers['latestBogdanDiscussion']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const guide = await db.getLatestBogdanDiscussionGuide(userEmail);
  return (guide as any) ?? null;
};

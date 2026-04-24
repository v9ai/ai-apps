import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const bogdanDiscussions: NonNullable<QueryResolvers['bogdanDiscussions']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const guides = await db.listBogdanDiscussionGuides(userEmail);
  return guides as any;
};

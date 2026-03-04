import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const story: NonNullable<QueryResolvers['story']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  return d1Tools.getStory(args.id, userEmail);
};

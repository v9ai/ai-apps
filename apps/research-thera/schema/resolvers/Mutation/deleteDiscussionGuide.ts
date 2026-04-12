import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteDiscussionGuide: NonNullable<MutationResolvers['deleteDiscussionGuide']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.deleteDiscussionGuide(args.journalEntryId, userEmail);

  return {
    success: true,
    message: "Discussion guide deleted.",
  };
};

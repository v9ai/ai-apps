import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const deleteJournalEntry: NonNullable<MutationResolvers['deleteJournalEntry']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.deleteJournalEntry(args.id, userEmail);

  return {
    success: true,
    message: "Journal entry deleted successfully",
  };
};

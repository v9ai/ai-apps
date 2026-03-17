import type { MutationResolvers } from "./../../types.generated";
import { deleteJournalEntry as _deleteJournalEntry } from "@/src/db";

export const deleteJournalEntry: NonNullable<MutationResolvers['deleteJournalEntry']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _deleteJournalEntry(args.id, userEmail);

  return {
    success: true,
    message: "Journal entry deleted successfully",
  };
};

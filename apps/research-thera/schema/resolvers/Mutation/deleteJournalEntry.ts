import type { MutationResolvers } from "./../../types.generated";
import { deleteJournalEntry as _deleteJournalEntry, getJournalEntry } from "@/src/db";

export const deleteJournalEntry: NonNullable<MutationResolvers['deleteJournalEntry']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const existing = await getJournalEntry(args.id, userEmail);
  if (!existing) {
    throw new Error("Journal entry not found");
  }
  if (existing.isVault && !ctx.vaultUnlocked) {
    throw new Error("Journal entry not found");
  }

  await _deleteJournalEntry(args.id, userEmail);

  return {
    success: true,
    message: "Journal entry deleted successfully",
  };
};

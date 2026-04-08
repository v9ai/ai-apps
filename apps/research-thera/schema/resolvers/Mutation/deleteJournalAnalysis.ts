import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteJournalAnalysis: NonNullable<MutationResolvers['deleteJournalAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.deleteJournalAnalysis(args.journalEntryId, userEmail);

  return {
    success: true,
    message: "Analysis deleted.",
  };
};

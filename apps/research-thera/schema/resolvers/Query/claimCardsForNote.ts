import type { QueryResolvers } from "../../types.generated";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";

export const claimCardsForNote: NonNullable<QueryResolvers['claimCardsForNote']> = async (_parent, { noteId }) => {
  const cards = await claimCardsTools.getClaimCardsForNote(noteId);
  return cards as any;
};

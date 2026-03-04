import type { QueryResolvers } from "../../types.generated";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";

export const claimCard: NonNullable<QueryResolvers['claimCard']> = async (
  _parent,
  { id },
) => {
  const card = await claimCardsTools.getClaimCard(id);
  return card as any;
};

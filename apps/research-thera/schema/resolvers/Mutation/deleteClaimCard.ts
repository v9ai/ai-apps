import type { MutationResolvers } from "../../types.generated";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";

export const deleteClaimCard: NonNullable<MutationResolvers['deleteClaimCard']> = async (_parent, { id }) => {
  await claimCardsTools.deleteClaimCard(id);
  return true;
};

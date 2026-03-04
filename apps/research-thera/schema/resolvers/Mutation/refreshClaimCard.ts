import type { MutationResolvers } from "../../types.generated";
import { claimCardsTools } from "../../../src/tools/claim-cards.tools";

export const refreshClaimCard: NonNullable<MutationResolvers['refreshClaimCard']> = async (_parent, { id }) => {
  const existing = await claimCardsTools.getClaimCard(id);
  if (!existing) {
    throw new Error(`Claim card ${id} not found`);
  }

  const refreshed = await claimCardsTools.refreshClaimCard(existing, {
    perSourceLimit: 15,
    topK: 8,
    useLlmJudge: true,
  });

  await claimCardsTools.saveClaimCard(refreshed);
  return refreshed as any;
};

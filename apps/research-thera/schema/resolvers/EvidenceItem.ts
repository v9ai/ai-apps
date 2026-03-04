import type { EvidenceItemResolvers } from "../types.generated";

export const EvidenceItem: EvidenceItemResolvers = {
  score: (parent) => parent.score ?? 0,
  polarity: (parent) => {
    // Convert lowercase to uppercase enum
    return parent.polarity.toUpperCase() as any;
  },
};

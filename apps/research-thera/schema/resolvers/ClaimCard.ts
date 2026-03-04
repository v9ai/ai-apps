import type { ClaimCardResolvers } from "../types.generated";

export const ClaimCard: ClaimCardResolvers = {
  confidence: (parent) => {
    // Ensure confidence is 0-1 float
    return typeof parent.confidence === "number"
      ? parent.confidence
      : (parent.confidence as any) / 100;
  },
  verdict: (parent) => {
    // Convert lowercase to uppercase enum
    return parent.verdict.toUpperCase() as any;
  },
};

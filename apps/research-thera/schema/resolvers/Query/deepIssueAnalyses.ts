import type { QueryResolvers } from "./../../types.generated";
import { getDeepIssueAnalysesForFamilyMember } from "@/src/db";

export const deepIssueAnalyses: NonNullable<QueryResolvers['deepIssueAnalyses']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const analyses = await getDeepIssueAnalysesForFamilyMember(args.familyMemberId, userEmail);

  return analyses.map((a) => ({
    ...a,
    createdBy: a.userId,
  })) as any;
};

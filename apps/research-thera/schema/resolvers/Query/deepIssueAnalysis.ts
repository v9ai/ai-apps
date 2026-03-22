import type { QueryResolvers } from "./../../types.generated";
import { getDeepIssueAnalysis } from "@/src/db";

export const deepIssueAnalysis: NonNullable<QueryResolvers['deepIssueAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const analysis = await getDeepIssueAnalysis(args.id, userEmail);
  if (!analysis) return null;

  return {
    ...analysis,
    createdBy: analysis.userId,
  } as any;
};

import type { QueryResolvers } from "./../../types.generated";
import { getDeepAnalysis } from "@/src/db";

export const deepAnalysis: NonNullable<QueryResolvers['deepAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const analysis = await getDeepAnalysis(args.id, userEmail);
  if (!analysis) return null;

  return {
    ...analysis,
    createdBy: analysis.userId,
  } as any;
};

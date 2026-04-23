import type { QueryResolvers } from "./../../types.generated";
import { getDeepAnalysesForSubject } from "@/src/db";

export const deepAnalyses: NonNullable<QueryResolvers['deepAnalyses']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const analyses = await getDeepAnalysesForSubject(
    args.subjectType as any,
    args.subjectId,
    userEmail,
  );

  return analyses.map((a) => ({
    ...a,
    createdBy: a.userId,
  })) as any;
};

import type { RoutineAnalysisResolvers } from "./../types.generated";
import { getFamilyMember } from "@/src/db";

export const RoutineAnalysis: RoutineAnalysisResolvers = {
  familyMember: async (parent) => {
    const fm = await getFamilyMember(parent.familyMemberId);
    return (fm ?? null) as any;
  },
};

import type { ConditionResolvers } from "./../types.generated";
import { getFamilyMember } from "@/src/db";

export const Condition: ConditionResolvers = {
  familyMember: async (parent) => {
    if (!parent.familyMemberId) return null;
    const fm = await getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
};

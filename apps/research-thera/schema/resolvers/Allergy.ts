import type { AllergyResolvers } from "./../types.generated";
import { getFamilyMember } from "@/src/db";

export const Allergy: AllergyResolvers = {
  familyMember: async (parent) => {
    if (!parent.familyMemberId) return null;
    const fm = await getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
};

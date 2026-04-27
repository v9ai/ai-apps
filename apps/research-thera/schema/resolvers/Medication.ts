import type { MedicationResolvers } from "./../types.generated";
import { getFamilyMember } from "@/src/db";

export const Medication: MedicationResolvers = {
  familyMember: async (parent) => {
    if (!parent.familyMemberId) return null;
    const fm = await getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
};

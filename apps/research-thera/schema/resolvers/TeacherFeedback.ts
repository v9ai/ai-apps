import type { TeacherFeedbackResolvers } from './../types.generated';
import { getFamilyMember } from "@/src/db";

export const TeacherFeedback: TeacherFeedbackResolvers = {
  familyMember: async (parent) => {
    const fm = await getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
};

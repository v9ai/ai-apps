import type { TeacherFeedbackResolvers } from './../types.generated';
import { d1Tools } from "@/src/db";

export const TeacherFeedback: TeacherFeedbackResolvers = {
  familyMember: async (parent) => {
    const fm = await d1Tools.getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
};

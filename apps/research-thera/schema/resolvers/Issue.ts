import type { IssueResolvers } from './../types.generated';
import { getContactFeedback, getFamilyMember } from "@/src/db";

export const Issue: IssueResolvers = {
  feedback: async (parent) => {
    if (!parent.feedbackId) return null;
    const feedback = await getContactFeedback(parent.feedbackId, parent.createdBy);
    if (!feedback) return null;
    return feedback as any;
  },
  familyMember: async (parent) => {
    const fm = await getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
  relatedFamilyMember: async (parent) => {
    if (!parent.relatedFamilyMemberId) return null;
    const fm = await getFamilyMember(parent.relatedFamilyMemberId);
    if (!fm) return null;
    return fm as any;
  },
};

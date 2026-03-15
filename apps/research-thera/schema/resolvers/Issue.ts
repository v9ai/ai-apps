import type { IssueResolvers } from './../types.generated';
import { d1Tools } from "@/src/db";

export const Issue: IssueResolvers = {
  feedback: async (parent) => {
    if (!parent.feedbackId) return null;
    const feedback = await d1Tools.getContactFeedback(parent.feedbackId, parent.createdBy);
    if (!feedback) return null;
    return feedback as any;
  },
  familyMember: async (parent) => {
    const fm = await d1Tools.getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
};

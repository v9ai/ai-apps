import type { ContactFeedbackResolvers } from './../types.generated';
import { d1Tools } from "@/src/db";

export const ContactFeedback: ContactFeedbackResolvers = {
  contact: async (parent) => {
    const contact = await d1Tools.getContact(parent.contactId, parent.createdBy);
    if (!contact) return null;
    return contact as any;
  },
  familyMember: async (parent) => {
    const fm = await d1Tools.getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
  issues: async (parent) => {
    const issues = await d1Tools.getIssuesForFamilyMember(parent.familyMemberId, parent.id, parent.createdBy);
    return issues.map((issue) => ({
      id: issue.id,
      feedbackId: issue.feedbackId,
      familyMemberId: issue.familyMemberId,
      createdBy: issue.userId,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      severity: issue.severity,
      recommendations: issue.recommendations,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    })) as any;
  },
  stories: async (parent) => {
    const stories = await d1Tools.listGoalStoriesForFeedback(parent.id);
    return stories as any;
  },
};

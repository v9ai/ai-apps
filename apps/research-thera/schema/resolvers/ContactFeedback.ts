import type { ContactFeedbackResolvers } from './../types.generated';
import { getContact, getFamilyMember, getIssuesForFamilyMember, listStoriesForFeedback } from "@/src/db";

export const ContactFeedback: ContactFeedbackResolvers = {
  contact: async (parent) => {
    const contact = await getContact(parent.contactId, parent.createdBy);
    if (!contact) return null;
    return contact as any;
  },
  familyMember: async (parent) => {
    const fm = await getFamilyMember(parent.familyMemberId);
    if (!fm) return null;
    return fm as any;
  },
  issues: async (parent) => {
    const issues = await getIssuesForFamilyMember(parent.familyMemberId, parent.id, parent.createdBy);
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
    const stories = await listStoriesForFeedback(parent.id);
    return stories as any;
  },
};

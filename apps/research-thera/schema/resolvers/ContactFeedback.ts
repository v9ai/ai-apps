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
};

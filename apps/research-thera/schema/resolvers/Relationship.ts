import type { RelationshipResolvers } from './../types.generated';
import { d1Tools } from "@/src/db";

export const Relationship: RelationshipResolvers = {
  subject: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;

    if (parent.subjectType === "FAMILY_MEMBER") {
      const fm = await d1Tools.getFamilyMember(parent.subjectId);
      if (!fm) return null;
      return { id: fm.id, type: "FAMILY_MEMBER" as any, firstName: fm.firstName, lastName: fm.name };
    } else {
      const contact = await d1Tools.getContact(parent.subjectId, userEmail);
      if (!contact) return null;
      return { id: contact.id, type: "CONTACT" as any, firstName: contact.firstName, lastName: contact.lastName };
    }
  },
  related: async (parent, _args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) return null;

    if (parent.relatedType === "FAMILY_MEMBER") {
      const fm = await d1Tools.getFamilyMember(parent.relatedId);
      if (!fm) return null;
      return { id: fm.id, type: "FAMILY_MEMBER" as any, firstName: fm.firstName, lastName: fm.name };
    } else {
      const contact = await d1Tools.getContact(parent.relatedId, userEmail);
      if (!contact) return null;
      return { id: contact.id, type: "CONTACT" as any, firstName: contact.firstName, lastName: contact.lastName };
    }
  },
};

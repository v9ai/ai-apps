import type { MutationResolvers } from "./../../types.generated";
import { linkContactToIssue as _linkContactToIssue, getContact } from "@/src/db";

export const linkContactToIssue: NonNullable<MutationResolvers['linkContactToIssue']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const linkId = await _linkContactToIssue(args.issueId, args.contactId, userEmail);

  const contact = await getContact(args.contactId, userEmail);
  if (!contact) throw new Error("Contact not found");

  return {
    id: linkId,
    contact: {
      id: contact.id,
      createdBy: contact.userId,
      slug: contact.slug,
      firstName: contact.firstName,
      lastName: contact.lastName,
      role: contact.role,
      ageYears: contact.ageYears,
      notes: contact.notes,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    },
  } as any;
};

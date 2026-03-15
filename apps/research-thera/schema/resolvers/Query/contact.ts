import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const contact: NonNullable<QueryResolvers['contact']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  let item;

  if (args.slug) {
    item = await d1Tools.getContactBySlug(args.slug, userEmail);
  } else if (args.id) {
    item = await d1Tools.getContact(args.id, userEmail);
  } else {
    throw new Error("Either id or slug must be provided");
  }

  if (!item) return null;

  return {
    id: item.id,
    createdBy: item.userId,
    slug: item.slug,
    firstName: item.firstName,
    lastName: item.lastName,
    role: item.role,
    ageYears: item.ageYears,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

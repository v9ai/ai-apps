import type { QueryResolvers } from "./../../types.generated";
import { getContactsForUser } from "@/src/db";

export const contacts: NonNullable<QueryResolvers['contacts']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const items = await getContactsForUser(userEmail);

  return items.map((item) => ({
    id: item.id,
    createdBy: item.userId,
    slug: item.slug,
    firstName: item.firstName,
    lastName: item.lastName,
    description: item.description,
    role: item.role,
    ageYears: item.ageYears,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

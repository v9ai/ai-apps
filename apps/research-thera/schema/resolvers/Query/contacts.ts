import type { QueryResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const contacts: NonNullable<QueryResolvers['contacts']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const items = await d1Tools.getContactsForUser(userEmail);

  return items.map((item) => ({
    id: item.id,
    createdBy: item.userId,
    firstName: item.firstName,
    lastName: item.lastName,
    role: item.role,
    ageYears: item.ageYears,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
};

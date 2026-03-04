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

  const item = await d1Tools.getContact(args.id, userEmail);
  if (!item) return null;

  return {
    id: item.id,
    createdBy: item.userId,
    firstName: item.firstName,
    lastName: item.lastName,
    role: item.role,
    ageYears: item.ageYears,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

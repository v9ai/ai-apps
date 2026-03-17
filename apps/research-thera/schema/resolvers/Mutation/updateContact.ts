import type { MutationResolvers } from "./../../types.generated";
import { updateContact as _updateContact, getContact } from "@/src/db";

export const updateContact: NonNullable<MutationResolvers['updateContact']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await _updateContact(args.id, userEmail, {
    firstName: args.input.firstName ?? undefined,
    lastName: args.input.lastName ?? undefined,
    slug: args.input.slug ?? undefined,
    role: args.input.role ?? undefined,
    ageYears: args.input.ageYears ?? undefined,
    notes: args.input.notes ?? undefined,
  });

  const item = await getContact(args.id, userEmail);
  if (!item) {
    throw new Error("Contact not found after update");
  }

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

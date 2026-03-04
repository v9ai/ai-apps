import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const updateContact: NonNullable<MutationResolvers['updateContact']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  await d1Tools.updateContact(args.id, userEmail, {
    firstName: args.input.firstName ?? undefined,
    lastName: args.input.lastName ?? undefined,
    role: args.input.role ?? undefined,
    ageYears: args.input.ageYears ?? undefined,
    notes: args.input.notes ?? undefined,
  });

  const item = await d1Tools.getContact(args.id, userEmail);
  if (!item) {
    throw new Error("Contact not found after update");
  }

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

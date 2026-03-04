import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

export const createContact: NonNullable<MutationResolvers['createContact']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const id = await d1Tools.createContact({
    userId: userEmail,
    firstName: args.input.firstName,
    lastName: args.input.lastName ?? null,
    role: args.input.role ?? null,
    ageYears: args.input.ageYears ?? null,
    notes: args.input.notes ?? null,
  });

  const item = await d1Tools.getContact(id, userEmail);
  if (!item) {
    throw new Error("Failed to retrieve created contact");
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

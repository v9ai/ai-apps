import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addDoctor: NonNullable<MutationResolvers['addDoctor']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const name = args.input.name.trim();
  if (!name) throw new Error("Doctor name is required");

  return db.createDoctor({
    userId: userEmail,
    name,
    specialty: args.input.specialty?.trim() || null,
    phone: args.input.phone?.trim() || null,
    email: args.input.email?.trim() || null,
    address: args.input.address?.trim() || null,
    notes: args.input.notes?.trim() || null,
  });
};

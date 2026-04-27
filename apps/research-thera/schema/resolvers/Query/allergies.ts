import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const allergies: NonNullable<QueryResolvers['allergies']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  return db.listAllergies(userEmail);
};

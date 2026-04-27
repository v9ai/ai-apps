import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const medications: NonNullable<QueryResolvers['medications']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  return db.listMedications(userEmail);
};

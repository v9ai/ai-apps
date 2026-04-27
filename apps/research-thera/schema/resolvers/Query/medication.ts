import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const medication: NonNullable<QueryResolvers['medication']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  return db.getMedicationById(args.id, userEmail);
};

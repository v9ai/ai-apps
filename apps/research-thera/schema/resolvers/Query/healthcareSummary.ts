import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const healthcareSummary: NonNullable<QueryResolvers['healthcareSummary']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  return db.getHealthcareSummary(userEmail);
};

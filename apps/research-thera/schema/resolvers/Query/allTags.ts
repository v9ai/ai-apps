import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const allTags: NonNullable<QueryResolvers['allTags']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  return db.getAllTags(userEmail, { includeVault: ctx.vaultUnlocked === true });
};

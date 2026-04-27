import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const bloodTests: NonNullable<QueryResolvers['bloodTests']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  return db.listBloodTests(userEmail);
};

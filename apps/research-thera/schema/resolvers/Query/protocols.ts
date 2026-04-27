import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const protocols: NonNullable<QueryResolvers['protocols']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  return db.listProtocols(userEmail);
};

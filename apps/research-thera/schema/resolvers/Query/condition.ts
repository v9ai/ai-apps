import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const condition: NonNullable<QueryResolvers['condition']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  return db.getCondition(args.id, userEmail);
};

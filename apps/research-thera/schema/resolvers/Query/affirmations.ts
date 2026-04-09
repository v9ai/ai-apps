import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const affirmations: NonNullable<QueryResolvers['affirmations']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const list = await db.listAffirmations(args.familyMemberId, userEmail);
  return list.map((item) => ({
    ...item,
    category: item.category.toUpperCase() as any,
  }));
};

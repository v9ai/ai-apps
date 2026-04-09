import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const affirmation: NonNullable<QueryResolvers['affirmation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const item = await db.getAffirmation(args.id, userEmail);
  if (!item) throw new Error("Affirmation not found");

  return {
    ...item,
    category: item.category.toUpperCase() as any,
  };
};

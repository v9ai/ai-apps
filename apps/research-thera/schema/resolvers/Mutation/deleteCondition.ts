import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteCondition: NonNullable<MutationResolvers['deleteCondition']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.deleteCondition(args.id, userEmail);
  return { success: true };
};

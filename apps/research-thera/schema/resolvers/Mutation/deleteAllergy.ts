import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteAllergy: NonNullable<MutationResolvers['deleteAllergy']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.deleteAllergy(args.id, userEmail);
  return { success: true };
};

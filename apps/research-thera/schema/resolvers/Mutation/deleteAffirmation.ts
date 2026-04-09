import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteAffirmation: NonNullable<MutationResolvers['deleteAffirmation']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.deleteAffirmation(args.id, userEmail);
  return { success: true };
};

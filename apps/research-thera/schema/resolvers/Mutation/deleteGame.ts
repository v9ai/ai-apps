import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteGame: NonNullable<MutationResolvers['deleteGame']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.deleteGame(args.id, userEmail);
  return { success: true };
};

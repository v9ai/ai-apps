import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteHabit: NonNullable<MutationResolvers['deleteHabit']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.deleteHabit(args.id, userEmail);
  return { success: true };
};

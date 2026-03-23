import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteHabit: NonNullable<MutationResolvers['deleteHabit']> = async (
  _parent,
  args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) throw new Error("Authentication required");

  await db.deleteHabit(args.id, userId);
  return { success: true };
};

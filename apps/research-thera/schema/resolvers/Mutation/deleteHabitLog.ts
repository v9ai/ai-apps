import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteHabitLog: NonNullable<MutationResolvers['deleteHabitLog']> = async (
  _parent,
  args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) throw new Error("Authentication required");

  await db.deleteHabitLog(args.id, userId);
  return true;
};

import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteHabitLog: NonNullable<MutationResolvers['deleteHabitLog']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.deleteHabitLog(args.id, userEmail);
  return true;
};

import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteTask: NonNullable<MutationResolvers['deleteTask']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.deleteTask(args.id, userEmail);
  return { success: true };
};

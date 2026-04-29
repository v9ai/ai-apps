import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const reorderTasks: NonNullable<MutationResolvers['reorderTasks']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.reorderTasks(
    userEmail,
    args.updates.map((u) => ({ id: u.id as string, position: u.position })),
  );
  return true;
};

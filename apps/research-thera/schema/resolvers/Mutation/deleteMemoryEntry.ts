import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteMemoryEntry: NonNullable<MutationResolvers['deleteMemoryEntry']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.deleteMemoryEntry(args.id, userEmail);
  return { success: true };
};

import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteSupplement: NonNullable<MutationResolvers['deleteSupplement']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.deleteSupplement(args.id);
  return { success: true };
};

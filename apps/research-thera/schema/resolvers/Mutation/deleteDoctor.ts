import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteDoctor: NonNullable<MutationResolvers['deleteDoctor']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.deleteDoctor(args.id, userEmail);
  return { success: true };
};

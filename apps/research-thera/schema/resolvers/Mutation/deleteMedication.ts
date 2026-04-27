import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteMedication: NonNullable<MutationResolvers['deleteMedication']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.deleteMedication(args.id, userEmail);
  return { success: true };
};

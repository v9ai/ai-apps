import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteSymptom: NonNullable<MutationResolvers['deleteSymptom']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.deleteSymptom(args.id, userEmail);
  return { success: true };
};

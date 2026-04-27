import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteAppointment: NonNullable<MutationResolvers['deleteAppointment']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.deleteAppointment(args.id, userEmail);
  return { success: true };
};

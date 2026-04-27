import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteProtocol: NonNullable<MutationResolvers['deleteProtocol']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.deleteProtocol(args.id, userEmail);
  return { success: true };
};

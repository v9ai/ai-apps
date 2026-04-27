import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const updateProtocolStatus: NonNullable<MutationResolvers['updateProtocolStatus']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const updated = await db.updateProtocolStatus(args.id, userEmail, args.status);
  if (!updated) throw new Error("Protocol not found");
  return updated;
};

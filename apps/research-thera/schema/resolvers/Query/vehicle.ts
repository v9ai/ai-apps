import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const vehicle: NonNullable<QueryResolvers['vehicle']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  return db.getVehicle(args.id, userEmail);
};
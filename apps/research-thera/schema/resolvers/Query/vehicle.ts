import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const vehicle: NonNullable<QueryResolvers['vehicle']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  if (args.slug) {
    const bySlug = await db.getVehicleBySlug(args.slug, userEmail);
    if (bySlug) return bySlug;
  }
  if (args.id) return db.getVehicle(args.id, userEmail);
  if (!args.slug && !args.id) throw new Error("vehicle requires id or slug");
  return null;
};
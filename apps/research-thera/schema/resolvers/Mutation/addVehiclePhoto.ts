import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addVehiclePhoto: NonNullable<MutationResolvers['addVehiclePhoto']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.assertOwnsVehicle(args.input.vehicleId, userEmail);

  return db.createVehiclePhoto({
    vehicleId: args.input.vehicleId,
    r2Key: args.input.r2Key,
    contentType: args.input.contentType,
    sizeBytes: args.input.sizeBytes,
    caption: args.input.caption?.trim() || null,
  });
};
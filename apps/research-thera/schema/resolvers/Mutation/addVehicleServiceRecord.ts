import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addVehicleServiceRecord: NonNullable<MutationResolvers['addVehicleServiceRecord']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.assertOwnsVehicle(args.input.vehicleId, userEmail);

  const type = args.input.type.trim();
  if (!type) throw new Error("Service type is required");

  const serviceDate = new Date(args.input.serviceDate);
  if (Number.isNaN(serviceDate.getTime())) {
    throw new Error("Invalid serviceDate");
  }

  return db.createVehicleServiceRecord({
    vehicleId: args.input.vehicleId,
    type,
    serviceDate,
    odometerMiles: args.input.odometerMiles ?? null,
    costCents: args.input.costCents ?? null,
    vendor: args.input.vendor?.trim() || null,
    notes: args.input.notes?.trim() || null,
  });
};
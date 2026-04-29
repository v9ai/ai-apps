import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const updateVehicle: NonNullable<MutationResolvers['updateVehicle']> =
  async (_parent, args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) throw new Error("Authentication required");

    const patch = {
      ...(args.input.make !== undefined && args.input.make !== null
        ? { make: args.input.make.trim() }
        : {}),
      ...(args.input.model !== undefined && args.input.model !== null
        ? { model: args.input.model.trim() }
        : {}),
      ...(args.input.year !== undefined && args.input.year !== null
        ? { year: args.input.year }
        : {}),
      ...(args.input.vin !== undefined ? { vin: args.input.vin } : {}),
      ...(args.input.licensePlate !== undefined
        ? { licensePlate: args.input.licensePlate }
        : {}),
      ...(args.input.nickname !== undefined
        ? { nickname: args.input.nickname }
        : {}),
      ...(args.input.odometerMiles !== undefined
        ? { odometerMiles: args.input.odometerMiles }
        : {}),
      ...(args.input.color !== undefined ? { color: args.input.color } : {}),
      ...(args.input.notes !== undefined ? { notes: args.input.notes } : {}),
    };

    const updated = await db.updateVehicle(args.id, userEmail, patch);
    if (!updated) throw new Error("Vehicle not found");
    return updated;
  };
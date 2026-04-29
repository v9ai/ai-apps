import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

const currentYear = new Date().getFullYear();

export const addVehicle: NonNullable<MutationResolvers['addVehicle']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const make = args.input.make.trim();
  const model = args.input.model.trim();
  const year = args.input.year;

  if (!make) throw new Error("Make is required");
  if (!model) throw new Error("Model is required");
  if (!Number.isInteger(year) || year < 1900 || year > currentYear + 2) {
    throw new Error("Year must be a valid model year");
  }

  return db.createVehicle({
    userId: userEmail,
    make,
    model,
    year,
    vin: args.input.vin?.trim() || null,
    licensePlate: args.input.licensePlate?.trim() || null,
    nickname: args.input.nickname?.trim() || null,
    odometerMiles: args.input.odometerMiles ?? null,
    color: args.input.color?.trim() || null,
    notes: args.input.notes?.trim() || null,
  });
};
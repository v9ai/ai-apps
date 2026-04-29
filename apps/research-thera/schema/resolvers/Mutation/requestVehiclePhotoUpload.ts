import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import {
  generateVehiclePhotoKey,
  presignVehiclePhotoUpload,
} from "@/app/lib/r2-vehicle";

export const requestVehiclePhotoUpload: NonNullable<MutationResolvers['requestVehiclePhotoUpload']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  await db.assertOwnsVehicle(args.input.vehicleId, userEmail);

  const filename = args.input.filename || "photo.jpg";
  const r2Key = generateVehiclePhotoKey(args.input.vehicleId, filename);
  const uploadUrl = await presignVehiclePhotoUpload(r2Key);

  return { uploadUrl, r2Key };
};
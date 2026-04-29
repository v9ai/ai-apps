import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { deleteVehiclePhotoFromR2 } from "@/app/lib/r2-vehicle";

export const deleteVehiclePhoto: NonNullable<MutationResolvers['deleteVehiclePhoto']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { deleted, r2Key } = await db.deleteVehiclePhoto(args.id, userEmail);
  if (deleted && r2Key) {
    try {
      await deleteVehiclePhotoFromR2(r2Key);
    } catch (err) {
      console.error("[deleteVehiclePhoto] R2 delete failed:", err);
    }
  }
  return { id: args.id, deleted };
};
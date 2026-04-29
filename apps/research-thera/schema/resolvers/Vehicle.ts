import type { VehicleResolvers } from "./../types.generated";
import { db } from "@/src/db";
import { resolveVehiclePhotoUrl } from "@/app/lib/r2-vehicle";

export const Vehicle: VehicleResolvers = {
  photos: async (parent) => {
    const rows = await db.listVehiclePhotos(String(parent.id));
    return rows.map((p) => ({
      ...p,
      url: resolveVehiclePhotoUrl(p.id, p.r2Key),
    }));
  },
  serviceRecords: async (parent) => {
    return db.listVehicleServiceRecords(String(parent.id));
  },
  thumbnailUrl: async (parent) => {
    const rows = await db.listVehiclePhotos(String(parent.id));
    if (rows.length === 0) return null;
    const first = rows[0];
    return resolveVehiclePhotoUrl(first.id, first.r2Key);
  },
};
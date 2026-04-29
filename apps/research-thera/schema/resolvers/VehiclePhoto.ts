import type { VehiclePhotoResolvers } from "./../types.generated";
import { resolveVehiclePhotoUrl } from "@/app/lib/r2-vehicle";

export const VehiclePhoto: VehiclePhotoResolvers = {
  url: (parent) => {
    const existing = (parent as { url?: string }).url;
    if (existing) return existing;
    return resolveVehiclePhotoUrl(String(parent.id), parent.r2Key);
  },
};
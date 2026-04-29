import { getPresignedUrl, deleteFromR2 } from "@ai-apps/r2";

export const VEHICLE_R2_BUCKET = "research-thera";

export function generateVehiclePhotoKey(
  vehicleId: string,
  filename: string,
): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const ext = (filename.split(".").pop() || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `vehicles/${vehicleId}/${ts}-${rand}.${ext || "jpg"}`;
}

export async function presignVehiclePhotoUpload(
  key: string,
  expiresIn = 600,
): Promise<string> {
  return getPresignedUrl(key, expiresIn, { bucket: VEHICLE_R2_BUCKET });
}

export async function deleteVehiclePhotoFromR2(key: string): Promise<void> {
  await deleteFromR2(key, { bucket: VEHICLE_R2_BUCKET });
}

// Vehicle photos always stream via the auth-checked API route — the
// research-thera bucket has no public CDN, and the streaming route lets
// us enforce ownership before returning bytes. r2Key is unused here; kept
// in the signature so callers don't have to plumb it through differently.
export function resolveVehiclePhotoUrl(
  photoId: string,
  _r2Key: string,
): string {
  return `/api/vehicles/photo/${photoId}`;
}

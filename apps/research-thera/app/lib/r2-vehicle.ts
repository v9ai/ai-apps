import { getPresignedUrl, deleteFromR2 } from "@ai-apps/r2";

export const VEHICLE_R2_BUCKET = "research-thera";
const VEHICLE_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN ?? null;

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

/**
 * Build a viewable URL for a vehicle photo.
 * Prefers the configured CDN domain; falls back to the auth-checked
 * streaming route at /api/vehicles/photo/[id].
 */
export function resolveVehiclePhotoUrl(
  photoId: string,
  r2Key: string,
): string {
  if (VEHICLE_PUBLIC_DOMAIN) {
    const base = VEHICLE_PUBLIC_DOMAIN.replace(/\/$/, "");
    return `${base}/${r2Key}`;
  }
  return `/api/vehicles/photo/${photoId}`;
}

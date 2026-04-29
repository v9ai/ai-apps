import { sql as neonSql } from "./neon";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export type Vehicle = {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  licensePlate: string | null;
  nickname: string | null;
  odometerMiles: number | null;
  color: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VehiclePhoto = {
  id: string;
  vehicleId: string;
  r2Key: string;
  contentType: string;
  sizeBytes: number;
  caption: string | null;
  createdAt: string;
};

export type VehicleServiceRecord = {
  id: string;
  vehicleId: string;
  type: string;
  serviceDate: string;
  odometerMiles: number | null;
  costCents: number | null;
  vendor: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

function toVehicle(r: Record<string, unknown>): Vehicle {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    make: r.make as string,
    model: r.model as string,
    year: Number(r.year),
    vin: (r.vin as string | null) ?? null,
    licensePlate: (r.license_plate as string | null) ?? null,
    nickname: (r.nickname as string | null) ?? null,
    odometerMiles: r.odometer_miles == null ? null : Number(r.odometer_miles),
    color: (r.color as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
    updatedAt:
      r.updated_at instanceof Date
        ? r.updated_at.toISOString()
        : (r.updated_at as string),
  };
}

function toVehiclePhoto(r: Record<string, unknown>): VehiclePhoto {
  return {
    id: r.id as string,
    vehicleId: r.vehicle_id as string,
    r2Key: r.r2_key as string,
    contentType: r.content_type as string,
    sizeBytes: Number(r.size_bytes),
    caption: (r.caption as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
  };
}

function toServiceRecord(r: Record<string, unknown>): VehicleServiceRecord {
  return {
    id: r.id as string,
    vehicleId: r.vehicle_id as string,
    type: r.type as string,
    serviceDate:
      r.service_date instanceof Date
        ? r.service_date.toISOString()
        : (r.service_date as string),
    odometerMiles: r.odometer_miles == null ? null : Number(r.odometer_miles),
    costCents: r.cost_cents == null ? null : Number(r.cost_cents),
    vendor: (r.vendor as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    createdAt:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : (r.created_at as string),
    updatedAt:
      r.updated_at instanceof Date
        ? r.updated_at.toISOString()
        : (r.updated_at as string),
  };
}

// ────────────────────────────────────────────────────────────────────
// Vehicles
// ────────────────────────────────────────────────────────────────────

export async function listVehicles(userId: string): Promise<Vehicle[]> {
  const rows = await neonSql`
    SELECT id, user_id, make, model, year, vin, license_plate, nickname,
           odometer_miles, color, notes, created_at, updated_at
    FROM vehicles
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map(toVehicle);
}

export async function getVehicle(
  id: string,
  userId: string,
): Promise<Vehicle | null> {
  const rows = await neonSql`
    SELECT id, user_id, make, model, year, vin, license_plate, nickname,
           odometer_miles, color, notes, created_at, updated_at
    FROM vehicles
    WHERE id = ${id} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows.length === 0 ? null : toVehicle(rows[0]);
}

export async function assertOwnsVehicle(
  vehicleId: string,
  userId: string,
): Promise<void> {
  const rows = await neonSql`
    SELECT 1 FROM vehicles WHERE id = ${vehicleId} AND user_id = ${userId} LIMIT 1
  `;
  if (rows.length === 0) throw new Error("Vehicle not found");
}

export async function createVehicle(params: {
  userId: string;
  make: string;
  model: string;
  year: number;
  vin: string | null;
  licensePlate: string | null;
  nickname: string | null;
  odometerMiles: number | null;
  color: string | null;
  notes: string | null;
}): Promise<Vehicle> {
  const rows = await neonSql`
    INSERT INTO vehicles
      (user_id, make, model, year, vin, license_plate, nickname,
       odometer_miles, color, notes)
    VALUES
      (${params.userId}, ${params.make}, ${params.model}, ${params.year},
       ${params.vin}, ${params.licensePlate}, ${params.nickname},
       ${params.odometerMiles}, ${params.color}, ${params.notes})
    RETURNING id, user_id, make, model, year, vin, license_plate, nickname,
              odometer_miles, color, notes, created_at, updated_at
  `;
  return toVehicle(rows[0]);
}

export async function updateVehicle(
  id: string,
  userId: string,
  patch: {
    make?: string;
    model?: string;
    year?: number;
    vin?: string | null;
    licensePlate?: string | null;
    nickname?: string | null;
    odometerMiles?: number | null;
    color?: string | null;
    notes?: string | null;
  },
): Promise<Vehicle | null> {
  const fields: string[] = [];
  const args: unknown[] = [];

  if (patch.make !== undefined) { fields.push("make = ?"); args.push(patch.make); }
  if (patch.model !== undefined) { fields.push("model = ?"); args.push(patch.model); }
  if (patch.year !== undefined) { fields.push("year = ?"); args.push(patch.year); }
  if (patch.vin !== undefined) { fields.push("vin = ?"); args.push(patch.vin); }
  if (patch.licensePlate !== undefined) { fields.push("license_plate = ?"); args.push(patch.licensePlate); }
  if (patch.nickname !== undefined) { fields.push("nickname = ?"); args.push(patch.nickname); }
  if (patch.odometerMiles !== undefined) { fields.push("odometer_miles = ?"); args.push(patch.odometerMiles); }
  if (patch.color !== undefined) { fields.push("color = ?"); args.push(patch.color); }
  if (patch.notes !== undefined) { fields.push("notes = ?"); args.push(patch.notes); }

  if (fields.length === 0) {
    return getVehicle(id, userId);
  }

  fields.push("updated_at = NOW()");
  args.push(id, userId);

  let i = 0;
  const query =
    `UPDATE vehicles SET ${fields.join(", ")} ` +
    `WHERE id = ? AND user_id = ? ` +
    `RETURNING id, user_id, make, model, year, vin, license_plate, nickname, ` +
    `odometer_miles, color, notes, created_at, updated_at`;
  const pgQuery = query.replace(/\?/g, () => `$${++i}`);

  const rows = (await (neonSql as unknown as (
    q: string,
    p: unknown[],
  ) => Promise<Record<string, unknown>[]>)(pgQuery, args));
  return rows.length === 0 ? null : toVehicle(rows[0]);
}

export async function deleteVehicle(
  id: string,
  userId: string,
): Promise<boolean> {
  const rows = await neonSql`
    DELETE FROM vehicles
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

// ────────────────────────────────────────────────────────────────────
// Vehicle photos
// ────────────────────────────────────────────────────────────────────

export async function listVehiclePhotos(
  vehicleId: string,
): Promise<VehiclePhoto[]> {
  const rows = await neonSql`
    SELECT id, vehicle_id, r2_key, content_type, size_bytes, caption, created_at
    FROM vehicle_photos
    WHERE vehicle_id = ${vehicleId}
    ORDER BY created_at DESC
  `;
  return rows.map(toVehiclePhoto);
}

export async function getFirstPhotoForVehicles(
  vehicleIds: string[],
): Promise<Map<string, string>> {
  if (vehicleIds.length === 0) return new Map();
  const rows = await neonSql`
    SELECT DISTINCT ON (vehicle_id) vehicle_id, r2_key
    FROM vehicle_photos
    WHERE vehicle_id = ANY(${vehicleIds})
    ORDER BY vehicle_id, created_at DESC
  `;
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.vehicle_id as string, row.r2_key as string);
  }
  return map;
}

export async function createVehiclePhoto(params: {
  vehicleId: string;
  r2Key: string;
  contentType: string;
  sizeBytes: number;
  caption: string | null;
}): Promise<VehiclePhoto> {
  const rows = await neonSql`
    INSERT INTO vehicle_photos (vehicle_id, r2_key, content_type, size_bytes, caption)
    VALUES (${params.vehicleId}, ${params.r2Key}, ${params.contentType}, ${params.sizeBytes}, ${params.caption})
    RETURNING id, vehicle_id, r2_key, content_type, size_bytes, caption, created_at
  `;
  return toVehiclePhoto(rows[0]);
}

export async function deleteVehiclePhoto(
  id: string,
  userId: string,
): Promise<{ deleted: boolean; r2Key: string | null }> {
  const rows = await neonSql`
    DELETE FROM vehicle_photos
    WHERE id = ${id}
      AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ${userId})
    RETURNING r2_key
  `;
  if (rows.length === 0) return { deleted: false, r2Key: null };
  return { deleted: true, r2Key: rows[0].r2_key as string };
}

// ────────────────────────────────────────────────────────────────────
// Service records
// ────────────────────────────────────────────────────────────────────

export async function listVehicleServiceRecords(
  vehicleId: string,
): Promise<VehicleServiceRecord[]> {
  const rows = await neonSql`
    SELECT id, vehicle_id, type, service_date, odometer_miles, cost_cents,
           vendor, notes, created_at, updated_at
    FROM vehicle_service_records
    WHERE vehicle_id = ${vehicleId}
    ORDER BY service_date DESC, created_at ASC
  `;
  return rows.map(toServiceRecord);
}

export async function createVehicleServiceRecord(params: {
  vehicleId: string;
  type: string;
  serviceDate: Date;
  odometerMiles: number | null;
  costCents: number | null;
  vendor: string | null;
  notes: string | null;
}): Promise<VehicleServiceRecord> {
  const rows = await neonSql`
    INSERT INTO vehicle_service_records
      (vehicle_id, type, service_date, odometer_miles, cost_cents, vendor, notes)
    VALUES
      (${params.vehicleId}, ${params.type}, ${params.serviceDate.toISOString()},
       ${params.odometerMiles}, ${params.costCents}, ${params.vendor}, ${params.notes})
    RETURNING id, vehicle_id, type, service_date, odometer_miles, cost_cents,
              vendor, notes, created_at, updated_at
  `;
  return toServiceRecord(rows[0]);
}

export async function deleteVehicleServiceRecord(
  id: string,
  userId: string,
): Promise<boolean> {
  const rows = await neonSql`
    DELETE FROM vehicle_service_records
    WHERE id = ${id}
      AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ${userId})
    RETURNING id
  `;
  return rows.length > 0;
}

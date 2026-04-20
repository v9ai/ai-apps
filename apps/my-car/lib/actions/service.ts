"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/src/db";
import { cars, serviceRecords } from "@/src/db/schema";
import { requireUser } from "@/lib/require-user";
import { createServiceRecordSchema } from "@/lib/validators";

async function assertOwnsCar(userId: string, carId: string): Promise<void> {
  const rows = await db
    .select({ id: cars.id })
    .from(cars)
    .where(and(eq(cars.id, carId), eq(cars.userId, userId)))
    .limit(1);
  if (rows.length === 0) throw new Error("Car not found");
}

export async function addServiceRecordAction(formData: FormData): Promise<void> {
  const { userId } = await requireUser();
  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  for (const k of Object.keys(raw)) if (raw[k] === "") raw[k] = null;
  const input = createServiceRecordSchema.parse(raw);

  await assertOwnsCar(userId, input.carId);

  await db.insert(serviceRecords).values({
    carId: input.carId,
    type: input.type,
    serviceDate: input.serviceDate,
    odometerMiles: input.odometerMiles ?? null,
    costCents: input.costCents ?? null,
    vendor: input.vendor ?? null,
    notes: input.notes ?? null,
  });

  revalidatePath(`/cars/${input.carId}`);
}

export async function deleteServiceRecordAction(id: string): Promise<void> {
  const { userId } = await requireUser();

  const rows = await db
    .select({ id: serviceRecords.id, carId: serviceRecords.carId })
    .from(serviceRecords)
    .innerJoin(cars, eq(cars.id, serviceRecords.carId))
    .where(and(eq(serviceRecords.id, id), eq(cars.userId, userId)))
    .limit(1);

  if (rows.length === 0) throw new Error("Service record not found");
  const { carId } = rows[0];

  await db.delete(serviceRecords).where(eq(serviceRecords.id, id));
  revalidatePath(`/cars/${carId}`);
}

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/src/db";
import { cars } from "@/src/db/schema";
import { requireUser } from "@/lib/require-user";
import {
  createCarSchema,
  updateCarSchema,
  type CreateCarInput,
  type UpdateCarInput,
} from "@/lib/validators";

function normalize<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

export async function createCarAction(formData: FormData): Promise<void> {
  const { userId } = await requireUser();
  const raw = normalize(Object.fromEntries(formData.entries()));
  const input: CreateCarInput = createCarSchema.parse(raw);

  const [row] = await db
    .insert(cars)
    .values({ userId, ...input })
    .returning({ id: cars.id });

  revalidatePath("/");
  redirect(`/cars/${row.id}`);
}

export async function updateCarAction(id: string, input: UpdateCarInput): Promise<void> {
  const { userId } = await requireUser();
  const patch = updateCarSchema.parse(input);
  await db
    .update(cars)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(cars.id, id), eq(cars.userId, userId)));
  revalidatePath("/");
  revalidatePath(`/cars/${id}`);
}

export async function deleteCarAction(id: string): Promise<void> {
  const { userId } = await requireUser();
  await db.delete(cars).where(and(eq(cars.id, id), eq(cars.userId, userId)));
  revalidatePath("/");
  redirect("/");
}

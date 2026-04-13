"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { medications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
export async function addMedication(formData: FormData) {
  const { userId } = await withAuth();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const dosage = (formData.get("dosage") as string)?.trim() || null;
  const frequency = (formData.get("frequency") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const startDate = (formData.get("start_date") as string) || null;
  const endDate = (formData.get("end_date") as string) || null;

  const [medication] = await db
    .insert(medications)
    .values({
      userId,
      name,
      dosage,
      frequency,
      notes,
      startDate,
      endDate,
    })
    .returning();

  try {
    const { embedMedication } = await import("@/lib/embed");
    await embedMedication(medication.id, userId, name, {
      dosage,
      frequency,
      notes,
    });
  } catch {
    // Embedding failure is non-blocking
  }

  revalidatePath("/medications");
}

export async function deleteMedication(id: string) {
  await withAuth();
  await db.delete(medications).where(eq(medications.id, id));
  revalidatePath("/medications");
}

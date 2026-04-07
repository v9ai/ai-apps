"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { conditionMedications, conditions, medications } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { embedMedication } from "@/lib/embed";

export async function linkMedicationToCondition(
  conditionId: string,
  medicationId: string,
): Promise<void> {
  const { userId } = await withAuth();

  const [condition] = await db
    .select({ id: conditions.id })
    .from(conditions)
    .where(and(eq(conditions.id, conditionId), eq(conditions.userId, userId)));

  if (!condition) return;

  const [medication] = await db
    .select({ id: medications.id })
    .from(medications)
    .where(and(eq(medications.id, medicationId), eq(medications.userId, userId)));

  if (!medication) return;

  await db
    .insert(conditionMedications)
    .values({ conditionId, medicationId })
    .onConflictDoNothing();

  revalidatePath(`/conditions/${conditionId}`);
  revalidatePath(`/medications/${medicationId}`);
}

export async function unlinkMedicationFromCondition(
  conditionId: string,
  medicationId: string,
): Promise<void> {
  const { userId } = await withAuth();

  const [condition] = await db
    .select({ id: conditions.id })
    .from(conditions)
    .where(and(eq(conditions.id, conditionId), eq(conditions.userId, userId)));

  if (!condition) return;

  const [medication] = await db
    .select({ id: medications.id })
    .from(medications)
    .where(and(eq(medications.id, medicationId), eq(medications.userId, userId)));

  if (!medication) return;

  await db
    .delete(conditionMedications)
    .where(
      and(
        eq(conditionMedications.conditionId, conditionId),
        eq(conditionMedications.medicationId, medicationId),
      ),
    );

  revalidatePath(`/conditions/${conditionId}`);
  revalidatePath(`/medications/${medicationId}`);
}

export async function quickAddAndLinkMedication(
  conditionId: string,
  formData: FormData,
): Promise<void> {
  const { userId } = await withAuth();

  const [condition] = await db
    .select({ id: conditions.id })
    .from(conditions)
    .where(and(eq(conditions.id, conditionId), eq(conditions.userId, userId)));

  if (!condition) return;

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const dosage = (formData.get("dosage") as string)?.trim() || null;
  const frequency = (formData.get("frequency") as string)?.trim() || null;

  const [medication] = await db
    .insert(medications)
    .values({ userId, name, dosage, frequency })
    .returning();

  try {
    await embedMedication(medication.id, userId, name, { dosage, frequency });
  } catch {
    // Embedding failure is non-blocking
  }

  await db
    .insert(conditionMedications)
    .values({ conditionId, medicationId: medication.id })
    .onConflictDoNothing();

  revalidatePath(`/conditions/${conditionId}`);
  revalidatePath("/medications");
}

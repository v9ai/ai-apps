"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { doctors, medicalLetters } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { uploadToR2, deleteFromR2 } from "@ai-apps/r2";
import { R2_BUCKET } from "@/lib/r2-bucket";

export async function addDoctor(formData: FormData) {
  const { userId } = await withAuth();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const specialty = (formData.get("specialty") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  await db.insert(doctors).values({ userId, name, specialty, phone, email, address, notes });

  revalidatePath("/doctors");
}

export async function deleteDoctor(id: string) {
  await withAuth();
  await db.delete(doctors).where(eq(doctors.id, id));
  revalidatePath("/doctors");
}

export async function uploadMedicalLetter(doctorId: string, formData: FormData) {
  const { userId } = await withAuth();

  const file = formData.get("file") as File;
  if (!file || file.size === 0) return;

  const description = (formData.get("description") as string)?.trim() || null;
  const letterDate = (formData.get("letter_date") as string)?.trim() || null;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const key = `medical-letters/${userId}/${doctorId}/${Date.now()}-${file.name}`;

  await uploadToR2({
    key,
    body: buffer,
    contentType: file.type || "application/octet-stream",
    bucket: R2_BUCKET,
  });

  await db.insert(medicalLetters).values({
    userId,
    doctorId,
    fileName: file.name,
    filePath: key,
    description,
    letterDate: letterDate || null,
  });

  revalidatePath(`/doctors/${doctorId}`);
}

export async function deleteMedicalLetter(letterId: string, doctorId: string) {
  const { userId } = await withAuth();

  const [letter] = await db
    .select()
    .from(medicalLetters)
    .where(and(eq(medicalLetters.id, letterId), eq(medicalLetters.userId, userId)));

  if (!letter) return;

  await deleteFromR2(letter.filePath, { bucket: R2_BUCKET });
  await db.delete(medicalLetters).where(eq(medicalLetters.id, letterId));

  revalidatePath(`/doctors/${doctorId}`);
}

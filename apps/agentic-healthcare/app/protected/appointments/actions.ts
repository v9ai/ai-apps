"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { embedAppointment } from "@/lib/embeddings";

export async function addAppointment(formData: FormData) {
  const { userId } = await withAuth();

  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const provider = (formData.get("provider") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const appointmentDate = (formData.get("appointment_date") as string) || null;

  const [appointment] = await db
    .insert(appointments)
    .values({
      userId,
      title,
      provider,
      notes,
      appointmentDate,
    })
    .returning();

  try {
    await embedAppointment(appointment.id, userId, title, {
      provider,
      notes,
      appointmentDate,
    });
  } catch {
    // Embedding failure is non-blocking
  }

  revalidatePath("/protected/appointments");
}

export async function deleteAppointment(id: string) {
  await withAuth();
  await db.delete(appointments).where(eq(appointments.id, id));
  revalidatePath("/protected/appointments");
}

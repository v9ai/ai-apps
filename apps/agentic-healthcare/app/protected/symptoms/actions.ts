"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { symptoms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { embedSymptom } from "@/lib/embeddings";

export async function addSymptom(formData: FormData) {
  const { userId } = await withAuth();

  const description = (formData.get("description") as string)?.trim();
  if (!description) return;

  const severity = (formData.get("severity") as string) || null;
  const loggedAtStr = (formData.get("logged_at") as string) || new Date().toISOString();

  const [symptom] = await db
    .insert(symptoms)
    .values({
      userId,
      description,
      severity,
      loggedAt: new Date(loggedAtStr),
    })
    .returning();

  try {
    await embedSymptom(symptom.id, userId, description, {
      severity,
      loggedAt: new Date(symptom.loggedAt).toLocaleDateString(),
    });
  } catch {
    // Embedding failure is non-blocking
  }

  revalidatePath("/protected/symptoms");
}

export async function deleteSymptom(id: string) {
  await withAuth();
  await db.delete(symptoms).where(eq(symptoms.id, id));
  revalidatePath("/protected/symptoms");
}

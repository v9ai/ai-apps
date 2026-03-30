"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { conditions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { embedCondition } from "@/lib/embed";

export async function addCondition(formData: FormData) {
  const { userId } = await withAuth();

  const name = (formData.get("name") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim() || null;
  if (!name) return;

  const [condition] = await db
    .insert(conditions)
    .values({ userId, name, notes })
    .returning();

  if (condition) {
    try {
      await embedCondition(condition.id, userId, name, notes);
    } catch {
      // Embedding failure is non-blocking
    }
  }

  revalidatePath("/conditions");
}

export async function deleteCondition(id: string) {
  await withAuth();
  await db.delete(conditions).where(eq(conditions.id, id));
  revalidatePath("/conditions");
}

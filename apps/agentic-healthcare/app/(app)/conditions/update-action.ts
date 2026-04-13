"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { conditions, conditionEmbeddings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

export async function updateConditionName(id: string, formData: FormData) {
  const { userId } = await withAuth();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const [condition] = await db
    .select({ notes: conditions.notes })
    .from(conditions)
    .where(eq(conditions.id, id));

  if (!condition) return;

  await db.update(conditions).set({ name }).where(eq(conditions.id, id));

  try {
    const { embedCondition } = await import("@/lib/embed");
    await embedCondition(id, userId, name, condition.notes);
  } catch {
    // Re-embed failure is non-blocking
  }

  revalidatePath(`/conditions/${id}`);
  revalidatePath("/conditions");
}

export async function updateConditionNotes(id: string, formData: FormData) {
  const { userId } = await withAuth();

  const notes = (formData.get("notes") as string)?.trim() || null;

  const [condition] = await db
    .select({ name: conditions.name })
    .from(conditions)
    .where(eq(conditions.id, id));

  if (!condition) return;

  await db
    .update(conditions)
    .set({ notes })
    .where(eq(conditions.id, id));

  try {
    const { embedCondition } = await import("@/lib/embed");
    await embedCondition(id, userId, condition.name, notes);
  } catch {
    // Re-embed failure is non-blocking
  }

  revalidatePath(`/conditions/${id}`);
}

export async function getRelatedMarkers(conditionId: string) {
  const { userId } = await withAuth();

  const [conditionEmb] = await db
    .select({ content: conditionEmbeddings.content })
    .from(conditionEmbeddings)
    .where(eq(conditionEmbeddings.conditionId, conditionId));

  if (!conditionEmb) return [];

  const { generateEmbedding } = await import("@/lib/embed");
  const embedding = await generateEmbedding(conditionEmb.content);
  const embStr = `[${embedding.join(",")}]`;

  const data = await db.execute(sql`
    SELECT id, marker_id, test_id, marker_name, content,
           1 - (embedding <=> ${embStr}::vector) as similarity
    FROM blood_marker_embeddings
    WHERE user_id = ${userId}
      AND 1 - (embedding <=> ${embStr}::vector) > 0.3
    ORDER BY embedding <=> ${embStr}::vector
    LIMIT 10
  `);

  return data.rows as Array<{
    id: string;
    marker_id: string;
    test_id: string;
    marker_name: string;
    content: string;
    similarity: number;
  }>;
}

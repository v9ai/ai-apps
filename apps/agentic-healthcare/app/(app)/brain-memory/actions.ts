"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { memoryEntries, memoryBaseline } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addMemoryEntry(formData: FormData) {
  const { userId } = await withAuth();

  const category = (formData.get("category") as string) || "observation";
  const description = (formData.get("description") as string)?.trim() || null;
  const context = (formData.get("context") as string)?.trim() || null;
  const protocolId = (formData.get("protocolId") as string) || null;

  await db.insert(memoryEntries).values({
    userId,
    overallScore: parseFloat(formData.get("overallScore") as string) || null,
    shortTermScore: parseFloat(formData.get("shortTermScore") as string) || null,
    longTermScore: parseFloat(formData.get("longTermScore") as string) || null,
    workingMemoryScore: parseFloat(formData.get("workingMemoryScore") as string) || null,
    recallSpeed: parseFloat(formData.get("recallSpeed") as string) || null,
    category,
    description,
    context,
    protocolId: protocolId || null,
  });

  revalidatePath("/brain-memory");
}

export async function deleteMemoryEntry(id: string) {
  const { userId } = await withAuth();

  await db
    .delete(memoryEntries)
    .where(and(eq(memoryEntries.id, id), eq(memoryEntries.userId, userId)));

  revalidatePath("/brain-memory");
}

export async function setMemoryBaseline(formData: FormData) {
  const { userId } = await withAuth();

  const scores = {
    overallScore: parseFloat(formData.get("overallScore") as string) || null,
    shortTermScore: parseFloat(formData.get("shortTermScore") as string) || null,
    longTermScore: parseFloat(formData.get("longTermScore") as string) || null,
    workingMemoryScore: parseFloat(formData.get("workingMemoryScore") as string) || null,
    recallSpeed: parseFloat(formData.get("recallSpeed") as string) || null,
  };

  await db
    .insert(memoryBaseline)
    .values({ userId, ...scores })
    .onConflictDoUpdate({
      target: memoryBaseline.userId,
      set: { ...scores, recordedAt: new Date() },
    });

  revalidatePath("/brain-memory");
}

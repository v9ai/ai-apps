"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }
  return out;
}

export async function addJournalEntry(formData: FormData) {
  const { userId } = await withAuth();

  const body = (formData.get("body") as string)?.trim();
  if (!body) return;

  const title = (formData.get("title") as string)?.trim() || null;
  const mood = (formData.get("mood") as string)?.trim() || null;
  const tags = parseTags(formData.get("tags") as string | null);
  const loggedAtStr = (formData.get("logged_at") as string) || new Date().toISOString();

  const [entry] = await db
    .insert(journalEntries)
    .values({
      userId,
      title,
      body,
      mood,
      tags,
      loggedAt: new Date(loggedAtStr),
    })
    .returning();

  try {
    const { embedJournalEntry } = await import("@/lib/embed");
    await embedJournalEntry(entry.id, userId, body, {
      title,
      mood,
      tags,
      loggedAt: new Date(entry.loggedAt).toLocaleDateString(),
    });
  } catch {
    // Embedding failure is non-blocking
  }

  revalidatePath("/journal");
}

export async function deleteJournalEntry(id: string) {
  const { userId } = await withAuth();

  await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));

  revalidatePath("/journal");
}

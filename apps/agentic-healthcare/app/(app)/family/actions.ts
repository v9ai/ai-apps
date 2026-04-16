"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(userId: string, name: string): Promise<string> {
  const base = toSlug(name);
  let slug = base;
  let i = 2;
  while (true) {
    const [existing] = await db
      .select({ id: familyMembers.id })
      .from(familyMembers)
      .where(and(eq(familyMembers.userId, userId), eq(familyMembers.slug, slug)));
    if (!existing) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function addFamilyMember(formData: FormData) {
  const { userId } = await withAuth();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const relationship = (formData.get("relationship") as string)?.trim() || null;
  const dateOfBirth = (formData.get("date_of_birth") as string) || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const slug = await uniqueSlug(userId, name);

  await db.insert(familyMembers).values({ userId, name, slug, relationship, dateOfBirth, notes });

  revalidatePath("/family");
}

export async function deleteFamilyMember(id: string) {
  await withAuth();
  await db.delete(familyMembers).where(eq(familyMembers.id, id));
  revalidatePath("/family");
}

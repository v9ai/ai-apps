"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addFamilyMember(formData: FormData) {
  const { userId } = await withAuth();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const relationship = (formData.get("relationship") as string)?.trim() || null;
  const dateOfBirth = (formData.get("date_of_birth") as string) || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  await db.insert(familyMembers).values({ userId, name, relationship, dateOfBirth, notes });

  revalidatePath("/family");
}

export async function deleteFamilyMember(id: string) {
  await withAuth();
  await db.delete(familyMembers).where(eq(familyMembers.id, id));
  revalidatePath("/family");
}

"use server";

import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { doctors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

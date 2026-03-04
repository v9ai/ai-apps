"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addCondition(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const name = (formData.get("name") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim() || null;
  if (!name) return;

  await supabase.from("conditions").insert({ user_id: user.id, name, notes });
  revalidatePath("/protected/conditions");
}

export async function deleteCondition(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("conditions").delete().eq("id", id);
  revalidatePath("/protected/conditions");
}

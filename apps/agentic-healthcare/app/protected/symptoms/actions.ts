"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { embedSymptom } from "@/lib/embeddings";

export async function addSymptom(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const description = (formData.get("description") as string)?.trim();
  if (!description) return;

  const severity = (formData.get("severity") as string) || null;
  const logged_at = (formData.get("logged_at") as string) || new Date().toISOString();

  const { data: symptom, error } = await supabase
    .from("symptoms")
    .insert({
      user_id: user.id,
      description,
      severity,
      logged_at,
    })
    .select("id, logged_at")
    .single();

  if (error) throw new Error(error.message);

  try {
    await embedSymptom(supabase, symptom.id, user.id, description, {
      severity,
      loggedAt: new Date(symptom.logged_at).toLocaleDateString(),
    });
  } catch {
    // Embedding failure is non-blocking
  }

  revalidatePath("/protected/symptoms");
}

export async function deleteSymptom(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("symptoms").delete().eq("id", id);
  revalidatePath("/protected/symptoms");
}

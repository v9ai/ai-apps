"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { embedMedication } from "@/lib/embeddings";

export async function addMedication(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const dosage = (formData.get("dosage") as string)?.trim() || null;
  const frequency = (formData.get("frequency") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const start_date = (formData.get("start_date") as string) || null;
  const end_date = (formData.get("end_date") as string) || null;

  const { data: medication, error } = await supabase
    .from("medications")
    .insert({
      user_id: user.id,
      name,
      dosage,
      frequency,
      notes,
      start_date,
      end_date,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  try {
    await embedMedication(supabase, medication.id, user.id, name, {
      dosage,
      frequency,
      notes,
    });
  } catch {
    // Embedding failure is non-blocking
  }

  revalidatePath("/protected/medications");
}

export async function deleteMedication(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("medications").delete().eq("id", id);
  revalidatePath("/protected/medications");
}

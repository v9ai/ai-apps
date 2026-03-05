"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { embedAppointment } from "@/lib/embeddings";

export async function addAppointment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const provider = (formData.get("provider") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const appointment_date = (formData.get("appointment_date") as string) || null;

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      user_id: user.id,
      title,
      provider,
      notes,
      appointment_date,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  try {
    await embedAppointment(supabase, appointment.id, user.id, title, {
      provider,
      notes,
      appointmentDate: appointment_date,
    });
  } catch {
    // Embedding failure is non-blocking
  }

  revalidatePath("/protected/appointments");
}

export async function deleteAppointment(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("appointments").delete().eq("id", id);
  revalidatePath("/protected/appointments");
}

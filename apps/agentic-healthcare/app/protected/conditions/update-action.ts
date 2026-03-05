"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { embedCondition } from "@/lib/embeddings";
import { generateEmbedding } from "@/lib/embeddings";

export async function updateConditionNotes(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const notes = (formData.get("notes") as string)?.trim() || null;

  const { data: condition } = await supabase
    .from("conditions")
    .select("name")
    .eq("id", id)
    .single();

  if (!condition) return;

  await supabase
    .from("conditions")
    .update({ notes })
    .eq("id", id);

  try {
    await embedCondition(supabase, id, user.id, condition.name, notes);
  } catch {
    // Re-embed failure is non-blocking
  }

  revalidatePath(`/protected/conditions/${id}`);
}

export async function getRelatedMarkers(conditionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: conditionEmb } = await supabase
    .from("condition_embeddings")
    .select("content")
    .eq("condition_id", conditionId)
    .single();

  if (!conditionEmb) return [];

  const embedding = await generateEmbedding(conditionEmb.content);

  const { data } = await supabase.rpc("match_markers", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 10,
  });

  return (data ?? []) as Array<{
    id: string;
    marker_id: string;
    test_id: string;
    marker_name: string;
    content: string;
    similarity: number;
  }>;
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gqlMutate } from "@/lib/graphql/execute";
import { InsertConditionDocument, DeleteConditionDocument } from "@/lib/graphql/__generated__/graphql";
import { embedCondition } from "@/lib/embeddings";

export async function addCondition(formData: FormData) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const name = (formData.get("name") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim() || null;
  if (!name) return;

  const data = await gqlMutate(
    InsertConditionDocument,
    { user_id: session.user.id, name, notes },
    session.access_token,
  );

  const condition = data.insertIntoconditionsCollection?.records[0];
  if (condition) {
    try {
      await embedCondition(supabase, condition.id, session.user.id, name, notes);
    } catch {
      // Embedding failure is non-blocking
    }
  }

  revalidatePath("/protected/conditions");
}

export async function deleteCondition(id: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  await gqlMutate(DeleteConditionDocument, { id }, session.access_token);
  revalidatePath("/protected/conditions");
}

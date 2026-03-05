"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseBrief } from "@/lib/brief-parser";

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createSession(formData: FormData) {
  const supabase = await createClient();

  const briefTitle = (formData.get("brief_title") as string)?.trim();
  if (!briefTitle) throw new Error("Brief title is required");

  const jurisdiction = (formData.get("jurisdiction") as string) || null;
  const maxRounds = parseInt(formData.get("max_rounds") as string) || 3;
  const file = formData.get("file") as File | null;

  let storagePath: string | null = null;
  if (file && file.size > 0) {
    storagePath = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("briefs")
      .upload(storagePath, file);
    if (uploadError) throw new Error(uploadError.message);
  }

  // Get brief text: prefer pasted text, fall back to parsed file
  let briefText = (formData.get("brief_text") as string)?.trim() || null;
  if (!briefText && file && file.size > 0) {
    try {
      briefText = await parseBrief(file);
    } catch {
      // Fall back to null — user can paste text manually
    }
  }

  // Generate unique slug from title
  let slug = toSlug(briefTitle);
  const { data: existing } = await supabase
    .from("stress_test_sessions")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data, error } = await supabase
    .from("stress_test_sessions")
    .insert({
      brief_title: briefTitle,
      brief_storage_path: storagePath,
      brief_text: briefText,
      jurisdiction,
      slug,
      status: "pending",
      config: { max_rounds: maxRounds },
    })
    .select("slug")
    .single();

  if (error) throw new Error(error.message);

  redirect(`/sessions/${data.slug}`);
}

export async function deleteSession(slug: string) {
  const supabase = await createClient();

  const { data: sessionData } = await supabase
    .from("stress_test_sessions")
    .select("id, brief_storage_path")
    .eq("slug", slug)
    .single();

  if (!sessionData) throw new Error("Session not found");

  // Delete storage file if exists
  if (sessionData?.brief_storage_path) {
    await supabase.storage
      .from("briefs")
      .remove([sessionData.brief_storage_path]);
  }

  // Delete session (cascades to audit_trail, eval_runs, findings)
  const { error } = await supabase
    .from("stress_test_sessions")
    .delete()
    .eq("id", sessionData.id);

  if (error) throw new Error(error.message);

  redirect("/sessions");
}

export async function getSessions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("stress_test_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getSessionWithFindings(slug: string) {
  const supabase = await createClient();

  const sessionResult = await supabase
    .from("stress_test_sessions")
    .select("*")
    .eq("slug", slug)
    .single();

  if (sessionResult.error) throw new Error(sessionResult.error.message);

  const sessionId = sessionResult.data.id;

  const [findingsResult, auditResult] = await Promise.all([
    supabase
      .from("findings")
      .select("*")
      .eq("session_id", sessionId)
      .order("severity", { ascending: false }),
    supabase
      .from("audit_trail")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  return {
    session: sessionResult.data,
    findings: findingsResult.data ?? [],
    auditTrail: auditResult.data ?? [],
  };
}

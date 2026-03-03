"use server";

import { createClient } from "@/lib/supabase/server";
import { formatTestForEmbedding, generateEmbedding } from "@/lib/embeddings";
import { redirect } from "next/navigation";

export async function reembedAllTests() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fetch completed tests that lack embeddings
  const { data: tests, error: testsError } = await supabase
    .from("blood_tests")
    .select("id, file_name, uploaded_at")
    .eq("user_id", user.id)
    .eq("status", "done");

  if (testsError) throw new Error(testsError.message);
  if (!tests || tests.length === 0) return { embedded: 0 };

  const { data: existing } = await supabase
    .from("blood_test_embeddings")
    .select("test_id")
    .eq("user_id", user.id);

  const existingIds = new Set((existing ?? []).map((e) => e.test_id));
  const missing = tests.filter((t) => !existingIds.has(t.id));

  let embedded = 0;
  for (const test of missing) {
    const { data: markers } = await supabase
      .from("blood_markers")
      .select("name, value, unit, reference_range, flag")
      .eq("test_id", test.id);

    if (!markers || markers.length === 0) continue;

    const content = formatTestForEmbedding(markers, {
      fileName: test.file_name,
      uploadedAt: test.uploaded_at,
    });
    const embedding = await generateEmbedding(content);

    await supabase.from("blood_test_embeddings").upsert(
      {
        test_id: test.id,
        user_id: user.id,
        content,
        embedding: JSON.stringify(embedding),
      },
      { onConflict: "test_id" }
    );
    embedded++;
  }

  return { embedded };
}

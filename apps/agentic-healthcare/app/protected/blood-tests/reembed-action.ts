"use server";

import { createClient } from "@/lib/supabase/server";
import { embedBloodTest, embedBloodMarkers } from "@/lib/embeddings";
import { redirect } from "next/navigation";

export async function reembedAllTests() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: tests, error: testsError } = await supabase
    .from("blood_tests")
    .select("id, file_name, uploaded_at, test_date")
    .eq("user_id", user.id)
    .eq("status", "done");

  if (testsError) throw new Error(testsError.message);
  if (!tests || tests.length === 0) return { embedded: 0 };

  const { data: existingTest } = await supabase
    .from("blood_test_embeddings")
    .select("test_id")
    .eq("user_id", user.id);

  const existingTestIds = new Set((existingTest ?? []).map((e) => e.test_id));
  const missing = tests.filter((t) => !existingTestIds.has(t.id));

  let embedded = 0;
  for (const test of missing) {
    const { data: markers } = await supabase
      .from("blood_markers")
      .select("id, name, value, unit, reference_range, flag")
      .eq("test_id", test.id);

    if (!markers || markers.length === 0) continue;

    const meta = { fileName: test.file_name, uploadedAt: test.uploaded_at };
    await embedBloodTest(supabase, test.id, user.id, markers, meta);

    await embedBloodMarkers(supabase, test.id, user.id, markers, {
      fileName: test.file_name,
      testDate: test.test_date ?? test.uploaded_at,
    });

    embedded++;
  }

  return { embedded };
}

import { QwenClient } from "@repo/qwen";
import { SupabaseClient } from "@supabase/supabase-js";

const qwen = new QwenClient({
  apiKey: process.env.DASHSCOPE_API_KEY!,
  baseURL: process.env.DASHSCOPE_BASE_URL,
});

export type MarkerInput = {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  flag: string;
};

export type MarkerWithId = MarkerInput & { id: string };

export function formatTestForEmbedding(
  markers: MarkerInput[],
  meta: { fileName: string; uploadedAt: string }
): string {
  const flagged = markers.filter((m) => m.flag !== "normal");
  const summary =
    flagged.length > 0
      ? `${flagged.length} abnormal marker(s): ${flagged.map((m) => `${m.name} (${m.flag})`).join(", ")}`
      : "All markers within normal range";

  const lines = markers.map(
    (m) =>
      `${m.name}: ${m.value} ${m.unit} (ref: ${m.reference_range || "N/A"}) [${m.flag}]`
  );

  return [
    `Blood test: ${meta.fileName}`,
    `Date: ${meta.uploadedAt}`,
    `Summary: ${summary}`,
    "",
    ...lines,
  ].join("\n");
}

export function formatMarkerForEmbedding(
  marker: MarkerInput,
  meta: { fileName: string; testDate: string }
): string {
  return [
    `Marker: ${marker.name}`,
    `Value: ${marker.value} ${marker.unit}`,
    `Reference range: ${marker.reference_range || "N/A"}`,
    `Flag: ${marker.flag}`,
    `Test: ${meta.fileName}`,
    `Date: ${meta.testDate}`,
  ].join("\n");
}

export function formatConditionForEmbedding(
  name: string,
  notes: string | null
): string {
  return notes
    ? `Health condition: ${name}\nNotes: ${notes}`
    : `Health condition: ${name}`;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return qwen.embedOne(text);
}

/** Embed an entire blood test (summary of all markers). */
export async function embedBloodTest(
  supabase: SupabaseClient,
  testId: string,
  userId: string,
  markers: MarkerInput[],
  meta: { fileName: string; uploadedAt: string }
) {
  const content = formatTestForEmbedding(markers, meta);
  const embedding = await generateEmbedding(content);

  await supabase.from("blood_test_embeddings").upsert(
    {
      test_id: testId,
      user_id: userId,
      content,
      embedding: JSON.stringify(embedding),
    },
    { onConflict: "test_id" }
  );
}

/** Embed each marker individually for fine-grained search. */
export async function embedBloodMarkers(
  supabase: SupabaseClient,
  testId: string,
  userId: string,
  markers: MarkerWithId[],
  meta: { fileName: string; testDate: string }
) {
  for (const marker of markers) {
    const content = formatMarkerForEmbedding(marker, meta);
    const embedding = await generateEmbedding(content);

    await supabase.from("blood_marker_embeddings").upsert(
      {
        marker_id: marker.id,
        test_id: testId,
        user_id: userId,
        marker_name: marker.name,
        content,
        embedding: JSON.stringify(embedding),
      },
      { onConflict: "marker_id" }
    );
  }
}

/** Embed a health condition. */
export async function embedCondition(
  supabase: SupabaseClient,
  conditionId: string,
  userId: string,
  name: string,
  notes: string | null
) {
  const content = formatConditionForEmbedding(name, notes);
  const embedding = await generateEmbedding(content);

  await supabase.from("condition_embeddings").upsert(
    {
      condition_id: conditionId,
      user_id: userId,
      content,
      embedding: JSON.stringify(embedding),
    },
    { onConflict: "condition_id" }
  );
}

export { qwen };

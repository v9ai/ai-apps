import OpenAI from "openai";

const deepseek = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "http://localhost:19836/v1",
  apiKey: process.env.DEEPSEEK_API_KEY ?? "local",
});

export type MarkerInput = {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  flag: string;
};

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

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await deepseek.embeddings.create({
    model: process.env.DEEPSEEK_EMBEDDING_MODEL ?? "text-embedding",
    input: text,
  });
  return res.data[0].embedding;
}

export { deepseek };

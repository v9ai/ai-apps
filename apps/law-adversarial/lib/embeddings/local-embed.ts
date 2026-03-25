const BASE_URL = process.env.CANDLE_BASE_URL ?? "http://localhost:9877/v1";

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: text }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: texts }),
  });
  if (!res.ok) throw new Error(`Batch embedding failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

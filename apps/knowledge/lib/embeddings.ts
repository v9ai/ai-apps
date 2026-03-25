/**
 * Lightweight embedding client using fetch — no SDK required.
 * Supports OpenAI text-embedding-3-small (1024 dims) or any OpenAI-compatible endpoint.
 *
 * Env vars:
 *   OPENAI_API_KEY         — required
 *   EMBEDDING_MODEL        — optional, default "text-embedding-3-small"
 *   EMBEDDING_DIMENSIONS   — optional, default 1024 (must match vector(1024) in schema)
 *   EMBEDDING_BASE_URL     — optional, default "https://api.openai.com/v1"
 */

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1024;
const DEFAULT_BASE_URL = "https://api.openai.com/v1";

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  usage: { prompt_tokens: number; total_tokens: number };
}

export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set — required for deep search embeddings");

  const baseUrl = process.env.EMBEDDING_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.EMBEDDING_MODEL || DEFAULT_MODEL;
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS) || DEFAULT_DIMENSIONS;

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
      dimensions,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error (${res.status}): ${err}`);
  }

  const json: EmbeddingResponse = await res.json();
  return json.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const baseUrl = process.env.EMBEDDING_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.EMBEDDING_MODEL || DEFAULT_MODEL;
  const dimensions = Number(process.env.EMBEDDING_DIMENSIONS) || DEFAULT_DIMENSIONS;

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: texts,
      dimensions,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error (${res.status}): ${err}`);
  }

  const json: EmbeddingResponse = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

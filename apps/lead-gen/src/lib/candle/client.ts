/**
 * HTTP client for the Candle embedding server (Rust, Metal-accelerated).
 *
 * Reads CANDLE_EMBED_URL from env (default: http://localhost:9998).
 * Used for JobBERT-v2 (768-dim) embeddings of LinkedIn posts.
 */

const BASE_URL =
  process.env.CANDLE_EMBED_URL ?? "http://localhost:9998";

interface EmbedData {
  embedding: number[];
  index: number;
}

interface EmbedResponse {
  data: EmbedData[];
}

async function postEmbed(input: string | string[]): Promise<EmbedResponse> {
  const res = await fetch(`${BASE_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Candle embed failed (${res.status}): ${detail}`);
  }

  return res.json() as Promise<EmbedResponse>;
}

/** Embed a single post, returns a 768-dim vector. */
export async function embedPost(text: string): Promise<number[]> {
  const resp = await postEmbed(text);
  return resp.data[0].embedding;
}

/** Batch-embed multiple posts. */
export async function embedPostBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const resp = await postEmbed(texts);
  return resp.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Health check. */
export async function health(): Promise<string> {
  const res = await fetch(`${BASE_URL}/health`);
  return res.text();
}

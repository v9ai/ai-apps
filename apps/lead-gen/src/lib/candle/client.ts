/**
 * HuggingFace Inference API client for JobBERT-v3 embeddings.
 *
 * Calls the serverless Inference API at router.huggingface.co for
 * TechWolf/JobBERT-v3 (768-dim) sentence embeddings of LinkedIn posts.
 * Multilingual: EN, ES, DE, ZH.
 *
 * Replaces the prior Candle embed-server (Rust, localhost:9998).
 * Same exported interface — consumers (post-analyzer, how-it-works) unchanged.
 */

const HF_MODEL = "TechWolf/JobBERT-v3";
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1_000;

function getToken(): string {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN env var is required for HuggingFace Inference API");
  return token;
}

interface HFErrorResponse {
  error?: string;
  estimated_time?: number;
}

async function hfEmbed(inputs: string | string[]): Promise<number[][]> {
  const token = getToken();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs, normalize: true }),
    });

    if (res.ok) {
      const data = await res.json();
      // HF returns number[] for single string, number[][] for array
      const vecs: number[][] =
        typeof inputs === "string" ? [data as number[]] : (data as number[][]);
      // Normalize client-side (HF API doesn't always honor normalize param)
      return vecs.map(l2Normalize);
    }

    // Model loading — HF returns 503 with estimated_time
    if (res.status === 503) {
      const body = (await res.json().catch(() => ({}))) as HFErrorResponse;
      const waitMs = (body.estimated_time ?? 20) * 1_000;
      lastError = new Error(`Model loading (est ${Math.round(waitMs / 1000)}s)`);
      await sleep(Math.min(waitMs, 30_000));
      continue;
    }

    // Rate limit — exponential backoff
    if (res.status === 429) {
      lastError = new Error("Rate limited");
      await sleep(RETRY_BASE_MS * 2 ** attempt);
      continue;
    }

    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`HF Inference API failed (${res.status}): ${detail}`);
  }

  throw lastError ?? new Error("HF Inference API: max retries exceeded");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function l2Normalize(vec: number[]): number[] {
  let normSq = 0;
  for (let i = 0; i < vec.length; i++) normSq += vec[i] * vec[i];
  if (normSq === 0) return vec;
  const inv = 1 / Math.sqrt(normSq);
  return vec.map((v) => v * inv);
}

/** Embed a single post. Returns a 768-dim vector. */
export async function embedPost(text: string): Promise<number[]> {
  const [embedding] = await hfEmbed(text);
  return embedding;
}

/** Batch-embed multiple posts. */
export async function embedPostBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return hfEmbed(texts);
}

/** Health check — probe the model endpoint. */
export async function health(): Promise<string> {
  try {
    const embedding = await embedPost("test");
    return `ok (dim=${embedding.length}, model=${HF_MODEL})`;
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

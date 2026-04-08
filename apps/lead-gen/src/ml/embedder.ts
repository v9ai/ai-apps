/**
 * BGE-small-en-v1.5 embedding service via @huggingface/transformers.
 *
 * Lazy singleton pattern -- model loads once per Lambda container.
 * Model: Xenova/bge-small-en-v1.5 (INT8 quantized, ~32 MB)
 *
 * All HF imports are dynamic so the build succeeds even when
 * @huggingface/transformers is not installed.
 */

export const EMBEDDING_DIM = 384;
export const MODEL_ID = "Xenova/bge-small-en-v1.5";

const BGE_RETRIEVAL_PREFIX = "Represent this sentence for searching relevant passages: ";
const BATCH_CHUNK_SIZE = 32;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipeline: any = null;

async function getEmbedder() {
  if (!_pipeline) {
    try {
      const { pipeline } = await import("@huggingface/transformers");
      _pipeline = await pipeline("feature-extraction", MODEL_ID, {
        dtype: "q8",
        device: "cpu",
      });
    } catch (err) {
      throw new Error(
        `Failed to load embedding model. Ensure @huggingface/transformers is installed. ${err}`,
      );
    }
  }
  return _pipeline;
}

/**
 * Embed a raw text string. Returns a 384-dim unit vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array).slice(0, EMBEDDING_DIM);
}

/**
 * Embed a search query with the BGE retrieval prefix for asymmetric search.
 */
export async function embedQuery(query: string): Promise<number[]> {
  return embedText(`${BGE_RETRIEVAL_PREFIX}${query}`);
}

/**
 * Embed a document passage (no prefix -- BGE uses plain text for docs).
 */
export async function embedDocument(text: string): Promise<number[]> {
  return embedText(text);
}

/**
 * Batch-embed multiple texts, processing in chunks of 32.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_CHUNK_SIZE) {
    const chunk = texts.slice(i, i + BATCH_CHUNK_SIZE);
    const pipe = await getEmbedder();
    const output = await pipe(chunk, { pooling: "mean", normalize: true });
    const flat: Float32Array = output.data as Float32Array;
    for (let j = 0; j < chunk.length; j++) {
      results.push(
        Array.from(flat.slice(j * EMBEDDING_DIM, (j + 1) * EMBEDDING_DIM)),
      );
    }
  }
  return results;
}

/**
 * Cosine similarity between two vectors. Pure math, no dependencies.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * BGE-small-en-v1.5 embedding service via @huggingface/transformers.
 *
 * Lazy singleton pattern -- model loads once per Lambda container.
 * Model: Xenova/bge-small-en-v1.5 (INT8 quantized, ~32 MB)
 *
 * All HF imports are dynamic so the build succeeds even when
 * @huggingface/transformers is not installed.
 *
 * Arena allocation: Float32Array buffers are pooled to reduce GC pressure
 * during batch embedding. Buffers are checked out from the pool, used, and
 * returned — avoiding per-embedding allocations in hot loops.
 */

export const EMBEDDING_DIM = 384;
export const MODEL_ID = "Xenova/bge-small-en-v1.5";

const BGE_RETRIEVAL_PREFIX = "Represent this sentence for searching relevant passages: ";
const BATCH_CHUNK_SIZE = 32;

// ============================================================================
// Arena-style buffer pool — module-level singleton
// ============================================================================

/**
 * Arena-style Float32Array pool for embedding buffers.
 *
 * Pre-allocates buffers of a fixed dimension. Callers acquire() a buffer,
 * use it, and release() it back. The pool grows on demand but never shrinks,
 * amortizing allocation cost across batch operations.
 *
 * For owned results that outlive the batch (returned to callers), use
 * acquireOwned() which allocates outside the pool — or copy from a pooled
 * buffer before release.
 */
class EmbeddingArena {
  private pool: Float32Array[] = [];
  private readonly dim: number;

  constructor(dim: number, prealloc = 8) {
    this.dim = dim;
    for (let i = 0; i < prealloc; i++) {
      this.pool.push(new Float32Array(dim));
    }
  }

  /** Check out a buffer from the pool (allocates if pool is empty). */
  acquire(): Float32Array {
    return this.pool.pop() ?? new Float32Array(this.dim);
  }

  /** Return a buffer to the pool after use. Zeroes the buffer. */
  release(buf: Float32Array): void {
    if (buf.length !== this.dim) return; // reject wrong-sized buffers
    buf.fill(0);
    this.pool.push(buf);
  }

  /**
   * Pre-warm the pool to hold at least `count` buffers.
   * Call before a large batch to avoid mid-batch allocations.
   */
  warmUp(count: number): void {
    while (this.pool.length < count) {
      this.pool.push(new Float32Array(this.dim));
    }
  }

  /** Current number of available buffers in the pool. */
  get available(): number {
    return this.pool.length;
  }
}

/** Module-level singleton arena for 384-dim embedding buffers. */
const embeddingArena = new EmbeddingArena(EMBEDDING_DIM, 8);

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

// ============================================================================
// Optimized batch embedding — typed arrays throughout, minimal GC pressure
// ============================================================================

/**
 * Batch-embed multiple texts with minimal GC pressure.
 *
 * Returns one Float32Array per input text (384 dims each).
 * Processes in chunks to bound peak memory. Reuses the singleton
 * tokenizer/pipeline instance and avoids intermediate `number[]` allocations.
 *
 * @param texts  - Array of raw text strings to embed.
 * @param options.chunkSize - Texts per inference batch (default 32).
 */
export async function embedBatchOptimized(
  texts: string[],
  options?: { chunkSize?: number },
): Promise<Float32Array[]> {
  if (texts.length === 0) return [];

  const chunkSize = options?.chunkSize ?? BATCH_CHUNK_SIZE;
  const pipe = await getEmbedder();

  // Pre-allocate output array (no push/resize)
  const results = new Array<Float32Array>(texts.length);

  for (let i = 0; i < texts.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, texts.length);
    const chunk = texts.slice(i, end);
    const chunkLen = chunk.length;

    const output = await pipe(chunk, { pooling: "mean", normalize: true });
    const flat: Float32Array = output.data as Float32Array;

    // Slice directly from the flat Float32Array — no Array.from() conversion
    for (let j = 0; j < chunkLen; j++) {
      const offset = j * EMBEDDING_DIM;
      // Float32Array.slice returns a new Float32Array (typed copy, no GC overhead)
      results[i + j] = flat.slice(offset, offset + EMBEDDING_DIM);
    }
  }

  return results;
}

// ============================================================================
// INT8 quantization — 4x memory reduction for embedding storage
// ============================================================================

/**
 * Quantize a 384-dim Float32Array embedding to Int8Array.
 *
 * Uses symmetric quantization: scale = max(|v_i|), each value mapped to
 * round(v / scale * 127) clamped to [-127, 127].
 *
 * Returns the quantized Int8Array. Retrieve the scale via `quantizeScale()`
 * or compute it before calling this function.
 *
 * Storage: 384 × 4 bytes (Float32) → 384 × 1 byte (Int8) = 4x reduction.
 */
export function quantizeEmbedding(embedding: Float32Array): Int8Array {
  const scale = quantizeScale(embedding);
  const quantized = new Int8Array(embedding.length);

  if (scale === 0) return quantized; // zero vector

  const invScale = 127.0 / scale;
  for (let i = 0; i < embedding.length; i++) {
    // Fused multiply + round + clamp
    const v = Math.round(embedding[i] * invScale);
    quantized[i] = v > 127 ? 127 : v < -127 ? -127 : v;
  }

  return quantized;
}

/**
 * Compute the quantization scale for an embedding: max(|v_i|).
 * Needed for dequantization: float = int8 * (scale / 127).
 */
export function quantizeScale(embedding: Float32Array): number {
  let maxAbs = 0;
  for (let i = 0; i < embedding.length; i++) {
    const abs = embedding[i] < 0 ? -embedding[i] : embedding[i];
    if (abs > maxAbs) maxAbs = abs;
  }
  return maxAbs;
}

/**
 * Dequantize an Int8Array embedding back to Float32Array.
 *
 * @param quantized - The INT8 quantized embedding.
 * @param scale     - The original max(|v_i|) from quantization.
 */
export function dequantizeEmbedding(
  quantized: Int8Array,
  scale: number,
): Float32Array {
  const result = new Float32Array(quantized.length);
  if (scale === 0) return result;

  const factor = scale / 127.0;
  for (let i = 0; i < quantized.length; i++) {
    result[i] = quantized[i] * factor;
  }
  return result;
}

// ============================================================================
// Batch cosine similarity with min-heap top-K (single-pass, no full sort)
// ============================================================================

/**
 * Find the top-K most similar embeddings from a corpus to a query.
 *
 * Uses a min-heap of size K for single-pass retrieval — O(N log K) instead
 * of O(N log N) for a full sort. For K << N this is a significant win.
 *
 * Both query and corpus vectors are expected to be L2-normalized (as produced
 * by the BGE pipeline). If normalized, dot product = cosine similarity.
 *
 * @param query  - The query embedding (Float32Array, 384 dims).
 * @param corpus - Array of corpus embeddings.
 * @param topK   - Number of top results to return.
 * @returns Sorted descending by score: [{index, score}, ...].
 */
export function cosineSimilarityBatch(
  query: Float32Array,
  corpus: Float32Array[],
  topK: number,
): { index: number; score: number }[] {
  if (corpus.length === 0 || topK <= 0) return [];

  const dim = query.length;

  // Pre-compute query norm
  let qNormSq = 0;
  for (let i = 0; i < dim; i++) qNormSq += query[i] * query[i];
  const qNorm = Math.sqrt(qNormSq);
  if (qNorm === 0) return [];

  const k = Math.min(topK, corpus.length);

  // Min-heap: smallest score at index 0. Array of [score, originalIndex].
  // Fixed size K — we only keep the top-K highest scores.
  const heap: { score: number; index: number }[] = [];

  for (let ci = 0; ci < corpus.length; ci++) {
    const candidate = corpus[ci];

    // Dot product + candidate norm in a single pass
    let dot = 0;
    let cNormSq = 0;
    for (let d = 0; d < dim; d++) {
      dot += query[d] * candidate[d];
      cNormSq += candidate[d] * candidate[d];
    }
    const cNorm = Math.sqrt(cNormSq);
    const score = cNorm === 0 ? 0 : dot / (qNorm * cNorm);

    if (heap.length < k) {
      // Heap not full — push and sift up
      heap.push({ score, index: ci });
      _siftUp(heap, heap.length - 1);
    } else if (score > heap[0].score) {
      // Replace min element and sift down
      heap[0] = { score, index: ci };
      _siftDown(heap, 0, k);
    }
    // else: score <= heap min → skip (no allocation, no work)
  }

  // Extract in descending order
  const result: { index: number; score: number }[] = new Array(heap.length);
  for (let i = heap.length - 1; i >= 0; i--) {
    result[i] = heap[0];
    // Move last element to root and shrink
    heap[0] = heap[heap.length - 1];
    heap.pop();
    if (heap.length > 0) _siftDown(heap, 0, heap.length);
  }

  // The extraction above gives ascending order in `result` indices,
  // but we want descending by score. Reverse in-place.
  result.reverse();

  return result;
}

// --- Min-heap helpers (inlined for zero-allocation hot path) ---

function _siftUp(
  heap: { score: number; index: number }[],
  idx: number,
): void {
  while (idx > 0) {
    const parent = (idx - 1) >> 1;
    if (heap[idx].score < heap[parent].score) {
      const tmp = heap[idx];
      heap[idx] = heap[parent];
      heap[parent] = tmp;
      idx = parent;
    } else {
      break;
    }
  }
}

function _siftDown(
  heap: { score: number; index: number }[],
  idx: number,
  size: number,
): void {
  while (true) {
    let smallest = idx;
    const left = 2 * idx + 1;
    const right = 2 * idx + 2;

    if (left < size && heap[left].score < heap[smallest].score) {
      smallest = left;
    }
    if (right < size && heap[right].score < heap[smallest].score) {
      smallest = right;
    }

    if (smallest !== idx) {
      const tmp = heap[idx];
      heap[idx] = heap[smallest];
      heap[smallest] = tmp;
      idx = smallest;
    } else {
      break;
    }
  }
}

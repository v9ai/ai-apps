/**
 * JobBERT-v2 embedding service for LinkedIn post analysis.
 *
 * Generates job-domain-specific embeddings (768-dim) using TechWolf/JobBERT-v2,
 * trained on 5.6M job samples. Used for semantic similarity search between posts.
 *
 * Lazy singleton pattern — model loads once per Lambda container.
 * All HF imports are dynamic so the build succeeds even when
 * @huggingface/transformers is not installed.
 */

export const JOB_EMBEDDING_DIM = 768;
export const JOB_MODEL_ID = "TechWolf/JobBERT-v2";

const BATCH_CHUNK_SIZE = 16; // smaller chunks — larger model than BGE

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipeline: any = null;

async function getJobEmbedder() {
  if (!_pipeline) {
    try {
      const { pipeline } = await import("@huggingface/transformers");
      _pipeline = await pipeline("feature-extraction", JOB_MODEL_ID, {
        device: "cpu",
      });
    } catch (err) {
      throw new Error(
        `Failed to load JobBERT-v2. Ensure @huggingface/transformers is installed. ${err}`,
      );
    }
  }
  return _pipeline;
}

/**
 * Embed a LinkedIn post in job-domain space. Returns a 768-dim unit vector.
 */
export async function embedPost(text: string): Promise<number[]> {
  const pipe = await getJobEmbedder();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array).slice(0, JOB_EMBEDDING_DIM);
}

/**
 * Batch-embed multiple posts, processing in chunks of 16.
 */
export async function embedPostBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_CHUNK_SIZE) {
    const chunk = texts.slice(i, i + BATCH_CHUNK_SIZE);
    const pipe = await getJobEmbedder();
    const output = await pipe(chunk, { pooling: "mean", normalize: true });
    const flat: Float32Array = output.data as Float32Array;
    for (let j = 0; j < chunk.length; j++) {
      results.push(
        Array.from(
          flat.slice(j * JOB_EMBEDDING_DIM, (j + 1) * JOB_EMBEDDING_DIM),
        ),
      );
    }
  }
  return results;
}

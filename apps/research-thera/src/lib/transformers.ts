import { pipeline, cos_sim, env } from "@huggingface/transformers";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

env.allowLocalModels = false;

// Dev: preserve singleton across hot reloads so the model isn't re-downloaded
const g = globalThis as typeof globalThis & {
  __hf_extractor?: FeatureExtractionPipeline;
};

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!g.__hf_extractor) {
    g.__hf_extractor = (await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "q8" },
    )) as unknown as FeatureExtractionPipeline;
  }
  return g.__hf_extractor;
}

export interface RerankResult {
  index: number;
  score: number;
}

/**
 * Rerank passages against a query using cosine similarity of MiniLM-L6-v2 embeddings.
 * Same model as the Python backend (all-MiniLM-L6-v2, 384-dim).
 *
 * @returns Results sorted by descending similarity score.
 */
export async function rerankPassages(
  query: string,
  passages: string[],
): Promise<RerankResult[]> {
  if (passages.length === 0) return [];

  const extractor = await getExtractor();

  const [queryOutput, passagesOutput] = await Promise.all([
    extractor(query, { pooling: "mean", normalize: true }),
    extractor(passages, { pooling: "mean", normalize: true }),
  ]);

  const queryVec = (queryOutput.tolist() as number[][])[0];
  const passageVecs = passagesOutput.tolist() as number[][];

  return passageVecs
    .map((vec, i) => ({ index: i, score: cos_sim(queryVec, vec) }))
    .sort((a, b) => b.score - a.score);
}

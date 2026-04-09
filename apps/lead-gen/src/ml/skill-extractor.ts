/**
 * Semantic skill extraction using TechWolf/ConTeXT-Skill-Extraction-base.
 *
 * Embeds post content and compares against pre-computed embeddings of
 * the canonical skill taxonomy (src/schema/contracts/skill-taxonomy.ts).
 * Returns skills ranked by cosine similarity above a confidence threshold.
 *
 * Lazy singleton — both the model and the skill embedding matrix are
 * computed once per Lambda container on first call.
 */

import { SKILL_TAXONOMY } from "@/schema/contracts/skill-taxonomy";
import { cosineSimilarity } from "./embedder";

export const SKILL_MODEL_ID = "TechWolf/ConTeXT-Skill-Extraction-base";
const SKILL_EMBEDDING_DIM = 768;

export interface ExtractedSkill {
  tag: string;
  label: string;
  confidence: number;
}

// ─── Lazy singletons ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipeline: any = null;
let _skillEmbeddings: { tag: string; label: string; vec: number[] }[] | null =
  null;

async function getSkillEmbedder() {
  if (!_pipeline) {
    try {
      const { pipeline } = await import("@huggingface/transformers");
      _pipeline = await pipeline("feature-extraction", SKILL_MODEL_ID, {
        device: "cpu",
      });
    } catch (err) {
      throw new Error(
        `Failed to load ConTeXT skill model. Ensure @huggingface/transformers is installed. ${err}`,
      );
    }
  }
  return _pipeline;
}

async function embedSingle(
  pipe: ReturnType<typeof getSkillEmbedder> extends Promise<infer T>
    ? T
    : never,
  text: string,
): Promise<number[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = await (pipe as any)(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data as Float32Array).slice(0, SKILL_EMBEDDING_DIM);
}

/**
 * Pre-compute embeddings for every skill in the taxonomy.
 * Cached in module scope — runs once per cold start.
 */
async function getSkillEmbeddings() {
  if (_skillEmbeddings) return _skillEmbeddings;

  const pipe = await getSkillEmbedder();
  const entries = Object.entries(SKILL_TAXONOMY);

  // Batch-embed skill labels in chunks of 32
  const CHUNK = 32;
  const allVecs: number[][] = [];
  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK).map(([, label]) => label);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = await (pipe as any)(chunk, {
      pooling: "mean",
      normalize: true,
    });
    const flat: Float32Array = output.data as Float32Array;
    for (let j = 0; j < chunk.length; j++) {
      allVecs.push(
        Array.from(
          flat.slice(j * SKILL_EMBEDDING_DIM, (j + 1) * SKILL_EMBEDDING_DIM),
        ),
      );
    }
  }

  _skillEmbeddings = entries.map(([tag, label], idx) => ({
    tag,
    label,
    vec: allVecs[idx],
  }));

  return _skillEmbeddings;
}

/**
 * Extract skills from post content using semantic similarity.
 *
 * @param postContent - The full text of the LinkedIn post
 * @param topK - Maximum number of skills to return (default 10)
 * @param threshold - Minimum cosine similarity to include (default 0.35)
 */
export async function extractSkills(
  postContent: string,
  topK = 10,
  threshold = 0.35,
): Promise<ExtractedSkill[]> {
  const pipe = await getSkillEmbedder();
  const postVec = await embedSingle(pipe, postContent);
  const skills = await getSkillEmbeddings();

  const scored = skills
    .map((s) => ({
      tag: s.tag,
      label: s.label,
      confidence: cosineSimilarity(postVec, s.vec),
    }))
    .filter((s) => s.confidence >= threshold)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topK);

  // Round confidence to 4 decimal places
  return scored.map((s) => ({
    ...s,
    confidence: Math.round(s.confidence * 10000) / 10000,
  }));
}

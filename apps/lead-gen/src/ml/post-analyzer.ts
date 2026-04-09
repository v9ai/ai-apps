/**
 * LinkedIn post analysis orchestrator.
 *
 * Calls Candle embed-server (Rust, Metal) for JobBERT-v2 embeddings and
 * SalesCue (Python, DeBERTa) for semantic skill extraction. Replaces the
 * prior WASM-based approach with native inference services.
 */

import * as candle from "@/lib/candle/client";
import { skills as extractSkillsHttp } from "@/lib/salescue/client";

export interface ExtractedSkill {
  tag: string;
  label: string;
  confidence: number;
}

export interface PostAnalysis {
  skills: ExtractedSkill[];
  jobEmbedding: number[];
  analyzedAt: string;
}

/**
 * Analyze a single LinkedIn post: extract skills + generate job embedding.
 */
export async function analyzePost(content: string): Promise<PostAnalysis> {
  const [skillsResult, jobEmbedding] = await Promise.all([
    extractSkillsHttp(content),
    candle.embedPost(content),
  ]);

  return {
    skills: skillsResult.result.skills,
    jobEmbedding,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Batch-analyze multiple posts. Returns a map of post ID → analysis.
 * Embeddings are batched via Candle; skills are extracted per-post via SalesCue.
 */
export async function analyzePostBatch(
  posts: { id: number; content: string }[],
): Promise<Map<number, PostAnalysis>> {
  const results = new Map<number, PostAnalysis>();
  if (posts.length === 0) return results;

  const [embeddings, skillResults] = await Promise.all([
    candle.embedPostBatch(posts.map((p) => p.content)),
    Promise.all(posts.map((p) => extractSkillsHttp(p.content))),
  ]);

  const now = new Date().toISOString();
  for (let i = 0; i < posts.length; i++) {
    results.set(posts[i].id, {
      skills: skillResults[i].result.skills,
      jobEmbedding: embeddings[i],
      analyzedAt: now,
    });
  }

  return results;
}

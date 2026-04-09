/**
 * LinkedIn post analysis orchestrator.
 *
 * Combines TechWolf/JobBERT-v2 embeddings with TechWolf/ConTeXT skill
 * extraction into a single analysis pipeline for LinkedIn posts.
 */

import { embedPost, embedPostBatch } from "./post-embedder";
import { extractSkills, type ExtractedSkill } from "./skill-extractor";

export interface PostAnalysis {
  skills: ExtractedSkill[];
  jobEmbedding: number[];
  analyzedAt: string;
}

/**
 * Analyze a single LinkedIn post: extract skills + generate job embedding.
 */
export async function analyzePost(content: string): Promise<PostAnalysis> {
  const [skills, jobEmbedding] = await Promise.all([
    extractSkills(content),
    embedPost(content),
  ]);

  return {
    skills,
    jobEmbedding,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Batch-analyze multiple posts. Returns a map of post ID → analysis.
 * Skills are extracted individually (context-sensitive), embeddings are batched.
 */
export async function analyzePostBatch(
  posts: { id: number; content: string }[],
): Promise<Map<number, PostAnalysis>> {
  const results = new Map<number, PostAnalysis>();
  if (posts.length === 0) return results;

  // Batch-embed all posts at once for efficiency
  const embeddings = await embedPostBatch(posts.map((p) => p.content));

  // Extract skills individually (each post needs its own context)
  const skillResults = await Promise.all(
    posts.map((p) => extractSkills(p.content)),
  );

  const now = new Date().toISOString();
  for (let i = 0; i < posts.length; i++) {
    results.set(posts[i].id, {
      skills: skillResults[i],
      jobEmbedding: embeddings[i],
      analyzedAt: now,
    });
  }

  return results;
}

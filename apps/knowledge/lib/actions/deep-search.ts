"use server";

import { sql } from "drizzle-orm";
import { db } from "@/src/db";
import { embed } from "../embeddings";
import type { SearchResult } from "../data";

export interface DeepSearchResult extends SearchResult {
  similarity: number;
  ftsRank: number;
  combinedScore: number;
}

/**
 * Deep search: embeds the query, then runs hybrid FTS + pgvector search
 * across lessons and sections. Falls back to FTS-only if embedding fails.
 */
export async function deepSearch(query: string): Promise<DeepSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await embed(trimmed);
  } catch (e) {
    console.warn("Embedding failed, falling back to FTS-only:", e);
  }

  if (!queryEmbedding) {
    return ftsOnlySearch(trimmed);
  }

  const vecLiteral = `[${queryEmbedding.join(",")}]`;

  try {
    // Run hybrid lesson search + vector section search in parallel
    const [lessonResults, sectionResults] = await Promise.all([
      db.execute<{
        lesson_id: string;
        slug: string;
        title: string;
        category_name: string;
        fts_rank: number;
        vector_similarity: number;
        combined_score: number;
        snippet: string;
      }>(
        sql`SELECT * FROM hybrid_search_lessons(
          ${trimmed},
          ${sql.raw(`'${vecLiteral}'::vector(1024)`)},
          10,
          0.3,
          0.7,
          0.2
        )`,
      ),
      db.execute<{
        section_id: string;
        lesson_id: string;
        lesson_slug: string;
        lesson_title: string;
        heading: string;
        similarity: number;
        content_excerpt: string;
      }>(
        sql`SELECT * FROM find_similar_sections(
          ${sql.raw(`'${vecLiteral}'::vector(1024)`)},
          0.3,
          10
        )`,
      ),
    ]);

    const results: DeepSearchResult[] = [];

    for (const r of lessonResults.rows ?? []) {
      results.push({
        resultType: "lesson",
        title: r.title,
        snippet: r.snippet || "",
        rank: r.combined_score,
        lessonSlug: r.slug,
        lessonTitle: r.title,
        similarity: r.vector_similarity,
        ftsRank: r.fts_rank,
        combinedScore: r.combined_score,
      });
    }

    for (const r of sectionResults.rows ?? []) {
      results.push({
        resultType: "section",
        title: r.heading,
        snippet: r.content_excerpt || "",
        rank: r.similarity,
        lessonSlug: r.lesson_slug,
        lessonTitle: r.lesson_title,
        similarity: r.similarity,
        ftsRank: 0,
        combinedScore: r.similarity,
      });
    }

    // Deduplicate: if a lesson appears in both lesson + section results, keep the higher-scoring one
    const seen = new Map<string, DeepSearchResult>();
    for (const r of results.sort((a, b) => b.combinedScore - a.combinedScore)) {
      const key = `${r.resultType}-${r.title}-${r.lessonSlug}`;
      if (!seen.has(key)) {
        seen.set(key, r);
      }
    }

    return [...seen.values()].slice(0, 15);
  } catch (error) {
    console.error("Deep search error:", error);
    return ftsOnlySearch(trimmed);
  }
}

async function ftsOnlySearch(query: string): Promise<DeepSearchResult[]> {
  try {
    const results = await db.execute(
      sql`SELECT * FROM search_content(${query}, 15)`,
    );

    return (results.rows ?? []).map((r: Record<string, unknown>) => ({
      resultType: r.result_type as DeepSearchResult["resultType"],
      title: r.title as string,
      snippet: r.snippet as string,
      rank: r.rank as number,
      lessonSlug: (r.lesson_slug as string) ?? null,
      lessonTitle: (r.lesson_title as string) ?? null,
      similarity: 0,
      ftsRank: r.rank as number,
      combinedScore: r.rank as number,
    }));
  } catch (error) {
    console.error("FTS fallback error:", error);
    return [];
  }
}

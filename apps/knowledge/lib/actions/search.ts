"use server";

import { sql } from "drizzle-orm";
import { db } from "@/src/db";
import type { SearchResult } from "../data";

export async function searchContent(
  query: string,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const results = await db.execute(
      sql`SELECT * FROM search_content(${trimmed}, 20)`,
    );

    return (results.rows ?? []).map(
      (r: Record<string, unknown>) => ({
        resultType: r.result_type as SearchResult["resultType"],
        title: r.title as string,
        snippet: r.snippet as string,
        rank: r.rank as number,
        lessonSlug: (r.paper_slug as string) ?? null,
        lessonTitle: (r.paper_title as string) ?? null,
      }),
    );
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

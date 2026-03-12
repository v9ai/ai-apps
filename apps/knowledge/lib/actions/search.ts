"use server";

import { createClient } from "@supabase/supabase-js";
import type { SearchResult } from "../data";

export async function searchContent(
  query: string,
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { data, error } = await supabase.rpc("search_content", {
    query_text: trimmed,
    result_limit: 20,
  });

  if (error) {
    console.error("Search RPC error:", error);
    return [];
  }

  return (data ?? []).map(
    (r: {
      result_type: string;
      title: string;
      snippet: string;
      rank: number;
      paper_slug: string | null;
      paper_title: string | null;
    }) => ({
      resultType: r.result_type as SearchResult["resultType"],
      title: r.title,
      snippet: r.snippet,
      rank: r.rank,
      lessonSlug: r.paper_slug,
      lessonTitle: r.paper_title,
    }),
  );
}

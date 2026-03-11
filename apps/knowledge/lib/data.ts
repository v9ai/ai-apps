import type { Paper, PaperWithContent, GroupedPapers, CategoryMeta } from "./articles";
import type { PaperRef } from "./papers";

// Re-export types for single-source imports
export type { Paper, PaperWithContent, GroupedPapers, CategoryMeta, PaperRef };

// Re-export static constants (always from articles.ts — no DB needed)
export { CATEGORIES, CATEGORY_META, getCategoryMeta } from "./articles";

const USE_SUPABASE = process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase";

export async function getAllPapers(): Promise<Paper[]> {
  if (USE_SUPABASE) {
    const { getAllPapersFromDb } = await import("./supabase/queries");
    return getAllPapersFromDb();
  }
  const { getAllPapers: fs } = await import("./articles");
  return fs();
}

export async function getPaperBySlug(
  slug: string,
): Promise<PaperWithContent | null> {
  if (USE_SUPABASE) {
    const { getPaperBySlugFromDb } = await import("./supabase/queries");
    return getPaperBySlugFromDb(slug);
  }
  const { getPaperBySlug: fs } = await import("./articles");
  return fs(slug);
}

export async function getGroupedPapers(): Promise<GroupedPapers[]> {
  if (USE_SUPABASE) {
    const { getGroupedPapersFromDb } = await import("./supabase/queries");
    return getGroupedPapersFromDb();
  }
  const { getGroupedPapers: fs } = await import("./articles");
  return fs();
}

export async function getTotalWordCount(): Promise<number> {
  if (USE_SUPABASE) {
    const { getTotalWordCountFromDb } = await import("./supabase/queries");
    return getTotalWordCountFromDb();
  }
  const { getTotalWordCount: fs } = await import("./articles");
  return fs();
}

export async function getCitationsForPaper(
  slug: string,
): Promise<PaperRef[]> {
  if (USE_SUPABASE) {
    const { getCitationsFromDb } = await import("./supabase/queries");
    return getCitationsFromDb(slug);
  }
  const { getPapersForSlug } = await import("./papers");
  return getPapersForSlug(slug);
}

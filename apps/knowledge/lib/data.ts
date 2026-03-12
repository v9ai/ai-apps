import type { Lesson, LessonWithContent, GroupedLessons, CategoryMeta } from "./articles";
import type { Reference } from "./papers";

// Re-export types for single-source imports
export type { Lesson, LessonWithContent, GroupedLessons, CategoryMeta, Reference };

// Re-export static constants (always from articles.ts — no DB needed)
export { CATEGORIES, CATEGORY_META, getCategoryMeta } from "./articles";

export interface SearchResult {
  resultType: "lesson" | "section" | "citation";
  title: string;
  snippet: string;
  rank: number;
  lessonSlug: string | null;
  lessonTitle: string | null;
}

const USE_SUPABASE = process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase";

export async function getAllLessons(): Promise<Lesson[]> {
  if (USE_SUPABASE) {
    const { getAllLessonsFromDb } = await import("./supabase/queries");
    return getAllLessonsFromDb();
  }
  const { getAllLessons: fs } = await import("./articles");
  return fs();
}

export async function getLessonBySlug(
  slug: string,
): Promise<LessonWithContent | null> {
  if (USE_SUPABASE) {
    const { getLessonBySlugFromDb } = await import("./supabase/queries");
    return getLessonBySlugFromDb(slug);
  }
  const { getLessonBySlug: fs } = await import("./articles");
  return fs(slug);
}

export async function getGroupedLessons(): Promise<GroupedLessons[]> {
  if (USE_SUPABASE) {
    const { getGroupedLessonsFromDb } = await import("./supabase/queries");
    return getGroupedLessonsFromDb();
  }
  const { getGroupedLessons: fs } = await import("./articles");
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

export async function getReferencesForLesson(
  slug: string,
): Promise<Reference[]> {
  if (USE_SUPABASE) {
    const { getReferencesFromDb } = await import("./supabase/queries");
    return getReferencesFromDb(slug);
  }
  const { getReferencesForSlug } = await import("./papers");
  return getReferencesForSlug(slug);
}

export async function getRelatedLessons(
  slug: string,
): Promise<Lesson[]> {
  if (USE_SUPABASE) {
    const { getRelatedLessonsFromDb } = await import("./supabase/queries");
    return getRelatedLessonsFromDb(slug);
  }
  // FS fallback: filter by same category
  const all = await getAllLessons();
  const current = all.find((p) => p.slug === slug);
  if (!current) return [];
  return all
    .filter((p) => p.category === current.category && p.slug !== slug)
    .slice(0, 4);
}

// Audio metadata
export { getAudioMeta } from "./audio";
export type { AudioMeta, AudioChapter } from "./audio";

import { createClient as createSupabase } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Paper, PaperWithContent, GroupedPapers } from "../articles";
import type { PaperRef } from "../papers";

// Use the basic client (no cookies) — works in static generation + server components
function createClient() {
  return createSupabase<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

export async function getAllPapersFromDb(): Promise<Paper[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("papers")
    .select("slug, number, title, word_count, reading_time_min, categories(name)")
    .order("number");

  if (error) throw error;

  return data.map((p) => ({
    slug: p.slug,
    number: p.number,
    title: p.title,
    category: (p.categories as unknown as { name: string }).name,
    wordCount: p.word_count,
    readingTimeMin: p.reading_time_min,
  }));
}

export async function getPaperBySlugFromDb(
  slug: string,
): Promise<PaperWithContent | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("papers")
    .select(
      "slug, number, title, content, word_count, reading_time_min, categories(name)",
    )
    .eq("slug", slug)
    .single();

  if (error || !data) return null;

  return {
    slug: data.slug,
    number: data.number,
    title: data.title,
    category: (data.categories as unknown as { name: string }).name,
    wordCount: data.word_count,
    readingTimeMin: data.reading_time_min,
    content: data.content,
  };
}

export async function getGroupedPapersFromDb(): Promise<GroupedPapers[]> {
  const supabase = createClient();

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select(
      "id, name, slug, icon, description, gradient_from, gradient_to, papers(slug, number, title, word_count, reading_time_min)",
    )
    .order("sort_order")
    .order("number", { referencedTable: "papers" });

  if (catErr) throw catErr;

  return categories
    .map((cat) => ({
      category: cat.name,
      meta: {
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        gradient: [cat.gradient_from, cat.gradient_to] as [string, string],
      },
      articles: (cat.papers as unknown as {
        slug: string;
        number: number;
        title: string;
        word_count: number;
        reading_time_min: number;
      }[]).map((p) => ({
        slug: p.slug,
        number: p.number,
        title: p.title,
        category: cat.name,
        wordCount: p.word_count,
        readingTimeMin: p.reading_time_min,
      })),
    }))
    .filter((g) => g.articles.length > 0);
}

export async function getTotalWordCountFromDb(): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.from("papers").select("word_count");

  if (error) throw error;
  return data.reduce((sum, p) => sum + p.word_count, 0);
}

export async function getCitationsFromDb(slug: string): Promise<PaperRef[]> {
  const supabase = createClient();

  const { data: paper } = await supabase
    .from("papers")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!paper) return [];

  const { data: junctions, error } = await supabase
    .from("paper_citations")
    .select("citations(title, authors, year, url, venue)")
    .eq("paper_id", paper.id);

  if (error) throw error;

  return junctions.map((j) => {
    const c = j.citations as unknown as {
      title: string;
      authors: string | null;
      year: number | null;
      url: string;
      venue: string | null;
    };
    return {
      title: c.title,
      authors: c.authors ?? undefined,
      year: c.year ?? undefined,
      url: c.url,
      venue: c.venue ?? undefined,
    };
  });
}

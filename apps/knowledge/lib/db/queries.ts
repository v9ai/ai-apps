import { eq, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { papers, categories, paperCitations, citations } from "@/src/db/schema";
import type { Lesson, LessonWithContent, GroupedLessons } from "../articles";
import type { Reference } from "../papers";

export async function getAllLessonsFromDb(): Promise<Lesson[]> {
  const rows = await db
    .select({
      slug: papers.slug,
      number: papers.number,
      title: papers.title,
      categoryName: categories.name,
      wordCount: papers.wordCount,
      readingTimeMin: papers.readingTimeMin,
    })
    .from(papers)
    .innerJoin(categories, eq(papers.categoryId, categories.id))
    .orderBy(papers.number);

  return rows.map((p) => ({
    slug: p.slug,
    fileSlug: p.slug,
    number: p.number,
    title: p.title,
    category: p.categoryName,
    wordCount: p.wordCount,
    readingTimeMin: p.readingTimeMin,
  }));
}

export async function getLessonBySlugFromDb(
  slug: string,
): Promise<LessonWithContent | null> {
  const row = await db.query.papers.findFirst({
    where: eq(papers.slug, slug),
    with: { category: true },
  });

  if (!row) return null;

  return {
    slug: row.slug,
    fileSlug: row.slug,
    number: row.number,
    title: row.title,
    category: row.category.name,
    wordCount: row.wordCount,
    readingTimeMin: row.readingTimeMin,
    content: row.content,
  };
}

export async function getGroupedLessonsFromDb(): Promise<GroupedLessons[]> {
  const rows = await db.query.categories.findMany({
    with: {
      papers: {
        orderBy: papers.number,
      },
    },
    orderBy: categories.sortOrder,
  });

  return rows
    .map((cat) => ({
      category: cat.name,
      meta: {
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        gradient: [cat.gradientFrom, cat.gradientTo] as [string, string],
      },
      articles: cat.papers.map((p) => ({
        slug: p.slug,
        fileSlug: p.slug,
        number: p.number,
        title: p.title,
        category: cat.name,
        wordCount: p.wordCount,
        readingTimeMin: p.readingTimeMin,
      })),
    }))
    .filter((g) => g.articles.length > 0);
}

export async function getTotalWordCountFromDb(): Promise<number> {
  const [result] = await db
    .select({ total: sql<number>`coalesce(sum(${papers.wordCount}), 0)` })
    .from(papers);

  return result.total;
}

export async function getRelatedLessonsFromDb(
  slug: string,
  limit = 4,
): Promise<Lesson[]> {
  const current = await db.query.papers.findFirst({
    where: eq(papers.slug, slug),
    columns: { id: true, categoryId: true },
  });

  if (!current) return [];

  const rows = await db
    .select({
      slug: papers.slug,
      number: papers.number,
      title: papers.title,
      categoryName: categories.name,
      wordCount: papers.wordCount,
      readingTimeMin: papers.readingTimeMin,
    })
    .from(papers)
    .innerJoin(categories, eq(papers.categoryId, categories.id))
    .where(
      sql`${papers.categoryId} = ${current.categoryId} AND ${papers.id} != ${current.id}`,
    )
    .orderBy(papers.number)
    .limit(limit);

  return rows.map((p) => ({
    slug: p.slug,
    fileSlug: p.slug,
    number: p.number,
    title: p.title,
    category: p.categoryName,
    wordCount: p.wordCount,
    readingTimeMin: p.readingTimeMin,
  }));
}

export async function getReferencesFromDb(slug: string): Promise<Reference[]> {
  const lesson = await db.query.papers.findFirst({
    where: eq(papers.slug, slug),
    columns: { id: true },
  });

  if (!lesson) return [];

  const rows = await db
    .select({
      title: citations.title,
      authors: citations.authors,
      year: citations.year,
      url: citations.url,
      venue: citations.venue,
    })
    .from(paperCitations)
    .innerJoin(citations, eq(paperCitations.citationId, citations.id))
    .where(eq(paperCitations.paperId, lesson.id));

  return rows.map((c) => ({
    title: c.title,
    authors: c.authors ?? undefined,
    year: c.year ?? undefined,
    url: c.url,
    venue: c.venue ?? undefined,
  }));
}

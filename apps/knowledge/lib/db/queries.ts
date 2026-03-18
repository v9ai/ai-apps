import { eq, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { lessons, categories } from "@/src/db/schema";
import type { Lesson, LessonWithContent, GroupedLessons } from "../articles";

export async function getAllLessonsFromDb(): Promise<Lesson[]> {
  const rows = await db
    .select({
      slug: lessons.slug,
      number: lessons.number,
      title: lessons.title,
      categoryName: categories.name,
      wordCount: lessons.wordCount,
      readingTimeMin: lessons.readingTimeMin,
    })
    .from(lessons)
    .innerJoin(categories, eq(lessons.categoryId, categories.id))
    .orderBy(lessons.number);

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
  const row = await db.query.lessons.findFirst({
    where: eq(lessons.slug, slug),
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
      lessons: {
        orderBy: lessons.number,
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
      articles: cat.lessons.map((p) => ({
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
    .select({ total: sql<number>`coalesce(sum(${lessons.wordCount}), 0)` })
    .from(lessons);

  return result.total;
}

export async function getCategoryMetaFromDb(
  categoryName: string,
): Promise<{ slug: string; icon: string; description: string; gradient: [string, string] } | null> {
  const row = await db.query.categories.findFirst({
    where: eq(categories.name, categoryName),
    columns: {
      slug: true,
      icon: true,
      description: true,
      gradientFrom: true,
      gradientTo: true,
    },
  });

  if (!row) return null;

  return {
    slug: row.slug,
    icon: row.icon,
    description: row.description,
    gradient: [row.gradientFrom, row.gradientTo],
  };
}

export async function getCategoryCountFromDb(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories);
  return result.count;
}

export async function getRelatedLessonsFromDb(
  slug: string,
  limit = 4,
): Promise<Lesson[]> {
  const current = await db.query.lessons.findFirst({
    where: eq(lessons.slug, slug),
    columns: { id: true, categoryId: true },
  });

  if (!current) return [];

  const rows = await db
    .select({
      slug: lessons.slug,
      number: lessons.number,
      title: lessons.title,
      categoryName: categories.name,
      wordCount: lessons.wordCount,
      readingTimeMin: lessons.readingTimeMin,
    })
    .from(lessons)
    .innerJoin(categories, eq(lessons.categoryId, categories.id))
    .where(
      sql`${lessons.categoryId} = ${current.categoryId} AND ${lessons.id} != ${current.id}`,
    )
    .orderBy(lessons.number)
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

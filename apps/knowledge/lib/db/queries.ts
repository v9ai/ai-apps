import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/src/db";
import { lessons, categories, applications, externalCourses, lessonCourses } from "@/src/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type ExternalCourse = InferSelectModel<typeof externalCourses>;

export type JobApplication = InferSelectModel<typeof applications>;
import type { Lesson, LessonWithContent, GroupedLessons } from "../articles";
import { getUrlPath } from "../articles";

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
    excerpt: "",
    difficulty: "intermediate" as const,
    url: getUrlPath(p.slug),
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
    excerpt: "",
    difficulty: "intermediate" as const,
    wordCount: row.wordCount,
    readingTimeMin: row.readingTimeMin,
    url: getUrlPath(row.slug),
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
        excerpt: "",
        difficulty: "intermediate" as const,
        wordCount: p.wordCount,
        readingTimeMin: p.readingTimeMin,
        url: getUrlPath(p.slug),
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

export async function getJobApplicationsFromDb(userId: string): Promise<JobApplication[]> {
  return db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(applications.createdAt);
}

export async function getCoursesForLessonFromDb(
  slug: string,
  limit = 4,
): Promise<ExternalCourse[]> {
  const rows = await db
    .select({ course: externalCourses })
    .from(lessonCourses)
    .innerJoin(externalCourses, eq(lessonCourses.courseId, externalCourses.id))
    .where(eq(lessonCourses.lessonSlug, slug))
    .orderBy(desc(lessonCourses.relevance), desc(externalCourses.rating))
    .limit(limit);

  return rows.map((r) => r.course);
}

export async function getRelatedLessonsFromDb(
  slug: string,
  limit = 4,
): Promise<Lesson[]> {
  // Try vector similarity first — falls back to same-category if no embeddings
  try {
    const vectorRows = await db.execute<{
      slug: string;
      number: number;
      title: string;
      category_name: string;
      word_count: number;
      reading_time_min: number;
    }>(
      sql`SELECT l.slug, l.number, l.title, cat.name AS category_name,
                 l.word_count, l.reading_time_min
          FROM lesson_embeddings le
          JOIN lesson_embeddings target_le ON target_le.lesson_id = (SELECT id FROM lessons WHERE slug = ${slug})
          JOIN lessons l ON l.id = le.lesson_id
          JOIN categories cat ON cat.id = l.category_id
          WHERE l.slug != ${slug}
          ORDER BY le.embedding <=> target_le.embedding
          LIMIT ${limit}`,
    );

    if (vectorRows.rows && vectorRows.rows.length > 0) {
      return vectorRows.rows.map((p) => ({
        slug: p.slug,
        fileSlug: p.slug,
        number: p.number,
        title: p.title,
        category: p.category_name,
        wordCount: p.word_count,
        readingTimeMin: p.reading_time_min,
        excerpt: "",
        difficulty: "intermediate" as const,
        url: getUrlPath(p.slug),
      }));
    }
  } catch {
    // No embeddings available — fall through to category-based
  }

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
      sql`${lessons.categoryId} = (SELECT category_id FROM lessons WHERE slug = ${slug})
          AND ${lessons.slug} != ${slug}`,
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
    excerpt: "",
    difficulty: "intermediate" as const,
    url: getUrlPath(p.slug),
  }));
}

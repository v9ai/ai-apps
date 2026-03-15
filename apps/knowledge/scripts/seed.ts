import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { CATEGORIES, CATEGORY_META, LESSON_NUMBER } from "../lib/articles";
import { extractReferences, normalizeTitle } from "../lib/papers";
import type { Reference } from "../lib/papers";
import * as schema from "../src/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = neon(databaseUrl);
const db = drizzle(client, { schema });

const CONTENT_DIR = path.join(process.cwd(), "content");

/* ── helpers ────────────────────────────────────────────────────── */

function extractTitle(content: string): string {
  for (const line of content.split("\n")) {
    const match = line.match(/^#\s+(.+)/);
    if (match) return match[1].trim();
  }
  return "Untitled";
}

function getCategory(num: number): string {
  for (const [lo, hi, name] of CATEGORIES) {
    if (num >= lo && num <= hi) return name;
  }
  return "Other";
}

interface Section {
  heading: string;
  headingLevel: number;
  content: string;
  wordCount: number;
}

function splitSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentHeading = "Introduction";
  let currentLevel = 2;
  let currentLines: string[] = [];
  let pastTitle = false;

  for (const line of lines) {
    // Skip h1 title line
    if (!pastTitle && /^#\s+/.test(line)) {
      pastTitle = true;
      continue;
    }

    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      // Save previous section
      const content = currentLines.join("\n").trim();
      if (content) {
        sections.push({
          heading: currentHeading,
          headingLevel: currentLevel,
          content,
          wordCount: content.split(/\s+/).filter(Boolean).length,
        });
      }
      pastTitle = true;
      currentHeading = match[2].trim();
      currentLevel = match[1].length;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  // Last section
  const content = currentLines.join("\n").trim();
  if (content) {
    sections.push({
      heading: currentHeading,
      headingLevel: currentLevel,
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
    });
  }

  return sections;
}

/* ── main ───────────────────────────────────────────────────────── */

async function seed() {
  console.log("Seeding knowledge database...\n");

  // ── 0. Clean existing data (order respects FK constraints) ────
  console.log("Cleaning existing data...");
  await db.delete(schema.paperCitations);
  await db.delete(schema.paperSections);
  await db.delete(schema.citations);
  await db.delete(schema.papers);
  await db.delete(schema.categories);

  // ── 1. Seed categories ───────────────────────────────────────
  console.log("Seeding categories...");
  const categoryRows = CATEGORIES.map(([lo, hi, name], i) => {
    const meta = CATEGORY_META[name];
    return {
      name,
      slug: meta.slug,
      icon: meta.icon,
      description: meta.description,
      gradientFrom: meta.gradient[0],
      gradientTo: meta.gradient[1],
      paperRangeLo: lo,
      paperRangeHi: hi,
      sortOrder: i,
    };
  });

  const cats = await db
    .insert(schema.categories)
    .values(categoryRows)
    .returning();
  const catIdByName = new Map(cats.map((c) => [c.name, c.id]));
  console.log(`  ${cats.length} categories`);

  // ── 2. Read markdown files + seed papers ─────────────────────
  console.log("Seeding papers...");
  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const fileContents = new Map<string, string>();
  const paperRows = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const number = LESSON_NUMBER[slug] ?? 0;
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    fileContents.set(slug, raw);

    const title = extractTitle(raw);
    const categoryName = getCategory(number);
    const wordCount = raw.split(/\s+/).filter(Boolean).length;
    const readingTimeMin = Math.max(1, Math.round(wordCount / 200));

    return {
      slug,
      number,
      title,
      categoryId: catIdByName.get(categoryName)!,
      wordCount,
      readingTimeMin,
      content: raw,
    };
  });

  const insertedPapers = await db
    .insert(schema.papers)
    .values(paperRows)
    .returning({ id: schema.papers.id, slug: schema.papers.slug });
  const paperIdBySlug = new Map(insertedPapers.map((p) => [p.slug, p.id]));
  console.log(`  ${insertedPapers.length} papers`);

  // ── 3. Seed paper_sections ───────────────────────────────────
  console.log("Seeding paper sections...");
  const allSections: (typeof schema.paperSections.$inferInsert)[] = [];

  for (const [slug, raw] of fileContents) {
    const paperId = paperIdBySlug.get(slug)!;
    const sections = splitSections(raw);
    for (let i = 0; i < sections.length; i++) {
      allSections.push({
        paperId,
        heading: sections[i].heading,
        headingLevel: sections[i].headingLevel,
        content: sections[i].content,
        sectionOrder: i,
        wordCount: sections[i].wordCount,
      });
    }
  }

  // Insert in batches of 100
  for (let i = 0; i < allSections.length; i += 100) {
    await db
      .insert(schema.paperSections)
      .values(allSections.slice(i, i + 100));
  }
  console.log(`  ${allSections.length} sections`);

  // ── 4. Seed citations + paper_citations ──────────────────────
  console.log("Seeding citations...");
  const citationMap = new Map<
    string,
    { ref: Reference; paperSlugs: Set<string> }
  >();

  for (const [slug, raw] of fileContents) {
    const refs = extractReferences(raw);
    for (const ref of refs) {
      const key = `${normalizeTitle(ref.title)}::${ref.year ?? 0}`;
      const existing = citationMap.get(key);
      if (existing) {
        existing.paperSlugs.add(slug);
      } else {
        citationMap.set(key, { ref, paperSlugs: new Set([slug]) });
      }
    }
  }

  // Insert citations in batches
  const citationRows = Array.from(citationMap.values()).map(({ ref }) => ({
    title: ref.title,
    normalizedTitle: normalizeTitle(ref.title),
    authors: ref.authors ?? null,
    year: ref.year ?? null,
    url: ref.url,
    venue: ref.venue ?? null,
  }));

  const allCitations: { id: string; normalizedTitle: string; year: number | null }[] = [];
  for (let i = 0; i < citationRows.length; i += 100) {
    const batch = await db
      .insert(schema.citations)
      .values(citationRows.slice(i, i + 100))
      .returning({
        id: schema.citations.id,
        normalizedTitle: schema.citations.normalizedTitle,
        year: schema.citations.year,
      });
    allCitations.push(...batch);
  }
  console.log(`  ${allCitations.length} citations`);

  // Build citation ID lookup
  const citationIdMap = new Map(
    allCitations.map((c) => [`${c.normalizedTitle}::${c.year ?? 0}`, c.id]),
  );

  // Build junction rows
  console.log("Seeding paper_citations...");
  const junctionRows: { paperId: string; citationId: string }[] = [];
  for (const [key, { paperSlugs }] of citationMap) {
    const citationId = citationIdMap.get(key);
    if (!citationId) continue;
    for (const slug of paperSlugs) {
      const paperId = paperIdBySlug.get(slug);
      if (!paperId) continue;
      junctionRows.push({ paperId, citationId });
    }
  }

  for (let i = 0; i < junctionRows.length; i += 100) {
    await db
      .insert(schema.paperCitations)
      .values(junctionRows.slice(i, i + 100));
  }
  console.log(`  ${junctionRows.length} paper-citation links`);

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n┌──────────────────────┬───────┐");
  console.log("│ Table                │ Count │");
  console.log("├──────────────────────┼───────┤");
  console.log(`│ categories           │ ${String(cats.length).padStart(5)} │`);
  console.log(`│ papers               │ ${String(insertedPapers.length).padStart(5)} │`);
  console.log(`│ paper_sections       │ ${String(allSections.length).padStart(5)} │`);
  console.log(`│ citations            │ ${String(allCitations.length).padStart(5)} │`);
  console.log(`│ paper_citations      │ ${String(junctionRows.length).padStart(5)} │`);
  console.log("└──────────────────────┴───────┘");
  console.log("\nDone!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

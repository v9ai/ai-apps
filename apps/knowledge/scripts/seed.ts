import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { CATEGORIES, CATEGORY_META } from "../lib/articles";
import { extractReferences, normalizeTitle } from "../lib/papers";
import type { Reference } from "../lib/papers";
import type { Database } from "../lib/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
  );
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

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

function throwOnError<T>(
  result: { data: T | null; error: unknown },
  label: string,
): NonNullable<T> {
  if (result.error) {
    console.error(`Error seeding ${label}:`, result.error);
    throw result.error;
  }
  if (!result.data) throw new Error(`No data returned for ${label}`);
  return result.data as NonNullable<T>;
}

function checkError(
  result: { error: unknown },
  label: string,
): void {
  if (result.error) {
    console.error(`Error seeding ${label}:`, result.error);
    throw result.error;
  }
}

/* ── main ───────────────────────────────────────────────────────── */

async function seed() {
  console.log("Seeding knowledge database...\n");

  // ── 0. Clean existing data (order respects FK constraints) ────
  console.log("Cleaning existing data...");
  await supabase.from("paper_citations").delete().not("paper_id", "is", null);
  await supabase.from("paper_sections").delete().not("id", "is", null);
  await supabase.from("citations").delete().not("id", "is", null);
  await supabase.from("papers").delete().not("id", "is", null);
  await supabase.from("categories").delete().not("id", "is", null);

  // ── 1. Seed categories ───────────────────────────────────────
  console.log("Seeding categories...");
  const categoryRows = CATEGORIES.map(([lo, hi, name], i) => {
    const meta = CATEGORY_META[name];
    return {
      name,
      slug: meta.slug,
      icon: meta.icon,
      description: meta.description,
      gradient_from: meta.gradient[0],
      gradient_to: meta.gradient[1],
      paper_range_lo: lo,
      paper_range_hi: hi,
      sort_order: i,
    };
  });

  const cats = throwOnError(
    await supabase.from("categories").insert(categoryRows).select(),
    "categories",
  );
  const catIdByName = new Map(cats.map((c) => [c.name, c.id]));
  console.log(`  ${cats.length} categories`);

  // ── 2. Read markdown files + seed papers ─────────────────────
  console.log("Seeding papers...");
  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.startsWith("agent-") && f.endsWith(".md"))
    .sort();

  const fileContents = new Map<string, string>();
  const paperRows = files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const numMatch = slug.match(/^agent-(\d+)/);
    const number = numMatch ? parseInt(numMatch[1], 10) : 0;
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
      category_id: catIdByName.get(categoryName)!,
      word_count: wordCount,
      reading_time_min: readingTimeMin,
      content: raw,
    };
  });

  const papers = throwOnError(
    await supabase.from("papers").insert(paperRows).select("id, slug"),
    "papers",
  );
  const paperIdBySlug = new Map(papers.map((p) => [p.slug, p.id]));
  console.log(`  ${papers.length} papers`);

  // ── 3. Seed paper_sections ───────────────────────────────────
  console.log("Seeding paper sections...");
  const allSections: Database["public"]["Tables"]["paper_sections"]["Insert"][] = [];

  for (const [slug, raw] of fileContents) {
    const paperId = paperIdBySlug.get(slug)!;
    const sections = splitSections(raw);
    for (let i = 0; i < sections.length; i++) {
      allSections.push({
        paper_id: paperId,
        heading: sections[i].heading,
        heading_level: sections[i].headingLevel,
        content: sections[i].content,
        section_order: i,
        word_count: sections[i].wordCount,
      });
    }
  }

  // Insert in batches of 100
  for (let i = 0; i < allSections.length; i += 100) {
    checkError(
      await supabase.from("paper_sections").insert(allSections.slice(i, i + 100)),
      `paper_sections batch ${i}`,
    );
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
    normalized_title: normalizeTitle(ref.title),
    authors: ref.authors ?? null,
    year: ref.year ?? null,
    url: ref.url,
    venue: ref.venue ?? null,
  }));

  const allCitations: { id: string; normalized_title: string; year: number | null }[] = [];
  for (let i = 0; i < citationRows.length; i += 100) {
    const batch = throwOnError(
      await supabase
        .from("citations")
        .insert(citationRows.slice(i, i + 100))
        .select("id, normalized_title, year"),
      `citations batch ${i}`,
    );
    allCitations.push(...batch);
  }
  console.log(`  ${allCitations.length} citations`);

  // Build citation ID lookup
  const citationIdMap = new Map(
    allCitations.map((c) => [`${c.normalized_title}::${c.year ?? 0}`, c.id]),
  );

  // Build junction rows
  console.log("Seeding paper_citations...");
  const junctionRows: { paper_id: string; citation_id: string }[] = [];
  for (const [key, { paperSlugs }] of citationMap) {
    const citationId = citationIdMap.get(key);
    if (!citationId) continue;
    for (const slug of paperSlugs) {
      const paperId = paperIdBySlug.get(slug);
      if (!paperId) continue;
      junctionRows.push({ paper_id: paperId, citation_id: citationId });
    }
  }

  for (let i = 0; i < junctionRows.length; i += 100) {
    checkError(
      await supabase.from("paper_citations").insert(junctionRows.slice(i, i + 100)),
      `paper_citations batch ${i}`,
    );
  }
  console.log(`  ${junctionRows.length} paper-citation links`);

  // ── Summary ──────────────────────────────────────────────────
  console.log("\n┌──────────────────────┬───────┐");
  console.log("│ Table                │ Count │");
  console.log("├──────────────────────┼───────┤");
  console.log(`│ categories           │ ${String(cats.length).padStart(5)} │`);
  console.log(`│ papers               │ ${String(papers.length).padStart(5)} │`);
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

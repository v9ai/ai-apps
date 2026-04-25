#!/usr/bin/env npx tsx
/**
 * One-shot backfill: populate contacts.papers (jsonb) for every contact tagged
 * "papers" whose papers column is NULL.
 *
 * Background: classify-paper-contacts.ts (the classifier) historically wrote
 * paper_classifications but never persisted the source `papers` jsonb. Team A
 * fixed the bug forward (the live classifier now writes both columns), but
 * 1,404 pre-fix rows still have NULL papers despite having verdicts. This
 * script restores data-shape consistency by re-deriving the papers list from
 * the same in-memory corpus the classifier reads (papers.json) and writing
 * it onto each row using the existing slug as the join key.
 *
 * Usage:
 *   pnpm tsx scripts/backfill-paper-contacts-papers-jsonb.ts --dry-run
 *   pnpm tsx scripts/backfill-paper-contacts-papers-jsonb.ts
 *
 * Safety:
 *   - Every UPDATE is scoped with `WHERE tags::jsonb @> '["papers"]'::jsonb
 *     AND id = ?` so we never touch non-paper contacts.
 *   - Only writes when papers IS NULL — never overwrites existing data.
 *   - Does NOT touch paper_classifications, paper_classifications_at, or
 *     to_be_deleted. Those are out of scope.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";
import { createHash } from "crypto";

// ── CLI flags ────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

// ── Types matching papers.json (mirrors classify-paper-contacts.ts) ──────

interface Paper {
  title: string;
  abstract_text: string | null;
  authors: string[];
  affiliations: string[] | null;
  year: number | null;
  doi: string | null;
  citation_count: number | null;
  url: string | null;
  pdf_url: string | null;
  source: string;
  source_id: string;
  venue: string | null;
  published_date: string | null;
}

interface PaperEntry {
  paper: Paper;
  slug: string;
  tier: "core" | "broad";
  query: string;
  tags: string[];
}

interface ContactRow {
  id: number;
  slug: string | null;
  first_name: string;
  last_name: string;
}

// ── Name parsing (copied verbatim from classify-paper-contacts.ts) ───────

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

function authorSlug(fullName: string): string {
  const base = fullName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const hash = createHash("sha1").update(fullName).digest("hex").slice(0, 6);
  return `paper-author-${base || "anon"}-${hash}`;
}

function paperId(p: Paper): string {
  if (p.doi) return `doi:${p.doi.toLowerCase().replace(/^https?:\/\/doi\.org\//, "")}`;
  return `${p.source}:${p.source_id}`;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const jsonPath = resolve("docs/papers/2025-2026-sales-leadgen/papers.json");
  const raw = readFileSync(jsonPath, "utf8");
  const entries = JSON.parse(raw) as PaperEntry[];
  console.log(`Loaded ${entries.length} paper entries from ${jsonPath}`);

  // Group by normalized author name → {canonical, entries}
  // (same algorithm as the classifier, so slugs collide identically)
  const byAuthor = new Map<string, { canonical: string; entries: PaperEntry[] }>();
  for (const e of entries) {
    for (const name of e.paper.authors ?? []) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const key = normalizeName(trimmed);
      if (!key) continue;
      const slot = byAuthor.get(key);
      if (slot) slot.entries.push(e);
      else byAuthor.set(key, { canonical: trimmed, entries: [e] });
    }
  }

  // Index by slug for O(1) lookup against contacts.slug
  const bySlug = new Map<string, PaperEntry[]>();
  for (const { canonical, entries: es } of byAuthor.values()) {
    bySlug.set(authorSlug(canonical), es);
  }
  console.log(`Indexed ${bySlug.size} unique authors by slug`);

  const url = process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL not set — check .env.local");
  const sql = neon(url);

  // Only backfill rows that are missing papers; never overwrite.
  const rows = (await sql`
    SELECT id, slug, first_name, last_name
    FROM contacts
    WHERE tags::jsonb @> '["papers"]'::jsonb
      AND papers IS NULL
    ORDER BY id ASC
  `) as ContactRow[];
  console.log(`Fetched ${rows.length} contacts tagged "papers" with papers IS NULL`);

  let matched = 0;
  let skipped = 0;
  let written = 0;
  const samples: Array<{ id: number; name: string; slug: string; n: number; firstTitle: string }> = [];

  for (const contact of rows) {
    const slug = contact.slug ?? "";
    const authorEntries = bySlug.get(slug);
    if (!authorEntries || authorEntries.length === 0) {
      skipped += 1;
      if (skipped <= 5) {
        console.log(
          `  [skip] [${contact.id}] ${contact.first_name} ${contact.last_name} — no papers in corpus for slug "${slug}"`,
        );
      }
      continue;
    }

    // Dedup papers by stable id (matches classifier's dedup logic)
    const unique = new Map<string, Paper>();
    for (const e of authorEntries) unique.set(paperId(e.paper), e.paper);
    const papers = Array.from(unique.values());

    matched += 1;
    if (samples.length < 3) {
      samples.push({
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name}`,
        slug,
        n: papers.length,
        firstTitle: papers[0]?.title?.slice(0, 100) ?? "(no title)",
      });
    }

    if (DRY_RUN) continue;

    const papersJson = JSON.stringify(papers);
    await sql`
      UPDATE contacts
      SET papers = ${papersJson}::jsonb,
          papers_enriched_at = now()::text,
          updated_at = now()::text
      WHERE id = ${contact.id}
        AND tags::jsonb @> '["papers"]'::jsonb
        AND papers IS NULL
    `;
    written += 1;

    if (written % 100 === 0) {
      console.log(`  ...wrote ${written}/${matched} so far`);
    }
  }

  console.log("");
  console.log("Sample matches (first 3):");
  for (const s of samples) {
    console.log(`  [${s.id}] ${s.name} slug=${s.slug} → ${s.n} paper(s)`);
    console.log(`    "${s.firstTitle}"`);
  }
  console.log("");
  console.log(
    `Done. matched=${matched} / total=${rows.length} / skipped=${skipped}${DRY_RUN ? "" : ` / written=${written}`}`,
  );
  if (DRY_RUN) console.log("  (dry-run — no DB writes performed)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

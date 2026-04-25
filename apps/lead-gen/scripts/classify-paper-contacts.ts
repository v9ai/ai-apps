#!/usr/bin/env npx tsx
/**
 * For every contact tagged "papers" (imported by import-paper-authors.ts from
 * docs/papers/2025-2026-sales-leadgen/papers.json), ask the `classify_paper`
 * LangGraph whether each of their papers is genuinely about B2B sales /
 * lead-gen / outbound, and persist the per-paper verdicts to
 * contacts.paper_classifications (jsonb).
 *
 * Usage:
 *   pnpm tsx scripts/classify-paper-contacts.ts                  # real run
 *   pnpm tsx scripts/classify-paper-contacts.ts --dry-run        # no DB writes
 *   pnpm tsx scripts/classify-paper-contacts.ts --limit 10       # only first N contacts
 *   pnpm tsx scripts/classify-paper-contacts.ts --redo           # re-classify already-classified
 *
 * Default behavior is --only-missing: contacts whose paper_classifications
 * column is already non-null are skipped. Pass --redo to override.
 *
 * The script talks to the LangGraph backend over HTTP at LANGGRAPH_URL
 * (default http://127.0.0.1:8002). Start the backend with `pnpm backend-dev`.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { resolve } from "path";
import { neon } from "@neondatabase/serverless";
import { createHash } from "crypto";

// ── CLI flags ────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const REDO = process.argv.includes("--redo");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i !== -1 ? parseInt(process.argv[i + 1], 10) : Infinity;
})();

const LANGGRAPH_URL = (process.env.LANGGRAPH_URL || "http://127.0.0.1:8002").replace(/\/$/, "");
const LANGGRAPH_AUTH_TOKEN = process.env.LANGGRAPH_AUTH_TOKEN;

// ── Types matching papers.json (mirror scripts/import-paper-authors.ts) ──

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

interface PaperClassification {
  paper_id: string;
  title: string;
  is_sales_leadgen: boolean;
  confidence: number;
  reasons: string[];
}

interface ContactRow {
  id: number;
  slug: string | null;
  first_name: string;
  last_name: string;
  paper_classifications: unknown;
}

// ── Name parsing (copied from import-paper-authors.ts) ────────────────────

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

// ── LangGraph call ───────────────────────────────────────────────────────

interface ClassifyPaperResult {
  is_sales_leadgen: boolean;
  confidence: number;
  reasons: string[];
}

async function classifyPaper(title: string, abstract: string): Promise<ClassifyPaperResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (LANGGRAPH_AUTH_TOKEN) headers.Authorization = `Bearer ${LANGGRAPH_AUTH_TOKEN}`;

  const res = await fetch(`${LANGGRAPH_URL}/runs/wait`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      assistant_id: "classify_paper",
      input: { title, abstract: abstract ?? "" },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`classify_paper failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as Partial<ClassifyPaperResult>;
  return {
    is_sales_leadgen: Boolean(data.is_sales_leadgen),
    confidence: Math.max(0, Math.min(1, Number(data.confidence ?? 0))),
    reasons: Array.isArray(data.reasons) ? data.reasons.slice(0, 3).map(String) : [],
  };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const jsonPath = resolve("docs/papers/2025-2026-sales-leadgen/papers.json");
  const raw = readFileSync(jsonPath, "utf8");
  const entries = JSON.parse(raw) as PaperEntry[];
  console.log(`Loaded ${entries.length} paper entries from ${jsonPath}`);

  // Group by normalized author name → {canonical, entries}
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

  // JSONB containment matches exactly how the contacts resolver filters
  // (see src/apollo/resolvers/contacts/queries.ts). Only pull paper-tagged rows.
  const rows = (await sql`
    SELECT id, slug, first_name, last_name, paper_classifications
    FROM contacts
    WHERE tags::jsonb @> '["papers"]'::jsonb
    ORDER BY id ASC
  `) as ContactRow[];
  console.log(`Fetched ${rows.length} contacts tagged "papers"`);

  const pending = (REDO ? rows : rows.filter((r) => r.paper_classifications == null)).slice(
    0,
    Number.isFinite(LIMIT) ? LIMIT : rows.length,
  );
  const skippedAlreadyDone = rows.length - (REDO ? rows.length : rows.filter((r) => r.paper_classifications == null).length);
  console.log(
    `  → ${pending.length} to process, ${skippedAlreadyDone} already classified${REDO ? " (ignored via --redo)" : " (skipped)"}`,
  );

  // Sanity-check backend reachability before the loop
  try {
    const ping = await fetch(`${LANGGRAPH_URL}/ok`, {
      signal: AbortSignal.timeout(5_000),
    }).catch(() => null);
    if (!ping || !ping.ok) {
      // /ok is not guaranteed; fall through and let the first classifyPaper raise
      console.warn(`  (LangGraph ping to ${LANGGRAPH_URL}/ok did not respond 200 — will try anyway)`);
    }
  } catch {
    /* ignore */
  }

  let processed = 0;
  let noMatchInCorpus = 0;
  let contactsVerified = 0; // >= 1 on-topic paper
  let contactsOfftopic = 0; // all papers off-topic
  let totalPapers = 0;
  let totalOnTopic = 0;

  for (const contact of pending) {
    const slug = contact.slug ?? "";
    const authorEntries = bySlug.get(slug);
    if (!authorEntries || authorEntries.length === 0) {
      noMatchInCorpus += 1;
      console.log(
        `  [${contact.id}] ${contact.first_name} ${contact.last_name} — no papers in corpus for slug "${slug}", skipping`,
      );
      continue;
    }

    // Dedup papers by stable id in case a co-author list repeats an entry
    const unique = new Map<string, Paper>();
    for (const e of authorEntries) unique.set(paperId(e.paper), e.paper);
    const papers = Array.from(unique.values());

    const verdicts: PaperClassification[] = [];
    for (const p of papers) {
      try {
        const res = await classifyPaper(p.title, p.abstract_text ?? "");
        verdicts.push({
          paper_id: paperId(p),
          title: p.title,
          is_sales_leadgen: res.is_sales_leadgen,
          confidence: res.confidence,
          reasons: res.reasons,
        });
      } catch (err) {
        verdicts.push({
          paper_id: paperId(p),
          title: p.title,
          is_sales_leadgen: false,
          confidence: 0,
          reasons: [`classifier error: ${(err as Error).message.slice(0, 120)}`],
        });
      }
    }

    const onTopic = verdicts.filter((v) => v.is_sales_leadgen).length;
    totalPapers += verdicts.length;
    totalOnTopic += onTopic;
    if (onTopic > 0) contactsVerified += 1;
    else contactsOfftopic += 1;

    const summaryLine = `  [${contact.id}] ${contact.first_name} ${contact.last_name} — ${onTopic}/${verdicts.length} on-topic`;
    console.log(summaryLine);

    if (DRY_RUN) {
      // Print the first verdict as a sample so reasoning is inspectable
      const sample = verdicts[0];
      if (sample) {
        console.log(
          `    sample: "${sample.title.slice(0, 80)}" → is_sales_leadgen=${sample.is_sales_leadgen} conf=${sample.confidence.toFixed(2)}`,
        );
        if (sample.reasons.length) console.log(`    reasons: ${sample.reasons.join(" | ")}`);
      }
    } else {
      // Persist the source `papers` jsonb alongside the classifier verdicts.
      // The classifier reads paper data from the in-memory corpus
      // (papers.json), runs the LangGraph, and writes verdicts. Without also
      // writing `papers` here, the DB ends up with a classification result
      // whose source document is never captured on the contact row — which is
      // exactly the "papers IS NULL but paper_classifications populated" state
      // observed across all 1,404 rows tagged "papers".
      //
      // Shape matches contacts.papers field-resolver expectations
      // (title, authors, year, venue, doi, url, citation_count, source).
      // Extra fields on the source Paper (abstract_text, pdf_url, ...) are
      // harmless — the resolver picks only the keys it knows.
      const papersJson = JSON.stringify(papers);
      await sql`
        UPDATE contacts
        SET paper_classifications = ${JSON.stringify(verdicts)}::jsonb,
            paper_classifications_at = now()::text,
            papers = ${papersJson}::jsonb,
            papers_enriched_at = now()::text,
            updated_at = now()::text
        WHERE id = ${contact.id}
      `;
    }

    processed += 1;
  }

  console.log("");
  console.log(`Done. processed=${processed} verified=${contactsVerified} all-offtopic=${contactsOfftopic} no-match=${noMatchInCorpus}`);
  console.log(`  papers: ${totalOnTopic}/${totalPapers} on-topic across all processed contacts`);
  if (DRY_RUN) console.log("  (dry-run — no DB writes performed)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

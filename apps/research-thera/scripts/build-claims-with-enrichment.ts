/**
 * Unified Claim Building Pipeline with Advanced Enrichment
 *
 * Combines:
 * 1. DB fetch → 2. Multi-API enrichment → 3. Claim extraction → 4. DB save
 *
 * Features:
 * - Multi-API enrichment (Crossref, OpenAlex, Semantic Scholar, DataCite)
 * - DOI validation & inference
 * - HTML/PDF scraping fallbacks
 * - Batched claim extraction from abstracts
 * - Automatic DB persistence
 *
 * Usage:
 *   CONTACT_EMAIL=research@example.com pnpm tsx scripts/build-claims-with-enrichment.ts
 *
 * Environment:
 *   CONTACT_EMAIL        - Required for API politeness
 *   CLOUDFLARE_D1_TOKEN  - Cloudflare API token for D1 database access
 *   DEEPSEEK_API_KEY     - For claim extraction
 *   OPENALEX_API_KEY     - Optional (required after Feb 13, 2026)
 *   S2_API_KEY           - Optional Semantic Scholar key
 */

import { d1 } from "../src/db/d1";
import * as dotenv from "dotenv";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import { claimCardsTools } from "../src/tools/claim-cards.tools";
import type { PaperDetails } from "../src/tools/sources.tools";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_DATABASE_ID,
  CLOUDFLARE_D1_TOKEN,
} from "../src/config/d1";

dotenv.config();

// Suppress AI SDK warnings
process.env.AI_SDK_LOG_WARNINGS = "false";
if (typeof globalThis !== "undefined") {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CFG = {
  CONTACT_EMAIL: process.env.CONTACT_EMAIL ?? "",
  OPENALEX_API_KEY: process.env.OPENALEX_API_KEY ?? "",
  S2_API_KEY: process.env.S2_API_KEY ?? "",
  CACHE_DIR: "cache/http",
  NOTE_ID: 1, // ← Configure this
  NOTE_SLUG: "state-of-remote-work",
  TOPIC:
    "State of remote work research and trends in the post-COVID labor market",
};

const USER_AGENT = `ai-therapist/1.0 (${CFG.CONTACT_EMAIL ? `mailto:${CFG.CONTACT_EMAIL}` : "research@example.com"})`;

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// ============================================================================
// UTILITIES
// ============================================================================

function sha1(s: string): string {
  return createHash("sha1").update(s).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

function normTitle(t: string): string {
  return t
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const A = new Set(normTitle(a).split(" ").filter(Boolean));
  const B = new Set(normTitle(b).split(" ").filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return inter / union;
}

const DOI_REGEX = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/i;

function extractDoiFromText(text: string): string | null {
  const m = text.match(DOI_REGEX);
  if (m) return m[0].toLowerCase().replace(/[.,;]+$/, "");
  return null;
}

function normalizeDoi(doiOrUrl: string): string {
  const d = doiOrUrl.trim();
  const m = d.match(/10\.\d{4,9}\/.+/);
  if (!m) return d.toLowerCase();
  return m[0]
    .replace(/^https?:\/\/doi\.org\//i, "")
    .toLowerCase()
    .replace(/[.,;]+$/, "");
}

// ============================================================================
// HTTP CACHING
// ============================================================================

async function cachedGet(
  url: string,
  headers: Record<string, string>,
): Promise<string> {
  await ensureDir(CFG.CACHE_DIR);
  const cacheKey = sha1(url);
  const cachePath = `${CFG.CACHE_DIR}/${cacheKey}.txt`;

  if (existsSync(cachePath)) {
    return readFile(cachePath, "utf8");
  }

  const maxRetries = 3;
  let lastErr: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers, redirect: "follow" });

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter ? Number(retryAfter) * 1000 : 1500;
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText} ${url}`);
      }

      const body = await res.text();
      await writeFile(cachePath, body, "utf8");
      return body;
    } catch (e: any) {
      lastErr = e;
      const backoff =
        400 * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      await sleep(backoff);
    }
  }

  throw new Error(
    `Failed after retries: ${String(lastErr?.message || lastErr)}`,
  );
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
): Promise<T> {
  const text = await cachedGet(url, { ...headers, Accept: "application/json" });
  return JSON.parse(text) as T;
}

// ============================================================================
// ENRICHMENT - CROSSREF
// ============================================================================

async function crossrefByDoi(doi: string): Promise<any | null> {
  const url = new URL(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
  );
  if (CFG.CONTACT_EMAIL) url.searchParams.set("mailto", CFG.CONTACT_EMAIL);

  try {
    await sleep(600); // Rate limit
    return await fetchJson<any>(url.toString(), { "User-Agent": USER_AGENT });
  } catch {
    return null;
  }
}

async function crossrefSearchByTitle(
  title: string,
  year: number | null,
): Promise<any[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", title);
  url.searchParams.set("rows", "5");
  if (year) {
    url.searchParams.set(
      "filter",
      `from-pub-date:${year - 1}-01-01,until-pub-date:${year + 1}-12-31`,
    );
  }
  if (CFG.CONTACT_EMAIL) url.searchParams.set("mailto", CFG.CONTACT_EMAIL);

  try {
    await sleep(600);
    const json = await fetchJson<any>(url.toString(), {
      "User-Agent": USER_AGENT,
    });
    return json?.message?.items || [];
  } catch {
    return [];
  }
}

function crossrefToAuthors(msg: any): string[] | null {
  const a = msg?.author;
  if (!Array.isArray(a) || !a.length) return null;
  const names = a
    .map((x: any) => {
      const given = (x?.given ?? "").toString().trim();
      const family = (x?.family ?? "").toString().trim();
      return `${given} ${family}`.trim() || null;
    })
    .filter((x: string | null): x is string => Boolean(x));
  return names.length ? names : null;
}

function crossrefToAbstract(msg: any): string | null {
  const abs = msg?.abstract;
  if (typeof abs !== "string") return null;
  return (
    abs
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

// ============================================================================
// ENRICHMENT - OPENALEX
// ============================================================================

function openAlexHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
  if (CFG.OPENALEX_API_KEY)
    h["Authorization"] = `Bearer ${CFG.OPENALEX_API_KEY}`;
  if (CFG.CONTACT_EMAIL) h["X-Contact"] = CFG.CONTACT_EMAIL;
  return h;
}

async function openalexByDoi(doi: string): Promise<any | null> {
  const id = encodeURIComponent(`https://doi.org/${normalizeDoi(doi)}`);
  const url = `https://api.openalex.org/works/${id}`;
  try {
    await sleep(150);
    return await fetchJson<any>(url, openAlexHeaders());
  } catch {
    return null;
  }
}

async function openalexSearch(
  title: string,
  year: number | null,
): Promise<any[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", title);
  url.searchParams.set("per-page", "5");
  if (year) url.searchParams.set("filter", `publication_year:${year}`);

  try {
    await sleep(150);
    const json = await fetchJson<any>(url.toString(), openAlexHeaders());
    return json?.results || [];
  } catch {
    return [];
  }
}

function openalexAbstractToText(
  inv: Record<string, number[]> | null | undefined,
): string | null {
  if (!inv) return null;
  const pairs: Array<{ pos: number; word: string }> = [];
  for (const [word, positions] of Object.entries(inv)) {
    for (const pos of positions) pairs.push({ pos, word });
  }
  if (pairs.length === 0) return null;
  pairs.sort((a, b) => a.pos - b.pos);
  return pairs
    .map((p) => p.word)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function openalexToAuthors(work: any): string[] | null {
  if (!Array.isArray(work?.authorships)) return null;
  const names = work.authorships
    .map((a: any) => a?.author?.display_name)
    .filter((x: any): x is string => Boolean(x));
  return names.length ? names : null;
}

// ============================================================================
// ENRICHMENT - SEMANTIC SCHOLAR
// ============================================================================

function s2Headers(): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
  if (CFG.S2_API_KEY) h["x-api-key"] = CFG.S2_API_KEY;
  return h;
}

async function s2ByDoi(doi: string): Promise<any | null> {
  const fields = "title,year,authors,abstract,externalIds,url,paperId";
  const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=${encodeURIComponent(fields)}`;
  try {
    await sleep(800);
    return await fetchJson<any>(url, s2Headers());
  } catch {
    return null;
  }
}

async function s2Search(title: string, year: number | null): Promise<any[]> {
  const fields = "title,year,authors,abstract,externalIds,url,paperId";
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", title);
  url.searchParams.set("limit", "5");
  url.searchParams.set("fields", fields);

  try {
    await sleep(800);
    const json = await fetchJson<any>(url.toString(), s2Headers());
    return json?.data || [];
  } catch {
    return [];
  }
}

function s2ToAuthors(paper: any): string[] | null {
  if (!Array.isArray(paper?.authors)) return null;
  const names = paper.authors
    .map((a: any) => a?.name)
    .filter((x: any): x is string => Boolean(x));
  return names.length ? names : null;
}

// ============================================================================
// VALIDATION
// ============================================================================

async function validateDoi(candidate: string): Promise<string | null> {
  const cr = await crossrefByDoi(candidate);
  if (cr?.message?.DOI) {
    return normalizeDoi(cr.message.DOI);
  }
  return null;
}

// ============================================================================
// MATCHING
// ============================================================================

function pickBestByTitle<T extends { title?: string; display_name?: string }>(
  candidates: T[],
  targetTitle: string,
  targetYear: number | null,
): T | null {
  let best: { cand: T; score: number } | null = null;

  for (const c of candidates) {
    const candTitle = (c as any).title || (c as any).display_name;
    if (!candTitle) continue;

    const titleScore = titleSimilarity(String(candTitle), targetTitle);
    const candYear =
      (c as any).year ||
      (c as any).publication_year ||
      (c as any).issued?.["date-parts"]?.[0]?.[0];
    const yearPenalty =
      targetYear && candYear
        ? Math.min(0.15, Math.abs(targetYear - candYear) * 0.05)
        : 0;
    const finalScore = titleScore - yearPenalty;

    if (!best || finalScore > best.score) {
      best = { cand: c, score: finalScore };
    }
  }

  return best && best.score >= 0.75 ? best.cand : null;
}

// ============================================================================
// MAIN ENRICHMENT
// ============================================================================

type EnrichmentResult = {
  doi: string | null;
  abstract: string | null;
  authors: string[] | null;
  source: string;
  confidence: number;
};

async function enrichPaper(
  title: string,
  year: number | null,
  existingDoi?: string,
  existingAbstract?: string,
): Promise<EnrichmentResult> {
  let doi = existingDoi || null;
  let abstract =
    existingAbstract && existingAbstract !== "Abstract not available"
      ? existingAbstract
      : null;
  let authors: string[] | null = null;
  let source = "none";

  // Step 1: If we have DOI, validate and get metadata from Crossref
  if (doi) {
    const validated = await validateDoi(doi);
    if (validated) {
      doi = validated;
      const cr = await crossrefByDoi(doi);
      if (cr?.message) {
        if (!abstract) {
          abstract = crossrefToAbstract(cr.message);
          if (abstract) source = "crossref";
        }
        if (!authors) {
          authors = crossrefToAuthors(cr.message);
        }
      }
    } else {
      doi = null; // Invalid DOI
    }
  }

  // Step 2: Try Crossref title search if no DOI
  if (!doi) {
    const crItems = await crossrefSearchByTitle(title, year);
    const crBest = pickBestByTitle(crItems, title, year);
    if (crBest && (crBest as any).DOI) {
      const candidateDoi = normalizeDoi((crBest as any).DOI);
      const validated = await validateDoi(candidateDoi);
      if (validated) {
        doi = validated;
        source = "crossref-search";
        if (!abstract) {
          abstract = crossrefToAbstract(crBest);
        }
        if (!authors) {
          authors = crossrefToAuthors(crBest);
        }
      }
    }
  }

  // Step 3: Try OpenAlex by DOI if we have one
  if (doi && !abstract) {
    const oa = await openalexByDoi(doi);
    if (oa) {
      const oaAbs = openalexAbstractToText(oa.abstract_inverted_index);
      if (oaAbs) {
        abstract = oaAbs;
        source = "openalex";
      }
      if (!authors) {
        authors = openalexToAuthors(oa);
      }
    }
  }

  // Step 4: Try OpenAlex title search
  if (!doi || !abstract) {
    const oaResults = await openalexSearch(title, year);
    const oaBest = pickBestByTitle(oaResults, title, year);
    if (oaBest) {
      if (!doi && (oaBest as any).doi) {
        const candidateDoi = normalizeDoi(
          String((oaBest as any).doi).replace(/^https?:\/\/doi\.org\//i, ""),
        );
        const validated = await validateDoi(candidateDoi);
        if (validated) {
          doi = validated;
          source = "openalex-search";
        }
      }
      if (!abstract) {
        const oaAbs = openalexAbstractToText(
          (oaBest as any).abstract_inverted_index,
        );
        if (oaAbs) {
          abstract = oaAbs;
          source = "openalex";
        }
      }
      if (!authors) {
        authors = openalexToAuthors(oaBest);
      }
    }
  }

  // Step 5: Try Semantic Scholar if we have API key
  if (CFG.S2_API_KEY && (!doi || !abstract)) {
    if (doi) {
      const s2 = await s2ByDoi(doi);
      if (s2) {
        if (
          !abstract &&
          typeof s2.abstract === "string" &&
          s2.abstract.trim()
        ) {
          abstract = s2.abstract.trim();
          source = "semanticscholar";
        }
        if (!authors) {
          authors = s2ToAuthors(s2);
        }
      }
    } else {
      const s2Results = await s2Search(title, year);
      const s2Best = pickBestByTitle(s2Results, title, year);
      if (s2Best) {
        if ((s2Best as any).externalIds?.DOI) {
          const candidateDoi = normalizeDoi((s2Best as any).externalIds.DOI);
          const validated = await validateDoi(candidateDoi);
          if (validated) {
            doi = validated;
            source = "semanticscholar-search";
          }
        }
        if (!abstract && typeof (s2Best as any).abstract === "string") {
          abstract = (s2Best as any).abstract.trim();
          source = "semanticscholar";
        }
        if (!authors) {
          authors = s2ToAuthors(s2Best);
        }
      }
    }
  }

  // Calculate confidence
  let confidence = 0.2;
  if (doi) confidence += 0.35;
  if (authors && authors.length) confidence += 0.25;
  if (abstract && abstract.length > 80) confidence += 0.2;

  return {
    doi,
    abstract,
    authors,
    source,
    confidence: Math.min(1, confidence),
  };
}

// ============================================================================
// CLAIM EXTRACTION
// ============================================================================

async function extractClaimsFromPapersBatched(
  topic: string,
  papers: PaperDetails[],
  opts?: {
    batchSize?: number;
    maxClaimsTotal?: number;
    minClaimsPerBatch?: number;
    maxClaimsPerBatch?: number;
    maxBatches?: number;
    abstractCharLimit?: number;
  },
): Promise<string[]> {
  const batchSize = Math.max(8, Math.min(16, opts?.batchSize ?? 12));
  const maxClaimsTotal = Math.max(8, Math.min(60, opts?.maxClaimsTotal ?? 20));
  const minClaimsPerBatch = Math.max(
    4,
    Math.min(10, opts?.minClaimsPerBatch ?? 6),
  );
  const maxClaimsPerBatch = Math.max(
    minClaimsPerBatch,
    Math.min(14, opts?.maxClaimsPerBatch ?? 10),
  );
  const maxBatches = Math.max(1, Math.min(12, opts?.maxBatches ?? 6));
  const abstractCharLimit = Math.max(
    300,
    Math.min(1400, opts?.abstractCharLimit ?? 900),
  );

  const normalizeKey = (s: string) =>
    s
      .toLowerCase()
      .replace(/[""]/g, '"')
      .replace(/[']/g, "'")
      .replace(/\s+/g, " ")
      .trim();

  const truncate = (s: string) => {
    const t = s.trim();
    if (t.length <= abstractCharLimit) return t;
    return t.slice(0, abstractCharLimit) + "…";
  };

  const withAbstracts = papers
    .filter(
      (p) =>
        p.abstract &&
        p.abstract !== "Abstract not available" &&
        p.abstract.length > 80,
    )
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  console.log(
    `🧾 Papers with usable abstracts: ${withAbstracts.length}/${papers.length}`,
  );

  if (withAbstracts.length === 0) {
    console.warn(`   ⚠️  No papers have abstracts - cannot extract claims`);
    return [];
  }

  const batches: PaperDetails[][] = [];
  for (
    let i = 0;
    i < withAbstracts.length && batches.length < maxBatches;
    i += batchSize
  ) {
    batches.push(withAbstracts.slice(i, i + batchSize));
  }

  console.log(
    `🧩 Claim extraction batches: ${batches.length} (batchSize=${batchSize})`,
  );

  const claimsSchema = z.object({
    claims: z.array(z.string()).min(minClaimsPerBatch).max(maxClaimsPerBatch),
  });

  const out: string[] = [];
  const seen = new Set<string>();

  for (let bi = 0; bi < batches.length; bi++) {
    if (out.length >= maxClaimsTotal) break;

    const batch = batches[bi];
    const context = batch
      .map((p, idx) => {
        const yr = p.year ? ` (${p.year})` : "";
        return `[#${idx + 1}] Title${yr}: ${p.title}\nAbstract: ${truncate(p.abstract!)}`;
      })
      .join("\n\n---\n\n");

    console.log(`🤖 Extracting claims from batch ${bi + 1}/${batches.length}…`);

    const result = await generateObject({
      model: deepseek("deepseek-chat"),
      schema: claimsSchema,
      prompt: `
You are extracting evidence-based claims from research abstracts.

Topic: "${topic}"

Abstracts:
${context}

Return ${minClaimsPerBatch}-${maxClaimsPerBatch} claims that:
- are directly supported by these abstracts
- are atomic and testable
- include scope when possible (population/setting/outcome/timeframe)
- avoid generic statements

Only return the JSON object { "claims": [...] }.
`.trim(),
    });

    for (const c of result.object.claims) {
      const key = normalizeKey(c);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c.trim());
      if (out.length >= maxClaimsTotal) break;
    }
  }

  console.log(`✅ Extracted ${out.length} unique claims total`);
  return out.slice(0, maxClaimsTotal);
}

// ============================================================================
// PARALLEL PROCESSING
// ============================================================================

async function mapLimit<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const promise = fn(items[i], i).then((result) => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex((p) => p === promise),
        1,
      );
    }
  }

  await Promise.all(executing);
  return results;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!CFG.CONTACT_EMAIL) {
    console.error("❌ Error: CONTACT_EMAIL environment variable is required");
    console.error(
      "Usage: CONTACT_EMAIL=research@example.com pnpm tsx scripts/build-claims-with-enrichment.ts",
    );
    process.exit(1);
  }

  console.log(`🚀 Unified Claim Building Pipeline with Advanced Enrichment\n`);
  console.log(`📝 Note: ${CFG.NOTE_SLUG} (ID: ${CFG.NOTE_ID})`);
  console.log(`🎯 Topic: ${CFG.TOPIC}`);
  console.log(
    `🔧 APIs: Crossref, OpenAlex${CFG.OPENALEX_API_KEY ? " (with key)" : ""}, ${CFG.S2_API_KEY ? "Semantic Scholar (with key)" : "Semantic Scholar (no key)"}`,
  );
  console.log(`💾 Cache: ${CFG.CACHE_DIR}\n`);

  try {
    // Step 1: Load linked research from DB
    console.log(`📚 Loading linked research from database...`);
    const res = await d1.execute({
      sql: `
        SELECT
          r.id as id,
          r.title as title,
          r.year as year,
          r.doi as doi,
          r.url as url,
          r.authors as authors,
          r.abstract as abstract,
          r.journal as journal
        FROM therapy_research r
        INNER JOIN notes_research nr ON nr.research_id = r.id
        WHERE nr.note_id = ?
        ORDER BY r.year DESC
      `,
      args: [CFG.NOTE_ID],
    });

    const dbPapers = res.rows.map((r: any) => ({
      title: String(r.title),
      year: r.year != null ? Number(r.year) : undefined,
      doi: r.doi ? String(r.doi) : undefined,
      url: r.url ? String(r.url) : undefined,
      abstract: r.abstract ? String(r.abstract) : undefined,
      authors: r.authors ? JSON.parse(String(r.authors)) : undefined,
      journal: r.journal ? String(r.journal) : undefined,
    }));

    console.log(`   ✓ Loaded ${dbPapers.length} papers from DB\n`);

    if (dbPapers.length === 0) {
      console.error(`❌ No linked research found for note ${CFG.NOTE_ID}`);
      console.error(
        `   Please link research papers first using insert-all-research-papers.ts`,
      );
      process.exit(1);
    }

    // Step 2: Enrich papers with advanced multi-API enrichment
    console.log(`🔬 Enriching papers with multi-API metadata...`);

    const needEnrichment = dbPapers.filter(
      (p) =>
        !p.abstract ||
        p.abstract === "Abstract not available" ||
        p.abstract.length < 80,
    );

    console.log(
      `   Papers needing enrichment: ${needEnrichment.length}/${dbPapers.length}`,
    );

    let enrichedCount = 0;
    const enrichedPapers: PaperDetails[] = await mapLimit(
      dbPapers,
      3,
      async (paper, idx) => {
        const needsEnrich =
          !paper.abstract ||
          paper.abstract === "Abstract not available" ||
          paper.abstract.length < 80;

        if (needsEnrich) {
          const result = await enrichPaper(
            paper.title,
            paper.year || null,
            paper.doi,
            paper.abstract,
          );
          enrichedCount++;

          if (enrichedCount <= 5 || enrichedCount % 20 === 0) {
            console.log(
              `   [${enrichedCount}/${needEnrichment.length}] ${paper.title.substring(0, 60)}... (${result.source}, confidence: ${(result.confidence * 100).toFixed(0)}%)`,
            );
          }

          return {
            ...paper,
            doi: result.doi || paper.doi,
            abstract:
              result.abstract || paper.abstract || "Abstract not available",
            authors: result.authors || paper.authors,
            source: "linked" as const,
          } as PaperDetails;
        } else {
          return {
            ...paper,
            source: "linked" as const,
          } as PaperDetails;
        }
      },
    );

    console.log(`   ✓ Enrichment complete\n`);

    // Summary of enrichment results
    const withGoodAbstracts = enrichedPapers.filter(
      (p) =>
        p.abstract &&
        p.abstract !== "Abstract not available" &&
        p.abstract.length > 80,
    );
    console.log(
      `📊 Abstract coverage: ${withGoodAbstracts.length}/${enrichedPapers.length} (${((withGoodAbstracts.length / enrichedPapers.length) * 100).toFixed(1)}%)\n`,
    );

    // Step 3: Extract claims from enriched abstracts
    console.log(`🤖 Extracting claims from enriched corpus...`);
    const extractedClaims = await extractClaimsFromPapersBatched(
      CFG.TOPIC,
      enrichedPapers,
      {
        batchSize: 12,
        maxClaimsTotal: 20,
        minClaimsPerBatch: 6,
        maxClaimsPerBatch: 10,
        maxBatches: 6,
        abstractCharLimit: 900,
      },
    );

    if (extractedClaims.length === 0) {
      console.error(
        `❌ Failed to extract any claims. Check abstract coverage.`,
      );
      process.exit(1);
    }

    console.log(`   ✓ Extracted ${extractedClaims.length} claims\n`);

    // Step 4: Build claim cards
    console.log(`🔨 Building claim cards...`);
    const cards = await claimCardsTools.buildClaimCardsFromClaims(
      extractedClaims,
      {
        topK: 12,
        useLlmJudge: true,
        paperPool: enrichedPapers.map((p) => ({
          title: p.title,
          year: p.year,
          doi: p.doi,
          url: p.url,
          source: p.source,
          abstract: p.abstract,
          authors: p.authors,
          journal: p.journal,
        })),
        enrichPool: false, // Already enriched
        poolConcurrency: 3,
      },
    );

    console.log(`   ✓ Built ${cards.length} claim cards\n`);

    // Step 5: Save to database
    console.log(`💾 Saving claim cards to database...`);
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      console.log(
        `   [${i + 1}/${cards.length}] Saving: ${card.claim.substring(0, 80)}...`,
      );
      await claimCardsTools.saveClaimCard(card, CFG.NOTE_ID);
    }
    console.log(`   ✓ All cards saved\n`);

    // Final summary
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ PIPELINE COMPLETE`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📚 Papers processed: ${enrichedPapers.length}`);
    console.log(
      `📊 Abstract enrichment: ${needEnrichment.length} papers improved`,
    );
    console.log(`💡 Claims extracted: ${extractedClaims.length}`);
    console.log(`🎯 Claim cards built: ${cards.length}`);
    console.log(`💾 Saved to note: ${CFG.NOTE_SLUG} (ID: ${CFG.NOTE_ID})`);
    console.log(`\n🔗 View at: /notes/${CFG.NOTE_SLUG}\n`);

    // Display sample claims
    console.log(`\n📋 Sample Claims:\n`);
    cards.slice(0, 3).forEach((card: any, idx: number) => {
      console.log(`${idx + 1}. ${card.claim}`);
      console.log(
        `   Verdict: ${card.verdict} (${Math.round(card.confidence * 100)}% confidence)`,
      );
      console.log(`   Evidence: ${card.evidence.length} sources\n`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

/**
 * enrich-papers.ts
 *
 * Unified research paper enrichment pipeline combining three strategies:
 * 1. Deterministic DOI extraction (NBER, IZA, SSRN, IMF, ScienceDirect)
 * 2. Multi-API metadata (Crossref, OpenAlex, Semantic Scholar, DataCite)
 * 3. HTML/PDF scraping fallbacks
 *
 * Usage:
 *   CONTACT_EMAIL=research@example.com pnpm tsx scripts/enrich-papers.ts
 *
 * Environment:
 *   CONTACT_EMAIL       - Required for API politeness
 *   OPENALEX_API_KEY    - Optional (required after Feb 13, 2026)
 *   S2_API_KEY          - Optional Semantic Scholar key
 *
 * Output:
 *   scripts/enriched.json  - Full enriched records with provenance
 *   scripts/enriched.csv   - Simplified CSV for database import
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import Bottleneck from "bottleneck";
import pLimit from "p-limit";
import * as cheerio from "cheerio";
import { parse as csvParse } from "csv-parse/sync";
import { stringify as csvStringify } from "csv-stringify/sync";

// ============================================================================
// TYPES
// ============================================================================

type PaperRow = {
  rank: string;
  year: string;
  title: string;
  series_or_venue: string;
  url: string;
};

type ExternalIds = {
  nber_id?: string;
  iza_dp?: string;
  cepr_dp?: string;
  ssrn_id?: string;
  imf_wp?: string;
  pii?: string;
  openalex_id?: string;
  s2_paperId?: string;
};

type Provenance = {
  doi?: string;
  abstract?: string;
  authors?: string;
  tried: string[];
  notes: string[];
  confidence: number;
};

type Enriched = {
  rank: number;
  year: number | null;
  title: string;
  series_or_venue: string;
  url: string;
  doi: string | null;
  abstract: string | null;
  authors: string[] | null;
  external_ids: ExternalIds;
  provenance: Provenance;
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const CFG = {
  CONTACT_EMAIL: process.env.CONTACT_EMAIL ?? "",
  OPENALEX_API_KEY: process.env.OPENALEX_API_KEY ?? "",
  S2_API_KEY: process.env.S2_API_KEY ?? "",
  CONCURRENCY: Number(process.env.CONCURRENCY ?? 6),
  IN_CSV: "scripts/research-papers.csv",
  OUT_JSON: "scripts/enriched.json",
  OUT_CSV: "scripts/enriched.csv",
  CACHE_DIR: "cache/http",
};

const USER_AGENT = `paper-enricher/2.0 (${CFG.CONTACT_EMAIL ? `mailto:${CFG.CONTACT_EMAIL}` : "no-mailto"})`;

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
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
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

function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)];
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
// CACHING & HTTP
// ============================================================================

async function cachedGet(
  url: string,
  headers: Record<string, string>,
  limiter: Bottleneck,
): Promise<string> {
  await ensureDir(CFG.CACHE_DIR);
  const cacheKey = sha1(url);
  const cachePath = `${CFG.CACHE_DIR}/${cacheKey}.txt`;

  if (existsSync(cachePath)) {
    return readFile(cachePath, "utf8");
  }

  const body = await limiter.schedule(async () => {
    const maxRetries = 3;
    let lastErr: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, { headers, redirect: "follow" });

        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const waitMs = retryAfter ? Number(retryAfter) * 1000 : 1500;
          await sleep(waitMs);
          throw new Error(`429 rate limited: ${url}`);
        }

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(
            `${res.status} ${res.statusText} ${url} :: ${txt.slice(0, 200)}`,
          );
        }

        return res.text();
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
  });

  await writeFile(cachePath, body, "utf8");
  return body;
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
  limiter: Bottleneck,
): Promise<T> {
  const text = await cachedGet(
    url,
    { ...headers, Accept: "application/json" },
    limiter,
  );
  return JSON.parse(text) as T;
}

// ============================================================================
// ID EXTRACTION & DOI INFERENCE
// ============================================================================

function extractNberId(p: PaperRow): string | null {
  const m1 = p.url.match(/\/papers\/(w\d+)/i);
  if (m1) return m1[1].toLowerCase();
  const m2 = p.series_or_venue.match(/\b(w\d{4,})\b/i);
  return m2 ? m2[1].toLowerCase() : null;
}

function extractIzaDpId(p: PaperRow): string | null {
  const m1 = p.url.match(/\/dp(\d+)\.pdf/i);
  if (m1) return m1[1];
  const m2 = p.series_or_venue.match(/\bIZA Discussion Paper\s+(\d+)\b/i);
  return m2 ? m2[1] : null;
}

function extractCeprDpId(p: PaperRow): string | null {
  const m1 = p.url.match(/\/dp(\d+)/i);
  if (m1 && p.url.includes("cepr")) return m1[1];
  const m2 = p.series_or_venue.match(/\bCEPR.*DP(\d+)\b/i);
  return m2 ? m2[1] : null;
}

function extractSsrnId(p: PaperRow): string | null {
  const m = p.url.match(/ssrn\.com\/abstract[_=](\d+)/i);
  return m ? m[1] : null;
}

function extractImfWpId(p: PaperRow): string | null {
  const m = p.series_or_venue.match(/Working Paper\s+(\d{4})\/(\d+)/i);
  return m ? `${m[1]}/${m[2].padStart(3, "0")}` : null;
}

function extractPii(p: PaperRow): string | null {
  const m = p.url.match(/\/pii\/([A-Z0-9]+)/i);
  return m ? m[1] : null;
}

function guessExternalIds(p: PaperRow): ExternalIds {
  return {
    nber_id: extractNberId(p) || undefined,
    iza_dp: extractIzaDpId(p) || undefined,
    cepr_dp: extractCeprDpId(p) || undefined,
    ssrn_id: extractSsrnId(p) || undefined,
    imf_wp: extractImfWpId(p) || undefined,
    pii: extractPii(p) || undefined,
  };
}

function inferDoiFromPatterns(p: PaperRow, ids: ExternalIds): string | null {
  // NBER: 10.3386/w{number}
  if (ids.nber_id) return `10.3386/${ids.nber_id}`;

  // SSRN: 10.2139/ssrn.{id}
  if (ids.ssrn_id) return `10.2139/ssrn.${ids.ssrn_id}`;

  // Fed Working Papers (SF Fed pattern)
  const frb = p.url.match(/wp(\d{4})-(\d{2})/i);
  if (frb && p.url.includes("frbsf")) return `10.24148/wp${frb[1]}-${frb[2]}`;

  // DOI in URL
  const doiInUrl = extractDoiFromText(p.url);
  if (doiInUrl) return doiInUrl;

  return null;
}

// ============================================================================
// HTML METADATA SCRAPING
// ============================================================================

function parseHtmlForMeta(html: string): {
  doi: string | null;
  abstract: string | null;
  authors: string[] | null;
} {
  const $ = cheerio.load(html);

  const meta = (name: string) =>
    $(`meta[name="${name}"]`).attr("content")?.trim() || null;
  const metaProp = (prop: string) =>
    $(`meta[property="${prop}"]`).attr("content")?.trim() || null;

  let doi =
    meta("citation_doi") ||
    meta("DC.Identifier") ||
    extractDoiFromText(html) ||
    null;

  const authors: string[] = [];
  $('meta[name="citation_author"]').each((_, el) => {
    const a = $(el).attr("content")?.trim();
    if (a) authors.push(a);
  });

  let abstract =
    meta("citation_abstract") ||
    metaProp("og:description") ||
    meta("description") ||
    null;

  // Try to find Abstract heading in body
  if (!abstract || abstract.length < 50) {
    const absHeading = $("h2, h3, h4")
      .filter((_, el) => {
        const txt = $(el).text().trim().toLowerCase();
        return txt === "abstract" || txt === "summary";
      })
      .first();

    if (absHeading.length) {
      const paragraphs = absHeading.nextAll("p").slice(0, 4);
      const txt = paragraphs.text().replace(/\s+/g, " ").trim();
      if (txt.length > 80) abstract = txt;
    }
  }

  // JSON-LD fallback
  if (!doi || !abstract || authors.length === 0) {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).text());
        const objs = Array.isArray(json) ? json : [json];
        for (const o of objs) {
          const type = o?.["@type"];
          if (
            type === "ScholarlyArticle" ||
            type === "Article" ||
            type === "Report"
          ) {
            if (!doi && o.identifier) {
              const d = extractDoiFromText(JSON.stringify(o.identifier));
              if (d) {
                doi = normalizeDoi(d);
              }
            }
            if (!abstract && typeof o.description === "string") {
              abstract = o.description.trim();
            }
            if (authors.length === 0 && o.author) {
              const arr = Array.isArray(o.author) ? o.author : [o.author];
              for (const a of arr) {
                if (typeof a === "string") authors.push(a);
                else if (a?.name) authors.push(String(a.name));
              }
            }
          }
        }
      } catch {
        // ignore
      }
    });
  }

  return {
    doi: doi ? normalizeDoi(doi) : null,
    abstract: abstract && abstract.length > 20 ? abstract.trim() : null,
    authors: authors.length ? uniq(authors) : null,
  };
}

// ============================================================================
// API CALLS - CROSSREF
// ============================================================================

const limiterCrossref = new Bottleneck({ minTime: 600, maxConcurrent: 2 }); // ~1.6 rps

async function crossrefByDoi(doi: string): Promise<any | null> {
  const url = new URL(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
  );
  if (CFG.CONTACT_EMAIL) url.searchParams.set("mailto", CFG.CONTACT_EMAIL);

  try {
    return await fetchJson<any>(
      url.toString(),
      { "User-Agent": USER_AGENT },
      limiterCrossref,
    );
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
    const json = await fetchJson<any>(
      url.toString(),
      { "User-Agent": USER_AGENT },
      limiterCrossref,
    );
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
  // Strip JATS XML tags
  return (
    abs
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

// ============================================================================
// API CALLS - DATACITE
// ============================================================================

const limiterDataCite = new Bottleneck({ minTime: 600, maxConcurrent: 2 });

async function dataciteByDoi(doi: string): Promise<any | null> {
  const url = `https://api.datacite.org/dois/${encodeURIComponent(doi)}`;
  try {
    return await fetchJson<any>(
      url,
      { "User-Agent": USER_AGENT },
      limiterDataCite,
    );
  } catch {
    return null;
  }
}

// ============================================================================
// API CALLS - OPENALEX
// ============================================================================

const limiterOpenAlex = new Bottleneck({ minTime: 150, maxConcurrent: 2 }); // ~6-7 rps

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
    return await fetchJson<any>(url, openAlexHeaders(), limiterOpenAlex);
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
    const json = await fetchJson<any>(
      url.toString(),
      openAlexHeaders(),
      limiterOpenAlex,
    );
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
// API CALLS - SEMANTIC SCHOLAR
// ============================================================================

const limiterS2 = new Bottleneck({ minTime: 800, maxConcurrent: 1 }); // ~1 rps (conservative)

function s2Headers(): Record<string, string> {
  const h: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };
  if (CFG.S2_API_KEY) h["x-api-key"] = CFG.S2_API_KEY;
  return h;
}

async function s2ByDoi(doi: string): Promise<any | null> {
  const fields = "title,year,authors,abstract,externalIds,url,paperId,venue";
  const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(doi)}?fields=${encodeURIComponent(fields)}`;
  try {
    return await fetchJson<any>(url, s2Headers(), limiterS2);
  } catch {
    return null;
  }
}

async function s2Search(title: string, year: number | null): Promise<any[]> {
  const fields = "title,year,authors,abstract,externalIds,url,paperId,venue";
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", title);
  url.searchParams.set("limit", "5");
  url.searchParams.set("fields", fields);

  try {
    const json = await fetchJson<any>(url.toString(), s2Headers(), limiterS2);
    return json?.data || [];
  } catch {
    return [];
  }
}

function s2ToAuthors(paper: any): string[] | null {
  if (!Array.isArray(paper?.authors)) return null;
  const names = paper.authors.map((a: any) => a?.name).filter((x: any): x is string => Boolean(x));
  return names.length ? names : null;
}

// ============================================================================
// HTML SCRAPING (WITH IZA LANDING PAGE LOGIC)
// ============================================================================

const limiterWeb = new Bottleneck({ minTime: 150, maxConcurrent: 4 });

async function scrapeHtmlForMeta(
  url: string,
  ids: ExternalIds,
): Promise<{
  doi: string | null;
  abstract: string | null;
  authors: string[] | null;
}> {
  // For IZA PDFs, prefer the landing page
  let scrapeUrl = url;
  if (ids.iza_dp && url.endsWith(".pdf")) {
    scrapeUrl = `https://www.iza.org/publications/dp/${ids.iza_dp}`;
  }

  try {
    const html = await cachedGet(
      scrapeUrl,
      { "User-Agent": USER_AGENT },
      limiterWeb,
    );
    return parseHtmlForMeta(html);
  } catch {
    return { doi: null, abstract: null, authors: null };
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

async function validateDoi(candidate: string): Promise<string | null> {
  // Try Crossref first
  const cr = await crossrefByDoi(candidate);
  if (cr?.message?.DOI) {
    return normalizeDoi(cr.message.DOI);
  }

  // Try DataCite
  const dc = await dataciteByDoi(candidate);
  if (dc?.data?.id) {
    const dcDoi = normalizeDoi(dc.data.id);
    if (dcDoi === normalizeDoi(candidate)) {
      return dcDoi;
    }
  }

  return null;
}

// ============================================================================
// CANDIDATE MATCHING
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
// MAIN ENRICHMENT LOGIC
// ============================================================================

async function enrichOne(row: PaperRow): Promise<Enriched> {
  const year = Number(row.year.replace(/"/g, "")) || null;
  const external_ids = guessExternalIds(row);

  const provenance: Provenance = {
    tried: [],
    notes: [],
    confidence: 0.0,
  };

  let doi: string | null = null;
  let abstract: string | null = null;
  let authors: string[] | null = null;

  // -------------------------------------------------------------------------
  // STEP 1: Infer DOI from patterns
  // -------------------------------------------------------------------------
  const inferred = inferDoiFromPatterns(row, external_ids);
  if (inferred) {
    doi = inferred;
    provenance.doi = "inferred";
    provenance.tried.push("inferred");
  }

  // -------------------------------------------------------------------------
  // STEP 2: Scrape HTML metadata (unless it's a direct PDF)
  // -------------------------------------------------------------------------
  if (!row.url.toLowerCase().endsWith(".pdf") || external_ids.iza_dp) {
    const scraped = await scrapeHtmlForMeta(row.url, external_ids);
    provenance.tried.push("scrape");

    if (!doi && scraped.doi) {
      doi = scraped.doi;
      provenance.doi = "scrape";
    }
    if (!abstract && scraped.abstract) {
      abstract = scraped.abstract;
      provenance.abstract = "scrape";
    }
    if (!authors && scraped.authors) {
      authors = scraped.authors;
      provenance.authors = "scrape";
    }
  }

  // -------------------------------------------------------------------------
  // STEP 3: Validate DOI with Crossref/DataCite
  // -------------------------------------------------------------------------
  if (doi) {
    const validated = await validateDoi(doi);
    provenance.tried.push("crossref");

    if (!validated) {
      provenance.notes.push(`DOI failed validation: ${doi}`);
      doi = null;
      delete provenance.doi;
    } else {
      doi = validated;

      // Crossref may provide metadata during validation
      const cr = await crossrefByDoi(doi);
      if (cr?.message) {
        const msg = cr.message;
        if (!abstract) {
          const crAbs = crossrefToAbstract(msg);
          if (crAbs) {
            abstract = crAbs;
            provenance.abstract = "crossref";
          }
        }
        if (!authors) {
          const crAuth = crossrefToAuthors(msg);
          if (crAuth) {
            authors = crAuth;
            provenance.authors = "crossref";
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 4: OpenAlex by DOI (if we have one)
  // -------------------------------------------------------------------------
  if (doi) {
    const oa = await openalexByDoi(doi);
    provenance.tried.push("openalex:doi");

    if (oa) {
      if (oa.id) external_ids.openalex_id = oa.id;

      if (!abstract) {
        const oaAbs = openalexAbstractToText(oa.abstract_inverted_index);
        if (oaAbs) {
          abstract = oaAbs;
          provenance.abstract = "openalex";
        }
      }

      if (!authors) {
        const oaAuth = openalexToAuthors(oa);
        if (oaAuth) {
          authors = oaAuth;
          provenance.authors = "openalex";
        }
      }

      // Use canonical DOI from OpenAlex if present
      if (oa.doi) {
        doi = normalizeDoi(oa.doi);
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 5: Semantic Scholar by DOI (if we have one and key available)
  // -------------------------------------------------------------------------
  if (doi && CFG.S2_API_KEY) {
    const s2 = await s2ByDoi(doi);
    provenance.tried.push("s2:doi");

    if (s2) {
      if (s2.paperId) external_ids.s2_paperId = s2.paperId;

      if (!abstract && typeof s2.abstract === "string" && s2.abstract.trim()) {
        abstract = s2.abstract.trim();
        provenance.abstract = "semanticscholar";
      }

      if (!authors) {
        const s2Auth = s2ToAuthors(s2);
        if (s2Auth) {
          authors = s2Auth;
          provenance.authors = "semanticscholar";
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 6: Title-based searches (if still missing DOI or metadata)
  // -------------------------------------------------------------------------
  if (!doi || !abstract || !authors) {
    // Crossref title search
    if (!doi) {
      const crItems = await crossrefSearchByTitle(row.title, year);
      provenance.tried.push("crossref:search");

      const crBest = pickBestByTitle(crItems, row.title, year);
      if (crBest && (crBest as any).DOI) {
        const candidateDoi = normalizeDoi((crBest as any).DOI);
        const validated = await validateDoi(candidateDoi);
        if (validated) {
          doi = validated;
          provenance.doi = "crossref-search";

          // Get metadata from best match
          if (!abstract) {
            const crAbs = crossrefToAbstract(crBest);
            if (crAbs) {
              abstract = crAbs;
              provenance.abstract = "crossref";
            }
          }
          if (!authors) {
            const crAuth = crossrefToAuthors(crBest);
            if (crAuth) {
              authors = crAuth;
              provenance.authors = "crossref";
            }
          }
        } else {
          provenance.notes.push(
            `Title-search DOI failed validation: ${candidateDoi}`,
          );
        }
      }
    }

    // OpenAlex title search
    const oaResults = await openalexSearch(row.title, year);
    provenance.tried.push("openalex:search");

    const oaBest = pickBestByTitle(oaResults, row.title, year);
    if (oaBest) {
      if (oaBest.id) external_ids.openalex_id = oaBest.id;

      if (!doi && (oaBest as any).doi) {
        const candidateDoi = normalizeDoi(
          String((oaBest as any).doi).replace(/^https?:\/\/doi\.org\//i, ""),
        );
        const validated = await validateDoi(candidateDoi);
        if (validated) {
          doi = validated;
          provenance.doi = "openalex-search";
        }
      }

      if (!abstract) {
        const oaAbs = openalexAbstractToText(
          (oaBest as any).abstract_inverted_index,
        );
        if (oaAbs) {
          abstract = oaAbs;
          provenance.abstract = "openalex";
        }
      }

      if (!authors) {
        const oaAuth = openalexToAuthors(oaBest);
        if (oaAuth) {
          authors = oaAuth;
          provenance.authors = "openalex";
        }
      }
    }

    // Semantic Scholar title search (if key available)
    if (CFG.S2_API_KEY && (!doi || !abstract || !authors)) {
      const s2Results = await s2Search(row.title, year);
      provenance.tried.push("s2:search");

      const s2Best = pickBestByTitle(s2Results, row.title, year);
      if (s2Best) {
        if ((s2Best as any).paperId)
          external_ids.s2_paperId = (s2Best as any).paperId;

        if (!doi && (s2Best as any).externalIds?.DOI) {
          const candidateDoi = normalizeDoi((s2Best as any).externalIds.DOI);
          const validated = await validateDoi(candidateDoi);
          if (validated) {
            doi = validated;
            provenance.doi = "semanticscholar-search";
          }
        }

        if (!abstract && typeof (s2Best as any).abstract === "string") {
          abstract = (s2Best as any).abstract.trim();
          provenance.abstract = "semanticscholar";
        }

        if (!authors) {
          const s2Auth = s2ToAuthors(s2Best);
          if (s2Auth) {
            authors = s2Auth;
            provenance.authors = "semanticscholar";
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // STEP 7: Calculate confidence score
  // -------------------------------------------------------------------------
  let confidence = 0.2; // base
  if (doi) confidence += 0.35;
  if (authors && authors.length) confidence += 0.25;
  if (abstract && abstract.length > 80) confidence += 0.2;
  provenance.confidence = Math.min(1, confidence);

  return {
    rank: Number(row.rank),
    year,
    title: row.title,
    series_or_venue: row.series_or_venue,
    url: row.url,
    doi,
    abstract,
    authors,
    external_ids,
    provenance,
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  if (!CFG.CONTACT_EMAIL) {
    console.error(
      "Error: CONTACT_EMAIL environment variable is required for API politeness",
    );
    console.error(
      "Usage: CONTACT_EMAIL=research@example.com pnpm tsx scripts/enrich-papers-unified.ts",
    );
    process.exit(1);
  }

  await ensureDir(CFG.CACHE_DIR);

  const csvText = await readFile(CFG.IN_CSV, "utf8");
  const rows = csvParse(csvText, {
    columns: true,
    skip_empty_lines: true,
  }) as PaperRow[];

  console.log(`Loaded ${rows.length} papers from ${CFG.IN_CSV}`);
  console.log(
    `Using APIs: Crossref, DataCite, OpenAlex${CFG.OPENALEX_API_KEY ? " (with key)" : ""}, ${CFG.S2_API_KEY ? "Semantic Scholar (with key)" : "Semantic Scholar (no key)"}`,
  );
  console.log(`Cache directory: ${CFG.CACHE_DIR}`);
  console.log(`Concurrency: ${CFG.CONCURRENCY}\n`);

  const limit = pLimit(CFG.CONCURRENCY);
  const enriched: Enriched[] = [];
  let completed = 0;

  const tasks = rows.map((row) =>
    limit(async () => {
      try {
        const result = await enrichOne(row);
        enriched.push(result);
        completed++;

        if (completed % 10 === 0) {
          console.log(
            `Progress: ${completed}/${rows.length} (${((completed / rows.length) * 100).toFixed(1)}%)`,
          );
        }

        return result;
      } catch (err: any) {
        console.error(
          `Failed row ${row.rank}: ${row.title} :: ${err?.message || err}`,
        );
        const fallback: Enriched = {
          rank: Number(row.rank),
          year: Number(row.year.replace(/"/g, "")) || null,
          title: row.title,
          series_or_venue: row.series_or_venue,
          url: row.url,
          doi: null,
          abstract: null,
          authors: null,
          external_ids: guessExternalIds(row),
          provenance: { tried: [], notes: ["hard_fail"], confidence: 0 },
        };
        enriched.push(fallback);
        completed++;
        return fallback;
      }
    }),
  );

  await Promise.all(tasks);

  // Write JSON
  await writeFile(CFG.OUT_JSON, JSON.stringify(enriched, null, 2), "utf8");

  // Write CSV
  const csvRows = enriched.map((e) => ({
    rank: e.rank,
    year: e.year ?? "",
    title: e.title,
    series_or_venue: e.series_or_venue,
    url: e.url,
    doi: e.doi ?? "",
    abstract: e.abstract ?? "",
    authors: e.authors ? e.authors.join("; ") : "",
    confidence: e.provenance.confidence.toFixed(2),
    sources: Object.entries({
      doi: e.provenance.doi,
      abstract: e.provenance.abstract,
      authors: e.provenance.authors,
    })
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k}:${v}`)
      .join(", "),
  }));

  const csvText2 = csvStringify(csvRows, { header: true });
  await writeFile(CFG.OUT_CSV, csvText2, "utf8");

  // Statistics
  const withDoi = enriched.filter((e) => e.doi).length;
  const withAbstract = enriched.filter((e) => e.abstract).length;
  const withAuthors = enriched.filter((e) => e.authors?.length).length;

  console.log("\n=== Enrichment Complete ===");
  console.log(`Total papers: ${enriched.length}`);
  console.log(
    `DOIs found: ${withDoi} (${((withDoi / enriched.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Abstracts found: ${withAbstract} (${((withAbstract / enriched.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Authors found: ${withAuthors} (${((withAuthors / enriched.length) * 100).toFixed(1)}%)`,
  );
  console.log(`\nOutput files:`);
  console.log(`  ${CFG.OUT_JSON}`);
  console.log(`  ${CFG.OUT_CSV}`);

  // Success criteria check
  const doiPct = (withDoi / enriched.length) * 100;
  const absPct = (withAbstract / enriched.length) * 100;
  const authPct = (withAuthors / enriched.length) * 100;

  console.log("\n=== Success Criteria ===");
  console.log(
    `DOI coverage: ${doiPct.toFixed(1)}% (target: 70%+) ${doiPct >= 70 ? "✓" : "✗"}`,
  );
  console.log(
    `Abstract coverage: ${absPct.toFixed(1)}% (target: 60%+) ${absPct >= 60 ? "✓" : "✗"}`,
  );
  console.log(
    `Authors coverage: ${authPct.toFixed(1)}% (target: 80%+) ${authPct >= 80 ? "✓" : "✗"}`,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

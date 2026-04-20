import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { upsertTherapyResearch } from "@/src/db";
import { sql as neonSql } from "@/src/db/neon";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const messageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const inputSchema = z.object({
  messages: z.array(messageSchema),
  jobId: z.string().optional(),
  userEmail: z.string().optional(),
  goalId: z.number().nullable().optional(),
  issueId: z.number().nullable().optional(),
  feedbackId: z.number().nullable().optional(),
  journalEntryId: z.number().nullable().optional(),
  hasRelatedMember: z.boolean().optional(),
  evalPromptContext: z.string().optional(),
});

const outputMessageSchema = z.object({
  type: z.string(),
  content: z.string(),
});

const outputSchema = z.object({
  messages: z.array(outputMessageSchema),
});

// ---------------------------------------------------------------------------
// Provider search helpers
// ---------------------------------------------------------------------------

type PaperResult = {
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  doi: string | null;
  url: string | null;
  citation_count: number | null;
};

function reconstructAbstract(
  index: Record<string, number[]> | null | undefined,
): string | null {
  if (!index) return null;
  const words: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) words.push([pos, word]);
  }
  if (words.length === 0) return null;
  return words.sort((a, b) => a[0] - b[0]).map(([, w]) => w).join(" ");
}

async function searchOpenAlex(query: string, limit: number): Promise<PaperResult[]> {
  const mailto = process.env.UNPAYWALL_EMAIL || "research@example.com";
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", String(Math.max(1, Math.min(limit, 50))));
  url.searchParams.set(
    "select",
    "id,title,authorships,publication_year,abstract_inverted_index,doi,primary_location,cited_by_count",
  );
  try {
    const resp = await fetch(url.toString(), {
      headers: { "User-Agent": `research-thera-mastra (mailto:${mailto})` },
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { results?: unknown[] };
    return (data.results || []).map((item) => {
      const it = item as Record<string, unknown>;
      const authorships = (it.authorships as Array<Record<string, unknown>>) || [];
      const authors = authorships
        .map((a) => {
          const author = a.author as Record<string, unknown> | undefined;
          return author?.display_name as string | undefined;
        })
        .filter((n): n is string => typeof n === "string");
      const doiRaw = (it.doi as string | null) || "";
      const doi = doiRaw.replace("https://doi.org/", "") || null;
      const abstract = reconstructAbstract(
        it.abstract_inverted_index as Record<string, number[]> | undefined,
      );
      const loc = (it.primary_location as Record<string, unknown>) || {};
      const u = (loc.landing_page_url as string) || null;
      const titleRaw = it.title;
      const title = Array.isArray(titleRaw)
        ? (titleRaw[0] as string) || "Untitled"
        : (titleRaw as string) || "Untitled";
      return {
        title,
        authors,
        year: (it.publication_year as number | null) ?? null,
        abstract,
        doi,
        url: u,
        citation_count: (it.cited_by_count as number | null) ?? null,
      };
    });
  } catch {
    return [];
  }
}

async function searchCrossref(query: string, limit: number): Promise<PaperResult[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query", query);
  url.searchParams.set("rows", String(Math.max(1, Math.min(limit, 50))));
  try {
    const resp = await fetch(url.toString());
    if (!resp.ok) return [];
    const data = (await resp.json()) as { message?: { items?: any[] } };
    const items = data.message?.items ?? [];
    return items.map((it) => {
      const title = Array.isArray(it.title) ? it.title[0] || "Untitled" : "Untitled";
      const authors = (it.author || [])
        .map((a: any) => [a.given, a.family].filter(Boolean).join(" "))
        .filter((n: string) => n);
      const year: number | null =
        it?.issued?.["date-parts"]?.[0]?.[0] ??
        it?.published?.["date-parts"]?.[0]?.[0] ??
        null;
      return {
        title,
        authors,
        year,
        abstract: (it.abstract as string | null) ?? null,
        doi: (it.DOI as string | null) ?? null,
        url: (it.URL as string | null) ?? null,
        citation_count: (it["is-referenced-by-count"] as number | null) ?? null,
      };
    });
  } catch {
    return [];
  }
}

async function searchSemanticScholar(query: string, limit: number): Promise<PaperResult[]> {
  const headers: Record<string, string> = {};
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (key) headers["x-api-key"] = key;
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 50))));
  url.searchParams.set(
    "fields",
    "title,authors,year,abstract,externalIds,citationCount,openAccessPdf",
  );
  try {
    const resp = await fetch(url.toString(), { headers });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { data?: any[] };
    return (data.data ?? []).map((p: any) => ({
      title: p.title || "Untitled",
      authors: (p.authors || []).map((a: any) => a.name).filter(Boolean),
      year: p.year ?? null,
      abstract: p.abstract ?? null,
      doi: p.externalIds?.DOI ?? null,
      url: p.openAccessPdf?.url ?? (p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : null),
      citation_count: p.citationCount ?? null,
    }));
  } catch {
    return [];
  }
}

async function searchArxiv(query: string, limit: number): Promise<PaperResult[]> {
  try {
    const url = new URL("http://export.arxiv.org/api/query");
    url.searchParams.set("search_query", `all:${query}`);
    url.searchParams.set("start", "0");
    url.searchParams.set("max_results", String(Math.max(1, Math.min(limit, 50))));
    const resp = await fetch(url.toString());
    if (!resp.ok) return [];
    const xml = await resp.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
    return entries.map((m) => {
      const body = m[1];
      const title = body.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, " ").trim() || "Untitled";
      const abstract = body.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, " ").trim() || null;
      const year = body.match(/<published>(\d{4})/)?.[1];
      const id = body.match(/<id>([^<]+)<\/id>/)?.[1]?.trim() || null;
      const doi = body.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/)?.[1]?.trim() || null;
      const authors = [...body.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)].map((a) => a[1].trim());
      return {
        title,
        authors,
        year: year ? parseInt(year, 10) : null,
        abstract,
        doi,
        url: id,
        citation_count: null,
      };
    });
  } catch {
    return [];
  }
}

async function searchCore(query: string, limit: number): Promise<PaperResult[]> {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) return [];
  try {
    const url = new URL("https://api.core.ac.uk/v3/search/works");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 50))));
    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { results?: any[] };
    return (data.results ?? []).map((w: any) => ({
      title: w.title || "Untitled",
      authors: (w.authors || []).map((a: any) => a?.name).filter(Boolean),
      year: w.yearPublished ?? null,
      abstract: w.abstract ?? null,
      doi: typeof w.doi === "string" ? w.doi.replace(/^https?:\/\/doi\.org\//, "") : null,
      url:
        w.downloadUrl ||
        w.sourceFulltextUrls?.[0] ||
        (w.doi ? `https://doi.org/${w.doi}` : null),
      citation_count: null,
    }));
  } catch {
    return [];
  }
}

async function searchZenodo(query: string, limit: number): Promise<PaperResult[]> {
  try {
    const url = new URL("https://zenodo.org/api/records");
    url.searchParams.set("q", query);
    url.searchParams.set("size", String(Math.max(1, Math.min(limit, 50))));
    const token = process.env.ZENODO_ACCESS_TOKEN || process.env.ZENODO_TOKEN;
    const resp = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as { hits?: { hits?: any[] } };
    return (data.hits?.hits ?? []).map((rec: any) => {
      const meta = rec.metadata || {};
      const description = (meta.description || "").replace(/<[^>]+>/g, "").trim();
      const doi = meta.doi || rec.doi || null;
      const year = meta.publication_date
        ? parseInt(String(meta.publication_date).slice(0, 4), 10)
        : null;
      return {
        title: meta.title || "Untitled",
        authors: (meta.creators || []).map((c: any) => c?.name).filter(Boolean),
        year: Number.isFinite(year) ? year : null,
        abstract: description || null,
        doi,
        url: rec.links?.html || (doi ? `https://doi.org/${doi}` : null),
        citation_count: null,
      };
    });
  } catch {
    return [];
  }
}

function dedupePapers(papers: PaperResult[]): PaperResult[] {
  const seen = new Set<string>();
  const out: PaperResult[] = [];
  for (const p of papers) {
    const doiKey = p.doi ? `doi:${p.doi.toLowerCase()}` : "";
    const titleKey = `t:${(p.title || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120)}`;
    const key = doiKey || titleKey;
    if (!key || seen.has(key)) continue;
    if (doiKey) seen.add(doiKey);
    seen.add(titleKey);
    out.push(p);
  }
  return out;
}

async function getS2PaperDetail(paperId: string): Promise<Record<string, unknown> | null> {
  const headers: Record<string, string> = {};
  const key = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (key) headers["x-api-key"] = key;
  const url = new URL(
    `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(paperId)}`,
  );
  url.searchParams.set(
    "fields",
    "title,authors,year,abstract,tldr,externalIds,citationCount,fieldsOfStudy,venue,openAccessPdf",
  );
  try {
    const resp = await fetch(url.toString(), { headers });
    if (resp.status !== 200) return null;
    return (await resp.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DeepSeek JSON helper
// ---------------------------------------------------------------------------

async function deepseekJson<T>(prompt: string, systemPrompt?: string): Promise<T | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt || "Respond with valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        stream: false,
      }),
    });
    if (!resp.ok) return null;
    const body = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pipeline phases
// ---------------------------------------------------------------------------

async function phasePlanQueries(userPrompt: string): Promise<string[]> {
  const planPrompt = [
    `You are planning academic search queries for a clinical research task.`,
    ``,
    `## Clinical context`,
    userPrompt.slice(0, 2000),
    ``,
    `Return JSON: {"queries": ["q1", "q2", "q3"]}`,
    `- Each query should be in English (translate if the context is in another language).`,
    `- Queries should be complementary: one on the core condition, one on specific interventions/techniques, one on outcome measures or family/relational aspects.`,
    `- Each query must be concise (5-12 words) and use clinical terminology.`,
  ].join("\n");

  const parsed = await deepseekJson<{ queries?: unknown }>(planPrompt);
  const q = Array.isArray(parsed?.queries) ? parsed!.queries : [];
  const queries = q.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 3);
  if (queries.length === 0) {
    return [userPrompt.slice(0, 100), "evidence-based psychotherapy", "therapeutic interventions outcomes"];
  }
  while (queries.length < 3) {
    queries.push(queries[queries.length - 1]);
  }
  return queries;
}

async function phaseSearchAll(queries: string[]): Promise<PaperResult[]> {
  const perProvider = 10;
  const tasks: Array<Promise<PaperResult[]>> = [];
  for (const q of queries) {
    tasks.push(searchOpenAlex(q, perProvider));
    tasks.push(searchCrossref(q, perProvider));
    tasks.push(searchSemanticScholar(q, perProvider));
    tasks.push(searchArxiv(q, perProvider));
    tasks.push(searchCore(q, perProvider));
    tasks.push(searchZenodo(q, perProvider));
  }
  const results = await Promise.allSettled(tasks);
  const pool = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const filtered = pool.filter((p) => {
    const a = (p.abstract || "").trim().toLowerCase();
    return a.length >= 50 && a !== "none" && a !== "..." && a !== "n/a" && a !== "no abstract available";
  });
  return dedupePapers(filtered);
}

type CuratedPaper = PaperResult & {
  key_findings: string[];
  therapeutic_techniques: string[];
  evidence_level: string | null;
  relevance_score: number;
};

const EVIDENCE_PATTERNS: Array<{ pattern: RegExp; level: string; weight: number }> = [
  { pattern: /\bmeta-?analys(is|es)\b/i, level: "meta-analysis", weight: 1.0 },
  { pattern: /\bsystematic\s+review\b/i, level: "systematic_review", weight: 0.9 },
  { pattern: /\brandomi[sz]ed\s+controlled\s+trial|\brct\b/i, level: "rct", weight: 0.8 },
  { pattern: /\bcohort\s+stud(y|ies)\b/i, level: "cohort", weight: 0.6 },
  { pattern: /\bcase[\s-]control\b/i, level: "case_control", weight: 0.5 },
  { pattern: /\bcase\s+series\b/i, level: "case_series", weight: 0.35 },
  { pattern: /\bcase\s+(study|report)\b/i, level: "case_study", weight: 0.3 },
];

function detectEvidenceLevel(text: string): { level: string | null; weight: number } {
  for (const { pattern, level, weight } of EVIDENCE_PATTERNS) {
    if (pattern.test(text)) return { level, weight };
  }
  return { level: null, weight: 0.3 };
}

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z][a-z0-9-]+/g) ?? []).filter((t) => t.length >= 3);
}

const STOP_WORDS = new Set([
  "the","and","for","with","this","that","from","into","have","has","been","are","was","were","but","not","will","can","may","its","about","their","which","who","whom","whose","what","when","where","how","than","then","also","such","some","any","all","one","two","three","more","most","other","more","only","very","much","many","few","found","research","paper","study","studies","using","used","new","data","we","our","us","they","them","it","is","an","of","in","to","a","on","as","by","be","or","if","at","so","no","yes",
]);

function scoreAgainstQuery(text: string, queryTerms: Set<string>): number {
  if (queryTerms.size === 0) return 0;
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  let hits = 0;
  for (const t of tokens) {
    if (queryTerms.has(t)) hits += 1;
  }
  return hits / Math.sqrt(tokens.length);
}

async function phaseRankAndExtract(
  userPrompt: string,
  pool: PaperResult[],
): Promise<CuratedPaper[]> {
  if (pool.length === 0) return [];

  // Deterministic reranking — no LLM call.
  const queryTerms = new Set(tokenize(userPrompt).filter((t) => !STOP_WORDS.has(t)));
  const currentYear = new Date().getFullYear();

  const scored = pool.map((p, origIdx) => {
    const blob = `${p.title ?? ""} ${p.abstract ?? ""}`;
    const textScore = scoreAgainstQuery(blob, queryTerms);
    const { level, weight: evWeight } = detectEvidenceLevel(blob);
    const yearBoost = p.year ? Math.max(0, 1 - (currentYear - p.year) / 20) : 0.3;
    const score = textScore * 0.55 + evWeight * 0.35 + yearBoost * 0.1;
    return { paper: p, score, evidence_level: level, origIdx };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 10);

  // Single compact DeepSeek call to extract key_findings + therapeutic_techniques
  // for the 10 already-selected papers. Much smaller payload than full rerank.
  const listed = top
    .map((s, i) => {
      const abs = (s.paper.abstract || "").slice(0, 240);
      return `[${i}] ${s.paper.title}\n  ${abs}`;
    })
    .join("\n\n");

  const extractPrompt = [
    `Extract clinical metadata for each paper below.`,
    ``,
    listed,
    ``,
    `Return JSON: {"items": [{"index": <int>, "key_findings": [string, 2 items], "therapeutic_techniques": [string, 2 items]}]} — one entry per paper.`,
  ].join("\n");

  type ExtractItem = { index?: number; key_findings?: unknown; therapeutic_techniques?: unknown };
  const parsed = await deepseekJson<{ items?: ExtractItem[] }>(extractPrompt);
  const items = Array.isArray(parsed?.items) ? parsed!.items! : [];
  const byIndex = new Map<number, ExtractItem>();
  for (const it of items) {
    if (typeof it.index === "number") byIndex.set(it.index, it);
  }

  const maxScore = top[0]?.score || 1;
  const out: CuratedPaper[] = top.map((s, i) => {
    const it = byIndex.get(i);
    const kf = Array.isArray(it?.key_findings)
      ? (it!.key_findings as unknown[])
          .filter((x): x is string => typeof x === "string")
          .slice(0, 5)
      : [];
    const tt = Array.isArray(it?.therapeutic_techniques)
      ? (it!.therapeutic_techniques as unknown[])
          .filter((x): x is string => typeof x === "string")
          .slice(0, 5)
      : [];
    return {
      ...s.paper,
      key_findings: kf,
      therapeutic_techniques: tt,
      evidence_level: s.evidence_level,
      relevance_score: Math.min(1, s.score / Math.max(maxScore, 0.001)),
    };
  });

  return out;
}

async function phaseSave(
  papers: CuratedPaper[],
  userEmail: string,
  ids: {
    goalId?: number | null;
    issueId?: number | null;
    feedbackId?: number | null;
    journalEntryId?: number | null;
  },
): Promise<{ saved: number; skipped: number; failed: number }> {
  let saved = 0;
  let skipped = 0;
  let failed = 0;
  for (const paper of papers) {
    const abstract = (paper.abstract || "").trim();
    const lowered = abstract.toLowerCase();
    if (
      !abstract ||
      lowered === "none" ||
      lowered === "..." ||
      lowered === "n/a" ||
      lowered === "no abstract available" ||
      abstract.length < 50
    ) {
      skipped += 1;
      continue;
    }
    try {
      await upsertTherapyResearch(ids.goalId ?? null, userEmail, {
        feedbackId: ids.feedbackId ?? null,
        issueId: ids.issueId ?? null,
        journalEntryId: ids.journalEntryId ?? null,
        therapeuticGoalType: "",
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        doi: paper.doi,
        url: paper.url,
        abstract,
        keyFindings: paper.key_findings,
        therapeuticTechniques: paper.therapeutic_techniques,
        evidenceLevel: paper.evidence_level,
        relevanceScore: paper.relevance_score,
        extractedBy: "mastra:deepseek-chat:pipeline-v1",
        extractionConfidence: 0.85,
      });
      saved += 1;
    } catch (exc) {
      failed += 1;
      const msg = exc instanceof Error ? exc.message : String(exc);
      console.error("[research.save] Error saving paper:", msg);
    }
  }
  return { saved, skipped, failed };
}

// ---------------------------------------------------------------------------
// Eval + job-status helpers
// ---------------------------------------------------------------------------

const EVIDENCE_WEIGHTS: Record<string, number> = {
  "meta-analysis": 1.0,
  meta_analysis: 1.0,
  systematic_review: 0.9,
  "systematic-review": 0.9,
  rct: 0.8,
  cohort: 0.6,
  case_control: 0.5,
  "case-control": 0.5,
  case_series: 0.35,
  "case-series": 0.35,
  case_study: 0.2,
  "case-study": 0.2,
  expert_opinion: 0.1,
};

function parseJsonField(value: unknown): string[] {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type EvalScores = {
  relevance: number;
  actionability: number;
  evidenceQuality: number;
  overall: number;
  rationale: string;
  paperCount: number;
  familyDynamicsCoverage?: number;
  error?: string;
};

function clamp01(v: unknown): number {
  const n = typeof v === "number" ? v : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function runResearchEvals(
  ids: {
    goalId?: number | null;
    issueId?: number | null;
    feedbackId?: number | null;
    journalEntryId?: number | null;
  },
  promptContext: string,
  hasRelatedMember: boolean,
): Promise<EvalScores> {
  const rows = ids.journalEntryId
    ? await neonSql`SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level FROM therapy_research WHERE journal_entry_id = ${ids.journalEntryId} ORDER BY relevance_score DESC LIMIT 10`
    : ids.issueId
      ? await neonSql`SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level FROM therapy_research WHERE issue_id = ${ids.issueId} ORDER BY relevance_score DESC LIMIT 10`
      : ids.feedbackId
        ? await neonSql`SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level FROM therapy_research WHERE feedback_id = ${ids.feedbackId} ORDER BY relevance_score DESC LIMIT 10`
        : ids.goalId
          ? await neonSql`SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level FROM therapy_research WHERE goal_id = ${ids.goalId} ORDER BY relevance_score DESC LIMIT 10`
          : [];

  if (!rows.length) {
    return {
      relevance: 0,
      actionability: 0,
      evidenceQuality: 0,
      overall: 0,
      rationale: "no papers found",
      paperCount: 0,
      error: "no papers found",
    };
  }

  const evidenceQuality =
    rows.reduce(
      (sum, r) => sum + (EVIDENCE_WEIGHTS[r.evidence_level as string] ?? 0.3),
      0,
    ) / rows.length;

  const papersText = rows
    .map((r, i) => {
      const kf = parseJsonField(r.key_findings).slice(0, 3).join("; ");
      const tt = parseJsonField(r.therapeutic_techniques).slice(0, 3).join("; ");
      const abstract = ((r.abstract as string) || "").slice(0, 200);
      return `[${i + 1}] ${r.title}\nAbstract: ${abstract}\nKey findings: ${kf}\nTechniques: ${tt}`;
    })
    .join("\n\n");

  const evalPrompt = [
    `You are evaluating research papers curated for a therapy case.`,
    ``,
    `## Clinical Context`,
    promptContext.slice(0, 800),
    ``,
    `## Papers Found (${rows.length})`,
    papersText,
    ``,
    `Return JSON: {"relevance": 0-1, "actionability": 0-1, "familyDynamicsCoverage": 0-1, "rationale": "..."}`,
    `- relevance: how well papers match the clinical topic`,
    `- actionability: how actionable the techniques are for a practicing therapist`,
    hasRelatedMember
      ? `- familyDynamicsCoverage: how well papers address family and relational dynamics (important: a related family member is involved)`
      : `- familyDynamicsCoverage: set to 0 since no related family member is involved`,
    `- rationale: brief 2-3 sentence summary`,
  ].join("\n");

  const parsed = await deepseekJson<{
    relevance?: number;
    actionability?: number;
    familyDynamicsCoverage?: number;
    rationale?: string;
  }>(evalPrompt);

  const relevance = clamp01(parsed?.relevance);
  const actionability = clamp01(parsed?.actionability);
  const familyDynamicsCoverage = clamp01(parsed?.familyDynamicsCoverage);
  const rationale = parsed?.rationale ?? "";

  const components = [relevance, actionability, evidenceQuality];
  if (hasRelatedMember) components.push(familyDynamicsCoverage);
  const overall = components.reduce((a, b) => a + b, 0) / components.length;

  const out: EvalScores = {
    relevance: round2(relevance),
    actionability: round2(actionability),
    evidenceQuality: round2(evidenceQuality),
    overall: round2(overall),
    rationale,
    paperCount: rows.length,
  };
  if (hasRelatedMember) out.familyDynamicsCoverage = round2(familyDynamicsCoverage);
  return out;
}

async function updateJobSucceeded(
  jobId: string,
  payload: { count: number; output: string; evals?: EvalScores },
) {
  const result = JSON.stringify(payload);
  await neonSql`UPDATE generation_jobs SET status = 'SUCCEEDED', progress = 100, result = ${result}, updated_at = NOW() WHERE id = ${jobId}`;
}

async function updateJobFailed(
  jobId: string,
  error: { message: string; code?: string; details?: string },
) {
  const errJson = JSON.stringify(error);
  await neonSql`UPDATE generation_jobs SET status = 'FAILED', error = ${errJson}, updated_at = NOW() WHERE id = ${jobId}`;
}

async function updateJobProgress(jobId: string, progress: number) {
  try {
    await neonSql`UPDATE generation_jobs SET progress = ${progress}, updated_at = NOW() WHERE id = ${jobId}`;
  } catch {
    // progress updates are best-effort
  }
}

// ---------------------------------------------------------------------------
// Workflow step
// ---------------------------------------------------------------------------

const runPipeline = createStep({
  id: "run_pipeline",
  inputSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    const msgs = inputData.messages;
    const userMsg = [...msgs].reverse().find((m) => m.role === "user");
    const jobId = inputData.jobId;
    const trackJob = typeof jobId === "string" && jobId.length > 0;

    if (!userMsg) {
      const content = "Error: no user message in input";
      if (trackJob) {
        await updateJobFailed(jobId!, { message: content, code: "NO_USER_MESSAGE" });
      }
      return { messages: [{ type: "ai", content }] };
    }

    const userEmail =
      inputData.userEmail ||
      process.env.MASTRA_RESEARCH_USER_EMAIL ||
      "system";
    const ids = {
      goalId: inputData.goalId ?? null,
      issueId: inputData.issueId ?? null,
      feedbackId: inputData.feedbackId ?? null,
      journalEntryId: inputData.journalEntryId ?? null,
    };

    try {
      // Phase 1: plan queries
      const t0 = Date.now();
      const queries = await phasePlanQueries(userMsg.content);
      console.log(`[research.workflow] phase=plan_queries queries=${JSON.stringify(queries)} elapsed=${Date.now() - t0}ms`);
      if (trackJob) await updateJobProgress(jobId!, 20);

      // Phase 2: search all
      const t1 = Date.now();
      const pool = await phaseSearchAll(queries);
      console.log(`[research.workflow] phase=search_all pool=${pool.length} elapsed=${Date.now() - t1}ms`);
      if (trackJob) await updateJobProgress(jobId!, 50);

      // Phase 3: rank + extract
      const t2 = Date.now();
      const curated = await phaseRankAndExtract(userMsg.content, pool);
      console.log(`[research.workflow] phase=rank_and_extract curated=${curated.length} elapsed=${Date.now() - t2}ms`);
      if (trackJob) await updateJobProgress(jobId!, 75);

      // Phase 4: save
      const t3 = Date.now();
      const saveStats = await phaseSave(curated, userEmail, ids);
      console.log(`[research.workflow] phase=save saved=${saveStats.saved} skipped=${saveStats.skipped} failed=${saveStats.failed} elapsed=${Date.now() - t3}ms`);
      if (trackJob) await updateJobProgress(jobId!, 90);

      const summary = `Curated ${saveStats.saved} papers from ${pool.length} candidates (${saveStats.skipped} skipped, ${saveStats.failed} failed).`;

      if (trackJob) {
        if (saveStats.saved === 0) {
          await updateJobFailed(jobId!, {
            message:
              "Research pipeline completed but no papers could be saved. Try rephrasing or try again later.",
            code: "NO_PAPERS_SAVED",
          });
        } else {
          // Mark SUCCEEDED immediately so the UI can unblock; evals are best-effort.
          await updateJobSucceeded(jobId!, {
            count: saveStats.saved,
            output: summary,
          });
          const t4 = Date.now();
          runResearchEvals(
            ids,
            inputData.evalPromptContext ?? userMsg.content,
            inputData.hasRelatedMember ?? false,
          )
            .then(async (evals) => {
              console.log(`[research.workflow] phase=eval elapsed=${Date.now() - t4}ms`);
              try {
                await updateJobSucceeded(jobId!, {
                  count: saveStats.saved,
                  output: summary,
                  evals,
                });
              } catch (updErr) {
                console.error("[research.workflow] eval result write failed:", updErr);
              }
            })
            .catch((evalErr) => {
              console.error("[research.workflow] eval error:", evalErr);
            });
        }
      }

      return { messages: [{ type: "ai", content: summary }] };
    } catch (exc) {
      const m = exc instanceof Error ? exc.message : String(exc);
      console.error("[research.workflow] pipeline failed:", m);
      if (trackJob) {
        await updateJobFailed(jobId!, { message: m, code: "PIPELINE_FAILED" });
      }
      return {
        messages: [{ type: "ai", content: `Research pipeline error: ${m}` }],
      };
    }
  },
});

export const researchWorkflow = createWorkflow({
  id: "research",
  inputSchema,
  outputSchema,
})
  .then(runPipeline)
  .commit();

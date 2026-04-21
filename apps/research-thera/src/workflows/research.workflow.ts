import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  searchOpenAlex as pkgSearchOpenAlex,
  searchCrossref as pkgSearchCrossref,
  searchSemanticScholar as pkgSearchSemanticScholar,
  searchArxiv as pkgSearchArxiv,
  searchPubMed as pkgSearchPubMed,
  searchEuropePmc as pkgSearchEuropePmc,
  searchDataCite as pkgSearchDataCite,
  searchCore as pkgSearchCore,
  searchZenodo as pkgSearchZenodo,
  dedupeCandidates,
  type PaperCandidate,
} from "@ai-apps/research";
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
  plannedQueries: z.array(z.string()).optional(),
});

const outputMessageSchema = z.object({
  type: z.string(),
  content: z.string(),
});

const outputSchema = z.object({
  messages: z.array(outputMessageSchema),
});

// ---------------------------------------------------------------------------
// Provider search helpers — thin adapters over @ai-apps/research
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

function candidateToPaperResult(c: PaperCandidate): PaperResult {
  return {
    title: c.title || "Untitled",
    authors: c.authors ?? [],
    year: typeof c.year === "number" ? c.year : null,
    abstract: c.abstract ?? null,
    doi: c.doi ?? null,
    url: c.url ?? (c.doi ? `https://doi.org/${c.doi}` : null),
    citation_count: typeof c.citationCount === "number" ? c.citationCount : null,
  };
}

async function runProvider(
  name: string,
  fn: (q: string, limit: number) => Promise<PaperCandidate[]>,
  query: string,
  limit: number,
): Promise<PaperResult[]> {
  try {
    const rows = await fn(query, limit);
    return rows.map(candidateToPaperResult);
  } catch (err) {
    console.warn(`[research.search] ${name} failed: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

const PROVIDERS: Array<{
  name: string;
  fn: (q: string, limit: number) => Promise<PaperCandidate[]>;
}> = [
  { name: "openalex", fn: pkgSearchOpenAlex },
  { name: "crossref", fn: pkgSearchCrossref },
  { name: "semanticscholar", fn: pkgSearchSemanticScholar },
  { name: "arxiv", fn: pkgSearchArxiv },
  { name: "pubmed", fn: pkgSearchPubMed },
  { name: "europepmc", fn: pkgSearchEuropePmc },
  { name: "datacite", fn: pkgSearchDataCite },
  { name: "core", fn: pkgSearchCore },
  { name: "zenodo", fn: pkgSearchZenodo },
];

// ---------------------------------------------------------------------------
// DeepSeek JSON helper
// ---------------------------------------------------------------------------

async function deepseekJson<T>(
  prompt: string,
  systemPrompt?: string,
  timeoutMs = 20000,
): Promise<T | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn("[deepseekJson] DEEPSEEK_API_KEY not set");
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
      signal: controller.signal,
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      console.warn(`[deepseekJson] HTTP ${resp.status}: ${errBody.slice(0, 200)}`);
      return null;
    }
    const body = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(content) as T;
    } catch (parseErr) {
      console.warn(`[deepseekJson] JSON parse failed: ${content.slice(0, 200)}`);
      return null;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[deepseekJson] fetch error: ${msg}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Pipeline phases
// ---------------------------------------------------------------------------

function extractKeyPhrase(userPrompt: string): string {
  // Look for Title:, Content:, or description lines
  const lines = userPrompt.split("\n").map((l) => l.trim()).filter(Boolean);
  const titleLine = lines.find((l) => /^(Title|Content|Description):/i.test(l));
  if (titleLine) {
    return titleLine.replace(/^[^:]+:\s*/, "").slice(0, 140);
  }
  const prose = lines.find((l) => l.length > 20 && !/^[#*\-•]/.test(l) && !/_id:/.test(l));
  return (prose ?? userPrompt).slice(0, 140);
}

function extractAgeContext(userPrompt: string): string {
  // Pull "age X" from the Person/Patient/Primary person/Also involves lines so
  // search queries produce age-appropriate results.
  const lines = userPrompt.split("\n").map((l) => l.trim()).filter(Boolean);
  const memberLine = lines.find((l) => /^(Person|Patient|Primary person|Also involves):/i.test(l));
  if (!memberLine) return "";
  const ageMatch = memberLine.match(/age\s+(\d+)/i);
  if (!ageMatch) return "";
  const age = parseInt(ageMatch[1], 10);
  if (!Number.isFinite(age) || age < 0 || age > 120) return "";
  if (age < 3) return "infant";
  if (age < 6) return "preschool children";
  if (age < 13) return `children age ${age}`;
  if (age < 18) return `adolescents age ${age}`;
  if (age < 25) return "young adults";
  if (age < 65) return "adults";
  return "older adults";
}

function deterministicPlanQueries(userPrompt: string): string[] {
  const core = extractKeyPhrase(userPrompt).trim();
  const ageCtx = extractAgeContext(userPrompt);

  if (!core) {
    return ["evidence-based psychotherapy", "therapeutic interventions outcomes", "clinical therapy"];
  }

  const withAge = ageCtx ? `${ageCtx} ${core}` : core;
  const queries: string[] = [withAge.slice(0, 200)];
  queries.push(`${withAge} intervention therapy`.slice(0, 200));
  queries.push(`${withAge} outcomes evidence-based`.slice(0, 200));
  return queries;
}

function phasePlanQueries(userPrompt: string, plannedQueries?: string[]): string[] {
  if (plannedQueries && plannedQueries.length >= 3) {
    const cleaned = plannedQueries
      .slice(0, 3)
      .map((q) => (typeof q === "string" ? q.trim() : ""))
      .filter((q) => q.length > 0)
      .map((q) => q.slice(0, 200));
    if (cleaned.length === 3) {
      console.log(`[research.workflow] planner=resolver-llm queries=${JSON.stringify(cleaned)}`);
      return cleaned;
    }
  }
  const fallback = deterministicPlanQueries(userPrompt);
  console.log(`[research.workflow] planner=fallback queries=${JSON.stringify(fallback)}`);
  return fallback;
}


async function phaseSearchAll(queries: string[]): Promise<PaperResult[]> {
  const perProvider = 10;
  // Cap to 2 queries × 4 highest-yield providers = 8 subrequests max.
  // Stays well under CF's 50/invocation subrequest budget to leave room for save.
  const usedQueries = queries.slice(0, 2);
  const tasks: Array<Promise<PaperResult[]>> = [];
  for (const q of usedQueries) {
    tasks.push(searchOpenAlex(q, perProvider));
    tasks.push(searchCrossref(q, perProvider));
    tasks.push(searchSemanticScholar(q, perProvider));
    tasks.push(searchArxiv(q, perProvider));
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

  const maxScore = top[0]?.score || 1;
  const out: CuratedPaper[] = top.map((s) => ({
    ...s.paper,
    key_findings: [],
    therapeutic_techniques: [],
    evidence_level: s.evidence_level,
    relevance_score: Math.min(1, s.score / Math.max(maxScore, 0.001)),
  }));

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
      // Phase 1: plan queries (resolver-provided LLM queries, or deterministic fallback)
      const t0 = Date.now();
      const queries = phasePlanQueries(userMsg.content, inputData.plannedQueries);
      console.log(`[research.workflow] phase=plan_queries queries=${JSON.stringify(queries)} elapsed=${Date.now() - t0}ms`);

      // Phase 2: search all
      const t1 = Date.now();
      const pool = await phaseSearchAll(queries);
      console.log(`[research.workflow] phase=search_all pool=${pool.length} elapsed=${Date.now() - t1}ms`);

      // Phase 3: rank (deterministic, no LLM)
      const t2 = Date.now();
      const curated = await phaseRankAndExtract(userMsg.content, pool);
      console.log(`[research.workflow] phase=rank curated=${curated.length} elapsed=${Date.now() - t2}ms`);

      // Phase 4: save. Every subrequest counts toward CF's 50/1000 limit, so we
      // avoid intermediate progress updates here.
      const t4 = Date.now();
      const saveStats = await phaseSave(curated, userEmail, ids);
      console.log(`[research.workflow] phase=save saved=${saveStats.saved} skipped=${saveStats.skipped} failed=${saveStats.failed} elapsed=${Date.now() - t4}ms`);

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

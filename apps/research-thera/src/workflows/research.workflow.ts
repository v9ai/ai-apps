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

const RESEARCH_PREAMBLE = `You are a clinical research specialist for a therapeutic platform supporting children and families.
You have access to academic paper search via search_papers and get_paper_detail.
The search tool fans out across 6 providers in parallel — OpenAlex, Crossref, Semantic Scholar, arXiv, CORE, and Zenodo — deduplicates by DOI/title, and reranks by semantic relevance.

CRITICAL WORKFLOW — follow this exact order:
1. Run exactly 3 search_papers calls with different query terms; set limit=10 on each call
2. Call get_paper_detail on at most 2 papers for full abstracts
3. Select the TOP 10 most relevant papers — quality over quantity
4. IMMEDIATELY call save_research_papers with the curated papers JSON — do this BEFORE writing any summary
5. After save_research_papers succeeds, write a brief summary (under 500 words)

IMPORTANT RULES:
- You MUST call save_research_papers. Do NOT skip this step or just describe what you would save.
- Do NOT write a long narrative before calling save_research_papers — the tool call must come first.
- The goal_id, feedback_id, issue_id, or journal_entry_id will be provided in the user message — include whichever is given in the save_research_papers call.
- Weight evidence level: meta-analysis > systematic review > RCT > cohort > case study
- Extract concrete therapeutic techniques from each paper
- Identify outcome measures and their effect sizes when available
- Report confidence honestly — say 'insufficient evidence' if the literature is sparse

Evidence levels:
- meta-analysis: pooled analysis of multiple studies
- systematic_review: structured review of literature
- rct: randomized controlled trial
- cohort: prospective observational study
- case_control: retrospective comparison
- case_series: multiple case reports
- case_study: single case report
- expert_opinion: clinical consensus without empirical data`;

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
    const url = (loc.landing_page_url as string) || null;
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
      url,
      citation_count: (it.cited_by_count as number | null) ?? null,
    };
  });
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

async function deepseekRerank(
  query: string,
  papers: PaperResult[],
  topK: number,
): Promise<PaperResult[]> {
  if (papers.length <= topK) return papers;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return papers.slice(0, topK);

  const listed = papers
    .map((p, i) => {
      const abs = (p.abstract || "").slice(0, 300);
      return `[${i}] ${p.title} (${p.year ?? "n.d."})\n${abs}`;
    })
    .join("\n\n");

  const prompt = `Rank these academic papers by relevance to the query: "${query}"\n\nReturn JSON of the form {"rankedIds": [<integer indices>]} with exactly ${topK} indices, best first.\n\nPapers:\n${listed}`;

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
          { role: "system", content: "Respond with valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        stream: false,
      }),
    });
    if (!resp.ok) return papers.slice(0, topK);
    const body = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { rankedIds?: unknown };
    const ids = Array.isArray(parsed.rankedIds) ? parsed.rankedIds : [];
    const seen = new Set<number>();
    const out: PaperResult[] = [];
    for (const raw of ids) {
      const idx = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(idx) || idx < 0 || idx >= papers.length) continue;
      if (seen.has(idx)) continue;
      seen.add(idx);
      out.push(papers[idx]);
      if (out.length === topK) break;
    }
    if (out.length === 0) return papers.slice(0, topK);
    return out;
  } catch {
    return papers.slice(0, topK);
  }
}

function formatSearchResults(query: string, papers: PaperResult[]): string {
  if (papers.length === 0) return `No results found for query: ${query}`;
  const lines = [`Search results for: ${query} (reranked by semantic relevance)`, ""];
  papers.forEach((p, i) => {
    const authors = p.authors.join(", ");
    const abstract = (p.abstract || "").slice(0, 150);
    lines.push(
      `[${i + 1}] ${p.title} (${p.year ?? "n.d."})\n  Authors: ${authors}\n  Abstract: ${abstract}...\n  DOI: ${p.doi || ""}\n`,
    );
  });
  return lines.join("\n");
}

async function toolSearchPapers(args: { query: string; limit?: number }): Promise<string> {
  const limit = args.limit ?? 10;
  const perProvider = Math.max(5, limit * 2);
  const results = await Promise.allSettled([
    searchOpenAlex(args.query, perProvider),
    searchCrossref(args.query, perProvider),
    searchSemanticScholar(args.query, perProvider),
    searchArxiv(args.query, perProvider),
    searchCore(args.query, perProvider),
    searchZenodo(args.query, perProvider),
  ]);
  const pool = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const deduped = dedupePapers(pool);
  if (deduped.length === 0) return `No results found for query: ${args.query}`;
  const ranked = await deepseekRerank(args.query, deduped, limit);
  return formatSearchResults(args.query, ranked);
}

async function toolGetPaperDetail(args: { doi_or_title: string }): Promise<string> {
  const id = args.doi_or_title;
  if (id.startsWith("10.")) {
    const detail = await getS2PaperDetail(`DOI:${id}`);
    if (detail) {
      const authors = (detail.authors as Array<{ name?: string }> | undefined) || [];
      const authorsStr = authors.map((a) => a.name || "").filter(Boolean).join(", ");
      const tldr = ((detail.tldr as { text?: string } | null) || {}).text || "";
      return [
        `Title: ${detail.title || ""}`,
        `Authors: ${authorsStr}`,
        `Year: ${detail.year ?? "n.d."}`,
        `Abstract: ${detail.abstract || ""}`,
        `TLDR: ${tldr}`,
        `Citations: ${detail.citationCount ?? 0}`,
      ].join("\n");
    }
  }
  const fallback = await searchOpenAlex(id, 1);
  if (fallback.length > 0) {
    const p = fallback[0];
    return [
      `Title: ${p.title}`,
      `Authors: ${p.authors.join(", ")}`,
      `Year: ${p.year ?? "n.d."}`,
      `Abstract: ${p.abstract || "No abstract available"}`,
      `DOI: ${p.doi || ""}`,
    ].join("\n");
  }
  return `No details found for: ${id}`;
}

type SavePayload = {
  goal_id?: number;
  feedback_id?: number;
  issue_id?: number;
  journal_entry_id?: number;
  therapeutic_goal_type?: string;
  papers?: Array<Record<string, unknown>>;
};

async function toolSaveResearchPapers(
  args: { papers_json: string },
  userEmail: string,
): Promise<string> {
  let data: SavePayload;
  try {
    data = JSON.parse(args.papers_json) as SavePayload;
  } catch (exc) {
    const msg = exc instanceof Error ? exc.message : String(exc);
    return `Invalid JSON: ${msg}`;
  }
  const feedbackId = data.feedback_id ?? null;
  const issueId = data.issue_id ?? null;
  const goalId = data.goal_id ?? null;
  const journalEntryId = data.journal_entry_id ?? null;
  if (!feedbackId && !issueId && !goalId && !journalEntryId) {
    return "Error: one of goal_id, feedback_id, issue_id, or journal_entry_id is required";
  }
  const therapeuticGoalType = (data.therapeutic_goal_type || "").toString();
  const papers = (data.papers || []).slice(0, 10);
  if (papers.length === 0) return "No papers to save";

  let saved = 0;
  let skipped = 0;
  let failed = 0;
  for (const paper of papers) {
    const abstractRaw = (paper.abstract as string | undefined) || "";
    const abstract = abstractRaw.trim();
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
      const rawAuthors = paper.authors;
      const authors: string[] = Array.isArray(rawAuthors)
        ? rawAuthors.filter((a): a is string => typeof a === "string")
        : [];
      const rawFindings = paper.key_findings;
      const keyFindings: string[] = Array.isArray(rawFindings)
        ? rawFindings.filter((f): f is string => typeof f === "string")
        : [];
      const rawTechniques = paper.therapeutic_techniques;
      const therapeuticTechniques: string[] = Array.isArray(rawTechniques)
        ? rawTechniques.filter((t): t is string => typeof t === "string")
        : [];
      const relevanceRaw = Number(paper.relevance_score ?? 0);
      const relevanceScore = Number.isFinite(relevanceRaw) ? relevanceRaw : 0;
      await upsertTherapyResearch(goalId, userEmail, {
        feedbackId,
        issueId,
        journalEntryId,
        therapeuticGoalType,
        title: (paper.title as string) || "",
        authors,
        year: (paper.year as number | null | undefined) ?? null,
        doi: (paper.doi as string | null | undefined) ?? null,
        url: (paper.url as string | null | undefined) ?? null,
        abstract,
        keyFindings,
        therapeuticTechniques,
        evidenceLevel: (paper.evidence_level as string | null | undefined) ?? null,
        relevanceScore,
        extractedBy: "mastra:deepseek-chat:v1",
        extractionConfidence: 0.8,
      });
      saved += 1;
    } catch (exc) {
      failed += 1;
      const msg = exc instanceof Error ? exc.message : String(exc);
      console.error("[research.save] Error saving paper:", msg);
    }
  }
  const parts = [`Saved ${saved} papers to database`];
  if (skipped) parts.push(`${skipped} skipped (no abstract)`);
  if (failed) parts.push(`${failed} failed`);
  return parts.join(", ");
}

const TOOL_DEFS = [
  {
    type: "function" as const,
    function: {
      name: "search_papers",
      description:
        "Search academic papers across 6 providers in parallel (OpenAlex, Crossref, Semantic Scholar, arXiv, CORE, Zenodo). Returns titles, authors, citation counts, abstracts, and DOIs — deduplicated by DOI/title and reranked for semantic relevance. Call multiple times with different query terms to cover the topic.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "integer", description: "Number of results", default: 10 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_paper_detail",
      description:
        "Get full details for a specific paper: complete abstract, AI-generated TLDR, all authors, venue, citation context. Use on the most relevant papers to extract therapeutic techniques and evidence level.",
      parameters: {
        type: "object",
        properties: {
          doi_or_title: { type: "string", description: "DOI (10.xxx) or paper title" },
        },
        required: ["doi_or_title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "save_research_papers",
      description:
        'Save the final curated research papers to the database. Call this ONCE at the end with a JSON string: {"goal_id": <int> OR "feedback_id" OR "issue_id" OR "journal_entry_id", "therapeutic_goal_type": "<string>", "papers": [{"title","authors","year","doi","url","abstract","key_findings","therapeutic_techniques","evidence_level","relevance_score"}]}',
      parameters: {
        type: "object",
        properties: {
          papers_json: { type: "string", description: "JSON string of papers payload" },
        },
        required: ["papers_json"],
      },
    },
  },
];

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

const MAX_TURNS = 12;

async function runResearchAgent(
  userPrompt: string,
  userEmail: string,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

  const chat: ChatMessage[] = [
    { role: "system", content: RESEARCH_PREAMBLE },
    { role: "user", content: userPrompt },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: chat,
        tools: TOOL_DEFS,
        temperature: 0,
        stream: false,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`DeepSeek HTTP ${resp.status}: ${body.slice(0, 400)}`);
    }
    const data = (await resp.json()) as {
      choices?: Array<{
        message?: {
          role: "assistant";
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
    };
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("DeepSeek returned no message");

    chat.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return msg.content ?? "";
    }

    for (const tc of toolCalls) {
      let result: string;
      try {
        const parsed = JSON.parse(tc.function.arguments || "{}") as Record<string, unknown>;
        if (tc.function.name === "search_papers") {
          result = await toolSearchPapers({
            query: String(parsed.query ?? ""),
            limit: typeof parsed.limit === "number" ? parsed.limit : undefined,
          });
        } else if (tc.function.name === "get_paper_detail") {
          result = await toolGetPaperDetail({
            doi_or_title: String(parsed.doi_or_title ?? ""),
          });
        } else if (tc.function.name === "save_research_papers") {
          result = await toolSaveResearchPapers(
            { papers_json: String(parsed.papers_json ?? "{}") },
            userEmail,
          );
        } else {
          result = `Unknown tool: ${tc.function.name}`;
        }
      } catch (exc) {
        const m = exc instanceof Error ? exc.message : String(exc);
        result = `Tool error: ${m}`;
      }
      chat.push({
        role: "tool",
        tool_call_id: tc.id,
        name: tc.function.name,
        content: result,
      });
    }
  }
  return "Research agent terminated without final summary (max turns reached).";
}

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

async function deepseekJson<T>(prompt: string): Promise<T | null> {
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
          { role: "system", content: "Respond with valid JSON." },
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

function clamp01(v: unknown): number {
  const n = typeof v === "number" ? v : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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

const runAgent = createStep({
  id: "run_agent",
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

    try {
      const summary = await runResearchAgent(userMsg.content, userEmail);

      if (trackJob) {
        let evals: EvalScores | undefined;
        try {
          evals = await runResearchEvals(
            {
              goalId: inputData.goalId ?? null,
              issueId: inputData.issueId ?? null,
              feedbackId: inputData.feedbackId ?? null,
              journalEntryId: inputData.journalEntryId ?? null,
            },
            inputData.evalPromptContext ?? userMsg.content,
            inputData.hasRelatedMember ?? false,
          );
        } catch (evalErr) {
          console.error("[research.workflow] eval error:", evalErr);
        }

        if (evals?.error === "no papers found") {
          await updateJobFailed(jobId!, {
            message:
              "Research agent completed but found no suitable papers. Try rephrasing or try again later.",
            code: "NO_PAPERS_SAVED",
          });
        } else {
          await updateJobSucceeded(jobId!, {
            count: 1,
            output: summary || "",
            evals,
          });
        }
      }

      return { messages: [{ type: "ai", content: summary || "" }] };
    } catch (exc) {
      const m = exc instanceof Error ? exc.message : String(exc);
      console.error("[research.workflow] agent failed:", m);
      if (trackJob) {
        await updateJobFailed(jobId!, { message: m, code: "AGENT_FAILED" });
      }
      return {
        messages: [{ type: "ai", content: `Research agent error: ${m}` }],
      };
    }
  },
});

export const researchWorkflow = createWorkflow({
  id: "research",
  inputSchema,
  outputSchema,
})
  .then(runAgent)
  .commit();

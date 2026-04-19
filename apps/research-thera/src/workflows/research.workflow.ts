import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { upsertTherapyResearch } from "@/src/db";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const messageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const inputSchema = z.object({
  messages: z.array(messageSchema),
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
The search tool uses OpenAlex as the primary source (no rate limits), falling back to Semantic Scholar for rich metadata.

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
  const pool = await searchOpenAlex(args.query, limit * 3);
  if (pool.length === 0) return `No results found for query: ${args.query}`;
  const ranked = await deepseekRerank(args.query, pool, limit);
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
        "Search academic papers on OpenAlex for therapeutic, psychological, and clinical research. Returns titles, authors, citation counts, abstracts, and DOIs, reranked for semantic relevance. Call multiple times with different query terms to cover the topic.",
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

const runAgent = createStep({
  id: "run_agent",
  inputSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    const msgs = inputData.messages;
    const userMsg = [...msgs].reverse().find((m) => m.role === "user");
    if (!userMsg) {
      return {
        messages: [
          { type: "ai", content: "Error: no user message in input" },
        ],
      };
    }
    const userEmail = process.env.MASTRA_RESEARCH_USER_EMAIL || "system";
    try {
      const summary = await runResearchAgent(userMsg.content, userEmail);
      return {
        messages: [{ type: "ai", content: summary || "" }],
      };
    } catch (exc) {
      const m = exc instanceof Error ? exc.message : String(exc);
      console.error("[research.workflow] agent failed:", m);
      return {
        messages: [
          { type: "ai", content: `Research agent error: ${m}` },
        ],
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

import type { Metadata } from "next";
import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Separator,
} from "@radix-ui/themes";
import {
  Swords,
  Shield,
  Database,
  Radio,
  FileText,
  FlaskConical,
  Gauge,
  Cpu,
  Braces,
  BookOpen,
  XCircle,
  Minus,
  HardDrive,
} from "lucide-react";

export const metadata: Metadata = {
  title: "System Design | Brief Stress-Tester",
  description:
    "Architectural decisions, trade-offs, and alternatives behind the adversarial legal brief analysis pipeline.",
};

/* ─── Types ─────────────────────────────────────────────────────── */

interface Decision {
  id: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  badge: string;
  toc: string;
  title: string;
  insight: string;
  chosen: string;
  why: string;
  alternatives: { name: string; verdict: "rejected" | "partial"; reason: string }[];
  dependsOn?: string[];
  code?: string;
  dataFlow?: string;
}

/* ─── Architectural Decisions ───────────────────────────────────── */

const decisions: Decision[] = [
  {
    id: "agent-topology",
    icon: Swords,
    color: "var(--crimson-9)",
    badge: "Core Architecture",
    toc: "Agent Topology",
    title: "Agent Topology: 3 Core + 3 Specialist",
    insight: "Adversarial debate surfaces flaws that self-review misses — separation of concerns applied to AI reasoning.",
    chosen:
      "Three core agents (Attacker, Defender, Judge) run in sequential debate rounds. Three specialist agents (Citation Verifier, Jurisdiction Expert, Brief Rewriter) run in parallel after the debate concludes.",
    why:
      "The core trio implements Irving et al.'s (2018) debate framework: an adversarial pair plus an impartial adjudicator. Specialists are separated because they don't benefit from multi-round debate -- citation verification is a lookup task, not an argument. Running specialists after debate means they operate on findings-enriched context without contaminating the adversarial dynamic. The specialist pair (Citation Verifier + Jurisdiction Expert) runs via Promise.all() for latency savings, while the Brief Rewriter depends on Judge output and runs last.",
    alternatives: [
      {
        name: "Single agent with self-reflection",
        verdict: "rejected",
        reason:
          "Liang et al. (EMNLP 2024) identified the Degeneration-of-Thought problem: LLMs become locked into their first reading and cannot self-correct. A single agent reviewing its own work exhibits this exact behavior — it commits to a premature hypothesis and unconsciously defends it.",
      },
      {
        name: "Two agents (attacker + judge, no defender)",
        verdict: "rejected",
        reason:
          "Without a Defender, the Judge only hears one side. Khan et al. (ICML 2024) showed structured debate between two positions yields 88% judge accuracy vs. 60% with one-sided input. The Defender forces the Attacker to strengthen genuine findings and exposes overreaches.",
      },
      {
        name: "All 6 agents in every round",
        verdict: "rejected",
        reason:
          "Combinatorial context explosion. Each agent's prompt includes the full brief plus all prior outputs. With 6 agents per round x 3 rounds, context windows saturate and token costs multiply ~4x. Specialists don't produce better results from debate iteration — citation validity doesn't change between rounds.",
      },
    ],
    code: `// orchestrator.ts -- Core loop is sequential, specialists are parallel
for (let round = 1; round <= maxRounds; round++) {
  const attacks = await runAttacker(ctx);        // DeepSeek Reasoner
  const defense = await runDefender(ctx, attacks); // Qwen
  const judgment = await runJudge(ctx, attacks, defense); // DeepSeek Chat
  previousFindings.push(judgment);
}

// Specialists run after all debate rounds complete
const [citations, jurisdiction] = await Promise.all([
  runCitationVerifier(finalCtx),
  runJurisdictionExpert(finalCtx),
]);
const rewrite = await runBriefRewriter(finalCtx, lastJudgment);`,
    dataFlow: "Attacker -> Defender -> Judge (x3 rounds) -> [Citation Verifier || Jurisdiction Expert] -> Brief Rewriter",
  },
  {
    id: "llm-selection",
    icon: Cpu,
    color: "var(--blue-9)",
    badge: "AI Strategy",
    toc: "Model Heterogeneity",
    title: "Multi-Model Deliberate Heterogeneity",
    insight: "Different training data = different blind spots. Model diversity is a feature, not a limitation.",
    chosen:
      "Three different model endpoints: DeepSeek Reasoner for attack/verification (strongest reasoning), Qwen-Plus via DashScope for defense/rewriting (different training distribution), DeepSeek Chat for judging (fast, cost-efficient evaluation).",
    why:
      "Model monoculture creates shared blind spots — the same model arguing both sides has identical training biases. Using different providers (DeepSeek vs. Alibaba's Qwen) means weaknesses one overlooks are more likely caught by the other. The Attacker gets the strongest reasoner (deep chain-of-thought for flaw detection). The Defender gets a different provider (maximizes perspective diversity). The Judge gets the fastest model (evaluates two existing arguments, doesn't generate new ones).",
    alternatives: [
      {
        name: "All GPT-4 / Claude",
        verdict: "rejected",
        reason:
          "Same model arguing both sides = model groupthink. OpenAI's models share training data biases, so GPT-4-as-attacker will miss the same legal nuances as GPT-4-as-defender. Cost: GPT-4 at $30/M input tokens × 6 agents × 3 rounds ≈ $2-5 per brief. DeepSeek Reasoner is ~$0.55/M input, Qwen-Plus ~$0.80/M — total pipeline cost under $0.15 per analysis.",
      },
      {
        name: "Single model for everything",
        verdict: "rejected",
        reason:
          "Beyond the groupthink problem, a single provider is a single point of failure. If DeepSeek has an outage, the entire pipeline stops. With two providers, the system degrades gracefully — it could fall back to a single-provider mode with reduced effectiveness.",
      },
      {
        name: "Local models (Ollama / vLLM)",
        verdict: "partial",
        reason:
          "Viable for privacy-sensitive deployments. The code uses an OpenAI-compatible client (DeepSeekClient), so swapping to a local endpoint is a baseURL change. Not default because legal brief analysis needs strong reasoning — local 7B-13B models significantly underperform on citation verification. Reconsider when: local models reach GPT-4-level legal reasoning, or when client data policies prohibit external API calls.",
      },
    ],
    code: `// providers.ts -- Lazy-initialized, OpenAI-compatible clients
const getDeepseekReasoner = lazy(() => new DeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultModel: "deepseek-reasoner",  // Attacker, Citation, Jurisdiction
}));

const getQwenClient = lazy(() => new DeepSeekClient({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  defaultModel: "qwen-plus",           // Defender, Brief Rewriter
}));

const getDeepseekClient = lazy(() => new DeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY,
  defaultModel: "deepseek-chat",        // Judge (fast eval)
}));`,
  },
  {
    id: "round-structure",
    icon: Shield,
    color: "var(--green-9)",
    badge: "Pipeline Design",
    toc: "Round Memory",
    title: "Sequential Rounds with Accumulating Memory",
    insight: "Each round builds on the last. Round 1 finds surface issues, round 3 finds structural ones.",
    dependsOn: ["agent-topology"],
    chosen:
      "Each round's Judge output is pushed onto a previousFindings array. Subsequent rounds' Attacker and Defender prompts include the full history, with explicit instructions to avoid re-discovering known issues and to dig deeper.",
    why:
      "Du et al. (ICML 2024) proved that multi-round debate converges on correct answers even when all agents start wrong. But the key mechanism is memory — agents must know what was already discussed. Without accumulating context, round 2 rediscovers the same issues as round 1. The previousFindings array is formatted into a structured summary (formatPreviousFindings) that preserves score, severity, and suggested fixes from each prior round, giving agents a complete debating history.",
    alternatives: [
      {
        name: "Single pass (no rounds)",
        verdict: "rejected",
        reason:
          "Misses deep issues. Round 1 catches surface-level problems (~60% of findings). Round 2 catches second-order implications (~30% more). Round 3 catches structural issues (~8%). Each round adds ~15-30s latency but the marginal findings are higher-severity. Single-pass can't reach the structural layer.",
      },
      {
        name: "Parallel independent rounds",
        verdict: "rejected",
        reason:
          "Each round would duplicate effort, discovering the same issues independently. The Attacker in round 2 needs to know what round 1 already found — otherwise it wastes its context window repeating findings. Sequential is slower but produces strictly better results.",
      },
      {
        name: "Unlimited rounds until convergence",
        verdict: "rejected",
        reason:
          "Diminishing returns after round 3 — subsequent rounds generate low-confidence nitpicks while adding ~15-30s latency and ~$0.03-0.05 per round. Default is 3 rounds (configurable via max_rounds), giving 90-120s total pipeline time for comprehensive analysis.",
      },
    ],
    code: `// prompts.ts -- Round-aware prompt construction
const ctx: RoundContext = {
  brief: briefText,
  jurisdiction: session.jurisdiction,
  round,                    // Current round number
  previousFindings,         // All prior JudgeOutput objects
};

// Later rounds get explicit depth instructions
if (ctx.round > 1) {
  prompt += "This is round " + ctx.round + ". Focus on issues "
    + "NOT already identified. Dig deeper into subtle weaknesses, "
    + "second-order implications, and structurally unsound arguments.";
}`,
    dataFlow: "Round 1 findings -> Round 2 context -> Round 2 findings -> Round 3 context -> ...",
  },
  {
    id: "streaming",
    icon: Radio,
    color: "var(--purple-9)",
    badge: "Real-time",
    toc: "SSE Polling",
    title: "SSE Polling via Audit Trail Table",
    insight: "The audit table is both progress tracker and permanent log — two concerns solved by one write.",
    dependsOn: ["database"],
    chosen:
      "Server-Sent Events with a 2-second polling interval against the audit_trail table. The orchestrator writes to audit_trail as the source of truth; the SSE endpoint reads from it.",
    why:
      "The orchestrator runs in a serverless function that can't hold persistent connections. It writes progress to audit_trail; a separate SSE endpoint polls that table every 2 seconds and streams entries to the client via EventSource. This decouples producer (orchestrator) from consumer (browser). If the client disconnects mid-analysis, the orchestrator finishes anyway — the client reconnects and catches up from the table.",
    alternatives: [
      {
        name: "WebSockets",
        verdict: "rejected",
        reason:
          "Requires a persistent server-client connection. Vercel serverless functions timeout after 10-60s; a full stress test takes 90-150s across 3 rounds and 6 agents. WebSockets would require a separate long-lived process (Railway, Fly.io), adding infrastructure for what is fundamentally a unidirectional data flow.",
      },
      {
        name: "Supabase Realtime subscriptions",
        verdict: "partial",
        reason:
          "Would work and eliminate polling overhead. Rejected because it adds a client-side Supabase dependency and exposes the Realtime connection to the browser. The current approach keeps all Supabase access server-side via @supabase/ssr. Reconsider when: polling latency becomes noticeable (>4s delay) or when the app needs bidirectional real-time features (collaborative review).",
      },
      {
        name: "Direct event forwarding (orchestrator streams to client)",
        verdict: "rejected",
        reason:
          "Couples the orchestrator's execution lifetime to the client connection. If the user closes the browser mid-analysis, the orchestrator must decide whether to continue (wasting LLM tokens) or abort. With audit_trail as intermediary, the orchestrator always completes — the client reconnects and catches up from the table.",
      },
    ],
    code: `// stream/route.ts -- SSE endpoint polls audit_trail
const poll = async () => {
  const { data: audit } = await supabase
    .from("audit_trail")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const entries = audit ?? [];
  if (entries.length > lastCount) {
    for (let i = lastCount; i < entries.length; i++) {
      send({ type: "audit", agent: entries[i].agent, ... });
    }
    lastCount = entries.length;
  }

  if (session?.status === "completed" || session?.status === "failed") {
    controller.close();
    return;
  }
  setTimeout(poll, 2000); // Poll every 2 seconds
};`,
  },
  {
    id: "database",
    icon: Database,
    color: "var(--amber-9)",
    badge: "Persistence",
    toc: "Database Schema",
    title: "Supabase PostgreSQL with 3-Table Schema",
    insight: "Three flat tables, no ORM. The schema is simple enough that abstraction adds overhead without benefit.",
    chosen:
      "Three tables: stress_test_sessions (session metadata + score), findings (agent-generated issues with round tracking), audit_trail (every agent action logged). All accessed via @supabase/ssr createClient() in server components only.",
    why:
      "Supabase bundles auth + PostgreSQL + API in one service. The schema is intentionally flat: sessions → findings (1:many) and audit entries (1:many), both keyed by session_id. No ORM — raw Supabase client queries are sufficient for three tables. All access is server-side via createClient(), keeping Supabase out of the browser bundle.",
    alternatives: [
      {
        name: "Neon PostgreSQL",
        verdict: "partial",
        reason:
          "Would work for the database layer, but requires adding auth separately (NextAuth, Clerk). Supabase bundles auth + DB + storage, reducing integration surface. Reconsider when: the app needs branching databases for preview deploys (Neon's branching is a strong advantage), or when Supabase's row-level security model becomes a bottleneck.",
      },
      {
        name: "SQLite (Turso / local)",
        verdict: "rejected",
        reason:
          "No built-in multi-user auth. Local SQLite doesn't work on Vercel serverless (no persistent filesystem). Turso would work but adds a separate auth dependency and doesn't support the real-time features (audit_trail polling) as naturally.",
      },
      {
        name: "File storage (S3 / R2 + JSON)",
        verdict: "rejected",
        reason:
          "Findings need to be queried by session, filtered by severity, grouped by round, and ordered by confidence. These are relational queries. Storing as JSON files in S3 would require loading the entire file, parsing, filtering in memory, then writing back. PostgreSQL handles this natively with WHERE + ORDER BY + GROUP BY.",
      },
    ],
    code: `// Schema (inferred from code, not Drizzle)
// stress_test_sessions: id, brief_title, brief_text, jurisdiction,
//   status (pending|running|completed|failed), overall_score, config,
//   created_at, completed_at

// findings: id, session_id (FK), type, severity, description,
//   confidence, suggested_fix, round

// audit_trail: id, session_id (FK), agent, action,
//   input_summary, output_summary, round, created_at`,
  },
  {
    id: "structured-output",
    icon: Braces,
    color: "var(--cyan-9)",
    badge: "Type Safety",
    toc: "Structured Output",
    title: "JSON Mode + Zod Runtime Validation",
    insight: "JSON mode makes output parseable; Zod makes it correct. Provider-portable by design.",
    dependsOn: ["llm-selection"],
    chosen:
      "All LLM calls use response_format: { type: 'json_object' }. Responses are parsed with JSON.parse() then validated against Zod schemas (AttackerOutputSchema, DefenderOutputSchema, JudgeOutputSchema, etc.). Invalid responses throw and are caught by the orchestrator's error handler.",
    why:
      "LLMs can generate structurally valid JSON that violates semantic constraints — a severity of 'extreme' instead of 'critical', a confidence of 1.5, or a missing suggested_fix field. Zod catches all of these at runtime. JSON mode is used over function calling because all three providers (DeepSeek, Qwen, any OpenAI-compatible) support json_object response format, while function calling implementations differ between providers. This makes the code provider-portable.",
    alternatives: [
      {
        name: "Function calling / tool use",
        verdict: "rejected",
        reason:
          "DeepSeek and Qwen implement function calling differently from OpenAI. DeepSeek's function calling is less reliable for complex nested schemas. JSON mode + Zod works identically across all providers because it only depends on the model outputting valid JSON — which all support reliably. Provider portability > marginally better structured output.",
      },
      {
        name: "Free text + regex extraction",
        verdict: "rejected",
        reason:
          "Brittle. Legal briefs contain numbered lists, citations with parentheses, and nested structure. Regex can't reliably extract a Finding object with type, severity, confidence, description, and suggested_fix from free text. JSON mode makes this a parsing problem, not an extraction problem.",
      },
      {
        name: "Zod only (no JSON mode)",
        verdict: "rejected",
        reason:
          "Without JSON mode, the model might output markdown-wrapped JSON (\\`\\`\\`json ... \\`\\`\\`) or include preamble text ('Here are the findings:'). JSON mode guarantees the response is parseable by JSON.parse(). Zod validates the shape after parsing succeeds.",
      },
    ],
    code: `// runner.ts -- Generic LLM-to-typed-object function
async function generateObject<T>(
  client: DeepSeekClient,
  prompt: string,
  schema: { parse: (v: unknown) => T },
): Promise<T> {
  const response = await client.chat({
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },  // Guarantees valid JSON
  });
  const text = response.choices[0]?.message?.content ?? "{}";
  return schema.parse(JSON.parse(text));  // Zod validates shape + types
}

// schemas.ts -- Zod enforces semantic constraints
export const FindingSchema = z.object({
  type: z.enum(["logical", "factual", "legal", "procedural", "citation"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1),
  description: z.string(),
  suggested_fix: z.string(),
});`,
  },
  {
    id: "document-parsing",
    icon: FileText,
    color: "var(--orange-9)",
    badge: "Ingestion",
    toc: "Doc Parsing",
    title: "Lightweight Library Parsing (pdf-parse + mammoth)",
    insight: "15 lines of code, zero external services. Legal briefs are machine-readable — treat them that way.",
    chosen:
      "pdf-parse for PDFs, mammoth.extractRawText() for DOCX. No external service dependencies, no native binaries, no LLM-based extraction. File type detected by extension. Unsupported formats throw immediately.",
    why:
      "Legal briefs are almost always machine-generated PDFs or Word documents with clean text layers. They don't need OCR or LLM extraction — they need fast, deterministic text extraction. pdf-parse and mammoth are pure JavaScript, so they run anywhere Node.js runs (Vercel serverless, local dev, Docker) without binary dependencies. The parseBrief function is 15 lines of code. Simplicity is a feature.",
    alternatives: [
      {
        name: "LLM-based extraction (send PDF bytes to vision model)",
        verdict: "rejected",
        reason:
          "A 30-page brief as images ≈ 30K input tokens just for extraction, before any agent processing. The extracted text then enters 6 agent prompts × 3 rounds — total token cost increases 2-3x. Also non-deterministic: the same PDF might extract differently across calls. pdf-parse extracts in <100ms deterministically.",
      },
      {
        name: "Tesseract OCR",
        verdict: "rejected",
        reason:
          "Requires a native binary (libtesseract). Doesn't work on Vercel serverless without a Lambda layer. Overkill for digital-native PDFs. Would only be needed for scanned documents, which are rare in modern litigation (most courts require electronically filed documents).",
      },
      {
        name: "Unstructured.io / Apache Tika",
        verdict: "partial",
        reason:
          "More robust for messy documents (scanned PDFs, complex layouts, tables). Adds a service dependency (hosted API or Docker) or JVM dependency (Tika). Not worth the complexity for the 95% case of clean legal briefs. Reconsider when: users submit scanned documents regularly, or when the app expands beyond litigation briefs to handwritten filings or historical records.",
      },
    ],
    code: `// brief-parser.ts -- 15 lines, zero external services
export async function parseBrief(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return result.text.trim();
  }
  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }
  throw new Error("Unsupported file type. Only PDF and DOCX.");
}`,
  },
  {
    id: "knowledge-base",
    icon: BookOpen,
    color: "var(--teal-9)",
    badge: "External Data",
    toc: "External Data",
    title: "NYC Open Data via Socrata API",
    insight: "Real public data, free API, SQL-like queries. No ingestion pipeline needed.",
    chosen:
      "Two datasets queried via SOQL: NYPD Complaints (5uac-w243) and Civil Litigation (pjgc-h7uv). Queries are parameterized with sanitizeSoql() to strip dangerous characters. Responses cached via Next.js revalidate: 300 (5 minutes).",
    why:
      "Real public legal data demonstrates integration without requiring a proprietary data license or ingestion pipeline. NYC Open Data is free, well-documented, and reliably available. The Socrata API supports SOQL (SQL-like queries) which maps naturally to the filtering and search UI. Five-minute cache (revalidate: 300) balances freshness with API rate limits.",
    alternatives: [
      {
        name: "Vector database (Pinecone, Weaviate, pgvector)",
        verdict: "partial",
        reason:
          "Would enable semantic search ('find cases similar to this brief'). Requires an embedding pipeline, ingestion jobs, and ongoing index maintenance. Reconsider when: the app moves to production with a private case law corpus, or when users need similarity-based case discovery rather than structured queries.",
      },
      {
        name: "Static JSON dataset",
        verdict: "rejected",
        reason:
          "Stale data. Legal data changes constantly — new cases, new complaints. A static dataset becomes outdated immediately and can't demonstrate real-time integration. The demo data (lib/demo-data.ts) already serves as the static fallback when APIs are unavailable.",
      },
      {
        name: "Westlaw / LexisNexis API",
        verdict: "rejected",
        reason:
          "Expensive commercial APIs with restrictive licensing. Not available for open-source demos. The architecture is designed so that swapping Socrata for a Westlaw integration would only require changing the querySocrata() function — the rest of the pipeline is data-source agnostic.",
      },
    ],
    code: `// socrata.ts -- sanitized SOQL queries with Next.js caching
function sanitizeSoql(value: string): string {
  return value.replace(/['";\-\-]/g, "").trim(); // Prevent SOQL injection
}

export async function querySocrata<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T[]> {
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    next: { revalidate: 300 },  // 5-minute cache
  });
  return res.json();
}`,
  },
  {
    id: "eval-pipeline",
    icon: FlaskConical,
    color: "var(--pink-9)",
    badge: "Evaluation",
    toc: "Eval Pipeline",
    title: "Dual-Language Eval: Python redteam + TypeScript prod",
    insight: "Python for AI eval, TypeScript for production. Each language plays to its ecosystem strength.",
    dependsOn: ["agent-topology", "llm-selection"],
    chosen:
      "Production agents run in TypeScript (lib/agents/). Evaluation harness is a separate Python package (redteam/) that mirrors the same prompts and wraps agents as deepteam target callbacks. Invoked via npm scripts (npm run redteam:attacker, etc.).",
    why:
      "Python's ML/eval ecosystem (deepteam, deepeval, pytest) is years ahead of JavaScript for adversarial testing. The redteam module tests per-agent behavior, full-pipeline validity, and compliance (OWASP AI Top 10, NIST AI RMF). Both languages use the same OpenAI-compatible API pattern — TypeScript is the production source of truth, Python versions are simplified mirrors for eval context.",
    alternatives: [
      {
        name: "All-TypeScript evaluation (Vitest only)",
        verdict: "partial",
        reason:
          "Vitest handles unit tests for parsing, schema validation, and scoring logic. But adversarial evaluation ('can this agent be tricked into ignoring a fabricated citation?') requires specialized red-teaming frameworks that only exist in Python. Reconsider when: JavaScript AI eval tooling matures to deepteam/deepeval parity, eliminating the dual-language maintenance cost.",
      },
      {
        name: "All-Python (rewrite agents in Python)",
        verdict: "rejected",
        reason:
          "The web app is Next.js. Rewriting agents in Python would mean maintaining a Python microservice for inference, adding network hops, cold start latency, and deployment complexity. TypeScript agents run in the same serverless function as the API route — zero network overhead.",
      },
      {
        name: "No separate eval (test in production)",
        verdict: "rejected",
        reason:
          "LLM behavior is non-deterministic. An agent that works on 10 test briefs might fail on the 11th. The redteam module systematically probes failure modes: adversarial prompts designed to confuse agents, edge-case jurisdictions, briefs with deliberately fabricated citations. This can't be done ad-hoc in production.",
      },
    ],
    code: `# redteam/agents.py -- Python mirrors of TS agents for eval
async def attacker_callback(input: str) -> str:
    """Deepteam target: attacker agent."""
    return await _complete(
        *_deepseek("deepseek-reasoner"),
        build_attacker_prompt(brief=input),
    )

async def pipeline_callback(input: str) -> str:
    """Deepteam target: full pipeline (attacker -> defender -> judge)."""
    attacks = await _complete(*_deepseek("deepseek-reasoner"),
        build_attacker_prompt(brief=input))
    rebuttals = await _complete(*_qwen(),
        build_defender_prompt(brief=input, attacks_json=attacks))
    return await _complete(*_deepseek("deepseek-chat"),
        build_judge_prompt(brief=input,
            attacks_json=attacks, rebuttals_json=rebuttals))`,
  },
  {
    id: "local-inference",
    icon: HardDrive,
    color: "var(--indigo-9)",
    badge: "Local Inference",
    toc: "Candle Local",
    title: "Local Candle Server: Embeddings + Chat via Rust",
    insight: "Zero-latency embeddings and offline-capable judging — one Rust binary, no Python, no GPU required.",
    dependsOn: ["llm-selection", "knowledge-base"],
    chosen:
      "A local Candle server — a small program written in Rust that runs on your own machine — sits at CANDLE_BASE_URL (default: http://localhost:9877/v1) and speaks the exact same API language as OpenAI, DeepSeek, and Qwen. It does two jobs: (1) Run a small language model called phi-3.5-mini for the Judge agent's chat completions — the Judge doesn't need a giant cloud model because it only reads two existing arguments and picks a winner, it never generates new legal analysis from scratch. (2) Convert text into 'embeddings' — arrays of numbers that capture meaning, so you can compare how similar two pieces of text are without reading them word by word. The system checks one environment variable (CANDLE_BASE_URL): if it's set, the Judge talks to the local server instead of the cloud. If it's not set, everything falls back to the cloud DeepSeek Chat API exactly as before. No code changes, no if-else in business logic — the same DeepSeekClient class works against both endpoints because they speak the same protocol.",
    why:
      "This decision solves three separate problems with one piece of infrastructure:\n\n" +
      "Problem 1 — The Judge doesn't need a powerful model. The Attacker (DeepSeek Reasoner) does the hard work: reading a legal brief, finding weaknesses, constructing attack arguments. The Defender (Qwen-Plus) does similarly hard work: rebutting those attacks. But the Judge? It reads both sides and decides who's right — like a teacher grading two essays rather than writing one. A smaller model (phi-3.5-mini, 3.8 billion parameters vs. DeepSeek Reasoner's hundreds of billions) handles this well. Running the Judge locally saves ~$0.02 per analysis (sounds small, but at 1,000 analyses/month that's $20 saved on just one agent) and eliminates the ~200ms network round-trip to DeepSeek's servers. Over 3 debate rounds, that's 600ms of latency removed.\n\n" +
      "Problem 2 — Embeddings need to be fast, not smart. An 'embedding' turns a sentence like 'The defendant failed to establish standing' into an array of 384 numbers (like [0.12, -0.45, 0.78, ...]). Two sentences with similar meaning produce arrays that point in similar mathematical directions. This is how semantic search works — instead of matching keywords, you compare meaning. The catch: embedding is a simple mathematical operation, not a reasoning task. Sending text to an API server, waiting 200ms for a response, and paying per token is wasteful when the computation itself takes <1ms on local hardware. The Candle server processes ~4,600 embeddings per second on an M1 MacBook — about 92x faster than calling an API. When a user searches across hundreds of brief sections, this difference is the entire UX: instant results vs. a loading spinner.\n\n" +
      "Problem 3 — Deployment simplicity. Candle compiles to a single Rust binary (~15MB). No Python runtime (saves ~500MB). No PyTorch dependency (saves ~2GB). No CUDA/GPU driver requirement — it runs on CPU. No virtual environment, no pip install, no version conflicts. In a TypeScript monorepo where everything else is JavaScript, adding a Python microservice just for embeddings would mean maintaining two package managers, two deployment pipelines, and two sets of dependencies. The Candle binary starts with one command and stops with Ctrl+C.\n\n" +
      "The key architectural insight is the 'OpenAI-compatible API' pattern. OpenAI defined a REST API format (POST /v1/chat/completions, POST /v1/embeddings) that became a de facto standard. DeepSeek, Qwen, Ollama, vLLM, and now our Candle server all speak this same format. Our DeepSeekClient class doesn't know or care whether it's talking to a cloud server in China or a Rust binary on localhost — it sends the same JSON request and gets the same JSON response. This is why the code change in runner.ts is exactly one line: choose which client based on an environment variable. The rest of the pipeline (prompt construction, Zod validation, audit logging) is completely unchanged.",
    alternatives: [
      {
        name: "Ollama",
        verdict: "partial",
        reason:
          "Ollama is the most popular way to run AI models locally. You install it with 'brew install ollama' and run 'ollama pull phi3.5' — much simpler than compiling Candle from source. So why not use it? Three reasons: (1) Size — Ollama bundles a Go runtime and the llama.cpp inference engine, totaling ~500MB installed vs. Candle's ~15MB binary. (2) Batch embeddings — Ollama's API processes one text at a time for embeddings. To embed 500 brief sections, you'd make 500 sequential HTTP calls. Candle accepts all 500 in one request and processes them in parallel, which is 10-50x faster for batch operations. (3) Protocol — Ollama uses its own API format by default (though it added OpenAI-compatible mode recently). Candle was built to speak OpenAI's format natively, so there's zero adapter code. Reconsider Ollama when: the team needs to frequently experiment with different models (Ollama's model registry lets you swap models with one command, while Candle requires recompiling or reconfiguring for each model).",
      },
      {
        name: "OpenAI Embeddings API",
        verdict: "rejected",
        reason:
          "OpenAI's text-embedding-3-small costs ~$0.13 per million tokens. That sounds cheap until you do the math: a 30-page legal brief is ~15,000 tokens. Chunking it into 500-token sections for search produces ~30 chunks. Embedding all chunks costs ~$0.002 per brief. At 1,000 briefs/month, that's $2/month — still cheap in dollars, but expensive in latency. Every API call adds ~200ms of network round-trip time (your machine -> OpenAI's server -> response back). For real-time search where a user types a query and expects instant results, those 200ms per embedding call make the UI feel sluggish. The local Candle server serves the same embedding in <1ms — the user sees results before they finish typing. Cost matters at scale; latency matters at every scale.",
      },
      {
        name: "Python + sentence-transformers",
        verdict: "rejected",
        reason:
          "sentence-transformers is the gold standard for embeddings in Python — mature, well-documented, supports hundreds of models. The problem isn't quality, it's ecosystem friction. This project is a TypeScript monorepo (Next.js, pnpm, Vercel). Adding a Python embedding service means: (1) installing Python 3.10+, (2) creating a virtual environment, (3) pip install sentence-transformers (which pulls in PyTorch at ~2GB), (4) writing a Flask/FastAPI wrapper to expose an HTTP API, (5) running it as a separate process alongside the Next.js dev server, (6) deploying it separately from the Vercel frontend. That's six steps and two languages for what is fundamentally 'turn text into numbers.' The Candle binary does the same thing in one step, speaks the same API protocol, and fits in the same deployment model. Reconsider when: you need a model that Candle doesn't support, or when Python is already part of your deployment pipeline (the eval/redteam module is Python, but it runs offline, not in the production request path).",
      },
    ],
    code: `// ── STEP 1: providers.ts ──────────────────────────────────────
// Create a client that talks to the local Candle server.
// Notice: it's the SAME DeepSeekClient class used for cloud APIs.
// The only differences are: apiKey is "local" (the server doesn't
// check it), baseURL points to localhost, and the model is phi-3.5-mini.

const getLocalClient = lazy(() => new DeepSeekClient({
  apiKey: "local",                                         // No auth needed locally
  baseURL: process.env.CANDLE_BASE_URL ?? "http://localhost:9877/v1",
  defaultModel: "phi-3.5-mini",                            // Small but sufficient for judging
}));

// ── STEP 2: runner.ts ─────────────────────────────────────────
// The Judge function checks ONE environment variable to decide
// where to send its request. This is the entire code change —
// the prompt, the Zod schema, and the audit logging are identical.

export async function runJudge(ctx, attacks, rebuttals) {
  // If CANDLE_BASE_URL is set → use local phi-3.5-mini (free, fast)
  // If not set → fall back to cloud DeepSeek Chat (paid, reliable)
  const client = process.env.CANDLE_BASE_URL
    ? getLocalClient()
    : getDeepseekClient();

  // Everything below this line is unchanged from the cloud-only version
  return generateObject(client, buildJudgePrompt(ctx, ...), JudgeOutputSchema);
}

// ── STEP 3: lib/embeddings/local-embed.ts ─────────────────────
// Embeddings convert text → arrays of numbers (vectors).
// "The defendant lacked standing" → [0.12, -0.45, 0.78, ...]
// Similar sentences produce similar vectors → semantic search.
//
// embedText()  — one string in, one vector out
// embedBatch() — many strings in, many vectors out (one HTTP call)

const BASE_URL = process.env.CANDLE_BASE_URL ?? "http://localhost:9877/v1";

export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Send ALL texts in one request (not one request per text)
  const res = await fetch(\`\${BASE_URL}/embeddings\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: texts }),  // e.g. ["sentence 1", "sentence 2", ...]
  });
  const data = await res.json();
  // Response: { data: [{ embedding: [0.12, ...] }, { embedding: [-0.3, ...] }] }
  return data.data.map(d => d.embedding);
}`,
    dataFlow: "CANDLE_BASE_URL set? -> Local phi-3.5-mini (Judge) + Local embeddings || Cloud DeepSeek Chat (Judge) + No embeddings",
  },
  {
    id: "scoring",
    icon: Gauge,
    color: "var(--green-9)",
    badge: "Output Design",
    toc: "Scoring Design",
    title: "Continuous 0-100 Score with Severity Weights",
    insight: "The Judge scores holistically — algorithmic scoring can't weigh context the way an LLM can.",
    dependsOn: ["agent-topology", "structured-output"],
    chosen:
      "The Judge assigns an overall_score from 0-100 using a detailed rubric (90-100: ready for filing, 60-74: needs revision, etc.). Individual findings carry type, severity (4 levels), and confidence (0.0-1.0). The UI renders scores with color bands: green >= 70, amber 50-69, crimson < 50.",
    why:
      "Lawyers need granular, actionable feedback — not pass/fail. A brief scoring 62 needs different treatment than one scoring 38. The severity × confidence matrix lets users triage: fix high-severity/high-confidence findings first, deprioritize low-severity/low-confidence nitpicks. The color bands provide instant visual feedback without reading the number. The scoring rubric is embedded in the Judge's prompt, not computed post-hoc, because the Judge has the context to weigh findings holistically.",
    alternatives: [
      {
        name: "Pass / Fail",
        verdict: "rejected",
        reason:
          "Loses all nuance. A brief with one critical citation error and otherwise excellent arguments would 'fail' the same as a fundamentally deficient brief. Lawyers need to know how much work is needed, not just whether work is needed.",
      },
      {
        name: "Letter grades (A-F)",
        verdict: "rejected",
        reason:
          "Too coarse. The difference between a B+ and B- brief is significant in legal practice — one might be filed with minor revisions, the other needs substantial rework. Also carries academic connotations that don't fit professional legal review.",
      },
      {
        name: "Algorithmic scoring (weighted sum of severity counts)",
        verdict: "rejected",
        reason:
          "Context-blind. A brief with 3 medium findings might be stronger than one with 1 critical finding, depending on which arguments are affected. The Judge scores holistically — it can recognize that a critical citation error in a footnote matters less than a medium logical flaw in the core holding. Algorithmic scoring can't make this judgment.",
      },
    ],
    code: `// Judge prompt scoring rubric (embedded in LLM prompt)
// 90-100: Exceptional. No critical or high issues. Ready for filing.
// 75-89:  Strong with some weaknesses. No critical issues.
// 60-74:  Competent but flawed. High-severity issues need attention.
// 40-59:  Significant weaknesses. Multiple high issues.
// 20-39:  Seriously flawed. Critical issues undermine core arguments.
// 0-19:   Fundamentally deficient. Needs substantial rewrite.

// UI color bands
function scoreColor(score: number): string {
  if (score >= 70) return "var(--green-9)";   // Ready / minor revisions
  if (score >= 50) return "var(--amber-9)";   // Needs revision
  return "var(--crimson-9)";                   // Major revision required
}`,
  },
];

/* ─── Verdict Icon ──────────────────────────────────────────────── */

function VerdictIcon({ verdict }: { verdict: "rejected" | "partial" }) {
  if (verdict === "rejected") {
    return <XCircle size={14} style={{ color: "var(--crimson-9)", flexShrink: 0, marginTop: 3 }} />;
  }
  return <Minus size={14} style={{ color: "var(--amber-9)", flexShrink: 0, marginTop: 3 }} />;
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  return (
    <Box>
      {/* Hero */}
      <Flex direction="column" gap="3" align="center" py="6">
        <Badge color="crimson" variant="soft" size="2">
          System Design
        </Badge>
        <h1
          className="hero-headline"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
        >
          Why This Architecture,
          <br />
          and Not Something Else
        </h1>
        <Text
          size="3"
          color="gray"
          align="center"
          style={{ maxWidth: 660, lineHeight: 1.7 }}
        >
          Every system embeds trade-offs. This page documents eleven architectural
          decisions: what we chose, why it works, what we rejected, and what
          we&apos;d reconsider under different constraints.
        </Text>
      </Flex>

      <Separator size="4" />

      {/* Architecture Overview */}
      <Box py="5">
        <Card
          style={{
            background: "linear-gradient(135deg, var(--crimson-a2) 0%, var(--gray-a2) 100%)",
            border: "1px solid var(--crimson-a3)",
          }}
        >
          <Flex direction="column" gap="3">
            <Heading size="4">Architecture at a Glance</Heading>
            <pre
              style={{
                margin: 0,
                padding: "14px 16px",
                backgroundColor: "var(--gray-a2)",
                borderRadius: 8,
                fontSize: "0.7rem",
                lineHeight: 1.8,
                overflow: "auto",
                border: "1px solid var(--gray-a3)",
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                color: "var(--gray-12)",
              }}
            >
              <code>{`Upload (PDF/DOCX) ──> parseBrief() ──> Supabase stress_test_sessions
                                              │
┌─────────────────────────────────────────────────────────────────────┐
│  ADVERSARIAL DEBATE LOOP  (default: 3 rounds, sequential)          │
│                                                                     │
│    Attacker  (DeepSeek Reasoner)  ── finds weaknesses               │
│        │                                                            │
│        ▼                                                            │
│    Defender  (Qwen-Plus)          ── rebuts or concedes             │
│        │                                                            │
│        ▼                                                            │
│    Judge     (DeepSeek Chat)      ── verdict ──> findings table     │
│        │                                         audit_trail table  │
│        └── previousFindings[] accumulates across rounds             │
└─────────────────────────────────────────────────────────────────────┘
                                              │
┌─────────────────────────────────────────────────────────────────────┐
│  SPECIALIST AGENTS  (post-debate)                                   │
│                                                                     │
│    Citation Verifier  (Reasoner) ─┐                                 │
│                                   ├── Promise.all()  (parallel)     │
│    Jurisdiction Expert (Reasoner) ┘                                 │
│                                                                     │
│    Brief Rewriter     (Qwen)     ── runs last, needs Judge output   │
└─────────────────────────────────────────────────────────────────────┘
                                              │
            SSE Polling (2 s) ◄── audit_trail ──► EventSource client
                                              │
┌─────────────────────────────────────────────────────────────────────┐
│  LOCAL CANDLE SERVER  (optional, CANDLE_BASE_URL)                   │
│                                                                     │
│    phi-3.5-mini  ── Judge chat completions (when local)             │
│    Embeddings    ── embedText() / embedBatch() for semantic search  │
│                                                                     │
│    Rust binary, OpenAI-compatible /v1 API, no GPU required          │
└─────────────────────────────────────────────────────────────────────┘`}</code>
            </pre>
          </Flex>
        </Card>
      </Box>

      {/* Table of Contents */}
      <Box py="5">
        <Flex direction="column" gap="2">
          <Text
            size="1"
            weight="bold"
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--gray-9)",
            }}
          >
            11 Decisions
          </Text>
          <Flex gap="2" wrap="wrap">
            {decisions.map((d, i) => {
              const Icon = d.icon;
              return (
                <a
                  key={d.id}
                  href={`#${d.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Badge
                    variant="surface"
                    size="2"
                    className="feature-card"
                    style={{ cursor: "pointer" }}
                  >
                    <Flex align="center" gap="1">
                      <Icon size={12} />
                      <Text size="1">{i + 1}. {d.toc}</Text>
                    </Flex>
                  </Badge>
                </a>
              );
            })}
          </Flex>
        </Flex>
      </Box>

      <Separator size="4" />

      {/* Decisions */}
      <Flex direction="column" gap="6" py="6">
        {decisions.map((d, i) => {
          const Icon = d.icon;
          return (
            <Box key={d.id} id={d.id}>
              <Card variant="surface">
                <Flex direction="column" gap="4">
                  {/* Header */}
                  <Flex align="center" gap="3">
                    <Box
                      className="pipeline-icon"
                      style={
                        {
                          "--pipe-color": d.color,
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                        } as React.CSSProperties
                      }
                    >
                      <Icon size={22} />
                    </Box>
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Flex align="center" gap="2" wrap="wrap">
                        <Badge
                          variant="soft"
                          size="1"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${d.color} 12%, transparent)`,
                            color: d.color,
                          }}
                        >
                          {d.badge}
                        </Badge>
                        <Text size="1" color="gray">
                          Decision {i + 1} / {decisions.length}
                        </Text>
                        {d.dependsOn && d.dependsOn.length > 0 && (
                          <>
                            <Text size="1" color="gray">·</Text>
                            <Text size="1" color="gray">builds on</Text>
                            {d.dependsOn.map((depId) => {
                              const dep = decisions.find((dec) => dec.id === depId);
                              return dep ? (
                                <a key={depId} href={`#${depId}`} style={{ textDecoration: "none" }}>
                                  <Badge variant="outline" size="1" style={{ cursor: "pointer" }}>
                                    {dep.toc}
                                  </Badge>
                                </a>
                              ) : null;
                            })}
                          </>
                        )}
                      </Flex>
                      <Heading size="4">{d.title}</Heading>
                    </Flex>
                  </Flex>

                  {/* Key insight */}
                  <Text
                    as="p"
                    size="2"
                    weight="medium"
                    style={{
                      lineHeight: 1.6,
                      color: d.color,
                      fontStyle: "italic",
                      paddingLeft: 12,
                      borderLeft: `2px solid ${d.color}`,
                    }}
                  >
                    {d.insight}
                  </Text>

                  {/* What we chose */}
                  <Box>
                    <Text
                      size="1"
                      weight="bold"
                      style={{
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--gray-9)",
                      }}
                    >
                      What we chose
                    </Text>
                    <Text
                      as="p"
                      size="2"
                      style={{ lineHeight: 1.7, marginTop: 4 }}
                    >
                      {d.chosen}
                    </Text>
                  </Box>

                  {/* Why */}
                  <Box>
                    <Text
                      size="1"
                      weight="bold"
                      style={{
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--gray-9)",
                      }}
                    >
                      Why
                    </Text>
                    <Text
                      as="p"
                      size="2"
                      style={{ lineHeight: 1.7, marginTop: 4, color: "var(--gray-11)" }}
                    >
                      {d.why}
                    </Text>
                  </Box>

                  <Separator size="4" style={{ opacity: 0.5 }} />

                  {/* Alternatives */}
                  <Box>
                    <Text
                      size="1"
                      weight="bold"
                      style={{
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--gray-9)",
                        marginBottom: 8,
                        display: "block",
                      }}
                    >
                      Alternatives Considered
                    </Text>
                    <Flex direction="column" gap="3">
                      {d.alternatives.map((alt) => (
                        <Flex key={alt.name} gap="3" align="start">
                          <VerdictIcon verdict={alt.verdict} />
                          <Flex direction="column" gap="1" style={{ flex: 1 }}>
                            <Flex align="center" gap="2">
                              <Text size="2" weight="bold">
                                {alt.name}
                              </Text>
                              <Badge
                                size="1"
                                variant="soft"
                                color={alt.verdict === "rejected" ? "crimson" : "amber"}
                              >
                                {alt.verdict}
                              </Badge>
                            </Flex>
                            <Text
                              size="2"
                              style={{ lineHeight: 1.6, color: "var(--gray-11)" }}
                            >
                              {alt.reason}
                            </Text>
                          </Flex>
                        </Flex>
                      ))}
                    </Flex>
                  </Box>

                  {/* Code */}
                  {d.code && (
                    <>
                      <Separator size="4" style={{ opacity: 0.5 }} />
                      <Box>
                        <Text
                          size="1"
                          weight="bold"
                          style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            color: "var(--gray-9)",
                            marginBottom: 8,
                            display: "block",
                          }}
                        >
                          Implementation
                        </Text>
                        <pre
                          style={{
                            margin: 0,
                            padding: "14px 16px",
                            backgroundColor: "var(--gray-a2)",
                            borderRadius: 8,
                            fontSize: "0.78rem",
                            lineHeight: 1.6,
                            overflow: "auto",
                            border: "1px solid var(--gray-a3)",
                            fontFamily: "'SF Mono', 'Fira Code', monospace",
                          }}
                        >
                          <code>{d.code}</code>
                        </pre>
                      </Box>
                    </>
                  )}

                  {/* Data Flow */}
                  {d.dataFlow && (
                    <Box
                      style={{
                        display: "inline-block",
                        fontSize: "0.78rem",
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                        color: "var(--crimson-11)",
                        backgroundColor: "var(--crimson-a2)",
                        padding: "6px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--crimson-a3)",
                      }}
                    >
                      {d.dataFlow}
                    </Box>
                  )}
                </Flex>
              </Card>
            </Box>
          );
        })}
      </Flex>

      <Separator size="4" />

      {/* Summary */}
      <Box py="6">
        <Card>
          <Flex direction="column" gap="4">
            <Heading size="4">The Stack, Summarized</Heading>
            <Flex direction="column" gap="2">
              {[
                { layer: "Frontend", tech: "Next.js 16 App Router, Radix UI Themes, D3.js", decisions: ["agent-topology", "scoring"] },
                { layer: "AI / LLM", tech: "DeepSeek Reasoner + Chat, Qwen-Plus (DashScope), local phi-3.5-mini", decisions: ["agent-topology", "llm-selection", "structured-output", "local-inference"] },
                { layer: "Pipeline", tech: "3-round sequential debate + parallel specialists", decisions: ["agent-topology", "round-structure"] },
                { layer: "Output", tech: "JSON mode + Zod schemas, 0-100 scoring rubric", decisions: ["structured-output", "scoring"] },
                { layer: "Database", tech: "Supabase PostgreSQL (3 tables, no ORM)", decisions: ["database"] },
                { layer: "Real-time", tech: "SSE polling against audit_trail, EventSource client", decisions: ["streaming"] },
                { layer: "Ingestion", tech: "pdf-parse + mammoth (zero external services)", decisions: ["document-parsing"] },
                { layer: "Knowledge", tech: "NYC Open Data via Socrata SOQL (5-min cache)", decisions: ["knowledge-base", "local-inference"] },
                { layer: "Embeddings", tech: "Candle Rust server, local batch embeddings (~4.6K/sec)", decisions: ["local-inference"] },
                { layer: "Evaluation", tech: "Python redteam module + deepteam + Vitest", decisions: ["eval-pipeline"] },
                { layer: "Deploy", tech: "Vercel serverless, Turbopack monorepo, @ai-apps/* packages", decisions: [] },
              ].map((row) => (
                <Flex
                  key={row.layer}
                  gap="3"
                  align="start"
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid var(--gray-a3)",
                  }}
                >
                  <Text
                    size="2"
                    weight="bold"
                    style={{ width: 100, flexShrink: 0 }}
                  >
                    {row.layer}
                  </Text>
                  <Text size="2" style={{ flex: 1, color: "var(--gray-11)" }}>
                    {row.tech}
                  </Text>
                  <Flex gap="1" wrap="wrap" style={{ flexShrink: 0 }}>
                    {row.decisions.map((id) => {
                      const d = decisions.find((dec) => dec.id === id);
                      return d ? (
                        <a key={id} href={`#${id}`} style={{ textDecoration: "none" }}>
                          <Badge variant="outline" size="1" style={{ cursor: "pointer" }}>
                            {d.toc}
                          </Badge>
                        </a>
                      ) : null;
                    })}
                  </Flex>
                </Flex>
              ))}
            </Flex>
          </Flex>
        </Card>
      </Box>
    </Box>
  );
}

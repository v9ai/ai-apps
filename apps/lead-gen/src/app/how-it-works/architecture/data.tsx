import type { Paper, Stat, TechnicalDetail, ExtraSection } from "@ai-apps/ui/how-it-works";

// ─── Technical Foundations (the stack) ──────────────────────────────

export const papers: Paper[] = [
  {
    slug: "next16",
    number: 1,
    title: "Next.js 16 App Router + React 19",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2026,
    finding: "Server components wrapping client islands (*-client.tsx). Radix Themes 3.3 for the design system; PandaCSS 1.9 for CSS-in-JS recipes.",
    relevance: "Every route under /dashboard, /companies, /contacts, /how-it-works is this shape — server layout, client interactivity, shared theme provider at the root.",
    url: "https://nextjs.org/docs/app",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "apollo",
    number: 2,
    title: "Apollo Server 5 + Apollo Client 3.14",
    category: "GraphQL",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Apollo GraphQL",
    year: 2025,
    finding: "Server 5.3 on @as-integrations/next, Client 3.14 with per-collection cache merge policies and GraphQL Code Generator 6.1 for typed hooks + resolver types.",
    relevance: "The boundary between browser and data. Schema in schema/** (16 domain dirs); resolvers in src/apollo/resolvers/ (23 modules); 18 DataLoaders in src/apollo/loaders.ts.",
    url: "https://www.apollographql.com/docs/apollo-server",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "drizzle",
    number: 3,
    title: "Drizzle ORM 0.45 + Neon serverless",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Drizzle Team / Neon",
    year: 2025,
    finding: "Typed schema in src/db/schema.ts, branch-aware migrations via drizzle-kit, serverless Postgres over HTTP via @neondatabase/serverless 1.0.",
    relevance: "Single source of truth for companies, contacts, contact_emails, received_emails, intent_signals, products, company_product_signals. jsonb everywhere the LLM touches.",
    url: "https://orm.drizzle.team/docs/overview",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "better-auth",
    number: 4,
    title: "Better Auth + admin guards",
    category: "Auth",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "@ai-apps/auth",
    year: 2025,
    finding: "Session middleware populates context.userId + context.userEmail; mutations call isAdminEmail(context.userEmail) inline. No role tables — admin is an allow-list in src/lib/admin.ts.",
    relevance: "Enough security for a single-operator tool; explicitly not enough for multi-tenant (see Known Issues in CLAUDE.md: no CORS, no query complexity limits).",
    url: "https://www.better-auth.com",
    categoryColor: "var(--red-9)",
  },
  {
    slug: "rust-leadgen",
    number: 5,
    title: "crates/leadgen (Rust)",
    category: "Rust",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "This repo",
    year: 2026,
    finding: "Smart-crawl + NER/VLM/LLM cascade + AdaptiveUrlScorer (a lightweight reward loop). Qwen vision/text as the LLM fallback below 30% NER confidence. Entity resolution writes rows into Neon's companies table.",
    relevance: "The discovery half of the funnel. Takes a domain seed file and emits enriched companies with canonical_domain, category, ai_tier, and a Tantivy full-text index on the side.",
    url: "https://github.com/",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "langgraph",
    number: 6,
    title: "LangGraph + FastAPI",
    category: "AI/ML",
    wordCount: 0,
    readingTimeMin: 3,
    authors: "LangChain",
    year: 2025,
    finding: "22 graphs declared in backend/langgraph.json. Same Python runs under `langgraph dev` (local, in-memory) and inside the HF/Cloudflare container (FastAPI + AsyncPostgresSaver on Neon).",
    relevance: "Every LLM call in the product goes through a graph. Five core graphs (email_compose, email_reply, email_outreach, admin_chat, text_to_sql) + 17 specialized agents.",
    url: "https://langchain-ai.github.io/langgraph/",
    categoryColor: "var(--violet-9)",
  },
  {
    slug: "candle",
    number: 7,
    title: "Candle + MLX (local inference)",
    category: "AI/ML",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "HuggingFace / Apple",
    year: 2025,
    finding: "BGE-M3 (1024-dim) embeddings via Candle/Metal in crates/icp-embed; MLX fine-tunes contact-to-product LoRA adapters. Stored as pgvector with HNSW cosine index.",
    relevance: "Keeps the hot path off cloud LLM APIs. Title classifier runs sub-100ms inside resolvers; LoRA persona ranking is gated by a logreg prefilter so it only fires on qualified contacts.",
    url: "https://github.com/huggingface/candle",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "resend",
    number: 8,
    title: "Resend + Svix webhooks",
    category: "Email",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Resend",
    year: 2025,
    finding: "Outbound send via Resend API with In-Reply-To threading; inbound via Svix-signed webhook. Per-contact CPN alias routes replies through a single {alias}@vadim.blog namespace — no per-contact DNS.",
    relevance: "The outreach half of the funnel. contact_emails owns outbound; received_emails owns inbound; matched_outbound_id + in_reply_to_received_id glue the threads back together.",
    url: "https://resend.com/docs",
    categoryColor: "var(--cyan-9)",
  },
  {
    slug: "deepseek",
    number: 9,
    title: "DeepSeek chat + reasoner",
    category: "AI/ML",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "DeepSeek",
    year: 2025,
    finding: "DeepSeek chat ($0.27/$1.10 per 1M tok) for summary nodes; deepseek-reasoner ($0.55/$2.19) for value-metric / pricing / GTM pillars. Per-node token and cost telemetry aggregates into product_intel_runs.total_cost_usd.",
    relevance: "Cheap-first model routing is an enforced rule, not a convention — strategy-enforcer.ts Rule 2 blocks any LLM call that isn't schema-constrained (Pydantic server-side, Zod client-side).",
    url: "https://api-docs.deepseek.com",
    categoryColor: "var(--iris-9)",
  },
  {
    slug: "claude-code",
    number: 10,
    title: "Claude Code agent teams",
    category: "Agents",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Anthropic / this repo",
    year: 2026,
    finding: "20 SKILL.md files across four teams: improve-* (5, self-improvement toward a remote AI role), codefix-* (6, code quality), pipeline-* (6, lead-gen batch cycles), research-* (3, company intel).",
    relevance: "The meta layer. stop_hook.py scores every session; low-scoring runs auto-queue improvement work. Phase detection (BUILDING / IMPROVEMENT / SATURATION / COLLAPSE_RISK) gates what each team may do next.",
    url: "https://docs.claude.com/claude-code",
    categoryColor: "var(--violet-9)",
  },
];

// ─── Metrics ────────────────────────────────────────────────────────

export const stats: Stat[] = [
  { number: "10", label: "Architectural layers surveyed by parallel Explore subagents" },
  { number: "22", label: "LangGraph graphs in backend/langgraph.json (5 core + 17 specialized)" },
  { number: "23", label: "Resolver modules under src/apollo/resolvers/" },
  { number: "18", label: "DataLoaders with a 2 ms batch scheduler (src/apollo/loaders.ts)" },
  { number: "16", label: "Domain-bounded schema subdirectories in schema/**" },
  { number: "1024", label: "BGE-M3 embedding dimension via Candle/Metal, stored as pgvector + HNSW" },
  { number: "<100ms", label: "Title-based authority scoring inside resolvers (no cloud LLM call)" },
  { number: "0", label: "Per-contact DNS records — one CPN alias on vadim.blog routes all replies" },
  { number: "20", label: "Claude Code team skills: improve-* (5) + codefix-* (6) + pipeline-* (6) + research-* (3)" },
  { number: "3", label: "Team orchestrator commands: /improve, /codefix, /agents (pipeline | research)" },
  { number: "7", label: "Strategy-enforcer rules (eval, grounding, taxonomy, multi-model, spec, observability, HITL)" },
];

// ─── Technical Details ──────────────────────────────────────────────

export const technicalDetails: TechnicalDetail[] = [
  {
    type: "table",
    heading: "The 10 layers at a glance",
    description: "One Explore subagent per layer. Each reported a 2-sentence summary, the files that prove it, the stack, and the one non-obvious insight. This is the compressed form.",
    items: [
      { label: "1. frontend", value: "Next 16 App Router + React 19 + Radix Themes + Apollo Client 3.14", metadata: { runtime: "Vercel edge/node", pattern: "server → client islands" } },
      { label: "2. graphql_api", value: "Apollo Server 5.3, schema-first, 23 resolver modules, 18 DataLoaders", metadata: { path: "/api/graphql", loaders: "2ms batch" } },
      { label: "3. database", value: "Neon serverless Postgres + Drizzle 0.45, RLS + app.tenant GUC", metadata: { driver: "@neondatabase/serverless", orm: "drizzle-orm@0.45.1" } },
      { label: "4. auth_security", value: "Better Auth sessions + isAdminEmail() inline per mutation", metadata: { guard: "src/lib/admin.ts", gap: "no CORS / complexity" } },
      { label: "5. discovery", value: "Rust crates/leadgen — smart crawl → NER/VLM/LLM cascade → entity resolve", metadata: { fallback: "Qwen", scorer: "AdaptiveUrlScorer" } },
      { label: "6. enrichment_llm", value: "LangGraph nodes + DeepSeek chat/reasoner; Pydantic + Zod grounding", metadata: { routing: "cheap-first", telemetry: "per-node cost" } },
      { label: "7. contacts_ml", value: "NeverBounce verify + BGE-M3 embeddings + LoRA persona tier on pgvector HNSW", metadata: { fast_path: "<100ms", train: "MLX" } },
      { label: "8. outreach_email", value: "Resend outbound + Svix inbound webhook + CPN forwarding alias", metadata: { threading: "In-Reply-To", alias: "{x}@vadim.blog" } },
      { label: "9. langgraph_backend", value: "FastAPI + Uvicorn :7860 + AsyncPostgresSaver on Neon; same code under langgraph dev :8002", metadata: { graphs: "22", endpoint: "/runs/wait", deploy: "Cloudflare Workers" } },
      { label: "10. agent_teams", value: "4 Claude Code teams (improve / codefix / pipeline / research) + stop_hook scoring + strategy-enforcer gate", metadata: { skills: "20", hook: "stop_hook.py", rules: "7" } },
    ],
  },
  {
    type: "code",
    heading: "How the Next.js app talks to the LangGraph backend",
    description: "A single client bridge wraps every graph. Whether the backend is in-memory (langgraph dev :8002), tunneled through Cloudflare, or running as the HF/Workers container, the Next side never changes — only LANGGRAPH_URL does. Bearer-token middleware is plugged into http.app in langgraph.json so auth is uniform across runtimes.",
    code: `// src/lib/langgraph-client.ts
export async function runGraph<TState>(
  graph: GraphName,
  input: unknown,
): Promise<TState> {
  const url = \`\${process.env.LANGGRAPH_URL}/runs/wait\`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.LANGGRAPH_AUTH_TOKEN) {
    headers.Authorization = \`Bearer \${process.env.LANGGRAPH_AUTH_TOKEN}\`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ assistant_id: graph, input }),
  });
  if (!res.ok) throw new Error(\`graph \${graph} failed: \${res.status}\`);
  return res.json();
}`,
  },
  {
    type: "card-grid",
    heading: "Non-obvious design choices",
    description: "The parts of the system that aren't derivable from reading any one file — they only make sense after you've seen what happens when they're absent.",
    items: [
      { label: "DataLoader scheduler = 2ms", value: "Default process.nextTick batches within one tick only. A 2ms timer widens the window enough to catch sibling field resolvers on the same request without any perceivable latency. 5–10× fewer round-trips on list views." },
      { label: "Per-collection cache merges", value: "Apollo InMemoryCache has custom keyArgs + merge functions for contacts, companies, jobs, emailCampaigns — pagination appends rather than replaces. Downside: mutations don't auto-refetch, so cache updates are manual." },
      { label: "isAdminEmail inline, not middleware", value: "Admin guards sit at the top of each mutation resolver rather than a before-middleware. Granular, but one forgotten check is a privilege escalation. Worth auditing on every new mutation." },
      { label: "Dual email tables", value: "contact_emails (outbound, Resend) and received_emails (inbound, Svix webhook) are separate. matched_outbound_id + in_reply_to_received_id bridge them, giving bidirectional thread reconstruction without a single `messages` table." },
      { label: "CPN forwarding alias", value: "Instead of per-contact email addresses, a single namespace on vadim.blog routes all replies. The local part is the CPN token. Zero DNS changes per contact; still one-to-many trackable routing." },
      { label: "AdaptiveUrlScorer as RL-lite", value: "The Rust crawler boosts URL paths whose LLM extractions yielded a contact. No model, no training — just a reward counter. Good enough for 'find the /team page reliably'." },
      { label: "DeepSeek-reasoner only on hard nodes", value: "Value metric, pricing design, GTM pillars use the reasoner ($2.19/1M out). Everything else runs on chat ($1.10/1M out). Routing is declared in the graph, not discovered at runtime." },
      { label: "Grounding is a pre-commit check", value: "strategy-enforcer.ts Rule 2 blocks an LLM call that isn't wrapped in structuredOutput (Pydantic) or response_format (Zod). Drift is caught before the prompt ships, not after it corrupts a jsonb column." },
      { label: "One auth layer, two runtimes", value: "Starlette bearer-token middleware is registered via langgraph.json's http.app key. `langgraph dev` and the container both wear it. No API gateway, no duplicate code." },
      { label: "Phase detection gates agent teams", value: "action-plan.json carries a phase field. stop_hook.py scores sessions. COLLAPSE_RISK stops codefix; BUILDING pushes improve to discover more sources. The alignment is emergent, not rule-enforced." },
    ],
  },
];

// ─── Deep Dive (expandable) ──────────────────────────────────────────

export const extraSections: ExtraSection[] = [
  {
    heading: "Why ten layers, and not three",
    content: "The temptation with a diagram is to compress into frontend / API / data. That hides the three layers where the product actually lives: grounding (Layer 6, the rules that keep LLM output valid), local ML (Layer 7, the reason contact scoring is sub-100ms and costs zero per call), and the agent teams (Layer 10, the meta-loop that keeps the other nine healthy without a human in the loop). Collapsing those into 'API' or 'AI' would leak the most interesting engineering.",
  },
  {
    heading: "The bidirectional email model",
    content: "Most CRMs model email as one messages table with a direction enum. This app doesn't. contact_emails is the outbound log: it references contact_id, template_id, campaign_id, and the Resend message_id. received_emails is the inbound log: it's populated by a Svix-signed webhook and then classified (interested / auto-reply / bounced) by a fine-tuned local model. The pair is joined at read time through matched_outbound_id (inbound knows which outbound it's replying to) and in_reply_to_received_id (outbound knows which inbound it's answering). Threads are reconstructed by traversing this bidirectional edge rather than a linear message list — it survives forwards, auto-replies, and out-of-order delivery.",
    codeBlock: `-- Forward thread (what did we send? what came back?)
SELECT ce.id AS out, re.id AS in
FROM contact_emails ce
LEFT JOIN received_emails re ON re.matched_outbound_id = ce.id
WHERE ce.contact_id = $1
ORDER BY ce.sent_at;`,
  },
  {
    heading: "Cheap-first escalation is a cost contract",
    content: "Every graph node in backend/leadgen_agent declares its model. Summary nodes use deepseek-chat; high-reasoning nodes (value_metric, pricing_design, gtm_pillars) use deepseek-reasoner. Per-node telemetry (input_tokens, output_tokens, cost_usd, latency_ms) flows into graph_meta and terminal nodes persist totals to product_intel_runs.total_cost_usd. The per-node declaration means you can see the cost budget of a run before it starts — and reject runs that exceed a ceiling, which is how the pipeline keeps enrichment under $0.50 / company on average.",
  },
  {
    heading: "Local-first ML, and why not Ollama",
    content: "Contact scoring runs in three passes of decreasing speed: (1) rule-based title classifier (regex + keyword, microseconds, synchronous in the resolver), (2) decision-stump ensemble for engagement probability (twelve features, logistic combination, still sub-millisecond), (3) LoRA persona ranker against the target product's ICP embedding, gated behind a logreg prefilter so it only runs for authority_score ≥ 0.5. BGE-M3 embeddings (1024-dim) are produced by Candle on Metal; LoRA adapters are trained with MLX on the same Mac that serves them. No Ollama: the M1 memory bandwidth (68.25 GB/s) and SLC (8 MB) constraints mean INT8 quantization via mlx_lm.server beats Ollama's Q4_K_M for this workload by a noticeable margin.",
  },
  {
    heading: "The agent teams are the control plane",
    content: "The four Claude Code skill teams aren't sidecars — they're the control plane of the system. Pipeline decides when to run a batch and what vertical to target. Codefix decides what to refactor and when to stop (COLLAPSE_RISK). Improve decides when the discovery pipeline needs more sources and when the classifier needs retraining. Research decides whether a lead is worth outreach before it costs an email send. The meta skill in each team reads all team state and emits an action-plan.json; stop_hook.py scores the session and feeds the lowest-scoring runs back into the improve queue. The system self-corrects without rules engines because phase transitions (BUILDING → IMPROVEMENT → SATURATION) emerge from real data, not declared thresholds.",
  },
  {
    heading: "One bearer middleware, two runtimes",
    content: "The same BearerTokenMiddleware is loaded twice — once in backend/leadgen_agent/custom_app.py (wired via langgraph.json's http.app key so `langgraph dev` picks it up) and once inlined into backend/app.py (via app.add_middleware so Uvicorn picks it up). Both no-op when LANGGRAPH_AUTH_TOKEN is unset; both whitelist liveness paths so HF / Cloudflare tunnel providers can probe without a credential. The duplication is load-bearing — langgraph dev and FastAPI build different Starlette app trees, and a missing class in either would leak the /runs/wait surface.",
    codeBlock: `# backend/leadgen_agent/custom_app.py
class BearerTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        expected = os.environ.get("LANGGRAPH_AUTH_TOKEN")
        if not expected:
            return await call_next(request)
        if request.url.path in _PUBLIC_PATHS:   # {"/ok", "/info"}
            return await call_next(request)
        auth = request.headers.get("authorization", "")
        scheme, _, token = auth.partition(" ")
        if scheme.lower() != "bearer" or token != expected:
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)

app = Starlette(middleware=[Middleware(BearerTokenMiddleware)])`,
  },
  {
    heading: "Phase detection across the four teams",
    content: "Each meta-skill emits a phase label into ~/.claude/state/*-action-plan.json. The labels are team-specific because the teams optimize for different targets — improve-* chases a hiring outcome, codefix-* chases codebase health, pipeline-* chases funnel throughput. The cross-team invariant is: a 'stop' phase (COLLAPSE_RISK / DEGRADED) halts writes, and a 'cold' phase (BUILDING) prioritizes input expansion.",
    codeBlock: `Team         | Phases (in order)                                  | Example trigger
improve-*    | BUILDING → OPTIMIZING → APPLYING → INTERVIEWING    | < 5 AI jobs/week → BUILDING
codefix-*    | IMPROVEMENT → SATURATION → COLLAPSE_RISK           | score drop vs prior cycle → COLLAPSE_RISK
pipeline-*   | BUILDING → FLOWING → BOTTLENECK → SATURATED → DEG. | bounce rate > 15% → DEGRADED
research-*   | ad-hoc (per target, debate protocol)               | contradictory findings → re-debate`,
  },
  {
    heading: "The improvement_queue.json lifecycle",
    content: "Every Claude Code session ends by running .claude/hooks/stop_hook.py (Stop hook). It parses the JSONL transcript, collapses it into turns + tool_calls, sends that summary to claude-haiku-4-5 with a four-dimension rubric (task_completion, tool_efficiency, skill_adherence, routing_accuracy), and if min(scores) < CC_IMPROVE_THRESHOLD (0.65) it enqueues the session under ~/.claude/state/improvement_queue.json using an fcntl-locked tmp→rename for atomicity. When CC_AUTO_IMPROVE=true, stop_hook spawns improvement_agent.py as a detached subprocess which drains the queue, asks Claude Sonnet for concrete fixes, and drops them under ~/.claude/state/improvements/. The next /improve cycle reads that directory as its starting backlog — so the improve team's inbox is populated by the agent's own failures.",
    codeBlock: `# session end  →  .claude/hooks/stop_hook.py
#
# 1. read transcript from transcriptPath
# 2. build_session_summary(msgs)           # turns + tool_calls + model
# 3. score_session(summary)                # haiku-4-5, 4 dims, JSON out
# 4. if min(dim_scores) < CC_IMPROVE_THRESHOLD:
#       enqueue_session(...)               # fcntl lock, atomic rename
#       if CC_AUTO_IMPROVE:
#           subprocess.Popen([improvement_agent.py], detached)
#
# later:  /improve  →  improve-meta reads queue  →  dispatches improve-evolve`,
  },
];

// ─── Node detail map ────────────────────────────────────────────────

export type NodeDetail = {
  description: string;
  tech: { name: string; version?: string }[];
  dataIn: string;
  dataOut: string;
  insight: string;
  color: string;
};

export const nodeDetails: Record<string, NodeDetail> = {
  // Stage 1: frontend
  "fe-next": {
    description: "Next.js 16 App Router is the shell. Every route is a server component by default; anything interactive lives in a sibling *-client.tsx that opts into React 19's client runtime. The root layout wires Radix Themes, the Apollo provider, and the Better Auth session — one place, every route.",
    tech: [{ name: "next", version: "16.1" }, { name: "react", version: "19.1" }, { name: "@radix-ui/themes", version: "3.3" }],
    dataIn: "URL + session cookie",
    dataOut: "HTML shell + hydrated client island",
    insight: "Server-first by default means the interactive surface is small — which means the Apollo cache only has to care about the collections users actually paginate.",
    color: "blue",
  },
  "fe-apollo": {
    description: "Apollo Client 3.14 with GraphQL Code Generator 6.1. Per-collection cache merge policies (contacts, companies, jobs, emailCampaigns) append paginated pages rather than replacing. Generated hooks (useContactsQuery, etc.) carry Zod-matching types end to end.",
    tech: [{ name: "@apollo/client", version: "3.14" }, { name: "graphql-codegen", version: "6.1" }],
    dataIn: "GraphQL operations from components",
    dataOut: "Typed React hooks + normalized cache",
    insight: "Mutations do not auto-refetch queries — cache updates are manual. That's the cost of the per-collection merge policies; list views stay fast and stable, but you have to remember to update the cache after a mutation or the UI looks stale.",
    color: "purple",
  },
  "fe-radix": {
    description: "Radix Themes 3.3 plus PandaCSS 1.9 for recipes. Dark mode is the default. Every /how-it-works/* page shares the same ReactFlow color tokens so stages are visually uniform across pipelines.",
    tech: [{ name: "@radix-ui/themes", version: "3.3" }, { name: "@pandacss/dev", version: "1.9" }],
    dataIn: "Radix primitives + recipe variants",
    dataOut: "Themed React components",
    insight: "Using Radix variables (--gray-2, --violet-9) rather than Tailwind classes keeps the diagram and the page chrome in one coherent palette — swap the theme and nothing breaks.",
    color: "violet",
  },

  // Stage 2: graphql_api
  "gql-server": {
    description: "Apollo Server 5.3 exposed at /api/graphql via @as-integrations/next. The request handler builds a GraphQLContext per call: userId, userEmail, db (Drizzle), and a fresh loaders factory. Rate limiting + session dedup are applied before the resolver layer sees the request.",
    tech: [{ name: "@apollo/server", version: "5.3" }, { name: "@as-integrations/next", version: "4.1" }, { name: "@graphql-tools/schema", version: "10.0" }],
    dataIn: "HTTP POST /api/graphql",
    dataOut: "ExecutionResult",
    insight: "Context is request-scoped — loaders are fresh per request, which is the only safe way to cache within a request without leaking rows across tenants.",
    color: "purple",
  },
  "gql-resolvers": {
    description: "23 resolver modules under src/apollo/resolvers/, one per domain (company, contacts, email-campaigns, email-templates, blocked-companies, received-emails, user-settings, …). Schema is schema-first in schema/**. Generated resolver types from codegen enforce contract at build time.",
    tech: [{ name: "typescript-resolvers", version: "6.1" }, { name: "23 modules" }],
    dataIn: "Parsed AST + context",
    dataOut: "Resolved fields",
    insight: "Schema-first with domain-bounded resolvers: one resolver module per schema subdir. This scales to the next 10 domains without a refactor — the seams are already where you'd want them.",
    color: "violet",
  },
  "gql-loaders": {
    description: "18 DataLoaders in src/apollo/loaders.ts with a custom 2 ms batch scheduler. Tuned batch sizes per entity: 250 for companies, 100 for contacts/per-company children, 10 for user settings. Every field resolver goes through a loader — there are zero direct DB calls from field resolvers.",
    tech: [{ name: "dataloader", version: "2.2" }, { name: "2ms batch scheduler" }],
    dataIn: "Per-field resolver requests",
    dataOut: "Batched DB query results",
    insight: "Default process.nextTick batches only within one tick. A 2 ms scheduler widens the window enough to catch sibling field resolvers on the same request — 5–10× fewer round-trips on list views, no perceivable latency.",
    color: "amber",
  },
  "gql-admin-guard": {
    description: "Every mutation that modifies production data starts with `if (!context.userId || !isAdminEmail(context.userEmail)) throw new Error('Forbidden')`. The allow-list lives in src/lib/admin.ts. No role tables, no RBAC — this is a single-operator tool by design.",
    tech: [{ name: "src/lib/admin.ts" }, { name: "inline guard" }],
    dataIn: "context.userEmail",
    dataOut: "pass / Forbidden",
    insight: "Granular but easy to miss — a new mutation without the guard is a privilege escalation. The trade-off vs. a middleware is explicitness: you see the check at the top of the resolver.",
    color: "red",
  },

  // Stage 3: database
  "db-neon": {
    description: "Neon serverless Postgres over HTTP via @neondatabase/serverless 1.0. Multi-tenant via row-level security keyed on a per-request `app.tenant` GUC. Branching on Neon gives cheap ephemeral databases for migrations and evals.",
    tech: [{ name: "@neondatabase/serverless", version: "1.0" }, { name: "Postgres 15+" }, { name: "RLS + app.tenant" }],
    dataIn: "Drizzle query builder",
    dataOut: "typed rows",
    insight: "Per-request GUC beats a where-clause convention — missing a tenant filter in SQL is a data leak; missing a tenant filter when the DB is enforcing RLS is an empty result.",
    color: "cyan",
  },
  "db-drizzle": {
    description: "Drizzle ORM 0.45 with drizzle-kit migrations. Schema lives in src/db/schema.ts. Types are derived (typeof companies.$inferSelect), not hand-written. Raw SQL is reserved for pgvector operations where Drizzle's builder is incomplete.",
    tech: [{ name: "drizzle-orm", version: "0.45" }, { name: "drizzle-kit", version: "0.31" }],
    dataIn: "schema + query expressions",
    dataOut: "typed Postgres calls",
    insight: "Re-exports from @ai-apps/company-intel mean the same companies/contacts schema serves multiple apps — schema drift is caught by TypeScript at the package boundary rather than at runtime.",
    color: "green",
  },
  "db-companies": {
    description: "Core company intelligence. Columns: canonical_domain, category, ai_tier, icp_embedding (pgvector, 1024-dim), gtm_analysis (jsonb), pricing_strategy (jsonb), signals (jsonb). HNSW cosine index on icp_embedding for semantic ICP search.",
    tech: [{ name: "companies table" }, { name: "pgvector HNSW" }],
    dataIn: "enrichment writes",
    dataOut: "semantic search + resolver reads",
    insight: "jsonb for evolving LLM output shapes (pricing_strategy, gtm_analysis) absorbs schema drift without migrations — the price is validation has to live in Zod/Pydantic on both ends.",
    color: "green",
  },
  "db-contacts": {
    description: "One contact row per person per company. Fields: email, authority_score, next_touch_score, lora_tier, ai_profile (jsonb), forwarding_alias (CPN). Tagged provenance array (src:* / skill:* / seniority:*) lets the UI explain why a contact surfaced.",
    tech: [{ name: "contacts table" }, { name: "tag provenance" }],
    dataIn: "contact discovery writes",
    dataOut: "outreach reads + scoring inputs",
    insight: "forwarding_alias being a column (not a join) keeps inbound routing O(1) — the webhook extracts the local part and does a direct indexed lookup.",
    color: "green",
  },
  "db-emails": {
    description: "Dual email tracking: contact_emails for outbound (Resend message_id, template_id, campaign_id, in_reply_to_received_id); received_emails for inbound (matched_outbound_id, classification, embedding). Threads are reconstructed through the bidirectional edge.",
    tech: [{ name: "contact_emails" }, { name: "received_emails" }],
    dataIn: "Resend sends + Svix webhooks",
    dataOut: "thread reconstruction + reply detection",
    insight: "No single `messages` table. The split forces you to model direction explicitly, which is the only way reply matching stays reliable when auto-replies and forwards enter the picture.",
    color: "green",
  },

  // Stage 4: auth_security
  "auth-better": {
    description: "Better Auth via the @ai-apps/auth package. Session cookie → context.userId + context.userEmail on every GraphQL request. No role tables; admin is a string-match allow-list in src/lib/admin.ts.",
    tech: [{ name: "@ai-apps/auth" }, { name: "Better Auth" }],
    dataIn: "session cookie",
    dataOut: "userId + userEmail on context",
    insight: "Single-operator product → allow-list is enough. If this ever becomes multi-tenant, the guard pattern has to move from a string match to a proper role check at the same boundary — the one thing that stays is that the boundary is per-mutation, not per-middleware.",
    color: "red",
  },
  "auth-admin": {
    description: "isAdminEmail(context.userEmail) guards every mutation that modifies production data. The check is explicit at the top of each mutation resolver. Missing this call on a new mutation is the only way a non-admin writes.",
    tech: [{ name: "src/lib/admin.ts" }, { name: "inline check" }],
    dataIn: "context.userEmail",
    dataOut: "pass / throw",
    insight: "This is the security boundary the system actually depends on. CORS and query complexity limits are not implemented (see Known Issues in CLAUDE.md) — the product is behind an admin login and the threat model reflects that.",
    color: "red",
  },
  "auth-gap": {
    description: "Known open gaps: no CORS policy on /api/graphql; no GraphQL query depth/complexity limit; ignoreBuildErrors: true in next.config.ts masks TypeScript errors at build. All three are listed in CLAUDE.md under Known Issues and are acceptable under the single-operator threat model, not outside it.",
    tech: [{ name: "CORS missing" }, { name: "no complexity gate" }, { name: "ignoreBuildErrors" }],
    dataIn: "any origin / any query",
    dataOut: "served anyway",
    insight: "The gaps are documented, not hidden. That's the important part — next operator knows exactly what they're signing up for when they broaden the threat model.",
    color: "red",
  },

  // Stage 5: discovery
  "disc-seeds": {
    description: "Domain seed files (plain-text `domains.txt`) are the entry. Optional sources: Brave Search API, GitHub org/repo scans, external pipeline JSON imports. Dedup happens on canonical_domain before any crawl starts.",
    tech: [{ name: "domains.txt" }, { name: "Brave Search" }, { name: "GitHub API" }],
    dataIn: "domain lists",
    dataOut: "deduped canonical_domain set",
    insight: "Seeds are the cheapest gate in the pipeline — every wrong domain here costs a full crawl later. Dedup on canonical form (not input string) catches `acme.ai`, `www.acme.ai`, `https://acme.ai/` as one.",
    color: "teal",
  },
  "disc-crawler": {
    description: "Rust smart crawler (crates/leadgen). Adaptive URL scheduler prioritizes paths likely to yield contacts: /team, /about, /careers, /leadership, /people. Robots + rate limits are honored; pages are rendered via headless Chromium when needed.",
    tech: [{ name: "reqwest + Tokio" }, { name: "headless Chromium" }, { name: "adaptive scheduler" }],
    dataIn: "seed domains",
    dataOut: "rendered page texts",
    insight: "The AdaptiveUrlScorer learns from LLM extraction outcomes — URL paths whose extraction yielded contacts get boosted in future crawls of similar domains. Reward-loop behavior without a trained model.",
    color: "orange",
  },
  "disc-extract": {
    description: "Three-stage extraction cascade. NER (Rust contact_ner.rs) runs first; if confidence < 30%, a VLM pass on the rendered page image runs; if still ambiguous, Qwen (local) runs as LLM fallback. Each stage is strictly more expensive than the last.",
    tech: [{ name: "contact_ner.rs" }, { name: "VLM (Qwen-VL)" }, { name: "Qwen text fallback" }],
    dataIn: "rendered page text + screenshot",
    dataOut: "extracted entities + confidence",
    insight: "Confidence gating between stages keeps the expected cost low. NER covers ~80% of team pages; VLM + LLM together handle the rest without running them on every page.",
    color: "amber",
  },
  "disc-resolve": {
    description: "Entity resolution against the existing companies table. Canonicalizes the domain, matches on fuzzy name + domain, and either updates an existing row or inserts a new one with status implicit in ai_tier (0=unknown, 1=ai_first, 2=ai_native).",
    tech: [{ name: "entity-resolve crate" }, { name: "Drizzle upsert" }, { name: "Tantivy index" }],
    dataIn: "extracted entities",
    dataOut: "companies row with ai_tier",
    insight: "ai_tier being a small enum instead of a boolean 'is_ai_company' keeps the door open for 'uses AI' vs 'builds AI' distinctions downstream — the pipeline doesn't collapse a useful gradient.",
    color: "teal",
  },

  // Stage 6: enrichment_llm
  "enr-graph": {
    description: "LangGraph nodes orchestrate enrichment: gather_context → category_detect → ai_tier_classify → pricing_analyze → gtm_pillars → persist. Each node declares its model; per-node telemetry (tokens, cost_usd, latency_ms) aggregates into graph_meta and lands in product_intel_runs.",
    tech: [{ name: "langgraph", version: "0.4+" }, { name: "StateGraph" }, { name: "per-node telemetry" }],
    dataIn: "company row",
    dataOut: "enriched row + cost ledger",
    insight: "Cost is observable before the run ends — terminal nodes persist totals and intermediate nodes emit per-call telemetry, so you can kill a run that's about to blow a budget.",
    color: "violet",
  },
  "enr-cheap": {
    description: "DeepSeek chat handles summary nodes (context gathering, category detection, ai_tier classification). Cost: $0.27/M input, $1.10/M output. Response format constrained via Pydantic schemas passed through the LangChain OpenAI adapter.",
    tech: [{ name: "deepseek-chat" }, { name: "pydantic schema" }],
    dataIn: "prompt + schema",
    dataOut: "schema-valid JSON",
    insight: "Cheap-first is the default, not an optimization — strategy-enforcer.ts Rule 2 rejects prompts that don't bind to a schema, which means cheap models can't drift into free-text outputs.",
    color: "iris",
  },
  "enr-reasoner": {
    description: "deepseek-reasoner is reserved for the reasoning-heavy nodes: value_metric, pricing_design, gtm_pillars. Cost: $0.55/M input, $2.19/M output. Gated by a confidence threshold on the cheap model's output — escalation is declared in the graph, not picked at runtime.",
    tech: [{ name: "deepseek-reasoner" }, { name: "confidence gate" }],
    dataIn: "pre-processed context + schema",
    dataOut: "reasoned structured output",
    insight: "Escalation declared in the graph (not the LLM's self-report) means cost is deterministic per company — you don't get surprise $5 runs because the cheap model decided it was unsure.",
    color: "violet",
  },
  "enr-ground": {
    description: "Grounding enforcement. On the Python side, every LLM call uses Pydantic model_dump() as response_format. On the TypeScript side, every generateObject call uses Zod. strategy-enforcer.ts Rule 2 blocks any PR that introduces a raw chat.completions.create without either.",
    tech: [{ name: "pydantic" }, { name: "zod" }, { name: "strategy-enforcer" }],
    dataIn: "LLM output",
    dataOut: "schema-validated object",
    insight: "Pre-commit blocking, not post-hoc monitoring — drift is caught before the prompt ships to prod. This is why jsonb columns rarely contain shape-broken data.",
    color: "amber",
  },

  // Stage 7: contacts_ml
  "cm-discover": {
    description: "Candidates are synthesized by cleanForEmail-normalized pattern generation in src/lib/email/verification.ts — two patterns per contact (`{first}.{last}@domain` and `{first}@domain`) capped via a Set to keep NeverBounce call volume bounded. Once one address verifies, inferEmailPattern() derives the domain's convention (FirstDotLast, FirstInitialLast, …) and caches it in a per-process Map so sibling contacts at that domain generate in one shot instead of probing.",
    tech: [{ name: "verification.ts" }, { name: "pattern cache" }, { name: "≤2 per contact" }],
    dataIn: "{ first_name, last_name, domain }",
    dataOut: "string[] candidate emails (≤ 2)",
    insight: "The two-candidate cap is load-bearing — NeverBounce bills per lookup, and the first verified hit teaches the pattern cache, so every later contact at the same domain costs exactly one API call regardless of how many address shapes the company could be using.",
    color: "cyan",
  },
  "cm-verify": {
    description: "NeverBounceClient (src/lib/email/verification.ts) hits api.neverbounce.com/v4/single/check with 150 ms rate-limited spacing. Results cache in-process for 1 hour (verificationCache TTL) with a 10-minute eviction sweep. The email-verifier Rust crate (hickory-resolver 0.24 + SMTP probe) is the fallback when API credits run out. `valid`, `catchall`, and `unknown` all count as verified; `invalid` and `disposable` get dropped.",
    tech: [{ name: "NeverBounce v4" }, { name: "email-verifier crate" }, { name: "hickory-resolver 0.24" }, { name: "1h TTL" }],
    dataIn: "candidate email (string)",
    dataOut: "VerificationOutcome { verified, rawResult, flags[] }",
    insight: "The catch-all accept surprises people. The business-critical metric is not perfect validity — it's Resend's bounce ratio staying under the suppression threshold. Accepting catch-all and letting the first send + webhook classify bounces downstream keeps deliverability higher than pre-filtering catch-all out.",
    color: "green",
  },
  "cm-authority": {
    description: "Rule-based classifier in src/ml/contact-classifier.ts runs synchronously inside resolvers. 8 seniority buckets (C-level, Founder, Partner, VP, Director, Manager, Senior, IC) with weighted regex patterns; authority_score is mapped 1.0 → 0.10. HR/Recruiting contacts receive a 0.4× gatekeeper penalty. The decision-maker flag fires at authority_score ≥ 0.70. Sub-100 ms, zero cloud calls.",
    tech: [{ name: "contact-classifier.ts" }, { name: "8 seniority classes" }, { name: "10 departments" }, { name: "sync in resolver" }],
    dataIn: "contact.position (string)",
    dataOut: "{ seniority, department, authority_score, isDecisionMaker }",
    insight: "The gatekeeper penalty is the single most important knob. A VP of HR has nominal authority 0.85, but after the 0.4× multiplier lands at 0.34 — below the 0.70 DM threshold and also below the 0.50 LoRA gate. That one constant is why outreach doesn't waste sends on recruiters who can't buy.",
    color: "indigo",
  },
  "cm-engage": {
    description: "Gradient-boosted decision stump ensemble in src/lib/ml/engagement-predictor.ts. Exactly 12 features: authority_score, days_since_last_email, total_emails_sent, open_rate, reply_rate, sequence_number, intent_score, lead_temperature, hour_sin, hour_cos, company_ai_tier, email_verified. Stumps vote additively through a logistic link on log-odds; training fits pseudo-residuals of log-loss. Sub-millisecond inference per contact.",
    tech: [{ name: "engagement-predictor.ts" }, { name: "12 features" }, { name: "logistic link" }, { name: "sub-ms" }],
    dataIn: "Float32Array(12)",
    dataOut: "{ pOpen, pReply, confidence }",
    insight: "Single-split stumps are nearly impossible to overfit and the top-3 active stumps per prediction can be printed inline — that's how 'why did you skip this contact?' becomes an answerable question without a SHAP library. Sinusoidal hour encoding (hour_sin/hour_cos) captures the US-business-hours effect without categorical blowup.",
    color: "amber",
  },
  "cm-lora": {
    description: "scoreContactLora() in src/lib/langgraph-client.ts POSTs to the `score_contact` graph, which forwards to the lora-serve Space — a Qwen2.5-1.5B-Instruct base merged with `v9ai/contact-score-qwen-1.5b-lora`, quantized to Q4_K_M GGUF, served via llama-cpp-python. Returns { tier: A|B|C|D, score, reasons[] }, persisted to contacts.lora_tier + lora_reasons jsonb + lora_scored_at. batchScoreContactsLora prefilters on `authority_score >= 0.5` and fans out 4-way concurrency.",
    tech: [{ name: "Qwen2.5-1.5B-Instruct" }, { name: "LoRA adapter" }, { name: "Q4_K_M GGUF" }, { name: "llama-cpp-python" }],
    dataIn: "contact_id → serialized profile text",
    dataOut: "{ tier, score, reasons }",
    insight: "The `authority_score >= 0.5` gate at mutations.ts:1150 is the cost contract. Senior/IC contacts (authority 0.10–0.25) — typically ~80% of any scraped team page — skip LoRA entirely. That one WHERE clause cuts Space compute by an order of magnitude and keeps cold-start frequency low enough that the free HF tier stays viable.",
    color: "amber",
  },
  "cm-vector": {
    description: "Two pgvector(1024) columns from migration 0073: `products.icp_embedding` (from the product's ICP rubric) and `companies.profile_embedding` (from home/about/description text). Both HNSW-indexed with `vector_cosine_ops` because embeddings are L2-normalized at produce time in crates/icp-embed/src/embedder.rs. BGE-M3 on Candle 0.9 + Metal generates them locally — zero outbound API calls. A legacy `companies.embedding vector(384)` column is retained for older consumers.",
    tech: [{ name: "pgvector" }, { name: "HNSW + vector_cosine_ops" }, { name: "BGE-M3 (1024-dim)" }, { name: "candle-core 0.9" }],
    dataIn: "text (home/about/icp_analysis)",
    dataOut: "Vec<f32>[1024] (L2-normalized)",
    insight: "Two indexes, one JOIN. A top-K company lookup for a product is a single query: `ORDER BY c.profile_embedding <=> p.icp_embedding`. The relational and vector worlds stay in the same transaction — which is why there's no LanceDB in the stack. At this scale the operational cost of a second store outweighs any indexing speedup.",
    color: "cyan",
  },

  // Stage 8: outreach_email
  "out-resend": {
    description: "Outbound email via Resend API. Headers include In-Reply-To + References when the send is a reply. Mustache-style {{name}} templating happens server-side before Resend sees the body. Writes to contact_emails.",
    tech: [{ name: "Resend" }, { name: "mustache" }, { name: "In-Reply-To" }],
    dataIn: "campaign + template + contact",
    dataOut: "Resend message_id",
    insight: "Threading headers (In-Reply-To + References) are what make replies land in the same Gmail thread — without them, Gmail shows the reply as a new conversation and the open/reply attribution breaks.",
    color: "cyan",
  },
  "out-cpn": {
    description: "CPN (Custom Personalized Namespace) forwarding alias. Each contact gets a token; the Reply-To header becomes {token}@vadim.blog. Inbound mail to that domain is routed to the webhook, which extracts the local part and does an indexed lookup. One DNS record serves all contacts.",
    tech: [{ name: "vadim.blog catch-all" }, { name: "CPN token" }],
    dataIn: "contact.forwarding_alias",
    dataOut: "Reply-To header",
    insight: "One-to-many routing on a single domain avoids per-contact DNS — crucial because each contact added shouldn't cost a DNS write. The token becomes the primary key for inbound matching.",
    color: "teal",
  },
  "out-webhook": {
    description: "Inbound Resend webhook, signature-verified via Svix. Events: sent, delivered, bounced, received. 'received' triggers process-received.ts which extracts the CPN alias, matches the contact, classifies the message (interested / auto-reply / bounced / question) with a fine-tuned local model, and writes received_emails.",
    tech: [{ name: "Svix signing" }, { name: "process-received.ts" }],
    dataIn: "Resend webhook POST",
    dataOut: "received_emails row + classification",
    insight: "Svix signature check is the only auth on this endpoint — dropping it would let anyone post a fake inbound email. The signing secret is in env, not code.",
    color: "cyan",
  },
  "out-langgraph": {
    description: "Composition and reply drafting go through LangGraph. composeEmail produces {subject, body} from a template + contact context; generateEmailReply produces a reply draft given the inbound message, tone, and whether to include a Calendly link. Both graphs are cost-attributed to the campaign.",
    tech: [{ name: "email_compose graph" }, { name: "email_reply graph" }, { name: "email_outreach graph" }],
    dataIn: "template + contact + inbound (if reply)",
    dataOut: "draft {subject, body}",
    insight: "Composition as a graph (not a single prompt) lets gather_context and polish run as separate nodes with separate models — context assembly uses the cheap model, polish uses the reasoner.",
    color: "violet",
  },

  // Stage 9: langgraph_backend
  "lg-runtime": {
    description: "Python backend with 22 graphs declared in backend/langgraph.json. Local dev uses `langgraph dev` on :8002 (in-memory checkpointer). Production is backend/app.py served by Uvicorn as a single-worker FastAPI on :7860, with AsyncPostgresSaver (langgraph.checkpoint.postgres.aio) pointed at Neon's pooled connection so thread state survives restarts and free-tier sleep/wake cycles. Same graph code; flipping LANGGRAPH_URL at the Next.js client is the only cutover.",
    tech: [{ name: "langgraph", version: "0.4+" }, { name: "FastAPI" }, { name: "Uvicorn" }, { name: "AsyncPostgresSaver" }],
    dataIn: "assistant_id + input",
    dataOut: "final graph state",
    insight: "Single Uvicorn worker is intentional, not a limitation — it keeps AsyncPostgresSaver's connection pool and app.state.graphs dict coherent across in-flight requests. Scaling is horizontal (more containers), not vertical.",
    color: "violet",
  },
  "lg-core": {
    description: "Five core graphs power the product surfaces: email_compose (gather_context → draft → format), email_reply (analyze_inbound → draft → polish), email_outreach (lookup_contact → match_persona → select_template → draft_html), admin_chat (JSON tool-router for count_rows / inspect_schema / query_db), and text_to_sql (understand → identify_tables → generate → validate, read-only SELECT enforced). Seventeen specialized graphs sit alongside them — deep_icp, icp_team, competitors_team, pricing, gtm, positioning, product_intel, freshness, lead_gen_team, classify_paper, contact_enrich (+ sales and paper-author variants), deep_scrape — bringing the declared total in langgraph.json to 22.",
    tech: [{ name: "5 core graphs" }, { name: "17 specialized" }, { name: "22 declared" }],
    dataIn: "graph input state",
    dataOut: "graph output state",
    insight: "admin_chat uses a JSON tool-router instead of ReAct to avoid LLM tool-call malformed-JSON failures — a whole class of bug worth designing around rather than retrying through.",
    color: "violet",
  },
  "lg-endpoint": {
    description: "POST /runs/wait is the synchronous entry point — runGraph in src/lib/langgraph-client.ts forwards { assistant_id, input, thread_id? } exactly as the hosted LangGraph API expects, so the Next.js client is runtime-agnostic. Long-running graphs (product_intel, gtm, pricing) use the async variant via /threads + /threads/{tid}/runs + a webhook callback implemented in leadgen_agent.notify, because Cloudflare Workers cap response wall time below their 5+ minute runtime.",
    tech: [{ name: "/runs/wait" }, { name: "/threads/{id}/runs" }, { name: "webhook callback" }],
    dataIn: "{ assistant_id, input, thread_id? }",
    dataOut: "final state or run_id",
    insight: "In-process _async_runs dict tracks background runs — safe only because wrangler pins max_instances=1 and AsyncPostgresSaver is the source of truth; a restart loses the lookup but the GraphQL stale-run sweeper recovers.",
    color: "iris",
  },
  "lg-auth": {
    description: "Starlette BearerTokenMiddleware gates every non-health request when LANGGRAPH_AUTH_TOKEN is set. Under `langgraph dev`, it's wired in via the http.app key in langgraph.json → leadgen_agent.custom_app:app (public paths: /ok, /info). Under FastAPI, the identical class is inlined in backend/app.py and added with app.add_middleware (public paths: /health, /ok). Duplication is deliberate — the two runtimes load different Starlette app trees, and a missing token in either would expose a shared-secret surface to HF Spaces, Cloudflare tunnels, or any uptime prober.",
    tech: [{ name: "Starlette middleware" }, { name: "langgraph.json http.app" }, { name: "FastAPI add_middleware" }],
    dataIn: "Authorization: Bearer <token>",
    dataOut: "pass / 401 Unauthorized",
    insight: "No separate API gateway. The auth layer travels with the code whether it runs under langgraph dev, uvicorn, or a Cloudflare Workers container — and because both runtimes whitelist /health|/ok for probes, tunnel providers can still check liveness without a credential.",
    color: "red",
  },
  "lg-deploy": {
    description: "Current deploy target is Cloudflare Workers Containers via wrangler — backend/wrangler.jsonc binds a LeadgenContainer Durable Object to the Dockerfile (python:3.12-slim + Playwright Chromium), instance_type standard-1, max_instances=1. HuggingFace Spaces was the original target (Docker SDK) but was abandoned after an auto-abuse flag; the Dockerfile still reflects the HF constraint of binding 0.0.0.0:7860. DATABASE_URL points at the Neon pooled URL (hostname contains '-pooler') for AsyncPostgresSaver checkpointing.",
    tech: [{ name: "Cloudflare Workers" }, { name: "wrangler" }, { name: "Dockerfile" }, { name: "Playwright Chromium" }],
    dataIn: "container image + Neon URL",
    dataOut: "live FastAPI service on lead-gen-langgraph.eeeew.workers.dev",
    insight: "Checkpointing on Neon (not local SQLite) is what makes max_instances=1 survivable — the container restarts without losing thread state, so long-running graph runs that straddle a deploy bounce resume rather than restart from scratch.",
    color: "violet",
  },

  // Stage 10: agent_teams
  "at-improve": {
    description: "Self-improvement team under .claude/skills/improve-*/SKILL.md: improve-mine (Pipeline Monitor — is the pipeline healthy?), improve-audit (Discovery Expander — find more AI-engineering sources), improve-evolve (Classifier Tuner — reduce missed remote-global matches), improve-apply (Skill Optimizer — better AI/ML taxonomy + extraction), improve-meta (Strategy Brain — coordinate toward the goal: get hired). Invoked by /improve [status|discover|classify|skills]; meta reads all sibling state files in ~/.claude/state/ and emits action-plan.json with a phase label.",
    tech: [{ name: "5 skills" }, { name: "/improve orchestrator" }, { name: "phase-aware" }],
    dataIn: "jobs pipeline state + session transcripts",
    dataOut: "~/.claude/state/meta-state.json + action-plan.json",
    insight: "Phase labels are team-specific: this team uses BUILDING (<5 AI jobs/week) → OPTIMIZING → APPLYING → INTERVIEWING, which is goal-shaped rather than code-shaped. The Strategy Brain reasons in terms of 'does this help Vadim get hired?', not 'is this a clean refactor?'.",
    color: "violet",
  },
  "at-codefix": {
    description: "Codebase quality team under .claude/skills/codefix-*/SKILL.md: codefix-mine (mine transcripts for patterns), codefix-audit (file:line findings), codefix-evolve (improve SKILL.md + CLAUDE.md), codefix-apply (perf/types/security/dead-code edits), codefix-verify (builds + regressions), codefix-meta (ROMA/DyTopo/CASTER-grounded coordinator). Pipeline: mine → audit → evolve/apply → verify. Hard caps per /codefix cycle: 3 code changes + 2 skill evolutions; verification is mandatory after every apply.",
    tech: [{ name: "6 skills" }, { name: "/codefix orchestrator" }, { name: "verification gate" }],
    dataIn: "session transcripts + audit findings",
    dataOut: "code edits + skill improvements + verification report",
    insight: "codefix-meta's phase detection is IMPROVEMENT → SATURATION → COLLAPSE_RISK. COLLAPSE_RISK halts the team entirely when recent edits start regressing; self-limiting is the critical property that keeps the loop from grinding the codebase into dust.",
    color: "amber",
  },
  "at-pipeline": {
    description: "B2B lead-gen pipeline team under .claude/skills/pipeline-*/SKILL.md: pipeline-meta (Coordinator — batch strategy, ICP targeting), pipeline-discover (Discovery Scout), pipeline-enrich (category + AI tier + ATS + stack), pipeline-contacts (email discovery + verification + scoring), pipeline-outreach (drafting + campaigns, plan-approval required), pipeline-qa (dedup + deliverability + score validation). Invoked by /agents pipeline [discover|enrich|outreach|status]; full cycle is discover → enrich → contacts + qa-audit → outreach.",
    tech: [{ name: "6 skills" }, { name: "/agents pipeline" }, { name: "plan-approval gate" }],
    dataIn: "ICP + batch strategy",
    dataOut: "enriched contacts + draft campaigns",
    insight: "Phase labels here are BUILDING → FLOWING → BOTTLENECK → SATURATED → DEGRADED. Outreach requires explicit plan approval before any email send — the other stages run autonomously, so the human stays in the loop exactly where it matters (anything that hits an inbox).",
    color: "green",
  },
  "at-research": {
    description: "Ad-hoc research squad under .claude/skills/research-*/SKILL.md: research-analyst (tech stack, funding, AI adoption), research-hiring (open roles, ATS boards, team growth), research-icp (score against ICP: remote? AI? stage? DM access?). Invoked by /agents research {company} for full competing-hypotheses debate, /agents research batch {c1 c2 ...} for parallel squads with comparative summary, or /agents research score {company} for single-agent ICP scoring.",
    tech: [{ name: "3 skills" }, { name: "/agents research" }, { name: "competing hypotheses" }],
    dataIn: "company name / slug",
    dataOut: "GO / NO-GO / NEEDS-MORE-INFO + outreach strategy",
    insight: "Debate protocol: agents cross-read each other's findings, challenge weak claims, resolve conflicts, update confidence. Letting them agree is cheaper but worse — forcing adversarial challenge is what makes the verdict actionable rather than sycophantic.",
    color: "blue",
  },
  "at-hook": {
    description: "stop_hook.py runs after every Claude Code session. It parses the transcript, builds a session summary, and scores it on four dimensions (task_completion, tool_efficiency, skill_adherence, routing_accuracy) via claude-haiku-4-5. If any dimension falls below CC_IMPROVE_THRESHOLD (default 0.65), the session is enqueued atomically (fcntl-locked tmp→rename) into ~/.claude/state/improvement_queue.json. When CC_AUTO_IMPROVE=true, improvement_agent.py is spawned as a detached subprocess to drain the queue and write concrete suggestions under ~/.claude/state/improvements/.",
    tech: [{ name: "stop_hook.py" }, { name: "improvement_agent.py" }, { name: "improvement_queue.json" }, { name: "claude-haiku-4-5" }],
    dataIn: "transcriptPath + sessionId",
    dataOut: "queue entry + subprocess",
    insight: "Session-end scoring lets the system self-correct without a human labeling runs — every /improve cycle can dequeue the lowest-scoring transcripts and turn them into skill-evolution tasks, closing the loop between how the agent behaved and what rules get tightened next.",
    color: "red",
  },
  "at-strategy": {
    description: "strategy-enforcer.ts in src/agents/ is a plain async function (strategyEnforcerTool) that runs against staged changes. It layers seven checks grouped under the CLAUDE.md Two-Layer Model: Rule 1 Eval-First (prompt/model changes require pnpm test:evals ≥ 80%), Rule 2 Grounding-First (any LLM .generate/.chat without structuredOutput/response_format/generateObject/Pydantic is BLOCKING), Rule 3 taxonomy validation on extraction-workflow, Rule 4 Multi-Model routing (Opus on simple tasks = WARNING), Rule 5 Spec-Driven (schema changes require pnpm codegen), Rule 6 Observability (classification INSERTs must carry confidence + reason + source + evidence), Rule 7 HITL (batch/bulk tools need requireApproval).",
    tech: [{ name: "strategy-enforcer.ts" }, { name: "7 rules" }, { name: "BLOCKING + WARNING" }],
    dataIn: "changedFiles + fileContents map",
    dataOut: "{ pass, violations[], summary }",
    insight: "Exposed as a plain async function, not a hard-wired middleware — so a pre-commit hook, a CI step, the codefix-apply agent, or a one-off script can all call it with the same semantics. Grounding-First is the one that fires most: it's what keeps jsonb columns from accumulating shape-broken LLM output.",
    color: "amber",
  },
};

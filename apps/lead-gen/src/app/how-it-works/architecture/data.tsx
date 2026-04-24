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
    finding: "24 skills across four teams: improve-* (self-improvement toward a remote AI role), codefix-* (code quality), pipeline-* (lead-gen batch cycles), research-* (company intel).",
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
      { label: "9. langgraph_backend", value: "FastAPI + AsyncPostgresSaver on Neon; same code under langgraph dev", metadata: { graphs: "22", endpoint: "/runs/wait" } },
      { label: "10. agent_teams", value: "Four Claude Code skill teams (improve / codefix / pipeline / research)", metadata: { hook: "stop_hook.py", phases: "BUILDING→SATURATION" } },
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
    description: "Email discovery via domain pattern generation ({first}.{last}@domain, {first}@domain, etc.) combined with page-scrape hits. Candidates go to the verifier before they reach the DB.",
    tech: [{ name: "pattern generator" }, { name: "page scrape" }],
    dataIn: "contact name + company domain",
    dataOut: "candidate email addresses",
    insight: "Pattern generation is cheap and high-recall; verification is the expensive gate. Ordering matters — generate, then verify, then persist.",
    color: "cyan",
  },
  "cm-verify": {
    description: "NeverBounce API for deliverability verification with a local DNS+SMTP fallback in the email-verifier Rust crate. Only 'valid' passes through; 'catch-all' and 'risky' are held for manual review.",
    tech: [{ name: "NeverBounce" }, { name: "email-verifier crate" }],
    dataIn: "candidate emails",
    dataOut: "verified contacts",
    insight: "Catch-all doesn't mean valid — holding them for review keeps the bounce rate on Resend low enough to stay out of spam suppression lists, which is the actual business-critical metric.",
    color: "green",
  },
  "cm-authority": {
    description: "Rule-based title classifier runs synchronously inside the resolver. Patterns map titles to seniority (0.10–1.0): IC < senior < staff < director < VP < C-level. Sub-100ms end-to-end; no cloud LLM call.",
    tech: [{ name: "title patterns" }, { name: "sync in resolver" }],
    dataIn: "contact.title",
    dataOut: "authority_score (0–1)",
    insight: "Sync is non-negotiable on this path — every contact list view would block on a cloud call otherwise. The trade-off is the classifier is less nuanced than an LLM, which is fine because it's an initial gate, not a final ranking.",
    color: "indigo",
  },
  "cm-engage": {
    description: "12-feature gradient-boosted decision stump ensemble predicts open + reply probability. Features: authority_score, seniority, title match to target persona, recency of last activity, company ai_tier, role-company fit, domain trust, etc. Still sub-millisecond inference.",
    tech: [{ name: "decision stumps" }, { name: "12 features" }],
    dataIn: "contact + company features",
    dataOut: "engagement probability",
    insight: "Decision stumps over a logistic regression chain keep the model inspectable — for every prediction you can list the three stumps that pushed it one way or another. That matters when a sales operator asks 'why did you skip this person?'.",
    color: "amber",
  },
  "cm-lora": {
    description: "Fine-tuned LoRA persona ranker, trained with MLX on the host Mac. Scores contact-to-product fit using BGE-M3 embeddings + LoRA adapter. Runs asynchronously; gated by a logreg prefilter (authority_score ≥ 0.5) so it only fires for qualified contacts.",
    tech: [{ name: "MLX fine-tune" }, { name: "BGE-M3 + LoRA" }, { name: "logreg prefilter" }],
    dataIn: "qualified contacts + product ICP",
    dataOut: "lora_tier: hot/warm/cold",
    insight: "Gating the LoRA call behind a cheap classifier is the design that keeps the system local-first economically — full semantic ranking on every contact would bottleneck on GPU; running it on 20% of contacts fits in the M1 budget.",
    color: "amber",
  },
  "cm-vector": {
    description: "pgvector columns (icp_embedding on companies, profile_embedding on contacts) with HNSW cosine indexes. Raw SQL is used for vector search because Drizzle's vector support is incomplete — it's the one place the codebase accepts raw SQL.",
    tech: [{ name: "pgvector" }, { name: "HNSW cosine" }, { name: "raw SQL" }],
    dataIn: "embedding query",
    dataOut: "k-NN contact list",
    insight: "Colocating vectors with the relational data means ICP semantic search JOINs directly against companies.ai_tier and contacts.authority_score without a second store — simpler operationally than LanceDB for this scale.",
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
    description: "Python backend with 22 graphs declared in backend/langgraph.json. Local dev runs `langgraph dev` on :8002 (in-memory). Production runs backend/app.py on :7860 (FastAPI + Uvicorn, AsyncPostgresSaver on Neon for thread persistence). Same graph code; LANGGRAPH_URL env is the only switch.",
    tech: [{ name: "langgraph", version: "0.4+" }, { name: "FastAPI" }, { name: "AsyncPostgresSaver" }],
    dataIn: "assistant_id + input",
    dataOut: "ExecutionResult",
    insight: "Same graph code, two runtimes, one client. The Python stays portable across langgraph dev, Docker, and Cloudflare Workers (via wrangler) with no code branch.",
    color: "violet",
  },
  "lg-core": {
    description: "Five core graphs: email_compose (gather_context → draft → format), email_reply (analyze → draft → polish), email_outreach (lookup_contact → match_persona → select_template → draft_html), admin_chat (tool-router: count_rows / inspect_schema / query_db), text_to_sql (understand → identify_tables → generate → validate; read-only SELECT).",
    tech: [{ name: "5 core graphs" }, { name: "17 specialized agents" }],
    dataIn: "graph input state",
    dataOut: "graph output state",
    insight: "admin_chat uses a JSON tool-router instead of ReAct to avoid LLM tool-call failures — this class of bug is worth designing around rather than retrying through.",
    color: "violet",
  },
  "lg-endpoint": {
    description: "POST /runs/wait is the main endpoint — synchronous, blocks up to 300s. startGraphRun + webhook is the async variant for long runs. runGraph in src/lib/langgraph-client.ts wraps both.",
    tech: [{ name: "/runs/wait" }, { name: "webhook callback" }],
    dataIn: "{ assistant_id, input }",
    dataOut: "final state",
    insight: "Vercel's 60s default function timeout is upped to 300s in vercel.json for graph routes — the graphs are designed to stay under it; anything longer is already async.",
    color: "iris",
  },
  "lg-auth": {
    description: "Bearer-token middleware in backend/leadgen_agent/custom_app.py, plugged into langgraph.json via the http.app key. FastAPI runtime duplicates it inline in backend/app.py. Same Authorization: Bearer contract across both.",
    tech: [{ name: "Starlette middleware" }, { name: "http.app key" }],
    dataIn: "Authorization header",
    dataOut: "pass / 401",
    insight: "Registering the middleware at LangGraph's platform hook means no separate API gateway is needed. The auth layer travels with the code whether it runs under langgraph dev or inside a Cloudflare Workers container.",
    color: "red",
  },
  "lg-deploy": {
    description: "Deploys as a Docker container — Cloudflare Workers via wrangler (current) or HuggingFace Spaces (legacy, abandoned after auto-abuse flag). The Dockerfile ships Python 3.12 + Playwright + the graph code. DATABASE_URL points at the Neon pooled URL for checkpointing.",
    tech: [{ name: "Docker" }, { name: "Cloudflare Workers / wrangler" }, { name: "Playwright" }],
    dataIn: "container image",
    dataOut: "live FastAPI service",
    insight: "Checkpointing on Neon (not local SQLite) means the container can restart without losing thread state — important for long-running graph runs that survive deploy bounces.",
    color: "violet",
  },

  // Stage 10: agent_teams
  "at-improve": {
    description: "Self-improvement team (improve-*): Pipeline Monitor, Discovery Expander, Classifier Tuner, Skill Optimizer, Strategy Brain. Goal: find a remote AI engineering role. Phase: BUILDING (<5 AI jobs/week) → OPTIMIZING (flowing but low relevance).",
    tech: [{ name: "5 skills" }, { name: "phase-aware" }],
    dataIn: "jobs pipeline state",
    dataOut: "action-plan.json",
    insight: "The team's meta skill reads all sibling state files and emits an action plan — the orchestrator is data-driven, not rule-driven.",
    color: "violet",
  },
  "at-codefix": {
    description: "Codebase improvement team (codefix-*): Trajectory Miner, Codebase Auditor, Skill Evolver, Code Improver, Verification Gate, Meta-Optimizer. Pipeline: mine → audit → evolve/apply → verify. Hard caps: 3 code changes + 2 skill evolutions per cycle.",
    tech: [{ name: "6 skills" }, { name: "verification gate" }],
    dataIn: "session transcripts + audit findings",
    dataOut: "code edits + skill improvements",
    insight: "COLLAPSE_RISK phase halts codefix entirely — when recent edits start regressing, the team stops itself before it spirals. Self-limiting is the critical property.",
    color: "amber",
  },
  "at-pipeline": {
    description: "Lead-gen pipeline team (pipeline-*): Coordinator, Discovery Scout, Enrichment Specialist, Contact Hunter, Outreach Composer, QA Auditor. Full cycle: discover → enrich → contacts + qa-audit → outreach (plan-approval required).",
    tech: [{ name: "6 skills" }, { name: "plan-approval gate" }],
    dataIn: "ICP + batch strategy",
    dataOut: "enriched contacts + draft campaigns",
    insight: "Outreach requires plan approval before sending. The other stages run autonomously; the human stays in the loop exactly where it matters (anything that hits an inbox).",
    color: "green",
  },
  "at-research": {
    description: "Research squad (research-*): Company Analyst, Hiring Intel, ICP Matcher. Runs on demand against a single target or as pipeline support. Debate protocol: agents cross-read findings, challenge weak claims, resolve conflicts, update confidence.",
    tech: [{ name: "3 skills" }, { name: "competing hypotheses" }],
    dataIn: "company name / slug",
    dataOut: "GO / NO-GO / NEEDS-MORE-INFO",
    insight: "Adversarial debate between agents is the design choice — letting them agree is cheaper but worse; forcing one to challenge the other's findings is what makes the verdict actionable.",
    color: "blue",
  },
  "at-hook": {
    description: "stop_hook.py scores every Claude Code session. Low-scoring sessions auto-queue an improvement run via improvement_agent.py. The queue is in ~/.claude/state/improvement_queue.json. This is how the agent teams self-correct without manual intervention.",
    tech: [{ name: "stop_hook.py" }, { name: "improvement_agent.py" }, { name: "improvement_queue.json" }],
    dataIn: "session transcript",
    dataOut: "queued improvement task",
    insight: "There is no explicit Strategy Enforcer between the user and the codebase — the phase field in action-plan.json plus the hook's scoring threshold naturally align the teams. Emergent alignment, not decreed alignment.",
    color: "red",
  },
  "at-strategy": {
    description: "strategy-enforcer.ts sits at the change boundary. Rule 1: eval-first (no prompt change without evals ≥ 80% accuracy). Rule 2: grounding-first (no LLM call without structuredOutput / Zod). Rule 3: spec-driven (GraphQL + Drizzle + Zod as formal contracts).",
    tech: [{ name: "strategy-enforcer.ts" }, { name: "3 rules" }],
    dataIn: "staged changes",
    dataOut: "pass / violation",
    insight: "The enforcer is a plain async function, not a middleware — it's run explicitly, which means it can be invoked from a pre-commit hook, a CI step, or inline from a codefix agent depending on context.",
    color: "amber",
  },
};

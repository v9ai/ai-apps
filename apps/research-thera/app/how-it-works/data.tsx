export interface PipelineNode {
  name: string;
  label: string;
  nodeType: "context" | "ai" | "plan" | "search" | "enrich" | "extract" | "persist";
  progress: number;
  color: string;
  shortDesc: string;
  description: string;
  researchBasis?: string;
  detail?: string;
}

export interface Paper {
  slug: string;
  number: number;
  title: string;
  category: string;
  wordCount: number;
  readingTimeMin: number;
  authors?: string;
  year?: number;
  venue?: string;
  finding?: string;
  relevance?: string;
  url?: string;
  categoryColor?: string;
}

export interface Stat {
  number: string;
  label: string;
  source?: string;
}

// ─── Research Generation Pipeline ───────────────────────────────────
// Matches generateTherapyResearch.workflow.ts step-by-step

export const pipelineNodes: PipelineNode[] = [
  {
    name: "loadContext",
    label: "Load Context",
    nodeType: "context",
    progress: 5,
    color: "var(--blue-9)",
    shortDesc: "Fetch goal + family profile from DB",
    description:
      "Reads the therapeutic goal, attached notes, and family member profile (name, age) from PostgreSQL. Determines whether to process a direct goal or contact feedback. Sets job progress to 5% and builds the shared context object passed through every subsequent node.",
    researchBasis: "State initialization — all downstream nodes receive this immutable context",
    detail: "db.getGoal(), db.listNotesForEntity(), db.getFamilyMember()",
  },
  {
    name: "normalizeGoal",
    label: "Normalize Goal",
    nodeType: "ai",
    progress: 10,
    color: "var(--amber-9)",
    shortDesc: "DeepSeek clinical reclassification",
    description:
      "DeepSeek (via generateObject + Zod) translates the goal to English if needed, identifies the specific clinical construct (e.g. 'selective_mutism' not 'behavioral_change'), determines behavior direction (INCREASE/REDUCE/MAINTAIN), infers developmental tier from age, and generates required/excluded keyword lists for downstream filtering.",
    researchBasis: "Structured JSON extraction with schema validation — falls back to heuristic on LLM error",
    detail:
      "Outputs: translatedGoalTitle, clinicalDomain, behaviorDirection, developmentalTier, requiredKeywords[], excludedTopics[]",
  },
  {
    name: "planQuery",
    label: "Plan Query",
    nodeType: "plan",
    progress: 20,
    color: "var(--orange-9)",
    shortDesc: "Generate multi-source search queries",
    description:
      "Uses extractorTools.plan() to expand the normalized goal into source-specific query strings: up to 15 Crossref queries, 20 Semantic Scholar queries, and 12 PubMed/MeSH queries. Falls back to generic evidence-based behavioral intervention queries if planning fails.",
    researchBasis: "Multi-source query expansion — different query grammars per academic API",
    detail: "crossrefQueries[], semanticScholarQueries[], pubmedQueries[], goalType",
  },
  {
    name: "search",
    label: "Multi-Source Search",
    nodeType: "search",
    progress: 40,
    color: "var(--cyan-9)",
    shortDesc: "Crossref + PubMed + Semantic Scholar",
    description:
      "Sequentially searches three academic APIs with rate-limit delays (500ms Crossref, 1s PubMed, 1.1s Semantic Scholar with API key). Also fetches S2 recommendations seeded by the highest-influence paper. Deduplicates, removes book chapters, and applies static + dynamic bad-term filters before returning candidates.",
    researchBasis: "50 results per query across 3 sources — total raw pool often exceeds 1 000 candidates",
    detail: "sourceTools.searchCrossref(), searchPubMed(), searchSemanticScholar(), getSemanticScholarRecommendations()",
  },
  {
    name: "enrichAbstracts",
    label: "Enrich Abstracts",
    nodeType: "enrich",
    progress: 60,
    color: "var(--teal-9)",
    shortDesc: "OpenAlex fills missing abstracts",
    description:
      "For the first 300 candidates that lack an abstract, fetches full text from OpenAlex using controlled concurrency (15 simultaneous requests). Papers without at least 300 characters of abstract after enrichment are discarded before extraction.",
    researchBasis: "Controlled concurrency via mapLimit — avoids hammering OpenAlex while keeping throughput high",
    detail: "openAlexTools.fetchAbstractByDoi(), concurrency=15, minAbstractLength=300",
  },
  {
    name: "extractAll",
    label: "Extract & Gate",
    nodeType: "extract",
    progress: 85,
    color: "var(--red-9)",
    shortDesc: "DeepSeek scores relevance per paper",
    description:
      "Batch-processes up to 50 candidates in groups of 6 (parallel within each batch). DeepSeek extracts key findings, therapeutic techniques, evidence level, relevance score (≥ 0.75), and confidence score (≥ 0.55). Papers failing either threshold are gated out at this step.",
    researchBasis: "Per-candidate quality gate: relevanceScore ≥ 0.75 AND confidence ≥ 0.55 AND keyFindings.length > 0",
    detail: "extractorTools.extract(), RELEVANCE_THRESHOLD=0.75, CONFIDENCE_THRESHOLD=0.55, batch=6",
  },
  {
    name: "persist",
    label: "Persist + Embed",
    nodeType: "persist",
    progress: 95,
    color: "var(--purple-9)",
    shortDesc: "Blended score → Neon + pgvector",
    description:
      "Applies a blended quality score: 60% LLM score (0.7 × relevance + 0.3 × confidence) + 40% required-keyword overlap. Only papers with blended ≥ 0.72 survive. Top 20 are upserted to the therapy_research table, then RAG-chunked and stored as pgvector embeddings for semantic retrieval.",
    researchBasis: "BLENDED_THRESHOLD=0.72, PERSIST_CANDIDATES_LIMIT=20 — embedding via ragTools.upsertResearchChunks()",
    detail: "db.upsertTherapyResearch(), ragTools.upsertResearchChunks(), pgvector 1024-dim embeddings",
  },
];

// ─── Python LangGraph ReAct Agent ──────────────────────────────────

export const reactAgent = {
  model: "gpt-4o-mini",
  tool: "search_therapy_research",
  description:
    "A LangGraph ReAct agent (Python, backend/src/agent/graph.py) that answers questions about stored research. " +
    "Uses create_react_agent with a single pgvector tool: it embeds the user query with text-embedding-3-small, " +
    "runs cosine similarity search against the research_embeddings table, and returns the top-5 matching chunks.",
  toolDetail:
    "SELECT title, content, 1-(embedding <-> query_vec) AS similarity FROM research_embeddings ORDER BY distance LIMIT 5",
};

// ─── Technical Foundations ──────────────────────────────────────────

export const papers: Paper[] = [
  {
    slug: "nextjs-app-router",
    number: 1,
    title: "Next.js App Router",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding:
      "Server Components + file-based routing for improved performance and SEO",
    relevance:
      "Powers pages like app/goals/[id]/page.tsx with dynamic goal routing; client components handle interactivity",
    url: "https://nextjs.org/docs/app",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "apollo-graphql",
    number: 2,
    title: "Apollo GraphQL",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Apollo",
    year: 2024,
    finding:
      "Unified data graph with real-time queries, mutations, caching, and generated hooks",
    relevance:
      "All data flows through generated hooks: useCreateGoalMutation, useGetGoalsQuery, useGetGenerationJobQuery",
    url: "https://www.apollographql.com/docs/",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "postgresql-pgvector",
    number: 3,
    title: "PostgreSQL + pgvector",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "PostgreSQL Global Development Group",
    year: 2024,
    finding:
      "Relational database with vector similarity search via the <-> cosine distance operator",
    relevance:
      "Stores goals, journal_entries, research_papers; pgvector powers semantic RAG retrieval via research_embeddings",
    url: "https://www.postgresql.org/docs/",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "deepseek-ai",
    number: 4,
    title: "DeepSeek AI",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "DeepSeek",
    year: 2024,
    finding:
      "High-performance LLM for structured data extraction via JSON mode + Zod schema validation",
    relevance:
      "Drives normalizeGoal (clinical classification) and extractAll (relevance scoring) pipeline nodes",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "langgraph",
    number: 5,
    title: "LangGraph",
    category: "Infrastructure",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "LangChain",
    year: 2024,
    finding:
      "Framework for stateful multi-step AI workflows as directed graphs with conditional branching and tool calling",
    relevance:
      "Backend Python ReAct agent uses create_react_agent; TypeScript pipeline mirrors the graph pattern sequentially",
    url: "https://langchain-ai.github.io/langgraph/",
    categoryColor: "var(--red-9)",
  },
  {
    slug: "drizzle-orm",
    number: 6,
    title: "Drizzle ORM",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Drizzle Team",
    year: 2024,
    finding:
      "TypeScript ORM with full type safety, SQL-like syntax, and schema-based migrations",
    relevance:
      "All CRUD operations for goals, family_members, journal_entries, generation_jobs tables",
    url: "https://orm.drizzle.team/docs/overview",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "neon-auth",
    number: 7,
    title: "Neon Auth + Serverless Postgres",
    category: "Auth / DB",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Neon",
    year: 2024,
    finding:
      "Serverless PostgreSQL with built-in authentication, row-level security, and connection pooling",
    relevance:
      "Secures all routes via AuthGate; row-level security enforces per-user data isolation without application-layer checks",
    url: "https://neon.tech/docs/auth",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "radix-ui",
    number: 8,
    title: "Radix UI Themes",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix",
    year: 2024,
    finding:
      "Unstyled, accessible UI primitives with a token-based dark theme",
    relevance:
      "Provides the entire design system: dark mode, Indigo accent, Accordion, Dialog, and glassmorphism GlassButton",
    url: "https://www.radix-ui.com/docs/primitives/overview/introduction",
    categoryColor: "var(--blue-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "7 nodes",
    label: "in the research generation LangGraph pipeline",
    source: "loadContext → normalizeGoal → planQuery → search → enrichAbstracts → extractAll → persist",
  },
  {
    number: "3 APIs",
    label: "searched in parallel: Crossref, PubMed, Semantic Scholar",
    source: "+ OpenAlex abstract enrichment and S2 recommendation seeding",
  },
  {
    number: "0.72",
    label: "minimum blended quality score to persist a paper",
    source: "60% LLM score + 40% required-keyword overlap",
  },
  {
    number: "1024-dim",
    label: "pgvector embeddings for semantic RAG retrieval",
    source: "OpenAI text-embedding-3-small stored in research_embeddings",
  },
  {
    number: "< 100ms",
    label: "GraphQL query response time with Apollo caching",
    source: "Optimized queries + Apollo Client normalized cache",
  },
  {
    number: "20 papers",
    label: "maximum persisted per research run, ranked by blended score",
    source: "PERSIST_CANDIDATES_LIMIT constant in the workflow",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "A user logs in via Neon Auth and creates a therapeutic goal. Clicking 'Generate Research' triggers a 7-node LangGraph-style pipeline: it loads context from PostgreSQL, uses DeepSeek to clinically normalize the goal into precise academic language, plans multi-source queries, searches Crossref/PubMed/Semantic Scholar, enriches missing abstracts from OpenAlex, batch-extracts key findings with relevance scoring, and persists the top-ranked papers as pgvector embeddings. The client polls useGetGenerationJobQuery at 1-second intervals to display live progress. A separate Python LangGraph ReAct agent (backend) lets users ask questions against the stored research using cosine similarity search.";

// ─── Extra Sections ────────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "Why LangGraph?",
    content:
      "LangGraph models AI workflows as directed graphs where each node is an async function that reads from and writes to a shared state object. This enables conditional branching (route to different nodes based on intermediate results), automatic retries at the node level, and clean observability — each node's inputs and outputs are inspectable without instrumenting arbitrary code. The research pipeline mirrors this pattern in TypeScript: each step function receives the accumulated context and returns it enriched, making the data flow explicit and testable.",
  },
  {
    heading: "Database Design",
    content:
      "PostgreSQL stores core tables: users (managed by Neon Auth), goals with parentGoalId for hierarchies, family_members with relationship types, and journal_entries with mood and isPrivate flags. Research papers live in research_papers with DOI/URL dedup, while research_embeddings holds pgvector 1024-dim vectors for semantic RAG. The generation_jobs table tracks pipeline progress (5% → 10% → 20% → 40% → 60% → 85% → 95% → 100%) and is polled by the client. Row-level security enforces per-user isolation at the database layer.",
  },
  {
    heading: "Security & Auth",
    content:
      "Authentication via Neon Auth: authClient.useSession() provides user identity, and the AuthGate component protects all routes. Row-level security ensures users only access their own data unless shared via family_member_shares (VIEWER/EDITOR/ADMIN roles). GraphQL requests carry Bearer tokens validated in the Apollo context. Environment variables secure all API keys; Cloudflare R2 audio files are accessed via presigned URLs that expire after a short window.",
  },
  {
    heading: "Deployment & Infrastructure",
    content:
      "Next.js frontend and GraphQL API deploy on Vercel (serverless functions). Neon hosts PostgreSQL with connection pooling for serverless compatibility. The Python LangGraph agent runs as a separate LangGraph Cloud deployment. Cloudflare R2 stores TTS audio files. GraphQL codegen ensures full type safety between schema, resolvers, and React hooks — any schema change that breaks a query fails at build time.",
  },
];

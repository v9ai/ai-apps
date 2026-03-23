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
    shortDesc: "Fetch goal or feedback + family profile",
    description:
      "Supports two entry points: goal-based (reads the therapeutic goal and attached notes from PostgreSQL) and feedback-based (reads contact feedback, extracts issue titles as the research subject). Family member profile (name, age) is fetched separately — if missing, the pipeline continues without age context via a non-fatal try/catch. Sets job progress to 5% and builds the shared context object passed through every subsequent node.",
    researchBasis: "State initialization — all downstream nodes receive this accumulated context",
    detail: "db.getGoal(), db.listNotesForEntity(), db.getFamilyMember()\ndb.getContactFeedback() — alternative entry for feedback-based research",
  },
  {
    name: "normalizeGoal",
    label: "Normalize Goal",
    nodeType: "ai",
    progress: 10,
    color: "var(--amber-9)",
    shortDesc: "DeepSeek clinical reclassification",
    description:
      "DeepSeek (via generateObject + Zod) translates the goal to English, identifies the specific clinical construct — the prompt explicitly forbids the generic 'behavioral_change' and demands specifics like selective_mutism, adhd_vocalization, test_anxiety_children, social_communication_asd, or aggression_children. Behavior direction (INCREASE/REDUCE/MAINTAIN/UNCLEAR) is inferred from phrasing. Age is mapped to a developmental tier via ageToTier(): ≤5 → preschool, ≤8 → early_school, ≤12 → middle_childhood, ≤17 → adolescent, >17 → adult. Falls back silently to heuristics if the LLM call fails.",
    researchBasis: "Structured JSON extraction with Zod schema validation — no partial results accepted",
    detail:
      "Outputs: translatedGoalTitle, clinicalDomain, behaviorDirection (INCREASE|REDUCE|MAINTAIN|UNCLEAR),\ndevelopmentalTier, requiredKeywords[], excludedTopics[]\nFallback: clinicalDomain='behavioral_change', behaviorDirection='UNCLEAR'",
  },
  {
    name: "planQuery",
    label: "Plan Query",
    nodeType: "plan",
    progress: 20,
    color: "var(--orange-9)",
    shortDesc: "Generate multi-source search queries",
    description:
      "Calls extractorTools.plan() to expand the normalized goal into source-specific query strings, producing a goalType field alongside the query lists. Applies slice limits: up to 15 Crossref queries, 20 Semantic Scholar queries, 12 PubMed/MeSH queries. If planning fails, falls back to hardcoded defaults: 5 generic behavioral intervention queries for Crossref and Semantic Scholar, 2 PubMed/MeSH queries.",
    researchBasis: "Multi-source query expansion — each academic API uses different query grammar and MeSH terms",
    detail: "crossrefQueries[] (max 15), semanticScholarQueries[] (max 20), pubmedQueries[] (max 12)\ngoalType — forward-passed to extractAll for domain classification\nFallback: 5+5+2 hardcoded generic queries",
  },
  {
    name: "search",
    label: "Multi-Source Search",
    nodeType: "search",
    progress: 40,
    color: "var(--cyan-9)",
    shortDesc: "~2,350 raw candidates across 3 sources",
    description:
      "Fetches up to 50 results per query (PER_QUERY=50) across all three sources with sequential rate-limit delays: 500ms between Crossref queries, 1,000ms between PubMed queries, 1,100ms between Semantic Scholar queries (200ms if no API key). Also seeds recommendations from Semantic Scholar: filters to papers with s2PaperId and influentialCitationCount > 0, sorts by citation count, fetches up to 20 recommendations from the top paper. Raw pool can reach ~2,350 candidates. After combining, applies deduplication, book-chapter removal, and a two-layer bad-term filter: 15 static terms (forensic, witness, court, police, legal, homework completion, dating violence, cybersex, internet pornography, weight control, obesity intervention, gang-affiliated, delinquency, marital/marriage/couples therapy) merged with the goal-specific excludedTopics list from normalizeGoal.",
    researchBasis: "Raw pool: 15×50 + 12×50 + 20×50 + up to 20 S2 recommendations ≈ 2,350 candidates",
    detail: "sourceTools.searchCrossref(), searchPubMed(), searchSemanticScholar()\nsourceTools.getSemanticScholarRecommendations(topPaper.s2PaperId, 20)\nsourceTools.dedupeCandidates(), filterBookChapters()\nbad-term regex: 15 static + ctx.excludedTopics merged",
  },
  {
    name: "enrichAbstracts",
    label: "Enrich Abstracts",
    nodeType: "enrich",
    progress: 60,
    color: "var(--teal-9)",
    shortDesc: "OpenAlex fills missing abstracts",
    description:
      "For the first 300 candidates (ENRICH_CANDIDATES_LIMIT) that have a DOI but no abstract, fetches full metadata from OpenAlex using controlled concurrency (ENRICH_CONCURRENCY=15 simultaneous requests). Stores results in transient fields _enrichedAbstract, _enrichedYear, _enrichedVenue, _enrichedAuthors that downstream steps merge. Papers without at least 300 characters of abstract after enrichment are discarded. Progress is logged every 50 candidates.",
    researchBasis: "Controlled concurrency via mapLimit — fills data gaps without hammering OpenAlex rate limits",
    detail: "openAlexTools.fetchAbstractByDoi(doi)\nTransient fields: _enrichedAbstract, _enrichedYear, _enrichedVenue, _enrichedAuthors\nMin abstract length: 300 chars — papers below are discarded\nCandidates beyond position 300 skip enrichment and go straight to extraction",
  },
  {
    name: "extractAll",
    label: "Extract & Gate",
    nodeType: "extract",
    progress: 85,
    color: "var(--red-9)",
    shortDesc: "DeepSeek scores relevance per paper",
    description:
      "Batch-processes up to 50 candidates (EXTRACT_CANDIDATES_LIMIT) in groups of 6 (EXTRACTION_BATCH_SIZE), run in parallel within each batch. DeepSeek classifies the paper into one of 12 research domains (cbt, act, dbt, behavioral, psychodynamic, somatic, humanistic, speech_language, play_therapy, aba, parent_mediated, neurodevelopmental, other) and one of 7 study types (meta-analysis, RCT, field study, lab study, quasi-experimental, review, other). If the modern extraction schema fails validation, a legacy schema is tried and converted. Per-paper errors return a rejection reason and don't abort the batch. Papers must pass all three gates: relevanceScore ≥ 0.75, confidence ≥ 0.55, and at least one keyFinding.",
    researchBasis: "Dual-schema extraction with fallback — RELEVANCE_THRESHOLD=0.75, CONFIDENCE_THRESHOLD=0.55, EXTRACTION_BATCH_SIZE=6",
    detail: "extractorTools.extract() per paper — parallel within each batch\n12 domains: cbt, act, dbt, behavioral, psychodynamic, somatic, humanistic,\n  speech_language, play_therapy, aba, parent_mediated, neurodevelopmental, other\n7 study types: meta-analysis, RCT, field study, lab study, quasi-experimental, review, other\nGate: relevance ≥ 0.75 AND confidence ≥ 0.55 AND keyFindings.length > 0",
  },
  {
    name: "persist",
    label: "Persist + Embed",
    nodeType: "persist",
    progress: 95,
    color: "var(--purple-9)",
    shortDesc: "Blended score → therapy_research + pgvector",
    description:
      "Applies a blended quality score that is conditional on whether required keywords exist: when requiredKeywords is non-empty, blended = 0.6 × llmBlended + 0.4 × keywordOverlap (case-insensitive substring match ratio); when empty, blended = llmBlended with a default kwOverlap of 0.5. llmBlended = 0.7 × relevance + 0.3 × confidence. Only papers with blended ≥ 0.72 (BLENDED_THRESHOLD) survive, sorted descending. Top 20 are upserted to the therapy_research table, then chunked and stored as 1024-dim pgvector embeddings in research_embeddings. DB upsert failures are counted separately — a partial result (e.g. 12 of 20 persisted) is still returned as success.",
    researchBasis: "BLENDED_THRESHOLD=0.72, PERSIST_CANDIDATES_LIMIT=20 — keyword overlap is conditional, not always 40%",
    detail: "db.upsertTherapyResearch() → therapy_research table\nragTools.upsertResearchChunks() → research_embeddings (pgvector 1024-dim)\nBlend formula:\n  llmBlended = 0.7 × relevance + 0.3 × confidence\n  if requiredKeywords.length > 0: blended = 0.6×llm + 0.4×kwOverlap\n  else: blended = llmBlended (kwOverlap defaults to 0.5)",
  },
];

// ─── Python LangGraph ReAct Agent ──────────────────────────────────

export const reactAgent = {
  model: "gpt-4o-mini",
  tool: "search_therapy_research",
  description:
    "A LangGraph ReAct agent (Python, backend/src/agent/graph.py) that answers questions about stored research. " +
    "Uses create_react_agent with a single pgvector tool: it embeds the user query with text-embedding-3-small, " +
    "runs cosine similarity search against the research_embeddings table, and returns the top-5 matching chunks " +
    "formatted as '**{title}** (similarity: 0.NNN)\\n{content}' with scores to 3 decimal places.",
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
      "All data flows through generated hooks: useCreateGoalMutation, useGetGoalsQuery, useGetGenerationJobQuery (polling at 1s intervals during pipeline runs)",
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
      "Stores goals, journal_entries, therapy_research; research_embeddings holds 1024-dim pgvector embeddings for semantic RAG retrieval across four entity types: Goal, Note, TherapyResearch, TherapeuticQuestion",
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
      "Drives normalizeGoal (clinical classification into 12 domains) and extractAll (relevance + confidence scoring, study type classification). Falls back to heuristics or legacy schema on failure — never aborts the pipeline.",
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
      "Python backend uses create_react_agent (prebuilt ReAct graph) with a pgvector search tool for RAG Q&A. The TypeScript pipeline mirrors the stateful node-passing pattern: each step function receives accumulated context and returns it enriched, making data flow explicit and each node independently testable.",
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
      "All CRUD operations for goals, family_members, journal_entries, generation_jobs, therapy_research tables — schema changes generate typed migrations automatically",
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
      "Secures all routes via AuthGate; row-level security enforces per-user data isolation. generation_jobs tracks pipeline runs with status RUNNING/SUCCEEDED/FAILED and types AUDIO/RESEARCH/QUESTIONS/LONGFORM.",
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
    number: "~2,350",
    label: "raw candidates per run across 3 sources + S2 recommendations",
    source: "50 results × up to 47 queries (15 Crossref + 20 S2 + 12 PubMed) + 20 S2 recs",
  },
  {
    number: "12 domains",
    label: "DeepSeek classifies each paper into",
    source: "cbt, act, dbt, behavioral, psychodynamic, somatic, humanistic, speech_language, play_therapy, aba, parent_mediated, neurodevelopmental",
  },
  {
    number: "7 study types",
    label: "extracted per paper by DeepSeek",
    source: "meta-analysis, RCT, field study, lab study, quasi-experimental, review, other",
  },
  {
    number: "0.72",
    label: "minimum blended quality score to persist a paper",
    source: "conditional: 60% LLM score + 40% required-keyword overlap (keyword weight only applied when requiredKeywords is non-empty)",
  },
  {
    number: "1024-dim",
    label: "pgvector embeddings in research_embeddings (OpenAI text-embedding-3-small)",
    source: "Supports 4 entity types: Goal, Note, TherapyResearch, TherapeuticQuestion",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "A user logs in via Neon Auth and creates a therapeutic goal — or incoming contact feedback triggers the pipeline automatically. Either way, the 7-node pipeline begins: loadContext reads the goal and family profile from PostgreSQL, normalizeGoal uses DeepSeek to translate and clinically classify it into one of 12 specific domains (never the generic 'behavioral_change'), planQuery generates up to 47 targeted academic search queries, and search fetches ~2,350 raw candidates from Crossref, PubMed, and Semantic Scholar plus S2 recommendations seeded by the most-cited paper. enrichAbstracts fills gaps via OpenAlex (concurrency 15), extractAll batch-scores each paper with DeepSeek for relevance and confidence, and persist applies a conditional blended formula to select the top 20 papers — upserted to therapy_research and stored as pgvector embeddings for RAG retrieval. A separate Python LangGraph ReAct agent answers user questions against this store using cosine similarity search.";

// ─── Extra Sections ────────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "Why LangGraph?",
    content:
      "LangGraph models AI workflows as directed graphs where each node is an async function that reads from and writes to a shared state object. This enables conditional branching, automatic retries at the node level, and clean observability — each node's inputs and outputs are inspectable without instrumenting arbitrary code. The research pipeline mirrors this pattern in TypeScript: each step function receives the accumulated context and returns it enriched. The Python backend takes it further with create_react_agent, a prebuilt LangGraph pattern where the model decides which tools to call and when to stop — no explicit loop logic required.",
  },
  {
    heading: "Database Design",
    content:
      "PostgreSQL stores core tables: users (managed by Neon Auth), goals with parentGoalId for hierarchies, family_members with relationship types, and journal_entries with mood and isPrivate flags. Goal-specific research lives in therapy_research (not a generic papers table) — columns include therapeuticGoalType, keyFindings, therapeuticTechniques, evidenceLevel, relevanceScore, extractionConfidence, and extractedBy. Semantic search is served by research_embeddings: 1024-dim pgvector vectors keyed by entity_type (Goal, Note, TherapyResearch, TherapeuticQuestion) and entity_id, with metadata stored alongside. The generation_jobs table tracks pipeline runs with status (RUNNING, SUCCEEDED, FAILED) and type (AUDIO, RESEARCH, QUESTIONS, LONGFORM), polled by the client every second during active runs.",
  },
  {
    heading: "Resilience & Error Handling",
    content:
      "The pipeline is designed to degrade gracefully at every node. loadContext wraps the family member fetch in a non-fatal try/catch — missing profiles don't abort the run. normalizeGoal falls back to heuristic defaults (clinicalDomain='behavioral_change', behaviorDirection='UNCLEAR') if DeepSeek fails. extractAll handles per-paper failures individually: errors return a rejection reason and are skipped, never aborting the batch. During persist, DB upsert failures are counted separately from extraction failures — a run that persists 12 of 20 qualifying papers still returns success: true with count: 12. This means every research run produces some output as long as at least one paper clears all gates.",
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

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
  model: "deepseek-chat",
  tools: ["search_papers", "get_paper_detail", "save_research_papers"],
  description:
    "A LangGraph ReAct agent (Python, backend/research_agent/graph.py) that discovers, evaluates, and persists therapy research. " +
    "Uses create_react_agent with DeepSeek Chat and three tools: search_papers queries OpenAlex, Crossref, and Semantic Scholar " +
    "in parallel then reranks results with cross-encoder/ms-marco-MiniLM-L-6-v2; get_paper_detail fetches the full abstract and TLDR " +
    "for a given DOI or title; save_research_papers upserts curated papers to the therapy_research table with evidence level, " +
    "therapeutic techniques, and key findings. The agent runs exactly 3 search calls, inspects up to 2 papers in detail, " +
    "selects the top 10, and persists them — all in a single reasoning loop.",
  toolDetail:
    "1. search_papers(query, limit=10) — OpenAlex + Crossref + S2 → cross-encoder rerank → top K\n" +
    "2. get_paper_detail(doi_or_title) — full abstract, TLDR, authors, citation count\n" +
    "3. save_research_papers(papers_json) — upsert to therapy_research with goal/issue/feedback ID",
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
      "39 tables: goals, issues, habits, journal_entries, conversations, claim_cards, deep_issue_analyses, discussion_guides, affirmations, contacts, therapy_research, and more. research_embeddings holds 1024-dim pgvector embeddings for semantic RAG retrieval across four entity types",
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
      "Powers 4 AI agents: 2 Python LangGraph (research agent with 3 tools + cross-encoder reranking, deep analysis agent for pattern clustering) and 2 TypeScript AI SDK (storyTeller for interactive narratives, therapeutic for evidence-based audio). The TypeScript pipeline mirrors the stateful node-passing pattern.",
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
  {
    slug: "openai-tts",
    number: 9,
    title: "OpenAI TTS",
    category: "AI / Audio",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "OpenAI",
    year: 2024,
    finding:
      "Text-to-speech via gpt-4o-mini-tts with 12 voices, 3 models, and chunked generation for long-form content",
    relevance:
      "Generates therapeutic audio — text is chunked to fit model limits, audio segments are concatenated and uploaded to Cloudflare R2, with SSE streaming for real-time progress",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "cross-encoder-reranking",
    number: 10,
    title: "Cross-Encoder Reranking",
    category: "AI / ML",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Sentence-Transformers",
    year: 2024,
    finding:
      "ms-marco-MiniLM-L-6-v2 (22M params) reranks search results with cross-attention between query and passage",
    relevance:
      "The Python research agent fetches 3x the requested limit from multi-source search, then reranks with the cross-encoder to surface the most relevant papers before LLM reasoning",
    categoryColor: "var(--red-9)",
  },
  {
    slug: "llamaindex",
    number: 11,
    title: "LlamaIndex + LlamaParse",
    category: "AI / RAG",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "LlamaIndex",
    year: 2024,
    finding:
      "Composable RAG framework — IngestionPipeline, ContextChatEngine, retrievers, postprocessors — plus LlamaParse for high-fidelity PDF/lab-report extraction",
    relevance:
      "Powers the entire healthcare chat + ingestion stack. Lab PDFs go through LlamaParse → IngestionPipeline → FastEmbed embeddings stored across 8 health-specific pgvector tables. Chat uses ContextChatEngine with intent-routed retrievers (markers, derived_ratios, trajectory, conditions, medications, symptoms, appointments, general_health) and a SimilarityPostprocessor + ClinicalRelevancePostprocessor pipeline.",
    url: "https://docs.llamaindex.ai/",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "fastembed",
    number: 12,
    title: "FastEmbed (BAAI/bge-large-en-v1.5)",
    category: "AI / ML",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Qdrant",
    year: 2024,
    finding:
      "Local ONNX-runtime embedding model — BAAI/bge-large-en-v1.5 (1024-dim) — no API calls, no cold-start lag",
    relevance:
      "All healthcare embeddings (blood tests, blood markers, conditions, medications, symptoms, appointments, allergies, health-state snapshots) run locally via FastEmbed exposed as a LlamaIndex-compatible FastEmbedEmbedding so the IngestionPipeline can use it as a transformation step.",
    url: "https://github.com/qdrant/fastembed",
    categoryColor: "var(--cyan-9)",
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
  {
    number: "4 agents",
    label: "DeepSeek-powered AI agents across Python and TypeScript",
    source: "2 Python LangGraph (research + deep analysis) + 2 TypeScript AI SDK (storyTeller + therapeutic)",
  },
  {
    number: "39 tables",
    label: "PostgreSQL schema via Drizzle ORM",
    source: "goals, issues, habits, journal_entries, conversations, claim_cards, deep_issue_analyses, discussion_guides, affirmations, and more",
  },
  {
    number: "7 sources",
    label: "academic research APIs integrated",
    source: "Crossref, PubMed, Semantic Scholar, OpenAlex, arXiv, Europe PMC, DataCite",
  },
  {
    number: "reranking",
    label: "cross-encoder ms-marco-MiniLM-L-6-v2 (22M params)",
    source: "Sits between multi-source search and LLM extraction in the Python research agent",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "Research Thera is a therapeutic platform for families — parents and caregivers create goals, track issues, log journals and habits, and receive AI-generated discussion guides, therapeutic questions, recommended books, and evidence-based audio content. Four DeepSeek-powered AI agents handle different concerns: a research agent discovers and persists academic papers via multi-source search and cross-encoder reranking, a deep analysis agent clusters patterns across a child's issues and family dynamics, a storyTeller agent generates interactive choose-your-own-adventure narratives, and a therapeutic agent produces audio-first guidance grounded in CBT, ACT, DBT, and LEGO-based therapy. At the core, a 7-node TypeScript pipeline (loadContext → normalizeGoal → planQuery → search → enrichAbstracts → extractAll → persist) fetches ~2,350 raw candidates from Crossref, PubMed, and Semantic Scholar, enriches abstracts via OpenAlex, batch-scores with DeepSeek, and persists the top 20 as pgvector embeddings. Meanwhile, a separate Python LangGraph ReAct agent uses cross-encoder reranking across OpenAlex, Crossref, and Semantic Scholar to discover, evaluate, and save therapy research on demand.";

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
      "PostgreSQL hosts 39 tables via Drizzle ORM. Core tables: users (Neon Auth), goals with parentGoalId for hierarchies, family_members with sharing (EDITOR), and family_member_characteristics (severity, risk tiers). Behavioral tracking: issues (8 categories, linked via issue_links and issue_contacts), habits + habit_logs (daily/weekly with target counts), behavior_observations (frequency/intensity), and affirmations (5 categories). Journaling: journal_entries (mood, tags, privacy), journal_analyses (emotional landscape, therapeutic insights), and discussion_guides (conversation starters, anticipated reactions). Communication: conversations + conversation_messages (per-issue AI chat), contacts, relationships, teacher_feedbacks, and contact_feedbacks. Evidence: therapy_research (12 domains, 7 study types, evidence level), research_embeddings (1024-dim pgvector), claim_cards (verdict: supported/contradicted/mixed/insufficient), and deep_issue_analyses (pattern clustering, family systems, root cause). Content: stories + text_segments, audio_assets, recommended_books, and therapeutic_questions. Infrastructure: generation_jobs (status RUNNING/SUCCEEDED/FAILED, type AUDIO/RESEARCH/QUESTIONS/LONGFORM/HABITS/BOOKS/ANALYSIS).",
  },
  {
    heading: "Resilience & Error Handling",
    content:
      "The pipeline is designed to degrade gracefully at every node. loadContext wraps the family member fetch in a non-fatal try/catch — missing profiles don't abort the run. normalizeGoal falls back to heuristic defaults (clinicalDomain='behavioral_change', behaviorDirection='UNCLEAR') if DeepSeek fails. extractAll handles per-paper failures individually: errors return a rejection reason and are skipped, never aborting the batch. During persist, DB upsert failures are counted separately from extraction failures — a run that persists 12 of 20 qualifying papers still returns success: true with count: 12. This means every research run produces some output as long as at least one paper clears all gates.",
  },
  {
    heading: "Security & Auth",
    content:
      "Authentication via Neon Auth: authClient.useSession() provides user identity, and the AuthGate component protects all routes. Row-level security ensures users only access their own data unless shared via family_member_shares (EDITOR role). GraphQL requests carry Bearer tokens validated in the Apollo context. Environment variables secure all API keys; Cloudflare R2 audio files are accessed via presigned URLs that expire after a short window.",
  },
  {
    heading: "Deployment & Infrastructure",
    content:
      "Next.js frontend and GraphQL API deploy on Vercel (serverless functions). Neon hosts PostgreSQL with connection pooling for serverless compatibility. Two Python LangGraph agents (research + deep analysis) run as a LangGraph Cloud deployment. Cloudflare R2 stores TTS audio files and issue screenshots. GraphQL codegen ensures full type safety between schema, resolvers, and React hooks — any schema change that breaks a query fails at build time.",
  },
  {
    heading: "AI Agent Architecture",
    content:
      "Four DeepSeek-powered agents handle different concerns. The Research Agent (Python, LangGraph) uses create_react_agent with 3 tools — search_papers searches OpenAlex, Crossref, and Semantic Scholar in parallel then reranks with cross-encoder/ms-marco-MiniLM-L-6-v2; get_paper_detail fetches full abstracts; save_research_papers upserts curated papers to the database. The Deep Analysis Agent (Python, LangGraph) clusters a child's issues into thematic patterns, analyzes family dynamics, identifies root causes, and generates priority recommendations with research relevance. The StoryTeller Agent (TypeScript, AI SDK) generates interactive 3-part choose-your-own-adventure stories with numbered choices and TTS-optimized prose. The Therapeutic Agent (TypeScript, AI SDK) produces audio-first guidance grounded in CBT, ACT, DBT, MBSR, and LEGO-Based Therapy (LeGoff et al.) — with counted breathing, body-based activities, and developmental-tier awareness from preschool through adult.",
  },
];

// ─── Platform Features ───────────────────────────────────────────

export interface PlatformFeature {
  name: string;
  description: string;
  color: string;
}

export interface FeatureCategory {
  category: string;
  color: string;
  features: PlatformFeature[];
}

export const platformFeatures: FeatureCategory[] = [
  {
    category: "Therapeutic Core",
    color: "var(--indigo-9)",
    features: [
      { name: "Goals", description: "Hierarchical therapeutic goals with sub-goals, priority levels, target dates, status tracking, family member association, and automatic research generation", color: "var(--indigo-9)" },
      { name: "Therapeutic Questions", description: "AI-generated evidence-based reflection questions linked to research papers, with rationale explaining the therapeutic connection", color: "var(--indigo-9)" },
      { name: "Recommended Books", description: "AI-generated book recommendations per goal with title, authors, ISBN, description, therapeutic rationale, and Amazon links", color: "var(--indigo-9)" },
    ],
  },
  {
    category: "Family & Contacts",
    color: "var(--teal-9)",
    features: [
      { name: "Family Members", description: "Profiles with age, gender, relationship, developmental tier. Sharing with EDITOR role for collaborative caregiving", color: "var(--teal-9)" },
      { name: "Contacts & Relationships", description: "Teachers, therapists, and other professionals linked to family members and issues. Generic relationship mapping system", color: "var(--teal-9)" },
      { name: "Contact Feedback", description: "Structured feedback collection from teachers and contacts. Automatic issue extraction from feedback text", color: "var(--teal-9)" },
    ],
  },
  {
    category: "Journal & Mood",
    color: "var(--blue-9)",
    features: [
      { name: "Journal Entries", description: "Mood tracking (happy, sad, anxious, calm, frustrated, hopeful, neutral), tags, privacy settings, date filtering, family member association", color: "var(--blue-9)" },
      { name: "Journal Analysis", description: "DeepSeek-powered analysis: emotional landscape, underlying emotions, regulation patterns, therapeutic insights, and actionable recommendations", color: "var(--blue-9)" },
      { name: "Discussion Guides", description: "Age-appropriate parent conversation guides per journal entry: conversation starters, talking points, language guide, anticipated reactions, follow-up plan. Public sharing without auth", color: "var(--blue-9)" },
    ],
  },
  {
    category: "Issues & Analysis",
    color: "var(--red-9)",
    features: [
      { name: "Issues", description: "8 categories (behavioral, emotional, social, developmental, academic, health, communication, other). Conversations, screenshots, severity, linked contacts, convert to goals", color: "var(--red-9)" },
      { name: "Deep Issue Analysis", description: "Multi-pattern clustering across all of a child's issues: thematic clusters, timeline analysis, family system insights, root cause analysis, priority recommendations, research relevance mapping", color: "var(--red-9)" },
    ],
  },
  {
    category: "Habits & Behavior",
    color: "var(--green-9)",
    features: [
      { name: "Habits", description: "Daily/weekly habits with target counts, streak logging, active/paused/archived status. AI-generated from family member profile or specific issues", color: "var(--green-9)" },
      { name: "Behavior Observations", description: "Track observed behaviors with frequency, intensity (low/medium/high), type (refusal, target occurred, avoidance, partial), and contextual notes", color: "var(--green-9)" },
      { name: "Affirmations", description: "Personalized positive reinforcement in 5 categories: gratitude, strength, encouragement, growth, self-worth. Per family member", color: "var(--green-9)" },
    ],
  },
  {
    category: "Stories & Audio",
    color: "var(--purple-9)",
    features: [
      { name: "Interactive Stories", description: "StoryTeller agent generates 3-part choose-your-own-adventure narratives with numbered choices, TTS-optimized prose, and genre/protagonist/setting parameters", color: "var(--purple-9)" },
      { name: "Therapeutic Audio", description: "Therapeutic agent produces audio-first guidance grounded in CBT, ACT, DBT, MBSR, and LEGO-Based Therapy. Counted breathing, body-based activities, developmental-tier awareness", color: "var(--purple-9)" },
      { name: "OpenAI TTS", description: "gpt-4o-mini-tts with 12 voices, 3 models, 5 audio formats. Text chunking for long-form content, SSE streaming, Cloudflare R2 storage", color: "var(--purple-9)" },
    ],
  },
  {
    category: "Evidence & Claims",
    color: "var(--orange-9)",
    features: [
      { name: "Claim Cards", description: "Extract and verify factual claims from notes. Verdicts: supported, contradicted, mixed, insufficient. Confidence scoring, evidence items with source paper links", color: "var(--orange-9)" },
      { name: "Research Integration", description: "7 academic sources (Crossref, PubMed, Semantic Scholar, OpenAlex, arXiv, Europe PMC, DataCite). 7-node pipeline + Python ReAct agent with cross-encoder reranking", color: "var(--orange-9)" },
      { name: "Note Sharing", description: "Notes linked to goals, journals, issues, stories. READER/EDITOR sharing roles, slug-based public URLs, claim card integration", color: "var(--orange-9)" },
    ],
  },
  {
    category: "Healthcare (LlamaIndex)",
    color: "var(--green-9)",
    features: [
      { name: "Blood Tests", description: "Upload lab PDFs. LlamaParse extracts structured marker data (name, value, unit, reference range, flag). Stored in blood_tests + blood_markers, plus a derived health-state snapshot per upload", color: "var(--green-9)" },
      { name: "Conditions, Medications, Symptoms, Allergies", description: "Per-family-member health records with per-person routes (/conditions/[slug]/[condition], /medications/[slug], /allergies/[slug]). Each record is embedded with LlamaIndex Document/TextNode builders and stored in dedicated pgvector tables", color: "var(--green-9)" },
      { name: "Appointments & Doctors", description: "Track providers (family_member_doctors), upcoming visits, and medical letters. Appointments are embedded for chat retrieval alongside other clinical context", color: "var(--green-9)" },
      { name: "Derived Clinical Ratios", description: "TG/HDL, TC/HDL, HDL/LDL, NLR, De Ritis (AST/ALT), BUN/Creatinine, TyG Index — automatically computed per upload with optimal/borderline/elevated/low risk classification and authored references (McLaughlin, Castelli, Millán, Fest, De Ritis, Hosten, Simental-Mendía)", color: "var(--green-9)" },
      { name: "Clinical Chat", description: "LlamaIndex ContextChatEngine with intent triage (9 intents: markers, derived_ratios, trajectory, conditions, medications, symptoms, appointments, general_health, safety_refusal). Multi-intent fan-out via CompositeRetriever, post-retrieval guard re-check, safety refusal short-circuit", color: "var(--green-9)" },
      { name: "Brain & Memory Protocols", description: "Brain-health protocols with linked supplements, cognitive baselines, recurring check-ins, and memory entries — connecting health data with cognitive trajectory tracking", color: "var(--green-9)" },
    ],
  },
];

// ─── AI Agents ────────────────────────────────────────────────────

export interface AIAgent {
  name: string;
  runtime: "Python" | "TypeScript";
  model: string;
  framework: string;
  file: string;
  tools: string[] | null;
  description: string;
  color: string;
}

export const aiAgents: AIAgent[] = [
  {
    name: "Research Agent",
    runtime: "Python",
    model: "deepseek-chat",
    framework: "LangGraph (create_react_agent)",
    file: "backend/research_agent/graph.py",
    tools: ["search_papers", "get_paper_detail", "save_research_papers"],
    description: "Discovers, evaluates, and persists therapy research. Runs 3 search calls across OpenAlex, Crossref, and Semantic Scholar, reranks with cross-encoder, inspects up to 2 papers in detail, selects top 10, and upserts to the database.",
    color: "var(--cyan-9)",
  },
  {
    name: "Deep Analysis Agent",
    runtime: "Python",
    model: "deepseek-chat",
    framework: "LangGraph",
    file: "backend/research_agent/deep_analysis_graph.py",
    tools: null,
    description: "Clusters a child's issues into thematic patterns, analyzes family dynamics and timeline, identifies root causes, and generates priority recommendations with research relevance mapping.",
    color: "var(--red-9)",
  },
  {
    name: "StoryTeller Agent",
    runtime: "TypeScript",
    model: "deepseek-chat",
    framework: "AI SDK (generateObject + Zod)",
    file: "src/agents/index.ts",
    tools: null,
    description: "Generates interactive 3-part choose-your-own-adventure stories with numbered choices, TTS-optimized prose (short sentences, clear pronunciation), and configurable genre, protagonist, and setting.",
    color: "var(--purple-9)",
  },
  {
    name: "Therapeutic Agent",
    runtime: "TypeScript",
    model: "deepseek-chat",
    framework: "AI SDK (generateObject + Zod)",
    file: "src/agents/index.ts",
    tools: null,
    description: "Produces audio-first therapeutic guidance grounded in CBT, ACT, DBT, MBSR, Play Therapy, and LEGO-Based Therapy (LeGoff et al.). Includes counted breathing, body-based activities, and developmental-tier awareness from preschool through adult.",
    color: "var(--amber-9)",
  },
];

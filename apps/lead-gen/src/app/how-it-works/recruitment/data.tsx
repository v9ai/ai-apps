import type { Paper, Stat, TechnicalDetail, ExtraSection } from "@ai-apps/ui/how-it-works";

// ─── Technical Foundations ──────────────────────────────────────────

export const papers: Paper[] = [
  {
    slug: "gh-crate",
    number: 1,
    title: "gh crate (github-patterns)",
    category: "Rust",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "This repo · crates/gh",
    year: 2026,
    finding: "Monolithic Rust crate with feature flags: client, patterns, embed, neon, lance, contrib-embed, icp",
    relevance: "Core engine for GitHub discovery, enrichment, and scoring. Ships four binaries: scan_orgs, scrape_contributors, export_contributors, search_candidates.",
    url: "https://github.com/",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "github-rest",
    number: 2,
    title: "GitHub REST API v3",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "GitHub",
    year: 2024,
    finding: "Endpoints for /search/users, /repos/{}/stargazers, /repos/{}/contributors, /orgs/{}/members, /users/{}/followers",
    relevance: "Used for all six discovery channels — fan-out across keyword search, stargazers, contributors, org members, and follower graphs.",
    url: "https://docs.github.com/en/rest",
    categoryColor: "var(--gray-9)",
  },
  {
    slug: "github-graphql",
    number: 3,
    title: "GitHub GraphQL API v4",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "GitHub",
    year: 2024,
    finding: "Batch hydration of 50+ fields per user: contribution calendar, pinned repos, org memberships, top repos, contributed repos",
    relevance: "Used after REST discovery to enrich candidates with signals that REST would require N separate calls to fetch.",
    url: "https://docs.github.com/en/graphql",
    categoryColor: "var(--gray-9)",
  },
  {
    slug: "reqwest",
    number: 4,
    title: "reqwest + Tokio",
    category: "Rust",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "seanmonstar / Tokio team",
    year: 2024,
    finding: "Async HTTP client on the Tokio runtime — concurrent GitHub API calls with backoff on 403/429",
    relevance: "All GitHub traffic flows through a single shared reqwest client. Rate-limit headers are parsed on every response.",
    url: "https://docs.rs/reqwest",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "candle",
    number: 5,
    title: "Candle (HuggingFace)",
    category: "AI/ML",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "HuggingFace",
    year: 2024,
    finding: "Minimalist ML framework for Rust with Metal/CUDA/CPU backends — local BERT inference, no cloud calls",
    relevance: "Embeds contributor bios + repo descriptions into a vector space for semantic candidate search. Zero egress per candidate.",
    url: "https://github.com/huggingface/candle",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "lancedb",
    number: 6,
    title: "LanceDB",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "LanceDB",
    year: 2024,
    finding: "Embedded columnar vector database — ANN search over millions of vectors without a server",
    relevance: "Stores contributor vectors alongside raw fields. Powers offline similarity search across the whole candidate corpus.",
    url: "https://lancedb.com",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "neon",
    number: 7,
    title: "Neon PostgreSQL",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Neon",
    year: 2024,
    finding: "Serverless PostgreSQL — the canonical contacts store shared with the company pipeline",
    relevance: "Scored candidates land in contacts with github_handle unique key, ai_profile jsonb, authority_score, and a searchable tag array.",
    url: "https://neon.tech",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "sqlx",
    number: 8,
    title: "sqlx",
    category: "Rust",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "launchbadge",
    year: 2024,
    finding: "Async compile-time-checked SQL for Rust — used to write contacts and org-pattern rows to Neon",
    relevance: "Enabled via the `neon` feature flag in crates/gh/Cargo.toml. Upserts keyed on github_handle.",
    url: "https://github.com/launchbadge/sqlx",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "drizzle",
    number: 9,
    title: "Drizzle ORM",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Drizzle Team",
    year: 2024,
    finding: "TypeScript ORM with typed queries — the contacts schema definition shared by Rust writes and TS reads",
    relevance: "contacts.github_handle (unique), contacts.ai_profile (jsonb ContactAIProfile), contacts.authority_score — all surfaced through Drizzle types.",
    url: "https://orm.drizzle.team",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "reactflow",
    number: 10,
    title: "React Flow",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "xyflow",
    year: 2024,
    finding: "Node-and-edge visualization library with custom nodes, dark-mode theming, and smooth-step routing",
    relevance: "Renders the interactive diagram on this page — same custom node components as /how-it-works.",
    url: "https://reactflow.dev",
    categoryColor: "var(--blue-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const stats: Stat[] = [
  { number: "6", label: "Discovery channels — bio search, stargazers, contributors, org members, follower graph, seed domains", source: "crates/gh/src/bin/search_candidates.rs" },
  { number: "15", label: "Bio-search passes targeting distinct AI/ML angles (RAG, DSPy, MLOps, vector DBs, agentic…)", source: "search_queries() in search_candidates.rs" },
  { number: "50+", label: "Fields hydrated per candidate via a single GraphQL batch query", source: "USER_GQL_FIELDS in crates/gh/src/client.rs" },
  { number: "9", label: "Components in the rising-score composite (density, novelty, breadth, activity, skill, engagement, obscurity, recency, quality)", source: "crates/gh/src/contributors.rs" },
  { number: "0", label: "Cloud LLM calls per candidate — Candle runs locally on Metal/CPU for all embeddings and scoring", source: "crates/gh/Cargo.toml (embed feature)" },
];

// ─── Node detail map (shape mirrors pipeline-client.tsx nodeDetails) ─────

export type NodeDetail = {
  description: string;
  tech: { name: string; version?: string }[];
  dataIn: string;
  dataOut: string;
  insight: string;
  color: string;
};

export const nodeDetails: Record<string, NodeDetail> = {
  // ── Stage 1: Discovery (6 parallel channels) ─────────────────────────
  "gh-bio-search": {
    description: "Fifteen targeted passes against GitHub's /search/users endpoint, each crafted around a different angle of AI/ML practice — RAG and LLM generalists, DSPy/instructor/outlines users, MLOps and deployment engineers, vector-DB specialists, principal and staff IC titles. Each pass uses qualifiers (location:, language:, followers:>N) to filter before any profile fetch. Results are sorted by follower count as a relevance proxy, but downstream scoring inverts fame so high-follower accounts don't dominate.",
    tech: [{ name: "GitHub REST /search/users" }, { name: "15 keyword passes (A–O)" }, { name: "reqwest" }, { name: "regex qualifiers" }],
    dataIn: "Structured search queries with location + keyword qualifiers",
    dataOut: "Candidate logins tagged with src:bio/{pass} provenance",
    insight: "Fifteen narrow passes beat one broad query — GitHub's relevance ranking caps at 100 results per call, so the budget is spent where the false-positive rate is lowest: narrow, well-qualified terms.",
    color: "blue",
  },
  "gh-stargazers": {
    description: "Mines the stargazer lists of 13 high-signal AI/ML repos: langgraph, crewAI, anthropic-cookbook, vllm, autogen, transformers, chroma, dspy, instructor, outlines, llama_index. Starring a framework is a low-cost public signal of awareness and interest. Overlap-filtered against bio-search results to isolate candidates who showed up via orthogonal evidence.",
    tech: [{ name: "GitHub REST /repos/{}/stargazers" }, { name: "13 curated AI repos" }, { name: "paginated fetch" }],
    dataIn: "Ordered list of high-signal framework repos",
    dataOut: "Stargazer logins tagged with src:star/{repo}",
    insight: "Stars are a cheap signal individually, but intersected with three other channels they become a strong filter — a candidate who stars langgraph AND contributes to llama_index AND is a member of huggingface is almost certainly an LLM practitioner.",
    color: "amber",
  },
  "gh-contributors": {
    description: "The highest-signal channel: contributors to 12 foundational AI/ML libraries (langchain, langgraph, llama_index, crewAI, autogen, vllm, chroma, dspy, instructor, semantic-kernel, litellm). Shipping code to these repos proves capability in a way stars and bios don't. Bot accounts (dependabot, github-actions, renovate) are filtered via is_bot() regex before the login enters the candidate pool.",
    tech: [{ name: "GitHub REST /repos/{}/contributors" }, { name: "12 core AI libraries" }, { name: "is_bot() filter" }],
    dataIn: "List of foundational AI/ML repos",
    dataOut: "Real code contributors with commit count per repo",
    insight: "Contributor mining produces a small candidate set with an extremely high hit rate — it's the inverse trade-off from bio search, which produces a large set with mixed quality.",
    color: "green",
  },
  "gh-org-members": {
    description: "Public members of AI labs and AI-native companies: deepmind, google-deepmind, huggingface, cohere-ai, stability-ai, faculty-ai, alan-turing-institute, benevolentai. Only users who have made their org membership public appear — a voluntary signal of affiliation. Org membership becomes a high-confidence employer tag even when the candidate's profile 'company' field is blank or stale.",
    tech: [{ name: "GitHub REST /orgs/{}/members" }, { name: "curated AI lab list" }, { name: "public-only visibility" }],
    dataIn: "List of AI-focused GitHub orgs",
    dataOut: "Public members with verified org affiliation",
    insight: "Public org membership is the only identity signal GitHub gives us that isn't self-reported — it's the authoritative alternative to parsing the free-text 'company' field in bios.",
    color: "purple",
  },
  "gh-follower-net": {
    description: "Once the first four channels produce a set of high-scoring seeds, their followers are fetched and added to the candidate pool. Network expansion exploits homophily — AI engineers follow other AI engineers — to surface candidates who wouldn't match any keyword search but live inside the community graph. Expansion depth is capped at 1 hop to prevent combinatorial blowup.",
    tech: [{ name: "GitHub REST /users/{}/followers" }, { name: "1-hop expansion" }, { name: "seed from top-k" }],
    dataIn: "Top-scoring seed logins from channels 1–4",
    dataOut: "Follower logins tagged with src:follow/{seed}",
    insight: "Homophily is strongest at the first hop — by the second hop, noise overwhelms signal, which is why 1-hop produces better candidate quality than 2-hop even though coverage is smaller.",
    color: "cyan",
  },
  "gh-seed-domain": {
    description: "Seeds the candidate pool with GitHub handles extracted from company websites already in the Neon companies table — the 'GitHub' link on an engineer's personal bio page on the company's team directory. This bridges the company pipeline and the developer pipeline: if we've already enriched Acme.ai as an AI-native company, any engineer listed on their team page becomes a pre-qualified candidate.",
    tech: [{ name: "Company pages crawl" }, { name: "regex: github.com/{handle}" }, { name: "Neon companies join" }],
    dataIn: "Company team pages + engineer bio pages",
    dataOut: "GitHub logins tagged with src:seed/{company_slug}",
    insight: "Seeding from the company side lets the two pipelines reinforce each other — a candidate discovered via their employer's team page starts with a stronger prior than one pulled cold from keyword search.",
    color: "teal",
  },

  // ── Stage 2: Hydration ────────────────────────────────────────────────
  "graphql-batch": {
    description: "A single GraphQL query batches 50+ fields per user: login, bio, location, company, email, followers, following, isHireable, createdAt, updatedAt, the full contribution calendar (daily counts for 365 days), pinned items (6), top repos (3 by stars), contributed repos (10 external, by stars), org memberships (5). What would be 10+ REST calls collapses into one GraphQL round-trip per batch of users.",
    tech: [{ name: "GitHub GraphQL /graphql" }, { name: "USER_GQL_FIELDS fragment" }, { name: "batched aliases" }],
    dataIn: "Deduplicated candidate logins",
    dataOut: "Fully hydrated GhUser structs (50+ fields each)",
    insight: "GraphQL's per-field cost model means hydrating 50 fields on one user costs the same as hydrating 5 fields on the same user — the batch query is the natural shape of the data, not a premature optimization.",
    color: "purple",
  },
  "dedupe-users": {
    description: "Candidates from six channels are deduped on numeric GitHub id (not login — logins can be renamed). Provenance tags from every channel that surfaced a given user are preserved and merged into the sources map, so a candidate who showed up via bio-search AND stargazer-mining AND follower-expansion retains all three src:* tags. Multi-channel evidence directly boosts the downstream score.",
    tech: [{ name: "HashSet dedup on user.id" }, { name: "provenance merge" }, { name: "is_bot() filter" }],
    dataIn: "Per-channel candidate lists with src:* tags",
    dataOut: "Unique candidate set with merged provenance",
    insight: "Dedup on numeric id (not login) survives handle changes — a user who renamed their GitHub account between two scraping runs would otherwise be counted twice and scored inconsistently.",
    color: "orange",
  },

  // ── Stage 3: Signal Extraction ────────────────────────────────────────
  "activity-profile": {
    description: "Derives an activity profile from the contribution calendar: account_age_days, contributions in the last 30/90/365 days, current and longest commit streaks, days since last active, and a trend label — rising (90d higher than prior 90d), stable, declining, dormant (no activity in 60d), or new (account <60 days old). The trend classifier lets downstream ranking prefer candidates on an upward trajectory over once-famous accounts who have gone quiet.",
    tech: [{ name: "GraphQL contributionCalendar" }, { name: "rolling 30/90/365d windows" }, { name: "trend classifier" }],
    dataIn: "365-day contribution calendar + createdAt/updatedAt",
    dataOut: "ActivityProfile: age, recency, streaks, trend label",
    insight: "Absolute activity is a fame signal; trend is a momentum signal — a mid-tier engineer whose 90d activity tripled is a better hire than a senior whose activity halved.",
    color: "cyan",
  },
  "ai-topic-detect": {
    description: "Scans repo topics, names, and descriptions against a 16-term AI taxonomy: machine-learning, deep-learning, llm, large-language-model, generative-ai, nlp, computer-vision, reinforcement-learning, neural-network, rag, vector-database, embeddings, fine-tuning, ai-agent, multimodal, mlops. Matches across pinned repos, top repos, and external contributions are counted separately — contribution breadth is a stronger signal than personal-repo topic density.",
    tech: [{ name: "16-term AI taxonomy" }, { name: "topic + name + description match" }, { name: "per-source counting" }],
    dataIn: "pinnedItems + topRepositories + repositoriesContributedTo",
    dataOut: "Per-candidate AI-relevance counts by source",
    insight: "Counting topic matches in external contributions (not just own repos) filters out people who star AI projects but don't ship AI code — the highest-variance signal in the discovery pool.",
    color: "amber",
  },
  "skill-extract": {
    description: "Builds a skill tag set per candidate from three independent text sources: bio prose (free-text parsing), language distribution across their repos (Python, Rust, TypeScript…), and repository topics (pytorch, langchain, transformers, jax…). Output tags follow the skill:{name} convention and become queryable facets on the contacts table for later opportunity matching.",
    tech: [{ name: "bio NLP tokenizer" }, { name: "repo language stats" }, { name: "topic → skill mapping" }],
    dataIn: "Bio text + repo languages + repo topics",
    dataOut: "skill:* tag set per candidate",
    insight: "Three-source extraction catches candidates who know something but don't advertise it — someone with 30 PyTorch repos but no 'PyTorch' in their bio still gets the skill:pytorch tag from the language/topic signal.",
    color: "green",
  },
  "seniority-infer": {
    description: "Infers seniority — junior, mid, senior, staff-plus — from the combination of account age, public repo count, contribution volume across the last 365 days, follower count, and title keywords in bio ('principal', 'staff', 'lead'). Deterministic keyword-match classifier, no LLM — the mapping is small enough that the accuracy ceiling is set by input data quality, not model capability.",
    tech: [{ name: "keyword classifier" }, { name: "age + activity + followers" }, { name: "deterministic mapping" }],
    dataIn: "Account age + activity + bio title keywords",
    dataOut: "seniority:{junior|mid|senior|staff-plus} tag",
    insight: "Deliberately deterministic — an LLM-based seniority classifier was prototyped but produced inconsistent labels on identical profiles across runs, breaking downstream dedup and rank stability.",
    color: "indigo",
  },

  // ── Stage 4: Scoring ──────────────────────────────────────────────────
  "rising-score": {
    description: "Composite 0–1 score across nine components: density (contributions per follower — rewards undiscovered talent), novelty (account age), breadth (distinct AI repos contributed to), activity (real commit/PR/review counts), skill relevance (AI skill tag count), engagement (hireable flag, email present, bio completeness), obscurity (inverse of follower count), recency (last 90d calendar signal), and contribution quality (star counts of external repos weighted by AI relevance). Hireable-flag and recent-activity multipliers are applied after the linear combination.",
    tech: [{ name: "9-component composite" }, { name: "linear combination + multipliers" }, { name: "clamped 0–1" }],
    dataIn: "Activity profile + skill tags + AI topic counts + repo quality",
    dataOut: "rising_score ∈ [0, 1] per candidate",
    insight: "The obscurity component is deliberately inverse-weighted on followers — the point of the pipeline is to find engineers the market hasn't priced yet, not to re-rank already-famous accounts.",
    color: "purple",
  },
  "strength-score": {
    description: "An experience-weighted alternative to rising_score: favors candidates with established track records — multi-year account age, high external contribution volume, concentrated depth in a small number of widely-starred repos. Used for opportunity-specific ranking when the role demands proven senior capability rather than emerging talent. Both scores are persisted; UI consumers pick which to rank by per opportunity.",
    tech: [{ name: "experience-weighted composite" }, { name: "depth > breadth" }, { name: "star-weighted quality" }],
    dataIn: "Activity profile + contributed repos + seniority",
    dataOut: "strength_score ∈ [0, 1] per candidate",
    insight: "Two scores with opposite priors (rising favors unknowns, strength favors knowns) lets a single candidate surface for both emerging-talent and senior-hire opportunities without re-computing signals.",
    color: "purple",
  },
  "opp-match": {
    description: "Computes a skill-overlap percentage between the candidate's extracted skill tags and the required-skill list on a specific opportunity (from OPP_SKILLS env or the opportunity's job description). Stored as an opp:skill-match:{pct}pct tag and linked to the opportunity via an opp:{opp_id} tag — recruiters can filter the contacts table by 'show me all candidates ≥70% matched to opp_X' with a simple tag query.",
    tech: [{ name: "set-intersection overlap" }, { name: "opp:skill-match:{pct}pct tag" }, { name: "opp:{opp_id} link" }],
    dataIn: "Candidate skill tags + opportunity required skills",
    dataOut: "Match percentage + opportunity link tag",
    insight: "Storing the match as a tag rather than a score column means one candidate can carry match percentages against many opportunities simultaneously — the tag array scales, a score column would need a separate join table.",
    color: "violet",
  },
  "tier-bucket": {
    description: "Converts the continuous rising_score into a discrete tier tag: A for ≥0.70, B for ≥0.50, C for <0.50. Tier is used for human triage — A-tier candidates get manual review, B-tier enter batch outreach, C-tier stay in the corpus for future opportunities where criteria may differ. The raw score is preserved so the tier can be re-bucketed without re-scoring.",
    tech: [{ name: "threshold bucketing" }, { name: "github:score:{A|B|C} tag" }, { name: "score preserved" }],
    dataIn: "rising_score float",
    dataOut: "github:score:{A|B|C} tag",
    insight: "Tiering is for humans, not machines — the underlying score is a continuous ranking signal; the letter bucket is a triage shortcut that trades precision for a faster recruiter review loop.",
    color: "amber",
  },
  "score-gate": {
    description: "A candidate advances to LanceDB + Neon persistence if EITHER rising_score ≥ threshold (default 0.3) OR strength_score ≥ threshold. Disjunctive gating — not conjunctive — ensures emerging talent (high rising) and established senior engineers (high strength) both survive filtering even though their signal shapes are different. Rejected candidates are logged but not persisted; they can be re-run with a lower threshold on the next pass.",
    tech: [{ name: "disjunctive gate" }, { name: "EXPORT_THRESHOLD env" }, { name: "OR on (rising, strength)" }],
    dataIn: "rising_score + strength_score",
    dataOut: "Pass (persist) or reject (drop)",
    insight: "AND-gating the two scores would discard exactly the populations the second score exists to catch — the gate is deliberately permissive because downstream tagging makes filtering free at read time.",
    color: "orange",
  },

  // ── Stage 5: Persistence ──────────────────────────────────────────────
  "lancedb-vectors": {
    description: "Candidate bios and repo descriptions are concatenated into a contributor-text blob and embedded into a 384-dimensional vector via a local BERT model running on Candle (Metal on Apple silicon, CPU elsewhere). Vectors land in LanceDB alongside the raw fields, enabling cosine-similarity search across the entire candidate corpus with no cloud roundtrip and no per-query cost. 'Find me engineers like this one' becomes an ANN lookup.",
    tech: [{ name: "Candle BERT embeddings" }, { name: "Metal / CPU backend" }, { name: "LanceDB ANN index" }, { name: "384-dim vectors" }],
    dataIn: "Contributor text (bio + pinned + top repos)",
    dataOut: "LanceDB row with vector + fields + score",
    insight: "Local-only embedding is a product decision, not a cost decision — sending engineer profiles to a cloud embedding API means every candidate scan leaks the sourcing target, and no recruiter wants their pipeline in a third-party's logs.",
    color: "cyan",
  },
  "neon-contacts": {
    description: "Passing candidates are upserted into the shared contacts table on github_handle. GitHub-specific enrichment lands in the ai_profile jsonb column (bio, top languages, AI repos, total stars, public_repos, followers, account_age_days, recent_push_count, hireable flag, computed activity_score, specialization, skills, experience_level). authority_score mirrors strength_score; next_touch_score and deletion_score are left for downstream ML. The same row is later reachable by the email outreach pipeline.",
    tech: [{ name: "sqlx upsert" }, { name: "ON CONFLICT (github_handle) DO UPDATE" }, { name: "ai_profile jsonb" }, { name: "shared contacts schema" }],
    dataIn: "Scored candidate + skills + AI profile",
    dataOut: "Persisted contact row with GitHub-specific enrichment",
    insight: "Writing to the same contacts table the company pipeline uses means recruitment candidates and lead-gen prospects share scoring, tagging, and outreach infrastructure — a single engagement log per person regardless of how they entered the funnel.",
    color: "green",
  },
  "contact-tags": {
    description: "Every persisted candidate carries an auditable tag array: github:rising-star (discovery source), github:score:{A|B|C} (tier), github:trend:{rising|stable|declining|dormant|new} (momentum), github:active-this-week / this-month (recency), skill:{pytorch|langchain|rag|...} (facets), seniority:{junior|mid|senior|staff-plus}, opp:{opp_id} (opportunity link), opp:skill-match:{pct}pct (match score), src:bio/{pass} / src:star/{repo} / src:follow/{seed} (provenance). Recruiters can see exactly why every candidate surfaced.",
    tech: [{ name: "JSONB tag array on contacts.tags" }, { name: "structured prefix convention" }, { name: "GIN index for containment queries" }],
    dataIn: "Per-candidate computed signals + provenance",
    dataOut: "Queryable tag array for filtering and audit",
    insight: "Prefix conventions (skill:, seniority:, opp:, src:, github:) make tag-based filtering predictable — a single GIN index on the array handles 'candidates with skill:rag AND seniority:senior AND opp:skill-match:75pct' without any schema churn per tag type.",
    color: "green",
  },

  // ── Stage 6: Handoff ──────────────────────────────────────────────────
  "contact-pipeline": {
    description: "Once persisted, GitHub-sourced candidates are indistinguishable from LinkedIn-sourced contacts to the downstream outreach system. Email discovery, NeverBounce verification, campaign composition, and reply-aware follow-up all operate on the same contacts + contact_emails schema. A recruiter sending a first-touch email to a GitHub rising-star goes through the same two-pass AI composer that drafts cold outreach to enterprise decision-makers.",
    tech: [{ name: "Shared contacts schema" }, { name: "same outreach pipeline" }, { name: "/how-it-works root" }],
    dataIn: "Verified GitHub candidate in contacts table",
    dataOut: "Email campaign with personalized draft",
    insight: "Unifying recruitment and B2B outreach on one contacts table avoids the classic CRM sprawl problem — one schema, one outreach engine, one engagement history per person no matter which pipeline surfaced them.",
    color: "indigo",
  },
};

// ─── Technical Details ─────────────────────────────────────────────

export const technicalDetails: TechnicalDetail[] = [
  {
    type: "card-grid",
    heading: "Six discovery channels",
    description: "Each channel has a different false-positive profile — intersecting evidence across channels produces higher confidence than any single source.",
    items: [
      { label: "bio/keyword search", value: "GitHub REST /search/users with 15 targeted passes (RAG, LLM, DSPy, MLOps, vector DBs, principal/staff titles).", metadata: { signal: "self-declared", strength: "low-medium" } },
      { label: "stargazer mining", value: "Users who starred 13 high-signal AI framework repos (langgraph, crewAI, transformers, dspy, instructor…).", metadata: { signal: "interest", strength: "low" } },
      { label: "contributor mining", value: "Actual code contributors to 12 foundational AI/ML libraries (langchain, llama_index, autogen, vllm, litellm…).", metadata: { signal: "capability", strength: "highest" } },
      { label: "org public members", value: "Public members of 8 AI labs (deepmind, huggingface, cohere-ai, stability-ai, faculty-ai…).", metadata: { signal: "affiliation", strength: "high" } },
      { label: "follower graph", value: "1-hop follower expansion from top-scoring seeds — exploits homophily in the AI-engineer community graph.", metadata: { signal: "homophily", strength: "medium" } },
      { label: "seed domains", value: "GitHub handles extracted from the team pages of already-enriched AI-native companies.", metadata: { signal: "pre-qualified", strength: "high" } },
    ],
  },
  {
    type: "table",
    heading: "Signals extracted per candidate",
    description: "Every field is recomputed on each pipeline run from live GraphQL data — no stale caches.",
    items: [
      { label: "account_age_days", value: "Days since createdAt; novelty component of rising_score.", metadata: { type: "integer" } },
      { label: "contributions_30/90/365d", value: "Rolling windows derived from the contribution calendar.", metadata: { type: "integer" } },
      { label: "trend", value: "rising | stable | declining | dormant | new — computed from 90d-over-90d delta.", metadata: { type: "enum" } },
      { label: "current_streak_days", value: "Consecutive days with at least one contribution.", metadata: { type: "integer" } },
      { label: "pinned_repos_json", value: "Top 6 repos the user pinned on their profile.", metadata: { type: "jsonb" } },
      { label: "contributed_repos_json", value: "Top 10 external repos by stars the user committed to.", metadata: { type: "jsonb" } },
      { label: "organizations_json", value: "Up to 5 org memberships from GraphQL organizations.", metadata: { type: "jsonb" } },
      { label: "ai_topic_matches", value: "Count of 16-term AI taxonomy hits across pinned + top + contributed repos.", metadata: { type: "integer" } },
      { label: "skills", value: "skill:* tags from bio + languages + topics.", metadata: { type: "tag array" } },
      { label: "seniority", value: "junior | mid | senior | staff-plus — deterministic keyword classifier.", metadata: { type: "enum" } },
      { label: "is_hireable", value: "GitHub profile hireable flag; 1.15× multiplier in rising_score.", metadata: { type: "boolean" } },
      { label: "rising_score", value: "9-component composite in [0, 1]; emerging-talent prior.", metadata: { type: "float" } },
      { label: "strength_score", value: "Experience-weighted alternative; senior-hire prior.", metadata: { type: "float" } },
      { label: "src:* provenance", value: "Every discovery channel that surfaced this candidate.", metadata: { type: "tag array" } },
    ],
  },
  {
    type: "code",
    heading: "Batch hydration: one GraphQL query per candidate",
    description: "What would be 10+ REST round-trips collapses into a single batched GraphQL query. Abbreviated below — actual query is in crates/gh/src/client.rs.",
    code: `query UserBatch($logins: [String!]!) {
  users: nodes(ids: $logins) {
    ... on User {
      login bio company location email isHireable
      createdAt updatedAt
      followers { totalCount }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        contributionCalendar {
          weeks { contributionDays { contributionCount date } }
        }
      }
      pinnedItems(first: 6) { nodes { ... on Repository { name stargazerCount } } }
      repositoriesContributedTo(first: 10, orderBy: { field: STARGAZERS, direction: DESC }) {
        nodes { nameWithOwner stargazerCount repositoryTopics(first: 5) { nodes { topic { name } } } }
      }
      organizations(first: 5) { nodes { login name } }
    }
  }
}`,
  },
];

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: ExtraSection[] = [
  {
    heading: "Why Rust + Candle for scoring?",
    content: "Scoring runs on the developer's laptop or a small worker pod, not in a managed ML environment. Rust gives us zero-allocation hot paths through the scoring loop — computing rising_score across 50,000 hydrated candidates is a few seconds, not minutes. Candle provides local BERT inference on Metal (Apple silicon) or CPU with no Python runtime, no CUDA setup, no cloud egress. The practical consequence: a full candidate scan costs roughly $0 in inference and never leaks the sourcing target to a third party.",
    codeBlock: `// crates/gh/Cargo.toml — feature flags
embed = ["patterns", "dep:candle"]            # local BERT, no cloud
lance = ["client", "dep:lancedb", "dep:arrow-array", ...]
neon  = ["patterns", "dep:sqlx", "dep:dotenvy", ...]

// crates/gh/src/contributors.rs — rising_score composite
pub fn compute_rising_score(c: &Candidate) -> f32 {
    let density    = contribs_per_follower(c);    // undiscovered talent
    let novelty    = account_age_score(c);        // newer accounts
    let breadth    = distinct_ai_repo_score(c);   // # of AI repos
    let activity   = real_activity_score(c);      // commits/PRs/reviews
    let relevance  = ai_skill_score(c);           // skill tag count
    let engagement = profile_completeness(c);     // email/hireable/etc
    let obscurity  = 1.0 / (1.0 + c.followers as f32 / 500.0);
    let recency    = last_90d_signal(c);
    let quality    = external_star_quality(c);

    let composite = /* linear combination, clamped */;
    composite * hireable_multiplier(c) * recency_multiplier(c)
}`,
  },
  {
    heading: "Why six channels?",
    content: "Every discovery channel has a characteristic false-positive mode. Bio search surfaces people who describe themselves as AI engineers but don't ship AI code. Stargazer mining surfaces hobbyists who starred a framework once. Contributor mining surfaces real capability but misses anyone who hasn't contributed to the specific 12 repos we track. Org-member mining is biased toward visible AI labs and misses senior engineers at quiet companies. Follower-graph expansion surfaces community-embedded engineers but has a 1-hop limit before noise dominates. Seed-domain extraction only fires for companies already in our enriched set. Running all six and intersecting the results — each candidate carries tags for every channel that surfaced them — produces a candidate pool where every shortlisted profile has multiple independent pieces of evidence.",
    codeBlock: `// crates/gh/src/bin/search_candidates.rs — 6-channel fan-out
// Channel 1: Bio/keyword search (passes A–O)
for (label, query) in search_queries() {
    gh.search_users(query, Some("followers"), Some("desc"), 100, 1).await?;
    // tag: src:bio/{label}
}

// Channel 2: Stargazer mining (13 AI repos)
for repo in stargazer_repos() {
    gh.list_stargazers(repo, 100).await?;
    // tag: src:star/{repo}
}

// Channel 3: Contributor mining (12 core libs)
for repo in contributor_repos() {
    gh.list_contributors(repo, 100).await?;
    // tag: src:contrib/{repo}
}

// Channel 4: London AI org members
for org in london_ai_orgs() {
    gh.list_org_members(org).await?;
    // tag: src:org/{org}
}

// Channel 5: Follower expansion from top-k seeds
// Channel 6: Seed domains (company team pages)`,
  },
  {
    heading: "Auditable provenance at the contact level",
    content: "Every signal that surfaced a candidate is preserved as a tag on their contact row — no black-box scoring. A recruiter looking at a shortlisted engineer sees github:rising-star, github:score:A, github:trend:rising, skill:pytorch, skill:rag, seniority:senior, opp:opp_20260415_principal_ai_eng_ob, opp:skill-match:85pct, src:bio/C, src:contrib/langchain-ai/langgraph, src:org/huggingface — which answers 'why this person?' without requiring access to scoring internals. Tags are stored as a JSONB array with a GIN index, so containment queries ('show me everyone with src:contrib/langchain AND seniority:senior') are O(1).",
    codeBlock: `// src/db/schema.ts — contacts table (GitHub-relevant columns)
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  github_handle: text("github_handle"),              // unique partial index
  ai_profile: jsonb("ai_profile"),                   // ContactAIProfile
  authority_score: real("authority_score"),          // ← strength_score
  tags: jsonb("tags").default([]),                   // GIN-indexed
  // ...
});

// Example tag set on a single contact row
[
  "github:rising-star",
  "github:score:A",
  "github:trend:rising",
  "github:active-this-week",
  "skill:pytorch", "skill:langchain", "skill:rag",
  "seniority:senior",
  "opp:opp_20260415_principal_ai_eng_ob",
  "opp:skill-match:85pct",
  "src:bio/C", "src:contrib/langchain-ai/langgraph",
  "src:org/huggingface"
]`,
  },
  {
    heading: "Trend over fame — the obscurity component",
    content: "The rising_score deliberately inverts follower count through an obscurity component: 1 / (1 + followers / 500). An engineer with 10,000 followers gets an obscurity multiplier of ~0.05; an engineer with 50 followers gets ~0.91. The intent is explicit: the product is a discovery tool, not a re-ranking of already-famous accounts. A 20k-follower AI influencer is not the target hire — a 200-follower engineer who ships three high-star repos is. This is paired with a recency multiplier that boosts candidates active in the last 7/30/90 days, so obscurity alone doesn't surface dormant accounts.",
    codeBlock: `// crates/gh/src/contributors.rs
fn obscurity(c: &Candidate) -> f32 {
    1.0 / (1.0 + c.followers as f32 / 500.0)
}

fn recency_multiplier(c: &Candidate) -> f32 {
    match c.days_since_last_active {
        0..=7  => 1.15,    // active this week
        8..=30 => 1.10,    // active this month
        31..=90 => 1.05,   // active this quarter
        _ => 1.0,
    }
}

fn hireable_multiplier(c: &Candidate) -> f32 {
    if c.is_hireable { 1.15 } else { 1.0 }
}`,
  },
];

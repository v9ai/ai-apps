interface Paper {
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

interface PipelineAgent {
  name: string;
  description: string;
  researchBasis?: string;
}

interface Stat {
  number: string;
  label: string;
  source?: string;
}

// ── Technical Foundations ──────────────────────────────────────────

export const papers: Paper[] = [
  {
    slug: "nextjs-app-router",
    number: 1,
    title: "Next.js 16 App Router",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2025,
    finding:
      "React 19 Server Components execute on the server by default, reducing client bundle size and enabling direct async data access without client-side waterfalls. Layouts and pages are streamed via Suspense boundaries, and the App Router colocates route handlers, metadata, and loading states per segment.",
    relevance:
      "Powers all UI — company listings, contact management, email campaign dashboards, and admin pages. Server Components fetch from the GraphQL API without exposing credentials to the browser; Client Components are used only where interactivity is required (forms, modals, real-time status).",
    url: "https://nextjs.org/docs/app",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "postgresql-neon",
    number: 2,
    title: "PostgreSQL with Neon",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 3,
    authors: "Neon",
    year: 2024,
    finding:
      "Serverless PostgreSQL that separates compute from storage, enabling instant branching, scale-to-zero cold starts, and connection pooling via the @neondatabase/serverless driver optimised for HTTP/WebSocket transport in edge and serverless runtimes where persistent TCP connections are unavailable.",
    relevance:
      "Stores the entire lead-gen dataset — companies, contacts, contact_emails, email_campaigns, email_templates, company_facts, company_snapshots, and received_emails. All queries run through Drizzle ORM over the Neon HTTP driver; indexes on is_remote_eu, ai_tier, and company_id columns keep paginated filtering fast.",
    url: "https://neon.tech",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "drizzle-orm",
    number: 4,
    title: "Drizzle ORM",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Drizzle Team",
    year: 2024,
    finding:
      "TypeScript-first SQL query builder that infers full column-level types from the schema definition, making runtime type mismatches impossible. The query builder compiles to plain SQL with zero runtime overhead, supports inArray, sql template helpers, and the hasMore pagination trick (fetch limit+1, no COUNT) for single-query pagination.",
    relevance:
      "Defines the canonical schema in src/db/schema.ts — all tables, indexes, and relations. Every GraphQL resolver queries via Drizzle; migrations are generated with pnpm db:generate and applied with pnpm db:migrate. Raw SQL strings in resolvers are explicitly prohibited to keep type safety intact.",
    url: "https://orm.drizzle.team",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "better-auth",
    number: 5,
    title: "Better Auth",
    category: "Authentication",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Better Auth",
    year: 2024,
    finding:
      "Self-hosted authentication library with a Drizzle adapter that writes session and account rows directly into the application's PostgreSQL database. Provides email/password credential flows, session token rotation, and a plugin architecture for OAuth providers — no third-party auth SaaS dependency.",
    relevance:
      "Handles sign-in and sign-up via the shared @ai-apps/auth package. The GraphQLContext carries userId and userEmail extracted from the session token on every request. Admin-gated mutations call isAdminEmail() — resolvers throw Forbidden before touching the DB if the check fails.",
    url: "https://www.better-auth.com",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "deepseek-llm",
    number: 6,
    title: "DeepSeek LLM",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "DeepSeek",
    year: 2024,
    finding:
      "Mixture-of-Experts architecture with 671B total parameters (37B active per forward pass), trained with multi-token prediction and Group Relative Policy Optimisation. Delivers GPT-4-class reasoning at roughly 10x lower cost per token, making it viable for high-volume structured extraction tasks where per-call economics matter.",
    relevance:
      "Runs company deep-analysis and AI-tier classification (not AI / AI-first / AI-native) with confidence scores, service extraction, and tech-stack inference from live website HTML. Also drives the ComposeFromLinkedIn component for AI-drafted personalised outreach. Routed through OpenRouter for fallback and model switching.",
    url: "https://platform.deepseek.com",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "graphql-codegen",
    number: 7,
    title: "GraphQL Code Generator",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "The Guild",
    year: 2024,
    finding:
      "Static analysis tool that parses GraphQL SDL schemas and operation documents to emit TypeScript: resolver type signatures, scalar mappings, and React Apollo hooks with full generic inference. The client preset also enforces fragment co-location and masked fragment types to prevent over-fetching at compile time.",
    relevance:
      "After every schema change (pnpm codegen), regenerates src/__generated__/ — typed hooks like useGetContactsQuery and useCreateContactMutation consumed by UI components, plus resolver types like QueryJobsArgs and CompanyResolvers used by Apollo Server resolvers. Editing generated files is prohibited; the type contract is enforced at codegen time.",
    url: "https://the-guild.dev/graphql/codegen",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "vercel-ai-sdk",
    number: 8,
    title: "Vercel AI SDK",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2025,
    finding:
      "Provider-agnostic TypeScript SDK that unifies streaming text generation, structured object generation (generateObject with Zod schemas), and tool-call orchestration across OpenAI, Anthropic, and OpenRouter. Uses the AI Data Stream Protocol for incremental UI updates and exposes useChat/useCompletion React hooks backed by ReadableStream.",
    relevance:
      "Used across src/agents/ and src/anthropic/ for all LLM calls — company enrichment, the SQL agent (text-to-sql route), the admin agent, and the strategy enforcer. generateObject with Zod schemas constrains model output to the exact shape expected by GraphQL resolvers, eliminating post-hoc JSON parsing errors.",
    url: "https://sdk.vercel.ai",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "neverbounce",
    number: 9,
    title: "NeverBounce",
    category: "Verification",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "ZoomInfo / NeverBounce",
    year: 2024,
    finding:
      "Real-time email verification API that performs SMTP handshake simulation, MX record resolution, disposable domain detection, and catch-all server classification without sending an actual email. Returns a verdict of valid / invalid / disposable / catchall / unknown with a numeric confidence score.",
    relevance:
      "Called during the contact discovery stage before any outreach is attempted. Unverified or invalid emails are flagged in the contact_emails table; only contacts with a passing NeverBounce verdict enter the campaign queue. This keeps bounce rates below the thresholds that trigger sending-domain reputation penalties with Resend.",
    url: "https://neverbounce.com",
    categoryColor: "var(--teal-9)",
  },
  {
    slug: "apollo-server-5",
    number: 10,
    title: "Apollo Server 5",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Apollo GraphQL",
    year: 2024,
    finding:
      "HTTP-framework-agnostic GraphQL server with a standalone fetch-based handler, incremental delivery support, and a plugin API for request lifecycle hooks. DataLoader integration batches and caches field-level DB lookups per request tick, collapsing N+1 query patterns into a single batched SELECT regardless of how many parent objects appear in the response.",
    relevance:
      "Serves the /api/graphql route used by every UI component and external script. Context is constructed per request — db, userId, userEmail, and loaders (DataLoaders for companies, contacts, jobSkills). DataLoaders are mandatory for field resolvers: context.loaders.company.load(id) instead of direct db.select() prevents one SELECT per row in lists.",
    url: "https://www.apollographql.com/docs/apollo-server",
    categoryColor: "var(--orange-9)",
  },
];

// ── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "7",
    label: "Extraction methods per company: JSON-LD, meta tags, DOM heuristics, and LLM — each with a per-field confidence score stored in company_facts",
    source: "ExtractMethod enum: JSONLD | META | DOM | HEURISTIC | LLM",
  },
  {
    number: "3-tier",
    label: "AI classification taxonomy with calibrated confidence (0–1 real): not-AI → AI-first → AI-native — fixed labels prevent category drift across enrichment runs",
    source: "ai_tier integer + ai_classification_confidence real column",
  },
  {
    number: "4+",
    label: "Candidate email addresses generated per contact via domain-pattern synthesis (first.last@, f.last@, first@, last@), then filtered to verified by NeverBounce with status: valid | invalid | catch-all | unknown",
    source: "contact_emails table + NeverBounce API",
  },
  {
    number: "2-pass",
    label: "LLM email generation: parallel research on contact + company context feeds a draft pass, then a refinement pass strips AI artifacts before send — correlated end-to-end via Resend message IDs and webhook reply events",
    source: "ComposeFromLinkedIn + Resend webhooks → received_emails",
  },
];

// ── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Company Discovery",
    description: "Three ingestion paths fan-in to a single deduplication gate: Common Crawl CDX index queries (pre-crawled archive, no rate-limit pressure), live web search + HTTP fetch for recently-founded companies absent from the archive, and bulk JSON import via /api/companies/bulk-import for seeding from existing prospect lists. Deduplication keys on the canonical domain after URL normalization (strip www, trailing slash). Net-new records land in the companies table with a unique key slug, last_seen_crawl_id, and capture_timestamp for provenance.",
    researchBasis: "Multi-source fan-in with domain-keyed entity resolution",
  },
  {
    name: "Enrichment & AI Classification",
    description: "Live website content is fetched per company and passed through a layered extraction stack — JSON-LD structured data first, then HTML meta tags, then DOM heuristics, then LLM extraction as a fallback — each producing evidence records in company_facts with a per-field confidence score (real, 0–1) and a source_type + method provenance label. Extracted signals (services, industries, tech stack) feed two parallel DeepSeek calls: a 3-class AI tier classifier (not-AI / AI-first / AI-native) that returns a confidence score and classification rationale, and a deep analysis generator that produces a structured Markdown report covering technical maturity, product focus, and outreach talking points. Both outputs are Zod-schema-constrained before DB write.",
    researchBasis: "Layered extraction cascade (JSONLD → META → DOM → HEURISTIC → LLM) with Zod-constrained structured output and calibrated confidence scores",
  },
  {
    name: "Contact Discovery & Verification",
    description: "Contact records are anchored to a LinkedIn profile URL, which serves as the canonical dedup key across all create and upsert operations. Email discovery synthesizes 2–5 candidate addresses per contact by combining the contact's name with the company's canonical_domain across common enterprise patterns (first.last@, f.last@, first@, last@). All candidates are submitted to NeverBounce for deliverability verification, returning a status (valid / invalid / catch-all / unknown), nb_execution_time_ms, and a suggested correction when available. Invalid addresses are stored in bounced_emails on the contact row rather than discarded — preventing re-verification of known-bad addresses and building a contact-level bounce history.",
    researchBasis: "Pattern-based email synthesis + NeverBounce API verification with persistent bounce history",
  },
  {
    name: "Email Outreach",
    description: "ComposeFromLinkedIn runs parallel research — contact LinkedIn profile plus enriched company context — before calling DeepSeek in two sequential passes: a draft pass that produces subject line, plain-text body, and HTML, then a refinement pass that strips LLM-artifact phrasing and adjusts tone. Batch campaigns are defined as email_campaign records with a JSON sequence array and delay_days config. Each send hits the Resend API and stores the returned message ID for webhook correlation. Reply tracking is webhook-driven: Resend posts delivery events to the inbound handler, which updates reply_received and pauses the follow-up sequence for that contact thread.",
    researchBasis: "Two-pass LLM generation with Resend message ID correlation and webhook-driven reply detection",
  },
  {
    name: "Inbound & Follow-ups",
    description: "Resend webhooks deliver inbound replies and delivery events to the received_emails table with full payload storage. Each event is correlated to its outbound contact_email record via the Resend message ID, updating reply_received_at and setting followup_status to completed on reply. Follow-up scheduling reads send history plus reply status for each contact to compute the next send time from the campaign's delay_days config, skipping contacts who have replied or are marked do_not_contact. The sequence_type column (initial / followup_1 / followup_2 / followup_3) and parent_email_id form a linked-list thread structure for full conversation context.",
    researchBasis: "Event-driven reply correlation via Resend message IDs with reply-aware sequence state machine",
  },
];

// ── Narrative ─────────────────────────────────────────────────────

export const story =
  "The pipeline ingests companies from three sources — Common Crawl CDX, live web fetch, and bulk import — deduplicating on canonical domain before writing to Neon PostgreSQL. Each company is enriched through a layered extraction stack (JSON-LD → meta → DOM → LLM fallback), with every extracted field stored as a company_facts evidence record carrying a source type, extraction method, and per-field confidence score. Two parallel DeepSeek calls produce a 3-class AI tier classification (not-AI / AI-first / AI-native) with a calibrated confidence float, and a structured deep analysis report — both Zod-constrained before DB write. On the contact side, email candidates are synthesized from name-plus-domain patterns, verified through NeverBounce, and stored with full bounce history to prevent re-verification. Outreach uses a two-pass LLM generation flow (draft → refine) anchored to the contact's LinkedIn profile and the enriched company context, then delivers via Resend with message-ID-correlated webhook reply tracking and a reply-aware follow-up state machine.";

// ── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "Next.js 16 App Router with React 19 Server Components for the frontend. All application queries go through an Apollo Server 5 GraphQL API at /api/graphql, with Drizzle ORM as the query builder over Neon PostgreSQL. DataLoaders in the Apollo context prevent N+1 on relational fields (contacts → company, contact_emails → contact). The /api/companies/bulk-import and /api/companies/enhance REST routes handle admin data operations outside the GraphQL surface, both guarded by isAdminEmail() session checks. Vercel routes are capped at 60s max duration.",
  },
  {
    heading: "Evidence-Based Data Model",
    content: "The companies golden record is built from a two-table evidence store. company_facts holds per-field observations: each row records the field name, value_json/value_text, a confidence score (real 0–1), source_type (COMMONCRAWL / LIVE_FETCH / MANUAL / PARTNER), extraction method (JSONLD / META / DOM / HEURISTIC / LLM), extractor_version, and a WARC pointer (filename, offset, length, digest) for reproducibility. company_snapshots stores the raw HTML text sample, parsed JSON-LD, and full extractor output per crawl, keyed on (company_id, content_hash) to deduplicate re-crawls of unchanged pages.",
  },
  {
    heading: "Zod-Constrained LLM Outputs",
    content: "All LLM outputs that write to the DB pass through Zod schemas before persistence. The AI tier classifier output is validated against a fixed 3-value enum (0 = not-AI, 1 = AI-first, 2 = AI-native) with a confidence real and a classification reason string. Skill extraction validates each tag against the taxonomy, enforces SkillLevel (required / preferred / nice), and caps arrays at 30 skills — preventing taxonomy drift across enrichment runs. Company category is validated against a 7-value enum (CONSULTANCY / AGENCY / STAFFING / DIRECTORY / PRODUCT / OTHER / UNKNOWN) at the resolver layer with a fallback to OTHER for unrecognized values.",
  },
  {
    heading: "Contact Identity & Bounce Tracking",
    content: "The LinkedIn profile URL is the canonical entity key for contacts — all upserts, dedup checks, and outreach lookups key on linkedin_url, indexed via idx_contacts_linkedin_url. Email verification state is stored at two levels: the contact row holds nb_status, nb_result, nb_flags (JSON array), nb_suggested_correction, nb_execution_time_ms, and email_verified boolean for the primary email; the bounced_emails JSON array on the contact accumulates all historically invalid addresses to prevent redundant NeverBounce calls. do_not_contact is a boolean flag that outreach queries must filter on — it is checked in resolver logic before any campaign send.",
  },
  {
    heading: "Outreach Sequence State Machine",
    content: "Each sent email is a contact_emails row with a sequence_type (initial / followup_1 / followup_2 / followup_3), a sequence_number, and a parent_email_id foreign key forming a thread chain. followup_status (pending / completed) and reply_received boolean are updated by the Resend webhook handler when a reply or delivery event arrives, correlated via the Resend message ID stored on the row. Email campaigns define their sequence as a JSON array of step configs and a delay_days JSON array. The follow-up scheduler reads both arrays along with the contact's reply status to compute next send time, skipping any contact where reply_received = true or do_not_contact = true.",
  },
  {
    heading: "Deployment & Observability",
    content: "Deployed on Vercel with serverless functions capped at 60s. Neon PostgreSQL provides serverless branching — branch-per-migration-test workflow supported via pnpm db:generate + pnpm db:migrate. Resend handles transactional email delivery with webhook-based event callbacks stored in received_emails. LangSmith tracing is wired to DeepSeek enrichment calls for prompt-level observability. The strategy enforcer (src/agents/strategy-enforcer.ts) validates staged changes against the Two-Layer Model — blocking commits that add raw LLM calls without Zod schema constraints or that bypass the eval-first accuracy bar.",
  },
];

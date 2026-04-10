import type { Paper, PipelineAgent, Stat, TechnicalDetail, ExtraSection } from "@ai-apps/ui/how-it-works";

// ─── Technical Foundations ──────────────────────────────────────────

export const papers: Paper[] = [
  {
    slug: "nextjs-15",
    number: 1,
    title: "Next.js 15",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding: "React framework with App Router for server-side rendering, static generation, and API routes",
    relevance: "Used for the entire web application, with server components (e.g., src/app/admin/contacts/page.tsx) and client components for interactive parts like CompanyContactsClient",
    url: "https://nextjs.org/docs",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "postgresql-neon",
    number: 2,
    title: "PostgreSQL (Neon)",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Neon",
    year: 2024,
    finding: "Serverless PostgreSQL with branching and auto-scaling capabilities",
    relevance: "Stores core data like companies and contacts via Drizzle ORM schema (src/db/schema.ts), with tables companies and contacts for lead management",
    url: "https://neon.tech/docs",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "better-auth",
    number: 3,
    title: "Better Auth",
    category: "Authentication",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "AI Apps",
    year: 2024,
    finding: "Authentication library with server-side session management and email/password support",
    relevance: "Handles user authentication via @ai-apps/auth, with server-side checks in checkIsAdmin() (src/lib/admin.ts) for admin routes",
    url: "https://github.com/ai-apps/auth",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "openai-gpt",
    number: 4,
    title: "OpenAI GPT",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "OpenAI",
    year: 2024,
    finding: "Large language model for natural language understanding and generation",
    relevance: "Used in contact enrichment via src/lib/ai-contact-enrichment.ts and intent detection via analyzeLinkedInPosts mutation",
    url: "https://platform.openai.com/docs",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "candle-rust",
    number: 5,
    title: "Candle (Rust)",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Hugging Face",
    year: 2024,
    finding: "Rust ML framework for efficient, local model inference with Metal acceleration",
    relevance: "Powers the local embedding server on port 9998, generating JobBERT-v2 embeddings for lead scoring and similarity search",
    url: "https://github.com/huggingface/candle",
    categoryColor: "var(--amber-9)",
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
    finding: "TypeScript ORM with schema migrations and type-safe queries",
    relevance: "Manages database schema in src/db/schema.ts, defining tables like companies and contacts with relationships and indexes",
    url: "https://orm.drizzle.team/docs",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "graphql-apollo",
    number: 7,
    title: "GraphQL (Apollo)",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Apollo",
    year: 2024,
    finding: "Query language for APIs with a single endpoint and generated types",
    relevance: "Used for data fetching via queries like GetContacts and mutations like CreateDraftCampaign, with hooks in admin components",
    url: "https://www.apollographql.com/docs",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "inngest",
    number: 8,
    title: "Inngest",
    category: "Infrastructure",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Inngest",
    year: 2024,
    finding: "Background job processing with event-driven scheduling and retries",
    relevance: "Orchestrates pipeline tasks like data ingestion and email sending, triggered by events from scripts and mutations",
    url: "https://www.inngest.com/docs",
    categoryColor: "var(--red-9)",
  },
  {
    slug: "resend",
    number: 9,
    title: "Resend",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Resend",
    year: 2024,
    finding: "Email API with React components and webhook support for tracking",
    relevance: "Sends personalized emails via mutations like useCreateDraftCampaignMutation, with webhook validation for email events",
    url: "https://resend.com/docs",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "jobbert-v2",
    number: 10,
    title: "JobBERT-v2",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "TechWolf",
    year: 2024,
    finding: "BERT model fine-tuned for job and company embeddings",
    relevance: "Generates embeddings via Candle server for semantic search in useGetSimilarPostsLazyQuery and lead scoring based on distance",
    url: "https://huggingface.co/techwolf/jobbert-v2",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "radix-ui",
    number: 11,
    title: "Radix UI",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix UI",
    year: 2024,
    finding: "Unstyled, accessible component primitives for building UIs",
    relevance: "Used in components like BatchEmailModal and EditCampaignDialog for consistent, interactive UI elements",
    url: "https://www.radix-ui.com/docs",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "vanilla-extract",
    number: 12,
    title: "Vanilla Extract",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vanilla Extract",
    year: 2024,
    finding: "CSS-in-JS library with zero-runtime styles and TypeScript support",
    relevance: "Styles the application with Next.js plugin, providing type-safe CSS for components like LandingPipeline",
    url: "https://vanilla-extract.style/docs",
    categoryColor: "var(--blue-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "7",
    label: "Pipeline modules visualized in LandingPipeline component",
    source: "Component analysis",
  },
  {
    number: "0..1",
    label: "Lead fit score range stored in companies.score column",
    source: "Database schema (src/db/schema.ts)",
  },
  {
    number: "9998",
    label: "Port for local Candle embedding server",
    source: "Embedding server configuration",
  },
  {
    number: "50",
    label: "Page size for paginated admin tables (PAGE_SIZE constant)",
    source: "src/app/admin/contacts/page.tsx",
  },
  {
    number: "3",
    label: "AI tier levels: 0=not AI, 1=ai_first, 2=ai_native",
    source: "Database schema (companies.ai_tier)",
  },
  {
    number: "300ms",
    label: "Debounce delay for search input in admin contacts",
    source: "src/app/admin/contacts/page.tsx debounce pattern",
  },
  {
    number: "8am UTC",
    label: "Default send time for business-day scheduled emails",
    source: "src/lib/business-days.ts",
  },
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Company Discovery",
    description: "The pipeline begins with a Rust-based web crawler (crates/agentic-search) that discovers tech companies via commands like cargo run --release -- --root ../.. discover --output discovery.json. This outputs raw company data to src/app/stack/discovery.json, which includes domains and initial metadata. The crawler uses Brave Search API for web discovery, targeting AI and tech sectors based on configured queries. This step ensures a broad input of potential leads for enrichment.",
    researchBasis: "Rust for performance, Brave Search API for web data",
    codeSnippet: "cargo run --release -- --root ../.. discover --output discovery.json",
    dataFlow: "Web queries \u2192 Rust crawler \u2192 JSON file (discovery.json)",
  },
  {
    name: "Profile Enrichment",
    description: "TypeScript scripts (e.g., scripts/scrape-linkedin-people.ts) enrich company profiles by scraping LinkedIn for contacts and posts. The Rust crate linkedin-posts (cargo run --bin linkedin-posts) handles real-time post monitoring, while scripts fetch GitHub data via src/lib/ai-contact-enrichment.ts. This step uses regex patterns (e.g., AI_TAG_RE) to detect AI professionals and fetches repos with AI_GITHUB_TOPICS. Data is validated with NeverBounce for emails and stored temporarily for processing.",
    researchBasis: "LinkedIn scraping, GitHub API, regex detection",
    codeSnippet: "const AI_TAG_RE = /\\b(ai|ml|llm|nlp)\\b/i;",
    dataFlow: "LinkedIn/GitHub APIs \u2192 TypeScript scripts \u2192 enriched contact objects",
  },
  {
    name: "AI Embedding Generation",
    description: "A local Candle embedding server (port 9998) generates JobBERT-v2 embeddings for company descriptions and posts. This uses the Rust ML framework with Metal acceleration for efficiency, avoiding cloud API costs. Embeddings are computed via batch processing, often triggered by Inngest jobs, and stored for semantic search. The embeddings enable similarity queries (useGetSimilarPostsLazyQuery) and contribute to lead scoring based on cosine distance.",
    researchBasis: "Candle framework, JobBERT-v2 model",
    codeSnippet: "Embedding server on http://localhost:9998",
    dataFlow: "Text data \u2192 Candle server \u2192 vector embeddings",
  },
  {
    name: "Data Storage & Scoring",
    description: "Enriched data is stored in PostgreSQL via Drizzle ORM, with tables like companies and contacts defined in src/db/schema.ts. An ensemble scoring system combines multiple signals: AI tier (from regex detection), intent (from analyzeLinkedInPosts mutation), GitHub activity, and embedding similarity. Scores are computed server-side and stored in the companies.score column (0..1), with reasons tracked in JSON arrays. This step ensures leads are ranked by relevance.",
    researchBasis: "PostgreSQL, Drizzle ORM, ensemble learning",
    codeSnippet: "score REAL DEFAULT 0.5, ai_tier INTEGER DEFAULT 0",
    dataFlow: "Enriched data \u2192 Drizzle ORM \u2192 PostgreSQL tables with scores",
  },
  {
    name: "Email Campaign Delivery",
    description: "Scored leads are delivered via personalized email campaigns using Resend. Mutations like useCreateDraftCampaignMutation create campaigns, which are scheduled with business-day logic from src/lib/business-days.ts (skips weekends, sets 8am UTC). The system uses Resend webhooks for tracking and sends emails via POST /api/emails/send. Admin can monitor campaigns in src/app/admin/contacts/page.tsx with real-time updates.",
    researchBasis: "Resend API, business scheduling",
    codeSnippet: "export function getNextBusinessDay(offset: number, options: GetNextBusinessDayOptions = {}): Date",
    dataFlow: "Scored leads \u2192 Resend mutations \u2192 scheduled emails \u2192 recipient inboxes",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "The system starts by discovering tech companies via a Rust-based web crawler (crates/agentic-search) that outputs to discovery.json. TypeScript scripts (scripts/scrape-linkedin-people.ts) then enrich LinkedIn profiles, while a Candle embedding server generates JobBERT-v2 embeddings for semantic analysis. Enriched data is stored in PostgreSQL via Drizzle ORM, scored using an ensemble of AI tier, intent, and GitHub signals, and finally delivered as personalized email campaigns via Resend, scheduled with business-day logic from src/lib/business-days.ts.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: ExtraSection[] = [
  {
    heading: "System Architecture",
    content: "The application uses a monorepo with Next.js 15 as the main framework, Rust crates for performance-critical tasks (crawling, embeddings), and shared workspace packages like @ai-apps/auth. Server components handle data fetching (e.g., src/app/admin/contacts/page.tsx), while client components manage interactivity (e.g., CompanyContactsClient). The architecture emphasizes local-first AI with Candle embeddings, GraphQL for API communication, and Inngest for background job orchestration. Key decisions include Rust for web crawling to improve speed and reduce cloud dependencies.",
  },
  {
    heading: "Database Design",
    content: "PostgreSQL (via Neon) stores all lead data with a schema defined in src/db/schema.ts. Core tables include companies (with columns like key, score, ai_tier) and contacts (with ai_profile JSONB). Relationships are 1:N from companies to contacts, linkedin_posts, and email_campaigns. Indexes on companies(key) and companies(score) optimize lookups and sorting. The design supports golden record resolution via canonical_domain to deduplicate companies and a blocklist via companies.blocked to exclude irrelevant entries from the pipeline.",
  },
  {
    heading: "Security & Auth",
    content: "Authentication is handled by Better Auth (@ai-apps/auth) with email/password, using server-side session validation via auth.api.getSession(). Admin routes are protected by checkIsAdmin() in src/lib/admin.ts, which checks against ADMIN_EMAIL. Environment variables (e.g., BETTER_AUTH_SECRET, API keys) are stored in .env.local. Webhook endpoints validate secrets (e.g., Resend webhook secret), and rate limiting is inferred for external APIs. The system includes a dev bypass via NEXT_PUBLIC_ADMIN_EMAIL for easier testing.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "The app is deployed on Vercel (implied by Next.js), with PostgreSQL hosted on Neon for serverless scaling. Background jobs use Inngest for event-driven processing, likely with scheduled crons for data ingestion. Rust services (crates/) are built with Cargo and integrated via npm scripts (e.g., pnpm linkedin:people). The local Candle embedding server runs on port 9998, possibly containerized for production. Environment configuration includes keys for OpenAI, DeepSeek, Resend, and other external services, managed through Vercel environment variables.",
  },
  {
    heading: "AI Integration",
    content: "AI is integrated via multiple providers: OpenAI GPT for contact enrichment and intent detection, DeepSeek as a fallback LLM, and local JobBERT-v2 embeddings via Candle. The system uses regex and topic-based detection in src/lib/ai-contact-enrichment.ts to identify AI contacts. Embeddings enable semantic search through useGetSimilarPostsLazyQuery for lead similarity. LangChain and LlamaIndex packages are included for potential RAG workflows, though primary retrieval uses vector search with hybrid keyword filtering. Ensemble scoring combines AI signals into a final lead score.",
  },
  {
    heading: "Pipeline Orchestration",
    content: "The lead generation pipeline is orchestrated through a combination of scheduled scripts and background jobs. Rust crates (agentic-search, linkedin-posts) handle discovery and scraping, outputting to JSON files. TypeScript scripts (e.g., scripts/scrape-linkedin-people.ts) process and enrich data, triggered by Inngest events or manual runs. The Candle server batches embedding generation, and scores are computed server-side. Email campaigns are scheduled via business-day logic in src/lib/business-days.ts, with Resend handling delivery and tracking. The LandingPipeline component visualizes this 7-step flow for monitoring.",
  },
  {
    heading: "Frontend Patterns",
    content: "The frontend uses React 18+ with Server Components for data fetching and Client Components for interactivity. Radix UI provides unstyled primitives for modals and dialogs (e.g., BatchEmailModal), styled with Vanilla Extract and Panda CSS. State management leverages React hooks and providers (CompaniesProvider). Key patterns include search debouncing in admin tables (300ms delay), pagination with PAGE_SIZE=50, and real-time updates via GraphQL cache-and-network policy. The UI is designed for admin efficiency with bulk operations and detailed lead views.",
  },
  {
    heading: "Performance Optimizations",
    content: "Performance is optimized through Rust for CPU-intensive tasks (crawling, embeddings), local AI inference to avoid cloud latency, and efficient database queries with Drizzle ORM and indexes. The frontend uses Suspense boundaries for lazy loading, debounced search to reduce GraphQL calls, and pagination to limit data transfer. The embedding server leverages Metal acceleration on macOS. Background jobs via Inngest ensure non-blocking operations, and business-day scheduling reduces email send failures. The hybrid stack balances speed (Rust) with developer productivity (TypeScript).",
  },
];

// ─── Technical Details ────────────────────────────────────────────

export const technicalDetails: TechnicalDetail[] = [
  {
    type: "table",
    heading: "Core Database Tables",
    description: "Key PostgreSQL tables managed by Drizzle ORM in src/db/schema.ts",
    items: [
    {
      label: "companies",
      value: "Stores company data with scores and AI tiers",
      metadata: {"columns": "id, key, name, canonical_domain, category, score, ai_tier, blocked"},
    },
    {
      label: "contacts",
      value: "Stores contact details with AI profile JSON",
      metadata: {"columns": "id, company_id, email, linkedin_url, department, tags, ai_profile"},
    },
    {
      label: "linkedin_posts",
      value: "Stores scraped LinkedIn content for intent analysis",
      metadata: {"inferred": "Referenced by useGetLinkedInPostsQuery"},
    },
    {
      label: "email_campaigns",
      value: "Manages email outreach campaigns",
      metadata: {"inferred": "Referenced by useCreateDraftCampaignMutation"},
    },
    ],
  },
  {
    type: "diagram",
    heading: "System Architecture Diagram",
    description: "High-level flow of data through the hybrid Rust/TypeScript pipeline",
    code: "Input Sources \u2192 Rust Crawlers (agentic-search, linkedin-posts) \u2192 TypeScript Scripts (scrape-linkedin-people.ts) \u2192 Candle Embedding Server \u2192 PostgreSQL Database \u2192 GraphQL API \u2192 Next.js Frontend \u2192 Resend Emails",
  },
  {
    type: "code",
    heading: "Admin Gate Pattern",
    description: "Server-side function to protect admin routes using Better Auth",
    code: "export async function checkIsAdmin(): Promise<{\n  isAdmin: boolean;\n  userId: string | null;\n  userEmail: string | null;\n}> {\n  const session = await auth.api.getSession({ headers: await headers() });\n  return {\n    isAdmin: session?.user.email === ADMIN_EMAIL,\n    userId: session?.user.id,\n    userEmail: session?.user.email,\n  };\n}",
  },
  {
    type: "card-grid",
    heading: "AI Detection Strategies",
    description: "Methods used to identify AI-related contacts and companies",
    items: [
    {
      label: "Regex Pattern",
      value: "AI_TAG_RE for contact tags and departments",
      metadata: {"pattern": "/\\b(ai|ml|llm|nlp|deep[- ]?learning|machine[- ]?learning|data[- ]?science)\\b/i"},
    },
    {
      label: "GitHub Topics",
      value: "Set of 20+ AI-related topics (e.g., machine-learning, llm)",
      metadata: {"example": "AI_GITHUB_TOPICS = new Set([\"machine-learning\", \"deep-learning\"])"},
    },
    {
      label: "Embedding Similarity",
      value: "JobBERT-v2 embeddings for semantic company matching",
      metadata: {"use": "useGetSimilarPostsLazyQuery"},
    },
    ],
  },
];

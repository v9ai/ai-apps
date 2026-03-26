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
    title: "Next.js 14 App Router",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding: "Server-side rendering by default with React Server Components for improved performance and SEO",
    relevance: "Powers the entire frontend with server components like src/app/page.tsx for job listings and client components for admin pages like /admin/contacts",
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
    finding: "Serverless PostgreSQL with branching and auto-scaling for transactional data",
    relevance: "Stores primary data like jobs, contacts, and campaigns via Drizzle ORM tables (jobs, contacts, email_campaigns) with RLS policies for security",
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
    finding: "Type-safe SQL query builder with migrations and schema management",
    relevance: "Defines database schema in src/db/schema.ts and handles queries for GraphQL API, including tables like blocked_companies and reported_jobs",
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
    finding: "Self-hosted auth library with email/password sessions and Drizzle adapter for PostgreSQL",
    relevance: "Handles sign-in/sign-up via @ai-apps/auth package, with admin access controlled by email check in isAdminEmail() function",
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
    finding: "Cost-effective large language model for text classification and generation tasks",
    relevance: "Used by lead-gen-process-jobs worker to classify jobs for EU remote compatibility and extract skills via scripts/extract-job-skills.ts",
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
    finding: "Automatically generates TypeScript types and React hooks from GraphQL schemas",
    relevance: "Creates hooks like useGetContactsQuery and useCreateContactMutation in src/__generated__/hooks for type-safe API interactions",
    url: "https://the-guild.dev/graphql/codegen",
    categoryColor: "var(--orange-9)",
  },
];

// ── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "O(log n)",
    label: "Search complexity for job filtering via GraphQL pagination",
    source: "GraphQL queries use limit and offset with indexed PostgreSQL tables",
  },
  {
    number: "4",
    label: "Primary LLM integration points: classification, email drafting, report analysis, skill extraction",
    source: "Technical analysis of AI/LLM usage across the platform",
  },
];

// ── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Job Ingestion & Crawling",
    description: "ATS platform fetchers (Greenhouse, Lever, Ashby) ingest jobs via API, then scripts process and classify them for EU remote compatibility.",
    researchBasis: "ATS API integration for structured job data ingestion",
  },
  {
    name: "AI Classification & EU Validation",
    description: "DeepSeek LLM classifies jobs for EU remote compatibility, with heuristic pre-filtering and structured output validation, storing results in PostgreSQL via Drizzle ORM.",
    researchBasis: "LLM prompt engineering with structured output grounding",
  },
  {
    name: "Job Display & User Interaction",
    description: "UnifiedJobsProvider component fetches jobs via GraphQL queries, filtered through Drizzle ORM, and renders them with search and pagination. Users authenticate via Better Auth, and admins access protected routes like /admin/contacts.",
    researchBasis: "Next.js Server Components and GraphQL for real-time data fetching",
  },
  {
    name: "Admin Campaign Management",
    description: "Admins use BatchEmailModal and ComposeFromLinkedIn components to draft AI-assisted emails from LinkedIn profiles, then send campaigns via Resend API, with events synced via syncResendEmails mutation.",
    researchBasis: "LLM integration for personalized content generation",
  },
  {
    name: "Monitoring & Evaluation",
    description: "Evaluation scripts analyze job classification accuracy with confidence scoring for quality control.",
    researchBasis: "LLM observability frameworks and A/B testing methodologies",
  },
];

// ── Narrative ─────────────────────────────────────────────────────

export const story =
  "Job seekers visit the platform where the UnifiedJobsProvider component fetches EU-remote jobs via GraphQL queries to PostgreSQL, filtered by Drizzle ORM. Jobs are ingested from ATS platforms (Greenhouse, Lever, Ashby) and classified for EU remote compatibility using DeepSeek LLM. Administrators manage contacts and campaigns through Better Auth-authenticated admin routes, using AI-assisted email drafting with the ComposeFromLinkedIn component and Resend for delivery.";

// ── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "The platform uses Next.js App Router for the frontend with Neon PostgreSQL as the primary database. ATS platform fetchers handle job ingestion, DeepSeek LLM handles classification, and GraphQL serves the API layer.",
  },
  {
    heading: "Database Design",
    content: "PostgreSQL schema includes tables like jobs, contacts, email_campaigns, and reported_jobs, managed by Drizzle ORM with Row-Level Security (RLS) policies. Skills are stored in a many-to-many relationship via job_skills table, seeded by scripts/seed-skill-taxonomy.ts.",
  },
  {
    heading: "Security & Auth",
    content: "Better Auth handles authentication with session-based auth backed by Neon PostgreSQL, while admin access is restricted by email check (isAdminEmail()) in resolvers. Environment variables store secrets like API keys. Input validation occurs on both client and server.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "The app is hosted on Vercel for Next.js frontend. Neon provides serverless PostgreSQL, and Resend handles email delivery. Evaluation scripts support continuous improvement.",
  },
  {
    heading: "AI Integration",
    content: "DeepSeek LLM classifies jobs for EU compatibility with structured output grounding. OpenAI powers general tasks. AI-assisted email drafting uses the ComposeFromLinkedIn component.",
  },
  {
    heading: "Job Processing Pipeline",
    content: "Jobs are ingested from ATS platforms (Greenhouse, Lever, Ashby), classified by DeepSeek LLM with heuristic pre-filtering, and stored in PostgreSQL. The UnifiedJobsProvider component renders jobs with real-time filtering, while admins manage campaigns via GraphQL mutations and Resend API.",
  },
];

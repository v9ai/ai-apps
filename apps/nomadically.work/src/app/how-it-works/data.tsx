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
    slug: "cloudflare-workers",
    number: 3,
    title: "Cloudflare Workers",
    category: "Infrastructure",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Cloudflare",
    year: 2024,
    finding: "Edge compute platform for running serverless functions globally with low latency",
    relevance: "Hosts 12+ specialized workers like nomadically-work-process-jobs for job classification and nomadically-work-resume-rag for vector embeddings",
    url: "https://developers.cloudflare.com/workers",
    categoryColor: "var(--red-9)",
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
    relevance: "Used by nomadically-work-process-jobs worker to classify jobs for EU remote compatibility and extract skills via scripts/extract-job-skills.ts",
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
  {
    slug: "cloudflare-d1",
    number: 8,
    title: "Cloudflare D1",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Cloudflare",
    year: 2024,
    finding: "Edge SQL database optimized for fast reads and vector storage",
    relevance: "Stores resume embeddings from Workers AI for similarity search in the nomadically-work-job-matcher worker",
    url: "https://developers.cloudflare.com/d1",
    categoryColor: "var(--green-9)",
  },
];

// ── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "12+",
    label: "Specialized Cloudflare Workers for different tasks",
    source: "Architecture analysis showing workers like nomadically-work-process-jobs and ats-crawler",
  },
  {
    number: "1024-dim",
    label: "Vector embedding size for resume-job matching",
    source: "Inferred from Workers AI embeddings stored in Cloudflare D1",
  },
  {
    number: "O(log n)",
    label: "Search complexity for job filtering via GraphQL pagination",
    source: "GraphQL queries use limit and offset with indexed PostgreSQL tables",
  },
  {
    number: "< 100ms",
    label: "Edge response time for D1 vector similarity searches",
    source: "Cloudflare D1 optimization for low-latency reads",
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
    description: "Rust-based ats-crawler worker scrapes job boards like Ashby and Greenhouse via Common Crawl, then nomadically-work-insert-jobs worker adds jobs to a processing queue for classification.",
    researchBasis: "Cloudflare Workers with Rust for high-performance web scraping",
  },
  {
    name: "AI Classification & EU Validation",
    description: "nomadically-work-process-jobs worker (Python/LangGraph) uses DeepSeek LLM to classify jobs, while nomadically-work-eu-classifier worker validates EU remote compatibility, storing results in PostgreSQL via Drizzle ORM.",
    researchBasis: "LangGraph for agent orchestration and LLM prompt engineering",
  },
  {
    name: "Vectorization & Resume Matching",
    description: "nomadically-work-resume-rag worker creates embeddings from resumes using Workers AI and stores them in Cloudflare D1. nomadically-work-job-matcher worker performs cosine similarity search between resume and job vectors for matching.",
    researchBasis: "Vector embeddings and similarity search for retrieval-augmented generation (RAG)",
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
    description: "Langfuse traces LLM calls for observability, while evaluation scripts like eval-prompt-ab.ts and job-reporter-llm worker analyze job reports with confidence scoring for quality control.",
    researchBasis: "LLM observability frameworks and A/B testing methodologies",
  },
];

// ── Narrative ─────────────────────────────────────────────────────

export const story =
  "Job seekers visit the platform where the UnifiedJobsProvider component fetches EU-remote jobs via GraphQL queries to PostgreSQL, filtered by Drizzle ORM. Recruiters post jobs that are ingested by Rust crawlers, classified for EU compatibility using DeepSeek via LangGraph workers, and stored with vector embeddings in Cloudflare D1 for matching. Administrators manage contacts and campaigns through Better Auth-authenticated admin routes, using AI-assisted email drafting with the ComposeFromLinkedIn component and Resend for delivery.";

// ── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "The platform uses a microservices architecture with Next.js 14 App Router for the frontend, Cloudflare Workers for edge compute, and a hybrid database strategy. PostgreSQL (Neon) handles transactional data like jobs and contacts, while Cloudflare D1 stores vector embeddings for fast similarity search. Rust, Python, and TypeScript workers specialize in crawling, AI classification, and business logic, orchestrated via queues and cron triggers.",
  },
  {
    heading: "Database Design",
    content: "PostgreSQL schema includes tables like jobs, contacts, email_campaigns, and reported_jobs, managed by Drizzle ORM with Row-Level Security (RLS) policies. Skills are stored in a many-to-many relationship via job_skills table, seeded by scripts/seed-skill-taxonomy.ts. Cloudflare D1 holds resume embeddings indexed for cosine similarity search, enabling efficient matching in the nomadically-work-job-matcher worker.",
  },
  {
    heading: "Security & Auth",
    content: "Better Auth handles authentication with session-based auth backed by Neon PostgreSQL, while admin access is restricted by email check (isAdminEmail()) in resolvers. Environment variables store secrets like API keys. Input validation occurs on both client and server, with rate limiting likely implemented at the Cloudflare Worker level.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "The app is hosted on Vercel for Next.js frontend, with Cloudflare Workers deployed via Wrangler for edge functions. Neon provides serverless PostgreSQL, and Resend handles email delivery. Monitoring includes Langfuse for LLM observability and custom dashboards for worker status, with evaluation scripts like eval-remote-eu-langfuse.ts for continuous improvement.",
  },
  {
    heading: "AI Integration",
    content: "DeepSeek LLM classifies jobs for EU compatibility in nomadically-work-process-jobs worker, while OpenAI powers general tasks. Workers AI generates vector embeddings for resumes, stored in D1. LangGraph orchestrates agentic workflows, and Langfuse traces all LLM calls. AI-assisted email drafting uses the ComposeFromLinkedIn component, and job reports are analyzed by job-reporter-llm worker with confidence scoring.",
  },
  {
    heading: "Job Processing Pipeline",
    content: "Jobs are ingested via Rust crawlers, queued for processing, classified by DeepSeek LLM, and stored in PostgreSQL. Vector embeddings are created using Workers AI and stored in D1 for matching. The UnifiedJobsProvider component renders jobs with real-time filtering, while admins manage campaigns via GraphQL mutations and Resend API, with events synced through syncResendEmails mutation.",
  },
];

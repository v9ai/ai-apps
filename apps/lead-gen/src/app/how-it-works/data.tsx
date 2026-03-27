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
    finding: "Server-side rendering by default with React 19 Server Components for improved performance and SEO",
    relevance: "Powers the entire frontend with server components for company listings, contact management, and admin pages for contacts and email campaigns",
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
    relevance: "Stores primary data — companies, contacts, email campaigns, ATS boards, and company facts — via Drizzle ORM with indexed queries for filtering and pagination",
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
    relevance: "Defines database schema in src/db/schema.ts and handles all queries for the GraphQL API, including tables like companies, contacts, and ats_boards",
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
    finding: "Cost-effective large language model for text classification, generation, and structured extraction",
    relevance: "Powers company enrichment, deep analysis, AI tier classification, and AI-assisted email drafting via the ComposeFromLinkedIn component",
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
    relevance: "Creates typed hooks like useGetContactsQuery and useCreateContactMutation in src/__generated__/hooks, plus resolver types for Apollo Server",
    url: "https://the-guild.dev/graphql/codegen",
    categoryColor: "var(--orange-9)",
  },
];

// ── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "6",
    label: "Pipeline stages: discover, enrich, detect ATS, find contacts, verify emails, outreach",
    source: "End-to-end B2B lead generation pipeline",
  },
  {
    number: "4",
    label: "LLM integration points: enrichment, deep analysis, AI tier classification, email drafting",
    source: "DeepSeek + OpenRouter for cost-effective AI across the pipeline",
  },
];

// ── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Company Discovery",
    description: "Companies are imported via bulk CSV, discovered through Common Crawl, or found via web search and Ashby board crawling. Each company gets a unique key (slug/domain) for deduplication.",
    researchBasis: "Web crawling and multi-source entity resolution",
  },
  {
    name: "Enrichment & AI Classification",
    description: "Enrichment fetches live website data, extracts services, industry signals, and tech stack. DeepSeek LLM generates deep analysis and classifies companies into AI tiers (not AI, AI-first, AI-native) with confidence scores.",
    researchBasis: "LLM-assisted information extraction and classification",
  },
  {
    name: "ATS Board Detection",
    description: "Detects ATS boards (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, etc.) associated with each company, storing vendor, URL, board type, and confidence scores with full provenance tracking.",
    researchBasis: "Structured signal extraction from web pages",
  },
  {
    name: "Contact Discovery & Verification",
    description: "Contacts are linked to companies with LinkedIn URLs, emails, and positions. NeverBounce verifies email deliverability. Bounced emails are tracked and contacts can be flagged as do-not-contact.",
    researchBasis: "Entity resolution and email hygiene pipelines",
  },
  {
    name: "Email Outreach",
    description: "AI-assisted email drafting from LinkedIn profiles via ComposeFromLinkedIn, batch campaigns via Resend API with configurable sequences, follow-up scheduling, and reply tracking.",
    researchBasis: "LLM-powered personalized content generation",
  },
  {
    name: "Inbound & Follow-ups",
    description: "Inbound emails are captured via Resend webhooks and stored for context. Follow-up sequences are automatically scheduled based on campaign configuration and reply status.",
    researchBasis: "Event-driven email lifecycle management",
  },
];

// ── Narrative ─────────────────────────────────────────────────────

export const story =
  "The platform discovers B2B companies via Common Crawl, web search, and Ashby boards, then enriches them with AI classification and deep analysis. It detects ATS hiring boards, discovers and verifies contact emails, and enables personalized outreach campaigns with AI-drafted emails, automated follow-up sequences, and inbound reply tracking.";

// ── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "Next.js 16 App Router with React 19 Server Components for the frontend, Neon PostgreSQL as the primary database. Company and contact data flows through a GraphQL API backed by Apollo Server 5, with Drizzle ORM handling all queries and DataLoaders preventing N+1 issues.",
  },
  {
    heading: "Database Design",
    content: "PostgreSQL schema includes tables for companies, contacts, contact_emails, email_campaigns, email_templates, ats_boards, company_facts, company_snapshots, and received_emails — all managed by Drizzle ORM with proper indexes for filtering performance.",
  },
  {
    heading: "Security & Auth",
    content: "Better Auth handles authentication with session-based auth backed by Neon PostgreSQL, while admin access is restricted by email check (isAdminEmail()) in GraphQL resolvers. Environment variables store secrets like API keys. Input validation occurs on both client and server.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "Hosted on Vercel with 60s max API route duration. Neon provides serverless PostgreSQL with branching support, and Resend handles email delivery with webhook-based event tracking.",
  },
  {
    heading: "AI Integration",
    content: "DeepSeek LLM powers company deep analysis, enrichment, and AI tier classification. OpenRouter provides model routing. AI-assisted email drafting uses the ComposeFromLinkedIn component to generate personalized outreach from LinkedIn profiles. LangSmith provides observability.",
  },
  {
    heading: "Outreach Pipeline",
    content: "Contacts are discovered and verified via NeverBounce, then grouped into email campaigns with configurable sequences and delays. Resend API delivers emails with reply tracking. Inbound emails are captured via webhooks and follow-up sequences are automatically managed.",
  },
];

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
    relevance: "Powers the entire frontend with server components for company listings and client components for admin pages like /admin/contacts and /admin/emails",
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
    relevance: "Stores primary data — companies, contacts, email campaigns, and ATS boards — via Drizzle ORM with indexed queries for filtering and pagination",
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
    relevance: "Defines database schema in src/db/schema.ts and handles all queries for the GraphQL API, including tables like companies, contacts, ats_boards, and blocked_companies",
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
    relevance: "Used for company enrichment, deep analysis generation, and AI-assisted email drafting via the ComposeFromLinkedIn component",
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
    label: "Search complexity for company/contact filtering via GraphQL pagination",
    source: "GraphQL queries use limit and offset with indexed PostgreSQL tables",
  },
  {
    number: "3",
    label: "Primary LLM integration points: company enrichment, deep analysis, email drafting",
    source: "Technical analysis of AI/LLM usage across the platform",
  },
];

// ── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Company Discovery & Enrichment",
    description: "Companies are imported via bulk CSV or discovered through Common Crawl. Enrichment fetches live website data, extracts services and industry signals, and runs deep analysis via DeepSeek LLM.",
    researchBasis: "Web crawling and LLM-assisted information extraction",
  },
  {
    name: "ATS Board Detection",
    description: "The platform detects ATS boards (Greenhouse, Lever, Ashby, Workable, etc.) associated with each company, storing vendor, URL, and confidence scores in the ats_boards table.",
    researchBasis: "Structured signal extraction from web pages",
  },
  {
    name: "Contact Management",
    description: "Contacts are linked to companies with LinkedIn URLs, emails, and positions. NeverBounce verifies email deliverability. Duplicate contacts are merged via GraphQL mutations.",
    researchBasis: "Entity resolution and email hygiene pipelines",
  },
  {
    name: "Admin Campaign Management",
    description: "Admins use BatchEmailModal and ComposeFromLinkedIn components to draft AI-assisted emails from LinkedIn profiles, then send campaigns via Resend API, with events synced via syncResendEmails mutation.",
    researchBasis: "LLM integration for personalized content generation",
  },
  {
    name: "Monitoring & Evaluation",
    description: "Evaluation scripts analyze enrichment and email generation quality with confidence scoring for continuous improvement.",
    researchBasis: "LLM observability frameworks and quality metrics",
  },
];

// ── Narrative ─────────────────────────────────────────────────────

export const story =
  "The platform discovers and enriches B2B companies via web crawling and LLM analysis, detects their ATS hiring boards, finds and verifies contact emails, then enables admins to run personalized outreach campaigns through AI-assisted email drafting and Resend delivery.";

// ── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "The platform uses Next.js App Router for the frontend with Neon PostgreSQL as the primary database. Company and contact data flows through a GraphQL API backed by Apollo Server, with Drizzle ORM handling all queries.",
  },
  {
    heading: "Database Design",
    content: "PostgreSQL schema includes tables for companies, contacts, contact_emails, email_campaigns, email_templates, ats_boards, company_facts, company_snapshots, and blocked_companies — all managed by Drizzle ORM with proper indexes for filtering performance.",
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
    content: "DeepSeek LLM powers company deep analysis and enrichment. AI-assisted email drafting uses the ComposeFromLinkedIn component to generate personalized outreach from LinkedIn profiles.",
  },
  {
    heading: "Outreach Pipeline",
    content: "Contacts are discovered and verified, then grouped into email campaigns with configurable sequences and delays. The Resend API delivers emails, with reply tracking and follow-up scheduling handled via the contact_emails table.",
  },
];

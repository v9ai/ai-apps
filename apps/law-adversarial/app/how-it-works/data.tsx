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
  icon?: React.ReactNode;
  color?: string;
  description: string;
  researchBasis?: string;
  paperIndices?: number[];
}

interface Stat {
  number: string;
  label: string;
  source?: string;
  paperIndex?: number;
}

// ─── Technical Foundations ──────────────────────────────────────────

export const papers: Paper[] = [
  {
    slug: "nextjs-15-app-router",
    number: 1,
    title: "Next.js 15 App Router",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding: "Server Components by default enable efficient data fetching and reduced client-side JavaScript",
    relevance: "Used for all routes in /app, including /sessions/[id]/page.tsx for session details and Server Actions in /app/sessions/actions.ts for form submissions",
    url: "https://nextjs.org/docs/app",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "supabase-postgresql",
    number: 2,
    title: "Supabase PostgreSQL",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Supabase",
    year: 2024,
    finding: "Real-time database with built-in authentication and Row Level Security (RLS)",
    relevance: "Stores stress_test_sessions, findings, and audit_trail tables, with RLS policies for secure access and real-time subscriptions in SessionLive component",
    url: "https://supabase.com/docs/guides/database",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "deepseek-api",
    number: 3,
    title: "DeepSeek API",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "DeepSeek",
    year: 2024,
    finding: "High-performance LLM for complex reasoning and text generation tasks",
    relevance: "Powers the Attacker, Defender, and Judge agents via API calls defined in evals/attacker.yaml, evals/defender.yaml, and evals/judge.yaml",
    url: "https://platform.deepseek.com/api-docs/",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "dashscope-api",
    number: 4,
    title: "DashScope API",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Alibaba Cloud",
    year: 2024,
    finding: "LLM service with strong multilingual and domain-specific capabilities",
    relevance: "Used as a fallback or complementary model in the Citation Verifier and Jurisdiction Expert agents for legal-specific validations",
    url: "https://help.aliyun.com/zh/dashscope/developer-reference/",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "pdf-parse",
    number: 5,
    title: "pdf-parse",
    category: "Storage",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "npm",
    year: 2024,
    finding: "Lightweight PDF text extraction library for Node.js environments",
    relevance: "Integrated in lib/brief-parser.ts within the parseBrief() function to extract text from uploaded legal briefs in PDF format",
    url: "https://www.npmjs.com/package/pdf-parse",
    categoryColor: "var(--cyan-9)",
  },
  {
    slug: "mammoth",
    number: 6,
    title: "mammoth",
    category: "Storage",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "npm",
    year: 2024,
    finding: "DOCX to HTML converter with clean text extraction capabilities",
    relevance: "Used in lib/brief-parser.ts to handle DOCX file uploads, converting documents to plain text for AI processing",
    url: "https://www.npmjs.com/package/mammoth",
    categoryColor: "var(--cyan-9)",
  },
  {
    slug: "promptfoo",
    number: 7,
    title: "promptfoo",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "promptfoo",
    year: 2024,
    finding: "Framework for testing and evaluating LLM prompts systematically",
    relevance: "Configures evals/attacker.yaml, evals/defender.yaml, etc., to test agent prompts and ensure consistency in the adversarial pipeline",
    url: "https://www.promptfoo.dev/docs/",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "radix-ui",
    number: 8,
    title: "Radix UI",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix UI",
    year: 2024,
    finding: "Unstyled, accessible UI primitives for building high-quality design systems",
    relevance: "Provides components like themes and primitives for the NewSessionForm and KnowledgeTabs, ensuring accessible and consistent UI across the app",
    url: "https://www.radix-ui.com/",
    categoryColor: "var(--blue-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "6",
    label: "Specialized AI agents in the adversarial pipeline",
    source: "Pipeline architecture from technical analysis",
  },
  {
    number: "4",
    label: "Severity levels for findings (critical, high, medium, low)",
    source: "findings table schema",
  },
  {
    number: "2-round",
    label: "Multi-round analysis with iterative improvement",
    source: "audit_trail table round column",
  },
  {
    number: "≥80",
    label: "Score threshold for 'Ready for filing' briefs",
    source: "Legal-specific scoring system",
  },
  {
    number: "10+",
    label: "Prompt evaluation configs using promptfoo",
    source: "Testing infrastructure setup",
  },
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Brief Upload and Parsing",
    description: "Users upload a PDF or DOCX legal brief via the NewSessionForm component at /app/sessions/new-session-form. The lib/brief-parser.ts file uses parseBrief() with pdf-parse for PDFs and mammoth for DOCX files to extract plain text. A new record is created in the stress_test_sessions table in Supabase with status 'pending'.",
    researchBasis: "Next.js Server Actions and file processing libraries",
  },
  {
    name: "Adversarial AI Pipeline Execution",
    description: "The system executes a six-agent pipeline: Attacker (identifies weaknesses via evals/attacker.yaml), Defender (responds via evals/defender.yaml), Judge (scores arguments via evals/judge.yaml), Citation Verifier (validates citations via evals/citation-verifier.yaml), Jurisdiction Expert (checks compliance via evals/jurisdiction-expert.yaml), and Brief Rewriter (rewrites brief via evals/brief-rewriter.yaml). Each agent's output is logged in the audit_trail table with agent type and round number.",
    researchBasis: "Multi-agent LLM orchestration with promptfoo for evaluation",
  },
  {
    name: "Findings Generation and Storage",
    description: "Issues identified by agents are stored in the findings table with columns: type (e.g., 'logical', 'citation'), severity (e.g., 'critical', 'high'), confidence score, description, and suggested_fix. The overall_score is calculated based on Judge agent output and stored in stress_test_sessions.",
    researchBasis: "Structured database schema with Supabase PostgreSQL",
  },
  {
    name: "Real-time Results Display",
    description: "Users navigate to /sessions/[id]/page.tsx to view session details. The SessionLive component uses Supabase real-time subscriptions to update progress. Tabs display findings (aggregated from findings table), audit trail (from audit_trail table), and the rewritten brief from the Brief Rewriter agent.",
    researchBasis: "Supabase real-time features and React state management",
  },
  {
    name: "Knowledge Base Integration",
    description: "The KnowledgeTabs component at /app/knowledge/page.tsx queries NYC public law data via lib/socrata.ts, fetching NYPD complaints and civil litigation data from Socrata API. Data is sanitized using sanitizeSoql() to prevent SQL injection.",
    researchBasis: "External API integration with data sanitization",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "Users upload a legal brief via the NewSessionForm component, which triggers the brief-parser.ts to extract text. The system creates a stress_test_sessions record in Supabase and executes a six-agent AI pipeline—Attacker, Defender, Judge, Citation Verifier, Jurisdiction Expert, and Brief Rewriter—logging each step in the audit_trail table. Findings are stored in the findings table with severity scores, and users view the results on the /sessions/[id] page with real-time updates via the SessionLive component.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "Built with Next.js 15 App Router, using Server Components by default for routes like /app/sessions/[id]/page.tsx and Client Components (via 'use client') for interactive elements like SessionLive. The multi-agent pipeline runs as server actions or API routes, with data flow managed through Supabase tables: stress_test_sessions, findings, and audit_trail. Demo data fallback via lib/demo-data.ts allows development without a live database.",
  },
  {
    heading: "Database Design",
    content: "Supabase PostgreSQL stores three main tables: stress_test_sessions (id, slug, status, overall_score), findings (session_id, type, severity, confidence), and audit_trail (session_id, agent, action, round). Indexes on findings(session_id, severity) and audit_trail(session_id, created_at) optimize queries. Row Level Security (RLS) policies enforce access control, linking to auth.users via user_id.",
  },
  {
    heading: "Security & Auth",
    content: "Authentication handled by Supabase Auth with session-based cookies. RLS policies secure all tables, ensuring users only access their own data. Environment variables (DEEPSEEK_API_KEY, DASHSCOPE_API_KEY) are server-side only. Data protection includes PII redaction in briefs and sanitizeSoql() function in lib/socrata.ts to prevent SQL injection in public data queries.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "Deployed as a single Next.js application, likely on Vercel for seamless integration with App Router. Supabase provides backend infrastructure including database, auth, and real-time features. Environment configuration via .env.example includes Supabase URL and LLM API keys. The system supports both production (live Supabase) and development (demo data fallback) modes.",
  },
  {
    heading: "AI Integration",
    content: "Uses DeepSeek and DashScope LLMs via API calls configured in YAML files (e.g., evals/attacker.yaml). Prompt testing with promptfoo ensures agent consistency. Retrieval patterns include citation verification (likely via vector embeddings) and jurisdiction rule checks from structured databases. The pipeline architecture sequences agents: Attacker → Defender → Judge → Citation Verifier → Jurisdiction Expert → Brief Rewriter.",
  },
  {
    heading: "Testing & Evaluation",
    content: "Unit testing with Vitest and comprehensive LLM prompt evaluation via promptfoo with over 10 configs (e.g., for consistency, citations). The audit_trail table logs every agent action for transparency and debugging. Demo data system in lib/demo-data.ts enables testing without external dependencies, ensuring robustness in development environments.",
  },
];

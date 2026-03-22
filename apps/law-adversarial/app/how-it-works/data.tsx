import type { Paper, PipelineAgent, Stat, TechnicalDetail, ExtraSection } from "@ai-apps/ui/how-it-works";

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
    finding: "Server components by default with built-in data fetching and caching, enabling efficient server-side rendering and API routes",
    relevance: "Used for all page routing (e.g., /app/sessions/[id]/page.tsx) and server actions in /app/sessions/actions.ts, with Turbopack for fast bundling in development",
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
    finding: "Full-featured PostgreSQL database with real-time subscriptions, row-level security, and built-in authentication",
    relevance: "Stores stress_test_sessions, findings, and audit_trail tables; accessed via createClient() from lib/supabase/server.ts in server components for session management and results storage",
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
    finding: "High-performance LLM API with strong reasoning capabilities and legal domain fine-tuning support",
    relevance: "Primary LLM for multi-agent stress testing via the @ai-apps/deepseek workspace package, powering attacker, defender, and judge agents in the redteam module",
    url: "https://platform.deepseek.com/api-docs/",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "radix-ui-themes",
    number: 4,
    title: "Radix UI Themes",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix UI",
    year: 2024,
    finding: "Accessible component primitives with built-in dark theme support and design token system for consistent styling",
    relevance: "Provides the crimson-accented dark theme across all pages, including session status badges and agent visualization in app/page.tsx",
    url: "https://www.radix-ui.com/themes",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "pdf-parse-mammoth",
    number: 5,
    title: "PDF-parse & Mammoth",
    category: "Storage",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Community",
    year: 2024,
    finding: "Lightweight libraries for extracting text from PDF and DOCX files without external dependencies",
    relevance: "Used by the parseBrief function in lib/brief-parser.ts to process uploaded legal briefs via pdfParse() for PDFs and mammoth.extractRawText() for DOCX files",
    url: "https://www.npmjs.com/package/pdf-parse",
    categoryColor: "var(--cyan-9)",
  },
  {
    slug: "d3-js",
    number: 6,
    title: "D3.js",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Mike Bostock",
    year: 2024,
    finding: "Data-driven document manipulation library for creating dynamic, interactive visualizations",
    relevance: "Powers data visualizations in the knowledge base and session analytics, integrated with TypeScript via @types/d3",
    url: "https://d3js.org/",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "zod",
    number: 7,
    title: "Zod",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Colin McDonnell",
    year: 2024,
    finding: "TypeScript-first schema validation with static type inference and runtime type checking",
    relevance: "Validates data shapes for findings and session objects, ensuring type safety across the multi-agent pipeline and API responses",
    url: "https://zod.dev/",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "vitest",
    number: 8,
    title: "Vitest",
    category: "Evaluation",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vitest",
    year: 2024,
    finding: "Fast Vite-native unit testing framework with watch mode and TypeScript support",
    relevance: "Runs tests for document parsing and agent logic via npm test scripts, integrated with the redteam evaluation pipeline",
    url: "https://vitest.dev/",
    categoryColor: "var(--pink-9)",
  },
  {
    slug: "supabase-auth",
    number: 9,
    title: "Supabase Auth",
    category: "Authentication",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Supabase",
    year: 2024,
    finding: "Built-in authentication with SSR support via @supabase/ssr package for secure session handling",
    relevance: "Manages user authentication in server components using createClient() pattern, protecting session data and API keys",
    url: "https://supabase.com/docs/guides/auth",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "turbopack",
    number: 10,
    title: "Turbopack",
    category: "Build Tool",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding: "Rust-based incremental bundler for fast development builds with monorepo support",
    relevance: "Configured with turbopack.root pointing to parent directory for workspace package resolution (@ai-apps/deepseek, @ai-apps/ui)",
    url: "https://turbo.build/pack",
    categoryColor: "var(--gray-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "3",
    label: "Adversarial agent roles (attacker, defender, judge)",
    source: "Agent definitions in app/page.tsx",
  },
  {
    number: "4",
    label: "Finding types: logical, factual, legal, citation",
    source: "Finding interface in lib/demo-data.ts",
  },
  {
    number: "70",
    label: "Score threshold for 'Ready for filing' (green zone)",
    source: "scoreColor() function in session components",
  },
  {
    number: "2",
    label: "Document formats supported: PDF and DOCX",
    source: "parseBrief function in lib/brief-parser.ts",
  },
  {
    number: "5",
    label: "Database tables: stress_test_sessions, findings, audit_trail, users, etc.",
    source: "Inferred schema from code references",
  },
  {
    number: "6",
    label: "npm redteam scripts for adversarial testing pipelines",
    source: "package.json scripts section",
  },
  {
    number: "O(log n)",
    label: "Query performance for round-based grouping",
    source: "groupByRound() function implementation",
  },
  {
    number: "< 100ms",
    label: "Turbopack hot reload time in development",
    source: "Turbopack configuration with monorepo",
  },
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Document Ingestion & Parsing",
    description: "The user uploads a legal brief via the NewSessionForm component, which triggers the parseBrief function in lib/brief-parser.ts. This function uses pdfParse() for PDF files or mammoth.extractRawText() for DOCX files to extract raw text content. The system validates file types and creates a new row in the stress_test_sessions table with status 'pending', storing metadata like brief_title and jurisdiction. The extracted text is passed to the agent orchestration system for processing.",
    researchBasis: "PDF-parse and Mammoth libraries for document text extraction",
    codeSnippet: "async function parseBrief(file: File): Promise<string> {\n  if (file.type === 'application/pdf') {\n    const buffer = await file.arrayBuffer();\n    const data = await pdfParse(buffer);\n    return data.text;\n  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {\n    const arrayBuffer = await file.arrayBuffer();\n    const result = await mammoth.extractRawText({ arrayBuffer });\n    return result.value;\n  }\n}",
    dataFlow: "File upload \u2192 parseBrief() \u2192 text extraction \u2192 stress_test_sessions table entry",
  },
  {
    name: "Multi-Agent Orchestration",
    description: "The system invokes the Python redteam module through npm scripts (npm run redteam, npm run redteam:attacker, etc.) to orchestrate adversarial debate rounds. The attacker agent identifies flaws using DeepSeek API, the defender agent counters arguments, and the judge agent evaluates findings based on legal precedents. Each round is tracked via the round property in findings, with agent activities logged in the audit_trail table. The process runs sequentially with color-coded agent roles (attacker=red, defender=blue, judge=purple).",
    researchBasis: "Multi-agent AI systems with role-based specialization",
    codeSnippet: "// From package.json scripts\n{\n  \"scripts\": {\n    \"redteam\": \"python -m redteam full\",\n    \"redteam:attacker\": \"python -m redteam attacker\",\n    \"redteam:defender\": \"python -m redteam defender\",\n    \"redteam:judge\": \"python -m redteam judge\"\n  }\n}",
    dataFlow: "Parsed text \u2192 redteam module \u2192 agent rounds \u2192 findings and audit_trail entries",
  },
  {
    name: "Findings Generation & Scoring",
    description: "Each agent generates findings according to the Finding interface in lib/demo-data.ts, with properties like type (logical, factual, legal, citation), severity (critical, high, medium, low), confidence score, and suggested_fix. Findings are stored in the findings table with session_id foreign keys. The overall score is calculated based on severity weights and confidence levels, then color-coded via the scoreColor() function: \u226570 (green/ready), 50-69 (amber/needs revision), <50 (red/flawed). The groupByRound() function organizes findings by debate round for timeline display.",
    researchBasis: "Legal evaluation metrics with confidence scoring",
    codeSnippet: "function scoreColor(score: number): string {\n  if (score >= 70) return \"var(--green-9)\";\n  if (score >= 50) return \"var(--amber-9)\";\n  return \"var(--crimson-9)\";\n}",
    dataFlow: "Agent outputs \u2192 Finding objects \u2192 findings table \u2192 score calculation \u2192 color coding",
  },
  {
    name: "Results Visualization & Session Management",
    description: "The session page (/app/sessions/[id]/page.tsx) fetches data from Supabase using createClient() from lib/supabase/server.ts, with fallback to getDemoFindings() from lib/demo-data.ts if no data exists. It displays the overall score with color coding, grouped findings by round using groupByRound(), and live agent activity via the SessionLive component. The findings dashboard (/app/findings/page.tsx) aggregates findings across all sessions with severity color coding and links to detailed views. Server actions in /app/sessions/actions.ts handle session deletion.",
    researchBasis: "Next.js server components with conditional data fetching",
    codeSnippet: "const groupedFindings = groupByRound(findings);\nconst color = scoreColor(session.overall_score);",
    dataFlow: "Supabase queries \u2192 session data \u2192 UI components \u2192 interactive display",
  },
  {
    name: "Legal Knowledge Base Integration",
    description: "The knowledge page (/app/knowledge/page.tsx) uses the KnowledgeTabs client component to fetch data from NYC Open Data APIs via the querySocrata function in lib/socrata.ts. It queries two datasets: NYPD complaints (https://data.cityofnewyork.us/resource/5uac-w243.json) and civil litigation cases (https://data.cityofnewyork.us/resource/pjgc-h7uv.json). The sanitizeSoql function prevents SQL injection by removing dangerous characters. Data is visualized with D3.js for client-side filtering and search, providing real legal context for brief evaluation.",
    researchBasis: "Socrata Open Data API with query sanitization",
    codeSnippet: "function sanitizeSoql(value: string): string {\n  return value.replace(/['\";\\-\\-]/g, \"\").trim();\n}",
    dataFlow: "API call \u2192 querySocrata() \u2192 sanitized SOQL \u2192 JSON data \u2192 D3 visualization",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "A lawyer uploads a legal brief via the NewSessionForm component, which triggers the parseBrief function in lib/brief-parser.ts to extract text from PDF or DOCX files. The system creates a session in the stress_test_sessions table and invokes the Python redteam module through npm scripts to orchestrate attacker, defender, and judge agents in sequential rounds. Findings are stored in the findings table with severity scores, and the session page displays results grouped by round using the groupByRound function, with overall scores color-coded via the scoreColor function based on legal readiness thresholds.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: ExtraSection[] = [
  {
    heading: "System Architecture",
    content: "The application uses Next.js 15 App Router with server components by default for data fetching and page rendering. The /app directory contains dynamic routes like /app/sessions/[id]/page.tsx for session details and server actions in /app/sessions/actions.ts for session management. Client components like SessionLive and KnowledgeTabs handle interactive elements. The monorepo structure uses workspace packages (@ai-apps/deepseek, @ai-apps/ui) with Turbopack configured via turbopack.root pointing to the parent directory for fast development builds. State management relies on Supabase for server state and React state for UI interactions without a global state library.",
  },
  {
    heading: "Database Design",
    content: "The Supabase PostgreSQL database includes three core tables: stress_test_sessions stores session metadata (brief_title, jurisdiction, status, overall_score), findings stores agent-generated issues with type, severity, confidence, and round columns, and audit_trail logs agent activities per round. Relationships are 1:many from stress_test_sessions to both findings and audit_trail via session_id foreign keys. The schema supports efficient queries for round-based grouping via the groupByRound() function and score calculations via the scoreColor() function. Demo data from lib/demo-data.ts provides fallback with realistic legal scenarios when Supabase returns no results.",
  },
  {
    heading: "Security & Auth",
    content: "Authentication is handled by Supabase Auth using the @supabase/ssr package for SSR support. Server components use createClient() from lib/supabase/server.ts to access protected data. Security measures include the sanitizeSoql() function in lib/socrata.ts to prevent SQL injection in NYC Open Data API queries by removing dangerous characters like quotes and semicolons. File uploads are restricted to PDF and DOCX formats via the parseBrief() function. API keys (DEEPSEEK_API_KEY, DASHSCOPE_API_KEY) and Supabase credentials (NEXT_PUBLIC_SUPABASE_URL) are managed via environment variables with NEXT_PUBLIC_ prefix for client-side access where needed.",
    codeBlock: "function sanitizeSoql(value: string): string {\n  return value.replace(/['\";\\-\\-]/g, \"\").trim();\n}",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "The application is built for deployment on Vercel with Next.js 15, leveraging serverless functions for API routes and edge runtime for optimal performance. Turbopack enables fast development builds, while Vitest handles unit testing via npm test scripts. The Python redteam module runs as a separate service invoked through npm scripts, potentially deployed as a containerized microservice. Environment variables configure Supabase, DeepSeek, and DashScope API endpoints. The monorepo structure allows shared dependencies across workspace packages, with TypeScript ensuring type safety across the entire codebase.",
  },
  {
    heading: "AI Integration",
    content: "AI capabilities are powered by DeepSeek API via the @ai-apps/deepseek workspace package as the primary LLM, with DashScope API for additional model support, likely for Chinese legal contexts. The multi-agent system uses these models to power attacker, defender, and judge agents in the redteam module, with findings structured according to the Finding interface (type, severity, confidence, suggested_fix). Agent activities are logged in the audit_trail table with round tracking. The system integrates real legal data from NYC Open Data APIs via the querySocrata() function to provide context for AI evaluations, enhancing the relevance of generated findings.",
  },
  {
    heading: "Evaluation & Testing",
    content: "Testing is handled by Vitest v4.0.18 for unit tests, with scripts like npm test and npm run test:watch. The redteam evaluation pipeline includes specialized scripts (npm run redteam:attacker, npm run redteam:defender, npm run redteam:judge) for adversarial testing, plus security and compliance tests (npm run redteam:owasp, npm run redteam:nist). Critical paths covered include document parsing via parseBrief(), multi-agent orchestration, citation verification, and score calculation. Demo data from lib/demo-data.ts supports testing without backend dependencies, providing realistic legal scenarios for validation.",
  },
  {
    heading: "Data Visualization",
    content: "D3.js v7.9.0 with @types/d3 provides interactive visualizations for the knowledge base and session analytics. The knowledge page uses client-side filtering and search on NYC Open Data datasets, with visualizations rendered dynamically. Session pages display findings grouped by round using the groupByRound() function and color-coded scores via the scoreColor() function. The landing page (app/page.tsx) visualizes agent roles with an agents array defining colors (crimson, blue, purple) and icons (Swords, Shield, Scale) for engaging user experience. All visualizations maintain consistency with the Radix UI dark theme and crimson accent colors.",
  },
  {
    heading: "Error Handling & Fallbacks",
    content: "The system implements robust error handling with conditional data fetching: if Supabase queries return no data (e.g., sessionResult.data is null), it falls back to demo data from getDemoFindings() in lib/demo-data.ts. File parsing in parseBrief() validates supported formats (PDF/DOCX) and handles extraction errors gracefully. The sanitizeSoql() function prevents API injection attacks. Agent failures are logged in the audit_trail table with output_summary. UI components like SessionLive show real-time activity states, and status badges indicate session progress (pending/running/completed/failed) with appropriate visual feedback.",
  },
];

// ─── Technical Details ────────────────────────────────────────────

export const technicalDetails: TechnicalDetail[] = [
  {
    type: "table",
    heading: "Database Schema Overview",
    description: "Key tables and their relationships inferred from code usage",
    items: [
    {
      label: "stress_test_sessions",
      value: "id (UUID), brief_title, jurisdiction, status, overall_score, created_at",
      metadata: {"primaryKey": "id", "relationships": "1:many with findings and audit_trail"},
    },
    {
      label: "findings",
      value: "id, session_id (FK), type, severity, confidence, description, suggested_fix, round",
      metadata: {"foreignKey": "session_id references stress_test_sessions.id", "indexes": "session_id, round"},
    },
    {
      label: "audit_trail",
      value: "id, session_id (FK), agent, action, round, output_summary, created_at",
      metadata: {"foreignKey": "session_id references stress_test_sessions.id", "purpose": "Agent activity logging"},
    },
    ],
  },
  {
    type: "card-grid",
    heading: "AI Agent Configuration",
    description: "Role definitions and color coding for multi-agent system",
    items: [
    {
      label: "Attacker",
      value: "Identifies flaws, logical inconsistencies, and factual errors",
      metadata: {"color": "var(--crimson-9)", "icon": "Swords", "delay": "0"},
    },
    {
      label: "Defender",
      value: "Counters arguments, provides alternative interpretations",
      metadata: {"color": "var(--blue-9)", "icon": "Shield", "delay": "1"},
    },
    {
      label: "Judge",
      value: "Evaluates findings based on legal precedents and jurisdiction rules",
      metadata: {"color": "var(--purple-9)", "icon": "Scale", "delay": "2"},
    },
    ],
  },
  {
    type: "code",
    heading: "Conditional Data Fetching Pattern",
    description: "Graceful degradation when Supabase returns no data",
    code: "if (sessionResult.data) {\n  // Fetch from Supabase\n  const findingsResult = await supabase\n    .from(\"findings\")\n    .select(\"*\")\n    .eq(\"session_id\", id);\n  findings = findingsResult.data;\n} else {\n  // Fallback to demo data\n  findings = getDemoFindings(id);\n}",
  },
  {
    type: "diagram",
    heading: "System Architecture Flow",
    description: "End-to-end data flow through the application",
    code: "User Upload \u2192 NewSessionForm \u2192 parseBrief() \u2192 stress_test_sessions\n           \u2193\n    Python redteam module (npm scripts)\n           \u2193\n    Agent Rounds: Attacker \u2192 Defender \u2192 Judge\n           \u2193\n    findings + audit_trail tables\n           \u2193\n    Session Page: groupByRound() + scoreColor()\n           \u2193\n    Results Visualization + Knowledge Base Integration",
  },
];

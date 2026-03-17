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
    finding: "Server-side rendering by default with React Server Components, enabling efficient data fetching and reduced client-side JavaScript.",
    relevance: "Used for all pages in app/protected/ (e.g., blood-tests, appointments) with async data fetching, Suspense boundaries for loading states, and server actions like uploadBloodTest.",
    url: "https://nextjs.org/docs/app",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "neon-postgresql",
    number: 2,
    title: "Neon PostgreSQL + Drizzle ORM",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Neon / Drizzle Team",
    year: 2024,
    finding: "Serverless PostgreSQL with branching, autoscaling, and pgvector support, paired with a type-safe ORM for schema management.",
    relevance: "Stores core tables like blood_tests, blood_markers, and appointments via Drizzle schema, with pgvector HNSW indexes for embedding similarity search and Cloudflare R2 for file storage.",
    url: "https://neon.tech/docs",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "qwen-embeddings",
    number: 3,
    title: "Qwen Embeddings",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Alibaba Cloud",
    year: 2024,
    finding: "text-embedding-v4 model generates 1024-dimensional vectors for semantic search and retrieval-augmented generation (RAG).",
    relevance: "Powers embedding generation via QwenClient for test summaries (formatTestForEmbedding) and individual markers (formatMarkerForEmbedding), stored in blood_test_embeddings and blood_marker_embeddings tables.",
    url: "https://help.aliyun.com/zh/dashscope/developer-reference/text-embedding-api-details",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "better-auth",
    number: 4,
    title: "Better Auth",
    category: "Authentication",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Better Auth",
    year: 2024,
    finding: "Framework-agnostic authentication library with Drizzle adapter, email/password support, and Next.js cookie management.",
    relevance: "Handles all authentication via lib/auth.ts with Drizzle adapter, providing server-side session checks via withAuth() and client-side auth via authClient hooks.",
    url: "https://www.better-auth.com",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "radix-ui-themes",
    number: 5,
    title: "Radix UI Themes",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix UI",
    year: 2024,
    finding: "Accessible component library with built-in dark theme support and primitive building blocks.",
    relevance: "Provides UI components like Dialog, Dropdown, and Skeleton across pages (e.g., app/protected/blood-tests/page.tsx) and enables theme management via next-themes.",
    url: "https://www.radix-ui.com/themes",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "unstructured-api",
    number: 6,
    title: "Unstructured API",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Unstructured",
    year: 2024,
    finding: "Document parsing service that extracts structured data from PDFs and other file formats.",
    relevance: "Parses uploaded blood test PDFs in the uploadBloodTest server action, converting them into marker data for insertion into the blood_markers table.",
    url: "https://unstructured.io/api",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "semantic-scholar-api",
    number: 7,
    title: "Semantic Scholar API",
    category: "Search",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Allen Institute for AI",
    year: 2024,
    finding: "Academic search engine providing access to millions of research papers with metadata and summaries.",
    relevance: "Used in lib/semantic-scholar.ts for research paper discovery, querying based on abnormal markers with fallbacks to OpenAlex, CrossRef, and CORE APIs.",
    url: "https://api.semanticscholar.org",
    categoryColor: "var(--indigo-9)",
  },
  {
    slug: "cloudflare-r2",
    number: 8,
    title: "Cloudflare R2",
    category: "Storage",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Cloudflare",
    year: 2024,
    finding: "S3-compatible object storage with zero egress fees, used for storing blood test PDF uploads.",
    relevance: "Replaces Supabase Storage for file uploads via lib/storage.ts using @aws-sdk/client-s3, with files stored in the healthcare-blood-tests bucket.",
    url: "https://developers.cloudflare.com/r2",
    categoryColor: "var(--purple-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "1024-dim",
    label: "Embedding vector dimensionality for semantic search",
    source: "Qwen text-embedding-v4 model configuration",
  },
  {
    number: "7",
    label: "Predefined clinical ratios with published thresholds (e.g., TG/HDL, NLR)",
    source: "Domain-specific implementation in trajectory tracking",
  },
  {
    number: "4",
    label: "API fallback layers for research paper retrieval (Semantic Scholar → OpenAlex → CrossRef → CORE)",
    source: "Multi-source design in lib/semantic-scholar.ts",
  },
  {
    number: "3",
    label: "Embedding granularity levels: test, marker, and condition",
    source: "Multi-level embedding strategy in lib/embeddings.ts",
  },
  {
    number: "O(log n)",
    label: "Query performance for vector similarity searches with pgvector indexes",
    source: "PostgreSQL vector indexing for cosine similarity",
  },
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "PDF Upload and Parsing",
    description: "Users upload blood test PDFs via the UploadForm component at /app/protected/blood-tests/upload-form, triggering the uploadBloodTest server action. This stores the file in Cloudflare R2, then calls the Unstructured API to parse the PDF into structured marker data. The parsed data is inserted into the blood_markers table via Drizzle ORM.",
    researchBasis: "Unstructured Client for document parsing, Cloudflare R2 for file storage",
  },
  {
    name: "Embedding Generation and Storage",
    description: "After parsing, the system generates embeddings using QwenClient: test-level embeddings via formatTestForEmbedding() and marker-level embeddings via formatMarkerForEmbedding(). These 1024-dimensional vectors are stored in the blood_test_embeddings and blood_marker_embeddings tables, enabling semantic search capabilities.",
    researchBasis: "Qwen text-embedding-v4 model for vector generation, PostgreSQL for vector storage",
  },
  {
    name: "AI Health Q&A Retrieval",
    description: "When a user asks a question, Drizzle raw SQL queries retrieve relevant embeddings from Neon using pgvector cosine similarity. A hybrid search combining FTS + vector similarity is performed on blood_marker_embeddings to find top-k relevant markers. This context is combined with the question and fed to QwenClient.chat() using the qwen-plus model.",
    researchBasis: "Retrieval-Augmented Generation (RAG) pattern with vector similarity search",
  },
  {
    name: "Research Paper Discovery",
    description: "Abnormal markers flagged in blood tests trigger queries to the Semantic Scholar API via lib/semantic-scholar.ts. The query is built from marker names, values, and flags, using bulk search with filters for year and citation count. Results are ranked by relevance and displayed in the ResearchSection component with TLDR summaries and PDF links.",
    researchBasis: "Semantic Scholar API for academic paper retrieval, multi-source fallback design",
  },
  {
    name: "Trajectory Tracking and Alerts",
    description: "The system calculates health trajectories by comparing 1024-dimensional embeddings across time using cosine similarity in the database. Velocity alerts are generated by computing per-day rate-of-change for each biomarker, and clinical ratios (e.g., TG/HDL, NLR) are evaluated against published thresholds to detect early trends.",
    researchBasis: "Vector mathematics for pattern detection, clinical ratio integration",
  },
  {
    name: "Appointment Management",
    description: "Users manage health appointments via the appointments module at /app/protected/appointments/page.tsx, using the AddAppointmentForm for creation and deleteAppointment server action for deletion. Data is stored in the appointments table via Drizzle ORM with fields like title, provider, and appointmentDate.",
    researchBasis: "Drizzle ORM for type-safe queries, Next.js server actions for mutations",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "Users upload blood test PDFs via a protected upload form, triggering a server action that stores files in Cloudflare R2 and parses them with Unstructured API. The parsed markers are inserted into the blood_markers table via Drizzle ORM, and Qwen generates 1024-dimensional embeddings for each marker and test summary, stored in Neon pgvector tables. For AI Q&A, Drizzle raw SQL queries retrieve relevant embeddings, perform cosine similarity searches, and feed context to QwenClient.chat for responses. Research paper discovery queries Semantic Scholar API based on abnormal markers, displaying results with summaries and links.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "The app uses a Next.js 15 App Router with server components by default for pages like /app/protected/blood-tests/, leveraging Suspense boundaries for loading states. Data flows through a monorepo structure with Turbopack bundling, integrating Neon PostgreSQL via Drizzle ORM for type-safe queries and Better Auth for authentication. AI components are built with a custom QwenClient for embeddings and chat, and external APIs like Semantic Scholar are used for research retrieval.",
  },
  {
    heading: "Database Design",
    content: "Core tables include blood_tests (id, user_id, status), blood_markers (test_id, name, value, flag), and appointments (user_id, title, appointment_date), defined in Drizzle schema at lib/db/schema.ts. Vector tables like blood_test_embeddings and blood_marker_embeddings store 1024-dimensional pgvector embeddings for semantic search with HNSW indexes. All queries are scoped to the authenticated user via withAuth(), and indexes are applied for performance on user_id and test_date columns.",
  },
  {
    heading: "Security & Auth",
    content: "Authentication is handled by Better Auth with email/password, using a Drizzle adapter in lib/auth.ts. Middleware checks session cookies for route protection, and each page/action calls withAuth() server-side, redirecting unauthenticated users to /auth/login. All queries are scoped to the authenticated userId, and server actions like uploadBloodTest include validation. Environment variables secure API keys for DashScope and other services.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "The app is deployed on Vercel with Neon PostgreSQL for the database, Better Auth for authentication, and Cloudflare R2 for file storage. The monorepo structure allows standalone deployments. Drizzle Kit manages schema migrations via `drizzle-kit push`, and HNSW vector indexes are created via raw SQL for optimal embedding search performance.",
  },
  {
    heading: "AI Integration",
    content: "AI capabilities are centered on Qwen models: text-embedding-v4 for generating 1024-dim vectors and qwen-plus for chat. Embeddings are created at test, marker, and condition levels via functions like formatTestForEmbedding(). RAG patterns enable health Q&A with cosine similarity searches on vector tables. Evaluation frameworks like promptfoo and Braintrust are used for LLM evaluation and experiment tracking.",
  },
  {
    heading: "UI/UX Design",
    content: "The interface uses Radix UI Themes for components like Dialog and Skeleton, with Geist font and lucide-react icons. Pages feature status badges (done, error) and flag indicators (low, normal, high) in tabular displays. Progressive enhancement is achieved through Suspense and skeleton loaders, and theme management is handled by next-themes for dark/light mode support.",
  },
];

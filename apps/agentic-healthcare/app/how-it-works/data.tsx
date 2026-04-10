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
    finding: "React framework with App Router, Server Components, and Server Actions for optimized performance and SEO",
    relevance: "Used for the entire frontend with app/ directory routing, enabling Server Components in pages like app/(app)/chat/page.tsx and Server Actions in app/(app)/conditions/actions.ts",
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
    finding: "Serverless PostgreSQL with branching and auto-scaling for modern applications",
    relevance: "Primary database storing bloodTests, conditions, medications, symptoms, appointments, doctors, and familyMembers tables with Drizzle ORM for schema management",
    url: "https://neon.tech/docs",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "drizzle-orm",
    number: 3,
    title: "Drizzle ORM",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Drizzle Team",
    year: 2024,
    finding: "TypeScript ORM with zero dependencies and excellent TypeScript support",
    relevance: "Used for all database operations, including migrations with Drizzle Kit and queries like in app/(app)/doctors/page.tsx for multi-table joins",
    url: "https://orm.drizzle.team/docs",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "better-auth",
    number: 4,
    title: "Better Auth",
    category: "Authentication",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "AI Apps",
    year: 2024,
    finding: "Authentication library with session management and route protection",
    relevance: "Handles user authentication via @ai-apps/auth, with session checks in lib/auth-helpers.ts and userId isolation in all queries",
    url: "https://better-auth.com/docs",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "qwen-2-5-7b",
    number: 5,
    title: "Qwen 2.5 7B Instruct 4bit",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Alibaba",
    year: 2024,
    finding: "Local LLM optimized for Apple Silicon via mlx_lm.server, offering privacy and low-latency inference",
    relevance: "Primary LLM for AI health Q&A in the ChatInterface component, configured via LLM_BASE_URL and LLM_MODEL environment variables",
    url: "https://huggingface.co/mlx-community/Qwen2.5-7B-Instruct-4bit",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "bge-large-en-v1-5",
    number: 6,
    title: "BGE-large-en-v1.5",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "BAAI",
    year: 2024,
    finding: "1024-dimension embedding model for semantic search and retrieval",
    relevance: "Used in lib/embed.ts to generate embeddings for blood tests, conditions, medications, and other entities for cosine similarity search in RAG",
    url: "https://huggingface.co/Xenova/bge-large-en-v1.5",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "cloudflare-r2",
    number: 7,
    title: "Cloudflare R2",
    category: "Storage",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Cloudflare",
    year: 2024,
    finding: "Object storage with S3-compatible API and zero egress fees",
    relevance: "Stores uploaded blood test PDFs in the healthcare-blood-tests bucket, accessed via AWS SDK v3",
    url: "https://developers.cloudflare.com/r2",
    categoryColor: "var(--cyan-9)",
  },
  {
    slug: "panda-css",
    number: 8,
    title: "Panda CSS",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Panda CSS Team",
    year: 2024,
    finding: "CSS-in-JS with codegen for type-safe styling and theming",
    relevance: "Used for styling across components with panda codegen for design token management",
    url: "https://panda-css.com/docs",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "radix-ui",
    number: 9,
    title: "Radix UI",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix UI",
    year: 2024,
    finding: "Unstyled, accessible component primitives for building custom UIs",
    relevance: "Provides base components like dialogs and dropdowns, customized with Panda CSS theme",
    url: "https://www.radix-ui.com/docs",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "vitest",
    number: 10,
    title: "Vitest",
    category: "Evaluation",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vitest Team",
    year: 2024,
    finding: "Fast unit testing framework with Vite integration",
    relevance: "Used for unit testing TypeScript code, including functions in lib/embed.ts and components",
    url: "https://vitest.dev/guide",
    categoryColor: "var(--pink-9)",
  },
  {
    slug: "promptfoo",
    number: 11,
    title: "Promptfoo",
    category: "Evaluation",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Promptfoo",
    year: 2024,
    finding: "Framework for evaluating LLM prompts and outputs with scenario-based testing",
    relevance: "Evaluates LLM responses in the ChatInterface component and trajectory analysis prompts",
    url: "https://www.promptfoo.dev/docs",
    categoryColor: "var(--pink-9)",
  },
  {
    slug: "turbopack",
    number: 12,
    title: "Turbopack",
    category: "Build Tool",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding: "Incremental bundler for fast development builds in Next.js",
    relevance: "Used for development builds to speed up iteration on components like UploadForm and ChatInterface",
    url: "https://nextjs.org/docs/app/api-reference/turbopack",
    categoryColor: "var(--gray-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "1024-dim",
    label: "Embedding dimension for BGE-large-en-v1.5 model",
    source: "lib/embed.ts uses Xenova/bge-large-en-v1.5 for vector generation",
  },
  {
    number: "7B",
    label: "Parameter count for Qwen 2.5 Instruct LLM",
    source: "LLM_MODEL=mlx-community/Qwen2.5-7B-Instruct-4bit in .env.example",
  },
  {
    number: "10+",
    label: "Entity types with embeddings (blood tests, conditions, medications, etc.)",
    source: "Multi-source RAG across tables referenced in lib/embed.ts",
  },
  {
    number: "4",
    label: "Evaluation frameworks (Vitest, Promptfoo, DeepEval, RAGAS)",
    source: "Package.json scripts and evaluation file references",
  },
  {
    number: "O(log n)",
    label: "Indexed search performance for userId queries",
    source: "PostgreSQL indexes on userId columns for all user-owned tables",
  },
  {
    number: "< 100ms",
    label: "Target latency for local LLM inference via mlx_lm.server",
    source: "Apple Silicon optimization for Qwen 2.5 4bit model",
  },
  {
    number: "0 egress",
    label: "Cloudflare R2 storage cost model with zero egress fees",
    source: "R2 bucket healthcare-blood-tests for PDF storage",
  },
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Blood Test Upload and Storage",
    description: "Users upload blood test PDFs via the UploadForm component in app/(app)/blood-tests/upload-form.tsx, which handles file validation and multipart form data submission. The PDF is then uploaded to Cloudflare R2 bucket healthcare-blood-tests using AWS SDK v3 for secure storage. This step ensures raw data is persisted before processing, with userId isolation for multi-tenancy.",
    researchBasis: "Cloudflare R2 object storage with S3-compatible API",
    codeSnippet: "// UploadForm component handles file input and submission\nconst formData = new FormData();\nformData.append('file', pdfFile);\nawait fetch('/api/upload', { method: 'POST', body: formData });",
    dataFlow: "PDF file \u2192 UploadForm validation \u2192 Cloudflare R2 bucket \u2192 stored with userId key",
  },
  {
    name: "Embedding Generation and Processing",
    description: "The uploaded blood test data is processed via package scripts (process:pdf) to extract text and structured markers. Using the getEmbedder function from lib/embed.ts, the BGE-large-en-v1.5 model generates 1024-dimension embeddings for the full test data. These embeddings are stored in PostgreSQL alongside derived metrics like clinical ratios and biomarker velocities calculated between sequential tests.",
    researchBasis: "Hugging Face Transformers with BGE-large-en-v1.5 for embeddings",
    codeSnippet: "// lib/embed.ts - Singleton pipeline for embeddings\nasync function getEmbedder() {\n  if (!_pipeline) {\n    _pipeline = await pipeline('feature-extraction', 'Xenova/bge-large-en-v1.5');\n  }\n  return _pipeline;\n}\nconst embedding = await getEmbedder()(text);",
    dataFlow: "Blood test text \u2192 BGE model \u2192 1024-dim vector \u2192 stored in embeddings table",
  },
  {
    name: "Multi-Source Retrieval for RAG",
    description: "When a user submits a query in the ChatInterface component, the query is embedded using the same BGE model from lib/embed.ts. A cosine similarity search is performed across multiple entity types (blood tests, conditions, medications, symptoms, appointments) using their pre-computed embeddings. The top-k relevant chunks are retrieved and formatted with entity-specific templates (e.g., formatCondition, formatMedication) to assemble context for the LLM.",
    researchBasis: "Cosine similarity search across unified vector space",
    codeSnippet: "// Formatting functions in lib/embed.ts\nexport function formatCondition(name: string, notes: string | null): string {\n  return notes ? `Health condition: ${name}\\nNotes: ${notes}` : `Health condition: ${name}`;\n}",
    dataFlow: "User query \u2192 embedding \u2192 cosine similarity search \u2192 top-k chunks \u2192 formatted context",
  },
  {
    name: "LLM Generation and Streaming",
    description: "The assembled context is sent to the local Qwen 2.5 7B Instruct 4bit LLM via QwenClient, configured with LLM_BASE_URL and LLM_MODEL environment variables. The LLM generates an answer grounded in the retrieved context, with system prompts emphasizing medical accuracy. Responses are streamed back to the UI using the ChatInterface component, enabling real-time interaction with conversation history management.",
    researchBasis: "mlx_lm.server for Apple Silicon-optimized local inference",
    codeSnippet: "// QwenClient handles LLM requests\nconst response = await qwenClient.generate({\n  prompt: formattedPrompt,\n  stream: true\n});",
    dataFlow: "Formatted context \u2192 Qwen 2.5 LLM \u2192 generated answer \u2192 streamed to ChatInterface",
  },
  {
    name: "Trajectory Analysis and Velocity Calculation",
    description: "The TrajectoryPreview and TrajectoryInsights components analyze sequential blood tests by comparing embeddings via cosine similarity to detect pattern shifts. Functions calculate biomarker velocities (rate of change per day) and clinical ratios based on available markers. This enables trend detection and alerts for accelerating trends, providing longitudinal health insights beyond snapshot analysis.",
    researchBasis: "Embedding similarity for pattern recognition and rate calculations",
    codeSnippet: "// Velocity calculation between tests\nconst velocity = (currentValue - previousValue) / daysBetween;\nif (Math.abs(velocity) > threshold) triggerAlert();",
    dataFlow: "Sequential test embeddings \u2192 cosine similarity \u2192 velocity calculation \u2192 trend insights",
  },
  {
    name: "Evaluation and Quality Assurance",
    description: "Comprehensive evaluation is performed using Vitest for unit tests, Promptfoo for LLM prompt evaluation, and DeepEval with RAGAS for RAG quality metrics (faithfulness, relevancy). Evaluation scripts cover critical paths like blood test processing, chat Q&A, and trajectory analysis, ensuring medical accuracy and system reliability through scenario-based testing.",
    researchBasis: "Multi-framework evaluation suite for AI systems",
    codeSnippet: "// Package.json scripts for evaluation\n\"scripts\": {\n  \"test\": \"vitest\",\n  \"eval:rag\": \"promptfoo eval\"\n}",
    dataFlow: "Test scenarios \u2192 evaluation frameworks \u2192 metrics (precision, recall) \u2192 quality reports",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "Users upload blood test PDFs via the UploadForm component, which are stored in Cloudflare R2 and processed into embeddings using the BGE-large-en-v1.5 model in lib/embed.ts. The system calculates clinical ratios and biomarker velocities between sequential tests to detect trends, storing all data in PostgreSQL with Drizzle ORM. For AI Q&A, user queries are embedded and retrieved via cosine similarity across multiple entity types, then answered by the local Qwen 2.5 LLM via QwenClient, with responses streamed back through the ChatInterface component.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: ExtraSection[] = [
  {
    heading: "System Architecture",
    content: "The platform uses a server-first architecture with Next.js 15 App Router, leveraging Server Components for data fetching in pages like app/(app)/dashboard and Server Actions for mutations in app/(app)/conditions/actions.ts. The monorepo workspace includes internal packages (@ai-apps/*) for shared auth and DB utilities. A hybrid embedding strategy employs JavaScript via @huggingface/transformers in lib/embed.ts for client-side embeddings, ensuring vector space alignment across entity types with the BGE-large-en-v1.5 model.",
  },
  {
    heading: "Database Design",
    content: "PostgreSQL with Neon hosts core tables including bloodTests, conditions, medications, symptoms, appointments, doctors, and familyMembers, all featuring userId columns for multi-tenancy as shown in app/(app)/conditions/actions.ts. Schema patterns include soft deletes via deletedAt timestamps and audit trails with createdAt/updatedAt. Junction tables like familyMemberDoctors manage many-to-many relationships, with indexes on userId and foreign keys for performance. Drizzle ORM handles migrations and type-safe queries.",
  },
  {
    heading: "Security & Auth",
    content: "Authentication is managed by Better Auth (@ai-apps/auth) with cookie-based sessions and route protection via withAuth() HOC in lib/auth-helpers.ts. Security measures include application-level userId checks in all database queries, PDF validation before processing, medical disclaimers in AI responses, and environment secrets in .env.local. File uploads to Cloudflare R2 are secured with AWS SDK v3, ensuring data isolation and privacy compliance.",
  },
  {
    heading: "AI Integration",
    content: "AI capabilities center on a local Qwen 2.5 7B Instruct 4bit LLM via mlx_lm.server for privacy-sensitive health queries, configured with LLM_BASE_URL and LLM_MODEL. Embeddings use the BGE-large-en-v1.5 model through lib/embed.ts for multi-source RAG across blood tests, conditions, medications, symptoms, and appointments. Prompt engineering includes entity-specific formatting functions (formatCondition, formatMedication) and system prompts for trajectory analysis, with retrieval via cosine similarity and streaming responses via QwenClient.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "The frontend is built with Next.js 15 and deployed on Vercel, using Turbopack for fast development builds. PostgreSQL is hosted on Neon for serverless scaling, with Cloudflare R2 for file storage via AWS SDK v3. Local LLM inference runs on Apple Silicon via mlx_lm.server, while embedding generation uses Hugging Face Transformers in Node.js. Evaluation infrastructure includes Vitest, Promptfoo, DeepEval, and RAGAS, with UV as the Python package manager for testing scripts.",
  },
  {
    heading: "Evaluation Framework",
    content: "A comprehensive evaluation suite ensures medical accuracy and system reliability. Vitest handles unit tests for TypeScript code, Promptfoo evaluates LLM prompts and trajectory testing, DeepEval assesses RAG quality metrics (faithfulness, relevancy), and RAGAS provides specialized retrieval metrics. Evaluation scripts cover critical paths like blood test processing, chat Q&A, and multi-turn conversations, with scenario-based testing to validate performance across diverse health queries.",
  },
  {
    heading: "Unique Technical Patterns",
    content: "Key patterns include the embedding singleton in lib/embed.ts to cache the Hugging Face pipeline, multi-table joins with Drizzle ORM as seen in app/(app)/doctors/page.tsx for efficient data fetching, and Server Action patterns with auth checks in app/(app)/conditions/actions.ts. Entity-aware formatting functions enable consistent embedding generation, while biomarker velocity calculations detect trend shifts. The evaluation-first approach integrates multiple frameworks for rigorous testing of AI outputs.",
  },
  {
    heading: "Data Flow & Pipeline",
    content: "Data flows from PDF upload via UploadForm to Cloudflare R2 storage, then through processing scripts (process:pdf) to extract text and generate embeddings via lib/embed.ts. Embeddings are stored in PostgreSQL alongside derived metrics like clinical ratios and velocities. For Q&A, queries are embedded and retrieved via cosine similarity, with context assembled using formatting functions and sent to the Qwen 2.5 LLM. Responses are streamed back through ChatInterface, while trajectory analysis components compute insights from sequential test comparisons.",
  },
];

// ─── Technical Details ────────────────────────────────────────────

export const technicalDetails: TechnicalDetail[] = [
  {
    type: "table",
    heading: "Core Database Tables",
    description: "PostgreSQL tables with userId isolation and soft deletes",
    items: [
    {
      label: "bloodTests",
      value: "Stores uploaded lab results with embeddings",
      metadata: {"columns": "id, userId, pdfUrl, embedding, createdAt"},
    },
    {
      label: "conditions",
      value: "Health conditions with notes and embeddings",
      metadata: {"columns": "id, userId, name, notes, embedding"},
    },
    {
      label: "medications",
      value: "Medication records with dosage and frequency",
      metadata: {"columns": "id, userId, name, dosage, frequency, notes, embedding"},
    },
    {
      label: "doctors",
      value: "Care team members linked to family members",
      metadata: {"columns": "id, userId, name, specialty"},
    },
    {
      label: "familyMemberDoctors",
      value: "Junction table for many-to-many relationships",
      metadata: {"columns": "familyMemberId, doctorId"},
    },
    ],
  },
  {
    type: "card-grid",
    heading: "Key React Components",
    description: "Server and client components driving the UI",
    items: [
    {
      label: "UploadForm",
      value: "Handles blood test PDF uploads in app/(app)/blood-tests/upload-form.tsx",
      metadata: {"type": "Client Component"},
    },
    {
      label: "ChatInterface",
      value: "AI health Q&A interface in app/(app)/chat/chat-client.tsx",
      metadata: {"type": "Client Component with streaming"},
    },
    {
      label: "TrajectoryPreview",
      value: "Displays biomarker trends and insights",
      metadata: {"type": "Server Component"},
    },
    {
      label: "ConditionResearch",
      value: "Integrates research data in app/(app)/conditions/[id]/page.tsx",
      metadata: {"type": "Server Component"},
    },
    ],
  },
  {
    type: "code",
    heading: "Embedding Singleton Pattern",
    description: "Cached pipeline for Hugging Face model to avoid re-initialization",
    code: "// lib/embed.ts\nlet _pipeline: FeatureExtractionPipeline | null = null;\nasync function getEmbedder(): Promise<FeatureExtractionPipeline> {\n  if (!_pipeline) {\n    _pipeline = await pipeline(\"feature-extraction\", \"Xenova/bge-large-en-v1.5\");\n  }\n  return _pipeline;\n}\n// Usage\nconst embedder = await getEmbedder();\nconst embedding = await embedder(text);",
  },
  {
    type: "diagram",
    heading: "System Architecture Overview",
    description: "End-to-end flow from upload to insights",
    code: "User \u2192 [Next.js Frontend] \u2192 UploadForm \u2192 Cloudflare R2 (PDFs)\n                     \u2193\n              [PostgreSQL] \u2190 Drizzle ORM \u2190 Embeddings (lib/embed.ts)\n                     \u2193\n        [Qwen 2.5 LLM] \u2190 RAG Retrieval \u2190 Cosine Similarity\n                     \u2193\n           [ChatInterface] \u2192 Streaming Response \u2192 User\n                     \u2193\n    [Trajectory Analysis] \u2192 Velocity Calculation \u2192 Alerts\n                     \u2193\n        [Evaluation] \u2190 Vitest/Promptfoo/DeepEval/RAGAS",
  },
];

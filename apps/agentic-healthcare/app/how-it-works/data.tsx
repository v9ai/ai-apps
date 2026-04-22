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
    title: "BAAI/bge-large-en-v1.5",
    category: "AI/Embeddings",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Beijing Academy of AI",
    year: 2023,
    finding: "BERT-based bi-encoder producing native 1024-dim embeddings, ranked #1 on MTEB at release. Runs fully offline via ONNX Runtime (Python) and quantized INT8 (TypeScript) — zero API calls, zero egress, full data sovereignty",
    relevance: "Dual-runtime embedding: FastEmbed (ONNX) in langgraph/embeddings.py for ingestion and search, Xenova/bge-large-en-v1.5 (q8 via @huggingface/transformers) in lib/embed.ts for browser-side entity embedding. Both produce aligned 1024-dim vectors stored in 7 pgvector tables",
    url: "https://huggingface.co/BAAI/bge-large-en-v1.5",
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
    slug: "deepeval",
    number: 10,
    title: "DeepEval",
    category: "Evaluation",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Confident AI",
    year: 2024,
    finding: "Python evaluation framework for LLMs with built-in RAG metrics, GEval custom criteria, and synthetic test generation",
    relevance: "Powers the full evaluation suite in evals/ with 15+ test modules covering RAG triad, safety, trajectory, conversational, and graph pipeline quality",
    url: "https://docs.confident-ai.com",
    categoryColor: "var(--pink-9)",
  },
  {
    slug: "turbopack",
    number: 11,
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
    label: "Native embedding dimension (BAAI/bge-large-en-v1.5, no truncation needed)",
    source: "langgraph/embeddings.py: _LOCAL_MODEL = \"BAAI/bge-large-en-v1.5\" via FastEmbed TextEmbedding",
  },
  {
    number: "7B",
    label: "Parameter count for Qwen 2.5 Instruct LLM",
    source: "LLM_MODEL=mlx-community/Qwen2.5-7B-Instruct-4bit in .env.example",
  },
  {
    number: "7",
    label: "Embedding tables (tests, markers, health state, conditions, medications, symptoms, appointments)",
    source: "7 paired pgvector tables with vector(1024) + BTREE user_id index",
  },
  {
    number: "2",
    label: "Evaluation frameworks (DeepEval, RAGAS)",
    source: "evals/ directory with 15+ pytest modules using DeepEval metrics and RAGAS triad",
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
    description: "Users upload blood test PDFs via the UploadForm component in app/(app)/blood-tests/upload-form.tsx, which handles file validation and multipart form data submission. A Next.js Server Action sends the file to the Python FastAPI backend at POST /upload, which uploads the raw bytes to Cloudflare R2 bucket healthcare-blood-tests via boto3 (S3-compatible). This ensures raw data is persisted before processing, with userId isolation for multi-tenancy.",
    researchBasis: "Cloudflare R2 object storage with S3-compatible API via boto3",
    codeSnippet: "# langgraph/routes/upload.py\nfile_path = f\"{user_id}/{int(time.time() * 1000)}_{file.filename}\"\nupload_file(file_path, file_bytes, file.content_type or \"application/pdf\")\ntest_id = insert_blood_test(\n    user_id=user_id, file_name=file.filename,\n    file_path=file_path, status=\"processing\",\n)",
    dataFlow: "PDF file → UploadForm → Server Action → FastAPI POST /upload → R2 bucket (userId/timestamp_fileName)",
  },
  {
    name: "LlamaParse PDF-to-Markdown Conversion",
    description: "LlamaParse is called directly (not through the LlamaIndex IngestionPipeline) to convert uploaded PDFs into structured markdown. The PDF bytes are written to a temp file, passed to LlamaParse's cloud API with result_type='markdown', then deleted. The returned markdown is processed by _markdown_to_elements() which uses regex to extract markdown tables and converts them to HTML via _md_table_to_html(). The result is a list of element dicts with type 'Table' (containing text_as_html) or 'NarrativeText'.",
    researchBasis: "LlamaParse cloud API — standalone invocation, decoupled from LlamaIndex",
    codeSnippet: "# langgraph/routes/upload.py — _partition_pdf()\nfrom llama_parse import LlamaParse\n\nparser = LlamaParse(\n    api_key=settings.llama_cloud_api_key,\n    result_type=\"markdown\",\n)\ndocs = parser.load_data(tmp_path)\nfor doc in docs:\n    elements.extend(_markdown_to_elements(doc.text))",
    dataFlow: "PDF bytes → temp file → LlamaParse cloud API → markdown → _markdown_to_elements() → element dicts",
  },
  {
    name: "3-Tier Marker Extraction",
    description: "parse_markers() in langgraph/parsers.py applies a 3-tier fallback strategy to extract biomarkers from the LlamaParse element dicts. Tier 1: parse_html_table extracts name/value/unit/reference_range from HTML table cells. Tier 2: parse_form_key_values handles Romanian/European key-value lab formats. Tier 3: parse_text_markers uses regex pattern matching for tab/space-separated free text. Each marker's flag (normal/low/high) is computed by compare_flag() against the reference range. Markers are stored in the blood_markers table.",
    researchBasis: "Multi-strategy parsing with compute_flag() for clinical range comparison",
    codeSnippet: "# langgraph/parsers.py\n@dataclass\nclass Marker:\n    name: str           # e.g. \"Glucose\"\n    value: str          # e.g. \"95.5\"\n    unit: str           # e.g. \"mg/dL\"\n    reference_range: str # e.g. \"70-100\"\n    flag: str           # \"normal\" | \"low\" | \"high\"\n\n# 3-tier: parse_html_table → parse_form_key_values → parse_text_markers",
    dataFlow: "Element dicts → 3-tier parse_markers() → Marker objects → insert_blood_markers() → blood_markers table",
  },
  {
    name: "Embedding Generation (LlamaIndex IngestionPipeline)",
    description: "After the upload response returns, a FastAPI BackgroundTask runs _run_ingestion() which orchestrates a LlamaIndex IngestionPipeline. A custom BloodTestNodeParser produces 3 node types per test: blood_test (summary), blood_marker (one per marker), and health_state (7 derived clinical ratios with risk classification). All text is embedded locally via BAAI/bge-large-en-v1.5 (1024-dim, ONNX Runtime) through FastEmbedEmbedding, then persisted to 3 pgvector tables with ON CONFLICT upsert for idempotency.",
    researchBasis: "BAAI/bge-large-en-v1.5 via FastEmbed (local ONNX, zero API cost)",
    codeSnippet: "# langgraph/embeddings.py\n_LOCAL_MODEL = \"BAAI/bge-large-en-v1.5\"\n\ndef generate_embedding(text: str) -> list[float]:\n    model = _get_local_model()  # FastEmbed ONNX\n    return [float(x) for x in next(model.embed([text]))]",
    dataFlow: "Element dicts → BloodTestNodeParser (3 node types) → bge-large-en-v1.5 (1024-dim) → pgvector ON CONFLICT upsert",
  },
  {
    name: "Multi-Source Retrieval for RAG",
    description: "When a user submits a query, the triage node classifies intent into 8 categories, then the retrieve node dispatches to different pgvector search strategies. Marker queries use hybrid search (0.7 cosine + 0.3 FTS via a CTE with ts_rank normalization). Trajectory queries extend this with temporal joins for time-ordered series. General-health fans out to all 7 entity tables simultaneously. Results are deduplicated and re-ranked by score.",
    researchBasis: "Intent-routed hybrid search: cosine similarity + full-text search in one SQL CTE",
    codeSnippet: "# langgraph/db.py — hybrid scoring (markers only)\ncombined_score = (\n  0.3 * fts_norm  # normalized ts_rank\n+ 0.7 * (1 - (embedding <=> query_vec))  # cosine sim\n)\n# All other tables: pure cosine with 0.3 threshold",
    dataFlow: "User query → triage (8 intents) → intent-routed pgvector search → dedup + re-rank → context_chunks[]",
  },
  {
    name: "LLM Generation and Streaming",
    description: "The assembled context is sent to the local Qwen 2.5 7B Instruct 4bit LLM via QwenClient, configured with LLM_BASE_URL and LLM_MODEL environment variables. The LLM generates an answer grounded in the retrieved context, with system prompts emphasizing medical accuracy. Responses are streamed back to the UI using the ChatInterface component, enabling real-time interaction with conversation history management.",
    researchBasis: "mlx_lm.server for Apple Silicon-optimized local inference",
    codeSnippet: "// QwenClient handles LLM requests\nconst response = await qwenClient.generate({\n  prompt: formattedPrompt,\n  stream: true\n});",
    dataFlow: "Formatted context → Qwen 2.5 LLM → generated answer → streamed to ChatInterface",
  },
  {
    name: "Trajectory Analysis and Velocity Calculation",
    description: "The TrajectoryPreview and TrajectoryInsights components analyze sequential blood tests by comparing embeddings via cosine similarity to detect pattern shifts. Functions calculate biomarker velocities (rate of change per day) and clinical ratios based on available markers. This enables trend detection and alerts for accelerating trends, providing longitudinal health insights beyond snapshot analysis.",
    researchBasis: "Embedding similarity for pattern recognition and rate calculations",
    codeSnippet: "// Velocity calculation between tests\nconst velocity = (currentValue - previousValue) / daysBetween;\nif (Math.abs(velocity) > threshold) triggerAlert();",
    dataFlow: "Sequential test embeddings → cosine similarity → velocity calculation → trend insights",
  },
  {
    name: "Evaluation and Quality Assurance",
    description: "Comprehensive evaluation is performed using DeepEval with RAGAS for RAG quality metrics (faithfulness, relevancy, contextual precision/recall), GEval custom criteria with DeepSeek as judge, and synthetic test generation. 15+ pytest modules cover critical paths: RAG triad, safety guardrails, trajectory analysis, conversational multi-turn, graph pipeline, ingestion, extraction, and embedding quality.",
    researchBasis: "DeepEval + RAGAS evaluation suite with custom DeepSeek judge model",
    codeSnippet: "# evals/conftest.py — shared DeepSeek judge\nclass DeepSeekEvalLLM(DeepEvalBaseLLM):\n    ...\ndef make_geval(name, criteria, params):\n    return GEval(name=name, criteria=criteria, ...)",
    dataFlow: "Test scenarios → evaluation frameworks → metrics (precision, recall) → quality reports",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "Users upload blood test PDFs via the UploadForm component, which are stored in Cloudflare R2 and processed through a LlamaIndex IngestionPipeline with a custom BloodTestNodeParser. The pipeline produces 3 node types per test\u2014test-level, per-marker, and health-state with 7 derived ratios\u2014all embedded locally via BAAI/bge-large-en-v1.5 (native 1024-dim, ONNX Runtime) and stored in 7 paired pgvector tables. For AI Q&A, a 4-node LangGraph StateGraph (triage \u2192 retrieve \u2192 synthesize \u2192 guard) classifies intent into 8 categories, routes to intent-specific pgvector searches (hybrid for markers, fan-out for general health), generates a clinical answer, and audits it against 5 safety rules before delivery.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: ExtraSection[] = [
  {
    heading: "System Architecture",
    content: "A dual-runtime architecture: TypeScript (Next.js 15 App Router) handles entity CRUD and UI with Server Components and Server Actions, while Python (FastAPI on :8001) handles PDF ingestion, the LangGraph pipeline, and vector search. They communicate via internal API with a shared x-api-key header. Embeddings use BAAI/bge-large-en-v1.5 at 1024 dimensions via FastEmbed (ONNX Runtime) on the Python side and Xenova/bge-large-en-v1.5 (q8 via @huggingface/transformers) on the TypeScript side, ensuring vector space alignment across all 7 entity types with zero external API calls.",
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
    content: "AI capabilities use a 4-node LangGraph StateGraph (triage \u2192 retrieve \u2192 synthesize \u2192 guard) running on the Python backend. Triage classifies queries into 8 intent categories. Retrieve routes to intent-specific pgvector searches\u2014hybrid (0.7 cosine + 0.3 FTS) for markers, temporal joins for trajectory, fan-out for general health. Synthesize generates answers at temperature 0.1 with 7 clinical rules. Guard audits every response against 5 safety checks (no diagnosis, no prescription, physician referral required, no PII, no hallucination). Embeddings use BAAI/bge-large-en-v1.5 at 1024 dimensions via local ONNX Runtime for all 7 entity types.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "The frontend is built with Next.js 15 and deployed on Vercel, using Turbopack for fast development builds. The Python backend (FastAPI) runs the LangGraph pipeline and local embedding generation via FastEmbed. PostgreSQL is hosted on Neon for serverless scaling with pgvector extension, and Cloudflare R2 handles file storage via AWS SDK v3. All embeddings run locally through BAAI/bge-large-en-v1.5 (ONNX Runtime) \u2014 no external embedding API required. Evaluation infrastructure uses DeepEval and RAGAS for RAG-triad metrics.",
  },
  {
    heading: "Evaluation Framework",
    content: "A comprehensive evaluation suite ensures medical accuracy and system reliability. DeepEval provides RAG quality metrics (faithfulness, relevancy, contextual precision/recall), GEval custom criteria with a DeepSeek judge model, and synthetic test generation via the Synthesizer. RAGAS provides specialized retrieval metrics. 15+ pytest modules cover critical paths: RAG triad, safety guardrails, trajectory analysis, conversational multi-turn, graph pipeline, ingestion, extraction, and embedding quality.",
  },
  {
    heading: "Unique Technical Patterns",
    content: "Key patterns include 7 dedicated format_*_for_embedding() functions that convert structured clinical data into deterministic text before embedding, a marker alias map (41 variant names across 11 base markers) for lab-agnostic ratio computation, and ON CONFLICT upsert for idempotent re-embedding. The LlamaIndex IngestionPipeline uses a custom BloodTestNodeParser that produces 3 node types per test. Health-state embeddings store 7 derived ratios as JSONB alongside the 1024-dim vector. Hybrid search combines PostgreSQL ts_rank with pgvector cosine similarity in a single CTE.",
  },
  {
    heading: "Data Flow & Pipeline",
    content: "Data flows from PDF upload \u2192 Cloudflare R2 \u2192 LlamaParse (PDF \u2192 markdown) \u2192 BloodTestNodeParser (3-tier marker extraction) \u2192 BAAI/bge-large-en-v1.5 (1024-dim, ONNX) \u2192 7 pgvector tables via ON CONFLICT upsert. For Q&A, the LangGraph StateGraph runs: triage (intent classification into 8 categories) \u2192 retrieve (intent-routed pgvector search with hybrid scoring for markers) \u2192 synthesize (temperature 0.1 with 7 clinical rules and last 3 conversation turns) \u2192 guard (5 safety rules with disclaimer injection). The /chat endpoint returns full pipeline metadata\u2014intent, confidence, sources, guard status, and citations.",
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
    heading: "Local Embedding Pattern",
    description: "Lazy-initialized FastEmbed singleton with ONNX Runtime for zero-cost local inference",
    code: "# langgraph/embeddings.py\n_LOCAL_MODEL = \"BAAI/bge-large-en-v1.5\"\n_text_embed: TextEmbedding | None = None\n\ndef _get_local_model() -> TextEmbedding:\n    global _text_embed\n    if _text_embed is None:\n        _text_embed = TextEmbedding(model_name=_LOCAL_MODEL)\n    return _text_embed\n\ndef generate_embedding(text: str) -> list[float]:\n    model = _get_local_model()\n    return [float(x) for x in next(model.embed([text]))]",
  },
  {
    type: "diagram",
    heading: "System Architecture Overview",
    description: "End-to-end flow from upload to insights",
    code: "User → [Next.js Frontend] → UploadForm → Cloudflare R2 (PDFs)\n                     ↓\n        [FastAPI :8001] ← LlamaParse ← BloodTestNodeParser\n                     ↓\n     [bge-large-en-v1.5 (ONNX)] → 1024-dim → 7 pgvector tables\n                     ↓\n  [LangGraph: triage → retrieve → synthesize → guard]\n                     ↓\n           [ChatInterface] → answer + metadata → User\n                     ↓\n        [Evaluation] ← DeepEval/RAGAS",
  },
];

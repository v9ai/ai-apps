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
    slug: "nextjs-15",
    number: 1,
    title: "Next.js 15",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding: "Server-side rendering and static generation with App Router for optimized performance and SEO",
    relevance: "Used in app/page.tsx and app/[slug]/page.tsx for server components, with generateStaticParams() pre-generating all lesson pages at build time",
    url: "https://nextjs.org/docs",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "postgresql-pgvector",
    number: 2,
    title: "PostgreSQL with pgvector",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "PostgreSQL Global Development Group",
    year: 2024,
    finding: "Relational database with vector extension for 1024-dimensional embeddings and similarity search",
    relevance: "Stores lessons, concepts, and embeddings tables; used in lib/data.ts for queries via Drizzle ORM to enable semantic search and related content",
    url: "https://www.postgresql.org/docs",
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
    finding: "Type-safe SQL query builder with migrations and schema management",
    relevance: "Used in src/db/queries.ts to interact with PostgreSQL tables like lessons and concepts, with indexes like lessons_category_idx for performance",
    url: "https://orm.drizzle.team",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "cloudflare-r2",
    number: 4,
    title: "Cloudflare R2",
    category: "Storage",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Cloudflare",
    year: 2024,
    finding: "Object storage with CDN integration for scalable file hosting",
    relevance: "Stores audio files and metadata for lessons; fetched via getAudioMeta() in lesson pages for the AudioPlayer component",
    url: "https://developers.cloudflare.com/r2",
    categoryColor: "var(--cyan-9)",
  },
  {
    slug: "react-markdown",
    number: 5,
    title: "react-markdown",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Remark Collective",
    year: 2024,
    finding: "Markdown rendering library with plugin support for GitHub Flavored Markdown",
    relevance: "Used in the MarkdownProse component to render lesson content from the lessons table, with remark-gfm for table and link support",
    url: "https://github.com/remarkjs/react-markdown",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "radix-ui",
    number: 6,
    title: "Radix UI Themes",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix UI",
    year: 2024,
    finding: "Accessible UI components with theming support for consistent design",
    relevance: "Provides dark theme with teal accent across all pages, used in layout components for styling and theming",
    url: "https://www.radix-ui.com/themes",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "deepeval",
    number: 7,
    title: "DeepEval",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Confident AI",
    year: 2024,
    finding: "Framework for LLM evaluation with automated testing and LLM-as-judge patterns",
    relevance: "Used in evals/ directory scripts like test_llm_judge.py to assess lesson quality and agent performance in the AI evaluation system",
    url: "https://docs.confident-ai.com",
    categoryColor: "var(--amber-9)",
  },
];

// ── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "55",
    label: "Lessons across the curriculum",
    source: "lessons table in PostgreSQL schema",
  },
  {
    number: "9",
    label: "Learning categories (e.g., foundations, prompting)",
    source: "categories table and CATEGORIES array",
  },
  {
    number: "1024-dim",
    label: "Vector embeddings for semantic search",
    source: "pgvector extension with vector(1024) custom type",
  },
  {
    number: "2",
    label: "Data sources (database vs. filesystem)",
    source: "USE_DB environment variable in lib/data.ts",
  },
  {
    number: "O(log n)",
    label: "Search performance with vector indexes",
    source: "pgvector similarity search optimizations",
  },
];

// ── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Content Ingestion and Storage",
    description: "Lessons are stored in the PostgreSQL lessons table with Markdown content, and embeddings are generated for semantic search using pgvector. The lib/data.ts abstracts data fetching with getAllLessons(), which calls src/db/queries.ts for database queries or falls back to lib/articles.ts for local files based on the USE_DB environment variable.",
    researchBasis: "Dual data source pattern for flexibility and migration",
  },
  {
    name: "Page Rendering and Static Generation",
    description: "The homepage at app/page.tsx uses getGroupedLessons() to fetch data, grouping lessons by category from CATEGORY_META. Lesson pages at app/[slug]/page.tsx are pre-generated with generateStaticParams(), and generateMetadata() sets dynamic titles. The MarkdownProse component renders content with react-markdown.",
    researchBasis: "Next.js App Router with server components and static site generation",
  },
  {
    name: "User Interaction and Analytics",
    description: "The PageAnalytics component tracks user interactions like read_start and read_complete, storing data in the user_interactions table. The ReadingProgress component shows scroll position, and interactions are used for progress tracking in the user_mastery table with masteryLevelEnum.",
    researchBasis: "Event-driven analytics for personalized learning",
  },
  {
    name: "Search and Recommendations",
    description: "The Search component uses full-text search on lesson content and vector similarity via pgvector embeddings for semantic search. Related content is fetched with getRelatedLessons() based on category and embedding similarity, returning SearchResult objects with snippets and ranks.",
    researchBasis: "Hybrid search combining keyword and vector-based retrieval",
  },
  {
    name: "Audio Integration and CDN Delivery",
    description: "Audio files are stored in Cloudflare R2, and getAudioMeta() fetches JSON metadata asynchronously when audio exists for a lesson. The AudioPlayer component renders with chapter markers from the AudioChapter interface, and CSS class has-audio-player is added conditionally.",
    researchBasis: "Progressive enhancement with lazy loading from object storage",
  },
  {
    name: "Evaluation and Quality Assurance",
    description: "Python scripts in the evals/ directory use deepeval for LLM evaluation, with test_articles.py assessing lesson quality, test_agent.py evaluating agent performance, and test_llm_judge.py implementing LLM-as-judge patterns to ensure content accuracy and relevance.",
    researchBasis: "AI-driven evaluation framework for continuous improvement",
  },
];

// ── Narrative ─────────────────────────────────────────────────────

export const story =
  "Users land on the homepage where app/page.tsx calls getGroupedLessons() from lib/data.ts, which queries the PostgreSQL database via Drizzle ORM or falls back to local Markdown files based on the USE_DB environment variable. Lessons are rendered with react-markdown, and the TableOfContents component extracts headings for navigation, while audio files are fetched asynchronously from Cloudflare R2. The platform tracks user interactions via the user_interactions table and uses pgvector embeddings for semantic search and related content recommendations.";

// ── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "The platform uses Next.js 15 with App Router, where all pages are server components like app/page.tsx and app/[slug]/page.tsx. Static generation via generateStaticParams() pre-builds lesson pages for performance, while middleware.ts handles legacy URL redirects from /agent-{id}-{slug} to /slug. The monorepo structure with turbopack in next.config.ts indicates shared utilities across projects.",
  },
  {
    heading: "Database Design",
    content: "PostgreSQL stores core tables: lessons (55 entries with Markdown), categories (9 domains), concepts (with conceptTypeEnum), edges (relationships like prerequisite), embeddings (for vector search), user_interactions (tracking read_start, etc.), and user_mastery (progress with masteryLevelEnum). Indexes like lessons_category_idx optimize queries, and pgvector enables 1024-dimensional vector similarity searches.",
  },
  {
    heading: "Security & Auth",
    content: "The platform is public with no authentication shown; anonymous tracking uses the user_interactions table. Security measures include environment variables for DATABASE_URL and R2_PUBLIC_DOMAIN, likely database RLS, and Markdown sanitization via react-markdown. Static generation reduces attack surfaces, and CORS is handled implicitly by Next.js.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "Deployment uses static generation for lessons with incremental static regeneration for updates. Edge deployment ensures global performance, and Neon serverless provides database connection pooling. Cloudflare R2 hosts audio files, and the USE_DB env var allows switching between PostgreSQL and local filesystem backends without code changes.",
  },
  {
    heading: "AI Integration",
    content: "AI features include pgvector embeddings for semantic search across lessons and related content recommendations. The evals/ directory uses deepeval for LLM evaluation, with test_llm_judge.py implementing LLM-as-judge patterns. The concepts and edges tables form a knowledge graph for adaptive learning paths based on prerequisite and related relationships.",
  },
  {
    heading: "Content Delivery & Theming",
    content: "Lessons are rendered with the MarkdownProse component using react-markdown and remark-gfm. The TableOfContents extracts headings from the Markdown AST. Theming is handled by Radix UI with a dark theme and teal accent, and category-based gradients (e.g., .cat-foundations-architecture) provide visual differentiation across the 9 learning domains.",
  },
];

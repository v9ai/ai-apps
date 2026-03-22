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
    slug: "nextjs-app-router",
    number: 1,
    title: "Next.js App Router",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding: "Enables server-side rendering, static generation, and API routes with file-based routing for improved performance and SEO",
    relevance: "Powers the entire app structure with pages like app/goals/[id]/page.tsx for dynamic goal pages and uses Server Components for initial load, though most components are client-side for interactivity",
    url: "https://nextjs.org/docs/app",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "apollo-graphql",
    number: 2,
    title: "Apollo GraphQL",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Apollo",
    year: 2024,
    finding: "Provides a unified data graph with real-time queries, mutations, and subscriptions, plus client-side caching for efficient state management",
    relevance: "Handles all data operations via generated hooks like useCreateGoalMutation and useGetGoalsQuery, with Apollo Server processing requests and Drizzle ORM writing to PostgreSQL tables like goals and research_papers",
    url: "https://www.apollographql.com/docs/",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "postgresql-pgvector",
    number: 3,
    title: "PostgreSQL with pgvector",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "PostgreSQL Global Development Group",
    year: 2024,
    finding: "A relational database extended with vector embeddings for semantic search, enabling efficient similarity queries and AI integration",
    relevance: "Stores user data in tables like goals and journal_entries, with research_papers using pgvector embeddings for RAG retrieval, hosted on Neon for serverless scaling",
    url: "https://www.postgresql.org/docs/",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "deepseek-ai",
    number: 4,
    title: "DeepSeek AI",
    category: "AI/LLM",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "DeepSeek",
    year: 2024,
    finding: "High-performance LLM for structured data extraction, clinical text analysis, and therapeutic content generation",
    relevance: "Powers the research generation pipeline via the AI SDK, handling steps from search planning and paper enrichment to therapeutic story generation",
    categoryColor: "var(--amber-9)",
  },
  {
    slug: "drizzle-orm",
    number: 5,
    title: "Drizzle ORM",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Drizzle Team",
    year: 2024,
    finding: "A TypeScript ORM with full type safety, SQL-like syntax, and migrations for robust database interactions",
    relevance: "Manages all database operations for tables like family_members and issues, ensuring type-safe queries and mutations in GraphQL resolvers",
    url: "https://orm.drizzle.team/docs/overview",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "neon-auth",
    number: 6,
    title: "Neon Auth",
    category: "Authentication",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Neon",
    year: 2024,
    finding: "Provides secure authentication and session management integrated with serverless PostgreSQL for seamless user identity handling",
    relevance: "Handles user login via authClient.useSession() and secures routes with the AuthGate component, enabling row-level security for multi-tenant data isolation",
    url: "https://neon.tech/docs/auth",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "langgraph",
    number: 7,
    title: "LangGraph",
    category: "Infrastructure",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "LangChain",
    year: 2024,
    finding: "A framework for building stateful, multi-step AI agent workflows as directed graphs with tool calling, retries, and conditional branching",
    relevance: "Orchestrates all three AI pipelines (research, story generation, TTS) as LangGraph graphs, called from GraphQL resolvers via the LangGraph SDK with progress tracked via generation_jobs polling",
    url: "https://langchain-ai.github.io/langgraph/",
    categoryColor: "var(--red-9)",
  },
  {
    slug: "radix-ui",
    number: 8,
    title: "Radix UI",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix",
    year: 2024,
    finding: "Offers unstyled, accessible UI primitives like Accordion and Dialog for building consistent, high-quality interfaces",
    relevance: "Provides the design system for components like GlassButton and mood filters, with a dark theme and indigo accents throughout the app",
    url: "https://www.radix-ui.com/docs/primitives/overview/introduction",
    categoryColor: "var(--blue-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "9-step",
    label: "AI research generation pipeline stages",
    source: "STEP_LABELS object in code, from search planning to storage",
  },
  {
    number: "3",
    label: "Academic search sources (Crossref, PubMed, Semantic Scholar)",
    source: "Research pipeline configuration for multi-source retrieval",
  },
  {
    number: "7",
    label: "Mood options for journal entries (happy, sad, anxious, etc.)",
    source: "Journal entry schema with emotional tracking system",
  },
  {
    number: "4",
    label: "Family member share roles (VIEWER, EDITOR, ADMIN)",
    source: "FamilyMemberShareRole enum for permission levels",
  },
  {
    number: "< 100ms",
    label: "GraphQL query response time with Apollo caching",
    source: "Optimized queries and client-side cache patterns",
  },
  {
    number: "1024-dim",
    label: "Vector embedding size for pgvector semantic search",
    source: "PostgreSQL pgvector configuration for research paper embeddings",
  },
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "User Input and Goal Creation",
    description: "The user interacts with the AddGoalButton component, which calls useCreateGoalMutation to send a GraphQL mutation. Apollo Server processes this in resolvers, using Drizzle ORM to insert a new record into the goals table in PostgreSQL, with fields like title, description, and status. The client caches the response via Apollo Client for immediate UI updates.",
    researchBasis: "GraphQL mutation pattern with type-safe inputs",
  },
  {
    name: "Research Generation via LangGraph",
    description: "When the user clicks 'Generate Research' in app/goals/[id]/page.tsx, useGenerateResearchMutation fires with the goalId. The resolver dispatches a LangGraph research agent that uses DeepSeek with academic search tools. The job status is stored in the generation_jobs table, and the client starts polling with useGetGenerationJobQuery at 1-second intervals.",
    researchBasis: "Background job orchestration with real-time polling",
  },
  {
    name: "AI Research Pipeline Execution",
    description: "The research pipeline executes 9 steps: it loads goal context, plans searches, queries academic sources (Crossref, PubMed, Semantic Scholar), enriches paper abstracts, extracts findings via DeepSeek AI, and stores results. Papers are saved to the research_papers table with pgvector embeddings, linked via goal_research_papers junction table.",
    researchBasis: "Retrieval Augmented Generation (RAG) with multi-source search",
  },
  {
    name: "Data Display and User Interaction",
    description: "Apollo Client queries like useGetGoalQuery fetch the goal with nested research papers, caching results for fast rendering. The UI displays papers with titles and abstracts, while family member profiles use useGetFamilyMembersQuery. Role-based permissions from family_member_shares table control access, enforced via row-level security.",
    researchBasis: "GraphQL query caching and multi-tenant data isolation",
  },
  {
    name: "Journaling and Emotional Tracking",
    description: "Users add entries via AddJournalEntryButton, which triggers useCreateJournalEntryMutation to store data in journal_entries table with mood and isPrivate fields. Queries like useGetJournalEntriesQuery filter by mood or familyMemberId, displaying results with lock icons for private entries, all secured by Neon Auth sessions.",
    researchBasis: "Structured data storage with privacy flags",
  },
  {
    name: "Audio Content Generation and Storage",
    description: "For therapeutic audio, text is sent to OpenAI TTS for synthesis, then uploaded to Cloudflare R2 via the S3-compatible SDK. Presigned URLs are generated for secure access, and metadata is processed with music-metadata, linking audio files to journal entries or goals in the database.",
    researchBasis: "Cloud storage with presigned URL patterns",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "A user logs in via Neon Auth and creates a therapeutic goal using the AddGoalButton component, which triggers a GraphQL mutation to store it in PostgreSQL via Drizzle ORM. When they click 'Generate Research', the useGenerateResearchMutation initiates a 9-step AI research pipeline that searches academic databases, enriches papers, and stores results with pgvector embeddings. The system polls via useGetGenerationJobQuery to show real-time progress, then displays validated research alongside their journal entries and family member profiles, all secured with row-level security and role-based sharing permissions.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "The app uses a Next.js App Router with most pages as client components for interactivity, such as app/goals/[id]/page.tsx. GraphQL via Apollo Server handles all data operations, with Drizzle ORM writing to PostgreSQL tables like goals and research_papers. AI workflows run as LangGraph Python graphs (research, story, TTS) called from resolvers via the LangGraph SDK. The architecture supports real-time updates via polling and multi-tenant isolation through row-level security.",
  },
  {
    heading: "Database Design",
    content: "PostgreSQL stores core tables: users (managed by Neon Auth), goals with parentGoalId for hierarchies, family_members with relationship types, and journal_entries with mood and isPrivate flags. Research papers are in research_papers with pgvector embeddings for semantic search, linked to goals via goal_research_papers junction table. The schema includes family_member_shares for role-based permissions and generation_jobs for tracking AI job progress, all enforced with row-level security for data privacy.",
  },
  {
    heading: "Security & Auth",
    content: "Authentication is handled by Neon Auth with authClient.useSession() providing user data, and the AuthGate component protecting routes. Row-level security ensures users only access their own family members and goals unless shared via family_member_shares with VIEWER, EDITOR, or ADMIN roles. Journal entries have an isPrivate flag with lock icons, and GraphQL requests use Bearer tokens. Environment variables secure API keys and database URLs, with AWS S3 presigned URLs for safe file access.",
  },
  {
    heading: "AI Integration",
    content: "AI powers research generation via LangGraph agents using DeepSeek for structured extraction and OpenAI for audio. The research agent searches academic databases with tool calling, the story agent generates therapeutic scripts with eval-based retry loops, and the TTS agent synthesizes audio with Qwen or OpenAI. Embeddings are stored in PostgreSQL via pgvector for semantic retrieval.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "The app is deployed on Vercel with Next.js for serverless functions, using Neon for serverless PostgreSQL hosting. Cloudflare R2 stores audio files, and LangGraph serves the AI agent graphs. Environment variables configure API keys and database connections, with GraphQL code generation ensuring type safety. The infrastructure supports scaling with real-time polling and efficient caching via Apollo Client.",
  },
  {
    heading: "UI/UX Patterns",
    content: "Radix UI provides accessible components like Accordion and Dialog, with a dark theme and glassmorphism via GlassButton for translucent elements. The UI uses slug/ID dual routing for human-readable URLs (e.g., app/goals/[id]/page.tsx supports both numeric IDs and strings). Real-time progress bars show AI job steps from 5% to 95%, and color-coded statuses (Active, Completed) help track goals. Mood filters and family member sharing interfaces are designed for intuitive therapeutic use.",
  },
];

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
    finding: "Server-side rendering and static generation with React components, enabling efficient data fetching and SEO",
    relevance: "Used in app/app/page.tsx for server-first data fetching of tasks and userPreferences via Drizzle ORM, and in auth routes for client interactivity",
    url: "https://nextjs.org/docs/app",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "drizzle-orm",
    number: 2,
    title: "Drizzle ORM",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Drizzle Team",
    year: 2024,
    finding: "Type-safe SQL query builder with schema migrations, providing compile-time validation and database abstraction",
    relevance: "Defines tables like tasks and userPreferences in src/db/schema.ts, used in getTasksByStatus and getAllTaskCounts queries for task management",
    url: "https://orm.drizzle.team",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "better-auth",
    number: 3,
    title: "Better Auth",
    category: "Authentication",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Better Auth",
    year: 2024,
    finding: "Full-stack authentication solution with session management, email/password support, and adapters for various databases",
    relevance: "Handles signup and login via signUp.email() and signIn.email() in lib/auth-client.ts, storing users in the user table and validating sessions in protected routes",
    url: "https://better-auth.com",
    categoryColor: "var(--purple-9)",
  },
  {
    slug: "postgresql-neon",
    number: 4,
    title: "PostgreSQL with Neon",
    category: "Database",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Neon",
    year: 2024,
    finding: "Serverless PostgreSQL with HTTP driver support, enabling scalable and serverless database operations",
    relevance: "Hosts the database for tasks, userPreferences, and auth tables, accessed via @neondatabase/serverless in the Proxy pattern in src/db/index.ts",
    url: "https://neon.tech",
    categoryColor: "var(--green-9)",
  },
  {
    slug: "zod-validation",
    number: 5,
    title: "Zod",
    category: "API",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Colin McDonnell",
    year: 2024,
    finding: "TypeScript-first schema validation library for runtime type checking and data validation",
    relevance: "Used for createTaskSchema and updateTaskSchema to validate task inputs in server actions, ensuring data integrity before database operations",
    url: "https://zod.dev",
    categoryColor: "var(--orange-9)",
  },
  {
    slug: "radix-ui-themes",
    number: 6,
    title: "Radix UI Themes",
    category: "Frontend",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Radix UI",
    year: 2024,
    finding: "Accessible component library with built-in theming and dark mode support for consistent UI design",
    relevance: "Provides the styling and components for the app layout, including StatusTabs and TaskList in the main dashboard",
    url: "https://www.radix-ui.com/themes",
    categoryColor: "var(--blue-9)",
  },
  {
    slug: "turbopack-monorepo",
    number: 7,
    title: "Turbopack",
    category: "Build Tool",
    wordCount: 0,
    readingTimeMin: 2,
    authors: "Vercel",
    year: 2024,
    finding: "High-performance bundler for Next.js with monorepo support, enabling fast hot reloads and optimized builds",
    relevance: "Configured with turbopack.root pointing to ../.., indicating this app is part of a larger monorepo for shared dependencies and development",
    url: "https://turbo.build/pack",
    categoryColor: "var(--gray-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "3",
    label: "Core task statuses (inbox, active, completed) managed via StatusTabs",
    source: "app/app/page.tsx emptyMessages object",
  },
  {
    number: "4",
    label: "AI priority factors (deadlineUrgency, userValue, dependencyImpact, projectWeight) with configurable weights",
    source: "userPreferences.priorityWeights JSONB schema",
  },
  {
    number: "7",
    label: "Default tasks per page (chunkSize) for pagination in TaskList",
    source: "userPreferences.chunkSize default value",
  },
  {
    number: "O(1)",
    label: "Session validation complexity via Better Auth cookie checks",
    source: "Better Auth documentation on session management",
  },
  {
    number: "25%",
    label: "Default buffer percentage for task scheduling in userPreferences",
    source: "userPreferences.bufferPercentage default value",
  },
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "User Authentication",
    description: "Users submit credentials via app/(auth)/signup/page.tsx or app/(auth)/login/page.tsx, which call signUp.email() or signIn.email() from lib/auth-client.ts. Better Auth validates inputs, hashes passwords, and stores data in the user and account tables, creating a session cookie for subsequent requests.",
    researchBasis: "Better Auth library with Drizzle adapter for secure session management",
  },
  {
    name: "Task Data Fetching",
    description: "The server component app/app/page.tsx calls getTasksByStatus(userId, status, limit, offset) and getAllTaskCounts(userId) to retrieve tasks and counts from the tasks table. It uses Drizzle ORM queries filtered by userId and status, with pagination based on userPreferences.chunkSize.",
    researchBasis: "Next.js App Router for server-side data fetching with direct database access",
  },
  {
    name: "AI Priority Scoring",
    description: "When tasks are created or updated, a server action calculates priorityScore using weights from userPreferences.priorityWeights (e.g., deadlineUrgency: 0.4, userValue: 0.3). This rule-based AI engine computes a weighted sum and updates the tasks.priorityScore field for intelligent sorting.",
    researchBasis: "Custom scoring algorithm with configurable JSONB weights for personalization",
  },
  {
    name: "Task Management UI",
    description: "The StatusTabs component handles navigation between inbox, active, and completed views using query parameters (?status=active). TaskList renders tasks with pagination, and users can edit tasks via forms validated by updateTaskSchema, triggering server actions to update the tasks table.",
    researchBasis: "React components with Radix UI for interactive, accessible interfaces",
  },
  {
    name: "User Preferences Sync",
    description: "The SettingsModal component allows users to update chronotype, chunkSize, and priorityWeights in userPreferences. Changes are validated and persisted via a server action that updates the userPreferences table, affecting task display and AI calculations in real-time.",
    researchBasis: "Drizzle ORM for type-safe updates to JSONB and relational data",
  },
  {
    name: "Session Validation",
    description: "Protected routes like app/app/page.tsx call auth.api.getSession({ headers }) to validate the session token from cookies. Better Auth checks the session table and returns the session object or null, ensuring only authenticated users access the main app.",
    researchBasis: "Better Auth server API for secure session verification",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "Users sign up via the signup page, where Better Auth creates a session and stores credentials in PostgreSQL. Once logged in, the app dashboard (app/app/page.tsx) fetches tasks using getTasksByStatus and user preferences via direct Drizzle queries. Tasks are prioritized with an AI scoring engine that calculates priorityScore based on deadlineUrgency and userValue weights from userPreferences. Users can manage tasks through StatusTabs and TaskList components, with updates validated by Zod schemas and persisted to the tasks table.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "The app uses a Next.js App Router with server components like app/app/page.tsx for data fetching and client components for interactive auth pages. It follows a monorepo structure with Turbopack configuration pointing two levels up. Database access is via Drizzle ORM with a Proxy pattern in src/db/index.ts for lazy initialization, connecting to PostgreSQL on Neon. Key components include StatusTabs for navigation and TaskList for rendering, with server actions handling task mutations.",
  },
  {
    heading: "Database Design",
    content: "PostgreSQL stores data in tables: tasks (with fields like priorityScore, energyPreference, parentTaskId), userPreferences (with chronotype, chunkSize, priorityWeights JSONB), and Better Auth tables (user, session, account). Indexes ensure uniqueness on user.email and session.token. Foreign keys with onDelete: cascade maintain referential integrity. Drizzle Kit manages migrations from src/db/schema.ts.",
  },
  {
    heading: "Security & Auth",
    content: "Authentication is handled by Better Auth with email/password, storing hashed passwords in the account table. Sessions are cookie-based and validated server-side via auth.api.getSession(). Protected routes check sessions before rendering. Input validation uses Zod schemas for tasks, and queries filter by userId to prevent data leakage. Environment variables secure DATABASE_URL and auth URLs.",
  },
  {
    heading: "Deployment & Infrastructure",
    content: "The app is deployed on Vercel with Next.js, using Neon for serverless PostgreSQL. Turbopack enables fast builds in the monorepo environment. Environment variables configure database and auth settings. The Proxy database pattern optimizes connection usage, and Drizzle ORM ensures type-safe queries across deployments.",
  },
  {
    heading: "AI Integration",
    content: "AI features include a rule-based priority scoring engine that calculates tasks.priorityScore using weights from userPreferences.priorityWeights. Factors like deadlineUrgency and userValue are combined in a weighted sum. Energy-based matching uses tasks.energyPreference to align with user rhythms, and chronotype from userPreferences influences scheduling. This is implemented in server actions without LLMs, focusing on configurable, deterministic algorithms.",
  },
];

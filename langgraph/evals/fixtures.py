"""Test fixtures — sample source files and expected outputs for evaluations."""

from __future__ import annotations

# ── Sample source files (simulating what read_node would extract) ─────────────

SAMPLE_PACKAGE_JSON = """{
  "name": "todo-app",
  "version": "0.1.0",
  "dependencies": {
    "next": "15.0.0",
    "@auth/drizzle-adapter": "^1.0.0",
    "better-auth": "^1.2.0",
    "drizzle-orm": "^0.38.0",
    "@neondatabase/serverless": "^0.10.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "5.9.3",
    "drizzle-kit": "^0.30.0"
  }
}"""

SAMPLE_SCHEMA_TS = """import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const todo = pgTable("todo", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  title: text("title").notNull(),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});"""

SAMPLE_AUTH_TS = """import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/src/db";
import * as schema from "@/src/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 60 * 24 * 7 },
});"""

SAMPLE_API_ROUTE = """import { db } from "@/src/db";
import { todo } from "@/src/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const todos = await db.select().from(todo).where(eq(todo.userId, session.user.id));
  return NextResponse.json(todos);
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json();
  const [newTodo] = await db.insert(todo).values({
    userId: session.user.id,
    title,
  }).returning();
  return NextResponse.json(newTodo, { status: 201 });
}"""

SAMPLE_FILES_TEXT = f"""\
### package.json
```
{SAMPLE_PACKAGE_JSON}
```

### src/db/schema.ts
```
{SAMPLE_SCHEMA_TS}
```

### lib/auth.ts
```
{SAMPLE_AUTH_TS}
```

### app/api/todos/route.ts
```
{SAMPLE_API_ROUTE}
```"""

# ── Sample analysis output (what analyze_node produces) ──────────────────────

SAMPLE_ANALYSIS = """\
## Technical Analysis: todo-app

### 1. Purpose
A task management application that allows authenticated users to create, read, and manage personal to-do items. Built as a Next.js 15 full-stack application with server-side rendering.

### 2. Tech Stack
- **Next.js 15.0.0** — React framework with App Router
- **TypeScript 5.9.3** — type safety
- **better-auth 1.2.0** — authentication library with email/password support
- **drizzle-orm 0.38.0** — type-safe SQL ORM with PostgreSQL dialect
- **drizzle-kit 0.30.0** — migration tooling
- **@neondatabase/serverless 0.10.0** — serverless Postgres driver (Neon)
- **zod 3.23.0** — runtime schema validation

### 3. Data Flow
1. User submits login form → better-auth handles session creation via `auth.api.getSession()`
2. Authenticated request hits `/api/todos` route
3. `GET` handler: validates session, queries `todo` table filtered by `userId` via drizzle-orm `eq(todo.userId, session.user.id)`
4. `POST` handler: validates session, parses `{ title }` from body, inserts into `todo` table with `db.insert(todo).values()`, returns created row via `.returning()`
5. Response sent as JSON via `NextResponse.json()`

### 4. Architecture
- Next.js App Router with `/app/api/` route handlers
- Drizzle ORM with Neon serverless Postgres
- better-auth configured with `drizzleAdapter` for session persistence in the database
- Schema defined in `src/db/schema.ts` with `pgTable` helper

### 5. Features
- Email/password authentication via better-auth
- CRUD API for todos at `/api/todos`
- Session-based authorization on every API route
- UUID primary keys for todos via `defaultRandom()`

### 6. AI / LLM Integration
No AI or LLM integration detected in the provided source files.

### 7. Database & Schema
Two tables defined in `src/db/schema.ts`:
- **user**: `id` (text PK), `name` (text), `email` (text, unique), `created_at` (timestamp)
- **todo**: `id` (uuid PK, auto-generated), `user_id` (text FK → user.id), `title` (text), `completed` (boolean, default false), `created_at` (timestamp)

### 8. API Design
- `GET /api/todos` — returns all todos for authenticated user
- `POST /api/todos` — creates a new todo, expects `{ title }` body, returns created todo with 201

### 9. Auth & Security
- better-auth with email/password enabled
- drizzleAdapter connects auth to the same Postgres database
- Sessions expire after 7 days (`60 * 60 * 24 * 7` seconds)
- Every API route checks `auth.api.getSession()` and returns 401 if missing

### 10. Unique Patterns
- Uses Neon serverless driver for edge-compatible Postgres connections
- better-auth's drizzle adapter shares the same schema module, ensuring type consistency between auth tables and application tables
"""

# ── Sample generated JSON (what generate_node produces) ──────────────────────

SAMPLE_GENERATED_JSON = """{
  "title": "How It Works",
  "subtitle": "A full-stack todo app built with Next.js 15, better-auth, and Drizzle ORM on Neon Postgres",
  "story": "Users authenticate via email and password through better-auth, which persists sessions in Neon Postgres via the Drizzle adapter. Once logged in, the Next.js App Router serves the dashboard where users manage their todos. Each CRUD operation hits /api/todos route handlers that validate the session, then use Drizzle ORM's type-safe query builder to interact with the todo and user tables. The serverless Neon driver ensures edge-compatible database connections with minimal cold-start latency.",
  "papers": [
    {"slug": "nextjs-15", "number": 1, "title": "Next.js 15", "category": "Frontend", "wordCount": 0, "readingTimeMin": 2, "authors": "Vercel", "year": 2024, "finding": "React framework with App Router, server components, and edge runtime support", "relevance": "Powers the full-stack app: /app/api/todos route handlers, server-side rendering, and static generation", "url": "https://nextjs.org/docs", "categoryColor": "var(--blue-9)"},
    {"slug": "drizzle-orm", "number": 2, "title": "Drizzle ORM", "category": "Database", "wordCount": 0, "readingTimeMin": 2, "authors": "Drizzle Team", "year": 2024, "finding": "Type-safe SQL ORM that compiles queries at build time with zero runtime overhead", "relevance": "Defines user and todo tables in src/db/schema.ts; powers all queries in /api/todos with eq() and insert().returning()", "url": "https://orm.drizzle.team", "categoryColor": "var(--green-9)"},
    {"slug": "better-auth", "number": 3, "title": "better-auth", "category": "Authentication", "wordCount": 0, "readingTimeMin": 2, "authors": "better-auth", "year": 2024, "finding": "Framework-agnostic authentication library with database adapter support", "relevance": "Configured in lib/auth.ts with drizzleAdapter; provides auth.api.getSession() used in every API route", "url": "https://better-auth.com", "categoryColor": "var(--purple-9)"},
    {"slug": "neon-serverless", "number": 4, "title": "Neon Serverless Postgres", "category": "Database", "wordCount": 0, "readingTimeMin": 2, "authors": "Neon", "year": 2024, "finding": "Serverless PostgreSQL with HTTP/WebSocket driver optimized for edge functions", "relevance": "Provides the database connection via @neondatabase/serverless driver, enabling edge-compatible queries", "categoryColor": "var(--green-9)"},
    {"slug": "zod", "number": 5, "title": "Zod", "category": "API", "wordCount": 0, "readingTimeMin": 2, "authors": "Colin McDonnell", "year": 2024, "finding": "TypeScript-first schema validation with static type inference", "relevance": "Available for request body validation in API routes", "categoryColor": "var(--orange-9)"},
    {"slug": "typescript", "number": 6, "title": "TypeScript 5.9", "category": "Build Tool", "wordCount": 0, "readingTimeMin": 2, "authors": "Microsoft", "year": 2024, "finding": "Statically typed JavaScript superset with advanced type inference", "relevance": "Powers type safety across the entire codebase — Drizzle schema types flow through to API responses", "categoryColor": "var(--gray-9)"}
  ],
  "agents": [
    {"name": "Authentication", "description": "User submits email/password credentials. better-auth validates credentials against the user table via drizzleAdapter, creates a session stored in Postgres, and returns a session cookie.", "researchBasis": "better-auth with drizzle adapter"},
    {"name": "Request Authorization", "description": "Each API request passes through auth.api.getSession() which reads the session cookie, validates it against the database, and extracts the user identity. Unauthorized requests receive a 401 JSON response.", "researchBasis": "better-auth session management"},
    {"name": "Query Execution", "description": "For GET /api/todos, Drizzle ORM builds a type-safe SQL query: db.select().from(todo).where(eq(todo.userId, session.user.id)). The query runs through the Neon serverless driver over HTTP.", "researchBasis": "Drizzle ORM query builder"},
    {"name": "Data Mutation", "description": "For POST /api/todos, the handler parses the request body for { title }, calls db.insert(todo).values({ userId, title }), and returns the created row via .returning() as a 201 JSON response.", "researchBasis": "Drizzle ORM insert with returning"},
    {"name": "Response Delivery", "description": "NextResponse.json() serializes the query result and sends it to the client with appropriate status codes (200 for reads, 201 for creates, 401 for unauthorized).", "researchBasis": "Next.js Route Handlers"}
  ],
  "stats": [
    {"number": "2", "label": "Database tables (user, todo)", "source": "src/db/schema.ts"},
    {"number": "2", "label": "API endpoints (GET, POST)", "source": "app/api/todos/route.ts"},
    {"number": "7 days", "label": "Session expiration time", "source": "lib/auth.ts"},
    {"number": "6", "label": "Core dependencies", "source": "package.json"}
  ],
  "extraSections": [
    {"heading": "System Architecture", "content": "The app follows a standard Next.js 15 App Router architecture with API route handlers in /app/api/. Authentication is centralized in lib/auth.ts using better-auth with a Drizzle adapter that shares the same database connection and schema module as the application queries. This ensures type consistency between auth-managed tables and application tables."},
    {"heading": "Database Design", "content": "Two PostgreSQL tables defined via Drizzle ORM in src/db/schema.ts. The user table uses text primary keys (compatible with better-auth's ID format) while todo uses UUID primary keys via defaultRandom(). A foreign key from todo.user_id to user.id ensures referential integrity. The schema uses pgTable helper for PostgreSQL-specific column types."},
    {"heading": "Security & Auth", "content": "Every API route handler validates the session via auth.api.getSession({ headers: req.headers }) before processing. Sessions are stored server-side in PostgreSQL via the drizzle adapter with a 7-day TTL. The email field on the user table has a unique constraint preventing duplicate registrations. No client-side token storage is needed as better-auth uses HTTP-only session cookies."},
    {"heading": "Deployment & Infrastructure", "content": "The app uses @neondatabase/serverless for database connections, making it compatible with Vercel Edge Functions and other serverless environments. Neon's HTTP driver eliminates the need for persistent database connections, reducing cold-start latency. Drizzle Kit handles schema migrations for development and deployment."}
  ]
}"""

# ── Sample generated TypeScript files (what write_node produces) ─────────────

SAMPLE_DATA_TSX = """\
import type { Paper, PipelineAgent, Stat } from "@ai-apps/ui/how-it-works";

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
    finding: "React framework with App Router and server components",
    relevance: "Powers the full-stack app with /app/api/ route handlers",
    url: "https://nextjs.org/docs",
    categoryColor: "var(--blue-9)",
  },
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
  {
    number: "2",
    label: "Database tables (user, todo)",
    source: "src/db/schema.ts",
  },
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
  {
    name: "Authentication",
    description: "User submits credentials, better-auth creates a session.",
  },
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  "Users authenticate via better-auth and manage todos through a Next.js API.";

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
  {
    heading: "System Architecture",
    content: "Standard Next.js 15 App Router with centralized auth.",
  },
];
"""

# ── Test case identifiers ────────────────────────────────────────────────────

TEST_CASES = [
    {
        "id": "todo-app",
        "app_name": "todo-app",
        "source_files": SAMPLE_FILES_TEXT,
        "analysis": SAMPLE_ANALYSIS,
        "generated_json": SAMPLE_GENERATED_JSON,
    },
]

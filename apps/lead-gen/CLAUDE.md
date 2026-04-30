# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

B2B lead generation platform. Next.js 16 frontend + GraphQL API backed by Neon PostgreSQL, with AI/ML pipelines for company enrichment, contact discovery, and outreach automation.

---

## Common commands

```bash
# Dev
pnpm dev                          # Start Next.js dev server (localhost:3000)
pnpm build                        # Production build
pnpm lint                         # ESLint (next lint)

# GraphQL codegen — run after modifying any schema/**/*.graphql file
pnpm codegen

# Database (Neon PostgreSQL)
pnpm db:generate                  # Generate Drizzle migration files
pnpm db:migrate                   # Apply migrations via Drizzle Kit
pnpm db:studio                    # Drizzle Studio

# Strategy enforcement
pnpm strategy:check               # Validate staged changes against optimization strategy
pnpm strategy:check:all           # Validate all tracked files

# Scripts
pnpm skills:seed                  # Seed skill taxonomy
# Deployment
pnpm deploy                       # Vercel deploy (runs scripts/deploy.ts)
```

---

## Architecture

### Database access

**Next.js app (Vercel):** `Next.js → Neon PostgreSQL` via `@neondatabase/serverless` + Drizzle ORM.
Import `db` from `@/db` for all queries. Schema in `src/db/schema.ts`, migrations in `migrations/`.

### Data flow

```
1. Discovery:      Common Crawl / live fetch --[scripts]--> companies → Neon
2. Enrichment:     Company IDs --[GraphQL Mutation]--> LLM/web --> Neon
3. Contacts:       LinkedIn / manual --[GraphQL Mutation]--> contacts → Neon
4. Outreach:       Contacts --[email campaigns]--> Resend → Neon
5. Serving:        Browser --[Apollo Client]--> /api/graphql --[Drizzle ORM]--> Neon
6. Evaluation:     Local evals --[LLM calls]--> Accuracy scores
```

### GraphQL codegen

Configuration in `codegen.ts`. Generates from `schema/**/*.graphql` into `src/__generated__/`:
- Client preset (typed `gql` function, fragment masking)
- `hooks.tsx` — React Apollo hooks
- `types.ts` — TypeScript types (strict scalars)
- `resolvers-types.ts` — Resolver types with `GraphQLContext`

Custom scalars: `DateTime`/`URL`/`EmailAddress` → `string`, `Upload` → `File`, `JSON` → `any`.

### API routes

| Route | Purpose |
|---|---|
| `/api/graphql` | Apollo Server GraphQL endpoint (main API) |
| `/api/text-to-sql` | Natural language → SQL query |
| `/api/companies/enhance` | Enhance company data |

GraphQL Playground: `http://localhost:3000/api/graphql`. Vercel routes have 60s max duration (`vercel.json`).

### LangGraph backend (`backend/`) — run modes

5 graphs (`email_compose`, `email_reply`, `email_outreach`, `admin_chat`, `text_to_sql`) implemented under `backend/leadgen_agent/`. All Next.js → backend calls funnel through `runGraph()` in `src/lib/langgraph-client.ts`, which hits `POST ${LANGGRAPH_URL}/runs/wait`. Same graph code, two runtimes: `langgraph dev` (port 8002, in-memory) for local dev; `app.py` (FastAPI + uvicorn on port 7860, `AsyncPostgresSaver` backed by Neon) for HF Spaces.

| Mode | `LANGGRAPH_URL` | `LANGGRAPH_AUTH_TOKEN` | `DATABASE_URL` | Start |
|---|---|---|---|---|
| Local-only | `http://127.0.0.1:8002` (default) | unset | — | `pnpm backend-dev` |
| Tunnel, dev | `https://*.trycloudflare.com` (random) | unset | — | `pnpm backend-dev` + `make tunnel` |
| Tunnel, stable | `https://<host>.<your-domain>` | set (shared secret) | — | `pnpm backend-dev` + `make tunnel-named` |
| HF Spaces | `https://<user>-<space>.hf.space` | set (shared secret) | Neon pooled URL | HF Docker SDK builds `backend/Dockerfile` |

When `LANGGRAPH_AUTH_TOKEN` is set, a bearer-token middleware requires `Authorization: Bearer <token>` on every non-health request; the client forwards it automatically from the env var. The middleware lives in `backend/leadgen_agent/custom_app.py` for `langgraph dev` (wired via `http.app` in `langgraph.json`) and is duplicated inline in `backend/app.py` for the FastAPI runtime. Full setup in `backend/README.md`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, App Router |
| Language | TypeScript 5.9 |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| API | Apollo Server 5 (GraphQL) |
| Auth | Better Auth (`@ai-apps/auth`) |
| AI/ML | Vercel AI SDK, DeepSeek V4-Pro (thinking mode, `reasoning_effort=high`), OpenRouter |
| Deployment | Vercel |
| Package manager | pnpm 10.10 |
| UI | Radix UI (Themes + Icons) |

---

### DeepSeek configuration

Four hubs own DeepSeek wiring. Edit at the hub, not at call sites.

| Hub | Use it for |
|---|---|
| `src/lib/deepseek/client.ts` | TS runtime: `getDeepSeekClient()`, `getDeepSeekModel(tier)`, `DEEPSEEK_REASONING_DEFAULTS`. Used by API routes, resolvers, email/contact-enrichment libs. |
| `src/lib/deepseek/constants.ts` | TS UI catalog: `DEEPSEEK_MODELS` + `formatDeepSeekPrice()` for marketing/architecture pages. |
| `backend/leadgen_agent/llm.py` | Python runtime: `make_llm(provider="deepseek", tier="deep" \| "standard")`, `deepseek_model_name(tier)`, `MODEL_PRICING`. Used by every LangGraph graph. `make_llm()` defaults to DeepSeek; pass `provider="email_llm"` to opt into the Cloudflare Workers AI proxy used by the email graphs. |

Adding a new model: bump `DEEPSEEK_MODELS` in **both** `constants.ts` and `llm.py` (they mirror each other). Pricing flows from there into `MODEL_PRICING`. Override per-environment via `DEEPSEEK_MODEL` / `DEEPSEEK_MODEL_DEEP` env vars; both default to `deepseek-v4-pro`.

---

## Key structural patterns

- **GraphQL schema** lives in `schema/` (by domain: `base/`, `jobs/`, `companies/`). Query/mutation/fragment documents are in `src/graphql/`.
- **Resolvers** are in `src/apollo/resolvers/` (company, contacts, email-campaigns, email-templates, blocked-companies, received-emails, user-settings).
- **Skills subsystem**: `src/lib/skills/` — taxonomy, extraction, filtering.
- **AI agents**: `src/agents/` (Vercel AI SDK — SQL, admin, strategy enforcer), `src/anthropic/` (Claude client, MCP, sub-agents, architect).
- **Database tools for agents**: `src/tools/database/` (introspection + SQL execution).

---

## Optimization Strategy (Two-Layer Model)

See **[OPTIMIZATION-STRATEGY.md](./OPTIMIZATION-STRATEGY.md)** for the full strategy document. Key constraints:

| Meta Approach | Status | What It Guarantees |
|---|---|---|
| **Eval-First** | PRIMARY | Every prompt/model change tested against >= 80% accuracy bar |
| **Grounding-First** | PRIMARY | LLM outputs schema-constrained; skills validated against taxonomy |
| **Multi-Model Routing** | SECONDARY | Cheap model first, escalate on low confidence only |
| **Spec-Driven** | CROSS-CUTTING | GraphQL + Drizzle + Zod schemas as formal contracts |
| **Observability** | EMERGING | Production tracing partial |

The strategy enforcer (`src/agents/strategy-enforcer.ts`) is available as a plain async function.

---

## Coding conventions

- **Files:** kebab-case (`jobs-query.ts`). **Components:** PascalCase (`JobsSearchBar.tsx`).
- **DB columns:** snake_case. **GraphQL fields:** camelCase. **Variables:** camelCase.
- **Path alias:** `@/*` maps to `./src/*` (tsconfig.json).
- **Module type:** ES Modules (`"type": "module"`).
- Use **Drizzle ORM** for all DB queries — no raw SQL strings.
- Mutations that modify production data must include `isAdminEmail()` guard (from `src/lib/admin.ts`).
- Prefer generated types from `src/__generated__/resolvers-types.ts` over `any`.
- React providers: `*-provider.tsx` in `src/components/`.
- **Bash scripts:** Never create `.sh` files or bash scripts in repository. Use bash tool for simple commands only (e.g., `git status`, `npm run build`). Complex operations should use Task tool with agents.

---

## Environment variables

Copy `.env.example` to `.env.local`. Key groups: `NEON_DATABASE_URL`, Better Auth (`BETTER_AUTH_SECRET`, `NEXT_PUBLIC_BETTER_AUTH_URL`), AI provider keys (Anthropic, DeepSeek, OpenAI), LangSmith observability, admin email, app URL. See `.env.example` for full list.

**Rules:**
- Always read API keys and secrets from `.env` / `.env.local` files — never use `export KEY=value` in the shell. If a key is needed, add it to `.env.local` (and `.env.example` as a placeholder). This keeps secrets out of shell history and ensures consistent loading via Next.js built-in env handling.
- Never hardcode secrets, API keys, tokens, or credentials in source files — always use `process.env.VAR_NAME`. Before committing, never `git add` files matching `.env`, `.env.local`, or any file containing real key values. Only `.env.example` (with empty placeholders) belongs in the repo.
- If you spot a real key in staged changes or source code, **stop and warn the user** before committing. Rotate the leaked key immediately.

---

## Known issues

### Security
- No CORS policy on the GraphQL API route.
- No GraphQL query complexity/depth limiting.

### Type safety
- `ignoreBuildErrors: true` in `next.config.ts` masks TS errors in builds.
- 283+ `any` types in resolvers.

### Dead code
- `scripts/ingest-jobs.ts` still documents Turso env vars in its help text (stale).

---

## B2B Lead Generation Pipeline

Full-lifecycle pipeline implemented as a Python LangGraph at `backend/leadgen_agent/pipeline_graph.py`, driven by `backend/scripts/leadgen_metal_cli.py` and exposed via the `Makefile`.

### Commands

| Command | Action |
|---|---|
| `make start` | Full batch cycle (discover → enrich → contacts + qa → outreach). Pass `DOMAINS=...` to scope. |
| `make start-status` | Show pipeline status and phase detection |
| `make start-top N=50` | Show top leads (defaults to 20) |

All three call `cd backend && uv run python scripts/leadgen_metal_cli.py <subcommand>`.

### Pipeline shape

`discover → enrich → contacts + qa-audit → outreach`

Dependency graph: discover (no deps) → enrich (needs companies) → contacts + qa-audit (parallel after enrichment) → outreach (needs verified contacts, plan-approval required). Run state lives in `~/.claude/state/pipeline-*.json`.

`research_agent_graph.py` is also callable via `runGraph('research_agent_graph')` for ad-hoc per-company investigation — no orchestrator skill exists.

---

## Additional resources

- **[SKILLS-REMOTE-WORK-GLOBAL.md](./docs/SKILLS-REMOTE-WORK-GLOBAL.md)** — Curated agent skills and subagents for remote global job market focus.
- **[OPTIMIZATION-STRATEGY.md](./OPTIMIZATION-STRATEGY.md)** — Full Two-Layer Model strategy document.

---

## Domain-specific patterns

> An MCPDoc MCP server is configured in `.claude/settings.json` with docs for Drizzle, Next.js, Vercel AI SDK. Call `list_doc_sources` to see available sources, then `fetch_docs` on specific URLs when you need deeper detail on any API.

---

### Drizzle ORM + Neon

**Setup** — import `db` directly from `@/db` (Neon PostgreSQL via drizzle-orm/neon-http):

```ts
import { db } from "@/db";
```

**Querying** — use Drizzle expressions, never raw SQL template literals:

```ts
import { eq, and, or, like, inArray, desc, count, sql } from "drizzle-orm";
import { jobs, jobSkillTags } from "@/db/schema";

// Paginate with hasMore trick (avoids extra COUNT on first page)
const rows = await db.select().from(jobs).where(eq(jobs.status, "remote_match"))
  .orderBy(desc(jobs.posted_at)).limit(limit + 1).offset(offset);
const hasMore = rows.length > limit;

// Subquery
const skillFilter = inArray(
  jobs.id,
  db.select({ job_id: jobSkillTags.job_id }).from(jobSkillTags)
    .where(inArray(jobSkillTags.tag, skills))
    .groupBy(jobSkillTags.job_id)
    .having(sql`count(distinct ${jobSkillTags.tag}) = ${skills.length}`)
);
```

**Types** — always derive from schema, never hand-write:

```ts
import type { Job, NewJob, Company } from "@/db/schema";
// typeof jobs.$inferSelect  →  Job
// typeof jobs.$inferInsert  →  NewJob
```

**Migration workflow** — schema change → generate → apply:

```bash
pnpm db:generate   # creates migration file in migrations/
pnpm db:migrate    # applies locally
```

**Anti-patterns:**
- Never write raw SQL strings in resolvers — use Drizzle ORM methods.
- Never use `db.execute(sql\`...\`)` for application queries — use typed builder.
- Never import from `drizzle-orm/sqlite-core` or `drizzle-orm/d1` — use `drizzle-orm/pg-core`.

> Docs: fetch_docs on `https://orm.drizzle.team/docs/overview`

---

### Apollo Server 5 resolver patterns

**Context** — always type `context` as `GraphQLContext`:

```ts
import type { GraphQLContext } from "../../context";
import type { QueryJobsArgs, JobResolvers } from "@/__generated__/resolvers-types";

// Query resolver
async function jobsQuery(_parent: unknown, args: QueryJobsArgs, context: GraphQLContext) {
  return context.db.select().from(jobs)...;
}

// Field resolver — parent type is the raw Drizzle row (Job)
const Job: JobResolvers<GraphQLContext, Job> = {
  async skills(parent, _args, context) {
    return context.loaders.jobSkills.load(parent.id); // always use DataLoaders
  },
  async company(parent, _args, context) {
    if (!parent.company_id) return null;
    return context.loaders.company.load(parent.company_id);
  },
};
```

**JSON column pattern** — Neon stores JSON as `jsonb`; Drizzle auto-parses it. Manual `JSON.parse()` is not needed for `jsonb` columns.

**Admin guard** — any mutation that modifies production data must check:

```ts
import { isAdminEmail } from "@/lib/admin";

if (!context.userId || !isAdminEmail(context.userEmail)) {
  throw new Error("Forbidden");
}
```

**Anti-patterns:**
- Never query the DB directly inside field resolvers — always go through `context.loaders.*` DataLoaders to avoid N+1.
- Never use `any` for context — use the generated `GraphQLContext` type.
- Never edit files in `src/__generated__/` — they are overwritten by `pnpm codegen`.
- Prefer generated types from `@/__generated__/resolvers-types.ts` over `any` in resolver signatures.

---

### GraphQL codegen

Run `pnpm codegen` after **any** change to `schema/**/*.graphql`. Generates into `src/__generated__/`:

| File | Contents |
|---|---|
| `types.ts` | TS types for schema (strict scalars) |
| `resolvers-types.ts` | Resolver types with `GraphQLContext` |
| `hooks.tsx` | React Apollo hooks |
| `typeDefs.ts` | Merged type definitions |

Custom scalar mappings (in `codegen.ts`): `DateTime`/`URL`/`EmailAddress` → `string`, `JSON` → `any`, `Upload` → `File`.

**Anti-patterns:**
- Never skip codegen after schema changes — stale types cause silent runtime mismatches.
- Never manually edit `src/__generated__/` files.

---

### Database queries

Use the `db` instance from `@/db` for all queries — it is the Neon Drizzle instance:

```ts
import { db } from "@/db";

// Single query
const result = await db.select().from(jobs).where(eq(jobs.id, id));

// Multiple independent queries — run in parallel
const [jobsCount, companiesCount] = await Promise.all([
  db.select({ count: count() }).from(jobs),
  db.select({ count: count() }).from(companies),
]);
```

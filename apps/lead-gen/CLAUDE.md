# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Remote EU job board aggregator. Next.js 16 frontend + GraphQL API backed by Neon PostgreSQL, with an AI/ML pipeline for job classification, skill extraction, and resume matching.

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
pnpm jobs:ingest                  # Ingest jobs from ATS platforms
pnpm jobs:enhance                 # Enhance all jobs with ATS data
pnpm jobs:status                  # Check ingestion status
pnpm jobs:extract-skills          # Extract skills during ingestion
pnpm skills:extract               # Extract skills from jobs
pnpm skills:seed                  # Seed skill taxonomy
pnpm boards:discover              # Discover Ashby boards
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
1. Ingestion:      ATS APIs (Greenhouse/Lever/Ashby) --[scripts]--> Neon
2. Enhancement:    Job IDs --[GraphQL Mutation]--> ATS API --> Neon
3. Classification: Unprocessed jobs --[DeepSeek LLM]--> is_remote_eu --> Neon
4. Skill Extract:  Job descriptions --[LLM pipeline]--> Skills → Neon
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
| `/api/enhance-greenhouse-jobs` | Trigger Greenhouse job enhancement |
| `/api/companies/bulk-import` | Bulk import companies |
| `/api/companies/enhance` | Enhance company data |

GraphQL Playground: `http://localhost:3000/api/graphql`. Vercel routes have 60s max duration (`vercel.json`).

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
| AI/ML | Vercel AI SDK, DeepSeek, OpenRouter |
| Observability | LangSmith |
| Deployment | Vercel |
| Package manager | pnpm 10.10 |
| UI | Radix UI (Themes + Icons) |

---

## Key structural patterns

- **GraphQL schema** lives in `schema/` (by domain: `base/`, `jobs/`, `companies/`, `applications/`, `prompts/`). Query/mutation/fragment documents are in `src/graphql/`.
- **Resolvers** are in `src/apollo/resolvers/` — job resolvers in `src/apollo/resolvers/job/`.
- **ATS ingestion** fetchers: `src/ingestion/{greenhouse,lever,ashby}.ts` — primary job discovery channel.
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

Copy `.env.example` to `.env.local`. Key groups: `NEON_DATABASE_URL`, Better Auth (`BETTER_AUTH_SECRET`, `NEXT_PUBLIC_BETTER_AUTH_URL`), AI provider keys (Anthropic, DeepSeek, OpenAI, Gemini), LangSmith observability, admin email, app URL. See `.env.example` for full list.

---

## Known issues

### Performance
- **Full table scan** in `src/apollo/resolvers/job/enhance-job.ts` — fetches all jobs to find one by `external_id`.
- **N+1 queries** for skills, company, and ATS board sub-fields — no DataLoader.

### Security
- No CORS policy on the GraphQL API route.
- No GraphQL query complexity/depth limiting.

### Type safety
- `ignoreBuildErrors: true` in `next.config.ts` masks TS errors in builds.
- 283+ `any` types in resolvers.

### Dead code
- `scripts/ingest-jobs.ts` still documents Turso env vars in its help text (stale).
- `@libsql/client` and `drizzle-orm/d1` are likely unused and can be removed from `package.json`.
- `crates/nomad/` Rust crate still uses `D1Client` (Cloudflare D1) — needs migration to Neon.

### Dependencies
- `@libsql/client` and `drizzle-orm/d1` are likely unused — remove from `package.json`.

---

## Autonomous Self-Improvement Team

Goal-driven team of 5 specialists focused on helping find a fully remote EU AI engineering role. Grounded in autonomous agent research (AutoRefine, Meta Context Engineering, CASTER, ROMA, Phase Transition theory).

### Structure

| Path | Agent | Mission |
|---|---|---|
| `.claude/skills/improve-mine/SKILL.md` | Pipeline Monitor | Is the pipeline healthy? Are AI jobs flowing? |
| `.claude/skills/improve-audit/SKILL.md` | Discovery Expander | Find more companies hiring AI engineers remotely in EU |
| `.claude/skills/improve-evolve/SKILL.md` | Classifier Tuner | Reduce missed opportunities in remote EU classification |
| `.claude/skills/improve-apply/SKILL.md` | Skill Optimizer | Better AI/ML skill taxonomy, extraction, and matching |
| `.claude/skills/improve-meta/SKILL.md` | Strategy Brain | Coordinate toward the goal: get hired |
| `.claude/commands/improve.md` | Orchestrator | Entry point and team coordination |

### Commands

| Command | Action |
|---|---|
| `/improve` | Full autonomous cycle (Strategy Brain decides what to do) |
| `/improve status` | Pipeline health check |
| `/improve discover` | Find new AI engineering job sources |
| `/improve classify` | Tune classification accuracy |
| `/improve skills` | Optimize AI/ML skill matching |

### Goal Phases

| Phase | Focus | Trigger |
|---|---|---|
| **BUILDING** | Discovery + classification | < 5 AI jobs/week |
| **OPTIMIZING** | Classifier + skills | Jobs flowing but low relevance |

### Integration

- **stop_hook.py** + **improvement_agent.py** → session scoring and learning
- **Strategy Enforcer** → validates changes align with optimization strategy
- State files in `~/.claude/state/` → continuity across sessions

---

## Autonomous Codebase Self-Improvement Team

Separate team focused purely on code quality, performance, type safety, security, and dead code — independent of business goals.

### Structure

| Path | Agent | Role |
|---|---|---|
| `.claude/skills/codefix-mine/SKILL.md` | Trajectory Miner | Mine session transcripts for code quality patterns |
| `.claude/skills/codefix-audit/SKILL.md` | Codebase Auditor | Deep code investigation with file:line findings |
| `.claude/skills/codefix-evolve/SKILL.md` | Skill Evolver | Improve skills, prompts, CLAUDE.md |
| `.claude/skills/codefix-apply/SKILL.md` | Code Improver | Implement fixes (perf, types, security, dead code) |
| `.claude/skills/codefix-verify/SKILL.md` | Verification Gate | Validate changes, run builds, catch regressions |
| `.claude/skills/codefix-meta/SKILL.md` | Meta-Optimizer | Coordinate, prioritize, track progress |
| `.claude/commands/codefix.md` | Orchestrator | Entry point |

### Commands

| Command | Action |
|---|---|
| `/codefix` | Full autonomous cycle |
| `/codefix audit [target]` | Targeted audit (resolvers, workers, security, types, etc.) |
| `/codefix apply` | Implement pending findings |
| `/codefix verify` | Verify recent changes |
| `/codefix status` | Show meta-state |

### Pipeline: `mine → audit → evolve/apply → verify`

Safety: Max 3 code changes + 2 skill evolutions per cycle. Phase detection (IMPROVEMENT/SATURATION/COLLAPSE_RISK). Mandatory verification. State in `~/.claude/state/codefix-*.json`.

---

## Additional resources

- **[SKILLS-REMOTE-WORK-EU.md](./SKILLS-REMOTE-WORK-EU.md)** — Curated agent skills and subagents for remote EU job market focus.
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
const rows = await db.select().from(jobs).where(eq(jobs.is_remote_eu, true))
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

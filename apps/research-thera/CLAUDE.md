# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Research-based therapeutic platform combining AI-powered content generation, multi-source academic research integration, and audio delivery. Built with Next.js App Router, GraphQL (Apollo), AI agents (DeepSeek), Neon PostgreSQL, and Cloudflare R2.

## Commands

```bash
pnpm dev              # Next.js dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm codegen          # GraphQL code generation (resolvers + client hooks)
```

Database migrations (Neon PostgreSQL via Drizzle Kit):
```bash
pnpm drizzle-kit generate    # Generate migration SQL from schema changes
pnpm drizzle-kit migrate     # Apply pending migrations to Neon
pnpm drizzle-kit push        # Push schema directly (dev only)
```

## Architecture

### Data Flow

Client (React + Apollo) → GraphQL API (`/api/graphql`) → Resolvers → Neon PostgreSQL / AI agents → External APIs (DeepSeek, OpenAI, research sources)

### GraphQL (Schema-First)

- Schema definitions: `schema/schema.graphql`
- Operations (queries/mutations): `schema/operations/`
- Resolvers: `schema/resolvers/` (auto-generated scaffolds via codegen)
- Generated client types and hooks: `app/__generated__/`
- **Always run `pnpm codegen` after modifying `.graphql` files**

### AI Agents (DeepSeek)

- Agent definitions: `src/agents/index.ts` — `storyTellerAgent` and `therapeuticAgent` (DeepSeek via `@ai-apps/deepseek`)
- Workflows: `src/workflows/` — `generateTherapyResearchWorkflow` is a multi-step pipeline (load context → plan queries → multi-source search → extract → persist)
- Tools: `src/tools/` — research source APIs, paper extraction, RAG chunking, claim verification
- DeepSeek module: `src/lib/deepseek.ts` — centralized `generateObject` (JSON mode + Zod) and `deepseekModel` (AI SDK provider)

### Database (Neon PostgreSQL + Drizzle ORM)

- Schema: `src/db/schema.ts` (PostgreSQL tables via Drizzle `pgTable`)
- DB operations: `src/db/index.ts` (all CRUD functions, exported as `db` namespace)
- Neon serverless client: `src/db/neon.ts` (`@neondatabase/serverless`)
- Migrations: `drizzle/`
- Config: `drizzle.config.ts` (uses `NEON_DATABASE_URL`)

### Authentication

Neon Auth (`@neondatabase/auth`) built on Better Auth. Modal sign-in/sign-up via `AuthDialog` component. Auth server instance: `app/lib/auth/server.ts`, client instance: `app/lib/auth/client.ts`. GraphQL context provides `userId` and `userEmail` from `auth.getSession()`. Auth API handler at `app/api/auth/[...path]/route.ts`.

### Frontend

- App Router pages: `app/goals/`, `app/notes/`, `app/stories/`
- UI: Radix UI Themes (dark mode, Indigo accent)
- Apollo Client setup: `app/lib/apollo-client.ts`, wrapped in `app/providers/`
- Components: `app/components/`

### Storage

- Audio assets (TTS output): Cloudflare R2 via S3-compatible SDK (`lib/r2-uploader.ts`)
- TTS API route: `app/api/tts/route.ts` (OpenAI TTS with text chunking)

### Research Sources

Multi-source integration: Crossref, PubMed, Semantic Scholar, OpenAlex, arXiv, Europe PMC, DataCite. Rate-limited via Bottleneck with concurrency controls.

## Key Conventions

- Database accessed via `@neondatabase/serverless` SQL tagged template
- JSON serialization for complex DB fields (authors, tags, evidence arrays)
- Note sharing uses normalized emails (trim + lowercase)
- GraphQL subscriptions via WebSocket for job status updates (research, audio generation)

## Agent Teams

This project uses Claude Code agent teams for parallel work. Team compositions are defined as specs in `.speckit/teams/`.

### Available Team Specs

| Spec | File | Agents | Use Case |
|------|------|--------|----------|
| `research-pipeline` | `.speckit/teams/research-pipeline.md` | lead + 3 researchers + synthesizer | Parallel academic research across 7 sources |
| `claim-verification` | `.speckit/teams/claim-verification.md` | lead + evidence-hunter + counter-evidence + judge | Adversarial evidence verification |
| `feature-build` | `.speckit/teams/feature-build.md` | lead + backend-dev + frontend-dev + qa | Full-stack feature implementation |
| `code-review` | `.speckit/teams/code-review.md` | lead + 3 specialized reviewers | Multi-lens PR review |
| `debug-squad` | `.speckit/teams/debug-squad.md` | lead + 3 investigators | Competing hypothesis debugging |
| `ux-review` | `.speckit/teams/ux-review.md` | lead + ux-inspector + ux-fixer | Live browser inspection, root-cause diagnosis, targeted fix + before/after verification |

### How to Create a Team from a Spec

When asked to create a team from a spec (e.g. "create a team from the feature-build spec"):

1. Read the team spec at `.speckit/teams/<name>.md`
2. Read the constitution at `.speckit/constitution.md` for governing principles
3. Read each referenced agent definition in `.claude/agents/`
4. Create the agent team matching the spec exactly:
   - Use the models specified per role (sonnet for leads/research, opus for implementation/verification)
   - Set `planModeRequired` as specified in the spec's Plan Required column
   - Use the Lead Prompt from the spec as the lead's coordination instructions
   - Include the Agent Assignments section in each teammate's spawn prompt
   - Include file ownership boundaries in implementation agent prompts
   - Create the initial tasks from the spec's Task Structure
5. Start the team and begin coordination

### Agent Definitions

Custom agents live in `.claude/agents/`. Each has a domain-specific prompt, tool restrictions, and file ownership boundaries:

- `research-analyst` — Academic research pipeline specialist
- `backend-dev` — GraphQL schema, resolvers, Neon DB, LangGraph
- `frontend-dev` — React components, pages, Apollo, Radix UI
- `qa-engineer` — Tests, type checking, build verification
- `security-reviewer` — OWASP, auth, access control
- `evidence-hunter` — Finds supporting academic evidence
- `counter-evidence` — Finds contradicting evidence
- `evidence-judge` — Weighs evidence with GRADE framework
- `ux-inspector` — Live browser measurement via MCP chrome-devtools; screenshots, computed styles, px-level diagnosis
- `ux-fixer` — Minimal targeted UI fixes; knows Radix UI negative margin gotchas cold

### File Ownership (Conflict Prevention)

When running agent teams, agents must only edit files within their ownership:

```
backend-dev:  schema/, src/db/, backend/, drizzle/
frontend-dev: app/components/, app/goals/, app/notes/, app/stories/, app/providers/, app/lib/
qa-engineer:  **/*.test.ts, **/*.spec.ts, __tests__/
research-*:   Read-only (no code edits)
evidence-*:   Read-only (no code edits)
```

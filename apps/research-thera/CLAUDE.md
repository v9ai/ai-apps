# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Research-based therapeutic platform combining AI-powered content generation, multi-source academic research integration, and audio delivery. Built with Next.js App Router, GraphQL (Apollo), Mastra AI agents, and Cloudflare D1/R2.

## Commands

```bash
pnpm dev              # Next.js dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm codegen          # GraphQL code generation (resolvers + client hooks)
pnpm mastra:dev       # Mastra agent dev server
```

Database migrations (Cloudflare D1 via Wrangler):
```bash
wrangler d1 migrations create research-thera-db <migration-name>
wrangler d1 migrations apply research-thera-db --remote   # ALWAYS use --remote
```

**IMPORTANT: Always use `--remote` when running D1 commands (migrations apply, execute, etc.). Never run against local D1 — the app uses the HTTP API client, not Workers bindings, so local D1 state is unused.**

## Architecture

### Data Flow

Client (React + Apollo) → GraphQL API (`/api/graphql`) → Resolvers → D1 database / Mastra agents → External APIs (DeepSeek, OpenAI, research sources)

### GraphQL (Schema-First)

- Schema definitions: `schema/schema.graphql`
- Operations (queries/mutations): `schema/operations/`
- Resolvers: `schema/resolvers/` (auto-generated scaffolds via codegen)
- Generated client types and hooks: `app/__generated__/`
- **Always run `pnpm codegen` after modifying `.graphql` files**

### AI Agents (Mastra)

- Agent definitions: `src/agents/index.ts` — `storyTellerAgent` and `therapeuticAgent` (DeepSeek LLM)
- Workflows: `src/workflows/` — `generateTherapyResearchWorkflow` is a multi-step pipeline (load context → plan queries → multi-source search → extract → persist)
- Tools: `src/tools/` — research source APIs, paper extraction, RAG chunking, claim verification
- Mastra instance: `src/mastra.ts`
- Prompt management and tracing: Langfuse

### Database (Cloudflare D1 + Drizzle ORM)

- Schema: `src/db/schema.ts` (SQLite tables via Drizzle)
- DB operations: `src/db/index.ts` (all CRUD functions)
- D1 HTTP client: `src/db/d1.ts` (remote access, not Workers binding)
- Migrations: `drizzle/`
- Config: `drizzle.config.ts`, `src/config/d1.ts`

### Authentication

Clerk (`@clerk/nextjs`) with modal sign-in/sign-up (no dedicated auth pages). GraphQL context provides `userId` and `userEmail` from Clerk's `auth()` and `currentUser()`.

### Frontend

- App Router pages: `app/goals/`, `app/notes/`, `app/stories/`
- UI: Radix UI Themes (dark mode, Indigo accent)
- Apollo Client setup: `app/lib/apollo-client.ts`, wrapped in `app/providers/`
- Components: `app/components/`

### Storage

- Audio assets (TTS output): Cloudflare R2 via S3-compatible SDK (`lib/r2-uploader.ts`)
- TTS API route: `app/api/tts/route.ts` (OpenAI TTS with text chunking via Mastra RAG MDocument)

### Research Sources

Multi-source integration: Crossref, PubMed, Semantic Scholar, OpenAlex, arXiv, Europe PMC, DataCite. Rate-limited via Bottleneck with concurrency controls.

## Key Conventions

- D1 operations use HTTP API client (not Workers bindings) for local development
- JSON serialization for complex DB fields (authors, tags, evidence arrays)
- Numeric values sanitized before D1 writes to prevent NaN/Infinity in SQLite
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
- `backend-dev` — GraphQL schema, resolvers, D1, Trigger.dev
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
backend-dev:  schema/, src/db/, src/trigger/, drizzle/
frontend-dev: app/components/, app/goals/, app/notes/, app/stories/, app/providers/, app/lib/
qa-engineer:  **/*.test.ts, **/*.spec.ts, __tests__/
research-*:   Read-only (no code edits)
evidence-*:   Read-only (no code edits)
```

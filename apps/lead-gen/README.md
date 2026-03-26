# Nomadically.work

Remote EU job board aggregator with AI classification, CRM, and email campaigns.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Radix UI |
| API | Apollo Server 5 (GraphQL), Drizzle ORM |
| Database | Neon PostgreSQL |
| Auth | Better Auth (`@ai-apps/auth`) |
| AI/ML | Anthropic Claude, DeepSeek, Vercel AI SDK, OpenRouter |
| Email | Resend |
| Observability | LangSmith |
| Deployment | Vercel |

## Quick Start

```bash
pnpm install
cp .env.example .env.local   # fill in credentials (see .env.example for full list)
pnpm dev                      # http://localhost:3000
```

GraphQL Playground: http://localhost:3000/api/graphql

## Architecture

### Database Access

`Next.js (Vercel) → Neon PostgreSQL` via `@neondatabase/serverless` + Drizzle ORM.

### Data Flow

```
Ingestion      Greenhouse / Lever / Ashby APIs → Neon
Enhancement    Job IDs → ATS API → Neon
Classification Unprocessed jobs → DeepSeek LLM → is_remote_eu → Neon
Skill Extract  Job descriptions → LLM pipeline → Skills → Neon
Serving        Browser → Apollo Client → /api/graphql → Drizzle ORM → Neon
Evaluation     Local evals → LLM calls → Accuracy scores
```

## Key Features

### Job Aggregation
Ingests from Greenhouse, Lever, and Ashby ATS platforms. Enhancement pipeline enriches jobs with full ATS metadata.

### AI Classification
Detects remote-EU-eligible jobs using DeepSeek with structured output grounding. Evaluated against local test datasets with an 80%+ accuracy bar.

### Skill Extraction
LLM-powered skill tagging validated against a managed taxonomy. Skill-based search and filtering.

### CRM
Company profiles, contacts management, email campaigns with Resend, batch generation, and follow-up tracking.

### GraphQL API
Apollo Server 5 with typed resolvers, DataLoaders, and full codegen pipeline.

### Evaluation
Dataset-driven accuracy testing for classification and email generation pipelines.

## Commands

```bash
# Dev & build
pnpm dev                          # Dev server
pnpm build                        # Production build
pnpm lint                         # ESLint
pnpm codegen                      # GraphQL codegen (run after schema changes)

# Database
pnpm db:generate                  # Generate Drizzle migrations
pnpm db:migrate                   # Apply migrations

# Ingestion & skills
pnpm jobs:ingest                  # Ingest from ATS platforms
pnpm jobs:enhance                 # Enhance jobs with ATS data
pnpm skills:extract               # Extract skills from jobs
pnpm skills:seed                  # Seed skill taxonomy

# Deploy app
pnpm deploy                       # Vercel deploy
```

## Project Structure

```
schema/                 GraphQL schema (by domain)
src/
  __generated__/        Codegen output (types, hooks, resolvers)
  agents/               AI agents (SQL, admin, strategy enforcer)
  anthropic/            Claude client, MCP, sub-agents
  apollo/resolvers/     GraphQL resolvers
  app/                  Next.js App Router pages + API routes
  components/           React components (Radix UI)
  db/                   Drizzle schema + Neon client
  evals/                Evaluation datasets and scorers
  graphql/              Query/mutation/fragment documents
  ingestion/            ATS fetchers (Greenhouse, Lever, Ashby)
  lib/skills/           Skill taxonomy, extraction, filtering
  tools/database/       Agent database tools
migrations/             Drizzle migration SQL files
```

## Deployment

**App** — deployed to Vercel. Set env vars in the Vercel dashboard (see `.env.example`).

## License

MIT

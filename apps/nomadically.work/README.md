# Nomadically.work

Remote EU job board aggregator with AI classification, CRM, email campaigns, and a multi-worker pipeline spanning TypeScript, Rust/WASM, and Python.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Radix UI |
| API | Apollo Server 5 (GraphQL), Drizzle ORM |
| Database | Cloudflare D1 (SQLite) via D1 Gateway Worker |
| Auth | Better Auth (`@ai-apps/auth`) |
| AI/ML | Anthropic Claude, DeepSeek, Vercel AI SDK, OpenRouter |
| Email | Resend |
| Workers | Cloudflare Workers — TypeScript, Rust/WASM, Python |
| Background jobs | Trigger.dev, Cloudflare Cron + Queues |
| Evaluation | Langfuse |
| Deployment | Vercel (app), Cloudflare Workers (workers) |

## Quick Start

```bash
pnpm install
cp .env.example .env.local   # fill in credentials (see .env.example for full list)
pnpm dev                      # http://localhost:3000
```

GraphQL Playground: http://localhost:3000/api/graphql

## Architecture

### Database Access

**Production:** `Next.js (Vercel) → D1 Gateway Worker → D1 Database (binding)`
**Dev fallback:** `Next.js → Cloudflare REST API → D1 Database`

The D1 Gateway supports batched queries and caching. See [DEPLOY_D1_GATEWAY.md](./DEPLOY_D1_GATEWAY.md) for setup.

### Data Flow

```
Discovery      ATS Sources → Cron Worker → Trigger Ingestion
Board Crawl    Common Crawl CDX → ashby-crawler (Rust/WASM) → D1
Ingestion      Greenhouse / Lever / Ashby APIs → D1
Enhancement    Job IDs → ATS API → D1
Classification Unprocessed jobs → DeepSeek / LangGraph → is_remote_eu → D1
Skill Extract  Job descriptions → LLM pipeline → Skills → D1
Resume Match   Resumes → Python Worker / Vectorize → Vector search
Serving        Browser → Apollo Client → /api/graphql → D1 Gateway → D1
Evaluation     Langfuse datasets → LLM calls → Accuracy scores
```

### Workers

| Worker | Language | Trigger | Purpose |
|---|---|---|---|
| `janitor` | TypeScript | Cron (daily midnight UTC) | Triggers ATS ingestion |
| `d1-gateway` | TypeScript | HTTP | D1 binding proxy with batching |
| `insert-jobs` | TypeScript | Queue | Job insertion |
| `process-jobs` | Python | Cron (6h) + Queue | DeepSeek remote EU classification |
| `ashby-crawler` | Rust/WASM | HTTP | Common Crawl → Ashby board discovery |
| `resume-rag` | Python | HTTP | Vectorize + Workers AI for resume matching |

## Key Features

### Job Aggregation
Ingests from Greenhouse, Lever, and Ashby ATS platforms. Automatic board discovery via Common Crawl (Rust crawler). Enhancement pipeline enriches jobs with full ATS metadata.

### AI Classification
Detects remote-EU-eligible jobs using DeepSeek with LangGraph orchestration. Evaluated against Langfuse datasets with an 80%+ accuracy bar.

### Skill Extraction
LLM-powered skill tagging validated against a managed taxonomy. Vector-based skill search and filtering.

### CRM
Company profiles, contacts management, email campaigns with Resend, batch generation, and follow-up tracking.

### Resume Matching
RAG-based vector search using Cloudflare Vectorize and Workers AI (Python worker).

### GraphQL API
Apollo Server 5 with typed resolvers, DataLoaders, batched D1 queries, and full codegen pipeline.

### Evaluation
Langfuse dataset-driven accuracy testing for classification and email generation pipelines.

## Commands

```bash
# Dev & build
pnpm dev                          # Dev server
pnpm build                        # Production build
pnpm lint                         # ESLint
pnpm codegen                      # GraphQL codegen (run after schema changes)

# Database
pnpm db:generate                  # Generate Drizzle migrations
pnpm db:migrate                   # Apply locally
pnpm db:push                      # Apply to remote D1

# Ingestion & skills
pnpm jobs:ingest                  # Ingest from ATS platforms
pnpm jobs:enhance                 # Enhance jobs with ATS data
pnpm skills:extract               # Extract skills from jobs
pnpm skills:seed                  # Seed skill taxonomy

# Evaluation
pnpm eval:langfuse                # Run classification eval

# Workers
wrangler deploy --config wrangler.d1-gateway.toml         # D1 Gateway
wrangler deploy --config workers/ashby-crawler/wrangler.toml  # Ashby crawler

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
  db/                   Drizzle schema, D1 HTTP client
  evals/                Langfuse evaluation datasets
  graphql/              Query/mutation/fragment documents
  ingestion/            ATS fetchers (Greenhouse, Lever, Ashby)
  lib/skills/           Skill taxonomy, extraction, filtering
  tools/database/       Agent database tools
  trigger/              Trigger.dev tasks
workers/
  ashby-crawler/        Rust/WASM — Common Crawl board discovery
  process-jobs/         Python — DeepSeek classification
  resume-rag/           Python — Vector search
migrations/             Drizzle migration SQL files
```

## Deployment

**App** — deployed to Vercel. Set env vars in the Vercel dashboard (see `.env.example`).

**Workers** — deployed individually via `wrangler deploy` with their respective config files.

**D1 Gateway** — see [DEPLOY_D1_GATEWAY.md](./DEPLOY_D1_GATEWAY.md) for full setup instructions.

## License

MIT

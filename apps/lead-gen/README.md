# Lead Gen

Remote EU job board aggregator with locally-trained ML models, multi-armed bandit crawlers, zero-alloc NER, Candle embeddings on M1 Metal, and a Next.js frontend for job matching and skill extraction.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Radix UI, PandaCSS |
| API | Apollo Server 5 (GraphQL), Drizzle ORM |
| Database | Neon PostgreSQL |
| Auth | Better Auth (`@ai-apps/auth`) |
| ML (Rust) | Candle (Metal GPU embeddings), ndarray (NeuralUCB training), zero-alloc NER, multi-armed bandits |
| ML (Python) | MLX (embeddings, LoRA fine-tuning), PyTorch (DQN, NER), LightGBM (scoring), MAPIE (conformal) |
| AI | DeepSeek (fallback only), Vercel AI SDK |
| Email | Resend |
| Observability | LangSmith |
| Deployment | Vercel |

## Quick Start

```bash
pnpm install
cp .env.example .env.local   # fill in credentials (see .env.example for full list)
pnpm dev                      # http://localhost:3004
```

GraphQL Playground: http://localhost:3004/api/graphql

## Architecture

### Database Access

`Next.js (Vercel) -> Neon PostgreSQL` via `@neondatabase/serverless` + Drizzle ORM.

### Data Flow

```
Ingestion       Greenhouse / Lever / Ashby APIs -> Neon
Enhancement     Job IDs -> ATS API -> Neon
Classification  Unprocessed jobs -> LoRA-tuned local model / DeepSeek fallback -> Neon
Skill Extract   Job descriptions -> LLM pipeline -> Skills -> Neon
Crawling        Domain pool -> Bandit scheduler (D-UCB/Thompson/NeuralUCB) -> NER extraction -> Scoring
Embeddings      Contact/job text -> Candle MiniLM (M1 Metal GPU) -> QuantizedEmbeddingStore (INT8)
Serving         Browser -> Apollo Client -> /api/graphql -> Drizzle ORM -> Neon
Evaluation      NER P/R/F1, bandit regret, PSI drift detection
```

## Key Features

### Job Aggregation
Ingests from Greenhouse, Lever, and Ashby ATS platforms. Enhancement pipeline enriches jobs with full ATS metadata.

### Rust ML Pipeline (`crates/leadgen/`)

The core ML runs in Rust — no cloud LLM APIs in the critical path.

| Component | What it does |
|-----------|-------------|
| **Bandit Scheduler** | Domain scheduling via D-UCB, SW-UCB, Thompson Sampling (Xorshift64 PRNG, Marsaglia-Tsang Gamma sampling) |
| **NeuralUCB** | Contextual bandits — 3-layer MLP (16→64→64→1), MC dropout uncertainty, hand-rolled backprop, mini-batch SGD |
| **Contact NER** | Zero-alloc state machine — 5 extraction patterns, `#[repr(C)]` output, microsecond latency |
| **Candle Embeddings** | In-process `all-MiniLM-L6-v2` on M1 Metal GPU via Candle, 2-3K texts/sec |
| **URL Scorer** | Adaptive scoring with extraction feedback loop (CLARS-DQN inspired) |
| **Entity Resolution** | 7-signal Jaro-Winkler composite + petgraph union-find clustering |
| **Eval** | NER P/R/F1, cumulative bandit regret, PSI drift detection |

### Python ML (`src/*.py`, `langgraph/`)

Heavier models for offline training and research:

- **Crawling RL**: DQN, Dueling DQN, Decision Transformer, curiosity-driven exploration, world models
- **NER**: GLiNER2 (CoreML + ONNX), hybrid ensemble with DistilBERT + spaCy
- **Entity Resolution**: DeBERTa-v3 adapter fine-tuning, SBERT blocker
- **Lead Scoring**: LightGBM + LogReg + RF ensemble, MAPIE conformal prediction
- **Embeddings**: MLX Metal (nomic-embed-text, 4618 embeddings/sec on M1)
- **Monitoring**: Multi-scale drift detection (KS, JS, MMD, CUSUM), River online learning

### AI Classification
Remote-EU job detection via LoRA-tuned local model (Qwen2.5-3B on MLX). DeepSeek cloud API as fallback only.

### CRM & Email
Company profiles, contacts management, email campaigns with Resend, streaming composition.

### GraphQL API
Apollo Server 5 with typed resolvers, DataLoaders, full codegen pipeline, and custom scalars.

## Commands

```bash
# Dev & build
pnpm dev                          # Dev server (port 3004)
pnpm build                        # Production build
pnpm lint                         # ESLint
pnpm codegen                      # GraphQL codegen (run after schema changes)

# Database
pnpm db:generate                  # Generate Drizzle migrations
pnpm db:migrate                   # Apply migrations
pnpm db:studio                    # Drizzle Studio

# Ingestion & skills
pnpm jobs:ingest                  # Ingest from ATS platforms
pnpm jobs:enhance                 # Enhance jobs with ATS data
pnpm jobs:status                  # Check ingestion status
pnpm jobs:extract-skills          # Extract skills during ingestion
pnpm jobs:find-remote             # Job discovery
pnpm skills:extract               # Extract skills from jobs
pnpm skills:seed                  # Seed skill taxonomy
pnpm boards:discover              # Discover Ashby boards

# Strategy
pnpm strategy:check               # Validate staged changes against optimization strategy
pnpm strategy:check:all           # Validate all tracked files

# Deploy
pnpm deploy                       # Vercel deploy
```

## Project Structure

```
schema/                    GraphQL schema (by domain: jobs, companies, contacts, emails, ...)
migrations/                Drizzle migration SQL files
scripts/                   TypeScript automation (17 scripts)
langgraph/                 Python LangGraph service (20 agentic graphs), MLX training
crates/metal/              Zero-alloc Rust kernels (NER, embeddings, scoring, SIMD similarity)
../../crates/leadgen/      Rust ML pipeline (bandits, NeuralUCB, NER, Candle embeddings, eval)
../../crates/candle/       Shared Candle ML inference (BERT, Metal/CUDA)
docs/                      Architecture and research documentation
public/                    Static assets
src/
  __generated__/           Codegen output (types, hooks, resolvers)
  agents/                  AI agents (admin assistant, strategy enforcer)
  apollo/                  Apollo Server setup, resolvers (11 files), DataLoaders
  app/                     Next.js App Router
    (pages)/               jobs, companies, contacts, follow-ups, admin, settings, auth
    api/                   graphql, emails, companies, webhooks, linkedin, brave, db
  components/              React components (39 files)
    admin/                 Email composer, batch modals, campaign editor, follow-ups
    landing-*.tsx          Landing page sections
    ui/                    Badge, Button, Card, NavLink, SearchInput
  config/                  Environment validation
  db/                      Drizzle schema + Neon client
  evals/                   Evaluation datasets and scorers
  graphql/                 Query/mutation/fragment documents (17 files)
  hooks/                   React hooks (streaming email, scheduler)
  ingestion/               ATS fetchers (Greenhouse, Lever, Ashby)
  lib/
    skills/                Skill taxonomy, extraction, filtering
    email/                 Campaign scheduler, follow-ups, reply generation, signatures
    auth/                  Client + server auth
    resend/                Resend email integration
  llm/                     DeepSeek model client (fallback only)
  prompts/                 Prompt templates
  recipes/                 PandaCSS recipes (badge, button, cards)
  schema/contracts/        Data contracts (enums, messages, skill taxonomy)
  tools/database/          Agent database tools
  *.py                     Python ML (crawlers, NER, embeddings, drift detection, conformal prediction)
```

## API Routes

| Route | Purpose |
|---|---|
| `/api/graphql` | Apollo Server GraphQL endpoint |
| `/api/auth/[...path]` | Better Auth |
| `/api/emails/send` | Send emails |
| `/api/emails/batch` | Batch email operations |
| `/api/emails/generate-batch` | Batch email generation |
| `/api/emails/generate-stream` | Streaming email generation |
| `/api/emails/schedule-stream` | Schedule with streaming |
| `/api/companies/bulk-import` | Bulk import companies |
| `/api/companies/enhance` | AI company enhancement |
| `/api/enhance-greenhouse-jobs` | Greenhouse job enhancement |
| `/api/linkedin/extract` | LinkedIn profile extraction |
| `/api/email-outreach/generate` | Outreach email generation |
| `/api/brave/discover` | Brave Search discovery |
| `/api/webhooks/resend` | Resend email webhooks |
| `/api/db/schema` | Database schema introspection |
| `/api/admin/report-action` | Report handling |
| `/api/admin/reported-jobs` | Reported jobs list |
| `/api/resume-pdf/:slug` | PDF resume generation |

## Deployment

Deployed to Vercel. Set env vars in the Vercel dashboard (see `.env.example`).

## License

MIT

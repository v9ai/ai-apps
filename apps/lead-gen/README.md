# Agentic Lead Gen

B2B lead generation platform. Next.js 16 frontend + GraphQL API backed by Neon PostgreSQL, with AI/ML pipelines for company enrichment, contact discovery, and outreach automation.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Radix UI, PandaCSS |
| API | Apollo Server 5 (GraphQL), Drizzle ORM |
| Database | Neon PostgreSQL |
| Auth | Better Auth (`@ai-apps/auth`) |
| ML (Rust) | Candle (Metal GPU embeddings), ndarray (NeuralUCB training), zero-alloc NER, multi-armed bandits |
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
Discovery       Common Crawl / live fetch -> companies -> Neon
Enrichment      Company IDs -> LLM/web -> Neon
Contacts        LinkedIn / manual -> contacts -> Neon
Outreach        Contacts -> email campaigns (Resend) -> Neon
Serving         Browser -> Apollo Client -> /api/graphql -> Drizzle ORM -> Neon
Evaluation      NER P/R/F1, bandit regret, PSI drift detection
```

## Key Features

### Rust ML Pipeline (`crates/leadgen/`)

Core ML runs in Rust — no cloud LLM APIs in the critical path.

| Component | What it does |
|-----------|-------------|
| **Bandit Scheduler** | Domain scheduling via D-UCB, SW-UCB, Thompson Sampling (Xorshift64 PRNG, Marsaglia-Tsang Gamma sampling) |
| **NeuralUCB** | Contextual bandits — 3-layer MLP (16→64→64→1), MC dropout uncertainty, hand-rolled backprop, mini-batch SGD |
| **Contact NER** | Zero-alloc state machine — 5 extraction patterns, `#[repr(C)]` output, microsecond latency |
| **Candle Embeddings** | In-process `all-MiniLM-L6-v2` on M1 Metal GPU via Candle, 2-3K texts/sec |
| **URL Scorer** | Adaptive scoring with extraction feedback loop (CLARS-DQN inspired) |
| **Entity Resolution** | 7-signal Jaro-Winkler composite + petgraph union-find clustering |
| **Eval** | NER P/R/F1, cumulative bandit regret, PSI drift detection |

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

# Skills & strategy
pnpm skills:seed                  # Seed skill taxonomy
pnpm strategy:check               # Validate staged changes against optimization strategy
pnpm strategy:check:all           # Validate all tracked files

# Deploy
pnpm deploy                       # Vercel deploy
```

## Project Structure

```
schema/                    GraphQL schema (by domain: companies, contacts, emails, ...)
migrations/                Drizzle migration SQL files
scripts/                   TypeScript automation
crates/metal/              Zero-alloc Rust kernels (NER, embeddings, scoring, SIMD similarity)
../../crates/leadgen/      Rust ML pipeline (bandits, NeuralUCB, NER, Candle embeddings, eval)
../../crates/candle/       Shared Candle ML inference (BERT, Metal/CUDA)
docs/                      Architecture and research documentation
src/
  __generated__/           Codegen output (types, hooks, resolvers)
  agents/                  AI agents (admin assistant, strategy enforcer)
  apollo/                  Apollo Server setup, resolvers, DataLoaders
  app/                     Next.js App Router
    (pages)/               companies, contacts, follow-ups, admin, settings, auth
    api/                   graphql, emails, companies, webhooks, linkedin, db
  components/              React components
  db/                      Drizzle schema + Neon client
  evals/                   Evaluation datasets and scorers
  graphql/                 Query/mutation/fragment documents
  lib/
    skills/                Skill taxonomy, extraction, filtering
    email/                 Campaign scheduler, follow-ups, reply generation
    auth/                  Client + server auth
    resend/                Resend email integration
  prompts/                 Prompt templates
  tools/database/          Agent database tools
```

## API Routes

| Route | Purpose |
|---|---|
| `/api/graphql` | Apollo Server GraphQL endpoint |
| `/api/auth/[...path]` | Better Auth |
| `/api/emails/send` | Send emails |
| `/api/emails/generate-stream` | Streaming email generation |
| `/api/companies/enhance` | AI company enhancement |
| `/api/email-outreach/generate` | Outreach email generation |
| `/api/text-to-sql` | Natural language → SQL query |
| `/api/webhooks/resend` | Resend email webhooks |
| `/api/db/schema` | Database schema introspection |

## Deployment

Deployed to Vercel. Set env vars in the Vercel dashboard (see `.env.example`).

## License

MIT

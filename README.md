# ai-apps

A pnpm + Turborepo monorepo containing AI-powered web apps, shared Rust crates, and TypeScript packages.

## Monorepo Structure

```mermaid
graph TD
    subgraph apps["Apps"]
        NOM["nomadically.work\nRemote EU job board"]
        HC["agentic-healthcare\nBlood test intelligence"]
        LAW["law-adversarial\nLegal brief stress-tester"]
        RT["research-thera\nTherapeutic research"]
        MISC["knowledge · real-estate · todo · blog"]
    end

    subgraph ts["TypeScript Packages"]
        DS_TS["@ai-apps/deepseek"]
        QW_TS["@ai-apps/qwen"]
        ROUTER["llm-router"]
        SHARED["ui · og · logger · configs"]
    end

    subgraph rust["Rust Crates"]
        SDD["sdd\n8-phase LLM pipeline"]
        GEN["genesis\nself-improving codegen"]
        RES["research\nSemantic Scholar + agents"]
        DS_RS["deepseek\nreqwest · wasm · agent · cache"]
        QW_RS["qwen · tts"]
        EVALS["evals"]
    end

    subgraph infra["Infrastructure"]
        VERCEL["Vercel"]
        CF["Cloudflare Workers\nTS · Rust/WASM · Python"]
        NEON["Neon PostgreSQL"]
        SUP["Supabase"]
    end

    subgraph ai["AI Providers"]
        CLAUDE["Anthropic Claude"]
        DS_API["DeepSeek"]
        QW_API["DashScope / Qwen"]
        OR["OpenRouter"]
    end

    NOM --> DS_TS & QW_TS & ROUTER & SHARED
    HC --> QW_TS & SHARED
    LAW --> DS_TS & QW_TS
    RT --> SHARED

    GEN --> SDD
    SDD --> DS_RS
    RES --> DS_RS & QW_RS

    DS_TS & DS_RS --> DS_API
    QW_TS & QW_RS --> QW_API

    NOM --> VERCEL & CF & NEON & CLAUDE & DS_API & OR
    HC --> SUP & QW_API
    LAW --> SUP & DS_API & QW_API
    RT --> NEON
```

## SDD Pipeline

The [`crates/sdd`](crates/sdd) crate powers spec-driven development across the whole repo — every change flows through an 8-phase LLM orchestrator:

```mermaid
flowchart LR
    E([explore]) --> P([propose])
    P --> S([spec])
    P --> D([design])
    S & D --> T([tasks])
    T --> A([apply])
    A --> V{verify}
    V -->|pass| AR([archive])
    V -->|fail + context| A

    style S fill:#4a9eff,color:#fff
    style D fill:#4a9eff,color:#fff
```

`spec` and `design` run in parallel. On verify failure, the failure summary is injected as context and `apply` retries automatically.

## Apps

| App | Description | Stack |
|-----|-------------|-------|
| [`nomadically.work`](apps/nomadically.work) | Remote EU job board aggregator with AI classification, CRM, and a multi-worker pipeline | Next.js 16, Neon PostgreSQL, Apollo/GraphQL, CF Workers (TS + Rust/WASM + Python) |
| [`agentic-healthcare`](apps/agentic-healthcare) | Longitudinal blood test intelligence — clinical ratio tracking, health trajectories, AI Q&A | Next.js, Supabase pgvector, Qwen |
| [`law-adversarial`](apps/law-adversarial) | Legal brief stress-tester with adversarial multi-agent debate (Attacker → Defender → Judge) | Next.js, Supabase, DeepSeek R1 + Qwen Plus |
| [`research-thera`](apps/research-thera) | Therapeutic research platform | Next.js, Apollo/GraphQL, better-auth |
| [`vadim.blog`](apps/vadim.blog) | Personal blog | Docusaurus |
| `knowledge` | Knowledge management app | Next.js, Drizzle |
| `real-estate` | Real estate app | Next.js |
| `todo` | Todo app | Next.js, Drizzle |

## Rust Crates

| Crate | Description |
|-------|-------------|
| [`crates/deepseek`](crates/deepseek) | Shared DeepSeek API client — reqwest, WASM, agent loop, TTL cache |
| [`crates/qwen`](crates/qwen) | Shared Qwen/DashScope client |
| [`crates/sdd`](crates/sdd) | Spec-Driven Development pipeline — 8-phase LLM orchestrator (explore → archive) |
| [`crates/genesis`](crates/genesis) | Self-improving code generation — wraps SDD in a learning layer |
| [`crates/research`](crates/research) | Semantic Scholar client + DeepSeek/Qwen dual-model agent framework |
| [`crates/tts`](crates/tts) | Async Qwen TTS client (DashScope API, optional R2 storage) |
| [`crates/evals`](crates/evals) | Eval framework (rig-core) |

## TypeScript Packages

| Package | Description |
|---------|-------------|
| [`packages/deepseek`](packages/deepseek) | `@ai-apps/deepseek` — TypeScript DeepSeek client |
| [`packages/qwen`](packages/qwen) | `@ai-apps/qwen` — TypeScript Qwen/DashScope client |
| [`packages/llm-router`](packages/llm-router) | LLM routing across providers |
| `packages/ui` | Shared React components |
| `packages/og` | Open Graph image generation |
| `packages/logger` | Isomorphic logger |
| `packages/config-eslint` | Shared ESLint config |
| `packages/config-typescript` | Shared tsconfig |
| `packages/jest-presets` | Shared Jest config |

## Getting Started

```bash
pnpm install

# Run Nomadically dev server
pnpm dev:n          # http://localhost:3000

# Run any app directly
cd apps/nomadically.work && pnpm dev
```

## Tech Stack

- **Package manager** — pnpm 10 + Turborepo
- **Languages** — TypeScript 5.9, Rust (2021 edition)
- **AI providers** — Anthropic Claude, DeepSeek, Qwen (DashScope), OpenRouter
- **Databases** — Neon PostgreSQL, Cloudflare D1, Supabase
- **Deployment** — Vercel (Next.js apps), Cloudflare Workers (workers/WASM)

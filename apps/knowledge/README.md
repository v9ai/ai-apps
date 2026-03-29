# Knowledge

AI engineering educational platform — 91 lessons across 15 categories with search, audio, knowledge graphs, and learning analytics.

## Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Database**: Neon PostgreSQL + pgvector
- **ORM**: Drizzle ORM
- **UI**: Radix UI Themes
- **AI**: OpenAI, DeepSeek
- **Content Generation**: LangGraph (Python backend)
- **Deployment**: Vercel

## Architecture

```mermaid
graph TD
    subgraph Client
        Browser["Browser"]
    end

    subgraph Next.js["Next.js App (Port 3006)"]
        Pages["Pages\n/[slug]\n/aws\n/aws/[slug]"]
        API["API Routes\n/api/chat\n/api/research"]
        SA["Server Actions\nsearch · analytics"]
        MW["Middleware\nURL redirects"]
    end

    subgraph Data["Data Layer"]
        Adapter["data.ts adapter\nDB or filesystem"]
        FS["Filesystem\ncontent/*.md"]
        DB["Neon PostgreSQL\n+ pgvector"]
    end

    subgraph External
        OpenAI["OpenAI API\nchat · embeddings"]
        DeepSeek["DeepSeek API\nalternative LLM"]
        R2["Cloudflare R2\naudio files"]
    end

    Browser --> MW
    MW --> Pages
    Pages --> Adapter
    SA --> DB
    API --> OpenAI
    API --> DeepSeek
    Adapter -->|NEXT_PUBLIC_DATA_SOURCE=db| DB
    Adapter -->|NEXT_PUBLIC_DATA_SOURCE=fs| FS
    Pages --> R2
```

## Database Schema

```mermaid
erDiagram
    categories ||--o{ lessons : contains
    lessons ||--o{ lesson_sections : has
    lessons ||--o{ lesson_concepts : tagged_with
    lessons ||--o{ lesson_embeddings : embedded_as
    lesson_sections ||--o{ section_embeddings : embedded_as
    concepts ||--o{ concept_edges : connects
    concepts ||--o{ lesson_concepts : appears_in
    concepts ||--o{ concept_embeddings : embedded_as
    user_profiles ||--o{ knowledge_states : tracks
    user_profiles ||--o{ interaction_events : generates
    user_profiles ||--o{ user_lesson_interactions : has
    user_profiles ||--o{ chat_messages : sends
    lessons ||--o{ knowledge_states : subject_of
    lessons ||--o{ user_lesson_interactions : interacted_in

    categories {
        uuid id PK
        text slug
        text name
        int lesson_range_start
        int lesson_range_end
    }

    lessons {
        uuid id PK
        text slug
        int number
        text title
        uuid category_id FK
        int word_count
        int reading_time_minutes
    }

    concepts {
        uuid id PK
        text name
        text type
        text description
    }

    concept_edges {
        uuid from_concept_id FK
        uuid to_concept_id FK
        text relationship
    }

    lesson_embeddings {
        uuid lesson_id FK
        vector embedding
        text model
    }

    knowledge_states {
        uuid user_id FK
        uuid lesson_id FK
        float mastery_probability
        float transit_prob
        float slip_prob
        float guess_prob
    }
```

## Data Flow — Lesson Page

```mermaid
sequenceDiagram
    participant User
    participant Page as /[slug] Page
    participant Adapter as data.ts
    participant DB as Neon DB
    participant R2 as Cloudflare R2

    User->>Page: GET /transformer-architecture
    Page->>Adapter: getLessonBySlug(slug)
    Adapter->>DB: SELECT lesson + sections
    DB-->>Adapter: lesson data
    Adapter-->>Page: LessonWithSections
    Page->>DB: getSimilarLessons (pgvector cosine)
    DB-->>Page: related lessons
    Page->>R2: check audio exists
    R2-->>Page: audio URL
    Page-->>User: rendered lesson
    User->>Page: scroll / bookmark / search
    Page->>DB: INSERT interaction_events (analytics)
```

## Data Flow — Chat

```mermaid
sequenceDiagram
    participant User
    participant ChatUI as Chat Component
    participant Route as /api/chat
    participant LLM as OpenAI / DeepSeek
    participant DB as Neon DB

    User->>ChatUI: send message
    ChatUI->>Route: POST { messages, lessonSlug }
    Route->>DB: fetch lesson context
    DB-->>Route: lesson content + concepts
    Route->>LLM: stream completion (system + context + messages)
    LLM-->>Route: token stream
    Route-->>ChatUI: SSE stream
    ChatUI-->>User: streamed response
    Route->>DB: INSERT chat_messages
```

## Knowledge Graph

```mermaid
graph LR
    subgraph Transformers
        T1[Transformer Architecture]
        T2[Tokenization]
        T3[Scaling Laws]
        T4[RLHF]
    end

    subgraph RAG
        R1[RAG Fundamentals]
        R2[Advanced RAG]
        R3[Embeddings]
    end

    subgraph Context["Context Engineering"]
        C1[Context Engineering]
        C2[Window Management]
        C3[Memory Architectures]
        C4[Prompt Caching]
        C5[Dynamic Assembly]
        C6[Compression]
    end

    subgraph Agents["Agents & Harnesses"]
        A1[Agent Architectures]
        A2[Tool Use]
        A3[Memory Systems]
        A4[Agent Harnesses]
        A5[Orchestration]
        A6[Agent SDKs]
        A7[Agent Debugging]
    end

    T1 -->|prerequisite| T3
    T1 -->|prerequisite| T4
    T2 -->|prerequisite| T1
    T3 -->|builds_on| R1
    R3 -->|prerequisite| R1
    R1 -->|prerequisite| R2
    T1 -->|prerequisite| C1
    C1 -->|prerequisite| C2
    C1 -->|prerequisite| C3
    C2 -->|related| C4
    C3 -->|related| C5
    C5 -->|related| C6
    C1 -->|prerequisite| A1
    A1 -->|related| A2
    A1 -->|related| A3
    A1 -->|prerequisite| A4
    A4 -->|related| A5
    A4 -->|related| A6
    A5 -->|related| A7
```

## Eval Pipeline

```mermaid
graph LR
    subgraph evals/
        A[run_eval.py]
        B[test_articles.py]
        C[test_agent.py]
        D[test_editorial.py]
        E[test_llm_judge.py]
    end

    subgraph Judges
        F[DeepEval\nmetrics]
        G[LangGraph\nagent]
        H[LLM Judge\nconsistency]
    end

    A --> B & C & D & E
    B --> F
    C --> G
    D --> F
    E --> H
    F & G & H --> I[eval-results.json]
```

## LangGraph Pipelines

Three LangGraph StateGraphs power the eval and content generation layer.

### Editorial Pipeline

Fan-out research to three specialists in parallel, fan-in to writer, then editor revision loop (max 2 rounds). Supports optional MemorySaver checkpointing for resumable runs.

```mermaid
graph TD
    START((Start)) --> research_entry
    research_entry --> researcher
    research_entry --> seo
    research_entry --> intro_strategist
    researcher --> writer
    seo --> writer
    intro_strategist --> writer
    writer --> editor
    editor -->|APPROVE or max rounds| END((End))
    editor -->|REVISE| writer

    style research_entry fill:#f9f,stroke:#333
    style writer fill:#bbf,stroke:#333
    style editor fill:#fbb,stroke:#333
```

### Red-Team Orchestrator

Plans attacks from a profile, fans out via `Send()` to parallel workers with retry, collects results via `operator.add` reducer, and generates a report.

```mermaid
graph TD
    START((Start)) --> plan_attacks
    plan_attacks -->|"Send() per attack"| attack_worker_1[attack_worker]
    plan_attacks -->|"Send() per attack"| attack_worker_2[attack_worker]
    plan_attacks -->|"Send() per attack"| attack_worker_n[attack_worker ...]
    attack_worker_1 --> report
    attack_worker_2 --> report
    attack_worker_n --> report
    report --> END((End))

    style plan_attacks fill:#f9f,stroke:#333
    style report fill:#bfb,stroke:#333
```

### Crescendo Multi-Turn Attack

Cyclic graph for escalating multi-turn attacks. Sends progressively adversarial prompts and evaluates after each turn.

```mermaid
graph TD
    START((Start)) --> send_turn
    send_turn --> evaluate
    evaluate -->|"goal achieved or max turns"| END((End))
    evaluate -->|"continue escalation"| send_turn

    style send_turn fill:#fbb,stroke:#333
    style evaluate fill:#ff9,stroke:#333
```

### Content Generation Pipeline

Sequential graph that generates knowledge base articles from a topic slug. Uses DeepSeek Reasoner (local or remote) through four LLM passes.

```mermaid
graph TD
    START((Start)) --> research
    research --> outline
    outline --> draft
    draft --> review
    review --> save
    save --> END((End))

    style research fill:#9cf,stroke:#333
    style outline fill:#ff9,stroke:#333
    style draft fill:#bbf,stroke:#333
    style review fill:#fbb,stroke:#333
    style save fill:#bfb,stroke:#333
```

### RAG Pipeline

Query routing classifies intent (keyword vs conceptual), then retrieves via the best method (FTS/vector/hybrid), formats context, and generates an answer.

```mermaid
graph TD
    START((Start)) --> route_query
    route_query -->|"classify intent"| retrieve
    retrieve -->|"FTS / vector / hybrid"| format_context
    format_context --> generate
    generate --> END((End))

    style route_query fill:#ff9,stroke:#333
    style retrieve fill:#9cf,stroke:#333
    style generate fill:#bbf,stroke:#333
```

## Directory Structure

```
apps/knowledge/
├── app/                    # Next.js App Router
│   ├── [slug]/page.tsx     # Lesson pages (SSG) — non-AWS slugs only
│   ├── aws/page.tsx        # AWS hub page (/aws)
│   ├── aws/[slug]/page.tsx # AWS deep-dive pages (/aws/lambda-serverless, etc.)
│   ├── api/chat/           # Streaming chat endpoint
│   └── api/research/       # Research endpoints
├── components/             # React components
│   ├── search.tsx          # Cmd+K full-text search
│   ├── audio-player.tsx    # TTS audio playback
│   ├── toc.tsx             # Auto-generated ToC
│   └── ...
├── content/                # 88 markdown lesson files
├── src/db/
│   ├── index.ts            # Neon serverless client
│   └── schema.ts           # Drizzle schema (19 tables, incl. external_courses + lesson_courses for Class Central)
├── lib/
│   ├── articles.ts         # Lesson data layer — Lesson interface includes url field;
│   │                       # exports AWS_DEEP_DIVE_SLUGS and getUrlPath()
│   ├── data.ts             # DB/filesystem adapter — re-exports AWS_DEEP_DIVE_SLUGS, getUrlPath
│   ├── db/queries.ts       # DB query layer
│   └── actions/            # Server actions
├── backend/                # LangGraph content generation (Python)
│   ├── graph/              # research → outline → draft → review → quality_check [→ revise] → save
│   └── tests/              # 33 pytest tests
├── evals/                  # Python eval suite (DeepEval)
├── scripts/seed.ts         # DB seeder (lessons from markdown)
├── scripts/seed-courses.ts # Class Central course catalog seeder
└── sql/setup.sql           # Neon setup (FTS, RPCs, mat views)
```

## Dev

```bash
pnpm dev          # start on :3006
pnpm db:push      # sync schema to Neon
pnpm db:studio    # open Drizzle Studio
pnpm seed         # seed DB from markdown files
pnpm seed:courses # seed Class Central course catalog
pnpm generate -- prompt-caching            # generate article via LangGraph
pnpm generate:dry -- prompt-caching        # preview without saving
pnpm generate -- prompt-caching --model deepseek-reasoner  # use specific model
pnpm generate:missing                      # list articles without content files
pnpm generate:batch                        # generate all missing articles
pnpm generate:test                         # run backend pytest suite (33 tests)
pnpm eval         # run all evals
pnpm eval:agent   # test agent behavior only
```

### Environment

```env
DATABASE_URL=           # Neon connection string
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
NEXT_PUBLIC_R2_DOMAIN=  # audio CDN domain
WORKER_URL=             # Cloudflare Worker endpoint
NEXT_PUBLIC_DATA_SOURCE= # "db" | "fs"
```

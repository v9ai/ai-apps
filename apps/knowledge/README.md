# Knowledge

AI engineering educational platform — 55 lessons across 7 categories with search, audio, knowledge graphs, and learning analytics.

## Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Database**: Neon PostgreSQL + pgvector
- **ORM**: Drizzle ORM
- **UI**: Radix UI Themes
- **AI**: OpenAI, DeepSeek
- **Deployment**: Vercel

## Architecture

```mermaid
graph TD
    subgraph Client
        Browser["Browser"]
    end

    subgraph Next.js["Next.js App (Port 3006)"]
        Pages["Pages\n/[slug]"]
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

    subgraph Agents
        A1[Agent Architectures]
        A2[Tool Use]
        A3[Memory Systems]
    end

    T1 -->|prerequisite| T3
    T1 -->|prerequisite| T4
    T2 -->|prerequisite| T1
    T3 -->|builds_on| R1
    R3 -->|prerequisite| R1
    R1 -->|prerequisite| R2
    T1 -->|prerequisite| A1
    A1 -->|related| A2
    A1 -->|related| A3
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

## Directory Structure

```
apps/knowledge/
├── app/                    # Next.js App Router
│   ├── [slug]/page.tsx     # Lesson pages (SSG)
│   ├── api/chat/           # Streaming chat endpoint
│   └── api/research/       # Research endpoints
├── components/             # React components
│   ├── search.tsx          # Cmd+K full-text search
│   ├── audio-player.tsx    # TTS audio playback
│   ├── toc.tsx             # Auto-generated ToC
│   └── ...
├── content/                # 55 markdown lesson files
├── src/db/
│   ├── index.ts            # Neon serverless client
│   └── schema.ts           # Drizzle schema (17 tables)
├── lib/
│   ├── data.ts             # DB/filesystem adapter
│   ├── db/queries.ts       # DB query layer
│   └── actions/            # Server actions
├── evals/                  # Python eval suite (DeepEval)
├── scripts/seed.ts         # DB seeder
└── sql/setup.sql           # Neon setup (FTS, RPCs, mat views)
```

## Dev

```bash
pnpm dev          # start on :3006
pnpm db:push      # sync schema to Neon
pnpm db:studio    # open Drizzle Studio
pnpm seed         # seed DB from markdown files
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

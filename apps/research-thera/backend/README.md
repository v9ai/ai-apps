# research-thera-agent

Therapeutic research and story generation agent — LangGraph port of the Rust `research` crate, specialized for evidence-based therapeutic interventions.

## Architecture

```mermaid
graph TB
    CLI["CLI (argparse)"] --> TC[TherapyContext]
    TC --> LG["LangGraph ReAct Agent<br/>(DeepSeek Chat)"]
    TC --> QG["Query Generator<br/>(3–6 diverse queries)"]

    QG --> LG

    LG -->|"search_papers"| FB["Fallback Chain<br/>(via research-client)"]
    LG -->|"get_paper_detail"| SS3["Semantic Scholar<br/>Detail API"]
    LG -->|"save_research_papers"| Neon[(Neon PostgreSQL)]

    FB --> OA["OpenAlex<br/>214M+ papers"]
    FB --> CR["Crossref<br/>DOI metadata"]
    FB --> SS["Semantic Scholar<br/>Rich metadata"]

    OA -->|normalize| NL[Normalized Papers]
    CR -->|normalize| NL
    SS -->|normalize| NL

    NL --> RR["Cross-Encoder Reranker<br/>(ms-marco-MiniLM)"]
    RR --> LG

    LG --> MD[Markdown Summary]
    LG --> Neon

    style OA fill:#4a9eff,color:#fff
    style CR fill:#ff6b6b,color:#fff
    style SS fill:#ffa726,color:#fff
    style LG fill:#7c4dff,color:#fff
    style Neon fill:#00c853,color:#fff
    style RR fill:#ff4081,color:#fff
```

## Provider Fallback Chain

The system queries academic databases in priority order, returning results from the first provider that responds successfully:

```mermaid
flowchart LR
    Q[Query] --> OA{OpenAlex}
    OA -->|results| N1[Normalize + Return]
    OA -->|empty / error| CR{Crossref}
    CR -->|results| N2[Normalize + Return]
    CR -->|empty / error| SS{Semantic Scholar}
    SS --> N3[Normalize + Return]

    style OA fill:#4a9eff,color:#fff
    style CR fill:#ff6b6b,color:#fff
    style SS fill:#ffa726,color:#fff
```

| Provider | Endpoint | Rate Limit | Auth | Strengths |
|----------|----------|------------|------|-----------|
| **OpenAlex** | `api.openalex.org/works` | None | None | 214M+ papers, inverted abstract index |
| **Crossref** | `api.crossref.org/works` | None | None | DOI authority, full metadata |
| **Semantic Scholar** | `api.semanticscholar.org/graph/v1` | Yes (higher w/ key) | Optional `x-api-key` | TLDRs, PDFs, fields of study |

All providers normalize to a common schema:

```python
{"title", "authors", "year", "abstract", "doi", "url", "citation_count"}
```

## ReAct Agent Workflow

```mermaid
sequenceDiagram
    participant U as CLI / Neon URL
    participant TC as TherapyContext
    participant A as DeepSeek Chat ReAct Agent
    participant S as search_papers
    participant R as Cross-Encoder Reranker
    participant D as get_paper_detail
    participant P as save_research_papers
    participant DB as Neon PostgreSQL

    U->>TC: Build context (goal, issues, population)
    TC->>A: Structured prompt + query suggestions

    loop 3 search calls (different angles)
        A->>S: search_papers(query, limit=10)
        S->>S: Fetch 3x candidates via fallback chain
        S->>R: Rerank by semantic relevance
        R-->>A: Top 10 ranked papers
    end

    A->>D: get_paper_detail(DOI) — up to 2 papers
    D-->>A: Full abstract + TLDR

    A->>P: save_research_papers(curated JSON)
    P->>DB: Upsert deduplicated papers
    P-->>A: Saved N, skipped M

    A-->>U: Markdown summary (< 500 words)
```

## Semantic Reranking Pipeline

Papers go through a cross-encoder reranking step between search and extraction:

```mermaid
flowchart TD
    S["search_papers_with_fallback()<br/>Fetch 3× limit candidates"] --> B["Build passages<br/>(title + abstract[:1000])"]
    B --> CE["Cross-Encoder Scoring<br/>ms-marco-MiniLM-L-6-v2<br/>(22M params, ~15ms/pair)"]
    CE --> Sort["Sort by descending score"]
    Sort --> TopK["Return top K papers"]

    style CE fill:#ff4081,color:#fff
```

## Confidence & Quality Scoring

Papers are filtered and scored before persistence:

```mermaid
flowchart TD
    P[Paper Candidate] --> F1{Abstract exists<br/>and ≥ 50 chars?}
    F1 -->|No| Skip[Skip]
    F1 -->|Yes| F2{Abstract is<br/>placeholder?}
    F2 -->|Yes| Skip
    F2 -->|No| Score[Calculate Confidence]

    Score --> Base["Base: 40 pts"]
    Score --> Ab{"Abstract ≥ 100 chars?<br/>+25 pts"}
    Score --> Kf{"≥ 2 key findings?<br/>+20 pts"}
    Score --> Tt{"≥ 1 technique?<br/>+15 pts"}

    Base --> Total["Confidence: 40–100"]
    Ab --> Total
    Kf --> Total
    Tt --> Total
    Total --> DB[(Neon PostgreSQL)]

    style Skip fill:#ff5252,color:#fff
    style Total fill:#00c853,color:#fff
```

## Story Generation Flow

```mermaid
flowchart TD
    FB[Feedback ID] --> Load["load_context()<br/>Feedback + issues + family member"]
    Load --> SC[StoryContext]
    SC --> Tier{"Age-based tier detection"}

    Tier -->|"0–5"| EC[Early Childhood<br/>15 words/sentence max]
    Tier -->|"6–9"| MC[Middle Childhood]
    Tier -->|"10–13"| EA[Early Adolescence]
    Tier -->|"14–17"| LA[Late Adolescence]
    Tier -->|"18+"| AD[Adult<br/>20 words/sentence max]

    EC & MC & EA & LA & AD --> Prompt["build_story_prompt()<br/>Audio-first, TTS-compatible"]
    Prompt --> DS["DeepSeek Chat<br/>(streaming)"]
    DS --> TTS["TTS Engine<br/>(Qwen / OpenAI)"]
    TTS --> R2["Cloudflare R2<br/>(S3-compatible)"]
    R2 --> DB[(Neon: stories table)]

    style DS fill:#7c4dff,color:#fff
    style TTS fill:#00bcd4,color:#fff
    style R2 fill:#ff9800,color:#fff
```

## LangGraph Deployable Graphs

Six independent graphs registered in `langgraph.json`:

```mermaid
graph LR
    LG[LangGraph Server] --> R[research]
    LG --> S[story]
    LG --> T[tts]
    LG --> DA[deep_analysis]
    LG --> PA[parent_advice]
    LG --> H[habits]

    R --- G1["graph.py<br/>ReAct paper search"]
    S --- G2["story_graph.py<br/>Therapeutic stories"]
    T --- G3["tts_graph.py<br/>Audio synthesis"]
    DA --- G4["deep_analysis_graph.py<br/>Structured insights"]
    PA --- G5["parent_advice_graph.py<br/>Parent-focused advice"]
    H --- G6["habits_graph.py<br/>Habit formation"]

    style LG fill:#7c4dff,color:#fff
```

## Modules

| Module | Purpose |
|--------|---------|
| `cli.py` | CLI entry point — subcommand dispatch (`goal`, `support-need`, `query`, `url`, `story`) |
| `graph.py` | Main LangGraph research workflow — ReAct agent (DeepSeek Chat) with paper search, extraction, persistence |
| `research_sources.py` | Thin wrapper around `research-client` — delegates search/normalization/fallback to the shared package |
| `therapy_context.py` | Domain model — `TherapyContext`, `StoryContext`, `IssueData`, query generation, age-based tier detection |
| `deep_analysis_graph.py` | Deep analysis StateGraph — collects issues, observations, journals, characteristics; uses `deepseek_client` |
| `story_graph.py` | Story generation StateGraph — loads feedback context, generates age-appropriate therapeutic audio scripts |
| `parent_advice_graph.py` | Parent-focused advice StateGraph — evidence-grounded parenting recommendations via `deepseek_client` |
| `habits_graph.py` | Habit formation StateGraph — personalized habit plans from goals, issues, and research |
| `tts_graph.py` | TTS StateGraph — Qwen (DashScope) or OpenAI synthesis, chunked text, WAV assembly, R2 upload |
| `embeddings.py` | Re-exports from `research-client` (`all-MiniLM-L6-v2`, 384 dims) + domain-specific text builders |
| `reranker.py` | Cross-encoder semantic reranking (`ms-marco-MiniLM-L-6-v2`, 22M params) |
| `neon.py` | Neon PostgreSQL operations — paper CRUD, embedding storage, deduplication, feedback/issue/story queries |
| `d1.py` | Data models (`Issue`, `FamilyMember`, `ContactFeedback`, `ResearchPaper`) and URL path parser |
| `backfill_embeddings.py` | Batch embedding generation for existing papers (batches of 50) |
| `story.py` | Story model and generation orchestration |

## Evidence Hierarchy

The agent weights papers by evidence level during research synthesis:

```mermaid
graph TD
    MA["Meta-Analysis"] --> SR["Systematic Review"]
    SR --> RCT["RCT"]
    RCT --> CO["Cohort"]
    CO --> CC["Case-Control"]
    CC --> CS["Case Series"]
    CS --> CST["Case Study"]
    CST --> EO["Expert Opinion"]

    style MA fill:#00c853,color:#fff
    style SR fill:#4caf50,color:#fff
    style RCT fill:#8bc34a,color:#000
    style CO fill:#cddc39,color:#000
    style CC fill:#ffeb3b,color:#000
    style CS fill:#ffc107,color:#000
    style CST fill:#ff9800,color:#fff
    style EO fill:#ff5722,color:#fff
```

## CLI Usage

```bash
# Research from inline parameters
research-agent query \
  --therapeutic-type "anxiety" \
  --title "CBT for childhood anxiety" \
  --population "children"

# Research from a goal JSON file
research-agent goal --goal-file path/to/goal.json

# Research from a support need file
research-agent support-need --support-need-file path/to/need.json

# Research via Neon URL path (fetches context from DB, persists results back)
research-agent url /family/x/contacts/y/feedback/1

# Generate therapeutic story from feedback
research-agent story /family/x/contacts/y/feedback/1 \
  --language Romanian --minutes 10

# Print research to stdout as well
research-agent --stdout query --therapeutic-type "sleep" --title "Sleep hygiene"
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | Yes | DeepSeek API key (`deepseek-chat` model) |
| `NEON_DATABASE_URL` | For `url`/`story`/graphs | Neon PostgreSQL connection string |
| `SEMANTIC_SCHOLAR_API_KEY` | No | Semantic Scholar API key (higher rate limits) |
| `DASHSCOPE_API_KEY` | For TTS (Qwen) | Alibaba DashScope API key for Qwen TTS |
| `OPENAI_API_KEY` | For TTS (OpenAI) | OpenAI API key — TTS fallback |
| `R2_ACCOUNT_ID` | For TTS | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | For TTS | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | For TTS | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | For TTS | R2 bucket name (default: `longform-tts`) |
| `R2_PUBLIC_DOMAIN` | For TTS | Public URL for audio assets |

Env is loaded from `.env` via `python-dotenv`.

## Development

```bash
# Install with dev dependencies
uv pip install -e ".[dev]"

# Run tests
pytest

# Run directly
python -m research_agent.cli query --therapeutic-type "anxiety" --title "Test"
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `research-client[ml]` | Shared package — multi-source paper search (OpenAlex/Crossref/Semantic Scholar), embeddings, normalization. The `[ml]` extra pulls in `sentence-transformers` for local embeddings and cross-encoder reranking |
| `langgraph` | Graph-based agent workflows (ReAct for research, StateGraph for story/TTS/analysis) |
| `langchain` + `langchain-openai` | LLM framework — `ChatOpenAI` pointed at DeepSeek's API |
| `openai` | TTS API access (OpenAI voices) |
| `psycopg[binary]` | Neon PostgreSQL async driver |
| `boto3` | Cloudflare R2 (S3-compatible) for audio asset storage |
| `python-dotenv` | Environment variable loading |

The `deep_analysis`, `parent_advice`, and `habits` graphs also import `deepseek_client` from the monorepo's `pypackages/deepseek/` via `sys.path` injection.

Requires Python >= 3.12.

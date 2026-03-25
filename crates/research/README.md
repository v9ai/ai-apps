# research

Multi-model LLM research infrastructure — academic paper discovery across 4 APIs, parallel DeepSeek + Qwen querying, distributed team-based agent orchestration, and AST-based code analysis.

## Architecture

```
                         ┌─────────────┐
                         │  TeamLead   │ ← synthesis + coordination
                         └──────┬──────┘
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │Teammate 1│ │Teammate 2│ │Teammate N│  ← claim tasks, run agents
              └────┬─────┘ └────┬─────┘ └────┬─────┘
                   │            │            │
            ┌──────┴──────┬─────┴─────┬──────┴──────┐
            ▼             ▼           ▼             ▼
     ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐
     │SearchPapers│ │GetDetail │ │GetRecomm.│ │CodeTools│
     └────┬───────┘ └──────────┘ └──────────┘ └─────────┘
          │
     OpenAlex → Crossref → Semantic Scholar (fallback chain)
```

### Data Flow

1. **Binary** defines `Vec<ResearchTask>` with subjects, prompts, and dependency DAG
2. **TeamLead** spawns N `Teammate` workers, a shared `Mailbox`, a `SharedTaskList`, and an optional `Semaphore` rate limiter
3. Each **Teammate** loops: atomically `claim()` the next unblocked task, inject dependency findings as context, build a tool-use `AgentBuilder` with paper + code tools, run the agent loop until completion
4. Completed findings are broadcast via `Mailbox` and incrementally saved to disk (`agent-{id:02}-{subject}.md`)
5. After all tasks complete, **TeamLead** runs a separate synthesis agent that reads all findings and produces a cross-cutting report
6. Output: per-task Markdown files + `synthesis.md` + combined report

### Concurrency Model

```
TeamLead
  ├── JoinSet<Teammate> (N parallel tokio tasks)
  │     ├── SharedTaskList (Arc<Mutex<Vec<ResearchTask>>>)
  │     │     └── claim() — atomic work-stealing with dependency resolution
  │     ├── Semaphore(concurrency) — cross-worker rate limiter for S2 API
  │     │     └── MIN_PERMIT_HOLD = 3s per permit (converts concurrency → throughput)
  │     └── Mailbox (broadcast::channel<TeamMessage>)
  │           └── Finding | StatusUpdate | Error
  └── Monitor task (tokio::spawn)
        └── Subscribes to Mailbox, logs progress, saves results to disk
```

## Modules

### Paper API Clients

| Module | API | Auth | Rate Limit | Notes |
|--------|-----|------|------------|-------|
| `scholar` | Semantic Scholar | Optional API key (`x-api-key`) | Semaphore-based (3s holds) + exponential backoff on 429 | Bulk search (10M results), relevance search (1K results), citations, references, SPECTER2 recommendations |
| `openalex` | OpenAlex | None (mailto for polite pool) | Exponential backoff on 429 (max 3 retries) | Inverted-index abstracts reconstructed on read, 200M+ works |
| `crossref` | Crossref | None (mailto for polite pool) | Exponential backoff on 429 (max 3 retries) | JATS/HTML tag stripping on abstracts, DOI-based lookup |
| `core_api` | CORE | Optional API key (Bearer auth) | Exponential backoff on 429 (max 3 retries, 4^n delay) | Full-text access, 200M+ open-access papers |

Each client provides:
- `new(api_key)` / `with_base_url(url, api_key)` — for testing with `wiremock`
- `search(query, ...)` — keyword search
- `get_work(id)` / `get_paper(id, fields)` — single-item lookup
- All HTTP via `reqwest` with 30s timeout

#### Semantic Scholar Client (extended API)

```rust
pub struct SemanticScholarClient { .. }

impl SemanticScholarClient {
    pub fn new(api_key: Option<&str>) -> Self
    pub fn with_rate_limiter(api_key: Option<&str>, limiter: Arc<Semaphore>) -> Self

    // Search endpoints
    pub async fn search_bulk(&self, query, fields, year, min_citations, sort, limit) -> Result<BulkSearchResponse>
    pub async fn search(&self, query, fields, limit, offset) -> Result<SearchResponse>

    // Single paper
    pub async fn get_paper(&self, paper_id, fields) -> Result<Paper>  // S2PaperId, DOI:, arXiv:, PMID:, ACL:

    // Citation graph
    pub async fn get_citations(&self, paper_id, fields, limit) -> Result<CitationsResponse>
    pub async fn get_references(&self, paper_id, fields, limit) -> Result<ReferencesResponse>

    // SPECTER2 similarity
    pub async fn get_recommendations(&self, paper_id, fields, limit) -> Result<RecommendationsResponse>
}
```

**Field constants:**
- `SEARCH_FIELDS` — for search endpoints (no `tldr` or `influentialCitationCount`)
- `PAPER_FIELDS_FULL` — for single-paper detail (includes `tldr`, `influentialCitationCount`)
- `PAPER_FIELDS_BRIEF` — lightweight subset for nested objects

#### Error Handling

All four clients share the same error pattern:

```rust
pub enum Error {
    Http(reqwest::Error),                    // network/connection failures
    Api { status: u16, message: String },    // non-2xx responses (except 429)
    RateLimited { retry_after: u64 },        // 429 after exhausting retries
    Json(serde_json::Error),                 // deserialization failures
}
```

### Unified Paper Model

All four API clients convert to a common `ResearchPaper` via `From` trait implementations:

```rust
pub enum PaperSource { SemanticScholar, OpenAlex, Crossref, Core }

pub struct ResearchPaper {
    pub title: String,
    pub abstract_text: Option<String>,
    pub authors: Vec<String>,
    pub year: Option<u32>,
    pub doi: Option<String>,
    pub citation_count: Option<u64>,
    pub url: Option<String>,
    pub pdf_url: Option<String>,
    pub source: PaperSource,
    pub source_id: String,
    pub fields_of_study: Option<Vec<String>>,
}
```

**Conversion details:**
- `From<scholar::Paper>` — extracts `open_access_pdf.url`, maps `paper_id` to `source_id`
- `From<openalex::Work>` — calls `reconstruct_abstract()` to rebuild from inverted index, resolves PDF via `primary_location` then `open_access.oa_url` fallback
- `From<crossref::CrossrefWork>` — strips JATS/HTML tags from abstracts (iterative `<...>` removal), builds full names from `given`/`family`, extracts year from `published` date parts
- `From<core_api::CoreWork>` — resolves PDF via `download_url` then `source_fulltext_urls[0]`

### LLM Provider Abstraction (`agent`)

Re-exports the `deepseek` crate's agent framework and adds provider-polymorphic builders:

```rust
pub enum LlmProvider {
    DeepSeek { api_key: String, base_url: String },
    Qwen { api_key: String, model: String },
}

pub fn agent_builder(api_key, model) -> AgentBuilder<ReqwestClient>       // DeepSeek
pub fn qwen_agent_builder(api_key, model) -> AgentBuilder<ReqwestClient>  // Qwen via DashScope
pub fn provider_agent_builder(provider: &LlmProvider) -> AgentBuilder<ReqwestClient>
```

`qwen_agent_builder` sets base URL to `https://dashscope-intl.aliyuncs.com/compatible-mode`.

Also re-exports: `Tool`, `ToolDefinition`, `AgentBuilder`, `DeepSeekAgent`, `ReqwestClient`, `HttpClient`.

### Multi-Model Research (`dual`)

Parallel multi-provider querying with automatic provider detection:

```rust
pub struct MultiModelResearcher { .. }
impl MultiModelResearcher {
    pub fn from_env() -> Result<Self>        // auto-detect DEEPSEEK_API_KEY / DASHSCOPE_API_KEY
    pub fn provider_names(&self) -> Vec<&str>
    pub async fn query(&self, system: &str, question: &str) -> Result<MultiResponse>
}

pub struct MultiResponse {
    pub question: String,
    pub responses: Vec<ModelResponse>,       // parallel results from all configured models
}

pub struct ModelResponse {
    pub model: String,
    pub content: String,
    pub reasoning: String,                   // DeepSeek Reasoner chain-of-thought (empty for others)
}
```

**Synthesis functions:**
- `format_multi_unified_synthesis(resp)` — picks the longest successful (non-error) response
- `format_unified_synthesis(resp)` — dual-model version, picks longer of two
- `format_prep_document(title, responses)` — renders all responses as Markdown with collapsible chain-of-thought

**Backward compatibility:**
```rust
pub struct DualModelResearcher { .. }        // wraps MultiModelResearcher
impl DualModelResearcher {
    pub fn from_env() -> Result<Self>
    pub async fn query(&self, system, question) -> Result<DualResponse>
    pub async fn query_all(&self, system, questions) -> Vec<DualResponse>  // sequential to avoid rate limits
}
```

**Environment variables:**
| Variable | Provider | Required |
|----------|----------|----------|
| `DEEPSEEK_API_KEY` | DeepSeek Reasoner | At least one |
| `DASHSCOPE_API_KEY` | Qwen (DashScope) | At least one |
| `QWEN_MODEL` | Qwen model override | No (default: `qwen-max`) |

### Embedding Re-ranking (`embeddings`)

Semantic re-ranking of search results using Qwen `text-embedding-v4`:

```rust
pub struct EmbeddingRanker { .. }
impl EmbeddingRanker {
    pub fn new(api_key: &str) -> Self
    pub fn with_client(client: qwen::Client) -> Self    // for testing with mock servers
    pub async fn rank_papers(&self, query: &str, papers: Vec<ResearchPaper>) -> Result<Vec<(ResearchPaper, f32)>>
}
```

**How it works:**
1. Builds text representations: `"{title} {abstract}"` for each paper
2. Embeds query + all papers in a single batch request
3. Computes cosine similarity between query embedding and each paper embedding
4. Returns papers sorted by similarity score (descending)
5. Empty input returns empty output (no API call)

### Agent Tools (`tools`)

Three `Tool`-trait implementations for the DeepSeek agent loop:

| Tool | Name | Description |
|------|------|-------------|
| `SearchPapers` | `search_papers` | Keyword search with fallback chain (OpenAlex → Crossref → Semantic Scholar), optional embedding re-ranking |
| `GetPaperDetail` | `get_paper_detail` | Full paper details by ID (S2PaperId, DOI, arXiv, PMID, ACL). DOI-based IDs try OpenAlex/Crossref first |
| `GetRecommendations` | `get_recommendations` | SPECTER2-based similar papers from Semantic Scholar |

**Search configuration:**
```rust
pub struct SearchToolConfig {
    pub default_limit: u32,              // 8
    pub abstract_max_chars: usize,       // 350
    pub max_authors: usize,              // 4
    pub include_fields_of_study: bool,   // true
    pub include_venue: bool,             // false
    pub search_description: Option<String>,   // override tool description for LLM
    pub detail_description: Option<String>,   // override detail tool description
}
```

**Builder pattern for SearchPapers:**
```rust
SearchPapers::new(scholar)                                         // S2 only
SearchPapers::with_config(scholar, config)                         // custom config
SearchPapers::with_fallback(scholar, config, fallback_clients)     // + OpenAlex/Crossref
    .with_embedding_ranker(Arc::new(ranker))                       // + semantic re-ranking
```

**Fallback chain behavior:**
1. If `FallbackClients` configured: try OpenAlex first (no rate limits)
2. If OpenAlex returns empty: try Crossref
3. If both empty/error: fall back to Semantic Scholar `search_bulk`
4. If no fallback configured: use Semantic Scholar directly

**Utility functions:**
- `format_research_papers(papers, config, query, total)` — renders papers as JSON for agent consumption
- `format_paper_detail(paper)` — renders single paper as detailed JSON

### Team Orchestration (`team`)

#### Task System

```rust
pub enum TaskStatus { Pending, InProgress, Completed, Failed }

pub struct ResearchTask {
    pub id: usize,
    pub subject: String,
    pub description: String,
    pub preamble: String,              // system prompt for this task's agent
    pub status: TaskStatus,
    pub owner: Option<String>,
    pub dependencies: Vec<usize>,      // task IDs this depends on
    pub result: Option<String>,
}

pub struct SharedTaskList { .. }       // Arc<Mutex<Vec<ResearchTask>>>
impl SharedTaskList {
    pub fn new(tasks: Vec<ResearchTask>) -> Self
    pub fn claim(&self, worker_id: &str) -> Option<ResearchTask>  // atomic claim of next unblocked task
    pub fn complete(&self, task_id, result)
    pub fn fail(&self, task_id, error)
    pub fn completed_findings(&self) -> Vec<(String, String)>
    pub fn completed_findings_for(&self, dep_ids: &[usize]) -> Vec<(String, String)>
    pub fn completed_tasks(&self) -> Vec<(usize, String, String)>
    pub fn all_done(&self) -> bool
    pub fn resume_from_dir(&self, dir: &str) -> usize   // load pre-existing results from disk
    pub fn reset_failed(&self) -> usize                   // retry failed tasks
}
```

**Dependency resolution:**
- `claim()` only returns tasks whose dependencies are all in terminal state (Completed **or** Failed)
- Failed tasks count as resolved so downstream synthesis can proceed with partial results
- Workers poll with 2s sleep when all unclaimed tasks are dependency-blocked

**Resume from disk:**
- Scans for files matching `agent-{id:02}-{subject}.md` or `agent-{id:03}-{subject}.md`
- Non-empty files mark corresponding tasks as Completed with file contents as result
- Enables crash recovery: restart a run and only re-execute failed/unfinished tasks

#### Teammate

```rust
pub struct TeammateConfig {
    pub provider: LlmProvider,
    pub scholar_key: Option<String>,
    pub code_analysis: Option<CodeAnalysisConfig>,
    pub tool_config: Option<SearchToolConfig>,
    pub scholar_rate_limiter: Option<Arc<Semaphore>>,
    pub fallback: Option<FallbackClients>,
}
```

**Work loop per teammate:**
1. `claim()` next available task from `SharedTaskList`
2. Broadcast `StatusUpdate` via mailbox
3. Build context from dependency findings (only deps, not all completed tasks)
4. Truncate context to `MAX_CONTEXT_CHARS` (400K chars, ~100K tokens)
5. Build `AgentBuilder` with preamble + paper tools + optional code tools
6. Run agent with `"{description}{context_section}"` prompt
7. On success: `complete()` task, broadcast `Finding`
8. On failure: `fail()` task, broadcast `Error`
9. Loop until `all_done()`

#### TeamLead

```rust
pub struct TeamConfig {
    pub team_size: usize,
    pub provider: LlmProvider,
    pub scholar_key: Option<String>,
    pub code_root: Option<PathBuf>,             // enables code analysis tools
    pub synthesis_preamble: Option<String>,
    pub synthesis_prompt_template: Option<String>, // use {count} and {combined} placeholders
    pub tool_config: Option<SearchToolConfig>,
    pub scholar_concurrency: Option<usize>,     // Some(3) recommended with API key
    pub mailto: Option<String>,                 // polite-pool email for OpenAlex/Crossref
    pub output_dir: Option<String>,             // incremental save directory
    pub synthesis_provider: Option<LlmProvider>, // separate provider for synthesis step
}

pub struct TeamResult {
    pub findings: Vec<(usize, String, String)>,  // (task_id, subject, result)
    pub synthesis: String,                        // cross-cutting synthesis report
}
```

**Orchestration flow:**
1. Resume from `output_dir` if prior results exist
2. Spawn `team_size` Teammate tasks into a `JoinSet`
3. Create shared `Semaphore(scholar_concurrency)` for cross-worker rate limiting
4. Always create `FallbackClients` (OpenAlex + Crossref) — `mailto` optional but recommended
5. Start monitor task: subscribe to mailbox, log progress, save results incrementally to disk
6. Wait for all teammates via `JoinSet::join_next()`
7. Synthesize: truncate all findings to 400K chars, run synthesis agent with configurable preamble/template
8. Return `TeamResult` with findings + synthesis

#### Mailbox

Broadcast channel for inter-agent messaging:

```rust
pub enum MessageKind {
    Finding { task_id: usize, summary: String },
    StatusUpdate(String),
    Error(String),
}

pub struct TeamMessage {
    pub from: String,           // worker ID
    pub kind: MessageKind,
    pub timestamp: Instant,
}

pub struct Mailbox { .. }       // wraps broadcast::Sender<TeamMessage>
impl Mailbox {
    pub fn new(capacity: usize) -> Self    // default: 128
    pub fn send(&self, msg: TeamMessage)    // ignores no-receiver errors
    pub fn subscribe(&self) -> broadcast::Receiver<TeamMessage>
}
```

### Code Analysis (`code`)

AST-based code analysis via `ast-grep`:

| Tool | Name | Description |
|------|------|-------------|
| `SearchPattern` | `search_pattern` | Find AST patterns in source code with meta-variable captures (`$VAR` single, `$$$VAR` variadic) |
| `AnalyzeStructure` | `analyze_structure` | Extract functions, structs, classes, traits, enums, impl blocks, type aliases |
| `FindAntiPatterns` | `find_anti_patterns` | Detect curated anti-patterns with rule name and remediation description |

**Configuration:**
```rust
pub struct CodeAnalysisConfig {
    pub root_path: PathBuf,                         // default: "."
    pub max_file_size: usize,                       // default: 100 KB
    pub max_matches: usize,                         // default: 50
    pub allowed_languages: Option<Vec<SupportLang>>, // None = all supported
}
```

**Supported languages:** Rust, TypeScript, TSX, JavaScript, Python, Go, Java, C, C++, Ruby, Swift, Kotlin, C#, JSON, YAML, HTML, CSS.

**Anti-pattern categories:**
| Language | Category | Rules |
|----------|----------|-------|
| Rust | `unwrap_usage` | `unwrap_on_result` |
| Rust | `error_handling` | `unwrap_on_result`, `panic_call` |
| Rust | `unsafe` | unsafe blocks |
| TypeScript/TSX | `error_handling` | error handling issues |
| TypeScript/TSX | `console` | `console.log` usage |

**All three tools support two modes:**
- **File mode** — walks directory tree, skips `.hidden`, `node_modules`, `target`, `dist`, `build`, `__pycache__`
- **Inline mode** — pass `code` parameter to analyze a snippet directly (useful for agent-generated code review)

## Binaries (19)

Each binary is a domain-specific research conductor using the team framework:

| Binary | Domain | Key Config |
|--------|--------|------------|
| `healthcare-research` | AI in healthcare (diagnosis, treatment, clinical workflows) | Multi-tier tasks, stack-aware prompts |
| `therapeutic-research` | Evidence-based interventions | Research-Thera app support |
| `eval-therapeutic` | Offline eval with graders (citation accuracy, grounding) | Quality assessment |
| `condition-research` | Mental health conditions (anxiety, depression, ADHD) | Per-condition tasks |
| `characteristic-research` | Psychological/emotional characteristics | Trait analysis |
| `eval-characteristic` | Offline eval with Python graders | Weighted scoring |
| `calm-parent-research` | Parenting + mental health strategies | Parent support |
| `law-research` | AI + legal tech (contracts, discovery, compliance) | Legal landscape |
| `real-estate-research` | AI in real estate (valuation, PropTech, CV) | 10 domains |
| `knowledge-research` | AI/ML for learning (cognitive science, adaptive systems) | EdTech |
| `scalping-research` | High-frequency trading strategies | Trading |
| `bear-market-trading` | Bear market strategies | Downturn trading |
| `interview-prep` | Behavioral interview preparation | Multi-level |
| `code-research` | Codebase analysis + paper research hybrid | ast-grep + papers |
| `todo-research` | Todo app + productivity | App-focused |
| `todo-sdd` | SDD applied to todo app development | Spec patterns |
| `tts-research` | Text-to-speech technology | TTS landscape |
| `qwen-investigate` | Live system state investigation | Reads local FS |

**Default binary** (`src/main.rs`): SDD (Spec-Driven Development) research — 10 tasks covering formal specs, BDD/TDD, API-first, MDE, requirements engineering, CI/CD spec gates, property-based testing, event-driven specs, and AI-assisted spec generation. Task 10 depends on tasks 1 and 2 (dependency DAG).

**Common launch pattern:**
```rust
let lead = TeamLead::new(TeamConfig {
    team_size: 20,
    provider: LlmProvider::DeepSeek { api_key, base_url },
    scholar_key: Some(scholar_key),
    scholar_concurrency: Some(3),
    output_dir: Some("research-output/domain".into()),
    mailto: std::env::var("RESEARCH_MAILTO").ok(),
    ..Default::default()
});
let result = lead.run(research_tasks()).await?;
// Per-task results saved to research-output/agent-{id:02}-{subject}.md
// Synthesis saved to research-output/synthesis.md
```

## Environment Variables

| Variable | Used By | Required |
|----------|---------|----------|
| `DEEPSEEK_API_KEY` | Agent framework, dual-model researcher | Yes (for agent-based runs) |
| `DEEPSEEK_BASE_URL` | Agent framework | No (default: `https://api.deepseek.com`) |
| `DASHSCOPE_API_KEY` | Qwen chat + embeddings | No (enables Qwen provider) |
| `QWEN_MODEL` | Dual-model researcher | No (default: `qwen-max`) |
| `SEMANTIC_SCHOLAR_API_KEY` | Semantic Scholar client | No (1 req/s with key, shared pool without) |
| `RESEARCH_MAILTO` | OpenAlex/Crossref polite pool | No (higher rate limits when set) |

## Implementation Details

- **Fallback hierarchy** — SearchPapers tries OpenAlex → Crossref → Semantic Scholar for graceful degradation
- **Rate limiting** — Semaphore-based permit holding (`MIN_PERMIT_HOLD = 3s`) converts concurrency into throughput throttling; with `Semaphore(N)` you get max N requests per 3 seconds
- **Exponential backoff** — all four API clients retry on HTTP 429 with exponential delays (2^n seconds for S2/OpenAlex/Crossref, 4^n for CORE), max 3 retries
- **Dependency-aware claiming** — failed tasks count as "resolved" so downstream synthesis can proceed with partial results
- **Context truncation** — dependency findings truncated to 400K chars (~100K tokens) to stay within model context limits; each entry gets proportional budget, over-budget entries are trimmed with `[...truncated...]` suffix
- **Incremental persistence** — results saved to disk as they complete, enabling resume-from-failure via `resume_from_dir()` (matches both 2-digit and 3-digit padded filenames)
- **Abstract reconstruction** — OpenAlex inverted-index abstracts rebuilt to plain text at read time
- **JATS tag stripping** — Crossref abstracts have XML/HTML tags iteratively removed
- **Polite pool** — OpenAlex + Crossref accept optional `mailto` for higher rate limits; user-agent set to `research-crate/0.1 (mailto:{email})`
- **Synthesis provider split** — `synthesis_provider` allows using a different (potentially cheaper/faster) model for the final synthesis step
- **Custom synthesis templates** — `synthesis_prompt_template` supports `{count}` and `{combined}` placeholders for domain-specific synthesis prompts

## Testing

```bash
# Unit tests (code analysis, cosine similarity, dedup, synthesis selection)
cargo test --lib

# Integration tests (requires network — hits live APIs)
cargo test --test integration -- --test-threads=1

# Fallback and retry tests (uses wiremock, no network)
cargo test --test fallback
cargo test --test retry
cargo test --test provider

# All tests
cargo test
```

**Test suites:**
| File | Tests | External |
|------|-------|----------|
| `tests/integration.rs` | Live API calls (OpenAlex, Crossref, CORE, S2), paper conversion, dedup, synthesis selection | Yes (serial) |
| `tests/fallback.rs` | Fallback chain (S2→OA→CR), resume from disk, `reset_failed()`, format functions | No (wiremock) |
| `tests/retry.rs` | Exponential backoff on 429, max retry exhaustion, non-429 no-retry | No (wiremock) |
| `tests/provider.rs` | `LlmProvider` construction, agent builder, embedding ranker with mock, SearchPapers + ranker e2e | No (wiremock) |
| `tests/characteristic.rs` | Domain-specific characteristic research tests | — |
| `src/code/tools.rs` | 20+ tests: file collection, hidden/node_modules skip, SearchPattern, AnalyzeStructure, FindAntiPatterns, inline/file modes, max_matches, tool uniqueness | No |
| `src/embeddings.rs` | Cosine similarity (identical, orthogonal, zero vectors) | No |

## Dependencies

| Crate | Role |
|-------|------|
| `deepseek` (agent feature) | Agent framework (Tool trait, AgentBuilder, agent loop) + DeepSeek HTTP client |
| `qwen` | Qwen chat completions + text-embedding-v4 embeddings |
| `sdd` | SDD pipeline integration |
| `ast-grep-core` / `ast-grep-language` | Tree-sitter-based code pattern matching |
| `reqwest` (json feature) | HTTP client for all 4 paper APIs |
| `tokio` (full) | Async runtime, JoinSet, Semaphore, broadcast channel |
| `serde` / `serde_json` | Serialization for API types and tool I/O |
| `anyhow` / `thiserror` | Error handling (anyhow for binaries, thiserror for client errors) |
| `tracing` / `tracing-subscriber` | Structured logging |
| `walkdir` | Recursive file traversal for code analysis |
| `async-trait` | Async methods in Tool trait |
| `dotenvy` | `.env` file loading in binaries |

**Dev dependencies:** `tempfile`, `serial_test` (serialize live API tests), `wiremock` (HTTP mocking)

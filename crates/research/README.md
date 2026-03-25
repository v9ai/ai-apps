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

## Modules

### Paper API Clients

| Module | API | Auth | Rate Limit | Notes |
|--------|-----|------|------------|-------|
| `scholar` | Semantic Scholar | Optional API key | Semaphore-based (3s holds) | Bulk search (10M results), SPECTER2 recommendations |
| `openalex` | OpenAlex | None (mailto for polite pool) | 429 backoff | Inverted-index abstracts, reconstructed on read |
| `crossref` | Crossref | None (mailto for polite pool) | 429 backoff | JATS/HTML tag stripping |
| `core_api` | CORE | Optional API key | — | Full-text access, bearer auth |

### Unified Paper Model

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
// From<scholar::Paper>, From<openalex::Work>, From<crossref::CrossrefWork>, From<core_api::CoreWork>
```

### LLM Provider Abstraction (`agent`)

```rust
pub enum LlmProvider {
    DeepSeek { api_key: String, base_url: String },
    Qwen { api_key: String, model: String },
}

pub fn agent_builder(api_key, model) -> AgentBuilder<ReqwestClient>       // DeepSeek
pub fn qwen_agent_builder(api_key, model) -> AgentBuilder<ReqwestClient>  // Qwen via DashScope
pub fn provider_agent_builder(provider: &LlmProvider) -> AgentBuilder<ReqwestClient>
```

### Multi-Model Research (`dual`)

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

pub struct DualModelResearcher { .. }        // backward-compat wrapper
pub fn format_prep_document(title, responses) -> String
pub fn format_unified_synthesis(resp) -> String  // picks longest successful response
```

### Embedding Re-ranking (`embeddings`)

```rust
pub struct EmbeddingRanker { .. }  // uses Qwen text-embedding-v4
impl EmbeddingRanker {
    pub fn new(api_key: &str) -> Self
    pub async fn rank_papers(&self, query: &str, papers: Vec<ResearchPaper>) -> Result<Vec<(ResearchPaper, f32)>>
}
```

### Agent Tools (`tools`)

Three `Tool`-trait implementations for the DeepSeek agent loop:

| Tool | Description |
|------|-------------|
| `SearchPapers` | Keyword search with fallback chain (OpenAlex → Crossref → Semantic Scholar), optional embedding re-ranking |
| `GetPaperDetail` | Full paper details by ID (S2PaperId, DOI, arXiv, PMID, ACL) |
| `GetRecommendations` | SPECTER2-based similar papers from Semantic Scholar |

```rust
pub struct SearchToolConfig {
    pub default_limit: u32,         // 8
    pub abstract_max_chars: usize,  // 350
    pub max_authors: usize,         // 4
    pub include_fields_of_study: bool,
    pub include_venue: bool,
}
```

### Team Orchestration (`team`)

**Task System:**
```rust
pub struct ResearchTask {
    pub id: usize,
    pub subject: String,
    pub description: String,
    pub preamble: String,              // system prompt override
    pub status: TaskStatus,            // Pending | InProgress | Completed | Failed
    pub owner: Option<String>,
    pub dependencies: Vec<usize>,      // task IDs this depends on
    pub result: Option<String>,
}

pub struct SharedTaskList { .. }       // Arc<Mutex<Vec<ResearchTask>>>
impl SharedTaskList {
    pub fn claim(&self, worker_id: &str) -> Option<ResearchTask>  // atomic claim of next unblocked task
    pub fn complete(&self, task_id, result)
    pub fn fail(&self, task_id, error)
    pub fn resume_from_dir(&self, dir) -> usize   // load pre-existing results from disk
    pub fn reset_failed(&self) -> usize            // retry failed tasks
}
```

**Teammate:** Claims tasks, builds context from dependency findings (truncated to 400K chars), runs agent with SearchPapers/GetPaperDetail/GetRecommendations + optional code tools.

**TeamLead:**
```rust
pub struct TeamConfig {
    pub team_size: usize,
    pub provider: LlmProvider,
    pub scholar_key: Option<String>,
    pub code_root: Option<PathBuf>,
    pub synthesis_preamble: Option<String>,
    pub tool_config: Option<SearchToolConfig>,
    pub scholar_concurrency: Option<usize>,
    pub mailto: Option<String>,
    pub output_dir: Option<String>,
    pub synthesis_provider: Option<LlmProvider>,
}

pub struct TeamResult {
    pub findings: Vec<(usize, String, String)>,  // (task_id, subject, result)
    pub synthesis: String,
}
```

Orchestrates: spawn teammates → shared rate limiter → monitor mailbox → save incrementally → synthesize cross-cutting report.

**Mailbox:** Broadcast channel for inter-agent messaging (`Finding`, `StatusUpdate`, `Error`).

### Code Analysis (`code`)

AST-based code analysis via `ast-grep`:

| Tool | Description |
|------|-------------|
| `SearchPattern` | Find AST patterns in source code with meta-variable captures |
| `AnalyzeStructure` | Extract functions, classes, traits from codebase |
| `FindAntiPatterns` | Detect common anti-patterns with remediation advice |

Supports: Rust, TypeScript, JavaScript, Python, Go, Java, C, C++, Ruby, Swift, Kotlin, C#, JSON, YAML, HTML, CSS.

## Binaries (19)

Each binary is a domain-specific research conductor using the team framework:

| Binary | Domain | Key Config |
|--------|--------|------------|
| `healthcare-research` | AI in healthcare (diagnosis, treatment, clinical workflows) | Multi-tier tasks |
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

**Common launch pattern:**
```rust
let lead = TeamLead::new(TeamConfig {
    team_size: 20,
    provider: LlmProvider::DeepSeek { api_key, base_url },
    scholar_key: Some(scholar_key),
    scholar_concurrency: Some(3),
    output_dir: Some("research-output/domain".into()),
    ..Default::default()
});
let result = lead.run(research_tasks()).await?;
// Per-task results saved to research-output/agent-{id:02}-{subject}.md
// Synthesis saved to research-output/synthesis.md
```

## Implementation Details

- **Fallback hierarchy** — SearchPapers tries OpenAlex → Crossref → Semantic Scholar for graceful degradation
- **Rate limiting** — Semaphore-based permit holding (MIN_PERMIT_HOLD = 3s) converts concurrency into throughput throttling
- **Dependency-aware claiming** — failed tasks count as "resolved" so downstream synthesis can proceed with partial results
- **Context truncation** — dependency findings truncated to 400K chars to stay within model limits
- **Incremental persistence** — results saved to disk as they complete, enabling resume-from-failure
- **Abstract reconstruction** — OpenAlex inverted-index abstracts rebuilt to plain text at read time
- **Polite pool** — OpenAlex + Crossref accept optional `mailto` for higher rate limits

## Dependencies

| Crate | Role |
|-------|------|
| `deepseek` (agent feature) | Agent framework + DeepSeek client |
| `qwen` | Qwen embeddings + chat |
| `sdd` | SDD pipeline integration |
| `ast-grep-core` / `ast-grep-language` | Code pattern matching |
| `reqwest` | HTTP client |
| `walkdir` | File traversal |
| `tokio` | Async runtime |

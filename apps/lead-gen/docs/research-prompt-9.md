# Research Prompt 9 — Novelty Hunt
## 2025–2026 Research Frontier (Papers Not Yet in the Docs)

**Module**: `docs/08-novelty.md`
**Research Crate**: `crates/research`
**Focus**: Very recent papers (2025–2026) that are NOT yet documented, across all pipeline modules

---

## Research Mission

`docs/08-novelty.md` already documents 90+ novel techniques from late 2025/early 2026.
This prompt finds papers **published after the last doc update** or in venues not yet scanned.
The goal is to discover breakthrough techniques that should be added to the novelty doc.

**Known already-documented techniques** (skip these, don't re-find them):
- RL Crawler: Craw4LLM, QMin, LARL, ARB, WebDreamer, OpAgent, M2-CMAB, DISCOVER, WebRL
- Extraction: AXE, NuNER Zero, SeNER, KGGen, CPTuning, ScrapeGraphAI-100k
- Entity Resolution: DistillER, AnyMatch, OpenSanctions logic-v2, GraLMatch, Eridu, GraphER
- Lead Scoring: TabPFN-2.5, TabM, COP, SmartCal, ModernNCA, Hawkes Attention
- RAG/Report: A-RAG, CRAG/Higress-RAG, CDTA, CoT-RAG, Qwen 3, REFRAG, MA-RAG, GFM-RAG

**Target**: Find papers from January 2026 onward, or from these under-searched areas:
- Rust ML runtimes (Burn 0.20+, CubeCL, mlx-rs)
- CRDT-based multi-device sync for ML pipelines
- New web agent benchmarks beyond WebArena (Mind2Web-2, WebVoyager-v2)
- LLM-based blocking for entity resolution (not just matching)
- Conformal prediction for NER confidence intervals
- New tabular benchmarks post-TabPFN-2.5

---

## Primary Search Queries

These are organized by pipeline area. Use arXiv as primary source with recent date filters.

### Infrastructure (Module 0)
```
"Burn CubeCL Rust neural network 2025 2026"
"mlx-rs Apple Silicon machine learning Rust"
"CRDT sync local-first ML pipeline"
"sqlite-vec vector search embedded 2025"
```

### RL Crawler (Module 1)
```
"web crawling reinforcement learning 2026"
"LLM web agent benchmark 2026 Mind2Web WebArena"
"focused crawling quality prediction 2026"
"multi-constraint web navigation bandit 2026"
```

### Extraction / NER (Module 2)
```
"named entity recognition 2026 new method"
"web information extraction LLM 2025 2026"
"zero-shot NER conformal prediction interval"
"structured extraction small language model 2026"
```

### Entity Resolution (Module 3)
```
"entity resolution 2026 LLM blocking"
"record linkage foundation model 2025 2026"
"company deduplication embedding 2026"
"entity matching benchmark 2026"
```

### Lead Scoring (Module 4)
```
"tabular machine learning 2026 benchmark"
"XGBoost alternative 2025 2026 tabular"
"conformal prediction classification 2026"
"B2B scoring temporal signal 2026"
```

### RAG / Reports (Module 5)
```
"retrieval augmented generation 2026"
"RAG architecture agentic 2026 benchmark"
"local LLM deployment 2026 Apple Silicon"
"hallucination mitigation RAG 2026"
```

---

## API Routing Guidance

**Primary**: arXiv with strict date filtering — this module is about recency.

| Client | Configuration | Rationale |
|---|---|---|
| `ArxivClient` | `sort_by: submittedDate`, `sort_order: descending`, `max_results: 100` | Most recent preprints first |
| `OpenAlexClient` | `from_publication_date: 2026-01-01`, `per_page: 50` | Covers conference proceedings and journals |
| `SemanticScholarClient` | `year: 2026`, `limit: 30`, no `min_citations` | New papers have zero citations yet |

**Do NOT** filter by `min_citations` — new 2026 papers will have 0–5 citations. Filter by date instead.

**Fallback**: For under-searched niches (Rust ML, CRDT), use Zenodo and CORE as additional sources.

```rust
use research::{ZenodoClient, CoreClient};
// Zenodo for dataset + code releases:
// query: "web crawling dataset 2026", "entity resolution benchmark 2026"
// CORE for grey literature and workshop papers:
// query: "ML pipeline local inference workshop 2025"
```

---

## TeamLead Configuration

```rust
use research::team::{TeamLead, TeamConfig, LlmProvider};
use research::tools::SearchToolConfig;
use std::time::Duration;

let config = TeamConfig {
    team_size: 5,
    provider: LlmProvider::DeepSeek {
        api_key: std::env::var("DEEPSEEK_API_KEY").unwrap(),
        base_url: "https://api.deepseek.com".into(),
    },
    scholar_key: std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok(),
    mailto: std::env::var("RESEARCH_MAILTO").ok(),
    output_dir: Some("docs/research-output/09-novelty".into()),
    scholar_concurrency: Some(3),
    tool_config: Some(SearchToolConfig {
        default_limit: 20,           // More results per search — cast wide net
        abstract_max_chars: 500,     // Full abstracts for novelty assessment
        include_fields_of_study: true,
        ..Default::default()
    }),
    synthesis_preamble: Some(
        "You are a research scout specializing in identifying breakthrough ML/NLP \
         techniques from 2025–2026. Your job is to find papers NOT already documented \
         in the novelty index. Cross-check findings against this known list: \
         [Craw4LLM, QMin, LARL, ARB, WebDreamer, OpAgent, M2-CMAB, DISCOVER, WebRL, \
         AXE, NuNER Zero, SeNER, KGGen, CPTuning, ScrapeGraphAI-100k, DistillER, \
         AnyMatch, GraLMatch, Eridu, GraphER, TabPFN-2.5, TabM, COP, SmartCal, \
         ModernNCA, A-RAG, CRAG, CDTA, CoT-RAG, REFRAG, MA-RAG, GFM-RAG]. \
         Only report papers NOT on this list. For each new paper, classify: \
         which pipeline module it applies to, what the breakthrough is, \
         and whether it supersedes an already-documented technique.".into()
    ),
    timeout_check_interval: Some(Duration::from_secs(60)),
    progress_report_interval: Some(Duration::from_secs(90)),
    ..Default::default()
};
```

---

## ResearchTask Definitions

Tasks run in parallel (no dependencies) then synthesize:

```rust
use research::team::task::{ResearchTask, TaskStatus, TaskPriority};
use std::time::Duration;

let tasks = vec![
    ResearchTask {
        id: 1,
        subject: "novelty-infrastructure-2026".into(),
        preamble: "You are a systems ML researcher scouting for infrastructure \
                   breakthroughs from 2025–2026. Search for new papers on Rust ML \
                   runtimes (Burn, Candle, tract, CubeCL), Apple Silicon inference \
                   optimization (MLX), zero-copy pipelines, and embedded vector DBs. \
                   Compare each against what is already documented.".into(),
        description: "Search with arXiv date filter 2025-01-01 to present for: \
                      'Rust ML inference 2025 2026', 'Burn CubeCL deep learning Rust', \
                      'Apple MLX machine learning framework', \
                      'embedded vector database 2026 benchmark'. \
                      Also search OpenAlex from_publication_date=2026-01-01 for: \
                      'edge ML inference optimization'. \
                      Flag: any paper that supersedes LanceDB, ChromaDB, or SQLite \
                      for the current pipeline. Classify impact as HIGH/MEDIUM/LOW.".into(),
        priority: TaskPriority::Normal,
        timeout: Some(Duration::from_secs(3000)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 2,
        subject: "novelty-crawler-2026".into(),
        preamble: "You are an RL web crawling researcher scouting for 2025–2026 \
                   breakthroughs not yet in the novelty index. The known techniques \
                   are: Craw4LLM, QMin, LARL, ARB, WebDreamer, OpAgent, M2-CMAB, \
                   DISCOVER, WebRL. Find papers that post-date or supersede these.".into(),
        description: "Search arXiv cs.LG + cs.IR from 2026-01-01 for: \
                      'web crawling reinforcement learning 2026', \
                      'web agent navigation new benchmark 2026', \
                      'focused crawler LLM 2026 new'. \
                      Search SemanticScholar year=2026 for: \
                      'web navigation agent reward shaping'. \
                      For each paper found: (1) confirm it is NOT in the known list, \
                      (2) state which known technique it improves upon, \
                      (3) quantify the improvement if benchmarks are available.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(3000)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 3,
        subject: "novelty-extraction-er-2026".into(),
        preamble: "You are an NLP researcher scouting for 2025–2026 breakthroughs \
                   in NER, relation extraction, and entity resolution not yet \
                   documented. Known: AXE, NuNER Zero, SeNER, KGGen, CPTuning, \
                   ScrapeGraphAI-100k, DistillER, AnyMatch, GraLMatch, Eridu, GraphER.".into(),
        description: "Search arXiv cs.CL from 2026-01-01 for: \
                      'named entity recognition 2026', \
                      'entity resolution LLM 2026', \
                      'web extraction benchmark 2026'. \
                      Search S2 year=2026 for: \
                      'zero-shot entity matching', 'NER structured output'. \
                      Also search for new datasets/benchmarks: any new NER or ER \
                      benchmark published in 2026 that extends CoNLL-2003, \
                      DBLP-ACM, or Amazon-Google. \
                      For each new paper: state which known technique it replaces \
                      and by how much (F1 delta, speed delta).".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(3000)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 4,
        subject: "novelty-scoring-rag-2026".into(),
        preamble: "You are an ML researcher scouting for 2025–2026 breakthroughs \
                   in tabular ML and RAG not yet documented. Known tabular: \
                   TabPFN-2.5, TabM, COP, SmartCal, ModernNCA, Hawkes Attention. \
                   Known RAG: A-RAG, CRAG, CDTA, CoT-RAG, REFRAG, MA-RAG, GFM-RAG.".into(),
        description: "Search arXiv cs.LG + cs.AI from 2026-01-01 for: \
                      'tabular classification 2026 new method', \
                      'retrieval augmented generation 2026 new architecture', \
                      'RAG benchmark 2026', 'tabular foundation model 2026'. \
                      Search OpenAlex from_publication_date=2026-01-01 for: \
                      'tabular learning benchmark 2026', \
                      'generative AI report grounding 2026'. \
                      For each new tabular paper: benchmark against TabPFN-2.5. \
                      For each new RAG paper: does it beat REFRAG on latency?".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(3000)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 5,
        subject: "novelty-synthesis-gaps".into(),
        preamble: "You are a research strategist. Based on the outputs of tasks 1–4, \
                   synthesize which pipeline modules have the most undocumented \
                   research activity in 2026. Identify any new research directions \
                   not covered by the existing 8 modules (e.g., privacy, \
                   multi-language support, compliance).".into(),
        description: "Search for: 'privacy-preserving web crawling 2025 2026', \
                      'multilingual entity resolution 2025', \
                      'GDPR compliant ML pipeline web data', \
                      'federated learning lead generation'. \
                      These are potential 9th+ module candidates. \
                      Synthesize findings from tasks 1–4 and identify: \
                      (1) modules with most new papers, \
                      (2) techniques that supersede 3+ existing documented methods, \
                      (3) new module candidates not in the current 8-module doc.".into(),
        priority: TaskPriority::Normal,
        dependencies: vec![1, 2, 3, 4],
        timeout: Some(Duration::from_secs(3600)),
        max_retries: 1,
        ..Default::default()
    },
];
```

---

## Key Research Areas to Monitor

### Under-Searched Niches (high novelty probability)
1. **Web agent benchmarks post-2025**: WebArena-2, WorkArena++, Mind2Web-2
2. **LLM-based blocking for ER**: Use LLM to generate blocking keys — not just matching
3. **Conformal NER**: Predict confidence intervals for entity spans, not just point estimates
4. **Diffusion models for structured data**: Any diffusion approaches to tabular synthesis/augmentation

### Venues Not Covered by Other Prompts
- **ICDE 2026**: Data engineering, pipeline systems
- **TheWebConf/WWW 2026**: Web crawling and web data
- **DASFAA 2026**: Database systems for Asia-Pacific
- **ECML/PKDD 2026**: European ML/data mining

### Zenodo & CORE for Grey Literature
```rust
// Zenodo: code releases often contain new techniques before paper submission
// Search: "web crawler 2026 dataset", "entity resolution 2026 code"

// CORE: Workshop papers and technical reports
// Search: "focused crawler workshop 2025", "entity matching preprint 2026"
```

---

## Expected Output Format

Save to `docs/research-output/09-novelty/agent-{id:02}-{subject}.md`:

```markdown
# {subject} — New Papers Found

## Papers NOT in Existing Novelty Index
| Title | arXiv ID | Date | Module | Supersedes | Improvement |
|---|---|---|---|---|---|

## Papers That Supersede Documented Techniques
| New Paper | Supersedes | F1 delta | Speed delta | Adopt immediately? |
|---|---|---|---|---|

## New Module Candidates
- {area}: {evidence} — should become Module 9?
```

Synthesis (`synthesis.md`) should output a **diff** against `docs/08-novelty.md`:
- **Add**: N new papers (highest-priority first)
- **Update**: M existing entries with newer benchmarks
- **Deprecate**: K techniques superseded by newer approaches

# Research Prompt 1 — System Architecture
## Local-First ML Infrastructure

**Module**: `docs/00-system-architecture.md`
**Research Crate**: `crates/research`
**Focus**: New papers (2024–2026) on edge ML infrastructure, Rust ML backends, memory-efficient serving

---

## Research Mission

Find papers advancing the infrastructure layer of a local-first ML pipeline. The pipeline
currently runs BERT NER (440 MB), DQN (5–10 MB), Siamese networks (50–100 MB), XGBoost
ensembles (20–50 MB), and a local Ollama LLM (~4 GB) on a single machine with 1–5 GB RSS peak.
Storage uses SQLite (WAL mode), LanceDB (HNSW vectors), and ChromaDB (document embeddings).

**Gaps to close:**
- Zero-copy data exchange between Rust ML runtimes and Python asyncio pipelines
- Sub-linear memory scaling for multi-model serving on consumer hardware
- Privacy-preserving local inference without cloud API calls
- Alternative vector DB backends faster than ChromaDB for <10K documents

---

## Primary Search Queries

Use these query strings across API clients:

```
"local-first machine learning inference edge"
"Rust neural network inference ONNX runtime"
"SQLite vector search HNSW embedded"
"Arrow ADBC zero-copy database integration"
"memory-efficient transformer inference quantization"
"LanceDB vector database performance benchmark"
"multi-model serving local hardware"
"Burn framework deep learning Rust backend"
"edge ML privacy-preserving local deployment"
"asyncio concurrent ML inference pipeline"
"GGUF GGML quantization local LLM"
"embedded vector search ANN index 2024"
```

---

## API Routing Guidance

| Client | Why | Filter |
|---|---|---|
| `ArxivClient` | Systems ML papers appear on arXiv first | `sort_by: lastUpdatedDate`, `max_results: 50` |
| `OpenAlexClient` | Broad coverage, no auth, fast | `from_publication_date: 2024-01-01`, `per_page: 50` |
| `CrossrefClient` | IEEE/ACM systems venue metadata | `from_pub_date: 2024-01-01`, `rows: 30` |
| `SemanticScholarClient` | Citation-ranked, find seminal papers | `year: 2024`, `limit: 30` |

**Fallback chain**: OpenAlex → Crossref → Semantic Scholar → arXiv

---

## TeamLead Configuration

```rust
use research::team::{TeamLead, TeamConfig, LlmProvider};
use std::time::Duration;

let config = TeamConfig {
    team_size: 3,
    provider: LlmProvider::DeepSeek {
        api_key: std::env::var("DEEPSEEK_API_KEY").unwrap(),
        base_url: "https://api.deepseek.com".into(),
    },
    scholar_key: std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok(),
    mailto: std::env::var("RESEARCH_MAILTO").ok(),
    output_dir: Some("docs/research-output/01-system-architecture".into()),
    scholar_concurrency: Some(2),
    synthesis_preamble: Some(
        "You are a systems ML researcher. Synthesize findings on local-first \
         ML infrastructure, focusing on memory efficiency, zero-copy data \
         exchange, and privacy-preserving edge deployment. Contrast each \
         approach against the current pipeline (SQLite WAL + LanceDB + \
         ChromaDB + asyncio) and recommend concrete upgrade paths.".into()
    ),
    timeout_check_interval: Some(Duration::from_secs(60)),
    progress_report_interval: Some(Duration::from_secs(120)),
    ..Default::default()
};
```

---

## ResearchTask Definitions

```rust
use research::team::task::{ResearchTask, TaskStatus, TaskPriority};
use std::time::Duration;

let tasks = vec![
    ResearchTask {
        id: 1,
        subject: "rust-ml-backends".into(),
        preamble: "You are a systems engineer specializing in high-performance \
                   Rust ML runtimes. Search for papers on Rust-native neural \
                   network inference, ONNX runtime integration, and the Burn \
                   framework. Focus on papers from 2024–2026 that benchmark \
                   Rust inference vs Python on consumer CPUs and Apple Silicon.".into(),
        description: "Search for: 'Burn framework Rust deep learning', \
                      'ONNX runtime Rust inference benchmark', \
                      'candle ML framework Rust performance', \
                      'Rust WASM machine learning inference'. \
                      Find papers comparing Rust ML frameworks (Burn, Candle, tract) \
                      against Python (PyTorch, ONNX) on memory usage and latency. \
                      Extract: framework name, hardware target, latency (ms), \
                      memory (MB), supported ops, and any SIMD/Metal acceleration.".into(),
        priority: TaskPriority::Critical,
        timeout: Some(Duration::from_secs(1800)),
        max_retries: 1,
        ..Default::default()
    },

    ResearchTask {
        id: 2,
        subject: "zero-copy-data-pipelines".into(),
        preamble: "You are a database systems researcher specializing in zero-copy \
                   data exchange between heterogeneous runtimes. Search for papers \
                   on Apache Arrow ADBC, shared memory ML pipelines, and zero-copy \
                   tensor passing between Rust and Python processes.".into(),
        description: "Search for: 'Apache Arrow ADBC zero-copy database', \
                      'shared memory machine learning pipeline', \
                      'zero-copy tensor interop Rust Python', \
                      'ADBC connector performance benchmark 2024'. \
                      Find papers documenting latency and throughput improvements \
                      from eliminating serialization between pipeline stages. \
                      Extract: serialization overhead (ms/MB), speedup factor, \
                      memory reduction, and applicable pipeline architectures.".into(),
        priority: TaskPriority::Normal,
        timeout: Some(Duration::from_secs(1800)),
        ..Default::default()
    },

    ResearchTask {
        id: 3,
        subject: "embedded-vector-db-alternatives".into(),
        preamble: "You are a database researcher specializing in embedded vector \
                   search for small-to-medium datasets (<100K vectors). Search for \
                   papers benchmarking SQLite vector extensions (sqlite-vss, \
                   sqlite-vec), DiskANN, and alternatives to ChromaDB for \
                   document retrieval under 2 GB RAM.".into(),
        description: "Search for: 'embedded vector search SQLite', \
                      'DiskANN disk-based ANN index', \
                      'ChromaDB performance benchmark small dataset', \
                      'HNSW vs IVF embedded vector database'. \
                      Compare recall@10, latency (ms), index build time, and \
                      memory footprint for 10K–100K vectors. Focus on solutions \
                      that run without a separate server process. \
                      Extract: index type, dataset size, recall, latency, \
                      RAM usage, and disk footprint.".into(),
        priority: TaskPriority::Normal,
        dependencies: vec![1],
        timeout: Some(Duration::from_secs(1800)),
        ..Default::default()
    },
];
```

---

## Key Research Sub-Topics

### 1. Rust ML Runtimes
- **Burn 0.20+**: One Rust kernel → Metal/CUDA/WebGPU/WASM via CubeCL
- **Candle**: Hugging Face Rust inference — track benchmarks vs Python
- **tract**: ONNX/TFLite inference in safe Rust — production deployments
- **Target metric**: Match PyTorch latency at <50% memory on M1 Pro

### 2. Quantization for Local LLMs
- INT4/INT8 quantization tradeoffs for 3B–14B models on 16 GB RAM
- GGUF format: compatibility with Ollama, llama.cpp, mlx-lm
- Metal GPU utilization on Apple Silicon for LLM inference

### 3. Zero-Copy Inter-Process Communication
- Apache Arrow Flight for streaming ML results between services
- ADBC (Arrow Database Connectivity): replacing JDBC/ODBC for analytics
- Shared memory tensor passing: PyO3 Rust↔Python without copies

### 4. Embedded Vector DBs
- **sqlite-vec**: Vector search as SQLite extension (no separate process)
- **LanceDB v0.10+**: New indexing strategies, benchmarks on <1M vectors
- **Qdrant embedded mode**: In-process HNSW without Docker

---

## Expected Output Format

For each task, save to `docs/research-output/01-system-architecture/agent-{id:02}-{subject}.md`:

```markdown
# {subject}

## Top Papers Found
| Title | Authors | Year | Venue | Key Result |
|---|---|---|---|---|

## Key Findings
- ...

## Applicable to Current Pipeline
- Current: {what we use now}
- Proposed upgrade: {what the paper suggests}
- Expected improvement: {metric delta}

## Recommended Papers to Read First
1. {title} — {reason}
```

Synthesis (`synthesis.md`) should rank upgrades by: **impact × ease of implementation**.

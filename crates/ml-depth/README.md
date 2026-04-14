# ml-depth

Discover and validate genuine deep ML companies via HuggingFace Hub presence + academic paper output.

## Architecture

```mermaid
graph TD
    CLI["CLI (clap)"]
    CLI --> P["profile &lt;company&gt;"]
    CLI --> B["batch --input file.txt"]
    CLI --> D["discover --limit N"]
    CLI --> S["sync --models N"]

    P & B --> PIPE["MlDepthPipeline"]

    PIPE --> HF["1. HF Org Scan<br/><small>hf::OrgScanner</small>"]
    HF --> HFD["Models, datasets,<br/>training signals, arXiv links"]

    PIPE --> PS["2. Paper Search<br/><small>research::CompanyPaperSearch</small>"]
    PS --> OA["OpenAlex<br/><small>affiliation search</small>"]
    PS --> SS["Semantic Scholar<br/><small>author/org search</small>"]
    PS --> AX["arXiv<br/><small>keyword search</small>"]

    PIPE --> SC["3. Depth Scoring<br/><small>research::MlDepthScore</small>"]
    HFD --> SC
    OA & SS & AX --> SC
    SC --> V["Verdict"]

    style HF fill:#ff9800,color:#fff
    style OA fill:#4a9eff,color:#fff
    style SS fill:#ffa726,color:#fff
    style AX fill:#ff6b6b,color:#fff
    style SC fill:#00c853,color:#fff
```

## Modules

| Module | Purpose |
|--------|---------|
| `pipeline` | Full validation pipeline: HF scan → paper search → depth scoring → `CompanyProfile` |
| `discovery` | Candidate discovery — keyword-based HF model search for ML-heavy orgs |
| `report` | Output formatting: table and CSV rendering of company profiles |

## CLI Usage

```bash
# Profile a single company
cargo run -- profile assemblyai

# Batch profile from a file (one company name per line)
cargo run -- batch --input companies.txt --format table

# Discover candidate ML orgs from HuggingFace
cargo run -- discover --limit 50

# Sync popular HF repos to local SQLite cache
cargo run -- sync --models 5000 --datasets 1000 --db hf_repos.db
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HF_TOKEN` | No | HuggingFace token for private repos and higher rate limits |
| `SEMANTIC_SCHOLAR_API_KEY` | No | Semantic Scholar API key for higher rate limits |
| `OPENALEX_MAILTO` | No | Email for OpenAlex polite pool (higher throughput) |

Env is loaded from `.env.local` via `dotenvy`.

## Dependencies

| Crate | Purpose |
|-------|---------|
| `hf` (sqlite feature) | HuggingFace Hub client with org scanning and local SQLite cache |
| `research` (no default features) | Paper search clients (OpenAlex, Semantic Scholar, arXiv), ML depth scoring |
| `tokio` | Async runtime |
| `clap` | CLI argument parsing |
| `dotenvy` | `.env.local` loading |
| `tracing` | Structured logging |

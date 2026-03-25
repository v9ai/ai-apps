# research

Shared research infrastructure crate: academic paper search, multi-model AI agent framework, and code analysis tools.

## Modules

| Module | Description |
|--------|-------------|
| `scholar` | Semantic Scholar API client |
| `openalex` | OpenAlex API client |
| `crossref` | Crossref API client |
| `core_api` | CORE API client |
| `paper` | Unified `ResearchPaper` type across all sources |
| `dual` | `DualModelResearcher` / `MultiModelResearcher` — run queries against DeepSeek + Qwen in parallel |
| `agent` | `LlmProvider` trait for pluggable model backends |
| `embeddings` | `EmbeddingRanker` for semantic similarity scoring |
| `team` | Multi-agent coordination (lead, teammate, mailbox, tasks) |
| `code` | Source code analysis via `ast-grep` |
| `tools` | Shared tool definitions for agent pipelines |

## Binaries

Domain-specific research agents built on this library:

- `healthcare-research` — medical/healthcare literature
- `therapeutic-research` / `eval-therapeutic` — therapeutic interventions
- `condition-research` — medical conditions
- `characteristic-research` / `eval-characteristic` — trait/characteristic analysis
- `calm-parent-research` — parenting strategies
- `law-research` — legal research
- `real-estate-research` — property market analysis
- `knowledge-research` — general knowledge base
- `todo-research` / `todo-sdd` — task management research + SDD pipeline
- `code-research` — codebase analysis
- `interview-prep` — interview preparation
- `scalping-research` — trading scalping strategies
- `bear-market-trading` — bear market trading analysis
- `tts-research` — text-to-speech research
- `qwen-investigate` — Qwen model investigation

## Dependencies

Uses sibling workspace crates:
- `deepseek` (with `agent` feature)
- `qwen`
- `sdd`

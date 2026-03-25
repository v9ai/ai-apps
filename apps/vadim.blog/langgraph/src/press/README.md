# Press — LangGraph Content Pipeline

Multi-agent content pipeline built on LangGraph and DeepSeek (reasoner + chat). Researches, writes, edits, and publishes long-form articles to vadim.blog.

## Pipelines

| Pipeline | Command | Description |
|----------|---------|-------------|
| **article** | `press article --topic "..."` | Journalism mode (1200-1800w). Add `--input file.md` for deep-dive mode (2500-3500w + paper search) |
| **blog** | `press blog --niche "..."` | Topic discovery: scout + picker agents generate topic ideas |
| **counter** | `press counter --url "..." --topic "..."` | Counter-article against a source URL |
| **review** | `press review --input draft.md` | Evaluate a draft: publication fit scoring, evals, editorial review |
| **run** | `press run --pipeline <name>` | Unified orchestrator — dispatches to any sub-pipeline |
| **eval** | `press eval --input article.md` | Run quality metrics (source citation, anti-hallucination, writing quality, SEO, etc.) |

## Architecture

```
START -> route_pipeline -> [blog | article | counter | review] -> END
```

The main orchestrator (`graphs/main.py`) is a `StateGraph` that routes to compiled sub-graphs based on the `pipeline` field.

### Modules

- **`agents.py`** — `Agent` wrapper with retry logic + parallel execution (`run_parallel`, `run_all`)
- **`models.py`** — `ModelPool` routing DeepSeek Reasoner (heavy tasks) and DeepSeek Chat (fast tasks)
- **`research.py`** — Paper search across 4 databases (Semantic Scholar, OpenAlex, Crossref, CORE) + editorial search, dedup/ranking, LLM synthesis
- **`publisher.py`** — Publish to vadim.blog: frontmatter generation, git commit+push, Vercel deploy
- **`link_checker.py`** — Validate links in generated articles
- **`prompts.py`** — System prompts for all agent roles
- **`evals.py`** — Quality evaluation metrics (7 dimensions)
- **`papers/`** — API clients for academic + editorial sources (20+ publications)
- **`graphs/`** — LangGraph `StateGraph` definitions for each pipeline

### Paper Sources

Academic: Semantic Scholar, OpenAlex, Crossref, CORE

Editorial: Neptune AI, W&B, Arize AI, KDnuggets, ML Mastery, DataCamp, MarkTechPost, Towards AI, Analytics Vidhya, Towards Data Science, InfoQ, The New Stack, DZone, LogRocket, SitePoint, Smashing Magazine, freeCodeCamp, and more.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | Yes | DeepSeek API key |
| `SEMANTIC_SCHOLAR_API_KEY` | No | Semantic Scholar API key |
| `OPENALEX_MAILTO` | No | Email for OpenAlex polite pool |
| `CROSSREF_MAILTO` | No | Email for Crossref polite pool |
| `CORE_API_KEY` | No | CORE API key |
| `VADIM_BLOG_DIR` | No | Override blog posts directory |

## Flags

All article-producing pipelines support:

- `--publish` — Publish to vadim.blog
- `--git-push` — Git commit + push, then Vercel deploy
- `--output-dir` — Output directory (default: `./articles`)

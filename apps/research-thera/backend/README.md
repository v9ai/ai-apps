# research-thera-agent

Therapeutic research and story generation agent — LangGraph port of the Rust `research` crate, specialized for evidence-based therapeutic interventions.

## Architecture

```
CLI (argparse) ──→ TherapyContext
                        │
              ┌─────────┼──────────┐
              ▼         ▼          ▼
        DeepSeek    Research     Neon PostgreSQL
        Reasoner    Sources      (persistence)
        (LangGraph  (multi-API
         ReAct)      fallback)
              │         │
              ▼         ▼
        Structured   Papers + embeddings
        insights     (sentence-transformers)
              │
              ▼
        Story generation + TTS
```

The agent uses LangGraph ReAct workflows with DeepSeek Reasoner to search academic literature across multiple sources, extract therapeutic insights, persist papers to Neon, and optionally generate therapeutic stories with audio delivery.

## Modules

| Module | Purpose |
|--------|---------|
| `cli.py` | CLI entry point — subcommand dispatch (`goal`, `support-need`, `query`, `url`, `story`) |
| `graph.py` | Main LangGraph research workflow — ReAct agent with paper search, extraction, persistence |
| `research_sources.py` | Multi-source paper search: OpenAlex, Crossref, Semantic Scholar with fallback logic |
| `therapy_context.py` | Domain model — therapeutic goals, support needs, target population |
| `deep_analysis_graph.py` | Deep analysis sub-workflow with structured output |
| `story_graph.py` | Story generation from research insights |
| `parent_advice_graph.py` | Parent-focused therapeutic advice synthesis |
| `habits_graph.py` | Habit formation research workflow |
| `tts_graph.py` | Text-to-speech integration for audio delivery |
| `embeddings.py` | Sentence-transformers embeddings for paper vectors |
| `reranker.py` | Cross-encoder semantic reranking of search results |
| `neon.py` | Neon PostgreSQL operations — paper CRUD, embedding storage |
| `d1.py` | Cloudflare D1 database layer (legacy) |
| `backfill_embeddings.py` | Batch embedding generation for existing papers |
| `story.py` | Story model and generation |

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
| `DEEPSEEK_API_KEY` | Yes | DeepSeek API key for Reasoner model |
| `SEMANTIC_SCHOLAR_API_KEY` | No | Semantic Scholar API key (higher rate limits) |
| `NEON_DATABASE_URL` | For `url`/`story` | Neon PostgreSQL connection string |

Env is loaded from `.env.local` and `.env` via `python-dotenv`.

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
| `langgraph` | Graph-based agent workflows (ReAct) |
| `langchain` + `langchain-openai` | LLM framework, DeepSeek integration |
| `sentence-transformers` | Local embeddings and cross-encoder reranking |
| `psycopg[binary]` | Neon PostgreSQL driver |
| `httpx` | Async HTTP client for research source APIs |
| `boto3` | AWS S3/R2 for audio asset storage |
| `python-dotenv` | Environment variable loading |
| `openai` | TTS and embedding API access |

Requires Python >= 3.12.

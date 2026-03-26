# iterate

A multi-iteration execution system for Claude Code with semantic memory, hybrid retrieval, and heuristic evaluation. Runs a task for exactly N iterations, using ChromaDB to store and retrieve context across iterations so each step builds on prior work.

## How it works

```
/iterate 5 fix the auth middleware
```

1. **`start.sh`** initializes session state in `/tmp/claude-iterate-<id>/`, pre-warms the embedding model, creates a plan template, records the task in history, and shows similar past tasks.
2. Claude works on the task (first iteration: fills in the plan with concrete subtasks), then stops.
3. **`kick-session.sh`** fires on every Stop hook:
   - Extracts assistant output from the session transcript
   - Stores it in ChromaDB with embeddings (store_context.py)
   - Detects semantic repetition and git diff stalls (advisory warnings)
   - Auto-commits and pushes changes (unless `--no-commit`)
   - Evaluates the iteration with heuristic scoring + directive generation (evaluate.py)
   - Retrieves relevant context for the next iteration (retrieve_context.py)
   - Reads plan status (completed/total subtasks)
   - Sends compact feedback + directive + remaining subtasks via stderr
4. Loop runs for exactly N iterations.

```
start.sh ──► Claude works ──► kick-session.sh (Stop hook)
                                 │
                    ┌────────────┼────────────────┐
                    ▼            ▼                 ▼
              store_context  evaluate    retrieve_context
              (ChromaDB)     (heuristic)   (hybrid search)
                    │            │                 │
                    └────────────┼────────────────┘
                                 ▼
                         stderr feedback
                         (exit 2 = continue)
```

## Usage

```bash
/iterate 10 implement the new search feature      # run 10 iterations
/iterate 5 --no-commit build the auth system        # skip auto-commit between iterations
/iterate status                                     # show active sessions
/iterate reset                                      # clear session for this CWD
/iterate clean                                      # GC stale sessions (>4h idle)
/iterate history                                    # show past tasks from ChromaDB
```

### Flags

| Flag | Description |
|------|-------------|
| `--iterations N` | Max iterations (default 10, max 1000) |
| `--no-commit` | Skip auto-commit and push between iterations |
| `--reset` | Clear iterate state for the current working directory |
| `--status` | Show all active iterate sessions with scores |
| `--clean` | Remove stale sessions (>4h idle, or counter=1 and >30m) |
| `--history` | Show semantically similar past tasks |

## Architecture

### Session state (`/tmp/claude-iterate-<id>/`)

| File | Purpose |
|------|---------|
| `counter` | Current iteration (1-based) |
| `iterations.txt` | Total iterations requested |
| `task.txt` | Task description |
| `scores.json` | Array of eval scores per iteration |
| `cwd.txt` | Git root directory |
| `session.txt` | Claude Code session ID |
| `no-commit.txt` | Present when `--no-commit` is active |
| `plan.md` | Subtask plan — Claude fills in iteration 1, marks [x] as done |
| `transcript-offset.txt` | Line offset into session transcript |
| `output-iter-N.txt` | Raw assistant output for iteration N |
| `eval-iter-N.json` | Eval result JSON for iteration N |
| `context-eval-N.txt` | Retrieved context used for eval N |
| `chroma/` | Per-session ChromaDB for iteration memory |
| `debug.log` | Debug trace for troubleshooting |

### Retrieval pipeline

Hybrid search combining three strategies with Reciprocal Rank Fusion:

1. **ChromaDB vector search** — cosine similarity via FastEmbed (BAAI/bge-small-en-v1.5)
2. **BM25 keyword search** — rank_bm25 index persisted alongside ChromaDB
3. **CrossEncoder reranking** — ms-marco-MiniLM-L-6-v2 for final relevance scoring

All three degrade gracefully if dependencies are missing.

### Evaluation

Heuristic scoring (no LLM calls) using:
- Cosine similarity between output and task description
- Error pattern extraction and classification (compile, type, runtime, test, build)
- Git diff stats (files changed, insertions/deletions, net lines)
- Semantic similarity between consecutive iterations (repetition detection)

Metrics: Task Completion, Incremental Progress, Coherence, Code Quality, Focus, Answer Relevancy, Faithfulness, Contextual Relevancy.

Produces a **composite score** (weighted: tc=0.30, pr=0.25, qu=0.20, co=0.15, fo=0.10) and a **directive** — a focused, actionable instruction for what to do next based on eval signals (e.g., "FIX COMPILE ERRORS", "Fix failing tests", "You are REPEATING prior work").

Scores are **advisory only** — they never stop the loop early.

### Plan tracking

`start.sh` creates a `plan.md` template in the session dir. Claude is instructed to fill it with concrete subtasks in iteration 1 and mark items `[x]` as completed. The stop hook reads plan progress and includes remaining subtasks in the feedback message. The statusline shows `plan=N/M`.

### Task history

Persistent cross-session history in `~/.claude/iterate-history/chroma`. Survives `/iterate reset`. Used to:
- Show similar past tasks before starting a new one
- Track completed vs abandoned tasks
- Record iteration count, final score, and completion reason

## Integration

Configured in `.claude/settings.json`:

- **Stop hook**: `kick-session.sh` runs on every Claude stop event (timeout 300s)
- **Statusline**: `statusline.sh` shows `iter N/M s=0.XX plan=N/M` in the Claude Code status bar
- **SessionStart hook**: separate — logs git state (not part of iterate)

## Files

| File | Role |
|------|------|
| `start.sh` | Entry point — parses args, initializes session, shows similar tasks |
| `kick-session.sh` | Stop hook — store/eval/retrieve loop, auto-commit, counter management |
| `store_context.py` | Stores iteration output + metadata in ChromaDB |
| `retrieve_context.py` | Hybrid retrieval (vector + BM25 + rerank via RRF) |
| `evaluate.py` | Heuristic evaluation (cosine sim, error extraction, git stats) |
| `embeddings.py` | Shared FastEmbed wrapper (BAAI/bge-small-en-v1.5), falls back to ChromaDB default |
| `reranker.py` | CrossEncoder reranking (ms-marco-MiniLM-L-6-v2) |
| `bm25_index.py` | BM25Okapi keyword index, JSON-persisted |
| `rrf.py` | Reciprocal Rank Fusion for combining ranked lists |
| `shared.py` | Constants (metric names) and helpers (cosine similarity, error extraction) |
| `task_history.py` | Persistent task history in ~/.claude/iterate-history/ |
| `statusline.sh` | Statusline output for Claude Code UI |
| `test.sh` | Integration test for the store/retrieve/evaluate pipeline |
| `tests/` | Unit tests (pytest) for all Python modules |
| `requirements.txt` | Python dependencies: chromadb, rank-bm25, fastembed, sentence-transformers |

## Requirements

- Python 3.12+
- `chromadb >= 0.5.0`
- `fastembed >= 0.4.0` (optional, falls back to ChromaDB default embeddings)
- `rank-bm25 >= 0.2.2` (optional, enables hybrid BM25 retrieval)
- `sentence-transformers >= 5.0.0` (optional, enables CrossEncoder reranking)
- `jq` (used by shell scripts for JSON parsing)

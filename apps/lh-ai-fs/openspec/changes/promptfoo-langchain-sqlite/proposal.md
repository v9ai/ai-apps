# Proposal: promptfoo + LangChain + SQLite Eval Persistence

## Intent

Three independent but complementary improvements are bundled here because they share a single motivation: making the eval loop more observable, reproducible, and tooling-friendly without disrupting the working pipeline.

**LangChain migration.** `backend/services/llm_service.py` and `backend/llm.py` call the OpenAI SDK directly. Wrapping these with `langchain-openai` (`ChatOpenAI`) keeps the same models and temperature settings but adds structured tracing (LangSmith-compatible), chain composability, and a uniform invocation API across all four agents. No model changes, no prompt changes — only the call layer changes.

**promptfoo as primary eval runner.** The existing harness in `backend/evals/` is a bespoke Python script that runs the full pipeline end-to-end and computes precision/recall/F1. It is useful but opaque to external tooling. promptfoo (run locally via `npx promptfoo`) provides a YAML-driven eval config, can POST to the live `POST /analyze` endpoint, and can assert on JSON output fields with its built-in assertion types. This makes evals reproducible by CI without Python knowledge and enables per-prompt regression testing.

**SQLite persistence.** Currently, `eval_results.json` is overwritten on every run. There is no history. A lightweight SQLite database (`backend/evals/eval_history.db`) will store each run with a UUID, ISO timestamp, all scalar metrics, and a JSON blob of findings. This enables trend analysis and prevents accidental loss of prior results.

`python run_evals.py` MUST continue to work as the single-command entry point; it will become a thin wrapper that runs the Python harness and then invokes promptfoo.

---

## Scope

### In Scope

- Replace `openai.AsyncOpenAI` / `openai.OpenAI` in `llm_service.py` and `llm.py` with `langchain_openai.ChatOpenAI`; preserve async behaviour via `ainvoke`
- Add `langchain-openai` and `langchain-core` to `requirements.txt`; remove direct `openai` dependency (LangChain pulls it transitively)
- Create `backend/evals/promptfoo.yaml` — YAML eval config with `http` provider (`POST http://localhost:8002/analyze`), one test case per known discrepancy ID (8 total), and assertions on `report.top_findings` JSON path
- Create `backend/evals/db.py` — SQLite helper using stdlib `sqlite3`; schema: `eval_runs(run_id TEXT PK, timestamp TEXT, precision REAL, recall REAL, f1_score REAL, hallucination_rate REAL, findings_json TEXT)`
- Update `backend/evals/harness.py` to call `db.record_run()` after metrics are calculated
- Update `backend/run_evals.py` to shell out to `npx promptfoo eval --config backend/evals/promptfoo.yaml` after the Python harness completes (non-blocking; failure is logged, not fatal)
- Add `npx`/Node runtime note to `README.md` (promptfoo requires Node ≥ 18)

### Out of Scope

- LangSmith cloud tracing (environment variable `LANGCHAIN_TRACING_V2` can be set by the user; not configured here)
- Replacing the custom `calculate_metrics()` logic with promptfoo scoring — the Python harness remains the authoritative metric source
- Migrating agent prompt templates to LangChain `PromptTemplate` / LCEL chains (that is a future refactor)
- CI/CD integration of promptfoo (deferred; this change only ensures local reproducibility)
- A UI for browsing eval history (deferred)

---

## Approach

### 1. LangChain swap (backend/services/llm_service.py and backend/llm.py)

`LLMService.__init__` constructs `ChatOpenAI(model=self.model, temperature=temperature, api_key=self.api_key)`. `get_structured_response` uses `.with_structured_output(response_model)` which returns the Pydantic model directly, eliminating the manual `json.loads` + `response_model(**data)` step. `get_completion` uses `ainvoke([SystemMessage(...), HumanMessage(...)])` and returns `.content`. The synchronous `llm.py` `call_llm` function is rewritten to use `ChatOpenAI(...).invoke(messages).content`.

The `BaseAgent._call_llm` and `_call_llm_text` wrappers in `base_agent.py` do not need to change; they call `self.llm_service` methods whose signatures are preserved.

### 2. promptfoo YAML config (backend/evals/promptfoo.yaml)

```yaml
providers:
  - id: http
    config:
      url: http://localhost:8002/analyze
      method: POST
      headers:
        Content-Type: application/json

tests:
  - description: "Detects DATE-001 date discrepancy"
    assert:
      - type: javascript
        value: "output.report.top_findings.some(f => f.description && f.description.toLowerCase().includes('march'))"
  # ... one entry per KNOWN_DISCREPANCIES ID
```

Each test maps to one of the 8 ground-truth discrepancy IDs. Assertions use the `javascript` type to check `output.report.top_findings` or `output.report.verified_citations` for keyword presence, mirroring the keyword logic in `metrics.py`.

### 3. SQLite persistence (backend/evals/db.py)

Stdlib `sqlite3` only — no ORM, no migration framework. `init_db(path)` creates the table if absent. `record_run(metrics, findings)` generates a `uuid4` run ID, inserts one row. `get_recent_runs(n)` returns the last `n` rows ordered by timestamp descending. Called from `harness.main()` unconditionally after `calculate_metrics`.

### 4. run_evals.py wrapper

After `asyncio.run(main())` succeeds, the script calls `subprocess.run(["npx", "promptfoo", "eval", "--config", "backend/evals/promptfoo.yaml"])`. If `npx` is not found or promptfoo fails, the script prints a warning and exits with code 0 — the Python harness result is authoritative.

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/services/llm_service.py` | Modified | Replace `AsyncOpenAI` with `ChatOpenAI`; update `get_structured_response` to use `.with_structured_output()`; update `get_completion` to use `ainvoke` |
| `backend/llm.py` | Modified | Replace `OpenAI` synchronous client with `ChatOpenAI(...).invoke()` |
| `backend/requirements.txt` | Modified | Add `langchain-openai`, `langchain-core`; remove `openai` (pulled transitively) |
| `backend/evals/db.py` | New | SQLite helper — `init_db`, `record_run`, `get_recent_runs` |
| `backend/evals/harness.py` | Modified | Import and call `db.record_run(metrics, findings)` after metrics calculation; save `run_id` to `eval_results.json` |
| `backend/evals/promptfoo.yaml` | New | promptfoo eval config: http provider + 8 test cases |
| `backend/run_evals.py` | Modified | Add `subprocess.run` call to trigger promptfoo after Python harness; graceful fallback if Node/npx absent |
| `backend/agents/base_agent.py` | No change | `_call_llm` / `_call_llm_text` signatures unchanged |
| `backend/agents/*.py` | No change | All agents call `self.llm_service` methods; no agent code touched |
| `backend/main.py` | No change | `POST /analyze` endpoint unchanged |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `with_structured_output()` changes JSON coercion behaviour vs manual `json.loads` | Medium | Run existing eval harness before and after; compare F1 score; revert if metrics degrade |
| LangChain `ainvoke` adds latency overhead per call | Low | Benchmark one agent (CitationVerifier) before deploying to all; overhead is typically <50 ms |
| promptfoo keyword assertions diverge from Python `calculate_metrics` keyword logic | Medium | Assertions are advisory; Python harness remains authoritative; discrepancies are logged, not failures |
| SQLite file locks if two eval runs execute concurrently | Low | Evals are run sequentially by `run_evals.py`; WAL mode enabled in `init_db` as precaution |
| Node/npx not available in Docker container | Medium | `run_evals.py` catches `FileNotFoundError` and prints a warning; Python harness result and exit code are unaffected |
| Transitive `openai` version pulled by LangChain differs from pinned version | Low | Pin `langchain-openai>=0.2` in `requirements.txt`; verify `pip install` resolves without conflict in a clean venv |

---

## Rollback Plan

1. Revert `backend/services/llm_service.py` and `backend/llm.py` to direct SDK calls (git checkout of those two files).
2. Revert `backend/requirements.txt` to remove LangChain packages and restore `openai`.
3. Revert `backend/run_evals.py` to remove the `subprocess.run` promptfoo call.
4. `backend/evals/db.py` and `backend/evals/promptfoo.yaml` are additive new files — they can be left in place or deleted without affecting the pipeline.
5. `backend/evals/eval_history.db` is a local file never committed to source control; delete if desired.
6. Run `python run_evals.py` to confirm metrics match pre-change baseline.

No database migrations are required; SQLite file is local only.

---

## Dependencies

- `langchain-openai >= 0.2` and `langchain-core >= 0.3` (PyPI)
- Node.js >= 18 and `npx` available on `PATH` for promptfoo (developer machine only; not required inside Docker for normal pipeline operation)
- `OPENAI_API_KEY` environment variable — unchanged requirement

---

## Success Criteria

- [ ] `python run_evals.py` completes without error and prints precision/recall/F1/hallucination rate
- [ ] F1 score after LangChain migration is within ±2 percentage points of pre-migration baseline
- [ ] `backend/evals/eval_history.db` contains a new row after each `run_evals.py` invocation
- [ ] `npx promptfoo eval --config backend/evals/promptfoo.yaml` runs independently and produces a pass/fail result per test case
- [ ] No changes to `backend/agents/` files, `backend/main.py`, or `POST /analyze` API contract

## Exploration: Integrate promptfoo (local runner) into BS Detector pipeline, replacing direct OpenAI SDK calls with LangChain, and adding SQLite for eval result persistence

### Current State

The BS Detector pipeline is a FastAPI application with a multi-agent architecture:

**LLM Access — Two parallel patterns exist today (a code smell):**

1. `backend/llm.py` — a module-level synchronous `OpenAI` client with a bare `call_llm()` function. Nothing in the main agent pipeline calls this; it appears to be a legacy stub.
2. `backend/services/llm_service.py` — `LLMService` class wrapping `AsyncOpenAI`. This is what all agents actually use via `BaseAgent._call_llm()` and `BaseAgent._call_llm_text()`.

`LLMService` exposes two methods:
- `get_structured_response(prompt, response_model, system_prompt, temperature)` — calls `chat.completions.create` with `response_format={"type": "json_object"}` and parses the result into a Pydantic model.
- `get_completion(system, user, temperature)` — returns raw string.

**Agent pipeline:**
```
PipelineOrchestrator.analyze()
  └── DocumentParserAgent.execute()          # extracts Citations
        └── [CitationVerifierAgent ∥ FactCheckerAgent]  # asyncio.gather
              └── ReportSynthesizerAgent.execute()
```

Each agent calls `self._call_llm(prompt, PydanticModel)` which delegates to `llm_service.get_structured_response()`.

**Eval harness (`backend/evals/`):**
- `harness.py` — runs the full pipeline, extracts findings, calls `calculate_metrics()`, prints results, and writes `eval_results.json` to the working directory.
- `metrics.py` — pure Python precision/recall/F1/hallucination rate via keyword matching.
- `test_cases.py` — 8 ground-truth `KNOWN_DISCREPANCIES` dicts.
- `run_evals.py` — `asyncio.run(main())` entry point.
- Results are ephemeral: one JSON file, overwritten every run, no run history.

**HTTP interface:**
- `POST /analyze` returns `{"report": {...}}` where `report` is the full `VerificationReport` model serialized via `model_dump_json()`.
- The response is a deeply-nested JSON object with well-defined Pydantic schemas.

### Affected Areas

- `backend/services/llm_service.py` — primary change target; `LLMService` methods map 1-to-1 to LangChain equivalents.
- `backend/llm.py` — legacy synchronous stub; should be deleted or kept only as a compatibility shim; its `call_llm()` is unused by the agent pipeline.
- `backend/agents/base_agent.py` — `_call_llm` and `_call_llm_text` dispatch through `self.llm_service`; the interface contract is stable and will not change.
- `backend/agents/orchestrator.py` — constructs `LLMService()`; would construct the LangChain-backed service instead.
- `backend/evals/harness.py` — needs SQLite persistence layer added; current `eval_results.json` write becomes an append operation to DB.
- `backend/run_evals.py` — entry point unchanged, but downstream harness gains DB writes.
- `backend/requirements.txt` — must add `langchain`, `langchain-openai`, and (optionally) `aiosqlite` or the stdlib `sqlite3`.
- A new `promptfoo.yaml` (or `promptfoo/`) at the project root — config for the promptfoo http provider pointing at `POST /analyze`.
- A new `backend/evals/db.py` (or similar) — SQLite schema and persistence helpers.

### Approaches

#### 1. Thin LangChain Adapter — Wrap `LLMService` in a LangChain-backed implementation

Replace the internals of `LLMService` (or create `LangChainLLMService` implementing the same interface) using `langchain_openai.ChatOpenAI` and LangChain's `with_structured_output()` / `.ainvoke()`.

**How LangChain replaces direct OpenAI calls:**

`get_structured_response` today:
```python
response = await self.client.chat.completions.create(
    model=self.model,
    messages=[...],
    response_format={"type": "json_object"},
)
data = json.loads(response.choices[0].message.content)
return response_model(**data)
```

LangChain equivalent:
```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

llm = ChatOpenAI(model=self.model, temperature=temperature)
structured_llm = llm.with_structured_output(response_model)
result = await structured_llm.ainvoke([
    SystemMessage(content=system_prompt),
    HumanMessage(content=prompt),
])
# result is already a Pydantic instance
return result
```

`get_completion` today:
```python
response = await self.client.chat.completions.create(model=..., messages=[...])
return response.choices[0].message.content or ""
```

LangChain equivalent:
```python
chain = ChatPromptTemplate.from_messages([("system", "{system}"), ("human", "{user}")]) | llm
result = await chain.ainvoke({"system": system, "user": user})
return result.content
```

- Pros: Minimal surface-area change; `BaseAgent` interface unchanged; agents do not need to be touched; LangChain tracing (LangSmith) available for free.
- Cons: Adds LangChain as a dependency without using its orchestration features (chains, memory, tools); feels like overhead for what is essentially a model swap.
- Effort: Low

#### 2. Full LangChain Refactor — Replace agents with LCEL chains or LangGraph

Rebuild each agent as a LangChain Expression Language (LCEL) chain or LangGraph node. `DocumentParserAgent` becomes a `prompt | llm.with_structured_output(ExtractionResult)` chain, etc.

- Pros: Idiomatic LangChain; enables streaming, built-in retry, tracing, and future LangGraph migration.
- Cons: Large diff; asyncio parallelism in orchestrator must be re-expressed as LangGraph parallel nodes or `asyncio.gather` of awaited chains; risk of regressions; exceeds scope of stated goal.
- Effort: High

#### 3. promptfoo HTTP Provider — Point promptfoo at `POST /analyze`

promptfoo supports an `http` provider type that POSTs to any URL and inspects the JSON response. Config:

```yaml
# promptfoo.yaml
providers:
  - id: http
    config:
      url: http://localhost:8002/analyze
      method: POST
      headers:
        Content-Type: application/json
      body: {}   # /analyze takes no input body today

prompts:
  - "Run legal brief verification"   # descriptive label only

tests:
  - assert:
      - type: javascript
        value: |
          output.report.confidence_scores.overall > 0
      - type: javascript
        value: |
          output.report.top_findings.length > 0
      - type: javascript
        value: |
          output.report.top_findings.some(f => f.severity === 'critical')
      - type: javascript
        value: |
          !output.report.top_findings.some(f =>
            f.description.toLowerCase().includes('never') &&
            !['CIT-001'].includes(f.id)
          )
```

**What assertions can be made against the structured JSON output:**

Because `/analyze` returns a fully typed `VerificationReport`, promptfoo JavaScript assertions have strong targets:

| Assertion | Expression |
|-----------|------------|
| Report has findings | `output.report.top_findings.length >= 1` |
| Overall confidence in range | `output.report.confidence_scores.overall >= 0 && output.report.confidence_scores.overall <= 1` |
| At least one critical finding | `output.report.top_findings.some(f => f.severity === 'critical')` |
| PPE discrepancy detected | `JSON.stringify(output).toLowerCase().includes('ppe') \|\| JSON.stringify(output).toLowerCase().includes('hard hat')` |
| Date discrepancy detected | `JSON.stringify(output).toLowerCase().includes('march 12')` |
| Privette misquotation flagged | `JSON.stringify(output).toLowerCase().includes('never') \|\| JSON.stringify(output).toLowerCase().includes('privette')` |
| No empty judicial memo | `output.report.judicial_memo && output.report.judicial_memo.length > 50` |
| Hallucination rate below threshold | Computed post-run in custom metric, not natively in promptfoo |

- Pros: Zero code changes to the backend for a first pass; declarative test config; `promptfoo eval` produces HTML report; can be run in CI.
- Cons: `/analyze` currently takes no input body — every promptfoo test case hits the same fixed documents; to vary inputs the endpoint needs a `document_set` parameter or promptfoo uses a custom provider that calls the Python orchestrator directly.
- Effort: Low (initial), Medium (with variable inputs)

#### 4. SQLite Eval Persistence Schema

The current harness writes one `eval_results.json` per run, losing history. A SQLite layer adds run tracking with no external dependency (stdlib `sqlite3`).

**Proposed schema:**

```sql
CREATE TABLE IF NOT EXISTS eval_runs (
    run_id    TEXT PRIMARY KEY,          -- uuid4
    timestamp TEXT NOT NULL,             -- ISO-8601
    git_sha   TEXT,                      -- optional, for traceability
    metrics   TEXT NOT NULL,             -- JSON blob: precision, recall, f1, hallucination_rate, tp, fp, fn
    findings  TEXT NOT NULL,             -- JSON blob: the extracted findings list
    report    TEXT                       -- JSON blob: full VerificationReport (optional, large)
);
```

Queries of interest:
- Latest run: `SELECT * FROM eval_runs ORDER BY timestamp DESC LIMIT 1`
- Metric trend: `SELECT timestamp, json_extract(metrics, '$.f1_score') FROM eval_runs ORDER BY timestamp`
- Regression check: compare current run's `f1_score` against previous run.

New file `backend/evals/db.py` with:
- `init_db(path)` — creates schema if not exists.
- `save_run(run_id, metrics, findings, report, git_sha)` — inserts row.
- `get_runs(limit)` — returns recent rows.

`harness.py` gains a `db.save_run(...)` call after `calculate_metrics()`. The `eval_results.json` write can remain for backward compatibility.

- Pros: Zero new dependencies (stdlib `sqlite3`); persistent history; enables trend graphs or CI regression gates; tiny implementation (~50 lines).
- Cons: Concurrent writes not safe if run in parallel (acceptable for local eval runner); no schema migrations (add a `schema_version` row if needed later).
- Effort: Low

### Recommendation

**Phase 1 (Low effort, immediate value):**

Apply Approach 1 (thin LangChain adapter) + Approach 3 (promptfoo HTTP provider) + Approach 4 (SQLite persistence) together.

- Replace `LLMService` internals with `langchain_openai.ChatOpenAI` using `with_structured_output()` for `get_structured_response` and a simple LCEL chain for `get_completion`. Keep the method signatures identical so `BaseAgent` and all four agent classes need zero changes.
- Delete `backend/llm.py` (the unused sync stub) to eliminate confusion.
- Add `promptfoo.yaml` at project root with the `http` provider and the six assertions above.
- Add `backend/evals/db.py` with the three-table-free SQLite schema and wire it into `harness.py`.

**Phase 2 (if needed):** Add a `document_set` field to `POST /analyze` so promptfoo can drive different test documents and produce meaningful multi-case eval grids.

### Risks

- **`with_structured_output()` vs `response_format={"type": "json_object"}`**: LangChain's `with_structured_output` on `ChatOpenAI` uses function calling / tool calling by default, not the JSON mode flag. For `gpt-4o` this is equivalent or better, but the JSON returned may be wrapped differently. Must verify that the Pydantic model instances produced are identical in shape to what agents currently consume.
- **`llm.py` deletion**: Confirm nothing imports `from llm import call_llm` before deleting. A search of the codebase shows no such import in the agent or service layer, but the frontend Docker image and any external scripts should be checked.
- **promptfoo `http` provider — no variable inputs**: `POST /analyze` takes no request body today (the documents are loaded from disk inside the pipeline). A single promptfoo test case therefore exercises only one fixed scenario. Assertions are still useful as a smoke-test gate, but they cannot replace the custom metric harness for precision/recall measurement.
- **SQLite path portability**: When run inside Docker the DB file must be on a mounted volume or it is ephemeral. `eval_results.db` should be written to the same directory as `eval_results.json` (working directory) and documented accordingly.
- **LangChain version pinning**: `langchain` and `langchain-openai` release frequently and have had breaking changes between minor versions. Pin both with `==` in `requirements.txt` to avoid silent regressions.
- **Naming conflicts**: No existing symbol in the codebase is named `langchain`, `ChatOpenAI`, or `with_structured_output`. The import `from langchain_openai import ChatOpenAI` does not conflict with `from openai import AsyncOpenAI` because both can coexist; however, `openai` in `requirements.txt` may need its version pinned to stay compatible with the `langchain-openai` peer dependency.

### Ready for Proposal

Yes. The scope is well-bounded: one service class to rewrite, one YAML file to create, one new 50-line Python module, and two-line additions to `harness.py`. All agent classes, Pydantic schemas, prompt templates, and the FastAPI endpoint remain unchanged.

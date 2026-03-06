# Design: promptfoo-langchain-sqlite

**Change ID:** promptfoo-langchain-sqlite
**Date:** 2026-03-04
**Status:** Draft

---

## Overview

This document describes the technical design for integrating LangChain as the LLM call layer, promptfoo as a local eval runner, and SQLite as a persistent store for eval run history. The three concerns are bundled because they share a single coupling point: `backend/evals/harness.py` and the `run_evals.py` entry point.

The pipeline itself — all agent classes, Pydantic schemas, the FastAPI endpoint, and prompt templates — is unchanged by this design.

---

## Architecture Decisions

### 1. LangChain Adapter Strategy

**ADR: Replace `AsyncOpenAI` in `LLMService` with `ChatOpenAI` from `langchain-openai`, not `langchain-community`.**

`langchain-openai` is the first-party OpenAI integration package maintained by LangChain, pinned against the `openai` SDK directly. `langchain-community` is a catch-all package for third-party integrations; it re-exports `ChatOpenAI` but introduces an extra dependency layer and lags on version alignment.

**Rationale:**

- `ChatOpenAI` from `langchain-openai` is a drop-in for `AsyncOpenAI` at the method signature level. The two async entrypoints on `LLMService` — `get_structured_response` and `get_completion` — map 1-to-1 to LangChain primitives.
- `with_structured_output(response_model)` replaces the three-step `response_format={"type": "json_object"}` → `json.loads(content)` → `response_model(**data)` sequence. LangChain uses tool calling (function calling) under the hood for `gpt-4o`, which is strictly more reliable than JSON mode because the model is constrained to the schema by the API itself, not by an instruction in the system prompt.
- `ainvoke` is natively async throughout LangChain's `ChatOpenAI` implementation. No thread executor or bridging is needed.
- Version pinning: `langchain-openai>=0.3` depends on `openai>=1.50`. Both must be pinned explicitly in `requirements.txt` to prevent the resolver from pulling a conflicting transitive `openai` version against the existing direct `openai` pin.

**`get_structured_response` — replacement sketch:**

Current code in `llm_service.py`:

```python
# CURRENT — three steps: JSON mode prompt, parse, instantiate
schema = response_model.model_json_schema()
sys = f"Respond with valid JSON matching this schema:\n{json.dumps(schema, indent=2)}\nOutput ONLY valid JSON."
response = await self.client.chat.completions.create(
    model=self.model,
    messages=[{"role": "system", "content": sys}, {"role": "user", "content": prompt}],
    temperature=temperature,
    response_format={"type": "json_object"},
)
data = json.loads(response.choices[0].message.content)
return response_model(**data)
```

Replacement approach:

```python
# NEW — with_structured_output returns Pydantic model directly
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

llm = ChatOpenAI(model=self.model, temperature=temperature, api_key=self.api_key)
structured_llm = llm.with_structured_output(response_model)
return await structured_llm.ainvoke([
    SystemMessage(content=system_prompt or "You are a precise legal analysis assistant."),
    HumanMessage(content=prompt),
])
# No json.loads, no response_model(**data) — LangChain handles both
```

The `system_prompt` argument no longer needs to embed the JSON schema because tool calling enforces the schema at the API level. The fallback default system prompt ("You are a precise legal analysis assistant.") is kept for semantic clarity.

**`get_completion` — replacement sketch:**

Current:

```python
response = await self.client.chat.completions.create(
    model=self.model,
    messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
    temperature=temperature,
)
return response.choices[0].message.content or ""
```

Replacement using LCEL chain:

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

chain = (
    ChatPromptTemplate.from_messages([("system", "{system}"), ("human", "{user}")])
    | ChatOpenAI(model=self.model, temperature=temperature, api_key=self.api_key)
    | StrOutputParser()
)
return await chain.ainvoke({"system": system, "user": user})
```

`StrOutputParser()` extracts `.content` and returns `""` on `None`, replacing the `or ""` guard.

**`LLMService.__init__` — construction change:**

```python
# CURRENT
self.client = AsyncOpenAI(api_key=self.api_key)

# NEW — no client attribute; llm is constructed per-call or cached
# The ChatOpenAI instance can be constructed once at init time
# if temperature is fixed, or per-call if temperature varies.
# Because temperature varies between get_structured_response calls,
# construct ChatOpenAI inside each method.
```

**`backend/llm.py` — DELETE.**

`llm.py` exposes a module-level synchronous `OpenAI` client and a `call_llm()` function. A search of all agent and service imports confirms no file in the pipeline imports from `llm.py`. It is a legacy stub predating `LLMService`. Deleting it removes the second parallel LLM access pattern and eliminates the direct `openai.OpenAI` import. There is nothing to replace.

**Pin strategy for `requirements.txt`:**

```
# REMOVE
openai

# ADD
langchain-openai>=0.3.0
openai>=1.50.0    # explicit peer pin; langchain-openai requires it transitively
                  # but pinning here prevents accidental downgrade
```

`langchain-core` is a transitive dependency of `langchain-openai` and does not need a direct line in `requirements.txt` unless a specific version is required for LangSmith tracing (out of scope).

---

### 2. promptfoo Configuration

**ADR: Use the `http` provider, not the `python` provider.**

The `python` provider embeds pipeline execution inside the promptfoo process: promptfoo spawns a Python subprocess, imports the agent code, and runs it. This couples promptfoo to the exact Python environment, import paths, and async runtime of the pipeline. Debugging a failure requires understanding both promptfoo internals and the Python agent stack simultaneously.

The `http` provider treats the pipeline as a black box: it POSTs to `http://localhost:8002/analyze`, receives a `{"report": {...}}` JSON response, and evaluates assertions against `output.report`. This is simpler, more isolated, and matches real-world usage (CI hits the API container, not the source tree).

**Consequence:** The server must be running before `npx promptfoo eval` is invoked. `run_evals.py` does not start the server — that is the caller's responsibility (e.g., `uvicorn main:app` in one terminal). The warning message in `run_evals.py` must say so explicitly.

**Why local, not promptfoo cloud:** promptfoo cloud requires an account and network egress. The YAML config below uses only local `npx promptfoo eval` with no `--share` flag. It is fully reproducible inside Docker when Node ≥ 18 is installed, and in CI by adding a Node setup step.

**`backend/promptfooconfig.yaml` — location decision:**

The file is placed at `backend/promptfooconfig.yaml`, not at the project root, because:

1. All eval artifacts live under `backend/evals/` or `backend/`.
2. `run_evals.py` (in `backend/`) invokes the subprocess with a relative path `promptfooconfig.yaml` resolved from its own directory.
3. Avoids polluting the monorepo root with pipeline-specific tooling config.

**YAML sketch:**

```yaml
# backend/promptfooconfig.yaml
description: "BS Detector — smoke-test eval via POST /analyze"

providers:
  - id: http
    config:
      url: http://localhost:8002/analyze
      method: POST
      headers:
        Content-Type: application/json
      # No body: /analyze loads documents from disk internally.
      # Every test case exercises the same fixed document set.

prompts:
  - "Run legal brief verification"  # label only; http provider ignores prompt text

tests:
  - description: "Report has at least one finding"
    assert:
      - type: javascript
        value: "output.report.top_findings.length >= 1"

  - description: "DATE-001: March date discrepancy detected"
    assert:
      - type: javascript
        value: |
          JSON.stringify(output).toLowerCase().includes('march 12') ||
          JSON.stringify(output).toLowerCase().includes('march 14')

  - description: "PPE-001: PPE discrepancy detected"
    assert:
      - type: javascript
        value: |
          JSON.stringify(output).toLowerCase().includes('ppe') ||
          JSON.stringify(output).toLowerCase().includes('hard hat')

  - description: "CIT-001: Privette misquotation flagged"
    assert:
      - type: javascript
        value: |
          JSON.stringify(output).toLowerCase().includes('privette') ||
          JSON.stringify(output).toLowerCase().includes('never')

  - description: "CTRL-001: Retained control finding present"
    assert:
      - type: javascript
        value: |
          JSON.stringify(output).toLowerCase().includes('donner') ||
          JSON.stringify(output).toLowerCase().includes('control')

  - description: "Overall confidence score in valid range"
    assert:
      - type: javascript
        value: |
          output.report.confidence_scores.overall >= 0 &&
          output.report.confidence_scores.overall <= 1

  - description: "Judicial memo is non-empty"
    assert:
      - type: javascript
        value: |
          output.report.judicial_memo && output.report.judicial_memo.length > 50

  - description: "At least one critical severity finding"
    assert:
      - type: javascript
        value: |
          output.report.top_findings.some(function(f) { return f.severity === 'critical'; })
```

The assertions intentionally use `JSON.stringify` + `toLowerCase` keyword search to mirror the same keyword-matching logic in `metrics.py`. This keeps the two eval systems semantically aligned without sharing code.

CIT-002, SCAF-001, POST-001, and SOL-001 are not represented as dedicated test cases in this first iteration because their signal is lower confidence in a single POST with no input variation. They are covered transitively by the "at least one finding" assertion.

---

### 3. SQLite Persistence

**ADR: Use stdlib `sqlite3` with no ORM.**

`sqlalchemy`, `tortoise-orm`, and `databases` are all viable but introduce 100–500 kB of additional code and a migration mindset (Alembic versions, schema drift). The eval DB has exactly one table and three queries. `sqlite3` from the standard library handles this in ~50 lines without `pip install`.

**File location:** `backend/evals/evals.db`

This is parallel to `eval_results.json` (written in the working directory, which is `backend/` when invoked via `python run_evals.py`). The `.db` file must be added to `.gitignore`. The path is constructed relative to `harness.py`'s own `__file__`, not from `os.getcwd()`, so it is stable regardless of where `python run_evals.py` is called from.

```python
# In db.py — path construction
import pathlib
DB_PATH = pathlib.Path(__file__).parent / "evals.db"
```

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS eval_runs (
    run_id           TEXT PRIMARY KEY,   -- uuid4 hex
    timestamp        TEXT NOT NULL,      -- ISO-8601, UTC, e.g. "2026-03-04T14:22:01Z"
    git_sha          TEXT,               -- short SHA from `git rev-parse --short HEAD`; NULL if git unavailable
    precision        REAL NOT NULL,
    recall           REAL NOT NULL,
    f1_score         REAL NOT NULL,
    hallucination_rate REAL NOT NULL,
    true_positives   INTEGER NOT NULL,
    false_positives  INTEGER NOT NULL,
    false_negatives  INTEGER NOT NULL,
    findings_json    TEXT NOT NULL,      -- JSON array of finding dicts
    report_json      TEXT                -- full VerificationReport JSON; may be large (~20 KB)
);
```

Scalar metric columns (`precision`, `recall`, `f1_score`, `hallucination_rate`, `true_positives`, `false_positives`, `false_negatives`) are stored as first-class columns rather than inside a JSON blob. This allows trend queries using only SQL without `json_extract`:

```sql
SELECT timestamp, f1_score FROM eval_runs ORDER BY timestamp DESC LIMIT 10;
```

`findings_json` and `report_json` are JSON blobs for ad-hoc inspection and future tooling.

**Thread safety:** WAL (Write-Ahead Logging) mode is enabled in `init_db`:

```python
conn.execute("PRAGMA journal_mode=WAL")
```

Eval runs are sequential in the current design, so WAL is precautionary against future parallelism or concurrent reads by an external process (e.g., a trend viewer script running while evals are in progress).

**`backend/evals/db.py` — implementation sketch:**

```python
import sqlite3
import uuid
import json
import subprocess
import pathlib
from datetime import datetime, timezone
from typing import Optional

DB_PATH = pathlib.Path(__file__).parent / "evals.db"


def _get_git_sha() -> Optional[str]:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=3
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception:
        return None


def init_db(path: pathlib.Path = DB_PATH) -> None:
    with sqlite3.connect(path) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS eval_runs (
                run_id             TEXT PRIMARY KEY,
                timestamp          TEXT NOT NULL,
                git_sha            TEXT,
                precision          REAL NOT NULL,
                recall             REAL NOT NULL,
                f1_score           REAL NOT NULL,
                hallucination_rate REAL NOT NULL,
                true_positives     INTEGER NOT NULL,
                false_positives    INTEGER NOT NULL,
                false_negatives    INTEGER NOT NULL,
                findings_json      TEXT NOT NULL,
                report_json        TEXT
            )
        """)
        conn.commit()


def save_run(
    metrics: dict,
    findings: list,
    report: Optional[dict] = None,
    path: pathlib.Path = DB_PATH,
) -> str:
    run_id = uuid.uuid4().hex
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    git_sha = _get_git_sha()
    init_db(path)
    with sqlite3.connect(path) as conn:
        conn.execute("""
            INSERT INTO eval_runs (
                run_id, timestamp, git_sha,
                precision, recall, f1_score, hallucination_rate,
                true_positives, false_positives, false_negatives,
                findings_json, report_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            run_id, ts, git_sha,
            metrics["precision"], metrics["recall"],
            metrics["f1_score"], metrics["hallucination_rate"],
            metrics["true_positives"], metrics["false_positives"],
            metrics["false_negatives"],
            json.dumps(findings),
            json.dumps(report, default=str) if report else None,
        ))
        conn.commit()
    return run_id


def get_recent_runs(limit: int = 10, path: pathlib.Path = DB_PATH) -> list[dict]:
    init_db(path)
    with sqlite3.connect(path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM eval_runs ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(row) for row in rows]
```

`save_run` returns the `run_id` so `harness.py` can include it in `eval_results.json` for cross-referencing.

---

## Sequence Diagram

```
python run_evals.py
        |
        | asyncio.run(main())
        v
  harness.main()
        |
        | await run_pipeline()
        v
  PipelineOrchestrator.analyze()
        |
        | DocumentParserAgent.execute()
        |   └─ BaseAgent._call_llm()
        |       └─ LLMService.get_structured_response()
        |           └─ ChatOpenAI.with_structured_output().ainvoke()
        |               └──────────────────────────> OpenAI API
        |                                            (tool call)
        |                                            <──────────
        |           <── Pydantic model (no json.loads)
        |
        | asyncio.gather(citation_task, fact_task)
        |   CitationVerifierAgent / FactCheckerAgent
        |   each call LLMService.get_structured_response()
        |   (same path as above, concurrently)
        |
        | ReportSynthesizerAgent.execute()
        |   └─ LLMService.get_completion()
        |       └─ LCEL chain.ainvoke()
        |           └──────────────────────────────> OpenAI API
        |                                            (chat completion)
        |                                            <──────────
        |           <── str (StrOutputParser)
        |
        | extract_findings(report)
        | calculate_metrics(findings, KNOWN_DISCREPANCIES)
        |
        | db.save_run(metrics, findings, report)   <── NEW
        |   └─ sqlite3.connect("evals/evals.db")
        |       INSERT INTO eval_runs (...)
        |       (WAL mode; returns run_id)
        |
        | write eval_results.json (run_id added)   <── updated
        |
        v
  harness.main() returns
        |
        v
  run_evals.py: subprocess.run(
        ["npx", "promptfoo", "eval",            <── NEW
         "--config", "promptfooconfig.yaml"]
  )
        |
        | (server must already be running)
        v
  promptfoo
        |
        | for each test case:
        |   POST http://localhost:8002/analyze
        |   {}  (no body)
        v
  FastAPI /analyze
        |   (pipeline runs again; same LangChain path)
        v
  {"report": {...}}
        |
        v
  promptfoo: evaluate JavaScript assertions
             against output.report.*
             print pass/fail table
        |
        v  (exit 0 or non-zero; run_evals.py catches non-zero)
  run_evals.py: log warning if promptfoo failed
                exit 0 (Python harness result is authoritative)
```

---

## File Change Map

### `backend/services/llm_service.py` — MODIFIED

**What changes:**

1. Remove `import json`, `from openai import AsyncOpenAI`.
2. Add `from langchain_openai import ChatOpenAI`, `from langchain_core.messages import SystemMessage, HumanMessage`, `from langchain_core.prompts import ChatPromptTemplate`, `from langchain_core.output_parsers import StrOutputParser`.
3. `__init__`: remove `self.client = AsyncOpenAI(...)`. The `api_key` and `model` attributes are kept; `ChatOpenAI` is constructed per-call (temperature varies).
4. `get_structured_response`: replace the entire body as shown in the ADR sketch above. The method signature is unchanged.
5. `get_completion`: replace the entire body with the LCEL chain sketch. The method signature is unchanged.

**What does NOT change:** class name `LLMService`, `__init__` signature, both public method signatures. `BaseAgent._call_llm` and `_call_llm_text` are unaffected.

---

### `backend/llm.py` — DELETE

No imports of `from llm import call_llm` exist in any agent, service, or test file. The file is an unused legacy synchronous stub. Delete it entirely.

**Verify before deletion:**

```bash
grep -r "from llm import\|import llm" backend/
# Expected: no output
```

---

### `backend/evals/db.py` — NEW

Full implementation as shown in the ADR sketch above. Approximately 75 lines. Exposes: `init_db`, `save_run`, `get_recent_runs`.

The `DB_PATH` constant resolves to the same directory as `db.py` itself (`backend/evals/evals.db`), ensuring the path is stable regardless of the working directory from which `run_evals.py` is invoked.

---

### `backend/promptfooconfig.yaml` — NEW

Full content as shown in the ADR sketch above. Eight test cases corresponding to the `KNOWN_DISCREPANCIES` IDs in `test_cases.py`, with an additional structural assertion on `confidence_scores.overall` and `judicial_memo`.

The file is placed at `backend/promptfooconfig.yaml` (not `backend/evals/`) so `run_evals.py` can reference it with a path relative to its own location:

```python
config_path = pathlib.Path(__file__).parent / "promptfooconfig.yaml"
```

---

### `backend/evals/harness.py` — MODIFIED

**What changes:**

1. Add import at top:

```python
from evals import db  # or: from evals.db import save_run
```

2. After `calculate_metrics(findings, KNOWN_DISCREPANCIES)` and before writing `eval_results.json`, add:

```python
run_id = db.save_run(metrics=metrics, findings=findings, report=report)
logger.info(f"Run saved to eval DB: run_id={run_id}")
```

3. Include `run_id` in the JSON written to `eval_results.json`:

```python
with open("eval_results.json", "w") as f:
    json.dump({"run_id": run_id, "metrics": metrics, "report": report}, f, indent=2, default=str)
```

**What does NOT change:** `run_pipeline()`, `extract_findings()`, the metrics print block, the `asyncio.run(main())` pattern. The `eval_results.json` file continues to be written for backward compatibility with any tooling that reads it.

---

### `backend/run_evals.py` — MODIFIED

**What changes:**

Replace the current minimal entry point with a wrapper that runs the Python harness and then invokes promptfoo:

```python
"""Single-command entry point for the evaluation harness."""
import asyncio
import subprocess
import sys
import os
import logging
import pathlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from evals.harness import main

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    # Step 1: Python eval harness (authoritative metrics + SQLite persist)
    asyncio.run(main())

    # Step 2: promptfoo smoke-test (advisory; requires server on :8002 and Node >= 18)
    config = pathlib.Path(__file__).parent / "promptfooconfig.yaml"
    print()
    print("=" * 60)
    print("Running promptfoo eval (requires: uvicorn on :8002, npx)")
    print("=" * 60)
    try:
        result = subprocess.run(
            ["npx", "promptfoo", "eval", "--config", str(config)],
            check=False,
        )
        if result.returncode != 0:
            logger.warning(
                "promptfoo eval exited with code %d — "
                "Python harness result is authoritative",
                result.returncode,
            )
    except FileNotFoundError:
        logger.warning(
            "npx not found — skipping promptfoo eval. "
            "Install Node >= 18 to enable it."
        )
```

`check=False` on `subprocess.run` means a non-zero promptfoo exit does not raise; the warning is logged and `run_evals.py` exits 0. The Python harness exit (step 1) is authoritative: if the harness raises, `asyncio.run(main())` propagates the exception and `run_evals.py` exits non-zero before promptfoo is invoked.

---

### `backend/requirements.txt` — MODIFIED

```
# BEFORE
fastapi
uvicorn
openai
python-dotenv
pydantic>=2.0
tenacity

# AFTER
fastapi
uvicorn
openai>=1.50.0
python-dotenv
pydantic>=2.0
tenacity
langchain-openai>=0.3.0
```

`langchain-core` is pulled transitively by `langchain-openai` and does not require a direct line. `openai>=1.50.0` is kept as an explicit direct pin to prevent the resolver from selecting an older version that conflicts with `langchain-openai`'s peer requirement. The bare `openai` line is replaced with the pinned form.

---

### Files with NO changes

| File | Reason |
|---|---|
| `backend/agents/base_agent.py` | `_call_llm` and `_call_llm_text` call `self.llm_service` methods; signatures unchanged |
| `backend/agents/orchestrator.py` | Constructs `LLMService()`; `LLMService` public interface unchanged |
| `backend/agents/document_parser.py` | Uses `BaseAgent._call_llm`; no direct LLM access |
| `backend/agents/citation_verifier.py` | Same |
| `backend/agents/fact_checker.py` | Same |
| `backend/agents/report_synthesizer.py` | Same |
| `backend/main.py` | `POST /analyze` endpoint and `VerificationReport` schema unchanged |
| `backend/models/schemas.py` | Pydantic models unchanged |
| `backend/evals/metrics.py` | `calculate_metrics` unchanged |
| `backend/evals/test_cases.py` | `KNOWN_DISCREPANCIES` unchanged |
| `backend/utils/prompts.py` | Prompt template strings unchanged |

---

## Integration Constraints and Edge Cases

### `with_structured_output` vs JSON mode — behavioral difference

The current code uses `response_format={"type": "json_object"}` with a schema embedded in the system prompt. LangChain's `with_structured_output` on `ChatOpenAI` defaults to tool calling (function calling) for models that support it (`gpt-4o` does). The API contract changes from "produce JSON matching this schema" (soft constraint, enforced by prompt) to "call this function with these typed arguments" (hard constraint, enforced by the API).

In practice, the Pydantic models produced will be identical in shape. The risk is that tool calling changes the token budget allocation: arguments are returned in a structured format rather than in `choices[0].message.content`. The `content` field will be `None` when tool calling is used. This is handled internally by LangChain — `with_structured_output` reads from the tool call arguments, not from `content`. No agent code touches response internals, so this is transparent.

If a Pydantic model has fields that are difficult to express as a JSON Schema (e.g., recursive types or `Union` types with complex discriminators), `with_structured_output` may fall back to JSON mode automatically. The existing schemas in `backend/models/schemas.py` do not have such fields.

### Temperature per-call construction

The current `LLMService` constructs `AsyncOpenAI` once in `__init__` and passes `temperature` to each `chat.completions.create` call. `ChatOpenAI` can be constructed with a temperature that applies to all calls, or temperature can be set per-call using `.bind(temperature=t)`.

Because both `get_structured_response` and `get_completion` accept a `temperature` argument, the cleanest approach is to construct `ChatOpenAI` inside each method call rather than caching it. For `gpt-4o` the construction overhead is negligible (no network call, no state initialization). If profiling reveals a concern, a `functools.lru_cache`-keyed on `(model, temperature)` can be added later.

### SQLite path when called from different working directories

`run_evals.py` inserts `os.path.dirname(os.path.abspath(__file__))` into `sys.path`. All imports then resolve relative to `backend/`. `db.py` uses `pathlib.Path(__file__).parent / "evals.db"`, which resolves to `backend/evals/evals.db` regardless of the caller's working directory.

`eval_results.json` continues to be written to the working directory (the current behavior). In practice this is always `backend/` when invoked as `python run_evals.py`. This asymmetry is intentional: `eval_results.json` is ephemeral and its location is already documented; `evals.db` is persistent and must be at a stable absolute path.

### promptfoo requires a running server

The `http` provider POSTs to `http://localhost:8002/analyze`. The server is not started by `run_evals.py`. If the server is not running, promptfoo will fail with a connection refused error, exit non-zero, and `run_evals.py` will log a warning and exit 0. The Python harness result (metrics + SQLite row) is unaffected.

The `run_evals.py` print statement before the `subprocess.run` call explicitly states this requirement:

```
Running promptfoo eval (requires: uvicorn on :8002, npx)
```

A future improvement could start `uvicorn` as a background subprocess and terminate it after promptfoo completes. This is deferred per the proposal scope.

### `.gitignore` entries required

The following must be added to `.gitignore` (or the root `.gitignore` if `backend/` does not have its own):

```
backend/evals/evals.db
backend/evals/evals.db-wal
backend/evals/evals.db-shm
```

The `-wal` and `-shm` suffixes are WAL mode journal files that exist while a write transaction is open or while the WAL has not been checkpointed. They must not be committed.

---

## Rollback

1. `git checkout backend/services/llm_service.py` — restores `AsyncOpenAI` call layer.
2. `git checkout backend/requirements.txt` — removes `langchain-openai`, restores bare `openai`.
3. `git checkout backend/run_evals.py` — removes promptfoo subprocess call.
4. `git checkout backend/llm.py` — restores the legacy stub (if desired; it is unused).
5. `backend/evals/db.py`, `backend/promptfooconfig.yaml`, `backend/evals/evals.db` are additive and can be left in place or deleted; neither affects the pipeline or the harness if `db.save_run` is removed from `harness.py`.
6. Remove the `db.save_run(...)` call and `run_id` reference from `harness.py`.
7. Run `python run_evals.py`; confirm F1 matches pre-change baseline (within ±2 pp).

No database migrations are required. `evals.db` is a local file that is never committed.

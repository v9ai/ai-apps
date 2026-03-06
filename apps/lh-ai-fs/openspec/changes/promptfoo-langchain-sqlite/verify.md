# Verification Report: promptfoo-langchain-sqlite

**Change ID:** promptfoo-langchain-sqlite
**Date:** 2026-03-04
**Verifier:** sdd-verify agent
**Spec:** openspec/changes/promptfoo-langchain-sqlite/spec.md
**Design:** openspec/changes/promptfoo-langchain-sqlite/design.md

---

## Summary

| File | Status | Failures |
|---|---|---|
| `backend/requirements.txt` | WARN | 1 |
| `backend/services/llm_service.py` | FAIL | 3 |
| `backend/llm.py` | PASS | 0 |
| `backend/evals/db.py` | FAIL | 4 |
| `backend/promptfooconfig.yaml` | FAIL | 3 |
| `backend/evals/harness.py` | WARN | 1 |
| `backend/run_evals.py` | FAIL | 2 |
| `.gitignore` | WARN | 1 |

**Overall result: FAIL** — 10 FAIL items, 3 WARN items across all files.

---

## 1. `backend/requirements.txt` — R-LC-01, R-LC-07

### R-LC-01 / R-LC-07: langchain-openai and langchain-core present

```
langchain-openai>=0.3.0   # present
langchain-core>=0.3.0     # present
openai>=1.50.0            # present
```

**WARN — R-LC-07 minor deviation:** Spec R-LC-07 requires `langchain-openai>=0.2` and `langchain-core>=0.3`. The implementation pins `langchain-openai>=0.3.0`, which is stricter but compatible. The design doc (section "Pin strategy") explicitly calls for `>=0.3.0`, so this is aligned with design. The spec's `>=0.2` lower bound is satisfied. No functional issue, but the pin is higher than the spec minimum.

**WARN — R-LC-07 comment requirement:** Spec R-LC-07 states "if [openai] removed, a comment MUST note it is a transitive dependency." The `openai` line is retained as an explicit peer pin (`openai>=1.50.0`) rather than removed, so the comment requirement does not technically apply. However, the design doc states the bare `openai` line is "replaced with the pinned form." No comment is present in `requirements.txt` to note the rationale. This is a minor documentation omission, not a functional failure.

**PASS** for functional requirements. **WARN** for the missing rationale comment.

---

## 2. `backend/services/llm_service.py` — R-LC-01 through R-LC-09

### R-LC-01: ChatOpenAI constructed in `__init__`, stored as `self.llm`

```python
self.llm = ChatOpenAI(model=self.model, temperature=0, api_key=self.api_key)
```

**FAIL — R-LC-01 temperature default:** Spec R-LC-01 requires `temperature` to default to `0.1` at construction time. The implementation constructs `ChatOpenAI` with `temperature=0` (not `0.1`). This deviates from the specified default. At call time `with_temperature(temperature)` is used with the per-method `temperature` parameter (default `0.1`), so call-level behaviour is correct, but the `__init__`-level construction does not match the spec's stated value.

**PASS** — `AsyncOpenAI` is not constructed anywhere in `llm_service.py`. Confirmed by grep: no matches for `AsyncOpenAI` or `from openai import` in this file.

**PASS** — `self.llm` attribute is set.

### R-LC-02: Public signatures unchanged

```python
async def get_structured_response(
    self, prompt: str, response_model: Type[BaseModel],
    system_prompt: str = "", temperature: float = 0.1,
) -> BaseModel: ...

async def get_completion(
    self, system: str, user: str, temperature: float = 0.1,
) -> str: ...
```

**PASS** — Both signatures match the spec exactly.

### R-LC-03: `get_structured_response` uses `with_structured_output().ainvoke()`

```python
llm = self.llm.with_temperature(temperature)
structured = llm.with_structured_output(response_model)
result = await structured.ainvoke([
    SystemMessage(content=effective_system),
    HumanMessage(content=prompt),
])
```

**PASS** — `with_structured_output` and `ainvoke` are used correctly.

**PASS — R-LC-03 no `json.loads`:** grep confirms `json.loads` is absent from `llm_service.py`.

### R-LC-04: Default system prompt when `system_prompt` is empty

```python
effective_system = system_prompt or self._default_system_prompt(response_model)
```

The `_default_system_prompt` method embeds the JSON schema:

```python
def _default_system_prompt(self, response_model: Type[BaseModel]) -> str:
    schema = response_model.model_json_schema()
    return (
        "You are a precise legal analysis assistant. "
        f"Respond with valid JSON matching this schema:\n{json.dumps(schema, indent=2)}\n"
        "Output ONLY valid JSON. Be precise and factual."
    )
```

**PASS** — Behaviour is preserved. Note: the design doc suggests the schema embed is no longer needed when using tool calling, but the spec R-LC-04 explicitly requires preserving it for identical prompt behaviour, which the implementation does.

### R-LC-05: `get_completion` uses LCEL chain

```python
chain = (
    ChatPromptTemplate.from_messages([
        ("system", "{system}"),
        ("human", "{user}"),
    ])
    | self.llm.with_temperature(temperature)
    | StrOutputParser()
)
result = await chain.ainvoke({"system": system, "user": user})
return result or ""
```

**PASS** — LCEL chain pattern is correct. `StrOutputParser()` handles content extraction.

**WARN — R-LC-05 minor deviation from spec sketch:** The spec sketch uses `self.llm.with_temperature(temperature)` in the chain, and the implementation does the same. The spec shows `result.content or ""` returning a string, whereas the implementation uses `StrOutputParser()` which already extracts `.content`. The end semantic is identical. No functional issue.

### R-LC-06: ValueError on empty response or exception

```python
try:
    result = await structured.ainvoke([...])
except Exception as e:
    raise ValueError("Empty LLM response") from e
if result is None:
    raise ValueError("Empty LLM response")
```

**PASS** — Both exception and None cases raise `ValueError("Empty LLM response")`.

**FAIL — R-LC-06 missing content check:** Spec R-LC-06 states "If `result.content` from `get_structured_response` is empty … raise `ValueError`." The implementation checks `result is None` but does not check `result.content`. For `with_structured_output`, the returned value is a Pydantic model instance (not an AIMessage), so `result.content` does not apply. However, the spec wording and the scenario LC-2 (`content=None`) suggest the check should also handle a falsy `.content` attribute on the returned object. In practice this case does not arise with `with_structured_output`, but the spec requirement is not fully implemented as written.

### R-LC-08 / R-LC-09: `backend/llm.py` deleted

**PASS** — `backend/llm.py` does not exist. Confirmed with `ls` returning "No such file or directory."

**PASS** — grep across `backend/` for `from llm import` and `import llm` returns no matches.

---

## 3. `backend/llm.py` — R-LC-08, R-LC-09

**PASS** — File does not exist. Deletion is complete and confirmed.

---

## 4. `backend/evals/db.py` — R-DB-01 through R-DB-11

### R-DB-01: Only stdlib `sqlite3` and `uuid`

```python
import json, pathlib, sqlite3, subprocess, uuid
from datetime import datetime, timezone
from typing import Optional
```

**PASS** — No ORM or third-party packages. All imports are stdlib.

### R-DB-02: Three required public functions

Spec requires exactly:
```python
def init_db(path: str) -> None: ...
def save_run(run_id: str, timestamp: str, git_sha: str | None,
             metrics: dict, findings: list, report: dict | None) -> None: ...
def get_runs(limit: int = 10) -> list[dict]: ...
```

Implementation exposes:
- `init_db(path: pathlib.Path = DB_PATH) -> None` — present
- `save_run(metrics: dict, findings: list, report: dict) -> str` — present but **signature differs**
- `get_recent_runs(n: int = 10) -> list[dict]` — present but **name differs**

**FAIL — R-DB-02 `save_run` signature mismatch:** The spec requires `save_run(run_id, timestamp, git_sha, metrics, findings, report)` where `run_id`, `timestamp`, and `git_sha` are caller-supplied arguments. The implementation signature is `save_run(metrics, findings, report)` — `run_id`, `timestamp`, and `git_sha` are generated internally. The implementation returns `run_id`, which the spec says the function MUST return, but the spec simultaneously requires these as input parameters. The design doc (`save_run` sketch, line "Accept `run_id` as a UUID4 string (generated by the caller)") and the spec R-DB-04 are at odds with the implementation choice to generate them internally. Functionally the caller still gets a `run_id` back, but the API contract stated in R-DB-02 is not met.

**FAIL — R-DB-02 `get_runs` name mismatch:** The spec requires a function named `get_runs(limit: int = 10)`. The implementation names it `get_recent_runs(n: int = 10)`. The parameter name is also `n` instead of `limit`. Any caller written against the spec API (`db.get_runs(limit=10)`) will get an `AttributeError`.

### R-DB-03: DDL — `CREATE TABLE IF NOT EXISTS`, WAL mode

```sql
CREATE TABLE IF NOT EXISTS eval_runs (
    run_id             TEXT PRIMARY KEY,
    timestamp          TEXT NOT NULL,
    git_sha            TEXT,
    precision          REAL,
    recall             REAL,
    ...
    metrics            TEXT NOT NULL,
    findings           TEXT,
    report             TEXT
)
```

```python
conn.execute("PRAGMA journal_mode=WAL")
```

**PASS** — `IF NOT EXISTS` is present. WAL mode is enabled.

**FAIL — R-DB-03 schema divergence from spec:** The spec R-DB-03 defines a minimal schema:

```sql
CREATE TABLE IF NOT EXISTS eval_runs (
    run_id    TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    git_sha   TEXT,
    metrics   TEXT NOT NULL,
    findings  TEXT NOT NULL,
    report    TEXT
);
```

The implementation adds scalar metric columns (`precision`, `recall`, `f1_score`, `hallucination_rate`, `true_positives`, `false_positives`, `false_negatives`) and changes `findings TEXT NOT NULL` to `findings TEXT` (nullable). The extra columns are an additive extension consistent with the design doc (which shows them explicitly). However, the spec R-DB-03 states the exact DDL "MUST" be executed, making this a spec deviation. The spec schema is the normative definition; the implementation exceeds it.

Additionally, `findings` is declared `NOT NULL` in the spec but is nullable in the implementation. This is a constraint downgrade.

### R-DB-04: `save_run` behaviour

**PASS** — `run_id` is generated as `uuid.uuid4().hex`.

**PASS** — `timestamp` is ISO-8601 UTC via `datetime.now(timezone.utc).strftime(...)`.

**PASS** — `git_sha` falls back to `None` on failure via `_get_git_sha()`.

**PASS** — `metrics` and `findings` are serialised via `json.dumps`.

**PASS** — `report` is serialised or stored as NULL.

**FAIL — R-DB-04 `path` parameter ignored in `save_run`:** The implementation calls `init_db()` (no path argument) and then `sqlite3.connect(DB_PATH)` (hardcoded module constant) rather than using the caller-supplied path. This means the `path` parameter from `save_run`'s spec signature cannot be used (the signature doesn't accept it anyway, due to the R-DB-02 mismatch), and makes the DB path non-overridable in tests as required by R-DB-06.

### R-DB-05: `get_runs` returns parsed dicts

The implementation `get_recent_runs` returns `[dict(row) for row in rows]` without parsing `metrics`, `findings`, or `report` back from JSON strings.

**FAIL — R-DB-05 JSON fields not deserialized:** Spec R-DB-05 requires "The `metrics` and `findings` values MUST be parsed back from JSON strings to Python dicts/lists before being returned. `report` MUST be returned as a parsed dict if not NULL." The implementation returns raw JSON strings for all three columns — no `json.loads` call is present in `get_recent_runs`.

### R-DB-06: Default DB path

```python
DB_PATH = pathlib.Path(__file__).parent / "evals.db"
```

**PASS** — Path is relative to `__file__`, resolves to `backend/evals/evals.db`, documented as a module-level constant.

**WARN — R-DB-06 path name:** Spec recommends `backend/evals/eval_history.db`. Implementation uses `backend/evals/evals.db`. The design doc explicitly uses `evals.db`. This is a minor naming divergence from the spec recommendation (SHOULD, not MUST), aligned with the design.

### R-DB-07: `eval_history.db` in `.gitignore`

**PASS** — `.gitignore` contains `evals.db`, `evals.db-wal`, `evals.db-shm` which covers the actual file name used.

---

## 5. `backend/promptfooconfig.yaml` — R-PF-01 through R-PF-09

### R-PF-01: File at `backend/promptfooconfig.yaml`

**PASS** — File exists at the correct location.

### R-PF-02: HTTP provider at `http://localhost:8002/analyze`

```yaml
providers:
  - id: http
    config:
      url: http://localhost:8002/analyze
      method: POST
      headers:
        Content-Type: application/json
```

**PASS** — Provider type, URL, method, and Content-Type header are all correct.

### R-PF-03: No body or empty body

**PASS** — No body is specified in the provider config.

### R-PF-04: `prompts` list with at least one entry

```yaml
prompts:
  - "Run BS Detector legal brief verification"
```

**PASS** — One prompt label present.

### R-PF-05: At least one `tests` block with `javascript` assertions

**PASS** — One `tests` block with 8 `javascript` assertions.

### R-PF-06: Minimum 6 required assertions A-01 through A-06

The spec requires these six assertions by their IDs and exact JavaScript expressions:

| Spec Assertion ID | Spec Expression | Present in YAML | Notes |
|---|---|---|---|
| A-01 | `output.report.top_findings.length >= 1` | NO | Implementation uses `top_findings` via stringify search, no `.length` check |
| A-02 | `output.report.confidence_scores.overall >= 0 && ...` | NO | Not present anywhere in YAML |
| A-03 | `output.report.top_findings.some(f => f.severity === 'critical')` | NO | Not present anywhere in YAML |
| A-04 | `JSON.stringify(output).toLowerCase().includes('march 12')` | PARTIAL | Present but searches `output.report.top_findings` + `verified_facts`, not `JSON.stringify(output)` |
| A-05 | `JSON.stringify(output).toLowerCase().includes('ppe') || ... includes('hard hat')` | PARTIAL | Present but scoped to sub-fields, not `JSON.stringify(output)` |
| A-06 | `output.report.judicial_memo && output.report.judicial_memo.length > 50` | NO | Not present anywhere in YAML |

**FAIL — R-PF-06 assertions A-01, A-02, A-03, A-06 are missing:** The implementation replaces the six required structural assertions with eight domain-specific assertions (DATE-001, PPE-001, CIT-001, SOL-001, CTRL-001, CIT-002, SCAF-001, POST-001). These cover more ground than A-04/A-05/A-07/A-08 but omit the four required structural checks: `top_findings.length >= 1`, `confidence_scores.overall` range, `some(f => f.severity === 'critical')`, and `judicial_memo.length > 50`. These are the minimum six the spec REQUIRES.

### R-PF-07: Each assertion has a human-readable `description`

**PASS** — All 8 assertions have `description` fields. However, the descriptions are on the assertion entries inside the single test block, not on separate test blocks per assertion as the design sketch shows. This is a structural difference but still satisfies the requirement that each assertion has a description.

### R-PF-08: Warning message when server not reachable

The spec requires `run_evals.py` to print:
```
[promptfoo] Server not reachable at http://localhost:8002/analyze. Start the backend before running promptfoo evals. Skipping.
```

The implementation prints:
```
Warning: npx not found — skipping promptfoo eval
```
(for `FileNotFoundError`) and has no explicit server-not-reachable message.

**FAIL — R-PF-08 missing server-not-reachable warning:** The `run_evals.py` has no explicit catch for the connection-refused case (which promptfoo handles internally by exiting non-zero). The spec requires a specific printed message with the exact text `[promptfoo] Server not reachable...`. The implementation only logs a warning when promptfoo's exit code is non-zero (via the warning in the design sketch), but this is not implemented — the current `run_evals.py` has no `returncode` check or server-not-reachable message.

### R-PF-09: `FileNotFoundError` caught with correct warning

Spec requires:
```
[promptfoo] npx not found. Install Node.js >= 18 to enable promptfoo evals. Skipping.
```

Implementation prints:
```
Warning: npx not found — skipping promptfoo eval
```

**FAIL — R-PF-09 warning message text does not match spec:** The required prefix `[promptfoo]` is absent, and the text "Install Node.js >= 18 to enable promptfoo evals. Skipping." is replaced by "skipping promptfoo eval". The spec uses MUST language for this message (R-PF-09).

### R-PF-09 (functional): `FileNotFoundError` is caught

**PASS** — `except FileNotFoundError` is present in `run_evals.py`.

---

## 6. `backend/evals/harness.py` — R-DB-08, R-DB-09, R-DB-10, R-DB-11, R-RE-01

### R-DB-08: `db.init_db(DB_PATH)` called at start of `main()`

```python
from evals.db import save_run
```

**FAIL — R-DB-08 `init_db` not called in `harness.py`:** The spec requires `harness.py` to call `db.init_db(DB_PATH)` once at the start of `main()`, before `run_pipeline()`. The implementation does not call `init_db` in `main()`. Instead, `init_db` is called implicitly inside `save_run` (`init_db()` at line 74 of `db.py`). This is functionally equivalent but does not satisfy the explicit requirement in R-DB-08. `init_db` is not even imported in `harness.py`.

**WARN — R-DB-08 import style:** Spec says `import db from evals.db` or similar. Implementation imports `from evals.db import save_run` — a function-level import rather than a module-level import. This changes how `db.init_db` would be called but is moot since `init_db` is not called at all in `harness.py`.

### R-DB-09: `save_run` called with required arguments after `calculate_metrics`

```python
run_id = save_run(metrics, findings, report)
```

**PASS** — `save_run` is called after `calculate_metrics`.

**WARN — R-DB-09 argument mismatch with spec:** Spec R-DB-09 requires `save_run` to be called with `run_id`, `timestamp`, `git_sha`, `metrics`, `findings`, `report` as named arguments from `harness.py`. Due to the API divergence in R-DB-02 (these are generated inside `save_run`, not passed by the caller), this does not match the spec's call pattern but the implementation is internally consistent.

### R-DB-10: `eval_results.json` write preserved, `run_id` added

```python
with open("eval_results.json", "w") as f:
    json.dump({"run_id": run_id, "metrics": metrics, "report": report}, f, indent=2, default=str)
```

**PASS** — `eval_results.json` is written. `run_id` key is present at the top level.

### R-DB-11: `save_run` wrapped in `try/except Exception`

```python
run_id = None
try:
    run_id = save_run(metrics, findings, report)
    logger.info("Eval run persisted to SQLite (run_id=%s)", run_id)
except Exception as e:
    logger.warning("Could not persist eval run to SQLite: %s", e)
```

**PASS** — `try/except Exception` is present. Warning is logged on failure. Execution continues.

---

## 7. `backend/run_evals.py` — R-RE-01 through R-RE-07

### R-RE-01: `python run_evals.py` is the single entry point

**PASS** — `asyncio.run(main())` from `evals.harness` is the primary action.

### R-RE-02: `asyncio.run(main())` called first

```python
try:
    asyncio.run(main())
except Exception as exc:
    print(f"Error: {exc}")
    sys.exit(1)
```

**PASS** — Harness runs first before promptfoo subprocess.

### R-RE-03: promptfoo invoked as subprocess after harness succeeds

```python
subprocess.run(
    ["npx", "promptfoo", "eval", "--config", "promptfooconfig.yaml"],
    check=False,
    cwd=_BACKEND_DIR,
)
```

**PASS** — Invoked after harness, `check=False` is set.

**WARN — R-RE-03 config path:** Spec R-PF-01 says `run_evals.py` "MUST pass `--config backend/promptfooconfig.yaml` as an absolute-or-relative path resolvable from the project root." The implementation passes `promptfooconfig.yaml` (no `backend/` prefix) but sets `cwd=_BACKEND_DIR` (the `backend/` directory). The config path resolves correctly relative to the CWD, but the spec's explicit path `backend/promptfooconfig.yaml` from the project root is not used. This is functionally equivalent but deviates from the specified invocation form.

### R-RE-04: `try/except FileNotFoundError` and `subprocess.SubprocessError`

```python
except FileNotFoundError:
    print("Warning: npx not found — skipping promptfoo eval")
except subprocess.SubprocessError as exc:
    print(f"Warning: promptfoo subprocess error — skipping ({exc})")
```

**PASS** — Both exception types are caught.

### R-RE-05: Harness failure prevents promptfoo invocation

```python
try:
    asyncio.run(main())
except Exception as exc:
    print(f"Error: {exc}")
    sys.exit(1)

# promptfoo block is outside the try, so only reached if harness succeeds
subprocess.run(...)
```

**PASS** — `sys.exit(1)` after harness failure prevents reaching the promptfoo block.

### R-RE-06: promptfoo exit code does not affect `run_evals.py` exit code

**PASS** — `check=False` ensures no `CalledProcessError`. The script exits 0 after both blocks complete.

### R-RE-07: Fewer than 40 lines

**PASS** — `run_evals.py` is 29 lines (confirmed by `wc -l`).

---

## 8. `.gitignore` — R-DB-07, C-05

**PASS** — `.gitignore` contains `evals.db`, `evals.db-wal`, `evals.db-shm`.

**WARN — R-DB-07 path specificity:** Spec R-DB-07 requires `eval_history.db` added to `.gitignore`. The design doc requires `backend/evals/evals.db`. The implementation uses bare `evals.db` (no path prefix) in `.gitignore`, which matches any `evals.db` in any directory. This is broader than needed but correctly covers the actual DB file at `backend/evals/evals.db`. The spec-named file (`eval_history.db`) is not present in `.gitignore`, but since the implementation uses `evals.db` as its actual DB filename, the correct file is covered.

---

## Consolidated Findings

### FAIL Items

| ID | File | Requirement | Description |
|---|---|---|---|
| F-01 | `llm_service.py` | R-LC-01 | `ChatOpenAI` constructed with `temperature=0`, spec requires `temperature=0.1` (default at init time) |
| F-02 | `llm_service.py` | R-LC-06 | Missing check for falsy `result.content` on the returned object; only `result is None` is checked |
| F-03 | `db.py` | R-DB-02 | `save_run` signature is `(metrics, findings, report)` — spec requires `(run_id, timestamp, git_sha, metrics, findings, report)`; `get_runs` function missing (implemented as `get_recent_runs` with `n` not `limit`) |
| F-04 | `db.py` | R-DB-03 | Schema includes extra scalar metric columns not in spec DDL; `findings` column is nullable, spec requires NOT NULL |
| F-05 | `db.py` | R-DB-05 | `get_recent_runs` returns raw JSON strings for `metrics`, `findings`, `report`; spec requires these deserialized back to Python objects |
| F-06 | `db.py` | R-DB-04/06 | `save_run` ignores any caller-supplied `path`; always writes to hardcoded `DB_PATH` |
| F-07 | `promptfooconfig.yaml` | R-PF-06 | Assertions A-01 (`top_findings.length >= 1`), A-02 (`confidence_scores.overall` range), A-03 (`some(f => severity === 'critical'`), A-06 (`judicial_memo.length > 50`) are absent — only 4 of the 6 required assertions are approximated |
| F-08 | `promptfooconfig.yaml` | R-PF-08 | No server-not-reachable warning message printed when promptfoo cannot reach `localhost:8002` |
| F-09 | `run_evals.py` | R-PF-09 | `FileNotFoundError` warning message text does not match spec: missing `[promptfoo]` prefix and "Install Node.js >= 18" text |
| F-10 | `harness.py` | R-DB-08 | `init_db(DB_PATH)` is not called at the start of `main()`; not imported; implicitly invoked inside `save_run` only |

### WARN Items

| ID | File | Requirement | Description |
|---|---|---|---|
| W-01 | `requirements.txt` | R-LC-07 | `langchain-openai` pinned at `>=0.3.0` (above spec minimum of `>=0.2`); no comment on retained `openai` pin rationale |
| W-02 | `run_evals.py` | R-PF-01 | Config passed as `promptfooconfig.yaml` with `cwd=_BACKEND_DIR` rather than `backend/promptfooconfig.yaml` from project root as spec states |
| W-03 | `.gitignore` | R-DB-07 | Entries use bare filenames (`evals.db`) without path prefix; spec-named file `eval_history.db` absent, but actual `evals.db` is covered |

---

## Required Fixes Before Acceptance

The following FAIL items must be resolved before this change satisfies its acceptance criteria:

1. **F-01:** Change `ChatOpenAI` construction in `__init__` to `temperature=0.1` or document why `0` is intended.
2. **F-02:** Add a check in `get_structured_response` for cases where the returned result has a falsy `.content` attribute, if applicable to the `with_structured_output` return type.
3. **F-03:** Either (a) rename `get_recent_runs` to `get_runs` and rename parameter `n` to `limit`, and update `save_run` signature to accept `run_id`, `timestamp`, `git_sha` from the caller; or (b) document that the design intentionally diverges from the spec API contract and update the spec.
4. **F-04:** Remove the `NOT NULL` constraint downgrade on `findings`; the extra scalar metric columns are acceptable per design but the spec DDL is normative.
5. **F-05:** Add `json.loads` deserialization for `metrics`, `findings`, and `report` in `get_recent_runs`/`get_runs` before returning.
6. **F-06:** Ensure `save_run` uses its path argument (or thread it through from the caller) rather than hardcoding `DB_PATH`.
7. **F-07:** Add the four missing assertions to `promptfooconfig.yaml`: `top_findings.length >= 1`, `confidence_scores.overall` in `[0,1]`, `some(f => severity === 'critical')`, and `judicial_memo.length > 50`.
8. **F-08:** Add a check in `run_evals.py` on `result.returncode` after `subprocess.run` and print the spec-required server-not-reachable message when promptfoo exits non-zero due to connection failure.
9. **F-09:** Update the `FileNotFoundError` print in `run_evals.py` to exactly match: `[promptfoo] npx not found. Install Node.js >= 18 to enable promptfoo evals. Skipping.`
10. **F-10:** Add `from evals import db` and `db.init_db(db.DB_PATH)` at the start of `main()` in `harness.py`, before `run_pipeline()`.

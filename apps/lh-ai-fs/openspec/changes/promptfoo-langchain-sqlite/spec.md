# Delta Specification: promptfoo-langchain-sqlite

**Change ID:** promptfoo-langchain-sqlite
**Date:** 2026-03-04
**Status:** Approved for implementation
**RFC compliance:** RFC 2119 (MUST / SHALL / SHOULD / MAY)

---

## 1. Overview

This specification describes three tightly-scoped additions to the BS Detector backend:

1. Replace `AsyncOpenAI` / `OpenAI` SDK calls inside `LLMService` with `langchain_openai.ChatOpenAI`; delete the unused `backend/llm.py` stub.
2. Add a promptfoo YAML eval config that drives `POST /analyze` via the `http` provider and asserts on the JSON response.
3. Add `backend/evals/db.py` for SQLite-backed eval run persistence; wire it into `harness.py`.

The `python run_evals.py` command MUST remain the single entry point that covers all three concerns. No agent classes, Pydantic schemas, prompt templates, or the FastAPI endpoint are changed.

---

## 2. Definitions

| Term | Meaning in this document |
|---|---|
| **LLMService** | `backend/services/llm_service.py::LLMService` |
| **harness** | `backend/evals/harness.py::main()` |
| **run_evals** | `backend/run_evals.py` — the CLI entry point |
| **structured response** | A Pydantic `BaseModel` instance returned by `get_structured_response()` |
| **eval run** | One complete execution of `harness.main()` producing a metrics dict and a findings list |
| **report** | The JSON-serialised `VerificationReport` returned by `POST /analyze` |
| **db** | `backend/evals/db.py` — the new SQLite persistence module |
| **promptfooconfig.yaml** | The new promptfoo YAML config at `backend/promptfooconfig.yaml` |

---

## 3. LangChain LLM Adapter

### 3.1 Motivation

`LLMService` currently constructs `AsyncOpenAI(api_key=self.api_key)` and calls `self.client.chat.completions.create(...)` directly. Two issues follow: manual `json.loads` + `response_model(**data)` is error-prone, and there is no uniform tracing hook. Replacing the call layer with `langchain_openai.ChatOpenAI` eliminates both while keeping the public method signatures identical.

### 3.2 Requirements — LLMService internals

**R-LC-01.** `LLMService.__init__` MUST construct a `ChatOpenAI` instance, stored as `self.llm`, with `model=self.model`, `temperature` defaulting to `0.1` at construction time, and `api_key=self.api_key`. The `AsyncOpenAI` client MUST NOT be constructed anywhere in `llm_service.py` after this change.

**R-LC-02.** The public signatures of `get_structured_response` and `get_completion` MUST NOT change:

```python
async def get_structured_response(
    self,
    prompt: str,
    response_model: Type[BaseModel],
    system_prompt: str = "",
    temperature: float = 0.1,
) -> BaseModel: ...

async def get_completion(
    self,
    system: str,
    user: str,
    temperature: float = 0.1,
) -> str: ...
```

Callers in `base_agent.py` and all agent subclasses MUST require zero changes.

**R-LC-03.** `get_structured_response` MUST implement the call as:

```python
llm = self.llm.with_temperature(temperature)  # or bind temperature at call time
structured = llm.with_structured_output(response_model)
result = await structured.ainvoke([
    SystemMessage(content=system_prompt or self._default_system_prompt(response_model)),
    HumanMessage(content=prompt),
])
return result
```

The method MUST NOT call `json.loads` or `response_model(**data)` anywhere; `with_structured_output` MUST be the sole deserialization mechanism. The returned value MUST be an instance of `response_model`.

**R-LC-04.** If `system_prompt` is empty, `get_structured_response` MUST substitute the same default system prompt that the current implementation builds (legal analysis assistant + schema description). This preserves prompt behaviour exactly.

**R-LC-05.** `get_completion` MUST implement the call using an LCEL chain:

```python
from langchain_core.prompts import ChatPromptTemplate

chain = ChatPromptTemplate.from_messages([
    ("system", "{system}"),
    ("human", "{user}"),
]) | self.llm.with_temperature(temperature)
result = await chain.ainvoke({"system": system, "user": user})
return result.content or ""
```

The method MUST return an empty string when `result.content` is falsy, matching the current behaviour.

**R-LC-06.** If `result.content` from `get_structured_response` is empty or the `ainvoke` call raises an exception, the method MUST raise `ValueError("Empty LLM response")`, preserving the existing error contract.

**R-LC-07.** `backend/requirements.txt` MUST add `langchain-openai>=0.2` and `langchain-core>=0.3`. The direct `openai` line MAY be removed because `langchain-openai` pulls it transitively; if removed, a comment MUST note it is a transitive dependency.

### 3.3 Requirements — backend/llm.py deletion

**R-LC-08.** Before deleting `backend/llm.py`, the implementation MUST verify (via grep across the entire `backend/` tree) that no Python file contains `from llm import` or `import llm`. The explore.md confirms no agent or service imports `call_llm`; this grep is a required pre-condition for deletion.

**R-LC-09.** `backend/llm.py` MUST be deleted. No compatibility shim or deprecation stub is required because the function is not called anywhere in the pipeline.

### 3.4 Scenarios

**Scenario LC-1 — Structured response returns a Pydantic instance**

```
Given LLMService is initialised with a valid OPENAI_API_KEY
  And ChatOpenAI.with_structured_output(SomePydanticModel).ainvoke() returns a SomePydanticModel instance
When get_structured_response(prompt, SomePydanticModel) is awaited
Then the return value is an instance of SomePydanticModel
  And json.loads is not called anywhere in the call stack
  And no ValueError is raised
```

**Scenario LC-2 — Empty LLM response raises ValueError**

```
Given ChatOpenAI.with_structured_output().ainvoke() returns an object with content=None
  Or ainvoke() raises an exception
When get_structured_response(prompt, SomePydanticModel) is awaited
Then ValueError("Empty LLM response") is raised
  And the exception propagates to the caller unchanged
```

**Scenario LC-3 — get_completion returns string content**

```
Given the LCEL chain ainvoke() returns an AIMessage with content="Hello"
When get_completion(system="sys", user="usr") is awaited
Then the return value is the string "Hello"
```

**Scenario LC-4 — get_completion returns empty string on falsy content**

```
Given the LCEL chain ainvoke() returns an AIMessage with content="" or content=None
When get_completion(system="sys", user="usr") is awaited
Then the return value is ""
  And no exception is raised
```

**Scenario LC-5 — BaseAgent behaviour is unchanged**

```
Given base_agent.py calls self.llm_service.get_structured_response(prompt, model)
  And the LangChain adapter is in place
When an agent executes
Then the agent receives a Pydantic model instance
  And base_agent.py source is unmodified
```

**Scenario LC-6 — llm.py is absent**

```
Given the deletion is complete
When any file in backend/ is searched for "from llm import" or "import llm"
Then no match is found
  And the backend application starts without ImportError
```

---

## 4. promptfoo Local Eval

### 4.1 Motivation

The Python eval harness is the authoritative metric source but is opaque to external tooling. A promptfoo YAML config makes eval reproducible via `npx promptfoo eval` without Python knowledge, and its pass/fail output is CI-friendly.

### 4.2 File location

**R-PF-01.** The promptfoo config MUST be placed at `backend/promptfooconfig.yaml`. This is the default filename promptfoo recognises, enabling `npx promptfoo eval` to be run from the `backend/` directory without an explicit `--config` flag. `run_evals.py`, which invokes it via subprocess, MUST pass `--config backend/promptfooconfig.yaml` as an absolute-or-relative path resolvable from the project root.

### 4.3 Provider requirements

**R-PF-02.** The config MUST declare exactly one provider of type `http` with the following properties:

- `url`: `http://localhost:8002/analyze`
- `method`: `POST`
- `headers.Content-Type`: `application/json`

No authentication header is required because the endpoint is local only.

**R-PF-03.** Because `POST /analyze` currently takes no request body, the provider body MUST be omitted or set to `{}`. No prompt variable substitution is required for phase 1.

**R-PF-04.** The `prompts` list MUST contain at least one entry. A plain string label such as `"Run BS Detector legal brief verification"` is sufficient; it is used as a display name in the promptfoo report, not sent to the server.

### 4.4 Assertion requirements

**R-PF-05.** The config MUST include at least one `tests` block. Each test MUST use the `javascript` assertion type to inspect the parsed JSON response object. The response root is accessible as `output`; the `VerificationReport` is at `output.report`.

**R-PF-06.** The config MUST include at minimum the following six JavaScript assertions, each as a separate `assert` entry:

| Assertion ID | Expression | Rationale |
|---|---|---|
| A-01 | `output.report.top_findings.length >= 1` | Report is non-empty |
| A-02 | `output.report.confidence_scores.overall >= 0 && output.report.confidence_scores.overall <= 1` | Confidence score in valid range |
| A-03 | `output.report.top_findings.some(f => f.severity === 'critical')` | At least one critical finding detected |
| A-04 | `JSON.stringify(output).toLowerCase().includes('march 12')` | DATE-001 date discrepancy detected |
| A-05 | `JSON.stringify(output).toLowerCase().includes('ppe') \|\| JSON.stringify(output).toLowerCase().includes('hard hat')` | PPE-001 detected |
| A-06 | `output.report.judicial_memo && output.report.judicial_memo.length > 50` | Judicial memo is non-trivial |
| A-07 | `JSON.stringify(output).toLowerCase().includes('privette') \|\| JSON.stringify(output).toLowerCase().includes('never')` | CIT-001 misquotation flagged |
| A-08 | `JSON.stringify(output).toLowerCase().includes('donner') \|\| JSON.stringify(output).toLowerCase().includes('control')` | CTRL-001 retained control detected |

Assertions A-01 through A-06 are REQUIRED (6 minimum per spec mandate). A-07 and A-08 SHOULD be included to cover all critical-severity ground-truth discrepancies.

**R-PF-07.** Each assertion MUST have a human-readable `description` field so the promptfoo HTML report identifies which discrepancy category failed.

### 4.5 Error handling when server is not running

**R-PF-08.** When `npx promptfoo eval` is invoked and the server at `http://localhost:8002/analyze` is not reachable, promptfoo MUST be allowed to produce its own connection-refused error output. The `run_evals.py` wrapper MUST catch this case at the subprocess level and print a clear warning message of the form:

```
[promptfoo] Server not reachable at http://localhost:8002/analyze. Start the backend before running promptfoo evals. Skipping.
```

The Python harness exit code MUST be unaffected; `run_evals.py` MUST exit 0 when the Python harness succeeds even if promptfoo fails.

**R-PF-09.** `run_evals.py` MUST catch `FileNotFoundError` from `subprocess.run` (raised when `npx` is not on PATH) and print:

```
[promptfoo] npx not found. Install Node.js >= 18 to enable promptfoo evals. Skipping.
```

### 4.6 Scenarios

**Scenario PF-1 — promptfooconfig.yaml is valid**

```
Given the file backend/promptfooconfig.yaml exists
When `npx promptfoo eval --config backend/promptfooconfig.yaml` is executed
  And the backend server is running at http://localhost:8002
Then promptfoo contacts POST /analyze
  And evaluates all assertions defined in the config
  And exits with code 0 if all assertions pass
  And produces a result summary to stdout
```

**Scenario PF-2 — All six required assertions pass on a correct pipeline run**

```
Given the pipeline produces a VerificationReport with:
    top_findings containing at least one entry with severity="critical"
    confidence_scores.overall between 0 and 1 inclusive
    judicial_memo of length > 50 characters
    text containing "march 12", "ppe" or "hard hat"
When promptfoo evaluates all assertions
Then A-01 through A-06 all return true
  And promptfoo reports 0 failures
```

**Scenario PF-3 — Server not running produces warning, not error**

```
Given the backend server is NOT running
  And npx is on PATH
When python run_evals.py is executed
  And the Python harness completes successfully
Then run_evals.py prints the server-not-reachable warning message
  And run_evals.py exits with code 0
  And the eval_results.json file is written normally
```

**Scenario PF-4 — npx not on PATH produces warning, not error**

```
Given npx is NOT on PATH
When python run_evals.py is executed
  And the Python harness completes successfully
Then run_evals.py catches FileNotFoundError
  And prints the npx-not-found warning message
  And run_evals.py exits with code 0
```

**Scenario PF-5 — promptfoo can be run independently of Python harness**

```
Given the backend server is running at http://localhost:8002
When `npx promptfoo eval --config backend/promptfooconfig.yaml` is executed directly (no python run_evals.py)
Then the command succeeds
  And produces pass/fail output per assertion
  And does not depend on any Python runtime
```

---

## 5. SQLite Eval Persistence

### 5.1 Motivation

`harness.py` currently overwrites `eval_results.json` on every run. There is no run history, no trend data, and no way to detect regressions across runs. A SQLite file with stdlib `sqlite3` adds persistent history with zero external dependencies.

### 5.2 New file: backend/evals/db.py

**R-DB-01.** `backend/evals/db.py` MUST be created as a new file. It MUST use only `sqlite3` from the Python standard library and `uuid` for run ID generation. No ORM, no migration framework, and no third-party package is permitted.

**R-DB-02.** The module MUST expose exactly the following three public functions:

```python
def init_db(path: str) -> None: ...
def save_run(run_id: str, timestamp: str, git_sha: str | None,
             metrics: dict, findings: list, report: dict | None) -> None: ...
def get_runs(limit: int = 10) -> list[dict]: ...
```

A module-level `_DB_PATH` variable or a connection factory MAY be used internally; the choice is an implementation detail.

**R-DB-03.** `init_db(path)` MUST execute the following DDL on first call, using `IF NOT EXISTS` so repeated calls are idempotent:

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

`init_db` MUST also set `PRAGMA journal_mode=WAL` on the connection to reduce lock contention if two processes ever read and write concurrently.

**R-DB-04.** `save_run` MUST:

- Accept `run_id` as a UUID4 string (generated by the caller).
- Accept `timestamp` as an ISO-8601 string (e.g. `datetime.utcnow().isoformat()`).
- Accept `git_sha` as a nullable string; MAY be populated by calling `git rev-parse --short HEAD` via `subprocess`; MUST default to `None` if the command fails or git is not available.
- Serialise `metrics` and `findings` to JSON strings via `json.dumps` before storing.
- Serialise `report` to a JSON string if not None; store NULL otherwise.
- Execute `INSERT INTO eval_runs VALUES (?, ?, ?, ?, ?, ?)` with the six values.

**R-DB-05.** `get_runs(limit)` MUST execute `SELECT * FROM eval_runs ORDER BY timestamp DESC LIMIT ?` and return a list of dicts with keys `run_id`, `timestamp`, `git_sha`, `metrics`, `findings`, `report`. The `metrics` and `findings` values MUST be parsed back from JSON strings to Python dicts/lists before being returned. `report` MUST be returned as a parsed dict if not NULL, or `None` if NULL.

**R-DB-06.** The default DB path MUST be resolvable relative to the working directory where `run_evals.py` is invoked. The RECOMMENDED path is `backend/evals/eval_history.db`. The path MUST be documented in `db.py` as a module-level constant so it can be overridden in tests.

**R-DB-07.** `eval_history.db` MUST be added to `.gitignore`. It MUST NOT be committed to source control.

### 5.3 harness.py changes

**R-DB-08.** `harness.py` MUST import `db` from `evals.db` and call `db.init_db(DB_PATH)` once at the start of `main()`, before `run_pipeline()` is called.

**R-DB-09.** After `calculate_metrics(findings, KNOWN_DISCREPANCIES)` returns, `harness.main()` MUST call `db.save_run(...)` with:

- `run_id`: a fresh `uuid.uuid4().hex` string
- `timestamp`: `datetime.utcnow().isoformat()`
- `git_sha`: obtained by attempting `subprocess.check_output(["git", "rev-parse", "--short", "HEAD"])` with a `try/except` fallback to `None`
- `metrics`: the dict returned by `calculate_metrics`
- `findings`: the list returned by `extract_findings`
- `report`: the full report dict (same object written to `eval_results.json`)

**R-DB-10.** The existing `eval_results.json` write in `harness.main()` MUST be preserved. The `run_id` MUST be added to the JSON object written to that file so the file and the DB row are correlated.

**R-DB-11.** The `save_run` call MUST be wrapped in a `try/except Exception` block. If the DB write fails for any reason, `harness.main()` MUST log a warning and continue. A DB write failure MUST NOT cause the harness to exit with a non-zero code.

### 5.4 Scenarios

**Scenario DB-1 — init_db is idempotent**

```
Given backend/evals/db.py exists
When init_db(path) is called twice on the same path
Then no exception is raised on the second call
  And the eval_runs table exists with the correct schema
  And WAL mode is enabled
```

**Scenario DB-2 — save_run persists a row**

```
Given init_db has been called
  And a metrics dict and findings list are available
When save_run(run_id, timestamp, git_sha, metrics, findings, report) is called
Then the eval_runs table contains exactly one new row with that run_id
  And the metrics column contains valid JSON deserializable to the original dict
  And the findings column contains valid JSON deserializable to the original list
```

**Scenario DB-3 — get_runs returns parsed dicts**

```
Given two save_run calls have been made with timestamps T1 < T2
When get_runs(limit=10) is called
Then a list of two dicts is returned
  And the first element has timestamp T2 (most recent first)
  And metrics and findings are Python dicts/lists, not raw JSON strings
```

**Scenario DB-4 — DB write failure does not abort harness**

```
Given the DB path is read-only or the disk is full
When harness.main() runs and the save_run call raises an exception
Then a warning is logged to the logger
  And harness.main() continues to write eval_results.json
  And harness.main() exits normally (does not call sys.exit(1))
```

**Scenario DB-5 — eval_results.json includes run_id**

```
Given a successful harness run
When eval_results.json is written
Then the JSON object contains a top-level "run_id" key
  And the value matches the run_id inserted into the DB
```

**Scenario DB-6 — git_sha is populated when git is available**

```
Given git is on PATH and the working directory is inside a git repository
When harness.main() calls save_run
Then the git_sha argument is a non-empty string of hex characters
```

**Scenario DB-7 — git_sha is None when git is unavailable**

```
Given git is NOT on PATH, or the working directory is not a git repository
When harness.main() calls save_run
Then the git_sha argument is None
  And no exception is raised
```

---

## 6. run_evals.py Integration

### 6.1 Requirements

**R-RE-01.** `python run_evals.py` MUST remain the single command that exercises the complete eval loop. No additional flags or arguments are required for standard operation.

**R-RE-02.** `run_evals.py` MUST continue to call `asyncio.run(main())` from `evals.harness`. This call MUST happen first, before any promptfoo invocation.

**R-RE-03.** After `asyncio.run(main())` completes without raising an exception, `run_evals.py` MUST attempt to invoke promptfoo as a subprocess:

```python
subprocess.run(
    ["npx", "promptfoo", "eval", "--config", "backend/promptfooconfig.yaml"],
    check=False,
)
```

`check=False` MUST be used so a non-zero exit code from promptfoo does not raise `CalledProcessError`.

**R-RE-04.** `run_evals.py` MUST wrap the `subprocess.run` call in a `try/except` block handling at minimum `FileNotFoundError` (npx not found) and `subprocess.SubprocessError`. Any caught exception MUST result in a printed warning (per R-PF-09) and execution continuing to exit 0.

**R-RE-05.** If the Python harness (`asyncio.run(main())`) raises an unhandled exception or calls `sys.exit(1)` internally, `run_evals.py` MUST NOT invoke promptfoo. The failure of the harness is the authoritative signal.

**R-RE-06.** The promptfoo invocation is advisory. Its exit code MUST NOT change the exit code of `run_evals.py`. The Python harness exit code is the sole authoritative signal for CI purposes.

**R-RE-07.** `run_evals.py` MUST remain fewer than 40 lines of code. It is a thin wrapper and MUST NOT contain business logic.

### 6.2 Scenarios

**Scenario RE-1 — Full successful run**

```
Given the backend server is running at http://localhost:8002
  And npx is on PATH with promptfoo installed
  And OPENAI_API_KEY is set
When python run_evals.py is executed from the project root
Then asyncio.run(harness.main()) completes
  And eval_results.json is written
  And a new row appears in eval_history.db
  And npx promptfoo eval is invoked as a subprocess
  And run_evals.py exits with code 0
```

**Scenario RE-2 — Harness succeeds, promptfoo skipped (no npx)**

```
Given npx is NOT on PATH
  And OPENAI_API_KEY is set
When python run_evals.py is executed
Then asyncio.run(harness.main()) completes normally
  And eval_results.json is written
  And a new row appears in eval_history.db
  And the npx-not-found warning is printed to stdout
  And run_evals.py exits with code 0
```

**Scenario RE-3 — Harness fails, promptfoo is not invoked**

```
Given the pipeline raises an unhandled exception inside harness.main()
When python run_evals.py is executed
Then harness.main() exits via sys.exit(1) or raises
  And subprocess.run for promptfoo is NOT called
  And run_evals.py exits with a non-zero code
```

**Scenario RE-4 — Harness succeeds, promptfoo returns non-zero exit code**

```
Given npx is on PATH
  And promptfoo eval finds one or more assertion failures
When python run_evals.py is executed
Then asyncio.run(harness.main()) has already completed with metrics printed
  And promptfoo output is visible on stdout
  And run_evals.py exits with code 0 (promptfoo failure is non-fatal)
```

---

## 7. File Manifest

The following table enumerates every file touched by this change. Files not listed here MUST NOT be modified.

| File | Action | Description |
|---|---|---|
| `backend/services/llm_service.py` | Modified | Replace `AsyncOpenAI` with `ChatOpenAI`; rewrite `get_structured_response` and `get_completion` internals; preserve public signatures |
| `backend/llm.py` | Deleted | Unused synchronous stub; no callers; confirmed by grep before deletion |
| `backend/requirements.txt` | Modified | Add `langchain-openai>=0.2`, `langchain-core>=0.3`; optionally annotate removed `openai` as transitive |
| `backend/promptfooconfig.yaml` | New | promptfoo http provider + 6+ JavaScript assertions on `output.report` fields |
| `backend/evals/db.py` | New | SQLite persistence: `init_db`, `save_run`, `get_runs` |
| `backend/evals/harness.py` | Modified | Import `db`; call `init_db` at start of `main()`; call `save_run` after metrics; add `run_id` to `eval_results.json` |
| `backend/run_evals.py` | Modified | After `asyncio.run(main())`, invoke `npx promptfoo eval` as subprocess with graceful fallback |
| `.gitignore` | Modified | Add `backend/evals/eval_history.db` |
| `backend/agents/base_agent.py` | No change | |
| `backend/agents/*.py` | No change | |
| `backend/main.py` | No change | |
| `backend/evals/metrics.py` | No change | |
| `backend/evals/test_cases.py` | No change | |

---

## 8. Constraints and Non-Negotiables

**C-01.** The `POST /analyze` API contract (request shape, response shape, HTTP status codes) MUST NOT change.

**C-02.** `BaseAgent._call_llm` and `BaseAgent._call_llm_text` signatures MUST NOT change.

**C-03.** `calculate_metrics()` in `metrics.py` MUST NOT change. It is the authoritative F1/precision/recall/hallucination-rate source.

**C-04.** No new Python package other than `langchain-openai` and `langchain-core` MAY be added to `requirements.txt` as a direct dependency.

**C-05.** `eval_history.db` MUST NOT be committed to git.

**C-06.** LangSmith tracing (`LANGCHAIN_TRACING_V2`) MUST NOT be configured by this change. It is an opt-in environment variable for the user.

**C-07.** The promptfoo assertions MUST NOT replace `calculate_metrics()`. They are advisory smoke tests; the Python harness is the authoritative eval system.

---

## 9. Acceptance Criteria

The following criteria MUST all be true before this change is considered complete:

- [ ] `python run_evals.py` completes without error and prints precision, recall, F1, and hallucination rate.
- [ ] F1 score after the LangChain migration is within ±2 percentage points of the pre-migration baseline (measured by running the harness before and after).
- [ ] `backend/evals/eval_history.db` contains a new row after each `run_evals.py` invocation, verifiable via `sqlite3 backend/evals/eval_history.db "SELECT run_id, timestamp FROM eval_runs ORDER BY timestamp DESC LIMIT 3;"`.
- [ ] `npx promptfoo eval --config backend/promptfooconfig.yaml` runs independently (server must be running) and reports a pass/fail result per assertion.
- [ ] `grep -r "from llm import\|import llm" backend/` returns no matches.
- [ ] `grep -r "AsyncOpenAI\|from openai import" backend/services/llm_service.py` returns no matches.
- [ ] No file in `backend/agents/` is modified (confirmed by `git diff --name-only backend/agents/`).
- [ ] `run_evals.py` exits 0 when `npx` is absent (test by temporarily renaming `npx` or setting `PATH=` in a subshell).

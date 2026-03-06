# Tasks: promptfoo-langchain-sqlite

**Change ID:** promptfoo-langchain-sqlite
**Date:** 2026-03-04
**Source:** spec.md + design.md

---

## Phase 1 — Infrastructure

### 1.1 Update `backend/requirements.txt`

**Files:** `backend/requirements.txt`

**What to do:**
- Replace the bare `openai` line with `openai>=1.50.0` (explicit peer pin; prevents resolver from selecting a version that conflicts with langchain-openai's peer requirement).
- Add `langchain-openai>=0.3.0` as a direct dependency.
- Do NOT add a direct `langchain-core` line; it is pulled transitively by `langchain-openai`.
- Add a comment above the `openai` line: `# explicit peer pin; langchain-openai requires openai>=1.50 transitively`.

**Acceptance criterion:** `pip install -r backend/requirements.txt` resolves without conflict, and both `langchain_openai` and `openai` are importable at the required versions.

**Can be done independently:** Yes — no other task depends on this until Phase 2 begins.

---

### 1.2 Create `backend/evals/db.py`

**Files:** `backend/evals/db.py` (new file)

**What to do:**
- Use only `sqlite3`, `uuid`, `json`, `subprocess`, `pathlib`, `datetime`, `typing` from the standard library. No third-party packages.
- Declare a module-level constant `DB_PATH = pathlib.Path(__file__).parent / "evals.db"`. This resolves to `backend/evals/evals.db` regardless of the caller's working directory.
- Implement `init_db(path: pathlib.Path = DB_PATH) -> None`:
  - Open a `sqlite3` connection to `path`.
  - Execute `PRAGMA journal_mode=WAL`.
  - Execute the DDL below using `CREATE TABLE IF NOT EXISTS` (idempotent):
    ```sql
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
    );
    ```
  - Commit and close.
- Implement a private `_get_git_sha() -> str | None`:
  - Run `["git", "rev-parse", "--short", "HEAD"]` via `subprocess.run` with `capture_output=True, text=True, timeout=3`.
  - Return `result.stdout.strip()` if `returncode == 0`; return `None` on any exception or non-zero return code.
- Implement `save_run(metrics: dict, findings: list, report: dict | None = None, path: pathlib.Path = DB_PATH) -> str`:
  - Generate `run_id = uuid.uuid4().hex`.
  - Generate `ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")`.
  - Call `_get_git_sha()` for `git_sha`.
  - Call `init_db(path)` (idempotent guard).
  - INSERT all scalar metric fields from `metrics` dict (`precision`, `recall`, `f1_score`, `hallucination_rate`, `true_positives`, `false_positives`, `false_negatives`) as separate columns.
  - Serialise `findings` to `json.dumps(findings)` for `findings_json`.
  - Serialise `report` to `json.dumps(report, default=str)` for `report_json`; store `NULL` if `report` is `None`.
  - Return `run_id`.
- Implement `get_recent_runs(limit: int = 10, path: pathlib.Path = DB_PATH) -> list[dict]`:
  - Call `init_db(path)`.
  - Set `conn.row_factory = sqlite3.Row`.
  - Execute `SELECT * FROM eval_runs ORDER BY timestamp DESC LIMIT ?`.
  - Return `[dict(row) for row in rows]` (values are native Python types; no JSON parsing needed since scalar metrics are stored as typed columns).

**Acceptance criterion:** Calling `init_db()` twice raises no exception; `save_run({"precision": 1.0, "recall": 1.0, "f1_score": 1.0, "hallucination_rate": 0.0, "true_positives": 1, "false_positives": 0, "false_negatives": 0}, [], None)` followed by `get_recent_runs(limit=1)` returns a list of length 1 with the correct `run_id`.

**Can be done independently:** Yes — no other Phase 1 task depends on this; it is a self-contained new file.

---

## Phase 2 — LangChain Adapter

> All tasks in this phase are independently parallelizable once Phase 1 (1.1) is complete.

### 2.1 Rewrite `backend/services/llm_service.py` to use `ChatOpenAI`

**Files:** `backend/services/llm_service.py`

**What to do:**
- Remove `import json` and `from openai import AsyncOpenAI` (and any other direct `openai` SDK imports).
- Add:
  ```python
  from langchain_openai import ChatOpenAI
  from langchain_core.messages import SystemMessage, HumanMessage
  from langchain_core.prompts import ChatPromptTemplate
  from langchain_core.output_parsers import StrOutputParser
  ```
- In `__init__`: remove `self.client = AsyncOpenAI(api_key=self.api_key)`. Keep `self.api_key` and `self.model` attributes unchanged. Do NOT add `self.llm`; `ChatOpenAI` is constructed per-call because `temperature` varies.
- Rewrite `get_structured_response` body (signature unchanged: `self, prompt, response_model, system_prompt="", temperature=0.1`):
  - Construct `llm = ChatOpenAI(model=self.model, temperature=temperature, api_key=self.api_key)`.
  - Construct `structured_llm = llm.with_structured_output(response_model)`.
  - Build messages: `[SystemMessage(content=system_prompt or "You are a precise legal analysis assistant."), HumanMessage(content=prompt)]`.
  - `result = await structured_llm.ainvoke(messages)`.
  - If `result` is falsy or an exception was raised, raise `ValueError("Empty LLM response")`.
  - Return `result` (a Pydantic model instance; no `json.loads`, no `response_model(**data)`).
- Rewrite `get_completion` body (signature unchanged: `self, system, user, temperature=0.1`):
  - Build an LCEL chain:
    ```python
    chain = (
        ChatPromptTemplate.from_messages([("system", "{system}"), ("human", "{user}")])
        | ChatOpenAI(model=self.model, temperature=temperature, api_key=self.api_key)
        | StrOutputParser()
    )
    return await chain.ainvoke({"system": system, "user": user})
    ```
  - `StrOutputParser` returns `""` on falsy content, matching the existing `or ""` guard.
- Do NOT modify the class name, `__init__` signature, or either public method signature.

**Acceptance criterion:** `grep -r "AsyncOpenAI\|from openai import" backend/services/llm_service.py` returns no matches; the test suite passes (or, if no automated tests exist, a manual run of `python run_evals.py` produces F1 within ±2 pp of the pre-migration baseline).

**Can be done independently:** Yes — parallelizable with 2.2 and 3.1 after Phase 1 completes. No changes to callers (`base_agent.py`, agent subclasses) are required.

---

### 2.2 Delete `backend/llm.py`

**Files:** `backend/llm.py` (deleted)

**What to do:**
- Before deleting, run `grep -r "from llm import\|import llm" backend/` and confirm zero matches. This grep is a required pre-condition; do not skip it.
- Delete the file. No compatibility shim or deprecation stub is needed.

**Acceptance criterion:** `ls backend/llm.py` returns "No such file or directory"; `grep -r "from llm import\|import llm" backend/` returns no matches; the backend starts without `ImportError`.

**Can be done independently:** Yes — parallelizable with 2.1 and 3.1 after Phase 1 completes. The grep pre-condition must be satisfied before deletion.

---

## Phase 3 — promptfoo Config

> This task is independently parallelizable once Phase 1 completes.

### 3.1 Create `backend/promptfooconfig.yaml` with 8 assertions

**Files:** `backend/promptfooconfig.yaml` (new file)

**What to do:**
- Create the file at `backend/promptfooconfig.yaml` (not inside `backend/evals/`; this is the default filename promptfoo recognises).
- Use the `http` provider (not the `python` provider) pointing to `http://localhost:8002/analyze` with `method: POST` and `Content-Type: application/json`. Omit the request body (or set it to `{}`); the server loads documents from disk internally.
- Add one entry under `prompts` as a display-label string (e.g., `"Run legal brief verification"`).
- Add a `tests` block with the following 8 separate test entries, each with a single `javascript` assertion and a human-readable `description`:

  | ID | Description | JavaScript value |
  |----|-------------|-----------------|
  | A-01 | Report has at least one finding | `output.report.top_findings.length >= 1` |
  | A-02 | Overall confidence score in valid range | `output.report.confidence_scores.overall >= 0 && output.report.confidence_scores.overall <= 1` |
  | A-03 | At least one critical severity finding | `output.report.top_findings.some(function(f) { return f.severity === 'critical'; })` |
  | A-04 | DATE-001: March date discrepancy detected | `JSON.stringify(output).toLowerCase().includes('march 12') \|\| JSON.stringify(output).toLowerCase().includes('march 14')` |
  | A-05 | PPE-001: PPE discrepancy detected | `JSON.stringify(output).toLowerCase().includes('ppe') \|\| JSON.stringify(output).toLowerCase().includes('hard hat')` |
  | A-06 | Judicial memo is non-trivial | `output.report.judicial_memo && output.report.judicial_memo.length > 50` |
  | A-07 | CIT-001: Privette misquotation flagged | `JSON.stringify(output).toLowerCase().includes('privette') \|\| JSON.stringify(output).toLowerCase().includes('never')` |
  | A-08 | CTRL-001: Retained control finding present | `JSON.stringify(output).toLowerCase().includes('donner') \|\| JSON.stringify(output).toLowerCase().includes('control')` |

- A-01 through A-06 are REQUIRED (minimum 6 per spec R-PF-06). A-07 and A-08 SHOULD be included per spec R-PF-06 to cover all critical-severity `KNOWN_DISCREPANCIES` IDs.

**Acceptance criterion:** `npx promptfoo eval --config backend/promptfooconfig.yaml` (with the backend server running) runs without YAML parse error and produces a pass/fail table for all 8 assertions.

**Can be done independently:** Yes — parallelizable with 2.1 and 2.2 after Phase 1 completes. No Python code changes required.

---

## Phase 4 — Eval Harness Wiring

> Tasks 4.1 and 4.2 are both dependent on Phase 2 (2.1 complete) and Phase 3 (3.1 complete) before merging, but can be written concurrently by separate developers.

### 4.1 Update `backend/evals/harness.py` to call `db.save_run()`

**Files:** `backend/evals/harness.py`

**Depends on:** 1.2 (db.py must exist), 2.1 (LangChain adapter must be in place)

**What to do:**
- Add import near top of file: `from evals import db` (or `from evals.db import save_run, init_db` — use whichever matches the existing import style).
- At the start of `main()`, before `run_pipeline()` is called, add: `db.init_db()` (uses the default `DB_PATH` from `db.py`).
- After `calculate_metrics(findings, KNOWN_DISCREPANCIES)` returns (and `metrics` and `report` are available), add the following block:
  ```python
  run_id = None
  try:
      run_id = db.save_run(metrics=metrics, findings=findings, report=report)
      logger.info(f"Run saved to eval DB: run_id={run_id}")
  except Exception as exc:
      logger.warning(f"Failed to save run to eval DB (non-fatal): {exc}")
  ```
- Update the `eval_results.json` write to include `run_id` at the top level:
  ```python
  with open("eval_results.json", "w") as f:
      json.dump({"run_id": run_id, "metrics": metrics, "report": report}, f, indent=2, default=str)
  ```
- Do NOT modify `run_pipeline()`, `extract_findings()`, the metrics print block, or the `asyncio.run(main())` pattern.
- The `try/except` block around `save_run` is mandatory: a DB write failure MUST NOT cause the harness to exit with a non-zero code.

**Acceptance criterion:** After `python run_evals.py`, `backend/evals/evals.db` contains a new row verifiable via `sqlite3 backend/evals/evals.db "SELECT run_id, timestamp FROM eval_runs ORDER BY timestamp DESC LIMIT 1;"`, and `eval_results.json` contains a top-level `"run_id"` key matching the DB row.

**Can be done independently:** No — depends on 1.2 (db.py) and 2.1 (LangChain adapter). Can be developed in parallel with 4.2.

---

### 4.2 Update `backend/run_evals.py` to invoke promptfoo as subprocess with graceful fallback

**Files:** `backend/run_evals.py`

**Depends on:** 3.1 (promptfooconfig.yaml must exist), 4.1 (harness wiring must be complete)

**What to do:**
- Keep `asyncio.run(main())` as the first action inside `if __name__ == "__main__":`. This call MUST happen before any promptfoo invocation.
- After `asyncio.run(main())` completes, add a separator print block and then invoke promptfoo:
  ```python
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
              "[promptfoo] Server not reachable at http://localhost:8002/analyze. "
              "Start the backend before running promptfoo evals. Skipping."
          )
  except FileNotFoundError:
      logger.warning(
          "[promptfoo] npx not found. Install Node.js >= 18 to enable promptfoo evals. Skipping."
      )
  except subprocess.SubprocessError as exc:
      logger.warning(f"[promptfoo] Subprocess error: {exc}. Skipping.")
  ```
- Use `check=False` on `subprocess.run` so a non-zero promptfoo exit code does NOT raise `CalledProcessError`.
- If `asyncio.run(main())` raises an unhandled exception, the exception propagates naturally and the promptfoo block is never reached — this is the correct behaviour (spec R-RE-05).
- Required imports to add (if not already present): `subprocess`, `pathlib`, `logging`.
- Keep the file under 40 lines of code (spec R-RE-07). It is a thin wrapper; no business logic.

**Acceptance criterion:** `python run_evals.py` exits with code 0 when `npx` is absent (test by running `env PATH="" python run_evals.py` — harness succeeds, npx warning is printed, exit 0); promptfoo is not invoked when the harness raises.

**Can be done independently:** No — depends on 3.1 (promptfooconfig.yaml) and 4.1 (harness must complete first for full integration). Can be developed in parallel with 4.1 as long as integration testing waits for both.

---

## Phase 5 — Verification

### 5.1 Add `.gitignore` entries for eval DB files

**Files:** `.gitignore` (project root) or `backend/.gitignore` if one exists

**What to do:**
- Add the following three lines (WAL mode produces `-wal` and `-shm` companion files while a write transaction is open):
  ```
  backend/evals/evals.db
  backend/evals/evals.db-wal
  backend/evals/evals.db-shm
  ```
- Check whether `backend/` has its own `.gitignore`; if so, add the three lines there as relative paths (`evals/evals.db`, `evals/evals.db-wal`, `evals/evals.db-shm`). If only the root `.gitignore` exists, use the `backend/evals/` prefix form.

**Acceptance criterion:** `git status` does not show `evals.db`, `evals.db-wal`, or `evals.db-shm` as untracked or modified after a `run_evals.py` invocation.

**Can be done independently:** Yes — no code dependencies. Can be done at any point during the change.

---

### 5.2 Manual smoke test

**Files:** None — instructions only

**What to do (in order):**

1. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
   Verify: `python -c "from langchain_openai import ChatOpenAI; print('ok')"` prints `ok`.

2. Confirm `backend/llm.py` is absent:
   ```bash
   ls backend/llm.py   # expected: No such file or directory
   grep -r "from llm import\|import llm" backend/   # expected: no output
   ```

3. Confirm LangChain adapter is in place:
   ```bash
   grep -r "AsyncOpenAI\|from openai import" backend/services/llm_service.py   # expected: no output
   ```

4. Confirm no agent files were modified:
   ```bash
   git diff --name-only backend/agents/   # expected: no output
   ```

5. Start the backend in one terminal:
   ```bash
   cd backend && uvicorn main:app --port 8002
   ```

6. In a second terminal, run the full eval:
   ```bash
   python backend/run_evals.py
   ```
   Expected output includes: precision, recall, F1, hallucination rate printed to stdout; F1 is within ±2 pp of pre-migration baseline.

7. Verify SQLite persistence:
   ```bash
   sqlite3 backend/evals/evals.db "SELECT run_id, timestamp, f1_score FROM eval_runs ORDER BY timestamp DESC LIMIT 3;"
   ```
   Expected: at least one row with a non-null `run_id` and `f1_score`.

8. Verify `eval_results.json` contains `run_id`:
   ```bash
   python -c "import json; d=json.load(open('backend/eval_results.json')); print(d.get('run_id'))"
   ```
   Expected: a hex string matching the DB row.

9. Verify promptfoo config (server still running):
   ```bash
   npx promptfoo eval --config backend/promptfooconfig.yaml
   ```
   Expected: pass/fail table for all 8 assertions; zero YAML parse errors.

10. Verify graceful fallback when `npx` is absent:
    ```bash
    env PATH="" python backend/run_evals.py
    ```
    Expected: harness completes normally, warning `[promptfoo] npx not found...` is printed, exit code 0.

**Acceptance criterion:** All 10 steps above pass without error. All 8 global acceptance criteria from spec.md section 9 are satisfied.

**Can be done independently:** No — depends on all prior phases being complete.

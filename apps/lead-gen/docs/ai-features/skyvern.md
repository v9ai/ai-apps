# Skyvern — AI Features Deep Report

**Report date:** 2026-03-28
**Repository:** https://github.com/Skyvern-AI/skyvern
**Researched version:** main branch (commit `5aa1f2fb7c5644591240854cbc983f903ff0147a`)

---

## 1. Overview

Skyvern automates browser-based workflows using large language models and computer vision, replacing brittle XPath/CSS-selector scrapers with a vision-language pipeline that understands pages visually and reasons about which actions to take.

| Metric | Value |
|---|---|
| GitHub stars | ~21k |
| Forks | ~1.9k |
| License | AGPL-3.0 (cloud/managed service exceptions for anti-bot detection) |
| Primary language | Python 3.11/3.12 |
| Frontend | React + TypeScript |
| Browser engine | Playwright (Chromium) |
| Benchmark | 64.4% accuracy on WebBench (state-of-the-art for web navigation agents) |
| Cloud SaaS | app.skyvern.com |
| Last activity | Active as of 2026-03 |

The system is positioned as an RPA replacement. Rather than recording DOM selectors at authoring time, it sends screenshots + element trees to a vision LLM on every step and lets the model decide what to do next. This makes it resilient to UI changes and able to handle previously unseen websites.

It ships in two forms:

1. **Self-hosted** — Docker Compose stack (FastAPI backend, Playwright worker pool, PostgreSQL, optional Redis). The full server exposes a REST + WebSocket API.
2. **Python SDK** — `pip install skyvern`. Wraps a `SkyvernPage` class that is a Playwright `Page` drop-in with AI-powered helpers (`page.act()`, `page.extract()`, `page.validate()`, `page.prompt()`).

---

## 2. AI Architecture

### 2.1 High-level design

Skyvern's architecture is best described as a **perception → reasoning → action loop** running inside a Playwright browser session, with an LLM acting as the central planning module.

```
User Goal (natural language)
         |
         v
  ┌─────────────────────────────────────────────┐
  │  STEP LOOP (max 10–25 steps configurable)   │
  │                                             │
  │  1. Take viewport screenshot(s)             │
  │  2. Run DOM scraper (domUtils.js via CDP)   │
  │     → label every interactable element      │
  │       with a unique skyvern-id              │
  │     → build element tree (trimmed)          │
  │  3. Assemble prompt:                        │
  │     [goal, payload, history,                │
  │      element tree, screenshot(s)]           │
  │  4. Call vision LLM                         │
  │     → returns JSON: {actions[], reasoning}  │
  │  5. Dispatch actions to Playwright          │
  │     (click/type/select/scroll/…)            │
  │  6. Check for COMPLETE or TERMINATE         │
  │     (second LLM call via check-user-goal)   │
  │  7. Loop back to step 1                     │
  └─────────────────────────────────────────────┘
         |
         v
  Task result: {status, extracted_data,
                screenshots, recording}
```

The loop terminates when the LLM emits a `COMPLETE` or `TERMINATE` action, when a user-defined `complete_criterion` is satisfied (evaluated by a second LLM call), or when `MAX_STEPS_PER_RUN` is exhausted.

### 2.2 Vision + DOM dual-modality

Skyvern is explicitly multi-modal. The DOM tree alone is insufficient (many elements have no text label, or the label is purely visual). The screenshot alone is insufficient (the LLM cannot reliably click coordinates). The system fuses both:

- **DOM element tree**: A structured JSON tree of interactable elements, each with a stable `skyvern-id`, bounding-box rect, ARIA attributes, and text content. This is injected directly into the LLM prompt as structured context.
- **Annotated screenshot**: A viewport image (up to `MAX_NUM_SCREENSHOTS = 10` for tall pages) with bounding-box overlays drawn around each labeled element. The box annotations are generated server-side then stripped before storage to save cost.

The LLM receives both in the same call. It references elements by `skyvern-id` in its JSON output, not by coordinates, which makes actions reliable even if bounding boxes shift slightly between scrape and execution.

### 2.3 Multi-LLM routing

Skyvern does not hard-wire one model. It uses **LiteLLM** as the underlying abstraction layer, with a `LLMConfigRegistry` that maps string keys to model configs. Each model config carries:

- `model_name` (LiteLLM format)
- `supports_vision: bool` — screenshots are omitted from the prompt when false
- `max_tokens`, `temperature` (always 0 for determinism)
- Provider credentials

Supported providers as of the researched version:

| Provider | Model keys |
|---|---|
| OpenAI | GPT-4.1, GPT-5, GPT-5.2, o3, o4-mini |
| Anthropic | Claude 4/4.5 Haiku, Sonnet, Opus |
| Azure OpenAI | GPT-4o multimodal variants |
| AWS Bedrock | Claude 3.5, 3.7, 4, 4.5 variants |
| Google Vertex AI | Gemini 2.5/3.0 Pro/Flash |
| Ollama | Local models (reduced feature set) |
| OpenRouter | Multi-provider pass-through |
| OpenAI-compatible | Custom base URL |

**Multi-LLM routing for different subtasks**: Skyvern uses different models for different stages of a single task run. The `config.py` exposes dedicated keys:

```python
LLM_KEY                    # Primary action planning model (default: OPENAI_GPT4O)
SECONDARY_LLM_KEY          # Fallback / cheaper tasks
EXTRACTION_LLM_KEY         # Dedicated data extraction
SELECT_AGENT_LLM_KEY       # Dropdown/select handling
SCRIPT_GENERATION_LLM_KEY  # Playwright script generation
SCRIPT_REVIEWER_LLM_KEY    # Script review
```

A `LiteLLM Router` handles **primary/fallback** within each key: if the primary model fails (rate limit, timeout, auth error), it automatically retries the fallback model group. Redis backs the router state for distributed deployments.

### 2.4 Prompt engineering system

All prompts are Jinja2 templates (`skyvern/forge/prompts/skyvern/` — 79 files total). The `PromptEngine("skyvern")` class loads and renders them with context at runtime. Key templates:

| Template | Purpose |
|---|---|
| `extract-action.j2` | Main action planning prompt (most-called) |
| `task_v2.j2` | Task v2 mini-goal decomposition |
| `check-user-goal.j2` | Goal completion verification |
| `extract-information.j2` | Structured data extraction |
| `batch-form-fill-plan.j2` | Multi-field form planning |
| `normal-select.j2` / `custom-select.j2` | Dropdown option selection |
| `auto-completion-*.j2` | Autocomplete field handling |
| `generate-task.j2` | Auto-generating tasks from URL + description |
| `script-reviewer.j2` | Reviewing generated Playwright scripts |

The `extract-action.j2` prompt structure (reverse-engineered from the template):

```
System context:
  - Current URL
  - DOM element tree (JSON, trimmed)
  - Current datetime
  - User goal (navigation_goal)
  - User payload (navigation_payload — form data, user details)
  - Action history (previous steps)
  - Optional: data_extraction_goal, complete_criterion, error_code_mapping

Screenshots:
  - [base64-encoded annotated viewport images]

Required JSON output:
  {
    "user_goal_stage": "<stage description>",
    "user_goal_achieved": false,
    "plan": "<textual step plan>",
    "actions": [
      {
        "reasoning": "<why this action>",
        "confidence_float": 0.9,
        "action_type": "CLICK",
        "element_id": "<skyvern-id>",
        ...action-specific fields
      }
    ]
  }
```

Key constraints enforced in the prompt:
- Only reference element IDs present in the tree — no imagining new elements
- Red-highlighted text signals an error condition — treat it as priority
- Handle popups before continuing the main goal
- Output must be valid JSON with no comments, no trailing commas
- Confidence must be 0.0–1.0 float

---

## 3. Key AI Features

### 3.1 Task definition and goal decomposition

A **Task** is the atomic unit. It maps to a single URL + goal:

```python
# Python SDK
from skyvern import Skyvern

skyvern = Skyvern(api_key="...")
task = await skyvern.run_task(
    url="https://example-vendor.com/insurance",
    prompt="Fill out the commercial auto insurance quote form with the provided company details",
    navigation_payload={
        "company_name": "Acme Corp",
        "employees": 50,
        "annual_revenue": 2000000
    },
    data_extraction_schema={
        "type": "object",
        "properties": {
            "quote_id": {"type": "string"},
            "premium": {"type": "number"},
            "coverage_limits": {"type": "array"}
        }
    },
    webhook_callback_url="https://my-api.example.com/webhooks/skyvern",
    max_steps=25
)
```

REST equivalent:
```json
POST /v1/run/tasks
{
  "url": "https://example-vendor.com/insurance",
  "navigation_goal": "Fill out the commercial auto insurance quote form",
  "navigation_payload": {"company_name": "Acme Corp", "employees": 50},
  "extracted_information_schema": {"type": "object", "properties": {...}},
  "webhook_callback_url": "https://my-api.example.com/webhooks/skyvern",
  "max_steps": 25,
  "engine": "skyvern_v2"
}
```

**Task v2** introduces a two-level hierarchy. A "meta planner" LLM call (`task_v2.j2`) runs first on each step to produce a **mini-goal** — a smaller, concrete sub-objective for the current page state. The action planner then executes that mini-goal. This improves long-horizon task coherence because the model doesn't lose track of the overall goal through many intermediate steps.

Mini-goal types:
- `Navigate` — interact with page elements
- `Extract` — retrieve information without navigation
- `Loop` — parallel execution over a list of values/links

### 3.2 DOM + screenshot element identification

The identification pipeline runs entirely in JavaScript injected via Chrome DevTools Protocol before every LLM call:

1. **Tree traversal** — `buildElementTree()` in `domUtils.js` walks the full DOM including shadow roots and iframes. Each iframe is assigned a sequential frame index.

2. **Interactability scoring** — An element is considered interactable if it passes:
   - Visibility: non-zero dimensions, not `display:none`, center point within viewport
   - Role: ARIA widget roles (button, link, checkbox, combobox, etc.) or native form elements
   - Event binding: `onclick`, `ng-click`, Angular `__ngContext__`, jQuery event presence
   - Cursor style: `cursor: pointer` or matching hover-state CSS
   - Framework patterns: Select2, React Select, ASP.NET controls detected by class/structure heuristics

3. **ID assignment** — Each interactable element receives a 4-character `skyvern-id` (frame index + counter). This attribute is injected into the live DOM: `element.setAttribute("skyvern-id", id)`.

4. **Element hashing** — SHA-256 hash of element properties (excluding volatile fields: `id`, `rect`, `frame_index`) for deduplication across retries. Elements that appear after DOM mutations can be matched against already-seen elements.

5. **Bounding box extraction** — `DomUtils.getVisibleClientRect()` uses `element.getClientRects()`, crops to visible viewport, filters rects < 3px. A QuadTree spatial structure detects visually overlapping elements.

6. **Tree trimming** — Before sending to the LLM, the tree is pruned: frame references removed, non-interactable orphans dropped, base64 image data stripped to reduce token consumption.

7. **SVG/CSS shape conversion** — SVG elements and CSS-drawn shapes are sent to a secondary LLM call to get textual descriptions, which replace the raw markup. This is skipped on retry_index=0 when `enable_speed_optimizations=true`.

### 3.3 Action generation

The LLM outputs a JSON array of actions. Each action has:
- `action_type` — one of the enum values below
- `element_id` — references a `skyvern-id` in the current element tree
- `reasoning` — free-text explanation (logged for observability)
- `confidence_float` — 0.0–1.0 self-assessed confidence
- Action-specific parameters

Full action type inventory:

| Action | Description |
|---|---|
| `CLICK` | Left/right click, repeat count, optional x/y coordinates |
| `INPUT_TEXT` | Type into field; TOTP support for MFA fields |
| `SELECT_OPTION` | Native `<select>` or custom dropdown by label/value/index |
| `UPLOAD_FILE` | File input upload |
| `DOWNLOAD_FILE` | Trigger download and await file appearance |
| `CHECKBOX` | Toggle checkboxes (deprecated; CLICK preferred) |
| `HOVER` | Hover with configurable duration |
| `SCROLL` | Scroll to coordinates |
| `KEYPRESS` | Raw keyboard sequences with hold duration |
| `DRAG` | Drag along coordinate path |
| `GOTO_URL` | Navigate to URL; handles magic link auth flows |
| `RELOAD_PAGE` | Refresh current page |
| `CLOSE_PAGE` | Close tab (used post magic-link login) |
| `WAIT` | Wait 20s default for page load/animation |
| `SOLVE_CAPTCHA` | External CAPTCHA solving (text, reCAPTCHA, hCaptcha, Cloudflare) |
| `EXTRACT` | Structured data extraction against schema |
| `COMPLETE` | Mark task successful, return extracted data |
| `TERMINATE` | Mark task failed with categorized reason |
| `NULL` | No-op placeholder |

### 3.4 Multi-step workflow execution

**Workflows** chain multiple tasks, data transformations, and control flow in a DAG (Directed Acyclic Graph). Block types:

| Block type | Description |
|---|---|
| `TaskBlock` | Executes a browser task (single LLM-driven session) |
| `ExtractionBlock` | Data extraction without navigation |
| `CodeBlock` | Custom Python code execution |
| `HttpRequestBlock` | External HTTP calls |
| `ConditionalBlock` | Branches on LLM-evaluated condition |
| `ForLoopBlock` | Iterates over parameter list or extracted values |
| `FileParserBlock` | Parse uploaded CSV/Excel/PDF |
| `SendEmailBlock` | Email dispatch |
| `FileUploadBlock` | Upload to block storage |

Data flows between blocks via Jinja2 template variables rendered from `WorkflowRunContext`:

```yaml
# Conceptual workflow YAML (internal object representation)
parameters:
  - name: target_urls
    type: workflow_parameter
blocks:
  - label: scrape_companies
    type: for_loop
    loop_over: "{{ target_urls }}"
    loop_blocks:
      - label: enrich_company
        type: task
        url: "{{ current_value }}"
        navigation_goal: "Extract company name, industry, employee count, HQ location"
        data_extraction_schema: {type: object, ...}
  - label: export_to_crm
    type: http_request
    url: "https://api.hubspot.com/crm/v3/objects/companies/batch/create"
    body: "{{ scrape_companies.output }}"
```

The workflow engine uses `Temporal` (temporalio SDK) for durable workflow execution, giving it retry, timeout, and checkpointing semantics at the infrastructure level.

### 3.5 Credential and secret management

Credentials are stored in a vault and injected at execution time — they are **never placed in the LLM prompt**. The `SkyvernContext` carries a `sensitive_values` registry. When the LLM needs to fill a password field, it emits `INPUT_TEXT` with a credential ID placeholder; the action handler resolves the actual secret from the vault.

Supported auth mechanisms:
- Username/password pairs
- TOTP/2FA: QR-code scanners, email verification codes, SMS (TOTP codes cached per-task in `SkyvernContext.totp_codes`)
- Password manager integration: Bitwarden (first-party), custom HTTP API adapters
- Browser profile persistence: cookies/localStorage saved and reloaded across sessions

---

## 4. Data Pipeline

### 4.1 Full execution pipeline

```
Input: {url, goal, payload, schema, max_steps}
           │
           ▼
    ┌──────────────────┐
    │  Task v2 planner │  ← task_v2.j2 prompt
    │  (meta-goal LLM  │    Input: goal + page state
    │   call, once per │    Output: mini_goal{type, description}
    │   step)          │
    └────────┬─────────┘
             │ mini_goal
             ▼
    ┌──────────────────────────────────────────────────────┐
    │  Per-step loop (up to MAX_STEPS_PER_TASK_V2 = 25)   │
    │                                                      │
    │  1. Browser screenshot(s)                            │
    │     - split-screen at multiple scroll positions      │
    │     - bounding boxes drawn on interactable elements  │
    │     - token count gating (skip if HTML > threshold)  │
    │                                                      │
    │  2. DOM scrape (domUtils.js via CDP)                 │
    │     - element tree built, trimmed, hashed            │
    │     - SVG/CSS shapes → text (secondary LLM call)     │
    │     - id_to_css_dict, id_to_element_dict cached      │
    │                                                      │
    │  3. Prompt assembly (extract-action.j2)              │
    │     - goal + payload + action history                │
    │     - trimmed element tree (JSON)                    │
    │     - annotated screenshots (base64)                 │
    │     - optional: schema, criteria, error codes        │
    │                                                      │
    │  4. Primary LLM call (vision model)                  │
    │     - temperature=0, max_tokens=4096                 │
    │     - response: {user_goal_achieved, actions[]}      │
    │                                                      │
    │  5. Action dispatch loop                             │
    │     for each action in actions[]:                    │
    │       a. Validate element_id exists in tree          │
    │       b. Resolve element_id → CSS selector → Playwright locator │
    │       c. Execute action (click/type/select/…)        │
    │       d. Detect incremental DOM mutations            │
    │          (MutationObserver on new elements)          │
    │       e. Send tool_result back to LLM caller         │
    │       f. Persist action to DB                        │
    │                                                      │
    │  6. Completion check (check-user-goal.j2)            │
    │     - separate LLM call                              │
    │     - evaluates page state vs. complete_criterion    │
    │     - returns {user_goal_achieved: bool}             │
    │                                                      │
    │  7. Step cost accounting                             │
    │     - input_token_count, output_token_count,         │
    │       reasoning_token_count, cached_token_count      │
    │     - step_cost persisted to DB                      │
    └──────────────────────────────────────────────────────┘
           │ COMPLETE or max_steps reached
           ▼
    ┌──────────────────┐
    │  Artifact bundle │  - ZIP of screenshots, HAR, console logs
    │  (S3/Azure Blob) │  - Single PUT via StepArchiveAccumulator
    └──────────────────┘
           │
           ▼
    Webhook POST to webhook_callback_url
    Body: {run_id, status, output, failure_reason}
    Auth: HMAC-SHA256 signature header (x-skyvern-signature)
```

### 4.2 Failure detection and retry

Failures are caught at multiple levels:

**Action level** (per-action in step):
- `MissingElement` — element_id not in current tree (logged, skip action)
- `MultipleElementsFound` — selector ambiguity (logged, skip)
- `LLMProviderError` — API errors wrapped as `ActionFailure`
- `ImaginarySecretValue` — LLM hallucinated a credential (ActionFailure)
- Generic exceptions → ActionFailure

**Step level** (per step in task):
- `MAX_RETRIES_PER_STEP = 5` — step is retried if the previous attempt failed
- `StepUnableToExecuteError` — raised if task is not "running" or another step is active

**Task level** — the `failure_classifier.py` categorizes terminal failures:

| Category | Confidence | Detection method |
|---|---|---|
| `ANTI_BOT_DETECTION` | 0.7 | Keywords: "captcha", "cloudflare", "bot detect", "ip block" |
| `BROWSER_ERROR` | 0.9 | Exception names: Browser/CDP/TargetClosed |
| `NAVIGATION_FAILURE` | 0.9 | FailedToNavigateToUrl exception, "404", "redirect loop" |
| `PAGE_LOAD_TIMEOUT` | 0.8 | Timeout exceptions, "timeout" in reason |
| `AUTH_FAILURE` | 0.7 | "login fail", "authentication fail", "mfa", "password" |
| `LLM_ERROR` | 0.9 | LLM/APIError/RateLimit exceptions |
| `DATA_EXTRACTION_FAILURE` | 0.7 | ScrapingFailed exception |
| `ELEMENT_NOT_FOUND` | 0.8 | ElementNotFound exception |
| `MAX_STEPS_EXCEEDED` | 0.9 | "max steps", "step limit" in reason |
| `LLM_REASONING_ERROR` | 0.6 | "wrong action", "invalid action", "hallucin" |

Categories are returned sorted by confidence; downstream logic uses them for routing (e.g., anti-bot failures trigger proxy rotation, auth failures trigger credential refresh).

**LLM-level retry** — `LiteLLM Router` with configurable `num_retries` and `allowed_fails_policy` (tolerates rate limit errors but not auth errors). Redis-backed cooldown prevents hammering a failing provider.

---

## 5. Evaluation and Quality

### 5.1 Benchmark performance

Skyvern reports **64.4% accuracy on WebBench**, which it claims as state-of-the-art for web navigation agents. WebBench evaluates against a set of diverse web tasks. The system particularly excels on **WRITE-class tasks** (form filling, authentication, file downloads) — the bread-and-butter of RPA workloads.

### 5.2 Per-step confidence scoring

Every action in the LLM response carries a `confidence_float` (0.0–1.0). This is self-reported by the model — there is no independent calibration step. High-confidence actions proceed normally; low-confidence actions are still executed but logged with appropriate metadata. The system does not currently use confidence scores to trigger replanning (that would require a calibration dataset).

### 5.3 Goal completion verification

A dedicated second LLM call uses `check-user-goal.j2` to validate completion:

```
Input:
  - navigation_goal
  - complete_criterion (user-specified or auto-derived)
  - action history
  - current element tree
  - current datetime

Output:
  {
    "page_info": "<all page content relevant to goal>",
    "thoughts": "<evidence for/against completion>",
    "user_goal_achieved": true | false
  }
```

This is a separate inference call from the action planner, using the same or cheaper model. The key design principle is **conservative termination**: a task is only marked `TERMINATE` (impossible) when the page contains explicit, unambiguous evidence (e.g., "No results found", "Access denied"). Otherwise, alternative approaches are tried.

### 5.4 Step and task observability

Every step records:
- Token counts: `input_token_count`, `output_token_count`, `reasoning_token_count`, `cached_token_count`
- `step_cost` (computed from token counts × model pricing via LiteLLM)
- Action screenshot URLs (before/after each action)
- Browser video recording (per-task)
- HAR network log
- Browser console logs
- All uploaded to S3/Azure Blob as a single ZIP per step (via `StepArchiveAccumulator`)

The `SkyvernContext` carries `SpeculativeLLMMetadata` per step — the full prompt, request/response JSON, and all token/cost metrics — making per-step cost debugging possible.

---

## 6. Rust/ML Relevance

### 6.1 Current ML usage

Skyvern uses **no traditional ML models** (no ONNX, no embeddings, no custom classifiers). All "intelligence" is LLM API calls. The only non-LLM processing is:

- Pillow for image manipulation (bounding box drawing on screenshots)
- pypdf/pdfplumber for document text extraction
- python-calamine for Excel parsing
- tiktoken for prompt token counting (pre-flight estimation to avoid exceeding limits)

There is no vision encoder running locally — screenshots are sent as base64 to the cloud LLM API.

### 6.2 Components amenable to Rust rewrite

| Component | Rust fit | Rationale |
|---|---|---|
| DOM scraper (`domUtils.js`) | Medium | Currently JS injected via CDP; a Rust WASM module could replace it, but CDP injection already works well |
| Screenshot annotation | High | Pillow bounding-box drawing could be `imageproc` crate; ~10× faster with no Python GIL overhead |
| Element hashing | High | SHA-256 of element JSON; trivial in Rust with `sha2` crate |
| Action dispatcher | Medium | The Playwright binding is Python-native; `playwright-rust` exists but is less mature |
| Failure classifier | High | Pure text pattern matching; zero-cost in Rust |
| Token counter | High | `tiktoken-rs` crate exists; avoids Python tiktoken overhead |
| Workflow DAG engine | High | DAG traversal + Jinja2 rendering; could use `askama` for templates, `petgraph` for DAG |
| LLM API client | High | `async-openai` or `anthropic-rs` crates for inference calls |

### 6.3 Vision model integration options for a Rust-native platform

If building a competing Rust-native system that avoids cloud LLM per-step costs:

- **Candle** (Hugging Face) — Qwen2-VL or InternVL2 in GGUF/F16 for local vision inference
- **MLX** (Apple Silicon) — mlx_lm for Qwen2.5-VL at ~4k tokens/sec on M1; viable for screenshots
- **LLaVA / MiniCPM-V** via llama.cpp server — drop-in replacement for GPT-4V API calls
- **Moondream2** (1.8B params) — fast, small vision model suitable for "is this element a button?" classification tasks; runs on CPU

A hybrid architecture would use a small local vision model for element classification and a larger API model only for complex reasoning steps, reducing per-task API cost by 60–80%.

---

## 7. Integration Points

### 7.1 REST API

Base URL: `https://api.skyvern.com` (cloud) or `http://localhost:8080` (self-hosted).
API versions: `/v1/` and `/api/v1/` (legacy alias), `/api/v2/`.
Auth: Bearer token or HMAC-SHA256 API key signature.
OpenAPI 3.1 spec available at `/openapi.json`.

**Key endpoints:**

```
POST   /v1/run/tasks                    Create and start a task
GET    /v1/runs/{run_id}                Get task/workflow run status
POST   /v1/runs/{run_id}/cancel         Cancel running task
GET    /v1/runs/{run_id}/timeline       Execution timeline (v2/workflows)
GET    /v1/runs/{run_id}/artifacts      Retrieve artifacts (screenshots, recording)
POST   /v1/runs/{run_id}/retry_webhook  Retry webhook delivery
POST   /v1/workflows                    Create workflow definition
POST   /v1/workflows/{id}/run           Start workflow run
GET    /v1/browser-sessions             List browser sessions
POST   /v1/credentials                  Store credential
```

**Task creation request fields:**

| Field | Type | Description |
|---|---|---|
| `url` | string | Target URL |
| `navigation_goal` | string | Natural language goal |
| `navigation_payload` | object/string | Form data, user context |
| `extracted_information_schema` | JSON Schema | Expected output structure |
| `complete_criterion` | string | When to consider done |
| `terminate_criterion` | string | When to stop (failure) |
| `error_code_mapping` | object | Custom error definitions |
| `webhook_callback_url` | string | Webhook destination |
| `max_steps` | int | Step limit override |
| `browser_session_id` | string | Reuse existing session |
| `proxy_location` | string | Geo-targeting |
| `engine` | enum | `skyvern_v1`, `skyvern_v2`, `openai_cua`, `anthropic_cua` |
| `totp_identifier` | string | MFA credential ref |

**Task status enum:** `created` → `queued` → `running` → `completed` | `failed` | `terminated` | `timed_out` | `canceled`

### 7.2 Webhook support

Tasks send a POST callback to `webhook_callback_url` on completion or failure:

```json
{
  "run_id": "tsk_abc123",
  "run_type": "task_v2",
  "status": "completed",
  "output": {
    "extracted_data": {...}
  },
  "failure_reason": null,
  "created_at": "2026-03-28T10:00:00Z",
  "modified_at": "2026-03-28T10:02:15Z"
}
```

Authenticity is verified via the `x-skyvern-signature` header (HMAC-SHA256 over the payload with a timestamp, similar to Stripe webhooks). Failed webhook deliveries can be retried via `POST /v1/runs/{id}/retry_webhook`.

### 7.3 Python SDK

```python
# High-level agent API
from skyvern import Skyvern
skyvern = Skyvern(api_key="sk-...")

task = await skyvern.run_task(
    prompt="Extract all job postings from the careers page",
    url="https://company.com/careers",
    data_extraction_schema={"jobs": {"type": "array", ...}}
)

# Lower-level Playwright-compatible API
async with skyvern.browser() as page:
    await page.goto("https://company.com/careers")
    jobs = await page.extract("Get all job listings", schema={"jobs": [...]})
    await page.act("Click the 'Apply' button for the first ML Engineer role")
    success = await page.validate("Confirm the application form is now open")
```

### 7.4 TypeScript SDK

```bash
npm install @skyvern/client
```

Wraps the same REST API for Node.js environments.

### 7.5 No-code integrations

Zapier, Make (Integromat), N8N, Workato connectors available for trigger-based automation without writing code.

### 7.6 MCP Server

`fastmcp>=2.10.1` is in the dependency tree, meaning Skyvern exposes a **Model Context Protocol server**. This allows Claude or other MCP-aware LLMs to call Skyvern as a tool directly from their context, e.g., "browse to this page and extract the data."

### 7.7 Local browser tunnel

Connect a local Chrome session (with existing cookies/auth) to Skyvern Cloud:

```bash
skyvern browser serve --tunnel
# Returns: https://abc123.ngrok-free.dev

task = await skyvern.run_task(
    prompt="Download my latest invoice",
    browser_address="https://abc123.ngrok-free.dev"
)
```

---

## 8. Gaps and Weaknesses

### 8.1 Cost per task

Each task step requires at minimum **2 LLM calls** (action planning + goal verification), often more (SVG conversion, select-option handling, script generation). With a vision model like GPT-4V at ~$10/M input tokens, a 10-step task processing ~4k tokens/step costs roughly $0.40–$1.50 per task depending on screenshot size. At scale (10k tasks/day), this is $4,000–$15,000/day in inference costs.

Mitigation options in the codebase:
- `SECONDARY_LLM_KEY` for cheaper steps
- `enable_speed_optimizations` flag (skips SVG conversion on first retry)
- Prompt caching via Vertex AI (cached tokens tracked separately)
- But no hard cost cap per task — runaway tasks can accumulate many steps

### 8.2 Fragility on dynamic/unusual UIs

The element identification relies on `cursor: pointer` CSS, ARIA roles, and known framework patterns (React Select, Select2, Angular event handlers). Sites that:
- Use canvas-rendered UIs (game-like interfaces, Figma-style apps)
- Have pure JavaScript event handlers not matching Angular/React heuristics
- Use heavy WASM frontends
- Dynamically create elements only on hover

will fool the interactability classifier. The LLM then reasons from a partial element tree and is likely to produce low-confidence or incorrect actions.

### 8.3 Anti-bot detection

Skyvern uses `--disable-blink-features=AutomationControlled` Chrome flag, but this is a basic evasion. Sophisticated anti-bot systems (Cloudflare Enterprise, DataDome, Kasada, PerimeterX) detect headless browsers via:
- JS engine fingerprinting
- Mouse movement entropy analysis
- TLS JA3 fingerprint
- IP reputation

The codebase has a `CAPTCHA_SOLVE` action and a proxy system, but these do not address deep fingerprinting. The failure classifier explicitly handles `ANTI_BOT_DETECTION` (confidence 0.7), indicating it is a common failure mode.

### 8.4 No parallelism within workflows

Workflow blocks execute sequentially. A `ForLoopBlock` iterates items one at a time. To process 1,000 companies in parallel requires either:
- Multiple concurrent workflow runs triggered externally
- Splitting the list before submission

There is no native map-reduce or fan-out/fan-in block type.

### 8.5 Max steps ceiling

`MAX_STEPS_PER_TASK_V2 = 25` (configurable). Complex multi-page workflows that require many steps (e.g., navigating pagination, handling multi-page forms with validation errors) may hit this limit. The `MAX_STEPS_EXCEEDED` failure category (confidence 0.9) suggests this is a real operational problem.

### 8.6 Self-assessed confidence, no calibration

`confidence_float` values are produced by the same model doing the action planning. There is no held-out calibration dataset to validate whether a 0.9 confidence action is actually right 90% of the time. The system logs these values but does not use them to trigger replanning or human escalation.

### 8.7 AGPL-3.0 license friction

The AGPL-3.0 license means any product that runs modified Skyvern code as a network service must open-source its modifications. This is a significant constraint for commercial platforms. The cloud offering has separate terms, but self-hosted deployments are AGPL-bound.

### 8.8 No streaming or progress callbacks

Tasks are fire-and-forget — the caller gets a `run_id` and polls `/v1/runs/{run_id}` or waits for a webhook. There is no WebSocket stream of intermediate step events to show real-time progress in a UI (the `run_timeline` endpoint provides post-hoc timeline, not live events).

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 Where Skyvern beats simpler scrapers

Traditional scrapers (Playwright scripts, Cheerio, Scrapy) break when:
- The target site changes its HTML structure or class names
- Login flows involve TOTP or CAPTCHA
- Forms require context-aware filling (selecting the right option from a dropdown with 200 entries)
- Navigation requires multi-step reasoning ("find the company's technology partners page and extract partner names")

Skyvern handles all of these because it reasons about the page visually each step. For a lead-gen platform, the sweet spots are:

| Use case | Why Skyvern wins |
|---|---|
| ATS/careers page scraping | Sites like Greenhouse, Lever, Ashby all render differently; Skyvern generalizes across all of them |
| LinkedIn profile extraction | Handles dynamic JavaScript rendering, login persistence, anti-bot evasion (partially) |
| Company contact discovery on websites | Natural language goal "find the email of the VP of Engineering" works across any site layout |
| Form-based research (insurance quotes, vendor portals) | Multi-field forms with dropdowns, validation errors, conditional fields |
| Vendor/partner directory scraping | Extract structured data from directories with no API |
| Government/regulatory filings | E-filing portals with non-standard UIs |

### 9.2 Specific lead-gen pipeline integrations

**Discovery phase**: Use Skyvern to crawl company websites that block conventional scrapers. Goal: "Extract company description, founding year, employee count, and technology mentions from the About page."

**Enrichment phase**: Navigate to LinkedIn Company pages, Crunchbase, or G2 to extract funding rounds, employee growth, tech stack. This is higher-signal than static datasets because it reflects current state.

**Contact discovery**: Navigate to team/leadership pages across any site structure. Goal: "Find the names and LinkedIn URLs of engineering leaders (CTO, VP Engineering, Head of AI)."

**ATS detection**: Navigate to a company's Ashby/Greenhouse/Lever board, extract all open roles and their details. More reliable than RSS-based approaches for boards that do not publish feeds.

**Verification**: Use `page.validate()` to check whether a company still operates a given product before adding it to a campaign list ("Confirm this company still sells an AI coding assistant").

### 9.3 Integration pattern for this platform

```typescript
// Trigger Skyvern from the lead-gen GraphQL mutation
// src/apollo/resolvers/companies.ts

const enrichCompanyWithSkyvern = async (companyUrl: string) => {
  const response = await fetch("https://api.skyvern.com/v1/run/tasks", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.SKYVERN_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: companyUrl,
      navigation_goal: "Extract company tech stack, AI product mentions, founding year, HQ location, and employee count range",
      extracted_information_schema: {
        type: "object",
        properties: {
          tech_stack: { type: "array", items: { type: "string" } },
          ai_products: { type: "array", items: { type: "string" } },
          founded_year: { type: "number" },
          hq_location: { type: "string" },
          employee_count: { type: "string" }
        }
      },
      webhook_callback_url: `${process.env.APP_URL}/api/webhooks/skyvern`,
      max_steps: 10,
      engine: "skyvern_v2"
    })
  });
  const { run_id } = await response.json();
  return run_id;
};
```

Webhook handler at `/api/webhooks/skyvern` receives the enriched data and calls a GraphQL mutation to write it back to Neon via Drizzle.

### 9.4 Cost model considerations

For a B2B lead-gen platform processing 500 companies/day at $0.50/task average:
- Daily inference cost: ~$250
- Monthly: ~$7,500

This is expensive relative to simpler scrapers ($0/request) but cheaper than manual research ($20–50/company for human researchers). The economics work for high-value targets (enterprise companies where a single deal justifies the enrichment cost) but not for commodity bulk discovery (where simpler scrapers or Common Crawl are better choices).

**Hybrid strategy** (recommended):
1. Use Common Crawl + fast HTML scrapers for bulk discovery (zero marginal cost)
2. Use Skyvern only for deep enrichment of shortlisted companies that resist conventional scraping
3. Gate Skyvern runs on ICP score threshold — only invoke if `icp_score > 0.7`
4. Cache enrichment results with 30-day TTL to avoid re-running on the same target

### 9.5 Build vs. use decision

Skyvern's core IP is in the tight integration of DOM scraping + vision LLM + action dispatch. For a competing platform focused on **lead-gen specifically** rather than general browser automation, it is worth borrowing the architectural pattern (DOM element tree + screenshot → LLM → structured action JSON) rather than using Skyvern directly, because:

- AGPL license is incompatible with a closed SaaS product
- The general-purpose action set (DRAG, HOVER, complex form filling) adds cost and complexity not needed for lead research
- A domain-specific variant could use a fine-tuned or few-shot-prompted smaller vision model for the specific task of "extract structured company data from a page", reducing cost by 80%
- The failure classifier patterns (anti-bot, element-not-found, max-steps) are directly reusable as a reference implementation

The `domUtils.js` element identification logic, the SHA-256 element hashing, and the Jinja2 prompt templates are all readable, well-structured code that can be studied and adapted under the AGPL research exemption.

---

## Appendix: Key source file index

| File | Role |
|---|---|
| `skyvern/webeye/scraper/domUtils.js` | DOM traversal, interactability detection, element ID assignment |
| `skyvern/webeye/scraper/scraper.py` | Screenshot capture, element tree assembly, token gating |
| `skyvern/webeye/actions/actions.py` | Action type definitions (Pydantic models) |
| `skyvern/webeye/actions/handler.py` | Action dispatch registry, per-action handlers |
| `skyvern/forge/prompts/skyvern/extract-action.j2` | Primary action planning prompt |
| `skyvern/forge/prompts/skyvern/task_v2.j2` | Mini-goal decomposition prompt |
| `skyvern/forge/prompts/skyvern/check-user-goal.j2` | Goal completion verification prompt |
| `skyvern/forge/agent_functions.py` | Step execution, SVG conversion, speed optimizations |
| `skyvern/forge/failure_classifier.py` | Terminal failure categorization with confidence scores |
| `skyvern/forge/sdk/api/llm/api_handler_factory.py` | LiteLLM routing, multi-provider support, vision gating |
| `skyvern/forge/sdk/core/skyvern_context.py` | Per-task execution context (token tracking, TOTP, caching) |
| `skyvern/forge/sdk/models.py` | Step data model (token counts, cost, status) |
| `skyvern/forge/sdk/routes/agent_protocol.py` | REST API routes (task creation, status, webhook) |
| `skyvern/forge/sdk/schemas/tasks.py` | Task request/response Pydantic schemas |
| `skyvern/forge/sdk/workflow/models/block.py` | Workflow block types and DAG structure |
| `skyvern/forge/sdk/workflow/models/workflow.py` | Workflow definition, run status, DAG validation |
| `skyvern/forge/sdk/artifact/manager.py` | Screenshot/recording storage (ZIP bundling, S3/Azure) |
| `skyvern/config.py` | All configuration: LLM keys, step limits, timeouts, token limits |
| `skyvern/webeye/browser_factory.py` | Browser session creation, CDP connect, anti-detection flags |
| `pyproject.toml` | Full dependency manifest |

# Firecrawl — AI Features Deep Report

> Research date: March 2026. Based on Firecrawl v2.8.x (latest stable) and public documentation.

---

## 1. Overview

**Firecrawl** (GitHub: `mendableai/firecrawl`, now mirrored as `firecrawl/firecrawl`) is a web-data extraction API purpose-built for LLM consumption. Its tagline: *"Turn entire websites into LLM-ready markdown or structured data."*

| Metric | Value |
|---|---|
| GitHub stars | ~100k (99.7k as of March 2026) |
| Forks | 6.7k |
| Commits | 5,158+ |
| License | Apache 2.0 |
| Origin | Built internally at Mendable (YC W23) to solve their own RAG ingestion |
| Language | TypeScript (Node.js v22+), with a Rust module for link extraction |
| Deployment | Managed SaaS at firecrawl.dev + self-hostable via Docker Compose |

**What it does in one sentence:** Given a URL (or a natural language prompt), Firecrawl fetches the page through a browser-rendering pipeline, cleans the HTML, converts it to clean markdown or structured JSON, and returns it over a REST API — handling proxies, anti-bot bypasses, JavaScript execution, and optional LLM-powered schema extraction automatically.

**Origins:** Initially an internal scraping tool for Mendable's document ingestion pipeline. The team open-sourced it after realizing the demand for LLM-ready web data was universal across the AI stack.

**Recent trajectory (2025-2026):**
- v2.8.0 introduced Parallel Agents, a proprietary Spark model family, and a full CLI
- Deep Research API deprecated (June 2025) in favor of the `/agent` endpoint
- The `/extract` v1 endpoint deprecated in February 2026 in favor of `/agent`
- Achieved ~100k GitHub stars, making it one of the fastest-growing AI infra tools

---

## 2. AI Architecture

### 2.1 High-Level Data Flow

```
User Request
     │
     ▼
Express.js API Gateway (port 3002)
  - Auth (ACUC cache in Redis, 10-min TTL)
  - Rate limiting (per-team token bucket)
  - Credit balance check
     │
     ▼
BullMQ Job Queues (Redis-backed)
  ┌──────────┬────────────┬──────────────┐
  │ Scrape Q │ Extract Q  │ Deep Res. Q  │
  └──────────┴────────────┴──────────────┘
     │
     ▼
Scrape Worker → startWebScraperPipeline()
  │
  ├── Engine Waterfall (tries in order):
  │     1. Index Engine    (cached content)
  │     2. Fire-Engine/Chrome (CDP)
  │     3. Fire-Engine/Playwright
  │     4. Fire-Engine/TLS  (stealth proxy)
  │     5. Local Playwright
  │     6. Fetch Engine    (plain HTTP)
  │     7. PDF Engine      (RunPod / pdf-parse)
  │     8. Document Engine (DOCX/ODT/RTF)
  │
  └── HTML Processing Pipeline:
        1. HTML Cleaning   (strip base64, noise)
        2. Markdown Conv.  (Turndown + GFM plugin)
        3. Link Extraction (Rust-based extractLinks())
        4. Metadata Extr.  (OpenGraph, Dublin Core)
        5. LLM Extraction  (optional, schema-driven)
     │
     ▼
Storage
  - Redis: job state, ACUC, rate limits
  - Supabase PostgreSQL: job logs, auth
  - Google Cloud Storage: results, screenshots
```

### 2.2 LLM Integration: Model-Agnostic by Design

Firecrawl's extraction layer does not hardcode a single LLM provider. The `apps/api/package.json` reveals support for multiple backends through the Vercel AI SDK:

```json
"@ai-sdk/anthropic": "^2.0.41",    // Claude 3.x, Claude Sonnet
"@ai-sdk/openai": "2.0.64",        // GPT-4o, GPT-4o-mini
"@ai-sdk/google": "^3.0.29",       // Gemini models
"@ai-sdk/google-vertex": "^3.0.86",
"@ai-sdk/groq": "^2.0.28",
"@ai-sdk/deepinfra": "^1.0.27",
"@ai-sdk/fireworks": "^1.0.27",
"ollama-ai-provider": "^1.2.0",    // Local inference
"@openrouter/ai-sdk-provider": "^0.4.5",
"ai": "6.0.86"                     // Core SDK
```

Self-hosters configure their preferred LLM via `OPENAI_API_KEY` or equivalent env vars. Ollama is supported for fully local inference. The SaaS deployment uses Firecrawl's own **Spark** model family for agent tasks (see Section 3.5).

### 2.3 Markdown Conversion Pipeline

The conversion path is: **rendered HTML → Turndown → GFM markdown**.

Key libraries:
- **turndown** (^7.1.3): Converts HTML DOM to Markdown
- **joplin-turndown-plugin-gfm** (^1.0.12): Adds GitHub Flavored Markdown extensions (tables, strikethrough)
- **marked** (^14.1.2): For markdown parsing/re-rendering when needed
- **cheerio** (^1.0.0): jQuery-like selector API for HTML cleaning pre-Turndown
- **jsdom** (^26.0.0): Full DOM environment for JS evaluation
- **Rust link extractor**: `extractLinks()` called from the pipeline — a native Rust module embedded for performance-critical URL parsing

Before Turndown runs, the pipeline:
1. Strips base64-encoded images (prevents token bloat)
2. Removes navigation bars, headers, footers, ads (noise reduction)
3. Applies `only_main_content` heuristics if requested (isolates article/main body)
4. Extracts OpenGraph and Dublin Core metadata into a separate `metadata` object

The result is intentionally minimal — clean prose with headers, code blocks, and links, but without layout markup that wastes LLM context.

### 2.4 Schema-Based LLM Extraction

When `json` format is requested, the pipeline appends an LLM extraction step after markdown conversion:

1. The cleaned markdown is the input context (not raw HTML — far fewer tokens)
2. The user-provided JSON Schema is passed as a tool definition (OpenAI-style function calling)
3. The LLM returns a structured JSON object conforming to the schema
4. Firecrawl validates the output shape before returning it

This approach has two important properties:
- **Token efficiency**: Operating on markdown rather than HTML reduces input tokens by ~60-80%
- **Schema enforcement**: Using tool calling / structured output mode gives hard type guarantees rather than prompt-based hoping

---

## 3. Key AI Features

### 3.1 `/scrape` Endpoint

The atomic unit of Firecrawl. Scrapes a single URL and returns one or more output formats.

**Request:**
```json
POST /v2/scrape
{
  "url": "https://example.com/about",
  "formats": ["markdown", "json", "screenshot", "links"],
  "jsonOptions": {
    "schema": {
      "type": "object",
      "properties": {
        "company_name": { "type": "string" },
        "founded_year": { "type": "integer" },
        "employee_count": { "type": "string" },
        "tech_stack": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["company_name"]
    },
    "prompt": "Extract company information. For tech_stack, look for any mentioned technologies, frameworks, or tools."
  },
  "only_main_content": true,
  "actions": [
    { "type": "wait", "milliseconds": 1500 },
    { "type": "click", "selector": "#load-more-btn" },
    { "type": "wait", "milliseconds": 2000 }
  ],
  "location": { "country": "US", "languages": ["en"] },
  "maxAge": 86400000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markdown": "# Acme Corp\n\nFounded in 2018...",
    "json": {
      "company_name": "Acme Corp",
      "founded_year": 2018,
      "employee_count": "50-200",
      "tech_stack": ["React", "Node.js", "PostgreSQL"]
    },
    "screenshot": "https://storage.firecrawl.dev/screenshots/abc123.png",
    "links": ["https://example.com/team", "https://example.com/jobs"],
    "metadata": {
      "title": "About Us — Acme Corp",
      "description": "Acme Corp builds...",
      "language": "en",
      "ogImage": "https://example.com/og.png",
      "sourceURL": "https://example.com/about",
      "statusCode": 200,
      "contentType": "text/html"
    }
  }
}
```

**Credit costs:**
- Base scrape: 1 credit
- JSON mode (LLM extraction): +4 credits (total: 5)
- Enhanced proxy (anti-bot bypass): +4 credits
- PDF parsing: +1 credit per page
- Zero Data Retention (Enterprise): +1 credit

**All supported formats:** `markdown`, `html`, `rawHtml`, `screenshot`, `json`, `summary`, `links`, `images`, `branding`, `audio`

The `branding` format is notable for lead gen: it extracts colors (primary, secondary, accent), typography (font families, sizes, weights), spacing, component styles, and layout configuration — useful for segmenting companies by design maturity or brand consistency.

### 3.2 `/crawl` Endpoint

Recursively crawls an entire site starting from a root URL.

**Request:**
```json
POST /v2/crawl
{
  "url": "https://example.com",
  "limit": 100,
  "maxDiscoveryDepth": 3,
  "includePaths": ["/blog/*", "/about*"],
  "excludePaths": ["/admin/*", "/cdn-cgi/*"],
  "allowSubdomains": false,
  "allowExternalLinks": false,
  "sitemap": "include",
  "ignoreQueryParameters": true,
  "delay": 500,
  "maxConcurrency": 5,
  "scrapeOptions": {
    "formats": ["markdown"],
    "only_main_content": true
  },
  "webhook": {
    "url": "https://your-app.com/webhooks/firecrawl",
    "secret": "your-hmac-secret",
    "events": ["crawl.page", "crawl.completed"]
  }
}
```

**Returns immediately** with a `jobId`. Results polled via `GET /v2/crawl/{id}`.

**Webhook events** (HMAC-SHA256 signed via `X-Firecrawl-Signature`):
- `crawl.started`
- `crawl.page` — fires per scraped page with that page's data
- `crawl.completed`
- `crawl.failed`

**URL Discovery:** The crawler combines sitemap parsing (`tryGetSitemap()`) with recursive HTML link extraction (`extractLinksFromHTML()`). The `filterLinks()` method enforces depth limits, robots.txt compliance, include/exclude regex patterns, and directional crawling controls. The BullMQ queue locks URL-to-crawl pairs in Redis to prevent duplicate processing across concurrent workers.

**Operating modes:**
1. **Sync** (`crawl()` in SDK): waits for completion, handles pagination automatically
2. **Async** (`start_crawl()`): returns job ID, manual polling via `get_crawl_status()`
3. **WebSocket watcher**: real-time page-by-page streaming with configurable poll intervals

### 3.3 `/extract` Endpoint

The `/extract` endpoint (v2, still active) is purpose-built for extracting structured data from one or more URLs — including wildcard domain patterns.

```json
POST /v2/extract
{
  "urls": ["https://acme.com/*", "https://rival.com/pricing"],
  "prompt": "Extract company pricing tiers, features, and target customer segments",
  "schema": {
    "type": "object",
    "properties": {
      "pricing_tiers": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "price_monthly": { "type": "number" },
            "features": { "type": "array", "items": { "type": "string" } }
          }
        }
      },
      "free_tier_available": { "type": "boolean" }
    }
  },
  "enableWebSearch": true
}
```

When a wildcard (`/*`) is specified, Firecrawl automatically crawls all discoverable URLs on that domain before running LLM extraction across the combined content.

**Response:**
```json
{
  "success": true,
  "data": {
    "pricing_tiers": [
      { "name": "Starter", "price_monthly": 49, "features": ["..."] },
      { "name": "Pro", "price_monthly": 199, "features": ["..."] }
    ],
    "free_tier_available": true
  }
}
```

Async jobs return a `jobId` and support polling with status states: `processing`, `completed`, `failed`, `cancelled`.

**`enableWebSearch: true`** — When enabled, Firecrawl searches related pages beyond the specified URLs to fill in missing fields. Useful when a company's pricing page doesn't list all plan details but their blog does.

**Python SDK pattern using Pydantic:**
```python
from pydantic import BaseModel, Field
from typing import List, Optional

class PricingTier(BaseModel):
    name: str
    price_monthly: Optional[float]
    features: List[str] = Field(description="Key features included in this tier")

class CompanyPricing(BaseModel):
    tiers: List[PricingTier]
    free_trial_days: Optional[int]

result = app.extract(
    urls=["https://competitor.com/*"],
    params={
        "prompt": "Extract all pricing information",
        "schema": CompanyPricing.model_json_schema()
    }
)
```

### 3.4 `/agent` Endpoint (FIRE-1 + Spark Models)

The `/agent` endpoint is the highest-level AI feature — a fully autonomous web research agent that takes a natural language prompt and returns structured data without requiring the caller to specify URLs.

```json
POST /v2/agent
{
  "prompt": "Find the AI engineering team leads at Vercel, their LinkedIn profiles, and any recent talks or blog posts they've written about infrastructure",
  "model": "spark-1-pro",
  "schema": {
    "type": "object",
    "properties": {
      "team_leads": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "role": { "type": "string" },
            "linkedin": { "type": "string" },
            "recent_content": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    }
  },
  "urls": ["https://vercel.com/about"],
  "maxCredits": 500
}
```

**Response (async, poll via job ID):**
```json
{
  "success": true,
  "status": "completed",
  "data": { "team_leads": [...] },
  "expiresAt": "2026-04-28T00:00:00Z",
  "creditsUsed": 127
}
```

**FIRE-1** is Firecrawl's browser automation agent embedded within the agent pipeline. It handles:
- Form interaction (type, click, submit)
- Modal dismissal and cookie consent
- Multi-page navigation without URL specification
- Login-gated content (with provided credentials)
- Pagination traversal

FIRE-1 is activated in the `/scrape` endpoint by passing `"agent": { "model": "FIRE-1", "prompt": "..." }`. SmartScrape logic detects when content requires interaction and automatically enables FIRE-1.

### 3.5 Spark Model Family

Firecrawl's proprietary models for the `/agent` endpoint:

| Model | Speed | Recall | Cost | Best For |
|---|---|---|---|---|
| Spark 1 Fast | Instant | ~30% | Lowest | Simple lookups, structured pages |
| Spark 1 Mini | Fast | ~40% | 60% less than Pro | Contact info, pricing, well-structured sites |
| Spark 1 Pro | Slower | ~50% | Standard | Complex multi-domain research, ambiguous data |

**Intelligent waterfall:** The system tries Spark 1 Fast first (instant cache-based retrieval), then automatically upgrades to Mini/Pro for queries requiring full web research. Users pay only for the depth actually used.

Architecture details are proprietary — Firecrawl has not disclosed training methodology or base models. The models are described as "purpose-built for web extraction tasks," implying fine-tuning on web navigation and structured extraction rather than being general-purpose LLMs.

### 3.6 `/map` Endpoint

Lightweight URL discovery without full crawling.

```json
POST /v2/map
{
  "url": "https://g2.com/categories/crm",
  "limit": 500,
  "search": "ai sales software",
  "sitemap": "include"
}
```

Returns an array of URLs ordered by relevance to the search term. Uses sitemap + SERP results. Costs 1 credit flat regardless of URL count. Designed as a precursor to batch scraping — map first to discover all pages, then scrape selectively.

---

## 4. Data Pipeline

### 4.1 URL → Output: Full Pipeline Trace

```
1. URL submitted to /v2/scrape or /v2/crawl
         │
         ▼
2. Auth/credit check via ACUC (Redis cache, Supabase fallback)
         │
         ▼
3. Job enqueued in BullMQ Scrape Queue
         │
         ▼
4. Engine Selection (waterfall):
   a. Index Engine: check GCS/Redis cache (maxAge check)
   b. Fire-Engine Chrome: CDP-based JS rendering
   c. Fire-Engine Playwright: multi-browser fallback
   d. Fire-Engine TLS: stealth proxy mode
   e. Local Playwright: if Fire-Engine unavailable (self-host)
   f. Fetch Engine: plain HTTP for static HTML
   g. PDF Engine: RunPod or pdf-parse for PDFs
   h. Document Engine: DOCX/ODT/RTF
         │
         ▼
5. HTML Processing:
   a. Strip base64 images and encoding artifacts
   b. Cheerio-based cleaning (remove nav/footer/ads)
   c. only_main_content extraction (content scoring heuristic)
   d. Turndown + GFM plugin → clean markdown
   e. Rust extractLinks() → links array
   f. OpenGraph + Dublin Core metadata extraction
         │
         ▼
6. Optional LLM Extraction (if "json" in formats):
   a. Cleaned markdown sent as context (not raw HTML)
   b. JSON Schema passed as tool definition (function calling)
   c. LLM returns structured JSON
   d. Schema validation
         │
         ▼
7. Results stored in GCS (large objects), Redis (job state)
   Job logs written to Supabase
         │
         ▼
8. Response returned to client / webhook fired
```

### 4.2 How Schemas Drive AI Extraction

The extraction is fundamentally a **structured generation problem**, not a parsing problem. Firecrawl uses OpenAI-style function calling (tool use) to enforce JSON Schema constraints at the model output level.

Key design choices:
- **Markdown as context, not HTML**: HTML typically has 3-5x more tokens than the equivalent markdown. By converting first, each LLM call handles far more semantic content per token.
- **Schema as tool definition**: Rather than asking the LLM to "output JSON that looks like X," the schema is passed as a function signature. The model is forced to produce output matching the schema types.
- **Prompt-augmented schemas**: A natural language `prompt` field can accompany the schema, providing semantic context ("for tech_stack, include cloud providers") that the schema alone cannot express.
- **Nested schemas supported**: Arrays of objects, optional fields, and nested structures all work. The `List[BaseModel]` Pydantic pattern wraps multi-item extraction cleanly.
- **Date limitation**: `datetime` type is not supported — use `str` with a prompt annotation like "ISO 8601 date string."

### 4.3 Crawl State Machine

The `StoredCrawl` object in Redis tracks crawl state:
- URL discovery: BFS with domain prioritization
- URL deduplication: Redis locks (`url-to-crawl:<hash>`) prevent concurrent re-scraping
- Concurrency: per-team and per-crawl job limits in Redis sorted sets
- Completion tracking: when all jobs in a crawl are done, aggregate results
- Results available 24 hours post-completion (GCS TTL)

---

## 5. Evaluation / Quality

### 5.1 CrawlBench Benchmark

Firecrawl built and published **CrawlBench**, an open extraction benchmark with two datasets:

**CrawlBench-Easy (Y Combinator top companies):**
- 1,052+ data points extracted from company websites
- Ground truth: manually written deterministic scrapers
- Scoring: exact match + ROUGE-L
- **Firecrawl result: 87.5% exact match, 93.7% ROUGE score**

**CrawlBench-Hard (OpenAI MiniWoB 2017 dataset):**
- 1,300 tasks across two levels of complexity
- Level 0 (task list extraction): **100% accuracy**
- Level 1 (specific instruction following): **49.7% accuracy**
- Combined: **70.3% overall**

The Level 1 drop-off (49.7%) is significant — it reflects the inherent difficulty of complex, multi-step interaction tasks where the model must reason about page state, not just extract visible text.

### 5.2 Model vs. Prompt: Key Finding

CrawlBench research produced a counter-intuitive finding: **prompt engineering is ~7x more impactful than model selection.**

- Custom prompt optimization: ~41-point accuracy improvement
- Switching from GPT-4o-mini to a better model: ~6-point improvement
- Claude 3.5 Haiku vs. Claude 3 Haiku: +13.8 points, despite 4x cost increase

This has direct implications for teams building extraction pipelines: invest in prompt engineering before spending on model upgrades.

### 5.3 Schema Validation

Firecrawl validates extracted JSON against the provided schema before returning it. Failed validations result in retries or partial results, not silent schema violations. The `success` field in the response is an explicit indicator.

**What isn't measured:**
- Per-field confidence scores (not exposed in the API)
- Hallucination rates on missing data (a known weakness — LLMs may invent plausible-sounding values for required fields that don't exist on the page)
- Cross-run consistency (same URL + schema may return slightly different field values across calls)

### 5.4 Claimed Production Metrics

From Firecrawl marketing material:
- >80% benchmark coverage vs. all competitors tested
- 98% extraction accuracy (context unclear)
- 33% faster speeds vs. alternatives
- 40% higher success rates vs. alternatives

These numbers should be treated with appropriate skepticism — they are vendor-reported and the methodology is not fully disclosed.

---

## 6. Rust / ML Relevance

### 6.1 Rust in Firecrawl's Codebase

Firecrawl uses Rust in a targeted, performance-critical role: the **link extraction module**. `extractLinks()` is a native Rust function called from the Node.js pipeline for URL parsing and extraction from HTML content. This is a classic FFI (Foreign Function Interface) pattern — Node.js handles orchestration, Rust handles the CPU-bound parsing.

Additionally, Firecrawl introduced a **Rust-based PDF parser** delivering up to 3x faster parsing than the JavaScript equivalent. PDF processing is I/O and compute-intensive, making Rust the natural fit.

### 6.2 Could a Rust Service Replicate Firecrawl's API?

**Yes, substantially — with one important carve-out.** Here's the breakdown:

| Component | Rust Feasibility | Notes |
|---|---|---|
| HTTP scraping (static HTML) | Trivial | `reqwest`, `scraper`, `select` crates |
| HTML → Markdown conversion | Mature | `htmd` (turndown.js-inspired), `mdka` crates |
| JavaScript rendering | Hard | Requires Chromium CDPe or Playwright — both are Node/Python; `chromiumoxide` (Rust CDP) is viable but less mature than Node.js solutions |
| Link extraction | Native | Already done in Rust in Firecrawl |
| PDF parsing | Native | `pdf-extract`, `lopdf` crates |
| Queue system | Native | `tokio` + `deadpool-redis` or direct BullMQ equivalent |
| LLM API calls | Native | `async-openai`, Anthropic client crates |
| JSON Schema validation | Native | `jsonschema` crate |
| Structured LLM extraction | Native | Tool calling via any LLM API — model-agnostic |
| Anti-bot stealth (Fire-Engine equivalent) | Proprietary | This is the hard part — TLS fingerprinting, proxy rotation, browser fingerprint randomization is undisclosed tech |

**ShadowCrawl** (GitHub: `DevsHero/ShadowCrawl`) is an existing Rust-based Firecrawl alternative that implements the core scraping pipeline in Rust, uses Chromium CDP for rendering, and claims 99.99% success rate with built-in meta-search for AI agents.

**Spider** (also Rust) focuses on raw throughput for large-scale site maps where the bottleneck is network I/O, not extraction quality.

### 6.3 Performance Characteristics Relevant to Rust

- **Markdown conversion**: Turndown in Node.js is synchronous and CPU-bound for large pages. A Rust implementation (`htmd`) handles this significantly faster with no GC pressure.
- **Link extraction**: Already Rust in Firecrawl — validates the approach.
- **Concurrency model**: Firecrawl uses Node.js event loop + BullMQ workers for I/O concurrency. A Rust service using `tokio` with connection pooling would achieve comparable or better throughput with lower memory per connection.
- **Memory**: Node.js with jsdom loaded per page is memory-heavy. A Rust HTML parser (`html5ever`, `scraper`) processes large pages with ~10x less RAM.
- **Latency for cached paths**: Sub-100ms is achievable in Rust for cached pages; Node.js overhead adds 10-50ms.

**The one Rust gap:** headless browser automation. `chromiumoxide` is the Rust CDP client, but it lags behind Playwright's feature set and stability. For production anti-bot bypasses, the Path of least resistance remains delegating to a sidecar Playwright service (as Firecrawl itself does in self-hosted mode).

---

## 7. Integration Points

### 7.1 REST API

All endpoints are versioned REST over HTTPS. Base URL: `https://api.firecrawl.dev`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/v2/scrape` | POST | Single URL scrape |
| `/v2/crawl` | POST | Start recursive crawl |
| `/v2/crawl/{id}` | GET | Poll crawl status |
| `/v2/crawl/{id}` | DELETE | Cancel crawl |
| `/v2/extract` | POST | Multi-URL LLM extraction |
| `/v2/extract/{id}` | GET | Poll extract status |
| `/v2/map` | POST | URL discovery |
| `/v2/agent` | POST | Autonomous web agent |
| `/v2/agent/{id}` | GET | Poll agent status |
| `/v2/search` | POST | Web search + scrape |
| `/v2/batch/scrape` | POST | Async batch URL scraping |

Authentication: `Authorization: Bearer <API_KEY>` header.

### 7.2 SDKs

**Official:**
- **Python** (`firecrawl-py`) — sync + async, Pydantic schema support
- **Node.js / TypeScript** (`@mendable/firecrawl-js`) — sync + async, Zod schema support
- **Java SDK** — JVM applications
- **CLI** (`firecrawl-cli`) — full scrape, search, crawl, map from terminal

**Community (v1+ only):**
- **Go SDK** — community-maintained
- **Rust SDK** — community-maintained wrapper around the REST API (not the full pipeline)

### 7.3 MCP Server

Firecrawl provides an **MCP (Model Context Protocol) server** compatible with Claude, Cursor, Windsurf, VS Code, and other AI tools. This allows AI agents to invoke Firecrawl operations as tools within their context window. The MCP server exposes scrape, crawl, map, extract, and agent operations as callable tools.

The **Firecrawl Skill** (added in v2.8.0) enables AI agents like Claude Code, Codex, and OpenCode to autonomously invoke Firecrawl for web data gathering during their agentic loops.

### 7.4 Webhook Support

Crawl jobs support HMAC-SHA256-signed webhooks:

```json
{
  "webhook": {
    "url": "https://your-app.com/hooks/firecrawl",
    "secret": "your-signing-secret",
    "events": ["crawl.page", "crawl.completed", "crawl.failed"]
  }
}
```

Signature verification: `X-Firecrawl-Signature` header contains the HMAC-SHA256 of the request body signed with your secret. The `crawl.page` event fires per page with that page's extracted data — enabling streaming pipeline processing.

### 7.5 Self-Hosting

**Requirements:**
- Docker Compose (modern `docker compose` syntax, not `docker-compose`)
- Redis (queue + rate limiting + ACUC cache)
- PostgreSQL (Supabase-compatible, for auth + job logs)
- Playwright service (sidecar container for browser rendering)
- Sufficient RAM for concurrent browser instances

**Key environment variables:**
```bash
PORT=3002
HOST=0.0.0.0
USE_DB_AUTHENTICATION=false  # disable for local dev
BULL_AUTH_KEY=CHANGEME       # BullBoard queue admin UI
REDIS_URL=redis://redis:6379
PLAYWRIGHT_SERVICE_URL=http://playwright-service:3000/scrape
MAX_CPU=0.8                  # reject jobs above 80% CPU
MAX_RAM=0.8                  # reject jobs above 80% RAM
NUM_WORKERS_PER_QUEUE=2      # worker count per BullMQ queue
OPENAI_API_KEY=...           # or Anthropic/other LLM key
```

**Critical self-hosting limitation:** Fire-Engine (the proprietary stealth scraping layer with IP rotation, browser fingerprint randomization, and anti-bot bypasses) is **not included** in the open-source release. Self-hosted Firecrawl falls back to Local Playwright only, which means it fails against Cloudflare, Akamai, DataDome, and similar bot detection systems.

**BullBoard:** Queue management UI at `http://localhost:3002/admin/{BULL_AUTH_KEY}/queues`.

---

## 8. Gaps / Weaknesses

### 8.1 Cost at Scale

The credit system has a sharp scaling cliff when LLM extraction is involved:

| Operation | Credits | Effective credits/1000 pages |
|---|---|---|
| Plain markdown scrape | 1 | 1,000 |
| JSON extraction | 5 | 5,000 |
| Enhanced proxy + JSON | 9 | 9,000 |
| Agent query | Variable | 50–500+ |

At the Growth tier ($333/month for 500k credits), JSON extraction of 100k pages costs $333 — comparable to running your own LLM calls but with the overhead of Firecrawl's margin. At 1M pages/month, self-hosting becomes economically mandatory.

**Additional cost traps:**
- Failed requests still consume credits
- Uncontrolled crawls can balloon page counts (budget with `limit`)
- Pages exceeding token limits get truncated but charge full extraction fees
- Credits do not roll over between billing months

### 8.2 Self-Hosted Capability Gap

The open-source repo explicitly excludes Fire-Engine. For any production workload hitting modern CDNs or bot-protected sites, the self-hosted version is unreliable. The team acknowledges: "Self-hosted Firecrawl still isn't production-ready" for complex scraping scenarios.

This creates a lock-in dynamic: start on managed SaaS, scale costs become prohibitive, but moving to self-hosted loses the most valuable anti-bot capabilities.

### 8.3 Extraction Quality Limitations

- **Hallucination on missing fields**: If a required schema field doesn't exist on the page, LLMs often invent plausible-sounding values. No confidence score is returned to detect this.
- **Large sites not supported**: Amazon, eBay, Airbnb, and similar high-scale e-commerce sites are explicitly excluded from wildcard `/extract`.
- **Complex logical queries**: "Find companies where revenue > $1M" type queries are "not yet fully operational."
- **Non-determinism**: Two identical requests may return slightly different field values.
- **No per-field provenance**: The API doesn't indicate which part of the page each extracted field came from.
- **Recall ceiling**: Even Spark 1 Pro only achieves ~50% recall on the hard benchmark — meaning half of complex multi-domain queries fail to retrieve the requested information.

### 8.4 Latency

- **Fresh scrape with JS rendering**: 3-15 seconds per page depending on page complexity
- **Cached scrape**: Milliseconds (500% speed improvement claimed)
- **Crawl of 100 pages**: Can take minutes to hours depending on concurrency limits and `delay` settings
- **Agent queries**: Variable — simple queries return in seconds, complex multi-source research can take 30-120 seconds

For real-time enrichment use cases (e.g., a CRM that enriches a lead as a sales rep is on a call), these latencies require careful pipeline design with async processing and pre-warming strategies.

### 8.5 Data Freshness

Default cache is 2 days (`maxAge: 172800000`). For company websites that update pricing, team pages, or job listings, 2-day stale data can mean missed signals. Cache invalidation requires setting `maxAge: 0`, which forces a fresh fetch but increases cost and latency.

### 8.6 Rate Limits

| Plan | Rate Limit |
|---|---|
| Free | 10 req/min |
| Hobby ($16/mo) | 50 req/min |
| Standard ($83/mo) | 200 req/min |
| Growth ($333/mo) | 500 req/min |

At 200 req/min (Standard), processing 10,000 pages takes ~50 minutes minimum, ignoring per-page scrape time. Batch scrape mode is the mitigation, but it operates asynchronously with its own queue depth.

### 8.7 Webhook and Streaming Gaps

- No real-time streaming of partial markdown during scrape (full page only)
- Webhook delivery has no documented retry policy or dead-letter queue
- WebSocket crawl watcher is a polling abstraction, not true server-push streaming

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 Where Firecrawl Excels in Lead Gen

**Company enrichment from website:**
The `Map → Batch Scrape → JSON extract` pipeline is purpose-built for lead gen:

1. `POST /v2/map { url: "https://target.com" }` → get all page URLs (1 credit)
2. `POST /v2/batch/scrape` with the relevant URLs (about, team, pricing, jobs) → markdown for each
3. `POST /v2/extract` with a company enrichment schema → structured JSON record

This produces a richer signal than any static database (Apollo, Clearbit, ZoomInfo) because it reads the live website, not a months-old snapshot.

**Example enrichment schema:**
```json
{
  "type": "object",
  "properties": {
    "company_name": { "type": "string" },
    "tagline": { "type": "string" },
    "industry": { "type": "string" },
    "products": { "type": "array", "items": { "type": "string" } },
    "tech_stack": { "type": "array", "items": { "type": "string" } },
    "open_roles": { "type": "array", "items": { "type": "string" } },
    "founding_year": { "type": "integer" },
    "employee_range": { "type": "string" },
    "headquarters": { "type": "string" },
    "investors": { "type": "array", "items": { "type": "string" } },
    "has_ai_features": { "type": "boolean" },
    "uses_ats": { "type": "string" },
    "contact_emails": { "type": "array", "items": { "type": "string" } }
  }
}
```

**Directory scraping for discovery:**
Map a directory (G2, Crunchbase, Angellist, industry-specific directories) to get company profile URLs, then batch-scrape them. Parallel Agents (v2.8.0) allow processing hundreds simultaneously from a CSV.

**ATS/job board detection:**
Scrape `careers.company.com` or `/jobs` pages with a schema looking for ATS indicators (Lever, Greenhouse, Ashby iframes/redirect patterns). This is exactly the use case your existing `boards:discover` script serves.

### 9.2 Specific Integration Points for This Platform

Given the lead-gen platform architecture in this repo:

| Your Pipeline Stage | Firecrawl Integration |
|---|---|
| **Discovery** | `/v2/map` on known directories; `/v2/agent` for prompt-driven discovery ("Find Series A AI companies in Europe") |
| **Enrichment** | `/v2/extract` with company schema on `company_domain/*` wildcard |
| **ATS Detection** | `/v2/scrape` on careers subdomain with JSON schema for ATS indicators |
| **Contact Discovery** | `/v2/scrape` on team/about pages with contact schema |
| **Tech Stack Detection** | Include `branding` + `json` formats; BuiltWith-style extraction from page source |
| **Job Signal Monitoring** | `/v2/crawl` on jobs pages with `changeTracking` enabled; webhook fires on updates |

Webhook integration with your existing Drizzle/Neon pipeline:
```typescript
// In your Next.js webhook handler
app.post('/api/webhooks/firecrawl', async (req) => {
  const sig = req.headers['x-firecrawl-signature'];
  // verify HMAC-SHA256
  const event = req.body;
  if (event.type === 'crawl.page') {
    await db.insert(companies).values(parseEnrichmentData(event.data)).onConflictDoUpdate(...);
  }
});
```

### 9.3 Self-Hosting vs. Managed API: Decision Framework

| Factor | Use Managed API | Self-Host |
|---|---|---|
| Volume | < 50k pages/month | > 100k pages/month |
| Anti-bot requirements | High (Cloudflare, DataDome) | Low (startup sites, open directories) |
| Latency tolerance | Any | Need predictable, low latency |
| Data privacy | Standard | Strict (ZDR costs extra on managed) |
| Engineering capacity | Low (focus on product) | High (infra maintenance acceptable) |
| Target sites | Modern, bot-protected | Open directories, career pages |

**Recommendation for this platform:** Start on managed API for enrichment of < 10k companies/month. The economics work: 10k companies × 5 pages × 5 credits = 250k credits = Standard plan ($83/month). Migrate to self-hosted (with a dedicated Playwright proxy pool replacing Fire-Engine) only if you're processing > 100k companies or hitting bot-protected enterprise sites.

### 9.4 Hybrid Architecture (Best of Both)

The optimal architecture for this platform at scale:

```
Company Domain Input
        │
        ├── Is domain Cloudflare/enterprise-protected?
        │     YES → Route to Firecrawl managed API (Fire-Engine)
        │     NO  → Route to self-hosted Firecrawl or custom Rust scraper
        │
        ▼
Extracted Markdown
        │
        ├── Send to your own LLM pipeline (cheaper than Firecrawl's +4 credits)
        │   using your existing DeepSeek/Anthropic keys
        │
        ▼
Structured Company Record → Neon PostgreSQL
```

This hybrid approach uses Firecrawl's managed service only for the hard cases (anti-bot, JS rendering), while running your own LLM extraction to avoid the 5x credit multiplier.

### 9.5 What to Build vs. What to Buy

| Capability | Build in Rust | Use Firecrawl |
|---|---|---|
| Static HTML scraping (startup sites) | Yes — `reqwest` + `scraper` crate | No |
| HTML → Markdown | Yes — `htmd` crate | No |
| Link extraction | Yes — already done in Rust | No |
| JS-rendered pages (normal) | Marginal — `chromiumoxide` | Depends |
| Cloudflare/DataDome bypass | No — too much maintenance | Yes (managed only) |
| LLM schema extraction | Yes — use your own API keys | No (5x credit overhead) |
| Sitemap crawling | Yes | Depends on volume |
| Multi-URL agent queries | Marginal | Yes (Spark 1 Mini at scale) |

**Bottom line:** Firecrawl's core value for this platform is specifically the **Fire-Engine stealth layer** (not available in OSS) and the **Spark agent models** for autonomous research queries. Everything else can be replicated with a Rust scraping service + your own LLM calls for significantly lower per-page cost.

---

## References

- [Firecrawl GitHub Repository](https://github.com/mendableai/firecrawl)
- [Firecrawl Documentation](https://docs.firecrawl.dev/introduction)
- [Firecrawl Scrape Docs](https://docs.firecrawl.dev/features/scrape)
- [Firecrawl Extract Docs](https://docs.firecrawl.dev/features/extract)
- [Firecrawl Crawl Docs](https://docs.firecrawl.dev/features/crawl)
- [Firecrawl Agent Docs](https://docs.firecrawl.dev/features/agent)
- [Firecrawl Map Docs](https://docs.firecrawl.dev/features/map)
- [CrawlBench Benchmark Post](https://www.firecrawl.dev/blog/crawlbench-llm-extraction)
- [Introducing Spark 1 Models](https://www.firecrawl.dev/blog/introducing-spark-1)
- [FIRE-1 Announcement](https://www.firecrawl.dev/blog/launch-week-iii-day-2-announcing-fire-1)
- [Extract v2 Launch](https://www.firecrawl.dev/blog/launch-week-iii-day-3-extract-v2)
- [Lead Enrichment Use Case](https://docs.firecrawl.dev/use-cases/lead-enrichment)
- [DeepWiki Architecture Reference](https://deepwiki.com/mendableai/firecrawl)
- [Firecrawl Pricing Analysis (ScrapeGraphAI)](https://scrapegraphai.com/blog/firecrawl-pricing)
- [Firecrawl Fast Scraping Docs](https://docs.firecrawl.dev/features/fast-scraping)
- [Firecrawl YC Company Profile](https://www.ycombinator.com/companies/firecrawl)

---

## 10. Deep ML Analysis

### 10.1 Spark Model Family — What Is Actually Known

Firecrawl's Spark 1 models (Fast / Mini / Pro) are described as "purpose-built reasoning models optimized for web research and extraction tasks." Mendable has not disclosed base model identity, parameter counts, attention architecture, training corpus, or fine-tuning methodology. From public announcements and the v2.8.0 release notes, the following can be inferred with reasonable confidence:

**Capability profile (from benchmarks and pricing structure):**

| Model | Latency class | Recall on CrawlBench-style tasks | Credit cost | Intended input |
|---|---|---|---|---|
| Spark 1 Fast | Sub-second ("instant") | ~30% | 10 credits/cell | Cached/indexed well-structured pages |
| Spark 1 Mini | Fast (seconds) | ~40% | ~60% less than Pro | Contact info, pricing, well-structured sites at volume |
| Spark 1 Pro | Slower (multi-step) | ~50% | Standard | Complex multi-domain, ambiguous data, competitor analysis |

The ~50% recall ceiling on complex tasks aligns with the general capability of 7–70B-parameter models fine-tuned on web extraction tasks relative to frontier API models (GPT-4o achieves similar ceilings without fine-tuning). The intelligent waterfall (Fast → Mini upgrade on failure) is a confidence-gated routing pattern — Fast attempts cache/index retrieval, and failure triggers a full agent call.

**Training inference:** The "purpose-built" framing and the stated 60% cost advantage over comparable alternatives (Manus, Exa) implies distillation or fine-tuning of a smaller base model on web extraction datasets, rather than inference-time prompting of a large frontier model. A plausible architecture is a ~7–13B model fine-tuned on a mixture of:
- Structured extraction pairs (URL + schema → JSON)
- Web navigation trajectories (click sequences, form fills)
- CrawlBench-style datasets as supervision signal

No arxiv paper, model card, or training config has been published.

### 10.2 CrawlBench — Exact Metric Definitions

CrawlBench is the primary public eval Firecrawl uses. It is not on arxiv but is open-sourced.

**CrawlBench-Easy:**
- Source: Y Combinator top-50 company database
- Size: 1,052 extraction data points
- Ground truth: deterministic scrapers (not LLM-generated)
- Metrics:
  - **Exact match**: string equality after normalization; Firecrawl score = 920/1052 = **87.5%**
  - **ROUGE-L**: longest common subsequence F1 against ground truth; Firecrawl = **93.7%**
- The ROUGE gap above exact match (93.7% vs 87.5%) indicates partial credit for partially correct extractions — common for descriptions and long-form text fields

**CrawlBench-Hard (MiniWoB-derived):**
- Source: OpenAI MiniWoB (Mini World of Bits) 2017 benchmark
- Two levels:
  - **Level 0**: Extract the list of available automation task categories (structured enumeration task) — Firecrawl: 532/532 = **100%**
  - **Level 1**: Extract specific task instructions (multi-step reasoning) — Firecrawl: 382/768 = **49.7%**
- Combined: 914/1300 = **70.3%**
- Scoring: binary field accuracy (correct vs. incorrect per extracted field)

**Key finding from CrawlBench research:** Prompt engineering accounts for ~41-point improvement on average, vs ~6-point improvement from model upgrade (GPT-4o-mini → GPT-4o). Claude 3.5 Haiku improved 13.8 points over Claude 3 Haiku. This finding — that prompts dominate model choice — has direct architectural implications: Firecrawl's Spark models likely encode optimized prompt strategies as fine-tuned behavior rather than relying on larger base models.

**Scrape-Evals (separate benchmark, 2025):**
- F1 score combining precision (no junk/noise in output) and recall (no missing content)
- ~100-word "core content" snippets vs. ~10-word "noise" snippets manually labeled per page
- Evaluates scraper quality on diverse domains, forcing coverage of different JS frameworks, rendering patterns, and anti-bot strategies
- Not an LLM extraction benchmark — evaluates the HTML→clean-text conversion quality before LLM step

### 10.3 Turndown GFM Markdown Pipeline — Structure Preservation Analysis

The conversion path is: **rendered HTML (Playwright) → Turndown JS → GFM plugin → markdown string**.

**What is preserved:**
- Headings (H1–H6 → `#` through `######`)
- Ordered and unordered lists (including nesting)
- Tables (`|` GFM format via `turndown-plugin-gfm` `tables` rule)
- Code blocks (` ``` ` fenced, preserving language hint from `<code class="language-X">`)
- Links (`[text](url)`) — relative URLs resolved to absolute by Firecrawl pre-processing
- Bold/italic (standard markdown `**` and `_`)
- Blockquotes (`>`)
- Images (`![alt](src)`)

**What is lost or degraded:**
- Inline CSS styles (all presentation lost)
- Complex `colspan`/`rowspan` table cells — Turndown's table rule collapses these to flat rows, dropping cell merges
- `<pre>` blocks with embedded newlines — known bug: Turndown strips newlines inside `<pre>` unless patched
- SVG/canvas elements — converted to `[image]` placeholder or dropped
- Multi-column layouts — flattened to linear text in DOM order, which may not match visual reading order
- Base64-encoded images — Firecrawl strips these in the HTML cleaning step (before Turndown) to save tokens
- ARIA-only text (visually hidden but screen-reader accessible) — sometimes included, sometimes not, depending on how the LLM rendered the page

**Token economy rationale:** HTML has 3–5× more tokens than equivalent markdown for the same semantic content. By converting before the LLM call, each context window holds proportionally more content, reducing API costs and enabling longer documents to fit in a single call.

### 10.4 Rust Components — Exact Crates and Performance

**`pdf-inspector` library (GitHub: `firecrawl/pdf-inspector`):**
- **Rust crate used:** `lopdf` (PDF parsing/manipulation) — only external dependency
- **Classification algorithm:** Scans content streams for PDF text operators (`Tj`, `TJ`) vs image operators (`Do`); no ML required — purely structural
- **Output classes:** `TextBased`, `Scanned`, `ImageBased`, `Mixed`
- **Scan strategies:** `EarlyExit` (default), `Full`, `Sample(n)`, `Pages(vec)`
- **Performance:** ~10–50ms classification for 300-page PDFs by sampling content streams; full pipeline (detection + text extraction) under 200ms for text-based PDFs
- **Heading detection:** Font-size ratio heuristics for H1–H4 (not ML); bold/italic via font flags
- **Table detection:** Rectangle-based and heuristic; financial tables get token splitting
- **Markdown output:** `to_markdown_from_items_with_rects()` — positional text items with bounding rects drive layout reconstruction

**Link extraction (embedded Rust FFI in Node.js pipeline):**
- Native Rust called via Node.js FFI (not a separate crate published to crates.io)
- Replaces regex-based JS link extraction; handles malformed URLs, relative resolution, deduplication at native speed
- Benchmarked internally at significantly faster than the JS equivalent (exact numbers not published)

**PDF Parser v2 (public API):**
- Three modes: `fast` (Rust text-only, <200ms), `auto` (fast first, OCR fallback), `ocr` (forced OCR for scanned docs)
- Auto mode routes ~54% of PDFs through the fast path, avoiding OCR cost entirely
- OCR fallback: external service (RunPod or similar), not Rust-native
- Claimed throughput: 3× faster than previous JS-based parser (hardware and dataset not disclosed)

### 10.5 The 8-Engine Waterfall — Selection Scoring Logic

The scraping pipeline in `apps/api/src/scraper/scrapeURL/engines/index.ts` implements a scored fallback chain. Based on deep wiki analysis and public disclosures:

**Engine ordering with quality scores:**

| Rank | Engine | Base Quality Score | Conditions |
|---|---|---|---|
| 1 | Index / cache | 100 | Cache hit for this URL |
| 2 | Fire-Engine Chrome CDP | 50 | Default, JS rendering needed |
| 3 | Fire-Engine TLS Client (stealth) | 10 base → **60 with `TlsClientOk` verdict** | Domain history shows TLS client works; `__experimental_engpicker` feature flag enabled |
| 4 | Fire-Engine Playwright | 50 | Playwright mode explicitly requested |
| 5 | Local Playwright | 40 | Self-hosted fallback |
| 6 | Fetch (plain HTTP) | 20 | Static pages, no JS |
| 7 | PDF Engine | Conditional | URL ends in `.pdf` or content-type is PDF |
| 8 | Document Engine | Conditional | DOCX/ODT/RTF content-type |

**Domain verdict system:** Firecrawl caches per-domain scraping success/failure signals. When the TLS client engine (`fire-engine` with stealth HTTP2 fingerprint) previously succeeded on a domain (verdict = `TlsClientOk`), its score is boosted by 50 points (10 → 60), making it preferred over Chrome CDP (score 50). This is effectively a bandit-style routing policy based on domain-level empirical success rates rather than a trained ML model.

**Fallback logic:** Engines are tried in descending score order. On failure (timeout, empty response, HTTP error), the next engine is attempted. The pipeline is sequential for a single request — parallelism happens at the job queue level (many requests, each going through its own waterfall).

**Feature flag `__experimental_engpicker`:** Required to enable the domain-verdict-based score boosting. Without it, the TLS engine stays at base score 10.

### 10.6 Anti-Bot Evasion — ML Component Assessment

Firecrawl's stealth layer is proprietary (Fire-Engine). Based on public disclosures and the scraping/bot-detection literature:

**What Fire-Engine almost certainly does (industry standard for stealth scrapers):**
- TLS fingerprint rotation (JA3/JA4 profile switching) to avoid bot-detection based on TLS handshake signature
- Browser fingerprint randomization: canvas, WebGL, font enumeration, navigator properties
- Residential/datacenter proxy rotation (third-party network)
- Human-like timing jitter on keystrokes, mouse movements, scroll events

**What has no confirmed ML component:**
- The domain verdict routing — this is rule-based (success/failure cache), not a trained model
- Engine selection — score-based heuristics, not neural
- Bot detection evasion — deterministic fingerprint spoofing, not adaptive ML

**What could theoretically use ML but doesn't (publicly):**
- Adaptive CAPTCHA solving: the industry uses external human-solving services (2Captcha, CapMonster) or classical image classifiers, not in-house deep learning
- Bot challenge prediction: predicting which anti-bot service a site uses and selecting the best bypass strategy could be done with a small classifier trained on domain characteristics — this would be the natural ML addition, but Firecrawl has not disclosed it

**Research context:** arXiv 2406.07647 ("FP-Inconsistent: Measurement and Analysis of Fingerprint Inconsistencies in Evasive Bot Traffic") shows that ML-based bot detection systems can identify TLS profiles that are "too random" or inconsistent with other signals, achieving 52.93% average evasion rate against DataDome and 44.56% against BotD across 20 bot services. Firecrawl's proprietary Fire-Engine is presumably engineered to fall in the successful-evasion tail of that distribution.

### 10.7 Structured Extraction as an ML Problem

Firecrawl's `/extract` and `/agent` endpoints are instances of **constrained structured generation**: given a markdown document and a JSON Schema, produce a JSON object that satisfies the schema and faithfully represents values from the document.

The ML framing:
- **Input space:** (markdown text, JSON Schema, optional natural language prompt)
- **Output space:** JSON object satisfying the schema
- **Supervision signal:** field-level exact match or ROUGE against ground truth (CrawlBench)
- **Constraint enforcement:** OpenAI function calling / tool use forces schema-compliant output at generation time (grammar-constrained decoding)

The Spark models operationalize this as a single forward pass (no search/retrieval at inference), which is why the Fast model can return in sub-second: it is a fine-tuned seq2seq call, not an agentic loop. The Mini and Pro models add iterative web navigation steps before the final extraction pass.

**Token efficiency optimization:** Converting HTML to markdown before the extraction call reduces token count by 3–5×, which is functionally equivalent to extending the model's effective context window without changing model architecture.

---

## 11. Research Papers & Prior Art

| Paper | Authors | Year | Venue | Relevance | Key Finding |
|---|---|---|---|---|---|
| [AXE: Low-Cost Cross-Domain Web Structured Information Extraction](https://arxiv.org/abs/2602.01838) | Anonymous | 2026 | arXiv | Direct prior art: DOM-tree pruning + small LLM for structured extraction — same problem as Firecrawl's `/extract` | 0.6B model with DOM pruning reaches 88.1% F1 on SWDE, beating much larger non-pruned alternatives; confirms Firecrawl's markdown-first approach is grounded in sound ML engineering |
| [PARSE: LLM Driven Schema Optimization for Reliable Entity Extraction](https://arxiv.org/abs/2510.08623) | Amazon | 2025 | EMNLP Industry | Schema optimization for LLM extraction (ARCHITECT component) — directly relevant to Firecrawl's schema-as-tool-definition pattern | Up to 64.7% accuracy improvement on SWDE via schema optimization alone; SCOPE adds reflection-based guardrails; combined: ~10% improvement across SGD, SWDE, retail data |
| [WebLists: Extracting Structured Information From Complex Interactive Websites](https://arxiv.org/abs/2504.12682) | Bardeen AI | 2025 | arXiv | Benchmark for structured extraction from interactive sites — comparable to Firecrawl's multi-URL `/extract` | BardeenAgent at 66% recall vs. 31% for SOTA web agents (3× improvement); CSS-selector programs reusable across structurally similar pages |
| [ScrapeGraphAI-100k: A Large-Scale Dataset for LLM-Based Web Information Extraction](https://arxiv.org/abs/2602.15189) | ScrapeGraphAI | 2026 | arXiv | 93,695 real-world extraction events (URL→markdown→schema→JSON); fine-tuning 1.7B model narrows gap to 30B | Fine-tuned 1.7B closes gap to 30B baseline on extraction tasks; validates small-model fine-tuning as viable alternative to large API models for Firecrawl-style workloads |
| [Evaluating Web Data Extraction with CrawlBench](https://www.firecrawl.dev/blog/crawlbench-llm-extraction) | Mendable/Firecrawl | 2024 | Blog (open benchmark) | Firecrawl's own benchmark — primary eval for Spark models | Prompt engineering is 7× more impactful than model selection; Claude 3.5 Haiku +13.8pts vs Claude 3 Haiku; custom prompt +41pts on average |
| [An Illusion of Progress? Assessing the Current State of Web Agents](https://arxiv.org/abs/2504.01382) | Multiple | 2025 | arXiv | Critiques benchmark inflation in web agent research — directly relevant to interpreting Firecrawl's "98% accuracy" marketing claims | Most agents don't outperform SeeAct (2024); benchmark gaming common; live-website evals significantly harder than static benchmarks |
| [FP-Inconsistent: Measurement and Analysis of Fingerprint Inconsistencies in Evasive Bot Traffic](https://arxiv.org/abs/2406.07647) | Multiple | 2024 | arXiv | ML-based bot detection; characterizes what stealth scrapers must defeat | 52.93% average evasion rate against DataDome; ML models detect "too-random" TLS profiles; behavioral analysis hardest layer to defeat |

**Additional context on the MiniWoB dataset (source of CrawlBench-Hard):**

MiniWoB (2017, OpenAI) is a suite of web interaction tasks ranging from clicking specific shapes to ordering food from menus. Using it as a hard extraction benchmark (rather than an interaction benchmark) is methodologically interesting: it tests whether an LLM can infer structured data about tasks it was never asked to execute — a proxy for understanding task semantics from documentation.

**On the lack of a Firecrawl arxiv paper:**

Firecrawl has published no peer-reviewed paper describing its architecture, training methodology, or systematic evaluation. All quantitative claims come from blog posts with undisclosed methodology. This is common for commercial API products but limits rigorous comparison with academic systems like AXE (88.1% F1 on SWDE with a 0.6B model) or BardeenAgent (66% recall on WebLists). An ML engineer should treat Firecrawl's stated "98% extraction accuracy" as a marketing claim until a reproducible eval methodology is published.

---

## 12. Recency & Changelog

> Researched: March 28, 2026. Source: GitHub API (`mendableai/firecrawl`), release notes, and firecrawl.dev/blog.

### Latest Release

**v2.8.0 — February 3, 2026**

Key AI/agent changes in this release:

- **Parallel Agents**: Execute thousands of `/agent` queries simultaneously with automatic failure handling and intelligent waterfall execution (Fast → Mini escalation on failure).
- **Spark Model Family expanded to three tiers**: Spark 1 Fast (sub-second, instant retrieval, Playground-only at release), Spark 1 Mini (default, 60% cheaper than Pro, ~40% recall), Spark 1 Pro (multi-step, ~50% recall, highest accuracy).
- **Agent model selection**: `/agent` endpoint now accepts a `model` parameter (`spark-1-mini` | `spark-1-pro`); status responses include model info.
- **Agent webhooks**: Real-time callbacks on job completion and progress.
- **MCP Server agent tools**: New `firecrawl_agent` and `firecrawl_agent_status` MCP tools for autonomous gathering from any MCP-enabled agent.
- **Firecrawl Skill**: `npx skills add firecrawl/cli` — enables Claude Code, Codex, and OpenCode to invoke Firecrawl autonomously in agentic loops.
- **Firecrawl CLI**: `npm install -g firecrawl-cli` — full scrape, crawl, search, map from terminal; `--api-url` flag supports self-hosted instances.
- **Zod v4 compatibility** in the JS SDK (schema conversion rewritten).
- **ARM64 Docker images**: Self-hosted now supports Apple Silicon and ARM servers via multi-arch images.
- Security: CVE-2025-59466 fixed; lodash prototype pollution patched.

**v2.7.0 — December 5, 2025**

- ZDR (Zero Data Retention) Search for enterprise.
- Improved Branding Format (better logo/color detection).
- `minAge` scrape parameter — require minimum cached age before re-scraping.
- Extract billing credits unified (15 tokens = 1 credit).
- NOQ Scrape System (experimental) — new pipeline with integrated concurrency checks.
- Self-hosted: configurable crawl concurrency limits.
- UUIDv7 IDs on all new resources.

**v2.6.0 — November 14, 2025**

- **Unified Billing Model**: credits and tokens merged into a single system; Extract now uses credits.
- **Change Tracking**: faster detection of web page content updates.
- Full release of Branding Format across Playground, MCP, JS/Python SDKs.

**v2.5.0 — October 30, 2025**

- **Semantic Index**: proprietary indexed content store for sub-second retrieval on well-crawled domains.
- New crawl architecture with NUQ (Non-Uniform Queue) concurrency tracking.
- Excel (`.xlsx`) scraping support.
- CrawlBench v2 benchmarks published alongside this release.

### Spark Model Updates

The Spark family shipped in three distinct waves:

| Milestone | Date | Details |
|---|---|---|
| Spark 1 (initial, single model) | ~Dec 2025 | Introduced with `/agent` endpoint, single "Spark 1" model |
| Spark 1 Pro + Spark 1 Mini | January 14, 2026 | Split into two tiers; Mini is 60% cheaper; Pro targets complex multi-domain extraction |
| Spark 1 Fast | February 3, 2026 (v2.8.0) | Sub-second retrieval model; powers Parallel Agents waterfall; initially Playground-only |

**Benchmark status (as of v2.8.0, all Firecrawl-reported):**

- Spark 1 Pro: ~50% recall on CrawlBench-Hard Level 1 (complex instruction-following tasks).
- Spark 1 Mini: ~40% recall on same benchmark, at 60% lower credit cost.
- Spark 1 Fast: No published recall figure; positioned as a "best-effort cache hit" tier that upgrades to Mini on failure.
- Both Pro and Mini "significantly outperform tools costing 4-7× more per task" (vendor claim, methodology undisclosed).
- No new arxiv paper or independent benchmark update published since the original CrawlBench blog post (2024).

No architecture disclosures (base model, parameter count, training data) have been made for any Spark tier.

### Recent Commits (last 90 days — January–March 2026)

Selected significant commits by topic:

**New `/interact` endpoint (March 2026):**
- `feat(api): add scrape-to-browser api flow` — March 23, 2026 (ENG-4603, #3184): Core `scrape-to-browser` API that underlies `/interact`.
- `(feat/interact) Interact Billing` — March 24, 2026 (#3222): Credit metering for browser interaction sessions.
- `(feat/interact) Share the same number of concurrent browser` — March 24, 2026 (#3223): Browser pool limits applied to Interact.
- `docs(readme): replace Browse with Interact section` — March 26, 2026: Renamed endpoint from `/browse` → `/interact` in public docs.

**Agent improvements:**
- `fix(agent): stop defaulting to spark-1-pro when model is unknown in status API` — March 25, 2026 (#3227): Bug fix — status endpoint was returning wrong model name.
- `feat(agent): make maxCredits > 2500 a paid request` — January 2026: Agents with `maxCredits` above 2,500 are now gated to paid plans only.

**Audio format (March 25, 2026):**
- `feat: audio format (ENG-4708)` — March 25, 2026 (#3226): New `audio` output format for the scrape endpoint — details not yet in public docs.

**PDF improvements:**
- `feat(pdf): Add ocrPageCount and ocrPageRatio to Logs` — March 24, 2026 (#3218): PDF processing now reports OCR coverage metrics.
- `chore: update pdf-inspector` — March 26, 2026: OCR detection + XObject text extraction + grid detection fixes.

**Security:**
- `fix(deps): override vulnerable transitive dependencies` — March 26, 2026 (#3233).
- `fix(auth): clear ACUC Redis cache when API keys are deleted` — March 25, 2026 (#3228): Auth cache now invalidated correctly on key deletion.

**SDK expansion:**
- `feat(elixir-sdk): add Elixir SDK with daily auto-publish workflow` — March 27, 2026 (#3239): Official Elixir SDK added.
- `feat(java-sdk): support user-provided OkHttpClient instance` — March 23, 2026.

**Scrape eval infrastructure:**
- `Scrape-evals dispatch workflow` — March 23, 2026 (#3217): Automated scrape quality evaluation CI pipeline added.

**LLM/extraction fixes:**
- `fix(api): strip NUL bytes from LLM output fields before API response` — March 24, 2026 (#3221): NUL bytes in LLM output were reaching API consumers as malformed JSON.
- `fix(scraper): skip onlyCleanContent for documents exceeding model output limit` — March 28, 2026 (#3240): Large documents no longer silently truncated by the clean-content heuristic.

### Open Issues (AI/ML Relevant)

Issues open as of March 28, 2026 with direct AI/extraction impact:

| Issue | Title | Opened |
|---|---|---|
| #3169 | LLM extract/AI features fail with OpenAI-compatible proxies: `USE_RESPONSES_ENDPOINT` env var is not wired up | Mar 17, 2026 |
| #3153 | [Self-Host] Cannot set `enableWebSearch: false` on `/extract` | Mar 16, 2026 |
| #3150 | Feature: agent-friendly rate limit headers for autonomous scraping workflows | Mar 15, 2026 |
| #3117 | Email inbox leasing demo for agents | Mar 11, 2026 |
| #3114 | Concurrent scraping rate limit not properly handled causing 429 errors | Mar 11, 2026 |

**Most operationally impactful for self-hosters:** Issue #3169 — `USE_RESPONSES_ENDPOINT` is not properly propagated to the generic AI provider, meaning self-hosters using OpenAI-compatible proxy endpoints (local Ollama, vLLM, LM Studio, etc.) cannot get LLM extraction to work. A fix PR (#3198) exists but was open as of research date.

**Most impactful for agent pipelines:** Issue #3150 — agents cannot read remaining rate-limit budget from response headers, making autonomous retry logic unreliable. No fix merged as of research date.

### Breaking Changes

Changes since v2.7.0 that affect existing integrations:

1. **`/extract` v1 endpoint fully deprecated** (February 2026): The original single-call `/extract` is replaced by the `/agent` endpoint for multi-URL agentic extraction. Existing integrations using `/v2/extract` for automated schema extraction should migrate to `/v2/agent` with `schema` + `urls` parameters.

2. **`maxCredits` > 2,500 gated to paid plans**: Agent requests with `maxCredits` above 2,500 now require a paid subscription. Free-tier users who relied on large unbounded agent queries will hit a billing gate.

3. **Billing unification in v2.6.0**: Tokens and credits were merged into a single credit unit (15 tokens = 1 credit). Integrations that computed cost estimates using the old token-based pricing need recalculation.

4. **Node.js version bump to 22**: Self-hosted Docker images now require Node.js 22 (was pinned to a Node 18 minor). Self-hosters with custom Dockerfiles or node version managers need to update.

5. **Zod v4 compatibility**: The JS SDK now requires Zod v4. If your schema definitions use Zod v3 APIs (e.g., `.optional()` chaining patterns that changed), they need updating. The SDK includes improved error detection to surface schema conversion failures explicitly.

6. **`/browse` endpoint renamed to `/interact`**: The browser interaction endpoint was renamed. Any code or documentation referencing `/browse` needs to be updated to `/interact`.

### Roadmap / Announced Features

Based on blog posts, open PRs, and commit messages as of March 2026:

- **`/interact` endpoint GA**: Currently in active billing rollout (billing and concurrency limits landed March 24–26, 2026). Likely reaching stable GA within weeks of research date. Enables click, form-fill, and page interaction via plain English prompts or code — a direct replacement for complex `actions` arrays in `/scrape`.
- **Audio format**: `feat: audio format (ENG-4708)` landed March 25, 2026 — not yet in public docs. Appears to add audio transcription/extraction as a scrape output format.
- **`extract` option on `/search` endpoint** (PR #3208, open March 21, 2026): Adds consolidated extraction directly in search responses, reducing the Map → Batch Scrape → Extract roundtrip to a single call.
- **Spark 1 Fast general availability**: Currently Playground-only at v2.8.0 release. General API availability is implied by the Parallel Agents waterfall architecture but not yet announced.
- **Partner Integrations API**: Entered closed beta in v2.7.0 (December 2025). No public launch date announced.
- **n8n native integration**: Announced March 26, 2026 blog post — Firecrawl as a native n8n node for no-code workflows.
- **Elixir SDK**: Added March 27, 2026 — daily auto-publish via GitHub Actions. Now joins Python, JS/TS, Java, Go, Rust, PHP as official SDK languages.

### Staleness Assessment

**Release velocity:** 4 minor releases in ~5 months (v2.5.0 October 2025 → v2.8.0 February 2026), averaging one release every 5–6 weeks. Commit frequency is very high: 20–30 commits/week in the main branch throughout Q1 2026.

**AI feature velocity specifically:** The Spark model family went from 1 model to 3 tiers in under 3 months. The `/agent` endpoint received webhooks, model selection, and parallel execution within a single release cycle. The `/interact` endpoint went from concept to production billing in under 2 weeks (commit history shows rapid iteration March 23–26).

**Production stability signals:**
- The NUL-byte LLM output bug (#3221) and the `spark-1-pro` status API mislabeling bug (#3227) both shipped in main and required hotfixes, indicating a fast-merge culture with acceptable tolerance for small production defects.
- The `USE_RESPONSES_ENDPOINT` wiring bug (#3169) has been open for 11+ days with a fix PR open but unmerged — self-hosters using non-OpenAI LLM backends should treat LLM extraction as unreliable until this merges.
- ARM64 Docker support and multi-arch images landed in v2.8.0 — self-hosting on Apple Silicon M-series machines is now officially supported.

**Conclusion:** Firecrawl is in active, high-velocity development with no signs of maintenance mode or slowdown. The codebase shows a fast-ship culture, so self-hosters should pin to a release tag rather than tracking `main`. For the managed SaaS API, the Spark model tier expansion and Parallel Agents are production-hardened (billing is live). The `/interact` endpoint is the most significant upcoming capability for agentic lead-gen workflows (replacing multi-step `actions` arrays with natural language browser control).

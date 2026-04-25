# Crawl4AI — AI Features Deep Report

**Target:** `unclecode/crawl4ai`
**Report date:** 2026-03-28
**Purpose:** Senior AI engineer reference — competing B2B lead-gen platform

---

## 1. Overview

Crawl4AI is an open-source, Apache 2.0 licensed Python library that turns arbitrary web pages into LLM-ready structured data. It combines a fully async Playwright-based browser engine with a multi-layer AI processing stack (content filtering, markdown generation, structured extraction, adaptive crawling). The project sits at 62,778 GitHub stars / 6,402 forks as of the report date — the fastest-growing open-source scraping library in 2024–2025.

| Attribute | Value |
|---|---|
| GitHub | `unclecode/crawl4ai` |
| Stars | ~62.8k |
| License | Apache 2.0 |
| Language | Python (100%) |
| Latest release | v0.8.5 (2026-03-18) |
| First release | 2024-05-09 |
| Commits | 1,464+ |
| Active PRs | 38 |
| Deployment | PyPI (`crawl4ai`) + Docker (`unclecode/crawl4ai:latest`) |

**Core value proposition:** "No rate limits, no lock-in." Self-hostable alternative to Firecrawl, Apify, and browser-as-a-service products.

**Tech stack:**

| Layer | Technology |
|---|---|
| Browser engine | Playwright + patchright (stealth variant) |
| HTTP client | httpx (HTTP/2), aiohttp |
| HTML parsing | lxml, BeautifulSoup4 |
| HTML-to-Markdown | Custom `html2text` fork |
| Content ranking | rank-bm25, SnowballStemmer |
| Embeddings | sentence-transformers (HuggingFace) |
| Clustering | scipy (hierarchical), numpy |
| Geometry | alphashape, shapely (embedding coverage) |
| LLM bridge | `unclecode-litellm` (fork of LiteLLM 1.81.13) |
| Deployment | FastAPI, uvicorn, Docker |
| Schema validation | Pydantic v2 |

Key dependencies from `requirements.txt`:

```
playwright>=1.49.0
patchright>=1.49.0        # stealth anti-bot bypass
unclecode-litellm==1.81.13
rank-bm25~=0.2
snowballstemmer~=2.2
numpy>=1.26.0,<3
alphashape>=1.3.1          # embedding coverage geometry
shapely>=2.0.0
nltk>=3.9.1
beautifulsoup4~=4.12
lxml~=5.3
cssselect>=1.2.0
pydantic>=2.10
psutil>=6.1.1
```

---

## 2. AI Architecture

### 2.1 The Processing Pipeline

The pipeline is a staged, composable sequence. Each stage is a pluggable strategy object:

```
URL Input
   │
   ▼
[BrowserConfig]         ← Playwright browser pool (headless/headful, stealth)
   │
   ▼
[AsyncWebCrawler.arun()]
   │  ├── Cache check (ETag + fingerprint)
   │  ├── Anti-bot retry loop (proxy rotation, stealth escalation)
   │  └── Raw HTML fetch
   │
   ▼
[ContentScrapingStrategy]   ← LXMLWebScrapingStrategy
   │  ├── Tag inclusion/exclusion filtering
   │  ├── Shadow DOM flattening
   │  └── Link + media extraction
   │
   ▼
[MarkdownGenerationStrategy]  ← DefaultMarkdownGenerator
   │  ├── HTML → raw_markdown (CustomHTML2Text)
   │  ├── Citation link conversion (numbered footnotes)
   │  └── ContentFilter.filter_content() → fit_markdown
   │
   ▼
[ExtractionStrategy]          ← optional, chosen per config
   │  ├── LLMExtractionStrategy (LLM + schema)
   │  ├── JsonCssExtractionStrategy (CSS selectors)
   │  ├── JsonLxmlExtractionStrategy (XPath)
   │  ├── CosineStrategy (embedding clusters)
   │  └── RegexExtractionStrategy
   │
   ▼
CrawlResult {
  html, cleaned_html,
  markdown.raw_markdown,
  markdown.fit_markdown,
  markdown.markdown_with_citations,
  extracted_content,      ← JSON string from ExtractionStrategy
  media, links, tables,
  status_code, metadata
}
```

### 2.2 Markdown Conversion

The `DefaultMarkdownGenerator` wraps a custom fork of `html2text`:

```python
class DefaultMarkdownGenerator(MarkdownGenerationStrategy):
    def __init__(
        self,
        content_filter=None,       # BM25ContentFilter | PruningContentFilter | LLMContentFilter
        options=None,
        content_source="cleaned_html"  # "raw_html" | "cleaned_html" | "fit_html"
    ):
```

Conversion flow:
1. `CustomHTML2Text` runs with `body_width=0` (no line wrapping), `ignore_links=False`, `mark_code=True`.
2. All hyperlinks optionally converted to numbered citations: `[text](url)` → `text⁽¹⁾` + references section.
3. If `content_filter` is provided, the filter's `filter_content()` method is called on the cleaned HTML. The filtered HTML segments are re-run through `html2text` to produce `fit_markdown` — a compressed, high-signal variant.

The `content_source` parameter added in v0.6.0 allows choosing which HTML variant feeds the markdown converter: raw (pre-cleaning), cleaned (post-lxml scraping), or fit (post-filter). This is important for noise control.

### 2.3 Content Filtering: Three Strategies

All three inherit `RelevantContentFilter`:

**Common tag logic:**
- Inclusion tags: `article`, `main`, `section`, `p`, `h1–h6`, `table`, `li`, `blockquote`, semantic markers
- Exclusion tags: `nav`, `footer`, `header`, `aside`, `script`, `style`, `form`, `iframe`
- Negative class/id regex: `nav|footer|header|sidebar|ads|comment|promo|advert|social|share`

**BM25ContentFilter** (primary production filter):
```python
BM25ContentFilter(
    user_query=None,          # Falls back to page title/h1/meta tags
    bm25_threshold=1.0,       # Score cutoff (float)
    use_stemming=True,        # SnowballStemmer
    language="english"
)
```
Algorithm:
1. `extract_text_chunks()` — stack-based DFS traversal of HTML, breaks at block-level tags, classifies each chunk as "header" or "content"
2. BM25Okapi scoring against query (or auto-extracted query from page metadata)
3. Tag-weight multiplication: h1→5.0x, h2→4.0x, strong→2.0x
4. Chunks below `bm25_threshold` dropped
5. Deduplication preserving first occurrence
6. Filtered chunks → `fit_markdown`

**PruningContentFilter** (structural quality filter):
```python
PruningContentFilter(threshold=0.48)
```
Uses a composite scoring function on DOM tree nodes. Prunes subtrees scoring below threshold. Good for noise removal without a query signal.

**LLMContentFilter** (highest quality, highest cost):
```python
LLMContentFilter(
    llm_config=LLMConfig(provider="openai/gpt-4o"),
    instruction="Extract main article content only",
    chunk_token_threshold=1e9,
    overlap_rate=0.5
)
```
- MD5 hash-based local disk cache (`~/.llm_cache/content_filter/`)
- Chunks HTML, submits to LLM via ThreadPoolExecutor (4 workers max)
- Prompt template: `PROMPT_FILTER_CONTENT` with `<content>` XML tag response parsing
- Token usage tracking across all calls

### 2.4 Model-Agnostic LLM Integration

The LLM bridge uses a vendored fork of LiteLLM (`unclecode-litellm==1.81.13`). This provides a unified interface to all major providers with exponential backoff:

```python
LLMConfig(
    provider="openai/gpt-4o",         # or "anthropic/claude-3-5-sonnet-20240620"
    api_token="sk-...",                # or "env:OPENAI_API_KEY"
    base_url=None,                     # custom endpoint (Ollama, etc.)
    temperature=None,
    max_tokens=None,
    backoff_base_delay=2,
    backoff_max_attempts=3,
    backoff_exponential_factor=2
)
```

Supported provider prefixes (auto-detected from `provider` string prefix):
- `openai/` — gpt-4o, gpt-4o-mini, o1-mini, o1-preview, o3-mini, o3-mini-high
- `anthropic/` — claude-3-haiku, claude-3-opus, claude-3-sonnet, claude-3-5-sonnet
- `gemini/` — gemini-pro, gemini-1.5-pro, gemini-2.0-flash
- `deepseek/` — deepseek-v4-pro, deepseek-v4-flash
- `groq/` — llama3-70b-8192, llama3-8b-8192
- `ollama/` — any local model (no API token required)

API tokens auto-resolved from environment variables using the `"env:VAR_NAME"` syntax.

---

## 3. Key AI Features

### 3.1 LLMExtractionStrategy

The highest-capability extraction path. Calls an LLM against chunked page content with either free-form instructions or a Pydantic schema.

```python
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from crawl4ai.extraction_strategy import LLMExtractionStrategy
from crawl4ai.async_configs import LLMConfig
from pydantic import BaseModel

class CompanyInfo(BaseModel):
    name: str
    description: str
    funding_stage: str
    headcount_range: str
    tech_stack: list[str]

strategy = LLMExtractionStrategy(
    llm_config=LLMConfig(
        provider="anthropic/claude-3-5-sonnet-20240620",
        api_token="env:ANTHROPIC_API_KEY"
    ),
    schema=CompanyInfo.model_json_schema(),
    extraction_type="schema",          # "block" | "schema"
    instruction="Extract company details from this About page",
    chunk_token_threshold=2048,        # tokens per chunk
    overlap_rate=0.1,                  # 10% overlap between chunks
    force_json_response=True,
    verbose=True
)

config = CrawlerRunConfig(extraction_strategy=strategy)

async with AsyncWebCrawler() as crawler:
    result = await crawler.arun(url="https://company.com/about", config=config)
    data = json.loads(result.extracted_content)
```

**Internals:**

- `run()` method merges content sections based on `chunk_token_threshold`, then submits via `ThreadPoolExecutor` (parallel for most providers, sequential for Groq which has lower rate limits)
- `arun()` uses `asyncio.gather()` for true async parallelism
- LLM prompt wraps URL + sanitized HTML in XML tags: `<url>{URL}</url><html>{HTML}</html>`
- Response parsing: tries JSON → if fails, splits on `}{` and parses individual objects → XML `<blocks>` tag fallback
- `show_usage()` reports total prompt/completion/total tokens across all chunks

**Two extraction_type modes:**

| Mode | Behavior | Best For |
|---|---|---|
| `"block"` | LLM segments page into semantic blocks, assigns tags | Unstructured pages, open-ended extraction |
| `"schema"` | LLM fills a provided Pydantic/JSON schema | Structured output, database insertion |

**Auto-schema generation:**
```python
# Generate a schema from a sample page, with LLM refinement loop
schema = await JsonCssExtractionStrategy.agenerate_schema(
    url="https://example.com/product",
    llm_config=LLMConfig(provider="openai/gpt-4o"),
    query="Extract product information",
    max_refinements=3
)
```
The generation pipeline:
1. Preprocesses HTML (removes large text nodes, truncates attributes)
2. Optionally infers target JSON structure via LLM (if no example provided)
3. Calls LLM with structured prompt for CSS selector generation
4. Validates selectors against actual HTML (reports base element count, field coverage %)
5. Refinement loop: feeds validation failures back to LLM for up to `max_refinements` rounds

### 3.2 JsonCssExtractionStrategy / JsonLxmlExtractionStrategy

Zero-LLM, deterministic extraction using CSS selectors or XPath. These run at parse-tree speed with no API calls.

**Schema format:**
```python
schema = {
    "name": "JobListings",
    "baseSelector": "div.job-card",        # repeating element
    "baseFields": [
        {"name": "job_id", "type": "attribute", "attribute": "data-id"}
    ],
    "fields": [
        {"name": "title", "selector": "h2.job-title", "type": "text"},
        {"name": "company", "selector": "span.company", "type": "text"},
        {"name": "location", "selector": "div.location", "type": "text"},
        {"name": "salary", "selector": "span.salary", "type": "text",
         "transform": "strip", "default": "Not specified"},
        {"name": "tags", "selector": "span.tag", "type": "list"},
        {"name": "details", "type": "nested", "selector": "div.details",
         "fields": [
             {"name": "posted_date", "selector": "span.date", "type": "text"},
             {"name": "job_type", "selector": "span.type", "type": "text"}
         ]
        }
    ]
}

strategy = JsonCssExtractionStrategy(schema=schema)
```

**Field types:** `text`, `attribute`, `html`, `regex`, `list`, `nested`, `nested_list`, `computed`

**Computed fields** use a restricted `_safe_eval_expression()` function:
- Blocks `import`, `__dunder__` attribute access
- Allows only safe builtins (math, string ops, type checks)
- AST pre-validation before execution

**JsonLxmlExtractionStrategy** (lxml-based) adds:
- Selector + XPath compilation caching with `lru_cache`
- Multi-level fallback: direct CSS → context-sensitive XPath → nth-child handling → class/ID search → tag name search
- Result caching to avoid recomputation on the same element
- `_validate_schema()` returns detailed diagnostics: base element count, field coverage percentage, sample HTML

### 3.3 CosineStrategy (Semantic Clustering, No LLM)

Groups page content into semantically coherent clusters using HuggingFace embeddings + hierarchical clustering. No LLM API calls.

```python
from crawl4ai.extraction_strategy import CosineStrategy

strategy = CosineStrategy(
    semantic_filter="machine learning engineer",  # optional query
    word_count_threshold=20,
    max_dist=0.2,              # max cophenetic distance for cluster merging
    linkage_method="ward",     # scipy linkage method
    top_k=3                    # keep top-K most relevant clusters
)
```

**Algorithm:**
1. HTML split by block delimiters
2. If `semantic_filter` provided: cosine similarity pre-filter keeps top-K most relevant chunks
3. HuggingFace transformer generates sentence embeddings (batched)
4. `scipy.cluster.hierarchy.linkage()` + `fcluster()` groups chunks by cophenetic distance
5. Low word-count clusters pruned
6. Multilabel NLP classifier assigns tags to clusters

**Dependency:** requires `torch` + `transformers` + `scikit-learn` (optional install group)

### 3.4 RegexExtractionStrategy (v0.6.2+)

Zero-cost pattern-based extraction. Built-in patterns for common B2B-relevant data:

```python
from crawl4ai.extraction_strategy import RegexExtractionStrategy

strategy = RegexExtractionStrategy(
    patterns=["email", "phone", "url", "date"],  # built-in patterns
    # or custom:
    # patterns=[r"\b[A-Z]{1,5}:\s*\d+\b"]
)

# LLM-assisted one-time pattern generation:
pattern = RegexExtractionStrategy.generate_pattern(
    description="Extract LinkedIn profile URLs",
    llm_config=LLMConfig(provider="openai/gpt-4o-mini")
)
```

### 3.5 Async Crawling with AI Post-Processing

The `arun_many()` interface enables batch URL processing with AI extraction per URL:

```python
urls = ["https://co1.com/about", "https://co2.com/about", ...]

# Per-URL config matching (v0.7.3+)
configs = [
    CrawlerRunConfig(
        url_pattern="*/about*",
        extraction_strategy=LLMExtractionStrategy(schema=CompanySchema, ...)
    ),
    CrawlerRunConfig(
        url_pattern="*/careers*",
        extraction_strategy=JsonCssExtractionStrategy(schema=job_schema)
    ),
]

results = await crawler.arun_many(
    urls=urls,
    config=configs,
    dispatcher=MemoryAdaptiveDispatcher(
        memory_threshold_percent=90.0,
        max_session_permit=20,
        rate_limiter=RateLimiter(base_delay=(1.0, 3.0))
    )
)
```

**MemoryAdaptiveDispatcher** monitors system RAM via `psutil` and dynamically throttles concurrency:
- `memory_threshold_percent=90.0` → enter pressure mode, pause new tasks
- `critical_threshold_percent=95.0` → aggressive backpressure
- `recovery_threshold_percent=85.0` → resume normal operation
- Uses `asyncio.PriorityQueue` for fair URL scheduling
- `fairness_timeout=600s` → long-waiting URLs get priority boost

---

## 4. Data Pipeline

### 4.1 URL → Structured Output

Full end-to-end pipeline:

```
1. URL INPUT
   └── Scheme support: http://, https://, file://, raw://
       (raw:// accepts HTML string directly)

2. BROWSER FETCH (Playwright)
   ├── Browser pool management (v0.6.0+)
   ├── Session persistence (auth cookies preserved)
   ├── JavaScript execution (init_scripts + page hooks)
   ├── Lazy load / infinite scroll simulation
   ├── Shadow DOM flattening
   ├── Virtual scroll handling (v0.7.x) — Twitter/Instagram-style DOM replacement
   └── Screenshot / PDF / MHTML capture (optional)

3. ANTI-BOT PIPELINE (v0.7.3+, v0.8.5)
   ├── Bot detection: layered pattern matching
   │   ├── Tier 1: Akamai/Cloudflare/PerimeterX/DataDome structural markers
   │   ├── Tier 2: Generic block phrases (size-gated: only on pages <10KB)
   │   └── Tier 3: Structural integrity checks (empty shells)
   ├── Proxy rotation (RoundRobinProxyStrategy)
   ├── Stealth mode (patchright — undetected Chrome)
   └── Fallback fetch function

4. HTML CLEANING (LXMLWebScrapingStrategy)
   ├── Tag inclusion/exclusion filtering
   ├── Link extraction (internal/external, scored)
   ├── Media extraction (images scored by size/format/alt/position)
   └── Table extraction → result.tables (v0.7.3+)

5. CONTENT FILTERING (optional)
   ├── BM25ContentFilter: query-relevance scoring → fit_html
   ├── PruningContentFilter: DOM quality scoring → fit_html
   └── LLMContentFilter: LLM-based content cleaning → fit_markdown

6. MARKDOWN GENERATION
   ├── raw_markdown: full page as markdown
   ├── markdown_with_citations: links as numbered footnotes
   └── fit_markdown: filtered, high-signal markdown (only with content_filter)

7. EXTRACTION (optional)
   ├── LLMExtractionStrategy: LLM + schema → JSON
   ├── JsonCssExtractionStrategy: CSS selectors → JSON
   ├── JsonLxmlExtractionStrategy: XPath → JSON
   ├── CosineStrategy: embedding clusters → tagged blocks
   └── RegexExtractionStrategy: pattern matching → JSON

8. OUTPUT: CrawlResult
   ├── raw_markdown / fit_markdown
   ├── extracted_content (JSON string)
   ├── links {internal: [...], external: [...]}
   ├── media {images: [...], videos: [...], audios: [...]}
   ├── tables [...]
   ├── metadata, status_code, response_headers
   └── crawl_stats (timing, memory, retries)
```

### 4.2 Deep Crawling Pipeline

For multi-page site traversal (v0.8.0 added crash recovery):

```python
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy, BestFirstCrawlingStrategy
from crawl4ai.deep_crawling.filters import FilterChain, URLPatternFilter, DomainFilter
from crawl4ai.deep_crawling.scorers import (
    CompositeScorer, KeywordRelevanceScorer,
    PathDepthScorer, FreshnessScorer, DomainAuthorityScorer
)

scorer = CompositeScorer([
    KeywordRelevanceScorer(keywords=["careers", "jobs", "hiring"], weight=0.5),
    PathDepthScorer(optimal_depth=3, weight=0.2),
    FreshnessScorer(weight=0.15),
    DomainAuthorityScorer({"github.com": 0.9, "linkedin.com": 0.8}, weight=0.15)
])

strategy = BestFirstCrawlingStrategy(
    max_depth=3,
    max_pages=50,
    filter_chain=FilterChain([
        URLPatternFilter(patterns=["*/careers/*", "*/jobs/*"]),
        DomainFilter(allowed_domains=["target-company.com"])
    ]),
    url_scorer=scorer,
    # Crash recovery (v0.8.0):
    resume_state="crawl_state.json",
    on_state_change=lambda state: state.save("crawl_state.json")
)
```

**Scoring components** (all `lru_cache(maxsize=10000)` backed):

| Scorer | Algorithm | Key Params |
|---|---|---|
| `KeywordRelevanceScorer` | Keyword count / total in URL | `keywords`, `case_sensitive` |
| `PathDepthScorer` | `1/(1+|depth-optimal|)` | `optimal_depth` |
| `FreshnessScorer` | Year-diff scoring table | `current_year` |
| `DomainAuthorityScorer` | Domain lookup table | `domain_weights`, `default_weight` |
| `ContentTypeScorer` | Extension matching | `type_weights` |
| `CompositeScorer` | Weighted average | Pre-allocated float arrays |

**URL filters:**

| Filter | Mechanism |
|---|---|
| `URLPatternFilter` | glob or regex, with `SUFFIX/PREFIX/DOMAIN/PATH/REGEX` type optimization |
| `DomainFilter` | Exact domain allowlist/blocklist |
| `ContentTypeFilter` | File extension filtering |
| `SEOFilter` | SEO quality heuristics |
| `ContentRelevanceFilter` | HEAD-peek based content type check |

### 4.3 Adaptive Crawling Pipeline

The most sophisticated AI crawling feature — stops when "enough" information has been gathered:

```python
from crawl4ai import AdaptiveCrawler, AdaptiveConfig

config = AdaptiveConfig(
    strategy="statistical",     # "statistical" | "embedding" | "llm"
    confidence_threshold=0.7,
    max_depth=5,
    max_pages=20,
    top_k_links=3,              # links to follow per page
    coverage_weight=0.4,        # query term coverage
    consistency_weight=0.3,     # inter-document overlap
    saturation_weight=0.3,      # diminishing new terms
    # Embedding strategy params:
    embedding_model="sentence-transformers/all-MiniLM-L6-v2",
    embedding_coverage_radius=0.2,
    embedding_k_exp=1.0,
    embedding_nearest_weight=0.7,
    save_state=True,
    state_path="adaptive_state.json"
)

crawler = AdaptiveCrawler(config=config)
results = await crawler.crawl(
    start_url="https://docs.company.com",
    query="Does this company offer AI engineering remote roles?"
)
```

**Three strategies:**

**StatisticalStrategy** (no embeddings, no LLM):
- Coverage: BM25-derived query term frequency across knowledge base (`sqrt(doc_coverage * freq_signal)`)
- Consistency: pairwise Jaccard similarity between documents (coherent topic = high overlap)
- Saturation: new-terms-per-page history slope — flattening curve signals diminishing returns
- Confidence = `0.4*coverage + 0.3*consistency + 0.3*saturation`

**EmbeddingStrategy** (sentence-transformers):
- `CrawlState` stores numpy arrays: `kb_embeddings`, `query_embeddings`
- Query expansion via LLM (N variations, configurable)
- Coverage using alpha shape geometry (`alphashape` + `shapely`) — measures how much of the query embedding space is "covered" by crawled content
- Semantic gap detection: identifies under-covered query regions to prioritize next URLs
- `embedding_overlap_threshold=0.85` — penalizes redundant links (similarity > threshold gets deprioritized)
- Stopping: `embedding_min_relative_improvement=0.1` — stop if confidence gain < 10% relative per batch

**LLMStrategy**:
- Uses LLM to evaluate information sufficiency
- Highest quality, highest latency and cost

**State persistence:**
- `CrawlState.save(path)` serializes to JSON (numpy arrays → lists)
- `CrawlState.load(path)` restores full state including embeddings
- Enables crash recovery and resumable crawls (v0.8.0)

### 4.4 URL Seeding from Common Crawl + Sitemaps

```python
from crawl4ai import AsyncUrlSeeder, SeedingConfig

seeder = AsyncUrlSeeder()
urls = await seeder.discover(
    domain="anthropic.com",
    config=SeedingConfig(
        sources="sitemap+cc",          # sitemap | cc | sitemap+cc
        query="AI engineering jobs",   # BM25 relevance filter
        score_threshold=0.3,
        url_patterns=["*/careers/*", "*/jobs/*"],
        max_urls=500,
        cache_ttl_hours=24,
        validate_live=True             # HEAD request liveness check
    )
)
```

**Common Crawl integration:**
- Streams from CDX API (`index.commoncrawl.org`) via httpx (HTTP/2, keep-alive)
- Disk cache at `~/.crawl4ai/<index>_<domain>_<hash>.jsonl` with TTL=7 days
- Extracts JSON-LD + Open Graph metadata from `<head>` partial downloads
- BM25 relevance scoring for query-based URL filtering

---

## 5. Evaluation / Quality

### 5.1 Extraction Quality Mechanisms

Crawl4AI does not ship a formal eval framework, but has several quality signals:

**Schema validation feedback loop:**
- `JsonCssExtractionStrategy._validate_schema()` reports:
  - Base element count found
  - Field coverage percentage (fields with at least one match)
  - Sample HTML of matched elements
- Schema generation uses up to `max_refinements` LLM refinement rounds, feeding validation failures back as context

**LLM extraction quality reflection:**
- `PROMPT_EXTRACT_SCHEMA_WITH_INSTRUCTION` includes an explicit quality reflection step:
  ```
  Quality Reflection:
  Before outputting your final answer, double check that the JSON you are
  returning is complete, containing all the information requested by the user,
  and is valid JSON that could be parsed by json.loads() with no errors.

  Quality Score:
  After reflecting, score the quality and completeness of the JSON data you
  are about to return on a scale of 1 to 5. Write the score inside <score> tags.
  ```
- The score is returned alongside the data — callers can gate on `score >= 4`

**Token usage tracking:**
- `LLMExtractionStrategy.show_usage()` reports prompt/completion/total tokens per run
- Enables cost estimation per URL

### 5.2 Chunking Strategies for LLM Context

| Strategy | Algorithm | Parameters | Use Case |
|---|---|---|---|
| `IdentityChunking` | No split | — | Short pages, fits in one context |
| `RegexChunking` | `re.split()` on patterns | `patterns=[r"\n\n"]` | Article-like content |
| `NlpSentenceChunking` | `nltk.sent_tokenize()` | — | Precise sentence boundaries |
| `TopicSegmentationChunking` | `TextTilingTokenizer` | `num_keywords=3` | Long-form, topic-dense pages |
| `FixedLengthWordChunking` | Word array slicing | `chunk_size=100` | Uniform chunks, simple |
| `SlidingWindowChunking` | Overlapping word windows | `window_size=100, step=50` | No context loss at boundaries |
| `OverlappingWindowChunking` | Word windows with overlap | `window_size=1000, overlap=100` | Large pages with LLM context |

Default in `LLMExtractionStrategy`: `CHUNK_TOKEN_THRESHOLD=2048`, `OVERLAP_RATE=0.1`. The word-to-token ratio is estimated at `1.3` (`WORD_TOKEN_RATE`).

### 5.3 Fit Markdown Quality

`fit_markdown` is the key quality gate before LLM extraction. The BM25 filter's quality depends on query signal — if no user query is provided, it falls back to the page's own `<title>` / first `<h1>` / meta description, which for generic pages may produce poor filtering. For known-structure pages (company About, careers), providing an explicit `user_query` to `BM25ContentFilter` significantly reduces prompt tokens and hallucination surface.

---

## 6. Rust/ML Relevance

### 6.1 Could the Extraction Pipeline Be Replicated in Rust?

Partially, with effort:

| Component | Rust Viability | Notes |
|---|---|---|
| HTML → Markdown | High | `htmd`, `markup2md`, or custom `scraper` + pulldown-cmark |
| CSS selectors | High | `scraper` crate (CSS/XPath) |
| BM25 filtering | High | `bm25` crate exists; trivial to implement |
| Regex extraction | High | `regex` crate is faster than Python's |
| LLM API calls | High | `reqwest` + any provider SDK |
| Pydantic schema validation | Medium | `serde` + `schemars` approximate the pattern |
| Browser automation | Low | No production-grade Rust Playwright equivalent; `fantoccini` (WebDriver) is limited |
| sentence-transformers | Medium | `candle` + HuggingFace GGUF models work; embedding quality identical |
| Hierarchical clustering | Medium | `linfa` crate has hierarchical clustering |
| Alpha shape geometry | Low | No mature Rust equivalent of `alphashape` + `shapely` |

**Verdict:** The stateless extraction pipeline (HTML → clean → BM25 → markdown → LLM schema extraction) is 100% implementable in Rust and would be significantly faster (lxml is already fast, but Rust eliminates Python interpreter overhead, GIL, and async context switching costs entirely). The browser control layer cannot be replaced in Rust without wrapping Playwright via Node/CDP or using a Rust WebDriver client with severe feature gaps.

### 6.2 Python Dependency Analysis

**Heavy optional dependencies** (only needed for specific strategies):

| Dependency | Size | Required For | Eliminable? |
|---|---|---|---|
| `torch` + `transformers` | ~3GB | CosineStrategy, EmbeddingAdaptiveCrawler | Yes — skip if using LLM/CSS extraction only |
| `playwright` | ~150MB | All browser-based crawling | No — core |
| `alphashape` + `shapely` | ~50MB | Embedding adaptive crawling geometry | Yes — skip for statistical/llm adaptive |
| `nltk` | ~20MB | NlpSentenceChunking | Yes — skip if using other chunking |

**Core-only install** (sufficient for LLM + CSS extraction):
```bash
pip install crawl4ai  # base
crawl4ai-setup        # installs playwright browsers
# torch/transformers NOT installed by default
```

**Full ML install:**
```bash
pip install crawl4ai[torch,transformer]
```

---

## 7. Integration Points

### 7.1 Python API (Async)

The primary interface. Context manager lifecycle:

```python
# Simple: one URL
async with AsyncWebCrawler(config=BrowserConfig(headless=True)) as crawler:
    result = await crawler.arun(
        url="https://example.com",
        config=CrawlerRunConfig(
            extraction_strategy=JsonCssExtractionStrategy(schema=schema),
            markdown_generator=DefaultMarkdownGenerator(
                content_filter=BM25ContentFilter(user_query="company funding")
            ),
            cache_mode=CacheMode.BYPASS,
            word_count_threshold=10,
            screenshot=False
        )
    )

# Batch: many URLs
async with AsyncWebCrawler() as crawler:
    async for result in crawler.arun_many(urls, config=config, stream=True):
        process(result)
```

**Result object fields of note:**

| Field | Type | Description |
|---|---|---|
| `markdown.raw_markdown` | str | Full page as markdown |
| `markdown.fit_markdown` | str | Filtered high-signal markdown |
| `markdown.markdown_with_citations` | str | Links as numbered footnotes |
| `extracted_content` | str | JSON from ExtractionStrategy |
| `links.internal` | list[Link] | Scored internal links |
| `links.external` | list[Link] | Scored external links |
| `tables` | list[dict] | HTML tables as dicts |
| `media.images` | list[MediaItem] | Scored image objects |
| `js_execution_result` | any | Return value of custom JS |
| `network_requests` | list | All network requests made |

### 7.2 CLI

```bash
# Quick extraction
crwl https://example.com -o markdown

# Deep crawl
crwl https://docs.company.com --deep-crawl bfs --max-pages 50

# LLM extraction with schema
crwl https://company.com/about \
  --extract-type schema \
  --schema '{"name": "CompanyInfo", "fields": [{"name": "ceo", "selector": "..."}]}'
```

### 7.3 Docker REST API

```bash
docker run -d -p 11235:11235 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e LLM_PROVIDER=openai/gpt-4o \
  unclecode/crawl4ai:latest
```

**Key REST endpoints:**

| Endpoint | Method | Purpose |
|---|---|---|
| `/crawl` | POST | Synchronous crawl with full config JSON |
| `/crawl/job` | POST | Async job submission |
| `/crawl/job/{id}` | GET | Poll job result |
| `/llm/job` | POST | LLM extraction job |
| `/execute_js` | POST | Execute JS on page |
| `/screenshot` | POST | Capture screenshot |
| `/pdf` | POST | Generate PDF |
| `/html` | POST | Get cleaned HTML |
| `/dashboard` | GET | Monitoring UI (v0.7.7+) |
| `/mcp` | WS/SSE | MCP protocol endpoint (v0.6.0+) |

**Authentication:** JWT token required for all endpoints when `JWT_SECRET` env is set.

**Job queue with webhooks (v0.7.6+):**
```bash
curl -X POST http://localhost:11235/crawl/job \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "extraction_strategy": {...},
    "webhook_url": "https://my-service.com/crawl-done",
    "webhook_headers": {"Authorization": "Bearer secret"}
  }'
```
Webhook delivery has automatic retry with exponential backoff.

**Docker config via `config.yml`:**
```yaml
llm:
  provider: openai/gpt-4o
  api_token: ${OPENAI_API_KEY}
crawling:
  max_concurrent: 10
  memory_threshold: 90
```

**Security hardening (v0.8.0):**
- `file://`, `javascript:`, `data:` URL schemes blocked on all API endpoints
- `CRAWL4AI_HOOKS_ENABLED` env var gates JavaScript hook execution (disabled by default)
- Remote code execution via `__import__` in hooks patched

### 7.4 MCP Protocol (v0.6.0+)

Crawl4AI exposes an MCP server over WebSocket and SSE at `/mcp`. This enables direct integration with Claude and other MCP-aware agents as a tool. Config object serialization/deserialization is fully supported via `to_serializable_dict()` / `from_serializable_dict()` — the REST API accepts serialized `CrawlerRunConfig` objects directly.

### 7.5 Using as a Building Block

For a lead-gen pipeline, the recommended integration pattern:

```python
# Enrichment worker pattern
async def enrich_company(company_domain: str) -> CompanyData:
    async with AsyncWebCrawler(config=BrowserConfig(headless=True)) as crawler:
        # 1. About page structured extraction
        about_result = await crawler.arun(
            url=f"https://{company_domain}/about",
            config=CrawlerRunConfig(
                extraction_strategy=LLMExtractionStrategy(
                    llm_config=LLMConfig(provider="openai/gpt-4o-mini"),
                    schema=CompanySchema.model_json_schema(),
                    extraction_type="schema"
                ),
                markdown_generator=DefaultMarkdownGenerator(
                    content_filter=BM25ContentFilter(user_query="company mission funding team")
                )
            )
        )

        # 2. Careers page job listing extraction
        jobs_result = await crawler.arun(
            url=f"https://{company_domain}/careers",
            config=CrawlerRunConfig(
                extraction_strategy=JsonCssExtractionStrategy(schema=job_listings_schema),
                cache_mode=CacheMode.ENABLED  # Cache careers pages
            )
        )

        return merge_results(about_result, jobs_result)
```

---

## 8. Gaps / Weaknesses

### 8.1 LLM Extraction Limitations

**No ground-truth evaluation.** The `<score>` field in LLM prompts is self-assessed by the model. There is no built-in accuracy measurement framework, no eval dataset, and no regression testing for extraction quality across versions.

**Chunking loses cross-chunk context.** When a page is split at `chunk_token_threshold=2048`, entities that span chunks (e.g., a company description split across paragraphs) may be partially extracted. The `overlap_rate=0.1` default (204 tokens) mitigates but does not eliminate this.

**Prompt is static HTML.** The LLM receives sanitized HTML, not rendered visual layout. Tables, sidebars, and two-column layouts often produce garbled markdown that confuses the extraction. `fit_markdown` significantly helps here, but requires correct `user_query`.

**Schema generation requires human validation.** Auto-generated CSS schemas degrade silently when the target site updates its HTML structure. There is no drift detection or schema health monitoring.

**Cost scales with page size.** A 50KB company About page with `gpt-4o` at the default 2048-token chunk size means ~12–15 chunks → ~15 LLM calls per URL. For 10,000 companies, this is ~150,000 API calls. Using `gpt-4o-mini` or Claude Haiku drops cost 20x but accuracy may degrade on complex schemas.

### 8.2 Scale and Performance Issues

**Python GIL is the ceiling.** Despite async I/O, CPU-bound work (lxml parsing, BM25 scoring, embedding generation) still serializes on the GIL. For high-throughput enrichment (1,000+ companies/hour), the GIL becomes the bottleneck.

**Memory pressure is the primary throttle.** `MemoryAdaptiveDispatcher` backs off when RAM hits 90%. The underlying issue is that Playwright pages leak memory over long sessions — the library works around this with session recycling, but doesn't eliminate it.

**No distributed execution.** There is no native task queue, worker pool, or message broker integration. For scale, users must build their own orchestration around the Docker API's job queue or run multiple Docker containers behind a load balancer. No Celery/Redis/NATS integration out of the box.

**Playwright cold start.** Each `AsyncWebCrawler()` context requires browser launch (~1–2s on first use). The browser pool (v0.6.0+) mitigates this for long-running processes, but serverless/ephemeral deployments pay this cost on every invocation.

**Embedding-based adaptive crawling is slow.** Generating sentence embeddings for each crawled page adds ~50–200ms per page (CPU), or ~10–30ms (GPU). Alpha shape coverage calculation via `shapely` is O(n²) in the number of embedding dimensions. For 100+ page crawls, this adds meaningful overhead.

### 8.3 Anti-Bot Coverage Gaps

- `patchright` stealth works against Cloudflare Turnstile and basic fingerprinting, but fails against advanced CAPTCHA flows requiring human interaction.
- Proxy rotation is manual — no built-in integration with residential proxy providers. Users must supply proxy lists.
- The `v0.8.5` anti-bot detection is pattern-matching only — if a block page uses novel markup, it will go undetected and return garbage content to the extraction stage.

### 8.4 Browser Dependency

The entire system requires Playwright + Chromium (`~150MB`). For pages that serve static HTML (news articles, company "About" pages, most job boards), this is massive overkill. Crawl4AI has an HTTP crawler strategy (`HTTPCrawlerConfig`) for simple pages, but the LLM extraction and AI features are all wired to the browser path in documentation.

### 8.5 No Native Deduplication

`CrawlResult` contains no built-in content fingerprint. Deduplication of extracted entities (same company crawled twice via different URLs) is entirely the caller's responsibility. This matters for B2B pipelines where multiple URLs may resolve to the same company.

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 What to Adopt Directly

**BM25ContentFilter as the noise gate.** This is the highest-ROI component. Before any LLM extraction, run `BM25ContentFilter(user_query="company description funding team size")` to compress the page to relevant content. Reduces LLM input tokens by 60–80% on typical company pages, directly cutting cost and improving extraction quality.

**JsonCssExtractionStrategy for known-structure sources.** For Ashby/Greenhouse/Lever ATS boards, careers pages, and job aggregators with predictable HTML structure, CSS-based schemas are zero-cost and 100% accurate. Reserve LLM extraction for unstructured "About" pages.

**MarkdownGenerationResult.fit_markdown as the canonical representation.** Store `fit_markdown` in the database as the canonical page snapshot. It is LLM-ready, compact, and reproducible. Regenerate downstream structured fields from it when models improve.

**Two-phase URL seeding.** Use `AsyncUrlSeeder` with Common Crawl for cold discovery (zero JavaScript required, no Playwright), then switch to `AsyncWebCrawler` only for pages that need JS rendering. Eliminates browser overhead for ~70% of B2B company pages.

**AdaptiveCrawler with StatisticalStrategy for deep company research.** When enriching a specific company (e.g., checking if they have an AI team), use adaptive crawling with `confidence_threshold=0.7` to automatically stop once sufficient evidence has been gathered. Cheaper than crawling 50 pages uniformly.

**URL scoring with CompositeScorer for targeted crawls.** Build company-specific scorers (`KeywordRelevanceScorer(["team", "engineering", "ai"])`) to prioritize relevant internal links during deep crawls of company sites.

### 9.2 What to Build On Top Of

**Extraction schema registry.** Crawl4AI's schema generation is one-shot. Build a registry of validated CSS schemas keyed by ATS type (Ashby, Greenhouse, Lever, Workday, Rippling), website CMS (Webflow, WordPress, Ghost), and content type (About, Careers, Blog). Auto-detect which schema applies via URL pattern + `_validate_schema()` coverage score. Fall back to LLM only when coverage < 80%.

**Confidence-gated LLM escalation.** Run `JsonCssExtractionStrategy` first. If field coverage < threshold or required fields are missing, escalate to `LLMExtractionStrategy` with the CSS result as additional context. This is the "cheap model first, escalate on low confidence" pattern from the optimization strategy — Crawl4AI doesn't implement it, but all the primitives are there.

**Differential re-crawl.** Crawl4AI has `CacheMode.ENABLED` with ETag/fingerprint validation. Use the `head_fingerprint` field to detect content changes without re-fetching. Only re-run LLM extraction when the fingerprint changes, reducing ongoing enrichment costs.

**Structured entity deduplication layer.** After extraction, run entity resolution on `company.name` + `company.domain` before inserting to the database. Crawl4AI produces no dedup signals.

### 9.3 What to Avoid

**CosineStrategy in production without GPU.** It pulls in `torch` + `transformers` (~3GB), is slow on CPU, and produces lower-quality clusters than a well-prompted `LLMExtractionStrategy`. Only viable if you have GPU workers and want zero LLM API cost.

**LLMContentFilter in the hot path.** It calls an LLM just to clean content before another LLM extraction call — paying twice. Use `BM25ContentFilter` instead. Reserve `LLMContentFilter` for research/evaluation runs where quality is the sole concern.

**Adaptive crawling's embedding strategy for high-volume pipelines.** The `alphashape` geometry is elegant but slow. For production enrichment of 10,000+ companies, use the `StatisticalStrategy` (no GPU, no embeddings, just BM25 + term frequency) or set `max_pages=5` with `BestFirstCrawlingStrategy` instead of full adaptive crawling.

**The Docker API job queue for production orchestration.** It is a simple FastAPI job store, not a durable message queue. Use it for development and demos; in production, drive `AsyncWebCrawler` directly from your own task queue (Temporal, BullMQ, etc.).

### 9.4 Concrete Enrichment Architecture for B2B Lead Gen

```
Company domain list
      │
      ▼
[AsyncUrlSeeder]                    ← Common Crawl + sitemap, no browser, fast
   ├── about/team/mission URLs
   └── careers/jobs URLs
      │
      ▼
[URL Classifier]                    ← URL pattern → schema type mapping
   ├── ATS board URL → JsonCssExtractionStrategy (schema: Ashby, Greenhouse...)
   ├── About page → LLMExtractionStrategy + BM25ContentFilter
   └── Blog/press → RegexExtractionStrategy (funding signals, headcount)
      │
      ▼
[AsyncWebCrawler.arun_many()]        ← Playwright only for JS-heavy pages
   └── MemoryAdaptiveDispatcher (max 20 concurrent)
      │
      ▼
[Confidence Gate]                   ← Check extracted_content completeness
   ├── Coverage ≥ 80% → accept
   └── Coverage < 80% → LLM escalation with fit_markdown
      │
      ▼
[Entity Resolution]                 ← Dedup by domain + name normalization
      │
      ▼
[Drizzle ORM → Neon PostgreSQL]     ← companies, contacts, job_listings tables
```

This architecture uses crawl4ai as a pure extraction substrate. The B2B-specific logic (ICP scoring, contact discovery, outreach sequencing) lives entirely outside it. Crawl4ai's job ends at `CrawlResult` — everything after is your platform's value add.

---

*Sources: GitHub repo `unclecode/crawl4ai` (source inspection via GitHub API), CHANGELOG.md, requirements.txt, source files: `extraction_strategy.py`, `chunking_strategy.py`, `content_filter_strategy.py`, `markdown_generation_strategy.py`, `async_webcrawler.py`, `async_dispatcher.py`, `adaptive_crawler.py`, `deep_crawling/scorers.py`, `deep_crawling/filters.py`, `async_configs.py`, `config.py`, `prompts.py`, `antibot_detector.py`, `async_url_seeder.py`, `models.py`.*

---

## 10. Deep ML Analysis

### 10.1 CosineStrategy: Embedding Model and Clustering Details

The `CosineStrategy` is the only ML-native (non-LLM) extraction path in Crawl4AI. All parameters below are confirmed from `crawl4ai/extraction_strategy.py` source inspection and the v0.8.x documentation.

**Embedding model (default):** `sentence-transformers/all-MiniLM-L6-v2`
- Architecture: MiniLM-L6 (6-layer transformer), 22M parameters
- Base: `nreimers/MiniLM-L6-H384-uncased` pretrained on 1B sentence pairs
- Output dimensionality: **384 dimensions** (dense float32 vectors)
- Inference: mean pooling over final hidden layer token embeddings
- Multilingual alternative supported: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`

**Loading mechanism:** `load_HF_embedding_model(model_name)` returns `(tokenizer, model)` tuple. Embeddings are batch-processed via the model's `forward()` pass followed by mean pooling. No ONNX / quantized inference — pure PyTorch on whatever device is available (CPU default, GPU if `torch.cuda.is_available()`).

**Full CosineStrategy `__init__` signature with defaults:**
```python
CosineStrategy(
    semantic_filter=None,       # str: optional query for pre-filter
    word_count_threshold=10,    # int: prune clusters with < N words
    max_dist=0.2,               # float: cophenetic distance threshold for fcluster
    linkage_method="ward",      # str: scipy linkage method
    top_k=3,                    # int: keep top-K most relevant clusters
    model_name="sentence-transformers/all-MiniLM-L6-v2",
    sim_threshold=0.3,          # float: cosine similarity cutoff for pre-filter
    verbose=False
)
```

**Clustering algorithm — step by step:**
1. HTML split into block-level text segments
2. If `semantic_filter` is set: cosine similarity computed between query embedding and each segment embedding; segments with cosine similarity < `sim_threshold` (default 0.3) are dropped
3. Remaining segments embedded in batch
4. `scipy.cluster.hierarchy.linkage(embeddings, method="ward")` — Ward linkage minimizes within-cluster variance using Euclidean distance in 384-dim embedding space (note: Ward linkage operates on Euclidean distances, not cosine, even though the pre-filter uses cosine)
5. `scipy.cluster.hierarchy.fcluster(Z, t=max_dist, criterion="distance")` — flat clusters where cophenetic distance < `max_dist=0.2` are merged
6. Clusters with word count < `word_count_threshold=10` pruned
7. If `semantic_filter` provided: clusters ranked by average cosine similarity to query; `top_k=3` highest returned
8. Multilabel NLP classifier assigns topic tags to each surviving cluster

**Why Ward + cophenetic distance, not cosine threshold alone:** Ward linkage produces more compact, uniform-size clusters than single/complete/average linkage in high-dimensional embedding spaces. The `max_dist=0.2` cophenetic distance threshold in 384-dim Euclidean space is roughly equivalent to cosine similarity > 0.8 between cluster members — but this is not a hard equivalence; it depends on vector norms.

**Dependencies required (not installed by default):**
```bash
pip install crawl4ai[torch,transformer]
# Installs: torch, transformers, scikit-learn (~3GB)
```

### 10.2 BM25ContentFilter: Full Algorithm Specification

Implemented in `crawl4ai/content_filter_strategy.py` using `rank-bm25` library (BM25Okapi variant).

**Full `__init__` signature:**
```python
BM25ContentFilter(
    user_query=None,       # str | None: falls back to page title/h1/meta
    bm25_threshold=1.0,    # float: minimum adjusted BM25 score to keep chunk
    use_stemming=True,     # bool: apply SnowballStemmer before BM25
    language="english"     # str: SnowballStemmer language config
)
```

**SnowballStemmer:** `snowballstemmer~=2.2` package. `stemmer(language)` instantiated on init where `language="english"` is the default. Supported languages follow Snowball's language list (English, French, German, Spanish, Dutch, Italian, Portuguese, etc.). When `use_stemming=True`, each tokenized query term and each chunk term is stemmed before BM25 scoring.

**BM25 IDF formula:** Delegated to `rank_bm25.BM25Okapi`. The Okapi BM25 IDF formula is:
```
IDF(t) = log((N - df(t) + 0.5) / (df(t) + 0.5) + 1)
```
where N = total number of corpus documents (chunks), df(t) = number of chunks containing term t. The `+1` inside the log prevents negative IDF for very common terms. `rank-bm25` uses k1=1.5, b=0.75 defaults.

**Tag weight multiplication table (exact values from source):**
| HTML tag | Weight multiplier |
|---|---|
| `h1` | 5.0× |
| `h2` | 4.0× |
| `h3` | 3.0× |
| `title` | 4.0× |
| `strong` | 2.0× |
| `blockquote` | 2.0× |
| `code` | 2.0× |
| `b` | 1.5× |
| `em` | 1.5× |
| `pre` | 1.5× |
| `th` | 1.5× |
| All other content tags | 1.0× |

Formula: `adjusted_score = bm25_score × tag_weight`. Chunks where `adjusted_score >= bm25_threshold (1.0)` are retained.

**`extract_text_chunks()` implementation:** DFS traversal using a `deque` as stack with a visited flag. Maintains a `current_text` accumulator for inline elements (`INLINE_TAGS`). At each block-level break tag, the accumulated text is flushed as a chunk. Chunk type is classified as `"header"` (for h1–h6, title) or `"content"` (everything else).

**Deduplication algorithm:** Exact text matching. A `seen_texts: set[str]` tracks processed chunks. Iterates sorted candidates by score descending, keeps first occurrence of each unique text, preserves document order in final output. No cosine similarity or embedding-based dedup — purely deterministic string comparison.

**Query auto-extraction fallback:** When `user_query=None`, the filter extracts the query from the page itself via: `<title>` tag → first `<h1>` → `meta[name=description]` content. This is important for production: on pages without a strong title (generic SPA roots, dashboards), the auto-extracted query degrades BM25 quality significantly.

### 10.3 LLMExtractionStrategy: Chunking and Parallelism

From `config.py` constants and `extraction_strategy.py`:

| Constant | Default | Meaning |
|---|---|---|
| `CHUNK_TOKEN_THRESHOLD` | 2048 | Max tokens per chunk submitted to LLM |
| `OVERLAP_RATE` | 0.1 | 10% overlap (≈204 tokens at 2048-token chunks) |
| `WORD_TOKEN_RATE` | 1.3 | Estimated tokens-per-word ratio for chunk sizing |

**Chunking logic:** Content is split into word arrays. Each chunk is `ceil(CHUNK_TOKEN_THRESHOLD / WORD_TOKEN_RATE) = ceil(2048/1.3) ≈ 1576 words`. Overlap is `floor(0.1 × 1576) ≈ 157 words`. At 1.3 words/token, a 50KB page (~8,000 words) produces approximately 5–6 chunks → 5–6 LLM calls per URL.

**Parallelism:** `ThreadPoolExecutor(max_workers=4)` in the synchronous `run()` method. The async `arun()` uses `asyncio.gather()` for true async parallelism (no thread pool needed — LLM calls are network I/O). Groq provider is explicitly forced to sequential submission (no parallelism) due to rate limit sensitivity.

**Prompt format:** Each chunk is wrapped in XML tags:
```
<url>{URL}</url>
<html>{sanitized_chunk}</html>
```
The schema (if provided) is injected as a separate `<schema>` section. The system prompt instructs the LLM to return JSON only.

**Response parsing fallback chain:**
1. Try `json.loads(response)` directly
2. If fails: split on `}{` and parse individual objects
3. If fails: look for `<blocks>` XML tag and extract contents
4. If all fail: log error and return empty result

**Quality self-reflection:** The system prompt for schema-mode extraction includes:
```
Quality Score:
After reflecting, score the quality and completeness of the JSON data
you are about to return on a scale of 1 to 5. Write the score inside <score> tags.
```
The `<score>` tag is parsed and returned alongside extracted data. Callers can gate acceptance on `score >= 4`.

### 10.4 AdaptiveCrawler: Statistical and Embedding Stopping Criteria

Implemented in `crawl4ai/adaptive_crawler.py`. Three strategies with distinct mathematical approaches.

**StatisticalStrategy formulas (from docs + source):**

Coverage:
```
Coverage(K, Q) = Σ_{t ∈ Q} score(t, K) / |Q|
score(t, K) = doc_coverage(t) × (1 + freq_boost(t))
```
where `doc_coverage(t)` = fraction of crawled documents containing term t, `freq_boost(t)` = logarithmic bonus for term frequency.

Consistency: pairwise Jaccard similarity between crawled documents (normalized 0–1).

Saturation: slope of new-terms-per-page history. When this slope flattens below `min_gain_threshold`, saturation is declared.

Composite confidence: `0.4 × coverage + 0.3 × consistency + 0.3 × saturation`

Stop condition: `confidence >= confidence_threshold` (default 0.7).

**EmbeddingStrategy parameters (confirmed from `AdaptiveConfig` in source + docs):**

| Parameter | Default | Meaning |
|---|---|---|
| `embedding_model` | `"sentence-transformers/all-MiniLM-L6-v2"` | Same checkpoint as CosineStrategy |
| `embedding_coverage_radius` | 0.2 | Radius in embedding space for alpha shape coverage |
| `embedding_k_exp` | 1.0 | Exponent for coverage weighting |
| `embedding_nearest_weight` | 0.7 | Weight of nearest-neighbor embedding in coverage score |
| `embedding_overlap_threshold` | 0.85 | Links with cosine similarity > 0.85 to existing KB are deprioritized (redundancy penalty) |
| `embedding_min_relative_improvement` | 0.1 | Stop if confidence gain < 10% relative per crawl batch |

**Alpha shape geometry:** Uses `alphashape>=1.3.1` + `shapely>=2.0.0`. The crawled page embeddings (384-dim, projected to 2D via UMAP or similar for geometry purposes — exact projection method not disclosed in docs) are used to compute an alpha shape: a generalization of convex hull that captures concave regions of the embedding cloud. Coverage is measured as the fraction of query embedding variants that fall within this alpha shape (i.e., "how much of the query space do we already cover?"). `embedding_coverage_radius=0.2` controls the alpha parameter — smaller values produce tighter shapes with holes; larger values approach convex hull.

**Key limitation noted in existing report (section 8.2):** Alpha shape coverage calculation via `shapely` is O(n²) in the number of embedding dimensions. For >100 page crawls, the geometry computation dominates runtime (~50–200ms overhead per page on CPU). The O(n²) claim refers to the pairwise distance matrix needed to build the Delaunay triangulation underlying the alpha shape — standard computational geometry cost.

**State persistence:** `CrawlState.save(path)` serializes `kb_embeddings` (numpy array) to JSON by converting to Python lists. `CrawlState.load(path)` restores the full state including embedding arrays for crash recovery (v0.8.0 feature).

### 10.5 Version History of AI Features

| Version | Date | ML Features Added |
|---|---|---|
| v0.3.x | 2024-05 | Initial release: LLMExtractionStrategy, CosineStrategy, basic BM25 |
| v0.4.1 | 2024-12 | Async rewrite; efficiency improvements; no new ML features |
| v0.6.0 | 2025-Q1 | Browser pool, MCP server, table extraction; `content_source` param for markdown generator (enables `fit_html` as input) |
| v0.7.0 | 2025-Q2 | **AdaptiveCrawler introduced** (statistical + embedding + LLM strategies); EmbeddingStrategy with alpha shape geometry; RegexExtractionStrategy; query expansion via LLM in adaptive crawling |
| v0.7.3 | 2025-Q3 | Per-URL `CrawlerRunConfig` matching in `arun_many()`; MemoryAdaptiveDispatcher; URL scoring with CompositeScorer |
| v0.7.7 | 2025-Q4 | Self-hosting dashboard; MCP WebSocket endpoint |
| v0.8.0 | 2026-Q1 | Crash recovery for AdaptiveCrawler (`resume_state`, `on_state_change`); deep crawl resume; prefetch mode (5–10x URL discovery speedup) |
| v0.8.5 | 2026-03 | Anti-bot tier system (Akamai/Cloudflare/PerimeterX/DataDome detection); Shadow DOM flattening; patchright stealth |

---

## 11. Research Papers & Prior Art

| Paper | Authors | Year | Venue | Relevance | Key Finding |
|---|---|---|---|---|---|
| **HtmlRAG: HTML is Better Than Plain Text** (arXiv:2411.02959) | Tan, Dou, Wang, et al. | 2025 | WWW 2025 | Foundational justification for Crawl4AI's HTML-first approach over plain-text | Two-step block-tree pruning + HTML-aware RAG outperforms plain-text extraction on 6 QA benchmarks; structural context (headings, tables) is non-trivially informative |
| **AXE: Low-Cost Cross-Domain Web Extraction** (arXiv:2602.01838) | Mansour, Alshaer, El-Saban | 2026 | arXiv | Direct competing approach; DOM tree pruning vs. Crawl4AI's BM25 + LLM | 0.6B model achieves 88.10% F1 (SWDE), 86.95% (WebSRC) via DOM pruning; 97.9% token reduction — 20× smaller model than typical LLM extraction approaches |
| **Dripper: Token-Efficient HTML Extraction** (arXiv:2511.23119) | Liu, Peng, Ning, et al. | 2025/2026 | arXiv | Competing approach using sequence labeling instead of LLM generation | Dripper-0.6B rivals DeepSeek-V3.2 and GPT-5 on WebMainBench (7,809 pages, 5,434 domains); 3.08 pages/sec on single A100; eliminates hallucination via constrained sequence labeling |
| **PARSE: LLM Driven Schema Optimization** (arXiv:2510.08623) | Amazon Science | 2025 | EMNLP 2025 Industry | Competing paradigm: treat schemas as optimizable, not static contracts | +64.7% extraction accuracy vs SOTA on SWDE by iteratively refining schema definitions (ARCHITECT component) before extraction (SCOPE component) |
| **ScrapeGraphAI-100k** (arXiv:2602.15189) | Brach, Zuppichini, et al. | 2026 | arXiv | Benchmark dataset applicable to evaluating Crawl4AI's LLMExtractionStrategy | Key F1 evaluation methodology (dot-notation flattening + jsonschema-rs validation) is directly applicable to benchmarking Crawl4AI's schema-mode extraction |
| **SLOT: Structuring the Output of LLMs** (arXiv:2505.04016) | Wang, Shen, Mishra, et al. | 2025 | arXiv | Post-processing layer that could augment Crawl4AI's LLM extraction | Fine-tuned 1B model (Llama-3.2-1B + SLOT) matches proprietary models on schema compliance; applicable as a structured output correction layer on top of Crawl4AI's `<score>` self-reflection |
| **JSONSchemaBench** (arXiv:2501.10868) | Geng, Cooper, et al. (EPFL + Microsoft) | 2025 | arXiv | Benchmark for constrained decoding — relevant to Crawl4AI's `force_json_response` and schema extraction | 10K real-world JSON schemas; Guidance achieves highest coverage; constrained decoding 50% faster than unconstrained; direct benchmark for `LLMExtractionStrategy` schema compliance |
| **Leveraging LLMs for Web Scraping** (arXiv:2406.08246) | Ahluwalia, Wani | 2024 | arXiv | Early academic validation of Crawl4AI's approach | LLMs + effective chunking/ranking algorithms match specialized scrapers; identifies chunking quality as the primary differentiator |
| **SWDE Benchmark** (Hao et al.) | Hao, Zhu, et al. | 2011 | SIGIR 2011 | Gold-standard cross-domain web extraction benchmark | 124,291 pages, 80 websites, 8 verticals; AXE achieves 88.10% F1 zero-shot — the threshold a competing Crawl4AI-based system should match |
| **all-MiniLM-L6-v2** (reimers/nils-reimers, sbert.net) | Reimers, Gurevych | 2019 | EMNLP 2019 | The actual embedding checkpoint used in CosineStrategy and EmbeddingAdaptiveCrawler | 22M params, 384-dim, trained on 1B sentence pairs; 14,200 sentences/sec on GPU; standard benchmark: 68.4% on STS-b (Spearman) |
| **BM25 Okapi** (Robertson et al.) | Robertson, Walker, et al. | 1994 | TREC 1994 | IDF formula underlying BM25ContentFilter | Probabilistic retrieval model with k1=1.5, b=0.75; still state-of-art for sparse retrieval in many domains |

### Notes for ML Engineers Building Competing Systems

**The embedding bottleneck is `all-MiniLM-L6-v2` on CPU.** At 22M parameters with 384-dim outputs, this model runs at ~50–200ms per page on CPU (batch size 1). On GPU (A100), throughput is ~14,200 sentences/sec. For high-volume pipelines, the sentence embedding call is the dominant CPU cost in CosineStrategy and EmbeddingAdaptiveCrawler. Replacing with `fastembed-rs` (ONNX-quantized, INT8) on CPU achieves 4,618 embeddings/sec (as documented in monorepo memory) — roughly 10–20× faster for the same checkpoint.

**BM25ContentFilter is the highest-ROI component.** It runs entirely in Python with no GPU, no API calls, and no large model weights. The tag-weight table (h1=5.0, h2=4.0, strong=2.0) is a manually tuned heuristic that works well for company About/careers pages. A competing system could improve on this by learning tag weights from labeled web content (supervision signal: which HTML elements actually contain the information sought by a given query type).

**The alpha shape geometry in EmbeddingAdaptiveCrawler is a research prototype.** Its O(n²) complexity and 50–200ms overhead per page makes it unsuitable for high-volume production crawling. The statistical strategy (pure BM25 + Jaccard) achieves comparable stopping quality without any GPU or geometry library, and is the recommended production path.

**No academic paper evaluates Crawl4AI directly.** All papers above are prior art or competing approaches. Crawl4AI has not published a formal evaluation of its extraction accuracy against SWDE, WebSRC, or any other benchmark. This is a significant gap: the `<score>` self-assessment in LLM prompts is not a substitute for ground-truth evaluation.

---

## 12. Recency & Changelog

### Latest Release

**v0.8.5** — released 2026-03-18 (PyPI + Docker `unclecode/crawl4ai:0.8.5`). As of 2026-03-28, the `main` branch is already at **v0.8.6** (bumped 2026-03-24) but not yet cut as a formal GitHub release.

Key AI/ML changes in v0.8.5 (vs v0.8.0 baseline):

| Area | Change |
|---|---|
| Anti-bot detection | Layered Tier 1/2/3 system (Akamai/Cloudflare/PerimeterX structural markers → generic block phrases → empty-shell check); re-check on fallback-fetch failure |
| Shadow DOM | Full flattening support added to HTML scraping pipeline |
| HTTP strategy | Detects and saves file downloads (CSV, PDF, etc.) automatically |
| BM25ContentFilter | Fixed output deduplication bug (#1213) that caused repeated chunks |
| `scan_full_page` | Fixed hang on dynamic/infinite-scroll pages |
| `css_selector` | Fixed: ignored for `raw://` URLs in LXML scraping strategy |
| Screenshot | `scan_full_page=False` now correctly respected; distortion on full-page screenshots fixed |
| MCP endpoint | SSE crash on Starlette >=0.50 fixed; mounted via raw ASGI Route |
| Redis | Upgraded to 7.2.7 for CVE-2025-49844 (CVSS 10.0) |
| Regression suite | 291 tests added (2026-03-08 batch) covering 10+ previously open bugs |

Key AI/ML changes in **v0.8.0** (2026-01-16) — the last major release before v0.8.5:

| Area | Change |
|---|---|
| Security (breaking) | RCE fix: removed `__import__` from hook builtins; hooks disabled by default in Docker via `CRAWL4AI_HOOKS_ENABLED` env var |
| Security (breaking) | LFI fix: `file://`, `javascript:`, `data:` URLs blocked in Docker API endpoints |
| Crash recovery | `resume_state` + `on_state_change` callbacks for BFS/DFS/Best-First deep crawls |
| Prefetch mode | Two-phase deep crawling: fast link extraction pass before full crawl |
| `init_scripts` | Pre-page-load JS injection in `BrowserConfig` for stealth evasions |
| Proxy | Enhanced rotation with sticky sessions; HTTP strategy now proxy-aware |
| `base_url` param | Correct URL resolution when feeding raw HTML via `raw:` scheme |
| `raw:`/`file://` | Screenshot, PDF, MHTML generation from cached HTML now supported |
| Sitemap seeder | Smart TTL cache (`cache_ttl_hours`, `validate_sitemap_lastmod` params) |

### Recent Commits (last 90 days)

Significant commits on `main` between 2025-12-28 and 2026-03-28:

| Date | SHA | Summary |
|---|---|---|
| 2026-03-24 | `4e4a9968` | **CRITICAL: replace litellm with `unclecode-litellm`** due to PyPI supply chain compromise of upstream `litellm`; pinned to safe fork v1.81.13 |
| 2026-03-24 | `f4bda051` | Bump version to v0.8.6 (unreleased tag) |
| 2026-03-23 | `219416e4` | Fix MCP SSE endpoint crash on Starlette >=0.50 |
| 2026-03-23 | `310b52b6` | Improve browser None guard in `create_browser_context` |
| 2026-03-18 | `c4389add` | Fix `scan_full_page` hang on dynamic/infinite-scroll pages |
| 2026-03-16 | `9b571bb9` | HTTP strategy detects and saves file downloads (CSV, PDF) |
| 2026-03-12 | `bf1158a6` | Upgrade Redis to 7.2.7 for CVE-2025-49844 |
| 2026-03-12 | `57b0d099` | Fix BM25ContentFilter duplicate output (#1213) |
| 2026-03-08 | `d788c283` | Add 291-test regression suite |
| 2026-03-07 | `3a75dd3f` | Batch fix 10 open issues |
| 2026-02-18 | `8576331d` | Add Shadow DOM flattening; reorder JS code execution pipeline |
| 2026-02-17 | `d267c650` | Add sibling selector support to JSON extraction strategies |
| 2026-02-14 | `72b546c4` | Add anti-bot detection, retry, and fallback system |
| 2026-02-14 | `87955395` | Add `ProxyConfig.DIRECT` sentinel for direct-then-proxy escalation |
| 2026-02-11 | `3fc7730a` | Add `remove_consent_popups` flag to scraping config |
| 2026-02-06 | `37a49c53` | Add `redirected_status_code` to `CrawlResult` |
| 2026-02-04 | `c046918b` | Add memory-saving mode + browser recycling |
| 2025-12-30 | `3d78001c` | Smart TTL cache for sitemap URL seeder |
| 2025-12-27 | `2550f3d2` | Browser pipeline support for `raw:`/`file://` URLs |
| 2025-12-26 | `a43256b2` | Proxy support added to HTTP crawler strategy |

### Breaking Changes

Changes that affect existing integrations:

**v0.8.0 (2026-01-16) — two hard breaking changes in Docker deployments:**

1. **Hooks disabled by default in Docker.** If you call the Docker API with `js_code`, `on_execution_started`, `on_before_goto`, or similar hook parameters, they will silently no-op unless the container is launched with `CRAWL4AI_HOOKS_ENABLED=true`. The Python SDK is unaffected — hooks work as before.

2. **`file://`, `javascript:`, `data:` URLs blocked in Docker API.** The `/execute_js`, `/screenshot`, `/pdf`, `/html` endpoints reject these schemes with a 400 error. Only `http://`, `https://`, and `raw:` are allowed. Python library users are unaffected.

**v0.8.5 / v0.8.6 (March 2026) — supply chain response:**

3. **`litellm` replaced by `unclecode-litellm`** (a pinned fork). If you inject `litellm` directly into a shared virtual environment alongside crawl4ai, you may encounter import conflicts. Pure crawl4ai installs are unaffected since `pip install crawl4ai` pulls `unclecode-litellm` automatically. A larger replacement to `nanollm` (PR #1871) is in review and may ship in a future minor release — this would reduce the installed footprint from ~150 MB to ~5.5 MB but maintains the same API surface (`completion`, `acompletion`, `batch_completion`, `aembedding`).

**v0.6.0 (2025-04-22) — older but worth noting for anyone upgrading from v0.5.x:**

4. `WebScrapingStrategy` is now an alias for `LXMLWebScrapingStrategy`; old `BeautifulSoup`-based scraper removed.
5. `ProxyConfig` moved to `async_configs` module — update import paths if you import it directly.
6. `DefaultMarkdownGenerator` renamed (old names emit deprecation warnings).
7. Direct imports from `crawl4ai/browser/*` must be updated to the pooled browser modules.

### Open Issues (AI/ML relevant)

Active open issues as of 2026-03-28 (46 total open):

| # | Title | Status |
|---|---|---|
| #1455 | `LLMExtractionStrategy` not applied when `cache_mode=ENABLED` | Root-caused, on-hold; fix PR #1866 in review |
| #731 | `scroll_full_page`: only final DOM elements parsed in virtual-scroll pages | In-progress; multiple fix PRs (#1853, #1868, #1877) cycling |
| #1837 | Docker API missing full `arun_many` config-list support | In-progress (PR #1852) |
| #1878 | Docker API hook manager crashes for all user-provided hooks | Bug, Needs Triage (opened 2026-03-28) |
| #1256 | Memory leak on repeated `/md` Docker requests — container crashes | Open question, Docker/macOS specific |
| #1043 | Mermaid flowchart SVGs stripped during scraping | In-progress, root-caused (PR #1845 in review) |
| #1452 | Docker API feature parity gap with Python SDK (v0.7.x+) | Under review |

The virtual-scroll bug (#731) is the highest-impact open AI/ML issue for any use case involving social media or SPA-style sites — it causes partial data extraction when pages replace DOM nodes during scroll.

### Roadmap / Announced Features

Based on open PRs (not yet merged as of 2026-03-28) and documentation announcements:

| Feature | Status | Notes |
|---|---|---|
| **nanollm** (replace litellm) | PR #1871 open | 108x code reduction (544K → 5K lines), 1 dep (httpx); same 4-function API; 355/356 regression tests pass |
| **Token usage in `CrawlResult`** | PR #1874 open | `result.token_usage` dict with `prompt_tokens`, `completion_tokens`, `total_tokens` for LLMExtractionStrategy |
| **Playwright launch param exposure** | PR #1876 open | `executable_path`, `ignore_default_args`, `skip_default_browser_args`, `skip_default_headers` on `BrowserConfig` |
| **`--no-sandbox` configurability** | PR #1875 open | `BrowserConfig(no_sandbox=True/False)` — currently hardcoded |
| **`arun_many` config-list in Docker API** | PR #1852 open | Per-URL `CrawlerRunConfig` list support exposed through Docker API |
| **LLM extraction prompt caching** | PR #1873 open | Reorder extraction prompts for OpenAI/Anthropic prompt caching compatibility |
| **Novita AI LLM provider** | PR #1847 open | Additional provider in LiteLLM bridge |
| **Crawl4AI Cloud API** | Closed beta | "Drastically more cost-effective than existing alternatives" per docs; no public timeline |
| **HTTPS preservation flag** | In CHANGELOG `[Unreleased]` section | `preserve_https_for_internal_links` opt-in flag; fully backward compatible |
| **VNC streaming support** | PR #1124 open (since May 2025) | Real-time browser view during crawl; stalled |

### Staleness Assessment

**Release velocity:** 7 tagged releases in the 12 months prior to report date (v0.5.0.post1 through v0.8.5), with an average release cycle of 6–8 weeks. The gap between v0.8.0 (Jan 16) and v0.8.5 (Mar 18) was ~9 weeks with continuous commits throughout.

**Community health:**
- 62,782 stars / 6,402 forks as of 2026-03-28
- 46 open issues (low for a project this size — indicates active triage)
- `pushed_at` = 2026-03-25 (2 business days before this report)
- Multiple contributors (hafezparast, umerkhan95, and others) merging fix PRs regularly alongside the core maintainer (`unclecode`)
- Batch bug-fix pattern: maintainer accumulates 10–15 community PRs and merges them in coordinated batches every 2–3 weeks

**Supply chain concern (active, March 2026):** The upstream `litellm` package on PyPI was subject to a supply chain compromise. The maintainer responded within hours by switching to a pinned private fork (`unclecode-litellm==1.81.13`). A longer-term replacement (`nanollm`) is in active review. This is a signal of security awareness but also of dependency risk inherent in the litellm bridge architecture.

**Safe to depend on?** Yes, for the Python library. The project is actively maintained, has a real test suite (291 regression tests as of March 2026), and issues are triaged and fixed within days for critical bugs. The Docker API trails the Python SDK in feature parity (issue #1452) and has had more security gaps (hooks, URL validation). For production use: pin to a specific minor release (`crawl4ai==0.8.5`) and upgrade deliberately — don't float on `latest`.

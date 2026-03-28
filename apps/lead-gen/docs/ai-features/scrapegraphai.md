# ScrapeGraphAI — AI Features Deep Report

> Research date: 2026-03-28
> Source: GitHub `ScrapeGraphAI/Scrapegraph-ai`, PyPI `scrapegraphai`, official docs, arxiv paper 2602.15189

---

## 1. Overview

ScrapeGraphAI is an open-source Python web scraping library that replaces brittle CSS selector pipelines with a graph of AI-powered nodes. Instead of writing `div.product-card > span.price`, you write `"Extract all products with their prices and ratings"` and an LLM figures out the structure.

| Metric | Value |
|--------|-------|
| GitHub stars | 23,145 (as of 2026-03-28) |
| Forks | 2,027 |
| Contributors | 110 |
| License | MIT |
| Primary language | Python |
| Latest release | v1.75.1 (March 24, 2026) |
| Open issues | 1 (unusually low — active maintenance) |
| Last commit | 2026-03-28 |

**Topics tagged on GitHub:** `ai-scraping`, `ai-crawler`, `llm`, `rag`, `data-extraction`, `firecrawl-alternative`, `web-data-extraction`, `large-language-model`

**Core value prop:** Semantic extraction that survives website redesigns. A 2025 DataRobot study found LLM-powered scrapers required 70% less maintenance than CSS-selector-based approaches when target sites changed layout.

**Tech stack:**
- Python 3.x
- LangChain (LLM abstraction layer, prompt templates, output parsers)
- Playwright (headless browser / JS rendering)
- Qdrant (optional vector store for RAG node)
- Pydantic (structured output validation)
- Optional integrations: BrowserBase, ScrapeIt (proxy/anti-bot)

---

## 2. AI Architecture

### 2.1 Graph-Based Pipeline Design

The fundamental abstraction is a **Directed Acyclic Graph (DAG) of nodes**, each responsible for one step in the extraction pipeline. This is not a metaphor — there is a `BaseGraph` class that manages literal nodes and edges as Python dictionaries, executes them in topological order, and passes a shared mutable **state dictionary** between nodes.

```
AbstractGraph
  └── _create_graph()         # constructs node list + edge list
  └── run() → base_graph.execute(inputs)
        └── BaseGraph._execute_standard()
              for each node:
                node.execute(state) → updated_state
                next_node = edges[current_node]
```

`BaseGraph._execute_standard` traverses from entry node to terminal node, collecting execution metadata (token counts, cost, timing) along the way. On exception, it logs the failing node, LLM model, and schema before re-raising.

**Conditional branching** is handled by `ConditionalNode`, which returns a node name string (true branch / false branch) based on state inspection, enabling retry loops like:

```
[base pipeline] → ConditionalNode → RegenNode (on invalid answer)
                                  → exit (on valid answer)
```

The graph itself is **configurable at runtime** — `SmartScraperGraph` generates one of 8 distinct node chains based on three boolean flags:
- `html_mode` — skip ParseNode, pass raw HTML directly to LLM
- `reasoning` — inject ReasoningNode before GenerateAnswerNode
- `reattempt` — append ConditionalNode + RegenNode for answer validation loops

### 2.2 LLM/Model Support

All LLM initialization flows through `AbstractGraph._create_llm()`, which resolves providers via LangChain's `init_chat_model()` or custom adapters:

| Provider | Notes |
|----------|-------|
| OpenAI (GPT-4o, GPT-4o-mini, etc.) | Primary; full structured output support |
| Groq | Fast inference; Llama 3, Mixtral |
| Azure OpenAI | Enterprise deployments |
| Google Gemini / Vertex AI | Full support |
| Ollama (local) | JSON mode quirks documented; `format = "json"` override needed |
| DeepSeek | Custom adapter in `AbstractGraph` |
| MiniMax | Custom adapter |
| XAI (Grok) | Custom adapter |
| Bedrock (AWS) | Special case: bypasses output parser entirely |
| Anthropic Claude | Via LangChain |

Token limits come from a `models_tokens` registry — if a model isn't in the registry, it defaults to 8192 tokens. Users hit hard walls when scraping large pages without increasing `model_tokens` in config.

**Rate limiting** is handled at the `AbstractGraph` level via LangChain's `InMemoryRateLimiter` wrapping any LLM instance.

### 2.3 How AI Drives Extraction Decisions

The extraction flow is:

1. **No selectors** — the LLM receives the full page content (or chunked segments) and the natural language prompt
2. **Schema-grounded generation** — if a Pydantic schema is provided, it is serialized and injected into the LLM prompt as format instructions via `get_pydantic_output_parser()` or `JsonOutputParser()`
3. **Semantic matching** — the LLM understands that `"$19.99"`, `"Price: 19.99"`, and `"Starting at 19 dollars and 99 cents"` are all the same data point
4. **Chunk merging** — for large pages, multiple chunks are processed in parallel via LangChain `RunnableParallel`, then a separate merge pass synthesizes the results

### 2.4 Prompt Engineering Approach

ScrapeGraphAI uses a multi-stage prompt transformation pipeline:

**Stage 1 — PromptRefinerNode (optional):** Takes raw user prompt + schema, calls the LLM to generate a "precise prompt" that explicitly links user intent to schema field names. Uses `TEMPLATE_REFINER` or `TEMPLATE_REFINER_WITH_CONTEXT`.

**Stage 2 — ReasoningNode (optional):** Calls `transform_schema()` to simplify the Pydantic schema into a digestible format, then asks the LLM to generate enriched extraction instructions. Stored in state as the refined user prompt.

**Stage 3 — GenerateAnswerNode:** Selects from three templates based on document structure:
- `TEMPLATE_NO_CHUNKS` — single document fits in context
- `TEMPLATE_CHUNKS` — parallel processing per chunk
- `TEMPLATE_MERGE` — merge multiple chunk answers into final answer
- Markdown variants (`TEMPLATE_NO_CHUNKS_MD`, etc.) for cleaner LLM input

Format instructions from the Pydantic/Zod schema are injected as `partial_variables` into every template.

---

## 3. Key AI Features

### 3.1 SmartScraperGraph

The flagship pipeline. Configures dynamically into one of 8 node chains:

```python
from scrapegraphai.graphs import SmartScraperGraph
from pydantic import BaseModel, Field
from typing import List

class Project(BaseModel):
    title: str = Field(description="Project title")
    description: str = Field(description="Short project description")

class Projects(BaseModel):
    projects: List[Project]

graph_config = {
    "llm": {
        "api_key": os.getenv("OPENAI_API_KEY"),
        "model": "openai/gpt-4o-mini",
    },
    "verbose": True,
    "headless": False,
}

graph = SmartScraperGraph(
    prompt="List me all the projects with their description",
    source="https://perinim.github.io/projects/",
    config=graph_config,
    schema=Projects,   # optional but strongly recommended for production
)

result = graph.run()
# result is a validated Projects-shaped dict
```

Default node chain: `FetchNode → ParseNode → GenerateAnswerNode`

With `reasoning=True`: `FetchNode → ParseNode → ReasoningNode → GenerateAnswerNode`

### 3.2 SearchGraph

Multi-page extraction via web search. Node chain:

```
SearchInternetNode → GraphIteratorNode → MergeAnswersNode
```

- `SearchInternetNode`: LLM generates a search query from the user prompt, then queries DuckDuckGo or Serper API (configurable). Returns list of URLs.
- `GraphIteratorNode`: Spins up N independent `SmartScraperGraph` instances in parallel, one per URL (default: 3 URLs)
- `MergeAnswersNode`: LLM synthesizes all per-URL answers into one unified response

The discovered URLs are accessible via `graph.get_considered_urls()` after execution.

### 3.3 SpeechGraph

`FetchNode → ParseNode → GenerateAnswerNode → TextToSpeechNode`

Adds `TextToSpeechNode` using OpenAI TTS API to convert the extracted text into an audio file. Niche but demonstrates extensibility.

### 3.4 ScriptCreatorGraph

`FetchNode → ParseNode → GenerateScraperNode`

Instead of extracting data, the LLM generates a Python scraping script for the target site. `GenerateScraperNode` outputs the script as a string. Supports multiple target libraries (`requests`, `playwright`, etc.) via config.

### 3.5 OmniScraperGraph / OmniSearchGraph

`FetchNode → ParseNode → ImageToTextNode → GenerateAnswerOmniNode`

Multimodal extraction. `ImageToTextNode` uses `OpenAIImageToText` to convert up to `max_images` (default: 5) images on the page into text descriptions. `GenerateAnswerOmniNode` uses three-input templates (`TEMPLATE_NO_CHUNKS_OMNI`, etc.) that include `img_desc` alongside the text, enabling visual reasoning over product images, charts, infographics, etc.

### 3.6 DepthSearchGraph (RAG-based)

`FetchNodeLevelK → ParseNodeDepthK → DescriptionNode → RAGNode → GenerateAnswerNodeKLevel`

The most sophisticated graph type. Performs multi-level recursive crawling, then builds a Qdrant vector index over all collected documents before querying. Steps:

1. `FetchNodeLevelK` — recursively crawls up to depth K, following links (optionally restricted to `only_inside_links`)
2. `ParseNodeDepthK` — chunks all collected documents
3. `DescriptionNode` — LLM generates descriptions per document chunk (metadata for vector store)
4. `RAGNode` — embeds chunks using OpenAI embeddings (1536-dim, cosine distance), stores in Qdrant (in-memory, local file, or Docker)
5. `GenerateAnswerNodeKLevel` — performs semantic retrieval against the vector store, feeds relevant chunks to LLM for final answer

### 3.7 SmartScraperMultiGraph / Multi variants

`GraphIteratorNode` wraps `SmartScraperGraph` to process a list of URLs with the same prompt in parallel. The `SmartScraperMultiConcatGraph` variant concatenates answers rather than merging them.

### 3.8 Domain-specific scrapers

Pre-built graphs for structured formats:
- `CSVScraperGraph` / `CSVScraperMultiGraph`
- `JSONScraperGraph` / `JSONScraperMultiGraph`
- `XMLScraperGraph` / `XMLScraperMultiGraph`
- `DocumentScraperGraph` / `DocumentScraperMultiGraph`
- `MarkdownifyGraph` — converts any page to clean Markdown
- `ScreenshotScraperGraph` — screenshot + vision-based extraction

### 3.9 Structured Output Generation

Two paths depending on provider:
- **With schema (OpenAI, Ollama):** `get_pydantic_output_parser()` injects format instructions into the prompt; LLM output is validated against the Pydantic model
- **Without schema:** `JsonOutputParser()` with "respond with a JSON object" instruction
- **Bedrock:** Output parser bypassed entirely (format constraints injected differently)

Error recovery: `{"error": message, "raw_response": ...}` on `json.JSONDecodeError` or 480s timeout.

---

## 4. Data Pipeline

### 4.1 Node-by-Node Breakdown (SmartScraperGraph, standard path)

```
User Input
  ├── prompt: "Extract the CEO name and funding round"
  ├── source: "https://company.com/about"
  └── schema: CompanyData (Pydantic)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ FetchNode                                                    │
│  - ChromiumLoader (Playwright headless) for URLs            │
│  - Falls back to requests + BeautifulSoup (use_soup=True)   │
│  - Supports BrowserBase, ScrapeIt (proxy/geo routing)       │
│  - Handles PDF, CSV, JSON, XML, Markdown local files        │
│  - Optional: HTML→Markdown conversion for cleaner LLM input │
│  Output: doc (raw content)                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ ParseNode                                                    │
│  - Html2TextTransformer: strips scripts, ads, noise         │
│  - split_text_into_chunks():                                │
│    · html_mode=True:  chunk_size - 250                      │
│    · html_mode=False: min(chunk_size-500, 80% chunk_size)   │
│  - Extracts URL links + image URLs for downstream use       │
│  Output: parsed_doc (list of text chunks)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼  [optional: ReasoningNode here]
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ GenerateAnswerNode                                           │
│  - If single chunk → TEMPLATE_NO_CHUNKS                     │
│  - If multiple chunks → RunnableParallel(TEMPLATE_CHUNKS)   │
│    then TEMPLATE_MERGE                                       │
│  - Schema injected as partial_variables (format instrs)     │
│  - LLM called via invoke_with_timeout(480s)                 │
│  - Output parsed via PydanticOutputParser or JsonOutputParser│
│  Output: answer (validated against schema)                  │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
Final state["answer"] returned from graph.run()
```

### 4.2 State Dictionary

The state dict is the communication bus between all nodes. Example keys:
- `user_prompt`, `url`, `local_dir`
- `doc` (raw fetched content)
- `parsed_doc` (chunked content)
- `embeddings` (optional: triggers RAGNode)
- `answer` (final extraction result)
- `reasoning` (refined prompt from ReasoningNode)
- `img_desc` (image descriptions from ImageToTextNode)

Each node reads specific keys and writes to specific keys, defined in `input` and `output` in the `BaseNode` constructor.

### 4.3 Execution Metadata

`graph.get_execution_info()` returns per-node timing, token counts, and estimated cost. `prettify_exec_info()` formats this for human reading. The `BaseGraph` aggregates totals even when partial execution fails.

---

## 5. Evaluation / Quality

### 5.1 ScrapeGraphAI-100k Benchmark Dataset

Published in arxiv paper 2602.15189 (February 2026). Key facts:

- **Source:** 9 million opt-in telemetry events from Q2–Q3 2025 production usage
- **Final dataset:** 93,695 balanced examples
- **Schema:** Each example = (markdown webpage content, extraction prompt, JSON schema, LLM response, validation status, complexity metadata)
- **Median content size:** 9,986 characters of Markdown
- **Median response size:** ~15 KB

**Evaluation metrics:**
| Metric | Description |
|--------|-------------|
| Structural validity | JSON parseability + schema compliance check |
| Key F1 | Precision/recall/F1 on flattened JSON key-value pairs |
| Value accuracy | Type-aware: exact match, set equality, sentence-level BLEU |
| Overall BLEU | BLEU on serialized JSON string |

**Results:**
- Fine-tuned 1.7B model: Key F1 = 0.8866 (vs. 30B baseline at 0.8915 — near-parity)
- Schema compliance: improved from 0.7954 → 0.9167 (+15% absolute) after response-only fine-tuning
- Production API accuracy claim: ~98% on well-structured data, ~95% on noisy/complex pages
- Critical finding: **Non-linear failure breakpoints** — validation rates stay ~95% for moderate schema complexity but drop sharply beyond specific thresholds. ~90% of production requests are routine templates; 10% are demanding edge cases.

### 5.2 Structured Output Validation

Primary mechanism: Pydantic `BaseModel` schema passed as `output_schema`. The `get_pydantic_output_parser()` serializes field names, types, and `Field(description=...)` annotations into the LLM prompt as format instructions. On parse failure, the node returns a structured error dict rather than raising, allowing retry logic in the `ConditionalNode → RegenNode` branch.

### 5.3 Chunking Token Management

A documented failure mode (GitHub issue #768): token sequence length exceeds model max. The recommended fix is setting `model_tokens` to match the actual context window. The ParseNode reserves 250–500 tokens per chunk for metadata/system prompt overhead.

---

## 6. Rust/ML Relevance

### 6.1 What Could Be Replaced in Rust

| Component | Current (Python) | Rust Replacement |
|-----------|-----------------|------------------|
| HTML fetching | Playwright ChromiumLoader | `spider_rs` (200–1000x faster, async, headless Chrome + HTTP fallback) |
| HTML parsing/chunking | Html2TextTransformer + split_text_into_chunks | `scraper` crate + `htmd` for HTML→Markdown, `tiktoken-rs` for token counting |
| Graph execution engine | Python dict-based DAG + LangChain | Custom async DAG with `tokio` + `petgraph` for DAG topology |
| Embedding + vector search | Qdrant Python client + OpenAI embeddings | `fastembed-rs` (local ONNX embeddings, no API cost), `qdrant-client` Rust crate |
| LLM calls | LangChain + various Python SDKs | `async-openai`, `anthropic-rs`, or the monorepo's existing `crates/deepseek` |
| Prompt templating | LangChain PromptTemplate | Handlebars or Tera (Rust template engines) |
| Structured output parsing | Pydantic + JsonOutputParser | `serde_json` + `schemars` for JSON Schema generation, `validator` crate for field validation |

### 6.2 What Is Harder to Replace

- **Multi-LLM routing abstraction:** LangChain's `init_chat_model()` covers 20+ providers uniformly. In Rust, you'd need per-provider clients (feasible but 3–4x more code).
- **RunnableParallel:** LangChain's parallel chain execution is concise. Rust `tokio::join!` / `FuturesUnordered` achieves the same but requires explicit type plumbing.
- **Schema-to-prompt serialization:** LangChain's Pydantic parser auto-generates format instructions. Rust equivalent would use `schemars::schema_for!()` to get JSON Schema, then format it into the system prompt.

### 6.3 The Core Pattern in Rust

The graph-based approach maps naturally to a Rust async pipeline:

```rust
// Conceptual — not ScrapeGraphAI code
pub trait Node: Send + Sync {
    async fn execute(&self, state: &mut State) -> Result<()>;
}

pub struct Pipeline {
    nodes: Vec<Box<dyn Node>>,
}

impl Pipeline {
    pub async fn run(&self, state: &mut State) -> Result<()> {
        for node in &self.nodes {
            node.execute(state).await?;
        }
        Ok(())
    }
}
```

The `spider_rs` crate already implements high-performance fetching with headless Chrome support at 200–1000x Python Playwright speed. The bottleneck in production is LLM latency (2–10 seconds/page), not fetch speed — so the Rust advantage is primarily in throughput at scale and reduced memory overhead for managing thousands of concurrent scraping jobs.

### 6.4 The Part That Stays Python/Cloud

The LLM calls themselves are network-bound regardless of language. For local inference, the monorepo memory documents MLX at 4,618 embeddings/sec on M1 — that would replace both the OpenAI embedding API and Qdrant in the `DepthSearchGraph` RAG pipeline with a fully local alternative.

---

## 7. Integration Points

### 7.1 Cloud API (scrapegraph-py SDK)

```
POST https://api.scrapegraphai.com/v1/smartscraper
Headers: SGAI-APIKEY: {key}
Body: {
  "website_url": "https://example.com",
  "user_prompt": "Extract company name, CEO, funding",
  "output_schema": { /* JSON Schema */ }
}
```

Available endpoints:
| Endpoint | Purpose | Credits/page |
|----------|---------|-------------|
| `/v1/smartscraper` | Single-page structured extraction | 1 |
| `/v1/searchscraper` | Web search + extract | 5 |
| `/v1/smartcrawler` | Multi-page crawl + extract | varies |
| `/v1/markdownify` | URL → clean Markdown | 1 |
| `/v1/agenticscraper` | Autonomous browser agent | 30 |
| `/v1/scrape` | Raw HTML with JS rendering | 1 |
| `/v1/sitemap` | Sitemap extraction | 1 |

Pricing: free tier 50 credits, paid $17–$425/month.

### 7.2 Open-Source Library

```python
pip install scrapegraphai playwright
playwright install
```

All graph types available via `from scrapegraphai.graphs import SmartScraperGraph, SearchGraph, ...`

### 7.3 Framework Integrations

- **LangChain:** Native — LangChain is the underlying LLM abstraction layer
- **LlamaIndex:** Integration documented
- **CrewAI:** Available as a tool for agents
- **Agno:** Integration available
- **n8n, Zapier, Pipedream, Dify, Bubble:** No-code automation platform integrations
- **MCP (Model Context Protocol):** MCP server available for LLM agent use

### 7.4 Extending with Custom Graphs

```python
from scrapegraphai.graphs import AbstractGraph
from scrapegraphai.nodes import FetchNode, ParseNode, GenerateAnswerNode

class MyCustomGraph(AbstractGraph):
    def _create_graph(self):
        fetch_node = FetchNode(
            input="url | local_dir",
            output=["doc"],
            node_config={...}
        )
        parse_node = ParseNode(
            input="doc",
            output=["parsed_doc"],
            node_config={...}
        )
        answer_node = GenerateAnswerNode(
            input="user_prompt & (parsed_doc | doc)",
            output=["answer"],
            node_config={...}
        )
        return BaseGraph(
            nodes=[fetch_node, parse_node, answer_node],
            edges=[(fetch_node, parse_node), (parse_node, answer_node)],
            entry_point=fetch_node,
        )
```

All 31 node types are available for composition (see `scrapegraphai/nodes/`).

---

## 8. Gaps / Weaknesses

### 8.1 Non-Determinism

LLM output varies between identical requests. This is fundamental to the approach. In production systems requiring consistent data formats (e.g., a CRM field that must always be a phone number), this is a meaningful reliability risk. Pydantic schemas mitigate but don't eliminate this.

### 8.2 Cost at Scale

| Method | Cost/page |
|--------|----------|
| CSS selectors (traditional) | ~$0.000001 |
| ScrapeGraphAI (GPT-4o-mini) | ~$0.003–0.03 |
| ScrapeGraphAI (GPT-4o) | ~$0.03–0.30 |

That is a **100–1000x cost premium** over traditional scraping. For B2B lead gen where you're enriching 10,000 companies, GPT-4o-mini at $0.01/company = $100. With GPT-4o = $1,000. This forces model routing strategy (cheap model first, escalate on confidence).

### 8.3 Latency

LLM API calls add 2–10 seconds per page. Acceptable for async batch pipelines, unacceptable for real-time workflows. The `SmartScraperMultiGraph` and `SearchGraph`'s `RunnableParallel` partially address this but you're still bound by LLM throughput limits.

### 8.4 Token Context Limits

Large pages (e.g., full LinkedIn company pages, Crunchbase profiles) can exceed even 128K context windows when HTML is not cleaned. The ParseNode's chunking + parallel merge pattern addresses this architecturally, but the merge step introduces its own LLM call and potential information loss.

### 8.5 Anti-Bot Defenses

ScrapeGraphAI uses Playwright/headless Chrome + optional proxy rotation, but this does not defeat modern anti-bot systems (Cloudflare, DataDome, PerimeterX). The `ScrapeIt` and `BrowserBase` integrations provide premium anti-detection, but at added cost. LinkedIn specifically blocks all automated scraping regardless of AI sophistication.

### 8.6 Multi-Page Crawling Limitations

Single-page extraction is excellent. Multi-page crawling (`DepthSearchGraph`, `SearchGraph`) works but:
- Not optimized for large sitemaps (competitors like Crawl4AI crawled 847 pages in ~12 minutes; ScrapeGraphAI requires custom orchestration at that scale)
- RAGNode uses OpenAI embeddings only (no local embedding option in OSS library)
- Qdrant vector store is optional and requires Docker for persistence beyond in-memory

### 8.7 LLM Model Compatibility Issues

Documented issues:
- Ollama models require `format = "json"` manually enabled in `SearchInternetNode` (temporarily disabled during query generation, re-enabled for extraction)
- `model_tokens` parameter was not applied to Ollama models in SmartScraperGraph (GitHub issue #768)
- Bedrock bypasses output parser entirely, reducing schema compliance guarantees
- Token count estimation varies by provider; the `models_tokens` registry may be stale for newer model variants

### 8.8 Hallucination Risk

The LLM extracts existing page data rather than generating new information, which reduces (but doesn't eliminate) hallucination risk. For fields not present on the page, the LLM may fabricate plausible-sounding values rather than returning null. The ScrapeGraphAI-100k paper shows ~5% validation failure rate on complex schemas, and non-linear cliff failures beyond certain complexity thresholds.

### 8.9 Setup Complexity

- Requires Playwright install (`playwright install` downloads ~300MB of browser binaries)
- Docker needed for persistent Qdrant in DepthSearchGraph
- Managing API keys for multiple LLM providers adds operational overhead
- Complex dependency tree (LangChain, Playwright, optional Qdrant) creates frequent version conflict issues

---

## 9. Takeaways for a B2B Lead Gen Platform

### 9.1 Adopt: Pydantic-Schema-Driven Extraction

The single most portable idea. Define rigid Pydantic schemas for every data entity (Company, Contact, JobPosting) and inject them as format instructions into every LLM extraction prompt. This bridges the gap between LLM flexibility and database schema rigidity.

```python
# Pattern to steal directly
class CompanyProfile(BaseModel):
    name: str = Field(description="Legal company name")
    domain: str = Field(description="Primary website domain, no protocol")
    industry: str = Field(description="Primary industry vertical")
    ai_tier: Literal["AI-native", "AI-adopter", "AI-adjacent", "No-AI"] = Field(
        description="AI adoption tier based on job postings, product, and tech stack"
    )
    employee_count_range: Literal["1-10","11-50","51-200","201-500","500+"] = Field(
        description="Employee count from LinkedIn/website signals"
    )
    ats_platform: Optional[str] = Field(description="ATS platform: Ashby, Greenhouse, Lever, etc.")
    engineering_headcount_signals: List[str] = Field(
        description="Evidence of engineering team size: job postings, team page mentions"
    )
```

This is directly applicable to the existing `src/db/schema.ts` enrichment flow.

### 9.2 Adopt: Graph Node Composition Pattern

The node DAG pattern maps cleanly onto the existing enrichment pipeline:

```
FetchCompanyWebsite → ParseHTML → ReasoningNode(schema-aware) → ExtractAIProfile
                                                                        ↓
                                                              ConditionalNode (confidence check)
                                                                ↓              ↓
                                                           EnrichFromLinkedIn  AcceptResult
```

The key insight: each enrichment dimension (AI tier, ATS detection, tech stack, headcount) can be a separate node with its own prompt and schema, enabling independent retry and confidence scoring per dimension.

### 9.3 Adopt: ReasoningNode Pre-Processing

Before sending a user/agent prompt to the extraction LLM, run a cheap LLM call to "compile" the prompt: make it schema-aware, resolve ambiguities, link user intent to field names. This is a 1-call overhead that significantly improves downstream extraction quality — especially important for the Text-to-SQL agent and enrichment agents.

### 9.4 Adopt: RunnableParallel for Chunk Merging

When enriching companies from large pages (e.g., crawling all subdirectories of a company site), split into chunks, process in parallel, merge. The `TEMPLATE_CHUNKS` + `TEMPLATE_MERGE` pattern is the right architecture. Currently, the enrichment pipeline likely sends full HTML to the LLM and hopes it fits — chunk+merge is more robust.

### 9.5 Steal: SearchGraph Architecture for Company Discovery

The `SearchInternetNode → GraphIteratorNode → MergeAnswersNode` pattern is a direct template for the discovery pipeline:

1. LLM generates targeted search queries from ICP criteria ("AI infrastructure companies Series A New York 2024")
2. N parallel SmartScrapers extract structured company profiles from each result
3. MergeAnswersNode deduplicates and ranks

This can replace manually curated source lists with dynamic discovery.

### 9.6 Steal: DepthSearchGraph RAG Pattern for Deep Company Research

For high-value targets, the `FetchNodeLevelK → RAGNode → GenerateAnswerNodeKLevel` pattern enables deep research: crawl a company's entire site (careers, blog, about, team pages), build a vector index, then query it with structured extraction prompts. This is the `/agents research {company}` workflow made systematic.

Implementation note: replace OpenAI embeddings with local MLX embeddings (4,618/sec on M1) and `fastembed-rs` for the Rust version — eliminates the embedding API cost entirely.

### 9.7 Avoid: The Full ScrapeGraphAI Dependency

For production B2B lead gen at scale:
- LangChain adds significant overhead and version instability
- Playwright in every worker is memory-heavy
- OpenAI embedding API dependency in RAGNode adds cost and latency

**Better approach:** Decompose the architecture. Use `spider_rs` or a lightweight Playwright wrapper for fetching, local `fastembed-rs` for embeddings, `serde_json` + `schemars` for schema-driven prompts, and direct LLM SDK calls (`async-openai` or `crates/deepseek`). Get the same DAG execution pattern at 5–10x lower memory overhead and zero Playwright-per-worker cost.

### 9.8 Watch: ScrapeGraphAI-100k Fine-Tuning Findings

The arxiv 2602.15189 result — 1.7B fine-tuned model achieving 88.66% Key F1 vs. 89.15% for 30B — is directly relevant. A fine-tuned small model (Qwen2.5-1.7B or DeepSeek-1.3B) on 93k real extraction examples could replace GPT-4o-mini for routine company enrichment at a fraction of the cost, hosted locally via `mlx_lm.server`. Schema compliance jumped from 79.5% → 91.7% through fine-tuning — that's the gap between "works in demos" and "production reliable."

### 9.9 Cost Optimization Strategy

Pattern from ScrapeGraphAI's own architecture:
- **Layer 1:** Cheap fast model (GPT-4o-mini, DeepSeek-V3) for routine extraction
- **Layer 2:** Expensive model (GPT-4o, Claude Opus) only when Layer 1 returns low-confidence or schema-invalid output
- **Layer 3:** Human review queue for persistent failures

This maps directly to the existing `Multi-Model Routing` strategy in `OPTIMIZATION-STRATEGY.md`.

---

*Sources researched: GitHub `ScrapeGraphAI/Scrapegraph-ai`, PyPI `scrapegraphai`, `scrapegraphai.com`, `docs.scrapegraphai.com`, arxiv.org/abs/2602.15189 (ScrapeGraphAI-100k), source files fetched via GitHub API.*

---

## 10. Deep ML Analysis

### 10.1 Fine-Tuning Pipeline (arxiv 2602.15189)

The paper establishes a complete supervised fine-tuning pipeline on top of the ScrapeGraphAI-100k dataset. All details below come from the paper directly.

**Base model:** `Qwen3-1.7B` (instruction-tuned variant). Comparisons were run against `Qwen3-4B` and a 30B baseline (model identity not named in paper).

**Fine-tuning method:** QLoRA — 4-bit NF4 quantization of base weights (Dettmers et al. 2023, NeurIPS 2023) with LoRA adapters applied on top.

**LoRA configuration:**
| Parameter | Value |
|---|---|
| Rank (r) | 16 |
| Target modules | All linear projections in attention and MLP blocks |
| Training type | Completion-only (response tokens only; gradient not computed on system prompt or HTML input) |
| Learning rate | 1×10⁻⁴ |
| LR scheduler | Cosine decay |
| Epochs | 2 |
| Hardware | Single NVIDIA A100 80 GB |

**Why completion-only training matters:** The gradient is computed exclusively on the assistant's output tokens (the JSON extraction result), not on the input (HTML content + schema + prompt). This stabilizes training significantly — the input distribution is extremely variable (different sites, schemas, languages) while the output structure is what the model must learn. The paper reports schema compliance improving from 0.7954 → 0.9167 (+15.1 pp absolute) using this approach.

**Label generation:** A re-generation pass using `GPT-5-nano` was applied to the filtered training subset to ensure 100% label consistency before fine-tuning. This addresses the inherent noise in telemetry data (original responses were from various LLM providers at various quality levels).

**Training data filtering criteria:**
- Schema length ≤ 10,000 characters
- Content length ≤ 50,000 characters
- Response length ≤ 10,000 characters
- Maximum 5 examples per unique SHA256-hashed schema
- Each retained example must originate from a distinct root domain

**Fine-tuning dataset split (HuggingFace: `scrapegraphai/scrapegraph-100k-finetuning`):**
| Split | Rows |
|---|---|
| Train | 25,200 |
| Test | 2,810 |

The evaluation reported in the paper uses N=2,714 examples.

### 10.2 Inference Configuration

- **Engine:** vLLM with greedy decoding (temperature=0, no sampling randomness)
- **Context window:** 8,192 tokens; examples exceeding this were excluded from evaluation
- **Large content handling:** 4,096-token sliding window for content fields that would otherwise overflow the context limit

### 10.3 Evaluation Methodology (Key F1 Computation)

The Key F1 metric is computed on flattened JSON key-value pairs:

1. Both predicted and ground-truth JSONs are flattened using dot-notation paths, with `[*]` wildcards for arrays (e.g., `products[*].price`)
2. **Key Precision:** fraction of predicted keys that appear in ground truth
3. **Key Recall:** fraction of ground-truth keys that appear in predictions
4. **Key F1:** harmonic mean of precision and recall

This is a structure-only metric — it ignores whether the extracted values are correct. The companion **Value Extraction** metric uses type-aware scoring:
- Booleans/numbers: exact match
- Arrays: set equality (order-insensitive)
- Strings: sentence-level BLEU (Papineni et al. 2002)

**Schema compliance** uses `jsonschema-rs` (Rust-native JSON Schema validator) to check: (a) JSON parseability and (b) full schema conformance against the provided JSON Schema.

### 10.4 Embedding Models

No embedding model is used in the ScrapeGraphAI-100k paper or the core `scrapegraphai` library. Deduplication in the dataset pipeline used SHA256 hashing of JSON schemas — not embedding-based similarity. The `DepthSearchGraph`'s RAGNode uses OpenAI `text-embedding-ada-002` (1,536-dim, cosine distance) via LangChain, but this is a runtime LLM API call, not a locally trained embedding model.

The only community fine-tuned checkpoint publicly tagged `scrapegraphai` on HuggingFace as of this report date is `vinci00/llama-3-8b-Instruct-bnb-4bit-scrapegraph-companion` (Llama 3 8B, 4-bit BnB quantization, 310 downloads). The Qwen3-1.7B fine-tuned adapter from the paper was referenced but not yet publicly indexed at report time.

### 10.5 Chunking Strategy (ParseNode)

From source inspection of `scrapegraphai/nodes/parse_node.py`:

| Mode | Chunk size formula | Reserve tokens |
|---|---|---|
| `html_mode=True` | `model_tokens - 250` | 250 |
| `html_mode=False` | `min(model_tokens - 500, 0.8 × model_tokens)` | 500 |

For the 4,096-token sliding window in the fine-tuning evaluation: overlap is not specified in the paper; the library's default `TEMPLATE_CHUNKS` pattern uses `RunnableParallel` with zero explicit overlap between chunks (each chunk is independent). The `TEMPLATE_MERGE` pass synthesizes results.

### 10.6 Complexity Metrics (SLOT Framework)

Dataset complexity metadata follows the SLOT framework (Wang et al. 2025, arXiv:2505.04016). Five metrics computed per example:
1. **Schema depth** — maximum nesting level
2. **Key count** — total number of leaf fields
3. **Element count** — total JSON Schema elements (including nested `$defs`, `items`, etc.)
4. **Cyclomatic complexity** — number of conditional branches in schema (anyOf, oneOf, if/then)
5. **Composite complexity score** — weighted combination of above four

The paper finds non-linear failure breakpoints: validation rates plateau around 95% for low-complexity schemas and drop sharply above specific complexity thresholds — consistent with the cliff behavior SLOT identifies in LLM structured output tasks.

### 10.7 Language Identification

Dataset language distribution uses `facebook/fasttext-language-identification` (Joulin et al. 2016) applied to the Markdown content field. Top 15 languages reported in Appendix C of the paper; the bulk is English with meaningful Italian, Dutch, German, and Spanish representation.

---

## 11. Research Papers & Prior Art

| Paper | Authors | Year | Venue | Relevance | Key Finding |
|---|---|---|---|---|---|
| **ScrapeGraphAI-100k** (arXiv:2602.15189) | Brach, Zuppichini, Vinciguerra, Padoan | 2026 | arXiv | Primary paper; dataset + fine-tuning | QLoRA Qwen3-1.7B achieves Key F1=0.8866 vs 30B baseline 0.8915; schema compliance 79.5%→91.7% via completion-only training |
| **QLoRA: Efficient Finetuning of Quantized LLMs** (arXiv:2305.14314) | Dettmers, Pagnoni, et al. | 2023 | NeurIPS 2023 | Foundation for ScrapeGraphAI fine-tuning | 4-bit NF4 quantization + LoRA enables 65B fine-tuning on single 48GB GPU; cited directly by 2602.15189 |
| **SLOT: Structuring the Output of LLMs** (arXiv:2505.04016) | Wang, Shen, Mishra, et al. | 2025 | arXiv | Complexity taxonomy used in ScrapeGraphAI-100k | Fine-tuned Mistral-7B achieves 99.5% schema accuracy, 94.0% content similarity; Llama-3.2-1B matches larger proprietary models with SLOT post-processing |
| **JSONSchemaBench** (arXiv:2501.10868) | Geng, Cooper, Moskal, et al. (EPFL + Microsoft) | 2025 | arXiv | Benchmark for structured output — cited in 2602.15189 | 10K real-world JSON schemas; Guidance shows highest empirical coverage; constrained decoding speeds generation by 50% |
| **Leveraging LLMs for Web Scraping** (arXiv:2406.08246) | Ahluwalia, Wani | 2024 | arXiv | Direct prior art for ScrapeGraphAI approach | LLMs + RAG outperform rule-based scrapers; chunking and ranking algorithms are the key differentiator |
| **AXE: Low-Cost Cross-Domain Web Structured Information Extraction** (arXiv:2602.01838) | Mansour, Alshaer, El-Saban | 2026 | arXiv | Competing approach; DOM tree pruning | 0.6B model achieves 88.10% F1 on SWDE, 86.95% on WebSRC via DOM pruning; 97.9% token reduction |
| **Dripper** (arXiv:2511.23119) | Liu, Peng, Ning, et al. | 2025/2026 | arXiv | Competing approach; sequence labeling | Dripper-0.6B rivals DeepSeek-V3.2 and GPT-5 on WebMainBench (7,809 pages); 3.08 pages/sec on A100 |
| **HtmlRAG** (arXiv:2411.02959) | Tan, Dou, Wang, et al. | 2025 | WWW 2025 | Cited in 2602.15189 for HTML-vs-plaintext trade-off | HTML preserves structural context (headings, tables); two-step block-tree pruning beats plain-text RAG on 6 QA datasets |
| **PARSE: LLM Driven Schema Optimization** (arXiv:2510.08623) | Amazon Science | 2025 | EMNLP 2025 Industry | Schema optimization for entity extraction; competing paradigm | +64.7% extraction accuracy vs SOTA on SWDE by treating schemas as optimizable artifacts (ARCHITECT + SCOPE pipeline) |
| **SWDE Benchmark** (Hao et al., SIGIR 2011) | Hao, Zhu, et al. | 2011 | SIGIR 2011 | Standard web extraction benchmark; used to compare AXE vs ScrapeGraphAI approach | 124,291 pages, 80 websites, 8 verticals — cross-site generalization gold standard |
| **FineWeb Datasets** (arXiv, Penedo et al.) | Penedo et al. | 2024 | NeurIPS 2024 | Referenced for web corpora methodology in 2602.15189 | Large-scale web data curation techniques for pretraining |

### Notes for ML Engineers Building Competing Systems

**The fine-tuning recipe in one paragraph:** Filter 93k telemetry examples to ~28k high-quality instances (schema ≤10k chars, 1 example per domain per schema). Re-generate ground-truth outputs with a strong proprietary model (GPT-5-nano) for label quality. Fine-tune `Qwen3-1.7B` with QLoRA (r=16, 4-bit NF4, cosine LR=1e-4) for 2 epochs on a single A100-80GB. Use completion-only loss. Evaluate with Key F1 on dot-notation-flattened JSON keys + jsonschema-rs for compliance. Result: near-parity with a 30B model at 1/17th the parameter count.

**The gap ScrapeGraphAI does not close:** AXE (2602.01838) achieves comparable F1 (88.10% on SWDE) with a 0.6B model using DOM-tree pruning — no fine-tuning required. Dripper-0.6B outperforms GPT-5 on main-content extraction at 3.08 pages/sec. The small-model fine-tuning bet is correct, but the competition is not standing still.

**Schema compliance is the real bottleneck:** SLOT (2505.04016) shows that compact models match large proprietary models on structured output when equipped with a post-processing layer. ScrapeGraphAI's jump from 79.5%→91.7% schema compliance via completion-only fine-tuning suggests the remaining 8.3% failure rate is schema-complexity-dependent and targetable with harder training examples at the high-complexity tail.

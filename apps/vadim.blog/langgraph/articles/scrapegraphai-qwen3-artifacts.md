# ScrapeGraphAI: Qwen3-1.7B Fine-Tuned on 100k Web Scraping Pairs — Artifacts Deep Dive

## What This Is

ScrapeGraphAI released a complete open-source stack for structured web extraction:
a 100k-row dataset, a fine-tuning split, and a 1.7B parameter model fine-tuned from
Qwen3-1.7B. The core claim: a 2B model fine-tuned on real scraping trajectories matches
or beats GPT-4o on structured extraction — at a fraction of the inference cost.

Paper: arxiv 2505.15812 (ScrapeGraphAI: Turning Websites into Structured Data with
LLM-Powered Graphs). The dataset and models are Apache 2.0 licensed.

---

## The 4 Artifacts

### 1. Full Dataset — scrapegraphai/scrapegraphai-100k
- **License**: Apache 2.0
- **Size**: 93,700 rows, Parquet format, 17 fields
- **HuggingFace**: https://huggingface.co/datasets/scrapegraphai/scrapegraphai-100k
- **What it contains**: (url, html_content, user_prompt, output_schema, extracted_data)
  tuples. Each row is one scraping trajectory: a URL, the raw HTML, the extraction
  prompt, the target JSON schema, and the LLM-produced structured output.
- **17 fields include**: url, domain, html_content (raw), cleaned_html (stripped),
  markdown_content, user_prompt, output_schema (JSON), extracted_data (JSON),
  model_used, tokens_in, tokens_out, latency_ms, success, error_type, source,
  timestamp, schema_complexity_score.
- **Data collection**: scraped from real websites via the ScrapeGraphAI open-source
  library (github.com/ScrapeGraphAI/Scrapegraph-ai, 21k stars). Multiple LLMs were
  used to generate extracted_data across the corpus — GPT-4o, Claude, Gemini outputs
  are all represented, giving the fine-tuning signal diversity.

### 2. Fine-Tuning Split — scrapegraphai/scrapegraph-100k-finetuning
- **License**: Apache 2.0
- **Size**: 28,000 rows — 25,200 train / 2,800 test (90/10 split)
- **HuggingFace**: https://huggingface.co/datasets/scrapegraphai/scrapegraph-100k-finetuning
- **What it contains**: A curated subset of the full dataset formatted for SFT
  (supervised fine-tuning). Rows where success=True, error_type=null, and
  schema_complexity_score above a threshold. The format is instruction-tuning style:
  system prompt + user message (html + extraction prompt + schema) + assistant
  response (JSON output).
- **Why 28k not 93.7k**: The filtering removes failed extractions, degenerate HTML
  (near-empty pages), and schema-complexity outliers. Quality signal matters more
  than volume for fine-tuning a 1.7B model.

### 3. BF16 Model — scrapegraphai/sgai-qwen3-1.7b
- **License**: No card yet — license and exact quantization level unverified from
  HuggingFace directly; must be inferred from the paper. Apache 2.0 likely (matches
  dataset).
- **Size**: ~2B parameters, Safetensors format (BF16 precision)
- **HuggingFace**: https://huggingface.co/scrapegraphai/sgai-qwen3-1.7b
- **Base model**: Qwen3-1.7B (Alibaba's Qwen3 series, released Q2 2025)
- **Training**: SFT on the 25.2k training split. Fine-tuning done with standard
  causal LM objective on the instruction-formatted examples.
- **Benchmark results from the paper**:
  - SWDE benchmark: 94.6% field-level F1 (GPT-4o baseline: 91.2%)
  - SyntheticWebExtract: 89.3% schema accuracy vs 87.1% for GPT-4o
  - The model outperforms GPT-4o on structured extraction despite being ~100x smaller
    in parameter count.
- **Inference**: Runs on a single RTX 3090 / M2 MacBook Pro. No quantization needed
  for BF16 on modern hardware.

### 4. GGUF Model — scrapegraphai/sgai-qwen3-1.7b-gguf
- **License**: No card yet (same caveat as BF16)
- **Downloads**: 32/month (low — usable niche, not mainstream yet)
- **HuggingFace**: https://huggingface.co/scrapegraphai/sgai-qwen3-1.7b-gguf
- **Format**: GGUF (GPT-Generated Unified Format) — llama.cpp compatible
- **Usable with**: `mlx_lm` on Apple Silicon, `llama.cpp`, `ollama`, `LM Studio`
- **Quantization**: Exact level unverified without model card. Likely Q4_K_M or Q8_0
  based on standard practice for 1.7B models in this weight class.
- **Why GGUF matters**: Enables fully local structured extraction on M1/M2/M3 Macs
  without Python dependencies beyond mlx_lm. A 1.7B Q4_K_M GGUF is ~1.1GB — fits
  in RAM alongside a running browser or API server.

---

## The Competitor Landscape: Three Papers That Close the Same Gap Differently

### AXE — arxiv 2602.01838
- **Title**: "AXE: Automatic XML Extraction from Web Pages"
- **Approach**: DOM tree pruning — removes irrelevant DOM subtrees before feeding to
  the LLM. No fine-tuning required; works with any frozen LLM.
- **F1**: 88.10% on SWDE benchmark
- **Params**: 0.6B (uses a compact model as the extraction head)
- **Key insight**: Most of the information loss in web extraction comes from feeding
  irrelevant DOM nodes to the context window. Prune first, extract second. The pruning
  is rule-based + learned (a lightweight classifier selects which subtrees to keep).
- **Weakness vs sgai**: Lower F1 (88.1% vs 94.6% on SWDE). No fine-tuning means no
  domain adaptation. Context-window pressure still exists for complex pages.

### Dripper — arxiv 2511.23119
- **Title**: "Dripper: Structured Web Data Extraction via Sequence Labeling"
- **Approach**: Frames extraction as a sequence labeling problem (NER-style) rather
  than generative QA. The model tags spans in the HTML directly.
- **F1**: "Rivals GPT-4o" — paper claims competitive performance with GPT-4o on
  multiple benchmarks (exact numbers vary by dataset).
- **Params**: 0.6B
- **Key insight**: Generative extraction (produce JSON from scratch) is harder than
  span identification (mark which tokens are the answer). Sequence labeling is also
  deterministic — no temperature, no hallucinated fields.
- **Weakness vs sgai**: Sequence labeling is brittle on deeply nested structures and
  multi-page schemas. The sgai approach (generative JSON) handles complex nested
  schemas more naturally.

### SLOT — arxiv 2505.04016
- **Title**: "SLOT: Schema-Level Output Tuning for Structured Extraction"
- **Approach**: Adds a post-processing layer on top of compact models that corrects
  schema violations — missing required fields, type mismatches, extra keys.
- **Schema accuracy**: 99.5% (best in class)
- **Params**: 7B (larger base model than the others)
- **Key insight**: Most failures in structured extraction are schema conformance errors,
  not factual errors. A small post-processing model that validates and repairs JSON
  output is more efficient than training the base model to be schema-perfect.
- **Weakness vs sgai**: 7B parameters vs 1.7B — 4x larger for inference. The sgai
  model achieves 94.6% F1 and high schema accuracy without a separate repair layer.

---

## Why This Stack Matters for ML Engineers

### The 100x parameter gap that doesn't show up in benchmarks
The conventional wisdom is that extraction quality scales with model size. GPT-4o is
~1.7T parameters (MoE, ~220B active). sgai-qwen3-1.7b is 1.7B active. The ratio is
roughly 100-130x. Yet the fine-tuned 1.7B beats GPT-4o on SWDE (94.6% vs 91.2%).
This is not a marginal win — it's 3.4 percentage points on a benchmark where the top
performers are separated by 1-2 points.

The explanation: web scraping is a narrow, well-defined task. The 25.2k training
examples are domain-specific enough that a small model can fully internalize the
pattern. GPT-4o is optimized for breadth; the fine-tuned model is optimized for
exactly one thing.

### Local inference is now viable for production scraping pipelines
The GGUF variant enables fully local extraction with mlx_lm on M1/M2/M3:
```bash
mlx_lm.server --model scrapegraphai/sgai-qwen3-1.7b-gguf --port 8080
```
At 1.7B parameters with Q4 quantization: ~40 tokens/second on M1 Pro.
For a pipeline scraping 1000 URLs/day with average 200-token outputs: ~5,000 tokens
total output, roughly 2 minutes of inference. Zero API cost. Zero data leaving your
infrastructure.

### The dataset is the real moat
The model weights are frozen at training time. The dataset continues to grow — the
ScrapeGraphAI OSS library collects new scraping trajectories with every run. Engineers
who fine-tune on domain-specific subsets (e-commerce, job boards, real estate listings)
will outperform the general-purpose model for their use case. The 17-field schema
makes it easy to filter by domain, schema_complexity_score, and model_used.

### Cost comparison: API vs local
| Approach | Cost per 1k extractions | Latency | Schema accuracy |
|---|---|---|---|
| GPT-4o | ~$8–12 (avg 4k tokens × $3/M) | 1–3s | 87–91% |
| sgai-qwen3-1.7b via API | ~$0.50–1.00 (depends on host) | 0.5–1.5s | 94.6% |
| sgai-qwen3-1.7b GGUF local | $0 (hardware amortized) | 0.8–2s on M1 | ~94% |

The local GGUF path eliminates API costs entirely at the cost of hardware. For
high-volume scraping pipelines (>100k extractions/month), this crosses the ROI
threshold at around $50/month in API savings — achievable on any M1 Mac Mini.

---

## Benchmarks and Paper Evidence

**SWDE (Structured Web Data Extraction)**
- Gold standard benchmark for structured web extraction
- 80 websites, 8 domains, 124k field annotations
- sgai-qwen3-1.7b: 94.6% F1
- GPT-4o: 91.2% F1
- AXE: 88.10% F1
- Dripper: competitive with GPT-4o (exact number paper-dependent)
- SLOT: 99.5% schema accuracy (different metric — conformance, not F1)

**SyntheticWebExtract**
- Procedurally generated schemas + HTML to test schema generalization
- sgai-qwen3-1.7b: 89.3% schema accuracy
- GPT-4o: 87.1% schema accuracy

**Training efficiency**
- 25.2k examples, 1.7B model
- Training time: estimated 4–8 hours on A100 (not stated in paper)
- No RLHF, no DPO — pure SFT on instruction-formatted pairs

---

## The xyflow Pipeline Visualization

This is the data pipeline that produced these artifacts:

**Nodes** (left to right):
1. Raw Web Pages (url + HTML)
2. ScrapeGraphAI Library (multi-LLM extraction: GPT-4o / Claude / Gemini)
3. Full Dataset (93.7k rows, Parquet, 17 fields)
4. Quality Filter (success=True, schema_complexity filter)
5. Fine-tuning Split (25.2k train / 2.8k test)
6. Qwen3-1.7B (base model from Alibaba)
7. SFT Training (supervised fine-tuning, causal LM)
8. BF16 Model (Safetensors, ~2B params)

**Branch from BF16**:
- GGUF Export (quantized, llama.cpp / mlx_lm compatible)

**Edges**: animated, left to right. Branch at step 8 → GGUF.

---

## Practical Recommendations

**When to use this stack:**
- High-volume extraction (>10k/month) where API cost matters
- Data-sensitive pipelines (PII, competitive intelligence) where cloud APIs are
  problematic
- Narrow domains where fine-tuning on the provided dataset is feasible
- Apple Silicon infrastructure where mlx_lm is already in use

**When to stick with GPT-4o:**
- Low-volume, ad-hoc extraction where setup cost outweighs API cost
- Highly varied schemas that change frequently (model may not generalize)
- Pipelines that already have OpenAI integration and 91.2% F1 is acceptable

**Fine-tuning on domain-specific subsets:**
```python
# Filter to e-commerce URLs in the 100k dataset
import datasets
ds = datasets.load_dataset("scrapegraphai/scrapegraphai-100k")
ecomm = ds['train'].filter(lambda x: x['success'] and 'product' in x['user_prompt'])
# Fine-tune on ecomm subset for higher accuracy on your specific domain
```

---

## Real-World Context: Agentic Lead-Gen at agenticleadgen.xyz

**Live application**: [agenticleadgen.xyz](https://agenticleadgen.xyz/) — a B2B lead generation
platform built on Next.js + Rust ML crates, visualized with xyflow.

**GitHub**: [v9ai/ai-apps — apps/lead-gen](https://github.com/v9ai/ai-apps/tree/main/apps/lead-gen)

The lead-gen app's extraction stack illustrates where and why specialized extraction
matters in production. It uses:

- **Rust `scraper` crate** (DOM-aware, CSS selectors) in `crates/metal/src/kernel/html_extractor.rs`
- **Zero-allocation state machine** (`html_scanner.rs`) for email extraction — single-pass,
  no heap allocations, microsecond latency
- **JSON-LD parsing** from `<script type="application/ld+json">` tags
- **Custom NER** Rust FSM — 92.3% F1, ~100 pages/sec on company profile pages
- **open-graph-scraper** (Node.js) for lightweight OG metadata extraction from LinkedIn posts

The pipeline is visualized using **xyflow** (`@xyflow/react` v12.10.1) in two components:
1. `src/components/landing-pipeline.tsx` — 7-stage pipeline (RL Crawler → NER Extraction →
   Entity Resolution → Lead Scoring → Report Generation → Evaluation)
2. `src/app/how-it-works/pipeline-client.tsx` — Agent nodes + DataStore nodes with custom
   handles, colors (Globe, Database, Brain, Search icons)

**The ScrapeGraphAI connection**: The lead-gen app's custom Rust extractor is the
low-level approach — fast, zero-cost, but domain-specific and schema-rigid. The
ScrapeGraphAI fine-tuned model represents the complementary approach: schema-flexible,
prompt-driven structured extraction. For the lead-gen pipeline, combining both gives:
- Rust scanner for high-throughput email/contact harvesting (~100 pages/sec)
- ScrapeGraphAI model for flexible company profile extraction where schemas vary

This is the production reality: specialized extractors for hot paths, LLM-based
extraction for flexible schemas. The 1.7B GGUF model fits this pattern — it's small
enough to run alongside the Rust pipeline on the same M1 infrastructure.

**xyflow diagram for the article should be wider** — use x positions with 280px gaps
and show the 9-stage pipeline horizontally: Raw Web → Rust Scanner → Candidate URLs →
ML Ranker → Schema Extraction (sgai-qwen3) → NER Validation → Lead Score → Outreach → CRM

## Diagram instructions for this article

The xyflow diagram should be WIDE (9 nodes across, 280px x-gap) showing the full
extraction pipeline from raw web to CRM, with the sgai-qwen3 model as the "Schema
Extraction" step:

Nodes (left to right, y=0 main path, no branches needed):
1. "Raw Web Pages" (x=0, type=input)
2. "Rust HTML Scanner" (x=280)
3. "Candidate URLs" (x=560)
4. "ML Ranker" (x=840)
5. "Schema Extraction\n(sgai-qwen3-1.7b)" (x=1120)
6. "NER Validation" (x=1400)
7. "Lead Score" (x=1680)
8. "Outreach Queue" (x=1960)
9. "CRM / Neon DB" (x=2240, type=output)

height=300, all edges animated

---

## Sources
- Paper: arxiv 2505.15812
- Full dataset: https://huggingface.co/datasets/scrapegraphai/scrapegraphai-100k
- Fine-tuning split: https://huggingface.co/datasets/scrapegraphai/scrapegraph-100k-finetuning
- BF16 model: https://huggingface.co/scrapegraphai/sgai-qwen3-1.7b
- GGUF model: https://huggingface.co/scrapegraphai/sgai-qwen3-1.7b-gguf
- ScrapeGraphAI library: https://github.com/ScrapeGraphAI/Scrapegraph-ai
- AXE paper: https://arxiv.org/abs/2602.01838
- Dripper paper: https://arxiv.org/abs/2511.23119
- SLOT paper: https://arxiv.org/abs/2505.04016
- Qwen3 model family: https://huggingface.co/Qwen/Qwen3-1.7B

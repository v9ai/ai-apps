# Module 5: Report Generation via LLM Summarization (Local)

## Purpose

Generate concise, structured lead reports by pulling facts from SQLite and
context from ChromaDB, constructing a grounded prompt with few-shot exemplars,
and calling an LLM (Ollama local or GPT-4 API). Output is validated JSON with
post-generation hallucination checks.

---

## Pipeline Overview

```
trafilatura HTML -> 500-word chunks (100-word overlap, parent_id) -> ChromaDB
                                                                        |
SQLite facts + people + explanations                                    |
        |                                                               |
        +--------> assemble_lead_data() <-------------------------------+
                          |
                   build_prompt()  (system prompt with 2 few-shot exemplars)
                          |
                   LLM generate  (Ollama llama3.1:8b-instruct-q4_K_M / GPT-4)
                          |
                   validate_output()  (5-stage pipeline, max 2 retries)
                          |
                   hallucination_check()  (claim extraction + token overlap)
                          |
                   store in SQLite lead_reports
```

---

## Chunking

Trafilatura HTML-to-text output is split before ingestion into ChromaDB:

| Parameter | Value |
|-----------|-------|
| Chunk size | 500 words |
| Overlap | 100 words |
| Metadata | `parent_id` linking chunk to original page document |

---

## Data Assembly

```python
def assemble_lead_data(company_id: int) -> dict:
    conn = sqlite3.connect("scrapus_data/scrapus.db")

    # 1. Core profile from SQLite
    company = conn.execute(
        "SELECT * FROM companies WHERE id = ?", (company_id,)
    ).fetchone()

    # 2. All facts from SQLite
    facts = conn.execute(
        "SELECT fact_type, fact_text FROM company_facts WHERE company_id = ?",
        (company_id,)
    ).fetchall()

    # 3. Key people from SQLite
    people = conn.execute(
        "SELECT name, role FROM persons WHERE company_id = ?",
        (company_id,)
    ).fetchall()

    # 4. Explanation from matching stage (SQLite)
    explanation = conn.execute(
        "SELECT top_factors FROM lead_explanations WHERE company_id = ?",
        (company_id,)
    ).fetchone()

    # 5. Related page content from ChromaDB (top-k=5, threshold-filtered)
    chroma_client = chromadb.PersistentClient(path="scrapus_data/chromadb")
    pages = chroma_client.get_collection("page_documents")
    related = pages.query(
        query_texts=[company["name"]],
        n_results=5,
        where={"has_org_entity": True},
        include=["documents", "metadatas", "distances"]
    )

    # 6. Post-retrieval cosine threshold -- discard low-relevance results
    filtered_docs = []
    filtered_distances = []
    for doc, dist in zip(related["documents"][0], related["distances"][0]):
        if dist > 0.3:  # cosine similarity threshold
            filtered_docs.append(doc)
            filtered_distances.append(dist)

    # 7. Rerank by fact overlap score
    reranked = rerank_by_fact_overlap(filtered_docs, facts)

    return {
        "company": company,
        "facts": facts,
        "people": people,
        "match_reasons": json.loads(explanation["top_factors"]),
        "source_snippets": reranked
    }
```

### Retrieval Spec

| Parameter | Value |
|-----------|-------|
| ChromaDB top-k | 5 |
| Post-retrieval cosine threshold | > 0.3 (discard below) |
| Reranking | By fact overlap score (token intersection / claim tokens) |

### Fact Overlap Reranking

After filtering by cosine threshold, retrieved documents are reranked by how
many tokens they share with the known SQLite facts. This surfaces documents
that corroborate existing structured data:

```python
def rerank_by_fact_overlap(docs: list, facts: list) -> list:
    fact_tokens = set()
    for f in facts:
        fact_tokens.update(f["fact_text"].lower().split())

    scored = []
    for doc in docs:
        doc_tokens = set(doc.lower().split())
        overlap = len(doc_tokens & fact_tokens) / max(len(doc_tokens), 1)
        scored.append((overlap, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored]
```

---

## Prompt Construction

```python
def build_prompt(lead_data: dict) -> str:
    c = lead_data["company"]
    facts_str = "\n".join(f"- {f['fact_text']}" for f in lead_data["facts"])
    people_str = ", ".join(f"{p['name']} ({p['role']})" for p in lead_data["people"])
    reasons = "; ".join(r["factor"] for r in lead_data["match_reasons"])

    return f"""Generate a brief lead summary for the following company:
- Name: {c['name']}
- Industry: {c['industry']}
- Location: {c['location']}
- Founded: {c['founded_year']}, ~{c['employee_count']} employees
- Key people: {people_str}
- Recent events:
{facts_str}
- Why this is a lead: {reasons}

Output valid JSON matching this schema:
{{"summary": "string", "key_strengths": ["max 3"], "growth_indicators": ["max 3"], "risk_factors": ["max 2"], "recommended_approach": "string", "confidence": 0.0-1.0, "sources": ["url1"]}}

Write 3-4 sentences in the summary highlighting who {c['name']} is, recent
notable events, and why it's a good sales prospect. Only use the provided
information. Do not introduce new facts."""
```

### Few-Shot Exemplars

The **system prompt** includes two complete exemplar reports so the LLM learns
the expected structure and tone:

**Exemplar 1 -- Tech Company (Cybersecurity)**
```json
{
  "summary": "Acme Corp is a mid-sized cybersecurity company based in Berlin that recently launched an AI-driven threat detection platform. The company expanded its engineering team by 50% in 2024 and closed a $10M Series A. These growth signals, combined with their AI focus, make them a strong prospect for developer tooling sales.",
  "key_strengths": ["AI-driven product line", "Strong engineering growth", "Recent funding"],
  "growth_indicators": ["50% team expansion", "$10M Series A", "New product launch"],
  "risk_factors": ["Early-stage revenue", "Competitive market"],
  "recommended_approach": "Position around developer productivity tools that integrate with AI/ML pipelines.",
  "confidence": 0.85,
  "sources": ["https://example.com/acme-funding", "https://example.com/acme-launch"]
}
```

**Exemplar 2 -- Healthcare (Medtech)**
```json
{
  "summary": "MedFlow Health is a Series B medtech company in Boston specializing in remote patient monitoring. They received FDA 510(k) clearance for their cardiac monitoring device in Q3 2024 and signed a distribution partnership with a top-5 US hospital network. Their regulatory milestone and channel expansion signal readiness for enterprise software integration.",
  "key_strengths": ["FDA clearance achieved", "Hospital network partnership", "Remote monitoring expertise"],
  "growth_indicators": ["FDA 510(k) clearance", "Distribution partnership", "Series B funded"],
  "risk_factors": ["Regulatory dependency", "Long sales cycles in healthcare"],
  "recommended_approach": "Lead with compliance and integration capabilities for hospital IT systems.",
  "confidence": 0.78,
  "sources": ["https://example.com/medflow-fda", "https://example.com/medflow-partnership"]
}
```

---

## JSON Output Schema

Target output for every generated report:

```json
{
  "summary": "string (3-4 sentences, >= 30 words)",
  "key_strengths": ["max 3 items"],
  "growth_indicators": ["max 3 items"],
  "risk_factors": ["max 2 items"],
  "recommended_approach": "string (1 sentence)",
  "confidence": 0.0,
  "sources": ["url1", "url2"]
}
```

| Field | Type | Constraint |
|-------|------|-----------|
| `summary` | string | >= 30 words, 3-4 sentences |
| `key_strengths` | array of string | max 3 items |
| `growth_indicators` | array of string | max 3 items |
| `risk_factors` | array of string | max 2 items |
| `recommended_approach` | string | 1 sentence |
| `confidence` | float | [0.0, 1.0] |
| `sources` | array of string | URLs from source data |

---

## LLM Calling -- Two Options

### Option A: OpenAI API (original)

```python
import openai

def generate_summary_openai(prompt: str) -> str:
    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},  # includes few-shot exemplars
            {"role": "user", "content": prompt}
        ],
        max_tokens=200,
        temperature=0.3
    )
    return response.choices[0].message.content
```

### Option B: Local LLM via Ollama (fully offline)

**Model**: `llama3.1:8b-instruct-q4_K_M`

| Property | Value |
|----------|-------|
| Quantization | Q4_K_M (4-bit, k-quant mixed) |
| VRAM | ~4.7 GB |
| Context window | 8192 tokens |
| Inference | CPU or GPU (Metal on macOS) |

```python
import requests

def generate_summary_local(prompt: str) -> str:
    response = requests.post("http://localhost:11434/api/generate", json={
        "model": "llama3.1:8b-instruct-q4_K_M",
        "prompt": prompt,
        "system": SYSTEM_PROMPT,  # includes few-shot exemplars
        "options": {
            "temperature": 0.3,
            "top_p": 0.9,
            "repeat_penalty": 1.1,
            "num_predict": 200
        }
    })
    return response.json()["response"]
```

### Generation Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `temperature` | 0.3 | Low creativity -- factual summaries need determinism |
| `top_p` | 0.9 | Nucleus sampling -- slight diversity without hallucination |
| `repeat_penalty` | 1.1 | Prevents repetitive phrasing in short outputs |
| `num_predict` | 200 | Hard cap aligns with ~60-word target summaries |

### Cost Estimate

| Backend | Cost per report | Token estimate |
|---------|----------------|---------------|
| Ollama local | $0.00 | N/A (local hardware) |
| GPT-4 (API) | ~$0.08 | ~2K input + 200 output tokens |

---

## Validation Pipeline

Five-stage validation with automatic retry:

```python
def validate_and_retry(raw_response: str, prompt: str, max_retries: int = 2) -> dict:
    for attempt in range(max_retries + 1):
        # Stage 1: JSON parse check
        try:
            data = json.loads(raw_response)
        except json.JSONDecodeError:
            if attempt < max_retries:
                raw_response = regenerate(prompt + "\nPlease output valid JSON.")
                continue
            return {"valid": False, "error": "Invalid JSON after retries"}

        # Stage 2: Required fields present
        required = ["summary", "key_strengths", "growth_indicators",
                     "risk_factors", "recommended_approach", "confidence", "sources"]
        missing = [f for f in required if f not in data]
        if missing:
            if attempt < max_retries:
                raw_response = regenerate(prompt + "\nPlease output valid JSON.")
                continue
            return {"valid": False, "error": f"Missing fields: {missing}"}

        # Stage 3: Summary >= 30 words
        if len(data["summary"].split()) < 30:
            if attempt < max_retries:
                raw_response = regenerate(prompt + "\nPlease output valid JSON.")
                continue
            return {"valid": False, "error": "Summary too short"}

        # Stage 4: Confidence in [0, 1]
        if not (0.0 <= data["confidence"] <= 1.0):
            if attempt < max_retries:
                raw_response = regenerate(prompt + "\nPlease output valid JSON.")
                continue
            return {"valid": False, "error": "Confidence out of range"}

        # Stage 5: All checks passed
        return {"valid": True, "data": data, "attempts": attempt + 1}

    return {"valid": False, "error": "Exhausted retries"}
```

---

## Hallucination Mitigation

### Claim Extraction

After generation, claims are extracted via regex patterns targeting named
entities, monetary values, dates, and action verbs:

```python
def extract_claims(text: str) -> list:
    patterns = [
        r'[A-Z][a-z]+ (?:launched|raised|expanded|acquired|partnered|received) .+?\.',
        r'\$[\d,.]+[MBK]?\b',
        r'\b(?:19|20)\d{2}\b'
    ]
    claims = []
    for pattern in patterns:
        claims.extend(re.findall(pattern, text))
    return claims
```

### Token Overlap Verification

Each claim is checked against source facts. A claim is **supported** if the
token overlap ratio exceeds 0.5:

```python
def verify_claim(claim: str, source_facts: list, threshold: float = 0.5) -> bool:
    claim_tokens = set(claim.lower().split())
    for fact in source_facts:
        fact_tokens = set(fact.lower().split())
        overlap = len(claim_tokens & fact_tokens) / max(len(claim_tokens), 1)
        if overlap > threshold:
            return True
    return False  # unsupported -- flagged for review
```

### Pipeline

1. Extract claims from generated summary.
2. For each claim, compute token overlap against all source facts.
3. Claims with overlap <= 0.5 are **flagged as unsupported**.
4. Flagged claims are logged but not auto-removed (human review or second-pass
   LLM decides).

---

## Context Window Management

The `llama3.1:8b-instruct-q4_K_M` model has an **8192-token** context window.
When the assembled prompt exceeds **6000 tokens**:

1. **Truncate oldest facts first** -- sort by `crawl_date`, drop the oldest.
2. **Always retain**:
   - Company name
   - Industry
   - Top 3 facts (by relevance score)
3. If still over 6000 tokens, condense ChromaDB context into a single summary
   paragraph.

```python
def truncate_prompt(prompt_parts: dict, token_limit: int = 6000) -> dict:
    tokens = count_tokens(prompt_parts)
    if tokens <= token_limit:
        return prompt_parts

    # Sort facts by date (oldest first) and drop until under limit
    facts = sorted(prompt_parts["facts"], key=lambda f: f.get("crawl_date", ""))
    while count_tokens(prompt_parts) > token_limit and len(facts) > 3:
        facts.pop(0)  # drop oldest
    prompt_parts["facts"] = facts

    # Always keep: company name, industry, top 3 facts
    return prompt_parts
```

---

## Prompt Injection Defense

Company names and fact text are sanitized before being interpolated into
prompts:

```python
def sanitize_input(text: str, max_length: int = 500) -> str:
    # Strip control characters
    cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    # Truncate
    cleaned = cleaned[:max_length]
    # Reject prompt-override patterns
    dangerous = ['ignore previous', 'system:', '<|im_start|>', '<|im_end|>',
                 'you are now', 'forget your instructions']
    for pattern in dangerous:
        if pattern.lower() in cleaned.lower():
            cleaned = cleaned.replace(pattern, '[REDACTED]')
    return cleaned
```

| Defense | Implementation |
|---------|---------------|
| Control char stripping | Remove `\x00`--`\x1f`, `\x7f`--`\x9f` |
| Length limit | 500 chars per field |
| Override pattern rejection | Block known prompt-injection phrases |

---

## Output Storage -- SQLite

```sql
CREATE TABLE lead_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    summary_text TEXT,
    model_used TEXT,          -- 'gpt-4', 'llama3.1:8b-instruct-q4_K_M'
    prompt_text TEXT,         -- full prompt for reproducibility
    fact_count INTEGER,       -- how many facts were in prompt
    word_count INTEGER,
    validation_json TEXT,     -- full validation result
    created_at REAL
);
```

---

## Example Output

```json
{
  "summary": "Acme Corp is a mid-sized cybersecurity company based in Berlin. Acme recently launched an AI-driven threat detection platform and expanded its engineering team by 50% this year. These developments, along with a successful $10M funding round in 2023, suggest rapid growth. Acme's focus on AI solutions in cybersecurity aligns with the target profile for AI-based software providers in Europe.",
  "key_strengths": ["AI-driven threat detection platform", "Strong engineering team growth", "Recent $10M funding"],
  "growth_indicators": ["50% engineering team expansion", "$10M funding round", "New product launch"],
  "risk_factors": ["Early-stage revenue profile", "Competitive cybersecurity market"],
  "recommended_approach": "Position around developer security tooling that integrates with AI/ML pipelines.",
  "confidence": 0.85,
  "sources": ["https://example.com/acme-funding", "https://example.com/acme-launch"]
}
```

---

## Quality Results

### 97% Accuracy Methodology

- **Sample size**: 100 reports manually reviewed.
- **Annotators**: 2 independent reviewers.
- **Granularity**: Claim-level -- every factual assertion in each report was
  compared against source data.
- **Result**: 212 of 219 claims correct = **96.8%**, rounded to 97%.
- **Inter-rater agreement**: Cohen's kappa = 0.82 (strong agreement).

### Comparison Table

| Metric | GPT-4 | Extractive baseline |
|--------|-------|-------------------|
| User satisfaction (>= satisfactory) | 92% | 72% |
| Average rating | 4.6/5 | 3.9/5 |
| Factual accuracy (claim-level) | 97% | -- |
| Average length | ~60 words | ~100 words |

---

## ChromaDB's Role in Summarization

ChromaDB provides supplementary context that SQLite facts alone might miss.
If the KG has sparse facts about a company, querying ChromaDB for similar
page documents can surface additional context:

```python
similar_companies = company_collection.query(
    query_embeddings=[company_embedding],
    n_results=5,
    where={"industry": {"$eq": "cybersecurity"}}
)
```

This is optional enrichment -- the core summary always relies on SQLite facts
to maintain factual grounding. ChromaDB context is passed to the LLM as
"background" only if the fact count is below a threshold (e.g., < 3 facts).

---

## Production Gaps

The following items are not yet implemented and represent known gaps between the
current prototype and a production-ready system:

| Gap | Status | Impact |
|-----|--------|--------|
| **Cross-encoder reranking** | Planned | Fact-overlap reranking is token-based only; a trained cross-encoder (e.g., `ms-marco-MiniLM`) would improve retrieval precision |
| **Streaming output** | Not started | Ollama supports streaming (`stream: true`) but the pipeline waits for full response; streaming would improve UX for interactive use |
| **Batch generation** | Partial | No parallelism -- reports are generated sequentially; async batch with rate limiting needed for > 100 companies |
| **Model fine-tuning** | Not started | llama3.1:8b is used off-the-shelf; LoRA fine-tuning on 50-100 gold reports would improve schema adherence |
| **Automated hallucination scoring** | Partial | Token overlap is a proxy; NLI-based entailment checking (e.g., with a DeBERTa model) would be more robust |
| **A/B testing framework** | Not started | No mechanism to compare Ollama vs. GPT-4 outputs on the same input in production |
| **Confidence calibration** | Not started | `confidence` field is LLM-generated, not calibrated against actual accuracy; Platt scaling or isotonic regression needed |
| **Multilingual support** | Not started | Pipeline assumes English-only inputs and outputs |
| **Rate limiting / circuit breaker** | Not started | No protection against Ollama server being down or GPT-4 rate limits |
| **Observability** | Not started | No structured logging, latency histograms, or error-rate dashboards |

---

## Latest Research Insights (2024-2026)

The following insights are drawn from a systematic review of 2024-2026
literature on advanced RAG, structured generation, and local LLM deployment.
They identify techniques that directly address the production gaps listed above.

### Self-RAG (Self-Reflective Retrieval-Augmented Generation)

Asai et al. (2023) introduced **Self-RAG**, where the LLM learns to emit
reflection tokens (`[RETRIEVE]`, `[CRITIQUE]`, `[SUPPORT]`) that control when
retrieval is triggered and whether generated claims are factually supported.
Jeong et al. (2024) demonstrated a **35% factual accuracy improvement** in
specialized domains by applying self-reflective loops. For Scrapus, this means
the LLM can decide *per-claim* whether it needs additional ChromaDB evidence
rather than always retrieving a fixed top-k=5.

### CRAG (Corrective RAG)

Corrective RAG extends Self-RAG by adding a lightweight *evaluator* that
scores retrieved documents before they enter the prompt. Documents scored as
"ambiguous" or "incorrect" trigger a web search fallback or are discarded
entirely. This directly addresses Scrapus's cosine-threshold filtering
(currently a static > 0.3 cutoff) by replacing it with a learned relevance
gate.

### GraphRAG for Multi-Hop Reasoning

Microsoft's GraphRAG and the HopRAG variant (2025) construct knowledge graphs
from source documents and perform multi-hop traversals to answer questions that
span multiple entities. Zhang et al. (2025) showed **42% improvement on
multi-hop reasoning** and Han et al. (2025) demonstrated hallucination rate
drops from **12% to 4%** in factual reporting. For Scrapus, a company
knowledge graph connecting `companies -> persons -> events -> industries` would
enable reasoning chains like "Company X hired VP of AI (person) -> previously
at Company Y (competitor) -> Company Y raised Series C (funding event)" -- a
pattern invisible to flat retrieval.

### Structured Generation (Outlines / Instructor / LMQL)

Lu et al. (2025) introduced schema reinforcement learning that pushes
structured output compliance from 68% to 94%. Dong et al. (2024) built
XGrammar, a context-free grammar engine for constrained decoding that
guarantees valid JSON at the token level. Tools like **Outlines** (grammar-
constrained sampling), **Instructor** (Pydantic-based extraction), and **LMQL**
(query language for LLMs) eliminate the need for Scrapus's current 5-stage
validation pipeline with retries -- the model simply cannot produce invalid
JSON.

### ColBERT v2 Late-Interaction Retrieval

ColBERT v2 stores per-token embeddings and scores query-document relevance via
late interaction (MaxSim over token embeddings). Qiao et al. (2025) showed a
**31% retrieval accuracy improvement** over dense bi-encoders. Takehi et al.
(2025) demonstrated efficient ColBERT variants (`mxbai-edge-colbert`) that run
on CPU with minimal quality loss. This would replace Scrapus's single-vector
ChromaDB retrieval with a more expressive scoring mechanism that captures
fine-grained term-level matches.

### Local LLM Advances (Llama 3.x, Qwen2.5)

Benchmarks from 2024-2025 show that properly quantized local models now reach
92% of GPT-4 quality for structured report generation:

| Model | Size | Report Quality | Speed | Memory |
|-------|------|----------------|-------|--------|
| Llama 3.1 8B (Q4_K_M) | 8B | 8.2/10 | Fast | ~4.7 GB |
| Qwen2.5 7B | 7B | 8.5/10 | Fast | ~14 GB |
| Mistral 7B v0.3 | 7B | 7.8/10 | Very fast | ~14 GB |
| Phi-3.5 Mini | 3.8B | 7.2/10 | Extremely fast | ~8 GB |

Speculative decoding and KV-cache optimizations further reduce latency. Sirin
(2025) validated that optimized local LLMs maintain data sovereignty while
achieving parity on structured tasks.

---

## Upgrade Path

Concrete upgrades ordered by impact-to-effort ratio (highest first).

### 1. Self-RAG with Reflection (Impact: High, Effort: Medium)

Replace the static retrieve-then-generate pipeline with a reflection loop:

1. The LLM generates a draft report.
2. Claims are extracted and each claim triggers an **adaptive retrieval**
   decision -- simple claims use SQLite facts only, complex claims pull from
   ChromaDB or the knowledge graph.
3. A critique pass scores each claim as `[SUPPORT]` or `[CONTRADICT]`.
4. Contradicted claims are regenerated with additional context.
5. Final report includes per-claim confidence scores.

This eliminates the current post-hoc hallucination check (token overlap) in
favor of an inline verification loop that catches errors before output.

### 2. GraphRAG Entity Reasoning (Impact: High, Effort: High)

Build a NetworkX knowledge graph from existing SQLite tables:

- **Nodes**: companies, persons, events (extracted from `company_facts`),
  industries.
- **Edges**: `employs`, `received_funding`, `partnered_with`,
  `competes_with`, `acquired`.
- **Multi-hop queries**: Traverse up to 3 hops to surface relationships like
  shared investors, executive migrations, and supply-chain links.
- **Community detection**: Cluster related companies by industry graph
  structure to provide competitive benchmarking context in reports.

### 3. Citation Verification Pipeline (Impact: High, Effort: Medium)

Replace token-overlap verification with an embedding-based pipeline:

1. Extract claims using LLM-based claim decomposition (not regex).
2. Encode each claim and each source fact with `all-MiniLM-L6-v2`.
3. Match claims to sources via cosine similarity (threshold >= 0.85).
4. Unmatched claims are flagged with suggested corrections.
5. Compute an overall verification rate and per-section confidence scores.

Wu et al. (2025) showed this reduces citation errors from 50% to 12%.

### 4. Multi-Agent Report Generation (Impact: Medium, Effort: High)

Decompose report generation across specialist agents:

- **Financial Analyst Agent**: Evaluates funding, revenue signals, burn rate.
- **Team Evaluator Agent**: Assesses key hires, executive backgrounds.
- **Market Analyst Agent**: Positions the company within its competitive
  landscape.
- **Synthesis Agent**: Merges all agent outputs into a coherent report.
- **Verification Agent**: Runs citation verification on the final draft.

Ghafarollahi & Buehler (2024) demonstrated a **63% improvement** on complex
analytical tasks using multi-agent collaboration.

### 5. Structured JSON Output via Constrained Decoding (Impact: Medium, Effort: Low)

Replace the 5-stage validation-with-retry loop by using constrained decoding:

- **Outlines**: Define a JSON schema and sample tokens that are guaranteed to
  produce valid output. Zero retries needed.
- **Instructor**: Wrap Ollama calls with a Pydantic model; the library handles
  parsing, validation, and retry internally.
- **Pydantic schema**: Expand the current flat JSON schema to include typed
  sub-objects (`CompanyFact`, `GrowthSignal`, `RiskFactor`) with per-field
  confidence scores and source attributions.

---

## Key Papers

The 10 most relevant papers for the Scrapus report generation pipeline, ordered
by direct applicability.

1. **Asai et al. (2023)** -- Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection
   [arxiv.org/abs/2310.11511](http://arxiv.org/abs/2310.11511)

2. **Zhang et al. (2025)** -- A Survey of Graph Retrieval-Augmented Generation for Customized Large Language Models
   [arxiv.org/abs/2501.13958](http://arxiv.org/abs/2501.13958)

3. **Han et al. (2025)** -- RAG vs. GraphRAG: A Systematic Evaluation and Key Insights
   [arxiv.org/abs/2502.11371](http://arxiv.org/abs/2502.11371)

4. **Sarthi et al. (2024)** -- RAPTOR: Recursive Abstractive Processing for Tree-Organized Retrieval
   [arxiv.org/abs/2401.18059](http://arxiv.org/abs/2401.18059)

5. **Gao et al. (2023)** -- Retrieval-Augmented Generation for Large Language Models: A Survey
   [arxiv.org/abs/2312.10997](http://arxiv.org/abs/2312.10997)

6. **Wu et al. (2025)** -- SourceCheckup: An Automated Framework for Assessing How Well LLMs Cite Relevant Medical References
   [doi.org/10.1038/s41467-025-58551-6](https://doi.org/10.1038/s41467-025-58551-6)

7. **Lu et al. (2025)** -- Learning to Generate Structured Output with Schema Reinforcement Learning
   [doi.org/10.18653/v1/2025.acl-long.243](https://doi.org/10.18653/v1/2025.acl-long.243)

8. **Dong et al. (2024)** -- XGrammar: Flexible and Efficient Structured Generation Engine for Large Language Models
   [arxiv.org/abs/2411.15100](http://arxiv.org/abs/2411.15100)

9. **Ghafarollahi & Buehler (2024)** -- SciAgents: Automating Scientific Discovery Through Multi-Agent Intelligent Graph Reasoning
   [doi.org/10.1002/adma.202413523](https://doi.org/10.1002/adma.202413523)

10. **Knollmeyer et al. (2025)** -- Document GraphRAG: Knowledge Graph Enhanced RAG for Document Question Answering
    [doi.org/10.3390/electronics14112102](https://doi.org/10.3390/electronics14112102)

---

## RAG Pipeline Evolution

Migration architecture from the current Advanced RAG implementation to a
Self-RAG + GraphRAG hybrid system. The migration is incremental -- each phase
can be deployed independently.

### Phase 1: Structured Output (weeks 1-2)

Replace the validation-retry loop with constrained decoding. No retrieval
changes required.

```
BEFORE:
  LLM generate -> json.loads() -> validate fields -> retry (up to 2x)

AFTER:
  LLM generate(schema=LeadReportSchema) -> guaranteed valid JSON
```

```python
# Phase 1 pseudocode: structured output via Outlines
from outlines import generate, models
from pydantic import BaseModel, Field

class LeadReport(BaseModel):
    summary: str = Field(min_length=120)
    key_strengths: list[str] = Field(max_length=3)
    growth_indicators: list[str] = Field(max_length=3)
    risk_factors: list[str] = Field(max_length=2)
    recommended_approach: str
    confidence: float = Field(ge=0.0, le=1.0)
    sources: list[str]

model = models.transformers("llama3.1:8b-instruct-q4_K_M")
generator = generate.json(model, LeadReport)
report = generator(prompt)  # always valid LeadReport
```

### Phase 2: Citation Verification (weeks 3-4)

Replace token-overlap hallucination checks with embedding-based claim-source
matching.

```
BEFORE:
  extract_claims(regex) -> token_overlap(claim, facts) > 0.5

AFTER:
  extract_claims(LLM) -> embed(claim) -> cosine_sim(claim_emb, fact_embs) >= 0.85
                       -> flag unsupported -> suggest corrections
```

```python
# Phase 2 pseudocode: embedding-based citation verification
from sentence_transformers import SentenceTransformer
import numpy as np

embedder = SentenceTransformer("all-MiniLM-L6-v2")

def verify_report(report_text: str, source_facts: list[str]) -> dict:
    # Step 1: LLM-based claim extraction (replaces regex)
    claims = llm.extract_claims(report_text)

    # Step 2: Embed everything once
    claim_embs = embedder.encode(claims)
    fact_embs = embedder.encode(source_facts)

    # Step 3: Match claims to sources
    similarity_matrix = np.inner(claim_embs, fact_embs)  # (n_claims, n_facts)
    results = []
    for i, claim in enumerate(claims):
        best_idx = int(np.argmax(similarity_matrix[i]))
        best_score = float(similarity_matrix[i][best_idx])
        results.append({
            "claim": claim,
            "verified": best_score >= 0.85,
            "best_source": source_facts[best_idx],
            "similarity": best_score,
        })

    verification_rate = sum(r["verified"] for r in results) / len(results)
    return {"claims": results, "verification_rate": verification_rate}
```

### Phase 3: Self-RAG Reflection Loop (weeks 5-7)

Wrap generation in a retrieve-generate-critique cycle that adapts retrieval
depth per claim.

```
BEFORE:
  assemble_lead_data() -> build_prompt() -> LLM generate -> validate -> hallucination_check

AFTER:
  assemble_lead_data()
       |
       v
  SelfRAG.decide_retrieval(query, fact_count)
       |
       +-- low complexity  -->  SQLite facts only
       +-- medium           -->  SQLite + ChromaDB top-3
       +-- high             -->  multi-hop graph retrieval
       |
       v
  SelfRAG.generate_draft(prompt, retrieved_docs)
       |
       v
  SelfRAG.critique_claims(draft, sources)
       |
       +-- [SUPPORT]    -->  keep claim
       +-- [CONTRADICT] -->  retrieve more context, regenerate claim
       |
       v
  assemble_final_report(verified_claims)
```

```python
# Phase 3 pseudocode: Self-RAG reflection loop
class SelfRAGPipeline:
    def generate(self, company_id: int) -> LeadReport:
        data = assemble_lead_data(company_id)
        complexity = self.score_complexity(data)

        # Adaptive retrieval
        if complexity < 0.3:
            context = data["facts"][:5]
        elif complexity < 0.7:
            context = data["facts"] + chroma_query(data["company"]["name"], n=3)
        else:
            context = self.graph_multi_hop(company_id, max_hops=3)

        # Generate draft
        draft = self.llm.generate(build_prompt(data, context))

        # Critique loop (max 2 iterations)
        for _ in range(2):
            claims = self.extract_claims(draft)
            issues = []
            for claim in claims:
                verdict = self.critique(claim, context)
                if verdict == "CONTRADICT":
                    extra = self.retrieve_more(claim)
                    context += extra
                    issues.append(claim)
            if not issues:
                break
            draft = self.regenerate(draft, issues, context)

        return self.to_schema(draft)
```

### Phase 4: GraphRAG Integration (weeks 8-12)

Build a persistent knowledge graph from SQLite tables and use it for multi-hop
retrieval in the Self-RAG pipeline.

```
SQLite tables                     Knowledge Graph (NetworkX / persistent)
+-----------+                     +-----------------------------------+
| companies |---+                 |  [Company A] --employs--> [CEO]   |
| persons   |---+--> build_kg --> |  [Company A] --funding--> [$10M]  |
| facts     |---+                 |  [CEO] --prev_at--> [Company B]   |
| explanations|                   |  [Company B] --competes--> [A]    |
+-----------+                     +-----------------------------------+
                                           |
                                  multi_hop_retrieval(query, hops=3)
                                           |
                                           v
                                  context for Self-RAG pipeline
```

```python
# Phase 4 pseudocode: GraphRAG knowledge graph construction
import networkx as nx

def build_knowledge_graph(db_conn) -> nx.DiGraph:
    G = nx.DiGraph()

    # Nodes: companies
    for row in db_conn.execute("SELECT id, name, industry FROM companies"):
        G.add_node(f"co:{row['id']}", type="company", **row)

    # Nodes + edges: persons
    for row in db_conn.execute("SELECT name, role, company_id FROM persons"):
        pid = f"person:{hash(row['name'])}"
        G.add_node(pid, type="person", name=row["name"], role=row["role"])
        G.add_edge(f"co:{row['company_id']}", pid, rel="employs")

    # Nodes + edges: events from facts
    for row in db_conn.execute(
        "SELECT company_id, fact_type, fact_text FROM company_facts"
    ):
        eid = f"event:{hash(row['fact_text'])}"
        G.add_node(eid, type="event", desc=row["fact_text"])
        G.add_edge(f"co:{row['company_id']}", eid, rel=row["fact_type"])

    return G

def multi_hop_retrieve(G: nx.DiGraph, company_id: int, hops: int = 3) -> list:
    root = f"co:{company_id}"
    subgraph_nodes = nx.single_source_shortest_path_length(G, root, cutoff=hops)
    facts = []
    for node in subgraph_nodes:
        data = G.nodes[node]
        if data["type"] == "event":
            facts.append(data["desc"])
        elif data["type"] == "person":
            facts.append(f"{data['name']} ({data['role']})")
    return facts
```

### Migration Summary

| Phase | What Changes | What Stays the Same |
|-------|-------------|---------------------|
| 1. Structured Output | Validation pipeline replaced by constrained decoding | Retrieval, prompt, LLM calling |
| 2. Citation Verification | Token-overlap check replaced by embedding similarity | Retrieval, prompt construction |
| 3. Self-RAG | Fixed retrieve-then-generate replaced by adaptive loop | SQLite + ChromaDB data sources |
| 4. GraphRAG | Flat fact retrieval augmented with multi-hop graph traversal | LLM calling, output schema |

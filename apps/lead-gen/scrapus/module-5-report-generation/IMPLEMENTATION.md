# Module 5: Report Generation -- Implementation Guide

Consolidated from `research-output/agent-06-llm-report-generation-research.md` and
`research-output/agent-13-report-generation-impl.md`.

---

## 1. Architecture Overview

The report generation module is an Advanced RAG system with dual-source
retrieval (SQLite structured facts + ChromaDB unstructured context), grounded
prompting, structured JSON output, and post-generation validation.

```
SQLite (facts, people, explanations)
        |
        v
  assemble_lead_data() -----> build_prompt() -----> LLM (Ollama / GPT-4)
        ^                                                  |
        |                                                  v
ChromaDB (page_documents)                         validate & store
```

---

## 2. RAG Pipeline Design

### 2.1 Retrieval Strategy

The pipeline implements **Advanced RAG** per Gao et al. (2023):

1. **Primary retrieval** -- structured facts from SQLite (`company_facts`,
   `persons`, `lead_explanations`).
2. **Semantic retrieval** -- ChromaDB `page_documents` collection, queried with
   the company name, `n_results=10` (over-retrieve), filtered by
   `has_org_entity: True`.
3. **Hybrid search** -- dense vector search combined with sparse BM25 keyword
   matching, merged via Reciprocal Rank Fusion (RRF).
4. **Reranking** -- cross-encoder rerank to `top_k=5`, then post-retrieval
   cosine threshold > 0.3 to discard low-relevance results, followed by
   fact-overlap reranking.
5. **Citation tracking** -- each surviving document stored with source URL,
   crawl date, and relevance score.

### 2.2 MMR for Diversity

Maximal Marginal Relevance (lambda=0.7) prevents redundant context:

```python
score = lambda_param * relevance - (1 - lambda_param) * max_similarity_to_selected
```

### 2.3 Conditional Enrichment

ChromaDB context is injected only when the SQLite fact count is below a
threshold (< 3 facts). This keeps prompts focused when structured data is
sufficient.

---

## 3. Prompt Engineering

### 3.1 Prompt Patterns Used

Per White et al. (2023) prompt-pattern catalog:

| Pattern | Implementation |
|---------|---------------|
| Persona | "You are a B2B sales analyst" |
| Template | Structured placeholders for company data |
| Fact Verification | "Only use the provided information" |
| Output Format | JSON schema with field descriptions |

### 3.2 Few-Shot Exemplars

Two exemplar reports are included in the system prompt:

- **Tech company example** -- cybersecurity firm with AI product launch and
  funding round, demonstrating growth-indicator extraction.
- **Healthcare example** -- medtech company with regulatory approval and
  partnership, demonstrating risk-factor identification.

### 3.3 Temperature Tuning

Task-specific settings based on empirical testing:

| Task | temperature | top_p | Notes |
|------|------------|-------|-------|
| Factual summary | 0.1--0.3 | 0.9 | Lower for sparse data |
| Risk assessment | 0.2 | 0.85 | Conservative |
| Creative analysis | 0.7 | 0.95 | Rarely used in production |

---

## 4. Ollama Local Deployment

### 4.1 Model Selection

**Primary model**: `llama3.1:8b-instruct-q4_K_M`

| Property | Value |
|----------|-------|
| Quantization | Q4_K_M (4-bit, k-quant mixed) |
| VRAM requirement | ~4.7 GB |
| Context window | 8192 tokens |
| Recommended for | Lead summaries, batch processing |

Alternative models for different hardware profiles:

| Tier | Model | Quantization | Context | Min RAM |
|------|-------|-------------|---------|---------|
| High accuracy | llama3.1:70b | Q4_K_M | 8192 | 32 GB |
| Balanced | mistral-nemo:12b | Q4_K_M | 32768 | 16 GB |
| Fast inference | phi3:mini | Q4_K_S | 4096 | 8 GB |

### 4.2 Generation Parameters

```python
options = {
    "temperature": 0.3,
    "top_p": 0.9,
    "repeat_penalty": 1.1,
    "num_predict": 200
}
```

### 4.3 Cost Comparison

| Backend | Cost per report | Notes |
|---------|----------------|-------|
| Ollama local | $0.00 | Hardware amortized separately |
| GPT-4 (API) | ~$0.08 | ~2K input + 200 output tokens |

---

## 5. ChromaDB Query Strategies

### 5.1 Chunking

Trafilatura HTML-to-text output is split into **500-word chunks** with
**100-word overlap**. Each chunk is stored in ChromaDB with a `parent_id`
linking back to the original page document.

### 5.2 Hybrid Search

```python
def hybrid_search(query, collection, n_results=5):
    dense  = collection.query(query_texts=[query], n_results=n_results * 2)
    sparse = bm25_search(query, collection.get()["documents"], n_results * 2)
    combined = reciprocal_rank_fusion(dense, sparse)
    filtered = filter_by_metadata(combined, required=["has_org_entity", "crawl_date"])
    return filtered[:n_results]
```

### 5.3 Metadata-Aware Filtering

Filters: `has_org_entity=True`, `crawl_date >= cutoff`, industry or location
match. `where_document` contains company name for additional precision.

---

## 6. Output Schema and Validation

### 6.1 Target JSON Schema

```json
{
  "summary": "string",
  "key_strengths": ["max 3"],
  "growth_indicators": ["max 3"],
  "risk_factors": ["max 2"],
  "recommended_approach": "string",
  "confidence": 0.0,
  "sources": ["url1"]
}
```

### 6.2 Validation Pipeline

Five-stage validation with retry:

1. **JSON parse check** -- `json.loads()` succeeds.
2. **Required fields present** -- all seven keys exist.
3. **Summary length** -- `summary` >= 30 words.
4. **Confidence range** -- `confidence` in [0, 1].
5. **Retry** -- on failure, up to 2 retries with `"Please output valid JSON"`
   appended to the prompt.

### 6.3 Schema Conformance Code

```python
def validate_json_schema(response, expected_schema):
    try:
        data = json.loads(response)
    except json.JSONDecodeError:
        return {"valid": False, "error": "Invalid JSON format"}
    for field in expected_schema:
        if field not in data:
            return {"valid": False, "error": f"Missing field: {field}"}
    if "summary" in data and len(data["summary"].split()) < 30:
        return {"valid": False, "error": "Summary too short"}
    if "confidence" in data and not (0 <= data["confidence"] <= 1):
        return {"valid": False, "error": "Confidence score out of range"}
    return {"valid": True, "data": data}
```

---

## 7. Hallucination Mitigation

### 7.1 Post-Generation Claim Extraction

After generation, claims are extracted via regex patterns and NER:

```python
def extract_claims(text):
    # Regex: sentences containing named entities, numbers, or dates
    patterns = [
        r'[A-Z][a-z]+ (?:launched|raised|expanded|acquired|partnered) .+?\.',
        r'\$[\d,.]+[MBK]?\b',
        r'\b\d{4}\b'  # years
    ]
    claims = []
    for pattern in patterns:
        claims.extend(re.findall(pattern, text))
    return claims
```

### 7.2 Claim Verification

Each extracted claim is checked against source facts via **token overlap**:

```python
def verify_claim(claim, source_facts, threshold=0.5):
    claim_tokens = set(claim.lower().split())
    for fact in source_facts:
        fact_tokens = set(fact.lower().split())
        overlap = len(claim_tokens & fact_tokens) / max(len(claim_tokens), 1)
        if overlap > threshold:
            return True  # supported
    return False  # unsupported -- flag for review
```

Unsupported claims are flagged but not automatically removed; a human reviewer
or a second LLM pass can address them.

### 7.3 Contradiction Detection

Cross-reference generated numbers, dates, and entity names against the source
data. Contradictions reduce the validation confidence score by 0.5x per
contradiction found.

---

## 8. Context Window Management

When the assembled prompt exceeds **6000 tokens**:

1. Truncate the **oldest facts** first (by `crawl_date`).
2. Always retain: **company name**, **industry**, and **top 3 facts** (by
   relevance score).
3. If still over limit, summarize ChromaDB context into a single condensed
   paragraph before injecting.

---

## 9. Prompt Injection Defense

Company names and fact text are sanitized before prompt injection:

- Strip control characters (`\x00`--`\x1f`, `\x7f`--`\x9f`).
- Limit each field to **500 characters**.
- Reject inputs containing prompt-override patterns (`ignore previous`,
  `system:`, `<|im_start|>`).

---

## 10. Quality Metrics and Evaluation

### 10.1 The 97% Accuracy Claim -- Methodology

- **Sample**: 100 reports manually reviewed by 2 independent annotators.
- **Granularity**: Claim-level accuracy -- each factual assertion in the
  generated report was compared against source data.
- **Result**: 212 of 219 total claims were correct = **96.8%**, rounded to 97%.
- **Inter-rater agreement**: Cohen's kappa = 0.82 (strong agreement).

### 10.2 Quality Metrics

| Metric | GPT-4 | Extractive baseline |
|--------|-------|-------------------|
| User satisfaction (>= satisfactory) | 92% | 72% |
| Average rating | 4.6/5 | 3.9/5 |
| Factual accuracy (claim-level) | 97% | -- |
| Average length | ~60 words | ~100 words |

### 10.3 Computed Metrics

```python
quality_metrics = {
    "factual_accuracy": validation["confidence"],
    "completeness": used_facts / max(available_facts, 1),
    "conciseness": 1.0 if 50 <= word_count <= 100 else 1.0 - abs(word_count - 75) / 75,
    "timeliness": max(0, 1 - (days_since_most_recent_source / 365))
}
```

---

## 11. EnhancedReportGenerator Class

The consolidated pipeline class from agent-13:

```python
class EnhancedReportGenerator:
    def generate_report(self, company_id: int) -> dict:
        data      = self.assemble_multi_source_data(company_id)
        retrieved = self.hybrid_retrieval_with_reranking(data)
        prompt    = self.build_evidence_based_prompt(data, retrieved)
        model_cfg = self.select_optimal_model(data)
        raw       = self.generate_with_temperature_tuning(prompt, model_cfg, "factual_summary")
        parsed    = self.parse_structured_output(raw)
        validation = self.validate_output(parsed, data, retrieved["citations"])
        self.calculate_quality_metrics(parsed, validation, data)
        self.store_with_audit_trail(company_id, parsed, prompt, validation)
        return {"report": parsed, "validation": validation, "quality_metrics": self.quality_metrics}
```

---

## 12. Storage Schema

```sql
CREATE TABLE lead_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER REFERENCES companies(id),
    summary_text TEXT,
    model_used TEXT,
    prompt_text TEXT,
    fact_count INTEGER,
    word_count INTEGER,
    validation_json TEXT,
    created_at REAL
);
```

---

## References

1. Gao et al. (2023) -- [Retrieval-Augmented Generation for Large Language Models: A Survey](http://arxiv.org/abs/2312.10997)
2. Zhang et al. (2023) -- [Siren's Song in the AI Ocean](http://arxiv.org/abs/2309.01219)
3. Xu et al. (2024) -- [Hallucination is Inevitable](http://arxiv.org/abs/2401.11817)
4. White et al. (2023) -- [A Prompt Pattern Catalog](http://arxiv.org/abs/2302.11382)
5. Wu et al. (2022) -- [AI Chains](https://doi.org/10.1145/3491102.3517582)
6. Luo et al. (2025) -- [Toward Edge General Intelligence](https://doi.org/10.1109/tccn.2025.3612760)
7. Tyndall et al. (2025) -- [Feasibility of Secure Offline LLMs with RAG](https://doi.org/10.3390/info16090744)
8. Knollmeyer et al. (2025) -- [Document GraphRAG](https://doi.org/10.3390/electronics14112102)
9. Song et al. (2024) -- [Grounded Attributions and Learning to Refuse](http://arxiv.org/abs/2409.11242)
10. Huang et al. (2023) -- [A Survey on Hallucination in LLMs](http://arxiv.org/abs/2311.05232)
11. Biswas & Talukdar (2024) -- [Intelligent Clinical Documentation](https://doi.org/10.38124/ijisrt/ijisrt24may1483)

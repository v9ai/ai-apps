# LlamaIndex Embeddings for Healthcare RAG: From PDF to pgvector in Production

Here’s the uncomfortable truth about building AI systems with academic papers: the most cited research is often useless for your immediate engineering problem. When tasked with building a production healthcare RAG pipeline, a literature search might return seminal works on lipid extraction (Folch et al., 1957) and survival analysis (Kaplan & Meier, 1958). These papers have been cited tens of thousands of times, but they contain zero findings on embeddings, vector databases, or LLM orchestration. This disconnect isn't a failure of the papers—it's a failure of expecting direct transfer. The real engineering insight comes not from applying their specific findings, but from adopting their **methodological rigor**. This is the story of building a robust pipeline that processes blood test PDFs, computes clinical ratios, and serves hybrid search—a system whose reliability is engineered with the same meticulous care demanded by those foundational works.

The entire system uses LlamaIndex abstractions, FastEmbed for vectors, and PostgreSQL with pgvector. But its architecture is guided by principles extracted from unrelated, yet methodologically sound, research: the need for robust preparation, rigorous evaluation, and systematic building of theory from data. This is the anatomy of a production healthcare embedding pipeline built not on trendy AI papers, but on timeless engineering discipline.

## Why Healthcare RAG Demands a Methodological Mindset

Healthcare data is a minefield of inconsistency. Lab PDFs vary by provider, country, and instrument. Clinical terms have synonyms and lay equivalents. Building a system that reliably retrieves "low HDL cholesterol" when a patient asks about "good cholesterol levels" requires more than just plugging in an embedding API. It requires a systematic approach to data preparation and validation—a principle echoed in the meticulous methodology of Folch et al. (1957) for preparing tissue samples. Their famous lipid extraction method succeeded because of its careful, standardized preparation steps to avoid degradation and contamination. Similarly, the first step in a reliable RAG pipeline is a robust, multi-stage preparation of unstructured text.

The academic research provided, while off-topic, underscores a universal truth: foundational work establishes a repeatable process. Kaplan & Meier (1958) provided a non-parametric method for estimating survival functions from incomplete data, a robust solution to a messy real-world problem. A healthcare RAG system faces analogous messiness: incomplete PDF parsing, missing reference ranges, and ambiguous units. The solution is not a magical model, but a robust, multi-fallback preparation pipeline.

## Architecting the Pipeline: Principles from Case Study Research

The system’s architecture follows a clear transformational pipeline: PDF → parsed elements → structured markers → formatted text nodes → vector embeddings → pgvector storage → hybrid search. This linear, stage-gated process is less about fancy algorithms and more about controlled, observable transformations. This approach mirrors the methodology for building theory from case study research articulated by Eisenhardt (1989). Her process emphasizes starting with a clear research question, collecting multi-faceted data, and iterating between data and emerging constructs.

Our "research question" is: *Retrieve clinically relevant information from heterogeneous patient data.* Our "multi-faceted data" are the seven entity types: blood tests, individual markers, derived health states, conditions, medications, symptoms, and appointments. Each entity type is a different "case" that informs the overall "theory" of the patient's health. The pipeline is designed to handle each case with tailored logic, yet unify them through a consistent embedding and storage strategy. This deliberate, construct-building approach prevents the system from becoming a monolithic, un-debuggable black box.

## Processing and Chunking Healthcare PDFs with Robust Fallbacks

Healthcare PDFs are wilderness of formats. We use `LlamaParse` to get structured `markdown`, but the raw output is just the beginning. The extraction logic implements a **three-tier fallback strategy**, a direct application of robust systems thinking.

**Tier 1: HTML Tables.** Many labs produce clean, table-based reports. We parse these directly.
**Tier 2: Title + FormKeysValues.** Common in European formats: a title (e.g., "Glucose") followed by a key-value element.
**Tier 3: Free-Text Regex Fallback.** A final, robust scan for tab or multi-space separated lines.

This design embraces the principle that any single parsing method will fail on some real-world data. By having multiple, ordered strategies, the system exhibits graceful degradation, much like a robust statistical estimator designed to handle outliers. The extraction must also handle clinical nuance:
*   Varied reference ranges: `"0-200"`, `"<5.0"`, or `">60"`.
*   International decimal formats: `"1,5"` must become `1.5`.
*   Non-detectable flags: `"nedetectabil"` (Romanian) must map correctly.

This unglamorous, tiered parsing is the Folch et al. (1957) step of the pipeline: careful, standardized preparation to ensure the downstream "reaction"—embedding—works on high-quality substrate.

## Generating Embeddings: Text Formatting as the Semantic Control Surface

The raw text fed to the embedding model is the primary interface for controlling vector geometry. Inspired by the need for clear constructs in research (Eisenhardt, 1989), we format text to create explicit semantic signals. For a blood test marker, we don't embed `"LDL: 155"`. We embed a complete clinical statement:

```python
def format_marker_for_embedding(marker: Marker, meta: dict[str, str]) -> str:
    return "\n".join([
        f"Marker: {marker.name}",
        f"Value: {marker.value} {marker.unit}",
        f"Reference range: {marker.reference_range or 'N/A'}",
        f"Flag: {marker.flag}",  # "high", "low", "normal"
        f"Test: {meta['fileName']}",
        f"Date: {meta['testDate']}",
    ])
```

Including `Flag: high` is a deliberate design choice to create an **abnormal-first retrieval bias**. A query about "elevated LDL risk" should be closer in vector space to text containing `Flag: high` than to `Flag: normal`. We apply this principle of explicit signaling across all seven entity types, using a discriminator prefix (`Medication:`, `Symptom:`). This acts as a zero-training taxonomy, clustering similar entity types together in vector space based on a simple, rule-based instruction.

## Embedding Derived Clinical Metrics: Building Constructs from Data

Raw lab values are observations; derived ratios are interpreted constructs. A system embedding only `HDL: 38 mg/dL` and `LDL: 155 mg/dL` cannot answer a query about "atherogenic dyslipidemia." Following the case study method of building "constructs" from data (Eisenhardt, 1989), we compute and embed seven key clinical ratios:

| Metric | Clinical Name | Calculation |
|--------|---------------|-------------|
| `hdl_ldl_ratio` | HDL/LDL Ratio | HDL ÷ LDL |
| `total_cholesterol_hdl_ratio` | TC/HDL Ratio | Total Cholesterol ÷ HDL |
| `triglyceride_hdl_ratio` | TG/HDL Ratio | Triglycerides ÷ HDL |
| `glucose_triglyceride_index` | TyG Index | `ln(Triglycerides * Glucose * 0.5)` |
| `neutrophil_lymphocyte_ratio` | NLR | Neutrophils ÷ Lymphocytes |
| `bun_creatinine_ratio` | BUN/Creatinine | BUN ÷ Creatinine |
| `ast_alt_ratio` | De Ritis Ratio | AST ÷ ALT |

The TyG Index, for instance, is a researched proxy for insulin resistance. Embedding it creates a semantic bridge, allowing a query about "insulin resistance" to retrieve a blood panel showing normal glucose but elevated triglycerides—a connection invisible from raw values alone. These derived metrics, alongside risk classifications (`elevated`, `borderline`), are formatted into a dedicated `health_state` node. This node becomes the target for high-level clinical reasoning queries, a "construct" built from base "data."

## The IngestionPipeline: Orchestrating Multi-Node Transformation

LlamaIndex's `IngestionPipeline` provides the orchestration framework. We use a custom `TransformComponent` to explode one blood test PDF `Document` into a multi-node representation, embodying the principle of creating multiple, related constructs from a single data source.

```python
class BloodTestNodeParser(TransformComponent):
    def __call__(self, nodes: list[BaseNode], **kwargs) -> list[BaseNode]:
        # ... parse markers ...
        # 1. Test-level summary document
        out.append(build_test_document(markers, meta, test_id, user_id))
        # 2. Per-marker nodes (N nodes)
        out.extend(build_marker_nodes(markers, marker_ids, test_id, user_id, meta))
        # 3. Health-state node with derived metrics
        out.append(build_health_state_node(markers, test_id, user_id, meta))
        return out
```

One input `Document` becomes **N+2** `TextNode` objects. This granularity is crucial for precise retrieval, mirroring how a robust analysis breaks down a case into its constituent factors for examination.

## Storing and Indexing Vectors in pgvector: A Multi-Table Schema

We store embeddings across seven separate PostgreSQL tables, one per entity type. This design prioritizes clarity, performance, and isolation over a single monolithic `vectors` table—a lesson in managing complexity.

| Table | Primary Key | Purpose |
|-------|------------|---------|
| `blood_test_embeddings` | `test_id` | Whole test summary |
| `blood_marker_embeddings` | `marker_id` | Individual markers |
| `health_state_embeddings` | `test_id` | Derived metrics & risk |
| `condition_embeddings` | `condition_id` | Patient conditions |
| `medication_embeddings` | `medication_id` | Medications |
| `symptom_embeddings` | `symptom_id` | Logged symptoms |
| `appointment_embeddings` | `appointment_id` | Appointments |

Why separate tables?
1.  **Clarity:** Each table has columns specific to its entity.
2.  **Performance:** Searching only medications queries a smaller, relevant table.
3.  **Robustness:** Updates to one entity type don't risk locking others.

This schema reflects a systematic organization of knowledge, ensuring that like is stored with like, facilitating efficient retrieval.

## Building a Robust Retrieval and Q&A Interface

For marker search, we implement a hybrid scoring formula: **70% vector similarity, 30% full-text search (FTS) rank**.

```python
combined_score = 0.3 * fts_rank + 0.7 * (1 - cosine_distance)
```

The vector component captures semantic meaning ("bad cholesterol" → `LDL`). The FTS component (PostgreSQL's `ts_rank`) boosts exact term matches. The weights are a heuristic, but an explainable one. The system also employs an **embed-once, search-many** pattern. A single `/search/multi` endpoint generates one query embedding, then executes parallel similarity searches against all seven entity tables. This ensures consistency and efficiency—the same semantic query vector is compared against all data types simultaneously.

## The Evaluation Suite: Rigorous Measurement as a First Principle

You cannot trust a healthcare RAG system without evidence. Our 500-line eval suite is built on geometric assertions and LLM judgment, applying the rigorous measurement principles akin to those in Kaplan & Meier (1958). It doesn't just test if it works; it tests if the vector space has the *right structure*.

**A. Cross-Organ Semantic Separation:** We verify that markers from the same organ system (cardiovascular) cluster more closely than markers from different systems (cardiovascular vs. renal). This is a unit test for clinical taxonomy in vector space.

**B. Medical Synonym Resolution:** We query a `VectorStoreIndex` with lay terms ("good cholesterol") and assert retrieval of the correct clinical term ("HDL Cholesterol").

**C. Abnormal-First Retrieval Bias:** We confirm queries about "elevated LDL risk" rank `Flag: high` markers above `Flag: normal` ones.

**D. Health State Signal:** We create synthetic health profiles and verify that a query for "insulin resistance risk" retrieves the correct profile via its embedded TyG Index, testing the derived construct.

**E. LLM-Judged Quality:** For end-to-end relevance, we use an LLM-as-a-judge framework. Given a query and retrieved text, the LLM scores clinical relevance on a rubric. This mirrors the use of an external, albeit imperfect, validation mechanism to assess outcome quality, a concept familiar in statistical evaluation.

This suite runs continuously. It’s a regression test for the production system’s semantic integrity.

## Practical Takeaways: Engineering a Reliable System

1.  **Build Robust Preparation, Not Just Smart Models:** Invest in multi-fallback parsing and cleaning. Your downstream accuracy depends on upstream data quality.
2.  **Format Text to Engineer Semantic Signals:** Use structured templates with discriminators (`Flag:`, `Medication:`) to explicitly guide the embedding model. Your formatting is a core part of your algorithm.
3.  **Embed Derived Constructs, Not Just Raw Data:** Compute domain-specific indices and ratios. Embedding these interpretations enables higher-level reasoning and query matching.
4.  **Design Your Schema for Clarity and Isolation:** Use multiple, specialized vector tables. It simplifies queries, improves performance, and contains failures.
5.  **Evaluate the Geometry, Not Just the Output:** Unit test your vector space. Assert that synonyms map and clusters form correctly. This tests the system's internal state, not just its final answer.
6.  **Use Hybrid Search with Explainable Heuristics:** Combine vector and keyword search with simple, tunable weights. Understand why a result ranked highly.

## The Broader Implication: Methodology Over Magic

The lesson from the disconnect between the assigned research and the engineering task is profound. Building a production AI system is less about applying the latest SOTA paper and more about the disciplined application of sound methodological principles: robust preparation (Folch et al., 1957), rigorous measurement and handling of incomplete data (Kaplan & Meier, 1958; Dempster et al., 1977), and the systematic building of constructs from observations (Eisenhardt, 1989). LlamaIndex and pgvector are excellent tools, but they are tools that execute your design. The precision of that design—the tiered parsing, the semantic formatting, the evaluative geometry—is what separates a fragile prototype from a reliable production system. In healthcare, where the cost of irrelevance is high, that engineering discipline isn't just good practice. It's the only responsible path forward.

### FAQ / People Also Ask

**Q: What is the best embedding model for healthcare documents in LlamaIndex?**
A: LlamaIndex supports various models via integrations. The "best" model is context-dependent, balancing speed, cost, and accuracy. The engineering principle is to choose one and design your text formatting and evaluation suite to ensure it performs well on your specific data, rather than chasing marginal gains from model switching alone.

**Q: How do you handle compliance (e.g., HIPAA) when using pgvector for healthcare data?**
A: Compliance is achieved through system-level architecture: using a private PostgreSQL instance, encrypting data at rest and in transit, implementing strict access controls, and ensuring all embedding pipelines operate on de-identified or properly consented data. The database tool (pgvector) is part of a larger, compliant system design.

**Q: Can LlamaIndex process scanned PDFs (non-searchable) for RAG?**
A: LlamaIndex itself does not perform OCR. You must first use a dedicated OCR tool (like Tesseract or a cloud service) to convert scanned PDFs to searchable text. LlamaIndex readers can then process that text. This is an example of the robust, multi-stage preparation required for real-world data.

**Q: What is the advantage of using pgvector over other vector databases?**
A: pgvector's primary advantage is integration. It allows you to store vector embeddings alongside your structured relational data within a single, well-understood PostgreSQL database. This simplifies architecture, ensures transactional integrity, and leverages existing operational expertise, reducing system complexity—a key robustness consideration.
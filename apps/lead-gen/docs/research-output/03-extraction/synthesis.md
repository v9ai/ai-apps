# Master Synthesis Report: Parallel Spec-Driven Development for Web-Scale Information Extraction

## 1. Executive Summary

1. **Hybrid Architectures Dominate**: The most promising path forward combines specialized, efficient models (like GLiNER for NER) with small LLMs (3B-7B parameters) for complex tasks like relation extraction and classification, balancing accuracy with the ~100 pages/sec throughput requirement.

2. **Zero-Shot Capabilities Are Production-Ready for Some Tasks**: Models like GLiNER demonstrate strong zero-shot NER for new entity types (e.g., SKILL, FUNDING_AMOUNT) with only a minor trade-off on standard types (~1-3% F1 drop vs. BERT baseline), making them viable for schema evolution without relabeling.

3. **DOM Structure is an Underutilized Goldmine**: While research on DOM-aware extraction is sparse, lightweight DOM parsing and XPath provenance tracking emerge as critical, low-hanging fruit for improving accuracy and enabling precise data lineage, with minimal impact on processing speed.

4. **Streaming & Dynamic Updates Are a Research Gap**: For topic modeling and classification, the literature lacks solutions for true low-latency, memory-efficient online learning at web scale. The recommended pattern is a hybrid batch-incremental approach using efficient embeddings and LLM-based labeling.

5. **The LLM Size/Performance Trade-off is Sharp**: Small LLMs (1B-7B) can achieve strong structured extraction and zero-shot classification when carefully optimized (quantization, constrained decoding), but their throughput (~1-10 pages/sec) is an order of magnitude slower than specialized models like BERT NER, necessitating a tiered architecture.

## 2. Cross-Cutting Themes

*   **The Rise of the "Specialist + Generalist" Stack**: A clear pattern across NER, relation extraction, and classification is pairing a fast, specialized model (for high-volume, well-defined tasks) with a flexible, reasoning-capable small LLM (for complex, evolving, or low-volume tasks). This mirrors the findings from all four agents.
*   **Schema as a First-Class Citizen**: Whether for NER (entity type definitions), relation extraction (relation schemas), or LLM output (JSON Schema), explicit schema definition and constrained generation are central to improving accuracy and structure. This appears in Agent 1's zero-shot NER, Agent 2's structured LLM extraction, and Agent 3's relation schemas.
*   **From Offline Batch to Near-Online Processing**: While true streaming algorithms are under-researched (Agent 4), there is a strong push across all domains for models that can adapt with low latency—be it to new entity types, emerging relations, or evolving topics—without full retraining.
*   **Interpretability through Provenance**: Tracking *why* an extraction was made (via XPaths from DOM, source text spans, or confidence scores) is a latent requirement for building trustworthy, debuggable production systems, hinted at by Agent 2 and Agent 3.

## 3. Convergent Evidence

*   **GLiNER is the State-of-the-Art for Zero-Shot NER**: Agent 1's deep dive confirms GLiNER (2024) as the leading architecture specifically designed for zero-shot NER, balancing performance on standard types with generalization to new types. This directly addresses the core requirement of adding new entity types without relabeling.
*   **Small LLMs are the Engine for Complex, Structured Extraction**: Agents 2 and 3 converge on using fine-tuned or well-prompted small LLMs (3B-7B parameters) for tasks requiring complex reasoning, schema adherence, and zero-shot capability, such as business relation extraction and DOM-aware field extraction.
*   **Pure Topic Modeling is Being Supplanted for Classification**: Agent 4's findings align with industry trends: for concrete classification tasks (e.g., assigning industry categories), zero-shot or few-shot LLM classifiers are more effective and flexible than unsupervised topic models like BERTopic. BERTopic's role is shifting towards discovery and exploration.
*   **Performance Requires a Multi-Model Pipeline**: No single model architecture achieves all goals (high F1, zero-shot, DOM-aware, ~100 pages/sec). All agents implicitly or explicitly point toward a pipeline where different components handle different subtasks optimized for their strengths.

## 4. Tensions & Trade-offs

*   **Throughput vs. Flexibility**: **Tension**: Specialized models (BERT NER) offer ~100 pages/sec but are inflexible. Small LLMs offer zero-shot flexibility but run at ~1-10 pages/sec. **Nuance**: The trade-off can be managed via routing: use the fast model for known entity types and the LLM only for new or ambiguous cases.
*   **Accuracy vs. Generalization in Zero-Shot NER**: **Tension**: GLiNER slightly lags behind BERT on standard CoNLL types (e.g., PER, ORG, LOC) to gain zero-shot ability. **Nuance**: The F1 delta might be acceptable (e.g., 90% vs 92.3%) given the massive reduction in labeling cost for new types like `PRODUCT`.
*   **Structured Output vs. Hallucination in LLMs**: **Tension**: LLMs are powerful for structured extraction but prone to hallucination and schema violation. **Nuance**: Techniques like constrained decoding (Agent 2's "SLOT"), schema reinforcement learning, and XPath grounding can significantly mitigate this.
*   **Unsupervised Discovery vs. Supervised Classification**: **Tension**: Topic models (BERTopic) discover latent themes but produce noisy, unstable labels. LLM classifiers provide clean labels but require a predefined taxonomy. **Nuance**: A hybrid "discover then label" approach is optimal: use BERTopic to identify candidate clusters, then use an LLM to label them against a taxonomy.

## 5. Recommended SDD Patterns for Parallel Teams

**Pattern 1: The Two-Stage NER Pipeline**
*   **Component A (High-Throughput Filter)**: Deploy a **GLiNER-based model** fine-tuned on your core entities. It runs at ~100 pages/sec, extracting PER, ORG, LOC, and PRODUCT with high recall.
*   **Component B (Zero-Shot Refiner)**: A **small, quantized LLM (e.g., Mistral 7B)** with a NER-specific prompt reviews low-confidence spans or text flagged for new entity types (e.g., SKILL). It runs asynchronously on a subset of data.
*   **SDD Contract**: Component A outputs tokens, spans, and confidence scores. Component B consumes low-confidence spans and a list of target entity type definitions.

**Pattern 2: DOM-Grounded, Schema-Constrained Extractor**
*   **Component**: A **fine-tuned 3B-7B LLM** (e.g., Llama 3.1, Phi-3) using a framework like **"SLOT"** for constrained decoding.
*   **Input**: Cleaned text + simplified DOM tree (tag paths, semantic hints) + a **JSON Schema** defining the target structure.
*   **Output**: Valid JSON object with extracted fields, each accompanied by a list of **source XPaths** for provenance.
*   **SDD Contract**: The schema is the source of truth. The model's system prompt mandates XPath inclusion. Validation is a post-processing step.

**Pattern 3: Hybrid Relation Extraction**
*   **Component A (Entity Linker)**: Uses Pattern 1's NER pipeline to identify candidate entities and link them to a knowledge base (KB).
*   **Component B (Relation Classifier)**: A **small LLM** performs relation classification *only* on pre-identified entity pairs that are spatially proximate in the text or DOM. The prompt includes the entity types, context, and a list of possible relations (e.g., `acquired_by`, `partnered_with`).
*   **SDD Contract**: Component A outputs `(entity1, entity2, context_window)` tuples. Component B outputs `(entity1, relation, entity2, confidence)`.

**Pattern 4: Incremental Topic Classification Service**
*   **Component A (Streaming Embedder)**: A lightweight **sentence-transformer** generates document embeddings in real-time, stored in a vector DB (ChromaDB).
*   **Component B (Batch Cluster & Label)**: A periodic (e.g., hourly) job runs **BERTopic** on the recent embedding batch to discover new topic clusters. A **small LLM** then labels these clusters using a fixed industry taxonomy via zero-shot prompting.
*   **Component C (Classifier)**: For incoming documents, a **few-shot SetFit model** (trained on the LLM-generated cluster labels) assigns topics in real-time.
*   **SDD Contract**: Embeddings are the common interface. The LLM provides labeled training data for the fast classifier, enabling continuous adaptation.

## 6. Open Research Questions

1.  **Efficient Online Learning for Embeddings**: How can we update dense vector indices (like those used in BERTopic) incrementally with new documents while maintaining cluster coherence and minimizing memory growth?
2.  **Formal Provenance for LLM Extractions**: Beyond XPaths, how can we develop a standard, verifiable provenance trail for facts extracted by LLMs, especially when reasoning over multiple text snippets?
3.  **Theoretical Bounds of Zero-Shot NER**: What are the inherent accuracy limits of zero-shot NER for arbitrary new entity types, and how does it correlate with semantic distance from training types?
4.  **Optimal Router Design**: Given a mix of specialized models and LLMs, what is the optimal routing function (based on confidence, entity type, text complexity) to maximize overall pipeline F1 under a fixed throughput budget?
5.  **Cross-Modal DOM Understanding**: How can we best represent DOM structure (a graph/tree) as a sequential prompt for an LLM without losing critical hierarchical and visual layout information that guides human extraction?

## 7. Top 10 Must-Read Papers

| Rank | Paper | Agent | Core Insight for SDD |
| :--- | :--- | :--- | :--- |
| 1 | **GLiNER: Generalist Model for Named Entity Recognition** (Zaratiana et al., NAACL 2024) | 1 | The foundational model for zero-shot NER. Required reading to understand the performance/generalization trade-off. |
| 2 | **Beyond Coherence: Improving Temporal Consistency in Dynamic Topic Models** (2026, EACL Findings) | 4 | Addresses the critical pain point of topic evolution over time, relevant for streaming classification. |
| 3 | **SLOT: Structuring the Output of Large Language Models** (Shen et al., EMNLP Industry 2025) | 2 | Practical, industry-focused methods for enforcing JSON schema output from LLMs, key for reliable extraction. |
| 4 | **LLM-OREF: Open Relation Extraction Framework with Self-Correcting Inference** (2025, EMNLP) | 3 | Demonstrates a state-of-the-art, LLM-based framework for extracting relations without pre-defined schema, relevant for discovery. |
| 5 | **Learning to Generate Structured Output with Schema Reinforcement Learning** (Lu et al., ACL 2025) | 2 | Provides a learning-based approach (vs. decoding-time constraints) to improve schema adherence. |
| 6 | **Entity-Relation Extraction with Dependency Parsing** (2025) | 3 | Represents the high-performance, non-LLM alternative for relation extraction, useful for benchmarking speed/F1. |
| 7 | **Thematic-LM: A LLM-based Multi-agent System for Large-scale Thematic Analysis** (2025) | 4 | Blueprint for scaling LLM-based topic analysis, suggesting an agentic architecture for complex classification. |
| 8 | **A Lightweight DOM-Aware Summarization Method for Low-Cost LLM-Based Web Page Understanding** (Huang, 2025) | 2 | One of the few papers directly addressing DOM-aware processing for LLMs, crucial for web extraction. |
| 9 | **Thinking Before Constraining: A Unified Decoding Framework** (Nguyen et al., 2026) | 2 | Explores the balance between free-form LLM reasoning and strict output constraints, a central tension. |
| 10 | **Modified GLiNER for Ukrainian** (Kashperova et al., 2025) | 1 | Case study in adapting the core GLiNER architecture for new domains/languages, informing customization efforts. |
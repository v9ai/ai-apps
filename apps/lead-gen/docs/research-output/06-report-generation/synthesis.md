# Master Synthesis Report: Parallel Spec-Driven Development for RAG Report Generation

## 1. Executive Summary

1.  **Graph-Based RAG is the Leading Edge:** The most significant architectural shift is toward Graph-RAG and its variants (e.g., DualGraphRAG, Document GraphRAG), which explicitly model relationships between facts and entities. This directly addresses multi-hop reasoning and cross-document synthesis, the core challenge for factual report generation, offering the highest potential leap in factual accuracy.
2.  **Chunking is a Critical, Undervalued Lever:** Research conclusively shows that moving from naive fixed-length chunking to semantic, adaptive, or hierarchical chunking provides one of the highest ROI improvements for retrieval quality and downstream answer faithfulness, often with minimal architectural change.
3.  **Efficiency is Achievable Without Sacrificing Scale:** A clear trend toward "right-sizing" is evident: using smaller, specialized models (e.g., for routing, verification, KV cache management) alongside quantized, efficient main LLMs enables complex agentic workflows on constrained hardware like Apple Silicon, meeting stringent latency targets.
4.  **Verification Must be Multi-Evidence and Structured:** Hallucination mitigation is evolving beyond simple RAG toward systematic verification frameworks. The state of the art involves multi-evidence comparison, citation enforcement, and structured knowledge (graphs) to provide the LLM with not just raw text but verifiable logical connections.
5.  **The Future is Agentic, Hierarchical, and Dynamic:** The overarching architectural direction is systems where an LLM (or coordinator) dynamically chooses retrieval strategies (keyword, semantic, chunk), decides when to stop searching, and traverses knowledge structures (graphs, hierarchies) rather than following a static, linear pipeline.

## 2. Cross-Cutting Themes

*   **Structure Over Raw Text:** A dominant theme across architecture, hallucination, and chunking is the move from treating documents as "bags of chunks" to leveraging their inherent and imposed structure—document hierarchy, semantic boundaries, entity relationships, and knowledge graphs—to guide retrieval and reasoning.
*   **The Specialization & Composition Pattern:** Whether in multi-agent RAG, using a Tiny-Critic for routing, employing a small LM for KV cache drafting (QuantSpec), or having separate verification agents, the trend is decomposing the monolithic "retrieve-and-generate" process into specialized, optimized components.
*   **Dynamic Adaptation:** Systems are becoming context-aware and adaptive. This includes dynamic retrieval termination ("Knowing You Don't Know"), query-dependent graph traversal, adaptive chunk sizing, and phase-disaggregated compute scheduling (WindServe). Static, one-size-fits-all parameters are being replaced by learned or heuristic-driven adaptation.
*   **The Hardware-Software Co-Design Imperative:** Research in local deployment (vllm-mlx, QServe, KV Pareto) explicitly co-designs algorithms with hardware constraints (Apple Silicon unified memory, KV cache budgets). Optimal performance requires choosing quantization levels, chunking strategies, and caching policies in tandem with the target hardware.

## 3. Convergent Evidence

*   **Graphs Drastically Improve Multi-Hop Reasoning:** Agents 1 (Architecture) and 2 (Hallucination) strongly converge on Graph-RAG as a superior paradigm for tasks requiring connection of disparate facts, which is the essence of synthesizing a company report from multiple sources.
*   **Advanced Chunking is Non-Negotiable for Quality:** Agents 2 and 3 provide convergent evidence that retrieval quality—the foundation of factual accuracy—is heavily dependent on chunking strategy. Both highlight semantic/adaptive chunking as a primary driver for improved precision, recall, and answer faithfulness.
*   **Smaller, Quantized Models are Viable for Quality Generation:** Agents 2 and 4 converge on the finding that small (3B-14B parameter), heavily quantized (INT4/INT8) models, when paired with optimized inference frameworks and sophisticated RAG/verification, can achieve >90% of the quality of much larger models for structured generation tasks like reporting.
*   **Verification Requires Independent Cross-Checking:** Both the hallucination and architecture agents emphasize techniques that move beyond single-pass generation. Multi-evidence verification (MEGA-RAG), inter-passage checking (RI²VER), and citation enforcement are consistently presented as critical for high factual accuracy.

## 4. Tensions & Trade-offs

*   **Latency vs. Complexity vs. Accuracy:** There is a fundamental tension between the accuracy gains from complex, multi-step agentic or graph-based systems and the latency target of <10 seconds. An iterative, LLM-directed retrieval process (A-RAG) may be more accurate but slower than a single, well-optimized retrieval pass.
*   **Indexing Complexity vs. Retrieval Simplicity:** Graph-based and hierarchical chunking strategies (Agent 3) often require more complex, expensive pre-processing/indexing (building knowledge graphs, parsing document structure) but promise simpler, more accurate retrieval. The trade-off is between upfront computational cost and ongoing query performance.
*   **Model Specialization vs. System Simplicity:** Using a patchwork of specialized small models (for routing, verification, drafting) can improve efficiency and accuracy but increases system complexity, deployment overhead, and potential failure points compared to using a single, more capable (but larger/slower) LLM.
*   **Chunk Granularity:** Smaller chunks improve retrieval precision (finding the right text) but can harm recall by losing context. Larger chunks preserve context but introduce noise. Adaptive and hierarchical strategies attempt to resolve this but add implementation complexity.

## 5. Recommended SDD Patterns for Parallel Teams

1.  **Pattern: Semantic Chunking First**
    *   **Action:** Before any architectural overhaul, implement and benchmark a semantic/adaptive chunking strategy (e.g., using a lightweight model or rule-based heuristics on punctuation/section headers) against the current fixed-size approach.
    *   **Rationale:** High-impact, low-risk quick win that improves the foundation of all subsequent RAG steps. Directly addresses retrieval quality.

2.  **Pattern: Two-Stage Verification Pipeline**
    *   **Action:** Augment the existing RAG pipeline with a post-generation verification step. Use a small, fast model to classify statements in the generated report as "verifiable" or "not," and for verifiable claims, perform a targeted retrieval to find supporting evidence.
    *   **Rationale:** Directly targets hallucination mitigation. Can be implemented as a separate, parallelizable component, aligning with the specialization theme.

3.  **Pattern: Hybrid Retrieval Strategy**
    *   **Action:** Implement a dispatcher that chooses between two retrieval paths: a) a fast, keyword-enhanced semantic search for simple, factual queries, and b) a slower, graph-aware or iterative retrieval for complex, multi-fact synthesis queries.
    *   **Rationale:** Balances the latency/accuracy trade-off dynamically. Mirrors the hierarchical retrieval interfaces of A-RAG but with a simpler rule-based router initially.

4.  **Pattern: Quantized Model + Optimized Inference Stack**
    *   **Action:** For the local deployment team, define the target not as a model family (e.g., "Llama") but as a performance profile: "INT4-quantized 7B model using vllm-mlx with speculative decoding." Benchmark candidate models against this full-stack profile.
    *   **Rationale:** Ensures hardware/software co-design. The choice of inference engine and quantization is as important as the base model for hitting latency targets.

## 6. Open Research Questions

1.  **End-to-End Latency Budgeting:** For a complete RAG report generation pipeline (retrieve, synthesize, verify) with a <10s target, what is the optimal latency allocation for each stage? Is a 7s/2s/1s (retrieve/generate/verify) split better than 5s/4s/1s?
2.  **Cost of Graph Construction:** What are the practical, scalable methods for dynamically building or updating knowledge graphs from a corpus of business documents (10Ks, reports) with minimal human annotation? Is the accuracy gain worth the indexing lag and cost?
3.  **Optimal Specialization Granularity:** For a given task complexity and hardware budget, what is the optimal number and function of specialized sub-models (router, retriever, verifier, generator)? When does the coordination overhead outweigh the benefits?
4.  **Generalization of "Adaptiveness":** Can a single adaptive chunking, retrieval termination, or routing policy be learned that generalizes well across diverse query types (simple lookup vs. complex synthesis) and document domains (financial vs. legal vs. scientific)?

## 7. Top 10 Must-Read Papers (Synthesized)

1.  **HopRAG: Multi-Hop Reasoning for Logic-Aware Retrieval-Augmented Generation (2025)** - *Architecture*: The seminal paper on graph-based RAG for complex reasoning.
2.  **GRAG: Graph Retrieval-Augmented Generation (2024)** - *Hallucination*: Foundational work on integrating graph structures into RAG, with strong citation backing.
3.  **A Systematic Investigation of Chunking Strategies for RAG (Shaukat et al., 2026)** - *Chunking*: The most comprehensive empirical study on chunking, providing evidence-based recommendations.
4.  **Knowing You Don't Know: Learning When to Continue Search in Multi-round RAG through Self-Practicing (2025)** - *Architecture*: Key work on dynamic retrieval termination, crucial for latency optimization.
5.  **vllm-mlx: Native LLM and MLLM Inference Framework for Apple Silicon (2026)** - *Deployment*: Critical for teams targeting Apple hardware, showing significant throughput gains.
6.  **MEGA-RAG: Multi-Evidence Guided Answer Refinement (2025)** - *Hallucination*: A clear blueprint for a multi-evidence verification framework to enhance factual reliability.
7.  **A-RAG: Scaling Agentic Retrieval-Augmented Generation via Hierarchical Retrieval Interfaces (2026)** - *Architecture*: Presents the vision of LLM-controlled, hierarchical retrieval as the future of flexible RAG.
8.  **QServe: W4A8KV4 Quantization and System Co-design for Efficient LLM Serving (2024)** - *Deployment*: Details a state-of-the-art quantization scheme that balances quality and memory footprint.
9.  **MultiDocFusion: A Multimodal Hierarchical Chunking Pipeline (Shin et al., 2025)** - *Chunking*: Demonstrates the power of leveraging document structure and hierarchy for high-quality retrieval.
10. **Tiny-Critic RAG: Empowering Agentic Fallback with Parameter-Efficient Small Language Models (2026)** - *Architecture/Deployment*: Exemplifies the specialization trend, showing how small models can effectively manage control flow in a larger RAG system.
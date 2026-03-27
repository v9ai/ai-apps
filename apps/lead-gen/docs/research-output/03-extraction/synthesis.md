# Master Synthesis Report: Parallel Spec-Driven Development for Web-Scale Information Extraction

## 1. Executive Summary

1. **Hybrid Architectures Dominate**: The most promising path forward combines specialized, efficient models (like GLiNER for NER) with small LLMs (3B-7B parameters) for complex tasks like relation extraction and classification, balancing accuracy with the ~100 pages/sec throughput requirement.

2. **Zero-Shot Capability is Achievable but Costly**: Both GLiNER for NER and LLM-based approaches for relation extraction demonstrate strong zero-shot performance on new entity/relation types, but this comes with computational trade-offs. LLMs offer better generalization but slower inference.

3. **DOM Structure is Underexplored Goldmine**: While Agent 2 found limited academic work specifically combining DOM awareness with structured extraction, DOM-aware methods show promise for improving accuracy without requiring massive retraining or labeling efforts.

4. **Streaming/Online Processing is a Critical Gap**: Across all agents, a significant research gap exists for low-latency, memory-efficient streaming updates—essential for web-scale applications but poorly addressed in recent literature.

5. **The BERT Baseline is Still Competitive**: For pure NER on known types, BERT's 92.3% F1 remains strong. New approaches must justify their added complexity with tangible benefits in zero-shot capability, new type support, or DOM exploitation.

## 2. Cross-Cutting Themes

**Theme 1: The LLM Inflection Point**
- All agents report increasing LLM adoption, but with different emphases: Agent 1 sees LLMs enhancing specialized NER models; Agent 2 focuses on small LLMs for structured extraction; Agent 3 finds LLMs dominating relation extraction; Agent 4 observes LLMs replacing traditional topic modeling for labeling/classification.

**Theme 2: Specialization vs. Generalization Trade-off**
- Specialized models (BERT for NER, BERTopic for clustering) offer efficiency but limited flexibility. Generalist models (GLiNER, LLMs) offer zero-shot capability but higher computational cost. The optimal solution appears to be strategic hybridization.

**Theme 3: Structured Output as a Unifying Challenge**
- Whether extracting entities, relations, or topics, all tasks require structured output (spans, triples, hierarchies). Techniques like schema reinforcement learning (Agent 2) and constrained decoding (Agent 2) apply across domains.

**Theme 4: The Provenance Imperative**
- XPath tracking (Agent 2), temporal consistency (Agent 4), and relation attribution (Agent 3) all reflect a growing need for traceable, auditable extraction—critical for business applications.

## 3. Convergent Evidence

**Agreement 1: Small LLMs (3B-7B) Are Practical for Local Deployment**
- Agent 2: 3B-7B models with quantization can run on <8GB RAM
- Agent 4: Recommends fine-tuning small LLMs for industry classification
- Implication: The ~100 pages/sec target is achievable with optimized small LLMs

**Agreement 2: Zero-Shot Classification Outperforms Traditional Topic Modeling**
- Agent 4: LLM-based zero-shot classification likely outperforms BERTopic for industry categorization
- Agent 1: GLiNER shows strong zero-shot NER performance
- Agent 3: LLMs demonstrate strong zero-shot relation extraction
- Implication: For new entity/relation types, zero-shot approaches are preferable to retraining

**Agreement 3: DOM Awareness Improves Extraction Quality**
- Agent 2: DOM-aware summarization improves web page understanding
- Agent 1: DOM structure exploitation can improve PRODUCT entity F1
- Implication: HTML/DOM parsing should be integrated into the extraction pipeline

**Agreement 4: Hybrid Approaches Offer the Best Balance**
- All agents suggest combining multiple techniques: specialized models for efficiency + LLMs for flexibility, traditional clustering + LLM labeling, etc.

## 4. Tensions & Trade-offs

**Tension 1: Accuracy vs. Throughput**
- **BERT NER**: 92.3% F1, ~100 pages/sec (baseline)
- **GLiNER**: Slightly lower F1 on standard types, better zero-shot, similar speed
- **LLM-based extraction**: Better zero-shot, much slower (seconds per page)
- **Resolution**: Use specialized models for high-throughput tasks, LLMs only where zero-shot capability is essential

**Tension 2: Structured Precision vs. Flexible Generalization**
- **Schema-constrained LLMs** (Agent 2): Ensure valid JSON output but may miss unconventional patterns
- **Open relation extraction** (Agent 3): Discovers novel relations but produces less structured output
- **Resolution**: Implement multi-stage pipelines with increasing flexibility at later stages

**Tension 3: Temporal Consistency vs. Streaming Efficiency**
- **Dynamic topic models** (Agent 4): Track topic evolution but require complex temporal linkages
- **Streaming requirements**: Need low-latency updates with minimal memory
- **Resolution**: Implement sliding windows with periodic full recomputation rather than continuous incremental updates

**Tension 4: Academic Innovation vs. Production Readiness**
- **Academic papers**: Focus on novel architectures (GLiNER, LLM-OREF) but often lack production metrics
- **Production needs**: Require proven reliability, throughput metrics, and maintenance simplicity
- **Resolution**: Prefer approaches with available implementations (Hugging Face models) and clear scalability paths

## 5. Recommended SDD Patterns for Parallel Teams

**Pattern 1: Layered Extraction Pipeline**
```
Layer 1 (High-throughput): DOM parsing + BERT/GLiNER NER → ~100 pages/sec
Layer 2 (Medium-throughput): Small LLM relation extraction → ~10 pages/sec  
Layer 3 (Low-throughput): Large LLM for ambiguous cases/novel types → ~1 page/sec
```
- **Rationale**: Matches task complexity with appropriate computational resources
- **Implementation**: Priority queue system with fallback to higher layers when confidence is low

**Pattern 2: DOM-First Processing**
- Parse HTML to structured DOM before any NLP
- Extract visual hierarchy, semantic HTML tags, and XPath references
- Use DOM features as additional input to NER/relation models
- **Expected benefit**: +3-5% F1 for PRODUCT entities without retraining

**Pattern 3: Zero-Shot First, Fine-Tune Later**
- For new entity/relation types, start with zero-shot approaches (GLiNER, LLMs)
- Collect extracted examples as weak supervision
- Periodically fine-tune specialized models on accumulated data
- **Expected benefit**: Rapid deployment of new types without labeling bottleneck

**Pattern 4: Schema-Guided Extraction**
- Define JSON schemas for all extraction outputs
- Use constrained decoding for LLM-based extraction
- Implement schema validation as part of pipeline
- **Expected benefit**: Guaranteed output structure, easier downstream integration

**Pattern 5: Streaming-Aware Architecture**
- Process documents in micro-batches (10-100 pages)
- Maintain sliding window of recent embeddings for topic continuity
- Separate hot path (current extraction) from cold path (model updates)
- **Expected benefit**: Low-latency processing with periodic quality improvements

## 6. Open Research Questions

1. **Throughput-Optimized Zero-Shot NER**: Can GLiNER or similar architectures achieve both BERT-level F1 on standard types AND strong zero-shot performance while maintaining ~100 pages/sec?

2. **DOM-Aware Model Architectures**: How can DOM structure be effectively encoded into transformer models without excessive computational overhead?

3. **Streaming Topic Modeling with LLMs**: Can small LLMs enable efficient streaming topic detection and classification with temporal consistency?

4. **Cross-Task Transfer Learning**: Can a single model architecture efficiently handle NER, relation extraction, and classification with shared DOM understanding?

5. **Provenance-Aware Training**: How can models be trained to not only extract information but also provide accurate XPath/positional provenance?

6. **Business Relation Evolution**: How can relation extraction models track temporal changes in business relationships (mergers, acquisitions, leadership changes)?

7. **Memory-Efficient Embedding Updates**: What algorithms enable incremental updates to document embeddings without full recomputation?

8. **Zero-Shot Industry Classification**: What approaches work best for zero-shot classification into fine-grained industry categories (B2B tech, SaaS, fintech)?

9. **Multimodal Web Extraction**: How should visual page layout be incorporated with text and DOM structure for optimal extraction?

10. **Extraction Confidence Calibration**: How can confidence scores be reliably calibrated across different extraction models and tasks?

## 7. Top 10 Must-Read Papers

1. **GLiNER: Generalist Model for Named Entity Recognition** (Zaratiana et al., NAACL 2024)
   - **Why**: Directly addresses zero-shot NER with span-based approach
   - **Relevance**: Primary candidate to replace BERT baseline while adding zero-shot capability

2. **Beyond Coherence: Improving Temporal Consistency and Interpretability in Dynamic Topic Models** (EACL Findings 2026)
   - **Why**: Addresses critical gaps in temporal topic modeling
   - **Relevance**: Essential for streaming/online classification scenarios

3. **SLOT: Structuring the Output of Large Language Models** (Shen et al., EMNLP Industry Track 2025)
   - **Why**: Industry-focused approach to structured output generation
   - **Relevance**: Practical guidance for JSON schema-constrained extraction

4. **LLM-OREF: Open Relation Extraction Framework using LLMs with Self-Correcting Inference** (EMNLP 2025)
   - **Why**: State-of-the-art relation extraction with self-correction
   - **Relevance**: Best approach for business relation extraction from web text

5. **A Lightweight DOM-Aware Summarization Method for Low-Cost LLM-Based Web Page Understanding** (Huang, 2025)
   - **Why**: Addresses DOM-aware processing specifically
   - **Relevance**: Key to exploiting DOM structure for improved extraction

6. **Thematic-LM: A LLM-based Multi-agent System for Large-scale Thematic Analysis** (2025)
   - **Why**: Shows LLM-based alternative to traditional topic modeling
   - **Relevance**: For zero-shot industry classification and topic labeling

7. **Entity-Relation Extraction with Dependency Parsing** (2025)
   - **Why**: Achieved 92.3% F1 on NYT dataset with dependency information
   - **Relevance**: High-performance alternative to LLM-based relation extraction

8. **Thinking Before Constraining: A Unified Decoding Framework for Large Language Models** (Nguyen et al., 2026)
   - **Why**: Latest research on constrained decoding
   - **Relevance**: For balancing free-form reasoning with structured output needs

9. **Learning to Generate Structured Output with Schema Reinforcement Learning** (Lu et al., ACL 2025)
   - **Why**: Schema-based training approach
   - **Relevance**: For improving structured extraction accuracy

10. **Sharpness-Aware Minimization for Topic Models with High-Quality Document Representations** (NAACL 2025)
    - **Why**: Optimization improvements for embedding-based models
    - **Relevance**: For making BERTopic more efficient in streaming scenarios

---

**Implementation Priority Ranking**: Based on the formula (F1_delta + new_types_enabled) ÷ implementation_hours:

1. **DOM-aware preprocessing** (highest ROI, enables multiple improvements)
2. **GLiNER for NER** (adds zero-shot capability with minimal performance drop)
3. **Small LLM for relation extraction** (adds new relation types with moderate implementation)
4. **Schema-guided output** (improves downstream integration)
5. **Streaming architecture** (enables web-scale processing)
6. **LLM-enhanced topic labeling** (improves classification quality)
7. **Dynamic topic tracking** (most complex, lowest immediate ROI)

This synthesis provides a roadmap for parallel teams to implement a state-of-the-art web information extraction system that balances academic innovations with production requirements.
# Master Synthesis Report: Parallel Spec-Driven Development for Entity Resolution

## 1. Executive Summary

1. **Hybrid architectures dominate**: The most promising approaches combine multiple techniques—LLMs for semantic understanding, GNNs for relational reasoning, and traditional blocking for scalability—rather than relying on any single method.

2. **Recall improvement is the primary bottleneck**: Across all agents, the consensus is that moving from 84.2% to >90% recall requires better handling of semantic similarity, transitive relationships, and noisy/missing data, not just lexical matching.

3. **Cost-efficiency drives innovation**: There's strong emphasis on making advanced techniques (LLMs, GNNs) practical through distillation, RAG optimization, and efficient blocking, with several papers specifically targeting <1ms inference.

4. **Zero-shot capability is maturing**: Multiple approaches now achieve competitive performance without labeled pairs, using ensemble methods, pretrained embeddings, and in-context learning with LLMs.

5. **Transitive closure is critical for recall**: Agent 3's findings highlight that explicitly modeling transitive relationships (as in GraLMatch and TransClean) directly addresses the recall gap in multi-source matching.

## 2. Cross-Cutting Themes

**Theme 1: Semantic Understanding Beyond Lexical Matching**
- Agent 1: Pretrained embeddings capture semantic similarity across languages
- Agent 2: LLMs provide contextual understanding for entity matching
- Agent 3: GNNs learn relational semantics between entities

**Theme 2: Scalability Through Intelligent Blocking**
- Agent 1: SQL blocking as baseline (84.2% recall limitation)
- Agent 2: CE-RAG4EM uses blocking-based batch retrieval
- Agent 3: Blocking essential for 100K-entity GNN deployment

**Theme 3: Hybridization of Methods**
- Agent 1: EnsembleLink combines multiple weak signals
- Agent 2: RAG architectures combine retrieval with generation
- Agent 3: GraLMatch combines graphs with language models

**Theme 4: Resource-Constrained Deployment**
- Agent 1: DistillER focuses on practical deployment
- Agent 2: Edge deployment challenges for LLMs
- Agent 3: Memory optimization for 100K-entity graphs

## 3. Convergent Evidence

**Agreement 1: Transitive relationships are key to recall improvement**
- Agent 1: "Transitive relationship reasoning" needed for recall
- Agent 3: GraLMatch explicitly handles transitive closure; TransClean uses transitive consistency

**Agreement 2: LLMs offer semantic advantages but need optimization**
- Agent 1: LLM-based approaches show promise but are computationally expensive
- Agent 2: Cost-efficient RAG architectures reduce LLM computation
- Agent 3: OpenSanctions compares rule-based vs LLM approaches

**Agreement 3: No single method solves all problems**
- Agent 1: Recommends ensemble approaches
- Agent 2: Highlights hybrid RAG architectures
- Agent 3: Advocates for graph+LM combinations

**Agreement 4: Standard benchmarks show room for improvement**
- All agents reference DBLP-ACM, Amazon-Google, Walmart-Amazon benchmarks
- Consensus that F1 > 90% is achievable but requires innovation

## 4. Tensions & Trade-offs

**Tension 1: Precision vs Recall Optimization**
- Current system: High precision (96.8%) but lower recall (84.2%)
- LLM approaches: May improve recall but risk precision loss
- GNN approaches: Better at transitive closure but computationally intensive

**Tension 2: Accuracy vs Efficiency**
- Agent 2: CE-RAG4EM trades some accuracy for cost efficiency
- Agent 1: DistillER reduces GPT-4 costs but may lose nuance
- Agent 3: GNNs offer accuracy but challenge <1ms latency target

**Tension 3: Zero-shot capability vs Specialized training**
- Agent 1: Zero-shot methods work without labeled data
- Agent 3: Some GNN approaches require training data
- Agent 2: Distillation requires teacher model labels

**Tension 4: Local deployment vs Cloud-scale models**
- Requirement: <1ms per query locally
- Reality: Some LLM approaches require cloud inference
- Solution: Distillation and smaller models enable local deployment

## 5. Recommended SDD Patterns for Parallel Teams

**Pattern 1: Layered Recall Enhancement**
```
Layer 1: Fast blocking (existing SQL) → High precision, moderate recall
Layer 2: Embedding similarity (Sentence-BERT) → Semantic recall boost
Layer 3: Transitive closure (GraLMatch-inspired) → Relationship-based recall
Layer 4: LLM adjudication (CE-RAG4EM) → Difficult edge cases only
```

**Pattern 2: Progressive Distillation Pipeline**
```
Phase 1: GPT-4 generates labels for hard cases ($20/10K pairs)
Phase 2: Train 1B-3B model on distilled knowledge
Phase 3: Deploy locally with <1ms inference
Phase 4: Continuous refinement with active learning
```

**Pattern 3: Hybrid Graph-Text Architecture**
```
Component A: Graph construction (entities as nodes, similarities as edges)
Component B: GNN for transitive closure detection
Component C: Text encoder for semantic similarity
Component D: Ensemble classifier combining signals
```

**Pattern 4: Cost-Optimized LLM Integration**
```
Strategy: Use LLMs only where needed (CE-RAG4EM pattern)
Implementation: Blocking → Retrieval → LLM adjudication
Optimization: Batch processing, prompt engineering, caching
```

## 6. Open Research Questions

1. **Efficiency Frontier**: What's the optimal accuracy/efficiency trade-off for <1ms inference on 100K entities?

2. **Distillation Limits**: How much performance can be preserved when distilling GPT-4 to 1B-3B models for entity resolution?

3. **Transitive Scalability**: Can transitive closure detection scale to 100K+ entities while maintaining <1ms query latency?

4. **Zero-shot Ceiling**: What's the maximum recall achievable with zero-shot methods on heterogeneous, noisy data?

5. **Hybrid Architecture Optimization**: What's the optimal combination of rules, embeddings, graphs, and LLMs?

6. **Cross-domain Transfer**: How well do methods trained on one domain (e.g., sanctions data) transfer to others?

7. **Incremental Learning**: Can systems efficiently incorporate new labeled pairs without full retraining?

## 7. Top 10 Must-Read Papers

1. **GraLMatch: Matching Groups of Entities with Graphs and Language Models** (2024)  
   *Key insight*: Directly addresses transitive closure for recall improvement

2. **TransClean: Finding False Positives in Multi-Source Entity Matching** (2025)  
   *Key insight*: Uses transitive consistency to improve precision while maintaining recall

3. **EnsembleLink: Accurate Record Linkage Without Training Data** (2026)  
   *Key insight*: Zero-shot ensemble approach for recall improvement

4. **Cost-Efficient RAG for Entity Matching with LLMs** (2026)  
   *Key insight*: Practical LLM integration with blocking for efficiency

5. **Probabilistic Record Linkage Using Pretrained Text Embeddings** (2025)  
   *Key insight*: Embedding-based approach for semantic recall improvement

6. **OpenSanctions Pairs: Large-Scale Entity Matching with LLMs** (2026)  
   *Key insight*: Real-world benchmark for company matching across heterogeneous sources

7. **DistillER: Knowledge Distillation in Entity Resolution with Large Language Models** (2026)  
   *Key insight*: Making LLM-based ER practical through distillation

8. **Match, Compare, or Select? An Investigation of Large Language Models for Entity Matching** (2024)  
   *Key insight*: Foundational study of LLM approaches beyond binary matching

9. **MoRER: Efficient Model Repository for Entity Resolution** (2024)  
   *Key insight*: Model reuse across multiple ER tasks

10. **A Survey on Symbolic Knowledge Distillation of Large Language Models** (2024)  
    *Key insight*: Theoretical foundation for distillation techniques

---

## **Highest-ROI Recommendation for Recall Improvement**

**Implement GraLMatch-inspired transitive closure detection on top of your existing system.**

**Why this is the single highest-ROI change:**
1. **Directly targets your recall gap** (84.2% → >90%) by capturing relationships your current pairwise matching misses
2. **Minimal precision risk** when implemented as a recall-enhancing layer (unlike LLMs which may reduce precision)
3. **Works with existing labeled pairs** but doesn't require new ones
4. **Local deployment feasible** with optimized graph algorithms
5. **Complements rather than replaces** your current high-precision system

**Implementation approach:**
- Phase 1: Add lightweight graph layer to detect transitive relationships
- Phase 2: Use these relationships to identify candidate pairs for re-evaluation
- Phase 3: Apply conservative similarity thresholds to maintain precision
- Phase 4: Benchmark recall improvement on your 100K-entity dataset

This approach leverages the strongest convergent evidence across all agents while respecting your constraints of no new labeled pairs and <1ms local inference.
# Master Synthesis Report: Parallel Spec-Driven Development for B2B Lead Scoring

## 1. Executive Summary

1. **Tabular Foundation Models (TFMs) are production-ready for small datasets**: TabPFN (Nature 2025) demonstrates superior F1 (+2-5%) and inference speed (~3,500 leads/sec) over XGBoost on <10K samples, eliminating feature engineering through in-context learning.

2. **Online calibration is critical for distribution shift**: Recent methods (2024-2026) achieve ECE of 0.05-0.10 with 1-10ms latency using streaming conformal prediction, maintaining coverage guarantees under covariate shift without full retraining.

3. **Temporal event modeling remains underexplored**: While Retentive Hawkes Processes (2024) offer linear memory complexity for long sequences, few papers integrate business events (funding, hiring) with lead scoring—a significant research gap.

4. **Retrieval-augmented embeddings boost ICP matching**: FTabR (2026) with pre-clustering achieves 3-5% F1 improvement and 20-50ms retrieval over 100K companies, adapting retrieval-augmented generation to tabular data.

## 2. Cross-Cutting Themes

**Inference Efficiency as Primary Constraint**: All agents emphasize latency/throughput requirements (≥500 leads/sec, <100ms retrieval). Solutions include:
- TabPFN's optimized attention (Agent 1)
- Streaming conformal prediction (Agent 2)
- RHP's linear memory design (Agent 3)
- FTabR's pre-clustering (Agent 4)

**Small Data Optimization**: Multiple agents identify <10K samples as the sweet spot for:
- TabPFN's in-context learning (Agent 1)
- ModernNCA's differentiable KNN (Agent 1)
- Retrieval-augmented methods' few-shot capability (Agent 4)

**Distribution Shift Resilience**: Agents 2 and 3 both address temporal dynamics:
- Online conformal prediction adapts to covariate shift (Agent 2)
- Temporal models capture event sequences (Agent 3)
- Both require continuous monitoring and adaptation

## 3. Convergent Evidence

**XGBoost Surpassability**: Multiple agents confirm TFMs can outperform XGBoost:
- TabPFN beats XGBoost on small datasets (Agent 1)
- TabR outperforms XGBoost in classification (Agent 4)
- Gradient boosting still dominates practical applications (Agent 3)

**Embedding Dimension Consensus**: 256-512 dimensions optimal for company representations:
- TabR uses 256-512 dims (Agent 4)
- Modern methods trend toward 384 dims (Agent 4)
- Balances expressiveness with retrieval speed

**GPU Acceleration Beneficial**: Multiple agents note GPU advantages:
- TabPFN/TabICL benefit from GPU inference (Agent 1)
- Transformer-based embeddings leverage GPU acceleration (Agent 4)
- But CPU alternatives exist (ModernNCA)

## 4. Tensions & Trade-offs

**Accuracy vs. Interpretability**:
- TabPFN offers superior F1 but is less interpretable than XGBoost (Agent 1)
- ModernNCA provides interpretable predictions with competitive accuracy (Agent 1)
- Retrieval-augmented methods offer explainability through retrieved examples (Agent 4)

**Adaptation Speed vs. Coverage Guarantees**:
- Retrospective adjustment methods adapt faster but have weaker theoretical guarantees (Agent 2)
- Traditional online conformal prediction maintains coverage but adapts slowly (Agent 2)

**Model Complexity vs. Deployment Simplicity**:
- TFMs eliminate feature engineering but require GPU infrastructure (Agent 1)
- XGBoost requires extensive feature engineering but deploys easily on CPU (Agent 1)
- Temporal models capture complex patterns but need specialized architectures (Agent 3)

**Retrieval Accuracy vs. Speed**:
- Full retrieval over 100K companies is accurate but slow (Agent 4)
- Pre-clustering (FTabR) speeds retrieval but may miss cross-cluster matches (Agent 4)

## 5. Recommended SDD Patterns for Parallel Teams

### Pattern 1: Phased Foundation Model Integration
```
Week 1-2: TabPFN POC (Agent 1)
  - Benchmark vs. XGBoost on historical data
  - Validate ≥500 leads/sec inference
Week 3-4: Online calibration wrapper (Agent 2)
  - Implement sliding window conformal prediction
  - Add ECE monitoring dashboard
Week 5-6: Temporal signal integration (Agent 3)
  - Add event sequence features to TabPFN context
  - Test RHP for sequence modeling
Week 7-8: Enhanced ICP retrieval (Agent 4)
  - Implement FTabR with 384-dim embeddings
  - Optimize LanceDB indices
```

### Pattern 2: Ensemble with Specialized Components
```
Core: XGBoost (maintains current performance)
Enhancer 1: TabPFN for low-confidence predictions
Enhancer 2: Temporal RHP model for companies with event sequences
Calibration: Online conformal prediction across all components
Retrieval: FTabR for ICP matching (separate service)
```

### Pattern 3: A/B Testing Framework
```
Control: Current XGBoost ensemble
Treatment A: TabPFN + online calibration
Treatment B: XGBoost + temporal features + calibration
Treatment C: Hybrid ensemble (Pattern 2)
Metrics: F1, inference latency, calibration error, business outcomes
```

## 6. Open Research Questions

1. **How do TFMs perform under extreme class imbalance?** (Agents 1, 4)
   - Lead scoring typically has <5% positive rate
   - TabPFN claims strength on imbalanced data but needs validation

2. **What's the optimal calibration method for in-context learning models?** (Agents 1, 2)
   - TabPFN doesn't output probabilities natively
   - How to apply conformal prediction to in-context learners?

3. **How to efficiently combine temporal event sequences with static features?** (Agent 3)
   - Multi-modal architectures needed
   - Training efficiency for rare events

4. **Can retrieval-augmented methods scale to 1M+ companies?** (Agent 4)
   - Pre-clustering degradation at scale
   - Incremental index updates for new companies

5. **What theoretical guarantees exist for online calibration under concept drift?** (Agent 2)
   - Most guarantees assume covariate shift only
   - Lead scoring faces both covariate and concept drift

## 7. Top 10 Must-Read Papers

1. **TabPFN** (Nature, 2025) - Foundation model for tabular data with in-context learning
2. **Online Conformal Inference with Retrospective Adjustment** (2025) - Fast adaptation to distribution shift
3. **FTabR: Faster Retrieval-Augmented Deep Learning** (2026) - Optimized retrieval for tabular data
4. **A Retentive Hawkes Process for Long Event Sequence Prediction** (2024) - Efficient temporal modeling
5. **TabR: Tabular Data Classification with RAG** (IEEE Access, 2024) - Retrieval-augmented tabular learning
6. **Optimal training-conditional regret for online conformal prediction** (2026) - Theoretical foundations
7. **ModernNCA: Revisiting Nearest Neighbor for Tabular Data** (2024) - Interpretable alternative to TFMs
8. **Profiling before scoring: two-stage model for B2B lead prioritization** (2026) - B2B-specific architecture
9. **Coverage Guarantees for Pseudo-Calibrated Conformal Prediction** (2026) - Theory under distribution shift
10. **The relevance of lead prioritization: B2B lead scoring model** (2025) - Industry case study with gradient boosting

---

**Implementation Priority**: Start with TabPFN POC (highest potential F1 gain) while implementing online calibration wrapper for distribution shift resilience. Parallelize temporal signal exploration and ICP retrieval enhancement as secondary tracks. Maintain XGBoost as fallback during transition.
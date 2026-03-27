# Master Synthesis Report: Parallel Spec-Driven Development for B2B Lead Scoring

## 1. Executive Summary

1. **Tabular foundation models (TabPFN/TabICL) are now viable replacements for XGBoost** in small-to-medium datasets (<10K samples), offering superior F1 (up to +5%), eliminating feature engineering, and maintaining high inference throughput (~3,500 leads/sec).

2. **Online conformal prediction with retrospective adjustment** provides robust calibration under distribution shift with minimal latency (1-15ms) and memory overhead, ensuring reliable probability estimates without full model retraining.

3. **Temporal event modeling remains underdeveloped for B2B applications**, but Retentive Hawkes Processes (RHP) offer promising linear-complexity architectures for long business event sequences (funding, hiring, tech stack changes).

4. **Retrieval-augmented embeddings (FTabR) significantly improve ICP matching** by 3-5% F1 with optimized retrieval speeds (20-50ms over 100K candidates) through pre-clustering and learned attention-based similarity.

5. **The ensemble approach is shifting from multiple XGBoost models to hybrid systems** combining foundation models for prediction, retrieval systems for similarity, and online calibration for reliability.

## 2. Cross-Cutting Themes

**Theme 1: In-Context Learning Paradigm**
- Appears in tabular foundation models (TabPFN), retrieval-augmented methods (TabR), and temporal modeling (RHP)
- Enables rapid adaptation without full retraining
- Reduces dependency on extensive feature engineering

**Theme 2: Memory and Latency Optimization**
- Linear memory complexity in RHP for temporal sequences
- Pre-clustering in FTabR for faster retrieval
- Streaming conformal prediction with O(1) memory
- All methods prioritize inference speed ≥500 leads/sec

**Theme 3: Hybrid Architecture Patterns**
- Retrieval-augmented prediction (TabR/FTabR)
- Multi-stage pipelines (profiling then scoring)
- Ensemble of specialized components rather than monolithic models

**Theme 4: Distribution Shift Resilience**
- Online calibration methods for covariate shift
- Retrospective adjustment for faster adaptation
- Theoretical coverage guarantees under shift

## 3. Convergent Evidence

**Agreement 1: XGBoost is no longer the undisputed champion** for small-to-medium tabular datasets
- Agent 1: TabPFN outperforms XGBoost on <10K samples
- Agent 3: Gradient boosting still dominates practical applications but alternatives emerging
- Agent 4: Retrieval-augmented methods beat XGBoost in classification tasks

**Agreement 2: Inference speed requirements are achievable** with modern architectures
- All agents report methods meeting or exceeding 500 leads/sec
- Batch processing and architectural optimizations enable high throughput

**Agreement 3: Calibration is critical for reliable predictions**
- Agent 2: Online methods maintain coverage under shift
- Agent 1: Foundation models provide well-calibrated probabilities
- Agent 4: Retrieval reduces uncertainty in predictions

**Agreement 4: Specialized architectures beat general-purpose models**
- RHP for temporal sequences vs. generic transformers
- TabPFN for tabular vs. vision-language foundation models
- FTabR for retrieval vs. generic similarity search

## 4. Tensions & Trade-offs

**Tension 1: Accuracy vs. Interpretability**
- Tabular foundation models (Agent 1) offer superior accuracy but are black boxes
- ModernNCA offers interpretability with slightly lower performance
- XGBoost provides feature importance but may be less accurate

**Tension 2: Adaptation Speed vs. Stability**
- Online conformal prediction with retrospective adjustment (Agent 2) adapts quickly but may overfit to recent noise
- Sliding window approaches are more stable but slower to adapt
- Foundation models require no retraining but may not adapt to domain shifts

**Tension 3: Temporal Signal Integration Complexity**
- RHP (Agent 3) handles long sequences efficiently but requires specialized implementation
- Simple time-window features are easier but less expressive
- No clear evidence on AUC improvement from temporal signals alone

**Tension 4: Retrieval Accuracy vs. Speed**
- Full retrieval (TabR) is most accurate but slow
- Pre-clustered retrieval (FTabR) is faster but may miss cross-cluster matches
- Siamese networks are fast but less accurate

## 5. Recommended SDD Patterns for Parallel Teams

**Pattern 1: Three-Tier Prediction Pipeline**
```
Tier 1: TabPFN Foundation Model (primary prediction)
Tier 2: FTabR Retrieval System (ICP matching & similarity)
Tier 3: Online Conformal Calibration (probability calibration)
```

**Pattern 2: Temporal Signal Integration Strategy**
- Implement RHP for business event sequences in parallel with static features
- Create ensemble weights based on validation performance
- Use attention mechanisms to combine temporal and static signals

**Pattern 3: Progressive Replacement Strategy**
1. **Phase 1**: Augment XGBoost with TabPFN predictions (ensemble)
2. **Phase 2**: Replace XGBoost with TabPFN for primary scoring
3. **Phase 3**: Integrate temporal signals via RHP
4. **Phase 4**: Add retrieval-augmented ICP matching

**Pattern 4: Calibration-First Development**
- Start with online conformal prediction from day one
- Implement continuous calibration monitoring
- Design APIs to expose both point predictions and calibrated intervals

**Pattern 5: Retrieval-Optimized Embedding Architecture**
- 384-dimensional embeddings (balance of expressiveness/speed)
- K-Means pre-clustering for 100K+ company database
- HNSW indices in LanceDB for sub-50ms retrieval
- Batch processing of 32-64 queries

## 6. Open Research Questions

1. **Quantitative benefits of temporal signals**: What is the actual AUC/F1 improvement from business event sequences (funding, hiring, tech stack) over static features alone?

2. **Optimal ensemble weighting**: How should predictions from foundation models, temporal models, and retrieval systems be combined for maximum accuracy?

3. **Calibration under compound shifts**: How do online calibration methods perform under simultaneous covariate shift, concept drift, and label shift?

4. **Cross-modal company representations**: What is the optimal way to combine tabular data, text descriptions, and relationship graphs for company embeddings?

5. **Resource-accuracy trade-off curves**: What are the precise Pareto frontiers for inference speed vs. accuracy across different model classes?

6. **Interpretability of foundation models**: Can we explain TabPFN predictions as effectively as XGBoost feature importance?

7. **Cold-start problem for new companies**: How do retrieval systems handle companies with limited historical data?

## 7. Top 10 Must-Read Papers

1. **"Accurate predictions on small data with a tabular foundation model"** (Nature, 2025) - TabPFN foundation
2. **"TabICL: A Tabular Foundation Model for In-Context Learning on Large Data"** (2025) - Scaling foundation models
3. **"Online Conformal Inference with Retrospective Adjustment for Faster Adaptation to Distribution Shift"** (Jungbin Jun & Ilsang Ohn, 2025) - Calibration under shift
4. **"A Retentive Hawkes Process for Long Event Sequence Prediction"** (Huang et al., 2024) - Temporal modeling
5. **"FTabR: Faster Retrieval-Augmented Deep Learning with Pre-Clustering for Tabular Data Classification and Regression"** (2026) - Optimized retrieval
6. **"Optimal training-conditional regret for online conformal prediction"** (Liang et al., 2026) - Theoretical guarantees
7. **"Profiling before scoring: a two-stage predictive model for B2B lead prioritization"** (Wu et al., 2026) - B2B application
8. **"Revisiting Nearest Neighbor for Tabular Data: A Deep Tabular Baseline Two Decades Later"** (2024) - ModernNCA alternative
9. **"Coverage Guarantees for Pseudo-Calibrated Conformal Prediction under Distribution Shift"** (Siahkali et al., 2026) - Robust calibration
10. **"The relevance of lead prioritization: a B2B lead scoring model based on machine learning"** (González-Flores et al., 2025) - Industry case study

---

**Final Synthesis Insight**: The field is converging on **modular, specialized systems** rather than monolithic models. The optimal B2B lead scoring system in 2026 will likely combine: (1) a tabular foundation model for core predictions, (2) a retrieval system for ICP matching, (3) temporal models for event sequences, and (4) online calibration for reliability—all operating at ≥500 leads/sec. The transition from XGBoost should be progressive, with foundation models showing the most immediate promise for replacement.
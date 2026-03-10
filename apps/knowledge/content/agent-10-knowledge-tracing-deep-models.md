Now I have enough information to create a comprehensive deep dive. Let me organize the findings:

# Deep Knowledge Tracing Models: A Comprehensive Landscape Review (2018-2026)

## Executive Summary

This review provides a comprehensive analysis of deep knowledge tracing (DKT) models, tracing their evolution from early LSTM-based approaches to modern transformer and graph-based architectures. Building on the cognitive science foundations previously established, we examine how deep learning has revolutionized student modeling, knowledge state estimation, and personalized learning systems.

## 1. Foundational Deep Knowledge Tracing (DKT)

### 1.1 Original DKT Architecture
The seminal **Deep Knowledge Tracing (DKT)** model introduced by Piech et al. (2015) marked a paradigm shift from traditional Bayesian Knowledge Tracing (BKT) to neural network approaches. The original DKT used Long Short-Term Memory (LSTM) networks to model student knowledge states as a continuous vector that evolves over time.

### 1.2 LSTM and GRU Variants
**Zhang et al. (2017)** extended DKT by incorporating rich features beyond just correctness and knowledge components, demonstrating improved performance through feature engineering. Subsequent work explored GRU (Gated Recurrent Unit) variants as more computationally efficient alternatives to LSTM.

**Shukurlu (2025)** revisited DKT with architectural improvements using gated recurrent units and adaptive optimization techniques, showing that modern implementations can achieve better performance and efficiency than the original formulation.

### 1.3 Key Innovations in DKT
- **Dynamic knowledge state representation**: Continuous vector spaces instead of discrete mastery probabilities
- **Temporal modeling**: Sequential processing of student interactions
- **Feature integration**: Incorporation of multiple learning features beyond correctness

## 2. Attention-Based Knowledge Tracing Models

### 2.1 Self-Attentive Knowledge Tracing (SAKT)
**Pandey and Karypis (2019)** introduced SAKT, which applied transformer-style self-attention mechanisms to knowledge tracing. This approach allowed models to attend to relevant historical interactions regardless of temporal distance, addressing limitations of RNN-based approaches in capturing long-range dependencies.

### 2.2 Context-Aware Attentive Knowledge Tracing (AKT)
**Ghosh et al. (2020)** proposed AKT, which couples flexible attention-based neural networks with interpretable model components inspired by cognitive and psychometric models. Key innovations include:
- **Monotonic attention mechanism**: Relates future responses to past responses using exponential decay
- **Rasch model regularization**: Captures individual differences among questions on the same concept
- **Context-aware relative distance**: Incorporates temporal context in attention weights

AKT demonstrated up to 6% improvement in AUC compared to previous methods while maintaining interpretability.

### 2.3 Enhanced Locality for Attentive Knowledge Tracing (ELAKT)
**Pu et al. (2024)** addressed limitations in classical AKT models by enhancing locality awareness. ELAKT improves attention mechanisms for processing exercise sequences with shifting knowledge concepts and incorporates storage mechanisms for long-term knowledge retention.

### 2.4 Diagnostic Transformer (DTransformer)
**Yin et al. (2023)** introduced DTransformer with a novel training paradigm to address the challenge of models tracing patterns rather than knowledge states. Key features:
- **Question-level to knowledge-level architecture**: Explicitly diagnoses knowledge proficiency
- **Contrastive learning**: Maintains stability of knowledge state diagnosis
- **Pattern insensitivity**: Less sensitive to specific interaction patterns

## 3. Graph-Based Knowledge Tracing

### 3.1 Graph Knowledge Tracing (GKT)
Graph-based approaches model relationships between knowledge concepts as graphs, enabling explicit representation of prerequisite relationships and concept dependencies.

### 3.2 Dual Graph Ensemble Learning (DGEKT)
**Cui et al. (2022)** proposed DGEKT, which establishes a dual graph structure of students' learning interactions and knowledge concept relationships. This approach captures both student-exercise interactions and concept-concept relationships simultaneously.

### 3.3 Deep Graph Memory Networks (DGMN)
**Abdelrahman and Wang (2021)** introduced DGMN for forgetting-robust knowledge tracing, addressing challenges in modeling forgetting behaviors and identifying relationships among latent concepts.

### 3.4 Heterogeneous Graph Approaches
**Wang et al. (2023)** developed heterogeneous learning interactive graph knowledge tracing models that incorporate psychological factors and forgetting mechanisms, providing more comprehensive understanding of learning processes.

## 4. Transformer-Based Models

### 4.1 SAINT and SAINT+
The SAINT (Separated Self-AttentIve Neural Knowledge Tracing) model introduced separated self-attention for exercises and responses, while SAINT+ incorporated additional features like response time and question difficulty.

### 4.2 simpleKT: A Simple But Tough-to-Beat Baseline
**Liu et al. (2023)** proposed simpleKT as a strong baseline method inspired by the Rasch model in psychometrics. Key features:
- **Question-specific variations**: Explicit modeling of individual differences among questions
- **Dot-product attention**: Time-aware information extraction from learning interactions
- **Simplicity and effectiveness**: Consistently ranks top 3 across multiple datasets

### 4.3 Hierarchical Transformer Models
**Ke et al. (2024)** introduced HiTSKT, a hierarchical transformer model for session-aware knowledge tracing that captures both intra-session and inter-session learning patterns.

### 4.4 Recent Transformer Innovations (2024-2025)
- **Hypergraph Transformers**: Modeling complex relationships beyond pairwise interactions
- **Evolutionary Neural Architecture Search**: Automated discovery of optimal transformer architectures for KT
- **LLM-Enhanced KT**: Integration of large language models for programming knowledge tracing

## 5. Comparison Studies and Benchmarks

### 5.1 Empirical Evaluation of DLKT Models
**Sarsa et al. (2021)** conducted a comprehensive evaluation of deep learning knowledge tracing models, revealing several key findings:
- **DLKT models generally outperform traditional models**, but not always by large margins
- **Simple baselines may outperform DLKT models** in terms of accuracy, highlighting the importance of proper baseline selection
- **Performance variations** depend on metric choice, input/output layer variations, hyperparameters, and hardware

### 5.2 Standardized Evaluation Protocols
The lack of standardized evaluation protocols has led to inconsistent reported results. The **pyKT benchmark** (Liu et al., 2022) addresses this by providing standardized datasets, evaluation metrics, and implementations.

### 5.3 Performance Metrics and Challenges
Common evaluation metrics include:
- **AUC (Area Under ROC Curve)**: Most widely used metric
- **Accuracy**: Can be misleading due to class imbalance
- **RMSE (Root Mean Square Error)**: For probabilistic predictions

Challenges in evaluation include:
- **Dataset heterogeneity**: Different domains and educational contexts
- **Temporal dependencies**: Sequential nature of learning data
- **Interpretability vs. accuracy trade-offs**

## 6. Recent Advances (2024-2026)

### 6.1 Disentangled Knowledge Tracing (DisKT)
**Zhou et al. (2025)** proposed DisKT to address cognitive bias in KT models caused by unbalanced question group distributions. The model:
- **Separately models familiar and unfamiliar abilities** based on causal effects
- **Eliminates confounder effects** in student representation
- **Introduces contradiction attention mechanisms** for handling guessing and mistaking behaviors

### 6.2 Robust Knowledge Tracing (RoubstKT)
**Guo et al. (2025)** addressed error-prone data through cognitive decoupling, separating cognitive patterns from random factors (carelessness, fatigue) using:
- **Cognitive decoupling analyzers**
- **Decay-based attention mechanisms**
- **Adaptive parameter fusion strategies**

### 6.3 LLM-Enhanced Knowledge Tracing
**Yang et al. (2025)** explored difficulty-aware programming knowledge tracing using large language models, leveraging LLMs' understanding of programming concepts and difficulty estimation.

### 6.4 Unified Libraries and Frameworks
**Wu et al. (2025)** developed **EduStudio**, a unified PyTorch-based library that integrates Cognitive Diagnosis (CD) and Knowledge Tracing (KT) with modular design and comprehensive eco-services.

## 7. Datasets and Benchmarks

### 7.1 Commonly Used Datasets
1. **ASSISTments**: Multiple versions (2009, 2012, 2015, 2017)
2. **EdNet**: Large-scale dataset from Korean education platform
3. **Junyi Academy**: Chinese online learning platform data
4. **Statics2011**: Engineering education dataset
5. **Synthetic datasets**: For controlled experiments

### 7.2 Dataset Characteristics
- **Size**: Ranging from thousands to millions of interactions
- **Domains**: Mathematics, programming, language learning, etc.
- **Features**: Correctness, response time, knowledge components, question text
- **Temporal granularity**: Varying from seconds to days between interactions

## 8. Production Systems and Applications

### 8.1 Intelligent Tutoring Systems (ITS)
Modern ITS integrate KT models for:
- **Adaptive exercise recommendation**
- **Personalized learning paths**
- **Real-time feedback generation**
- **Learning progress monitoring**

### 8.2 Large-Scale Educational Platforms
- **Khan Academy**: Uses KT for personalized learning recommendations
- **Duolingo**: Applies KT for language learning optimization
- **Coursera/edX**: Implement KT for course recommendation and difficulty adaptation

### 8.3 Research Platforms
- **pyKT**: Open-source benchmark for KT research
- **EduStudio**: Unified library for student cognitive modeling
- **OpenEd**: Open educational data initiatives

## 9. Methodological Trends and Future Directions

### 9.1 Current Trends
1. **Multimodal integration**: Combining text, code, and behavioral data
2. **Causal modeling**: Addressing confounding factors and biases
3. **Explainable AI**: Improving model interpretability for educational applications
4. **Federated learning**: Privacy-preserving distributed training
5. **Few-shot learning**: Adaptation to new domains with limited data

### 9.2 Research Gaps
1. **Long-term knowledge retention**: Modeling forgetting and reinforcement over extended periods
2. **Cross-domain transfer**: Applying KT models across different subjects and educational contexts
3. **Social and collaborative learning**: Incorporating peer interactions and group dynamics
4. **Affective computing**: Integrating emotional and motivational factors
5. **Ethical considerations**: Addressing bias, fairness, and privacy concerns

### 9.3 Future Directions
1. **Neuro-symbolic approaches**: Combining neural networks with symbolic reasoning
2. **Continual learning**: Adapting to evolving educational content and student populations
3. **Human-AI collaboration**: Designing systems that augment rather than replace human teachers
4. **Cross-cultural adaptation**: Developing culturally-aware KT models
5. **Real-world deployment challenges**: Scalability, latency, and integration with existing educational infrastructure

## 10. Conclusion

Deep knowledge tracing has evolved significantly from its early LSTM-based formulations to sophisticated transformer and graph-based architectures. The field has matured with standardized benchmarks, comprehensive evaluation frameworks, and practical applications in production educational systems. Key lessons include:

1. **Simplicity often outperforms complexity**: Simple baselines like simpleKT demonstrate that careful design can achieve state-of-the-art performance
2. **Interpretability matters**: Educational applications require models that provide actionable insights, not just accurate predictions
3. **Data quality and bias**: Real-world educational data contains numerous biases and noise that must be addressed
4. **Integration with educational theory**: Successful KT models incorporate insights from cognitive science and psychometrics

The future of knowledge tracing lies in creating more robust, interpretable, and ethically-aligned models that can truly enhance learning outcomes while respecting student privacy and autonomy.

---

## References

### Foundational and Survey Papers
1. **Abdelrahman et al. (2022)** [Knowledge Tracing: A Survey](https://doi.org/10.1145/3569576)
2. **Sarsa et al. (2021)** [Empirical Evaluation of Deep Learning Models for Knowledge Tracing: Of Hyperparameters and Metrics on Performance and Replicability](https://doi.org/10.48550/arXiv.2112.15072)

### Deep Knowledge Tracing (DKT)
3. **Zhang et al. (2017)** [Incorporating Rich Features into Deep Knowledge Tracing](https://doi.org/10.1145/3051457.3053976)
4. **Shukurlu (2025)** [Improving Deep Knowledge Tracing via Gated Architectures and Adaptive Optimization](http://arxiv.org/abs/2504.20070)

### Attention-Based Models
5. **Ghosh et al. (2020)** [Context-Aware Attentive Knowledge Tracing](https://doi.org/10.1145/3394486.3403282)
6. **Pu et al. (2024)** [ELAKT: Enhancing Locality for Attentive Knowledge Tracing](https://doi.org/10.1145/3652601)
7. **Yin et al. (2023)** [Tracing Knowledge Instead of Patterns: Stable Knowledge Tracing with Diagnostic Transformer](https://doi.org/10.1145/3543507.3583255)

### Graph-Based Models
8. **Cui et al. (2022)** [DGEKT: A Dual Graph Ensemble Learning Method for Knowledge Tracing](http://arxiv.org/abs/2211.12881)
9. **Abdelrahman and Wang (2021)** [Deep Graph Memory Networks for Forgetting-Robust Knowledge Tracing](http://arxiv.org/abs/2108.08105)
10. **Wang et al. (2023)** [Knowledge relation rank enhanced heterogeneous learning interaction modeling for neural graph forgetting knowledge tracing](https://doi.org/10.1371/journal.pone.0295808)

### Transformer-Based Models
11. **Liu et al. (2023)** [simpleKT: A Simple But Tough-to-Beat Baseline for Knowledge Tracing](http://arxiv.org/abs/2302.06881)
12. **Ke et al. (2024)** [HiTSKT: A hierarchical transformer model for session-aware knowledge tracing](https://doi.org/10.1016/j.knosys.2023.111300)
13. **Chen et al. (2023)** [Improving Interpretability of Deep Sequential Knowledge Tracing Models with Question-centric Cognitive Representations](https://doi.org/10.1609/aaai.v37i12.26661)

### Recent Advances (2024-2025)
14. **Zhou et al. (2025)** [Disentangled Knowledge Tracing for Alleviating Cognitive Bias](https://doi.org/10.1145/3696410.3714607)
15. **Guo et al. (2025)** [Enhancing Knowledge Tracing through Decoupling Cognitive Pattern from Error-Prone Data](https://doi.org/10.1145/3696410.3714486)
16. **Yang et al. (2025)** [Difficulty aware programming knowledge tracing via large language models](https://doi.org/10.1038/s41598-025-96540-3)
17. **Wu et al. (2025)** [EduStudio: towards a unified library for student cognitive modeling](https://doi.org/10.1007/s11704-024-40372-3)

### Applications and Systems
18. **Murtaza et al. (2022)** [AI-Based Personalized E-Learning Systems: Issues, Challenges, and Solutions](https://doi.org/10.1109/access.2022.3193938)
19. **Huang and Zeng (2024)** [Improving academic performance predictions with dual graph neural networks](https://doi.org/10.1007/s40747-024-01344-z)
20. **Wang et al. (2022)** [Deep Knowledge Tracing Based on Spatial and Temporal Representation Learning for Learning Performance Prediction](https://doi.org/10.3390/app12147188)

This comprehensive review demonstrates the rapid evolution of deep knowledge tracing models and their increasing sophistication in capturing the complex dynamics of student learning. The field continues to advance through integration with cognitive science principles, improved interpretability, and practical applications in real-world educational systems.
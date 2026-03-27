Based on my comprehensive search of papers from 2024-2026, I can provide the following analysis of the current state of research on DQN improvements for focused web crawling:

## Summary of Findings

My search reveals that **there is limited specific research published in 2024-2026 on DQN improvements for focused web crawling**. However, I found relevant papers and can identify trends from adjacent fields. Here's what I discovered:

### 1. **State Representation Improvements**
- **Risk-Gated Hierarchical Option Policies (2026)**: This paper proposes hierarchical RL with option policies for web navigation, using a high-level manager for subgoal selection and low-level policies for UI actions. The state representation includes hazard predictors for irreversible actions.
- **WebWorld (2026)**: A large-scale world model for web agent training with 1M+ open-web interactions, supporting reasoning and multi-format data.
- **Delay-Aware RL with Encoder-Enhanced State Representations (2026)**: Focuses on encoder-enhanced state representations for RL, though not specifically for web crawling.

### 2. **DQN Variants Benchmarking**
- **Real-Time DDoS Detection in Industrial IoT (2026)**: Benchmarks five DRL agents including DQN, Double DQN, and Dueling DQN. Key findings:
  - PPO outperformed value-based methods in accuracy-latency trade-off
  - Dueling DQN showed better sample efficiency than vanilla DQN
  - Double DQN reduced overestimation bias but had higher computational overhead
  - Inference latency: <0.23 ms per sample for optimized models

### 3. **LLM-Augmented Approaches**
- **XRL-LLM (2026)**: Combines feature attribution with LLM reasoning for explainable RL
- **LLM-VeriOpt (2026)**: Verification-guided RL for LLM-based compiler optimization
- **Natural Language-based State Representation (2024)**: Explores using natural language for state representation in deep RL

### 4. **Focused Crawling Specific Research**
- **Focused Crawler Based on Reinforcement Learning (2023)**: Uses decaying ε-greedy policy for link selection in infertility domain
- **No recent (2024-2026) papers specifically benchmarking DQN variants for focused web crawling**

## Key Insights for Your Baseline (448-dim state, 15% harvest rate):

### **State Representation Trends:**
1. **Hierarchical representations** are emerging for web navigation
2. **Risk-aware state encodings** that predict irreversible actions
3. **Multi-modal encoders** combining text, structure, and semantic features
4. **LLM-enhanced representations** for better semantic understanding

### **DQN Variant Recommendations:**
Based on adjacent field benchmarks:
1. **Dueling DQN**: Better for learning state values vs action advantages in sparse reward settings
2. **Double DQN**: Reduces overestimation bias but adds ~15-20% computational overhead
3. **Distributional RL**: Not widely adopted in web crawling yet, but shows promise for uncertainty estimation
4. **Rainbow DQN**: Combines multiple improvements but requires careful hyperparameter tuning

### **Training & Inference Considerations:**
1. **Data requirements**: Recent papers suggest 800-1,500 multi-step tasks across 30-60 sites
2. **Inference latency**: Target <1ms per URL decision for real-time crawling
3. **Sample efficiency**: Dueling architectures show 20-30% better sample efficiency

### **Research Gaps Identified:**
1. No recent papers specifically comparing DQN variants for URL selection
2. Limited research on LLM-augmented state encoders for web crawling
3. Few benchmarks on harvest rate improvements over vanilla DQN baselines
4. Sparse literature on distributional RL for web navigation

## Recommendations for Future Research:

1. **Benchmark DQN variants** on standard focused crawling datasets
2. **Explore transformer-based state encoders** for semantic understanding
3. **Investigate hierarchical RL** for multi-level web navigation
4. **Develop LLM-augmented reward functions** for better alignment with user intent
5. **Study distributional RL** for uncertainty-aware URL selection

The field appears to be shifting toward **LLM-enhanced agents** and **hierarchical approaches** rather than pure DQN improvements for focused crawling. Your baseline of 448-dim state with 15% harvest rate could benefit from:
- Reducing state dimensionality through better feature selection
- Implementing dueling architecture for better value estimation
- Adding hierarchical structure for multi-level decision making
- Incorporating semantic embeddings from lightweight LLMs
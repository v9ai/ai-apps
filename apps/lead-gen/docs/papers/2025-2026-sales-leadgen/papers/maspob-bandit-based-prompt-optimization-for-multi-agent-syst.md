---
title: "MASPOB: Bandit-Based Prompt Optimization for Multi-Agent Systems with Graph Neural Networks"
authors: ["Zhi Hong", "Qian Zhang", "Jiahang Sun", "Shang, Zhiwei", "Mingze Kong", "Xiangyi Wang", "Yao Shu", "Zhongxiang Dai"]
year: 2026
venue: "ArXiv.org"
doi: ""
arxiv_id: ""
url: "http://arxiv.org/abs/2603.02630"
citations: 0
source: openalex
tier: core
query: "NeuralUCB neural contextual bandit recommendation"
tags: ["bandits", "llm-agents", "evaluation"]
---

# MASPOB: Bandit-Based Prompt Optimization for Multi-Agent Systems with Graph Neural Networks

**Authors.** Zhi Hong, Qian Zhang, Jiahang Sun, Shang, Zhiwei, Mingze Kong, Xiangyi Wang, Yao Shu, Zhongxiang Dai

**Venue / year.** ArXiv.org · 2026

**Links.** [source](http://arxiv.org/abs/2603.02630)

**Abstract.**

Large Language Models (LLMs) have achieved great success in many real-world applications, especially the one serving as the cognitive backbone of Multi-Agent Systems (MAS) to orchestrate complex workflows in practice. Since many deployment scenarios preclude MAS workflow modifications and its performance is highly sensitive to the input prompts, prompt optimization emerges as a more natural approach to improve its performance. However, real-world prompt optimization for MAS is impeded by three key challenges: (1) the need of sample efficiency due to prohibitive evaluation costs, (2) topology-induced coupling among prompts, and (3) the combinatorial explosion of the search space. To address these challenges, we introduce MASPOB (Multi-Agent System Prompt Optimization via Bandits), a novel sample-efficient framework based on bandits. By leveraging Upper Confidence Bound (UCB) to quantify uncertainty, the bandit framework balances exploration and exploitation, maximizing gains within a strictly limited budget. To handle topology-induced coupling, MASPOB integrates Graph Neural Networks (GNNs) to capture structural priors, learning topology-aware representations of prompt semantics. Furthermore, it employs coordinate ascent to decompose the optimization into univariate sub-problems, reducing search complexity from exponential to linear. Extensive experiments across diverse benchmarks demonstrate that MASPOB achieves state-of-the-art performance, consistently outperforming existing baselines.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

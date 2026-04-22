---
title: "Quantum-Enhanced Neural Contextual Bandit Algorithms"
authors: ["Yuqi Huang", "Vincent Y. F Tan", "Sharu Theresa Jose"]
year: 2026
venue: "ArXiv.org"
doi: ""
arxiv_id: ""
url: "http://arxiv.org/abs/2601.02870"
citations: 0
source: openalex
tier: core
query: "NeuralUCB neural contextual bandit recommendation"
tags: ["bandits", "evaluation"]
---

# Quantum-Enhanced Neural Contextual Bandit Algorithms

**Authors.** Yuqi Huang, Vincent Y. F Tan, Sharu Theresa Jose

**Venue / year.** ArXiv.org · 2026

**Links.** [source](http://arxiv.org/abs/2601.02870)

**Abstract.**

Stochastic contextual bandits are fundamental for sequential decision-making but pose significant challenges for existing neural network-based algorithms, particularly when scaling to quantum neural networks (QNNs) due to issues such as massive over-parameterization, computational instability, and the barren plateau phenomenon. This paper introduces the Quantum Neural Tangent Kernel-Upper Confidence Bound (QNTK-UCB) algorithm, a novel algorithm that leverages the Quantum Neural Tangent Kernel (QNTK) to address these limitations. By freezing the QNN at a random initialization and utilizing its static QNTK as a kernel for ridge regression, QNTK-UCB bypasses the unstable training dynamics inherent in explicit parameterized quantum circuit training while fully exploiting the unique quantum inductive bias. For a time horizon $T$ and $K$ actions, our theoretical analysis reveals a significantly improved parameter scaling of $Ω((TK)^3)$ for QNTK-UCB, a substantial reduction compared to $Ω((TK)^8)$ required by classical NeuralUCB algorithms for similar regret guarantees. Empirical evaluations on non-linear synthetic benchmarks and quantum-native variational quantum eigensolver tasks demonstrate QNTK-UCB's superior sample efficiency in low-data regimes. This work highlights how the inherent properties of QNTK provide implicit regularization and a sharper spectral decay, paving the way for achieving ``quantum advantage'' in online learning.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

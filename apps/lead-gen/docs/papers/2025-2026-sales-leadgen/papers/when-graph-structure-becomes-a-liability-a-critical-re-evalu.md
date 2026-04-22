---
title: "When Graph Structure Becomes a Liability: A Critical Re-Evaluation of Graph Neural Networks for Bitcoin Fraud Detection under Temporal Distribution Shift"
authors: ["Saket Maganti"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.19514v1"
url: "https://arxiv.org/abs/2604.19514v1"
citations: 0
source: arxiv
tier: core
query: "NeuralUCB neural contextual bandit recommendation"
tags: ["matching", "evaluation"]
---

# When Graph Structure Becomes a Liability: A Critical Re-Evaluation of Graph Neural Networks for Bitcoin Fraud Detection under Temporal Distribution Shift

**Authors.** Saket Maganti

**Venue / year.** 2026

**Links.** [arXiv:2604.19514v1](https://arxiv.org/abs/2604.19514v1) · [source](https://arxiv.org/abs/2604.19514v1)

**Abstract.**

The consensus that GCN, GraphSAGE, GAT, and EvolveGCN outperform feature-only baselines on the Elliptic Bitcoin Dataset is widely cited but has not been rigorously stress-tested under a leakage-free evaluation protocol. We perform a seed-matched inductive-versus-transductive comparison and find that this consensus does not hold. Under a strictly inductive protocol, Random Forest on raw features achieves F1 = 0.821 and outperforms all evaluated GNNs, while GraphSAGE reaches F1 = 0.689 +/- 0.017. A paired controlled experiment reveals a 39.5-point F1 gap attributable to training-time exposure to test-period adjacency. Additionally, edge-shuffle ablations show that randomly wired graphs outperform the real transaction graph, indicating that the dataset's topology can be misleading under temporal distribution shift. Hybrid models combining GNN embeddings with raw features provide only marginal gains and remain substantially below feature-only baselines. We release code, checkpoints, and a strict-inductive protocol to enable reproducible, leakage-free evaluation.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

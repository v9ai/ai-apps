---
title: "HopRank: Self-Supervised LLM Preference-Tuning on Graphs for Few-Shot Node Classification"
authors: ["Ziqing Wang", "Kaize Ding"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.17271v1"
url: "https://arxiv.org/abs/2604.17271v1"
citations: 0
source: arxiv
tier: broad
query: "cross-sell upsell recommendation"
tags: ["lead-scoring", "evaluation"]
---

# HopRank: Self-Supervised LLM Preference-Tuning on Graphs for Few-Shot Node Classification

**Authors.** Ziqing Wang, Kaize Ding

**Venue / year.** 2026

**Links.** [arXiv:2604.17271v1](https://arxiv.org/abs/2604.17271v1) · [source](https://arxiv.org/abs/2604.17271v1)

**Abstract.**

Node classification on text-attributed graphs (TAGs) is a fundamental task with broad applications in citation analysis, social networks, and recommendation systems. Current GNN-based approaches suffer from shallow text encoding and heavy dependence on labeled data, limiting their effectiveness in label-scarce settings. While large language models (LLMs) naturally address the text understanding gap with deep semantic reasoning, existing LLM-for-graph methods either still require abundant labels during training or fail to exploit the rich structural signals freely available in graph topology. Our key observation is that, in many real-world TAGs, edges predominantly connect similar nodes under the homophily principle, meaning graph topology inherently encodes class structure without any labels. Building on this insight, we reformulate node classification as a link prediction task and present HopRank, a fully self-supervised LLM-tuning framework for TAGs. HopRank constructs preference data via hierarchical hop-based sampling and employs adaptive preference learning to prioritize informative training signals without any class labels. At inference, nodes are classified by predicting their connection preferences to labeled anchors, with an adaptive early-exit voting scheme to improve efficiency. Experiments on three TAG benchmarks show that HopRank matches fully-supervised GNNs and substantially outperforms prior graph-LLM methods, despite using zero labeled training data.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

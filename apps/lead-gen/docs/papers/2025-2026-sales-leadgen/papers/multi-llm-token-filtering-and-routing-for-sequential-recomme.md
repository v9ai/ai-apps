---
title: "Multi-LLM Token Filtering and Routing for Sequential Recommendation"
authors: ["Wuhan Chen", "Min Gao", "Xin Xia", "Zongwei Wang", "Wentao Li", "Shane Culpepper"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.18200v1"
url: "https://arxiv.org/abs/2604.18200v1"
citations: 0
source: arxiv
tier: broad
query: "cross-sell upsell recommendation"
tags: ["matching", "personalization"]
---

# Multi-LLM Token Filtering and Routing for Sequential Recommendation

**Authors.** Wuhan Chen, Min Gao, Xin Xia, Zongwei Wang, Wentao Li, Shane Culpepper

**Venue / year.** 2026

**Links.** [arXiv:2604.18200v1](https://arxiv.org/abs/2604.18200v1) · [source](https://arxiv.org/abs/2604.18200v1)

**Abstract.**

Large language models (LLMs) have recently shown promise in recommendation by providing rich semantic knowledge. While most existing approaches rely on external textual corpora to align LLMs with recommender systems, we revisit a more fundamental yet underexplored question: Can recommendation benefit from LLM token embeddings alone without textual input? Through a systematic empirical study, we show that directly injecting token embeddings from a single LLM into sequential recommenders leads to unstable or limited gains, due to semantic misalignment, insufficient task adaptation, and the restricted coverage of individual LLMs. To address these challenges, we propose MLTFR, a Multi-LLM Token Filtering and Routing framework for corpus-free sequential recommendation. MLTFR follows an interaction-guided LLM knowledge integration paradigm, where task-relevant token embeddings are selected via user-guided token filtering to suppress noisy and irrelevant vocabulary signals. To overcome the limitations of single-LLM representations, MLTFR integrates multiple LLM token spaces through a Mixture-of-Experts architecture, with a Fisher-weighted semantic consensus expert to balance heterogeneous experts and prevent domination during training. By jointly filtering informative tokens and aggregating complementary semantic knowledge across multiple LLMs, MLTFR enables stable and effective utilization of LLM token embeddings without textual inputs or backbone modification. Extensive experiments demonstrate that MLTFR consistently outperforms state-of-the-art sequential recommendation baselines and existing alignment methods. Our code is available at: https://github.com/ccwwhhh/MLTFR.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

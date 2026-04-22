---
title: "Balanced Co-Clustering of Users and Items for Embedding Table Compression in Recommender Systems"
authors: ["Runhao Jiang", "Renchi Yang", "Donghao Wu"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.18351v1"
url: "https://arxiv.org/abs/2604.18351v1"
citations: 0
source: arxiv
tier: broad
query: "cross-sell upsell recommendation"
tags: ["matching", "llm-agents", "personalization", "evaluation"]
---

# Balanced Co-Clustering of Users and Items for Embedding Table Compression in Recommender Systems

**Authors.** Runhao Jiang, Renchi Yang, Donghao Wu

**Venue / year.** 2026

**Links.** [arXiv:2604.18351v1](https://arxiv.org/abs/2604.18351v1) · [source](https://arxiv.org/abs/2604.18351v1)

**Abstract.**

Recommender systems have advanced markedly over the past decade by transforming each user/item into a dense embedding vector with deep learning models. At industrial scale, embedding tables constituted by such vectors of all users/items demand a vast amount of parameters and impose heavy compute and memory overhead during training and inference, hindering model deployment under resource constraints. Existing solutions towards embedding compression either suffer from severely compromised recommendation accuracy or incur considerable computational costs.   To mitigate these issues, this paper presents BACO, a fast and effective framework for compressing embedding tables. Unlike traditional ID hashing, BACO is built on the idea of exploiting collaborative signals in user-item interactions for user and item groupings, such that similar users/items share the same embeddings in the codebook. Specifically, we formulate a balanced co-clustering objective that maximizes intra-cluster connectivity while enforcing cluster-volume balance, and unify canonical graph clustering techniques into the framework through rigorous theoretical analyses. To produce effective groupings while averting codebook collapse, BACO instantiates this framework with a principled weighting scheme for users and items, an efficient label propagation solver, as well as secondary user clusters. Our extensive experiments comparing BACO against full models and 18 baselines over benchmark datasets demonstrate that BACO cuts embedding parameters by over 75% with a drop of at most 1.85% in recall, while surpassing the strongest baselines by being up to 346X faster.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

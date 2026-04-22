---
title: "Warm Up Before You Train: Unlocking General Reasoning in Resource-Constrained Settings"
authors: ["S. Shrestha", "Minwu Kim", "Aadim Nepal", "Anubhav Shrestha", "Keith Ross"]
year: 2025
venue: "Conference on Empirical Methods in Natural Language Processing"
doi: ""
arxiv_id: ""
url: "https://www.semanticscholar.org/paper/57244a5d6b500899eb1245fd4f52d85902e50cad"
citations: 1
source: s2
tier: core
query: "domain-specific LLM distillation small model"
tags: ["entity-resolution", "revops"]
---

# Warm Up Before You Train: Unlocking General Reasoning in Resource-Constrained Settings

**Authors.** S. Shrestha, Minwu Kim, Aadim Nepal, Anubhav Shrestha, Keith Ross

**Venue / year.** Conference on Empirical Methods in Natural Language Processing · 2025

**Links.** [source](https://www.semanticscholar.org/paper/57244a5d6b500899eb1245fd4f52d85902e50cad)

**Abstract.**

Designing effective reasoning-capable LLMs typically requires training using Reinforcement Learning with Verifiable Rewards (RLVR) or distillation with carefully curated Long Chain of Thoughts (CoT), both of which depend heavily on extensive training data. This creates a major challenge when the amount of quality training data is scarce. We propose a sample-efficient, two-stage training strategy to develop reasoning LLMs under limited supervision. In the first stage, we"warm up"the model by distilling Long CoTs from a toy domain, namely, Knights \&Knaves (K\&K) logic puzzles to acquire general reasoning skills. In the second stage, we apply RLVR to the warmed-up model using a limited set of target-domain examples. Our experiments demonstrate that this two-phase approach offers several benefits: $(i)$ the warmup phase alone facilitates generalized reasoning, leading to performance improvements across a range of tasks, including MATH, HumanEval$^{+}$, and MMLU-Pro; $(ii)$ When both the base model and the warmed-up model are RLVR trained on the same small dataset ($\leq100$ examples), the warmed-up model consistently outperforms the base model; $(iii)$ Warming up before RLVR training allows a model to maintain cross-domain generalizability even after training on a specific domain; $(iv)$ Introducing warmup in the pipeline improves not only accuracy but also overall sample efficiency during RLVR training. The results in this paper highlight the promise of warmup for building robust reasoning LLMs in data-scarce environments.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

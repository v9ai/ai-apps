---
title: "Visual Inception: Compromising Long-term Planning in Agentic Recommenders via Multimodal Memory Poisoning"
authors: ["Jiachen Qian"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.16966v1"
url: "https://arxiv.org/abs/2604.16966v1"
citations: 0
source: arxiv
tier: broad
query: "cross-sell upsell recommendation"
tags: ["entity-resolution", "llm-agents", "personalization"]
---

# Visual Inception: Compromising Long-term Planning in Agentic Recommenders via Multimodal Memory Poisoning

**Authors.** Jiachen Qian

**Venue / year.** 2026

**Links.** [arXiv:2604.16966v1](https://arxiv.org/abs/2604.16966v1) · [source](https://arxiv.org/abs/2604.16966v1)

**Abstract.**

The evolution from static ranking models to Agentic Recommender Systems (Agentic RecSys) empowers AI agents to maintain long-term user profiles and autonomously plan service tasks. While this paradigm shift enhances personalization, it introduces a vulnerability: reliance on Long-term Memory (LTM). In this paper, we uncover a threat termed "Visual Inception." Unlike traditional adversarial attacks that seek immediate misclassification, Visual Inception injects triggers into user-uploaded images (e.g., lifestyle photos) that act as "sleeper agents" within the system's memory. When retrieved during future planning, these poisoned memories hijack the agent's reasoning chain, steering it toward adversary-defined goals (e.g., promoting high-margin products) without prompt injection. To mitigate this, we propose CognitiveGuard, a dual-process defense framework inspired by human cognition. It consists of a System 1 Perceptual Sanitizer (diffusion-based purification) to cleanse sensory inputs and a System 2 Reasoning Verifier (counterfactual consistency checks) to detect anomalies in memory-driven planning. Extensive experiments on a mock e-commerce agent environment demonstrate that Visual Inception achieves about 85% Goal-Hit Rate (GHR), while CognitiveGuard reduces this risk to around 10% with configurable latency trade-offs (about 1.5s in lite mode to about 6.5s for full sequential verification), without quality degradation under our setup.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

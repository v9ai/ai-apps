---
title: "Sub-100ms Latency Optimization in Production ML Systems: Lessons from Building Customer Intelligence Platforms"
authors: ["Ramya Boorugula"]
year: 2025
venue: ""
doi: "10.31224/4918"
arxiv_id: ""
url: "https://doi.org/10.31224/4918"
citations: 0
source: crossref
tier: core
query: "low-latency inference serving Rust ML"
tags: ["bandits", "forecasting", "revops"]
---

# Sub-100ms Latency Optimization in Production ML Systems: Lessons from Building Customer Intelligence Platforms

**Authors.** Ramya Boorugula

**Venue / year.** 2025

**Links.** [DOI](https://doi.org/10.31224/4918) · [source](https://doi.org/10.31224/4918)

**Abstract.**

Over the past three years, I've been working on optimizing production ML systems that need to make decisions fast enough to actually matter to customers. This paper documents what I learned building and optimizing customer intelligence platforms that process 50TB+ of data daily while keeping response times under 100ms.
The systems I worked on include ensemble churn prediction (XGBoost + LSTM + transformers hitting 87% accuracy), neural contextual bandits that drove 31% spend lift, and ML-powered finite state machines that improved account manager productivity by 2.4x. The main challenge was keeping all this complexity running fast enough to enable real-time interventions.
My key findings: (1) genetic algorithms can optimize feature pipelines better than manual engineering, cutting computation time by 70%, (2) smart caching strategies matter more than hardware upgrades, (3) async orchestration is critical but tricky to get right, and (4) you need to optimize for business metrics, not just technical ones.
The bottom line: complex ML systems can run fast enough for real-time use cases, but it requires rethinking how you approach optimization. This paper shares the practical techniques that actually worked in production.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

---
title: "Horizon-Sensitive Performance Analysis of Bandit Algorithms in Movie Recommendation Systems"
authors: ["Yixin Li"]
year: 2025
venue: ""
doi: "10.1051/itmconf/20257801034"
arxiv_id: ""
url: "https://doi.org/10.1051/itmconf/20257801034"
citations: 0
source: crossref
tier: core
query: "NeuralUCB neural contextual bandit recommendation"
tags: ["bandits", "personalization"]
---

# Horizon-Sensitive Performance Analysis of Bandit Algorithms in Movie Recommendation Systems

**Authors.** Yixin Li

**Venue / year.** 2025

**Links.** [DOI](https://doi.org/10.1051/itmconf/20257801034) · [source](https://doi.org/10.1051/itmconf/20257801034)

**Abstract.**

This study presents a comprehensive horizon-sensitive empirical comparison of Multi-Armed Bandit (MAB) algorithms for movie recommendation systems. Using the Movie Lens 1M dataset, this study systematically evaluates this representative algorithm—Explore-then-Commit (ETC), Upper Confidence Bound (UCB), Asymptotically Optimal UCB, and Thompson Sampling (TS)—across varying time horizons from 500 to 5,000,000 interactions. The experiments assess algorithm performance through multiple dimensions, including cumulative regret, convergence behavior, variance across runs, and computational efficiency. Results demonstrate that Thompson Sampling consistently outperforms other approaches, achieving approximately 40% lower regret than standard UCB at extended horizons (7,500 vs. 12,000 at n=1,000,000), while exhibiting more rapid logarithmic regret scaling. This study's data shows that TS achieves logarithmic regret at n≥50,000, compared to n≥100,000 for UCB, providing substantial advantages in applications where user interactions are limited. The performance advantages of different algorithms are strongly horizon-dependent: UCB variants provide reasonable performance at moderate horizons (regret ~1,450 at n=50,000), while ETC shows substantial limitations beyond short-term deployments with linear regret growth reaching ~25,000 at n=1,000,000. This study provides practical recommendations for algorithm selection based on deployment context, time horizon, and computational constraints. These findings emphasize the importance of horizon-sensitive algorithm selection in real-world recommender systems.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

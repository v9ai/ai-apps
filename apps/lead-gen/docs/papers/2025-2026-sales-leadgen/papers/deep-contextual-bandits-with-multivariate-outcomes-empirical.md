---
title: "Deep Contextual Bandits with Multivariate Outcomes: Empirical Copula Normalization, Temporal Feature Learning, and Doubly Robust Policy Evaluation"
authors: ["Jong-Min Kim"]
year: 2026
venue: ""
doi: "10.3390/math14050846"
arxiv_id: ""
url: "https://doi.org/10.3390/math14050846"
citations: 0
source: crossref
tier: core
query: "contextual bandits lead ranking B2B sales"
tags: ["bandits", "entity-resolution", "evaluation"]
---

# Deep Contextual Bandits with Multivariate Outcomes: Empirical Copula Normalization, Temporal Feature Learning, and Doubly Robust Policy Evaluation

**Authors.** Jong-Min Kim

**Venue / year.** 2026

**Links.** [DOI](https://doi.org/10.3390/math14050846) · [source](https://doi.org/10.3390/math14050846)

**Abstract.**

We develop and evaluate a deep contextual bandit framework for multivariate off-policy evaluation within a controlled simulation-based validation setting. Using real covariate distributions from the Adult, Boston Housing, and Wine Quality datasets, we construct synthetic treatment assignments and multivariate potential outcomes to enable rigorous benchmarking under known data-generating processes. We compare CNN-LSTM, LSTM, and Feed-forward Neural Network (FNN) architectures as nonlinear action-value estimators. To examine representation learning under structured dependence, an AR(1) feature augmentation scheme is employed, while multivariate outcomes are standardized using empirical copula transformations to preserve cross-dimensional dependence. Policy values are estimated using Stabilized Importance Sampling (SIPS) and doubly robust (DR) estimators with bootstrap inference. Although the decision problem is strictly one-step, empirical results indicate that CNN-LSTM architectures provide competitive action-value calibration under temporal augmentation. Across all datasets, the DR estimator demonstrates substantially lower variance and greater stability than SIPS, consistent with its theoretical variance-reduction properties. Diagnostic analyses—including propensity overlap assessment, cumulative oracle regret (with oracle values known by construction), calibration evaluation, and sensitivity analysis—support the reliability of the proposed evaluation framework. Overall, the results demonstrate that combining copula-normalized multivariate outcomes with doubly robust off-policy evaluation yields a statistically principled and variance-efficient approach for offline policy learning in high-dimensional simulated environments.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

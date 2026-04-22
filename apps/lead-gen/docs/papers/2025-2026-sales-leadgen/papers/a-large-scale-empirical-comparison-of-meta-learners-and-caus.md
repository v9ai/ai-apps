---
title: "A Large-Scale Empirical Comparison of Meta-Learners and Causal Forests for Heterogeneous Treatment Effect Estimation in Marketing Uplift Modeling"
authors: ["Aman Singh"]
year: 2026
venue: ""
doi: ""
arxiv_id: ""
url: "https://www.semanticscholar.org/paper/3c19aa9896f089c75fb374742114da269e763f4b"
citations: 0
source: s2
tier: broad
query: "uplift modeling treatment effect marketing"
tags: ["entity-resolution", "evaluation", "revops"]
---

# A Large-Scale Empirical Comparison of Meta-Learners and Causal Forests for Heterogeneous Treatment Effect Estimation in Marketing Uplift Modeling

**Authors.** Aman Singh

**Venue / year.** 2026

**Links.** [source](https://www.semanticscholar.org/paper/3c19aa9896f089c75fb374742114da269e763f4b)

**Abstract.**

Estimating Conditional Average Treatment Effects (CATE) at the individual level is central to precision marketing, yet systematic benchmarking of uplift modeling methods at industrial scale remains limited. We present UpliftBench, an empirical evaluation of four CATE estimators: S-Learner, T-Learner, X-Learner (all with LightGBM base learners), and Causal Forest (EconML), applied to the Criteo Uplift v2.1 dataset comprising 13.98 million customer records. The near-random treatment assignment (propensity AUC = 0.509) provides strong internal validity for causal estimation. Evaluated via Qini coefficient and cumulative gain curves, the S-Learner achieves the highest Qini score of 0.376, with the top 20% of customers ranked by predicted CATE capturing 77.7% of all incremental conversions, a 3.9x improvement over random targeting. SHAP analysis identifies f8 as the dominant heterogeneous treatment effect (HTE) driver among the 12 anonymized covariates. Causal Forest uncertainty quantification reveals that 1.9% of customers are confident persuadables (lower 95% CI>0) and 0.1% are confident sleeping dogs (upper 95% CI<0). Our results provide practitioners with evidence-based guidance on method selection for large-scale uplift modeling pipelines.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

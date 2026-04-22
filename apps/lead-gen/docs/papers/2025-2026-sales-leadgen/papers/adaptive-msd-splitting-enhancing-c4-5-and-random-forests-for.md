---
title: "Adaptive MSD-Splitting: Enhancing C4.5 and Random Forests for Skewed Continuous Attributes"
authors: ["Jake Lee"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.19722v1"
url: "https://arxiv.org/abs/2604.19722v1"
citations: 0
source: arxiv
tier: core
query: "contextual bandits lead ranking B2B sales"
tags: ["evaluation"]
---

# Adaptive MSD-Splitting: Enhancing C4.5 and Random Forests for Skewed Continuous Attributes

**Authors.** Jake Lee

**Venue / year.** 2026

**Links.** [arXiv:2604.19722v1](https://arxiv.org/abs/2604.19722v1) · [source](https://arxiv.org/abs/2604.19722v1)

**Abstract.**

The discretization of continuous numerical attributes remains a persistent computational bottleneck in the induction of decision trees, particularly as dataset dimensions scale. Building upon the recently proposed MSD-Splitting technique -- which bins continuous data using the empirical mean and standard deviation to dramatically improve the efficiency and accuracy of the C4.5 algorithm -- we introduce Adaptive MSD-Splitting (AMSD). While standard MSD-Splitting is highly effective for approximately symmetric distributions, its rigid adherence to fixed one-standard-deviation cutoffs can lead to catastrophic information loss in highly skewed data, a common artifact in real-world biomedical and financial datasets. AMSD addresses this by dynamically adjusting the standard deviation multiplier based on feature skewness, narrowing intervals in dense regions to preserve discriminative resolution. Furthermore, we integrate AMSD into ensemble methods, specifically presenting the Random Forest-AMSD (RF-AMSD) framework. Empirical evaluations on the Census Income, Heart Disease, Breast Cancer, and Forest Covertype datasets demonstrate that AMSD yields a 2-4% accuracy improvement over standard MSD-Splitting, while maintaining near-identical O(N) time complexity reductions compared to the O(N log N) exhaustive search. Our Random Forest extension achieves state-of-the-art accuracy at a fraction of standard computational costs, confirming the viability of adaptive statistical binning in large-scale ensemble learning architectures.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

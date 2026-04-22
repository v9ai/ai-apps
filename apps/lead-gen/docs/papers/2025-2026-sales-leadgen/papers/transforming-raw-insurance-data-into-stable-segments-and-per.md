---
title: "Transforming Raw Insurance Data into Stable Segments and Personalized Upgrade Recommendations"
authors: ["Mustafa Serdar Konca", "Sadi Evren Şeker"]
year: 2025
venue: "Glovento Journal of Integrated Studies"
doi: ""
arxiv_id: ""
url: "https://www.semanticscholar.org/paper/993be3c8205f4e863b7fce58a78abe3917d75569"
citations: 0
source: s2
tier: broad
query: "cross-sell upsell recommendation"
tags: ["entity-resolution", "personalization", "evaluation", "revops"]
---

# Transforming Raw Insurance Data into Stable Segments and Personalized Upgrade Recommendations

**Authors.** Mustafa Serdar Konca, Sadi Evren Şeker

**Venue / year.** Glovento Journal of Integrated Studies · 2025

**Links.** [source](https://www.semanticscholar.org/paper/993be3c8205f4e863b7fce58a78abe3917d75569)

**Abstract.**

Insurers need customer segments that are interpretable, stable across refreshes, and traceable to business rules so they can support targeting, cross‑sell, and upsell at scale. We present a production‑grade pipeline that converts multi‑table operational data (policy, product, request, and entity records) into human‑readable segments with individualized upgrade guidance. The workflow combines a robust active‑policy definition that reconciles renewals and cancellations via request logs; product‑year inflation normalization of premiums; Isolation Forest–based anomaly suppression; standardized scaling; and k‑means clustering with centroid‑distance reporting. While k-means is our primary method, we also benchmark Gaussian Mixture Models and HDBSCAN; comparative results based on Silhouette and temporal stability (ARI) show that k-means provides more consistent and operationally usable segments. To preserve longitudinal comparability, a stability rule retains prior labels when relative distance changes are small, and agreement is monitored via the Adjusted Rand Index and a transition matrix. Above clusters, an RFM value tier overlays calibrated weights and quantile thresholds, which we invert to produce customer‑level prescriptions—additional tenure, distinct active products, or incremental premium—needed to move up one tier. We evaluate the approach on a portfolio of 379,584 customers represented by 38 engineered features, which are disclosed only in anonymized summary form (feature-wise missingness, uniqueness, and distributional statistics). Seven segments emerge that are interpretable and operationally consistent, with high agreement across monthly runs. We summarize segment composition, relative fingerprints (tenure, breadth, normalized premium, RFM), and value shares by tier, while suppressing raw levels to protect proprietary information. The contribution is an auditable, stability‑conscious segmentation system that links centroids to business narratives, exposes clear upgrade levers, and yields channel‑ready inputs for activation, bundling, and retention without sacrificing analytic rigor.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

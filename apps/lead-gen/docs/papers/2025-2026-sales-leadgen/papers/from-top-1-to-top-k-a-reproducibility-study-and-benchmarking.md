---
title: "From Top-1 to Top-K: A Reproducibility Study and Benchmarking of Counterfactual Explanations for Recommender Systems"
authors: ["Quang-Huy Nguyen", "Thanh-Hai Nguyen", "Khac-Manh Thai", "Duc-Hoang Pham", "Huy-Son Nguyen", "Cam-Van Thi Nguyen", "Masoud Mansoury", "Duc-Trong Le", "Hoang-Quynh Le"]
year: 2026
venue: ""
doi: "10.1145/3805712.3808574"
arxiv_id: "2604.19663v1"
url: "https://arxiv.org/abs/2604.19663v1"
citations: 0
source: arxiv
tier: core
query: "NeuralUCB neural contextual bandit recommendation"
tags: ["entity-resolution", "personalization", "evaluation"]
---

# From Top-1 to Top-K: A Reproducibility Study and Benchmarking of Counterfactual Explanations for Recommender Systems

**Authors.** Quang-Huy Nguyen, Thanh-Hai Nguyen, Khac-Manh Thai, Duc-Hoang Pham, Huy-Son Nguyen, Cam-Van Thi Nguyen, Masoud Mansoury, Duc-Trong Le, Hoang-Quynh Le

**Venue / year.** 2026

**Links.** [DOI](https://doi.org/10.1145/3805712.3808574) · [arXiv:2604.19663v1](https://arxiv.org/abs/2604.19663v1) · [source](https://arxiv.org/abs/2604.19663v1)

**Abstract.**

Counterfactual explanations (CEs) provide an intuitive way to understand recommender systems by identifying minimal modifications to user-item interactions that alter recommendation outcomes. Existing CE methods for recommender systems, however, have been evaluated under heterogeneous protocols, using different datasets, recommenders, metrics, and even explanation formats, which hampers reproducibility and fair comparison. Our paper systematically reproduces, re-implement, and re-evaluate eleven state-of-the-art CE methods for recommender systems, covering both native explainers (e.g., LIME-RS, SHAP, PRINCE, ACCENT, LXR, GREASE) and specific graph-based explainers originally proposed for GNNs. Here, a unified benchmarking framework is proposed to assess explainers along three dimensions: explanation format (implicit vs. explicit), evaluation level (item-level vs. list-level), and perturbation scope (user interaction vectors vs. user-item interaction graphs). Our evaluation protocol includes effectiveness, sparsity, and computational complexity metrics, and extends existing item-level assessments to top-K list-level explanations. Through extensive experiments on three real-world datasets and six representative recommender models, we analyze how well previously reported strengths of CE methods generalize across diverse setups. We observe that the trade-off between effectiveness and sparsity depends strongly on the specific method and evaluation setting, particularly under the explicit format; in addition, explainer performance remains largely consistent across item level and list level evaluations, and several graph-based explainers exhibit notable scalability limitations on large recommender graphs. Our results refine and challenge earlier conclusions about the robustness and practicality of CE generation methods in recommender systems: https://github.com/L2R-UET/CFExpRec.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

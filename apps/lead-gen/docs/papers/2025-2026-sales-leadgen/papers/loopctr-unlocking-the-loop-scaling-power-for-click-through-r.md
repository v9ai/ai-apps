---
title: "LoopCTR: Unlocking the Loop Scaling Power for Click-Through Rate Prediction"
authors: ["Jiakai Tang", "Runfeng Zhang", "Weiqiu Wang", "Yifei Liu", "Chuan Wang", "Xu Chen", "Yeqiu Yang", "Jian Wu", "Yuning Jiang", "Bo Zheng"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.19550v1"
url: "https://arxiv.org/abs/2604.19550v1"
citations: 0
source: arxiv
tier: core
query: "entity linking CRM deduplication transformer"
tags: ["evaluation"]
---

# LoopCTR: Unlocking the Loop Scaling Power for Click-Through Rate Prediction

**Authors.** Jiakai Tang, Runfeng Zhang, Weiqiu Wang, Yifei Liu, Chuan Wang, Xu Chen, Yeqiu Yang, Jian Wu, Yuning Jiang, Bo Zheng

**Venue / year.** 2026

**Links.** [arXiv:2604.19550v1](https://arxiv.org/abs/2604.19550v1) · [source](https://arxiv.org/abs/2604.19550v1)

**Abstract.**

Scaling Transformer-based click-through rate (CTR) models by stacking more parameters brings growing computational and storage overhead, creating a widening gap between scaling ambitions and the stringent industrial deployment constraints. We propose LoopCTR, which introduces a loop scaling paradigm that increases training-time computation through recursive reuse of shared model layers, decoupling computation from parameter growth. LoopCTR adopts a sandwich architecture enhanced with Hyper-Connected Residuals and Mixture-of-Experts, and employs process supervision at every loop depth to encode multi-loop benefits into the shared parameters. This enables a train-multi-loop, infer-zero-loop strategy where a single forward pass without any loop already outperforms all baselines. Experiments on three public benchmarks and one industrial dataset demonstrate state-of-the-art performance. Oracle analysis further reveals 0.02--0.04 AUC of untapped headroom, with models trained with fewer loops exhibiting higher oracle ceilings, pointing to a promising frontier for adaptive inference.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

---
title: "Modular Representation Compression: Adapting LLMs for Efficient and Effective Recommendations"
authors: ["Yunjia Xi", "Menghui Zhu", "Jianghao Lin", "Bo Chen", "Ruiming Tang", "Yong Yu", "Weinan Zhang"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.18146v2"
url: "https://arxiv.org/abs/2604.18146v2"
citations: 0
source: arxiv
tier: broad
query: "cross-sell upsell recommendation"
tags: ["entity-resolution"]
---

# Modular Representation Compression: Adapting LLMs for Efficient and Effective Recommendations

**Authors.** Yunjia Xi, Menghui Zhu, Jianghao Lin, Bo Chen, Ruiming Tang, Yong Yu, Weinan Zhang

**Venue / year.** 2026

**Links.** [arXiv:2604.18146v2](https://arxiv.org/abs/2604.18146v2) · [source](https://arxiv.org/abs/2604.18146v2)

**Abstract.**

Recently, large language models (LLMs) have advanced recommendation systems (RSs), and recent works have begun to explore how to integrate LLMs into industrial RSs. While most approaches deploy LLMs offline to generate and pre-cache augmented representations for RSs, high-dimensional representations from LLMs introduce substantial storage and computational costs. Thus, it is crucial to compress LLM representations effectively. However, we identify a counterintuitive phenomenon during representation compression: Mid-layer Representation Advantage (MRA), where representations from middle layers of LLMs outperform those from final layers in recommendation tasks. This degraded final layer renders existing compression methods, which typically compress on the final layer, suboptimal. We interpret this based on modularity theory that LLMs develop spontaneous internal functional modularity and force the final layer to specialize in the proxy training task. Thus, we propose \underline{M}odul\underline{a}r \underline{R}epresentation \underline{C}ompression (MARC) to explicitly control the modularity of LLMs. First, Modular Adjustment explicitly introduces compression and task adaptation modules, enabling the LLM to operate strictly as a representation-learning module. Next, to ground each module to its specific task, Modular Task Decoupling uses information constraints and different network structures to decouple tasks. Extensive experiments validate that MARC addresses MRA and produces efficient representations. Notably, MARC achieved a 2.82% eCPM lift in an online A/B test within a large-scale commercial search advertising scenario.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

---
title: "CAST: Modeling Semantic-Level Transitions for Complementary-Aware Sequential Recommendation"
authors: ["Qian Zhang", "Lech Szymanski", "Haibo Zhang", "Jeremiah D. Deng"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.19414v1"
url: "https://arxiv.org/abs/2604.19414v1"
citations: 0
source: arxiv
tier: core
query: "NeuralUCB neural contextual bandit recommendation"
tags: ["lead-scoring"]
---

# CAST: Modeling Semantic-Level Transitions for Complementary-Aware Sequential Recommendation

**Authors.** Qian Zhang, Lech Szymanski, Haibo Zhang, Jeremiah D. Deng

**Venue / year.** 2026

**Links.** [arXiv:2604.19414v1](https://arxiv.org/abs/2604.19414v1) · [source](https://arxiv.org/abs/2604.19414v1)

**Abstract.**

Sequential Recommendation (SR) aims to predict the next interaction of a user based on their behavior sequence, where complementary relations often provide essential signals for predicting the next item. However, mainstream models relying on sparse co-purchase statistics often mistake spurious correlations (e.g., due to popularity bias) for true complementary relations. Identifying true complementary relations requires capturing the fine-grained item semantics (e.g., specifications) that simple cooccurrence statistics would be unable to model. While recent semantics-based methods utilize discrete semantic codes to represent items, they typically aggregate semantic codes into coarse item representations. This aggregation process blurs specific semantic details required to identify complementarity. To address these critical limitations and effectively leverage semantics for capturing reliable complementary relations, we propose a Complementary-Aware Semantic Transition (CAST) framework that introduces a new modeling paradigm built upon semantic-level transitions. Specifically, a semantic-level transition module is designed to model dynamic transitions directly in the discrete semantic code space, effectively capturing fine-grained semantic dependencies often lost in aggregated item representations. Then, a complementary prior injection module is designed to incorporate LLM-verified complementary priors into the attention mechanism, thereby prioritizing complementary patterns over co-occurrence statistics. Experiments on multiple e-commerce datasets demonstrate that CAST consistently outperforms the state-of-the-art approaches, achieving up to 17.6% Recall and 16.0% NDCG gains with 65x training acceleration. This validates its effectiveness and efficiency in uncovering latent item complementarity beyond statistics. The code will be released upon acceptance.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

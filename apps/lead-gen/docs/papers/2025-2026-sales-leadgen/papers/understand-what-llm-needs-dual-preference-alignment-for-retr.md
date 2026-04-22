---
title: "Understand What LLM Needs: Dual Preference Alignment for Retrieval-Augmented Generation"
authors: ["Guanting Dong", "Yutao Zhu", "Chenghao Zhang", "Zechen Wang", "Ji-Rong Wen", "Zhicheng Dou"]
year: 2025
venue: ""
doi: "10.1145/3696410.3714717"
arxiv_id: ""
url: "https://doi.org/10.1145/3696410.3714717"
citations: 23
source: openalex
tier: core
query: "domain-specific LLM distillation small model"
tags: ["entity-resolution", "llm-agents", "revops"]
---

# Understand What LLM Needs: Dual Preference Alignment for Retrieval-Augmented Generation

**Authors.** Guanting Dong, Yutao Zhu, Chenghao Zhang, Zechen Wang, Ji-Rong Wen, Zhicheng Dou

**Venue / year.** 2025

**Links.** [DOI](https://doi.org/10.1145/3696410.3714717) · [source](https://doi.org/10.1145/3696410.3714717)

**Abstract.**

Retrieval-augmented generation (RAG) has effectively mitigated the hallucination problem of large language models (LLMs). However, the difficulty of aligning the retriever with the LLMs' diverse knowledge preferences inevitably poses a challenge in developing a reliable RAG system. To address this issue, we propose DPA-RAG, a universal framework designed to align diverse knowledge preferences within RAG systems. Specifically, we initially introduce a preference knowledge construction pipeline and incorporate five novel query augmentation strategies to alleviate preference data scarcity. Based on preference data, DPA-RAG accomplishes both external and internal preference alignment: 1) It jointly integrates pairwise, pointwise, and contrastive preference alignment abilities into the reranker, achieving external preference alignment among RAG components. 2) It further introduces a pre-aligned stage before vanilla Supervised Fine-tuning (SFT), enabling LLMs to implicitly capture knowledge aligned with their reasoning preferences, achieving LLMs' internal alignment. Experimental results across four knowledge-intensive QA datasets demonstrate that DPA-RAG outperforms all baselines and seamlessly integrates both black-box and open-sourced LLM readers. Further qualitative analysis and discussions provide empirical guidance for achieving reliable RAG systems. Our code and example dataset are available at https://github.com/dongguanting/DPA-RAG.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

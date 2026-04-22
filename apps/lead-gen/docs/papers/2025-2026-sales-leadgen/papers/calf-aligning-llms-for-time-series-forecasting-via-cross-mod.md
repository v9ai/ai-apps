---
title: "CALF: Aligning LLMs for Time Series Forecasting via Cross-modal Fine-Tuning"
authors: ["Peiyuan Liu", "Hang Guo", "Tao Dai", "Naiqi Li", "Jigang Bao", "Xudong Ren", "Yong Jiang", "Shu–Tao Xia"]
year: 2025
venue: "Proceedings of the AAAI Conference on Artificial Intelligence"
doi: "10.1609/aaai.v39i18.34082"
arxiv_id: ""
url: "https://doi.org/10.1609/aaai.v39i18.34082"
citations: 36
source: openalex
tier: core
query: "domain-specific LLM distillation small model"
tags: ["forecasting"]
---

# CALF: Aligning LLMs for Time Series Forecasting via Cross-modal Fine-Tuning

**Authors.** Peiyuan Liu, Hang Guo, Tao Dai, Naiqi Li, Jigang Bao, Xudong Ren, Yong Jiang, Shu–Tao Xia

**Venue / year.** Proceedings of the AAAI Conference on Artificial Intelligence · 2025

**Links.** [DOI](https://doi.org/10.1609/aaai.v39i18.34082) · [source](https://doi.org/10.1609/aaai.v39i18.34082)

**Abstract.**

Deep learning (e.g., Transformer) has been widely and successfully used in multivariate time series forecasting (MTSF). Unlike existing methods that focus on training models from a single modal of time series input, large language models (LLMs) based MTSF methods with cross-modal text and time series input have recently shown great superiority, especially with limited temporal data. However, current LLM-based MTSF methods usually focus on adapting and fine-tuning LLMs, while neglecting the distribution discrepancy between textual and temporal input tokens, thus leading to sub-optimal performance. To address this issue, we propose a novel Cross-Modal LLM Fine-Tuning (CALF) framework for MTSF by reducing the distribution discrepancy between textual and temporal data, which mainly consists of the temporal target branch with temporal input and the textual source branch with aligned textual input. To reduce the distribution discrepancy, we develop the cross-modal match module to first align cross-modal input distributions. Additionally, to minimize the modality distribution gap in both feature and output spaces, feature regularization loss is developed to align the intermediate features between the two branches for better weight updates, while output consistency loss is introduced to allow the output representations of both branches to correspond effectively. Thanks to the modality alignment, CALF establishes state-of-the-art performance for both long-term and short-term forecasting tasks with low computational complexity, and exhibits favorable few-shot and zero-shot abilities similar to that in LLMs.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

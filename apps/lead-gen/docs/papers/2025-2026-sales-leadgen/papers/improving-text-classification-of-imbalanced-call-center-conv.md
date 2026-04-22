---
title: "Improving Text Classification of Imbalanced Call Center Conversations Through Data Cleansing, Augmentation, and NER Metadata"
authors: ["Sihyoung Jurn", "Woo-Je Kim"]
year: 2025
venue: "Electronics"
doi: "10.3390/electronics14112259"
arxiv_id: ""
url: "https://doi.org/10.3390/electronics14112259"
citations: 1
source: openalex
tier: broad
query: "sales call transcript summarization LLM"
tags: ["entity-resolution"]
---

# Improving Text Classification of Imbalanced Call Center Conversations Through Data Cleansing, Augmentation, and NER Metadata

**Authors.** Sihyoung Jurn, Woo-Je Kim

**Venue / year.** Electronics · 2025

**Links.** [DOI](https://doi.org/10.3390/electronics14112259) · [source](https://doi.org/10.3390/electronics14112259)

**Abstract.**

The categories for call center conversation data are valuably used for reporting business results and marketing analysis. However, they typically lack clear patterns and suffer from severe imbalance in the number of instances across categories. The call center conversation categories used in this study are Payment, Exchange, Return, Delivery, Service, and After-sales service (AS), with a significant imbalance where Service accounts for 26% of the total data and AS only 2%. To address these challenges, this study proposes a model that ensembles meta-information generated through Named Entity Recognition (NER) with machine learning inference results. Utilizing KoBERT (Korean Bidirectional Encoder Representations from Transformers) as our base model, we employed Easy Data Augmentation (EDA) to augment data in categories with insufficient instances. Through the training of nine models, encompassing KoBERT category probability weights and a CatBoost (Categorical Boosting) model that ensembles meta-information derived from named entities, we ultimately improved the F1 score from the baseline of 0.9117 to 0.9331, demonstrating a solution that circumvents the need for expensive LLMs (Large Language Models) or high-performance GPUs (Graphic Process Units). This improvement is particularly significant considering that, when focusing solely on the category with a 2% data proportion, our model achieved an F1 score of 0.9509, representing a 4.6% increase over the baseline.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

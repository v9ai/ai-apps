---
title: "Context Matters More Than Model Choice: A Multi-Corpus Benchmark of Embedding Models for Clinical Retrieval-Augmented Generation (Preprint)"
authors: ["Yngve Mikkelsen"]
year: 2026
venue: ""
doi: "10.2196/preprints.94241"
arxiv_id: ""
url: "https://doi.org/10.2196/preprints.94241"
citations: 1
source: crossref
tier: core
query: "retrieval-augmented generation CRM context"
tags: ["entity-resolution", "matching", "llm-agents", "evaluation"]
---

# Context Matters More Than Model Choice: A Multi-Corpus Benchmark of Embedding Models for Clinical Retrieval-Augmented Generation (Preprint)

**Authors.** Yngve Mikkelsen

**Venue / year.** 2026

**Links.** [DOI](https://doi.org/10.2196/preprints.94241) · [source](https://doi.org/10.2196/preprints.94241)

**Abstract.**

BACKGROUND
                  Retrieval-augmented generation (RAG) systems increasingly support clinical decision-making by grounding large language model outputs in verifiable evidence. The retrieval component is foundational: if the correct document is not retrieved, downstream generation cannot recover it. Despite this, embedding model selection for clinical RAG remains guided by general-domain benchmarks with limited clinical coverage. Given the heterogeneity of clinical documentation across institutions, specialties, and electronic health record systems, it is unclear whether general-domain model rankings generalize to clinical retrieval tasks.
                
                
                  OBJECTIVE
                  This study evaluated whether clinical context variables—corpus type (encompassing differences in document length, medical specialty, and structural characteristics) and query format—have effects on retrieval performance comparable to or exceeding those of embedding model choice.
                
                
                  METHODS
                  Ten embedding models were benchmarked against BM25 on three clinical corpora (MTSamples medical transcriptions, n=500; PMC-Patients case reports, n=500; Mistral-7B-generated synthetic clinical notes, n=500). Twelve embedding configurations were evaluated across 3 corpora × 2 query formats (keyword vs natural language) × 4 chunking strategies, yielding 294 experimental conditions. Primary metrics included MRR@10, P@1, Recall@10/20/50/100, and NDCG@10, with bootstrap confidence intervals. Relative factor contributions were quantified using factorial ANOVA with η² effect sizes, including all two-way interactions.
                
                
                  RESULTS
                  In a factorial ANOVA across 288 balanced embedding conditions, embedding model choice explained 40.8% of variance in MRR@10 (η²=0.408), corpus type 24.6%, and query format 19.2%. Chunking strategy explained minimal variance (η²=0.002). The model × query format interaction (η²=0.029, p&lt;.001) indicated differential query sensitivity across models. A model × corpus interaction (η²=0.040, p&lt;.001) indicated that model rankings shifted meaningfully across corpora. Combined context variables (corpus + query format + context interactions) explained 49.0% of total variance, compared with 47.6% for model-related effects. Model rankings were moderately unstable under keyword queries (Kendall τ=0.59, 95% CI [0.21, 0.89]) but highly stable under natural language queries (τ=0.82–0.87). BM25 achieved near-perfect retrieval on PMC-Patients in this known-item setting (MRR@10=0.999). Domain-specific models (BioBERT, ClinicalBERT) performed worse than general-purpose embeddings despite biomedical pretraining, with mean pairwise cosine similarity exceeding 0.90, indicating that all embeddings clustered in a narrow cone. A validation experiment using reduced-lexical-dependence queries—generated from GPT-4o-extracted metadata rather than document text—supported rank stability across query derivations (Kendall τ=0.59–0.90, mean 0.76, all p&lt;.005) and showed that BM25 remained strong on structured case reports (MRR@10=0.980).
                
                
                  CONCLUSIONS
                  Clinical context variables explained as much variance in retrieval performance as embedding model choice, and model × corpus interactions showed that rankings are not portable across documentation types. Validation with reduced-lexical-dependence queries supported rank stability across query derivations. These results argue against reliance on general-domain leaderboards for clinical RAG deployment and support mandatory local validation as a methodological requirement.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

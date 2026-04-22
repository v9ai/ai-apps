---
title: "Context-Aware ML/NLP Pipeline for Real-Time Anomaly Detection and Risk Assessment in Cloud API Traffic"
authors: ["Aziz Abibulaiev", "Petro Pukach", "Myroslava Vovk"]
year: 2026
venue: ""
doi: "10.3390/make8010025"
arxiv_id: ""
url: "https://doi.org/10.3390/make8010025"
citations: 2
source: crossref
tier: broad
query: "sales pipeline anomaly detection"
tags: ["entity-resolution", "revops"]
---

# Context-Aware ML/NLP Pipeline for Real-Time Anomaly Detection and Risk Assessment in Cloud API Traffic

**Authors.** Aziz Abibulaiev, Petro Pukach, Myroslava Vovk

**Venue / year.** 2026

**Links.** [DOI](https://doi.org/10.3390/make8010025) · [source](https://doi.org/10.3390/make8010025)

**Abstract.**

We present a combined ML/NLP (Machine Learning, Natural Language Processing) pipeline for protecting cloud-based APIs (Application Programming Interfaces), which works both at the level of individual HTTP (Hypertext Transfer Protocol) requests and at the access log file reading mode, linking explicitly technical anomalies with business risks. The system processes each event/access log through parallel numerical and textual branches: a set of anomaly detectors trained on traffic engineering characteristics and a hybrid NLP stack that combines rules, TF-IDF (Term Frequency-Inverse Document Frequency), and character-level models trained on enriched security datasets. Their results are integrated using a risk-aware policy that takes into account endpoint type, data sensitivity, exposure, and authentication status, and creates a discrete risk level with human-readable explanations and recommended SOC (Security Operations Center) actions. We implement this design as a containerized microservice pipeline (input, preprocessing, ML, NLP, merging, alerting, and retraining services), orchestrated using Docker Compose and instrumented using OpenSearch Dashboards. Experiments with OWASP-like (Open Worldwide Application Security Project) attack scenarios show a high detection rate for injections, SSRF (Server-Side Request Forgery), Data Exposure, and Business Logic Abuse, while the processing time for each request remains within real-time limits even in sequential testing mode. Thus, the pipeline bridges the gap between ML/NLP research for security and practical API protection channels that can evolve over time through feedback and retraining.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

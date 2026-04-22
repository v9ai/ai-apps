---
title: "Low-Latency AI Inference Tooling for Personalized Product Recommendations at Checkout"
authors: ["Udit Agarwal -"]
year: 2026
venue: ""
doi: "10.62970/ijirct.v12.i1.2601026"
arxiv_id: ""
url: "https://doi.org/10.62970/ijirct.v12.i1.2601026"
citations: 0
source: crossref
tier: core
query: "low-latency inference serving Rust ML"
tags: ["entity-resolution", "matching", "llm-agents", "personalization"]
---

# Low-Latency AI Inference Tooling for Personalized Product Recommendations at Checkout

**Authors.** Udit Agarwal -

**Venue / year.** 2026

**Links.** [DOI](https://doi.org/10.62970/ijirct.v12.i1.2601026) · [source](https://doi.org/10.62970/ijirct.v12.i1.2601026)

**Abstract.**

This technical report addresses the architectural and tooling requirements necessary to achieve low-latency inference for personalized product recommendations within high-traffic e-commerce checkout flows. The temporal constraints imposed by the point-of-sale environment are exceptionally severe; empirical evidence suggests that system delays as minor as 100 milliseconds (ms) can correlate directly with a 1% loss in sales. Consequently, meeting a stringent Service Level Objective (SLO) for the worst-case tail latency (P99) of less than 500 ms is non-negotiable for maximizing conversion rates.
Modern recommendation services, predominantly based on Deep Learning Recommendation Models (DLRMs), face inherent difficulties due to their reliance on vast embedding tables (EMTs) that can exceed a Terabyte in size.This challenge necessitates an algorithm-system co-design approach. The analysis identifies two primary tooling mechanisms for mitigating these bottlenecks: Model Quantization and Inference Compilation. Quantization, specifically employing INT4 precision, has demonstrated the capacity to reduce DLRM model size from 12.58 GB to 1.57 GB on Terabyte datasets while maintaining competitive accuracy.This size reduction directly addresses memory bandwidth constraints. Concurrently, Inference Compilation, using runtimes like ONNX, delivers typical inference speedups ranging from 2x to 10x. These optimized models must be deployed within a fault-tolerant Microservices architecture that leverages low-overhead communication protocols such as gRPC to ensure high throughput and minimize inter-service communication friction. The synergistic deployment of these strategies is essential for operationalizing personalized recommendations without compromising the integrity of the real-time checkout experience.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

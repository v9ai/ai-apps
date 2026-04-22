---
title: "VLA Foundry: A Unified Framework for Training Vision-Language-Action Models"
authors: ["Jean Mercat", "Sedrick Keh", "Kushal Arora", "Isabella Huang", "Paarth Shah", "Haruki Nishimura", "Shun Iwase", "Katherine Liu"]
year: 2026
venue: ""
doi: ""
arxiv_id: "2604.19728v1"
url: "https://arxiv.org/abs/2604.19728v1"
citations: 0
source: arxiv
tier: core
query: "contextual bandits lead ranking B2B sales"
tags: ["evaluation", "revops"]
---

# VLA Foundry: A Unified Framework for Training Vision-Language-Action Models

**Authors.** Jean Mercat, Sedrick Keh, Kushal Arora, Isabella Huang, Paarth Shah, Haruki Nishimura, Shun Iwase, Katherine Liu

**Venue / year.** 2026

**Links.** [arXiv:2604.19728v1](https://arxiv.org/abs/2604.19728v1) · [source](https://arxiv.org/abs/2604.19728v1)

**Abstract.**

We present VLA Foundry, an open-source framework that unifies LLM, VLM, and VLA training in a single codebase. Most open-source VLA efforts specialize on the action training stage, often stitching together incompatible pretraining pipelines. VLA Foundry instead provides a shared training stack with end-to-end control, from language pretraining to action-expert fine-tuning. VLA Foundry supports both from-scratch training and pretrained backbones from Hugging Face. To demonstrate the utility of our framework, we train and release two types of models: the first trained fully from scratch through our LLM-->VLM-->VLA pipeline and the second built on the pretrained Qwen3-VL backbone. We evaluate closed-loop policy performance of both models on LBM Eval, an open-data, open-source simulator. We also contribute usability improvements to the simulator and the STEP analysis tools for easier public use. In the nominal evaluation setting, our fully-open from-scratch model is on par with our prior closed-source work and substituting in the Qwen3-VL backbone leads to a strong multi-task table top manipulation policy outperforming our baseline by a wide margin. The VLA Foundry codebase is available at https://github.com/TRI-ML/vla_foundry and all multi-task model weights are released on https://huggingface.co/collections/TRI-ML/vla-foundry. Additional qualitative videos are available on the project website https://tri-ml.github.io/vla_foundry.

## Novelty (fill in)
- 
- 
- 

## Relevance to lead-gen (fill in)
- 

## Reuse opportunity (fill in)
- 

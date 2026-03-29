---
slug: turboquant-3-bit-kv-cache-zero-loss
title: "TurboQuant: 3-Bit KV Caches with Zero Accuracy Loss"
description: "TurboQuant (Zandieh et al., Google Research, ICLR 2026) compresses KV caches to 3 bits per value without retraining and without measurable accuracy loss. It bundles PolarQuant, QJL, and Lloyd-Max quantization to achieve 6x memory reduction and up to 8x attention speedup on H100 GPUs."
date: 2026-03-29
authors: [nicolad]
tags:
  - kv-cache
  - quantization
  - inference
  - google-research
  - llm-efficiency
---

Every token your LLM generates forces it to reread its entire conversational history. That history -- the Key-Value cache -- is the single largest memory bottleneck during inference. A Llama-3.1-70B serving a 128K-token context in FP16 burns through **~40 GB of VRAM on KV cache alone**, leaving almost nothing for weights on a single 80 GB H100. The standard remedies -- eviction (SnapKV, PyramidKV) and sparse attention -- trade accuracy for memory. They throw tokens away.

TurboQuant, published at ICLR 2026 by Zandieh, Daliri, Hadian, and Mirrokni from Google Research, takes the opposite approach: **keep every token, compress every value**. At 3 bits per coordinate it delivers 6x memory reduction. At 4 bits it delivers up to 8x speedup in computing attention logits on H100 GPUs. The headline result: on LongBench with Llama-3.1-8B-Instruct, the 3.5-bit configuration scores **50.06 -- identical to the 16-bit baseline**. No retraining. No fine-tuning. No calibration data.

<!-- truncate -->

## The Research Trilogy

TurboQuant is the capstone of three papers by overlapping author groups at Google Research:

| Paper | Venue | Core Idea |
|-------|-------|-----------|
| **QJL** | AAAI 2025 | 1-bit quantized Johnson-Lindenstrauss transform for unbiased inner-product estimation |
| **PolarQuant** | AISTATS 2026 | Polar-coordinate decomposition that eliminates per-block normalization overhead |
| **TurboQuant** | ICLR 2026 | Unifies both into a two-stage pipeline with formal distortion-rate guarantees |

Each paper solves a distinct failure mode of naive quantization. Together they form a complete system with provable optimality bounds.

## How It Works: The Two-Stage Pipeline

### Stage 1: Random Rotation + Lloyd-Max Scalar Quantization (b-1 bits)

The foundational insight is that applying a random orthogonal rotation to any vector causes each coordinate to follow a **known, data-independent Beta distribution**:

$$f_X(x) = \frac{\Gamma(d/2)}{\sqrt{\pi}\,\Gamma((d{-}1)/2)}\,(1 - x^2)^{(d-3)/2}$$

In high dimensions this converges to $\mathcal{N}(0, 1/d)$. Crucially, distinct coordinates become nearly independent after rotation. This collapses the intractable $d$-dimensional vector quantization problem into $d$ independent **scalar** quantization problems -- each with a known, universal distribution.

Because the distribution is known analytically and is the same regardless of input data, optimal Lloyd-Max codebooks can be precomputed once offline:

| Bits | Centroids | MSE Distortion |
|------|-----------|---------------|
| 1 | $\pm\sqrt{2/(\pi d)}$ | 0.36 |
| 2 | $\pm 0.453/\sqrt{d},\ \pm 1.51/\sqrt{d}$ | 0.117 |
| 3 | 8 precomputed centroids | 0.03 |
| 4 | 16 precomputed centroids | 0.009 |

This is the PolarQuant contribution: by working in polar coordinates after random preconditioning, it eliminates the per-block zero-point and scale factors that other methods must store in full precision -- saving 1-2 bits of overhead per coordinate.

### Stage 2: QJL Residual Correction (1 bit)

MSE-optimal scalar quantizers introduce **bias** in inner-product estimation. Attention scores are inner products ($q \cdot k$), so biased quantization means biased softmax weights -- which compounds across layers.

QJL corrects this with a 1-bit residual:

1. Compute residual: $r = x - \hat{x}_{\text{MSE}}$
2. Apply random projection: $S \sim \mathcal{N}(0,1)^{m \times d}$
3. Store: $\text{sign}(S \cdot r)$ and $\gamma = \|r\|_2$

The reconstruction combines both stages:

$$\tilde{x} = \hat{x}_{\text{MSE}} + \gamma \cdot \frac{\sqrt{\pi/2}}{d} \cdot S^\top \cdot \text{sign}(S \cdot r)$$

The critical property: $\mathbb{E}[\langle y, \tilde{x}\rangle] = \langle y, x\rangle$ -- the inner-product estimator is **unbiased**. Combined budget: $(b{-}1)$ bits for MSE quantizer + 1 bit for QJL = $b$ total bits per coordinate.

## Benchmark Results

### LongBench (Llama-3.1-8B-Instruct)

| Method | Bits | SingleQA | MultiQA | Summarization | FewShot | Synthetic | Code | **Average** |
|--------|------|----------|---------|---------------|---------|-----------|------|---------|
| Full Cache | 16 | 45.29 | 45.16 | 26.55 | 68.38 | 59.54 | 46.28 | **50.06** |
| **TurboQuant** | **3.5** | **45.01** | **45.31** | **26.00** | **68.63** | **59.95** | **46.17** | **50.06** |
| TurboQuant | 2.5 | 44.16 | 44.96 | 24.80 | 68.01 | 59.65 | 45.76 | 49.44 |
| PolarQuant | 3.9 | 45.18 | 44.48 | 26.23 | 68.25 | 60.07 | 45.24 | 49.78 |
| KIVI | 3 | 43.38 | 37.99 | 27.16 | 68.38 | 59.50 | 44.68 | 48.50 |

At 3.5 bits TurboQuant exactly matches full precision. At 2.5 bits the degradation is marginal (0.62 points). KIVI at 3 bits loses 1.56 points, with MultiQA dropping sharply (-7.17).

### Needle-in-a-Haystack (Llama-3.1-8B-Instruct, 4x compression)

| Method | Score |
|--------|-------|
| Full precision (16-bit) | 0.997 |
| **TurboQuant** | **0.997** |
| PolarQuant | 0.995 |
| KIVI | 0.981 |
| PyramidKV | 0.895 |
| SnapKV | 0.858 |

TurboQuant achieves perfect retrieval across all test lengths up to 104K context. The eviction-based methods (PyramidKV, SnapKV) drop catastrophically because they may evict exactly the token containing the needle.

### Quantization Speed (Vector Search Application)

| Method | d=200 | d=1536 | d=3072 |
|--------|-------|--------|--------|
| Product Quantization | 37.04s | 239.75s | 494.42s |
| RaBitQ | 597.25s | 2267.59s | 3957.19s |
| **TurboQuant** | **0.0007s** | **0.0013s** | **0.0021s** |

Five orders of magnitude faster. Because the codebooks are data-oblivious and precomputed, quantization reduces to a single matrix multiply + nearest-centroid lookup.

## Theoretical Guarantees

TurboQuant's MSE distortion is within a factor of $\sqrt{3}\pi/2 \approx 2.7\times$ of the information-theoretic lower bound. No algorithm operating at the same bit budget can fundamentally do more than ~2.7x better. At 1 bit, the gap tightens to ~1.45x.

The inner-product distortion bound:

$$D_{\text{prod}} \leq \frac{\sqrt{3}\,\pi^2\,\|y\|^2}{d} \cdot \frac{1}{4^b}$$

This exponential decay in $b$ is why jumping from 2 to 3 bits cuts distortion by 4x, making the 3-bit regime viable.

## Caveats and Critical Analysis

The "zero loss" claim is strong but scoped:

- **GSM8K at 3-bit shows 1.4-point degradation** (84.3% vs 85.7%), suggesting math/reasoning tasks are more sensitive to quantization noise in attention scores
- **Prefill runs in full BF16** -- only the decode phase uses quantized cache, which favors generation-light benchmarks
- The "8x speedup" is measured against FP32 baselines, not production FP16
- Evaluation is limited to models up to ~8B parameters
- The ArXiv-to-camera-ready version changed some LongBench scores without explanation

The community implementation effort in llama.cpp (discussion #20969, 32+ contributors) has also surfaced practical findings:

- **Keys need more bits than values.** Modern LLMs display 4-182x norm disparities between K and V. Optimal strategy: q8_0 for keys + turbo3 for values
- **MSE-only often outperforms QJL in practice.** Multiple implementations report the QJL bias-correction stage actually degrades softmax ranking quality
- On 70B models with 34 GB VRAM, FP16 supports ~109K tokens; TQ3 supports **~536K tokens** -- a 5x capacity gain

## Practical Deployment Guidance

**4-bit** is the sweet spot for 3B+ models -- indistinguishable from FP16. **3-bit** works for 8B+ but degrades on smaller architectures. Most production deployments keep the most recent 128-256 tokens in full FP16 and compress only older cache entries.

The compression benefit scales with context length. At fewer than 1K tokens the overhead of rotation matrices dominates. At 8K+ tokens you save 2+ GB. At 128K tokens you save tens of gigabytes -- enough to move from multi-GPU to single-GPU serving.

TurboQuant pairs cleanly with weight quantization (GPTQ, AWQ). A 70B model with 4-bit weights and 3-bit KV cache fits in 34 GB VRAM with 500K+ token capacity. That's a single A100 or a Mac Studio with 64 GB unified memory.

## Industry Implications

TrendForce and Morgan Stanley note that TurboQuant does **not** reduce absolute memory demand -- it enables 4-8x longer context windows or larger batch sizes on existing hardware. The commercial effect is utilization optimization, not HBM demand reduction. Memory supply constraints persist.

The deeper impact is architectural. Data-oblivious quantization means the same CUDA kernel works across all models, all layers, without calibration. That makes it a systems-level primitive -- something that belongs in the serving stack (vLLM, TensorRT-LLM, llama.cpp) rather than requiring per-model tuning. The llama.cpp community already has working implementations across Metal, CUDA, and Vulkan backends.

This is probably the strongest "zero loss" claim in the current KV cache compression landscape. The formal distortion bounds, the data-oblivious design, and the consistent benchmark results across QA, code, and summarization make TurboQuant the method to beat at the 3-4 bit operating point.

## References

- [TurboQuant paper (arXiv:2504.19874)](https://arxiv.org/abs/2504.19874) -- Zandieh, Daliri, Hadian, Mirrokni
- [PolarQuant paper (arXiv:2502.02617)](https://arxiv.org/abs/2502.02617) -- Han, Kacham, Karbasi, Mirrokni, Zandieh
- [QJL paper (arXiv:2406.03482)](https://arxiv.org/abs/2406.03482) -- Zandieh, Daliri, Han
- [Google Research blog post](https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/)
- [llama.cpp community implementation (Discussion #20969)](https://github.com/ggml-org/llama.cpp/discussions/20969)

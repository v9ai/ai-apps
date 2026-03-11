# Inference Optimization: KV Cache, Quantization & Speculative Decoding

Serving large language models at production scale is fundamentally an inference optimization problem. While training a frontier model may cost hundreds of millions of dollars, the cumulative cost of inference — serving billions of requests across the model's lifetime — typically dwarfs training cost by an order of magnitude. This article examines the core techniques that make LLM inference practical: KV cache management, quantization methods, speculative decoding, continuous batching, and attention optimization. Each technique addresses a different bottleneck in the inference pipeline, and understanding their interactions is essential for building efficient serving systems.

## The Inference Pipeline

LLM inference proceeds in two distinct phases, each with different computational characteristics:

### Prefill Phase

The prefill phase processes the entire input prompt in parallel. For a prompt of $n$ tokens, the model computes attention over all $n$ tokens simultaneously, populating the KV cache. This phase is **compute-bound** — it performs $O(n^2 d)$ operations for attention and $O(n d^2)$ for FFN layers, and modern GPUs have sufficient memory bandwidth to keep ALUs busy.

### Decode Phase

The decode phase generates tokens one at a time, autoregressively. Each new token requires:

1. Computing the query, key, and value for the new token
2. Attending to all previous keys and values (from the KV cache)
3. Computing the FFN output
4. Sampling the next token

This phase is **memory-bandwidth-bound**: for each generated token, the model must read all its parameters from memory (GPU HBM) but performs very little computation per parameter (just a matrix-vector multiplication, not a matrix-matrix multiplication). The arithmetic intensity (FLOPs per byte loaded) is extremely low, leaving the GPU's compute units mostly idle.

```python
# Arithmetic intensity comparison
# Prefill: matrix-matrix multiply (high intensity)
# B=batch, N=seq_len, D=hidden_dim
# FLOPs: B * N * D * D, Bytes: D * D (weight) + B * N * D (input)
# Intensity: ~N (scales with sequence length)

# Decode: matrix-vector multiply (low intensity)
# FLOPs: B * 1 * D * D, Bytes: D * D (weight) + B * 1 * D (input)
# Intensity: ~B (scales with batch size only)
# For B=1: intensity ~1, GPU utilization ~1%
```

This memory-bandwidth bottleneck during decode is the central challenge of LLM inference optimization.

## KV Cache Mechanics

The KV cache stores the key and value projections for all previously processed tokens, avoiding redundant recomputation during autoregressive generation.

### Memory Requirements

For a model with $L$ layers, $n_h$ attention heads, head dimension $d_h$, and sequence length $s$:

$$\text{KV cache size} = 2 \times L \times n_h \times d_h \times s \times \text{bytes\_per\_element}$$

For Llama 2 70B ($L=80$, $n_h=8$ KV heads with GQA, $d_h=128$) at 128K context in fp16:

$$2 \times 80 \times 8 \times 128 \times 131072 \times 2 = 34.4 \text{ GB}$$

This means the KV cache alone can exceed the model weights in memory for long sequences, making KV cache management the primary memory bottleneck for long-context inference.

### Grouped-Query Attention for KV Cache Reduction

As discussed in companion articles, GQA reduces the number of KV heads. Llama 2 70B uses 8 KV heads instead of 64, achieving an 8x reduction in KV cache size. This was the primary motivation for adopting GQA — the quality impact is minimal, but the inference memory savings are substantial.

### Multi-Query Attention (MQA)

The extreme case of GQA is MQA (**Shazeer, 2019**), where all query heads share a single key and single value head. While this maximally reduces KV cache size, it can degrade quality, especially for tasks requiring fine-grained attention patterns. GQA provides a tunable middle ground.

## PagedAttention and vLLM

**Kwon et al. (2023)** introduced PagedAttention in the vLLM system, which revolutionized KV cache management by borrowing ideas from operating system virtual memory.

### The Fragmentation Problem

Naive KV cache management pre-allocates a contiguous block of GPU memory for each request's maximum possible sequence length. This leads to severe memory fragmentation:

- A request might use only 500 of 2048 allocated token slots, wasting 75% of memory.
- Different requests have different lengths, creating external fragmentation.
- Memory utilization typically runs at 20-40% in naive systems.

### PagedAttention Solution

PagedAttention divides the KV cache into fixed-size **pages** (blocks of token slots, typically 16 tokens per block). Pages are allocated on demand as the sequence grows, similar to how OS virtual memory maps logical pages to physical frames:

```python
class PagedKVCache:
    """Simplified PagedAttention KV cache manager."""
    def __init__(self, num_layers, num_heads, head_dim, block_size=16):
        self.block_size = block_size
        self.free_blocks = list(range(MAX_BLOCKS))
        # block_table[request_id] = list of block indices
        self.block_tables = {}

    def allocate_block(self, request_id):
        block_idx = self.free_blocks.pop()
        if request_id not in self.block_tables:
            self.block_tables[request_id] = []
        self.block_tables[request_id].append(block_idx)
        return block_idx

    def free_request(self, request_id):
        blocks = self.block_tables.pop(request_id)
        self.free_blocks.extend(blocks)
```

This approach achieves near-100% memory utilization and enables:

- **Memory sharing**: multiple sequences with shared prefixes (e.g., the same system prompt) can share KV cache pages via copy-on-write semantics.
- **Efficient beam search**: candidate beams share the common prefix and only allocate new pages for divergent tokens.
- **Dynamic allocation**: memory is used proportionally to actual sequence lengths, not worst-case allocations.

vLLM with PagedAttention achieves 2-4x higher throughput than naive serving implementations, primarily by fitting more concurrent requests into GPU memory.

## Quantization

Quantization reduces the numerical precision of model weights and/or activations, decreasing memory usage and often improving throughput. The challenge is maintaining quality while reducing precision.

### Weight-Only Quantization

The most common approach quantizes only the model weights, keeping activations in higher precision (fp16 or bf16). Since decode is memory-bandwidth-bound, reducing weight size directly increases throughput.

#### GPTQ

**Frantar et al. (2023)** introduced GPTQ, a one-shot post-training quantization method based on approximate second-order information:

1. Process layers sequentially, quantizing one layer at a time.
2. For each layer, use a calibration dataset to compute the Hessian (second-order gradient information).
3. Quantize weights to minimize the layer's output error, using the Hessian to optimally adjust remaining weights to compensate for quantization error.

GPTQ achieves 4-bit quantization with minimal quality loss for most models, reducing memory by 4x compared to fp16.

#### AWQ (Activation-Aware Weight Quantization)

**Lin et al. (2023)** observed that not all weights are equally important — weights corresponding to large-magnitude activations have outsized impact on quality. AWQ scales weights by the activation magnitude before quantization:

```python
def awq_quantize(weight, activation_scale, group_size=128):
    """Simplified AWQ quantization."""
    # Scale weights by activation importance
    scaled_weight = weight * activation_scale.unsqueeze(0)

    # Group quantization: quantize in groups of `group_size` columns
    for i in range(0, weight.shape[1], group_size):
        group = scaled_weight[:, i:i+group_size]
        scale = group.abs().max() / 7  # for 4-bit: range [-8, 7]
        quantized = torch.round(group / scale).clamp(-8, 7)
        # Store scale factor and quantized weights
```

AWQ typically outperforms GPTQ at the same bit width and is faster to apply (no Hessian computation needed).

#### GGUF and llama.cpp Quantization

The GGUF format (used by llama.cpp) provides a range of quantization schemes optimized for CPU inference:

- **Q4_0**: 4-bit quantization with 32-element blocks, simple round-to-nearest
- **Q4_K_M**: 4-bit with k-quant optimization, using 256-element superblocks with 6-bit scales
- **Q5_K_M**: 5-bit with k-quant, slightly better quality
- **Q8_0**: 8-bit, near-lossless

The k-quant methods (**Gerganov, 2023**) use a nested quantization structure where scale factors themselves are quantized, achieving better precision per bit than flat quantization.

### Quantization Quality Impact

The quality impact of quantization depends on model size. Larger models are more robust to quantization:

| Model Size | 8-bit Impact | 4-bit Impact | 3-bit Impact |
|-----------|-------------|-------------|-------------|
| 7B | Negligible | Minor (~1-2% degradation) | Significant |
| 13B | Negligible | Minimal (<1%) | Moderate |
| 70B | Negligible | Negligible | Minor |

This pattern holds because larger models have more redundancy — the same information is distributed across more parameters, providing resilience to individual weight perturbation.

### Activation Quantization

Quantizing activations (in addition to weights) is more challenging because activation distributions have outliers — a small number of channels with very large values that make uniform quantization lossy.

**Dettmers et al. (2022)** with LLM.int8() showed that mixed-precision decomposition works: perform most matrix multiplications in int8 but identify and handle outlier channels (those with values > 6) in fp16. This adds overhead but enables int8 inference with negligible quality loss.

**SmoothQuant** (**Xiao et al., 2023**) takes a different approach: mathematically migrate the quantization difficulty from activations to weights by applying a per-channel scaling factor. Since weights are static, they can tolerate more aggressive quantization than dynamic activations.

## Speculative Decoding

**Leviathan et al. (2023)** and **Chen et al. (2023)** independently proposed speculative decoding, which accelerates autoregressive generation by using a small, fast **draft model** to propose multiple tokens that are then verified in parallel by the large **target model**.

### Algorithm

```python
def speculative_decode(target_model, draft_model, prompt, gamma=5):
    """Generate tokens using speculative decoding."""
    tokens = list(prompt)

    while not done:
        # Step 1: Draft model generates gamma candidate tokens
        draft_tokens = []
        draft_probs = []
        for _ in range(gamma):
            p = draft_model.predict(tokens + draft_tokens)
            t = sample(p)
            draft_tokens.append(t)
            draft_probs.append(p)

        # Step 2: Target model scores ALL gamma+1 positions in one forward pass
        target_probs = target_model.predict_batch(
            tokens + draft_tokens  # single forward pass for gamma+1 tokens
        )

        # Step 3: Accept/reject each draft token
        accepted = 0
        for i in range(gamma):
            # Accept with probability min(1, target_prob / draft_prob)
            ratio = target_probs[i][draft_tokens[i]] / draft_probs[i][draft_tokens[i]]
            if random.random() < min(1, ratio):
                tokens.append(draft_tokens[i])
                accepted += 1
            else:
                # Reject: sample from adjusted distribution
                adjusted = max(0, target_probs[i] - draft_probs[i])
                adjusted = adjusted / adjusted.sum()
                tokens.append(sample(adjusted))
                break

        # If all accepted, sample one more from target
        if accepted == gamma:
            tokens.append(sample(target_probs[gamma]))

    return tokens
```

### Key Properties

The acceptance-rejection scheme guarantees that the output distribution is **exactly** the same as the target model's distribution — speculative decoding introduces zero quality degradation. It is purely a latency optimization.

The speedup depends on the acceptance rate, which depends on how well the draft model approximates the target model. In practice:

- **Self-speculative decoding** (using earlier layers of the same model as the draft) achieves 1.3-1.5x speedup.
- **Dedicated draft models** (e.g., Llama 7B drafting for Llama 70B) achieve 2-3x speedup.
- **Medusa** (**Cai et al., 2024**) adds multiple prediction heads to the target model itself, avoiding the need for a separate draft model.

## Continuous Batching

Traditional static batching waits until a batch of requests is assembled, processes them all together, and returns results. This is wasteful because different requests have different generation lengths — short requests finish early but must wait for long requests in the same batch.

**Yu et al. (2022)** at Orca introduced **continuous batching** (also called iteration-level scheduling): the serving system manages a pool of in-progress requests and, at each iteration, processes all active requests together. When a request finishes, a new request can immediately take its slot.

```python
class ContinuousBatchScheduler:
    """Simplified continuous batching scheduler."""
    def __init__(self, model, max_batch_size):
        self.model = model
        self.max_batch_size = max_batch_size
        self.active_requests = []
        self.waiting_queue = []

    def step(self):
        # Fill batch with new requests if space available
        while (len(self.active_requests) < self.max_batch_size
               and self.waiting_queue):
            req = self.waiting_queue.pop(0)
            self.prefill(req)
            self.active_requests.append(req)

        if not self.active_requests:
            return

        # Run one decode step for all active requests
        next_tokens = self.model.decode_batch(
            [req.current_tokens for req in self.active_requests],
            [req.kv_cache for req in self.active_requests]
        )

        # Process results
        finished = []
        for req, token in zip(self.active_requests, next_tokens):
            req.append_token(token)
            if req.is_done():
                finished.append(req)

        for req in finished:
            self.active_requests.remove(req)
            req.complete()
```

Continuous batching increases GPU utilization from typically 30-50% to 70-90%+ and is now standard in all production serving systems (vLLM, TGI, TensorRT-LLM).

### Chunked Prefill

A refinement of continuous batching is **chunked prefill**: instead of processing the entire prompt of a new request in one step (which can cause latency spikes for long prompts), the prefill is split into chunks interleaved with decode steps for existing requests. This smooths latency at the cost of slightly slower prefill.

## Flash Attention for Inference

**Dao et al. (2022)** designed Flash Attention primarily for training, but it is equally important for inference:

- **Prefill phase**: Flash Attention reduces memory usage from $O(n^2)$ to $O(n)$ and provides 2-4x speedup, directly enabling longer context lengths.
- **Decode phase**: Flash Decoding (**Dao et al., 2023**) optimizes the decode-specific pattern of attending a single query to many KV pairs, parallelizing across the KV sequence length dimension rather than the batch dimension.

```python
# Flash Attention conceptual workflow (actual implementation is CUDA)
# Key insight: tile the attention computation to fit in SRAM

# Instead of:
#   S = Q @ K.T          # n x n matrix in HBM (expensive)
#   P = softmax(S)       # n x n matrix in HBM
#   O = P @ V            # read n x n from HBM

# Flash Attention:
#   For each tile of Q (fits in SRAM):
#     For each tile of K, V (fits in SRAM):
#       Compute local attention (in SRAM)
#       Update running softmax statistics (online softmax)
#       Accumulate output (in SRAM)
#     Write final output tile to HBM
# Total HBM reads/writes: O(n * d) instead of O(n^2)
```

## Tensor Parallelism for Inference

For models too large to fit on a single GPU, tensor parallelism (TP) splits individual operations across multiple GPUs. Unlike pipeline parallelism (which splits by layers), TP splits the weight matrices within each layer:

### Column-Parallel and Row-Parallel Linear Layers

```python
# Column-parallel: split the weight matrix by columns
# GPU 0 gets W[:, :d//2], GPU 1 gets W[:, d//2:]
# Each GPU computes a partial output, which are concatenated

# Row-parallel: split the weight matrix by rows
# GPU 0 gets W[:d//2, :], GPU 1 gets W[d//2:, :]
# Each GPU computes a partial output, which are summed (all-reduce)
```

For the attention layer, Q/K/V projections are column-parallel (split heads across GPUs), and the output projection is row-parallel. For FFN, the first linear layer is column-parallel and the second is row-parallel. This arrangement minimizes communication: only two all-reduce operations per transformer layer.

### Communication Overhead

The all-reduce operations add latency proportional to the message size divided by the inter-GPU bandwidth. On NVLink (900 GB/s on H100), the overhead is modest. On PCIe (64 GB/s), it can dominate inference time, making TP across PCIe-connected GPUs inadvisable for latency-sensitive applications.

## Serving System Architecture

A production LLM serving system combines all these techniques:

```
Request Queue
    │
    ▼
┌──────────────┐
│  Scheduler   │ ── Continuous batching + chunked prefill
│  (vLLM/TGI)  │
└──────────────┘
    │
    ▼
┌──────────────┐
│  KV Cache    │ ── PagedAttention, GQA/MQA
│  Manager     │
└──────────────┘
    │
    ▼
┌──────────────┐
│  Model       │ ── Quantized weights (AWQ/GPTQ)
│  Engine      │ ── Flash Attention
│              │ ── Tensor Parallelism
│              │ ── (Optional) Speculative decoding
└──────────────┘
    │
    ▼
Response Stream (token-by-token via SSE)
```

### Key Performance Metrics

- **Time to First Token (TTFT)**: latency from request arrival to first generated token. Dominated by prefill time.
- **Time Between Tokens (TBT)**: latency between successive generated tokens. Dominated by decode speed.
- **Throughput**: total tokens generated per second across all requests. Maximized by large batch sizes and high GPU utilization.
- **Tokens per Dollar**: the economic metric that ultimately matters, combining hardware cost with throughput.

## Summary and Key Takeaways

- LLM inference has two phases: **prefill** (compute-bound, parallelizable) and **decode** (memory-bandwidth-bound, sequential). Most optimization effort targets the decode bottleneck.
- **KV cache** management is the primary memory bottleneck for long-context inference. **PagedAttention** (vLLM) achieves near-optimal memory utilization through OS-inspired virtual memory management.
- **Quantization** reduces memory and bandwidth requirements. **4-bit weight quantization** (GPTQ, AWQ) provides ~4x memory reduction with minimal quality loss for models above 13B parameters. **GGUF** format enables efficient CPU inference.
- **Speculative decoding** uses a small draft model to propose tokens verified by the target model, achieving 2-3x speedup with mathematically guaranteed identical output distribution.
- **Continuous batching** maximizes GPU utilization by processing requests at iteration granularity rather than batch granularity.
- **Flash Attention** reduces memory from $O(n^2)$ to $O(n)$ without approximation, enabling longer contexts and faster prefill.
- **Tensor parallelism** distributes single-layer computation across GPUs, enabling inference on models too large for single GPUs, but requires high-bandwidth interconnects (NVLink) to be latency-efficient.
- Production serving systems (vLLM, TGI, TensorRT-LLM) combine all these techniques. Understanding their interactions is essential for optimizing the cost-performance tradeoff of deployed LLM systems.

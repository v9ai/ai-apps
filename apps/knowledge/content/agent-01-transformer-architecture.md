# Transformer Architecture: Attention, Positional Encoding & Scale

The transformer architecture, introduced by **Vaswani et al. (2017)** in "Attention Is All You Need," has become the foundational building block of modern large language models. This article traces the mechanics of self-attention from first principles through multi-head attention, examines the evolving landscape of positional encoding schemes, and explores how architectural choices interact with scale. Understanding these fundamentals is essential for anyone building, fine-tuning, or deploying transformer-based systems in production.

## The Self-Attention Mechanism

Self-attention is the core operation that distinguishes transformers from prior sequence models like RNNs and LSTMs. Rather than processing tokens sequentially, self-attention allows every token in a sequence to attend to every other token in a single parallel operation. This eliminates the sequential bottleneck that limited recurrent models and enables transformers to capture long-range dependencies directly.

### Queries, Keys, and Values

The self-attention mechanism operates through three learned linear projections of the input embeddings. For an input sequence of token embeddings $X \in \mathbb{R}^{n \times d}$, we compute:

- **Queries** $Q = XW_Q$ — what each token is "looking for"
- **Keys** $K = XW_K$ — what each token "advertises" about itself
- **Values** $V = XW_V$ — the actual content each token contributes

The attention output is then:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

The scaling factor $\sqrt{d_k}$ is critical. Without it, for large $d_k$, the dot products grow large in magnitude, pushing the softmax into regions with extremely small gradients. **Vaswani et al. (2017)** found this scaling essential for stable training.

```python
import torch
import torch.nn.functional as F

def scaled_dot_product_attention(Q, K, V, mask=None):
    d_k = Q.size(-1)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / (d_k ** 0.5)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float('-inf'))
    weights = F.softmax(scores, dim=-1)
    return torch.matmul(weights, V), weights
```

The attention matrix $QK^T$ has shape $n \times n$, making self-attention $O(n^2)$ in both time and memory with respect to sequence length. This quadratic cost is the fundamental bottleneck that drives much of the research into efficient attention variants.

### Causal Masking

For autoregressive language modeling (the decoder-only paradigm used by GPT, Claude, and Llama), a causal mask prevents tokens from attending to future positions. This mask sets the upper triangle of the attention matrix to $-\infty$ before the softmax, ensuring that the prediction for position $t$ depends only on positions $\leq t$.

## Multi-Head Attention

Rather than computing a single attention function, transformers use **multi-head attention** to allow the model to jointly attend to information from different representation subspaces at different positions.

The model splits the $d_{model}$-dimensional space into $h$ heads, each with dimension $d_k = d_{model} / h$. Each head computes attention independently, and the results are concatenated and linearly projected:

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h)W_O$$

where $\text{head}_i = \text{Attention}(QW_Q^i, KW_K^i, VW_V^i)$.

This design is remarkably efficient: the total computation cost is similar to single-head attention with full dimensionality, since each head operates on a reduced dimension. Empirically, different heads learn to attend to different types of relationships — syntactic dependencies, co-reference, semantic similarity — as demonstrated by **Clark et al. (2019)** in their analysis of BERT's attention patterns, though the specific patterns vary across layers and training runs.

```python
class MultiHeadAttention(torch.nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        assert d_model % n_heads == 0
        self.d_k = d_model // n_heads
        self.n_heads = n_heads
        self.W_q = torch.nn.Linear(d_model, d_model)
        self.W_k = torch.nn.Linear(d_model, d_model)
        self.W_v = torch.nn.Linear(d_model, d_model)
        self.W_o = torch.nn.Linear(d_model, d_model)

    def forward(self, x, mask=None):
        B, L, D = x.shape
        Q = self.W_q(x).view(B, L, self.n_heads, self.d_k).transpose(1, 2)
        K = self.W_k(x).view(B, L, self.n_heads, self.d_k).transpose(1, 2)
        V = self.W_v(x).view(B, L, self.n_heads, self.d_k).transpose(1, 2)

        attn_out, _ = scaled_dot_product_attention(Q, K, V, mask)
        attn_out = attn_out.transpose(1, 2).contiguous().view(B, L, D)
        return self.W_o(attn_out)
```

### Grouped-Query Attention (GQA)

**Ainslie et al. (2023)** introduced Grouped-Query Attention as a practical middle ground between multi-head attention (MHA) and multi-query attention (MQA). In GQA, the query heads are divided into groups, and each group shares a single key and value head. Llama 2 70B and many subsequent models use GQA because it dramatically reduces KV cache size during inference while retaining most of the quality of full MHA. This has become a standard choice for models intended for efficient deployment.

## Positional Encoding Schemes

Transformers are permutation-equivariant by construction — without positional information, the self-attention mechanism treats the input as a set rather than a sequence. Positional encodings inject order information so the model can distinguish "the cat sat on the mat" from "the mat sat on the cat."

### Sinusoidal Positional Encoding

The original transformer used fixed sinusoidal functions at different frequencies:

$$PE_{(pos, 2i)} = \sin(pos / 10000^{2i/d_{model}})$$
$$PE_{(pos, 2i+1)} = \cos(pos / 10000^{2i/d_{model}})$$

These encodings are added directly to the input embeddings. **Vaswani et al. (2017)** chose this scheme because the relative position between two tokens could be represented as a linear function of their positional encodings, theoretically allowing the model to learn relative positional relationships. In practice, learned positional embeddings performed comparably, and most models before 2022 — including GPT-2 (**Radford et al., 2019**) and BERT (**Devlin et al., 2019**) — used learned absolute positional embeddings.

The critical limitation of absolute positional encodings — whether sinusoidal or learned — is that they fix a maximum sequence length at training time. A model trained with 2048 positional embeddings cannot generalize to position 2049.

### Rotary Position Embedding (RoPE)

**Su et al. (2021)** introduced Rotary Position Embedding, which encodes position by rotating the query and key vectors in the complex plane. RoPE applies a rotation matrix $R_\theta^{(m)}$ to the query and key at position $m$:

$$f_q(x_m, m) = R_\theta^{(m)} W_q x_m$$

The key insight is that the dot product between a rotated query at position $m$ and a rotated key at position $n$ depends only on the relative position $m - n$, making RoPE an implicit relative positional encoding.

```python
def apply_rope(x, freqs_cis):
    """Apply rotary embeddings to query/key tensors."""
    x_complex = torch.view_as_complex(x.float().reshape(*x.shape[:-1], -1, 2))
    x_rotated = x_complex * freqs_cis
    return torch.view_as_real(x_rotated).flatten(-2).type_as(x)

def precompute_freqs_cis(dim, max_seq_len, theta=10000.0):
    freqs = 1.0 / (theta ** (torch.arange(0, dim, 2).float() / dim))
    t = torch.arange(max_seq_len)
    freqs = torch.outer(t, freqs)
    return torch.polar(torch.ones_like(freqs), freqs)
```

RoPE has become the dominant positional encoding for open-source LLMs. Llama, Mistral, Qwen, and many others use it. A significant practical advantage is that RoPE can be extended beyond the training context length through **NTK-aware scaling** and **YaRN** (**Peng et al., 2023**), which modify the rotation frequencies to interpolate or extrapolate to longer sequences.

### ALiBi: Attention with Linear Biases

**Press et al. (2022)** proposed ALiBi as a radically simpler approach: instead of modifying embeddings, ALiBi adds a static, linear bias to the attention scores based on the distance between query and key positions. Each head $h$ adds a penalty $-m_h \cdot |i - j|$ to the attention score between positions $i$ and $j$, where $m_h$ is a head-specific slope set geometrically.

ALiBi requires no learned parameters for position and demonstrates strong length extrapolation — models trained on short sequences can generalize to much longer ones at inference time. The BLOOM model (BigScience, 2022) and MPT (MosaicML, 2023) use ALiBi. However, subsequent empirical comparisons — including the LongRoPE study (**Ding et al., 2024**) — have found that RoPE with appropriate scaling tends to outperform ALiBi on long-context tasks when both are properly tuned.

## The Transformer Block

A complete transformer block combines multi-head attention with a position-wise feed-forward network (FFN), layer normalization, and residual connections.

### Feed-Forward Network

The FFN applies two linear transformations with a nonlinearity:

$$\text{FFN}(x) = W_2 \cdot \sigma(W_1 x + b_1) + b_2$$

In the original transformer, $\sigma$ was ReLU. Modern LLMs almost universally use **SwiGLU** (**Shazeer, 2020**), which replaces the single linear layer and ReLU with a gated linear unit using the Swish activation:

$$\text{SwiGLU}(x) = \text{Swish}(xW_1) \otimes xW_2$$

SwiGLU consistently improves quality at the same parameter count, though it adds a third weight matrix, so the hidden dimension is typically reduced from $4d_{model}$ to $\frac{8}{3}d_{model}$ to keep the parameter count constant.

### Layer Normalization Placement

The original transformer placed LayerNorm after the residual connection (**Post-Norm**). Modern LLMs universally use **Pre-Norm** — applying LayerNorm before the attention and FFN sublayers — because it stabilizes training for deep models. **Xiong et al. (2020)** showed that Pre-Norm enables training without careful learning rate warmup, which is crucial for the very deep (32-80+ layer) models used today.

Some architectures use **RMSNorm** (**Zhang and Sennrich, 2019**) instead of LayerNorm, which removes the mean-centering step and is computationally simpler. Llama popularized this choice, and it has become standard in the open-source ecosystem.

### Putting It Together: A Complete Transformer Block

The following implementation assembles the components discussed above — Pre-Norm with RMSNorm, multi-head attention, and a SwiGLU feed-forward network — into a single decoder block:

```python
class RMSNorm(torch.nn.Module):
    def __init__(self, d_model, eps=1e-6):
        super().__init__()
        self.weight = torch.nn.Parameter(torch.ones(d_model))
        self.eps = eps

    def forward(self, x):
        norm = x.float().pow(2).mean(-1, keepdim=True).add(self.eps).rsqrt()
        return (x * norm).type_as(x) * self.weight

class SwiGLUFFN(torch.nn.Module):
    def __init__(self, d_model, hidden_dim=None):
        super().__init__()
        hidden_dim = hidden_dim or int(8 * d_model / 3)
        self.w1 = torch.nn.Linear(d_model, hidden_dim, bias=False)
        self.w2 = torch.nn.Linear(hidden_dim, d_model, bias=False)
        self.w3 = torch.nn.Linear(d_model, hidden_dim, bias=False)  # gate

    def forward(self, x):
        return self.w2(F.silu(self.w1(x)) * self.w3(x))

class TransformerBlock(torch.nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        self.attn_norm = RMSNorm(d_model)
        self.attn = MultiHeadAttention(d_model, n_heads)
        self.ffn_norm = RMSNorm(d_model)
        self.ffn = SwiGLUFFN(d_model)

    def forward(self, x, mask=None):
        x = x + self.attn(self.attn_norm(x), mask)   # Pre-Norm + residual
        x = x + self.ffn(self.ffn_norm(x))            # Pre-Norm + residual
        return x
```

This pattern — normalize, transform, add residual — is the building block that gets stacked 32-80+ times to form a full LLM.

## Encoder-Decoder vs. Decoder-Only

The original transformer was an encoder-decoder architecture designed for sequence-to-sequence tasks like machine translation. The encoder processes the input with bidirectional self-attention, and the decoder generates the output autoregressively with cross-attention to the encoder's representations.

### The Decoder-Only Shift

Starting with GPT (**Radford et al., 2018**), the field progressively moved toward decoder-only architectures. The reasons are both principled and practical:

1. **Simplicity**: A single stack of decoder layers is simpler to implement, optimize, and scale than a coupled encoder-decoder.
2. **Unified pre-training**: Causal language modeling (predicting the next token) is a natural unsupervised objective for decoder-only models, requiring no task-specific architecture changes.
3. **In-context learning**: Decoder-only models naturally support few-shot prompting by concatenating examples into the context, which emerged as a powerful capability at scale (**Brown et al., 2020**).
4. **Scaling results**: Empirically, decoder-only models have shown stronger scaling behavior for general-purpose language tasks.

T5 (**Raffel et al., 2020**) remains the most prominent encoder-decoder LLM, and encoder-decoder architectures persist in specialized domains (speech, translation). But GPT-4, Claude, Llama, Gemini, and Mistral are all decoder-only.

### Prefix Language Models

An intermediate approach, the **prefix LM**, uses a decoder-only architecture but applies bidirectional attention to a prefix portion of the input and causal attention to the remainder. **Tay et al. (2022)** in the UL2 paper showed that this can combine some benefits of both paradigms within a unified architecture.

## How Transformers Scale

The scaling behavior of transformers is one of the most consequential empirical findings in modern AI. Understanding how performance relates to model size, data, and compute is essential for making resource-allocation decisions.

### Parameter Scaling

A standard transformer's parameter count is dominated by:

- **Attention projections**: $4 \times d_{model}^2$ per layer (Q, K, V, O matrices)
- **FFN weights**: $8 \times d_{model}^2$ per layer (with SwiGLU, $\frac{8}{3} \times 2 \times d_{model}^2$ plus the gate)
- **Embeddings**: $V \times d_{model}$ (vocabulary size times hidden dimension)

For a model with $L$ layers and hidden dimension $d$, total parameters scale approximately as $12Ld^2 + Vd$ — a formula derived directly from summing the attention ($4d^2$) and FFN ($8d^2$) parameter counts per layer. The common "7B" model size (e.g., Llama 2 7B, as described by **Touvron et al., 2023**) uses $L=32$, $d=4096$, $V=32000$.

### Depth vs. Width

A deep, narrow model and a shallow, wide model can have the same parameter count but behave very differently. **Levine et al. (2020)** provided theoretical arguments that depth is more important than width for modeling hierarchical structure in language. Empirically, models that are too shallow for their parameter count (e.g., only 8 layers with a very large hidden dimension) tend to underperform, especially on tasks requiring multi-step reasoning.

However, very deep models face training stability challenges — gradient flow through 100+ layers requires careful initialization, normalization, and sometimes architectural modifications like **parallel attention** (computing attention and FFN in parallel rather than sequentially), used in PaLM (**Chowdhery et al., 2022**) and later models.

### Compute-Optimal Architecture

The transformer's $O(n^2 d)$ attention cost and $O(n d^2)$ FFN cost create a balance point between context length and model width. For fixed compute, increasing context length requires reducing model size or batch size. The interplay between these dimensions is a core consideration in architecture design, which the scaling laws literature (covered in a companion article) addresses quantitatively.

## Flash Attention and Hardware-Aware Design

**Dao et al. (2022)** introduced Flash Attention, which reformulates the attention computation to avoid materializing the full $n \times n$ attention matrix in GPU high-bandwidth memory (HBM). Instead, it uses tiling and recomputation to keep the working set in fast SRAM, reducing memory usage from $O(n^2)$ to $O(n)$ and achieving 2-4x wall-clock speedups.

Flash Attention is not an approximation — it computes exact attention. Its insight is purely about the memory hierarchy of modern GPUs: the arithmetic is cheap, but moving data between SRAM and HBM is expensive. This observation, that transformer optimization is increasingly about hardware-aware algorithm design rather than mathematical reformulation, has become a dominant theme in the field.

**Flash Attention 2** (**Dao, 2023**) further improved throughput by optimizing the parallelism and work partitioning across GPU thread blocks, achieving close to the theoretical maximum FLOPs utilization on modern hardware.

## Summary and Key Takeaways

- **Self-attention** enables each token to attend to all others in parallel, with $O(n^2)$ cost in sequence length. The scaled dot-product formulation with queries, keys, and values remains the standard.
- **Multi-head attention** partitions the representation space into independently attending heads. **Grouped-Query Attention** reduces KV cache costs by sharing key-value heads across query head groups.
- **Positional encoding** has evolved from sinusoidal (fixed, non-extrapolating) through learned embeddings to **RoPE** (rotary, extrapolatable with modifications) and **ALiBi** (linear bias, strong extrapolation). RoPE dominates current practice.
- **Decoder-only** architectures have won for general-purpose LLMs due to simplicity, scaling properties, and natural support for in-context learning.
- Modern transformer blocks use **Pre-Norm** (usually RMSNorm), **SwiGLU** activation, and often **parallel attention-FFN** computation for stability at scale.
- **Flash Attention** demonstrates that hardware-aware algorithm design can yield large practical speedups without approximation, and has become standard infrastructure for transformer training and inference.
- Understanding these architectural primitives is essential for making informed decisions about model selection, fine-tuning strategy, and deployment optimization.

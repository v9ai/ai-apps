# LLM Architectures Compared: GPT, Claude, Llama, Gemini, Mistral

The landscape of large language model architectures has diversified significantly since GPT-3 demonstrated that scaling decoder-only transformers yields powerful general-purpose language systems. While the decoder-only transformer remains the dominant paradigm, each major model family introduces architectural innovations — from Mixture-of-Experts routing in Mixtral to grouped-query attention in Llama 2 to multimodal fusion in Gemini. This article provides a detailed comparative analysis of the architectural choices across leading LLM families, examining why specific design decisions were made and their implications for capability, efficiency, and deployment.

## The Decoder-Only Consensus

Before comparing individual architectures, it is worth noting the remarkable convergence. Every major frontier LLM as of 2025 — GPT-4, Claude, Llama 3, Gemini, Mistral, Qwen, DeepSeek — uses a decoder-only transformer architecture with causal (left-to-right) attention masking. This convergence was not inevitable; T5 (**Raffel et al., 2020**) showed competitive results with encoder-decoder architectures, and models like UL2 (**Tay et al., 2022**) explored hybrid approaches.

The decoder-only design won for several reinforcing reasons:

1. **Simplicity of the pre-training objective**: next-token prediction requires no architectural modifications and scales naturally.
2. **Unified handling of input and output**: no need for separate encoder and decoder stacks, simplifying both training and serving infrastructure.
3. **Flexible prompting**: the same architecture naturally supports zero-shot, few-shot, and instruction-following via prompt formatting.
4. **Empirical scaling**: decoder-only models showed stronger scaling behavior on general benchmarks (**Wang et al., 2022**).

Within this consensus, however, significant architectural variation exists in the details.

## GPT Architecture Family

### GPT-3 and the Foundation

**Brown et al. (2020)** established the GPT-3 architecture as a straightforward scaled-up transformer decoder:

- 96 layers, $d_{model} = 12288$, 96 attention heads
- 175 billion parameters
- Learned absolute positional embeddings (max 2048 tokens)
- Standard Pre-Norm with LayerNorm
- GELU activation in FFN
- Alternating dense and locally banded sparse attention layers

GPT-3's architecture was deliberately conservative — the innovation was scale, not architecture. The alternating sparse attention (using banded patterns every other layer) was one of few deviations from the vanilla transformer.

### GPT-4 and Beyond

While OpenAI has not published full architectural details for GPT-4, substantial evidence from **reverse engineering efforts** and **leaked information** (confirmed by media reports) suggests GPT-4 uses a **Mixture-of-Experts** architecture:

- 8 expert modules per MoE layer, with top-2 routing
- Approximately 220B active parameters per forward pass out of ~1.8T total parameters
- 128K context window
- Multimodal (vision) capability through an adapter-based approach

The MoE design allows GPT-4 to have a very large total parameter count (capturing more knowledge) while keeping the per-token compute cost manageable — only 2 of 8 experts are active for any given token.

## Claude Architecture

Anthropic has published limited architectural details about Claude models. What is publicly known:

- **Decoder-only transformer** with proprietary architectural modifications
- **Constitutional AI** training methodology (**Bai et al., 2022**) shapes behavior but operates primarily at the training level rather than the architectural level
- **200K token context window** in Claude 3 family, suggesting innovations in positional encoding and attention efficiency
- **Multimodal** (vision) capabilities in Claude 3 and later versions

Anthropic's research publications emphasize interpretability (**Elhage et al., 2022**; **Bills et al., 2023**) and alignment methodology over architectural novelty, suggesting that Claude's advantages come primarily from training methodology and data rather than novel architecture.

## Llama Architecture Family

Meta's Llama family is the most thoroughly documented major LLM architecture, with full technical reports and open weights enabling detailed analysis.

### Llama 1 (2023)

**Touvron et al. (2023a)** introduced several architectural modifications that have since become standard in the open-source ecosystem:

- **RMSNorm** instead of LayerNorm: removes the mean-centering step, reducing computation with no quality loss (**Zhang and Sennrich, 2019**).
- **SwiGLU activation** (**Shazeer, 2020**): replaces the standard two-layer FFN with a gated variant using the Swish function, improving quality at matched parameter count.
- **Rotary Position Embedding (RoPE)** (**Su et al., 2021**): enables relative positional information through rotation of query and key vectors, with better length extrapolation than learned absolute embeddings.
- **Pre-normalization**: applying RMSNorm before each sublayer rather than after.

```python
class LlamaBlock(torch.nn.Module):
    """Simplified Llama transformer block."""
    def __init__(self, config):
        super().__init__()
        self.attention_norm = RMSNorm(config.dim)
        self.ffn_norm = RMSNorm(config.dim)
        self.attention = MultiHeadAttention(config)  # with RoPE
        self.ffn = SwiGLUFFN(config)

    def forward(self, x, freqs_cis, mask=None):
        # Pre-norm + residual for attention
        h = x + self.attention(self.attention_norm(x), freqs_cis, mask)
        # Pre-norm + residual for FFN
        out = h + self.ffn(self.ffn_norm(h))
        return out
```

The Llama 1 architecture was deliberately Chinchilla-optimal in its training data ratios: the 7B model was trained on 1T tokens and the 65B on 1.4T tokens.

### Llama 2 (2023)

**Touvron et al. (2023b)** made targeted improvements:

- **Grouped-Query Attention (GQA)** in the 34B and 70B models: instead of each attention head having its own key and value projections, heads are grouped and share KV projections. The 70B model uses 8 KV heads shared across 64 query heads. This reduces KV cache size by 8x with minimal quality impact.
- **Extended context**: 4096 tokens, up from 2048 in Llama 1.
- **More training data**: 2T tokens for all model sizes, significantly beyond Chinchilla-optimal for the smaller sizes (deliberate overtraining for inference efficiency).

```python
class GroupedQueryAttention(torch.nn.Module):
    def __init__(self, d_model, n_q_heads, n_kv_heads):
        super().__init__()
        self.n_q_heads = n_q_heads
        self.n_kv_heads = n_kv_heads
        self.n_groups = n_q_heads // n_kv_heads  # queries per KV head
        self.head_dim = d_model // n_q_heads

        self.W_q = torch.nn.Linear(d_model, n_q_heads * self.head_dim)
        self.W_k = torch.nn.Linear(d_model, n_kv_heads * self.head_dim)
        self.W_v = torch.nn.Linear(d_model, n_kv_heads * self.head_dim)
        self.W_o = torch.nn.Linear(d_model, d_model)

    def forward(self, x, freqs_cis, mask=None):
        B, L, _ = x.shape
        Q = self.W_q(x).view(B, L, self.n_q_heads, self.head_dim)
        K = self.W_k(x).view(B, L, self.n_kv_heads, self.head_dim)
        V = self.W_v(x).view(B, L, self.n_kv_heads, self.head_dim)

        # Expand KV heads to match query heads
        K = K.repeat_interleave(self.n_groups, dim=2)
        V = V.repeat_interleave(self.n_groups, dim=2)
        # ... standard attention computation
```

### Llama 3 (2024)

Llama 3 made further refinements:

- **128K vocabulary** (up from 32K), significantly improving multilingual and code tokenization efficiency.
- **8K default context** with 128K extended context via RoPE scaling.
- **15T training tokens** for the 8B model — extreme overtraining for inference efficiency.
- GQA used across all model sizes.

The Llama 3.1 405B model represents the largest open-weights dense model, trained on 15T+ tokens with extensive post-training (instruction tuning, RLHF, tool use training).

## Gemini Architecture

Google's Gemini family (**Gemini Team, 2024**) represents the most ambitious multimodal architecture:

### Native Multimodality

Unlike GPT-4 and Claude, which added vision capability through adapter modules, Gemini was designed from the ground up as a multimodal model:

- **Interleaved multimodal training**: text, images, audio, and video are processed in an interleaved fashion during pre-training, not added as a post-training capability.
- **Visual encoder**: likely based on a ViT-style architecture, producing visual tokens that are processed alongside text tokens by the main transformer.
- **Long context**: Gemini 1.5 Pro supports up to 1M tokens (later extended to 2M in experimental settings), enabled by a combination of architectural innovations.

### Mixture-of-Experts

Gemini 1.5 Pro uses a sparse Mixture-of-Experts architecture, which Google has deep experience with from the **Switch Transformer** (**Fedus et al., 2022**) and **GLaM** (**Du et al., 2022**) lineage. The MoE approach allows the model to scale total parameters (and thus knowledge capacity) while keeping the active parameter count — and therefore per-token inference cost — manageable.

### Long Context Innovations

The 1M+ token context window in Gemini 1.5 requires innovations beyond standard RoPE scaling:

- **Efficient attention patterns**: likely a combination of local and global attention, similar to approaches in **Longformer** (**Beltagy et al., 2020**) or the **Big Bird** architecture (**Zaheer et al., 2020**), both from Google.
- **RoPE modifications**: extended RoPE with potentially custom frequency schedules.
- **Ring attention**: distributing the attention computation across TPU pods using a ring topology (**Liu et al., 2023**).

## Mistral Architecture Family

Mistral AI has introduced several architectural innovations focused on inference efficiency.

### Mistral 7B

**Jiang et al. (2023)** introduced two key innovations:

#### Sliding Window Attention (SWA)

Instead of attending to all previous tokens, each attention layer attends to only a fixed window of $W$ tokens (4096 in Mistral 7B). Through stacking $L$ layers with window size $W$, the effective receptive field becomes $L \times W$, allowing information to propagate across the full sequence.

```python
def sliding_window_attention(Q, K, V, window_size):
    """Attention restricted to a local window."""
    seq_len = Q.size(-2)
    # Create sliding window mask
    mask = torch.ones(seq_len, seq_len, dtype=torch.bool)
    for i in range(seq_len):
        mask[i, max(0, i - window_size + 1):i + 1] = False
    mask = ~mask  # True where attention is allowed

    scores = torch.matmul(Q, K.transpose(-2, -1)) / (Q.size(-1) ** 0.5)
    scores.masked_fill_(~mask, float('-inf'))
    weights = F.softmax(scores, dim=-1)
    return torch.matmul(weights, V)
```

SWA reduces attention's memory and compute from $O(n^2)$ to $O(nW)$, making it linear in sequence length for fixed $W$.

#### Rolling Buffer KV Cache

With SWA, the KV cache needs to store only $W$ entries per layer rather than the full sequence, dramatically reducing memory usage during inference. This enables Mistral 7B to handle very long sequences with bounded memory.

### Mixtral 8x7B

**Jiang et al. (2024)** combined Mistral's architecture with Mixture-of-Experts:

- 8 expert FFN modules per layer, with top-2 routing
- Each expert is roughly 7B parameters; total model is ~47B parameters
- Active parameters per token: ~13B (one shared attention module + 2 expert FFNs)
- Same quality as Llama 2 70B with 5x lower inference cost

The routing mechanism uses a learned gating network:

```python
class MoELayer(torch.nn.Module):
    def __init__(self, config):
        super().__init__()
        self.experts = torch.nn.ModuleList([
            SwiGLUFFN(config) for _ in range(config.num_experts)
        ])
        self.gate = torch.nn.Linear(config.dim, config.num_experts, bias=False)
        self.top_k = config.top_k  # typically 2

    def forward(self, x):
        gate_logits = self.gate(x)  # (B, L, num_experts)
        weights, selected = torch.topk(gate_logits, self.top_k, dim=-1)
        weights = F.softmax(weights, dim=-1)

        output = torch.zeros_like(x)
        for i, expert in enumerate(self.experts):
            mask = (selected == i).any(dim=-1)
            if mask.any():
                expert_out = expert(x[mask])
                # Weight by gating score
                expert_weight = weights[mask][selected[mask] == i]
                output[mask] += expert_out * expert_weight.unsqueeze(-1)
        return output
```

### Load Balancing

A critical challenge with MoE is ensuring that tokens are distributed reasonably evenly across experts. If most tokens route to the same expert, the model degenerates to a dense model with wasted parameters. **Fedus et al. (2022)** introduced an auxiliary load-balancing loss:

$$\mathcal{L}_{balance} = \alpha \cdot N \sum_{i=1}^{N} f_i \cdot P_i$$

where $f_i$ is the fraction of tokens routed to expert $i$, $P_i$ is the average routing probability for expert $i$, and $\alpha$ is a small coefficient (typically 0.01).

## DeepSeek Architecture

**DeepSeek** has introduced notable architectural innovations, particularly in DeepSeek-V2 and V3:

### Multi-head Latent Attention (MLA)

DeepSeek-V2 (**DeepSeek-AI, 2024**) introduced MLA, which compresses the KV cache by projecting keys and values into a low-dimensional latent space before storing them. This achieves KV cache compression comparable to MQA while retaining the expressiveness of MHA:

- Keys and values are jointly compressed into a low-rank representation
- At attention time, the compressed representation is projected back to full key-value pairs
- This reduces KV cache size by 4-8x compared to standard MHA

### DeepSeekMoE

DeepSeek uses a fine-grained MoE architecture with many small experts rather than fewer large ones. DeepSeek-V2 uses 160 small experts with top-6 routing (rather than Mixtral's 8 experts with top-2), achieving better expert specialization and utilization.

## Architectural Comparison Table

| Feature | GPT-4 | Claude 3 | Llama 3 | Gemini 1.5 | Mixtral | DeepSeek-V3 |
|---------|-------|----------|---------|------------|---------|-------------|
| Architecture | Decoder-only | Decoder-only | Decoder-only | Decoder-only | Decoder-only | Decoder-only |
| MoE | Yes (rumored) | Unknown | No (dense) | Yes | Yes (8x) | Yes (fine-grained) |
| Pos. Encoding | Unknown | Unknown | RoPE | RoPE variant | RoPE | RoPE (YaRN) |
| Attention | Unknown | Unknown | GQA | Unknown | GQA + SWA | MLA |
| Normalization | Unknown | Unknown | RMSNorm | Unknown | RMSNorm | RMSNorm |
| Activation | Unknown | Unknown | SwiGLU | Unknown | SwiGLU | SwiGLU |
| Max Context | 128K | 200K | 128K | 1M-2M | 32K | 128K |
| Vocab Size | ~100K | ~100K | 128K | Unknown | 32K | 100K+ |

## Context Length Innovations

The race to longer context windows has driven significant architectural innovation:

### RoPE Scaling Methods

Several approaches extend RoPE beyond its training length:

- **Position interpolation** (**Chen et al., 2023**): divide position indices by a scaling factor, effectively interpolating between trained positions.
- **NTK-aware scaling**: modify the base frequency $\theta$ to redistribute information across frequency bands.
- **YaRN** (**Peng et al., 2023**): combines NTK scaling with an attention scaling factor, achieving strong extrapolation with minimal fine-tuning.

### Architectural Approaches

- **Ring Attention** (**Liu et al., 2023**): distributes the sequence across devices and computes attention in a ring topology, enabling sequences that exceed single-device memory.
- **Hierarchical attention**: combining local window attention with periodic global attention tokens.
- **Memory layers**: augmenting the transformer with explicit retrieval mechanisms for very long sequences.

## Training Methodology Differences

Architecture alone does not determine model capability. Training methodology varies significantly:

- **GPT-4**: rumored to use multi-stage training with code-heavy data mixtures and extensive RLHF.
- **Claude**: Constitutional AI (RLHF with AI feedback based on principles), emphasis on harmlessness and honesty.
- **Llama 3**: detailed training recipe published — pre-training on 15T tokens, then supervised fine-tuning, then rejection sampling and DPO.
- **Gemini**: multimodal pre-training from the start, with interleaved modality data.
- **Mixtral**: pre-training with expert load balancing, fine-tuning with expert-aware optimization.

## Summary and Key Takeaways

- All frontier LLMs use **decoder-only transformer** architectures, converging on this design for its simplicity and scaling properties.
- **Mixture-of-Experts** has emerged as the dominant approach for frontier models (GPT-4, Gemini, Mixtral, DeepSeek), offering more total parameters at lower per-token compute cost.
- **Grouped-Query Attention** (Llama 2+, Mistral) and **Multi-head Latent Attention** (DeepSeek) address the KV cache memory bottleneck during inference.
- **Sliding Window Attention** (Mistral) provides linear-cost attention for long sequences when combined with layer stacking.
- The **Llama architecture** (RMSNorm, SwiGLU, RoPE, GQA) has become the de facto standard for open-source models.
- **Context length** innovations (RoPE scaling, ring attention) have pushed from 2K to 1M+ tokens, but effective utilization of very long contexts remains an active research challenge.
- Architectural differences between frontier models are increasingly secondary to differences in **training data, training methodology, and post-training** (RLHF, instruction tuning, tool use training).
- For practitioners, understanding these architectural choices is essential for selecting the right model for a given deployment scenario: dense vs. MoE tradeoffs, context length requirements, and inference efficiency constraints.

# Scaling Laws: Chinchilla, Emergent Abilities & Compute-Optimal Training

Scaling laws have fundamentally reshaped how the AI industry allocates resources, trains models, and forecasts capabilities. The discovery that language model performance follows predictable power-law relationships with compute, data, and parameters — and the subsequent debate over what "optimal" scaling means — has driven multi-billion-dollar infrastructure decisions. This article examines the key scaling results from Kaplan through Chinchilla, the contested phenomenon of emergent abilities, and the practical implications for engineering teams making model sizing decisions today.

## The Kaplan Scaling Laws

**Kaplan et al. (2020)** at OpenAI published the first systematic study of neural scaling laws for language models. Training a series of transformer language models ranging from 768 parameters to 1.5 billion, they found that cross-entropy loss $L$ follows a power law in three variables:

$$L(N) \propto N^{-0.076}$$
$$L(D) \propto D^{-0.095}$$
$$L(C) \propto C^{-0.050}$$

where $N$ is the number of non-embedding parameters, $D$ is the dataset size in tokens, and $C$ is the compute budget in FLOPs.

### Key Claims

The Kaplan paper made several influential claims:

1. **Performance is a smooth power law** in each variable when the others are not bottlenecked. There are no sharp transitions or diminishing returns at the scales tested.
2. **Model size matters more than data size**: for a fixed compute budget, it is more efficient to train a larger model on less data than a smaller model on more data. Specifically, they recommended scaling parameters roughly as $N \propto C^{0.73}$ and data as $D \propto C^{0.27}$.
3. **Architectural details matter less than scale**: within the transformer family, variations in depth, width, and attention heads had modest effects compared to total parameter count.
4. **Training should be stopped early**: given fixed compute, it is better to train a large model for fewer steps than to train a smaller model to convergence.

This last point was particularly consequential. It led to the common practice (exemplified by GPT-3) of training very large models on relatively modest amounts of data — GPT-3's 175B parameters were trained on roughly 300B tokens, far from convergence.

## Chinchilla: Revising the Optimal Ratios

**Hoffmann et al. (2022)** at DeepMind challenged Kaplan's recommendations with the Chinchilla paper, "Training Compute-Optimal Large Language Models." By training over 400 models ranging from 70M to 16B parameters on 5B to 500B tokens, they derived substantially different optimal scaling ratios.

### The Chinchilla Result

Hoffmann et al. found that the compute-optimal number of parameters and tokens should scale equally with compute:

$$N_{opt} \propto C^{0.50}$$
$$D_{opt} \propto C^{0.50}$$

This means that for every doubling of model size, you should also double the training data. The practical implication was dramatic: most large models at the time were significantly undertrained relative to their parameter count.

To validate this, they trained **Chinchilla** — a 70B parameter model on 1.4 trillion tokens — and showed it outperformed the 280B parameter **Gopher** model that had been trained on only 300B tokens, despite using the same compute budget. The Chinchilla result meant that the field had been systematically overinvesting in parameters and underinvesting in data.

### Why Did Kaplan and Chinchilla Disagree?

The discrepancy between Kaplan and Chinchilla scaling ratios has been analyzed in detail. Several factors contributed:

- **Learning rate schedule**: Kaplan used a fixed learning rate schedule across all runs, while Chinchilla tuned the schedule per run. Since larger models benefit from longer warmup and different decay, Kaplan's setup may have disadvantaged larger models, making them appear less data-hungry.
- **Fit methodology**: The two papers used different parametric forms for the loss function and different fitting procedures. **Besiroglu et al. (2024)** showed that the choice of functional form significantly affects the inferred optimal ratios.
- **Scale range**: Chinchilla explored a broader range of data sizes relative to model sizes, covering more of the relevant parameter space.

The Chinchilla ratios have been broadly (though not universally) adopted. Llama 1 (**Touvron et al., 2023**) explicitly cited Chinchilla when training their 7B model on 1T tokens and their 65B model on 1.4T tokens.

### Beyond Chinchilla: Overtrained Models

Interestingly, many recent models deliberately deviate from Chinchilla-optimal ratios by training on significantly more data than the compute-optimal point would suggest. Llama 2 7B was trained on 2T tokens, and Llama 3 8B on 15T tokens — far beyond Chinchilla-optimal for their sizes.

The rationale is that **inference cost matters more than training cost** for models that will serve billions of queries. A smaller model trained on more data (overtrained relative to Chinchilla) may have higher training cost per quality point, but its lower inference cost makes it more economical at deployment scale. This insight, formalized as **inference-aware scaling** by **Sardana and Frankle (2023)**, has become standard practice.

```python
# Chinchilla-optimal estimates
def chinchilla_optimal(compute_flops):
    """Estimate Chinchilla-optimal model size and token count."""
    # Approximate: N_opt ~ 0.0592 * C^0.50, D_opt ~ 0.0592 * C^0.50
    # Using the simplified equal-scaling rule
    N_opt = (compute_flops / 6) ** 0.5  # 6 FLOPs per parameter per token
    D_opt = N_opt  # Equal scaling
    return N_opt, D_opt

# For a given compute budget
C = 6e23  # ~GPT-3 scale compute
N, D = chinchilla_optimal(C)
print(f"Optimal params: {N/1e9:.1f}B, Optimal tokens: {D/1e12:.2f}T")
```

## Emergent Abilities: Real or Mirage?

One of the most debated phenomena in scaling research is the concept of **emergent abilities** — capabilities that appear to arise suddenly and unpredictably as models scale, absent at smaller scales and present at larger ones.

### The Case For Emergence

**Wei et al. (2022)** at Google documented over 130 tasks where model performance appeared to exhibit a sharp phase transition. On tasks like multi-step arithmetic, word unscrambling, and certain reasoning benchmarks, small models performed at or near chance level, while models above a critical scale showed sudden jumps in performance.

This was exciting because it suggested that scaling alone could unlock qualitatively new capabilities — and troubling because it implied that forecasting model capabilities from smaller-scale experiments might be fundamentally unreliable.

The paper defined emergent abilities as those that are "not present in smaller models but are present in larger models," with the key feature being the apparent **unpredictability** of when they would appear.

### The Case Against: A Measurement Artifact

**Schaeffer et al. (2023)** challenged this narrative in "Are Emergent Abilities of Large Language Models a Mirage?" They argued that the apparent emergence was an artifact of the evaluation metrics, not a fundamental property of the models.

Their central argument: when researchers used **nonlinear or discontinuous metrics** (like exact-match accuracy), performance appeared to jump sharply. But when the same models were evaluated with **continuous metrics** (like token-level log-probability or Brier score), performance improved smoothly and predictably with scale.

Consider a task where a model must produce a multi-token answer exactly right to score 1.0 (and scores 0.0 otherwise). Even if each individual token's probability improves gradually with scale, the probability of getting all tokens correct can appear to jump — it is the product of many gradually improving probabilities, which produces a sigmoid-like curve that looks like a phase transition.

```python
import numpy as np

def exact_match_probability(per_token_accuracy, num_tokens):
    """
    If per-token accuracy improves gradually,
    exact-match accuracy exhibits apparent 'emergence.'
    """
    return per_token_accuracy ** num_tokens

# Per-token accuracy improving linearly with log(scale)
scales = np.logspace(8, 11, 50)  # 100M to 100B params
per_token_acc = 0.5 + 0.1 * np.log10(scales / 1e8)
per_token_acc = np.clip(per_token_acc, 0, 0.99)

# 8-token answer: smooth input -> sharp-looking output
exact_match = exact_match_probability(per_token_acc, num_tokens=8)
# This curve looks like a phase transition but is fully predictable
```

### Current Consensus

The field has largely accepted that Schaeffer et al. identified a real methodological issue: many apparent emergent abilities are indeed metric artifacts. However, this does not fully resolve the debate:

- **Some capabilities may still exhibit genuine nonlinear scaling**, particularly those involving qualitative changes in the model's reasoning strategy (e.g., switching from pattern matching to chain-of-thought reasoning).
- **In-context learning** itself is arguably emergent — small models barely benefit from few-shot examples, while large models show dramatic improvements. **Olsson et al. (2022)** identified specific attention patterns ("induction heads") that form during training and may underlie this capability.
- The **practical** question remains: even if the underlying metrics are smooth, the user-facing experience of a model that goes from 5% to 95% exact-match accuracy on arithmetic still feels like a qualitative jump.

## Compute-Optimal Training in Practice

Translating scaling laws into practical training decisions requires grappling with several additional considerations beyond the idealized Chinchilla framework.

### The Compute Frontier

At any given time, the industry's compute frontier — the maximum available FLOPs for a single training run — determines the largest feasible model. As of 2025, frontier training runs consume on the order of $10^{25}$ to $10^{26}$ FLOPs, using tens of thousands of GPUs for months.

For teams not operating at the frontier, the relevant question is: given my compute budget (say, 64 A100 GPUs for 2 weeks), what is the best model I can train? Scaling laws provide direct guidance:

```python
def compute_budget(num_gpus, gpu_flops, utilization, hours):
    """Estimate total training FLOPs."""
    seconds = hours * 3600
    return num_gpus * gpu_flops * utilization * seconds

# 64 A100s for 2 weeks at 50% MFU
C = compute_budget(
    num_gpus=64,
    gpu_flops=312e12,   # A100 bf16 peak
    utilization=0.50,    # Model FLOPs Utilization
    hours=14 * 24        # 2 weeks
)
print(f"Compute budget: {C:.2e} FLOPs")
# Use Chinchilla ratios to size model and data accordingly
```

### Model FLOPs Utilization (MFU)

**Chowdhery et al. (2022)** introduced Model FLOPs Utilization (MFU) as a metric for how efficiently training hardware is utilized. MFU measures the ratio of observed throughput to the theoretical maximum, accounting only for model FLOPs (not communication, data loading, etc.).

State-of-the-art training systems achieve 40-60% MFU. The gap from 100% comes from:

- **Communication overhead**: gradient synchronization across GPUs via all-reduce
- **Pipeline bubbles**: in pipeline parallelism, some GPUs are idle while waiting for activations or gradients
- **Memory operations**: attention, normalization, and activation recomputation
- **Data loading**: tokenization, batching, and data transfer

### Repeat Tokens and Data Constraints

A practical challenge for Chinchilla-optimal training is that high-quality training data is finite. **Muennighoff et al. (2023)** studied the effect of repeating data and found that repeating tokens is less efficient than unique tokens, with diminishing returns after approximately 4 epochs. This creates a ceiling: if you cannot source enough unique tokens, you may be forced to either use a smaller model than compute-optimal or accept suboptimal data efficiency.

This data wall has driven significant investment in synthetic data generation, multilingual data sourcing, and code/math data as supplements to web text.

## Scaling Beyond Language Loss

Scaling laws were originally characterized in terms of cross-entropy loss on held-out text. But practitioners care about downstream task performance, not perplexity. The relationship between pre-training loss and downstream performance is complex:

- **Log-linear relationships**: for many benchmarks, downstream accuracy scales log-linearly with pre-training loss, meaning each halving of loss improvement requires a 10x increase in compute (**Gadre et al., 2024**).
- **Task-dependent scaling**: some tasks (factual recall, translation) improve steadily with scale, while others (certain reasoning tasks) improve faster or slower than the loss would predict.
- **Post-training amplification**: RLHF and instruction tuning can significantly shift the mapping between pre-training quality and downstream performance, sometimes allowing smaller well-tuned models to match larger base models (**Ouyang et al., 2022**).

## Scaling Laws for Other Modalities

The power-law scaling framework has been extended beyond language:

- **Vision transformers**: **Zhai et al. (2022)** showed that ViT models follow similar scaling laws, with performance scaling as a power law in model size and data.
- **Multimodal models**: scaling laws for vision-language models have been studied by **Cherti et al. (2023)** in the context of CLIP-style contrastive learning.
- **Code models**: **Allal et al. (2023)** found that code generation follows scaling laws similar to natural language, but with higher data efficiency (code is more structured).

## Implications for Model Sizing Decisions

For engineering teams, the scaling laws literature provides actionable guidance:

### When to Scale Up vs. Scale Down

1. **If you are compute-constrained** (fixed GPU budget), use Chinchilla ratios to balance model size and data. A 3B model trained on 60B tokens will generally outperform a 7B model trained on 25B tokens.

2. **If you are deploying at scale** (many inference queries), consider overtraining a smaller model. The inference cost savings from a 3B vs. 7B model may justify 2-3x the compute-optimal training cost.

3. **If you need specific capabilities** (math, code, multilingual), invest in domain data quality rather than raw scale. Data quality scaling (**Longpre et al., 2023**) shows that curated data can substitute for 5-10x more uncurated data.

### The Diminishing Returns Landscape

Perhaps the most important takeaway from scaling laws is quantitative: improvements are **logarithmic** in compute. Cutting loss by half requires roughly 100x more compute. This means that the marginal value of each additional dollar of training compute decreases predictably, and at some point, investment in better data, algorithms, or post-training becomes more efficient than raw scaling.

## Summary and Key Takeaways

- **Kaplan et al. (2020)** established that language model loss follows power laws in parameters, data, and compute, but overemphasized parameter scaling relative to data.
- **Chinchilla (Hoffmann et al., 2022)** corrected the balance, showing that parameters and data should scale equally with compute, meaning most prior models were significantly undertrained.
- **Inference-aware scaling** favors overtraining smaller models relative to Chinchilla-optimal, since deployment cost often dominates training cost.
- **Emergent abilities** as described by Wei et al. (2022) are at least partially an artifact of discontinuous evaluation metrics (Schaeffer et al., 2023), though the practical significance of capability thresholds remains real.
- **Data quality and availability** increasingly constrain scaling, as the field approaches the limits of unique, high-quality web text.
- Scaling laws provide a quantitative framework for resource allocation, but their logarithmic nature means that algorithmic improvements, data quality, and post-training methods become increasingly important relative to raw compute at the frontier.
- For practical model sizing, teams should consider their full cost structure (training + inference + data acquisition) rather than optimizing for training efficiency alone.

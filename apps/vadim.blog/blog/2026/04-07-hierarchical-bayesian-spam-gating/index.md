---
slug: hierarchical-bayesian-spam-gating
title: "Multi-Probe Bayesian Spam Gating: Filtering Junk Before Spending Compute"
description: "How I built a research-grade spam gating module with 4-aspect Bayesian attention, information-theoretic AI detection, and a Rust distillation path — all running on a single M1 MacBook."
date: 2026-04-07
authors: [nicolad]
tags:
  - machine learning
  - bayesian-inference
  - spam-detection
  - nlp
  - rust
  - pytorch
  - ai-detection
  - b2b
  - lead-gen
  - information-theory
---

In a B2B lead generation pipeline, every email that arrives costs compute. Scoring it for buyer intent, extracting entities, predicting reply probability, matching it against your ideal customer profile — each module is a DeBERTa forward pass. If 40% of inbound email is template spam, AI-generated slop, or mass-sent campaigns, you are burning 40% of your GPU budget on garbage.

The solution is a **gating module**: a spam classifier that sits at stage 2 of the pipeline and filters junk before anything else runs. But a binary spam/not-spam classifier is too blunt. You need to know *why* something is spam (template? AI-generated? role account?), *how confident* you are (is it ambiguous, or have you never seen this pattern before?), and *which provider* will block it (Gmail is stricter than Yahoo on link density).

This article documents a hierarchical Bayesian spam gating system with 4 aspect-specific attention probes, information-theoretic AI detection features, uncertainty decomposition, and a full Rust distillation path. The Python model trains on DeBERTa-v3-base. The Rust classifier runs at batch speed with 24 features and zero ML dependencies.

<!-- truncate -->

## Architecture: Why Hierarchical, Why Bayesian

Spam signals are **level-dependent**. The word "FREE" in a token is a different signal than an urgency pattern across a sentence, which is different from a document-level profile of high link density with failed SPF authentication. Operating at a single granularity — as most spam classifiers do — collapses these distinctions.

The module operates at three levels simultaneously:

1. **Token-level**: Learned attention probes identify which individual tokens contribute to spamminess, with Beta distribution priors that quantify per-token uncertainty
2. **Sentence-level**: Token posteriors are aggregated within each sentence's token span, combined with 12 structural features (greeting detection, CTA presence, urgency words, personalization signals)
3. **Document-level**: Attention-weighted sentence aggregation feeds a 7-category classifier with information-theoretic features (character entropy, compression ratio)

The Bayesian framing is not decorative. Each token gets a Beta(alpha, beta) prior where alpha/(alpha+beta) is the expected spam contribution. The precision (alpha+beta) tells you how confident the model is about that token. This propagates through the hierarchy: a sentence full of high-precision spam tokens is a stronger signal than a sentence with low-precision ambiguous tokens.

## The Four Aspect Probes

A single attention probe conflates different types of spam signals. A keyword-spam email ("FREE GUARANTEED WINNER") and an AI-generated email (perfectly grammatical, zero personalization) activate different patterns, but a single probe must compress both into one attention distribution.

The solution is **multi-probe attention** — four learned query vectors, each specialized for a different spam aspect:

```python
self.probes = nn.ParameterDict({
    "content": nn.Parameter(torch.randn(1, h4)),   # keyword-level spam signals
    "structure": nn.Parameter(torch.randn(1, h4)), # formatting/template signals
    "deception": nn.Parameter(torch.randn(1, h4)), # urgency/manipulation
    "synthetic": nn.Parameter(torch.randn(1, h4)), # AI-generated content signals
})
```

Each probe independently computes attention weights over the token sequence, generates its own Beta posteriors, and produces an aspect-specific spam signal. A learned gating mechanism blends the four signals:

```python
stacked_signals = torch.stack(
    [aspect_signals[a] for a in self.ASPECTS], dim=-1)  # (1, 4)
gate_weights = self.aspect_gate(stacked_signals)        # (1, 4) softmax
token_spam_signal = (stacked_signals * gate_weights).sum(dim=-1)
```

The output includes per-aspect attribution: "this email was flagged 62% because of deception signals (urgency words at positions 3, 7, 12) and 28% because of synthetic signals (low perplexity variance)." This interpretability matters for false positive investigation — when a legitimate email gets quarantined, you can see exactly which aspect triggered it.

## Per-Sentence Token Spans

The original implementation used global attention pooling for all sentences — every sentence got the same neural signal, differentiated only by structural features. This makes the "hierarchy" decorative rather than functional.

The fix is straightforward: partition the encoder's token sequence into per-sentence spans using character-to-token offset mapping, then compute attention-weighted aggregation within each span:

```python
# Map character offsets to approximate token indices
c_start, c_end = char_offsets[i]
t_start = max(1, int(c_start / text_len * (seq_len - 1)))
t_end = min(seq_len, int(c_end / text_len * (seq_len - 1)) + 1)

# Attention-weighted value within this sentence's span
span_attn = blended_attn[:, t_start:t_end]
span_attn = span_attn / (span_attn.sum(dim=-1, keepdim=True) + 1e-8)
span_values = values[:, t_start:t_end]
sent_agg = torch.bmm(span_attn.unsqueeze(1), span_values).squeeze(1)
```

Now a sentence containing "ACT NOW! LIMITED TIME!" produces a genuinely different neural representation than "I enjoyed our meeting last Tuesday about the Q3 roadmap" — because each sentence's aggregation is computed from its own token span, not from a global pool.

## Information-Theoretic AI Detection

Detecting AI-generated content is an adversarial problem. Paraphrasing tools, style transfer, and instruction-tuned models make surface-level detection unreliable. The module uses 32 structural features grouped into four categories, with several drawn from information theory and computational linguistics.

### Yule's K (Vocabulary Richness)

Raw word frequency variance is a weak signal — it scales with text length. **Yule's K** is length-invariant:

$$K = 10^4 \cdot \frac{M_2 - N}{N^2}$$

where $M_2 = \sum i^2 \cdot V_i$, $V_i$ is the count of words appearing exactly $i$ times, and $N$ is total tokens. AI text has characteristically different K values than human text because LLMs produce more uniform word frequency distributions.

```python
freq_of_freq = Counter(freq.values())
m2 = sum(i * i * vi for i, vi in freq_of_freq.items())
yules_k = 1e4 * (m2 - N) / max(N * N, 1)
```

### Shannon Word Entropy

The entropy of the word frequency distribution measures predictability:

$$H = -\sum p_i \log_2 p_i$$

normalized by $\log_2 V$ where $V$ is vocabulary size. AI text tends toward lower entropy — more predictable, more uniform distributions — because language models optimize for the most probable next token.

### Honore's R Statistic

$$R = \frac{100 \cdot \ln N}{1 - V_1 / V}$$

where $V_1$ is the number of hapax legomena (words appearing exactly once). This measures vocabulary diversity independent of text length. A high R indicates rich, varied vocabulary. AI-generated text often has a characteristic R profile that differs from human writing — not always lower, but distributed differently across text lengths.

### Trajectory Smoothness

LLMs maintain topic coherence too consistently. Human writing has natural velocity changes — digressions, asides, topic shifts. The trajectory smoothness feature measures the variance of consecutive sentence embedding cosine similarities:

```python
normed = F.normalize(sampled, dim=-1)
consec_cos = (normed[:-1] * normed[1:]).sum(dim=-1)
smoothness = consec_cos.mean().item()
```

High smoothness (consistently high cosine similarity between consecutive sentences) is a signal of AI generation. Human text has lower mean similarity and higher variance.

## The Seven-Category Taxonomy

Binary spam classification hides actionable information. The module classifies into seven categories, each requiring different handling:

| Category | Description | Action |
|----------|-------------|--------|
| `clean` | Legitimate personalized email | Pass |
| `template_spam` | Mass-sent templates with token substitution | Quarantine |
| `ai_generated` | LLM-generated content | Flag for review |
| `low_effort` | Generic, no personalization | Quarantine |
| `role_account` | info@, noreply@, billing@ | Route to appropriate handler |
| `domain_suspect` | Disposable/newly-registered domains | Block |
| `content_violation` | Urgency manipulation, deceptive subject | Block |

The classification head sits on top of the document-level embedding, after attention-weighted sentence aggregation and 8 information-theoretic document features (character Shannon entropy, compression ratio, link density, urgency count, template markers, caps ratio, sentence count, text length).

## Uncertainty Decomposition

A spam score of 0.6 is useless without knowing *why* the model is uncertain. The module decomposes uncertainty into two components:

**Aleatoric uncertainty** (inherent ambiguity): the normalized entropy of the category probability distribution. High aleatoric uncertainty means the email itself is genuinely ambiguous — it has properties of multiple categories simultaneously.

$$U_{aleatoric} = \frac{-\sum p_i \ln p_i}{\ln K}$$

**Epistemic uncertainty** (model uncertainty): the mean variance of the Beta distributions across all token posteriors. High epistemic uncertainty means the model hasn't seen enough training data similar to this email.

$$U_{epistemic} = \text{mean}\left(\frac{\alpha \cdot \beta}{(\alpha + \beta)^2 (\alpha + \beta + 1)}\right)$$

The combined confidence is `1 - (aleatoric + epistemic) / 2`. This tells operators: "I'm uncertain because the email is ambiguous" (high aleatoric, low epistemic) versus "I'm uncertain because I haven't seen emails like this" (low aleatoric, high epistemic). The latter case is a signal to add more training data.

## The Six Sub-Modules

Beyond the Bayesian gate and AI detector, four additional sub-modules contribute signals:

**HeaderAnalyzer**: Extracts a 16-dimensional feature vector from email headers — SPF/DKIM/DMARC one-hot encoding (9 dims), hop count, reply-to mismatch, return-path mismatch, list-unsubscribe presence, known mailer flag, and circular send-hour encoding (sine/cosine pair).

**TemporalBurstDetector**: Analyzes cross-email send timestamps for burst patterns (Kleinberg model), cadence regularity, time-of-day entropy, day-of-week entropy, volume, and send rate acceleration. Ten emails in ten seconds from the same sender is a clear campaign burst.

**CampaignSimilarityDetector**: Computes pairwise cosine similarity of CLS embeddings across a batch. If >70% of email pairs have cosine similarity >0.85, it's a template campaign. Uses proper union-find with path compression for cluster counting.

**ProviderCalibration**: Six provider-specific MLPs (Gmail, Outlook, Yahoo, ProtonMail, Apple Mail, Corporate) each take 10 features — spam score, AI risk, text length, link density, urgency count, header authentication score, template markers, caps ratio, sentence count, and role account flag — and produce calibrated deliverability scores. An adversarial discriminator forces the predicted scores to match empirical inbox placement distributions.

## Residual Gate Decision

The final spam score comes from a residual MLP that fuses all six sub-module outputs:

```python
self.gate_norm = nn.LayerNorm(7)
self.gate_trunk = nn.Sequential(
    nn.Linear(7, 64), nn.GELU(), nn.Dropout(0.1),
    nn.Linear(64, 32), nn.GELU(),
)
self.gate_residual = nn.Linear(7, 32)  # skip connection
self.gate_out = nn.Sequential(nn.LayerNorm(32), nn.Linear(32, 1), nn.Sigmoid())
```

The seven inputs are: base gate score, AI risk, header authentication score, temporal anomaly, campaign similarity, role account indicator, and urgency count. The skip connection prevents gradient degradation when training with the multi-task loss, and the layer normalization stabilizes the heterogeneous input scales.

## Multi-Task Loss with Uncertainty Weighting

Training uses the Kendall et al. (2018) uncertainty-weighted multi-task loss:

$$\mathcal{L} = \sum_i \frac{1}{2\sigma_i^2} \mathcal{L}_i + \log \sigma_i$$

where each task's loss is weighted by a learned precision $1/\sigma_i^2$, and the $\log \sigma_i$ term prevents all precisions from going to infinity. The five tasks are:

1. **Category cross-entropy** (7-way classification)
2. **Gate BCE** (binary spam/not-spam)
3. **AI detection BCE** (binary AI/human)
4. **KL regularization** (Beta posteriors vs uniform Beta(1,1) prior)
5. **Adversarial calibration** (provider discriminator + generator, after warmup at epoch 3)

## The Rust Distillation Path

The DeBERTa model is too expensive for production gating at scale. The distillation pipeline converts the neural classifier into a 24-feature logistic regression that runs in pure Rust with zero ML dependencies.

### Feature Extraction (24 dimensions)

The Rust `extract_spam_features()` function mirrors the Python feature set using zero-copy byte scanning:

| # | Feature | Extraction Method |
|---|---------|-------------------|
| 0-1 | Spam/urgency keyword density | Keyword match count / word count |
| 2-4 | Link count, URL shorteners, image tags | Byte-level pattern scanning |
| 5-6 | Exclamation density, ALL CAPS ratio | Character classification |
| 7-9 | Sentence length variance, pronouns, contractions | Split-and-count |
| 10-13 | Type-token ratio, word length, starter variety, text length | Vocabulary statistics |
| 14-17 | Unicode anomalies, homoglyphs, zero-width chars, template markers | Codepoint scanning |
| 18-20 | SPF+DKIM+DMARC composite, reply-to mismatch, hop count | Parsed headers |
| 21-22 | Send hour sine/cosine | Circadian encoding |
| 23 | Role account indicator | Prefix matching |

### Batch Processing (SoA Layout)

The `SpamBatch` struct uses Structure-of-Arrays layout with 64-byte cache alignment for optimal auto-vectorization on ARM NEON and x86 SSE:

```rust
#[repr(C, align(64))]
pub struct SpamBatch {
    pub features: [[f32; 24]; 256],
    pub spam_scores: [f32; 256],
    pub category_idx: [u8; 256],
    pub gate_decisions: [u8; 256],
    pub count: usize,
}
```

A batch of 256 emails is scored in a single pass. The `push()` method provides ergonomic batch building, and `mean_score()`, `pass_rate()`, and `category_distribution()` give batch-level analytics without allocations.

### Domain Filtering (Bloom Filter)

Before feature extraction even runs, a Bloom filter checks the sender domain against known spam and disposable email provider lists. At 0.1% false positive rate, this catches the obvious cases — mailinator.com, guerrillamail.com — at near-zero cost.

### Zero-Copy Header Parsing

The `header_fsm.rs` module parses raw email headers in a single pass with no heap allocation. A finite state machine identifies Authentication-Results, From, Reply-To, Return-Path, Received, DKIM-Signature, Content-Type, List-Unsubscribe, and X-Mailer headers. The parsed result borrows directly from the input byte buffer:

```rust
pub struct ParsedHeaders<'a> {
    pub spf_result: AuthResult,
    pub dkim_result: AuthResult,
    pub dmarc_result: AuthResult,
    pub from_domain: &'a str,
    pub reply_to_domain: Option<&'a str>,
    pub dkim_domain: Option<&'a str>,
    pub content_type: Option<&'a str>,
    pub is_multipart: bool,
    // ...
}
```

## Results

The module is published at [v9ai/salescue-spam-v1](https://huggingface.co/v9ai/salescue-spam-v1) on the Hugging Face Hub. The output includes 17 keys:

```
spam_score, spam_category, category_scores, ai_risk, ai_details,
header_verdict, deliverability, provider, provider_scores, risk_level,
risk_factors, token_spam_contributions, sentence_scores, gate_decision,
gate_confidence, aspect_scores, uncertainty
```

The full system — 1,352 lines of Python (6 sub-modules), 843 lines of Rust (classifier + batch + domain filter), 541 lines of Rust (header FSM) — runs the DeBERTa model on CPU in under 200ms per email for training and evaluation. The distilled Rust classifier processes a batch of 256 emails in under 1ms.

The key insight is that spam gating is not a classification problem — it is a **resource allocation** problem. Every false negative costs downstream compute. Every false positive costs a missed lead. The Bayesian uncertainty decomposition lets you tune this tradeoff explicitly: route high-epistemic-uncertainty emails to human review instead of auto-blocking them, and auto-block only when aleatoric uncertainty is low and the spam score is high.

The model, weights, and distillation pipeline are open source. The next step is calibrating the provider-specific models against real inbox placement data from Resend delivery webhooks.

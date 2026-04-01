# Building a ZoomInfo Alternative with Qwen and MLX: Local Buyer Intent Detection

## Summary

ZoomInfo charges upwards of $300 per user per month for intent data — buying signals that tell sales teams which companies are actively in-market for their product. It is the platform's number one feature and the reason enterprises pay six figures annually for access. But the underlying technology — classifying company content into intent categories — is not inherently expensive. It is a text classification problem.

This article documents a fully open-source buyer intent detection system built on Qwen2.5-3B, Apple's MLX framework, and a Rust inference kernel. The entire pipeline — from scraping public job postings on Greenhouse ATS to fine-tuning a 3-billion-parameter language model with LoRA, then distilling it into six logistic regressions that run in pure Rust — executes on a single M1 MacBook Pro with 16GB of RAM. No API calls. No cloud vendor. No per-seat licensing. The model processes 4,618 embeddings per second and the distilled classifier scores 256 companies in a single cache-aligned batch.

The system detects six categories of buyer intent signals — hiring intent, technology adoption, growth signals, budget cycle indicators, leadership changes, and product launches — each with configurable exponential decay half-lives so that signal freshness degrades naturally over time. A company that raised a Series B two weeks ago scores higher than one that raised six months ago. A job posting from yesterday matters more than one from last quarter.

## Key Metrics

| Metric | Value |
|--------|-------|
| Base model | Qwen2.5-3B-Instruct-4bit (MLX Community) |
| Training examples | 460 (labeled from Greenhouse ATS + synthetic) |
| Trainable parameters | 14.97M (0.48% of 3.09B total) |
| LoRA rank | 8 |
| Training epochs | 8 (224 iterations) |
| Effective batch size | 16 (batch 4 × grad accumulation 4) |
| Peak GPU memory | 7.56 GB (Metal, M1 16GB) |
| Embedding throughput | 4,618/sec on M1 |
| Training throughput | 10.75 tokens/sec |
| Distilled model | 6 logistic regressors × 10 features = 60 weights + 6 biases |
| Batch scoring | 256 companies per IntentBatch (cache-line aligned) |
| Signal categories | 6 |
| ZoomInfo cost (enterprise) | $300+/user/month |
| This system cost | $0 (open source + local hardware) |

## Insight 1: The Six Buyer Intent Signals

The system classifies company content into six distinct signal types, each with a different decay half-life reflecting how quickly the signal becomes stale:

| Signal Type | Weight | Decay (days) | What It Detects |
|-------------|--------|-------------|-----------------|
| hiring_intent | 30% | 30 | Active job postings, team expansion, headcount growth |
| growth_signal | 25% | 45 | Funding rounds, revenue growth, M&A, office expansion |
| tech_adoption | 20% | 60 | Infrastructure migration, new stack adoption, tool rollouts |
| budget_cycle | 15% | 90 | RFPs, vendor evaluations, annual budget planning, procurement |
| leadership_change | 5% | 60 | New executive hires, C-suite promotions, board changes |
| product_launch | 5% | 30 | New product announcements, feature releases, beta launches |

The weighted aggregation produces a single 0-100 intent score per company. Hiring intent carries the most weight (30%) because active hiring is the strongest predictor that a company is spending money and growing — exactly the moment when they are open to new vendor relationships.

The freshness function uses exponential decay: `confidence × exp(-0.693 / half_life × days_since_detection)`. A hiring signal detected today at 0.9 confidence scores 0.9. After 30 days (its half-life), it scores 0.45. After 60 days, 0.225. This prevents stale signals from inflating scores and ensures that the intent ranking reflects current market reality, not historical noise.

## Insight 2: Training Pipeline — From Job Postings to Labeled Data

The training data comes from two sources: public Greenhouse ATS job postings and enriched company data stored in a Neon PostgreSQL database.

**Greenhouse ATS Scraping**: The pipeline ingests 435 job postings from companies like Anthropic via the Greenhouse public API. Each posting includes structured fields — department, job title, full HTML description, office location — that map naturally to intent signals. An Engineering department posting maps to both hiring_intent and tech_adoption. A Marketing role maps to hiring_intent and growth_signal.

**Keyword-Based Label Generation**: Each text snippet is scanned against curated keyword lists per signal type. Hiring keywords include "we're hiring", "expanding team", "open position". Tech adoption keywords include "migrating to", "deploying", "new stack". Growth keywords include "series a", "funding", "acquisition". The keyword hit generates a confidence score based on keyword density and source reliability.

**MLX LoRA Fine-Tuning**: The 460 labeled examples are formatted as chat-completion JSONL (system prompt + user message → assistant JSON response) and used to fine-tune Qwen2.5-3B-Instruct-4bit with LoRA. The adapter trains only 14.97M parameters (rank 8, alpha 16, scale 2.0) with gradient checkpointing enabled to stay within 7.56 GB peak Metal memory. Training runs for 8 epochs at learning rate 5e-5 with cosine decay and a 9-step warmup.

The result is a fine-tuned model that outputs structured JSON with signal types, confidence scores, and supporting evidence for any company text snippet — running entirely on a local MLX server at `localhost:8080`.

## Insight 3: Distillation — 3B Parameters Down to 60 Weights

The fine-tuned Qwen model is powerful but slow for production scoring of thousands of companies. The distillation step compresses it into six independent logistic regressions — one per signal type — that run in pure Rust with zero dependencies.

**Feature Extraction**: Each text snippet is converted into a 10-element feature vector:
1. Keyword density for hiring_intent
2. Keyword density for tech_adoption
3. Keyword density for growth_signal
4. Keyword density for budget_cycle
5. Keyword density for leadership_change
6. Keyword density for product_launch
7. Normalized text length
8. URL presence indicator
9. Source type encoding (company_snapshot = 0, linkedin_post = 1, company_fact = 2)
10. Entity density (ratio of capitalized words)

**Logistic Regression Training**: Using numpy with L2 regularization, each of the 6 classifiers learns 10 weights + 1 bias from the LoRA-labeled training data. The full distilled model is 66 floating-point numbers exported as a JSON file.

**Rust IntentClassifier**: The `IntentClassifier` struct in Rust loads these 66 weights and mirrors the Python feature extraction exactly. The Rust implementation uses the same keyword lists and the same scoring formula, ensuring perfect parity between the training and inference environments.

This is the key architectural insight: use the LLM for labeling and the distilled model for inference. The LLM sees nuance and context; the logistic regressor captures the decision boundary at machine speed.

## Insight 4: Time-Aware Scoring with Exponential Decay

Intent signals are perishable. A company that posted 50 engineering jobs last week is a hot prospect. The same company with the same postings from six months ago is not. Every intent data vendor faces this freshness problem — ZoomInfo solves it with continuous web crawling and proprietary freshness algorithms.

The open-source approach uses a simple exponential decay model with per-signal-type half-lives. The decay function `signal_freshness(days_since, half_life) -> f32` computes `exp(-ln(2) / half_life × days_since)`. This produces a multiplier between 0 and 1 that scales the original confidence.

Budget cycle signals decay slowest (90-day half-life) because procurement cycles are long. A company evaluating vendors in Q1 is likely still evaluating in Q2. Hiring intent and product launches decay fastest (30 days) because these signals reflect point-in-time decisions.

The `IntentBatch::aggregate_signals` method takes the maximum decayed score per category per company. If a company has three separate hiring signals at different ages, only the freshest (highest effective score) counts. This prevents double-counting while ensuring that the best available evidence drives the score.

## Insight 5: Rust SIMD Kernel — 256 Companies Per Batch

The Rust scoring kernel is designed for throughput. The `IntentBatch` struct uses a Structure-of-Arrays (SoA) layout with `#[repr(C, align(64))]` for cache-line alignment:

```rust
#[repr(C, align(64))]
pub struct IntentBatch {
    pub hiring_score: [f32; 256],
    pub tech_score: [f32; 256],
    pub growth_score: [f32; 256],
    pub budget_score: [f32; 256],
    pub leadership_score: [f32; 256],
    pub product_score: [f32; 256],
    pub signal_count: [u16; 256],
    pub intent_scores: [f32; 256],
    pub count: usize,
}
```

The parallel arrays enable NEON auto-vectorization on Apple Silicon. The `compute_scores` inner loop is a simple dot product across 6 categories — exactly the kind of operation that the M1's SIMD units handle at peak throughput. The `top_k` method returns the highest-scoring company indices for immediate prioritization.

On the M1's 68.25 GB/s memory bandwidth with 8MB SLC cache, a full 256-company batch fits entirely in L2 and scores in microseconds. The outer pipeline processes companies in batches, making the scoring step negligible compared to data collection.

## Insight 6: Cost Comparison — ZoomInfo vs. Open Source

| | ZoomInfo Enterprise | Qwen + MLX + Rust |
|---|---|---|
| Annual cost (10-seat team) | $36,000+ | $0 |
| Per-seat licensing | $300+/month | None |
| Intent data coverage | Proprietary web crawl | Greenhouse ATS + web scraping |
| Data freshness | Continuous (vendor-managed) | On-demand (user-controlled) |
| Privacy | Data shared with vendor | Fully local, nothing leaves machine |
| Customization | None (black box) | Full control over signal types and weights |
| Hardware required | Browser | M1 MacBook (already owned) |
| Vendor lock-in | High (annual contracts) | None |
| Setup time | Days (procurement + onboarding) | Hours (clone repo + train) |

The trade-off is clear: ZoomInfo offers breadth (100M+ contacts, org charts, conversation intelligence). This system offers depth on the specific problem of intent signal detection — and it does so for free, with full transparency into how scores are computed, and with the ability to add custom signal types by editing a keyword list and retraining a LoRA adapter in under an hour.

## Insight 7: Privacy and Data Sovereignty

Every company text snippet — job postings, LinkedIn posts, company snapshots — stays on the local machine. The Qwen model runs on MLX via a local HTTP server. The distilled classifier runs in Rust with no network calls. The training data lives in a Neon PostgreSQL database that the user controls.

This is not a minor point. Enterprise sales teams handle sensitive competitive intelligence. Feeding prospect data into a third-party API (ZoomInfo, Apollo, Clearbit) means that data is processed, stored, and potentially used to train models that benefit competitors. With a local pipeline, intent analysis is a pure function: text in, score out, nothing leaves the building.

For companies subject to GDPR, CCPA, or industry-specific compliance requirements, local inference is not just a cost savings — it is a compliance advantage.

## Raw Data Tables

### Training Data Composition

| Source | Examples | Signals Covered |
|--------|----------|----------------|
| Greenhouse ATS (Anthropic) | 435 job postings | hiring_intent, tech_adoption, growth_signal |
| Synthetic negatives | 80 | All (negative examples) |
| Synthetic hard negatives | 60 | All (borderline examples) |
| **Total** | **575** | All 6 signal types |
| Train split | 460 (80%) | |
| Validation split | 57 (10%) | |
| Test split | 58 (10%) | |

### Signal Distribution in Training Set

| Signal | Count in Train |
|--------|---------------|
| hiring_intent | 348 |
| tech_adoption | 203 |
| growth_signal | 116 |
| leadership_change | 110 |
| budget_cycle | 30 |
| product_launch | 15 |

### MLX LoRA Hyperparameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| LoRA rank | 8 | Sufficient for 6-class intent task |
| LoRA alpha | 16.0 | Standard 2× rank |
| LoRA scale | 2.0 | alpha/rank |
| Dropout | 0.1 | Prevent overfitting on 460 examples |
| Learning rate | 5e-5 | Strong signal for short training |
| LR schedule | Cosine decay to 5e-6 | Smooth convergence |
| Warmup | 9 steps | ~1/3 of first epoch |
| Max sequence length | 1536 tokens | Fits full job descriptions |
| Gradient checkpointing | True | Required for M1 16GB memory |
| Optimizer | AdamW (weight_decay=0.01) | Standard for LoRA |

## Methodology

The pipeline operates in four phases:

1. **Data Collection**: Greenhouse ATS public API scrapes structured job postings. Neon DB stores company snapshots, LinkedIn posts, and company facts from web enrichment.

2. **Label Generation**: Department mappings and keyword density analysis generate multi-label annotations. Synthetic negatives and hard negatives are generated to balance the training set.

3. **Fine-Tuning**: MLX LoRA adapts Qwen2.5-3B-Instruct-4bit on the labeled JSONL data. The model learns to output structured JSON with signal types, confidence scores, and evidence.

4. **Distillation**: The fine-tuned model's knowledge is compressed into 6 logistic regressors with 10-feature inputs, exported as JSON weights for the Rust kernel.

## Story Recommendations

- **Lead with the price shock**: "$36,000/year for what a LoRA adapter and 60 floating-point numbers can do" — this is the hook that will resonate with technical founders and sales ops leaders who are tired of enterprise SaaS pricing.

- **Show the Makefile**: The fact that the entire pipeline is orchestrated by `make intent-loop` (export → train → distill) is a powerful simplicity story. One command, one laptop, zero cloud.

- **Contrast with ZoomInfo's black box**: ZoomInfo users cannot see how intent scores are computed. This system's weights, keyword lists, and decay functions are all visible and editable. Frame this as "debuggable intent data."

- **The M1 angle**: Apple Silicon is the democratizer here. The same hardware that runs Figma and Slack also runs a 3B-parameter language model at production quality. No GPU cluster needed.

- **Privacy as a feature, not a constraint**: Position local inference as a competitive advantage for enterprise buyers, not a limitation. "Your prospect data never touches a third-party server" is a sales pitch, not a technical footnote.

- **The distillation insight**: The jump from 3 billion parameters to 66 floating-point numbers is the technical wow moment. A 45-million-to-one compression ratio that preserves the decision boundary. This is the paragraph that gets shared on Hacker News.

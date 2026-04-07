# ClosingTime v2 — Full Context for Continuation

## What This Is

ClosingTime is a sales intelligence library that ships as a Python package under the `v9ai` org.
It provides 12 ML modules that analyze sales emails, calls, and prospect data — each with a
novel research contribution beyond standard approaches. The library uses a shared encoder
backbone (DeBERTa-v3-base) and composable Unix-style piping between modules.

## Key Architectural Decisions

1. **Shared backbone**: All modules share a single DeBERTa-v3-base encoder via a thread-safe
   singleton (`SharedEncoder`). Each module adds task-specific heads on top.

2. **Unix composition**: Modules compose via `|` (pipe) operator on `Document` objects.
   `doc | score | intent | reply` runs the pipeline left-to-right, accumulating results.

3. **Three entry points**: The library exposes 3 API surfaces:
   - `from salescue import ai` — namespace for `ai.score(text)`, `ai.intent(text)`, etc.
   - `Engine(modules=[...])` — batch processing with preload
   - `Document(text) | score | intent` — Unix pipe composition

4. **Visual output**: `CardRenderer` produces rich terminal cards (via `rich`) and HTML cards
   for each module's output. Cards show confidence bars, signal breakdowns, and evidence spans.

5. **Reproducibility**: Deterministic mode sets all seeds and disables nondeterministic CUDA ops.

6. **Package structure**: Published as `salescue` under the `v9ai` GitHub org. No external
   data dependencies — all models are self-contained PyTorch modules.

## The 12 Modules and Their Research Contributions

### 1. score — Causal Signal Attribution via Learned Interventions
- `LearnedInterventionAttribution`: Learns null embeddings per signal type representing
  "signal never existed" (do-calculus, not masking). Adversarial training makes null
  embeddings indistinguishable from genuine signal absence.
- `LeadScorer`: Cross-attention signal detection, causal effect estimation, uncertainty-weighted
  multi-task loss (Kendall 2018). Outputs: label (hot/warm/cold/disqualified), score 0-100,
  top-5 causal signals with interventional attribution.

### 2. intent — Neural Hawkes Process for Buying Journey
- `NeuralHawkesIntentPredictor`: Continuous-Time LSTM (Mei & Eisenbeis 2017) models buying
  signals as a marked temporal point process. Captures self-excitation (demo -> pricing visit)
  and temporal decay. Predicts 6 stages: unaware -> purchasing.
- Outputs: stage, trajectory (days_to_purchase, direction, velocity, acceleration), intensity.

### 3. reply — Constrained CRF for Multi-Label Reply Classification
- `ConstrainedMultiLabelCRF`: Pairwise potentials encode label co-occurrence rules
  (unsubscribe + interested = impossible). Exact enumeration over 2^10 = 1024 configs.
- `ReplyHead`: Token-level label relevance + pointer spans for evidence extraction.
  10 labels including genuinely_interested, objection, referral, meeting_request.

### 4. entities — Regex + Neural NER with Re-typing
- Regex patterns for structured entities (emails, phones, URLs, money, dates).
- Pointer-network NER for unstructured entities (person, company, product, role).
- Re-typing layer: detected entities get re-classified in context (e.g., "John" as
  decision_maker vs. reference based on surrounding text).

### 5. triggers — Temporal Displacement Model
- `TemporalDisplacementModel`: Log-normal distribution over event displacement.
  Predicts P(event_date | article_date, text_features) as continuous displacement.
- 10 event types (funding, job_change, expansion, etc.). Outputs displacement_days with
  90% confidence intervals and uncertainty.

### 6. icp — Wasserstein Distribution Matching
- `WassersteinICPMatcher`: Models ICP as Gaussian distributions (not point vectors) in
  5 dimensions (industry, size, tech, role, signal). Prospect = point in same space.
- W2 distance for matching. Learned dealbreaker thresholds. Geometric mean scoring.

### 7. objection — 3-Way Pre-classifier + Coaching Cards
- Pre-classifies into genuine_objection / stall / misunderstanding before handling.
- Each objection type gets a coaching card with recommended response framework.
- Pattern library for common sales objections with contextual responses.

### 8. call — Conditional Neural Process for Conversation Scoring
- `ConversationNeuralProcess`: Meta-learning framework (Garnelo 2018) treats each call
  as a task. Learns adaptive scoring from few examples.
- Turn-level scoring with uncertainty, turning point detection, momentum tracking.
- `CommitmentDetector`: Rule-based extraction of verbal agreements, next steps, timelines.

### 9. spam — Perplexity Ratio AI Detection
- `PerplexityRatioDetector`: Compares perplexity under human vs AI language models.
  Domain-invariant because both models see same domain distribution.
- Structural features: sentence length variance, contraction ratio, parenthetical asides.
- `SpamHead`: Provider-calibrated (gmail/outlook/yahoo) spam scoring.

### 10. subject — Contextual Bradley-Terry
- `ContextualBradleyTerry`: Extends standard Bradley-Terry with prospect context
  (industry, company size, relationship stage). Context-conditional subject line ranking.
- Compare, rank, and score subject lines. Margin-based training loss.

### 11. sentiment — CLUB MI Minimization + Pair Correction
- `DisentangledSentimentIntentHead`: Separate projection networks for sentiment and intent.
  CLUB bound (Cheng 2020) provably decorrelates the two representations.
- Interaction module detects sentiment-intent inversion (negative sentiment masking buying intent).
- 7 sentiments x 4 intent levels. Evidence extraction for inversion explanation.

### 12. emailgen — Mistral LoRA (Separate)
- LoRA fine-tuned Mistral for generating sales emails.
- Runs as a separate module (not on the shared DeBERTa backbone).
- Conditioned on module outputs (score, intent, sentiment) for personalized generation.

## Infrastructure Components

### validation.py
- Input validation for all module entry points.
- Text length limits, type checking, required field validation.
- Raises `ClosingTimeValidationError` with clear messages.

### backbone.py
- `SharedEncoder`: Thread-safe singleton for DeBERTa-v3-base.
- Lazy loading (only loads when first module needs it).
- Device management (CPU/CUDA/MPS auto-detection).

### display.py
- `CardRenderer`: Rich terminal cards and HTML output.
- Confidence bars, signal breakdowns, evidence highlighting.
- Consistent visual language across all 12 modules.

### document.py
- `Document` dataclass: Wraps text + accumulated module results.
- Supports `|` operator for piping through modules.
- `__getattr__` delegates to results dict for easy access.

### chain.py
- `Chain`: Composition with error handling and timing.
- Collects results from sequential module execution.
- Reports per-module latency and errors.

### base.py
- `Module` ABC: Abstract base class all 12 modules implement.
- `__call__`, `forward`, `display` methods.
- Registration of module name and description.

### engine.py
- `Engine`: Batch processing with module preloading.
- `Engine(modules=["score", "intent"]).run(texts)` for batch inference.
- Manages shared encoder lifecycle.

### reproducibility.py
- `set_deterministic(seed=42)`: Sets all random seeds.
- Disables CUDA nondeterministic ops, sets `CUBLAS_WORKSPACE_CONFIG`.

## What's Already Built (in salescue/)

All 9 core neural modules exist with full implementations:
- `modules/score.py` — LeadScorer + LearnedInterventionAttribution (237 lines)
- `modules/intent.py` — NeuralHawkesIntentPredictor with CT-LSTM (213 lines)
- `modules/reply.py` — ReplyHead + ConstrainedMultiLabelCRF (199 lines)
- `modules/triggers.py` — TemporalDisplacementModel (127 lines)
- `modules/icp.py` — WassersteinICPMatcher (103 lines)
- `modules/call.py` — ConversationNeuralProcess + CommitmentDetector (228 lines)
- `modules/spam.py` — SpamHead + PerplexityRatioDetector (128 lines)
- `modules/subject.py` — ContextualBradleyTerry (89 lines)
- `modules/sentiment.py` — DisentangledSentimentIntentHead + CLUBEstimator (247 lines)

## What Needs To Be Built

### New Modules
- `modules/entities.py` — Regex + pointer NER with re-typing layer
- `modules/objection.py` — 3-way pre-classifier + coaching cards
- `modules/emailgen.py` — Mistral LoRA wrapper (separate from backbone)

### Infrastructure
- `validation.py` — Input validation
- `backbone.py` — SharedEncoder singleton
- `display.py` — CardRenderer
- `document.py` — Document dataclass with pipe support
- `chain.py` — Composition with error handling
- `base.py` — Module ABC
- `engine.py` — Unified Engine with preload
- `reproducibility.py` — Deterministic mode
- `__init__.py` — Updated with `ai` namespace

### Package Config
- `pyproject.toml` — Package metadata, dependencies, entry points

## Bug Fixes Applied (170+)

Key categories of fixes applied during development:
- Tensor shape mismatches in cross-attention and CRF scoring
- Device consistency (all tensors on same device)
- Gradient flow issues in adversarial training
- Numerical stability (log(0) guards, softplus for positive values)
- Memory leaks from retained computation graphs
- Thread safety in shared encoder access
- Edge cases: empty inputs, single-turn calls, missing fields

## Data and Legal Decisions

- **No external data bundled** — models are architecture-only (random init) until fine-tuned
- **No PII in code** — all examples use synthetic data
- **License**: MIT under v9ai org
- **No API keys required** — runs fully offline with local models

## Publication Plan

- Package name: `salescue`
- GitHub: `v9ai/ai-apps` (monorepo, salescue/ directory)
- PyPI: future publication as `salescue`
- Documentation: generated from docstrings + module-level research descriptions

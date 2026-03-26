"""
Craw4LLM fastText pre-filtering for the RL crawler frontier.

Implements the two-stage URL prioritization architecture from the Craw4LLM
paper (Shi Yu et al., Findings of ACL 2025): a lightweight fastText binary
classifier pre-filters discovered URLs before the DQN agent evaluates them.
This reduces the DQN's action space by 3-10x while preserving high-quality
candidates.

Components:
1. URLCandidate: dataclass representing a frontier URL with context
2. Craw4LLMConfig: configuration for all pre-filter parameters
3. FastTextPreFilter: fastText binary classifier with heuristic fallback
4. QualityCorrelationTracker: parent-child quality correlation (paper: r=0.61)
5. ContentQualityPreFilter: two-stage filter (fastText -> top-K -> DQN)

Key design decisions:
- Graceful fallback to regex-based heuristic if fastText is unavailable
- O(1) scoring per URL (fastText bigram features)
- Online retraining on accumulated crawl data
- Memory: <50 MB for fastText model
- Thread-safe for async crawler workers

Paper reference:
  Shi Yu, Zhiyuan Liu, Chenyan Xiong. "Craw4LLM: Efficient Web Crawling
  for LLM Pretraining." Findings of ACL 2025, pp. 13843-13851.
  arXiv:2502.13347. Code: github.com/cxcscmu/Craw4LLM (MIT).

Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import os
import re
import tempfile
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import numpy as np

logger = logging.getLogger("crawler_craw4llm")


# ======================= Data Classes =========================================

@dataclass
class URLCandidate:
    """A frontier URL with contextual metadata for pre-filtering.

    Carries anchor text, parent quality, and crawl depth alongside
    the URL itself. The fasttext_score is populated by the pre-filter
    stage and consumed by the DQN selector.
    """

    url: str
    anchor_text: str
    parent_quality: float
    depth: int
    fasttext_score: Optional[float] = None


@dataclass
class Craw4LLMConfig:
    """Configuration for the Craw4LLM fastText pre-filter pipeline.

    Tuned for B2B lead-gen crawling on Apple M1 16GB. The default
    top_k=15 matches the DQN agent's typical batch size from
    LinkPreFilter.
    """

    # Path to the fastText .bin model file
    model_path: str = "models/craw4llm_prefilter.bin"

    # Minimum quality score to pass through to DQN (bottom ~70% pruned)
    min_score_threshold: float = 0.3

    # Maximum candidates to forward to DQN per expansion
    top_k: int = 15

    # Retrain the fastText classifier every N scored pages
    retrain_interval: int = 5000

    # Minimum labeled samples before first training run
    min_training_samples: int = 500

    # Track parent-child quality correlation (paper found r=0.61)
    enable_correlation_tracking: bool = True

    # fastText training hyperparameters
    fasttext_lr: float = 0.1
    fasttext_epoch: int = 25
    fasttext_wordNgrams: int = 2
    fasttext_dim: int = 100
    fasttext_minCount: int = 5


# ======================= FastText Pre-Filter ==================================

# Heuristic URL patterns for fallback scoring (no fastText)
_HIGH_VALUE_PATH_RE = re.compile(
    r"/(?:about|team|people|leadership|contact|contact-us|careers|jobs"
    r"|pricing|company|investors|partners|customers|case-studies)/?$",
    re.IGNORECASE,
)
_MEDIUM_VALUE_PATH_RE = re.compile(
    r"/(?:blog|news|resources|features|solutions|products|platform"
    r"|how-it-works|use-cases|integrations)/?",
    re.IGNORECASE,
)
_LOW_VALUE_PATH_RE = re.compile(
    r"/(?:privacy|terms|cookie|legal|login|signin|sign-in|signup|sign-up"
    r"|register|forgot-password|reset-password|unsubscribe|sitemap"
    r"|feed|rss|wp-admin|wp-login|cdn-cgi)",
    re.IGNORECASE,
)
_B2B_ANCHOR_KEYWORDS = frozenset({
    "contact", "contact us", "get in touch", "request demo", "book a demo",
    "talk to sales", "team", "our team", "about us", "leadership",
    "careers", "jobs", "join us", "open positions", "hiring",
    "pricing", "plans", "features", "solutions", "customers",
})


class FastTextPreFilter:
    """FastText binary classifier for URL content quality scoring.

    Trains a supervised fastText model on (text, label) pairs where
    labels are __label__quality and __label__not_quality. At inference
    time, returns the probability that a text snippet (anchor text +
    URL path tokens) belongs to the quality class.

    Falls back to a regex-based heuristic scorer if the fasttext
    Python package is not installed or no model has been trained yet.

    Thread-safe: all mutable state is protected by a threading.Lock.
    """

    def __init__(self, config: Optional[Craw4LLMConfig] = None) -> None:
        self._config = config or Craw4LLMConfig()
        self._model: Any = None  # fasttext model object
        self._lock = threading.Lock()
        self._fasttext_available = False
        self._ft_module: Any = None

        # Try importing fasttext
        try:
            import fasttext as ft
            self._ft_module = ft
            self._fasttext_available = True
            # Suppress fastText's internal warnings about deprecated APIs
            import warnings
            warnings.filterwarnings("ignore", category=UserWarning, module="fasttext")
            logger.info("fastText available, ML-based pre-filtering enabled")
        except ImportError:
            logger.warning(
                "fasttext not installed, falling back to heuristic scoring. "
                "Install with: pip install fasttext"
            )

        # Attempt to load existing model
        if self._fasttext_available and os.path.exists(self._config.model_path):
            self.load_model(self._config.model_path)

    @property
    def is_trained(self) -> bool:
        """Whether a fastText model is loaded and ready for prediction."""
        return self._model is not None

    @property
    def has_fasttext(self) -> bool:
        """Whether the fasttext package is available."""
        return self._fasttext_available

    def train(self, texts: List[str], labels: List[bool]) -> bool:
        """Train or retrain the fastText classifier.

        Writes labeled data to a temporary file in fastText supervised
        format and trains a new model. The old model is replaced
        atomically under the lock.

        Args:
            texts: input text snippets (anchor text + URL tokens).
            labels: True = quality page, False = not quality.

        Returns:
            True if training succeeded, False otherwise.
        """
        if not self._fasttext_available:
            logger.warning("Cannot train: fasttext not installed")
            return False

        if len(texts) < self._config.min_training_samples:
            logger.info(
                "Not enough training samples (%d < %d), skipping training",
                len(texts),
                self._config.min_training_samples,
            )
            return False

        if len(texts) != len(labels):
            logger.error(
                "texts (%d) and labels (%d) must have same length",
                len(texts),
                len(labels),
            )
            return False

        try:
            # Write training data in fastText supervised format
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".txt", delete=False, encoding="utf-8"
            ) as f:
                train_path = f.name
                for text, label in zip(texts, labels):
                    prefix = "__label__quality" if label else "__label__not_quality"
                    # Normalise: lowercase, collapse whitespace
                    cleaned = _normalise_text(text)
                    if cleaned:
                        f.write(f"{prefix} {cleaned}\n")

            # Train the model
            new_model = self._ft_module.train_supervised(
                input=train_path,
                lr=self._config.fasttext_lr,
                epoch=self._config.fasttext_epoch,
                wordNgrams=self._config.fasttext_wordNgrams,
                dim=self._config.fasttext_dim,
                minCount=self._config.fasttext_minCount,
                loss="softmax",
                verbose=0,
            )

            # Atomic swap under lock
            with self._lock:
                self._model = new_model

            logger.info(
                "fastText model trained on %d samples (quality=%d, not_quality=%d)",
                len(texts),
                sum(labels),
                len(labels) - sum(labels),
            )

            # Clean up temp file
            os.unlink(train_path)
            return True

        except Exception as exc:
            logger.error("fastText training failed: %s", exc)
            # Clean up on failure
            if "train_path" in locals():
                try:
                    os.unlink(train_path)
                except OSError:
                    pass
            return False

    def predict(self, text: str) -> float:
        """Score a single text snippet for quality (0-1).

        If fastText is available and a model is loaded, returns the
        classifier's probability for the __label__quality class.
        Otherwise falls back to regex heuristic scoring.

        Args:
            text: anchor text + URL tokens to score.

        Returns:
            Quality probability in [0.0, 1.0].
        """
        with self._lock:
            if self._model is not None:
                return self._predict_fasttext(text)
        return self._predict_heuristic(text)

    def predict_batch(self, texts: List[str]) -> List[float]:
        """Score a batch of text snippets for quality (0-1 each).

        Uses fastText's native batch prediction when available for
        optimal throughput. Falls back to per-item heuristic scoring.

        Args:
            texts: list of text snippets.

        Returns:
            List of quality probabilities, same length as texts.
        """
        if not texts:
            return []

        with self._lock:
            if self._model is not None:
                return self._predict_fasttext_batch(texts)

        return [self._predict_heuristic(t) for t in texts]

    def save_model(self, path: str) -> bool:
        """Persist the trained fastText model to disk.

        Args:
            path: file path for the .bin model file.

        Returns:
            True if saved successfully, False otherwise.
        """
        with self._lock:
            if self._model is None:
                logger.warning("No model to save")
                return False
            try:
                os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
                self._model.save_model(path)
                logger.info("fastText model saved to %s", path)
                return True
            except Exception as exc:
                logger.error("Failed to save model to %s: %s", path, exc)
                return False

    def load_model(self, path: str) -> bool:
        """Load a pre-trained fastText model from disk.

        Args:
            path: file path to the .bin model file.

        Returns:
            True if loaded successfully, False otherwise.
        """
        if not self._fasttext_available:
            logger.warning("Cannot load model: fasttext not installed")
            return False

        if not os.path.exists(path):
            logger.warning("Model file not found: %s", path)
            return False

        try:
            loaded = self._ft_module.load_model(path)
            with self._lock:
                self._model = loaded
            logger.info("fastText model loaded from %s", path)
            return True
        except Exception as exc:
            logger.error("Failed to load model from %s: %s", path, exc)
            return False

    # ---- Internal prediction methods ----------------------------------------

    def _predict_fasttext(self, text: str) -> float:
        """Score with the loaded fastText model. Caller must hold lock."""
        cleaned = _normalise_text(text)
        if not cleaned:
            return 0.0

        labels, probs = self._model.predict(cleaned, k=2)

        # Find the quality label's probability
        for label, prob in zip(labels, probs):
            if label == "__label__quality":
                return float(prob)

        # If __label__quality not in top-2, it has very low probability
        return 0.0

    def _predict_fasttext_batch(self, texts: List[str]) -> List[float]:
        """Batch score with fastText. Caller must hold lock."""
        cleaned = [_normalise_text(t) for t in texts]
        scores: List[float] = []

        for text in cleaned:
            if not text:
                scores.append(0.0)
                continue
            labels, probs = self._model.predict(text, k=2)
            score = 0.0
            for label, prob in zip(labels, probs):
                if label == "__label__quality":
                    score = float(prob)
                    break
            scores.append(score)

        return scores

    def _predict_heuristic(self, text: str) -> float:
        """Regex-based heuristic fallback when fastText is unavailable.

        Scores based on B2B keyword presence in the text and URL
        pattern signals extracted from embedded URL tokens.
        """
        if not text:
            return 0.0

        text_lower = text.strip().lower()
        score = 0.3  # base score for non-empty text

        # B2B keyword matching in anchor/text
        for keyword in _B2B_ANCHOR_KEYWORDS:
            if keyword in text_lower:
                score += 0.2
                break  # one match is enough signal

        # URL path pattern analysis (text often contains URL path tokens)
        if _HIGH_VALUE_PATH_RE.search(text_lower):
            score += 0.3
        elif _MEDIUM_VALUE_PATH_RE.search(text_lower):
            score += 0.15
        elif _LOW_VALUE_PATH_RE.search(text_lower):
            score -= 0.3

        # Penalise very short anchor text (likely generic navigation)
        word_count = len(text_lower.split())
        if word_count <= 1:
            score *= 0.7
        elif word_count >= 4:
            score += 0.05  # descriptive anchors are slightly better

        return float(np.clip(score, 0.0, 1.0))

    def get_stats(self) -> Dict[str, Any]:
        """Return pre-filter status information."""
        return {
            "fasttext_available": self._fasttext_available,
            "model_loaded": self._model is not None,
            "model_path": self._config.model_path,
            "using_heuristic": self._model is None,
        }


# ======================= Quality Correlation Tracker ==========================

class QualityCorrelationTracker:
    """Tracks parent-child quality correlation across the link graph.

    The Craw4LLM paper found a Spearman rho of 0.61 between a parent
    page's quality score and its 1-hop outlinks' scores. This tracker
    maintains a running estimate of that correlation and uses it to
    propagate quality priors to unscored URLs.

    Uses an exponential moving average to adapt to domain-specific
    correlation patterns during the crawl.

    Thread-safe: all mutable state is protected by a threading.Lock.
    """

    def __init__(
        self,
        initial_correlation: float = 0.61,
        ema_alpha: float = 0.05,
        min_samples: int = 50,
    ) -> None:
        """
        Args:
            initial_correlation: starting correlation estimate (paper default).
            ema_alpha: EMA smoothing factor for correlation updates.
            min_samples: minimum parent-child pairs before updating estimate.
        """
        self._correlation = initial_correlation
        self._ema_alpha = ema_alpha
        self._min_samples = min_samples
        self._lock = threading.Lock()

        # Accumulator buffers for batch correlation computation
        self._parent_scores: List[float] = []
        self._child_scores: List[float] = []

        # Statistics
        self._total_updates: int = 0
        self._correlation_history: List[float] = []

    @property
    def correlation(self) -> float:
        """Current estimated parent-child quality correlation."""
        with self._lock:
            return self._correlation

    def update(
        self,
        parent_url: str,
        parent_quality: float,
        child_url: str,
        child_quality: float,
    ) -> None:
        """Record a parent-child quality observation.

        Accumulates pairs and recomputes the running correlation
        estimate once min_samples pairs have been collected.

        Args:
            parent_url: URL of the parent page (for logging only).
            parent_quality: quality score of the parent page (0-1).
            child_url: URL of the child page (for logging only).
            child_quality: quality score of the child page (0-1).
        """
        with self._lock:
            self._parent_scores.append(parent_quality)
            self._child_scores.append(child_quality)

            if len(self._parent_scores) >= self._min_samples:
                self._recompute_correlation()

    def estimate_quality(self, parent_quality: float) -> float:
        """Estimate a child URL's quality from its parent's quality.

        Uses the tracked correlation coefficient as a linear predictor:
            estimated_child = mean_quality + correlation * (parent - mean_quality)

        For simplicity, assumes mean quality ~0.5 (mid-range).

        Args:
            parent_quality: quality score of the parent page (0-1).

        Returns:
            Estimated child quality in [0.0, 1.0].
        """
        mean_quality = 0.5
        with self._lock:
            corr = self._correlation

        estimated = mean_quality + corr * (parent_quality - mean_quality)
        return float(np.clip(estimated, 0.0, 1.0))

    def _recompute_correlation(self) -> None:
        """Recompute Spearman-like correlation from accumulated pairs.

        Uses Pearson correlation on the raw scores (sufficient for
        monotonic relationships). Updates the running estimate via EMA.
        Caller must hold the lock.
        """
        parent_arr = np.array(self._parent_scores, dtype=np.float64)
        child_arr = np.array(self._child_scores, dtype=np.float64)

        # Guard against zero-variance arrays
        if np.std(parent_arr) < 1e-8 or np.std(child_arr) < 1e-8:
            logger.debug(
                "Zero variance in quality scores, keeping current correlation"
            )
            self._parent_scores.clear()
            self._child_scores.clear()
            return

        pearson_r = float(np.corrcoef(parent_arr, child_arr)[0, 1])

        # EMA update
        old_corr = self._correlation
        self._correlation = (
            self._ema_alpha * pearson_r
            + (1.0 - self._ema_alpha) * old_corr
        )

        self._total_updates += 1
        self._correlation_history.append(self._correlation)

        logger.info(
            "Quality correlation updated: %.3f -> %.3f (batch r=%.3f, n=%d, update #%d)",
            old_corr,
            self._correlation,
            pearson_r,
            len(self._parent_scores),
            self._total_updates,
        )

        # Clear buffers
        self._parent_scores.clear()
        self._child_scores.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Return tracker statistics."""
        with self._lock:
            return {
                "current_correlation": round(self._correlation, 4),
                "total_updates": self._total_updates,
                "buffer_size": len(self._parent_scores),
                "min_samples": self._min_samples,
                "recent_history": [
                    round(c, 4) for c in self._correlation_history[-10:]
                ],
            }


# ======================= Content Quality Pre-Filter ===========================

class ContentQualityPreFilter:
    """Two-stage frontier pre-filter inspired by Craw4LLM.

    Stage 1 (fastText): scores all discovered URLs using anchor text
    and URL path tokens via a lightweight fastText classifier (~1 us
    per URL). URLs below min_score_threshold are discarded.

    Stage 2 (top-K selection): the surviving URLs are sorted by score
    and only the top-K are forwarded to the DQN agent for full state
    evaluation (~0.3 ms per ONNX forward pass saved per pruned URL).

    Tracks filter statistics: pruned percentage, pass-through rate,
    score distributions, and retraining triggers.

    Thread-safe for use by async crawler workers.
    """

    def __init__(
        self,
        config: Optional[Craw4LLMConfig] = None,
        prefilter: Optional[FastTextPreFilter] = None,
        correlation_tracker: Optional[QualityCorrelationTracker] = None,
    ) -> None:
        self._config = config or Craw4LLMConfig()
        self._prefilter = prefilter or FastTextPreFilter(self._config)
        self._correlation_tracker = (
            correlation_tracker
            if correlation_tracker is not None
            else (
                QualityCorrelationTracker()
                if self._config.enable_correlation_tracking
                else None
            )
        )

        # Training data accumulator for online retraining
        self._training_texts: List[str] = []
        self._training_labels: List[bool] = []
        self._pages_since_retrain: int = 0
        self._retrain_count: int = 0
        self._train_lock = threading.Lock()

        # Filter statistics
        self._total_input: int = 0
        self._total_output: int = 0
        self._total_pruned_threshold: int = 0
        self._total_pruned_topk: int = 0
        self._filter_calls: int = 0
        self._score_sum: float = 0.0
        self._stats_lock = threading.Lock()

    def filter_frontier(
        self, urls_with_context: List[URLCandidate]
    ) -> List[URLCandidate]:
        """Filter a batch of frontier URLs through the two-stage pipeline.

        Stage 1: fastText scoring on anchor_text + URL path tokens.
        Stage 2: threshold filter + top-K selection.

        Candidates that pass are returned with their fasttext_score
        field populated. Order is by descending score.

        Args:
            urls_with_context: frontier URLs with anchor text and
                parent quality metadata.

        Returns:
            Filtered and scored list of URLCandidates, at most top_k
            entries, sorted by descending fasttext_score.
        """
        if not urls_with_context:
            return []

        config = self._config

        # --- Stage 1: fastText scoring ---
        input_texts = [
            _build_scoring_text(candidate) for candidate in urls_with_context
        ]
        scores = self._prefilter.predict_batch(input_texts)

        # Incorporate parent quality via correlation if available
        if self._correlation_tracker is not None:
            for i, candidate in enumerate(urls_with_context):
                parent_estimate = self._correlation_tracker.estimate_quality(
                    candidate.parent_quality
                )
                # Weighted blend: 70% fastText, 30% parent correlation
                scores[i] = 0.7 * scores[i] + 0.3 * parent_estimate

        # Assign scores to candidates
        scored_candidates: List[Tuple[float, int, URLCandidate]] = []
        for i, candidate in enumerate(urls_with_context):
            candidate.fasttext_score = scores[i]
            scored_candidates.append((scores[i], i, candidate))

        # --- Stage 2: threshold + top-K ---
        # Apply minimum threshold
        above_threshold = [
            (score, idx, cand)
            for score, idx, cand in scored_candidates
            if score >= config.min_score_threshold
        ]
        pruned_by_threshold = len(scored_candidates) - len(above_threshold)

        # If nothing passes threshold, take the top few anyway to avoid starvation
        if not above_threshold and scored_candidates:
            scored_candidates.sort(key=lambda x: x[0], reverse=True)
            above_threshold = scored_candidates[:min(3, len(scored_candidates))]
            pruned_by_threshold = len(scored_candidates) - len(above_threshold)
            logger.debug(
                "No candidates above threshold %.2f, passing top %d anyway",
                config.min_score_threshold,
                len(above_threshold),
            )

        # Sort by score descending, take top-K
        above_threshold.sort(key=lambda x: x[0], reverse=True)
        selected = above_threshold[:config.top_k]
        pruned_by_topk = len(above_threshold) - len(selected)

        result = [cand for _, _, cand in selected]

        # --- Update statistics ---
        with self._stats_lock:
            self._filter_calls += 1
            self._total_input += len(urls_with_context)
            self._total_output += len(result)
            self._total_pruned_threshold += pruned_by_threshold
            self._total_pruned_topk += pruned_by_topk
            self._score_sum += sum(scores)

        logger.debug(
            "Pre-filter: %d -> %d candidates (threshold pruned %d, top-K pruned %d)",
            len(urls_with_context),
            len(result),
            pruned_by_threshold,
            pruned_by_topk,
        )

        return result

    def record_quality_feedback(
        self,
        url: str,
        text: str,
        is_quality: bool,
        parent_url: Optional[str] = None,
        parent_quality: Optional[float] = None,
        child_quality: Optional[float] = None,
    ) -> None:
        """Record a quality label for online retraining.

        Called after the DQN evaluates a page (or after a crawled page
        is scored by ContentQualityScorer). Accumulates training data
        and triggers retraining when retrain_interval is reached.

        Args:
            url: the URL that was evaluated.
            text: anchor text + URL tokens used for scoring.
            is_quality: True if the page was deemed quality.
            parent_url: parent URL (for correlation tracking).
            parent_quality: parent's quality score (for correlation).
            child_quality: this page's quality score (for correlation).
        """
        # Accumulate training data
        scoring_text = _normalise_text(text)
        if scoring_text:
            with self._train_lock:
                self._training_texts.append(scoring_text)
                self._training_labels.append(is_quality)
                self._pages_since_retrain += 1

        # Update correlation tracker
        if (
            self._correlation_tracker is not None
            and parent_url is not None
            and parent_quality is not None
            and child_quality is not None
        ):
            self._correlation_tracker.update(
                parent_url, parent_quality, url, child_quality
            )

        # Check if retraining is due
        with self._train_lock:
            if self._pages_since_retrain >= self._config.retrain_interval:
                self._trigger_retrain()

    def _trigger_retrain(self) -> None:
        """Retrain the fastText model on accumulated data.

        Caller must hold the train_lock.
        """
        texts = list(self._training_texts)
        labels = list(self._training_labels)

        if len(texts) < self._config.min_training_samples:
            logger.info(
                "Retraining skipped: only %d samples (need %d)",
                len(texts),
                self._config.min_training_samples,
            )
            return

        logger.info(
            "Triggering fastText retrain on %d samples (retrain #%d)",
            len(texts),
            self._retrain_count + 1,
        )

        success = self._prefilter.train(texts, labels)
        if success:
            self._retrain_count += 1
            self._pages_since_retrain = 0

            # Save model after successful retrain
            self._prefilter.save_model(self._config.model_path)

            # Keep only the most recent half of training data to avoid
            # unbounded memory growth while retaining some history
            half = len(self._training_texts) // 2
            self._training_texts = self._training_texts[half:]
            self._training_labels = self._training_labels[half:]

    def get_filter_stats(self) -> Dict[str, Any]:
        """Return comprehensive filter statistics.

        Returns:
            Dict with keys: total_input, total_output, total_pruned,
            pruned_by_threshold, pruned_by_topk, filter_calls,
            avg_score, pass_through_rate, pruned_pct, retrain_count,
            training_buffer_size, pages_since_retrain,
            prefilter_stats, correlation_stats.
        """
        with self._stats_lock:
            avg_score = (
                self._score_sum / self._total_input
                if self._total_input > 0
                else 0.0
            )
            pass_rate = (
                self._total_output / self._total_input
                if self._total_input > 0
                else 0.0
            )
            pruned_pct = (
                1.0 - pass_rate if self._total_input > 0 else 0.0
            )

            stats: Dict[str, Any] = {
                "total_input": self._total_input,
                "total_output": self._total_output,
                "total_pruned": self._total_input - self._total_output,
                "pruned_by_threshold": self._total_pruned_threshold,
                "pruned_by_topk": self._total_pruned_topk,
                "filter_calls": self._filter_calls,
                "avg_score": round(avg_score, 4),
                "pass_through_rate": round(pass_rate, 4),
                "pruned_pct": round(pruned_pct, 4),
            }

        with self._train_lock:
            stats["retrain_count"] = self._retrain_count
            stats["training_buffer_size"] = len(self._training_texts)
            stats["pages_since_retrain"] = self._pages_since_retrain

        stats["prefilter_stats"] = self._prefilter.get_stats()

        if self._correlation_tracker is not None:
            stats["correlation_stats"] = self._correlation_tracker.get_stats()

        return stats


# ======================= Helper Functions =====================================

def _normalise_text(text: str) -> str:
    """Normalise text for fastText input.

    Lowercases, collapses whitespace, strips non-alphanumeric characters
    (keeping spaces and basic punctuation). Matches the normalization
    from the Craw4LLM normalizer.py.

    Args:
        text: raw input text.

    Returns:
        Cleaned text string, or empty string if input is empty.
    """
    if not text:
        return ""
    text = text.lower().strip()
    # Replace newlines and tabs with spaces
    text = re.sub(r"[\n\r\t]+", " ", text)
    # Collapse multiple spaces
    text = re.sub(r"\s+", " ", text)
    # Remove control characters but keep basic punctuation
    text = re.sub(r"[^\w\s.,;:!?'\"()-]", "", text)
    return text.strip()


def _build_scoring_text(candidate: URLCandidate) -> str:
    """Build the text snippet used for fastText scoring.

    Combines anchor text with URL path tokens to give the classifier
    both semantic (anchor) and structural (URL) signals.

    Args:
        candidate: URL candidate with anchor text and URL.

    Returns:
        Combined text for fastText scoring.
    """
    parts: List[str] = []

    # Anchor text (primary signal)
    if candidate.anchor_text:
        parts.append(candidate.anchor_text.strip())

    # URL path tokens (secondary signal)
    try:
        parsed = urlparse(candidate.url)
        path = parsed.path.strip("/")
        if path:
            # Split path segments and replace separators with spaces
            path_tokens = path.replace("/", " ").replace("-", " ").replace("_", " ")
            parts.append(path_tokens)

        # Domain name as a weak signal
        if parsed.netloc:
            # Extract main domain parts (skip TLD)
            domain_parts = parsed.netloc.lower().split(".")
            # Keep non-TLD, non-www parts
            meaningful = [
                p for p in domain_parts
                if p not in ("www", "com", "org", "net", "io", "co", "uk", "de", "eu")
            ]
            if meaningful:
                parts.append(" ".join(meaningful))
    except Exception:
        pass

    return " ".join(parts)

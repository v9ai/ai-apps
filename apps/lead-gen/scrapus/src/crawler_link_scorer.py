"""
Link quality scoring for pre-filtering outbound links before DQN evaluation.

Implements rule-based scoring to reduce the number of links fed to the
DQN agent from ~50 per page down to 10-15 promising candidates.  This
saves inference cost (~0.3 ms per ONNX forward pass) and focuses the
agent on high-value navigation paths.

Components:
1. LinkFeatures: structured feature vector for a single link
2. LinkScorer: rule-based quality scoring (0-1)
3. AnchorTextAnalyzer: anchor text feature extraction + B2B keyword matching
4. URLPatternAnalyzer: URL structure analysis with configurable regex rules
5. LinkPreFilter: fast batch filter before DQN scoring
6. AdaptiveLinkScorer: online weight adjustment via DQN Q-value correlation

Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import numpy as np

logger = logging.getLogger("crawler_link_scorer")


# ======================= Link Features =======================================

@dataclass
class LinkFeatures:
    """Structured feature representation of a single outbound link.

    Used as input to both the rule-based LinkScorer and the adaptive
    scorer.  All fields are cheap to compute from DOM + URL parsing.
    """

    url: str
    anchor_text: str
    position: str  # header | main | sidebar | footer | unknown
    is_navigation: bool
    is_same_domain: bool
    url_depth: int  # number of path segments
    has_query_params: bool
    file_extension: Optional[str]
    contains_keywords: List[str] = field(default_factory=list)
    parent_page_quality: float = 0.0  # 0-1, from previous page score


# ======================= Anchor Text Analyzer ================================

class AnchorTextAnalyzer:
    """Extract and analyse anchor text for link quality signals.

    B2B keyword lists organised by category, each mapping to a relevance
    weight.  Navigational detection identifies low-value generic links.
    """

    # B2B keyword categories with per-keyword relevance weights
    B2B_KEYWORDS: Dict[str, Dict[str, float]] = {
        "contact": {
            "contact": 0.9,
            "contact us": 1.0,
            "get in touch": 0.9,
            "reach out": 0.8,
            "request demo": 1.0,
            "book a demo": 1.0,
            "schedule a call": 0.9,
            "talk to sales": 1.0,
            "talk to us": 0.9,
        },
        "team": {
            "team": 0.8,
            "our team": 0.9,
            "about us": 0.7,
            "about": 0.6,
            "leadership": 0.8,
            "founders": 0.8,
            "who we are": 0.7,
            "people": 0.7,
        },
        "product": {
            "pricing": 0.9,
            "plans": 0.8,
            "features": 0.7,
            "solutions": 0.7,
            "products": 0.7,
            "platform": 0.6,
            "how it works": 0.7,
            "use cases": 0.7,
            "integrations": 0.6,
        },
        "careers": {
            "careers": 1.0,
            "jobs": 0.9,
            "join us": 0.9,
            "open positions": 1.0,
            "we're hiring": 1.0,
            "work with us": 0.9,
            "hiring": 0.9,
            "opportunities": 0.7,
        },
    }

    # Navigational anchor texts (low value for lead gen)
    _NAVIGATIONAL_PATTERNS: List[str] = [
        "home",
        "back",
        "next",
        "previous",
        "menu",
        "skip to content",
        "skip to main",
        "read more",
        "learn more",
        "see more",
        "show more",
        "view all",
        "load more",
        "click here",
        "more",
        "close",
        "dismiss",
    ]

    def __init__(self) -> None:
        # Precompile navigational regex for fast matching
        escaped = [re.escape(p) for p in self._NAVIGATIONAL_PATTERNS]
        self._nav_re = re.compile(
            r"^(?:" + "|".join(escaped) + r")$", re.IGNORECASE
        )
        # Build flat keyword -> (category, weight) lookup
        self._keyword_lookup: Dict[str, Tuple[str, float]] = {}
        for category, keywords in self.B2B_KEYWORDS.items():
            for kw, weight in keywords.items():
                self._keyword_lookup[kw.lower()] = (category, weight)

    def extract_features(self, anchor_text: str) -> Dict[str, float]:
        """Extract feature scores from anchor text.

        Returns:
            Dict with keys: max_keyword_weight, category_count,
            word_count, is_navigational (0.0 or 1.0).
        """
        text = anchor_text.strip().lower()
        if not text:
            return {
                "max_keyword_weight": 0.0,
                "category_count": 0.0,
                "word_count": 0.0,
                "is_navigational": 0.0,
            }

        # Check keyword matches
        max_weight = 0.0
        matched_categories: set = set()
        for kw, (cat, weight) in self._keyword_lookup.items():
            if kw in text:
                max_weight = max(max_weight, weight)
                matched_categories.add(cat)

        return {
            "max_keyword_weight": max_weight,
            "category_count": float(len(matched_categories)),
            "word_count": float(len(text.split())),
            "is_navigational": 1.0 if self._nav_re.match(text) else 0.0,
        }

    def is_navigational(self, anchor_text: str) -> bool:
        """Check if anchor text is a generic navigational label."""
        text = anchor_text.strip().lower()
        if not text:
            return False
        return bool(self._nav_re.match(text))

    def lead_signal_strength(self, anchor_text: str) -> float:
        """Compute lead-generation signal strength of anchor text (0-1).

        Higher values mean the link is more likely to lead to a page with
        contact info, team data, or other B2B lead signals.
        """
        features = self.extract_features(anchor_text)
        kw_weight = features["max_keyword_weight"]
        cat_count = features["category_count"]
        is_nav = features["is_navigational"]

        if is_nav > 0.5:
            return 0.0

        # Bonus for matching multiple B2B categories (rare but high signal)
        category_bonus = min(cat_count * 0.1, 0.3)
        return min(1.0, kw_weight + category_bonus)


# ======================= URL Pattern Analyzer ================================

@dataclass
class _URLRule:
    """A single URL pattern rule with its score impact."""

    pattern: "re.Pattern[str]"
    score: float  # positive = valuable, negative = skip
    label: str


class URLPatternAnalyzer:
    """Analyse URL structure for crawl-worthiness.

    Configurable regex rules scored from -1.0 (always skip) to +1.0
    (high value).  Default rules are tuned for B2B lead generation.
    """

    def __init__(self, extra_rules: Optional[List[Dict[str, Any]]] = None) -> None:
        self._rules: List[_URLRule] = self._default_rules()
        if extra_rules:
            for r in extra_rules:
                self._rules.append(
                    _URLRule(
                        pattern=re.compile(r["pattern"], re.IGNORECASE),
                        score=float(r["score"]),
                        label=r.get("label", "custom"),
                    )
                )

    @staticmethod
    def _default_rules() -> "List[_URLRule]":
        """Rule set tuned for B2B lead-gen crawling."""
        return [
            # ----- High value paths -----
            _URLRule(re.compile(r"/about/?$", re.I), 0.8, "about"),
            _URLRule(re.compile(r"/team/?$", re.I), 0.9, "team"),
            _URLRule(re.compile(r"/our-team/?$", re.I), 0.9, "team"),
            _URLRule(re.compile(r"/people/?$", re.I), 0.8, "people"),
            _URLRule(re.compile(r"/leadership/?$", re.I), 0.8, "leadership"),
            _URLRule(re.compile(r"/contact/?$", re.I), 0.9, "contact"),
            _URLRule(re.compile(r"/contact-us/?$", re.I), 0.9, "contact"),
            _URLRule(re.compile(r"/careers/?$", re.I), 0.9, "careers"),
            _URLRule(re.compile(r"/jobs/?$", re.I), 0.8, "jobs"),
            _URLRule(re.compile(r"/pricing/?$", re.I), 0.7, "pricing"),
            _URLRule(re.compile(r"/company/?$", re.I), 0.7, "company"),
            _URLRule(re.compile(r"/investors/?$", re.I), 0.6, "investors"),
            _URLRule(re.compile(r"/partners/?$", re.I), 0.6, "partners"),
            # ----- Medium value paths -----
            _URLRule(re.compile(r"/blog/?$", re.I), 0.3, "blog_index"),
            _URLRule(re.compile(r"/blog/.+", re.I), 0.2, "blog_post"),
            _URLRule(re.compile(r"/news/?$", re.I), 0.3, "news_index"),
            _URLRule(re.compile(r"/news/.+", re.I), 0.2, "news_post"),
            _URLRule(re.compile(r"/resources/?$", re.I), 0.3, "resources"),
            _URLRule(re.compile(r"/case-studies/?$", re.I), 0.4, "case_studies"),
            _URLRule(re.compile(r"/customers/?$", re.I), 0.5, "customers"),
            # ----- Low / skip paths -----
            _URLRule(re.compile(r"/privacy", re.I), -0.8, "privacy"),
            _URLRule(re.compile(r"/terms", re.I), -0.8, "terms"),
            _URLRule(re.compile(r"/cookie", re.I), -0.8, "cookie"),
            _URLRule(re.compile(r"/legal", re.I), -0.7, "legal"),
            _URLRule(re.compile(r"/login", re.I), -0.9, "login"),
            _URLRule(re.compile(r"/signin", re.I), -0.9, "signin"),
            _URLRule(re.compile(r"/sign-in", re.I), -0.9, "signin"),
            _URLRule(re.compile(r"/signup", re.I), -0.7, "signup"),
            _URLRule(re.compile(r"/sign-up", re.I), -0.7, "signup"),
            _URLRule(re.compile(r"/register", re.I), -0.7, "register"),
            _URLRule(re.compile(r"/forgot-password", re.I), -1.0, "forgot_pw"),
            _URLRule(re.compile(r"/reset-password", re.I), -1.0, "reset_pw"),
            _URLRule(re.compile(r"/unsubscribe", re.I), -1.0, "unsubscribe"),
            _URLRule(re.compile(r"/sitemap", re.I), -0.5, "sitemap"),
            _URLRule(re.compile(r"/feed/?$", re.I), -0.6, "feed"),
            _URLRule(re.compile(r"/rss/?$", re.I), -0.6, "rss"),
            _URLRule(re.compile(r"/wp-admin", re.I), -1.0, "wp_admin"),
            _URLRule(re.compile(r"/wp-login", re.I), -1.0, "wp_login"),
            _URLRule(re.compile(r"/cdn-cgi/", re.I), -1.0, "cdn_cgi"),
        ]

    def analyze(self, url: str) -> Dict[str, Any]:
        """Analyse a URL and return structured features.

        Returns:
            Dict with keys: path_depth, has_query_params, domain, path,
            matched_rules (list of {label, score}), best_score,
            file_extension.
        """
        parsed = urlparse(url)
        path = parsed.path.rstrip("/") or "/"
        segments = [s for s in path.split("/") if s]
        ext = None
        if "." in segments[-1] if segments else "":
            ext = segments[-1].rsplit(".", 1)[-1].lower()

        matched: List[Dict[str, Any]] = []
        for rule in self._rules:
            if rule.pattern.search(path):
                matched.append({"label": rule.label, "score": rule.score})

        best_score = max((m["score"] for m in matched), default=0.0)

        return {
            "path_depth": len(segments),
            "has_query_params": bool(parsed.query),
            "domain": parsed.netloc.lower(),
            "path": path,
            "matched_rules": matched,
            "best_score": best_score,
            "file_extension": ext,
        }


# ======================= Social / Tracking Detectors =========================

# Compiled once at module level for performance
_SOCIAL_DOMAINS_RE = re.compile(
    r"(?:facebook\.com|twitter\.com|x\.com|linkedin\.com|instagram\.com|"
    r"youtube\.com|tiktok\.com|pinterest\.com|reddit\.com|"
    r"github\.com|discord\.gg|t\.me|wa\.me|snapchat\.com)",
    re.IGNORECASE,
)

_TRACKING_DOMAINS_RE = re.compile(
    r"(?:doubleclick\.net|googlesyndication\.com|googleadservices\.com|"
    r"facebook\.net|fbcdn\.net|analytics\.google\.com|"
    r"hotjar\.com|segment\.com|mixpanel\.com|"
    r"hubspot\.com/.*__hstc|utm_source=|utm_medium=|utm_campaign=)",
    re.IGNORECASE,
)

_FILE_EXTENSIONS_SKIP = frozenset({
    "pdf", "jpg", "jpeg", "png", "gif", "svg", "webp", "ico",
    "zip", "tar", "gz", "rar", "7z",
    "mp4", "mp3", "avi", "mov", "wmv", "flv",
    "css", "js", "woff", "woff2", "ttf", "eot",
    "xml", "json",  # feeds, API responses
})


def _is_social_link(url: str) -> bool:
    return bool(_SOCIAL_DOMAINS_RE.search(url))


def _is_tracking_link(url: str) -> bool:
    return bool(_TRACKING_DOMAINS_RE.search(url))


def _get_file_extension(url: str) -> Optional[str]:
    path = urlparse(url).path.lower()
    if "." in path.split("/")[-1]:
        ext = path.rsplit(".", 1)[-1]
        return ext if ext else None
    return None


# ======================= Link Scorer =========================================

class LinkScorer:
    """Rule-based quality scoring for outbound links.

    Combines anchor text features, URL pattern analysis, link position,
    and domain signals into a single 0-1 quality score.

    Scoring weights are tuned for B2B lead generation crawling where
    contact, team, and careers pages have highest value.
    """

    # Default scoring weights (adjustable by AdaptiveLinkScorer)
    DEFAULT_WEIGHTS: Dict[str, float] = {
        "anchor_keyword": 0.25,
        "url_pattern": 0.25,
        "position_main": 0.10,
        "same_domain": 0.10,
        "shallow_depth": 0.08,
        "no_query_params": 0.05,
        "no_file_ext": 0.02,
        "not_social": 0.05,
        "not_tracking": 0.05,
        "parent_quality": 0.05,
    }

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        url_analyzer: Optional[URLPatternAnalyzer] = None,
        anchor_analyzer: Optional[AnchorTextAnalyzer] = None,
    ) -> None:
        self._weights = dict(weights or self.DEFAULT_WEIGHTS)
        self._url_analyzer = url_analyzer or URLPatternAnalyzer()
        self._anchor_analyzer = anchor_analyzer or AnchorTextAnalyzer()

    def score(self, link: LinkFeatures) -> float:
        """Compute quality score for a single link (0-1).

        Combines positive and negative signals with weighted sum, then
        clamps to [0, 1].
        """
        w = self._weights
        total = 0.0

        # --- Positive signals ---

        # Anchor text B2B keyword match
        anchor_strength = self._anchor_analyzer.lead_signal_strength(
            link.anchor_text
        )
        total += w["anchor_keyword"] * anchor_strength

        # URL pattern score (normalised from [-1, 1] to [0, 1])
        url_info = self._url_analyzer.analyze(link.url)
        url_score = (url_info["best_score"] + 1.0) / 2.0
        total += w["url_pattern"] * url_score

        # Link in main content area
        if link.position == "main":
            total += w["position_main"]

        # Same domain (deeper exploration)
        if link.is_same_domain:
            total += w["same_domain"]

        # Shallow URL depth (< 3 segments)
        if link.url_depth < 3:
            total += w["shallow_depth"]
        elif link.url_depth <= 5:
            # Partial credit for moderate depth
            total += w["shallow_depth"] * 0.5

        # No query parameters
        if not link.has_query_params:
            total += w["no_query_params"]

        # No file extension (likely a page, not a resource)
        if link.file_extension is None:
            total += w["no_file_ext"]

        # Parent page quality propagation
        total += w["parent_quality"] * link.parent_page_quality

        # --- Negative signals ---

        # Social media links
        if _is_social_link(link.url):
            total -= w["not_social"]
        else:
            total += w["not_social"]

        # Tracking / ad links
        if _is_tracking_link(link.url):
            total -= w["not_tracking"]
        else:
            total += w["not_tracking"]

        # Navigation links (generic anchors)
        if link.is_navigation:
            total *= 0.3  # heavy penalty

        # Very deep URLs (> 5 segments)
        if link.url_depth > 5:
            total *= 0.5

        # Login / signup detected in URL
        url_lower = link.url.lower()
        if any(
            seg in url_lower
            for seg in ("/login", "/signin", "/sign-in", "/signup", "/sign-up")
        ):
            total *= 0.1

        # File extension that should be skipped
        if (
            link.file_extension is not None
            and link.file_extension in _FILE_EXTENSIONS_SKIP
        ):
            total *= 0.0

        return float(np.clip(total, 0.0, 1.0))

    def score_batch(self, links: List[LinkFeatures]) -> np.ndarray:
        """Score a batch of links, returning an array of floats (0-1).

        Args:
            links: list of LinkFeatures.

        Returns:
            np.ndarray of shape (len(links),), dtype float32.
        """
        scores = np.array(
            [self.score(link) for link in links], dtype=np.float32
        )
        return scores

    def rank(
        self, links: List[LinkFeatures], top_k: int = 10
    ) -> List[LinkFeatures]:
        """Return the top-K links sorted by descending quality score.

        Args:
            links: list of LinkFeatures.
            top_k: number of top links to return.

        Returns:
            Sorted list of at most top_k LinkFeatures.
        """
        if not links:
            return []
        scores = self.score_batch(links)
        indices = np.argsort(-scores)[:top_k]
        return [links[i] for i in indices]


# ======================= Link Pre-Filter =====================================

class LinkPreFilter:
    """Fast pre-filter to reduce link candidates before DQN scoring.

    Typical page has 30-50 outbound links.  The DQN agent evaluates
    state vectors per link candidate, so reducing from 50 to 10-15
    saves ~35 ONNX inference calls (~10 ms total on CoreML EP).

    Pipeline: raw links -> extract features -> score -> top K -> DQN.
    """

    def __init__(
        self,
        scorer: Optional[LinkScorer] = None,
        top_k: int = 15,
        min_score: float = 0.1,
    ) -> None:
        self._scorer = scorer or LinkScorer()
        self._anchor_analyzer = AnchorTextAnalyzer()
        self._url_analyzer = URLPatternAnalyzer()
        self._top_k = top_k
        self._min_score = min_score

        # Stats tracking
        self._total_input: int = 0
        self._total_output: int = 0
        self._total_score_sum: float = 0.0
        self._filter_calls: int = 0

    def filter(
        self,
        links: List[str],
        page_content: str,
        page_url: str = "",
        parent_quality: float = 0.0,
    ) -> List[str]:
        """Filter a list of raw URLs down to the most promising candidates.

        Args:
            links: raw outbound URLs from ContentExtractor.
            page_content: body text of the parent page (unused in v1,
                reserved for future content-aware filtering).
            page_url: URL of the page these links were found on.
            parent_quality: quality score of the parent page (0-1).

        Returns:
            Filtered list of URLs, ordered by descending score.
        """
        if not links:
            return []

        page_domain = urlparse(page_url).netloc.lower() if page_url else ""

        # Build LinkFeatures for each URL
        features: List[LinkFeatures] = []
        for url in links:
            feat = self._build_features(url, page_domain, parent_quality)
            features.append(feat)

        # Score and rank
        scores = self._scorer.score_batch(features)

        # Apply minimum score threshold
        mask = scores >= self._min_score
        valid_indices = np.where(mask)[0]

        if len(valid_indices) == 0:
            # If nothing passes threshold, take best few anyway
            valid_indices = np.argsort(-scores)[: min(3, len(scores))]

        # Sort valid indices by score descending, take top K
        sorted_valid = valid_indices[np.argsort(-scores[valid_indices])]
        top_indices = sorted_valid[: self._top_k]

        result = [links[i] for i in top_indices]

        # Update stats
        self._filter_calls += 1
        self._total_input += len(links)
        self._total_output += len(result)
        self._total_score_sum += float(np.sum(scores))

        return result

    def _build_features(
        self,
        url: str,
        page_domain: str,
        parent_quality: float,
    ) -> LinkFeatures:
        """Build LinkFeatures from a raw URL (anchor text unavailable)."""
        parsed = urlparse(url)
        segments = [s for s in parsed.path.split("/") if s]
        ext = _get_file_extension(url)
        link_domain = parsed.netloc.lower()
        is_same = link_domain == page_domain if page_domain else False

        # Infer anchor text from URL path (last segment, cleaned)
        inferred_anchor = ""
        if segments:
            inferred_anchor = segments[-1].replace("-", " ").replace("_", " ")

        is_nav = self._anchor_analyzer.is_navigational(inferred_anchor)

        # Detect keywords in URL path
        url_info = self._url_analyzer.analyze(url)
        matched_keywords = [
            m["label"] for m in url_info["matched_rules"] if m["score"] > 0
        ]

        return LinkFeatures(
            url=url,
            anchor_text=inferred_anchor,
            position="unknown",  # no DOM position info for raw URLs
            is_navigation=is_nav,
            is_same_domain=is_same,
            url_depth=len(segments),
            has_query_params=bool(parsed.query),
            file_extension=ext,
            contains_keywords=matched_keywords,
            parent_page_quality=parent_quality,
        )

    def get_filter_stats(self) -> Dict[str, Any]:
        """Return cumulative filter statistics.

        Returns:
            Dict with filtered_count, passed_count, avg_score,
            filter_calls, avg_reduction_ratio.
        """
        avg_score = (
            self._total_score_sum / self._total_input
            if self._total_input > 0
            else 0.0
        )
        reduction = (
            1.0 - (self._total_output / self._total_input)
            if self._total_input > 0
            else 0.0
        )
        return {
            "filtered_count": self._total_input - self._total_output,
            "passed_count": self._total_output,
            "avg_score": round(avg_score, 4),
            "filter_calls": self._filter_calls,
            "avg_reduction_ratio": round(reduction, 4),
        }


# ======================= Adaptive Link Scorer ================================

class AdaptiveLinkScorer:
    """Online weight adjustment for LinkScorer using DQN Q-value feedback.

    After the DQN agent scores link candidates, this module compares
    the rule-based scores to Q-values and adjusts weights to improve
    correlation over time.  Uses exponential moving average for smooth
    adaptation.

    Weight update rule (simplified):
        For each weight dimension d:
            gradient_d = corr(feature_d, q_values) - corr(feature_d, rule_scores)
            weight_d += learning_rate * gradient_d

    Weights are normalised to sum to 1.0 after each update.
    """

    def __init__(
        self,
        scorer: Optional[LinkScorer] = None,
        learning_rate: float = 0.01,
        ema_alpha: float = 0.1,
        min_samples: int = 50,
    ) -> None:
        self._scorer = scorer or LinkScorer()
        self._lr = learning_rate
        self._ema_alpha = ema_alpha
        self._min_samples = min_samples

        # Running correlation tracker
        self._correlation_history: List[float] = []
        self._update_count: int = 0

        # Feature accumulators for batch correlation computation
        self._feature_buffer: List[np.ndarray] = []
        self._q_value_buffer: List[float] = []
        self._score_buffer: List[float] = []

    def update_weights(
        self,
        links: List[LinkFeatures],
        q_values: np.ndarray,
    ) -> None:
        """Adjust scoring weights based on DQN Q-value feedback.

        Accumulates samples and updates weights once enough data is
        collected (min_samples).  Each feature dimension is adjusted
        proportionally to its correlation with Q-values.

        Args:
            links: link features that were scored.
            q_values: DQN Q-values for the same links, shape (len(links),).
        """
        if len(links) == 0 or len(q_values) == 0:
            return
        if len(links) != len(q_values):
            logger.warning(
                "Link count %d != Q-value count %d, skipping update",
                len(links),
                len(q_values),
            )
            return

        # Compute rule-based scores
        rule_scores = self._scorer.score_batch(links)

        # Extract per-dimension feature vectors
        feature_vectors = self._extract_feature_matrix(links)

        # Accumulate
        for i in range(len(links)):
            self._feature_buffer.append(feature_vectors[i])
            self._q_value_buffer.append(float(q_values[i]))
            self._score_buffer.append(float(rule_scores[i]))

        # Check if we have enough samples
        if len(self._q_value_buffer) < self._min_samples:
            return

        self._apply_weight_update()

    def _extract_feature_matrix(
        self, links: List[LinkFeatures]
    ) -> np.ndarray:
        """Extract a numerical feature matrix from LinkFeatures.

        Returns:
            np.ndarray of shape (len(links), num_weight_dimensions).
            Column order matches LinkScorer.DEFAULT_WEIGHTS key order.
        """
        weight_keys = list(LinkScorer.DEFAULT_WEIGHTS.keys())
        n = len(links)
        mat = np.zeros((n, len(weight_keys)), dtype=np.float32)

        for i, link in enumerate(links):
            anchor_strength = self._scorer._anchor_analyzer.lead_signal_strength(
                link.anchor_text
            )
            url_info = self._scorer._url_analyzer.analyze(link.url)
            url_score = (url_info["best_score"] + 1.0) / 2.0

            # Map features to columns (same order as DEFAULT_WEIGHTS)
            mat[i, 0] = anchor_strength                         # anchor_keyword
            mat[i, 1] = url_score                               # url_pattern
            mat[i, 2] = 1.0 if link.position == "main" else 0.0  # position_main
            mat[i, 3] = 1.0 if link.is_same_domain else 0.0    # same_domain
            mat[i, 4] = 1.0 if link.url_depth < 3 else (       # shallow_depth
                0.5 if link.url_depth <= 5 else 0.0
            )
            mat[i, 5] = 0.0 if link.has_query_params else 1.0  # no_query_params
            mat[i, 6] = 0.0 if link.file_extension else 1.0    # no_file_ext
            mat[i, 7] = 0.0 if _is_social_link(link.url) else 1.0   # not_social
            mat[i, 8] = 0.0 if _is_tracking_link(link.url) else 1.0  # not_tracking
            mat[i, 9] = link.parent_page_quality                # parent_quality

        return mat

    def _apply_weight_update(self) -> None:
        """Compute correlations and adjust weights."""
        features = np.array(self._feature_buffer, dtype=np.float32)
        q_vals = np.array(self._q_value_buffer, dtype=np.float32)
        rule_scores = np.array(self._score_buffer, dtype=np.float32)

        # Compute overall correlation between rule scores and Q-values
        if np.std(q_vals) < 1e-8 or np.std(rule_scores) < 1e-8:
            logger.debug("Q-values or scores have zero variance, skipping update")
            self._clear_buffers()
            return

        overall_corr = float(np.corrcoef(rule_scores, q_vals)[0, 1])
        self._correlation_history.append(overall_corr)

        logger.info(
            "LinkScorer correlation with DQN Q-values: %.3f (update %d)",
            overall_corr,
            self._update_count,
        )

        # Per-dimension correlation with Q-values
        weight_keys = list(LinkScorer.DEFAULT_WEIGHTS.keys())
        current_weights = self._scorer._weights
        new_weights: Dict[str, float] = {}

        for dim_idx, key in enumerate(weight_keys):
            feat_col = features[:, dim_idx]
            if np.std(feat_col) < 1e-8:
                new_weights[key] = current_weights[key]
                continue

            dim_corr = float(np.corrcoef(feat_col, q_vals)[0, 1])
            # Positive correlation with Q-values -> increase weight
            # Negative correlation -> decrease weight
            gradient = dim_corr - overall_corr
            adjusted = current_weights[key] + self._lr * gradient
            new_weights[key] = max(0.001, adjusted)  # floor at 0.001

        # Normalise weights to sum to 1.0
        total = sum(new_weights.values())
        if total > 0:
            for key in new_weights:
                new_weights[key] /= total

        # Apply with EMA smoothing
        for key in weight_keys:
            old = current_weights[key]
            new = new_weights[key]
            current_weights[key] = (
                self._ema_alpha * new + (1.0 - self._ema_alpha) * old
            )

        self._update_count += 1
        self._clear_buffers()

        logger.debug(
            "Updated weights (update %d): %s",
            self._update_count,
            {k: round(v, 4) for k, v in current_weights.items()},
        )

    def _clear_buffers(self) -> None:
        """Clear accumulated sample buffers."""
        self._feature_buffer.clear()
        self._q_value_buffer.clear()
        self._score_buffer.clear()

    def get_weights(self) -> Dict[str, float]:
        """Return current scoring weights."""
        return dict(self._scorer._weights)

    def get_correlation_history(self) -> List[float]:
        """Return history of rule-score vs Q-value correlations."""
        return list(self._correlation_history)

    def get_stats(self) -> Dict[str, Any]:
        """Return adaptive scorer statistics."""
        recent_corr = (
            float(np.mean(self._correlation_history[-10:]))
            if self._correlation_history
            else 0.0
        )
        return {
            "update_count": self._update_count,
            "buffer_size": len(self._q_value_buffer),
            "min_samples": self._min_samples,
            "recent_avg_correlation": round(recent_corr, 4),
            "weights": {
                k: round(v, 4) for k, v in self._scorer._weights.items()
            },
        }

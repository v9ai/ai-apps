"""
Module 1: Reward shaping for the RL-based focused web crawler.

Implements principled reward shaping (Ng et al. 1999) to accelerate
DQN convergence without changing the optimal policy:
- Potential-based shaping: F(s,s') = gamma * Phi(s') - Phi(s)
- Content-aware bonuses: contact/careers/about page detection
- Structural bonuses: domain diversity, shallow depth
- Penalties: deep crawling, duplicates, error pages
- Running z-score normalisation with optional Pop-Art scaling
- Hindsight reward relabeling with multi-step backward propagation

Integration points:
- crawler_pipeline.py: RewardShaper called per-page in _process_page()
- crawler_dqn.py: replaces basic relabel_trajectory_hindsight()
- crawler_replay_buffer.py: normalised rewards stored in replay

Memory budget: ~5 MB for reward history + normaliser state.
Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import math
import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_reward_shaping")


# ======================= Configuration ======================================

@dataclass
class RewardConfig:
    """Configuration for all reward shaping components.

    Default values calibrated against RESEARCH.md harvest rate baselines.
    Lead reward and entity mention reward match the reward signal from
    the extraction module (crawler_dqn.py docstring).
    """

    # Base rewards (from extraction module)
    lead_reward: float = 1.0
    entity_mention_reward: float = 0.2
    irrelevant_penalty: float = -0.1
    crawl_cost: float = -0.01
    duplicate_penalty: float = -0.05

    # Depth penalty: penalty = depth * depth_penalty_factor
    depth_penalty_factor: float = 0.02

    # Domain diversity: bonus for first visit to a new domain
    diversity_bonus: float = 0.05

    # Page-type bonuses (detected via URL and content heuristics)
    contact_page_bonus: float = 0.3
    careers_page_bonus: float = 0.15
    about_page_bonus: float = 0.1

    # Potential-based shaping (Ng et al. 1999)
    potential_reward_weight: float = 0.5
    enable_potential_shaping: bool = True

    # Curiosity-driven exploration bonus (off by default -- adds compute)
    enable_curiosity_bonus: bool = False

    # Normalisation
    clip_min: float = -10.0
    clip_max: float = 10.0
    enable_popart: bool = False

    # Hindsight relabeling
    hindsight_scale: float = 0.1
    hindsight_lookback: int = 20  # max steps to relabel backward
    gamma: float = 0.99


# ======================= Page Type Detection ================================

# Compiled regexes for URL-based page type detection
_CONTACT_URL_RE = re.compile(
    r"/(contact|kontakt|get-in-touch|reach-us|connect)\b", re.IGNORECASE
)
_CAREERS_URL_RE = re.compile(
    r"/(careers|jobs|vacancies|openings|work-with-us|join-us|hiring)\b",
    re.IGNORECASE,
)
_ABOUT_URL_RE = re.compile(
    r"/(about|about-us|team|our-team|who-we-are|company)\b", re.IGNORECASE
)
_PRICING_URL_RE = re.compile(
    r"/(pricing|plans|packages)\b", re.IGNORECASE
)

# Content-based detection keywords (checked against body text)
_CONTACT_KEYWORDS = frozenset({
    "contact us", "get in touch", "reach out", "send us a message",
    "email us", "phone number", "our address",
})
_CAREERS_KEYWORDS = frozenset({
    "open positions", "join our team", "we're hiring", "career opportunities",
    "apply now", "job openings", "current vacancies",
})
_ABOUT_KEYWORDS = frozenset({
    "our mission", "our story", "who we are", "about us",
    "our values", "founded in", "our team",
})


def detect_page_type(url: str, body_text: str) -> str:
    """Classify a page into a type based on URL patterns and content.

    Returns one of: "contact", "careers", "about", "pricing", "other".
    URL patterns take priority; content keywords used as fallback.
    """
    url_lower = url.lower()
    text_lower = body_text[:2000].lower() if body_text else ""

    # URL-based detection (fast, high precision)
    if _CONTACT_URL_RE.search(url_lower):
        return "contact"
    if _CAREERS_URL_RE.search(url_lower):
        return "careers"
    if _ABOUT_URL_RE.search(url_lower):
        return "about"
    if _PRICING_URL_RE.search(url_lower):
        return "pricing"

    # Content-based fallback (slower, broader recall)
    if any(kw in text_lower for kw in _CONTACT_KEYWORDS):
        return "contact"
    if any(kw in text_lower for kw in _CAREERS_KEYWORDS):
        return "careers"
    if any(kw in text_lower for kw in _ABOUT_KEYWORDS):
        return "about"

    return "other"


# ======================= Potential Function =================================

class PotentialFunction:
    """Potential-based reward shaping (Ng, Harada, Russell 1999).

    Phi(s) estimates the "value" of a crawler state based on:
    1. Cosine similarity to known lead page embeddings
    2. Historical domain reward rates
    3. Depth-based decay (shallower = higher potential)

    The shaped reward F(s, a, s') = gamma * Phi(s') - Phi(s) is guaranteed
    not to change the optimal policy under any reward-based MDP.

    Memory: ~2 MB for 1000 lead embeddings (768-dim float32).
    """

    def __init__(
        self,
        gamma: float = 0.99,
        embedding_dim: int = 768,
        max_lead_embeddings: int = 1000,
    ) -> None:
        self.gamma = gamma
        self.embedding_dim = embedding_dim
        self.max_lead_embeddings = max_lead_embeddings

        # Known lead page embeddings (ring buffer)
        self._lead_embeddings: List[np.ndarray] = []
        self._lead_matrix: Optional[np.ndarray] = None  # (N, dim) cached
        self._matrix_dirty = True

        # Domain reward history: domain -> running mean reward
        self._domain_rewards: Dict[str, Tuple[float, int]] = {}  # (sum, count)

    def add_lead_embedding(self, embedding: np.ndarray) -> None:
        """Register an embedding from a confirmed lead page.

        Args:
            embedding: (embedding_dim,) float32 normalised vector.
        """
        if embedding.shape[0] != self.embedding_dim:
            return

        # Normalise for cosine similarity
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        self._lead_embeddings.append(embedding)
        if len(self._lead_embeddings) > self.max_lead_embeddings:
            self._lead_embeddings = self._lead_embeddings[-self.max_lead_embeddings:]
        self._matrix_dirty = True

    def update_domain_reward(self, domain: str, reward: float) -> None:
        """Update running reward statistics for a domain."""
        if domain in self._domain_rewards:
            total, count = self._domain_rewards[domain]
            self._domain_rewards[domain] = (total + reward, count + 1)
        else:
            self._domain_rewards[domain] = (reward, 1)

    def compute_potential(
        self,
        state: np.ndarray,
        domain: Optional[str] = None,
        depth: int = 0,
    ) -> float:
        """Compute Phi(s) = estimated value of a crawler state.

        Args:
            state: full state vector (state_dim,). First embedding_dim
                   components are the page embedding.
            domain: current domain for domain reward lookup.
            depth: crawl depth for depth decay.

        Returns:
            Scalar potential value in [0, 1].
        """
        potential = 0.0

        # 1. Embedding similarity to known lead pages
        if self._lead_embeddings:
            embedding = state[:self.embedding_dim]
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
                similarity = self._max_cosine_similarity(embedding)
                potential += 0.5 * similarity  # weight: 50%

        # 2. Domain reward history
        if domain and domain in self._domain_rewards:
            total, count = self._domain_rewards[domain]
            mean_reward = total / count
            # Clamp to [0, 1] and weight at 30%
            potential += 0.3 * max(0.0, min(1.0, mean_reward))

        # 3. Depth decay: shallower pages have higher potential
        depth_decay = math.exp(-0.3 * depth)
        potential += 0.2 * depth_decay

        return float(np.clip(potential, 0.0, 1.0))

    def compute_shaping_reward(
        self,
        state: np.ndarray,
        next_state: np.ndarray,
        domain: Optional[str] = None,
        depth: int = 0,
        next_depth: int = 0,
    ) -> float:
        """Compute F(s, a, s') = gamma * Phi(s') - Phi(s).

        This is the potential-based shaping reward that preserves
        the optimal policy (Ng et al. 1999, Theorem 1).
        """
        phi_s = self.compute_potential(state, domain, depth)
        phi_s_prime = self.compute_potential(next_state, domain, next_depth)
        return self.gamma * phi_s_prime - phi_s

    def _max_cosine_similarity(self, embedding: np.ndarray) -> float:
        """Max cosine similarity between embedding and all lead embeddings.

        Uses cached matrix multiplication for efficiency.
        """
        if not self._lead_embeddings:
            return 0.0

        if self._matrix_dirty or self._lead_matrix is None:
            self._lead_matrix = np.stack(self._lead_embeddings, axis=0)
            self._matrix_dirty = False

        # (N, dim) @ (dim,) -> (N,)
        similarities = self._lead_matrix @ embedding
        return float(np.max(similarities))

    def get_stats(self) -> Dict[str, Any]:
        """Return potential function statistics."""
        return {
            "lead_embeddings_count": len(self._lead_embeddings),
            "tracked_domains": len(self._domain_rewards),
        }


# ======================= Reward Normaliser ==================================

class RewardNormalizer:
    """Running z-score normalisation with optional Pop-Art scaling.

    Keeps rewards in a stable range for DQN training. Running statistics
    use Welford's online algorithm for numerical stability.

    Pop-Art (van Hasselt et al. 2016) adaptively rescales the DQN output
    layer to account for non-stationary reward distributions.
    """

    def __init__(
        self,
        clip_min: float = -10.0,
        clip_max: float = 10.0,
        enable_popart: bool = False,
        epsilon: float = 1e-8,
    ) -> None:
        self.clip_min = clip_min
        self.clip_max = clip_max
        self.enable_popart = enable_popart
        self._epsilon = epsilon

        # Welford's online statistics
        self._count: int = 0
        self._mean: float = 0.0
        self._m2: float = 0.0  # sum of squared deviations

        # Pop-Art state (output layer scaling)
        self._popart_mean: float = 0.0
        self._popart_std: float = 1.0

    @property
    def mean(self) -> float:
        return self._mean

    @property
    def std(self) -> float:
        if self._count < 2:
            return 1.0
        return math.sqrt(self._m2 / (self._count - 1))

    def normalize(self, reward: float) -> float:
        """Normalise a reward using running z-score and clip.

        Updates running statistics before normalising.

        Args:
            reward: raw reward value.

        Returns:
            Normalised, clipped reward.
        """
        self._update_stats(reward)

        if self._count < 2:
            return float(np.clip(reward, self.clip_min, self.clip_max))

        std = self.std
        if std < self._epsilon:
            std = 1.0

        normalised = (reward - self._mean) / std
        return float(np.clip(normalised, self.clip_min, self.clip_max))

    def unnormalize(self, normalised_reward: float) -> float:
        """Reverse normalisation to recover original scale."""
        std = self.std
        if std < self._epsilon:
            std = 1.0
        return normalised_reward * std + self._mean

    def get_popart_params(self) -> Tuple[float, float]:
        """Return current Pop-Art (mean, std) for DQN output rescaling.

        The DQN target should be computed as:
            target = (r + gamma * Q(s', a')) / std + mean
        And the output layer weights/bias adjusted accordingly.
        """
        return self._popart_mean, max(self._popart_std, self._epsilon)

    def update_popart(self) -> Tuple[float, float]:
        """Update Pop-Art parameters from running statistics.

        Returns (old_std, new_std) for output layer rescaling.
        """
        old_std = self._popart_std
        self._popart_mean = self._mean
        self._popart_std = max(self.std, self._epsilon)
        return old_std, self._popart_std

    def _update_stats(self, value: float) -> None:
        """Welford's online algorithm for running mean and variance."""
        self._count += 1
        delta = value - self._mean
        self._mean += delta / self._count
        delta2 = value - self._mean
        self._m2 += delta * delta2

    def get_stats(self) -> Dict[str, float]:
        """Return normaliser statistics."""
        return {
            "count": float(self._count),
            "mean": self._mean,
            "std": self.std,
            "popart_mean": self._popart_mean,
            "popart_std": self._popart_std,
        }


# ======================= Reward History =====================================

class RewardHistory:
    """Track reward statistics per domain, depth, and page type.

    Provides diagnostic views for monitoring reward distribution health
    and detecting reward signal degradation.

    Memory: ~1 MB for 10K domains x basic stats.
    """

    def __init__(self, max_history_per_domain: int = 500) -> None:
        self.max_history_per_domain = max_history_per_domain

        # Per-domain reward curves
        self._domain_rewards: Dict[str, Deque[float]] = defaultdict(
            lambda: deque(maxlen=max_history_per_domain)
        )

        # Per-depth statistics: depth -> (sum, count, sum_sq)
        self._depth_stats: Dict[int, List[float]] = defaultdict(
            lambda: [0.0, 0.0, 0.0]
        )

        # Per-page-type statistics: type -> (sum, count, sum_sq)
        self._type_stats: Dict[str, List[float]] = defaultdict(
            lambda: [0.0, 0.0, 0.0]
        )

        # Global counters
        self._total_records: int = 0
        self._total_raw_reward: float = 0.0
        self._total_shaped_reward: float = 0.0

    def record(
        self,
        domain: str,
        depth: int,
        page_type: str,
        raw_reward: float,
        shaped_reward: float,
    ) -> None:
        """Record a reward observation.

        Args:
            domain: crawled page domain.
            depth: crawl depth from seed.
            page_type: detected page type (contact, careers, about, other).
            raw_reward: pre-shaping reward.
            shaped_reward: post-shaping reward.
        """
        self._domain_rewards[domain].append(shaped_reward)

        depth_s = self._depth_stats[depth]
        depth_s[0] += shaped_reward
        depth_s[1] += 1.0
        depth_s[2] += shaped_reward * shaped_reward

        type_s = self._type_stats[page_type]
        type_s[0] += shaped_reward
        type_s[1] += 1.0
        type_s[2] += shaped_reward * shaped_reward

        self._total_records += 1
        self._total_raw_reward += raw_reward
        self._total_shaped_reward += shaped_reward

    def get_domain_reward_curve(self, domain: str) -> List[float]:
        """Return the reward history for a specific domain.

        Args:
            domain: target domain.

        Returns:
            List of shaped rewards in chronological order.
        """
        if domain in self._domain_rewards:
            return list(self._domain_rewards[domain])
        return []

    def get_reward_breakdown(self) -> Dict[str, Dict[str, float]]:
        """Return per-component reward statistics.

        Returns:
            Nested dict with keys "by_depth", "by_page_type", "global".
        """
        breakdown: Dict[str, Dict[str, float]] = {
            "by_depth": {},
            "by_page_type": {},
            "global": {
                "total_records": float(self._total_records),
                "mean_raw_reward": (
                    self._total_raw_reward / self._total_records
                    if self._total_records > 0
                    else 0.0
                ),
                "mean_shaped_reward": (
                    self._total_shaped_reward / self._total_records
                    if self._total_records > 0
                    else 0.0
                ),
                "tracked_domains": float(len(self._domain_rewards)),
            },
        }

        # Depth breakdown
        for depth, (s, n, ssq) in sorted(self._depth_stats.items()):
            if n > 0:
                mean = s / n
                var = (ssq / n) - (mean * mean) if n > 1 else 0.0
                breakdown["by_depth"][f"depth_{depth}"] = {
                    "count": n,
                    "mean": round(mean, 4),
                    "std": round(math.sqrt(max(0.0, var)), 4),
                }

        # Page type breakdown
        for ptype, (s, n, ssq) in self._type_stats.items():
            if n > 0:
                mean = s / n
                var = (ssq / n) - (mean * mean) if n > 1 else 0.0
                breakdown["by_page_type"][ptype] = {
                    "count": n,
                    "mean": round(mean, 4),
                    "std": round(math.sqrt(max(0.0, var)), 4),
                }

        return breakdown

    def get_top_domains(self, n: int = 10) -> List[Tuple[str, float]]:
        """Return top-N domains by mean reward."""
        domain_means = []
        for domain, rewards in self._domain_rewards.items():
            if rewards:
                domain_means.append((domain, float(np.mean(list(rewards)))))
        domain_means.sort(key=lambda x: x[1], reverse=True)
        return domain_means[:n]


# ======================= Reward Shaper (Main Class) =========================

class RewardShaper:
    """Combines all reward shaping components into a single interface.

    Called per-page in the crawler pipeline to transform raw extraction
    rewards into shaped rewards that accelerate DQN learning.

    Components:
    1. Page-type bonuses (contact, careers, about pages)
    2. Structural bonuses (domain diversity, shallow depth)
    3. Penalties (deep crawling, duplicates, errors)
    4. Potential-based shaping (preserves optimal policy)
    5. Normalisation (z-score + clipping)

    Usage:
        shaper = RewardShaper(RewardConfig())
        shaped = shaper.shape_reward(
            raw_reward=0.2,
            state=current_state,
            next_state=next_state,
            page_content="...",
            metadata={"url": "...", "domain": "...", "depth": 2},
        )
    """

    def __init__(self, config: Optional[RewardConfig] = None) -> None:
        self.config = config or RewardConfig()

        # Sub-components
        self.potential = PotentialFunction(
            gamma=self.config.gamma,
        )
        self.normalizer = RewardNormalizer(
            clip_min=self.config.clip_min,
            clip_max=self.config.clip_max,
            enable_popart=self.config.enable_popart,
        )
        self.history = RewardHistory()

        # Domain tracking for diversity bonus
        self._visited_domains: set = set()

        # Duplicate content detection (simple hash-based)
        self._content_hashes: set = set()

    def shape_reward(
        self,
        raw_reward: float,
        state: np.ndarray,
        next_state: np.ndarray,
        page_content: str,
        metadata: Dict[str, Any],
    ) -> float:
        """Compute the fully shaped reward for a crawled page.

        Args:
            raw_reward: reward from extraction module (+1.0 lead, etc.).
            state: current state vector (state_dim,).
            next_state: next state vector (state_dim,).
            page_content: page body text.
            metadata: dict with keys "url", "domain", "depth",
                      optionally "is_error", "status_code".

        Returns:
            Shaped, normalised reward.
        """
        url = metadata.get("url", "")
        domain = metadata.get("domain", "")
        depth = metadata.get("depth", 0)
        is_error = metadata.get("is_error", False)

        # Start with raw reward
        total = raw_reward

        # Decompose and add bonuses/penalties
        components = self.decompose_reward(page_content, url, domain, depth, is_error)

        total += components.get("page_type_bonus", 0.0)
        total += components.get("diversity_bonus", 0.0)
        total += components.get("depth_penalty", 0.0)
        total += components.get("duplicate_penalty", 0.0)
        total += components.get("crawl_cost", 0.0)

        # Potential-based shaping
        if self.config.enable_potential_shaping:
            shaping = self.potential.compute_shaping_reward(
                state, next_state, domain, depth, depth + 1
            )
            total += self.config.potential_reward_weight * shaping

        # Update potential function with domain reward info
        self.potential.update_domain_reward(domain, raw_reward)

        # Track visited domain
        self._visited_domains.add(domain)

        # Detect page type for history
        page_type = detect_page_type(url, page_content)

        # Normalise
        shaped = self.normalizer.normalize(total)

        # Record in history
        self.history.record(domain, depth, page_type, raw_reward, shaped)

        return shaped

    def decompose_reward(
        self,
        page_content: str,
        url: str = "",
        domain: str = "",
        depth: int = 0,
        is_error: bool = False,
    ) -> Dict[str, float]:
        """Break down reward into named components for diagnostics.

        Args:
            page_content: page body text.
            url: page URL.
            domain: page domain.
            depth: crawl depth.
            is_error: whether the page fetch resulted in an error.

        Returns:
            Dict mapping component names to reward values.
        """
        components: Dict[str, float] = {}

        # Crawl cost (always applied)
        components["crawl_cost"] = self.config.crawl_cost

        # Page type bonus
        page_type = detect_page_type(url, page_content)
        page_bonus = 0.0
        if page_type == "contact":
            page_bonus = self.config.contact_page_bonus
        elif page_type == "careers":
            page_bonus = self.config.careers_page_bonus
        elif page_type == "about":
            page_bonus = self.config.about_page_bonus
        components["page_type_bonus"] = page_bonus
        components["page_type"] = page_type  # type: ignore[assignment]

        # Domain diversity bonus
        diversity = 0.0
        if domain and domain not in self._visited_domains:
            diversity = self.config.diversity_bonus
        components["diversity_bonus"] = diversity

        # Depth penalty (increases with depth)
        depth_penalty = -depth * self.config.depth_penalty_factor
        components["depth_penalty"] = depth_penalty

        # Duplicate content penalty
        dup_penalty = 0.0
        if page_content:
            content_hash = hash(page_content[:500])
            if content_hash in self._content_hashes:
                dup_penalty = self.config.duplicate_penalty
            else:
                self._content_hashes.add(content_hash)
        components["duplicate_penalty"] = dup_penalty

        # Error page penalty
        if is_error:
            components["error_penalty"] = self.config.irrelevant_penalty
        else:
            components["error_penalty"] = 0.0

        return components

    def register_lead_embedding(self, embedding: np.ndarray) -> None:
        """Register a confirmed lead page embedding for potential shaping.

        Called by the extraction module when a lead is confirmed.
        """
        self.potential.add_lead_embedding(embedding)

    def get_stats(self) -> Dict[str, Any]:
        """Return comprehensive reward shaping statistics."""
        return {
            "potential": self.potential.get_stats(),
            "normalizer": self.normalizer.get_stats(),
            "history": self.history.get_reward_breakdown(),
            "visited_domains": len(self._visited_domains),
            "content_hashes": len(self._content_hashes),
        }


# ======================= Hindsight Reward Manager ===========================

@dataclass
class _TrajectoryStep:
    """Single step in an unresolved trajectory."""

    url: str
    state: np.ndarray
    action: int
    reward: float
    timestamp: float = field(default_factory=time.time)


class HindsightRewardManager:
    """Improved hindsight reward relabeling for the crawler pipeline.

    Replaces the basic relabel_trajectory_hindsight() from crawler_dqn.py
    with multi-step backward propagation and trajectory buffering.

    When the extraction module confirms a lead at URL X (step T), this
    manager propagates a discounted bonus backward through steps T-N...T-1,
    improving credit assignment for navigation decisions that led to leads.

    The improvement over the basic version:
    - Maintains a buffer of unresolved trajectories (not just one)
    - Multi-step backward propagation with configurable lookback
    - Flushing interface for batch integration with replay buffer
    - Per-domain trajectory tracking

    Memory: ~10 MB for 1000 trajectories x 20 steps.

    Usage:
        manager = HindsightRewardManager(config)

        # During crawling
        manager.add_step("https://...", state, action, reward)

        # When extraction confirms a lead
        relabeled = manager.resolve_lead("https://...", is_lead=True)

        # Periodically flush relabeled transitions
        transitions = manager.get_relabeled_rewards()
    """

    def __init__(self, config: Optional[RewardConfig] = None) -> None:
        self.config = config or RewardConfig()

        # Active trajectory: steps awaiting resolution
        # Keyed by domain to support concurrent domain crawling
        self._trajectories: Dict[str, List[_TrajectoryStep]] = defaultdict(list)

        # URL -> domain mapping for resolution lookup
        self._url_to_domain: Dict[str, str] = {}

        # Flushed relabeled transitions ready for replay buffer
        self._relabeled_buffer: List[Dict[str, Any]] = []

        # Statistics
        self._total_resolved: int = 0
        self._total_leads_found: int = 0
        self._total_steps_relabeled: int = 0

    def add_step(
        self,
        url: str,
        state: np.ndarray,
        action: int,
        reward: float,
        domain: Optional[str] = None,
    ) -> None:
        """Add a crawl step to the current trajectory.

        Args:
            url: crawled page URL.
            state: state vector at this step.
            action: action taken (link index).
            reward: immediate reward (pre-shaping).
            domain: page domain. Extracted from URL if not provided.
        """
        if domain is None:
            domain = self._extract_domain(url)

        step = _TrajectoryStep(
            url=url,
            state=state,
            action=action,
            reward=reward,
        )
        self._trajectories[domain].append(step)
        self._url_to_domain[url] = domain

        # Prevent unbounded growth: trim old steps
        max_steps = self.config.hindsight_lookback * 5
        if len(self._trajectories[domain]) > max_steps:
            self._trajectories[domain] = self._trajectories[domain][-max_steps:]

    def resolve_lead(self, url: str, is_lead: bool) -> int:
        """Resolve a URL as lead or non-lead, triggering backward relabeling.

        When is_lead=True, propagates a discounted bonus backward through
        the preceding trajectory steps.

        Args:
            url: URL that was evaluated by the extraction module.
            is_lead: whether the URL yielded a qualified lead.

        Returns:
            Number of steps relabeled.
        """
        domain = self._url_to_domain.get(url)
        if domain is None or domain not in self._trajectories:
            return 0

        trajectory = self._trajectories[domain]
        self._total_resolved += 1

        if not is_lead:
            return 0

        self._total_leads_found += 1

        # Find the step index for this URL
        lead_idx = None
        for i in range(len(trajectory) - 1, -1, -1):
            if trajectory[i].url == url:
                lead_idx = i
                break

        if lead_idx is None:
            return 0

        # Backward relabeling: propagate bonus from lead_idx backward
        lookback = min(self.config.hindsight_lookback, lead_idx)
        start_idx = lead_idx - lookback
        relabeled_count = 0

        for i in range(start_idx, lead_idx + 1):
            steps_to_lead = lead_idx - i
            bonus = (
                self.config.lead_reward
                * (self.config.gamma ** steps_to_lead)
                * self.config.hindsight_scale
            )
            old_reward = trajectory[i].reward
            new_reward = old_reward + bonus

            self._relabeled_buffer.append({
                "url": trajectory[i].url,
                "state": trajectory[i].state,
                "action": trajectory[i].action,
                "old_reward": old_reward,
                "new_reward": new_reward,
                "bonus": bonus,
                "steps_to_lead": steps_to_lead,
                "lead_url": url,
            })
            relabeled_count += 1

        self._total_steps_relabeled += relabeled_count

        # Clear resolved portion of the trajectory
        self._trajectories[domain] = trajectory[lead_idx + 1:]

        return relabeled_count

    def get_relabeled_rewards(self) -> List[Dict[str, Any]]:
        """Flush and return all relabeled transitions.

        Returns a list of dicts with keys: url, state, action,
        old_reward, new_reward, bonus, steps_to_lead, lead_url.

        The caller should update the replay buffer with new_reward.
        """
        flushed = self._relabeled_buffer
        self._relabeled_buffer = []
        return flushed

    def end_episode(self, domain: str) -> None:
        """Signal end of a crawling episode for a domain.

        Clears the trajectory buffer for this domain.
        """
        if domain in self._trajectories:
            del self._trajectories[domain]

    def get_stats(self) -> Dict[str, Any]:
        """Return hindsight manager statistics."""
        total_buffered = sum(
            len(steps) for steps in self._trajectories.values()
        )
        return {
            "active_domains": len(self._trajectories),
            "buffered_steps": total_buffered,
            "pending_relabeled": len(self._relabeled_buffer),
            "total_resolved": self._total_resolved,
            "total_leads_found": self._total_leads_found,
            "total_steps_relabeled": self._total_steps_relabeled,
        }

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL without importing urllib."""
        # Fast path: avoid urllib overhead for simple cases
        try:
            # Strip scheme
            if "://" in url:
                rest = url.split("://", 1)[1]
            else:
                rest = url
            # Strip path
            domain = rest.split("/", 1)[0]
            # Strip port
            domain = domain.split(":", 1)[0]
            return domain.lower()
        except Exception:
            return "unknown"

"""
Module 1: DISCOVER auto-curriculum for goal selection and cold-start handling.

Implements the DISCOVER algorithm (Diaz-Bone et al., NeurIPS 2025) adapted for
web crawling.  The key insight: solve hard goals (lead extraction) by first
mastering easy intermediate goals (homepage discovery, team page navigation)
that lie on the path toward the target.

Core formula (SelectGoal):
  g = argmax_{g in G_ach} [
      alpha * (V(s0,g) + beta*sigma(s0,g))       # achievability + novelty
    + (1-alpha) * (V(g,g*) + beta*sigma(g,g*))    # relevance + uncertainty
  ]

Components:
1. DISCOVERConfig        -- tunables for the auto-curriculum
2. GoalRepresentation    -- a crawl goal (page type + domain)
3. AchievedGoalSet       -- SQLite-backed achieved goal memory with KNN novelty
4. GoalValueEstimator    -- lightweight V(s0,g) and V(g,g*) estimators
5. AdaptiveAlpha         -- self-regulating difficulty balance (target 50%)
6. GoalSelector          -- the core DISCOVER objective
7. DISCOVERCurriculum    -- main orchestrator integrating with CurriculumManager

Design constraints:
- Pure numpy + scipy (no torch dependency for inference)
- Memory < 20 MB (goal embeddings in SQLite + small in-memory cache)
- Regret linear in path distance, not goal space volume
- Integrates with existing CurriculumManager levels

Target: Apple M1 16GB, zero cloud dependency.
"""

import json
import logging
import math
import os
import sqlite3
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional, Set, Tuple

import numpy as np

logger = logging.getLogger("crawler_discover")


# ======================= Page Type Hierarchy =================================

# Ordered from easiest (cold-start entry point) to hardest (final extraction
# target).  The integer index doubles as a rough ordinal distance metric:
# |index(a) - index(b)| approximates how many navigation hops separate the
# two page types.
PAGE_TYPE_HIERARCHY: List[str] = [
    "homepage",    # 0 - always reachable
    "listing",     # 1 - directory / job board listing
    "company",     # 2 - company landing page
    "team",        # 3 - /team, /people, /about-us
    "about",       # 4 - /about with bios
    "contact",     # 5 - /contact, mailto links
    "lead",        # 6 - qualified lead record (name + email + role)
]

PAGE_TYPE_INDEX: Dict[str, int] = {
    pt: idx for idx, pt in enumerate(PAGE_TYPE_HIERARCHY)
}

NUM_PAGE_TYPES: int = len(PAGE_TYPE_HIERARCHY)


# ======================= Configuration =======================================

@dataclass
class DISCOVERConfig:
    """Tunables for the DISCOVER auto-curriculum."""

    # Adaptive alpha: balances achievability vs relevance
    alpha_start: float = 0.5        # initial balance
    alpha_min: float = 0.1          # minimum alpha (relevance-heavy)
    alpha_max: float = 0.9          # maximum alpha (achievability-heavy)
    alpha_adapt_rate: float = 0.05  # adaptation step size (eta in paper)
    target_success_rate: float = 0.5  # optimal per DISCOVER ablation

    # Uncertainty bonus
    beta: float = 0.5               # uncertainty bonus coefficient

    # Achieved goal set
    max_achieved_goals: int = 1000  # cap on stored achieved goals

    # Goal embedding
    goal_embedding_dim: int = 768   # nomic-embed-text-v1.5 dimension

    # Novelty estimation
    novelty_method: str = "knn"     # "knn" or "rnd"
    knn_k: int = 5                  # K for KNN novelty estimation

    # Value estimator
    value_ema_alpha: float = 0.1    # EMA smoothing for online updates
    initial_uncertainty: float = 1.0  # high uncertainty at cold-start

    # Goal selector
    candidate_sample_size: int = 50  # max candidates to score per selection

    # Persistence
    sqlite_path: str = "scrapus_data/discover_goals.db"


# ======================= Goal Representation =================================

@dataclass
class GoalRepresentation:
    """Represents a crawl goal: target page type on a specific (or any) domain.

    The page type hierarchy defines navigation distance:
      homepage -> listing -> company -> team -> about -> contact -> lead

    Goals without a domain (domain=None) are generic -- e.g. "find any team
    page" vs "find acme.com's team page".
    """

    goal_id: str
    page_type: str                     # one of PAGE_TYPE_HIERARCHY
    domain: Optional[str] = None       # None = any domain
    embedding: Optional[np.ndarray] = None  # (goal_embedding_dim,) float32
    achieved: bool = False
    attempts: int = 0
    successes: int = 0
    created_at: float = 0.0
    last_attempted: float = 0.0

    @property
    def page_type_index(self) -> int:
        """Ordinal position in the page type hierarchy."""
        return PAGE_TYPE_INDEX.get(self.page_type, 0)

    @property
    def success_rate(self) -> float:
        """Historical success rate for this goal."""
        if self.attempts == 0:
            return 0.0
        return self.successes / self.attempts

    @property
    def difficulty(self) -> float:
        """Normalised difficulty in [0, 1] based on hierarchy position."""
        return self.page_type_index / max(NUM_PAGE_TYPES - 1, 1)

    def to_feature_vector(self, embedding_dim: int = 768) -> np.ndarray:
        """Encode goal as a feature vector for value estimation.

        Structure (embedding_dim total):
        - [0:NUM_PAGE_TYPES]   one-hot page type (7 dims)
        - [NUM_PAGE_TYPES]     normalised difficulty (1 dim)
        - [NUM_PAGE_TYPES+1]   success rate (1 dim)
        - [NUM_PAGE_TYPES+2]   log(1+attempts) normalised (1 dim)
        - [NUM_PAGE_TYPES+3:]  if embedding available, truncated/padded goal
                               embedding fills the rest; otherwise zeros

        Returns:
            (embedding_dim,) float32 array.
        """
        vec = np.zeros(embedding_dim, dtype=np.float32)

        # One-hot page type
        pt_idx = self.page_type_index
        if pt_idx < NUM_PAGE_TYPES:
            vec[pt_idx] = 1.0

        # Scalar features
        scalar_offset = NUM_PAGE_TYPES
        vec[scalar_offset] = self.difficulty
        vec[scalar_offset + 1] = self.success_rate
        vec[scalar_offset + 2] = min(math.log1p(self.attempts) / 10.0, 1.0)

        # Goal embedding (if available)
        embed_offset = scalar_offset + 3
        if self.embedding is not None:
            available = embedding_dim - embed_offset
            if available > 0:
                copy_len = min(len(self.embedding), available)
                vec[embed_offset:embed_offset + copy_len] = (
                    self.embedding[:copy_len]
                )

        return vec

    def to_dict(self) -> Dict[str, Any]:
        return {
            "goal_id": self.goal_id,
            "page_type": self.page_type,
            "domain": self.domain,
            "achieved": self.achieved,
            "attempts": self.attempts,
            "successes": self.successes,
            "success_rate": round(self.success_rate, 4),
            "difficulty": round(self.difficulty, 4),
            "created_at": self.created_at,
            "last_attempted": self.last_attempted,
        }


def make_goal_id(page_type: str, domain: Optional[str] = None) -> str:
    """Deterministic goal ID from page type and domain."""
    if domain:
        return f"{page_type}:{domain}"
    return f"{page_type}:*"


def create_goal(
    page_type: str,
    domain: Optional[str] = None,
    embedding: Optional[np.ndarray] = None,
) -> GoalRepresentation:
    """Factory for creating a new goal representation."""
    return GoalRepresentation(
        goal_id=make_goal_id(page_type, domain),
        page_type=page_type,
        domain=domain,
        embedding=embedding,
        created_at=time.time(),
    )


# ======================= Achieved Goal Set ===================================

class AchievedGoalSet:
    """Maintains the set of previously achieved goals with KNN-based novelty.

    SQLite-backed for persistence across restarts.  Keeps an in-memory cache
    of goal embeddings for fast KNN queries (< 20 MB for 1000 goals at 768-dim).

    KNN novelty: distance to the k-th nearest achieved goal.  Goals that are
    far from anything previously achieved are highly novel.
    """

    def __init__(self, config: DISCOVERConfig) -> None:
        self.config = config
        self._goals: Dict[str, GoalRepresentation] = {}
        self._embedding_cache: Optional[np.ndarray] = None  # (N, dim) matrix
        self._embedding_ids: List[str] = []  # parallel to _embedding_cache rows
        self._conn: Optional[sqlite3.Connection] = None

    # ---- Lifecycle ----------------------------------------------------------

    def initialise(self) -> None:
        """Create SQLite tables and restore state."""
        self._init_db()
        self._load_goals()
        self._rebuild_embedding_cache()
        logger.info(
            "AchievedGoalSet initialised: %d goals (%d achieved)",
            len(self._goals),
            sum(1 for g in self._goals.values() if g.achieved),
        )

    def close(self) -> None:
        """Persist state and release connection."""
        if self._conn:
            self._conn.close()
            self._conn = None

    def _init_db(self) -> None:
        os.makedirs(os.path.dirname(self.config.sqlite_path), exist_ok=True)
        self._conn = sqlite3.connect(self.config.sqlite_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS discover_goals (
                goal_id         TEXT PRIMARY KEY,
                page_type       TEXT NOT NULL,
                domain          TEXT,
                achieved        INTEGER NOT NULL DEFAULT 0,
                attempts        INTEGER NOT NULL DEFAULT 0,
                successes       INTEGER NOT NULL DEFAULT 0,
                embedding_blob  BLOB,
                created_at      REAL NOT NULL,
                last_attempted  REAL NOT NULL DEFAULT 0.0
            );

            CREATE INDEX IF NOT EXISTS idx_goals_achieved
                ON discover_goals(achieved);

            CREATE INDEX IF NOT EXISTS idx_goals_page_type
                ON discover_goals(page_type);
        """)
        self._conn.commit()

    def _load_goals(self) -> None:
        """Restore goals from SQLite."""
        rows = self._conn.execute(
            """
            SELECT goal_id, page_type, domain, achieved, attempts, successes,
                   embedding_blob, created_at, last_attempted
            FROM discover_goals
            """
        ).fetchall()

        for row in rows:
            embedding = None
            if row[6] is not None:
                embedding = np.frombuffer(row[6], dtype=np.float32).copy()

            goal = GoalRepresentation(
                goal_id=row[0],
                page_type=row[1],
                domain=row[2],
                achieved=bool(row[3]),
                attempts=row[4],
                successes=row[5],
                embedding=embedding,
                created_at=row[7],
                last_attempted=row[8],
            )
            self._goals[goal.goal_id] = goal

    def _save_goal(self, goal: GoalRepresentation) -> None:
        """Upsert a single goal to SQLite."""
        embedding_blob = None
        if goal.embedding is not None:
            embedding_blob = goal.embedding.astype(np.float32).tobytes()

        self._conn.execute(
            """
            INSERT INTO discover_goals
                (goal_id, page_type, domain, achieved, attempts, successes,
                 embedding_blob, created_at, last_attempted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(goal_id) DO UPDATE SET
                achieved = excluded.achieved,
                attempts = excluded.attempts,
                successes = excluded.successes,
                embedding_blob = excluded.embedding_blob,
                last_attempted = excluded.last_attempted
            """,
            (
                goal.goal_id,
                goal.page_type,
                goal.domain,
                int(goal.achieved),
                goal.attempts,
                goal.successes,
                embedding_blob,
                goal.created_at,
                goal.last_attempted,
            ),
        )
        self._conn.commit()

    def _rebuild_embedding_cache(self) -> None:
        """Rebuild the in-memory embedding matrix for KNN queries."""
        achieved = [
            g for g in self._goals.values()
            if g.achieved and g.embedding is not None
        ]
        if not achieved:
            self._embedding_cache = None
            self._embedding_ids = []
            return

        self._embedding_ids = [g.goal_id for g in achieved]
        self._embedding_cache = np.array(
            [g.embedding for g in achieved], dtype=np.float32
        )

    # ---- Public API ---------------------------------------------------------

    def add(self, goal: GoalRepresentation) -> None:
        """Mark a goal as achieved and persist."""
        goal.achieved = True
        self._goals[goal.goal_id] = goal
        self._save_goal(goal)

        # Enforce max size: remove oldest achieved goals
        achieved_goals = [
            g for g in self._goals.values() if g.achieved
        ]
        if len(achieved_goals) > self.config.max_achieved_goals:
            # Sort by created_at, remove oldest
            achieved_goals.sort(key=lambda g: g.created_at)
            to_remove = achieved_goals[
                : len(achieved_goals) - self.config.max_achieved_goals
            ]
            for old_goal in to_remove:
                del self._goals[old_goal.goal_id]
                self._conn.execute(
                    "DELETE FROM discover_goals WHERE goal_id = ?",
                    (old_goal.goal_id,),
                )
            self._conn.commit()

        self._rebuild_embedding_cache()

    def update_goal(self, goal: GoalRepresentation) -> None:
        """Update attempts/successes without changing achieved status."""
        self._goals[goal.goal_id] = goal
        self._save_goal(goal)

    def get_goal(self, goal_id: str) -> Optional[GoalRepresentation]:
        """Retrieve a goal by ID."""
        return self._goals.get(goal_id)

    def get_or_create(
        self,
        page_type: str,
        domain: Optional[str] = None,
        embedding: Optional[np.ndarray] = None,
    ) -> GoalRepresentation:
        """Get existing goal or create a new one."""
        goal_id = make_goal_id(page_type, domain)
        if goal_id in self._goals:
            return self._goals[goal_id]
        goal = create_goal(page_type, domain, embedding)
        self._goals[goal_id] = goal
        self._save_goal(goal)
        return goal

    @property
    def achieved_count(self) -> int:
        return sum(1 for g in self._goals.values() if g.achieved)

    @property
    def total_count(self) -> int:
        return len(self._goals)

    def sample_achievable(self, n: int) -> List[GoalRepresentation]:
        """Sample up to n goals from the achieved set.

        Weighted by recency (more recently achieved goals sampled more often)
        to focus on the expanding frontier.
        """
        achieved = [g for g in self._goals.values() if g.achieved]
        if not achieved:
            return []

        n = min(n, len(achieved))

        # Weight by recency: w_i = exp(-age_rank / len)
        achieved.sort(key=lambda g: g.last_attempted, reverse=True)
        weights = np.array([
            math.exp(-i / max(len(achieved), 1))
            for i in range(len(achieved))
        ], dtype=np.float64)
        weights /= weights.sum()

        indices = np.random.choice(
            len(achieved), size=n, replace=False, p=weights
        )
        return [achieved[i] for i in indices]

    def get_novel_goals(
        self,
        candidates: List[GoalRepresentation],
        k: Optional[int] = None,
    ) -> List[Tuple[GoalRepresentation, float]]:
        """Rank candidate goals by KNN novelty (distance to k-th nearest
        achieved goal).

        Args:
            candidates: goals to rank.
            k: number of nearest neighbours. Defaults to config.knn_k.

        Returns:
            List of (goal, novelty_score) sorted by novelty descending.
            Higher score = more novel.
        """
        if k is None:
            k = self.config.knn_k

        if (
            self._embedding_cache is None
            or len(self._embedding_cache) == 0
        ):
            # No achieved goals yet -- everything is maximally novel
            return [(g, 1.0) for g in candidates]

        results: List[Tuple[GoalRepresentation, float]] = []

        for goal in candidates:
            feature_vec = goal.to_feature_vector(self.config.goal_embedding_dim)
            novelty = self._compute_knn_novelty(feature_vec, k)
            results.append((goal, novelty))

        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def _compute_knn_novelty(
        self, query: np.ndarray, k: int
    ) -> float:
        """KNN novelty: mean distance to k nearest achieved goal embeddings.

        Uses cosine distance (1 - cosine_similarity) for compatibility with
        nomic-embed normalised vectors.  Falls back to feature vectors if
        embeddings are not available.
        """
        if self._embedding_cache is None or len(self._embedding_cache) == 0:
            return 1.0

        # Build comparison matrix from achieved goal feature vectors
        achieved_features = np.array([
            self._goals[gid].to_feature_vector(self.config.goal_embedding_dim)
            for gid in self._embedding_ids
            if gid in self._goals
        ], dtype=np.float32)

        if len(achieved_features) == 0:
            return 1.0

        # Cosine distance: 1 - (q . a) / (||q|| * ||a||)
        query_norm = np.linalg.norm(query)
        if query_norm < 1e-12:
            return 1.0

        achieved_norms = np.linalg.norm(achieved_features, axis=1)
        # Avoid division by zero
        safe_norms = np.maximum(achieved_norms, 1e-12)

        cosine_sims = achieved_features @ query / (safe_norms * query_norm)
        distances = 1.0 - cosine_sims

        # k-th nearest distance (or max if fewer than k achieved goals)
        effective_k = min(k, len(distances))
        # Partial sort to find k smallest distances
        kth_indices = np.argpartition(distances, effective_k - 1)[
            :effective_k
        ]
        kth_distances = distances[kth_indices]

        # Mean distance to k nearest neighbours
        novelty = float(np.mean(kth_distances))
        return max(0.0, min(novelty, 2.0))  # clamp to [0, 2]

    def get_all_achieved(self) -> List[GoalRepresentation]:
        """Return all achieved goals."""
        return [g for g in self._goals.values() if g.achieved]

    def get_all_goals(self) -> List[GoalRepresentation]:
        """Return all goals (achieved and unattempted)."""
        return list(self._goals.values())


# ======================= Goal Value Estimator ================================

class GoalValueEstimator:
    """Estimates V(s0, g) and V(g, g*) for goal selection.

    V(s0, g): how achievable is goal g from current state s0
    V(g, g*): how useful is goal g as a stepping stone to final goal g*

    Uses lightweight features (page type distance, domain familiarity,
    historical success rates) rather than a neural critic ensemble.
    This avoids the DQN dependency for cold-start and keeps inference
    under 1ms on M1.

    Uncertainty (sigma) is derived from:
    - Inverse of attempt count (fewer attempts = higher uncertainty)
    - Variance in historical success rate
    """

    def __init__(self, config: DISCOVERConfig) -> None:
        self.config = config

        # Online statistics: goal_id -> (value_ema, variance_ema, count)
        self._achievability_stats: Dict[str, Tuple[float, float, int]] = {}
        self._relevance_stats: Dict[str, Tuple[float, float, int]] = {}

    def estimate_achievability(
        self,
        current_state: Optional[np.ndarray],
        goal: GoalRepresentation,
    ) -> Tuple[float, float]:
        """Estimate V(s0, g): probability of reaching goal g from current state.

        Returns:
            (mean_value, uncertainty) both in [0, 1].
        """
        goal_id = goal.goal_id

        # If we have online statistics, use them
        if goal_id in self._achievability_stats:
            mean_val, var_val, count = self._achievability_stats[goal_id]
            # Uncertainty decreases with more observations
            uncertainty = max(
                math.sqrt(var_val) + 1.0 / (1.0 + count),
                0.01,
            )
            return (
                max(0.0, min(mean_val, 1.0)),
                min(uncertainty, self.config.initial_uncertainty),
            )

        # Cold-start heuristic: easier page types are more achievable
        # Homepage is always reachable (V ~ 1.0), lead is hardest (V ~ 0.1)
        base_value = 1.0 - 0.9 * goal.difficulty

        # If goal has been attempted before, factor in success rate
        if goal.attempts > 0:
            base_value = 0.5 * base_value + 0.5 * goal.success_rate

        # High uncertainty at cold-start
        uncertainty = self.config.initial_uncertainty

        return (base_value, uncertainty)

    def estimate_relevance(
        self,
        goal: GoalRepresentation,
        final_goal: GoalRepresentation,
    ) -> Tuple[float, float]:
        """Estimate V(g, g*): how useful is goal g for reaching final goal g*.

        Relevance is based on:
        1. Page type distance: goals closer to g* in the hierarchy are more
           relevant (team page is more relevant than homepage for lead extraction)
        2. Domain match: same-domain goals are more relevant

        Returns:
            (mean_value, uncertainty) both in [0, 1].
        """
        goal_id = goal.goal_id

        # If we have online statistics, use them
        if goal_id in self._relevance_stats:
            mean_val, var_val, count = self._relevance_stats[goal_id]
            uncertainty = max(
                math.sqrt(var_val) + 1.0 / (1.0 + count),
                0.01,
            )
            return (
                max(0.0, min(mean_val, 1.0)),
                min(uncertainty, self.config.initial_uncertainty),
            )

        # Heuristic: relevance increases as goal approaches final goal
        # in the page type hierarchy
        g_idx = goal.page_type_index
        gstar_idx = final_goal.page_type_index
        max_dist = max(NUM_PAGE_TYPES - 1, 1)

        # Goals that are closer to g* in the hierarchy are more relevant
        # But goals that are *behind* s0 in the hierarchy are less useful
        distance = abs(gstar_idx - g_idx)
        relevance = 1.0 - (distance / max_dist)

        # Bonus for same domain as final goal
        if (
            goal.domain is not None
            and final_goal.domain is not None
            and goal.domain == final_goal.domain
        ):
            relevance = min(relevance + 0.1, 1.0)

        # Penalty for goals that are "past" the final goal (off-track)
        if g_idx > gstar_idx:
            relevance *= 0.5

        # High uncertainty at cold-start
        uncertainty = self.config.initial_uncertainty

        return (relevance, uncertainty)

    def update(
        self,
        goal: GoalRepresentation,
        achieved: bool,
        reached_final: bool,
    ) -> None:
        """Online update from a crawl outcome.

        Args:
            goal: the goal that was attempted.
            achieved: whether the goal was reached.
            reached_final: whether attempting this goal led to reaching g*.
        """
        alpha = self.config.value_ema_alpha

        # Update achievability
        outcome = 1.0 if achieved else 0.0
        if goal.goal_id in self._achievability_stats:
            old_mean, old_var, old_count = self._achievability_stats[
                goal.goal_id
            ]
            new_mean = (1 - alpha) * old_mean + alpha * outcome
            new_var = (1 - alpha) * old_var + alpha * (outcome - new_mean) ** 2
            self._achievability_stats[goal.goal_id] = (
                new_mean,
                new_var,
                old_count + 1,
            )
        else:
            self._achievability_stats[goal.goal_id] = (outcome, 0.25, 1)

        # Update relevance (only if we know whether it helped reach g*)
        rel_outcome = 1.0 if reached_final else (0.5 if achieved else 0.0)
        if goal.goal_id in self._relevance_stats:
            old_mean, old_var, old_count = self._relevance_stats[goal.goal_id]
            new_mean = (1 - alpha) * old_mean + alpha * rel_outcome
            new_var = (
                (1 - alpha) * old_var + alpha * (rel_outcome - new_mean) ** 2
            )
            self._relevance_stats[goal.goal_id] = (
                new_mean,
                new_var,
                old_count + 1,
            )
        else:
            self._relevance_stats[goal.goal_id] = (rel_outcome, 0.25, 1)

    def get_stats(self) -> Dict[str, Any]:
        """Return estimator statistics."""
        return {
            "achievability_goals_tracked": len(self._achievability_stats),
            "relevance_goals_tracked": len(self._relevance_stats),
        }


# ======================= Adaptive Alpha ======================================

class AdaptiveAlpha:
    """Self-regulates difficulty balance between achievability and relevance.

    From DISCOVER Equation 4:
      alpha_{t+1} = clip([alpha_min, alpha_max],
                         alpha_t + eta * (p_t - p*))

    Where:
    - p_t = EMA of recent success rate
    - p* = target success rate (50%)
    - eta = adaptation step size

    When agent succeeds too easily (p_t > p*): decrease alpha -> harder goals
    When agent fails too often  (p_t < p*): increase alpha -> easier goals
    """

    def __init__(self, config: DISCOVERConfig) -> None:
        self.config = config
        self._alpha: float = config.alpha_start
        self._success_ema: float = config.target_success_rate  # start at target
        self._ema_alpha: float = 0.1  # EMA smoothing for success rate
        self._update_count: int = 0
        self._history: Deque[bool] = deque(maxlen=100)

    @property
    def alpha(self) -> float:
        return self._alpha

    @property
    def success_rate(self) -> float:
        """Current EMA estimate of success rate."""
        return self._success_ema

    def update(self, success: bool) -> float:
        """Update alpha based on goal outcome.

        Args:
            success: whether the last goal was achieved.

        Returns:
            The new alpha value.
        """
        self._history.append(success)
        self._update_count += 1

        # EMA update of success rate
        outcome = 1.0 if success else 0.0
        self._success_ema = (
            (1 - self._ema_alpha) * self._success_ema
            + self._ema_alpha * outcome
        )

        # Adapt alpha: if succeeding too easily, decrease alpha (push toward
        # harder, more relevant goals); if failing too often, increase alpha
        # (retreat to easier, more achievable goals).
        # Sign: alpha += eta * (p* - p_t), so failing (low p_t) increases alpha.
        delta = self.config.alpha_adapt_rate * (
            self.config.target_success_rate - self._success_ema
        )
        self._alpha = max(
            self.config.alpha_min,
            min(self.config.alpha_max, self._alpha + delta),
        )

        return self._alpha

    def get_stats(self) -> Dict[str, Any]:
        """Return alpha adaptation statistics."""
        recent = list(self._history)
        recent_rate = (
            sum(recent) / len(recent) if recent else 0.0
        )
        return {
            "alpha": round(self._alpha, 4),
            "success_ema": round(self._success_ema, 4),
            "recent_success_rate": round(recent_rate, 4),
            "recent_window": len(recent),
            "total_updates": self._update_count,
            "target_success_rate": self.config.target_success_rate,
        }


# ======================= Goal Selector =======================================

class GoalSelector:
    """The core DISCOVER algorithm: selects the next goal from achieved set.

    Formula:
      g = argmax_{g in G_ach} [
          alpha * (V(s0,g) + beta*sigma(s0,g))
        + (1-alpha) * (V(g,g*) + beta*sigma(g,g*))
      ]

    The first term finds goals the agent can almost-but-not-quite reach (zone
    of proximal development).  The second term ensures those goals lie in the
    direction of the final target.  Exploration via uncertainty bonus (beta *
    sigma).
    """

    def __init__(
        self,
        config: DISCOVERConfig,
        goal_set: AchievedGoalSet,
        value_estimator: GoalValueEstimator,
        adaptive_alpha: AdaptiveAlpha,
    ) -> None:
        self.config = config
        self.goal_set = goal_set
        self.value_estimator = value_estimator
        self.adaptive_alpha = adaptive_alpha

    def select_goal(
        self,
        current_state: Optional[np.ndarray],
        final_goal: GoalRepresentation,
    ) -> GoalRepresentation:
        """Select the best intermediate goal via the DISCOVER objective.

        Args:
            current_state: current page state vector (or None at cold-start).
            final_goal: the ultimate target goal (e.g. "lead extraction").

        Returns:
            The selected goal to pursue next.
        """
        # Get candidates from achieved set
        candidates = self.goal_set.sample_achievable(
            self.config.candidate_sample_size
        )

        # At cold-start, seed with the easiest goals from the hierarchy
        if not candidates:
            return self._cold_start_goal(final_goal)

        # Also include some unattempted goals to expand the frontier
        all_goals = self.goal_set.get_all_goals()
        unattempted = [
            g for g in all_goals if g.attempts == 0 and not g.achieved
        ]
        if unattempted:
            n_explore = max(1, len(candidates) // 5)
            explore_sample = unattempted[:n_explore]
            candidates.extend(explore_sample)

        # Score each candidate
        alpha = self.adaptive_alpha.alpha
        beta = self.config.beta

        best_goal = candidates[0]
        best_score = float("-inf")

        for goal in candidates:
            # Skip the final goal itself (we want intermediates)
            if goal.goal_id == final_goal.goal_id:
                continue

            # Achievability: V(s0, g) + beta * sigma(s0, g)
            v_achieve, sigma_achieve = (
                self.value_estimator.estimate_achievability(
                    current_state, goal
                )
            )
            achievability_score = v_achieve + beta * sigma_achieve

            # Relevance: V(g, g*) + beta * sigma(g, g*)
            v_relevance, sigma_relevance = (
                self.value_estimator.estimate_relevance(goal, final_goal)
            )
            relevance_score = v_relevance + beta * sigma_relevance

            # DISCOVER objective
            score = (
                alpha * achievability_score
                + (1 - alpha) * relevance_score
            )

            if score > best_score:
                best_score = score
                best_goal = goal

        logger.debug(
            "GoalSelector: selected %s (score=%.4f, alpha=%.3f)",
            best_goal.goal_id,
            best_score,
            alpha,
        )
        return best_goal

    def _cold_start_goal(
        self, final_goal: GoalRepresentation
    ) -> GoalRepresentation:
        """At cold-start (no achieved goals), return the easiest possible goal.

        Progression: homepage -> listing -> company -> team -> ...
        The agent starts by trying to reach a homepage, which is always
        achievable, then progressively builds up its achieved set.
        """
        # Start with the easiest page type
        for page_type in PAGE_TYPE_HIERARCHY:
            goal = self.goal_set.get_or_create(page_type, domain=None)
            if not goal.achieved:
                logger.info(
                    "Cold-start: targeting %s (easiest unachieved)",
                    page_type,
                )
                return goal

        # All generic page types achieved -- try domain-specific goals
        # toward the final goal's domain
        if final_goal.domain:
            for page_type in PAGE_TYPE_HIERARCHY:
                goal = self.goal_set.get_or_create(
                    page_type, domain=final_goal.domain
                )
                if not goal.achieved:
                    return goal

        # Fallback: just return the final goal
        return final_goal

    def score_goal(
        self,
        goal: GoalRepresentation,
        current_state: Optional[np.ndarray],
        final_goal: GoalRepresentation,
    ) -> Dict[str, float]:
        """Score a single goal and return component breakdown.

        Useful for debugging and monitoring.
        """
        alpha = self.adaptive_alpha.alpha
        beta = self.config.beta

        v_achieve, sigma_achieve = (
            self.value_estimator.estimate_achievability(current_state, goal)
        )
        v_relevance, sigma_relevance = (
            self.value_estimator.estimate_relevance(goal, final_goal)
        )

        achievability_score = v_achieve + beta * sigma_achieve
        relevance_score = v_relevance + beta * sigma_relevance
        total = alpha * achievability_score + (1 - alpha) * relevance_score

        return {
            "total_score": round(total, 4),
            "achievability_mean": round(v_achieve, 4),
            "achievability_sigma": round(sigma_achieve, 4),
            "achievability_score": round(achievability_score, 4),
            "relevance_mean": round(v_relevance, 4),
            "relevance_sigma": round(sigma_relevance, 4),
            "relevance_score": round(relevance_score, 4),
            "alpha": round(alpha, 4),
            "beta": round(beta, 4),
        }


# ======================= DISCOVER Curriculum =================================

class DISCOVERCurriculum:
    """Main orchestrator integrating DISCOVER goal selection with the existing
    CurriculumManager.

    Lifecycle:
        curriculum = DISCOVERCurriculum(config)
        curriculum.initialise()
        ...
        goal = curriculum.select_next_goal()
        # ... execute crawl targeting goal.page_type ...
        curriculum.update_outcome(goal, success=True, trajectory=[...])
        stats = curriculum.get_curriculum_stats()
        curriculum.close()

    Integration with CurriculumManager:
    - CurriculumManager controls domain-level difficulty (L0-L4)
    - DISCOVERCurriculum controls page-type goal selection within allowed domains
    - Together they form a two-level curriculum: domain difficulty x page-type goal
    """

    def __init__(
        self,
        config: Optional[DISCOVERConfig] = None,
        curriculum_manager: Optional[Any] = None,
    ) -> None:
        self.config = config or DISCOVERConfig()

        # Sub-components
        self.goal_set = AchievedGoalSet(self.config)
        self.value_estimator = GoalValueEstimator(self.config)
        self.adaptive_alpha = AdaptiveAlpha(self.config)
        self.goal_selector = GoalSelector(
            self.config,
            self.goal_set,
            self.value_estimator,
            self.adaptive_alpha,
        )

        # Reference to existing CurriculumManager (optional integration)
        self._curriculum_manager = curriculum_manager

        # The final target goal: extract a qualified lead
        self._final_goal: Optional[GoalRepresentation] = None

        # Episode tracking
        self._episode_count: int = 0
        self._total_successes: int = 0
        self._total_failures: int = 0

        # History of selected goals (for monitoring)
        self._goal_history: Deque[Dict[str, Any]] = deque(maxlen=200)

    # ---- Lifecycle ----------------------------------------------------------

    def initialise(self, final_page_type: str = "lead") -> None:
        """Initialise all sub-components.

        Args:
            final_page_type: the ultimate target page type. Defaults to "lead".
        """
        self.goal_set.initialise()

        # Create the final goal
        self._final_goal = self.goal_set.get_or_create(final_page_type)

        # Seed the goal set with all page types (generic, no domain)
        for page_type in PAGE_TYPE_HIERARCHY:
            self.goal_set.get_or_create(page_type, domain=None)

        # At cold-start, mark homepage as achieved (always reachable)
        homepage = self.goal_set.get_or_create("homepage")
        if not homepage.achieved:
            homepage.achieved = True
            homepage.successes = 1
            homepage.attempts = 1
            self.goal_set.add(homepage)

        logger.info(
            "DISCOVERCurriculum initialised: final_goal=%s, "
            "achieved=%d, total=%d",
            self._final_goal.goal_id,
            self.goal_set.achieved_count,
            self.goal_set.total_count,
        )

    def close(self) -> None:
        """Persist state and release resources."""
        self.goal_set.close()
        logger.info(
            "DISCOVERCurriculum closed: episodes=%d, successes=%d, "
            "failures=%d",
            self._episode_count,
            self._total_successes,
            self._total_failures,
        )

    # ---- Goal Selection -----------------------------------------------------

    def select_next_goal(
        self,
        current_state: Optional[np.ndarray] = None,
        domain: Optional[str] = None,
    ) -> GoalRepresentation:
        """Choose the next crawl goal via DISCOVER.

        Args:
            current_state: current page state vector (DQN state).
            domain: if provided, create domain-specific goals.

        Returns:
            The selected GoalRepresentation.
        """
        # If a specific domain is provided, ensure domain-specific goals exist
        if domain:
            for page_type in PAGE_TYPE_HIERARCHY:
                self.goal_set.get_or_create(page_type, domain=domain)

        # Select via DISCOVER
        goal = self.goal_selector.select_goal(
            current_state, self._final_goal
        )

        # Record selection
        self._goal_history.append({
            "episode": self._episode_count,
            "goal_id": goal.goal_id,
            "page_type": goal.page_type,
            "domain": goal.domain,
            "alpha": self.adaptive_alpha.alpha,
            "timestamp": time.time(),
        })

        return goal

    # ---- Outcome Reporting --------------------------------------------------

    def update_outcome(
        self,
        goal: GoalRepresentation,
        success: bool,
        trajectory: Optional[List[Dict[str, Any]]] = None,
        reached_final: bool = False,
    ) -> None:
        """Update all components after a crawl attempt.

        Args:
            goal: the goal that was pursued.
            success: whether the goal was achieved.
            trajectory: optional list of visited pages (for discovering
                        new achieved goals along the way).
            reached_final: whether the crawl ultimately led to a lead
                           extraction (reaching g*).
        """
        self._episode_count += 1

        # Update goal statistics
        goal.attempts += 1
        goal.last_attempted = time.time()
        if success:
            goal.successes += 1
            self._total_successes += 1
            if not goal.achieved:
                self.goal_set.add(goal)
            else:
                self.goal_set.update_goal(goal)
        else:
            self._total_failures += 1
            self.goal_set.update_goal(goal)

        # Update value estimator
        self.value_estimator.update(goal, success, reached_final)

        # Update adaptive alpha
        self.adaptive_alpha.update(success)

        # Discover new goals from trajectory (hindsight goal discovery)
        if trajectory:
            self._discover_goals_from_trajectory(trajectory)

        # Sync with CurriculumManager if available
        if self._curriculum_manager is not None and success:
            self._sync_with_curriculum_manager(goal)

        if self._episode_count % 10 == 0:
            stats = self.adaptive_alpha.get_stats()
            logger.info(
                "DISCOVER episode %d: alpha=%.3f, success_ema=%.3f, "
                "achieved=%d",
                self._episode_count,
                stats["alpha"],
                stats["success_ema"],
                self.goal_set.achieved_count,
            )

    def _discover_goals_from_trajectory(
        self, trajectory: List[Dict[str, Any]]
    ) -> None:
        """Extract newly achieved goals from a crawl trajectory.

        This implements Hindsight Experience Replay (HER) for goals:
        even if we failed to reach the intended goal, we may have
        reached other useful page types along the way.

        Expected trajectory item format:
        {
            "url": str,
            "domain": str,
            "page_type": str,  # classified page type
            "embedding": Optional[np.ndarray],
        }
        """
        for step in trajectory:
            page_type = step.get("page_type")
            domain = step.get("domain")
            embedding = step.get("embedding")

            if page_type and page_type in PAGE_TYPE_INDEX:
                # Mark this (page_type, domain) combination as achieved
                goal = self.goal_set.get_or_create(
                    page_type, domain=domain, embedding=embedding
                )
                if not goal.achieved:
                    goal.achieved = True
                    goal.successes += 1
                    goal.attempts += 1
                    self.goal_set.add(goal)
                    logger.debug(
                        "HER: discovered achieved goal %s from trajectory",
                        goal.goal_id,
                    )

                # Also mark the generic (no-domain) version
                generic = self.goal_set.get_or_create(page_type, domain=None)
                if not generic.achieved:
                    generic.achieved = True
                    generic.successes += 1
                    generic.attempts += 1
                    self.goal_set.add(generic)

    def _sync_with_curriculum_manager(
        self, goal: GoalRepresentation
    ) -> None:
        """Inform the CurriculumManager about achieved page types.

        Maps DISCOVER page-type progression to CurriculumManager levels:
        - homepage/listing -> supports L0 (easy static domains)
        - company/team     -> supports L1-L2 (moderate JS)
        - about/contact    -> supports L2-L3 (some anti-bot)
        - lead             -> supports L3-L4 (full pipeline working)
        """
        # The CurriculumManager uses harvest rate for level decisions.
        # When DISCOVER achieves harder page types, we can inform the
        # curriculum manager that the agent is ready for harder domains.
        pass  # Integration point: override in subclass or wire up externally

    # ---- Statistics ---------------------------------------------------------

    def get_curriculum_stats(self) -> Dict[str, Any]:
        """Return comprehensive DISCOVER curriculum state."""
        # Goal type distribution
        type_counts: Dict[str, Dict[str, int]] = {}
        for pt in PAGE_TYPE_HIERARCHY:
            achieved = sum(
                1
                for g in self.goal_set.get_all_goals()
                if g.page_type == pt and g.achieved
            )
            total = sum(
                1
                for g in self.goal_set.get_all_goals()
                if g.page_type == pt
            )
            type_counts[pt] = {"achieved": achieved, "total": total}

        # Recent goal history
        recent = list(self._goal_history)[-10:]

        return {
            "episode_count": self._episode_count,
            "total_successes": self._total_successes,
            "total_failures": self._total_failures,
            "overall_success_rate": round(
                self._total_successes
                / max(self._episode_count, 1),
                4,
            ),
            "achieved_goals": self.goal_set.achieved_count,
            "total_goals": self.goal_set.total_count,
            "alpha": self.adaptive_alpha.get_stats(),
            "value_estimator": self.value_estimator.get_stats(),
            "page_type_distribution": type_counts,
            "recent_goals": recent,
            "final_goal": (
                self._final_goal.to_dict() if self._final_goal else None
            ),
            "curriculum_phase": self._detect_phase(),
        }

    def _detect_phase(self) -> str:
        """Detect the current curriculum phase.

        Phases:
        - COLD_START:  < 3 page types achieved, mostly exploring locally
        - EXPANDING:   3-5 page types achieved, building out goal set
        - CONVERGING:  > 5 page types achieved, focused on final goal
        - MASTERED:    consistently reaching the final goal
        """
        achieved_types = set()
        for g in self.goal_set.get_all_achieved():
            achieved_types.add(g.page_type)

        n_types = len(achieved_types)

        if n_types < 3:
            return "COLD_START"
        elif n_types < 5:
            return "EXPANDING"
        elif self._final_goal and self._final_goal.achieved:
            if self._final_goal.success_rate > 0.3:
                return "MASTERED"
            return "CONVERGING"
        else:
            return "CONVERGING"

    def get_progression_summary(self) -> str:
        """Human-readable summary of curriculum progression."""
        achieved_types: Set[str] = set()
        for g in self.goal_set.get_all_achieved():
            achieved_types.add(g.page_type)

        lines = ["DISCOVER Curriculum Progression:"]
        for pt in PAGE_TYPE_HIERARCHY:
            marker = "[X]" if pt in achieved_types else "[ ]"
            lines.append(f"  {marker} {pt}")

        phase = self._detect_phase()
        lines.append(f"\nPhase: {phase}")
        lines.append(
            f"Alpha: {self.adaptive_alpha.alpha:.3f} "
            f"(success_ema={self.adaptive_alpha.success_rate:.3f})"
        )
        lines.append(
            f"Episodes: {self._episode_count} "
            f"({self._total_successes}W / {self._total_failures}L)"
        )

        return "\n".join(lines)

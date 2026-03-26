"""
M2-CMAB (Multi-Constraint Multi-Armed Bandit) domain scheduler.

Constraint-aware drop-in replacement for UCB1 DomainScheduler, based on
"Adapter-Augmented Bandits for Online Multi-Constrained Multi-Modal
Inference Scheduling" (Zhang et al., arXiv:2603.06403, March 2026).

Core idea: replace UCB1's constraint-oblivious reward maximisation with a
Lagrangian primal-dual formulation that jointly maximises lead yield while
respecting per-domain rate limits, global bandwidth caps, and CPU budgets.

Components:
1. CostPredictor / RewardPredictor -- ridge regression models predicting
   per-domain reward and per-constraint cost from a context vector.
2. DualVariableUpdater -- Online Mirror Descent (OMD) maintaining Lagrange
   multipliers that penalise resource-hungry domains when budgets tighten.
3. LagrangianScorer -- computes score = reward - sum(lambda_k * cost_k).
4. M2CMABScheduler -- two-phase scheduler (explore then exploit) with
   softmax sampling biased toward the Lagrangian-optimal domain.
5. ResourceMonitor -- tracks actual resource consumption (rate limit
   utilisation, bandwidth, CPU) and produces normalised cost vectors.

Key properties:
- Pure numpy (no torch dependency) -- O(d) per domain per update.
- Context dimension d=16 by default -- lightweight linear predictors.
- SQLite persistence for dual variables and predictor weights.
- Memory: <5 MB for hundreds of domains.
- Drop-in replacement: register_domain, select_domain, update_domain,
  get_all_stats, close -- same interface as DomainScheduler / NeuralUCB.
- Naturally handles heterogeneous rate limits per domain via Lagrangian
  penalties instead of ad-hoc sleep/skip logic.

Interface mirrors DomainScheduler: register_domain, select_domain,
update_domain, get_all_stats, close.

Target: Apple M1 16GB, zero cloud dependency.

References:
    Zhang et al. (2026) "Adapter-Augmented Bandits for Online
        Multi-Constrained Multi-Modal Inference Scheduling"
    Agrawal & Devanur (2018) "Bandits with Knapsacks" JACM
"""

from __future__ import annotations

import json
import logging
import math
import os
import sqlite3
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_m2cmab")


# ======================= Configuration ======================================

@dataclass
class M2CMABConfig:
    """Hyperparameters for the M2-CMAB constraint-aware domain scheduler.

    Defaults tuned for a crawl workload of 50-200 domains on Apple M1.
    """

    # Constraint dimensions
    num_constraints: int = 3
    constraint_names: List[str] = field(
        default_factory=lambda: ["rate_limit", "bandwidth", "cpu"]
    )
    budgets: List[float] = field(
        default_factory=lambda: [1.0, 1.0, 1.0]
    )

    # Dual variable (Lagrange multiplier) tuning
    lambda_lr: float = 0.1          # OMD step size (eta)
    lambda_max: float = 10.0        # clip lambdas to [0, lambda_max]

    # Predictor learning
    predictor_lr: float = 1e-3      # ridge regularisation lambda
    context_dim: int = 16           # domain context vector length

    # Scheduler
    softmax_temperature: float = 1.0  # tau for softmax score sampling
    min_pulls: int = 5               # min pulls per domain before Lagrangian

    # Persistence
    sqlite_path: str = "scrapus_data/m2cmab_state.db"

    # UCB1 fallback (same as CrawlerConfig.ucb_exploration_constant)
    ucb1_exploration_constant: float = 2.0

    # Domain stats DB (shared with other schedulers)
    domain_stats_db: str = "scrapus_data/domain_stats.db"


# ======================= Resource Constraint ================================

@dataclass
class ResourceConstraint:
    """Tracks consumption against a normalised budget for one resource.

    Budget is normalised to [0, 1]. Consumed is the fraction used so far.
    """

    name: str
    budget: float       # total budget (normalised to 1.0)
    consumed: float = 0.0

    def headroom(self) -> float:
        """Remaining budget fraction in [0, 1]."""
        return max(0.0, self.budget - self.consumed)

    def utilisation(self) -> float:
        """Fraction of budget consumed in [0, 1]."""
        if self.budget <= 0.0:
            return 1.0
        return min(1.0, self.consumed / self.budget)

    def record(self, cost: float) -> None:
        """Record resource consumption."""
        self.consumed += cost

    def reset(self) -> None:
        """Reset consumption for a new epoch."""
        self.consumed = 0.0


# ======================= Cost Predictor (Ridge Regression) ==================

class CostPredictor:
    """Lightweight online ridge regression predicting cost for one constraint.

    Maintains a (d x d) precision matrix A = X^T X + lambda * I and a
    (d,) vector b = X^T y. Prediction: theta = A^{-1} b, cost = theta^T x.

    Online update is O(d^2) per sample via rank-1 Sherman-Morrison.
    Memory: ~2 * d^2 * 8 bytes = ~4 KB at d=16.
    """

    def __init__(self, context_dim: int, reg_lambda: float = 1e-3) -> None:
        self._d = context_dim
        self._reg = reg_lambda
        # Precision matrix A = lambda * I
        self._A = reg_lambda * np.eye(context_dim, dtype=np.float64)
        # Target vector b = X^T y
        self._b = np.zeros(context_dim, dtype=np.float64)
        # Cached theta (recomputed on demand)
        self._theta: Optional[np.ndarray] = None
        self._n_updates: int = 0

    def predict(self, domain_context: np.ndarray) -> float:
        """Predict cost for a domain context vector.

        Args:
            domain_context: (d,) float array.

        Returns:
            Predicted cost (scalar, clipped to [0, 1]).
        """
        if self._theta is None:
            self._solve()
        pred = float(self._theta @ domain_context)
        return max(0.0, min(1.0, pred))

    def update(self, domain_context: np.ndarray, actual_cost: float) -> None:
        """Online update with a new (context, cost) observation.

        Rank-1 update: A <- A + x x^T, b <- b + y * x.

        Args:
            domain_context: (d,) float array.
            actual_cost: observed cost value.
        """
        x = domain_context.astype(np.float64)
        self._A += np.outer(x, x)
        self._b += actual_cost * x
        self._theta = None  # invalidate cache
        self._n_updates += 1

    def _solve(self) -> None:
        """Solve theta = A^{-1} b via Cholesky decomposition."""
        try:
            L = np.linalg.cholesky(self._A)
            z = np.linalg.solve(L, self._b)
            self._theta = np.linalg.solve(L.T, z)
        except np.linalg.LinAlgError:
            # Fallback: least-squares solve
            self._theta = np.linalg.lstsq(self._A, self._b, rcond=None)[0]

    def get_weights(self) -> Dict[str, Any]:
        """Return serialisable state for persistence."""
        return {
            "A": self._A.tolist(),
            "b": self._b.tolist(),
            "n_updates": self._n_updates,
        }

    def load_weights(self, state: Dict[str, Any]) -> None:
        """Restore state from persistence."""
        self._A = np.array(state["A"], dtype=np.float64)
        self._b = np.array(state["b"], dtype=np.float64)
        self._n_updates = state.get("n_updates", 0)
        self._theta = None  # will recompute on next predict


# ======================= Reward Predictor (Ridge Regression) ================

class RewardPredictor:
    """Online ridge regression predicting expected reward per domain.

    Identical structure to CostPredictor but for reward values which
    are not clipped to [0, 1] (rewards can be arbitrary non-negative floats).

    Memory: ~4 KB at d=16.
    """

    def __init__(self, context_dim: int, reg_lambda: float = 1e-3) -> None:
        self._d = context_dim
        self._reg = reg_lambda
        self._A = reg_lambda * np.eye(context_dim, dtype=np.float64)
        self._b = np.zeros(context_dim, dtype=np.float64)
        self._theta: Optional[np.ndarray] = None
        self._n_updates: int = 0

    def predict(self, domain_context: np.ndarray) -> float:
        """Predict expected reward for a domain context vector.

        Args:
            domain_context: (d,) float array.

        Returns:
            Predicted reward (scalar, clipped to >= 0).
        """
        if self._theta is None:
            self._solve()
        pred = float(self._theta @ domain_context)
        return max(0.0, pred)

    def update(self, domain_context: np.ndarray, actual_reward: float) -> None:
        """Online update with a new (context, reward) observation.

        Args:
            domain_context: (d,) float array.
            actual_reward: observed reward value.
        """
        x = domain_context.astype(np.float64)
        self._A += np.outer(x, x)
        self._b += actual_reward * x
        self._theta = None
        self._n_updates += 1

    def _solve(self) -> None:
        """Solve theta = A^{-1} b."""
        try:
            L = np.linalg.cholesky(self._A)
            z = np.linalg.solve(L, self._b)
            self._theta = np.linalg.solve(L.T, z)
        except np.linalg.LinAlgError:
            self._theta = np.linalg.lstsq(self._A, self._b, rcond=None)[0]

    def get_weights(self) -> Dict[str, Any]:
        """Return serialisable state for persistence."""
        return {
            "A": self._A.tolist(),
            "b": self._b.tolist(),
            "n_updates": self._n_updates,
        }

    def load_weights(self, state: Dict[str, Any]) -> None:
        """Restore state from persistence."""
        self._A = np.array(state["A"], dtype=np.float64)
        self._b = np.array(state["b"], dtype=np.float64)
        self._n_updates = state.get("n_updates", 0)
        self._theta = None


# ======================= Dual Variable Updater (OMD) ========================

class DualVariableUpdater:
    """Maintains Lagrangian dual variables via Online Mirror Descent.

    Update rule (multiplicative / exponentiated gradient):
        lambda_k <- lambda_k * exp(eta * (cost_k / budget_k - 1/T))

    Projection: clip each lambda_k to [0, lambda_max].

    The exponential update is the natural OMD step for the unnormalised
    negative entropy mirror map on R_+^C. It ensures lambda stays non-negative
    and adapts multiplicatively: scarce resources (high cost/budget ratio)
    see their multiplier grow exponentially, strongly penalising costly arms.

    Memory: O(C) = O(3) -- negligible.
    """

    def __init__(
        self,
        num_constraints: int,
        eta: float = 0.1,
        lambda_max: float = 10.0,
    ) -> None:
        """Initialise dual variables to zero.

        Args:
            num_constraints: number of resource constraints (C).
            eta: step size for the OMD update.
            lambda_max: projection cap per dual variable.
        """
        self._C = num_constraints
        self._eta = eta
        self._lambda_max = lambda_max
        # Start with small positive lambdas (not zero, to allow multiplicative updates)
        self._lambdas = np.full(num_constraints, 0.01, dtype=np.float64)
        self._update_count: int = 0

    def update(
        self,
        costs: np.ndarray,
        budgets: np.ndarray,
        T: int,
    ) -> np.ndarray:
        """Perform one OMD dual variable update step.

        Args:
            costs: (C,) actual costs incurred this round.
            budgets: (C,) per-constraint budgets (normalised).
            T: total horizon length (for amortised constraint).

        Returns:
            Updated (C,) dual variable vector.
        """
        T = max(T, 1)
        safe_budgets = np.maximum(budgets, 1e-8)

        # Gradient: cost_k / budget_k - 1/T
        # Positive gradient => over budget => increase lambda (penalise more)
        # Negative gradient => under budget => decrease lambda (relax)
        grad = costs / safe_budgets - 1.0 / T

        # Exponentiated gradient (OMD with unnormalised negentropy)
        self._lambdas = self._lambdas * np.exp(self._eta * grad)

        # Project: clip to [0, lambda_max]
        self._lambdas = np.clip(self._lambdas, 0.0, self._lambda_max)

        self._update_count += 1
        return self._lambdas.copy()

    def get_lambdas(self) -> np.ndarray:
        """Return current dual variable vector (C,)."""
        return self._lambdas.copy()

    def set_lambdas(self, lambdas: np.ndarray) -> None:
        """Restore dual variables (for persistence)."""
        self._lambdas = np.clip(
            lambdas.astype(np.float64), 0.0, self._lambda_max
        )

    def get_state(self) -> Dict[str, Any]:
        """Return serialisable state."""
        return {
            "lambdas": self._lambdas.tolist(),
            "update_count": self._update_count,
        }

    def load_state(self, state: Dict[str, Any]) -> None:
        """Restore from serialised state."""
        self._lambdas = np.clip(
            np.array(state["lambdas"], dtype=np.float64),
            0.0,
            self._lambda_max,
        )
        self._update_count = state.get("update_count", 0)


# ======================= Lagrangian Scorer ==================================

class LagrangianScorer:
    """Computes the Lagrangian score for domain selection.

    Score = predicted_reward - sum_k(lambda_k * predicted_cost_k)

    Higher score => more attractive domain (high reward, low weighted cost).
    When a resource is scarce (high lambda_k), domains consuming that
    resource are penalised more heavily, naturally steering the scheduler
    toward cheaper alternatives without hard-coded logic.
    """

    @staticmethod
    def score(
        reward_pred: float,
        cost_preds: np.ndarray,
        lambdas: np.ndarray,
    ) -> float:
        """Compute Lagrangian score for one domain.

        Args:
            reward_pred: predicted reward for the domain.
            cost_preds: (C,) predicted costs per constraint.
            lambdas: (C,) current dual variables.

        Returns:
            Scalar Lagrangian score.
        """
        penalty = float(np.dot(lambdas, cost_preds))
        return reward_pred - penalty

    @staticmethod
    def score_batch(
        reward_preds: np.ndarray,
        cost_preds: np.ndarray,
        lambdas: np.ndarray,
    ) -> np.ndarray:
        """Compute Lagrangian scores for multiple domains.

        Args:
            reward_preds: (A,) predicted rewards.
            cost_preds: (A, C) predicted costs.
            lambdas: (C,) dual variables.

        Returns:
            (A,) array of Lagrangian scores.
        """
        penalties = cost_preds @ lambdas  # (A,)
        return reward_preds - penalties


# ======================= Resource Monitor ===================================

class ResourceMonitor:
    """Tracks actual resource consumption per domain per epoch.

    Produces normalised cost vectors for the M2-CMAB update step.

    Cost dimensions:
    - rate_limit: requests/sec relative to domain's max allowed rate.
    - bandwidth: bytes transferred relative to global bandwidth budget.
    - cpu: parse/extract CPU time relative to global CPU budget.

    Memory: O(num_domains) -- ~100 bytes per active domain.
    """

    def __init__(
        self,
        rate_limit_budget_rps: float = 10.0,
        bandwidth_budget_bps: float = 10_000_000.0,  # 10 MB/s
        cpu_budget_ms_per_req: float = 500.0,         # 500ms processing budget
    ) -> None:
        """Initialise the resource monitor.

        Args:
            rate_limit_budget_rps: global requests-per-second budget.
            bandwidth_budget_bps: global bandwidth budget (bytes/sec).
            cpu_budget_ms_per_req: CPU budget per request (ms).
        """
        self._rate_budget = max(rate_limit_budget_rps, 0.01)
        self._bw_budget = max(bandwidth_budget_bps, 1.0)
        self._cpu_budget = max(cpu_budget_ms_per_req, 1.0)

        # Per-domain tracking for current epoch
        self._domain_requests: Dict[str, int] = defaultdict(int)
        self._domain_bytes: Dict[str, float] = defaultdict(float)
        self._domain_cpu_ms: Dict[str, float] = defaultdict(float)
        self._domain_latency_ms: Dict[str, float] = defaultdict(float)

        # Per-domain rate limits (from robots.txt or config)
        self._domain_rate_limits: Dict[str, float] = {}

        # Epoch tracking
        self._epoch_start: float = time.monotonic()
        self._epoch_requests: int = 0

    def set_domain_rate_limit(self, domain: str, rps: float) -> None:
        """Set the known rate limit for a domain (from robots.txt etc.).

        Args:
            domain: domain name.
            rps: maximum requests per second for this domain.
        """
        self._domain_rate_limits[domain] = max(rps, 0.01)

    def record_request(
        self,
        domain: str,
        latency_ms: float,
        bytes_transferred: int,
        cpu_time_ms: float,
    ) -> None:
        """Record resource consumption for a single request.

        Args:
            domain: the crawled domain.
            latency_ms: request latency in milliseconds.
            bytes_transferred: response body size in bytes.
            cpu_time_ms: CPU time for parsing/extraction in milliseconds.
        """
        self._domain_requests[domain] += 1
        self._domain_bytes[domain] += bytes_transferred
        self._domain_cpu_ms[domain] += cpu_time_ms
        self._domain_latency_ms[domain] += latency_ms
        self._epoch_requests += 1

    def get_costs(self, domain: str) -> Dict[str, float]:
        """Compute normalised cost vector for a domain.

        Each cost is in [0, 1] representing the fraction of budget consumed
        by the last request to this domain (amortised if multiple requests).

        Returns:
            Dict mapping constraint name to normalised cost.
        """
        n_reqs = max(self._domain_requests.get(domain, 0), 1)

        # Rate limit cost: how close to the domain's rate limit
        domain_rps_limit = self._domain_rate_limits.get(domain, self._rate_budget)
        elapsed = max(time.monotonic() - self._epoch_start, 0.1)
        actual_rps = self._domain_requests.get(domain, 0) / elapsed
        rate_cost = min(1.0, actual_rps / domain_rps_limit)

        # Bandwidth cost: bytes per request relative to budget
        avg_bytes = self._domain_bytes.get(domain, 0.0) / n_reqs
        bw_cost = min(1.0, avg_bytes / (self._bw_budget / max(self._rate_budget, 0.01)))

        # CPU cost: processing time relative to budget
        avg_cpu = self._domain_cpu_ms.get(domain, 0.0) / n_reqs
        cpu_cost = min(1.0, avg_cpu / self._cpu_budget)

        return {
            "rate_limit": rate_cost,
            "bandwidth": bw_cost,
            "cpu": cpu_cost,
        }

    def get_costs_array(self, domain: str) -> np.ndarray:
        """Return costs as a numpy array in constraint order.

        Returns:
            (3,) array: [rate_limit, bandwidth, cpu].
        """
        costs = self.get_costs(domain)
        return np.array(
            [costs["rate_limit"], costs["bandwidth"], costs["cpu"]],
            dtype=np.float64,
        )

    def reset_epoch(self) -> None:
        """Reset all counters for a new crawl epoch."""
        self._domain_requests.clear()
        self._domain_bytes.clear()
        self._domain_cpu_ms.clear()
        self._domain_latency_ms.clear()
        self._epoch_start = time.monotonic()
        self._epoch_requests = 0

    def get_stats(self) -> Dict[str, Any]:
        """Return monitoring statistics."""
        elapsed = max(time.monotonic() - self._epoch_start, 0.001)
        return {
            "epoch_requests": self._epoch_requests,
            "epoch_elapsed_s": round(elapsed, 2),
            "effective_rps": round(self._epoch_requests / elapsed, 2),
            "active_domains": len(self._domain_requests),
            "domain_request_counts": dict(self._domain_requests),
        }


# ======================= Domain Context Builder =============================

class DomainContextBuilder:
    """Builds a fixed-length context vector for a domain.

    Feature layout (16 dimensions):
        [0]     pages_crawled (log-scaled)
        [1]     avg_reward
        [2]     reward_variance
        [3]     leads_found (log-scaled)
        [4]     time_since_last_crawl (normalised to 24h)
        [5]     crawl_frequency (pages/hour, log-scaled)
        [6]     failure_rate
        [7]     rate_limit_headroom (0=fully used, 1=fully available)
        [8]     bandwidth_headroom
        [9]     cpu_headroom
        [10]    reward_trend (slope of recent rewards)
        [11]    pages_since_last_lead (normalised)
        [12]    domain_age_days (normalised to 30d)
        [13]    avg_latency_ms (normalised to 5000ms)
        [14]    avg_bytes_per_page (normalised to 1MB)
        [15]    reserved / zero-padded

    Memory: 16 * 4 = 64 bytes per context vector.
    """

    def __init__(self, context_dim: int = 16) -> None:
        self._d = context_dim

    def build(
        self,
        domain_stats: Dict[str, Any],
        resource_costs: Optional[Dict[str, float]] = None,
    ) -> np.ndarray:
        """Build context vector from domain stats and resource state.

        Args:
            domain_stats: dict from domain DB (pages_crawled, avg_reward, etc.).
            resource_costs: optional dict of current resource costs per constraint.

        Returns:
            (d,) float32 context vector.
        """
        vec = np.zeros(self._d, dtype=np.float32)

        pages = domain_stats.get("pages_crawled", 0)
        vec[0] = math.log1p(pages) / 10.0  # normalise: log1p(22026) ~ 10

        vec[1] = min(domain_stats.get("avg_reward", 0.0), 1.0)
        vec[2] = min(domain_stats.get("reward_variance", 0.0), 1.0)

        leads = domain_stats.get("leads_found", 0)
        vec[3] = math.log1p(leads) / 10.0

        last_crawled = domain_stats.get("last_crawled")
        if last_crawled is not None and last_crawled > 0:
            hours_since = (time.time() - last_crawled) / 3600.0
            vec[4] = min(hours_since / 24.0, 1.0)
        else:
            vec[4] = 1.0  # never crawled => max staleness

        created_at = domain_stats.get("created_at", time.time())
        age_hours = max((time.time() - created_at) / 3600.0, 0.001)
        vec[5] = math.log1p(pages / age_hours) / 5.0  # crawl freq

        vec[6] = min(domain_stats.get("failure_rate", 0.0), 1.0)

        # Resource headroom (inverse of cost = available budget fraction)
        if resource_costs:
            vec[7] = max(0.0, 1.0 - resource_costs.get("rate_limit", 0.0))
            vec[8] = max(0.0, 1.0 - resource_costs.get("bandwidth", 0.0))
            vec[9] = max(0.0, 1.0 - resource_costs.get("cpu", 0.0))
        else:
            vec[7] = 1.0
            vec[8] = 1.0
            vec[9] = 1.0

        # Reward trend
        recent_rewards: List[float] = domain_stats.get("recent_rewards", [])
        vec[10] = self._compute_trend(recent_rewards)

        # Pages since last lead (normalised by total pages)
        pslp = domain_stats.get("pages_since_last_lead", 0)
        vec[11] = min(float(pslp) / max(pages, 1), 1.0)

        # Domain age
        age_days = age_hours / 24.0
        vec[12] = min(age_days / 30.0, 1.0)

        # Average latency (normalised to 5s)
        avg_lat = domain_stats.get("avg_latency_ms", 0.0)
        vec[13] = min(avg_lat / 5000.0, 1.0)

        # Average bytes per page (normalised to 1MB)
        avg_bytes = domain_stats.get("avg_bytes_per_page", 0.0)
        vec[14] = min(avg_bytes / 1_000_000.0, 1.0)

        return vec

    @staticmethod
    def _compute_trend(rewards: List[float]) -> float:
        """Linear regression slope over recent rewards, normalised to [-1, 1]."""
        n = len(rewards)
        if n < 2:
            return 0.0
        x = np.arange(n, dtype=np.float64)
        y = np.array(rewards, dtype=np.float64)
        x_mean = x.mean()
        y_mean = y.mean()
        var_x = ((x - x_mean) ** 2).sum()
        if var_x == 0:
            return 0.0
        slope = ((x - x_mean) * (y - y_mean)).sum() / var_x
        # Normalise to roughly [-1, 1]
        return float(np.clip(slope, -1.0, 1.0))


# ======================= M2-CMAB Scheduler ==================================

class M2CMABScheduler:
    """Constraint-aware domain scheduler using M2-CMAB.

    Drop-in replacement for DomainScheduler (UCB1) and NeuralUCBScheduler.
    Same public interface: register_domain, select_domain, update_domain,
    get_all_stats, close.

    Two-phase operation:
    1. **Exploration** (< min_pulls per domain): round-robin to gather
       baseline data for all domains.
    2. **Exploitation**: softmax sampling from Lagrangian scores.

    The Lagrangian score for each domain a is:
        S(a) = reward_hat(a) - sum_k(lambda_k * cost_hat_k(a))

    Softmax sampling:
        P(a) = exp(S(a) / tau) / sum_a' exp(S(a') / tau)

    After each crawl, the scheduler:
    - Updates reward and cost predictors with the observed values.
    - Runs one OMD step to adjust dual variables (lambda).
    - Persists state to SQLite.

    Memory: ~5 MB for 200 domains at d=16.
    """

    def __init__(
        self,
        config: Optional[M2CMABConfig] = None,
        resource_monitor: Optional[ResourceMonitor] = None,
    ) -> None:
        self.config = config or M2CMABConfig()
        self._db_path = self.config.domain_stats_db
        self._state_db_path = self.config.sqlite_path
        self._conn: Optional[sqlite3.Connection] = None
        self._state_conn: Optional[sqlite3.Connection] = None

        # Core components
        self._reward_predictor = RewardPredictor(
            self.config.context_dim, self.config.predictor_lr
        )
        self._cost_predictors: List[CostPredictor] = [
            CostPredictor(self.config.context_dim, self.config.predictor_lr)
            for _ in range(self.config.num_constraints)
        ]
        self._dual_updater = DualVariableUpdater(
            self.config.num_constraints,
            eta=self.config.lambda_lr,
            lambda_max=self.config.lambda_max,
        )
        self._scorer = LagrangianScorer()
        self._context_builder = DomainContextBuilder(self.config.context_dim)
        self._resource_monitor = resource_monitor or ResourceMonitor()

        # Constraints
        self._constraints: List[ResourceConstraint] = [
            ResourceConstraint(
                name=self.config.constraint_names[i],
                budget=self.config.budgets[i],
            )
            for i in range(self.config.num_constraints)
        ]

        # Domain tracking
        self._domain_pulls: Dict[str, int] = defaultdict(int)
        self._domain_contexts: Dict[str, np.ndarray] = {}
        self._recent_rewards: Dict[str, Deque[float]] = {}

        # Round counter (for OMD horizon T)
        self._total_rounds: int = 0
        self._selection_count: int = 0

        # Round-robin index for exploration phase
        self._rr_index: int = 0

        # Initialise databases
        self._init_db()
        self._init_state_db()
        self._load_state()

        logger.info(
            "M2CMABScheduler initialised: context_dim=%d, constraints=%s, "
            "lambda_lr=%.3f, softmax_tau=%.2f, min_pulls=%d",
            self.config.context_dim,
            self.config.constraint_names,
            self.config.lambda_lr,
            self.config.softmax_temperature,
            self.config.min_pulls,
        )

    # ---- Database initialisation -------------------------------------------

    def _init_db(self) -> None:
        """Initialise domain stats database (shared schema with other schedulers)."""
        os.makedirs(os.path.dirname(self._db_path) or ".", exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS domain_stats (
                domain        TEXT PRIMARY KEY,
                pages_crawled INTEGER NOT NULL DEFAULT 0,
                reward_sum    REAL NOT NULL DEFAULT 0.0,
                leads_found   INTEGER NOT NULL DEFAULT 0,
                last_crawled  REAL,
                created_at    REAL NOT NULL
            )
        """)
        # Extended stats for context features
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS domain_extra (
                domain              TEXT PRIMARY KEY,
                reward_variance     REAL NOT NULL DEFAULT 0.0,
                failure_rate        REAL NOT NULL DEFAULT 0.0,
                pages_since_last_lead INTEGER NOT NULL DEFAULT 0,
                category            TEXT NOT NULL DEFAULT 'other',
                tld                 TEXT NOT NULL DEFAULT 'other',
                recent_rewards      TEXT NOT NULL DEFAULT '[]',
                depth_distribution  TEXT NOT NULL DEFAULT '[]',
                FOREIGN KEY (domain) REFERENCES domain_stats(domain)
            )
        """)
        self._conn.commit()

    def _init_state_db(self) -> None:
        """Initialise M2-CMAB state persistence database."""
        os.makedirs(os.path.dirname(self._state_db_path) or ".", exist_ok=True)
        self._state_conn = sqlite3.connect(self._state_db_path)
        self._state_conn.execute("PRAGMA journal_mode = WAL")
        self._state_conn.execute("""
            CREATE TABLE IF NOT EXISTS m2cmab_state (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        self._state_conn.commit()

    # ---- Public interface (DomainScheduler drop-in) -------------------------

    def register_domain(self, domain: str) -> None:
        """Register a new domain arm.

        Args:
            domain: fully qualified domain name.
        """
        self._conn.execute(
            """
            INSERT OR IGNORE INTO domain_stats
                (domain, pages_crawled, reward_sum, leads_found, created_at)
            VALUES (?, 0, 0.0, 0, ?)
            """,
            (domain, time.time()),
        )
        self._conn.execute(
            """
            INSERT OR IGNORE INTO domain_extra (domain)
            VALUES (?)
            """,
            (domain,),
        )
        self._conn.commit()

        if domain not in self._recent_rewards:
            self._recent_rewards[domain] = deque(maxlen=50)

    def select_domain(self, available_domains: Optional[List[str]] = None) -> Optional[str]:
        """Select the next domain to crawl using M2-CMAB.

        Phase 1 (exploration): round-robin until every domain has
        >= min_pulls observations.

        Phase 2 (exploitation): softmax sampling from Lagrangian scores
        biased toward high-reward, low-cost domains.

        Args:
            available_domains: optional list restricting the candidate set.
                If None, all registered domains are considered.

        Returns:
            Domain name, or None if no domains are registered.
        """
        if available_domains is not None:
            domains = available_domains
        else:
            rows = self._conn.execute(
                "SELECT domain FROM domain_stats"
            ).fetchall()
            domains = [r[0] for r in rows]

        if not domains:
            return None

        self._selection_count += 1

        # Phase 1: exploration -- round-robin for under-explored domains
        under_explored = [d for d in domains if self._domain_pulls[d] < self.config.min_pulls]
        if under_explored:
            selected = under_explored[self._rr_index % len(under_explored)]
            self._rr_index += 1
            logger.debug(
                "M2-CMAB explore: selected %s (pulls=%d/%d)",
                selected,
                self._domain_pulls[selected],
                self.config.min_pulls,
            )
            return selected

        # Phase 2: Lagrangian score + softmax sampling
        scores = np.zeros(len(domains), dtype=np.float64)
        lambdas = self._dual_updater.get_lambdas()

        for i, domain in enumerate(domains):
            ctx = self._get_domain_context(domain)
            reward_pred = self._reward_predictor.predict(ctx)
            cost_preds = np.array(
                [cp.predict(ctx) for cp in self._cost_predictors],
                dtype=np.float64,
            )
            scores[i] = self._scorer.score(reward_pred, cost_preds, lambdas)

        # Softmax sampling with temperature
        selected = self._softmax_sample(domains, scores)

        logger.debug(
            "M2-CMAB exploit: selected %s (score=%.4f, lambdas=%s)",
            selected,
            scores[domains.index(selected)],
            np.round(lambdas, 3).tolist(),
        )
        return selected

    def update_domain(
        self,
        domain: str,
        reward: float,
        is_lead: bool = False,
        costs: Optional[Dict[str, float]] = None,
    ) -> None:
        """Update scheduler after crawling a page from a domain.

        Updates:
        1. Domain statistics in SQLite.
        2. Reward predictor with observed reward.
        3. Cost predictors with observed costs per constraint.
        4. Dual variables via OMD step.
        5. Constraint consumption tracking.

        Args:
            domain: the crawled domain.
            reward: observed reward (e.g., lead discovery score).
            is_lead: whether this page yielded a lead.
            costs: optional dict mapping constraint name to observed cost.
                   If None, costs are obtained from the ResourceMonitor.
        """
        self._total_rounds += 1
        self._domain_pulls[domain] += 1

        # 1. Update domain stats in SQLite
        self._conn.execute(
            """
            UPDATE domain_stats
            SET pages_crawled = pages_crawled + 1,
                reward_sum = reward_sum + ?,
                leads_found = leads_found + ?,
                last_crawled = ?
            WHERE domain = ?
            """,
            (reward, int(is_lead), time.time(), domain),
        )

        if is_lead:
            self._conn.execute(
                "UPDATE domain_extra SET pages_since_last_lead = 0 WHERE domain = ?",
                (domain,),
            )
        else:
            self._conn.execute(
                """
                UPDATE domain_extra
                SET pages_since_last_lead = pages_since_last_lead + 1
                WHERE domain = ?
                """,
                (domain,),
            )

        # Update recent rewards
        if domain not in self._recent_rewards:
            self._recent_rewards[domain] = deque(maxlen=50)
        self._recent_rewards[domain].append(reward)

        recent_list = list(self._recent_rewards[domain])
        self._conn.execute(
            "UPDATE domain_extra SET recent_rewards = ? WHERE domain = ?",
            (json.dumps(recent_list[-50:]), domain),
        )

        # Update reward variance
        if len(recent_list) > 1:
            var = float(np.var(recent_list))
            self._conn.execute(
                "UPDATE domain_extra SET reward_variance = ? WHERE domain = ?",
                (var, domain),
            )

        self._conn.commit()

        # 2. Get context vector for this domain
        ctx = self._get_domain_context(domain)

        # 3. Get cost vector
        if costs is not None:
            cost_array = np.array(
                [costs.get(name, 0.0) for name in self.config.constraint_names],
                dtype=np.float64,
            )
        else:
            cost_array = self._resource_monitor.get_costs_array(domain)

        # 4. Update reward predictor
        self._reward_predictor.update(ctx, reward)

        # 5. Update cost predictors
        for k in range(self.config.num_constraints):
            self._cost_predictors[k].update(ctx, cost_array[k])

        # 6. Update constraint consumption
        for k in range(self.config.num_constraints):
            self._constraints[k].record(cost_array[k])

        # 7. OMD dual variable update
        budgets = np.array(
            [c.budget for c in self._constraints], dtype=np.float64
        )
        # Use a reasonable horizon estimate (total rounds so far + expected remaining)
        horizon = max(self._total_rounds * 2, 100)
        self._dual_updater.update(cost_array, budgets, horizon)

        # 8. Periodic persistence (every 50 updates)
        if self._total_rounds % 50 == 0:
            self._save_state()

    def get_domain_scores(self) -> Dict[str, Tuple[float, Dict[str, Any]]]:
        """Compute current Lagrangian scores for all registered domains.

        Returns:
            Dict mapping domain to (score, decomposition) where
            decomposition includes reward_pred, cost_preds, and lambdas.
        """
        rows = self._conn.execute(
            "SELECT domain FROM domain_stats"
        ).fetchall()

        lambdas = self._dual_updater.get_lambdas()
        result: Dict[str, Tuple[float, Dict[str, Any]]] = {}

        for (domain,) in rows:
            ctx = self._get_domain_context(domain)
            reward_pred = self._reward_predictor.predict(ctx)
            cost_preds = np.array(
                [cp.predict(ctx) for cp in self._cost_predictors],
                dtype=np.float64,
            )
            score = self._scorer.score(reward_pred, cost_preds, lambdas)

            cost_breakdown = {
                name: round(float(cost_preds[k]), 4)
                for k, name in enumerate(self.config.constraint_names)
            }

            result[domain] = (
                round(score, 4),
                {
                    "reward_pred": round(reward_pred, 4),
                    "cost_preds": cost_breakdown,
                    "lambdas": {
                        name: round(float(lambdas[k]), 4)
                        for k, name in enumerate(self.config.constraint_names)
                    },
                    "pulls": self._domain_pulls.get(domain, 0),
                },
            )

        return result

    def get_constraint_status(self) -> Dict[str, Dict[str, float]]:
        """Return budget utilisation per constraint.

        Returns:
            Dict mapping constraint name to {budget, consumed, headroom,
            utilisation, lambda}.
        """
        lambdas = self._dual_updater.get_lambdas()
        result: Dict[str, Dict[str, float]] = {}

        for k, constraint in enumerate(self._constraints):
            result[constraint.name] = {
                "budget": round(constraint.budget, 4),
                "consumed": round(constraint.consumed, 4),
                "headroom": round(constraint.headroom(), 4),
                "utilisation": round(constraint.utilisation(), 4),
                "lambda": round(float(lambdas[k]), 4),
            }

        return result

    def get_all_stats(self) -> List[Dict[str, Any]]:
        """Return all domain statistics for monitoring.

        Compatible with DomainScheduler.get_all_stats() format.
        """
        rows = self._conn.execute(
            """
            SELECT s.domain, s.pages_crawled, s.reward_sum, s.leads_found,
                   s.last_crawled, e.failure_rate, e.pages_since_last_lead
            FROM domain_stats s
            LEFT JOIN domain_extra e ON s.domain = e.domain
            ORDER BY s.reward_sum / MAX(s.pages_crawled, 1) DESC
            """
        ).fetchall()

        lambdas = self._dual_updater.get_lambdas()
        stats = []

        for r in rows:
            domain = r[0]
            pages = r[1]
            reward_sum = r[2]

            ctx = self._get_domain_context(domain)
            reward_pred = self._reward_predictor.predict(ctx)
            cost_preds = np.array(
                [cp.predict(ctx) for cp in self._cost_predictors],
                dtype=np.float64,
            )
            lagrangian_score = self._scorer.score(reward_pred, cost_preds, lambdas)

            stats.append({
                "domain": domain,
                "pages_crawled": pages,
                "reward_sum": round(reward_sum, 4),
                "leads_found": r[3],
                "avg_reward": round(reward_sum / max(pages, 1), 4),
                "last_crawled": r[4],
                "failure_rate": round(r[5] or 0.0, 4),
                "pages_since_last_lead": r[6] or 0,
                "lagrangian_score": round(lagrangian_score, 4),
                "reward_pred": round(reward_pred, 4),
                "pulls": self._domain_pulls.get(domain, 0),
            })

        return stats

    def get_ucb_score(self, domain: str) -> float:
        """Compute UCB1 score for compatibility with existing code.

        This is provided for backward compatibility; the M2-CMAB scheduler
        uses Lagrangian scores internally, not UCB1.
        """
        row = self._conn.execute(
            "SELECT pages_crawled, reward_sum FROM domain_stats WHERE domain = ?",
            (domain,),
        ).fetchone()
        if row is None or row[0] == 0:
            return float("inf")

        pages, reward = row
        total_row = self._conn.execute(
            "SELECT SUM(pages_crawled) FROM domain_stats"
        ).fetchone()
        total = total_row[0] or 1

        avg = reward / pages
        explore = math.sqrt(
            self.config.ucb1_exploration_constant * math.log(total) / pages
        )
        return avg + explore

    def reset_epoch(self) -> None:
        """Reset constraint consumption and resource monitor for a new epoch.

        Call at the start of each crawl epoch to reset budget tracking
        while preserving learned dual variables and predictor weights.
        """
        for constraint in self._constraints:
            constraint.reset()
        self._resource_monitor.reset_epoch()
        logger.info(
            "M2-CMAB epoch reset: lambdas=%s",
            np.round(self._dual_updater.get_lambdas(), 3).tolist(),
        )

    def close(self) -> None:
        """Persist state and close databases."""
        self._save_state()
        if self._conn:
            self._conn.close()
            self._conn = None
        if self._state_conn:
            self._state_conn.close()
            self._state_conn = None
        logger.info("M2CMABScheduler closed")

    # ---- Internal helpers ---------------------------------------------------

    def _get_domain_context(self, domain: str) -> np.ndarray:
        """Build context vector for a domain, using cached stats."""
        stats = self._load_domain_stats(domain)
        resource_costs = self._resource_monitor.get_costs(domain)
        return self._context_builder.build(stats, resource_costs)

    def _load_domain_stats(self, domain: str) -> Dict[str, Any]:
        """Load domain statistics from both tables."""
        row = self._conn.execute(
            """
            SELECT s.pages_crawled, s.reward_sum, s.leads_found,
                   s.last_crawled, s.created_at,
                   e.reward_variance, e.failure_rate,
                   e.pages_since_last_lead, e.recent_rewards
            FROM domain_stats s
            LEFT JOIN domain_extra e ON s.domain = e.domain
            WHERE s.domain = ?
            """,
            (domain,),
        ).fetchone()
        if row is None:
            return {"domain": domain}

        pages = row[0] or 0
        reward_sum = row[1] or 0.0

        try:
            recent_rewards = json.loads(row[8]) if row[8] else []
        except (json.JSONDecodeError, TypeError):
            recent_rewards = []

        # Prefer in-memory reward window if available
        if domain in self._recent_rewards and self._recent_rewards[domain]:
            recent_rewards = list(self._recent_rewards[domain])

        return {
            "domain": domain,
            "pages_crawled": pages,
            "avg_reward": reward_sum / max(pages, 1),
            "reward_variance": row[5] or 0.0,
            "leads_found": row[2] or 0,
            "last_crawled": row[3],
            "created_at": row[4] or time.time(),
            "failure_rate": row[6] or 0.0,
            "pages_since_last_lead": row[7] or 0,
            "recent_rewards": recent_rewards,
        }

    def _softmax_sample(
        self, domains: List[str], scores: np.ndarray
    ) -> str:
        """Sample a domain from softmax distribution over Lagrangian scores.

        Uses temperature scaling for exploration control:
        - High temperature (tau >> 1): near-uniform sampling (exploration).
        - Low temperature (tau << 1): near-greedy (exploitation).
        - tau = 1.0: standard softmax.

        Numerically stable: subtracts max score before exponentiation.

        Args:
            domains: list of domain names.
            scores: (A,) Lagrangian scores.

        Returns:
            Selected domain name.
        """
        tau = max(self.config.softmax_temperature, 1e-6)

        # Numerically stable softmax
        shifted = scores - np.max(scores)
        exp_scores = np.exp(shifted / tau)
        total = exp_scores.sum()

        if total <= 0 or not np.isfinite(total):
            # Fallback: uniform random
            return domains[np.random.randint(len(domains))]

        probs = exp_scores / total

        # Ensure valid probability distribution
        probs = np.maximum(probs, 0.0)
        prob_sum = probs.sum()
        if prob_sum > 0:
            probs /= prob_sum
        else:
            probs = np.ones(len(domains)) / len(domains)

        idx = np.random.choice(len(domains), p=probs)
        return domains[idx]

    # ---- Persistence --------------------------------------------------------

    def _save_state(self) -> None:
        """Save all learned state to SQLite for warm restart."""
        if self._state_conn is None:
            return

        state = {
            "dual_updater": self._dual_updater.get_state(),
            "reward_predictor": self._reward_predictor.get_weights(),
            "cost_predictors": [
                cp.get_weights() for cp in self._cost_predictors
            ],
            "domain_pulls": dict(self._domain_pulls),
            "total_rounds": self._total_rounds,
            "selection_count": self._selection_count,
            "constraints": [
                {"name": c.name, "consumed": c.consumed}
                for c in self._constraints
            ],
        }

        self._state_conn.execute(
            """
            INSERT OR REPLACE INTO m2cmab_state (key, value)
            VALUES ('scheduler_state', ?)
            """,
            (json.dumps(state, default=_numpy_serializer),),
        )
        self._state_conn.commit()
        logger.debug("M2-CMAB state saved to %s", self._state_db_path)

    def _load_state(self) -> None:
        """Restore learned state from SQLite."""
        if self._state_conn is None:
            return

        row = self._state_conn.execute(
            "SELECT value FROM m2cmab_state WHERE key = 'scheduler_state'"
        ).fetchone()
        if row is None:
            logger.info("No prior M2-CMAB state found -- starting fresh")
            return

        try:
            state = json.loads(row[0])

            # Restore dual variables
            if "dual_updater" in state:
                self._dual_updater.load_state(state["dual_updater"])

            # Restore reward predictor
            if "reward_predictor" in state:
                self._reward_predictor.load_weights(state["reward_predictor"])

            # Restore cost predictors
            if "cost_predictors" in state:
                for k, cp_state in enumerate(state["cost_predictors"]):
                    if k < len(self._cost_predictors):
                        self._cost_predictors[k].load_weights(cp_state)

            # Restore domain pulls
            if "domain_pulls" in state:
                self._domain_pulls = defaultdict(
                    int, state["domain_pulls"]
                )

            # Restore counters
            self._total_rounds = state.get("total_rounds", 0)
            self._selection_count = state.get("selection_count", 0)

            # Restore constraint consumption
            if "constraints" in state:
                for cs in state["constraints"]:
                    for constraint in self._constraints:
                        if constraint.name == cs["name"]:
                            constraint.consumed = cs.get("consumed", 0.0)

            logger.info(
                "M2-CMAB state restored: %d rounds, lambdas=%s",
                self._total_rounds,
                np.round(self._dual_updater.get_lambdas(), 3).tolist(),
            )

        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            logger.warning(
                "Failed to restore M2-CMAB state: %s -- starting fresh", exc
            )


# ======================= Serialisation Helper ===============================

def _numpy_serializer(obj: Any) -> Any:
    """JSON serialiser for numpy types."""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

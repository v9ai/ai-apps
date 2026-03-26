"""
LARL (Latent Auto-Regressive Bandits) domain scheduler for temporal drift
tracking in domain scheduling.

Implements the LARL algorithm (Trella et al., 2025) adapted for B2B lead-gen
crawling: each job board domain is an arm, rewards are normalised job yields,
and the latent state models aggregate market hiring activity that drifts over
time due to hiring cycles, domain freshness decay, and market shifts.

Key components:
1. LARLConfig: all tunables for the scheduler
2. DomainContext: feature vector builder for a single domain
3. KalmanFilter: scalar Kalman filter for latent state estimation
4. LinUCBArm: per-domain linear contextual bandit arm with ridge regression
5. LARLScheduler: main scheduler (drop-in replacement for DomainScheduler)
6. TemporalFeatureExtractor: cyclic temporal features and trend signals

Key properties:
- Pure numpy (no torch dependency) -- O(d^2) per update where d=context_dim
- SQLite persistence for A, b matrices and Kalman states
- Memory: < 5 MB total for hundreds of domains
- Falls back to UCB1 when < 50 observations per domain
- Interface mirrors DomainScheduler: register_domain, select_domain,
  update_domain, get_all_stats, close

References:
    Trella et al. (2025) "Non-Stationary Latent Auto-Regressive Bandits"
    arXiv:2402.03110, RLC 2025 / Reinforcement Learning Journal vol. 6

Target: Apple M1 16GB, zero cloud dependency.
"""

import json
import logging
import math
import os
import sqlite3
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_larl")


# ======================= Configuration ======================================

@dataclass
class LARLConfig:
    """Hyperparameters for the LARL domain scheduler.

    All values follow Trella et al. (2025) recommendations, adapted for
    the domain scheduling problem (~30-100 arms, drifting rewards).
    """

    # Feature dimensions
    context_dim: int = 16       # domain context vector dimension
    latent_dim: int = 4         # latent state dimension (unused in scalar mode, reserved)

    # Autoregressive context
    history_window: int = 20    # number of recent observations for AR context
    ar_order: int = 3           # autoregressive order (k in the paper)

    # Exploration
    exploration_coeff: float = 1.0  # alpha -- UCB exploration coefficient
    regularization: float = 1.0     # lambda -- ridge regression regularisation

    # Kalman filter
    kalman_process_noise: float = 0.01   # Q -- process noise variance
    kalman_observation_noise: float = 0.1  # R -- observation noise variance

    # Fallback threshold -- use UCB1 until this many observations per domain
    min_observations_per_domain: int = 50

    # UCB1 fallback constant (same as CrawlerConfig.ucb_exploration_constant)
    ucb1_exploration_constant: float = 2.0

    # Persistence
    sqlite_path: str = "scrapus_data/larl_state.db"

    # Reward trend window (for temporal feature extraction)
    reward_trend_window: int = 50


# ======================= Domain Context =====================================

@dataclass
class DomainContext:
    """Feature vector representation for a single domain at a point in time.

    Encodes both static domain properties and dynamic temporal signals
    into a fixed-length vector for the LinUCB arm.

    Attributes:
        domain: domain name (e.g. "boards.greenhouse.io").
        historical_yield: average leads per crawl session.
        pages_crawled: total pages crawled for this domain.
        last_crawl_timestamp: epoch timestamp of last crawl.
        time_since_last_crawl: seconds since last crawl.
        day_of_week: 0 (Monday) to 6 (Sunday).
        hour_of_day: 0 to 23.
        recent_rewards: last N reward values for trend computation.
    """

    domain: str
    historical_yield: float = 0.0
    pages_crawled: int = 0
    last_crawl_timestamp: float = 0.0
    time_since_last_crawl: float = 0.0
    day_of_week: int = 0
    hour_of_day: int = 0
    recent_rewards: List[float] = field(default_factory=list)

    def to_vector(self, config: "LARLConfig") -> np.ndarray:
        """Convert domain context to a fixed-length feature vector.

        Layout (context_dim = 16):
            [0]   historical_yield (clipped to [0, 1])
            [1]   log1p(pages_crawled) / 10  (normalised)
            [2]   time_since_last_crawl / 168h  (normalised to 1 week)
            [3]   day_of_week sin (cyclic)
            [4]   day_of_week cos (cyclic)
            [5]   hour_of_day sin (cyclic)
            [6]   hour_of_day cos (cyclic)
            [7]   reward_trend (slope of recent rewards)
            [8]   reward_mean (mean of recent rewards)
            [9]   reward_std (std of recent rewards)
            [10]  reward_momentum (mean of last 5 vs last 10)
            [11]  hiring_cycle_q1 (Jan-Mar seasonal signal)
            [12]  hiring_cycle_q3 (Jul-Sep seasonal signal)
            [13-14] AR features from recent rewards (lagged means)
            [15]  bias term (always 1.0)

        Returns:
            np.ndarray of shape (context_dim,), dtype float64.
        """
        vec = np.zeros(config.context_dim, dtype=np.float64)

        # [0] Historical yield, clipped
        vec[0] = min(max(self.historical_yield, 0.0), 1.0)

        # [1] Pages crawled (log-scaled, normalised)
        vec[1] = math.log1p(self.pages_crawled) / 10.0

        # [2] Time since last crawl (normalised to 1 week = 168 hours)
        hours_since = self.time_since_last_crawl / 3600.0
        vec[2] = min(hours_since / 168.0, 1.0)

        # [3-4] Day of week (cyclic encoding)
        vec[3] = math.sin(2.0 * math.pi * self.day_of_week / 7.0)
        vec[4] = math.cos(2.0 * math.pi * self.day_of_week / 7.0)

        # [5-6] Hour of day (cyclic encoding)
        vec[5] = math.sin(2.0 * math.pi * self.hour_of_day / 24.0)
        vec[6] = math.cos(2.0 * math.pi * self.hour_of_day / 24.0)

        # [7] Reward trend (slope of recent rewards via linear regression)
        vec[7] = self._compute_trend(self.recent_rewards)

        # [8-9] Reward statistics
        if self.recent_rewards:
            arr = np.array(self.recent_rewards, dtype=np.float64)
            vec[8] = float(np.mean(arr))
            vec[9] = float(np.std(arr)) if len(arr) > 1 else 0.0
        else:
            vec[8] = 0.0
            vec[9] = 0.0

        # [10] Reward momentum: mean(last 5) - mean(last 10)
        if len(self.recent_rewards) >= 5:
            last_5 = np.mean(self.recent_rewards[-5:])
            last_10 = np.mean(self.recent_rewards[-min(10, len(self.recent_rewards)):])
            vec[10] = float(last_5 - last_10)

        # [11-12] Hiring cycle seasonality signals
        now = time.localtime(self.last_crawl_timestamp or time.time())
        month = now.tm_mon  # 1-12
        # Q1 signal (Jan-Mar peak hiring)
        vec[11] = math.sin(2.0 * math.pi * month / 12.0)
        # Q3 signal (Jul-Sep post-summer)
        vec[12] = math.cos(2.0 * math.pi * month / 12.0)

        # [13-14] AR features: lagged reward means
        if len(self.recent_rewards) >= config.ar_order:
            for lag in range(min(2, config.ar_order)):
                start = -(lag + 1) * max(config.ar_order, 1)
                end = -lag * max(config.ar_order, 1) if lag > 0 else None
                window = self.recent_rewards[start:end]
                if window:
                    vec[13 + lag] = float(np.mean(window))

        # [15] Bias term
        vec[min(config.context_dim - 1, 15)] = 1.0

        return vec

    @staticmethod
    def _compute_trend(rewards: List[float]) -> float:
        """Compute linear regression slope over a reward window.

        Returns 0.0 for windows shorter than 2 samples.
        """
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
        return float(slope)


# ======================= Temporal Feature Extractor ==========================

class TemporalFeatureExtractor:
    """Extracts temporal features for augmenting domain context vectors.

    Features extracted:
    - Day of week (cyclic sin/cos encoding)
    - Hour of day (cyclic sin/cos encoding)
    - Recent reward trend (linear regression slope)
    - Hiring cycle seasonality signal (monthly sin/cos)
    """

    @staticmethod
    def day_of_week_features(timestamp: Optional[float] = None) -> Tuple[float, float]:
        """Cyclic encoding of day-of-week (0=Monday, 6=Sunday).

        Returns:
            (sin, cos) tuple for the day of week.
        """
        t = time.localtime(timestamp or time.time())
        dow = t.tm_wday  # 0=Monday
        sin_val = math.sin(2.0 * math.pi * dow / 7.0)
        cos_val = math.cos(2.0 * math.pi * dow / 7.0)
        return sin_val, cos_val

    @staticmethod
    def hour_of_day_features(timestamp: Optional[float] = None) -> Tuple[float, float]:
        """Cyclic encoding of hour-of-day (0-23).

        Returns:
            (sin, cos) tuple for the hour of day.
        """
        t = time.localtime(timestamp or time.time())
        hour = t.tm_hour
        sin_val = math.sin(2.0 * math.pi * hour / 24.0)
        cos_val = math.cos(2.0 * math.pi * hour / 24.0)
        return sin_val, cos_val

    @staticmethod
    def reward_trend(rewards: List[float]) -> float:
        """Compute linear regression slope of the last N rewards.

        Returns:
            Slope coefficient (positive = improving, negative = declining).
            Returns 0.0 for fewer than 2 observations.
        """
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
        return float(slope)

    @staticmethod
    def hiring_cycle_signal(timestamp: Optional[float] = None) -> Tuple[float, float]:
        """Seasonality signal based on month-of-year.

        Encodes hiring cycle patterns:
        - Q1 (Jan-Mar): peak hiring season
        - Q3 (Jul-Sep): post-summer hiring

        Returns:
            (sin, cos) tuple for the month of year.
        """
        t = time.localtime(timestamp or time.time())
        month = t.tm_mon  # 1-12
        sin_val = math.sin(2.0 * math.pi * month / 12.0)
        cos_val = math.cos(2.0 * math.pi * month / 12.0)
        return sin_val, cos_val


# ======================= Kalman Filter ======================================

class KalmanFilter:
    """Scalar Kalman filter for latent state estimation per domain.

    Models the latent yield state as a random walk:
        x_{t+1} = x_t + process_noise       (state transition)
        y_t     = x_t + observation_noise    (observation model)

    Maintains (mu, sigma^2) belief state that is updated with each
    new observation (crawl yield).

    This tracks temporal drift in domain yields -- when a domain's
    true yield changes over time due to hiring cycles or freshness
    decay, the Kalman filter adapts the estimated yield faster than
    a simple running average.
    """

    def __init__(
        self,
        process_noise: float = 0.01,
        observation_noise: float = 0.1,
        initial_mu: float = 0.0,
        initial_variance: float = 1.0,
    ) -> None:
        """Initialise the Kalman filter.

        Args:
            process_noise: Q -- variance of the state transition noise.
            observation_noise: R -- variance of the observation noise.
            initial_mu: initial mean estimate of the latent state.
            initial_variance: initial variance of the state estimate.
        """
        self.Q = process_noise
        self.R = observation_noise
        self.mu = initial_mu
        self.variance = initial_variance
        self._n_updates = 0

    def predict(self) -> Tuple[float, float]:
        """Predict the next latent state (prior).

        State transition: x_{t+1} = x_t + noise
        Variance grows by Q each step.

        Returns:
            (predicted_mean, predicted_variance) tuple.
        """
        predicted_mu = self.mu
        predicted_variance = self.variance + self.Q
        return predicted_mu, predicted_variance

    def update(self, observation: float) -> Tuple[float, float]:
        """Update the state estimate with a new observation.

        Performs the full predict-then-update cycle:
        1. Predict: mu_prior = mu, var_prior = variance + Q
        2. Kalman gain: K = var_prior / (var_prior + R)
        3. Update: mu = mu_prior + K * (observation - mu_prior)
        4. Update: variance = (1 - K) * var_prior

        Args:
            observation: the observed reward (e.g. normalised yield).

        Returns:
            (updated_mean, updated_variance) tuple.
        """
        # Predict step
        mu_prior, var_prior = self.predict()

        # Kalman gain
        K = var_prior / (var_prior + self.R)

        # Update step
        innovation = observation - mu_prior
        self.mu = mu_prior + K * innovation
        self.variance = (1.0 - K) * var_prior

        self._n_updates += 1

        return self.mu, self.variance

    def to_dict(self) -> Dict[str, float]:
        """Serialise state for persistence."""
        return {
            "mu": self.mu,
            "variance": self.variance,
            "Q": self.Q,
            "R": self.R,
            "n_updates": float(self._n_updates),
        }

    @classmethod
    def from_dict(cls, d: Dict[str, float]) -> "KalmanFilter":
        """Restore from serialised state."""
        kf = cls(
            process_noise=d.get("Q", 0.01),
            observation_noise=d.get("R", 0.1),
            initial_mu=d.get("mu", 0.0),
            initial_variance=d.get("variance", 1.0),
        )
        kf._n_updates = int(d.get("n_updates", 0))
        return kf


# ======================= LinUCB Arm =========================================

class LinUCBArm:
    """Per-domain linear contextual bandit arm with ridge regression.

    Maintains the sufficient statistics (A, b) for online ridge
    regression and computes LinUCB upper confidence bound scores.

    The reward model is:
        r = context^T theta + noise

    where theta is estimated via:
        theta_hat = A^{-1} b

    and the UCB score is:
        score = context^T theta_hat + alpha * sqrt(context^T A^{-1} context)

    Memory per arm: A is d x d (16x16 = 2 KB), b is d (128 bytes).
    With 100 domains: ~200 KB total.
    """

    def __init__(self, d: int, regularization: float = 1.0) -> None:
        """Initialise the arm.

        Args:
            d: context dimension.
            regularization: lambda -- ridge regression regularisation.
                Initialises A = lambda * I_d.
        """
        self.d = d
        self.regularization = regularization

        # A: d x d design matrix (initialised to lambda * I)
        self.A: np.ndarray = regularization * np.eye(d, dtype=np.float64)

        # b: d x 1 reward-weighted context sum
        self.b: np.ndarray = np.zeros(d, dtype=np.float64)

        # Cache A_inv for efficiency (recomputed on update)
        self._A_inv: Optional[np.ndarray] = None
        self._theta: Optional[np.ndarray] = None
        self._n_updates: int = 0

    def update(self, context: np.ndarray, reward: float) -> None:
        """Update arm statistics with a new (context, reward) observation.

        Performs the recursive least squares update:
            A <- A + context * context^T
            b <- b + reward * context

        Args:
            context: feature vector of shape (d,).
            reward: observed reward scalar.
        """
        context = context.astype(np.float64)
        self.A += np.outer(context, context)
        self.b += reward * context

        # Invalidate cache
        self._A_inv = None
        self._theta = None
        self._n_updates += 1

    def predict(self, context: np.ndarray, alpha: float = 1.0) -> Tuple[float, float]:
        """Predict reward with confidence bound (LinUCB score).

        Args:
            context: feature vector of shape (d,).
            alpha: exploration coefficient.

        Returns:
            (mean, ucb_score) where:
                mean = context^T theta_hat
                ucb_score = mean + alpha * sqrt(context^T A^{-1} context)
        """
        context = context.astype(np.float64)

        # Compute A_inv and theta if not cached
        if self._A_inv is None:
            self._A_inv = np.linalg.inv(self.A)
        if self._theta is None:
            self._theta = self._A_inv @ self.b

        mean = float(context @ self._theta)

        # Confidence width: sqrt(context^T A^{-1} context)
        width = float(np.sqrt(context @ self._A_inv @ context))

        ucb_score = mean + alpha * width
        return mean, ucb_score

    @property
    def theta(self) -> np.ndarray:
        """Current parameter estimate theta_hat = A^{-1} b."""
        if self._theta is None:
            if self._A_inv is None:
                self._A_inv = np.linalg.inv(self.A)
            self._theta = self._A_inv @ self.b
        return self._theta

    @property
    def n_updates(self) -> int:
        """Number of updates applied to this arm."""
        return self._n_updates

    def to_dict(self) -> Dict[str, Any]:
        """Serialise arm state for persistence."""
        return {
            "A": self.A.tolist(),
            "b": self.b.tolist(),
            "d": self.d,
            "regularization": self.regularization,
            "n_updates": self._n_updates,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "LinUCBArm":
        """Restore arm from serialised state."""
        dim = d["d"]
        arm = cls(dim, d.get("regularization", 1.0))
        arm.A = np.array(d["A"], dtype=np.float64)
        arm.b = np.array(d["b"], dtype=np.float64)
        arm._n_updates = d.get("n_updates", 0)
        return arm


# ======================= LARL Scheduler =====================================

class LARLScheduler:
    """LARL (Latent Auto-Regressive Bandits) domain scheduler.

    Drop-in replacement for DomainScheduler with the same interface:
    register_domain, select_domain, update_domain, get_all_stats, close.

    Arms = web domains.
    Context = 16-dim feature vector per domain (temporal + crawl stats).
    Reward = lead discovery success rate (normalised yield).
    Score = LinUCB mean + alpha * confidence_width + Kalman drift adjustment.

    The scheduler combines three signals:
    1. LinUCB contextual bandit: learns domain-specific reward models
       conditioned on temporal and crawl-history features.
    2. Kalman filter: tracks temporal drift in each domain's latent
       yield state, adapting faster than a running average.
    3. AR features: augments the context with autoregressive signals
       from recent reward history to capture temporal dependencies.

    Falls back to UCB1 when a domain has < min_observations_per_domain
    total observations.

    Memory: < 5 MB for 100 domains (A matrices + Kalman states + history).
    Compute: O(d^2) per update where d=16 -- negligible.
    """

    def __init__(self, config: Optional[LARLConfig] = None) -> None:
        self.config = config or LARLConfig()
        self._db_path = self.config.sqlite_path
        self._conn: Optional[sqlite3.Connection] = None

        # Per-domain LinUCB arms
        self._arms: Dict[str, LinUCBArm] = {}

        # Per-domain Kalman filters for latent state tracking
        self._kalman_filters: Dict[str, KalmanFilter] = {}

        # Per-domain recent reward history (for AR context and trends)
        self._reward_windows: Dict[str, Deque[float]] = {}

        # Temporal feature extractor
        self._temporal = TemporalFeatureExtractor()

        # Selection counter
        self._selection_count: int = 0

        # Initialise DB and load persisted state
        self._init_db()
        self._load_state()

    # ---- Database initialisation -------------------------------------------

    def _init_db(self) -> None:
        """Create SQLite database and tables for persistence."""
        os.makedirs(os.path.dirname(self._db_path) or ".", exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")

        # Domain statistics (mirrors DomainScheduler for interface compat)
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

        # LinUCB arm state (A matrix, b vector)
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS larl_arms (
                domain    TEXT PRIMARY KEY,
                arm_state TEXT NOT NULL,
                FOREIGN KEY (domain) REFERENCES domain_stats(domain)
            )
        """)

        # Kalman filter state
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS larl_kalman (
                domain       TEXT PRIMARY KEY,
                kalman_state TEXT NOT NULL,
                FOREIGN KEY (domain) REFERENCES domain_stats(domain)
            )
        """)

        # Recent rewards history (JSON list)
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS larl_rewards (
                domain         TEXT PRIMARY KEY,
                recent_rewards TEXT NOT NULL DEFAULT '[]',
                FOREIGN KEY (domain) REFERENCES domain_stats(domain)
            )
        """)

        self._conn.commit()

    # ---- State persistence -------------------------------------------------

    def _load_state(self) -> None:
        """Load all persisted state from SQLite on startup."""
        if self._conn is None:
            return

        # Load LinUCB arms
        rows = self._conn.execute(
            "SELECT domain, arm_state FROM larl_arms"
        ).fetchall()
        for domain, arm_json in rows:
            try:
                arm_dict = json.loads(arm_json)
                self._arms[domain] = LinUCBArm.from_dict(arm_dict)
            except (json.JSONDecodeError, KeyError, ValueError) as exc:
                logger.warning(
                    "Failed to load LinUCB arm for %s: %s", domain, exc
                )

        # Load Kalman filters
        rows = self._conn.execute(
            "SELECT domain, kalman_state FROM larl_kalman"
        ).fetchall()
        for domain, kf_json in rows:
            try:
                kf_dict = json.loads(kf_json)
                self._kalman_filters[domain] = KalmanFilter.from_dict(kf_dict)
            except (json.JSONDecodeError, KeyError, ValueError) as exc:
                logger.warning(
                    "Failed to load Kalman filter for %s: %s", domain, exc
                )

        # Load recent rewards
        rows = self._conn.execute(
            "SELECT domain, recent_rewards FROM larl_rewards"
        ).fetchall()
        for domain, rewards_json in rows:
            try:
                rewards_list = json.loads(rewards_json)
                self._reward_windows[domain] = deque(
                    rewards_list, maxlen=self.config.reward_trend_window
                )
            except (json.JSONDecodeError, TypeError):
                self._reward_windows[domain] = deque(
                    maxlen=self.config.reward_trend_window
                )

        loaded = len(self._arms)
        if loaded > 0:
            logger.info(
                "LARL loaded state: %d arms, %d Kalman filters, %d reward windows",
                loaded,
                len(self._kalman_filters),
                len(self._reward_windows),
            )

    def _save_arm(self, domain: str) -> None:
        """Persist a single arm's state to SQLite."""
        if domain not in self._arms or self._conn is None:
            return
        arm_json = json.dumps(self._arms[domain].to_dict())
        self._conn.execute(
            "INSERT OR REPLACE INTO larl_arms (domain, arm_state) VALUES (?, ?)",
            (domain, arm_json),
        )

    def _save_kalman(self, domain: str) -> None:
        """Persist a single Kalman filter's state to SQLite."""
        if domain not in self._kalman_filters or self._conn is None:
            return
        kf_json = json.dumps(self._kalman_filters[domain].to_dict())
        self._conn.execute(
            "INSERT OR REPLACE INTO larl_kalman (domain, kalman_state) VALUES (?, ?)",
            (domain, kf_json),
        )

    def _save_rewards(self, domain: str) -> None:
        """Persist a domain's recent reward history to SQLite."""
        if domain not in self._reward_windows or self._conn is None:
            return
        rewards_json = json.dumps(list(self._reward_windows[domain]))
        self._conn.execute(
            "INSERT OR REPLACE INTO larl_rewards (domain, recent_rewards) VALUES (?, ?)",
            (domain, rewards_json),
        )

    # ---- Public interface (DomainScheduler drop-in) -------------------------

    def register_domain(self, domain: str) -> None:
        """Register a new domain arm.

        Creates the domain_stats row, initialises a LinUCB arm with
        A = lambda * I, and creates a Kalman filter for latent state
        tracking.
        """
        self._conn.execute(
            """
            INSERT OR IGNORE INTO domain_stats
                (domain, pages_crawled, reward_sum, leads_found, created_at)
            VALUES (?, 0, 0.0, 0, ?)
            """,
            (domain, time.time()),
        )
        self._conn.commit()

        # Initialise LinUCB arm if not already loaded
        if domain not in self._arms:
            self._arms[domain] = LinUCBArm(
                self.config.context_dim,
                self.config.regularization,
            )
            self._save_arm(domain)

        # Initialise Kalman filter if not already loaded
        if domain not in self._kalman_filters:
            self._kalman_filters[domain] = KalmanFilter(
                process_noise=self.config.kalman_process_noise,
                observation_noise=self.config.kalman_observation_noise,
            )
            self._save_kalman(domain)

        # Initialise reward window
        if domain not in self._reward_windows:
            self._reward_windows[domain] = deque(
                maxlen=self.config.reward_trend_window
            )
            self._conn.execute(
                "INSERT OR IGNORE INTO larl_rewards (domain, recent_rewards) VALUES (?, '[]')",
                (domain,),
            )

        self._conn.commit()

    def select_domain(self, available_domains: Optional[List[str]] = None) -> Optional[str]:
        """Select the next domain to crawl using LARL.

        Algorithm:
        1. For each domain, build a context vector with temporal + AR features.
        2. If the domain has < min_observations, use UCB1 score instead.
        3. Otherwise, compute LinUCB score (mean + alpha * confidence width).
        4. Augment with Kalman filter drift estimate.
        5. Select domain with the highest combined score.

        Args:
            available_domains: optional list of domains to select from.
                If None, selects from all registered domains.

        Returns:
            The selected domain name, or None if no domains registered.
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

        # Load stats for scoring
        stats = self._load_all_stats(domains)

        best_domain: Optional[str] = None
        best_score = -float("inf")

        for domain in domains:
            domain_stats = stats.get(domain)
            if domain_stats is None:
                # Unregistered domain -- highest priority for exploration
                return domain

            pages = domain_stats.get("pages_crawled", 0)

            # Force exploration of unvisited domains
            if pages == 0:
                self._selection_count += 1
                return domain

            # Fall back to UCB1 when insufficient data for this domain
            if pages < self.config.min_observations_per_domain:
                score = self._ucb1_score(domain_stats, stats)
            else:
                score = self._larl_score(domain, domain_stats)

            if score > best_score:
                best_score = score
                best_domain = domain

        self._selection_count += 1
        return best_domain

    def update_domain(
        self,
        domain: str,
        reward: float,
        is_lead: bool = False,
    ) -> None:
        """Update domain statistics after crawling a page.

        Performs three updates:
        1. Domain stats (pages, reward sum, leads) in SQLite.
        2. LinUCB arm (A matrix, b vector) with the context-reward pair.
        3. Kalman filter with the observed reward for drift tracking.

        Args:
            domain: the domain that was crawled.
            reward: observed reward (normalised yield, typically [0, 1]).
            is_lead: whether a lead was found on this page.
        """
        # Update main stats table
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

        # Update recent rewards window
        if domain not in self._reward_windows:
            self._reward_windows[domain] = deque(
                maxlen=self.config.reward_trend_window
            )
        self._reward_windows[domain].append(reward)
        self._save_rewards(domain)

        # Build context vector for this observation
        context = self._build_context(domain)

        # Update LinUCB arm
        if domain not in self._arms:
            self._arms[domain] = LinUCBArm(
                self.config.context_dim,
                self.config.regularization,
            )
        self._arms[domain].update(context, reward)
        self._save_arm(domain)

        # Update Kalman filter with observed reward
        if domain not in self._kalman_filters:
            self._kalman_filters[domain] = KalmanFilter(
                process_noise=self.config.kalman_process_noise,
                observation_noise=self.config.kalman_observation_noise,
            )
        self._kalman_filters[domain].update(reward)
        self._save_kalman(domain)

        self._conn.commit()

    def get_all_stats(self) -> List[Dict[str, Any]]:
        """Return all domain statistics for monitoring.

        Returns a list of dicts with domain stats, LinUCB scores,
        and Kalman filter estimates.
        """
        rows = self._conn.execute(
            """
            SELECT domain, pages_crawled, reward_sum, leads_found, last_crawled
            FROM domain_stats
            ORDER BY reward_sum / MAX(pages_crawled, 1) DESC
            """
        ).fetchall()
        result = []
        for r in rows:
            domain = r[0]
            pages = r[1]
            reward_sum = r[2]
            avg_reward = reward_sum / max(pages, 1)

            entry: Dict[str, Any] = {
                "domain": domain,
                "pages_crawled": pages,
                "reward_sum": round(reward_sum, 4),
                "leads_found": r[3],
                "avg_reward": round(avg_reward, 4),
                "last_crawled": r[4],
            }

            # Add Kalman state if available
            if domain in self._kalman_filters:
                kf = self._kalman_filters[domain]
                entry["kalman_mu"] = round(kf.mu, 4)
                entry["kalman_variance"] = round(kf.variance, 4)

            # Add LinUCB arm stats
            if domain in self._arms:
                entry["linucb_updates"] = self._arms[domain].n_updates

            result.append(entry)
        return result

    def get_domain_scores(self) -> Dict[str, float]:
        """Return current LARL UCB scores for all domains.

        Returns:
            Dict mapping domain name to its current UCB score.
        """
        rows = self._conn.execute(
            "SELECT domain FROM domain_stats"
        ).fetchall()
        domains = [r[0] for r in rows]

        if not domains:
            return {}

        stats = self._load_all_stats(domains)
        scores: Dict[str, float] = {}

        for domain in domains:
            domain_stats = stats.get(domain)
            if domain_stats is None:
                scores[domain] = float("inf")
                continue

            pages = domain_stats.get("pages_crawled", 0)
            if pages == 0:
                scores[domain] = float("inf")
            elif pages < self.config.min_observations_per_domain:
                scores[domain] = self._ucb1_score(domain_stats, stats)
            else:
                scores[domain] = self._larl_score(domain, domain_stats)

        return scores

    def get_ucb_score(self, domain: str) -> float:
        """Compute the current score for a specific domain (compatibility)."""
        row = self._conn.execute(
            "SELECT pages_crawled, reward_sum FROM domain_stats WHERE domain = ?",
            (domain,),
        ).fetchone()
        if row is None or row[0] == 0:
            return float("inf")  # unseen domain

        pages, reward = row
        stats = self._load_all_stats([domain])
        domain_stats = stats.get(domain, {})

        if pages < self.config.min_observations_per_domain:
            all_stats = self._load_all_stats(None)
            return self._ucb1_score(domain_stats, all_stats)

        return self._larl_score(domain, domain_stats)

    def close(self) -> None:
        """Persist all state and close database."""
        if self._conn is None:
            return

        # Persist all arms and Kalman filters
        for domain in self._arms:
            self._save_arm(domain)
        for domain in self._kalman_filters:
            self._save_kalman(domain)
        for domain in self._reward_windows:
            self._save_rewards(domain)

        self._conn.commit()
        self._conn.close()
        self._conn = None
        logger.info("LARL scheduler closed and state persisted")

    # ---- Internal scoring methods ------------------------------------------

    def _larl_score(
        self, domain: str, domain_stats: Dict[str, Any]
    ) -> float:
        """Compute the full LARL score for a domain.

        Combines:
        1. LinUCB UCB score (mean + alpha * confidence width)
        2. Kalman filter drift signal (predicted latent state shift)

        The Kalman drift is added to the LinUCB mean to account for
        temporal non-stationarity that LinUCB alone cannot capture.

        Args:
            domain: domain name.
            domain_stats: preloaded stats for this domain.

        Returns:
            Combined LARL score (higher = more promising to crawl).
        """
        context = self._build_context(domain, domain_stats)

        # LinUCB score
        if domain in self._arms:
            mean, ucb_score = self._arms[domain].predict(
                context, self.config.exploration_coeff
            )
        else:
            # No arm state -- return high score to force exploration
            return float("inf")

        # Kalman drift adjustment
        kalman_adjustment = 0.0
        if domain in self._kalman_filters:
            kf = self._kalman_filters[domain]
            predicted_mu, predicted_var = kf.predict()

            # The predicted latent state captures drift direction.
            # Positive predicted_mu means the domain is trending up.
            # We add it weighted by 1/sqrt(variance) to reduce the
            # signal when the Kalman filter is uncertain.
            if predicted_var > 0:
                confidence = 1.0 / math.sqrt(predicted_var)
                kalman_adjustment = predicted_mu * min(confidence, 1.0)

        return ucb_score + kalman_adjustment

    def _ucb1_score(
        self,
        domain_stats: Dict[str, Any],
        all_stats: Dict[str, Dict[str, Any]],
    ) -> float:
        """Compute standard UCB1 score for a domain (fallback).

        Used when the domain has fewer than min_observations_per_domain
        observations.

        Args:
            domain_stats: stats for the target domain.
            all_stats: stats for all domains (for total pages count).

        Returns:
            UCB1 score.
        """
        pages = domain_stats.get("pages_crawled", 0)
        if pages == 0:
            return float("inf")

        reward_sum = domain_stats.get("reward_sum", 0.0)
        avg_reward = reward_sum / pages

        total_pages = sum(
            s.get("pages_crawled", 0) for s in all_stats.values()
        )
        if total_pages == 0:
            return float("inf")

        c = self.config.ucb1_exploration_constant
        explore = math.sqrt(c * math.log(total_pages) / pages)
        return avg_reward + explore

    # ---- Context building --------------------------------------------------

    def _build_context(
        self,
        domain: str,
        domain_stats: Optional[Dict[str, Any]] = None,
    ) -> np.ndarray:
        """Build the augmented context vector for a domain.

        Combines domain features with AR features from recent reward
        history to enable LARL's latent state tracking.

        Args:
            domain: domain name.
            domain_stats: preloaded stats (loaded from DB if None).

        Returns:
            np.ndarray of shape (context_dim,), dtype float64.
        """
        if domain_stats is None:
            stats_dict = self._load_all_stats([domain])
            domain_stats = stats_dict.get(domain, {})

        # Build recent rewards list
        recent: List[float] = []
        if domain in self._reward_windows:
            recent = list(self._reward_windows[domain])

        # Get current timestamp info
        now = time.time()
        last_crawled = domain_stats.get("last_crawled") or now
        t = time.localtime(now)

        pages = domain_stats.get("pages_crawled", 0)
        reward_sum = domain_stats.get("reward_sum", 0.0)
        avg_reward = reward_sum / max(pages, 1)

        ctx = DomainContext(
            domain=domain,
            historical_yield=avg_reward,
            pages_crawled=pages,
            last_crawl_timestamp=last_crawled,
            time_since_last_crawl=now - last_crawled,
            day_of_week=t.tm_wday,
            hour_of_day=t.tm_hour,
            recent_rewards=recent,
        )

        return ctx.to_vector(self.config)

    # ---- Data loading helpers ----------------------------------------------

    def _load_all_stats(
        self, domains: Optional[List[str]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """Load statistics for all (or specified) domains from SQLite.

        Args:
            domains: list of domains to load. If None, loads all.

        Returns:
            Dict mapping domain name to stats dict.
        """
        if domains is not None:
            placeholders = ",".join("?" for _ in domains)
            rows = self._conn.execute(
                f"""
                SELECT domain, pages_crawled, reward_sum, leads_found,
                       last_crawled, created_at
                FROM domain_stats
                WHERE domain IN ({placeholders})
                """,
                domains,
            ).fetchall()
        else:
            rows = self._conn.execute(
                """
                SELECT domain, pages_crawled, reward_sum, leads_found,
                       last_crawled, created_at
                FROM domain_stats
                """
            ).fetchall()

        result: Dict[str, Dict[str, Any]] = {}
        for r in rows:
            domain = r[0]
            result[domain] = {
                "domain": domain,
                "pages_crawled": r[1],
                "reward_sum": r[2],
                "leads_found": r[3],
                "last_crawled": r[4],
                "created_at": r[5],
            }
        return result

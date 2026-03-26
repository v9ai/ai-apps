"""
NeuralUCB domain scheduler — drop-in upgrade for UCB1 DomainScheduler.

Implements NeuralUCB (Zhou et al. 2020) with MC Dropout uncertainty
estimation for contextual bandit domain prioritisation.

Key properties:
- Context-aware: uses 64-dim domain feature vectors (crawl stats,
  reward trends, TLD features, category one-hot) instead of scalar
  counters.
- Uncertainty via MC Dropout: multiple stochastic forward passes
  yield mean + std for exploration bonus.
- Gradient-based uncertainty (alternative): ||grad_theta f(x; theta)||
  computed at each domain context for a second uncertainty signal.
- Periodic retraining on a sliding window of (context, reward) pairs.
- Falls back to UCB1 when < 100 observations are available.
- SQLite persistence for training buffer and model weights.

Interface mirrors DomainScheduler: register_domain, select_domain,
update_domain, get_all_stats, close.

Gated behind _HAS_TORCH — works without PyTorch at import time.

Target: Apple M1 16GB, zero cloud dependency.

References:
    Zhou et al. (2020) "Neural Contextual Bandits with UCB-style Exploration"
    Kumari et al. (2023) — NeuralUCB achieves -58% regret vs UCB1
    Ghasemi & Crowley (2026) — trust boundaries for contextual bandits
"""

import json
import logging
import math
import os
import pickle
import sqlite3
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_neural_ucb")

# ---------------------------------------------------------------------------
# Try importing optional backends; gate features behind availability flags
# ---------------------------------------------------------------------------
_HAS_TORCH = False

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torch.optim as optim

    _HAS_TORCH = True
except ImportError:
    logger.warning("PyTorch not installed -- NeuralUCB training disabled")


# ======================= Configuration ======================================

# Domain category labels used for one-hot encoding (12 dims).
DOMAIN_CATEGORIES: List[str] = [
    "jobs",
    "careers",
    "company",
    "recruitment",
    "freelance",
    "consulting",
    "news",
    "blog",
    "social",
    "government",
    "education",
    "other",
]

# TLD groups for feature encoding.
TLD_GROUPS: List[str] = ["com", "org", "io", "net", "co", "dev", "ai", "eu", "other"]


@dataclass
class NeuralUCBConfig:
    """Hyperparameters for the NeuralUCB domain scheduler.

    All values follow Zhou et al. (2020) recommendations, scaled for
    the domain scheduling problem (~100-1000 arms, sparse rewards).
    """

    # Feature dimensions
    context_dim: int = 64  # domain feature vector length
    hidden_dim: int = 128

    # Optimiser
    lr: float = 1e-3

    # NeuralUCB parameters (nu = exploration coefficient, lambda = regularisation)
    exploration_coeff: float = 0.1  # nu in the paper
    regularization: float = 1.0  # lambda

    # Training schedule
    update_interval: int = 50  # retrain every N selections
    batch_size: int = 32
    train_epochs: int = 5

    # MC Dropout uncertainty
    use_dropout: bool = True
    dropout_rate: float = 0.1
    n_mc_samples: int = 10  # MC dropout forward passes for uncertainty

    # Training buffer
    buffer_capacity: int = 10_000

    # Fallback threshold — use UCB1 until this many observations
    min_observations: int = 100

    # UCB1 fallback constant (same as CrawlerConfig.ucb_exploration_constant)
    ucb1_exploration_constant: float = 2.0

    # Persistence
    domain_stats_db: str = "scrapus_data/domain_stats.db"
    model_path: str = "scrapus_data/models/neural_ucb/model.pt"

    # Device
    use_mps: bool = True  # Apple M1 Metal Performance Shaders

    # Reward trend window
    reward_trend_window: int = 50


# ======================= Domain Feature Extractor ===========================

class DomainFeatureExtractor:
    """Converts domain statistics to a fixed-length feature vector (64-dim).

    Feature layout (64 dimensions):
        [0]     pages_crawled (log-scaled)
        [1]     avg_reward
        [2]     reward_variance
        [3]     leads_found (log-scaled)
        [4]     time_since_last_crawl (normalised, hours)
        [5]     crawl_frequency (pages / hour)
        [6]     failure_rate
        [7]     domain_age_in_pipeline (normalised, days)
        [8]     reward_trend (slope of last N rewards)
        [9]     pages_since_last_lead
        [10-21] domain_category one-hot (12 dims)
        [22-30] TLD features (9 dims)
        [31-38] URL depth distribution stats (8 dims: mean, std, p25, p50,
                p75, max, skew, kurtosis)
        [39-63] reserved / zero-padded for future features
    """

    def __init__(self, config: NeuralUCBConfig) -> None:
        self.config = config

    def extract_features(self, domain_stats: Dict[str, Any]) -> np.ndarray:
        """Build a 64-dim float32 feature vector from domain statistics.

        Args:
            domain_stats: dict with keys matching the domain_stats +
                domain_extra tables.  Missing keys default to 0.

        Returns:
            np.ndarray of shape (64,), dtype float32.
        """
        vec = np.zeros(self.config.context_dim, dtype=np.float32)

        pages = domain_stats.get("pages_crawled", 0)
        vec[0] = math.log1p(pages)

        vec[1] = domain_stats.get("avg_reward", 0.0)
        vec[2] = domain_stats.get("reward_variance", 0.0)

        leads = domain_stats.get("leads_found", 0)
        vec[3] = math.log1p(leads)

        last_crawled = domain_stats.get("last_crawled")
        if last_crawled is not None and last_crawled > 0:
            hours_since = (time.time() - last_crawled) / 3600.0
            vec[4] = min(hours_since / 168.0, 1.0)  # normalise to 1 week

        created_at = domain_stats.get("created_at", time.time())
        age_hours = max((time.time() - created_at) / 3600.0, 0.001)
        vec[5] = pages / age_hours if age_hours > 0 else 0.0  # crawl freq

        vec[6] = domain_stats.get("failure_rate", 0.0)

        age_days = age_hours / 24.0
        vec[7] = min(age_days / 30.0, 1.0)  # normalise to 30 days

        # Reward trend: slope of the last N rewards (linear regression)
        recent_rewards: List[float] = domain_stats.get("recent_rewards", [])
        vec[8] = self._compute_trend(recent_rewards)

        vec[9] = float(domain_stats.get("pages_since_last_lead", 0)) / max(pages, 1)

        # Domain category one-hot (12 dims at indices 10-21)
        category = domain_stats.get("category", "other")
        cat_idx = (
            DOMAIN_CATEGORIES.index(category)
            if category in DOMAIN_CATEGORIES
            else len(DOMAIN_CATEGORIES) - 1
        )
        vec[10 + cat_idx] = 1.0

        # TLD features (9 dims at indices 22-30)
        tld = domain_stats.get("tld", "other")
        tld_idx = TLD_GROUPS.index(tld) if tld in TLD_GROUPS else len(TLD_GROUPS) - 1
        vec[22 + tld_idx] = 1.0

        # URL depth distribution stats (8 dims at indices 31-38)
        depth_dist: List[float] = domain_stats.get("depth_distribution", [])
        if depth_dist:
            arr = np.array(depth_dist, dtype=np.float32)
            vec[31] = float(np.mean(arr))
            vec[32] = float(np.std(arr))
            percentiles = np.percentile(arr, [25, 50, 75]) if len(arr) >= 4 else [0, 0, 0]
            vec[33] = float(percentiles[0])
            vec[34] = float(percentiles[1])
            vec[35] = float(percentiles[2])
            vec[36] = float(np.max(arr))
            # Skewness (simplified — avoid scipy dependency)
            if np.std(arr) > 0:
                vec[37] = float(np.mean(((arr - np.mean(arr)) / np.std(arr)) ** 3))
            # Kurtosis (simplified)
            if np.std(arr) > 0:
                vec[38] = float(np.mean(((arr - np.mean(arr)) / np.std(arr)) ** 4) - 3.0)

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
        # slope = cov(x, y) / var(x)
        x_mean = x.mean()
        y_mean = y.mean()
        var_x = ((x - x_mean) ** 2).sum()
        if var_x == 0:
            return 0.0
        slope = ((x - x_mean) * (y - y_mean)).sum() / var_x
        return float(slope)


# ======================= NeuralUCB Network (PyTorch) ========================

if _HAS_TORCH:

    class NeuralUCBNetwork(nn.Module):
        """3-layer MLP with MC Dropout for NeuralUCB reward prediction.

        Architecture: context_dim -> 128 -> 64 -> 1 (predicted reward).
        MC Dropout stays enabled at inference for uncertainty estimation.
        Size: ~50 KB — negligible memory footprint.
        """

        def __init__(self, config: NeuralUCBConfig) -> None:
            super().__init__()
            self.config = config

            self.fc1 = nn.Linear(config.context_dim, config.hidden_dim)
            self.fc2 = nn.Linear(config.hidden_dim, config.hidden_dim // 2)
            self.fc3 = nn.Linear(config.hidden_dim // 2, 1)

            if config.use_dropout:
                self.drop1 = nn.Dropout(config.dropout_rate)
                self.drop2 = nn.Dropout(config.dropout_rate)
            else:
                self.drop1 = nn.Identity()
                self.drop2 = nn.Identity()

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            """Predict mean reward for context vectors.

            Args:
                x: (batch, context_dim) float32.

            Returns:
                (batch, 1) predicted reward.
            """
            x = F.relu(self.fc1(x))
            x = self.drop1(x)
            x = F.relu(self.fc2(x))
            x = self.drop2(x)
            return self.fc3(x)

        def predict_with_uncertainty(
            self,
            x: "torch.Tensor",
            n_samples: int = 10,
        ) -> Tuple["torch.Tensor", "torch.Tensor"]:
            """MC Dropout uncertainty estimation.

            Runs n_samples stochastic forward passes with dropout enabled
            and returns mean and std across passes.

            Args:
                x: (batch, context_dim) float32.
                n_samples: number of MC forward passes.

            Returns:
                (mean, std) each of shape (batch,).
            """
            self.train()  # enable dropout
            preds = []
            with torch.no_grad():
                for _ in range(n_samples):
                    pred = self.forward(x).squeeze(-1)  # (batch,)
                    preds.append(pred)
            preds_t = torch.stack(preds, dim=0)  # (n_samples, batch)
            mean = preds_t.mean(dim=0)
            std = preds_t.std(dim=0)
            return mean, std

else:
    # Stub so imports don't break when torch is absent
    class NeuralUCBNetwork:  # type: ignore[no-redef]
        def __init__(self, *a: Any, **kw: Any) -> None:
            raise RuntimeError("PyTorch required for NeuralUCBNetwork")


# ======================= NeuralUCB Scheduler ================================

class NeuralUCBScheduler:
    """NeuralUCB contextual bandit domain scheduler.

    Drop-in replacement for DomainScheduler with the same interface:
    register_domain, select_domain, update_domain, get_all_stats, close.

    Arms = web domains.
    Context = 64-dim feature vector per domain.
    Reward = lead discovery success rate.
    Score = predicted_mean + exploration_coeff * uncertainty.

    Falls back to UCB1 when total observations < min_observations.
    Retrains every update_interval selections on a sliding buffer
    of the last buffer_capacity (context, reward) pairs.
    """

    def __init__(self, config: Optional[NeuralUCBConfig] = None) -> None:
        self.config = config or NeuralUCBConfig()
        self._db_path = self.config.domain_stats_db
        self._conn: Optional[sqlite3.Connection] = None
        self._feature_extractor = DomainFeatureExtractor(self.config)

        # Training buffer: (context_vector, reward) pairs
        self._training_buffer: Deque[Tuple[np.ndarray, float]] = deque(
            maxlen=self.config.buffer_capacity
        )

        # Recent reward windows per domain (for trend computation)
        self._reward_windows: Dict[str, Deque[float]] = {}

        # Selection counter for periodic retraining
        self._selection_count: int = 0
        self._total_observations: int = 0

        # Neural network (initialised lazily or from persistence)
        self._network: Optional[Any] = None  # NeuralUCBNetwork when torch available
        self._optimizer: Optional[Any] = None
        self._device: Optional[Any] = None

        self._init_db()
        self._load_total_observations()

        if _HAS_TORCH:
            self._init_network()
            self._load_training_buffer()
            self._load_model_weights()

    # ---- Database initialisation -------------------------------------------

    def _init_db(self) -> None:
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
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
        # Extended stats table for NeuralUCB features
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
        # Training buffer persistence
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS neural_ucb_buffer (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                context BLOB NOT NULL,
                reward  REAL NOT NULL,
                ts      REAL NOT NULL
            )
        """)
        self._conn.commit()

    def _load_total_observations(self) -> None:
        """Load total observation count from DB for fallback logic."""
        row = self._conn.execute(
            "SELECT COALESCE(SUM(pages_crawled), 0) FROM domain_stats"
        ).fetchone()
        self._total_observations = row[0] if row else 0

    # ---- Network initialisation --------------------------------------------

    def _init_network(self) -> None:
        """Initialise PyTorch network, optimiser, and device."""
        if not _HAS_TORCH:
            return

        self._device = self._resolve_device()
        self._network = NeuralUCBNetwork(self.config).to(self._device)
        self._optimizer = optim.Adam(
            self._network.parameters(), lr=self.config.lr
        )
        logger.info(
            "NeuralUCBScheduler initialised: device=%s, context_dim=%d, "
            "hidden_dim=%d, exploration_coeff=%.3f",
            self._device,
            self.config.context_dim,
            self.config.hidden_dim,
            self.config.exploration_coeff,
        )

    def _resolve_device(self) -> "torch.device":
        if self.config.use_mps and torch.backends.mps.is_available():
            logger.info("NeuralUCB using MPS (Apple M1 GPU)")
            return torch.device("mps")
        logger.info("NeuralUCB using CPU")
        return torch.device("cpu")

    # ---- Public interface (DomainScheduler drop-in) -------------------------

    def register_domain(self, domain: str) -> None:
        """Register a new domain arm."""
        tld = self._extract_tld(domain)
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
            INSERT OR IGNORE INTO domain_extra
                (domain, tld)
            VALUES (?, ?)
            """,
            (domain, tld),
        )
        self._conn.commit()

        if domain not in self._reward_windows:
            self._reward_windows[domain] = deque(
                maxlen=self.config.reward_trend_window
            )

    def select_domain(self) -> Optional[str]:
        """Select next domain using NeuralUCB (or UCB1 fallback).

        Returns None if no domains are registered.

        Algorithm:
            1. Extract features for all active domains.
            2. If insufficient data, fall back to UCB1.
            3. Forward pass with MC dropout -> (mean, uncertainty).
            4. Score = mean + exploration_coeff * uncertainty.
            5. Select domain with highest score.
        """
        rows = self._conn.execute(
            "SELECT domain, pages_crawled, reward_sum FROM domain_stats"
        ).fetchall()
        if not rows:
            return None

        # Force exploration of unseen domains
        for domain, pages, _reward in rows:
            if pages == 0:
                self._selection_count += 1
                return domain

        # Fall back to UCB1 when insufficient training data
        if self._total_observations < self.config.min_observations or not _HAS_TORCH:
            return self._ucb1_select(rows)

        # NeuralUCB selection
        domains = [r[0] for r in rows]
        features = self._extract_all_features(domains)

        if self._network is None:
            return self._ucb1_select(rows)

        # Build tensor
        features_t = torch.as_tensor(
            features, dtype=torch.float32, device=self._device
        )

        # MC Dropout forward passes for uncertainty
        mean, std = self._network.predict_with_uncertainty(
            features_t, n_samples=self.config.n_mc_samples
        )

        # NeuralUCB score: mean + nu * uncertainty
        scores = mean + self.config.exploration_coeff * std
        scores_np = scores.cpu().numpy()

        best_idx = int(np.argmax(scores_np))
        self._selection_count += 1

        # Periodic retraining
        if self._selection_count % self.config.update_interval == 0:
            self._retrain()

        return domains[best_idx]

    def update_domain(
        self,
        domain: str,
        reward: float,
        is_lead: bool = False,
    ) -> None:
        """Update domain statistics after crawling a page.

        Accumulates (context, reward) pair into training buffer and
        persists to SQLite.
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

        # Update extra stats
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

        # Update recent rewards window
        if domain not in self._reward_windows:
            self._reward_windows[domain] = deque(
                maxlen=self.config.reward_trend_window
            )
        self._reward_windows[domain].append(reward)

        # Persist recent rewards as JSON
        recent_list = list(self._reward_windows[domain])
        self._conn.execute(
            "UPDATE domain_extra SET recent_rewards = ? WHERE domain = ?",
            (json.dumps(recent_list[-self.config.reward_trend_window:]), domain),
        )

        # Update reward variance (incremental Welford)
        row = self._conn.execute(
            "SELECT pages_crawled, reward_sum FROM domain_stats WHERE domain = ?",
            (domain,),
        ).fetchone()
        if row and row[0] > 1:
            avg = row[1] / row[0]
            # Simplified variance from the reward window
            if len(recent_list) > 1:
                var = float(np.var(recent_list))
                self._conn.execute(
                    "UPDATE domain_extra SET reward_variance = ? WHERE domain = ?",
                    (var, domain),
                )

        self._conn.commit()
        self._total_observations += 1

        # Accumulate training sample
        if _HAS_TORCH:
            stats = self._load_domain_stats(domain)
            context = self._feature_extractor.extract_features(stats)
            self._training_buffer.append((context, reward))

            # Persist to SQLite buffer
            self._conn.execute(
                "INSERT INTO neural_ucb_buffer (context, reward, ts) VALUES (?, ?, ?)",
                (context.tobytes(), reward, time.time()),
            )
            self._conn.commit()

    def get_all_stats(self) -> List[Dict[str, Any]]:
        """Return all domain statistics for monitoring."""
        rows = self._conn.execute(
            """
            SELECT s.domain, s.pages_crawled, s.reward_sum, s.leads_found,
                   s.last_crawled, e.failure_rate, e.pages_since_last_lead
            FROM domain_stats s
            LEFT JOIN domain_extra e ON s.domain = e.domain
            ORDER BY s.reward_sum / MAX(s.pages_crawled, 1) DESC
            """
        ).fetchall()
        return [
            {
                "domain": r[0],
                "pages_crawled": r[1],
                "reward_sum": round(r[2], 4),
                "leads_found": r[3],
                "avg_reward": round(r[2] / max(r[1], 1), 4),
                "last_crawled": r[4],
                "failure_rate": round(r[5] or 0.0, 4),
                "pages_since_last_lead": r[6] or 0,
            }
            for r in rows
        ]

    def get_exploration_stats(self) -> List[Dict[str, Any]]:
        """Return domains ranked by uncertainty (discovery opportunities).

        High-uncertainty domains are those the model is least confident
        about — they represent potential sources of undiscovered leads.

        Returns empty list if NeuralUCB is not active (< min_observations
        or no torch).
        """
        if not _HAS_TORCH or self._network is None:
            return []
        if self._total_observations < self.config.min_observations:
            return []

        rows = self._conn.execute(
            "SELECT domain FROM domain_stats WHERE pages_crawled > 0"
        ).fetchall()
        if not rows:
            return []

        domains = [r[0] for r in rows]
        features = self._extract_all_features(domains)

        features_t = torch.as_tensor(
            features, dtype=torch.float32, device=self._device
        )

        mean, std = self._network.predict_with_uncertainty(
            features_t, n_samples=self.config.n_mc_samples
        )
        mean_np = mean.cpu().numpy()
        std_np = std.cpu().numpy()

        # Also compute gradient-based uncertainty
        grad_uncert = self._gradient_uncertainty(features_t)

        results = []
        for i, domain in enumerate(domains):
            results.append({
                "domain": domain,
                "predicted_reward": round(float(mean_np[i]), 4),
                "mc_uncertainty": round(float(std_np[i]), 4),
                "gradient_uncertainty": round(float(grad_uncert[i]), 4),
                "combined_score": round(
                    float(mean_np[i])
                    + self.config.exploration_coeff * float(std_np[i]),
                    4,
                ),
            })

        # Sort by uncertainty descending
        results.sort(key=lambda r: r["mc_uncertainty"], reverse=True)
        return results

    def close(self) -> None:
        """Persist model weights and close database."""
        if _HAS_TORCH and self._network is not None:
            self._save_model_weights()
        if self._conn:
            self._conn.close()
            self._conn = None

    # ---- UCB1 fallback ------------------------------------------------------

    def _ucb1_select(
        self, rows: List[Tuple[str, int, float]]
    ) -> Optional[str]:
        """UCB1 selection — used when insufficient NeuralUCB training data."""
        total_pages = sum(r[1] for r in rows)
        if total_pages == 0:
            return rows[0][0]

        best_domain: Optional[str] = None
        best_score = -float("inf")
        c = self.config.ucb1_exploration_constant

        for domain, pages, reward in rows:
            if pages == 0:
                return domain  # force exploration of unseen domains
            avg_reward = reward / pages
            explore = math.sqrt(c * math.log(total_pages) / pages)
            score = avg_reward + explore
            if score > best_score:
                best_score = score
                best_domain = domain

        return best_domain

    def get_ucb_score(self, domain: str) -> float:
        """Compute UCB1 score for a specific domain (compatibility)."""
        row = self._conn.execute(
            "SELECT pages_crawled, reward_sum FROM domain_stats WHERE domain = ?",
            (domain,),
        ).fetchone()
        if row is None or row[0] == 0:
            return float("inf")  # unseen domain

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

    # ---- Feature extraction helpers -----------------------------------------

    def _extract_all_features(self, domains: List[str]) -> np.ndarray:
        """Extract feature vectors for a list of domains.

        Returns:
            np.ndarray of shape (len(domains), context_dim), float32.
        """
        features = np.zeros(
            (len(domains), self.config.context_dim), dtype=np.float32
        )
        for i, domain in enumerate(domains):
            stats = self._load_domain_stats(domain)
            features[i] = self._feature_extractor.extract_features(stats)
        return features

    def _load_domain_stats(self, domain: str) -> Dict[str, Any]:
        """Load all statistics for a domain from both tables."""
        row = self._conn.execute(
            """
            SELECT s.pages_crawled, s.reward_sum, s.leads_found,
                   s.last_crawled, s.created_at,
                   e.reward_variance, e.failure_rate,
                   e.pages_since_last_lead, e.category, e.tld,
                   e.recent_rewards, e.depth_distribution
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

        # Parse JSON fields
        try:
            recent_rewards = json.loads(row[10]) if row[10] else []
        except (json.JSONDecodeError, TypeError):
            recent_rewards = []
        try:
            depth_dist = json.loads(row[11]) if row[11] else []
        except (json.JSONDecodeError, TypeError):
            depth_dist = []

        # Merge with in-memory reward window if available
        if domain in self._reward_windows and self._reward_windows[domain]:
            recent_rewards = list(self._reward_windows[domain])

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
            "category": row[8] or "other",
            "tld": row[9] or "other",
            "recent_rewards": recent_rewards,
            "depth_distribution": depth_dist,
        }

    @staticmethod
    def _extract_tld(domain: str) -> str:
        """Extract top-level domain, mapped to TLD_GROUPS."""
        parts = domain.rsplit(".", 1)
        if len(parts) < 2:
            return "other"
        tld = parts[-1].lower()
        return tld if tld in TLD_GROUPS else "other"

    # ---- Gradient-based uncertainty -----------------------------------------

    def _gradient_uncertainty(self, features_t: "torch.Tensor") -> np.ndarray:
        """Compute gradient norm ||grad_theta f(x; theta)|| per domain.

        This provides an alternative uncertainty signal: contexts where
        the gradient norm is large indicate the network is sensitive to
        parameter perturbations — i.e., uncertain.

        Args:
            features_t: (n_domains, context_dim) tensor.

        Returns:
            np.ndarray of shape (n_domains,) with gradient norms.
        """
        if not _HAS_TORCH or self._network is None:
            return np.zeros(features_t.shape[0], dtype=np.float32)

        grad_norms = np.zeros(features_t.shape[0], dtype=np.float32)
        self._network.eval()

        for i in range(features_t.shape[0]):
            self._network.zero_grad()
            x = features_t[i : i + 1].clone().requires_grad_(False)

            # Enable gradients w.r.t. parameters only
            pred = self._network(x)
            pred.backward()

            # Accumulate gradient norms across all parameters
            total_norm = 0.0
            for param in self._network.parameters():
                if param.grad is not None:
                    total_norm += param.grad.data.norm(2).item() ** 2
            grad_norms[i] = math.sqrt(total_norm)

            self._network.zero_grad()

        return grad_norms

    # ---- Training -----------------------------------------------------------

    def _retrain(self) -> None:
        """Retrain the network on the training buffer.

        Runs config.train_epochs passes over mini-batches sampled from
        the buffer.  Called every config.update_interval selections.
        """
        if not _HAS_TORCH or self._network is None:
            return
        if len(self._training_buffer) < self.config.batch_size:
            return

        self._network.train()
        buffer_list = list(self._training_buffer)
        contexts = np.array([b[0] for b in buffer_list], dtype=np.float32)
        rewards = np.array([b[1] for b in buffer_list], dtype=np.float32)

        n_samples = len(buffer_list)
        total_loss = 0.0
        n_batches = 0

        for _epoch in range(self.config.train_epochs):
            indices = np.random.permutation(n_samples)
            for start in range(0, n_samples, self.config.batch_size):
                end = min(start + self.config.batch_size, n_samples)
                batch_idx = indices[start:end]

                ctx_t = torch.as_tensor(
                    contexts[batch_idx], dtype=torch.float32, device=self._device
                )
                rew_t = torch.as_tensor(
                    rewards[batch_idx], dtype=torch.float32, device=self._device
                )

                pred = self._network(ctx_t).squeeze(-1)

                # MSE loss + L2 regularisation (lambda term from NeuralUCB)
                mse_loss = F.mse_loss(pred, rew_t)
                l2_reg = sum(
                    p.pow(2).sum() for p in self._network.parameters()
                )
                loss = mse_loss + self.config.regularization * 1e-4 * l2_reg

                self._optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(
                    self._network.parameters(), 5.0
                )
                self._optimizer.step()

                total_loss += loss.item()
                n_batches += 1

        avg_loss = total_loss / max(n_batches, 1)
        logger.info(
            "NeuralUCB retrained: %d samples, %d epochs, avg_loss=%.6f",
            n_samples,
            self.config.train_epochs,
            avg_loss,
        )

        # Save model after retraining
        self._save_model_weights()

    # ---- Persistence (model weights) ----------------------------------------

    def _save_model_weights(self) -> None:
        """Save network weights and optimiser state to disk."""
        if not _HAS_TORCH or self._network is None:
            return

        path = self.config.model_path
        os.makedirs(os.path.dirname(path), exist_ok=True)

        checkpoint = {
            "network": self._network.state_dict(),
            "optimizer": self._optimizer.state_dict(),
            "selection_count": self._selection_count,
            "total_observations": self._total_observations,
            "config": {
                "context_dim": self.config.context_dim,
                "hidden_dim": self.config.hidden_dim,
                "dropout_rate": self.config.dropout_rate,
                "use_dropout": self.config.use_dropout,
            },
        }
        torch.save(checkpoint, path)
        logger.debug("Saved NeuralUCB model to %s", path)

    def _load_model_weights(self) -> None:
        """Restore network weights from disk if available."""
        if not _HAS_TORCH or self._network is None:
            return

        path = self.config.model_path
        if not os.path.exists(path):
            return

        try:
            checkpoint = torch.load(
                path, map_location=self._device, weights_only=False
            )

            # Validate config compatibility
            saved_cfg = checkpoint.get("config", {})
            if (
                saved_cfg.get("context_dim") != self.config.context_dim
                or saved_cfg.get("hidden_dim") != self.config.hidden_dim
            ):
                logger.warning(
                    "Saved NeuralUCB model has incompatible dimensions, "
                    "reinitialising from scratch"
                )
                return

            self._network.load_state_dict(checkpoint["network"])
            self._optimizer.load_state_dict(checkpoint["optimizer"])
            self._selection_count = checkpoint.get("selection_count", 0)
            self._total_observations = checkpoint.get(
                "total_observations", self._total_observations
            )
            logger.info(
                "Loaded NeuralUCB model from %s (selections=%d, obs=%d)",
                path,
                self._selection_count,
                self._total_observations,
            )
        except Exception:
            logger.warning(
                "Failed to load NeuralUCB model from %s, starting fresh",
                path,
                exc_info=True,
            )

    # ---- Persistence (training buffer) --------------------------------------

    def _load_training_buffer(self) -> None:
        """Restore training buffer from SQLite on startup."""
        if self._conn is None:
            return

        rows = self._conn.execute(
            """
            SELECT context, reward FROM neural_ucb_buffer
            ORDER BY ts DESC
            LIMIT ?
            """,
            (self.config.buffer_capacity,),
        ).fetchall()

        for ctx_bytes, reward in reversed(rows):
            ctx = np.frombuffer(ctx_bytes, dtype=np.float32).copy()
            if ctx.shape[0] == self.config.context_dim:
                self._training_buffer.append((ctx, reward))

        if rows:
            logger.info(
                "Loaded %d training samples into NeuralUCB buffer", len(rows)
            )

        # Prune old entries beyond buffer capacity
        self._conn.execute(
            """
            DELETE FROM neural_ucb_buffer
            WHERE id NOT IN (
                SELECT id FROM neural_ucb_buffer
                ORDER BY ts DESC
                LIMIT ?
            )
            """,
            (self.config.buffer_capacity,),
        )
        self._conn.commit()

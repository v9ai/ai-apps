"""
Module 1: Monitoring, metrics collection, and alerting for the RL crawler.

Provides:
- MetricsCollector: SQLite-backed time-series storage with rolling window stats
- AlertManager: Threshold-based alerting with severity levels
- ConvergenceTracker: Training phase detection and convergence diagnostics

Integration points:
- CrawlerPipeline: record_train_step(), record_episode(), check_alerts()
- DoubleDQNAgent: convergence metrics feed into ConvergenceTracker
- DomainScheduler: domain-level metrics for stuck-domain detection

Storage: SQLite at scrapus_data/metrics.db (~2-5 MB for 50K steps).
Memory: <10 MB (rolling windows + alert history in-memory).

Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import os
import sqlite3
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Deque, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_monitoring")


# ======================= Configuration ======================================

@dataclass
class MetricsConfig:
    """Configuration for the monitoring subsystem."""

    # Storage
    db_path: str = "scrapus_data/metrics.db"

    # Buffering
    flush_interval: int = 100  # steps between DB writes

    # Rolling window size for summary stats
    rolling_window: int = 1000

    # Alert thresholds
    alert_harvest_min: float = 0.05  # alert if harvest rate drops below
    alert_max_q: float = 50.0  # Q-value overestimation warning
    alert_loss_increase_steps: int = 5000  # loss divergence window

    # Replay buffer capacity alert (fraction of max)
    alert_replay_capacity_fraction: float = 0.95

    # Domain scheduler stuck detection
    alert_domain_stuck_steps: int = 5000


# ======================= Alert Levels =======================================

class AlertLevel(Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@dataclass
class Alert:
    """A single triggered alert."""

    level: AlertLevel
    rule: str
    message: str
    timestamp: float
    step: int
    value: float = 0.0


# ======================= Metrics Collector ==================================

class MetricsCollector:
    """SQLite-backed time-series metrics with rolling window computations.

    Buffers training metrics in memory and flushes to SQLite every
    `flush_interval` steps.  Episode and domain metrics are written
    immediately (low frequency).

    Tables:
        training_metrics  -- per-step training stats
        domain_metrics    -- per-domain snapshots
        episode_metrics   -- per-episode summaries
    """

    def __init__(self, config: Optional[MetricsConfig] = None) -> None:
        self.config = config or MetricsConfig()

        # Ensure parent directory exists
        os.makedirs(os.path.dirname(self.config.db_path) or ".", exist_ok=True)

        # SQLite connection (WAL mode for concurrent reads)
        self._conn = sqlite3.connect(self.config.db_path)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA synchronous=NORMAL")
        self._create_tables()

        # In-memory buffer for training metrics (flushed periodically)
        self._train_buffer: List[Dict[str, Any]] = []

        # Rolling windows (deques with maxlen for O(1) append/evict)
        window = self.config.rolling_window
        self._losses: Deque[float] = deque(maxlen=window)
        self._mean_qs: Deque[float] = deque(maxlen=window)
        self._max_qs: Deque[float] = deque(maxlen=window)
        self._epsilons: Deque[float] = deque(maxlen=window)
        self._harvest_rates: Deque[float] = deque(maxlen=window)
        self._pages_per_sec: Deque[float] = deque(maxlen=window)
        self._replay_sizes: Deque[int] = deque(maxlen=window)
        self._unresolved_rewards: Deque[int] = deque(maxlen=window)

        # Step counter for flush scheduling
        self._buffered_steps: int = 0
        self._total_steps: int = 0

        logger.info("MetricsCollector initialised (db=%s)", self.config.db_path)

    # ---- Schema -------------------------------------------------------------

    def _create_tables(self) -> None:
        """Create metrics tables if they don't exist."""
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS training_metrics (
                step        INTEGER PRIMARY KEY,
                timestamp   REAL NOT NULL,
                loss        REAL,
                mean_q      REAL,
                max_q       REAL,
                epsilon     REAL,
                harvest_rate REAL,
                replay_size INTEGER,
                pages_per_sec REAL,
                unresolved_rewards INTEGER
            );

            CREATE TABLE IF NOT EXISTS domain_metrics (
                step        INTEGER NOT NULL,
                domain      TEXT NOT NULL,
                pages       INTEGER,
                reward_sum  REAL,
                ucb_score   REAL,
                PRIMARY KEY (step, domain)
            );

            CREATE TABLE IF NOT EXISTS episode_metrics (
                episode_id  INTEGER PRIMARY KEY AUTOINCREMENT,
                steps       INTEGER,
                pages       INTEGER,
                reward_total REAL,
                domain      TEXT,
                duration    REAL
            );

            CREATE TABLE IF NOT EXISTS alert_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp   REAL NOT NULL,
                step        INTEGER,
                level       TEXT NOT NULL,
                rule        TEXT NOT NULL,
                message     TEXT NOT NULL,
                value       REAL
            );
        """)
        self._conn.commit()

    # ---- Training Metrics ---------------------------------------------------

    def record_train_step(self, metrics: Dict[str, Any]) -> None:
        """Record a training step's metrics.

        Buffers in memory and flushes to SQLite every flush_interval steps.

        Expected keys: step, loss, mean_q, max_q, epsilon, harvest_rate,
                       replay_size, pages_per_sec, unresolved_rewards.
        """
        now = time.time()
        step = metrics.get("step", self._total_steps)

        row = {
            "step": step,
            "timestamp": now,
            "loss": metrics.get("loss", 0.0),
            "mean_q": metrics.get("mean_q", 0.0),
            "max_q": metrics.get("max_q", 0.0),
            "epsilon": metrics.get("epsilon", 1.0),
            "harvest_rate": metrics.get("harvest_rate", 0.0),
            "replay_size": metrics.get("replay_size", 0),
            "pages_per_sec": metrics.get("pages_per_sec", 0.0),
            "unresolved_rewards": metrics.get("unresolved_rewards", 0),
        }

        # Update rolling windows
        self._losses.append(row["loss"])
        self._mean_qs.append(row["mean_q"])
        self._max_qs.append(row["max_q"])
        self._epsilons.append(row["epsilon"])
        self._harvest_rates.append(row["harvest_rate"])
        self._pages_per_sec.append(row["pages_per_sec"])
        self._replay_sizes.append(row["replay_size"])
        self._unresolved_rewards.append(row["unresolved_rewards"])

        # Buffer for batch write
        self._train_buffer.append(row)
        self._buffered_steps += 1
        self._total_steps = step

        # Flush on interval
        if self._buffered_steps >= self.config.flush_interval:
            self._flush_train_buffer()

    def _flush_train_buffer(self) -> None:
        """Write buffered training metrics to SQLite."""
        if not self._train_buffer:
            return

        self._conn.executemany(
            """INSERT OR REPLACE INTO training_metrics
               (step, timestamp, loss, mean_q, max_q, epsilon,
                harvest_rate, replay_size, pages_per_sec, unresolved_rewards)
               VALUES (:step, :timestamp, :loss, :mean_q, :max_q, :epsilon,
                       :harvest_rate, :replay_size, :pages_per_sec,
                       :unresolved_rewards)""",
            self._train_buffer,
        )
        self._conn.commit()

        flushed = len(self._train_buffer)
        self._train_buffer.clear()
        self._buffered_steps = 0
        logger.debug("Flushed %d training metrics rows", flushed)

    # ---- Episode Metrics ----------------------------------------------------

    def record_episode(self, episode: Dict[str, Any]) -> None:
        """Record a completed episode. Written immediately (low frequency).

        Expected keys: steps, pages, reward_total, domain, duration.
        """
        self._conn.execute(
            """INSERT INTO episode_metrics (steps, pages, reward_total, domain, duration)
               VALUES (:steps, :pages, :reward_total, :domain, :duration)""",
            {
                "steps": episode.get("steps", 0),
                "pages": episode.get("pages", 0),
                "reward_total": episode.get("reward_total", 0.0),
                "domain": episode.get("domain", ""),
                "duration": episode.get("duration", 0.0),
            },
        )
        self._conn.commit()

    # ---- Domain Metrics -----------------------------------------------------

    def record_domain_snapshot(self, step: int, domain_stats: List[Dict[str, Any]]) -> None:
        """Record a snapshot of all domain-level statistics.

        Args:
            step: current global step.
            domain_stats: list of dicts with keys: domain, pages, reward_sum, ucb_score.
        """
        rows = [
            {
                "step": step,
                "domain": ds.get("domain", ""),
                "pages": ds.get("pages", ds.get("pages_crawled", 0)),
                "reward_sum": ds.get("reward_sum", 0.0),
                "ucb_score": ds.get("ucb_score", 0.0),
            }
            for ds in domain_stats
        ]
        if rows:
            self._conn.executemany(
                """INSERT OR REPLACE INTO domain_metrics
                   (step, domain, pages, reward_sum, ucb_score)
                   VALUES (:step, :domain, :pages, :reward_sum, :ucb_score)""",
                rows,
            )
            self._conn.commit()

    # ---- Rolling Window Statistics ------------------------------------------

    @staticmethod
    def _window_stats(data: Deque) -> Dict[str, float]:
        """Compute mean, std, min, max over a rolling window."""
        if not data:
            return {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0}
        arr = np.array(data, dtype=np.float64)
        return {
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)),
            "min": float(np.min(arr)),
            "max": float(np.max(arr)),
        }

    def get_summary(self) -> Dict[str, Any]:
        """Return a dict with all current rolling window statistics."""
        return {
            "step": self._total_steps,
            "window_size": self.config.rolling_window,
            "samples_in_window": len(self._losses),
            "loss": self._window_stats(self._losses),
            "mean_q": self._window_stats(self._mean_qs),
            "max_q": self._window_stats(self._max_qs),
            "epsilon": self._window_stats(self._epsilons),
            "harvest_rate": self._window_stats(self._harvest_rates),
            "pages_per_sec": self._window_stats(self._pages_per_sec),
            "replay_size": self._window_stats(self._replay_sizes),
            "unresolved_rewards": self._window_stats(self._unresolved_rewards),
        }

    def print_summary(self) -> None:
        """Pretty-print current rolling window statistics to stdout."""
        summary = self.get_summary()
        step = summary["step"]
        n = summary["samples_in_window"]

        lines = [
            f"\n{'=' * 60}",
            f"  Crawler Metrics Summary  (step {step}, window {n}/{self.config.rolling_window})",
            f"{'=' * 60}",
        ]

        metric_labels = [
            ("loss", "Loss"),
            ("mean_q", "Mean Q"),
            ("max_q", "Max Q"),
            ("epsilon", "Epsilon"),
            ("harvest_rate", "Harvest Rate"),
            ("pages_per_sec", "Pages/sec"),
            ("replay_size", "Replay Size"),
            ("unresolved_rewards", "Unresolved Rewards"),
        ]

        for key, label in metric_labels:
            s = summary[key]
            lines.append(
                f"  {label:<22s}  "
                f"mean={s['mean']:>10.4f}  "
                f"std={s['std']:>8.4f}  "
                f"min={s['min']:>10.4f}  "
                f"max={s['max']:>10.4f}"
            )

        lines.append(f"{'=' * 60}\n")
        print("\n".join(lines))

    # ---- Lifecycle ----------------------------------------------------------

    def flush(self) -> None:
        """Force-flush any buffered metrics to disk."""
        self._flush_train_buffer()

    def close(self) -> None:
        """Flush remaining data and close the SQLite connection."""
        self._flush_train_buffer()
        self._conn.close()
        logger.info("MetricsCollector closed")


# ======================= Alert Manager ======================================

class AlertManager:
    """Configurable threshold-based alerting system.

    Built-in alert rules:
    - Q-value overestimation (max_q exceeds threshold)
    - Harvest rate collapse (drops below minimum)
    - Loss divergence (increasing trend over N steps)
    - Replay buffer near capacity
    - Domain scheduler stuck (top domain unchanged for K steps)

    Alerts are logged and stored in SQLite for post-hoc analysis.
    """

    def __init__(
        self,
        config: Optional[MetricsConfig] = None,
        collector: Optional[MetricsCollector] = None,
    ) -> None:
        self.config = config or MetricsConfig()
        self._collector = collector

        # SQLite connection for alert history (share collector's or open own)
        if collector is not None:
            self._conn = collector._conn
            self._owns_conn = False
        else:
            os.makedirs(
                os.path.dirname(self.config.db_path) or ".", exist_ok=True
            )
            self._conn = sqlite3.connect(self.config.db_path)
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._owns_conn = True
            self._ensure_alert_table()

        # In-memory recent alerts (capped)
        self._recent_alerts: Deque[Alert] = deque(maxlen=200)

        # State for stateful rules
        self._loss_history: Deque[float] = deque(maxlen=self.config.alert_loss_increase_steps)
        self._top_domain_history: Deque[str] = deque(maxlen=self.config.alert_domain_stuck_steps)
        self._harvest_ever_above_threshold: bool = False

        logger.info("AlertManager initialised")

    def _ensure_alert_table(self) -> None:
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS alert_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp   REAL NOT NULL,
                step        INTEGER,
                level       TEXT NOT NULL,
                rule        TEXT NOT NULL,
                message     TEXT NOT NULL,
                value       REAL
            )
        """)
        self._conn.commit()

    # ---- Core ---------------------------------------------------------------

    def check_alerts(self, metrics: Dict[str, Any]) -> List[Alert]:
        """Evaluate all alert rules against the current metrics.

        Args:
            metrics: dict with keys like loss, mean_q, max_q, epsilon,
                     harvest_rate, replay_size, replay_capacity,
                     top_domain, step.

        Returns:
            List of triggered Alert objects (may be empty).
        """
        step = metrics.get("step", 0)
        triggered: List[Alert] = []

        # 1. Q-value overestimation
        max_q = metrics.get("max_q", 0.0)
        if max_q > self.config.alert_max_q:
            triggered.append(Alert(
                level=AlertLevel.WARNING,
                rule="q_overestimation",
                message=(
                    f"Max Q-value {max_q:.2f} exceeds threshold "
                    f"{self.config.alert_max_q:.1f} -- possible overestimation"
                ),
                timestamp=time.time(),
                step=step,
                value=max_q,
            ))

        # 2. Harvest rate collapse
        harvest = metrics.get("harvest_rate", 0.0)
        if harvest >= self.config.alert_harvest_min * 3:
            self._harvest_ever_above_threshold = True
        if self._harvest_ever_above_threshold and harvest < self.config.alert_harvest_min:
            triggered.append(Alert(
                level=AlertLevel.CRITICAL,
                rule="harvest_collapse",
                message=(
                    f"Harvest rate {harvest:.4f} below minimum "
                    f"{self.config.alert_harvest_min:.4f} -- pipeline may be stuck"
                ),
                timestamp=time.time(),
                step=step,
                value=harvest,
            ))

        # 3. Loss divergence
        loss = metrics.get("loss", 0.0)
        self._loss_history.append(loss)
        if len(self._loss_history) >= self.config.alert_loss_increase_steps:
            alert = self._check_loss_divergence(step)
            if alert is not None:
                triggered.append(alert)

        # 4. Replay buffer near capacity
        replay_size = metrics.get("replay_size", 0)
        replay_capacity = metrics.get("replay_capacity", 0)
        if replay_capacity > 0:
            fill = replay_size / replay_capacity
            if fill >= self.config.alert_replay_capacity_fraction:
                triggered.append(Alert(
                    level=AlertLevel.INFO,
                    rule="replay_near_capacity",
                    message=(
                        f"Replay buffer {fill:.1%} full "
                        f"({replay_size}/{replay_capacity})"
                    ),
                    timestamp=time.time(),
                    step=step,
                    value=fill,
                ))

        # 5. Domain scheduler stuck
        top_domain = metrics.get("top_domain", "")
        if top_domain:
            self._top_domain_history.append(top_domain)
        if len(self._top_domain_history) >= self.config.alert_domain_stuck_steps:
            alert = self._check_domain_stuck(step)
            if alert is not None:
                triggered.append(alert)

        # Persist and log
        for alert in triggered:
            self._persist_alert(alert)
            self._recent_alerts.append(alert)
            self._log_alert(alert)

        return triggered

    def _check_loss_divergence(self, step: int) -> Optional[Alert]:
        """Detect sustained loss increase via linear regression slope."""
        losses = np.array(self._loss_history, dtype=np.float64)
        n = len(losses)
        if n < 100:
            return None

        # Simple linear regression: slope of loss over the window
        x = np.arange(n, dtype=np.float64)
        x_mean = x.mean()
        y_mean = losses.mean()
        slope = np.sum((x - x_mean) * (losses - y_mean)) / (
            np.sum((x - x_mean) ** 2) + 1e-12
        )

        # Normalise slope by mean loss to get relative increase rate
        relative_slope = slope / (abs(y_mean) + 1e-12)

        if relative_slope > 0.001:  # loss increasing >0.1% per step over the window
            return Alert(
                level=AlertLevel.WARNING,
                rule="loss_divergence",
                message=(
                    f"Loss trending upward over {n} steps "
                    f"(slope={slope:.6f}, relative={relative_slope:.4f}) -- "
                    f"consider lowering lr or refreshing priorities"
                ),
                timestamp=time.time(),
                step=step,
                value=slope,
            )
        return None

    def _check_domain_stuck(self, step: int) -> Optional[Alert]:
        """Detect if the top domain has not changed for too long."""
        if not self._top_domain_history:
            return None

        history = list(self._top_domain_history)
        unique = set(history)

        if len(unique) == 1:
            domain = history[0]
            return Alert(
                level=AlertLevel.WARNING,
                rule="domain_stuck",
                message=(
                    f"Top domain '{domain}' unchanged for "
                    f"{len(history)} steps -- scheduler may be stuck"
                ),
                timestamp=time.time(),
                step=step,
                value=float(len(history)),
            )
        return None

    # ---- Persistence --------------------------------------------------------

    def _persist_alert(self, alert: Alert) -> None:
        """Write alert to SQLite history."""
        try:
            self._conn.execute(
                """INSERT INTO alert_history
                   (timestamp, step, level, rule, message, value)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    alert.timestamp,
                    alert.step,
                    alert.level.value,
                    alert.rule,
                    alert.message,
                    alert.value,
                ),
            )
            self._conn.commit()
        except sqlite3.Error as exc:
            logger.error("Failed to persist alert: %s", exc)

    @staticmethod
    def _log_alert(alert: Alert) -> None:
        """Route alert to the appropriate log level."""
        if alert.level == AlertLevel.CRITICAL:
            logger.error("[ALERT:%s] %s", alert.rule, alert.message)
        elif alert.level == AlertLevel.WARNING:
            logger.warning("[ALERT:%s] %s", alert.rule, alert.message)
        else:
            logger.info("[ALERT:%s] %s", alert.rule, alert.message)

    # ---- Query --------------------------------------------------------------

    def get_recent_alerts(self, limit: int = 50) -> List[Alert]:
        """Return the most recent in-memory alerts."""
        alerts = list(self._recent_alerts)
        return alerts[-limit:]

    def get_alert_history(
        self,
        rule: Optional[str] = None,
        level: Optional[AlertLevel] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Query persisted alert history from SQLite."""
        query = "SELECT timestamp, step, level, rule, message, value FROM alert_history"
        conditions: List[str] = []
        params: List[Any] = []

        if rule is not None:
            conditions.append("rule = ?")
            params.append(rule)
        if level is not None:
            conditions.append("level = ?")
            params.append(level.value)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        cursor = self._conn.execute(query, params)
        return [
            {
                "timestamp": row[0],
                "step": row[1],
                "level": row[2],
                "rule": row[3],
                "message": row[4],
                "value": row[5],
            }
            for row in cursor.fetchall()
        ]

    # ---- Lifecycle ----------------------------------------------------------

    def close(self) -> None:
        """Close the SQLite connection if we own it."""
        if self._owns_conn:
            self._conn.close()
        logger.info("AlertManager closed")


# ======================= Convergence Tracker ================================

class ConvergenceTracker:
    """Training phase detection and convergence diagnostics.

    Phases:
        EXPLORATION   -- epsilon > 0.5, agent is mostly random
        LEARNING      -- 0.1 < epsilon <= 0.5, agent is learning
        EXPLOITATION  -- epsilon <= 0.1, agent is exploiting
        CONVERGED     -- loss stable for 10K+ steps in exploitation phase

    Convergence is diagnosed via:
        - Loss trend (linear regression slope over recent window)
        - Q-value stability (coefficient of variation)
        - Harvest rate trend (improving or degrading)
    """

    PHASE_EXPLORATION = "EXPLORATION"
    PHASE_LEARNING = "LEARNING"
    PHASE_EXPLOITATION = "EXPLOITATION"
    PHASE_CONVERGED = "CONVERGED"

    def __init__(
        self,
        convergence_window: int = 10_000,
        stability_cv_threshold: float = 0.05,
        loss_slope_threshold: float = 0.0001,
    ) -> None:
        """
        Args:
            convergence_window: number of steps over which loss must be stable.
            stability_cv_threshold: max coefficient of variation for "stable".
            loss_slope_threshold: max absolute relative slope for "stable".
        """
        self.convergence_window = convergence_window
        self.stability_cv_threshold = stability_cv_threshold
        self.loss_slope_threshold = loss_slope_threshold

        # Rolling data
        self._losses: Deque[float] = deque(maxlen=convergence_window)
        self._mean_qs: Deque[float] = deque(maxlen=convergence_window)
        self._harvest_rates: Deque[float] = deque(maxlen=convergence_window)
        self._epsilons: Deque[float] = deque(maxlen=convergence_window)

        self._current_step: int = 0

        logger.info(
            "ConvergenceTracker initialised (window=%d, cv_threshold=%.4f)",
            convergence_window,
            stability_cv_threshold,
        )

    # ---- Data ingestion -----------------------------------------------------

    def update(self, metrics: Dict[str, Any]) -> None:
        """Feed new metrics into the tracker.

        Expected keys: loss, mean_q, harvest_rate, epsilon, step.
        """
        self._losses.append(metrics.get("loss", 0.0))
        self._mean_qs.append(metrics.get("mean_q", 0.0))
        self._harvest_rates.append(metrics.get("harvest_rate", 0.0))
        self._epsilons.append(metrics.get("epsilon", 1.0))
        self._current_step = metrics.get("step", self._current_step + 1)

    # ---- Phase detection ----------------------------------------------------

    def get_phase(self) -> str:
        """Return the current training phase string."""
        if not self._epsilons:
            return self.PHASE_EXPLORATION

        current_eps = self._epsilons[-1]

        if current_eps > 0.5:
            return self.PHASE_EXPLORATION

        if current_eps > 0.1:
            return self.PHASE_LEARNING

        # In exploitation phase -- check for convergence
        if self.is_converged():
            return self.PHASE_CONVERGED

        return self.PHASE_EXPLOITATION

    def is_converged(self) -> bool:
        """Check if training has converged.

        Convergence requires:
        1. In exploitation phase (epsilon <= 0.1)
        2. Enough samples in the window (at least convergence_window)
        3. Loss coefficient of variation below threshold
        4. Loss trend (slope) near zero
        """
        if not self._epsilons or self._epsilons[-1] > 0.1:
            return False

        if len(self._losses) < self.convergence_window:
            return False

        losses = np.array(self._losses, dtype=np.float64)
        mean_loss = np.mean(losses)
        if mean_loss < 1e-12:
            return True  # loss effectively zero

        # Coefficient of variation
        cv = float(np.std(losses) / (abs(mean_loss) + 1e-12))
        if cv > self.stability_cv_threshold:
            return False

        # Trend slope (normalised)
        slope = self._linear_slope(losses)
        relative_slope = abs(slope) / (abs(mean_loss) + 1e-12)
        if relative_slope > self.loss_slope_threshold:
            return False

        return True

    # ---- Diagnostics --------------------------------------------------------

    def get_diagnostics(self) -> Dict[str, Any]:
        """Return a comprehensive diagnostics dict.

        Includes:
            phase, step, loss_trend, loss_cv, q_cv, q_stability,
            harvest_trend, epsilon_current, samples_collected.
        """
        diag: Dict[str, Any] = {
            "phase": self.get_phase(),
            "step": self._current_step,
            "converged": self.is_converged(),
            "samples_collected": len(self._losses),
            "convergence_window": self.convergence_window,
        }

        # Loss diagnostics
        if self._losses:
            losses = np.array(self._losses, dtype=np.float64)
            mean_loss = float(np.mean(losses))
            loss_cv = float(np.std(losses) / (abs(mean_loss) + 1e-12))
            loss_slope = self._linear_slope(losses)
            diag["loss_mean"] = mean_loss
            diag["loss_cv"] = loss_cv
            diag["loss_slope"] = float(loss_slope)
            diag["loss_trend"] = (
                "decreasing" if loss_slope < -1e-8
                else "increasing" if loss_slope > 1e-8
                else "stable"
            )
        else:
            diag["loss_mean"] = 0.0
            diag["loss_cv"] = 0.0
            diag["loss_slope"] = 0.0
            diag["loss_trend"] = "unknown"

        # Q-value diagnostics
        if self._mean_qs:
            qs = np.array(self._mean_qs, dtype=np.float64)
            q_mean = float(np.mean(qs))
            q_cv = float(np.std(qs) / (abs(q_mean) + 1e-12))
            diag["q_mean"] = q_mean
            diag["q_cv"] = q_cv
            diag["q_stability"] = "stable" if q_cv < 0.1 else "unstable"
        else:
            diag["q_mean"] = 0.0
            diag["q_cv"] = 0.0
            diag["q_stability"] = "unknown"

        # Harvest rate diagnostics
        if self._harvest_rates:
            hr = np.array(self._harvest_rates, dtype=np.float64)
            hr_slope = self._linear_slope(hr)
            diag["harvest_mean"] = float(np.mean(hr))
            diag["harvest_slope"] = float(hr_slope)
            diag["harvest_trend"] = (
                "improving" if hr_slope > 1e-8
                else "degrading" if hr_slope < -1e-8
                else "stable"
            )
        else:
            diag["harvest_mean"] = 0.0
            diag["harvest_slope"] = 0.0
            diag["harvest_trend"] = "unknown"

        # Epsilon
        diag["epsilon_current"] = float(self._epsilons[-1]) if self._epsilons else 1.0

        return diag

    # ---- Internal helpers ---------------------------------------------------

    @staticmethod
    def _linear_slope(values: np.ndarray) -> float:
        """Compute the slope of a linear fit over the values array.

        Uses the closed-form OLS formula (no external dependencies).
        """
        n = len(values)
        if n < 2:
            return 0.0
        x = np.arange(n, dtype=np.float64)
        x_mean = x.mean()
        y_mean = values.mean()
        numerator = np.sum((x - x_mean) * (values - y_mean))
        denominator = np.sum((x - x_mean) ** 2)
        if abs(denominator) < 1e-12:
            return 0.0
        return float(numerator / denominator)

"""
Module 1: Evaluation framework for the RL-based focused web crawler.

Provides systematic evaluation of the DQN crawling agent against baselines,
convergence detection, domain generalisation testing, and report generation.

Components:
- EvalConfig: evaluation hyperparameters and persistence
- CrawlMetrics: per-run metrics dataclass
- BaselineCrawler: BFS / random / greedy baselines for A/B comparison
- ABEvaluator: paired statistical comparison (RL vs baseline)
- ConvergenceEvaluator: learning curve tracking and convergence detection
- DomainGeneralizationEval: held-out domain generalisation testing
- EvalReportGenerator: markdown report with metrics, comparisons, recommendations

Integration points:
- CrawlerPipeline: run() produces CrawlMetrics via metrics collection
- DoubleDQNAgent: Q-value stats and convergence metrics
- SQLite: eval_metrics.db for persistent eval history
- NumPy: statistical tests, rolling windows, confidence intervals

Target: Apple M1 16GB, zero cloud dependency.
"""

import asyncio
import hashlib
import json
import logging
import math
import os
import random
import sqlite3
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np

logger = logging.getLogger("crawler_evaluation")


# ======================= Configuration =======================================

@dataclass
class EvalConfig:
    """Configuration for evaluation runs.

    Defaults tuned for Apple M1 16GB with moderate crawl budgets.
    eval_pages=1000 gives statistically meaningful metrics (~30 min wall time
    at 8-12 pages/sec) without exhausting memory.
    """

    # Evaluation budget
    eval_pages: int = 1_000  # pages per eval run
    eval_interval: int = 5_000  # training steps between evaluations

    # Baseline selection
    baseline_type: str = "bfs"  # bfs | random | greedy

    # Fixed seeds for reproducibility across runs
    seed_urls: List[str] = field(default_factory=list)

    # Persistence
    metrics_db: str = "scrapus_data/eval_metrics.db"


# ======================= Crawl Metrics =======================================

@dataclass
class CrawlMetrics:
    """Comprehensive metrics for a single crawl evaluation run.

    All metrics are derived from raw crawl data. No manual scoring.

    harvest_rate: primary KPI -- leads per page crawled.
    precision: leads per page that received any positive reward.
    domain_diversity: unique domains explored as fraction of total pages.
    depth_efficiency: leads found normalised by average crawl depth.
    pages_per_lead: inverse of harvest_rate (intuitive cost metric).
    domain_count: absolute count of unique domains visited.
    avg_q_value: mean predicted Q-value (agent confidence indicator).
    cumulative_reward: total reward accumulated during the run.
    time_to_first_lead: pages crawled before the first lead was found.
    pages_per_second: throughput (network + processing).
    """

    harvest_rate: float = 0.0
    precision: float = 0.0
    domain_diversity: float = 0.0
    depth_efficiency: float = 0.0
    pages_per_lead: float = float("inf")
    domain_count: int = 0
    avg_q_value: float = 0.0
    cumulative_reward: float = 0.0
    time_to_first_lead: int = 0
    pages_per_second: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Serialise to dict for JSON / SQLite storage."""
        return {
            "harvest_rate": round(self.harvest_rate, 6),
            "precision": round(self.precision, 6),
            "domain_diversity": round(self.domain_diversity, 6),
            "depth_efficiency": round(self.depth_efficiency, 6),
            "pages_per_lead": round(self.pages_per_lead, 2),
            "domain_count": self.domain_count,
            "avg_q_value": round(self.avg_q_value, 6),
            "cumulative_reward": round(self.cumulative_reward, 4),
            "time_to_first_lead": self.time_to_first_lead,
            "pages_per_second": round(self.pages_per_second, 2),
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CrawlMetrics":
        """Deserialise from dict."""
        return cls(
            harvest_rate=d.get("harvest_rate", 0.0),
            precision=d.get("precision", 0.0),
            domain_diversity=d.get("domain_diversity", 0.0),
            depth_efficiency=d.get("depth_efficiency", 0.0),
            pages_per_lead=d.get("pages_per_lead", float("inf")),
            domain_count=d.get("domain_count", 0),
            avg_q_value=d.get("avg_q_value", 0.0),
            cumulative_reward=d.get("cumulative_reward", 0.0),
            time_to_first_lead=d.get("time_to_first_lead", 0),
            pages_per_second=d.get("pages_per_second", 0.0),
        )


def compute_metrics(
    pages_crawled: int,
    leads_found: int,
    positive_reward_pages: int,
    domains: Set[str],
    depths: List[int],
    q_values: List[float],
    rewards: List[float],
    first_lead_page: int,
    elapsed_seconds: float,
) -> CrawlMetrics:
    """Compute CrawlMetrics from raw crawl data.

    Defensive against division-by-zero on all denominators.
    """
    pages = max(pages_crawled, 1)
    harvest = leads_found / pages
    precision = leads_found / max(positive_reward_pages, 1)
    diversity = len(domains) / pages
    avg_depth = float(np.mean(depths)) if depths else 1.0
    depth_eff = leads_found / max(avg_depth, 0.01)
    ppl = pages / max(leads_found, 1)
    avg_q = float(np.mean(q_values)) if q_values else 0.0
    cum_reward = float(np.sum(rewards)) if rewards else 0.0
    pps = pages / max(elapsed_seconds, 0.001)

    return CrawlMetrics(
        harvest_rate=harvest,
        precision=precision,
        domain_diversity=diversity,
        depth_efficiency=depth_eff,
        pages_per_lead=ppl,
        domain_count=len(domains),
        avg_q_value=avg_q,
        cumulative_reward=cum_reward,
        time_to_first_lead=first_lead_page,
        pages_per_second=pps,
    )


# ======================= Eval Report =========================================

@dataclass
class EvalReport:
    """Result of an A/B evaluation comparing RL crawler vs baseline.

    Includes raw metrics for both crawlers, relative improvement percentages,
    and statistical significance via paired t-test.
    """

    rl_metrics: CrawlMetrics
    baseline_metrics: CrawlMetrics
    improvement_pct: Dict[str, float]  # metric_name -> % improvement
    p_value: float  # paired t-test on per-episode harvest rates
    confidence_interval: Tuple[float, float]  # 95% CI on harvest rate diff
    n_episodes: int
    baseline_type: str
    timestamp: str = ""

    def __post_init__(self) -> None:
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rl_metrics": self.rl_metrics.to_dict(),
            "baseline_metrics": self.baseline_metrics.to_dict(),
            "improvement_pct": {
                k: round(v, 2) for k, v in self.improvement_pct.items()
            },
            "p_value": round(self.p_value, 6),
            "confidence_interval": (
                round(self.confidence_interval[0], 6),
                round(self.confidence_interval[1], 6),
            ),
            "n_episodes": self.n_episodes,
            "baseline_type": self.baseline_type,
            "timestamp": self.timestamp,
        }


# ======================= SQLite Persistence ==================================

class EvalMetricsDB:
    """SQLite persistence for evaluation metrics history.

    WAL mode for concurrent reads during long eval runs.
    Single writer -- evaluations run sequentially.
    """

    def __init__(self, db_path: str = "scrapus_data/eval_metrics.db") -> None:
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self._conn = sqlite3.connect(db_path)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA synchronous=NORMAL")
        self._create_tables()

    def _create_tables(self) -> None:
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS eval_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                training_step INTEGER NOT NULL,
                crawler_type TEXT NOT NULL,
                metrics_json TEXT NOT NULL,
                config_json TEXT
            );

            CREATE TABLE IF NOT EXISTS convergence_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                training_step INTEGER NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS eval_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                training_step INTEGER NOT NULL,
                report_json TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_eval_runs_step
                ON eval_runs(training_step);
            CREATE INDEX IF NOT EXISTS idx_convergence_step_metric
                ON convergence_history(training_step, metric_name);
        """)
        self._conn.commit()

    def save_eval_run(
        self,
        training_step: int,
        crawler_type: str,
        metrics: CrawlMetrics,
        config: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Persist a single eval run. Returns the row id."""
        ts = datetime.now(timezone.utc).isoformat()
        cur = self._conn.execute(
            """INSERT INTO eval_runs (timestamp, training_step, crawler_type,
               metrics_json, config_json) VALUES (?, ?, ?, ?, ?)""",
            (
                ts,
                training_step,
                crawler_type,
                json.dumps(metrics.to_dict()),
                json.dumps(config) if config else None,
            ),
        )
        self._conn.commit()
        return cur.lastrowid or 0

    def save_convergence_point(
        self,
        training_step: int,
        metric_name: str,
        metric_value: float,
    ) -> None:
        """Record a single convergence metric observation."""
        ts = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            """INSERT INTO convergence_history
               (training_step, metric_name, metric_value, timestamp)
               VALUES (?, ?, ?, ?)""",
            (training_step, metric_name, metric_value, ts),
        )
        self._conn.commit()

    def save_report(self, training_step: int, report: EvalReport) -> int:
        """Persist a full A/B eval report."""
        ts = datetime.now(timezone.utc).isoformat()
        cur = self._conn.execute(
            """INSERT INTO eval_reports (timestamp, training_step, report_json)
               VALUES (?, ?, ?)""",
            (ts, training_step, json.dumps(report.to_dict())),
        )
        self._conn.commit()
        return cur.lastrowid or 0

    def get_convergence_history(
        self, metric_name: str, limit: int = 10_000
    ) -> List[Tuple[int, float]]:
        """Return (step, value) pairs for a given metric, ordered by step."""
        rows = self._conn.execute(
            """SELECT training_step, metric_value FROM convergence_history
               WHERE metric_name = ? ORDER BY training_step LIMIT ?""",
            (metric_name, limit),
        ).fetchall()
        return [(r[0], r[1]) for r in rows]

    def get_eval_runs(
        self,
        crawler_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Retrieve recent eval runs, optionally filtered by crawler type."""
        if crawler_type:
            rows = self._conn.execute(
                """SELECT id, timestamp, training_step, crawler_type, metrics_json
                   FROM eval_runs WHERE crawler_type = ?
                   ORDER BY training_step DESC LIMIT ?""",
                (crawler_type, limit),
            ).fetchall()
        else:
            rows = self._conn.execute(
                """SELECT id, timestamp, training_step, crawler_type, metrics_json
                   FROM eval_runs ORDER BY training_step DESC LIMIT ?""",
                (limit,),
            ).fetchall()
        return [
            {
                "id": r[0],
                "timestamp": r[1],
                "training_step": r[2],
                "crawler_type": r[3],
                "metrics": json.loads(r[4]),
            }
            for r in rows
        ]

    def close(self) -> None:
        self._conn.close()


# ======================= Baseline Crawler ====================================

class BaselineCrawler:
    """Non-RL baseline crawlers for A/B comparison.

    Three strategies:
    - BFS: breadth-first, follows links in page order (no scoring).
    - Random: uniformly random link selection.
    - Greedy: always follows the link with the highest heuristic score
      (anchor text keyword match + domain reward history).

    All baselines use the same CrawlerEngine for fetching and politeness,
    differing only in link selection policy.
    """

    # Greedy heuristic keywords (lead-indicator terms)
    _LEAD_KEYWORDS = frozenset({
        "contact", "team", "about", "leadership", "people", "staff",
        "directory", "employees", "management", "founders", "executives",
        "careers", "jobs", "hiring", "company", "partners",
    })

    def __init__(self, strategy: str = "bfs") -> None:
        if strategy not in ("bfs", "random", "greedy"):
            raise ValueError(f"Unknown baseline strategy: {strategy}")
        self.strategy = strategy

    def select_link(
        self,
        links: List[str],
        anchor_texts: Optional[List[str]] = None,
        domain_rewards: Optional[Dict[str, float]] = None,
    ) -> int:
        """Select a link index according to the baseline strategy.

        Args:
            links: list of candidate URLs.
            anchor_texts: anchor text for each link (greedy uses these).
            domain_rewards: domain -> cumulative reward (greedy uses these).

        Returns:
            Index into the links list.
        """
        if not links:
            return 0

        if self.strategy == "bfs":
            return 0  # always first link (breadth-first order)

        if self.strategy == "random":
            return random.randint(0, len(links) - 1)

        # Greedy: score each link by keyword overlap + domain reward
        scores = []
        for i, link in enumerate(links):
            score = 0.0

            # Anchor text keyword match
            if anchor_texts and i < len(anchor_texts):
                text_lower = anchor_texts[i].lower()
                matches = sum(1 for kw in self._LEAD_KEYWORDS if kw in text_lower)
                score += matches * 0.3

            # Domain reward bonus
            if domain_rewards:
                from urllib.parse import urlparse

                domain = urlparse(link).netloc.lower()
                score += domain_rewards.get(domain, 0.0) * 0.1

            scores.append(score)

        return int(np.argmax(scores))

    async def crawl(
        self,
        seeds: List[str],
        max_pages: int,
        fetch_fn: Optional[Any] = None,
        reward_fn: Optional[Any] = None,
    ) -> CrawlMetrics:
        """Run a baseline crawl and return metrics.

        This is a simulation-friendly interface. If fetch_fn and reward_fn
        are not provided, it runs a mock crawl for testing.

        Args:
            seeds: seed URLs to start from.
            max_pages: maximum pages to crawl.
            fetch_fn: async callable(url) -> (links, anchor_texts, body_text)
                      or None for mock mode.
            reward_fn: callable(url, body_text) -> float, or None for mock.

        Returns:
            CrawlMetrics for the crawl run.
        """
        visited: Set[str] = set()
        domains: Set[str] = set()
        frontier: List[str] = list(seeds)
        depths: List[int] = []
        q_values: List[float] = []  # baselines have no Q-values
        rewards: List[float] = []
        domain_rewards: Dict[str, float] = {}

        leads_found = 0
        positive_reward_pages = 0
        first_lead_page = 0
        pages_crawled = 0

        # Track depth per URL
        url_depth: Dict[str, int] = {url: 0 for url in seeds}

        start_time = time.monotonic()

        while frontier and pages_crawled < max_pages:
            # Pop from frontier based on strategy
            if self.strategy == "bfs":
                url = frontier.pop(0)
            elif self.strategy == "random":
                idx = random.randint(0, len(frontier) - 1)
                url = frontier.pop(idx)
            else:  # greedy -- sort by heuristic
                url = frontier.pop(0)

            if url in visited:
                continue
            visited.add(url)

            # Extract domain
            from urllib.parse import urlparse

            domain = urlparse(url).netloc.lower()
            domains.add(domain)

            depth = url_depth.get(url, 0)
            depths.append(depth)

            # Fetch page
            if fetch_fn is not None:
                try:
                    links, anchor_texts, body_text = await fetch_fn(url)
                except Exception as exc:
                    logger.debug("Fetch error for %s: %s", url, exc)
                    continue
            else:
                # Mock mode: generate synthetic data
                links, anchor_texts, body_text = _mock_fetch(url, pages_crawled)

            # Compute reward
            if reward_fn is not None:
                reward = reward_fn(url, body_text)
            else:
                reward = _mock_reward(url, body_text)

            rewards.append(reward)
            pages_crawled += 1

            if reward > 0:
                positive_reward_pages += 1
            if reward >= 0.2:
                leads_found += 1
                if first_lead_page == 0:
                    first_lead_page = pages_crawled

            # Update domain rewards
            domain_rewards[domain] = domain_rewards.get(domain, 0.0) + reward

            # Select and add links to frontier
            if links:
                link_idx = self.select_link(links, anchor_texts, domain_rewards)
                # BFS/random: add all discovered links
                # Greedy: prioritise selected link but add others too
                if self.strategy == "greedy":
                    # Put selected link first
                    reordered = [links[link_idx]] + [
                        l for i, l in enumerate(links) if i != link_idx
                    ]
                else:
                    reordered = links

                for link in reordered:
                    if link not in visited:
                        frontier.append(link)
                        if link not in url_depth:
                            url_depth[link] = depth + 1

        elapsed = time.monotonic() - start_time

        return compute_metrics(
            pages_crawled=pages_crawled,
            leads_found=leads_found,
            positive_reward_pages=positive_reward_pages,
            domains=domains,
            depths=depths,
            q_values=q_values,
            rewards=rewards,
            first_lead_page=first_lead_page,
            elapsed_seconds=elapsed,
        )


def _mock_fetch(
    url: str, page_index: int
) -> Tuple[List[str], List[str], str]:
    """Generate synthetic page data for mock crawl evaluation.

    Deterministic based on URL hash for reproducibility across runs.
    """
    url_hash = int(hashlib.md5(url.encode()).hexdigest(), 16)
    rng = random.Random(url_hash)

    num_links = rng.randint(2, 15)
    links = [f"https://example-{rng.randint(0, 500)}.com/page-{rng.randint(0, 1000)}" for _ in range(num_links)]
    anchors = [rng.choice(["about", "contact", "products", "blog", "team", "careers", "docs"]) for _ in range(num_links)]
    body = f"Page content for {url} with {num_links} links."

    return links, anchors, body


def _mock_reward(url: str, body_text: str) -> float:
    """Deterministic mock reward based on URL hash.

    Mirrors real reward distribution: ~3% leads (+1.0), ~12% entities (+0.2),
    ~85% irrelevant (-0.1), plus -0.01 per-page cost.
    """
    url_hash = int(hashlib.md5(url.encode()).hexdigest(), 16)
    r = (url_hash % 1000) / 1000.0

    if r < 0.03:
        return 1.0
    elif r < 0.15:
        return 0.2
    else:
        return -0.1


# ======================= A/B Evaluator =======================================

class ABEvaluator:
    """Run RL crawler and baseline on the same seeds, compare statistically.

    Uses a paired t-test on per-episode harvest rates to determine if the
    RL crawler is significantly better than the baseline. Each "episode"
    is one eval run from the same seed set.

    The paired design controls for seed difficulty variance.
    """

    def __init__(self, db: Optional[EvalMetricsDB] = None) -> None:
        self.db = db

    async def evaluate(
        self,
        rl_crawl_fn: Any,
        baseline: BaselineCrawler,
        seeds: List[str],
        n_episodes: int = 10,
        pages_per_episode: int = 100,
        fetch_fn: Optional[Any] = None,
        reward_fn: Optional[Any] = None,
    ) -> EvalReport:
        """Run n_episodes of RL vs baseline from the same seeds.

        Args:
            rl_crawl_fn: async callable(seeds, max_pages) -> CrawlMetrics.
                         Wraps the CrawlerPipeline.run() method.
            baseline: BaselineCrawler instance.
            seeds: seed URLs (same seeds used for both crawlers).
            n_episodes: number of paired episodes.
            pages_per_episode: pages per episode.
            fetch_fn: optional fetch function for baseline.
            reward_fn: optional reward function for baseline.

        Returns:
            EvalReport with metrics, improvement %, p-value, CI.
        """
        rl_harvest_rates: List[float] = []
        baseline_harvest_rates: List[float] = []
        rl_metrics_list: List[CrawlMetrics] = []
        baseline_metrics_list: List[CrawlMetrics] = []

        for episode in range(n_episodes):
            logger.info(
                "A/B episode %d/%d (seeds=%d, pages=%d)",
                episode + 1, n_episodes, len(seeds), pages_per_episode,
            )

            # Run RL crawler
            rl_metrics = await rl_crawl_fn(seeds, pages_per_episode)
            rl_metrics_list.append(rl_metrics)
            rl_harvest_rates.append(rl_metrics.harvest_rate)

            # Run baseline
            bl_metrics = await baseline.crawl(
                seeds=seeds,
                max_pages=pages_per_episode,
                fetch_fn=fetch_fn,
                reward_fn=reward_fn,
            )
            baseline_metrics_list.append(bl_metrics)
            baseline_harvest_rates.append(bl_metrics.harvest_rate)

            logger.info(
                "Episode %d: RL harvest=%.4f, baseline harvest=%.4f",
                episode + 1,
                rl_metrics.harvest_rate,
                bl_metrics.harvest_rate,
            )

        # Aggregate metrics (mean across episodes)
        rl_agg = _aggregate_metrics(rl_metrics_list)
        bl_agg = _aggregate_metrics(baseline_metrics_list)

        # Compute improvement percentages
        improvement = _compute_improvement(rl_agg, bl_agg)

        # Paired t-test on harvest rates
        p_value, ci = _paired_t_test(
            np.array(rl_harvest_rates),
            np.array(baseline_harvest_rates),
        )

        report = EvalReport(
            rl_metrics=rl_agg,
            baseline_metrics=bl_agg,
            improvement_pct=improvement,
            p_value=p_value,
            confidence_interval=ci,
            n_episodes=n_episodes,
            baseline_type=baseline.strategy,
        )

        # Persist if DB available
        if self.db:
            self.db.save_report(training_step=0, report=report)

        return report


def _aggregate_metrics(metrics_list: List[CrawlMetrics]) -> CrawlMetrics:
    """Compute mean metrics across multiple eval runs."""
    if not metrics_list:
        return CrawlMetrics()

    n = len(metrics_list)
    return CrawlMetrics(
        harvest_rate=sum(m.harvest_rate for m in metrics_list) / n,
        precision=sum(m.precision for m in metrics_list) / n,
        domain_diversity=sum(m.domain_diversity for m in metrics_list) / n,
        depth_efficiency=sum(m.depth_efficiency for m in metrics_list) / n,
        pages_per_lead=sum(m.pages_per_lead for m in metrics_list) / n,
        domain_count=int(sum(m.domain_count for m in metrics_list) / n),
        avg_q_value=sum(m.avg_q_value for m in metrics_list) / n,
        cumulative_reward=sum(m.cumulative_reward for m in metrics_list) / n,
        time_to_first_lead=int(
            sum(m.time_to_first_lead for m in metrics_list) / n
        ),
        pages_per_second=sum(m.pages_per_second for m in metrics_list) / n,
    )


def _compute_improvement(
    rl: CrawlMetrics, baseline: CrawlMetrics
) -> Dict[str, float]:
    """Compute percentage improvement of RL over baseline for each metric.

    Positive = RL is better. For pages_per_lead, lower is better so the
    sign is inverted.
    """

    def pct(rl_val: float, bl_val: float, lower_is_better: bool = False) -> float:
        if bl_val == 0:
            return 0.0
        raw = ((rl_val - bl_val) / abs(bl_val)) * 100.0
        return -raw if lower_is_better else raw

    return {
        "harvest_rate": pct(rl.harvest_rate, baseline.harvest_rate),
        "precision": pct(rl.precision, baseline.precision),
        "domain_diversity": pct(rl.domain_diversity, baseline.domain_diversity),
        "depth_efficiency": pct(rl.depth_efficiency, baseline.depth_efficiency),
        "pages_per_lead": pct(
            rl.pages_per_lead, baseline.pages_per_lead, lower_is_better=True
        ),
        "cumulative_reward": pct(
            rl.cumulative_reward, baseline.cumulative_reward
        ),
        "pages_per_second": pct(rl.pages_per_second, baseline.pages_per_second),
    }


def _paired_t_test(
    rl_values: np.ndarray,
    baseline_values: np.ndarray,
    alpha: float = 0.05,
) -> Tuple[float, Tuple[float, float]]:
    """Paired two-sided t-test on per-episode metric arrays.

    Pure NumPy implementation -- no scipy dependency.

    Args:
        rl_values: (n_episodes,) array of RL metric values.
        baseline_values: (n_episodes,) array of baseline metric values.
        alpha: significance level for confidence interval.

    Returns:
        (p_value, (ci_lower, ci_upper)) for the mean difference.
    """
    diffs = rl_values - baseline_values
    n = len(diffs)

    if n < 2:
        return 1.0, (0.0, 0.0)

    mean_diff = float(np.mean(diffs))
    std_diff = float(np.std(diffs, ddof=1))
    se = std_diff / math.sqrt(n)

    if se < 1e-12:
        # Zero variance -- all differences are identical
        if abs(mean_diff) < 1e-12:
            return 1.0, (0.0, 0.0)
        return 0.0, (mean_diff, mean_diff)

    t_stat = mean_diff / se
    df = n - 1

    # Two-sided p-value via t-distribution approximation
    # Using the regularised incomplete beta function approximation
    p_value = _t_distribution_p_value(abs(t_stat), df) * 2.0
    p_value = min(p_value, 1.0)

    # 95% confidence interval using t critical value approximation
    t_crit = _t_critical(alpha / 2.0, df)
    ci_lower = mean_diff - t_crit * se
    ci_upper = mean_diff + t_crit * se

    return p_value, (ci_lower, ci_upper)


def _t_distribution_p_value(t_abs: float, df: int) -> float:
    """Approximate one-sided p-value for t-distribution.

    Uses the approximation from Abramowitz and Stegun (1972), adequate
    for df >= 2. Falls back to normal approximation for large df.
    """
    if df >= 30:
        # Normal approximation for large degrees of freedom
        z = t_abs
        # Standard normal survival function approximation (Abramowitz & Stegun)
        p = 0.5 * math.erfc(z / math.sqrt(2.0))
        return p

    # Small df: use beta function relationship
    # P(T > t) = 0.5 * I(df/(df+t^2); df/2, 1/2) via regularised incomplete beta
    x = df / (df + t_abs * t_abs)
    a = df / 2.0
    b = 0.5
    return 0.5 * _regularised_beta(x, a, b)


def _regularised_beta(x: float, a: float, b: float, n_terms: int = 200) -> float:
    """Regularised incomplete beta function via continued fraction (Lentz).

    Accurate to ~1e-10 for the range of (a, b) values in t-tests.
    """
    if x <= 0.0:
        return 0.0
    if x >= 1.0:
        return 1.0

    # Use the continued fraction for I_x(a, b)
    # Front factor
    lbeta = math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)
    front = math.exp(a * math.log(x) + b * math.log(1.0 - x) - lbeta) / a

    # Lentz's method for continued fraction
    f = 1.0
    c = 1.0
    d = 1.0 - (a + b) * x / (a + 1.0)
    if abs(d) < 1e-30:
        d = 1e-30
    d = 1.0 / d
    f = d

    for m in range(1, n_terms + 1):
        # Even step
        m2 = 2 * m
        num = m * (b - m) * x / ((a + m2 - 1.0) * (a + m2))
        d = 1.0 + num * d
        if abs(d) < 1e-30:
            d = 1e-30
        d = 1.0 / d
        c = 1.0 + num / c
        if abs(c) < 1e-30:
            c = 1e-30
        f *= d * c

        # Odd step
        num = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1.0))
        d = 1.0 + num * d
        if abs(d) < 1e-30:
            d = 1e-30
        d = 1.0 / d
        c = 1.0 + num / c
        if abs(c) < 1e-30:
            c = 1e-30
        delta = d * c
        f *= delta

        if abs(delta - 1.0) < 1e-10:
            break

    return front * f


def _t_critical(alpha: float, df: int) -> float:
    """Approximate t critical value for given alpha and degrees of freedom.

    Uses the inverse normal approximation with Cornish-Fisher correction
    for small df.
    """
    # Inverse normal approximation
    # For alpha in (0, 0.5), use the rational approximation
    z = _inverse_normal(alpha)

    if df >= 30:
        return z

    # Cornish-Fisher correction for small df
    g1 = (z ** 3 + z) / (4.0 * df)
    g2 = (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96.0 * df ** 2)
    return z + g1 + g2


def _inverse_normal(p: float) -> float:
    """Approximate inverse of the standard normal CDF (quantile function).

    Rational approximation from Peter Acklam, accurate to ~1.15e-9.
    """
    if p <= 0:
        return -10.0
    if p >= 1:
        return 10.0

    # Coefficients
    a = [
        -3.969683028665376e01, 2.209460984245205e02,
        -2.759285104469687e02, 1.383577518672690e02,
        -3.066479806614716e01, 2.506628277459239e00,
    ]
    b = [
        -5.447609879822406e01, 1.615858368580409e02,
        -1.556989798598866e02, 6.680131188771972e01,
        -1.328068155288572e01,
    ]
    c = [
        -7.784894002430293e-03, -3.223964580411365e-01,
        -2.400758277161838e00, -2.549732539343734e00,
        4.374664141464968e00, 2.938163982698783e00,
    ]
    d = [
        7.784695709041462e-03, 3.224671290700398e-01,
        2.445134137142996e00, 3.754408661907416e00,
    ]

    p_low = 0.02425
    p_high = 1.0 - p_low

    if p < p_low:
        q = math.sqrt(-2.0 * math.log(p))
        return (
            ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]
        ) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0)
    elif p <= p_high:
        q = p - 0.5
        r = q * q
        return (
            (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
        ) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0)
    else:
        q = math.sqrt(-2.0 * math.log(1.0 - p))
        return -(
            ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]
        ) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0)


# ======================= Convergence Evaluator ===============================

class ConvergenceEvaluator:
    """Track training metrics over time and detect convergence.

    Convergence is defined as: the rolling mean of harvest_rate (and loss)
    has not changed by more than a threshold over a window of N steps.

    Stores plot-ready data: [(step, value)] for each metric.
    """

    def __init__(
        self,
        db: Optional[EvalMetricsDB] = None,
        stability_threshold: float = 0.01,
    ) -> None:
        self.db = db
        self.stability_threshold = stability_threshold

        # In-memory history: metric_name -> [(step, value)]
        self._history: Dict[str, List[Tuple[int, float]]] = {
            "harvest_rate": [],
            "loss": [],
            "epsilon": [],
            "avg_q_value": [],
            "cumulative_reward": [],
            "pages_per_second": [],
        }

    def add_evaluation(self, step: int, metrics: CrawlMetrics) -> None:
        """Record metrics from an eval run at a given training step.

        Also persists to SQLite if a DB is configured.
        """
        entries = {
            "harvest_rate": metrics.harvest_rate,
            "avg_q_value": metrics.avg_q_value,
            "cumulative_reward": metrics.cumulative_reward,
            "pages_per_second": metrics.pages_per_second,
        }

        for name, value in entries.items():
            self._history[name].append((step, value))
            if self.db:
                self.db.save_convergence_point(step, name, value)

    def add_training_metrics(
        self, step: int, loss: float, epsilon: float
    ) -> None:
        """Record per-step training metrics (loss, epsilon).

        Called more frequently than add_evaluation -- every log_interval steps.
        """
        self._history["loss"].append((step, loss))
        self._history["epsilon"].append((step, epsilon))

        if self.db:
            self.db.save_convergence_point(step, "loss", loss)
            self.db.save_convergence_point(step, "epsilon", epsilon)

    def is_converged(self, window: int = 5_000) -> bool:
        """Check if training has converged.

        Convergence criteria (all must hold over the window):
        1. harvest_rate rolling std < stability_threshold
        2. loss rolling std < stability_threshold
        3. At least `window` steps of data available

        Args:
            window: number of most recent steps to consider.

        Returns:
            True if metrics are stable over the window.
        """
        hr_history = self._history["harvest_rate"]
        loss_history = self._history["loss"]

        if len(hr_history) < 5 or len(loss_history) < 5:
            return False

        # Filter to entries within the last `window` steps
        if hr_history:
            max_step = hr_history[-1][0]
            hr_recent = [v for s, v in hr_history if s >= max_step - window]
            loss_recent = [v for s, v in loss_history if s >= max_step - window]
        else:
            return False

        if len(hr_recent) < 3 or len(loss_recent) < 3:
            return False

        hr_std = float(np.std(hr_recent))
        loss_std = float(np.std(loss_recent))

        logger.info(
            "Convergence check: hr_std=%.6f, loss_std=%.6f, threshold=%.6f",
            hr_std, loss_std, self.stability_threshold,
        )

        return hr_std < self.stability_threshold and loss_std < self.stability_threshold

    def get_learning_curve(self) -> Dict[str, List[Tuple[int, float]]]:
        """Return plot-ready data for all tracked metrics.

        Returns:
            Dict mapping metric_name -> [(step, value), ...] sorted by step.
        """
        result: Dict[str, List[Tuple[int, float]]] = {}
        for name, history in self._history.items():
            if history:
                result[name] = sorted(history, key=lambda x: x[0])
        return result

    def get_rolling_stats(
        self, metric_name: str, window: int = 100
    ) -> Dict[str, float]:
        """Compute rolling mean and std for a given metric.

        Args:
            metric_name: one of the tracked metric names.
            window: number of most recent observations.

        Returns:
            Dict with rolling_mean, rolling_std, trend (slope).
        """
        history = self._history.get(metric_name, [])
        if not history:
            return {"rolling_mean": 0.0, "rolling_std": 0.0, "trend": 0.0}

        recent_values = [v for _, v in history[-window:]]
        arr = np.array(recent_values)

        mean_val = float(np.mean(arr))
        std_val = float(np.std(arr))

        # Linear trend (slope) via least squares
        trend = 0.0
        if len(arr) >= 3:
            x = np.arange(len(arr), dtype=np.float64)
            # Slope = cov(x, y) / var(x)
            x_mean = np.mean(x)
            y_mean = np.mean(arr)
            cov = float(np.mean((x - x_mean) * (arr - y_mean)))
            var_x = float(np.var(x))
            if var_x > 0:
                trend = cov / var_x

        return {
            "rolling_mean": round(mean_val, 6),
            "rolling_std": round(std_val, 6),
            "trend": round(trend, 8),
        }


# ======================= Domain Generalisation Eval ==========================

class DomainGeneralizationEval:
    """Test whether the RL agent generalises to unseen domains.

    Splits known domains into train (80%) and test (20%). The agent is
    evaluated on the held-out test set to measure transfer performance.

    A well-generalising agent should achieve harvest_rate on test domains
    within 80% of its train-domain performance.
    """

    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)

    def split_domains(
        self,
        all_domains: List[str],
        test_ratio: float = 0.2,
    ) -> Tuple[List[str], List[str]]:
        """Split domains into train and test sets.

        Uses a deterministic shuffle for reproducibility.

        Args:
            all_domains: list of all known domain strings.
            test_ratio: fraction held out for testing.

        Returns:
            (train_domains, test_domains)
        """
        shuffled = list(all_domains)
        self._rng.shuffle(shuffled)

        split_idx = max(1, int(len(shuffled) * (1.0 - test_ratio)))
        train = shuffled[:split_idx]
        test = shuffled[split_idx:]

        logger.info(
            "Domain split: %d train, %d test (ratio=%.2f)",
            len(train), len(test), test_ratio,
        )
        return train, test

    async def eval_generalization(
        self,
        rl_crawl_fn: Any,
        test_domains: List[str],
        pages_per_domain: int = 50,
    ) -> CrawlMetrics:
        """Evaluate the RL agent on held-out test domains.

        Constructs seed URLs from test domains and runs the RL crawl.

        Args:
            rl_crawl_fn: async callable(seeds, max_pages) -> CrawlMetrics.
            test_domains: list of held-out domain strings.
            pages_per_domain: crawl budget per test domain.

        Returns:
            Aggregated CrawlMetrics across all test domains.
        """
        if not test_domains:
            logger.warning("No test domains provided for generalisation eval")
            return CrawlMetrics()

        # Build seed URLs from test domains (assume https + root path)
        seeds = [f"https://{domain}/" for domain in test_domains]
        max_pages = len(test_domains) * pages_per_domain

        logger.info(
            "Generalisation eval: %d test domains, %d total pages",
            len(test_domains), max_pages,
        )

        metrics = await rl_crawl_fn(seeds, max_pages)
        return metrics

    async def full_evaluation(
        self,
        rl_crawl_fn: Any,
        all_domains: List[str],
        test_ratio: float = 0.2,
        pages_per_domain: int = 50,
    ) -> Dict[str, Any]:
        """Run train/test split and evaluate on both sets.

        Returns a report comparing train vs test performance.
        """
        train_domains, test_domains = self.split_domains(all_domains, test_ratio)

        train_seeds = [f"https://{d}/" for d in train_domains]
        train_pages = len(train_domains) * pages_per_domain
        test_pages = len(test_domains) * pages_per_domain

        logger.info("Evaluating on train domains...")
        train_metrics = await rl_crawl_fn(train_seeds, train_pages)

        logger.info("Evaluating on test domains...")
        test_metrics = await self.eval_generalization(
            rl_crawl_fn, test_domains, pages_per_domain
        )

        # Generalisation ratio: test / train (1.0 = perfect generalisation)
        train_hr = max(train_metrics.harvest_rate, 1e-9)
        gen_ratio = test_metrics.harvest_rate / train_hr

        return {
            "train_metrics": train_metrics.to_dict(),
            "test_metrics": test_metrics.to_dict(),
            "train_domains": len(train_domains),
            "test_domains": len(test_domains),
            "generalisation_ratio": round(gen_ratio, 4),
            "generalises_well": gen_ratio >= 0.8,
        }


# ======================= Report Generator ====================================

class EvalReportGenerator:
    """Generate markdown evaluation reports.

    Output format is designed for readability in terminal, GitHub, and
    Markdown renderers. Tables use GFM pipe syntax.
    """

    @staticmethod
    def generate(eval_results: Dict[str, Any]) -> str:
        """Generate a complete markdown evaluation report.

        Args:
            eval_results: dict containing any combination of:
                - "ab_report": EvalReport or EvalReport.to_dict()
                - "convergence": ConvergenceEvaluator learning curve data
                - "generalisation": DomainGeneralizationEval results
                - "training_step": current training step
                - "timestamp": ISO timestamp

        Returns:
            Markdown string.
        """
        sections: List[str] = []

        # Header
        ts = eval_results.get(
            "timestamp", datetime.now(timezone.utc).isoformat()
        )
        step = eval_results.get("training_step", 0)
        sections.append(f"# Crawler Evaluation Report\n")
        sections.append(f"**Generated:** {ts}")
        sections.append(f"**Training step:** {step:,}")
        sections.append("")

        # A/B comparison section
        ab = eval_results.get("ab_report")
        if ab:
            sections.append(
                EvalReportGenerator._generate_ab_section(ab)
            )

        # Convergence section
        convergence = eval_results.get("convergence")
        if convergence:
            sections.append(
                EvalReportGenerator._generate_convergence_section(convergence)
            )

        # Generalisation section
        gen = eval_results.get("generalisation")
        if gen:
            sections.append(
                EvalReportGenerator._generate_generalisation_section(gen)
            )

        # Recommendations
        sections.append(
            EvalReportGenerator._generate_recommendations(eval_results)
        )

        return "\n".join(sections)

    @staticmethod
    def _generate_ab_section(ab: Any) -> str:
        """Generate the A/B comparison section."""
        # Accept both EvalReport objects and dicts
        if isinstance(ab, dict):
            rl = ab.get("rl_metrics", {})
            bl = ab.get("baseline_metrics", {})
            imp = ab.get("improvement_pct", {})
            p_val = ab.get("p_value", 1.0)
            ci = ab.get("confidence_interval", (0.0, 0.0))
            n_ep = ab.get("n_episodes", 0)
            bl_type = ab.get("baseline_type", "unknown")
        else:
            rl = ab.rl_metrics.to_dict()
            bl = ab.baseline_metrics.to_dict()
            imp = ab.improvement_pct
            p_val = ab.p_value
            ci = ab.confidence_interval
            n_ep = ab.n_episodes
            bl_type = ab.baseline_type

        lines = [
            "## A/B Comparison: RL vs Baseline\n",
            f"**Baseline type:** {bl_type}",
            f"**Episodes:** {n_ep}",
            f"**p-value:** {p_val:.6f}",
            f"**95% CI on harvest rate diff:** [{ci[0]:.6f}, {ci[1]:.6f}]",
            "",
            "| Metric | RL | Baseline | Improvement |",
            "|---|---|---|---|",
        ]

        metric_labels = {
            "harvest_rate": "Harvest rate",
            "precision": "Precision",
            "domain_diversity": "Domain diversity",
            "depth_efficiency": "Depth efficiency",
            "pages_per_lead": "Pages per lead",
            "domain_count": "Domain count",
            "avg_q_value": "Avg Q-value",
            "cumulative_reward": "Cumulative reward",
            "time_to_first_lead": "Time to first lead",
            "pages_per_second": "Pages/sec",
        }

        for key, label in metric_labels.items():
            rl_val = rl.get(key, 0)
            bl_val = bl.get(key, 0)
            imp_val = imp.get(key, 0.0)

            if isinstance(rl_val, float):
                rl_str = f"{rl_val:.4f}"
                bl_str = f"{bl_val:.4f}"
            else:
                rl_str = str(rl_val)
                bl_str = str(bl_val)

            imp_str = f"{imp_val:+.1f}%" if key in imp else "N/A"
            lines.append(f"| {label} | {rl_str} | {bl_str} | {imp_str} |")

        # Statistical significance note
        lines.append("")
        if p_val < 0.01:
            lines.append(
                "**Result:** Highly significant (p < 0.01). "
                "The RL crawler outperforms the baseline."
            )
        elif p_val < 0.05:
            lines.append(
                "**Result:** Significant (p < 0.05). "
                "The RL crawler outperforms the baseline."
            )
        else:
            lines.append(
                "**Result:** Not statistically significant (p >= 0.05). "
                "More episodes may be needed, or the difference is negligible."
            )

        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def _generate_convergence_section(
        convergence: Dict[str, Any],
    ) -> str:
        """Generate the convergence analysis section."""
        lines = [
            "## Convergence Analysis\n",
        ]

        is_converged = convergence.get("is_converged", False)
        curves = convergence.get("learning_curve", {})

        if is_converged:
            lines.append("**Status:** CONVERGED -- training metrics are stable.\n")
        else:
            lines.append("**Status:** NOT CONVERGED -- training is still improving.\n")

        # Summary statistics for each tracked metric
        lines.append("| Metric | Latest | Rolling Mean | Rolling Std | Trend |")
        lines.append("|---|---|---|---|---|")

        rolling_stats = convergence.get("rolling_stats", {})
        for metric_name, stats in rolling_stats.items():
            curve = curves.get(metric_name, [])
            latest = f"{curve[-1][1]:.6f}" if curve else "N/A"
            mean = f"{stats.get('rolling_mean', 0.0):.6f}"
            std = f"{stats.get('rolling_std', 0.0):.6f}"
            trend = stats.get("trend", 0.0)
            trend_arrow = "+" if trend > 0 else ""
            trend_str = f"{trend_arrow}{trend:.8f}"
            lines.append(
                f"| {metric_name} | {latest} | {mean} | {std} | {trend_str} |"
            )

        # Data points summary
        lines.append("")
        for metric_name, curve in curves.items():
            lines.append(f"- **{metric_name}**: {len(curve)} data points")

        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def _generate_generalisation_section(gen: Dict[str, Any]) -> str:
        """Generate the domain generalisation section."""
        lines = [
            "## Domain Generalisation\n",
            f"**Train domains:** {gen.get('train_domains', 0)}",
            f"**Test domains:** {gen.get('test_domains', 0)}",
            f"**Generalisation ratio:** {gen.get('generalisation_ratio', 0.0):.4f}",
            "",
        ]

        generalises = gen.get("generalises_well", False)
        if generalises:
            lines.append(
                "**Result:** Good generalisation (ratio >= 0.8). "
                "The agent transfers well to unseen domains."
            )
        else:
            lines.append(
                "**Result:** Poor generalisation (ratio < 0.8). "
                "The agent may be overfitting to training domains."
            )

        # Train vs test metrics table
        train_m = gen.get("train_metrics", {})
        test_m = gen.get("test_metrics", {})

        lines.append("")
        lines.append("| Metric | Train | Test |")
        lines.append("|---|---|---|")

        for key in ["harvest_rate", "precision", "domain_diversity", "cumulative_reward"]:
            t_val = train_m.get(key, 0)
            te_val = test_m.get(key, 0)
            if isinstance(t_val, float):
                lines.append(f"| {key} | {t_val:.4f} | {te_val:.4f} |")
            else:
                lines.append(f"| {key} | {t_val} | {te_val} |")

        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def _generate_recommendations(eval_results: Dict[str, Any]) -> str:
        """Generate actionable recommendations based on eval results."""
        lines = ["## Recommendations\n"]
        recommendations: List[str] = []

        # A/B report recommendations
        ab = eval_results.get("ab_report")
        if ab:
            ab_dict = ab if isinstance(ab, dict) else ab.to_dict()
            p_val = ab_dict.get("p_value", 1.0)
            imp = ab_dict.get("improvement_pct", {})
            hr_imp = imp.get("harvest_rate", 0.0)

            if p_val >= 0.05:
                recommendations.append(
                    "- Increase evaluation episodes (currently may be underpowered). "
                    "Try n_episodes=30 for more statistical power."
                )
            if hr_imp < 10.0 and p_val < 0.05:
                recommendations.append(
                    "- Harvest rate improvement is modest (<10%). Consider "
                    "tuning epsilon schedule or increasing replay capacity."
                )
            if hr_imp > 50.0:
                recommendations.append(
                    "- Large harvest rate improvement (>50%). Verify baseline "
                    "is correctly configured -- this may indicate a bug."
                )

        # Convergence recommendations
        convergence = eval_results.get("convergence")
        if convergence:
            is_converged = convergence.get("is_converged", False)
            rolling = convergence.get("rolling_stats", {})
            loss_stats = rolling.get("loss", {})
            loss_trend = loss_stats.get("trend", 0.0)

            if not is_converged:
                recommendations.append(
                    "- Training has not converged. Continue training "
                    "and re-evaluate at the next eval_interval."
                )
            if loss_trend > 0.001:
                recommendations.append(
                    "- Loss is trending upward. Possible causes: "
                    "learning rate too high, stale replay priorities, "
                    "or domain distribution shift. Consider reducing lr."
                )

        # Generalisation recommendations
        gen = eval_results.get("generalisation")
        if gen:
            if not gen.get("generalises_well", True):
                recommendations.append(
                    "- Poor domain generalisation detected. Consider: "
                    "curriculum learning, domain-agnostic features, "
                    "or data augmentation across domain types."
                )

        if not recommendations:
            recommendations.append(
                "- All metrics look healthy. Continue monitoring at "
                "regular eval intervals."
            )

        lines.extend(recommendations)
        lines.append("")
        return "\n".join(lines)


# ======================= Convenience Entry Points ============================

async def run_full_evaluation(
    rl_crawl_fn: Any,
    config: Optional[EvalConfig] = None,
    all_domains: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Run a complete evaluation suite: A/B, convergence check, generalisation.

    Convenience entry point that orchestrates all evaluators.

    Args:
        rl_crawl_fn: async callable(seeds, max_pages) -> CrawlMetrics.
        config: EvalConfig (uses defaults if None).
        all_domains: list of all known domains (for generalisation eval).

    Returns:
        Dict with all evaluation results, suitable for EvalReportGenerator.
    """
    config = config or EvalConfig()
    db = EvalMetricsDB(config.metrics_db)
    results: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "training_step": 0,
    }

    try:
        # A/B evaluation
        baseline = BaselineCrawler(strategy=config.baseline_type)
        ab_evaluator = ABEvaluator(db=db)

        seeds = config.seed_urls or [
            "https://example.com/companies",
            "https://example.com/startups",
        ]

        logger.info("Running A/B evaluation...")
        ab_report = await ab_evaluator.evaluate(
            rl_crawl_fn=rl_crawl_fn,
            baseline=baseline,
            seeds=seeds,
            n_episodes=10,
            pages_per_episode=config.eval_pages // 10,
        )
        results["ab_report"] = ab_report.to_dict()

        # Domain generalisation (if domains provided)
        if all_domains and len(all_domains) >= 5:
            logger.info("Running domain generalisation evaluation...")
            gen_eval = DomainGeneralizationEval()
            gen_results = await gen_eval.full_evaluation(
                rl_crawl_fn=rl_crawl_fn,
                all_domains=all_domains,
                test_ratio=0.2,
                pages_per_domain=50,
            )
            results["generalisation"] = gen_results

        # Generate report
        report_md = EvalReportGenerator.generate(results)
        results["report_markdown"] = report_md

        logger.info("Evaluation complete")
        return results

    finally:
        db.close()


# Allow running directly: python -m crawler_evaluation
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Scrapus Module 1: Crawler Evaluation Framework"
    )
    parser.add_argument(
        "--seeds",
        nargs="+",
        default=["https://example.com/companies"],
        help="Seed URLs for evaluation",
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=1000,
        help="Pages per evaluation run",
    )
    parser.add_argument(
        "--baseline",
        choices=["bfs", "random", "greedy"],
        default="bfs",
        help="Baseline strategy for A/B comparison",
    )
    parser.add_argument(
        "--episodes",
        type=int,
        default=10,
        help="Number of A/B episodes",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Run with mock data (no real crawling)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(name)s %(levelname)s: %(message)s",
    )

    async def mock_rl_crawl(seeds: List[str], max_pages: int) -> CrawlMetrics:
        """Mock RL crawl function that simulates slightly better performance."""
        baseline = BaselineCrawler(strategy="random")
        metrics = await baseline.crawl(seeds=seeds, max_pages=max_pages)
        # Simulate RL improvement: boost harvest rate by ~3x
        return CrawlMetrics(
            harvest_rate=min(metrics.harvest_rate * 3.0, 1.0),
            precision=min(metrics.precision * 2.0, 1.0),
            domain_diversity=metrics.domain_diversity * 1.2,
            depth_efficiency=metrics.depth_efficiency * 2.5,
            pages_per_lead=max(metrics.pages_per_lead / 3.0, 1.0),
            domain_count=int(metrics.domain_count * 1.2),
            avg_q_value=0.45,
            cumulative_reward=metrics.cumulative_reward * 2.0,
            time_to_first_lead=max(1, metrics.time_to_first_lead // 2),
            pages_per_second=metrics.pages_per_second * 0.9,
        )

    config = EvalConfig(
        eval_pages=args.pages,
        baseline_type=args.baseline,
        seed_urls=args.seeds,
    )

    results = asyncio.run(
        run_full_evaluation(
            rl_crawl_fn=mock_rl_crawl,
            config=config,
        )
    )

    print("\n" + results.get("report_markdown", "No report generated."))

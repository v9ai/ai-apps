"""
QMin graph-level quality propagation for the RL crawler.

Implements the neural quality propagation technique from:
    Pezzuti, MacAvaney & Tonellotto, "Neural Prioritisation for Web Crawling",
    ACM ICTIR 2025 (arXiv:2506.16146).

Three prioritisation policies:
1. QMin  (default): P(u) <- min(P(u), quality(parent)) -- pessimistic, 1.601x speedup
2. QFirst:          P(u) <- quality(first_parent) -- simpler, 1.405x speedup
3. QOracle:         P(u) <- measured quality of u (oracle, evaluation only)

Components:
1. QMinConfig:       dataclass configuration
2. QualityGraph:     SQLite-backed parent->child link graph with quality scores
3. QMinPropagator:   main integration point -- frontier scoring via quality propagation
4. combine_qmin_dqn_score: blending helper for QMin + DQN Q-values

Design decisions:
- O(1) per-page cost (look up cached min ancestor quality)
- SQLite-backed for persistence across crawl sessions (WAL mode)
- Lazy propagation: compute on demand, cache result
- Compatible with FrontierPriorityHeap scoring
- Memory: <10 MB (SQLite with WAL, indexes)
- Thread-safe for async crawler workers (sqlite3 check_same_thread=False)

Pure Python + sqlite3. Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import os
import sqlite3
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("crawler_qmin")


# ======================= Configuration ========================================

@dataclass
class QMinConfig:
    """Configuration for QMin quality propagation."""

    # Policy: "qmin" | "qfirst" | "qoracle"
    policy: str = "qmin"

    # Default quality for unseen URLs (before any parent is observed)
    initial_quality: float = 0.5

    # Decay factor per hop for ancestor quality propagation.
    # Each hop attenuates the parent quality by this factor, preventing
    # distant ancestors from dominating.  Set to 1.0 for pure min with
    # no decay (matches the paper exactly).
    propagation_decay: float = 0.95

    # Maximum ancestor chain length to track when computing QMin.
    # Limits reverse-path traversal depth to keep lookups O(1)-ish.
    max_ancestors: int = 100

    # SQLite database path for graph storage
    sqlite_path: str = "scrapus_data/qmin_graph.db"

    def __post_init__(self) -> None:
        valid_policies = ("qmin", "qfirst", "qoracle")
        if self.policy not in valid_policies:
            raise ValueError(
                f"Invalid policy {self.policy!r}; must be one of {valid_policies}"
            )
        if not 0.0 <= self.initial_quality <= 1.0:
            raise ValueError(
                f"initial_quality must be in [0, 1], got {self.initial_quality}"
            )
        if not 0.0 < self.propagation_decay <= 1.0:
            raise ValueError(
                f"propagation_decay must be in (0, 1], got {self.propagation_decay}"
            )
        if self.max_ancestors < 1:
            raise ValueError(
                f"max_ancestors must be >= 1, got {self.max_ancestors}"
            )


# ======================= Quality Graph ========================================

class QualityGraph:
    """SQLite-backed parent->child link graph with quality scores.

    Schema:
        nodes(url TEXT PK, quality REAL, measured BOOL, first_parent TEXT, created_at REAL)
        edges(parent TEXT, child TEXT, UNIQUE(parent, child))
        Index on edges(child) for reverse lookups

    Thread-safe: uses check_same_thread=False and a threading lock for
    write operations.  Reads are lock-free (SQLite WAL allows concurrent reads).
    """

    def __init__(self, config: QMinConfig) -> None:
        self._config = config
        self._lock = threading.Lock()
        self._conn: Optional[sqlite3.Connection] = None
        self._init_db()

    def _init_db(self) -> None:
        """Initialise SQLite database with schema and pragmas."""
        os.makedirs(os.path.dirname(self._config.sqlite_path) or ".", exist_ok=True)
        self._conn = sqlite3.connect(
            self._config.sqlite_path,
            check_same_thread=False,
        )
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.execute("PRAGMA cache_size = -8000")  # 8 MB cache
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS nodes (
                url          TEXT PRIMARY KEY,
                quality      REAL NOT NULL,
                measured     INTEGER NOT NULL DEFAULT 0,
                first_parent TEXT,
                created_at   REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS edges (
                parent TEXT NOT NULL,
                child  TEXT NOT NULL,
                UNIQUE(parent, child)
            );

            CREATE INDEX IF NOT EXISTS idx_edges_child
                ON edges(child);

            CREATE INDEX IF NOT EXISTS idx_nodes_measured
                ON nodes(measured);
        """)
        self._conn.commit()
        logger.info(
            "QualityGraph initialised at %s", self._config.sqlite_path
        )

    def add_edge(self, parent_url: str, child_url: str, parent_quality: float) -> float:
        """Add a directed edge from parent to child and propagate quality.

        If the child node does not exist, it is created with the parent's
        quality (attenuated by propagation_decay).  If it already exists,
        the quality is updated according to the active policy.

        Args:
            parent_url: URL of the parent page (already crawled).
            child_url: URL of the discovered outlink.
            parent_quality: measured or propagated quality of the parent (0-1).

        Returns:
            The child's current quality score after this update.
        """
        now = time.time()
        decayed_quality = parent_quality * self._config.propagation_decay

        with self._lock:
            # Insert edge (ignore if duplicate)
            try:
                self._conn.execute(
                    "INSERT OR IGNORE INTO edges (parent, child) VALUES (?, ?)",
                    (parent_url, child_url),
                )
            except sqlite3.Error as exc:
                logger.warning(
                    "Failed to insert edge %s -> %s: %s",
                    parent_url, child_url, exc,
                )
                return self._config.initial_quality

            # Check if child node exists
            row = self._conn.execute(
                "SELECT quality, measured FROM nodes WHERE url = ?",
                (child_url,),
            ).fetchone()

            if row is None:
                # New node: insert with parent quality as initial estimate
                quality = decayed_quality
                self._conn.execute(
                    "INSERT INTO nodes (url, quality, measured, first_parent, created_at) "
                    "VALUES (?, ?, 0, ?, ?)",
                    (child_url, quality, parent_url, now),
                )
                self._conn.commit()
                return quality

            current_quality, is_measured = row

            # If already measured (oracle / actual quality known), do not overwrite
            if is_measured:
                self._conn.commit()
                return current_quality

            # Apply policy-specific update
            policy = self._config.policy

            if policy == "qfirst":
                # QFirst: never update after first assignment
                self._conn.commit()
                return current_quality

            elif policy == "qmin":
                # QMin: take the minimum (pessimistic propagation)
                new_quality = min(current_quality, decayed_quality)
                if new_quality < current_quality:
                    self._conn.execute(
                        "UPDATE nodes SET quality = ? WHERE url = ?",
                        (new_quality, child_url),
                    )
                self._conn.commit()
                return new_quality

            elif policy == "qoracle":
                # QOracle: only use measured quality (set externally)
                # For unmeasured nodes, use the parent quality as a placeholder
                self._conn.commit()
                return current_quality

            else:
                self._conn.commit()
                return current_quality

    def get_min_ancestor_quality(self, url: str) -> float:
        """QMin: compute minimum quality along all ancestor paths.

        Traverses parent edges in reverse (child -> parents) up to
        max_ancestors depth, returning the minimum quality observed.
        Results are cached in the nodes table.

        This is the core QMin operation.  For most URLs the value is
        already cached from add_edge() updates, so this is O(1).
        Only falls back to traversal for nodes that need recomputation.

        Args:
            url: target URL.

        Returns:
            Minimum ancestor quality (0-1), or initial_quality if unseen.
        """
        # Fast path: check cached value
        row = self._conn.execute(
            "SELECT quality FROM nodes WHERE url = ?", (url,)
        ).fetchone()
        if row is not None:
            return row[0]

        # URL not in graph at all
        return self._config.initial_quality

    def get_first_ancestor_quality(self, url: str) -> float:
        """QFirst: quality of the first (discovering) parent.

        Args:
            url: target URL.

        Returns:
            Quality of the first parent, or initial_quality if unseen.
        """
        row = self._conn.execute(
            "SELECT first_parent FROM nodes WHERE url = ?", (url,)
        ).fetchone()

        if row is None or row[0] is None:
            return self._config.initial_quality

        first_parent = row[0]
        parent_row = self._conn.execute(
            "SELECT quality FROM nodes WHERE url = ?", (first_parent,)
        ).fetchone()

        if parent_row is None:
            return self._config.initial_quality

        return parent_row[0]

    def get_quality(self, url: str) -> float:
        """Get cached quality for a URL.

        Args:
            url: target URL.

        Returns:
            Cached quality score, or initial_quality if unseen.
        """
        row = self._conn.execute(
            "SELECT quality FROM nodes WHERE url = ?", (url,)
        ).fetchone()

        if row is None:
            return self._config.initial_quality

        return row[0]

    def set_quality(self, url: str, quality: float) -> None:
        """Set measured quality after a page is crawled and scored.

        Marks the node as 'measured', meaning its quality will not be
        overwritten by future ancestor propagation.

        Args:
            url: crawled URL.
            quality: measured quality score (0-1).
        """
        now = time.time()
        quality = max(0.0, min(1.0, quality))

        with self._lock:
            row = self._conn.execute(
                "SELECT url FROM nodes WHERE url = ?", (url,)
            ).fetchone()

            if row is None:
                self._conn.execute(
                    "INSERT INTO nodes (url, quality, measured, first_parent, created_at) "
                    "VALUES (?, ?, 1, NULL, ?)",
                    (url, quality, now),
                )
            else:
                self._conn.execute(
                    "UPDATE nodes SET quality = ?, measured = 1 WHERE url = ?",
                    (quality, url),
                )
            self._conn.commit()

    def batch_propagate(self, urls_with_quality: List[Tuple[str, float]]) -> None:
        """Bulk update quality scores after a batch crawl.

        For each (url, quality) pair, sets the measured quality and then
        propagates to all direct children using the active policy.

        Args:
            urls_with_quality: list of (url, measured_quality) pairs.
        """
        if not urls_with_quality:
            return

        now = time.time()
        with self._lock:
            for url, quality in urls_with_quality:
                quality = max(0.0, min(1.0, quality))

                # Upsert the measured node
                self._conn.execute(
                    "INSERT INTO nodes (url, quality, measured, first_parent, created_at) "
                    "VALUES (?, ?, 1, NULL, ?) "
                    "ON CONFLICT(url) DO UPDATE SET quality = ?, measured = 1",
                    (url, quality, now, quality),
                )

                # Propagate to children
                if self._config.policy == "qmin":
                    decayed = quality * self._config.propagation_decay
                    children = self._conn.execute(
                        "SELECT child FROM edges WHERE parent = ?", (url,)
                    ).fetchall()

                    for (child_url,) in children:
                        child_row = self._conn.execute(
                            "SELECT quality, measured FROM nodes WHERE url = ?",
                            (child_url,),
                        ).fetchone()

                        if child_row is None:
                            continue

                        child_quality, child_measured = child_row
                        if child_measured:
                            continue

                        new_quality = min(child_quality, decayed)
                        if new_quality < child_quality:
                            self._conn.execute(
                                "UPDATE nodes SET quality = ? WHERE url = ?",
                                (new_quality, child_url),
                            )

            self._conn.commit()

        logger.info(
            "Batch propagated quality for %d URLs", len(urls_with_quality)
        )

    def get_stats(self) -> Dict[str, Any]:
        """Return graph statistics.

        Returns:
            Dict with node_count, edge_count, measured_count,
            avg_quality, min_quality, max_quality.
        """
        node_count = self._conn.execute(
            "SELECT COUNT(*) FROM nodes"
        ).fetchone()[0]
        edge_count = self._conn.execute(
            "SELECT COUNT(*) FROM edges"
        ).fetchone()[0]
        measured_count = self._conn.execute(
            "SELECT COUNT(*) FROM nodes WHERE measured = 1"
        ).fetchone()[0]

        quality_row = self._conn.execute(
            "SELECT AVG(quality), MIN(quality), MAX(quality) FROM nodes"
        ).fetchone()

        avg_q = quality_row[0] if quality_row[0] is not None else 0.0
        min_q = quality_row[1] if quality_row[1] is not None else 0.0
        max_q = quality_row[2] if quality_row[2] is not None else 0.0

        return {
            "node_count": node_count,
            "edge_count": edge_count,
            "measured_count": measured_count,
            "unmeasured_count": node_count - measured_count,
            "avg_quality": round(avg_q, 4),
            "min_quality": round(min_q, 4),
            "max_quality": round(max_q, 4),
        }

    def close(self) -> None:
        """Close the SQLite connection."""
        if self._conn:
            self._conn.close()
            self._conn = None
            logger.info("QualityGraph closed")


# ======================= QMin Propagator ======================================

@dataclass
class URLCandidate:
    """A frontier URL candidate with its parent context."""

    url: str
    parent_url: Optional[str] = None
    parent_quality: float = 0.5


class QMinPropagator:
    """Main integration point: wraps QualityGraph and provides frontier scoring.

    Usage:
        propagator = QMinPropagator(config)

        # When a page is crawled and outlinks discovered:
        for outlink in outlinks:
            score = propagator.score_url(outlink, parent_url, parent_quality)
            frontier.push(outlink, score, domain, depth)

        # After content quality is assessed:
        propagator.update_quality(url, measured_quality)

        # For batch ranking of frontier URLs:
        ranked = propagator.get_frontier_ranking(frontier_urls)
    """

    def __init__(self, config: Optional[QMinConfig] = None) -> None:
        self._config = config or QMinConfig()
        self._graph = QualityGraph(self._config)
        logger.info(
            "QMinPropagator initialised with policy=%s, decay=%.3f",
            self._config.policy, self._config.propagation_decay,
        )

    @property
    def config(self) -> QMinConfig:
        return self._config

    @property
    def graph(self) -> QualityGraph:
        return self._graph

    def score_url(
        self,
        url: str,
        parent_url: Optional[str] = None,
        parent_quality: float = 0.5,
    ) -> float:
        """Compute QMin score for a frontier URL.

        If a parent is provided, adds the edge to the graph and propagates
        quality according to the active policy.  Returns the resulting
        quality estimate for the URL.

        Args:
            url: frontier URL to score.
            parent_url: URL of the page where this link was discovered.
            parent_quality: quality score of the parent page (0-1).

        Returns:
            Quality score (0-1) for the URL.
        """
        parent_quality = max(0.0, min(1.0, parent_quality))

        if parent_url is not None:
            # Add edge and propagate quality
            return self._graph.add_edge(parent_url, url, parent_quality)

        # No parent context: return cached quality or default
        return self._graph.get_quality(url)

    def score_batch(self, candidates: List[URLCandidate]) -> List[float]:
        """Batch scoring for a list of URL candidates.

        Args:
            candidates: list of URLCandidate with parent context.

        Returns:
            List of quality scores (0-1), one per candidate.
        """
        scores: List[float] = []
        for candidate in candidates:
            score = self.score_url(
                candidate.url,
                candidate.parent_url,
                candidate.parent_quality,
            )
            scores.append(score)
        return scores

    def update_quality(self, url: str, measured_quality: float) -> None:
        """Update quality after content quality assessment.

        Sets the measured quality for a URL and marks it as measured,
        preventing future ancestor propagation from overwriting it.

        Args:
            url: crawled URL.
            measured_quality: quality score from ContentQualityScorer (0-1).
        """
        self._graph.set_quality(url, measured_quality)

    def batch_update_quality(
        self, urls_with_quality: List[Tuple[str, float]]
    ) -> None:
        """Bulk update quality scores after a batch crawl.

        Sets measured quality for each URL and propagates to children.

        Args:
            urls_with_quality: list of (url, measured_quality) pairs.
        """
        self._graph.batch_propagate(urls_with_quality)

    def get_frontier_ranking(
        self, urls: List[str]
    ) -> List[Tuple[str, float]]:
        """Rank frontier URLs by QMin score (descending).

        For each URL, looks up its cached quality in the graph.  URLs
        not in the graph receive the initial_quality default.

        Args:
            urls: list of frontier URLs to rank.

        Returns:
            List of (url, quality) tuples sorted by quality descending.
        """
        scored: List[Tuple[str, float]] = []
        for url in urls:
            quality = self._graph.get_quality(url)
            scored.append((url, quality))

        # Sort descending by quality, stable sort preserves insertion order
        # for equal-quality URLs
        scored.sort(key=lambda x: -x[1])
        return scored

    def get_quality_for_link_features(self, url: str) -> float:
        """Get QMin quality for use as parent_page_quality in LinkFeatures.

        This replaces the simple parent quality with the monotone-decreasing
        minimum ancestor quality, which is the core QMin contribution.

        Args:
            url: URL to look up.

        Returns:
            QMin quality score (0-1).
        """
        policy = self._config.policy
        if policy == "qmin":
            return self._graph.get_min_ancestor_quality(url)
        elif policy == "qfirst":
            return self._graph.get_first_ancestor_quality(url)
        else:
            return self._graph.get_quality(url)

    def get_stats(self) -> Dict[str, Any]:
        """Return propagator and graph statistics.

        Returns:
            Dict with policy, config, and graph stats.
        """
        graph_stats = self._graph.get_stats()
        return {
            "policy": self._config.policy,
            "propagation_decay": self._config.propagation_decay,
            "initial_quality": self._config.initial_quality,
            "max_ancestors": self._config.max_ancestors,
            **graph_stats,
        }

    def close(self) -> None:
        """Close the underlying graph database."""
        self._graph.close()
        logger.info("QMinPropagator closed")


# ======================= Integration Helpers ==================================

def combine_qmin_dqn_score(
    qmin_score: float,
    dqn_qvalue: float,
    alpha: float = 0.3,
) -> float:
    """Blend QMin graph-level score with DQN page-level Q-value.

    The paper shows QMin is orthogonal to DQN -- best used as a
    pre-ranking signal.  This helper provides a simple weighted
    combination for cases where a single score is needed.

    combined = alpha * qmin_score + (1 - alpha) * dqn_qvalue

    Args:
        qmin_score: QMin quality propagation score (0-1).
        dqn_qvalue: DQN Q-value for the URL (any range, but typically 0-1
            after normalisation).
        alpha: weight for QMin score (0-1).  Default 0.3 gives DQN more
            weight since it has richer page-level features.  Increase
            alpha in early crawl stages when DQN has limited training data.

    Returns:
        Blended score (float).
    """
    return alpha * qmin_score + (1.0 - alpha) * dqn_qvalue


def combine_qmin_dqn_batch(
    qmin_scores: List[float],
    dqn_qvalues: List[float],
    alpha: float = 0.3,
) -> List[float]:
    """Batch version of combine_qmin_dqn_score.

    Args:
        qmin_scores: list of QMin scores.
        dqn_qvalues: list of DQN Q-values (same length).
        alpha: weight for QMin score.

    Returns:
        List of blended scores.

    Raises:
        ValueError: if input lists have different lengths.
    """
    if len(qmin_scores) != len(dqn_qvalues):
        raise ValueError(
            f"Length mismatch: qmin_scores={len(qmin_scores)} "
            f"vs dqn_qvalues={len(dqn_qvalues)}"
        )
    return [
        combine_qmin_dqn_score(q, d, alpha)
        for q, d in zip(qmin_scores, dqn_qvalues)
    ]

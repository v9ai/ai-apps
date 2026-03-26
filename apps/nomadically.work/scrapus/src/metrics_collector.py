# metrics_collector.py
"""
Pipeline metrics collection for Scrapus M1 16GB local deployment.

Provides:
1. Counter metrics: pages_crawled, entities_extracted, leads_scored, errors_total, ...
2. Gauge metrics: memory_rss_mb, models_loaded, queue_depth, ...
3. Histogram metrics: latency_per_page_ms, batch_processing_time_ms, model_load_time_ms, ...
4. Timer context manager: ``with metrics.timer("ner_inference"):``
5. Rate metrics: pages_per_second, entities_per_second
6. SQLite-backed metric storage for dashboard consumption
7. Prometheus-compatible metric names (snake_case, unit suffix)
8. Periodic flush: write metrics to SQLite every 10 seconds
9. Summary generation: per-run report with min/max/mean/p95/p99

Thread-safe, zero external dependencies (Python stdlib + psutil).
"""

from __future__ import annotations

import collections
import json
import logging
import math
import os
import sqlite3
import statistics
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Deque, Dict, List, Optional, Sequence, Tuple


logger = logging.getLogger("scrapus.metrics")

# ============================================================================
# Constants
# ============================================================================

DEFAULT_DATA_DIR = Path.home() / "scrapus_data"
METRICS_DB_NAME = "scrapus_metrics.db"
FLUSH_INTERVAL_SECS = 10.0
HISTOGRAM_MAX_SAMPLES = 10_000  # per metric


# ============================================================================
# Metric types
# ============================================================================

class Counter:
    """
    Monotonically increasing counter.

    Prometheus-compatible: only increments, never decreases.
    Thread-safe.
    """

    __slots__ = ("name", "help", "labels", "_value", "_lock")

    def __init__(self, name: str, help_text: str = "", labels: Optional[Dict[str, str]] = None) -> None:
        self.name = name
        self.help = help_text
        self.labels = labels or {}
        self._value: float = 0.0
        self._lock = threading.Lock()

    def inc(self, amount: float = 1.0) -> None:
        if amount < 0:
            raise ValueError("Counter can only be incremented")
        with self._lock:
            self._value += amount

    @property
    def value(self) -> float:
        with self._lock:
            return self._value

    def reset(self) -> None:
        with self._lock:
            self._value = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": "counter",
            "value": self.value,
            "labels": self.labels,
        }


class Gauge:
    """
    Gauge that can go up and down (e.g. memory_rss_mb, models_loaded).

    Thread-safe.
    """

    __slots__ = ("name", "help", "labels", "_value", "_lock")

    def __init__(self, name: str, help_text: str = "", labels: Optional[Dict[str, str]] = None) -> None:
        self.name = name
        self.help = help_text
        self.labels = labels or {}
        self._value: float = 0.0
        self._lock = threading.Lock()

    def set(self, value: float) -> None:
        with self._lock:
            self._value = value

    def inc(self, amount: float = 1.0) -> None:
        with self._lock:
            self._value += amount

    def dec(self, amount: float = 1.0) -> None:
        with self._lock:
            self._value -= amount

    @property
    def value(self) -> float:
        with self._lock:
            return self._value

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": "gauge",
            "value": self.value,
            "labels": self.labels,
        }


class Histogram:
    """
    Histogram for latency / duration distributions.

    Stores up to ``max_samples`` observations.  Computes min, max, mean,
    count, sum, p50, p90, p95, p99 on demand.

    Thread-safe.
    """

    __slots__ = ("name", "help", "labels", "_samples", "_lock", "_max_samples", "_count", "_sum")

    def __init__(
        self,
        name: str,
        help_text: str = "",
        labels: Optional[Dict[str, str]] = None,
        max_samples: int = HISTOGRAM_MAX_SAMPLES,
    ) -> None:
        self.name = name
        self.help = help_text
        self.labels = labels or {}
        self._max_samples = max_samples
        self._samples: Deque[float] = collections.deque(maxlen=max_samples)
        self._lock = threading.Lock()
        self._count: int = 0
        self._sum: float = 0.0

    def observe(self, value: float) -> None:
        with self._lock:
            self._samples.append(value)
            self._count += 1
            self._sum += value

    @property
    def count(self) -> int:
        with self._lock:
            return self._count

    def _sorted(self) -> List[float]:
        with self._lock:
            return sorted(self._samples)

    def percentile(self, p: float) -> float:
        """Return the p-th percentile (0-100)."""
        s = self._sorted()
        if not s:
            return 0.0
        k = (p / 100.0) * (len(s) - 1)
        lo = int(math.floor(k))
        hi = min(lo + 1, len(s) - 1)
        weight = k - lo
        return s[lo] * (1 - weight) + s[hi] * weight

    def summary_stats(self) -> Dict[str, float]:
        s = self._sorted()
        if not s:
            return {
                "count": 0, "sum": 0.0, "min": 0.0, "max": 0.0,
                "mean": 0.0, "p50": 0.0, "p90": 0.0, "p95": 0.0, "p99": 0.0,
            }
        with self._lock:
            count = self._count
            total = self._sum
        return {
            "count": count,
            "sum": round(total, 4),
            "min": round(s[0], 4),
            "max": round(s[-1], 4),
            "mean": round(total / count, 4) if count else 0.0,
            "p50": round(self.percentile(50), 4),
            "p90": round(self.percentile(90), 4),
            "p95": round(self.percentile(95), 4),
            "p99": round(self.percentile(99), 4),
        }

    def reset(self) -> None:
        with self._lock:
            self._samples.clear()
            self._count = 0
            self._sum = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": "histogram",
            "stats": self.summary_stats(),
            "labels": self.labels,
        }


# ============================================================================
# Rate tracker
# ============================================================================

class RateTracker:
    """
    Compute items-per-second over a sliding time window.

    Thread-safe.
    """

    __slots__ = ("name", "_window_secs", "_events", "_lock")

    def __init__(self, name: str, window_secs: float = 60.0) -> None:
        self.name = name
        self._window_secs = window_secs
        self._events: Deque[float] = collections.deque()
        self._lock = threading.Lock()

    def record(self, count: int = 1) -> None:
        now = time.monotonic()
        with self._lock:
            for _ in range(count):
                self._events.append(now)
            self._prune(now)

    def _prune(self, now: float) -> None:
        cutoff = now - self._window_secs
        while self._events and self._events[0] < cutoff:
            self._events.popleft()

    @property
    def rate(self) -> float:
        now = time.monotonic()
        with self._lock:
            self._prune(now)
            return len(self._events) / self._window_secs if self._window_secs > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": "rate",
            "items_per_second": round(self.rate, 2),
        }


# ============================================================================
# SQLite metric storage
# ============================================================================

class MetricStore:
    """
    SQLite-backed metric storage.

    Tables:
        metric_snapshots:  periodic metric dumps (consumed by monitoring dashboard)
        run_summaries:     per-run aggregated report

    Compatible with the existing monitoring_dashboard.py which reads from
    ``~/scrapus_data/scrapus_metrics.db``.
    """

    def __init__(self, db_path: Optional[Path] = None) -> None:
        self._db_path = str(db_path or (DEFAULT_DATA_DIR / METRICS_DB_NAME))
        self._lock = threading.Lock()
        self._init_db()

    def _init_db(self) -> None:
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS metric_snapshots (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id      TEXT,
                    metric_name TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    value       REAL,
                    labels_json TEXT,
                    stats_json  TEXT,
                    ts          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
                );

                CREATE INDEX IF NOT EXISTS idx_ms_name_ts
                ON metric_snapshots (metric_name, ts);

                CREATE INDEX IF NOT EXISTS idx_ms_run
                ON metric_snapshots (run_id);

                CREATE TABLE IF NOT EXISTS run_summaries (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id      TEXT NOT NULL,
                    summary_json TEXT NOT NULL,
                    ts          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
                );

                CREATE INDEX IF NOT EXISTS idx_rs_run
                ON run_summaries (run_id);
            """)
            conn.commit()

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self._db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA busy_timeout = 5000")
        conn.execute("PRAGMA synchronous = NORMAL")
        try:
            yield conn
        finally:
            conn.close()

    def write_snapshot(
        self,
        run_id: Optional[str],
        metrics: List[Dict[str, Any]],
    ) -> None:
        """Write a batch of metric dictionaries to SQLite."""
        rows = []
        for m in metrics:
            rows.append((
                run_id,
                m["name"],
                m["type"],
                m.get("value") if m["type"] != "histogram" else None,
                json.dumps(m.get("labels", {}), default=str),
                json.dumps(m.get("stats", {}), default=str) if m["type"] == "histogram" else None,
            ))
        with self._lock, self._connect() as conn:
            conn.executemany(
                """INSERT INTO metric_snapshots
                   (run_id, metric_name, metric_type, value, labels_json, stats_json)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                rows,
            )
            conn.commit()

    def write_run_summary(self, run_id: str, summary: Dict[str, Any]) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                "INSERT INTO run_summaries (run_id, summary_json) VALUES (?, ?)",
                (run_id, json.dumps(summary, default=str, ensure_ascii=False)),
            )
            conn.commit()

    def query_metric(
        self,
        metric_name: str,
        run_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Retrieve recent snapshots for a metric."""
        with self._lock, self._connect() as conn:
            if run_id:
                rows = conn.execute(
                    """SELECT metric_name, metric_type, value, labels_json, stats_json, ts
                       FROM metric_snapshots
                       WHERE metric_name = ? AND run_id = ?
                       ORDER BY ts DESC LIMIT ?""",
                    (metric_name, run_id, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """SELECT metric_name, metric_type, value, labels_json, stats_json, ts
                       FROM metric_snapshots
                       WHERE metric_name = ?
                       ORDER BY ts DESC LIMIT ?""",
                    (metric_name, limit),
                ).fetchall()
        return [
            {
                "name": r[0], "type": r[1], "value": r[2],
                "labels": json.loads(r[3]) if r[3] else {},
                "stats": json.loads(r[4]) if r[4] else {},
                "ts": r[5],
            }
            for r in rows
        ]

    def query_latest(self, run_id: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
        """Return the most recent snapshot of every distinct metric name."""
        with self._lock, self._connect() as conn:
            if run_id:
                rows = conn.execute(
                    """SELECT metric_name, metric_type, value, labels_json, stats_json, MAX(ts) as ts
                       FROM metric_snapshots
                       WHERE run_id = ?
                       GROUP BY metric_name
                       ORDER BY ts DESC
                       LIMIT ?""",
                    (run_id, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    """SELECT metric_name, metric_type, value, labels_json, stats_json, MAX(ts) as ts
                       FROM metric_snapshots
                       GROUP BY metric_name
                       ORDER BY ts DESC
                       LIMIT ?""",
                    (limit,),
                ).fetchall()
        return [
            {
                "name": r[0], "type": r[1], "value": r[2],
                "labels": json.loads(r[3]) if r[3] else {},
                "stats": json.loads(r[4]) if r[4] else {},
                "ts": r[5],
            }
            for r in rows
        ]


# ============================================================================
# Metrics collector (main entry point)
# ============================================================================

class MetricsCollector:
    """
    Central metrics registry and flush coordinator.

    Usage:
        metrics = MetricsCollector(run_id="run_abc123")

        metrics.counters["pages_crawled"].inc()
        metrics.gauges["memory_rss_mb"].set(1234.5)
        metrics.histograms["latency_per_page_ms"].observe(12.3)

        with metrics.timer("ner_inference"):
            run_ner(batch)

        # Automatic periodic flush every 10s, or manual:
        metrics.flush()

        # End of run:
        summary = metrics.generate_summary()
        metrics.close()
    """

    def __init__(
        self,
        run_id: Optional[str] = None,
        data_dir: Optional[Path] = None,
        flush_interval: float = FLUSH_INTERVAL_SECS,
        auto_flush: bool = True,
    ) -> None:
        self.run_id = run_id
        self._store = MetricStore(
            db_path=(data_dir or DEFAULT_DATA_DIR) / METRICS_DB_NAME
        )

        # ---- Counters (Prometheus: *_total) ----
        self.counters: Dict[str, Counter] = {
            "scrapus_pages_crawled_total":       Counter("scrapus_pages_crawled_total", "Total pages crawled"),
            "scrapus_pages_failed_total":        Counter("scrapus_pages_failed_total", "Pages that failed crawling"),
            "scrapus_entities_extracted_total":   Counter("scrapus_entities_extracted_total", "Total entities extracted"),
            "scrapus_entities_resolved_total":    Counter("scrapus_entities_resolved_total", "Entities after resolution"),
            "scrapus_leads_scored_total":         Counter("scrapus_leads_scored_total", "Leads scored"),
            "scrapus_leads_qualified_total":      Counter("scrapus_leads_qualified_total", "Leads above threshold"),
            "scrapus_reports_generated_total":    Counter("scrapus_reports_generated_total", "Reports generated"),
            "scrapus_reports_verified_total":     Counter("scrapus_reports_verified_total", "Reports passing verification"),
            "scrapus_errors_total":              Counter("scrapus_errors_total", "Total errors across all stages"),
            "scrapus_retries_total":             Counter("scrapus_retries_total", "Total retry attempts"),
            "scrapus_dlq_enqueued_total":        Counter("scrapus_dlq_enqueued_total", "Items sent to dead letter queue"),
            "scrapus_circuit_breaks_total":      Counter("scrapus_circuit_breaks_total", "Circuit breaker trips"),
        }

        # ---- Gauges ----
        self.gauges: Dict[str, Gauge] = {
            "scrapus_memory_rss_mb":             Gauge("scrapus_memory_rss_mb", "Process RSS in MB"),
            "scrapus_memory_available_mb":       Gauge("scrapus_memory_available_mb", "System available memory MB"),
            "scrapus_memory_swap_mb":            Gauge("scrapus_memory_swap_mb", "Swap usage MB"),
            "scrapus_models_loaded":             Gauge("scrapus_models_loaded", "Number of models currently loaded"),
            "scrapus_queue_depth":               Gauge("scrapus_queue_depth", "Items waiting in processing queue"),
            "scrapus_batch_size_current":        Gauge("scrapus_batch_size_current", "Current adaptive batch size"),
            "scrapus_dlq_pending":               Gauge("scrapus_dlq_pending", "Pending items in dead letter queue"),
        }

        # ---- Histograms (Prometheus: *_seconds / *_bytes) ----
        self.histograms: Dict[str, Histogram] = {
            "scrapus_crawl_latency_ms":          Histogram("scrapus_crawl_latency_ms", "Per-page crawl latency"),
            "scrapus_ner_latency_ms":            Histogram("scrapus_ner_latency_ms", "Per-page NER inference latency"),
            "scrapus_er_latency_ms":             Histogram("scrapus_er_latency_ms", "Per-pair entity resolution latency"),
            "scrapus_scoring_latency_ms":        Histogram("scrapus_scoring_latency_ms", "Per-lead scoring latency"),
            "scrapus_report_latency_ms":         Histogram("scrapus_report_latency_ms", "Per-report generation latency"),
            "scrapus_batch_time_ms":             Histogram("scrapus_batch_time_ms", "Batch processing wall time"),
            "scrapus_model_load_time_ms":        Histogram("scrapus_model_load_time_ms", "Model load time"),
            "scrapus_model_unload_time_ms":      Histogram("scrapus_model_unload_time_ms", "Model unload time"),
            "scrapus_stage_duration_ms":         Histogram("scrapus_stage_duration_ms", "Full stage duration"),
            "scrapus_gc_pause_ms":               Histogram("scrapus_gc_pause_ms", "GC pause duration"),
        }

        # ---- Rate trackers ----
        self.rates: Dict[str, RateTracker] = {
            "scrapus_pages_per_second":          RateTracker("scrapus_pages_per_second"),
            "scrapus_entities_per_second":       RateTracker("scrapus_entities_per_second"),
            "scrapus_leads_per_second":          RateTracker("scrapus_leads_per_second"),
        }

        # ---- Flush timer ----
        self._flush_interval = flush_interval
        self._flush_timer: Optional[threading.Timer] = None
        self._closed = False
        self._lock = threading.Lock()

        if auto_flush:
            self._schedule_flush()

    # ---- Timer context manager ----

    @contextmanager
    def timer(self, histogram_name: str):
        """
        Time a block of code and record the observation in a histogram.

        Usage:
            with metrics.timer("scrapus_ner_latency_ms"):
                predictions = model(batch)
        """
        t0 = time.monotonic()
        try:
            yield
        finally:
            elapsed_ms = (time.monotonic() - t0) * 1000
            hist = self.histograms.get(histogram_name)
            if hist is not None:
                hist.observe(elapsed_ms)
            else:
                # Auto-create histogram on first use
                hist = Histogram(histogram_name, f"Auto-created timer for {histogram_name}")
                self.histograms[histogram_name] = hist
                hist.observe(elapsed_ms)

    # ---- Memory gauge auto-update ----

    def update_memory_gauges(self) -> None:
        """Read current process memory and update gauge metrics."""
        try:
            import psutil  # type: ignore[import-untyped]
            proc = psutil.Process(os.getpid())
            mem = proc.memory_info()
            swap = psutil.swap_memory()
            vm = psutil.virtual_memory()
            self.gauges["scrapus_memory_rss_mb"].set(round(mem.rss / (1024 * 1024), 2))
            self.gauges["scrapus_memory_available_mb"].set(round(vm.available / (1024 * 1024), 2))
            self.gauges["scrapus_memory_swap_mb"].set(round(swap.used / (1024 * 1024), 2))
        except Exception:
            pass

    # ---- Stage timing helper ----

    @contextmanager
    def stage_timer(self, stage_name: str):
        """
        Time a full pipeline stage, recording into the stage_duration_ms histogram
        and emitting a structured log entry.

        Usage:
            with metrics.stage_timer("crawl"):
                crawl_all_pages()
        """
        t0 = time.monotonic()
        self.update_memory_gauges()
        try:
            yield
        finally:
            elapsed_ms = (time.monotonic() - t0) * 1000
            self.histograms["scrapus_stage_duration_ms"].observe(elapsed_ms)
            self.update_memory_gauges()
            logger.info(
                "Stage '%s' completed in %.2f ms (RSS: %.0f MB)",
                stage_name,
                elapsed_ms,
                self.gauges["scrapus_memory_rss_mb"].value,
            )

    # ---- Counter convenience ----

    def inc_counter(self, name: str, amount: float = 1.0) -> None:
        """Increment a counter by name.  No-op if counter does not exist."""
        c = self.counters.get(name)
        if c is not None:
            c.inc(amount)

    # ---- Gauge convenience ----

    def set_gauge(self, name: str, value: float) -> None:
        """Set a gauge by name.  No-op if gauge does not exist."""
        g = self.gauges.get(name)
        if g is not None:
            g.set(value)

    # ---- Flush to SQLite ----

    def _collect_all(self) -> List[Dict[str, Any]]:
        """Serialise all metrics to a list of dicts."""
        result: List[Dict[str, Any]] = []
        for c in self.counters.values():
            result.append(c.to_dict())
        for g in self.gauges.values():
            result.append(g.to_dict())
        for h in self.histograms.values():
            result.append(h.to_dict())
        for r in self.rates.values():
            result.append(r.to_dict())
        return result

    def flush(self) -> None:
        """Write current metric values to SQLite."""
        if self._closed:
            return
        try:
            self.update_memory_gauges()
            metrics = self._collect_all()
            self._store.write_snapshot(self.run_id, metrics)
            logger.debug("Flushed %d metrics to SQLite", len(metrics))
        except Exception as e:
            logger.warning("Failed to flush metrics: %s", e)

    def _schedule_flush(self) -> None:
        """Schedule the next periodic flush."""
        if self._closed:
            return
        self._flush_timer = threading.Timer(self._flush_interval, self._periodic_flush)
        self._flush_timer.daemon = True
        self._flush_timer.start()

    def _periodic_flush(self) -> None:
        """Called by the timer thread."""
        if self._closed:
            return
        self.flush()
        self._schedule_flush()

    # ---- Summary generation ----

    def generate_summary(self) -> Dict[str, Any]:
        """
        Generate a per-run metric report with min/max/mean/p95/p99.

        Returns a dict suitable for JSON serialisation and SQLite storage.
        """
        summary: Dict[str, Any] = {
            "run_id": self.run_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "counters": {},
            "gauges": {},
            "histograms": {},
            "rates": {},
        }

        for name, c in self.counters.items():
            summary["counters"][name] = c.value

        for name, g in self.gauges.items():
            summary["gauges"][name] = g.value

        for name, h in self.histograms.items():
            summary["histograms"][name] = h.summary_stats()

        for name, r in self.rates.items():
            summary["rates"][name] = round(r.rate, 2)

        # Persist
        if self.run_id:
            try:
                self._store.write_run_summary(self.run_id, summary)
            except Exception as e:
                logger.warning("Failed to write run summary: %s", e)

        return summary

    # ---- Close ----

    def close(self) -> None:
        """Cancel periodic flush and do a final write."""
        with self._lock:
            self._closed = True
        if self._flush_timer is not None:
            self._flush_timer.cancel()
            self._flush_timer = None
        self.flush()
        logger.info("MetricsCollector closed (run_id=%s)", self.run_id)

    # ---- Snapshot for external consumers ----

    def snapshot(self) -> Dict[str, Any]:
        """
        Return a point-in-time snapshot of all metrics as a plain dict.

        Useful for the monitoring dashboard to read without hitting SQLite.
        """
        self.update_memory_gauges()
        return {
            "run_id": self.run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "counters": {n: c.value for n, c in self.counters.items()},
            "gauges": {n: g.value for n, g in self.gauges.items()},
            "histograms": {n: h.summary_stats() for n, h in self.histograms.items()},
            "rates": {n: round(r.rate, 2) for n, r in self.rates.items()},
        }

    # ---- Register custom metrics ----

    def register_counter(self, name: str, help_text: str = "", labels: Optional[Dict[str, str]] = None) -> Counter:
        """Register a new counter metric."""
        c = Counter(name, help_text, labels)
        self.counters[name] = c
        return c

    def register_gauge(self, name: str, help_text: str = "", labels: Optional[Dict[str, str]] = None) -> Gauge:
        """Register a new gauge metric."""
        g = Gauge(name, help_text, labels)
        self.gauges[name] = g
        return g

    def register_histogram(self, name: str, help_text: str = "", labels: Optional[Dict[str, str]] = None) -> Histogram:
        """Register a new histogram metric."""
        h = Histogram(name, help_text, labels)
        self.histograms[name] = h
        return h

    def register_rate(self, name: str, window_secs: float = 60.0) -> RateTracker:
        """Register a new rate tracker."""
        r = RateTracker(name, window_secs)
        self.rates[name] = r
        return r


# ============================================================================
# Convenience: module-level singleton
# ============================================================================

_default_collector: Optional[MetricsCollector] = None
_default_lock = threading.Lock()


def get_collector(
    run_id: Optional[str] = None,
    data_dir: Optional[Path] = None,
    auto_flush: bool = True,
) -> MetricsCollector:
    """
    Return (or create) the global MetricsCollector singleton.

    Safe to call from any module.
    """
    global _default_collector
    if _default_collector is None:
        with _default_lock:
            if _default_collector is None:
                _default_collector = MetricsCollector(
                    run_id=run_id,
                    data_dir=data_dir,
                    auto_flush=auto_flush,
                )
    return _default_collector


def reset_collector() -> None:
    """Close and discard the global collector.  Useful in tests."""
    global _default_collector
    with _default_lock:
        if _default_collector is not None:
            _default_collector.close()
            _default_collector = None


# ============================================================================
# Module-level __all__
# ============================================================================

__all__ = [
    # Metric types
    "Counter",
    "Gauge",
    "Histogram",
    "RateTracker",
    # Storage
    "MetricStore",
    # Collector
    "MetricsCollector",
    "get_collector",
    "reset_collector",
]

"""
Module 1: Standardised logging configuration for the RL crawler subsystem.

Provides:
1. LogConfig: dataclass with all tunables (format, levels, rotation, metrics)
2. setup_logging(): configure root + Module 1 loggers with rotating files + console
3. CrawlerLoggerAdapter: auto-injects global_step, domain, episode_id into entries
4. MetricsLogger: JSON Lines writer for machine-parseable metrics (buffered)
5. PerformanceTimer: context manager that logs duration + tracks p50/p95/p99
6. Color-coded console output: gray/default/yellow/red/red-bold + green/cyan specials

All Module 1 crawler modules use ``logging.getLogger("crawler_*")``.  This module
configures those loggers with a consistent format, rotation, and metrics pipeline.

Integration points:
- CrawlerPipeline: call ``setup_logging()`` once at startup
- CrawlerEngine: ``CrawlerLoggerAdapter`` for per-domain context
- MetricsLogger: machine-parseable metrics for dashboard / offline analysis

Zero external dependencies -- stdlib ``logging`` only.

Target: Apple M1 16GB, zero cloud dependency.
"""

from __future__ import annotations

import json
import logging
import logging.handlers
import os
import sys
import threading
import time
from collections import defaultdict
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any, Dict, List, Optional


# ======================= Constants ==========================================

# All Module 1 logger names that should be configured
MODULE_1_LOGGERS = (
    "crawler_pipeline",
    "crawler_engine",
    "crawler_dqn",
    "crawler_embeddings",
    "crawler_replay_buffer",
    "crawler_monitoring",
    "crawler_shutdown",
    "crawler_browser_pool",
    "crawler_seed_refresh",
    "crawler_logging",
)

# ANSI colour codes for terminal output
_ANSI = {
    "GRAY": "\033[90m",
    "DEFAULT": "\033[0m",
    "YELLOW": "\033[33m",
    "RED": "\033[31m",
    "RED_BOLD": "\033[1;31m",
    "GREEN": "\033[32m",
    "CYAN": "\033[36m",
    "DIM": "\033[2m",
    "BOLD": "\033[1m",
    "RESET": "\033[0m",
}

# Level -> colour mapping
_LEVEL_COLOURS = {
    "DEBUG": _ANSI["GRAY"],
    "INFO": _ANSI["DEFAULT"],
    "WARNING": _ANSI["YELLOW"],
    "ERROR": _ANSI["RED"],
    "CRITICAL": _ANSI["RED_BOLD"],
}

logger = logging.getLogger("crawler_logging")


# ======================= LogConfig ==========================================

@dataclass
class LogConfig:
    """Configuration for Module 1 crawler logging subsystem.

    Attributes:
        level: root log level (DEBUG/INFO/WARNING/ERROR/CRITICAL).
        format: output format -- "structured", "simple", or "json".
        log_file: path to main rotating log file (None to disable).
        max_file_size_mb: max size per log file before rotation.
        backup_count: number of rotated backup files to keep.
        log_to_console: emit to stderr.
        log_to_file: emit to rotating file.
        metrics_log_file: path to JSON Lines metrics file (None to disable).
        module_levels: per-module level overrides, e.g. {"crawler_dqn": "DEBUG"}.
    """

    level: str = "INFO"
    format: str = "structured"  # structured | simple | json
    log_file: Optional[str] = "scrapus_data/logs/crawler.log"
    max_file_size_mb: int = 50
    backup_count: int = 5
    log_to_console: bool = True
    log_to_file: bool = True
    metrics_log_file: Optional[str] = "scrapus_data/logs/metrics.jsonl"
    module_levels: Dict[str, str] = field(default_factory=dict)


# ======================= Formatters =========================================

class StructuredFormatter(logging.Formatter):
    """Structured console/file format for Module 1 crawlers.

    Format:
        [2024-01-15 12:34:56.789] [INFO] [crawler_engine] [step:1234] Fetched page {domain=example.com}
    """

    def __init__(self, use_colour: bool = False) -> None:
        super().__init__()
        self._colour = use_colour

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        level = record.levelname.ljust(8)
        module_name = record.name

        # Extract step from extra fields (set by CrawlerLoggerAdapter)
        step = getattr(record, "global_step", None)
        step_tag = f"[step:{step}]" if step is not None else ""

        msg = record.getMessage()

        # Build extra key=value pairs
        extra_pairs = self._extract_extra_pairs(record)
        extra_str = f" {{{extra_pairs}}}" if extra_pairs else ""

        if self._colour:
            lc = _LEVEL_COLOURS.get(record.levelname, _ANSI["DEFAULT"])
            r = _ANSI["RESET"]
            d = _ANSI["DIM"]

            # Special colour for positive reward messages
            if "reward" in msg.lower() and any(
                c in msg for c in ("+", "positive", "success")
            ):
                msg = f"{_ANSI['GREEN']}{msg}{r}"
            elif "new domain" in msg.lower() or "discovered" in msg.lower():
                msg = f"{_ANSI['CYAN']}{msg}{r}"

            line = (
                f"{d}[{ts}]{r} {lc}[{level.strip()}]{r} "
                f"{d}[{module_name}]{r} {step_tag} {msg}{d}{extra_str}{r}"
            )
        else:
            line = (
                f"[{ts}] [{level.strip()}] [{module_name}] {step_tag} {msg}{extra_str}"
            )

        if record.exc_info and record.exc_info[0] is not None:
            import traceback

            sio = StringIO()
            traceback.print_exception(*record.exc_info, file=sio)
            line += "\n" + sio.getvalue().rstrip()

        return line

    @staticmethod
    def _extract_extra_pairs(record: logging.LogRecord) -> str:
        """Extract user-supplied extra fields as key=value string."""
        _STANDARD = {
            "name", "msg", "args", "created", "relativeCreated",
            "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "levelno", "levelname", "pathname", "filename", "module",
            "thread", "threadName", "process", "processName",
            "msecs", "message", "taskName",
            # CrawlerLoggerAdapter known fields (rendered separately)
            "global_step", "current_domain", "episode_id",
        }
        pairs = []
        for k, v in record.__dict__.items():
            if k not in _STANDARD and not k.startswith("_"):
                pairs.append(f"{k}={v}")

        # Also include adapter fields as named context
        for ctx_key in ("current_domain", "episode_id"):
            val = getattr(record, ctx_key, None)
            if val is not None:
                pairs.append(f"{ctx_key}={val}")

        return ", ".join(pairs)


class SimpleFormatter(logging.Formatter):
    """Minimal format: ``[level] module: message``."""

    def __init__(self, use_colour: bool = False) -> None:
        super().__init__()
        self._colour = use_colour

    def format(self, record: logging.LogRecord) -> str:
        level = record.levelname.ljust(8)
        msg = record.getMessage()

        if self._colour:
            lc = _LEVEL_COLOURS.get(record.levelname, _ANSI["DEFAULT"])
            r = _ANSI["RESET"]
            return f"{lc}{level.strip()}{r} {record.name}: {msg}"

        return f"{level.strip()} {record.name}: {msg}"


class JSONLineFormatter(logging.Formatter):
    """One JSON object per line, suitable for machine parsing."""

    def format(self, record: logging.LogRecord) -> str:
        entry: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "funcName": record.funcName,
            "lineno": record.lineno,
            "message": record.getMessage(),
        }

        # Inject adapter context
        for ctx_key in ("global_step", "current_domain", "episode_id"):
            val = getattr(record, ctx_key, None)
            if val is not None:
                entry[ctx_key] = val

        # Extra fields
        _STANDARD = {
            "name", "msg", "args", "created", "relativeCreated",
            "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "levelno", "levelname", "pathname", "filename", "module",
            "thread", "threadName", "process", "processName",
            "msecs", "message", "taskName",
            "global_step", "current_domain", "episode_id",
        }
        extras = {
            k: v for k, v in record.__dict__.items()
            if k not in _STANDARD and not k.startswith("_")
        }
        if extras:
            entry["extra"] = extras

        # Exception
        if record.exc_info and record.exc_info[0] is not None:
            import traceback

            sio = StringIO()
            traceback.print_exception(*record.exc_info, file=sio)
            entry["exception"] = sio.getvalue().strip()

        return json.dumps(entry, default=str, ensure_ascii=False)


# ======================= setup_logging ======================================

def setup_logging(config: Optional[LogConfig] = None) -> LogConfig:
    """Configure root logger and all Module 1 crawler loggers.

    Creates:
    - RotatingFileHandler for main log (all levels)
    - Console handler with colour support (if terminal)
    - Per-module level overrides

    Idempotent: safe to call multiple times (removes old handlers first).

    Args:
        config: logging configuration. Uses defaults if None.

    Returns:
        The LogConfig used.
    """
    config = config or LogConfig()

    root_level = getattr(logging, config.level.upper(), logging.INFO)
    use_colour = sys.stderr.isatty()

    # Select formatter based on config.format
    if config.format == "json":
        file_formatter = JSONLineFormatter()
        console_formatter = JSONLineFormatter()
    elif config.format == "simple":
        file_formatter = SimpleFormatter(use_colour=False)
        console_formatter = SimpleFormatter(use_colour=use_colour)
    else:  # "structured" (default)
        file_formatter = StructuredFormatter(use_colour=False)
        console_formatter = StructuredFormatter(use_colour=use_colour)

    # Build handler list
    handlers: List[logging.Handler] = []

    # Console handler
    if config.log_to_console:
        console_handler = logging.StreamHandler(sys.stderr)
        console_handler.setLevel(root_level)
        console_handler.setFormatter(console_formatter)
        handlers.append(console_handler)

    # Rotating file handler
    if config.log_to_file and config.log_file:
        log_dir = os.path.dirname(config.log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)

        file_handler = logging.handlers.RotatingFileHandler(
            filename=config.log_file,
            maxBytes=config.max_file_size_mb * 1024 * 1024,
            backupCount=config.backup_count,
            encoding="utf-8",
        )
        file_handler.setLevel(logging.DEBUG)  # capture everything to file
        file_handler.setFormatter(file_formatter)
        handlers.append(file_handler)

    # Ensure metrics log directory exists
    if config.metrics_log_file:
        metrics_dir = os.path.dirname(config.metrics_log_file)
        if metrics_dir:
            os.makedirs(metrics_dir, exist_ok=True)

    # Configure root logger
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)

    # Configure each Module 1 logger
    for logger_name in MODULE_1_LOGGERS:
        mod_logger = logging.getLogger(logger_name)
        # Remove existing handlers to avoid duplicates on re-init
        mod_logger.handlers.clear()
        mod_logger.propagate = False
        mod_logger.setLevel(
            getattr(
                logging,
                config.module_levels.get(logger_name, config.level).upper(),
                root_level,
            )
        )

        for h in handlers:
            mod_logger.addHandler(h)

    logger.debug(
        "Crawler logging configured: level=%s format=%s file=%s console=%s",
        config.level,
        config.format,
        config.log_file,
        config.log_to_console,
    )

    return config


# ======================= CrawlerLoggerAdapter ===============================

class CrawlerLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter that auto-injects crawler context into every log entry.

    Context fields (appear in structured/json output):
    - global_step: current training/crawl step
    - current_domain: domain being crawled
    - episode_id: current episode identifier

    Usage:
        base_logger = logging.getLogger("crawler_pipeline")
        log = CrawlerLoggerAdapter(base_logger, global_step=0)
        log.info("Starting crawl")  # -> includes step:0 in output

        # Update context mid-run
        log = log.with_context(current_domain="example.com", global_step=42)
        log.info("Fetched page")  # -> includes step:42, domain=example.com
    """

    def __init__(
        self,
        logger: logging.Logger,
        *,
        global_step: int = 0,
        current_domain: Optional[str] = None,
        episode_id: Optional[str] = None,
        **extra: Any,
    ) -> None:
        context: Dict[str, Any] = {
            "global_step": global_step,
            "current_domain": current_domain,
            "episode_id": episode_id,
        }
        context.update(extra)
        super().__init__(logger, context)

    def process(
        self, msg: str, kwargs: Dict[str, Any]
    ) -> tuple:
        """Inject context fields into the log record's extra dict."""
        extra = kwargs.get("extra", {})
        # Merge adapter context (do not overwrite caller-supplied extras)
        for k, v in self.extra.items():
            if v is not None:
                extra.setdefault(k, v)
        kwargs["extra"] = extra
        return msg, kwargs

    def with_context(self, **kwargs: Any) -> "CrawlerLoggerAdapter":
        """Return a new adapter with merged context.

        Existing context is preserved; kwargs override on conflict.
        """
        merged = {**self.extra, **kwargs}
        return CrawlerLoggerAdapter(
            self.logger,
            global_step=merged.get("global_step", 0),
            current_domain=merged.get("current_domain"),
            episode_id=merged.get("episode_id"),
            **{
                k: v
                for k, v in merged.items()
                if k not in ("global_step", "current_domain", "episode_id")
            },
        )


# ======================= MetricsLogger ======================================

class MetricsLogger:
    """Buffered JSON Lines writer for machine-parseable crawler metrics.

    Each line in the output file is a JSON object:
        {"timestamp": "...", "step": 42, "metric": "loss", "value": 0.123, "tags": {...}}

    Buffered: flushes every ``flush_interval`` entries or ``flush_seconds`` seconds.

    Usage:
        ml = MetricsLogger("scrapus_data/logs/metrics.jsonl")
        ml.log_metric("loss", 0.123, tags={"phase": "train"})
        ml.log_metrics({"reward": 0.5, "epsilon": 0.1})
        ml.flush()  # ensure all buffered entries are written
        ml.close()
    """

    def __init__(
        self,
        path: str,
        flush_interval: int = 100,
        flush_seconds: float = 10.0,
    ) -> None:
        self._path = path
        self._flush_interval = flush_interval
        self._flush_seconds = flush_seconds
        self._buffer: List[Dict[str, Any]] = []
        self._lock = threading.Lock()
        self._last_flush: float = time.monotonic()
        self._step: int = 0
        self._closed = False

        # Ensure parent directory exists
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)

    @property
    def step(self) -> int:
        return self._step

    @step.setter
    def step(self, value: int) -> None:
        self._step = value

    def log_metric(
        self,
        name: str,
        value: float,
        tags: Optional[Dict[str, Any]] = None,
        step: Optional[int] = None,
    ) -> None:
        """Log a single metric entry."""
        entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "step": step if step is not None else self._step,
            "metric": name,
            "value": value,
            "tags": tags or {},
        }
        with self._lock:
            self._buffer.append(entry)
            self._maybe_flush()

    def log_metrics(
        self,
        metrics_dict: Dict[str, float],
        tags: Optional[Dict[str, Any]] = None,
        step: Optional[int] = None,
    ) -> None:
        """Log multiple metrics in a single batch."""
        ts = datetime.now(timezone.utc).isoformat()
        resolved_step = step if step is not None else self._step
        resolved_tags = tags or {}

        with self._lock:
            for name, value in metrics_dict.items():
                self._buffer.append({
                    "timestamp": ts,
                    "step": resolved_step,
                    "metric": name,
                    "value": value,
                    "tags": resolved_tags,
                })
            self._maybe_flush()

    def _maybe_flush(self) -> None:
        """Flush if buffer is full or enough time has elapsed.

        Caller must hold self._lock.
        """
        now = time.monotonic()
        should_flush = (
            len(self._buffer) >= self._flush_interval
            or (now - self._last_flush) >= self._flush_seconds
        )
        if should_flush:
            self._flush_locked()

    def _flush_locked(self) -> None:
        """Write buffered entries to disk. Caller must hold self._lock."""
        if not self._buffer:
            return
        try:
            with open(self._path, "a", encoding="utf-8") as f:
                for entry in self._buffer:
                    f.write(json.dumps(entry, default=str, ensure_ascii=False))
                    f.write("\n")
            self._buffer.clear()
            self._last_flush = time.monotonic()
        except OSError as exc:
            # Log to stderr directly to avoid circular dependency
            print(
                f"[MetricsLogger] Failed to write metrics: {exc}",
                file=sys.stderr,
            )

    def flush(self) -> None:
        """Force flush all buffered entries to disk."""
        with self._lock:
            self._flush_locked()

    def close(self) -> None:
        """Flush and mark as closed."""
        self.flush()
        self._closed = True


# ======================= PerformanceTimer ===================================

class PerformanceTimer:
    """Context manager that measures operation duration and logs it.

    Tracks cumulative p50/p95/p99 latencies per operation name via a
    shared class-level registry.

    Usage:
        with PerformanceTimer("fetch_page") as t:
            await fetch(url)
        # t.elapsed_ms available after exit

        # Query percentiles:
        stats = PerformanceTimer.get_stats("fetch_page")
        # -> {"count": 100, "p50_ms": 45.2, "p95_ms": 120.1, "p99_ms": 250.3}
    """

    # Class-level registry: operation_name -> list of elapsed_ms values
    _registry: Dict[str, List[float]] = defaultdict(list)
    _registry_lock = threading.Lock()

    # Optional metrics logger for auto-logging durations
    _metrics_logger: Optional[MetricsLogger] = None

    def __init__(
        self,
        operation: str,
        logger: Optional[logging.Logger] = None,
        metrics_logger: Optional[MetricsLogger] = None,
    ) -> None:
        self.operation = operation
        self._logger = logger
        self._metrics = metrics_logger or self.__class__._metrics_logger
        self._start: float = 0.0
        self.elapsed_ms: float = 0.0

    def __enter__(self) -> "PerformanceTimer":
        self._start = time.monotonic()
        return self

    def __exit__(self, *exc: Any) -> None:
        self.elapsed_ms = round((time.monotonic() - self._start) * 1000, 3)

        # Store in registry for percentile tracking
        with self._registry_lock:
            self._registry[self.operation].append(self.elapsed_ms)

        # Log to logger
        if self._logger:
            self._logger.debug(
                "Timer '%s' completed in %.2f ms",
                self.operation,
                self.elapsed_ms,
            )

        # Log to metrics file
        if self._metrics:
            self._metrics.log_metric(
                f"timer.{self.operation}",
                self.elapsed_ms,
                tags={"unit": "ms"},
            )

    @classmethod
    def set_metrics_logger(cls, metrics_logger: MetricsLogger) -> None:
        """Set a default MetricsLogger for all PerformanceTimer instances."""
        cls._metrics_logger = metrics_logger

    @classmethod
    def get_stats(cls, operation: str) -> Dict[str, Any]:
        """Compute latency percentiles for a named operation.

        Returns:
            Dict with count, p50_ms, p95_ms, p99_ms, mean_ms, min_ms, max_ms.
            Empty dict if no samples recorded.
        """
        with cls._registry_lock:
            samples = cls._registry.get(operation)
            if not samples:
                return {}
            # Work on a copy to release the lock quickly
            data = list(samples)

        data.sort()
        n = len(data)
        return {
            "count": n,
            "p50_ms": round(data[int(n * 0.50)], 3),
            "p95_ms": round(data[int(min(n * 0.95, n - 1))], 3),
            "p99_ms": round(data[int(min(n * 0.99, n - 1))], 3),
            "mean_ms": round(sum(data) / n, 3),
            "min_ms": round(data[0], 3),
            "max_ms": round(data[-1], 3),
        }

    @classmethod
    def get_all_stats(cls) -> Dict[str, Dict[str, Any]]:
        """Compute latency percentiles for all tracked operations."""
        with cls._registry_lock:
            ops = list(cls._registry.keys())
        return {op: cls.get_stats(op) for op in ops}

    @classmethod
    def reset(cls, operation: Optional[str] = None) -> None:
        """Clear recorded samples. If operation is None, clear all."""
        with cls._registry_lock:
            if operation is None:
                cls._registry.clear()
            else:
                cls._registry.pop(operation, None)


# ======================= Convenience Helpers ================================

def get_crawler_logger(
    name: str,
    *,
    global_step: int = 0,
    current_domain: Optional[str] = None,
    episode_id: Optional[str] = None,
) -> CrawlerLoggerAdapter:
    """Create a CrawlerLoggerAdapter for a Module 1 component.

    Usage:
        log = get_crawler_logger("crawler_pipeline", global_step=0)
        log.info("Pipeline starting")
    """
    base = logging.getLogger(name)
    return CrawlerLoggerAdapter(
        base,
        global_step=global_step,
        current_domain=current_domain,
        episode_id=episode_id,
    )


def create_metrics_logger(config: Optional[LogConfig] = None) -> Optional[MetricsLogger]:
    """Create a MetricsLogger from LogConfig if metrics_log_file is set.

    Also registers it as the default for PerformanceTimer.
    """
    config = config or LogConfig()
    if not config.metrics_log_file:
        return None

    ml = MetricsLogger(config.metrics_log_file)
    PerformanceTimer.set_metrics_logger(ml)
    return ml


@contextmanager
def timed_operation(
    operation: str,
    logger: Optional[logging.Logger] = None,
    metrics_logger: Optional[MetricsLogger] = None,
):
    """Convenience context manager wrapping PerformanceTimer.

    Usage:
        with timed_operation("embed_batch", logger=my_logger):
            embed(batch)
    """
    timer = PerformanceTimer(operation, logger=logger, metrics_logger=metrics_logger)
    with timer:
        yield timer


# ======================= Module-level __all__ ===============================

__all__ = [
    # Config
    "LogConfig",
    "setup_logging",
    # Adapter
    "CrawlerLoggerAdapter",
    "get_crawler_logger",
    # Metrics
    "MetricsLogger",
    "create_metrics_logger",
    # Performance
    "PerformanceTimer",
    "timed_operation",
    # Constants
    "MODULE_1_LOGGERS",
]

# logging_config.py
"""
Structured logging framework for Scrapus M1 16GB local deployment.

Provides:
1. JSON structured logging via Python stdlib (zero external deps)
2. Custom JSON formatter: timestamp, level, stage, module, message, extra fields
3. Per-stage log context (auto-tags entries with current pipeline stage)
4. Rotating file handler: max 50 MB per file, 5 backups
5. Console handler with human-readable coloured format
6. Separate error log file (WARNING+ only)
7. Memory usage injection: auto-add RSS/swap to every log entry
8. Performance metrics injection: auto-add latency for logged operations
9. Correlation IDs: track a single item (page/entity/lead) across all stages
10. Log sampling: for high-throughput stages, log every Nth event at DEBUG level
11. M1-specific: log Metal cache state, MPS memory, MLX allocations

Thread-safe, zero external dependencies (only Python stdlib + psutil).
"""

from __future__ import annotations

import json
import logging
import logging.handlers
import os
import sys
import threading
import time
import traceback as tb_module
import uuid
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple


# ============================================================================
# Constants
# ============================================================================

DEFAULT_LOG_DIR = Path.home() / "scrapus_data" / "logs"
MAX_BYTES_PER_FILE = 50 * 1024 * 1024  # 50 MB
BACKUP_COUNT = 5

# Pipeline stage names (canonical)
PIPELINE_STAGES = (
    "crawl",
    "ner_extraction",
    "entity_resolution",
    "lead_matching",
    "report_generation",
    "evaluation",
)

# ANSI colour codes for console output
_COLOURS = {
    "DEBUG": "\033[36m",     # cyan
    "INFO": "\033[32m",      # green
    "WARNING": "\033[33m",   # yellow
    "ERROR": "\033[31m",     # red
    "CRITICAL": "\033[35m",  # magenta
    "RESET": "\033[0m",
    "DIM": "\033[2m",
    "BOLD": "\033[1m",
}


# ============================================================================
# Thread-local context
# ============================================================================

_context = threading.local()


def _get_context() -> Dict[str, Any]:
    """Return the current thread-local log context dict."""
    if not hasattr(_context, "stack"):
        _context.stack = [{}]
    return _context.stack[-1]


def _push_context(ctx: Dict[str, Any]) -> None:
    if not hasattr(_context, "stack"):
        _context.stack = [{}]
    merged = {**_context.stack[-1], **ctx}
    _context.stack.append(merged)


def _pop_context() -> None:
    if hasattr(_context, "stack") and len(_context.stack) > 1:
        _context.stack.pop()


# ============================================================================
# Data classes
# ============================================================================

@dataclass(frozen=True)
class MemoryReading:
    """Lightweight memory snapshot attached to log entries."""
    rss_mb: float
    vms_mb: float
    swap_used_mb: float
    available_mb: float

    def to_dict(self) -> Dict[str, float]:
        return asdict(self)


@dataclass
class SamplingConfig:
    """Controls DEBUG-level log sampling for high-throughput stages."""
    stage: str
    sample_rate: int = 100  # log every Nth event
    _counter: int = field(default=0, repr=False)

    def should_log(self) -> bool:
        self._counter += 1
        if self._counter >= self.sample_rate:
            self._counter = 0
            return True
        return False


@dataclass
class CorrelationContext:
    """Tracks a single item across pipeline stages."""
    correlation_id: str
    item_type: str  # page, entity, lead, report
    item_id: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    stages_visited: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "correlation_id": self.correlation_id,
            "item_type": self.item_type,
            "item_id": self.item_id,
            "created_at": self.created_at,
            "stages_visited": self.stages_visited,
        }


# ============================================================================
# Memory reader (psutil-based, graceful fallback)
# ============================================================================

class _MemoryReader:
    """
    Reads process memory metrics.  Uses psutil when available, falls back to
    /proc/self/status on Linux, and returns zeroes on unsupported platforms.
    """

    def __init__(self) -> None:
        self._psutil: Any = None
        self._process: Any = None
        try:
            import psutil  # type: ignore[import-untyped]
            self._psutil = psutil
            self._process = psutil.Process(os.getpid())
        except ImportError:
            pass

    def read(self) -> MemoryReading:
        if self._process is not None:
            try:
                mem = self._process.memory_info()
                swap = self._psutil.swap_memory()
                vm = self._psutil.virtual_memory()
                return MemoryReading(
                    rss_mb=round(mem.rss / (1024 * 1024), 2),
                    vms_mb=round(mem.vms / (1024 * 1024), 2),
                    swap_used_mb=round(swap.used / (1024 * 1024), 2),
                    available_mb=round(vm.available / (1024 * 1024), 2),
                )
            except Exception:
                pass
        return MemoryReading(0.0, 0.0, 0.0, 0.0)


_memory_reader = _MemoryReader()


# ============================================================================
# M1-specific telemetry
# ============================================================================

class M1Telemetry:
    """Collect Apple M1 GPU / Metal / MLX telemetry for log entries."""

    @staticmethod
    def read() -> Dict[str, Any]:
        info: Dict[str, Any] = {}
        # MLX Metal cache state
        try:
            import mlx.core as mx  # type: ignore[import-untyped]
            info["mlx_metal_active_mb"] = round(
                mx.metal.get_active_memory() / (1024 * 1024), 2
            )
            info["mlx_metal_peak_mb"] = round(
                mx.metal.get_peak_memory() / (1024 * 1024), 2
            )
            info["mlx_metal_cache_mb"] = round(
                mx.metal.get_cache_memory() / (1024 * 1024), 2
            )
        except Exception:
            pass

        # PyTorch MPS memory
        try:
            import torch  # type: ignore[import-untyped]
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                info["mps_allocated_mb"] = round(
                    torch.mps.current_allocated_memory() / (1024 * 1024), 2
                )
                info["mps_driver_mb"] = round(
                    torch.mps.driver_allocated_memory() / (1024 * 1024), 2
                )
        except Exception:
            pass

        return info


# ============================================================================
# JSON formatter
# ============================================================================

class ScrapusJSONFormatter(logging.Formatter):
    """
    Produces a single JSON object per log record.

    Fields:
        timestamp, level, logger, module, funcName, lineno, message,
        stage, correlation_id, memory, m1, latency_ms, extra
    """

    def __init__(
        self,
        include_memory: bool = True,
        include_m1: bool = False,
        include_traceback: bool = True,
    ) -> None:
        super().__init__()
        self._include_memory = include_memory
        self._include_m1 = include_m1
        self._include_traceback = include_traceback

    def format(self, record: logging.LogRecord) -> str:
        ctx = _get_context()

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

        # Stage context
        if "stage" in ctx:
            entry["stage"] = ctx["stage"]

        # Correlation context
        if "correlation_id" in ctx:
            entry["correlation_id"] = ctx["correlation_id"]
        if "item_type" in ctx:
            entry["item_type"] = ctx["item_type"]
        if "item_id" in ctx:
            entry["item_id"] = ctx["item_id"]

        # Latency (set by OperationTimer)
        if hasattr(record, "latency_ms"):
            entry["latency_ms"] = record.latency_ms
        if "latency_ms" in ctx:
            entry["latency_ms"] = ctx["latency_ms"]

        # Memory snapshot
        if self._include_memory:
            entry["memory"] = _memory_reader.read().to_dict()

        # M1 telemetry
        if self._include_m1:
            m1_info = M1Telemetry.read()
            if m1_info:
                entry["m1"] = m1_info

        # Extra fields from record.__dict__ (user-supplied via `extra={}`)
        _STANDARD = {
            "name", "msg", "args", "created", "relativeCreated",
            "exc_info", "exc_text", "stack_info", "lineno", "funcName",
            "levelno", "levelname", "pathname", "filename", "module",
            "thread", "threadName", "process", "processName",
            "msecs", "message", "taskName",
        }
        extras = {
            k: v for k, v in record.__dict__.items()
            if k not in _STANDARD and not k.startswith("_")
        }
        if extras:
            entry["extra"] = extras

        # Merge remaining thread-local context
        _skip = {"stage", "correlation_id", "item_type", "item_id", "latency_ms"}
        remaining_ctx = {k: v for k, v in ctx.items() if k not in _skip}
        if remaining_ctx:
            entry.setdefault("extra", {}).update(remaining_ctx)

        # Exception info
        if record.exc_info and self._include_traceback:
            sio = StringIO()
            tb_module.print_exception(*record.exc_info, file=sio)
            entry["exception"] = sio.getvalue().strip()

        return json.dumps(entry, default=str, ensure_ascii=False)


# ============================================================================
# Console formatter (human-readable)
# ============================================================================

class ScrapusConsoleFormatter(logging.Formatter):
    """
    Human-readable console output with optional ANSI colours.

    Format:
        [2024-01-15 12:34:56] INFO  [crawl] memory_manager :: Loaded model gliner2  (RSS: 1234 MB)
    """

    def __init__(self, use_colour: bool = True) -> None:
        super().__init__()
        self._colour = use_colour and sys.stderr.isatty()

    def format(self, record: logging.LogRecord) -> str:
        ctx = _get_context()
        ts = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S")

        level = record.levelname.ljust(8)
        stage = ctx.get("stage", "-")
        name = record.name
        msg = record.getMessage()

        mem = _memory_reader.read()
        mem_tag = f"RSS:{mem.rss_mb:.0f}MB"

        if self._colour:
            c = _COLOURS.get(record.levelname, "")
            r = _COLOURS["RESET"]
            d = _COLOURS["DIM"]
            line = (
                f"{d}[{ts}]{r} {c}{level}{r} "
                f"{d}[{stage}]{r} {name} :: {msg}  {d}({mem_tag}){r}"
            )
        else:
            line = f"[{ts}] {level} [{stage}] {name} :: {msg}  ({mem_tag})"

        if record.exc_info:
            sio = StringIO()
            tb_module.print_exception(*record.exc_info, file=sio)
            line += "\n" + sio.getvalue().rstrip()

        return line


# ============================================================================
# Sampling filter
# ============================================================================

class SamplingFilter(logging.Filter):
    """
    For high-throughput stages, only pass every Nth DEBUG-level record.
    INFO and above always pass.
    """

    def __init__(self) -> None:
        super().__init__()
        self._lock = threading.Lock()
        self._configs: Dict[str, SamplingConfig] = {}

    def configure_stage(self, stage: str, sample_rate: int) -> None:
        with self._lock:
            self._configs[stage] = SamplingConfig(stage=stage, sample_rate=sample_rate)

    def filter(self, record: logging.LogRecord) -> bool:
        if record.levelno > logging.DEBUG:
            return True
        ctx = _get_context()
        stage = ctx.get("stage")
        if stage is None:
            return True
        with self._lock:
            cfg = self._configs.get(stage)
            if cfg is None:
                return True
            return cfg.should_log()


# ============================================================================
# Correlation ID manager
# ============================================================================

class CorrelationManager:
    """
    Create and manage correlation IDs that track items across stages.

    Usage:
        with correlation_manager.track("page", page_id):
            crawl(page)          # logs tagged with correlation_id
            extract(page)        # same correlation_id
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._active: Dict[str, CorrelationContext] = {}

    def create(self, item_type: str, item_id: str) -> CorrelationContext:
        ctx = CorrelationContext(
            correlation_id=uuid.uuid4().hex[:16],
            item_type=item_type,
            item_id=str(item_id),
        )
        with self._lock:
            self._active[ctx.correlation_id] = ctx
        return ctx

    def get(self, correlation_id: str) -> Optional[CorrelationContext]:
        with self._lock:
            return self._active.get(correlation_id)

    def close(self, correlation_id: str) -> Optional[CorrelationContext]:
        with self._lock:
            return self._active.pop(correlation_id, None)

    @contextmanager
    def track(self, item_type: str, item_id: str):
        """Context manager that pushes correlation context onto the log context."""
        ctx = self.create(item_type, str(item_id))
        _push_context({
            "correlation_id": ctx.correlation_id,
            "item_type": ctx.item_type,
            "item_id": ctx.item_id,
        })
        try:
            yield ctx
        finally:
            _pop_context()
            self.close(ctx.correlation_id)

    @property
    def active_count(self) -> int:
        with self._lock:
            return len(self._active)


# ============================================================================
# Stage context manager
# ============================================================================

@contextmanager
def log_stage(stage_name: str, **extra: Any):
    """
    Context manager that tags all log entries within the block with a stage name.

    Usage:
        with log_stage("ner_extraction"):
            logger.info("Starting NER")   # -> {"stage": "ner_extraction", ...}
    """
    _push_context({"stage": stage_name, **extra})
    try:
        yield
    finally:
        _pop_context()


# ============================================================================
# Operation timer
# ============================================================================

class OperationTimer:
    """
    Timer that injects latency_ms into the thread-local log context.

    Usage:
        with OperationTimer("ner_batch"):
            run_ner(batch)
        # All logs inside the block have latency_ms set on exit

    Or as a decorator:
        @OperationTimer.decorate("ner_batch")
        def run_ner(batch): ...
    """

    def __init__(self, operation_name: str, logger: Optional[logging.Logger] = None):
        self.operation = operation_name
        self.logger = logger
        self._start: float = 0.0
        self.elapsed_ms: float = 0.0

    def __enter__(self) -> "OperationTimer":
        self._start = time.monotonic()
        return self

    def __exit__(self, *exc: Any) -> None:
        self.elapsed_ms = round((time.monotonic() - self._start) * 1000, 3)
        _push_context({"latency_ms": self.elapsed_ms})
        if self.logger:
            self.logger.info(
                "Operation '%s' completed in %.2f ms",
                self.operation,
                self.elapsed_ms,
            )
        _pop_context()

    @staticmethod
    def decorate(
        operation_name: str,
        logger: Optional[logging.Logger] = None,
    ) -> Callable:
        """Decorator version of OperationTimer."""
        def decorator(fn: Callable) -> Callable:
            def wrapper(*args: Any, **kwargs: Any) -> Any:
                with OperationTimer(operation_name, logger):
                    return fn(*args, **kwargs)
            wrapper.__name__ = fn.__name__
            wrapper.__doc__ = fn.__doc__
            return wrapper
        return decorator


# ============================================================================
# Log configuration builder
# ============================================================================

class LoggingConfig:
    """
    Central configuration object.  Call ``LoggingConfig.setup()`` once at
    pipeline start.

    Creates:
        - Rotating JSON file handler  (scrapus.jsonl)
        - Rotating error file handler (scrapus_errors.jsonl)
        - Console handler (human-readable)
        - Sampling filter (configurable per stage)
        - Correlation manager (singleton)

    All downstream modules that call ``logging.getLogger(__name__)`` will
    automatically inherit this configuration.
    """

    _instance: Optional["LoggingConfig"] = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        self.log_dir: Path = DEFAULT_LOG_DIR
        self.console_level: int = logging.INFO
        self.file_level: int = logging.DEBUG
        self.include_memory: bool = True
        self.include_m1: bool = True
        self.sampling_filter: SamplingFilter = SamplingFilter()
        self.correlation_manager: CorrelationManager = CorrelationManager()
        self._configured: bool = False

    # ---- singleton --------------------------------------------------------

    @classmethod
    def instance(cls) -> "LoggingConfig":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    # ---- public setup -----------------------------------------------------

    @classmethod
    def setup(
        cls,
        log_dir: Optional[Path] = None,
        console_level: int = logging.INFO,
        file_level: int = logging.DEBUG,
        include_memory: bool = True,
        include_m1: bool = True,
        sampling_rates: Optional[Dict[str, int]] = None,
    ) -> "LoggingConfig":
        """
        Configure the global Scrapus logging layer.  Idempotent.

        Args:
            log_dir: Directory for log files (created if absent).
            console_level: Minimum level for console handler.
            file_level: Minimum level for JSON file handler.
            include_memory: Inject RSS/swap into every JSON log entry.
            include_m1: Inject MLX/MPS telemetry into JSON log entries.
            sampling_rates: Map of stage name -> N (log every Nth DEBUG event).

        Returns:
            The singleton LoggingConfig instance.
        """
        inst = cls.instance()
        if inst._configured:
            return inst

        inst.log_dir = log_dir or DEFAULT_LOG_DIR
        inst.console_level = console_level
        inst.file_level = file_level
        inst.include_memory = include_memory
        inst.include_m1 = include_m1

        # Ensure log directory
        inst.log_dir.mkdir(parents=True, exist_ok=True)

        # Configure sampling
        default_sampling: Dict[str, int] = {
            "crawl": 50,           # log every 50th page at DEBUG
            "ner_extraction": 20,  # log every 20th entity at DEBUG
            "entity_resolution": 10,
            "lead_matching": 100,
        }
        for stage, rate in (sampling_rates or default_sampling).items():
            inst.sampling_filter.configure_stage(stage, rate)

        # Build handlers
        root = logging.getLogger()
        root.setLevel(logging.DEBUG)

        # Remove any pre-existing handlers on the root logger to avoid
        # duplicates when setup() is called in tests or re-imported.
        root.handlers.clear()

        # 1. Rotating JSON file handler (all levels)
        json_handler = logging.handlers.RotatingFileHandler(
            filename=str(inst.log_dir / "scrapus.jsonl"),
            maxBytes=MAX_BYTES_PER_FILE,
            backupCount=BACKUP_COUNT,
            encoding="utf-8",
        )
        json_handler.setLevel(file_level)
        json_handler.setFormatter(
            ScrapusJSONFormatter(
                include_memory=include_memory,
                include_m1=include_m1,
            )
        )
        json_handler.addFilter(inst.sampling_filter)

        # 2. Rotating error JSON file handler (WARNING+)
        error_handler = logging.handlers.RotatingFileHandler(
            filename=str(inst.log_dir / "scrapus_errors.jsonl"),
            maxBytes=MAX_BYTES_PER_FILE,
            backupCount=BACKUP_COUNT,
            encoding="utf-8",
        )
        error_handler.setLevel(logging.WARNING)
        error_handler.setFormatter(
            ScrapusJSONFormatter(
                include_memory=include_memory,
                include_m1=include_m1,
                include_traceback=True,
            )
        )

        # 3. Console handler (human-readable)
        console_handler = logging.StreamHandler(sys.stderr)
        console_handler.setLevel(console_level)
        console_handler.setFormatter(ScrapusConsoleFormatter())
        console_handler.addFilter(inst.sampling_filter)

        root.addHandler(json_handler)
        root.addHandler(error_handler)
        root.addHandler(console_handler)

        inst._configured = True
        logging.getLogger("scrapus").info(
            "Logging configured: dir=%s console=%s file=%s memory=%s m1=%s",
            inst.log_dir,
            logging.getLevelName(console_level),
            logging.getLevelName(file_level),
            include_memory,
            include_m1,
        )
        return inst

    # ---- convenience accessors -------------------------------------------

    @classmethod
    def get_correlation_manager(cls) -> CorrelationManager:
        return cls.instance().correlation_manager

    @classmethod
    def get_sampling_filter(cls) -> SamplingFilter:
        return cls.instance().sampling_filter

    # ---- teardown --------------------------------------------------------

    @classmethod
    def teardown(cls) -> None:
        """Flush and close all handlers.  Resets the singleton."""
        root = logging.getLogger()
        for h in root.handlers[:]:
            try:
                h.flush()
                h.close()
            except Exception:
                pass
            root.removeHandler(h)
        with cls._lock:
            if cls._instance is not None:
                cls._instance._configured = False
                cls._instance = None


# ============================================================================
# Convenience helpers (module-level)
# ============================================================================

def get_logger(name: str) -> logging.Logger:
    """
    Return a logger that inherits Scrapus configuration.

    Equivalent to ``logging.getLogger(name)`` but guarantees setup has run.
    """
    if not LoggingConfig.instance()._configured:
        LoggingConfig.setup()
    return logging.getLogger(name)


def log_with_context(
    logger: logging.Logger,
    level: int,
    message: str,
    *,
    stage: Optional[str] = None,
    correlation_id: Optional[str] = None,
    item_type: Optional[str] = None,
    item_id: Optional[str] = None,
    latency_ms: Optional[float] = None,
    **extra: Any,
) -> None:
    """
    Emit a single log entry with explicit context fields, without using a
    context manager.  Useful for one-off events.
    """
    ctx: Dict[str, Any] = {}
    if stage:
        ctx["stage"] = stage
    if correlation_id:
        ctx["correlation_id"] = correlation_id
    if item_type:
        ctx["item_type"] = item_type
    if item_id:
        ctx["item_id"] = item_id
    if latency_ms is not None:
        ctx["latency_ms"] = latency_ms
    if extra:
        ctx.update(extra)

    _push_context(ctx)
    try:
        logger.log(level, message)
    finally:
        _pop_context()


# ============================================================================
# Structured event helpers
# ============================================================================

def log_stage_boundary(
    logger: logging.Logger,
    stage: str,
    event: str,
    *,
    items_total: int = 0,
    memory: Optional[MemoryReading] = None,
    duration_ms: Optional[float] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Log a structured stage boundary event (start/end).

    Produces a JSON entry with well-known fields that the monitoring dashboard
    can query directly.
    """
    mem = memory or _memory_reader.read()
    ctx: Dict[str, Any] = {
        "stage": stage,
        "boundary_event": event,
        "items_total": items_total,
    }
    if duration_ms is not None:
        ctx["latency_ms"] = duration_ms
    if metadata:
        ctx.update(metadata)
    ctx["memory_snapshot"] = mem.to_dict()

    _push_context(ctx)
    try:
        logger.info("Stage %s: %s", stage, event)
    finally:
        _pop_context()


def log_model_lifecycle(
    logger: logging.Logger,
    model_name: str,
    event: str,
    *,
    size_mb: float = 0.0,
    load_time_ms: float = 0.0,
    stage: Optional[str] = None,
) -> None:
    """Log model load/unload events."""
    ctx: Dict[str, Any] = {
        "model_name": model_name,
        "model_event": event,
        "model_size_mb": size_mb,
        "model_load_time_ms": load_time_ms,
    }
    if stage:
        ctx["stage"] = stage

    _push_context(ctx)
    try:
        logger.info("Model %s: %s (%.1f MB, %.1f ms)", model_name, event, size_mb, load_time_ms)
    finally:
        _pop_context()


def log_error_event(
    logger: logging.Logger,
    error: Exception,
    *,
    stage: Optional[str] = None,
    item_id: Optional[str] = None,
    recovery: Optional[str] = None,
) -> None:
    """Log a structured error with recovery strategy."""
    ctx: Dict[str, Any] = {
        "error_type": type(error).__name__,
        "error_message": str(error),
    }
    if stage:
        ctx["stage"] = stage
    if item_id:
        ctx["item_id"] = item_id
    if recovery:
        ctx["recovery_strategy"] = recovery

    _push_context(ctx)
    try:
        logger.error("Error in %s: %s", stage or "unknown", error, exc_info=True)
    finally:
        _pop_context()


# ============================================================================
# Pipeline run context
# ============================================================================

@contextmanager
def pipeline_run(run_id: Optional[str] = None):
    """
    Top-level context manager for a full pipeline run.

    Assigns a run_id and pushes it onto the log context so that every log
    entry within the run is tagged.

    Usage:
        with pipeline_run() as run_id:
            with log_stage("crawl"):
                crawl_pages()
    """
    rid = run_id or uuid.uuid4().hex[:12]
    _push_context({"run_id": rid})
    logger = logging.getLogger("scrapus.pipeline")
    logger.info("Pipeline run started: %s", rid)
    t0 = time.monotonic()
    try:
        yield rid
    except Exception:
        logger.critical("Pipeline run %s failed", rid, exc_info=True)
        raise
    finally:
        elapsed = round((time.monotonic() - t0) * 1000, 2)
        _push_context({"latency_ms": elapsed})
        logger.info("Pipeline run %s finished in %.2f ms", rid, elapsed)
        _pop_context()
        _pop_context()


# ============================================================================
# Module-level __all__
# ============================================================================

__all__ = [
    # Core config
    "LoggingConfig",
    "get_logger",
    # Formatters
    "ScrapusJSONFormatter",
    "ScrapusConsoleFormatter",
    # Context
    "log_stage",
    "pipeline_run",
    "CorrelationManager",
    "CorrelationContext",
    "OperationTimer",
    # Structured helpers
    "log_with_context",
    "log_stage_boundary",
    "log_model_lifecycle",
    "log_error_event",
    # Data
    "MemoryReading",
    "SamplingConfig",
    "SamplingFilter",
    # M1
    "M1Telemetry",
    # Constants
    "PIPELINE_STAGES",
]

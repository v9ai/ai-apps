"""
Module 1: Memory profiling for the RL-based focused web crawler.

Provides:
1. MemoryProfilerConfig: thresholds, intervals, budget for M1 16GB
2. MemorySnapshot: point-in-time RSS/VMS/shared/mmap/GPU/object stats
3. ComponentMemoryTracker: per-component breakdown (embedder, DQN, replay, etc.)
4. MemoryProfiler: periodic snapshots, leak detection, pressure alerts
5. MemoryGuard: context manager measuring memory delta of code blocks
6. GCOptimizer: GC tuning for crawler workload (pause during DQN inference)

M1-specific:
- Unified memory tracking (CPU + GPU shared on Apple Silicon)
- MPS allocated memory via torch.mps.current_allocated_memory()
- MLX Metal active memory via mx.metal.get_active_memory()

Target: Apple M1 16GB, zero cloud dependency.
"""

import asyncio
import gc
import logging
import os
import sys
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import psutil

logger = logging.getLogger("crawler_memory_profiler")


# ======================= Optional Backend Detection ===========================

_HAS_TORCH = False
try:
    import torch

    _HAS_TORCH = True
except ImportError:
    pass

_HAS_MLX = False
try:
    import mlx.core as mx

    _HAS_MLX = True
except ImportError:
    pass


# ======================= Configuration ========================================


@dataclass
class MemoryProfilerConfig:
    """Configuration for the crawler memory profiler.

    Defaults tuned for M1 16GB running the Module 1 crawler pipeline.
    Warning at 12 GB RSS, critical at 14 GB, hard budget 16 GB.
    """

    check_interval: float = 10.0  # seconds between periodic checks
    warning_threshold_mb: int = 12_000  # 12 GB -- warn
    critical_threshold_mb: int = 14_000  # 14 GB -- critical
    log_top_n_objects: int = 10  # top N object types by count in snapshot
    track_mmap: bool = True  # include memory-mapped file tracking
    track_gpu: bool = True  # include MPS / Metal memory
    budget_mb: int = 16_000  # hard ceiling for the process


# ======================= Memory Snapshot ======================================


@dataclass
class MemorySnapshot:
    """Point-in-time memory state for the crawler process."""

    timestamp: float
    rss_mb: float  # Resident Set Size
    vms_mb: float  # Virtual Memory Size
    shared_mb: float  # Shared memory (macOS: not always available)
    mmap_mb: float  # Memory-mapped files (estimated)
    gpu_mb: float  # MPS allocated (torch) or Metal active (MLX)
    python_objects: int  # gc-tracked object count
    top_objects: List[Tuple[str, int, float]] = field(
        default_factory=list
    )  # (type_name, count, size_mb)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "rss_mb": round(self.rss_mb, 2),
            "vms_mb": round(self.vms_mb, 2),
            "shared_mb": round(self.shared_mb, 2),
            "mmap_mb": round(self.mmap_mb, 2),
            "gpu_mb": round(self.gpu_mb, 2),
            "python_objects": self.python_objects,
            "top_objects": [
                {"type": t, "count": c, "size_mb": round(s, 2)}
                for t, c, s in self.top_objects
            ],
        }


# ======================= Component Memory Tracker =============================

# Expected memory per component (MB) -- from deployment benchmarks on M1 16GB
_DEFAULT_COMPONENT_ESTIMATES: Dict[str, float] = {
    "embedder": 300.0,  # nomic-embed-text-v1.5 MLX
    "dqn_agent": 50.0,  # 3-layer MLP + ONNX runtime
    "replay_buffer": 8.0,  # mmap arrays active pages
    "frontier": 15.0,  # SQLite + Bloom filter in-memory
    "browser_pool": 600.0,  # 4 Chromium instances @ ~150 MB each
    "monitoring": 10.0,  # SQLite metrics + rolling windows
}


class ComponentMemoryTracker:
    """Track memory consumption per crawler pipeline component.

    Components correspond to Module 1 subsystems: embedder, DQN agent,
    replay buffer, URL frontier, browser pool, and monitoring.
    """

    def __init__(
        self,
        estimates: Optional[Dict[str, float]] = None,
    ) -> None:
        self._estimates = dict(estimates or _DEFAULT_COMPONENT_ESTIMATES)
        self._measured: Dict[str, float] = {}

    def snapshot_component(self, name: str) -> float:
        """Measure (or estimate) a single component's memory in MB.

        For components that expose their own size (e.g. replay buffer mmap),
        we read the actual value.  Otherwise fall back to the static estimate.
        """
        # Try actual measurement based on known component patterns
        measured = self._try_measure(name)
        if measured is not None:
            self._measured[name] = measured
            return measured

        # Fall back to static estimate
        return self._estimates.get(name, 0.0)

    def get_breakdown(self) -> Dict[str, float]:
        """Return per-component memory breakdown in MB."""
        breakdown: Dict[str, float] = {}
        for name in self._estimates:
            breakdown[name] = self.snapshot_component(name)
        return breakdown

    def update_estimate(self, name: str, mb: float) -> None:
        """Override the static estimate for a component after measurement."""
        self._estimates[name] = mb

    def register_component(self, name: str, estimate_mb: float) -> None:
        """Register a new component with an initial estimate."""
        self._estimates[name] = estimate_mb

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _try_measure(name: str) -> Optional[float]:
        """Attempt runtime measurement for known components."""
        if name == "browser_pool":
            return ComponentMemoryTracker._measure_browser_pool()
        if name == "embedder":
            return ComponentMemoryTracker._measure_gpu_model()
        return None

    @staticmethod
    def _measure_browser_pool() -> Optional[float]:
        """Sum RSS of child Chromium processes."""
        try:
            current = psutil.Process(os.getpid())
            children = current.children(recursive=True)
            chromium_mb = 0.0
            for child in children:
                try:
                    if "chromium" in child.name().lower() or "chrome" in child.name().lower():
                        chromium_mb += child.memory_info().rss / (1024 * 1024)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            return chromium_mb if chromium_mb > 0 else None
        except Exception:
            return None

    @staticmethod
    def _measure_gpu_model() -> Optional[float]:
        """Read MPS or Metal allocated memory for the embedder."""
        gpu_mb = 0.0
        if _HAS_TORCH:
            try:
                if torch.backends.mps.is_available():
                    gpu_mb += torch.mps.current_allocated_memory() / (1024 * 1024)
            except Exception:
                pass
        if _HAS_MLX:
            try:
                gpu_mb += mx.metal.get_active_memory() / (1024 * 1024)
            except (AttributeError, Exception):
                pass
        return gpu_mb if gpu_mb > 0 else None


# ======================= Memory Profiler ======================================


class MemoryProfiler:
    """Periodic memory profiling with leak detection for the crawler.

    Runs a background asyncio task that takes snapshots at a configurable
    interval.  Tracks RSS trend to detect monotonic increases (leaks).
    """

    def __init__(
        self,
        config: Optional[MemoryProfilerConfig] = None,
        component_tracker: Optional[ComponentMemoryTracker] = None,
    ) -> None:
        self._config = config or MemoryProfilerConfig()
        self._component_tracker = component_tracker or ComponentMemoryTracker()
        self._process = psutil.Process(os.getpid())
        self._snapshots: List[MemorySnapshot] = []
        self._task: Optional[asyncio.Task] = None
        self._running = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def start_profiling(self) -> None:
        """Start the background profiling loop."""
        if self._running:
            logger.warning("Profiler already running")
            return
        self._running = True
        self._task = asyncio.ensure_future(self._profiling_loop())
        logger.info(
            "Memory profiler started (interval=%.1fs, warn=%d MB, crit=%d MB)",
            self._config.check_interval,
            self._config.warning_threshold_mb,
            self._config.critical_threshold_mb,
        )

    async def stop_profiling(self) -> None:
        """Stop the background profiling loop."""
        self._running = False
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Memory profiler stopped (%d snapshots collected)", len(self._snapshots))

    def get_snapshots(self) -> List[MemorySnapshot]:
        """Return all collected snapshots."""
        return list(self._snapshots)

    def get_current(self) -> MemorySnapshot:
        """Take and return a snapshot right now."""
        snap = self._take_snapshot()
        self._snapshots.append(snap)
        return snap

    def is_memory_pressure(self) -> bool:
        """True if RSS exceeds the warning threshold."""
        rss_mb = self._process.memory_info().rss / (1024 * 1024)
        return rss_mb > self._config.warning_threshold_mb

    def get_leak_report(self) -> Optional[str]:
        """Analyse RSS history and return a report if a leak is likely.

        A leak is detected when the last 10+ snapshots show a strictly
        monotonically increasing RSS trend with a total growth exceeding
        100 MB.  Returns None if no leak is detected.
        """
        min_samples = 10
        if len(self._snapshots) < min_samples:
            return None

        recent = self._snapshots[-min_samples:]
        rss_values = [s.rss_mb for s in recent]

        # Check for monotonically increasing RSS
        is_increasing = all(
            rss_values[i + 1] >= rss_values[i] for i in range(len(rss_values) - 1)
        )
        if not is_increasing:
            return None

        growth_mb = rss_values[-1] - rss_values[0]
        if growth_mb < 100.0:
            return None

        duration_sec = recent[-1].timestamp - recent[0].timestamp
        rate_mb_per_min = (growth_mb / max(duration_sec, 1.0)) * 60.0

        return (
            f"MEMORY LEAK DETECTED: RSS grew {growth_mb:.1f} MB over "
            f"{duration_sec:.0f}s ({rate_mb_per_min:.1f} MB/min). "
            f"RSS: {rss_values[0]:.0f} -> {rss_values[-1]:.0f} MB across "
            f"{min_samples} snapshots."
        )

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _profiling_loop(self) -> None:
        """Background loop: snapshot -> check thresholds -> log."""
        while self._running:
            try:
                snap = self._take_snapshot()
                self._snapshots.append(snap)

                # Log at appropriate level
                if snap.rss_mb > self._config.critical_threshold_mb:
                    logger.critical(
                        "CRITICAL memory: RSS=%.0f MB (limit %d MB)",
                        snap.rss_mb,
                        self._config.critical_threshold_mb,
                    )
                elif snap.rss_mb > self._config.warning_threshold_mb:
                    logger.warning(
                        "High memory: RSS=%.0f MB (warn %d MB)",
                        snap.rss_mb,
                        self._config.warning_threshold_mb,
                    )
                else:
                    logger.debug(
                        "Memory OK: RSS=%.0f MB, VMS=%.0f MB, GPU=%.1f MB, objects=%d",
                        snap.rss_mb,
                        snap.vms_mb,
                        snap.gpu_mb,
                        snap.python_objects,
                    )

                # Check for leaks periodically
                leak = self.get_leak_report()
                if leak:
                    logger.warning(leak)

            except Exception as e:
                logger.error("Profiling loop error: %s", e)

            await asyncio.sleep(self._config.check_interval)

    def _take_snapshot(self) -> MemorySnapshot:
        """Collect a full memory snapshot."""
        mem = self._process.memory_info()
        rss_mb = mem.rss / (1024 * 1024)
        vms_mb = mem.vms / (1024 * 1024)

        # Shared memory -- macOS memory_info() does not expose shared directly
        shared_mb = 0.0
        try:
            # memory_full_info() may expose shared on some platforms
            full = self._process.memory_full_info()
            shared_mb = getattr(full, "shared", 0) / (1024 * 1024)
        except (psutil.AccessDenied, AttributeError, psutil.Error):
            pass

        # Memory-mapped files estimate
        mmap_mb = self._estimate_mmap() if self._config.track_mmap else 0.0

        # GPU / Metal memory
        gpu_mb = self._read_gpu_memory() if self._config.track_gpu else 0.0

        # Python object stats
        python_objects = len(gc.get_objects())
        top_objects = self._top_objects_by_type(self._config.log_top_n_objects)

        return MemorySnapshot(
            timestamp=time.monotonic(),
            rss_mb=rss_mb,
            vms_mb=vms_mb,
            shared_mb=shared_mb,
            mmap_mb=mmap_mb,
            gpu_mb=gpu_mb,
            python_objects=python_objects,
            top_objects=top_objects,
        )

    @staticmethod
    def _read_gpu_memory() -> float:
        """Read combined MPS + Metal GPU memory in MB."""
        total_mb = 0.0
        if _HAS_TORCH:
            try:
                if torch.backends.mps.is_available():
                    total_mb += torch.mps.current_allocated_memory() / (1024 * 1024)
            except Exception:
                pass
        if _HAS_MLX:
            try:
                total_mb += mx.metal.get_active_memory() / (1024 * 1024)
            except (AttributeError, Exception):
                pass
        return total_mb

    def _estimate_mmap(self) -> float:
        """Estimate memory-mapped file usage in MB via /proc or macOS fallback."""
        try:
            mmaps = self._process.memory_maps(grouped=True)
            total = sum(getattr(m, "rss", 0) for m in mmaps)
            return total / (1024 * 1024)
        except (psutil.AccessDenied, psutil.Error, AttributeError):
            # macOS often restricts memory_maps; return 0
            return 0.0

    @staticmethod
    def _top_objects_by_type(n: int) -> List[Tuple[str, int, float]]:
        """Return top-N gc-tracked object types by count with estimated size."""
        type_counts: Dict[str, int] = {}
        type_sizes: Dict[str, int] = {}

        for obj in gc.get_objects():
            type_name = type(obj).__name__
            type_counts[type_name] = type_counts.get(type_name, 0) + 1
            try:
                type_sizes[type_name] = type_sizes.get(type_name, 0) + sys.getsizeof(obj)
            except (TypeError, RecursionError):
                pass

        sorted_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:n]
        return [
            (name, count, type_sizes.get(name, 0) / (1024 * 1024))
            for name, count in sorted_types
        ]


# ======================= Memory Guard =========================================


class MemoryGuard:
    """Context manager that measures memory delta of a code block.

    Usage::

        with MemoryGuard("embedding_batch"):
            embeddings = embedder.embed_texts(batch)

    Logs the RSS delta if it exceeds ``threshold_mb`` (default 10 MB).
    """

    def __init__(
        self,
        label: str,
        threshold_mb: float = 10.0,
    ) -> None:
        self.label = label
        self.threshold_mb = threshold_mb
        self._process = psutil.Process(os.getpid())
        self._start_rss_mb: float = 0.0
        self._start_time: float = 0.0

    def __enter__(self) -> "MemoryGuard":
        self._start_rss_mb = self._process.memory_info().rss / (1024 * 1024)
        self._start_time = time.monotonic()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        end_rss_mb = self._process.memory_info().rss / (1024 * 1024)
        delta_mb = end_rss_mb - self._start_rss_mb
        elapsed = time.monotonic() - self._start_time

        if abs(delta_mb) > self.threshold_mb:
            logger.info(
                "MemoryGuard [%s]: %+.1f MB (%.0f -> %.0f MB) in %.2fs",
                self.label,
                delta_mb,
                self._start_rss_mb,
                end_rss_mb,
                elapsed,
            )

    @property
    def delta_mb(self) -> float:
        """Current delta since entering the guard (can be called mid-block)."""
        current = self._process.memory_info().rss / (1024 * 1024)
        return current - self._start_rss_mb


# ======================= GC Optimizer =========================================


class GCOptimizer:
    """Garbage collector tuning for the crawler workload.

    The Python GC uses generational collection with three generations.
    Default thresholds (700, 10, 10) cause frequent gen-0 collections that
    create latency spikes during DQN inference.

    This class:
    - Raises gen-0 threshold to reduce collection frequency
    - Provides pause/resume context managers for latency-critical sections
    - Forces full collection during idle periods
    - Tracks GC pause times for diagnostics
    """

    def __init__(self) -> None:
        self._original_thresholds: Tuple[int, int, int] = gc.get_threshold()
        self._gc_paused = False
        self._gc_was_enabled = True
        self._pause_times: List[float] = []
        self._total_collections: int = 0
        self._callbacks_installed = False

    def optimize_for_crawler(self) -> None:
        """Configure GC thresholds for crawler workload.

        Raises gen-0 threshold from 700 to 5000 to reduce collection
        frequency.  Gen-1 and gen-2 stay at 10 (standard).
        This trades ~5 MB higher baseline memory for fewer latency spikes
        during DQN inference and embedding batches.
        """
        gc.set_threshold(5000, 10, 10)
        self._install_gc_callback()
        logger.info(
            "GC optimized for crawler: thresholds %s -> (5000, 10, 10)",
            self._original_thresholds,
        )

    def restore_defaults(self) -> None:
        """Restore original GC thresholds."""
        gc.set_threshold(*self._original_thresholds)
        self._remove_gc_callback()
        logger.info("GC thresholds restored to %s", self._original_thresholds)

    @contextmanager
    def pause_gc(self):
        """Temporarily disable GC for latency-sensitive operations.

        Usage::

            with gc_optimizer.pause_gc():
                action = dqn_agent.select_action(state)  # 0.3ms target
        """
        was_enabled = gc.isenabled()
        gc.disable()
        self._gc_paused = True
        start = time.monotonic()
        try:
            yield
        finally:
            elapsed = time.monotonic() - start
            self._gc_paused = False
            if was_enabled:
                gc.enable()
            logger.debug("GC paused for %.3fs", elapsed)

    @contextmanager
    def resume_gc(self):
        """Force a full GC collection during idle periods.

        Usage::

            with gc_optimizer.resume_gc():
                await rate_limiter.wait()  # idle time -- collect now
        """
        start = time.monotonic()
        try:
            yield
        finally:
            collected = gc.collect()
            elapsed = time.monotonic() - start
            self._total_collections += 1
            self._pause_times.append(elapsed)
            logger.debug(
                "GC forced collection: %d objects freed in %.3fs",
                collected,
                elapsed,
            )

    def force_collect(self) -> int:
        """Run a full GC collection immediately. Returns objects freed."""
        start = time.monotonic()
        collected = gc.collect()
        elapsed = time.monotonic() - start
        self._total_collections += 1
        self._pause_times.append(elapsed)
        logger.debug("GC force_collect: %d freed in %.3fs", collected, elapsed)
        return collected

    def get_gc_stats(self) -> Dict[str, Any]:
        """Return GC diagnostics summary."""
        gc_stats = gc.get_stats()
        return {
            "thresholds": gc.get_threshold(),
            "gc_enabled": gc.isenabled(),
            "gc_paused": self._gc_paused,
            "total_forced_collections": self._total_collections,
            "avg_pause_ms": (
                (sum(self._pause_times) / len(self._pause_times) * 1000)
                if self._pause_times
                else 0.0
            ),
            "max_pause_ms": (
                max(self._pause_times) * 1000 if self._pause_times else 0.0
            ),
            "generation_stats": [
                {"collections": s.get("collections", 0), "collected": s.get("collected", 0)}
                for s in gc_stats
            ],
        }

    # ------------------------------------------------------------------
    # GC callback for tracking pause times
    # ------------------------------------------------------------------

    def _install_gc_callback(self) -> None:
        """Install a GC callback to measure collection durations."""
        if self._callbacks_installed:
            return
        self._gc_start_time: float = 0.0
        gc.callbacks.append(self._gc_callback)
        self._callbacks_installed = True

    def _remove_gc_callback(self) -> None:
        """Remove the GC callback."""
        if not self._callbacks_installed:
            return
        try:
            gc.callbacks.remove(self._gc_callback)
        except ValueError:
            pass
        self._callbacks_installed = False

    def _gc_callback(self, phase: str, info: Dict[str, Any]) -> None:
        """Callback invoked by the GC before/after each collection."""
        if phase == "start":
            self._gc_start_time = time.monotonic()
        elif phase == "stop":
            elapsed = time.monotonic() - self._gc_start_time
            self._pause_times.append(elapsed)
            self._total_collections += 1
            if elapsed > 0.010:  # log if GC pause > 10 ms
                logger.warning(
                    "GC pause %.1fms (gen %d, collected %d)",
                    elapsed * 1000,
                    info.get("generation", -1),
                    info.get("collected", 0),
                )

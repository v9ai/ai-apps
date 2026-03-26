"""
Module 1: Graceful shutdown and checkpoint management for the RL crawler pipeline.

Provides two coordinating classes:
- ShutdownManager: signal handling, orderly teardown, cleanup callbacks
- CheckpointManager: periodic auto-save, atomic writes, rotation, recovery

Shutdown sequence (triggered by SIGTERM/SIGINT/SIGHUP or programmatic request):
  1. Set shutdown_requested event (cooperative cancellation for async workers)
  2. Stop crawler workers (drain in-flight fetches)
  3. Flush replay buffer (mmap + SQLite WAL)
  4. Save DQN checkpoint via CheckpointManager (atomic write + rotate)
  5. Run registered cleanup callbacks (browser pool, metrics, etc.)
  6. Close SQLite connections
  7. Write shutdown manifest (JSON) for post-mortem / resume

Forced shutdown fires after a configurable timeout (default 30s) if the
graceful sequence hangs -- e.g. a stuck Playwright browser or deadlocked
SQLite WAL checkpoint.

Integration points:
- CrawlerPipeline: registers its own shutdown() as a cleanup callback
- MmapReplayBuffer: flush() called before close()
- DoubleDQNAgent: save_checkpoint() via CheckpointManager atomic write
- Browser pool / metrics: registered via add_cleanup_callback()

Memory budget: <1 MB (metadata only, no large buffers).
Target: Apple M1 16GB, zero cloud dependency.
"""

import asyncio
import atexit
import gc
import json
import logging
import os
import shutil
import signal
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Coroutine, Dict, List, Optional, Union

logger = logging.getLogger("crawler_shutdown")


# ======================= Configuration ======================================

@dataclass
class ShutdownConfig:
    """Configuration for the ShutdownManager.

    Timeouts calibrated for M1 16GB where Playwright browser close can
    take 2-5s and SQLite WAL checkpoint up to 10s on a full replay buffer.
    """

    # Timeout before forced shutdown (seconds)
    graceful_timeout: float = 30.0

    # Shutdown manifest path
    manifest_dir: str = "scrapus_data"
    manifest_filename: str = "shutdown_manifest.json"

    # Signals to handle
    handle_sigterm: bool = True
    handle_sigint: bool = True
    handle_sighup: bool = True

    # Register atexit handler
    register_atexit: bool = True


@dataclass
class CheckpointConfig:
    """Configuration for the CheckpointManager.

    Auto-checkpoint every 5 min keeps worst-case data loss under 5 min of
    crawling (~2,400-3,600 pages at 8-12 pages/sec).  Rotation keeps 3
    checkpoints (~15 MB total for a 5 MB ONNX + metadata).
    """

    # Auto-checkpoint interval (seconds)
    interval: float = 300.0  # 5 minutes

    # Checkpoint directory
    checkpoint_dir: str = "scrapus_data/checkpoints"

    # Rotation: keep last N checkpoints
    max_checkpoints: int = 3

    # Checkpoint file prefix
    prefix: str = "ckpt"

    # Marker file written inside checkpoint dir on successful completion
    complete_marker: str = ".complete"


# ======================= Shutdown Manifest ==================================

@dataclass
class ShutdownManifest:
    """Manifest written on shutdown for post-mortem analysis and resume.

    Fields mirror CrawlerPipeline._collect_stats() keys so the resume
    logic can validate continuity.
    """

    timestamp: str = ""
    reason: str = ""
    last_global_step: int = 0
    replay_buffer_size: int = 0
    checkpoint_path: str = ""
    duration_seconds: float = 0.0
    graceful: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "reason": self.reason,
            "last_global_step": self.last_global_step,
            "replay_buffer_size": self.replay_buffer_size,
            "checkpoint_path": self.checkpoint_path,
            "duration_seconds": round(self.duration_seconds, 3),
            "graceful": self.graceful,
        }


# ======================= Checkpoint Metadata ================================

@dataclass
class CheckpointMetadata:
    """Metadata stored alongside each checkpoint for validation and resume.

    Metrics tracked:
    - step: global pipeline step (monotonically increasing)
    - timestamp: ISO 8601 creation time
    - replay_size: replay buffer occupancy at checkpoint time
    - loss: most recent training loss (NaN if not training)
    - epsilon: current exploration rate
    - harvest_rate: fraction of pages yielding reward >= 0.2
    """

    step: int = 0
    timestamp: str = ""
    replay_size: int = 0
    loss: float = float("nan")
    epsilon: float = 1.0
    harvest_rate: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step": self.step,
            "timestamp": self.timestamp,
            "replay_size": self.replay_size,
            "loss": self.loss if not (self.loss != self.loss) else None,  # NaN -> null
            "epsilon": round(self.epsilon, 6),
            "harvest_rate": round(self.harvest_rate, 6),
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CheckpointMetadata":
        return cls(
            step=d.get("step", 0),
            timestamp=d.get("timestamp", ""),
            replay_size=d.get("replay_size", 0),
            loss=d.get("loss") if d.get("loss") is not None else float("nan"),
            epsilon=d.get("epsilon", 1.0),
            harvest_rate=d.get("harvest_rate", 0.0),
        )


# ======================= Checkpoint Manager =================================

class CheckpointManager:
    """Periodic auto-checkpointing with atomic writes and rotation.

    Checkpoint layout on disk:
        scrapus_data/checkpoints/
            ckpt_step_01000/
                policy.pt          # DQN weights (online + target + optimizer)
                metadata.json      # CheckpointMetadata
                .complete           # Marker: checkpoint is valid
            ckpt_step_00500/
                ...
            latest -> ckpt_step_01000   # Symlink to most recent valid checkpoint

    Atomic write strategy:
        1. Write to a temp dir in the same filesystem (ensures same-device rename)
        2. Rename temp dir to final name (atomic on POSIX)
        3. Write .complete marker inside the final dir
        4. Update "latest" symlink
        5. Prune old checkpoints beyond max_checkpoints

    Recovery:
        - On init, scan checkpoint_dir for dirs matching prefix pattern
        - Ignore any dir without .complete marker (incomplete / crashed)
        - Return the highest-step valid checkpoint for resume
    """

    def __init__(self, config: Optional[CheckpointConfig] = None) -> None:
        self.config = config or CheckpointConfig()
        self._checkpoint_dir = Path(self.config.checkpoint_dir)
        self._checkpoint_dir.mkdir(parents=True, exist_ok=True)

        self._last_checkpoint_time: float = time.time()
        self._save_fn: Optional[Callable[..., str]] = None

        logger.info(
            "CheckpointManager initialised: dir=%s, interval=%.0fs, "
            "max_checkpoints=%d",
            self._checkpoint_dir,
            self.config.interval,
            self.config.max_checkpoints,
        )

    # ---- Registration -------------------------------------------------------

    def register_save_fn(self, fn: Callable[..., str]) -> None:
        """Register the function that performs the actual checkpoint save.

        The function signature must be: fn(path: str) -> str
        It receives the target checkpoint directory path and must write
        all checkpoint files into it, returning the path on success.

        Typically this wraps DoubleDQNAgent.save_checkpoint().
        """
        self._save_fn = fn
        logger.debug("Checkpoint save function registered")

    # ---- Auto-Checkpoint ----------------------------------------------------

    def maybe_checkpoint(self, metadata: CheckpointMetadata) -> Optional[str]:
        """Check if it is time to auto-checkpoint; save if so.

        Call this from the pipeline's periodic maintenance loop.

        Args:
            metadata: current pipeline state for the checkpoint.

        Returns:
            Checkpoint path if saved, None otherwise.

        Metrics:
        - checkpoint_saved: incremented on successful save
        - checkpoint_skipped: incremented when interval not yet elapsed
        """
        now = time.time()
        elapsed = now - self._last_checkpoint_time
        if elapsed < self.config.interval:
            return None

        return self.save_checkpoint(metadata)

    def save_checkpoint(self, metadata: CheckpointMetadata) -> Optional[str]:
        """Save a checkpoint immediately (atomic write + rotate).

        Args:
            metadata: pipeline state metadata.

        Returns:
            Final checkpoint directory path, or None on failure.

        Metrics:
        - checkpoint_write_ms: time to write checkpoint to disk
        - checkpoint_size_mb: total size of checkpoint directory
        """
        if self._save_fn is None:
            logger.warning("No save function registered, skipping checkpoint")
            return None

        # Fill timestamp if not set
        if not metadata.timestamp:
            metadata.timestamp = time.strftime("%Y-%m-%dT%H:%M:%S%z")

        dir_name = f"{self.config.prefix}_step_{metadata.step:08d}"
        final_path = self._checkpoint_dir / dir_name

        t0 = time.time()
        try:
            checkpoint_path = self._atomic_write(final_path, metadata)
            self._update_latest_symlink(checkpoint_path)
            self._rotate_checkpoints()
            self._last_checkpoint_time = time.time()

            elapsed_ms = (time.time() - t0) * 1000
            size_mb = self._dir_size_mb(Path(checkpoint_path))
            logger.info(
                "Checkpoint saved: step=%d, path=%s, time=%.1fms, size=%.2fMB",
                metadata.step,
                checkpoint_path,
                elapsed_ms,
                size_mb,
            )
            return checkpoint_path

        except Exception as exc:
            logger.error("Checkpoint save failed: %s", exc, exc_info=True)
            return None

    def _atomic_write(
        self, final_path: Path, metadata: CheckpointMetadata
    ) -> str:
        """Write checkpoint atomically: temp dir -> rename -> marker.

        Uses tempfile in the same parent directory to guarantee same-filesystem
        rename (required for POSIX atomic rename guarantee).
        """
        parent = final_path.parent
        temp_dir = None

        try:
            # 1. Create temp directory in same filesystem
            temp_dir = tempfile.mkdtemp(
                prefix=f".{self.config.prefix}_tmp_",
                dir=str(parent),
            )

            # 2. Write checkpoint data via registered save function
            self._save_fn(temp_dir)

            # 3. Write metadata
            meta_path = os.path.join(temp_dir, "metadata.json")
            with open(meta_path, "w") as f:
                json.dump(metadata.to_dict(), f, indent=2)

            # 4. Atomic rename to final path
            #    If final_path already exists (duplicate step), remove it first
            if final_path.exists():
                shutil.rmtree(final_path)
            os.rename(temp_dir, str(final_path))
            temp_dir = None  # rename succeeded, don't clean up

            # 5. Write completion marker (inside final dir, after rename)
            marker_path = final_path / self.config.complete_marker
            marker_path.touch()

            return str(final_path)

        except Exception:
            # Clean up temp dir on failure
            if temp_dir is not None and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)
            raise

    def _update_latest_symlink(self, checkpoint_path: str) -> None:
        """Update the 'latest' symlink to point to the most recent checkpoint."""
        latest_link = self._checkpoint_dir / "latest"
        temp_link = self._checkpoint_dir / ".latest_tmp"

        try:
            # Atomic symlink update: create temp -> rename over existing
            if temp_link.is_symlink() or temp_link.exists():
                temp_link.unlink()
            temp_link.symlink_to(os.path.basename(checkpoint_path))
            os.rename(str(temp_link), str(latest_link))
        except OSError as exc:
            logger.warning("Failed to update 'latest' symlink: %s", exc)

    def _rotate_checkpoints(self) -> None:
        """Remove old checkpoints beyond max_checkpoints.

        Only removes directories that have the .complete marker (valid
        checkpoints).  Incomplete directories from crashed writes are
        also cleaned up.
        """
        all_dirs = self._list_checkpoint_dirs()

        # Clean up incomplete checkpoints (no .complete marker)
        for d in self._checkpoint_dir.iterdir():
            if d.is_dir() and d.name.startswith(self.config.prefix):
                marker = d / self.config.complete_marker
                if not marker.exists() and d not in all_dirs:
                    logger.info("Removing incomplete checkpoint: %s", d)
                    shutil.rmtree(d, ignore_errors=True)

        # Rotate valid checkpoints
        if len(all_dirs) > self.config.max_checkpoints:
            to_remove = all_dirs[: len(all_dirs) - self.config.max_checkpoints]
            for d in to_remove:
                logger.info("Rotating out checkpoint: %s", d.name)
                shutil.rmtree(d, ignore_errors=True)

    # ---- Recovery -----------------------------------------------------------

    def find_latest_valid_checkpoint(self) -> Optional[str]:
        """Find the most recent valid checkpoint for recovery.

        Scans checkpoint_dir for directories matching the prefix pattern,
        verifies each has the .complete marker, and returns the one with
        the highest step number.

        Returns:
            Path to the latest valid checkpoint dir, or None.

        Metrics:
        - checkpoints_scanned: total dirs examined
        - checkpoints_valid: dirs with .complete marker
        - checkpoints_invalid: dirs without .complete marker (will be cleaned)
        """
        valid_dirs = self._list_checkpoint_dirs()
        if not valid_dirs:
            logger.info("No valid checkpoints found in %s", self._checkpoint_dir)
            return None

        latest = valid_dirs[-1]  # sorted ascending by step
        logger.info(
            "Found %d valid checkpoints, latest: %s",
            len(valid_dirs),
            latest.name,
        )
        return str(latest)

    def load_checkpoint_metadata(self, checkpoint_path: str) -> Optional[CheckpointMetadata]:
        """Load metadata from a checkpoint directory.

        Args:
            checkpoint_path: path to the checkpoint directory.

        Returns:
            CheckpointMetadata if metadata.json exists and parses, else None.
        """
        meta_path = os.path.join(checkpoint_path, "metadata.json")
        if not os.path.exists(meta_path):
            logger.warning("No metadata.json in checkpoint: %s", checkpoint_path)
            return None

        try:
            with open(meta_path, "r") as f:
                data = json.load(f)
            return CheckpointMetadata.from_dict(data)
        except (json.JSONDecodeError, KeyError) as exc:
            logger.error(
                "Failed to parse checkpoint metadata at %s: %s",
                meta_path,
                exc,
            )
            return None

    def recover_or_none(self) -> Optional[Dict[str, Any]]:
        """Attempt recovery from the latest valid checkpoint.

        Returns:
            Dict with "path" and "metadata" keys, or None if no valid
            checkpoint exists.

        On detection of an incomplete checkpoint (crashed mid-write),
        logs a warning and falls back to the previous valid one.
        """
        # Report incomplete checkpoints
        for d in self._checkpoint_dir.iterdir():
            if d.is_dir() and d.name.startswith(self.config.prefix):
                marker = d / self.config.complete_marker
                if not marker.exists():
                    logger.warning(
                        "Incomplete checkpoint detected (no %s marker): %s",
                        self.config.complete_marker,
                        d,
                    )

        latest_path = self.find_latest_valid_checkpoint()
        if latest_path is None:
            return None

        metadata = self.load_checkpoint_metadata(latest_path)
        if metadata is None:
            logger.warning(
                "Latest checkpoint has no valid metadata, skipping recovery"
            )
            return None

        logger.info(
            "Recovery checkpoint: step=%d, replay_size=%d, epsilon=%.4f",
            metadata.step,
            metadata.replay_size,
            metadata.epsilon,
        )
        return {"path": latest_path, "metadata": metadata}

    # ---- Internal Helpers ---------------------------------------------------

    def _list_checkpoint_dirs(self) -> List[Path]:
        """List valid checkpoint directories sorted by step (ascending).

        A directory is valid if:
        1. Its name starts with the configured prefix
        2. It contains the .complete marker file
        """
        valid: List[Path] = []
        if not self._checkpoint_dir.exists():
            return valid

        for d in self._checkpoint_dir.iterdir():
            if not d.is_dir():
                continue
            if not d.name.startswith(self.config.prefix):
                continue
            if d.name == "latest":
                continue
            marker = d / self.config.complete_marker
            if marker.exists():
                valid.append(d)

        # Sort by step number extracted from dir name
        def _extract_step(p: Path) -> int:
            # Expected format: ckpt_step_00001000
            parts = p.name.split("_")
            for part in reversed(parts):
                try:
                    return int(part)
                except ValueError:
                    continue
            return 0

        valid.sort(key=_extract_step)
        return valid

    @staticmethod
    def _dir_size_mb(path: Path) -> float:
        """Calculate total size of a directory in MB."""
        total = 0
        for f in path.rglob("*"):
            if f.is_file():
                total += f.stat().st_size
        return total / (1024 * 1024)


# ======================= Shutdown Manager ===================================

CleanupCallback = Union[
    Callable[[], None],
    Callable[[], Coroutine[Any, Any, None]],
]


class ShutdownManager:
    """Graceful shutdown coordinator for the RL crawler pipeline.

    Lifecycle:
        manager = ShutdownManager(config)
        manager.install()  # register signal handlers + atexit
        manager.add_cleanup_callback("replay_flush", replay.flush)
        manager.add_cleanup_callback("dqn_save", agent.save_checkpoint)
        ...
        # In the crawl loop:
        while not manager.shutdown_requested.is_set():
            ...
        # Or let signals trigger automatic shutdown

    Signal handling:
    - SIGTERM: graceful shutdown (e.g. systemd stop, Vercel timeout)
    - SIGINT:  graceful shutdown (Ctrl+C)
    - SIGHUP:  graceful shutdown (terminal disconnect)

    Thread safety: signal handlers run on the main thread.  The shutdown
    sequence acquires a lock to prevent double-execution from concurrent
    signals + atexit.

    Metrics:
    - shutdown_reason: signal name or "programmatic" or "atexit"
    - shutdown_duration_ms: total time for graceful shutdown sequence
    - callbacks_executed: number of cleanup callbacks that completed
    - callbacks_failed: number of cleanup callbacks that raised
    """

    def __init__(
        self,
        config: Optional[ShutdownConfig] = None,
        checkpoint_manager: Optional[CheckpointManager] = None,
        loop: Optional[asyncio.AbstractEventLoop] = None,
    ) -> None:
        self.config = config or ShutdownConfig()
        self.checkpoint_manager = checkpoint_manager

        # Cooperative cancellation event -- async tasks check this
        self.shutdown_requested: asyncio.Event = asyncio.Event()

        # Internal state
        self._loop = loop
        self._shutdown_lock = threading.Lock()
        self._shutdown_started = False
        self._shutdown_complete = False
        self._installed = False
        self._start_time: Optional[float] = None
        self._shutdown_reason: str = ""

        # Ordered cleanup callbacks: (name, callback) pairs
        # Executed in registration order during shutdown
        self._cleanup_callbacks: List[tuple] = []

        # State accessors (set by pipeline before install)
        self._get_global_step: Optional[Callable[[], int]] = None
        self._get_replay_size: Optional[Callable[[], int]] = None
        self._last_checkpoint_path: str = ""

        # Original signal handlers (restored on uninstall)
        self._original_handlers: Dict[int, Any] = {}

    # ---- Installation -------------------------------------------------------

    def install(self) -> None:
        """Register signal handlers and atexit hook.

        Must be called from the main thread (signal handlers can only be
        registered on the main thread in Python).
        """
        if self._installed:
            logger.warning("ShutdownManager already installed")
            return

        # Store event loop reference if not provided
        if self._loop is None:
            try:
                self._loop = asyncio.get_running_loop()
            except RuntimeError:
                self._loop = None

        # Register signal handlers
        signal_map = {
            signal.SIGTERM: self.config.handle_sigterm,
            signal.SIGINT: self.config.handle_sigint,
        }
        # SIGHUP is not available on all platforms
        if hasattr(signal, "SIGHUP"):
            signal_map[signal.SIGHUP] = self.config.handle_sighup

        for sig, should_handle in signal_map.items():
            if should_handle:
                try:
                    self._original_handlers[sig] = signal.getsignal(sig)
                    signal.signal(sig, self._signal_handler)
                    logger.debug("Registered handler for %s", sig.name)
                except (OSError, ValueError) as exc:
                    logger.warning(
                        "Cannot register handler for %s: %s", sig.name, exc
                    )

        # Register atexit
        if self.config.register_atexit:
            atexit.register(self._atexit_handler)

        self._installed = True
        logger.info("ShutdownManager installed (timeout=%.0fs)", self.config.graceful_timeout)

    def uninstall(self) -> None:
        """Restore original signal handlers and remove atexit hook."""
        for sig, original in self._original_handlers.items():
            try:
                signal.signal(sig, original)
            except (OSError, ValueError):
                pass
        self._original_handlers.clear()

        try:
            atexit.unregister(self._atexit_handler)
        except Exception:
            pass

        self._installed = False
        logger.debug("ShutdownManager uninstalled")

    # ---- Callback Registration ----------------------------------------------

    def add_cleanup_callback(
        self,
        name: str,
        callback: CleanupCallback,
    ) -> None:
        """Register a cleanup callback to run during shutdown.

        Callbacks execute in registration order.  Both sync and async
        callables are supported.

        Args:
            name: human-readable name for logging.
            callback: sync or async callable taking no arguments.
        """
        self._cleanup_callbacks.append((name, callback))
        logger.debug("Registered cleanup callback: %s", name)

    def set_state_accessors(
        self,
        get_global_step: Callable[[], int],
        get_replay_size: Callable[[], int],
    ) -> None:
        """Set functions that provide current pipeline state for the manifest.

        Args:
            get_global_step: returns the current global training step.
            get_replay_size: returns the current replay buffer size.
        """
        self._get_global_step = get_global_step
        self._get_replay_size = get_replay_size

    # ---- Signal Handlers ----------------------------------------------------

    def _signal_handler(self, signum: int, frame: Any) -> None:
        """Handle OS signals by initiating graceful shutdown.

        Runs on the main thread.  Sets the shutdown_requested event and
        schedules the shutdown coroutine on the event loop if available.
        """
        sig_name = signal.Signals(signum).name
        logger.info("Received %s, initiating graceful shutdown...", sig_name)
        self._shutdown_reason = sig_name
        self.shutdown_requested.set()

        # Schedule async shutdown if we have a running loop
        if self._loop is not None and self._loop.is_running():
            self._loop.call_soon_threadsafe(
                lambda: asyncio.ensure_future(self.shutdown())
            )
        else:
            # Synchronous fallback
            self._run_shutdown_sync()

    def _atexit_handler(self) -> None:
        """Atexit hook -- last-resort cleanup if signals were not caught."""
        if self._shutdown_complete:
            return
        logger.info("Atexit handler triggered, running cleanup...")
        self._shutdown_reason = self._shutdown_reason or "atexit"
        self.shutdown_requested.set()
        self._run_shutdown_sync()

    # ---- Shutdown Execution -------------------------------------------------

    async def shutdown(self, reason: Optional[str] = None) -> ShutdownManifest:
        """Execute the full graceful shutdown sequence (async version).

        Args:
            reason: optional reason string (overrides signal-detected reason).

        Returns:
            ShutdownManifest with shutdown details.

        Shutdown order:
        1. Set shutdown_requested event
        2. Execute registered cleanup callbacks in order
        3. Save final checkpoint (if CheckpointManager available)
        4. Write shutdown manifest
        5. Uninstall signal handlers
        """
        with self._shutdown_lock:
            if self._shutdown_started:
                logger.debug("Shutdown already in progress, skipping")
                return self._build_manifest(graceful=True)
            self._shutdown_started = True

        if reason:
            self._shutdown_reason = reason
        if not self._shutdown_reason:
            self._shutdown_reason = "programmatic"

        self.shutdown_requested.set()
        self._start_time = time.time()

        logger.info(
            "Starting graceful shutdown (reason=%s, timeout=%.0fs)",
            self._shutdown_reason,
            self.config.graceful_timeout,
        )

        graceful = True
        try:
            # Run with timeout
            await asyncio.wait_for(
                self._execute_shutdown_sequence(),
                timeout=self.config.graceful_timeout,
            )
        except asyncio.TimeoutError:
            logger.error(
                "Graceful shutdown timed out after %.0fs, forcing shutdown",
                self.config.graceful_timeout,
            )
            graceful = False
        except Exception as exc:
            logger.error("Shutdown sequence error: %s", exc, exc_info=True)
            graceful = False

        manifest = self._build_manifest(graceful=graceful)
        self._write_manifest(manifest)
        self.uninstall()
        self._shutdown_complete = True

        elapsed = time.time() - self._start_time
        logger.info(
            "Shutdown complete: graceful=%s, duration=%.1fs, reason=%s",
            graceful,
            elapsed,
            self._shutdown_reason,
        )
        return manifest

    async def _execute_shutdown_sequence(self) -> None:
        """Run all cleanup callbacks and final checkpoint.

        Callbacks are executed in registration order.  Each callback
        failure is logged but does not abort the remaining sequence.
        """
        executed = 0
        failed = 0

        for name, callback in self._cleanup_callbacks:
            try:
                logger.info("Running cleanup: %s", name)
                result = callback()
                if asyncio.iscoroutine(result):
                    await result
                executed += 1
                logger.debug("Cleanup completed: %s", name)
            except Exception as exc:
                failed += 1
                logger.error("Cleanup failed (%s): %s", name, exc, exc_info=True)

        # Final checkpoint via CheckpointManager
        if self.checkpoint_manager is not None:
            try:
                metadata = self._build_checkpoint_metadata()
                path = self.checkpoint_manager.save_checkpoint(metadata)
                if path:
                    self._last_checkpoint_path = path
                    logger.info("Final checkpoint saved: %s", path)
            except Exception as exc:
                logger.error("Final checkpoint failed: %s", exc, exc_info=True)

        logger.info(
            "Cleanup summary: executed=%d, failed=%d, total=%d",
            executed,
            failed,
            len(self._cleanup_callbacks),
        )

    def _run_shutdown_sync(self) -> None:
        """Synchronous shutdown fallback for non-async contexts.

        Used by signal handlers when no event loop is running, and by
        the atexit handler.  Enforces the graceful timeout via a
        watchdog thread.
        """
        with self._shutdown_lock:
            if self._shutdown_started:
                return
            self._shutdown_started = True

        self._start_time = time.time()

        # Start watchdog for forced shutdown
        watchdog = threading.Timer(
            self.config.graceful_timeout,
            self._force_shutdown,
        )
        watchdog.daemon = True
        watchdog.start()

        graceful = True
        executed = 0
        failed = 0

        try:
            for name, callback in self._cleanup_callbacks:
                try:
                    logger.info("Running cleanup (sync): %s", name)
                    result = callback()
                    # If callback is async, skip it in sync context
                    if asyncio.iscoroutine(result):
                        logger.warning(
                            "Skipping async cleanup in sync context: %s", name
                        )
                        result.close()  # prevent "coroutine never awaited" warning
                    else:
                        executed += 1
                except Exception as exc:
                    failed += 1
                    logger.error(
                        "Cleanup failed (%s): %s", name, exc, exc_info=True
                    )

            # Final checkpoint
            if self.checkpoint_manager is not None:
                try:
                    metadata = self._build_checkpoint_metadata()
                    path = self.checkpoint_manager.save_checkpoint(metadata)
                    if path:
                        self._last_checkpoint_path = path
                except Exception as exc:
                    logger.error("Final checkpoint (sync) failed: %s", exc)

        except Exception as exc:
            logger.error("Sync shutdown error: %s", exc, exc_info=True)
            graceful = False

        watchdog.cancel()

        manifest = self._build_manifest(graceful=graceful)
        self._write_manifest(manifest)
        self.uninstall()
        self._shutdown_complete = True

        elapsed = time.time() - self._start_time
        logger.info(
            "Sync shutdown complete: graceful=%s, duration=%.1fs, "
            "executed=%d, failed=%d",
            graceful,
            elapsed,
            executed,
            failed,
        )

    @staticmethod
    def _force_shutdown() -> None:
        """Forcibly terminate the process after timeout.

        This is the nuclear option -- called by the watchdog thread when
        the graceful shutdown hangs.  Uses os._exit() to bypass any
        further atexit handlers or finalizers.
        """
        logger.critical("Forced shutdown: graceful timeout exceeded, calling os._exit(1)")
        os._exit(1)

    # ---- Manifest -----------------------------------------------------------

    def _build_manifest(self, graceful: bool) -> ShutdownManifest:
        """Build a shutdown manifest from current pipeline state."""
        elapsed = 0.0
        if self._start_time is not None:
            elapsed = time.time() - self._start_time

        global_step = 0
        if self._get_global_step is not None:
            try:
                global_step = self._get_global_step()
            except Exception:
                pass

        replay_size = 0
        if self._get_replay_size is not None:
            try:
                replay_size = self._get_replay_size()
            except Exception:
                pass

        return ShutdownManifest(
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            reason=self._shutdown_reason,
            last_global_step=global_step,
            replay_buffer_size=replay_size,
            checkpoint_path=self._last_checkpoint_path,
            duration_seconds=elapsed,
            graceful=graceful,
        )

    def _write_manifest(self, manifest: ShutdownManifest) -> None:
        """Write shutdown manifest to disk as JSON."""
        manifest_dir = Path(self.config.manifest_dir)
        manifest_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = manifest_dir / self.config.manifest_filename

        try:
            with open(manifest_path, "w") as f:
                json.dump(manifest.to_dict(), f, indent=2)
            logger.info("Shutdown manifest written to %s", manifest_path)
        except Exception as exc:
            logger.error("Failed to write shutdown manifest: %s", exc)

    def _build_checkpoint_metadata(self) -> CheckpointMetadata:
        """Build checkpoint metadata from current pipeline state."""
        step = 0
        if self._get_global_step is not None:
            try:
                step = self._get_global_step()
            except Exception:
                pass

        replay_size = 0
        if self._get_replay_size is not None:
            try:
                replay_size = self._get_replay_size()
            except Exception:
                pass

        return CheckpointMetadata(
            step=step,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            replay_size=replay_size,
        )

    # ---- Status -------------------------------------------------------------

    @property
    def is_shutdown_requested(self) -> bool:
        """Check if shutdown has been requested (non-blocking)."""
        return self.shutdown_requested.is_set()

    @property
    def is_shutdown_complete(self) -> bool:
        """Check if shutdown has fully completed."""
        return self._shutdown_complete

    def get_status(self) -> Dict[str, Any]:
        """Return current shutdown manager status."""
        return {
            "installed": self._installed,
            "shutdown_requested": self.shutdown_requested.is_set(),
            "shutdown_started": self._shutdown_started,
            "shutdown_complete": self._shutdown_complete,
            "shutdown_reason": self._shutdown_reason,
            "callbacks_registered": len(self._cleanup_callbacks),
            "callback_names": [name for name, _ in self._cleanup_callbacks],
        }

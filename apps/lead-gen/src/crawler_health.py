"""
Module 1: Lightweight health check system for the RL crawler pipeline.

Provides:
- HealthChecker: component health registration and aggregation
- HealthServer: minimal HTTP server (pure asyncio, no external deps)
- LivenessProbe: heartbeat tracking for external process managers

Endpoints:
  GET /health  -> JSON health report (all components)
  GET /metrics -> JSON training metrics snapshot
  GET /status  -> human-readable status page (text/plain)

Integration points:
- CrawlerPipeline: pass to HealthServer.start(pipeline)
- ShutdownManager: stop() during graceful shutdown
- External monitoring: LivenessProbe.is_alive() for process managers

No external dependencies (pure asyncio HTTP).
Memory budget: <1 MB (metadata only).
Target: Apple M1 16GB, zero cloud dependency.
"""

import asyncio
import json
import logging
import os
import shutil
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from crawler_pipeline import CrawlerPipeline

logger = logging.getLogger("crawler_health")


# ======================= Configuration ======================================

@dataclass
class HealthConfig:
    """Configuration for the health check system."""

    # HTTP server
    port: int = 8765
    host: str = "127.0.0.1"

    # Enable/disable health server entirely
    enabled: bool = True

    # Interval between automatic health check sweeps (seconds)
    check_interval: float = 30.0


# ======================= Health Status ======================================

class HealthStatus(Enum):
    """Health status levels, ordered from best to worst."""

    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNHEALTHY = "UNHEALTHY"
    STARTING = "STARTING"
    STOPPING = "STOPPING"


# Severity ordering for worst-of aggregation
_STATUS_SEVERITY: Dict[HealthStatus, int] = {
    HealthStatus.HEALTHY: 0,
    HealthStatus.STARTING: 1,
    HealthStatus.DEGRADED: 2,
    HealthStatus.STOPPING: 3,
    HealthStatus.UNHEALTHY: 4,
}


# ======================= Component Health ===================================

@dataclass
class ComponentHealth:
    """Health snapshot for a single pipeline component."""

    name: str
    status: HealthStatus
    message: str
    last_check: float
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "last_check": self.last_check,
            "details": self.details,
        }


# ======================= Health Checker =====================================

class HealthChecker:
    """Component health registration and aggregated status computation.

    Usage:
        checker = HealthChecker()
        checker.register("frontier", lambda: ComponentHealth(...))
        report = checker.check_all()
        overall = checker.overall_status()

    Built-in checks are registered via register_builtin_checks(pipeline).
    Custom checks can be added via register(name, check_fn).
    """

    def __init__(self) -> None:
        self._checks: Dict[str, Callable[[], ComponentHealth]] = {}
        self._last_results: Dict[str, ComponentHealth] = {}

    # ---- Registration -------------------------------------------------------

    def register(self, name: str, check_fn: Callable[[], ComponentHealth]) -> None:
        """Register a named health check function.

        Args:
            name: unique component name.
            check_fn: callable returning ComponentHealth (must not block).
        """
        self._checks[name] = check_fn
        logger.debug("Registered health check: %s", name)

    def unregister(self, name: str) -> None:
        """Remove a registered health check."""
        self._checks.pop(name, None)
        self._last_results.pop(name, None)

    # ---- Execution ----------------------------------------------------------

    def check_all(self) -> Dict[str, ComponentHealth]:
        """Run all registered checks and return results.

        Failed checks are reported as UNHEALTHY rather than propagating
        exceptions -- health checks must never crash the pipeline.

        Returns:
            Dict mapping component name to its ComponentHealth.
        """
        results: Dict[str, ComponentHealth] = {}
        for name, check_fn in self._checks.items():
            try:
                results[name] = check_fn()
            except Exception as exc:
                results[name] = ComponentHealth(
                    name=name,
                    status=HealthStatus.UNHEALTHY,
                    message=f"Check failed: {exc}",
                    last_check=time.time(),
                    details={"error": str(exc)},
                )
        self._last_results = results
        return results

    def overall_status(self) -> HealthStatus:
        """Compute the aggregate status (worst of all components).

        If no checks are registered, returns HEALTHY.
        """
        if not self._last_results:
            return HealthStatus.HEALTHY

        worst = HealthStatus.HEALTHY
        worst_severity = _STATUS_SEVERITY[worst]

        for component in self._last_results.values():
            severity = _STATUS_SEVERITY.get(component.status, 4)
            if severity > worst_severity:
                worst = component.status
                worst_severity = severity

        return worst

    def get_last_results(self) -> Dict[str, ComponentHealth]:
        """Return cached results from the most recent check_all() call."""
        return dict(self._last_results)

    # ---- Built-in Checks ----------------------------------------------------

    def register_builtin_checks(self, pipeline: "CrawlerPipeline") -> None:
        """Register standard health checks for all pipeline components.

        Args:
            pipeline: initialised CrawlerPipeline instance.
        """
        self.register("frontier", lambda: _check_frontier(pipeline))
        self.register("replay_buffer", lambda: _check_replay_buffer(pipeline))
        self.register("dqn", lambda: _check_dqn(pipeline))
        self.register("embedder", lambda: _check_embedder(pipeline))
        self.register("browser", lambda: _check_browser(pipeline))
        self.register("disk", lambda: _check_disk(pipeline))
        self.register("memory", lambda: _check_memory(pipeline))
        logger.info("Registered %d built-in health checks", len(self._checks))


# ======================= Built-in Check Functions ===========================

def _check_frontier(pipeline: "CrawlerPipeline") -> ComponentHealth:
    """Frontier: has pending URLs?"""
    now = time.time()
    if pipeline.engine is None:
        return ComponentHealth(
            name="frontier",
            status=HealthStatus.STARTING,
            message="Engine not initialised",
            last_check=now,
        )

    has_pending = pipeline.engine.frontier.has_pending()
    pending_count = 0
    try:
        pending_count = pipeline.engine.frontier.pending_count()
    except AttributeError:
        # pending_count() may not exist on all frontier implementations
        pass

    if has_pending:
        return ComponentHealth(
            name="frontier",
            status=HealthStatus.HEALTHY,
            message=f"Frontier has pending URLs ({pending_count})",
            last_check=now,
            details={"pending_count": pending_count, "has_pending": True},
        )
    return ComponentHealth(
        name="frontier",
        status=HealthStatus.DEGRADED,
        message="Frontier exhausted -- no pending URLs",
        last_check=now,
        details={"pending_count": 0, "has_pending": False},
    )


def _check_replay_buffer(pipeline: "CrawlerPipeline") -> ComponentHealth:
    """Replay buffer: not near capacity?"""
    now = time.time()
    if pipeline.replay is None:
        return ComponentHealth(
            name="replay_buffer",
            status=HealthStatus.STARTING,
            message="Replay buffer not initialised",
            last_check=now,
        )

    size = pipeline.replay.size
    capacity = pipeline.config.replay.capacity
    fill_ratio = size / max(capacity, 1)

    if fill_ratio >= 0.95:
        return ComponentHealth(
            name="replay_buffer",
            status=HealthStatus.DEGRADED,
            message=f"Replay buffer near capacity ({fill_ratio:.1%})",
            last_check=now,
            details={"size": size, "capacity": capacity, "fill_ratio": round(fill_ratio, 4)},
        )
    return ComponentHealth(
        name="replay_buffer",
        status=HealthStatus.HEALTHY,
        message=f"Replay buffer {fill_ratio:.1%} full ({size}/{capacity})",
        last_check=now,
        details={"size": size, "capacity": capacity, "fill_ratio": round(fill_ratio, 4)},
    )


def _check_dqn(pipeline: "CrawlerPipeline") -> ComponentHealth:
    """DQN: agent loaded and has recent training steps?"""
    now = time.time()
    if pipeline.agent is None:
        # Not necessarily unhealthy -- could be ONNX-only mode
        if pipeline.onnx_engine is not None:
            return ComponentHealth(
                name="dqn",
                status=HealthStatus.HEALTHY,
                message="Running in ONNX inference mode (no training)",
                last_check=now,
                details={"mode": "onnx_inference"},
            )
        return ComponentHealth(
            name="dqn",
            status=HealthStatus.DEGRADED,
            message="No DQN agent or ONNX engine loaded (random action selection)",
            last_check=now,
            details={"mode": "random_fallback"},
        )

    train_step = getattr(pipeline.agent, "train_step", 0)
    return ComponentHealth(
        name="dqn",
        status=HealthStatus.HEALTHY,
        message=f"DQN agent loaded (train_step={train_step})",
        last_check=now,
        details={"train_step": train_step, "mode": "pytorch_training"},
    )


def _check_embedder(pipeline: "CrawlerPipeline") -> ComponentHealth:
    """Embedder: model loaded?"""
    now = time.time()
    if pipeline.embedder is None:
        return ComponentHealth(
            name="embedder",
            status=HealthStatus.STARTING,
            message="Embedder not initialised",
            last_check=now,
        )

    # Check if the embedder has a loaded model
    is_loaded = getattr(pipeline.embedder, "_model", None) is not None
    backend = getattr(pipeline.embedder, "_backend", "unknown")

    if is_loaded:
        return ComponentHealth(
            name="embedder",
            status=HealthStatus.HEALTHY,
            message=f"Embedder loaded (backend={backend})",
            last_check=now,
            details={"backend": backend, "loaded": True},
        )
    return ComponentHealth(
        name="embedder",
        status=HealthStatus.UNHEALTHY,
        message="Embedder initialised but model not loaded",
        last_check=now,
        details={"backend": backend, "loaded": False},
    )


def _check_browser(pipeline: "CrawlerPipeline") -> ComponentHealth:
    """Browser: engine started and responsive?"""
    now = time.time()
    if pipeline.engine is None:
        return ComponentHealth(
            name="browser",
            status=HealthStatus.STARTING,
            message="Crawler engine not initialised",
            last_check=now,
        )

    # Check if the engine has an active browser context
    is_started = getattr(pipeline.engine, "_started", False)
    if is_started:
        return ComponentHealth(
            name="browser",
            status=HealthStatus.HEALTHY,
            message="Browser engine running",
            last_check=now,
            details={"started": True},
        )
    return ComponentHealth(
        name="browser",
        status=HealthStatus.DEGRADED,
        message="Browser engine not started",
        last_check=now,
        details={"started": False},
    )


def _check_disk(pipeline: "CrawlerPipeline") -> ComponentHealth:
    """Disk: sufficient free space in data directory?"""
    now = time.time()
    data_dir = pipeline.config.data_dir

    try:
        usage = shutil.disk_usage(data_dir)
        free_gb = usage.free / (1024 ** 3)
        total_gb = usage.total / (1024 ** 3)
        used_pct = (usage.used / usage.total) * 100

        if free_gb < 1.0:
            return ComponentHealth(
                name="disk",
                status=HealthStatus.UNHEALTHY,
                message=f"Critical: only {free_gb:.1f} GB free disk space",
                last_check=now,
                details={
                    "free_gb": round(free_gb, 2),
                    "total_gb": round(total_gb, 2),
                    "used_pct": round(used_pct, 1),
                },
            )
        if free_gb < 5.0:
            return ComponentHealth(
                name="disk",
                status=HealthStatus.DEGRADED,
                message=f"Low disk space: {free_gb:.1f} GB free",
                last_check=now,
                details={
                    "free_gb": round(free_gb, 2),
                    "total_gb": round(total_gb, 2),
                    "used_pct": round(used_pct, 1),
                },
            )
        return ComponentHealth(
            name="disk",
            status=HealthStatus.HEALTHY,
            message=f"Disk OK: {free_gb:.1f} GB free ({used_pct:.0f}% used)",
            last_check=now,
            details={
                "free_gb": round(free_gb, 2),
                "total_gb": round(total_gb, 2),
                "used_pct": round(used_pct, 1),
            },
        )
    except OSError as exc:
        return ComponentHealth(
            name="disk",
            status=HealthStatus.UNHEALTHY,
            message=f"Cannot check disk: {exc}",
            last_check=now,
            details={"error": str(exc)},
        )


def _check_memory(pipeline: "CrawlerPipeline") -> ComponentHealth:
    """Memory: process RSS under budget?"""
    now = time.time()
    budget_mb = pipeline.config.memory_budget_mb

    try:
        import psutil
        proc = psutil.Process(os.getpid())
        rss_mb = proc.memory_info().rss / (1024 * 1024)
    except (ImportError, Exception):
        # psutil not available -- fall back to resource module (macOS/Linux)
        try:
            import resource
            # ru_maxrss is in bytes on macOS, KB on Linux
            maxrss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            if os.uname().sysname == "Darwin":
                rss_mb = maxrss / (1024 * 1024)
            else:
                rss_mb = maxrss / 1024
        except Exception:
            return ComponentHealth(
                name="memory",
                status=HealthStatus.HEALTHY,
                message="Memory check unavailable (no psutil or resource module)",
                last_check=now,
                details={"available": False},
            )

    usage_pct = (rss_mb / budget_mb) * 100 if budget_mb > 0 else 0

    if rss_mb > budget_mb:
        return ComponentHealth(
            name="memory",
            status=HealthStatus.UNHEALTHY,
            message=f"RSS {rss_mb:.0f} MB exceeds budget {budget_mb} MB",
            last_check=now,
            details={
                "rss_mb": round(rss_mb, 1),
                "budget_mb": budget_mb,
                "usage_pct": round(usage_pct, 1),
            },
        )
    if rss_mb > budget_mb * 0.85:
        return ComponentHealth(
            name="memory",
            status=HealthStatus.DEGRADED,
            message=f"RSS {rss_mb:.0f} MB approaching budget {budget_mb} MB ({usage_pct:.0f}%)",
            last_check=now,
            details={
                "rss_mb": round(rss_mb, 1),
                "budget_mb": budget_mb,
                "usage_pct": round(usage_pct, 1),
            },
        )
    return ComponentHealth(
        name="memory",
        status=HealthStatus.HEALTHY,
        message=f"Memory OK: {rss_mb:.0f} MB / {budget_mb} MB ({usage_pct:.0f}%)",
        last_check=now,
        details={
            "rss_mb": round(rss_mb, 1),
            "budget_mb": budget_mb,
            "usage_pct": round(usage_pct, 1),
        },
    )


# ======================= Liveness Probe =====================================

class LivenessProbe:
    """Heartbeat tracker for the main crawl loop.

    The crawl loop calls beat() on each iteration.  External monitors
    call is_alive(timeout) to check whether the loop has stalled.

    Usage:
        probe = LivenessProbe()

        # In crawl loop:
        while running:
            probe.beat()
            ...

        # In monitor / process manager:
        if not probe.is_alive(timeout=60):
            restart_pipeline()
    """

    def __init__(self) -> None:
        self._last_beat: float = 0.0
        self._beat_count: int = 0
        self._started_at: float = time.time()

    def beat(self) -> None:
        """Record a heartbeat from the main crawl loop."""
        self._last_beat = time.time()
        self._beat_count += 1

    def is_alive(self, timeout: float = 60.0) -> bool:
        """Check if the crawl loop has sent a heartbeat within the timeout.

        Args:
            timeout: maximum seconds since last heartbeat.

        Returns:
            True if a heartbeat was received within the timeout window.
        """
        if self._last_beat == 0.0:
            # Never beat yet -- check if we just started
            return (time.time() - self._started_at) < timeout
        return (time.time() - self._last_beat) < timeout

    @property
    def last_beat(self) -> float:
        """Timestamp of the most recent heartbeat (0.0 if never beat)."""
        return self._last_beat

    @property
    def beat_count(self) -> int:
        """Total number of heartbeats recorded."""
        return self._beat_count

    @property
    def uptime(self) -> float:
        """Seconds since the probe was created."""
        return time.time() - self._started_at

    def to_dict(self) -> Dict[str, Any]:
        """Serialise probe state for health reports."""
        now = time.time()
        since_last = now - self._last_beat if self._last_beat > 0 else None
        return {
            "alive": self.is_alive(),
            "last_beat": self._last_beat,
            "seconds_since_beat": round(since_last, 2) if since_last is not None else None,
            "beat_count": self._beat_count,
            "uptime_seconds": round(self.uptime, 2),
        }


# ======================= Health Server ======================================

class HealthServer:
    """Minimal HTTP health server built on asyncio.start_server.

    Runs alongside the crawl loop without blocking it.  Serves three
    endpoints:

        GET /health  -> JSON health report (all components + overall status)
        GET /metrics -> JSON training metrics from pipeline.get_stats()
        GET /status  -> human-readable plain text status page

    No external dependencies -- uses raw asyncio TCP with hand-crafted
    HTTP/1.1 responses.

    Usage:
        server = HealthServer(config, checker, probe)
        await server.start(pipeline)
        ...
        await server.stop()
    """

    def __init__(
        self,
        config: Optional[HealthConfig] = None,
        checker: Optional[HealthChecker] = None,
        probe: Optional[LivenessProbe] = None,
    ) -> None:
        self.config = config or HealthConfig()
        self.checker = checker or HealthChecker()
        self.probe = probe or LivenessProbe()

        self._pipeline: Optional["CrawlerPipeline"] = None
        self._server: Optional[asyncio.AbstractServer] = None
        self._check_task: Optional[asyncio.Task] = None
        self._running = False

    # ---- Lifecycle ----------------------------------------------------------

    async def start(self, pipeline: "CrawlerPipeline") -> None:
        """Start the health server and periodic check loop.

        Args:
            pipeline: initialised CrawlerPipeline for metrics access.
        """
        if not self.config.enabled:
            logger.info("Health server disabled by config")
            return

        self._pipeline = pipeline

        # Register built-in checks
        self.checker.register_builtin_checks(pipeline)

        # Run an initial health check
        self.checker.check_all()

        # Start HTTP server
        self._server = await asyncio.start_server(
            self._handle_connection,
            self.config.host,
            self.config.port,
        )
        self._running = True

        # Start periodic check loop
        self._check_task = asyncio.create_task(self._periodic_check_loop())

        logger.info(
            "Health server started on http://%s:%d",
            self.config.host,
            self.config.port,
        )

    async def stop(self) -> None:
        """Stop the health server and cancel the periodic check task."""
        self._running = False

        if self._check_task is not None:
            self._check_task.cancel()
            try:
                await self._check_task
            except asyncio.CancelledError:
                pass
            self._check_task = None

        if self._server is not None:
            self._server.close()
            await self._server.wait_closed()
            self._server = None

        logger.info("Health server stopped")

    # ---- Periodic Check Loop ------------------------------------------------

    async def _periodic_check_loop(self) -> None:
        """Run health checks at the configured interval."""
        while self._running:
            try:
                await asyncio.sleep(self.config.check_interval)
                self.checker.check_all()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Periodic health check error: %s", exc)

    # ---- HTTP Handling ------------------------------------------------------

    async def _handle_connection(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        """Handle a single HTTP connection.

        Parses the minimal HTTP/1.1 request line, routes to the correct
        handler, and writes a complete HTTP response.
        """
        try:
            # Read request line (first line only)
            request_line = await asyncio.wait_for(
                reader.readline(), timeout=5.0
            )
            request_str = request_line.decode("utf-8", errors="replace").strip()

            # Parse method and path
            parts = request_str.split(" ")
            if len(parts) < 2:
                await self._send_response(writer, 400, "text/plain", "Bad Request")
                return

            method = parts[0].upper()
            path = parts[1]

            # Drain remaining headers (we don't need them)
            while True:
                line = await asyncio.wait_for(reader.readline(), timeout=5.0)
                if line in (b"\r\n", b"\n", b""):
                    break

            # Route
            if method != "GET":
                await self._send_response(
                    writer, 405, "text/plain", "Method Not Allowed"
                )
                return

            if path == "/health":
                await self._handle_health(writer)
            elif path == "/metrics":
                await self._handle_metrics(writer)
            elif path == "/status":
                await self._handle_status(writer)
            else:
                await self._send_response(
                    writer, 404, "text/plain", "Not Found"
                )

        except asyncio.TimeoutError:
            pass
        except Exception as exc:
            logger.debug("HTTP handler error: %s", exc)
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    # ---- Endpoint Handlers --------------------------------------------------

    async def _handle_health(self, writer: asyncio.StreamWriter) -> None:
        """GET /health -> JSON health report."""
        results = self.checker.check_all()
        overall = self.checker.overall_status()

        report = {
            "status": overall.value,
            "timestamp": time.time(),
            "liveness": self.probe.to_dict(),
            "components": {
                name: comp.to_dict() for name, comp in results.items()
            },
        }

        # HTTP status code: 200 for healthy/starting, 503 for degraded/unhealthy
        http_status = 200 if overall in (
            HealthStatus.HEALTHY, HealthStatus.STARTING
        ) else 503

        body = json.dumps(report, indent=2)
        await self._send_response(writer, http_status, "application/json", body)

    async def _handle_metrics(self, writer: asyncio.StreamWriter) -> None:
        """GET /metrics -> JSON training metrics."""
        if self._pipeline is None:
            await self._send_response(
                writer, 503, "application/json",
                json.dumps({"error": "Pipeline not available"}),
            )
            return

        try:
            stats = self._pipeline.get_stats()
        except Exception as exc:
            await self._send_response(
                writer, 500, "application/json",
                json.dumps({"error": str(exc)}),
            )
            return

        body = json.dumps(stats, indent=2, default=str)
        await self._send_response(writer, 200, "application/json", body)

    async def _handle_status(self, writer: asyncio.StreamWriter) -> None:
        """GET /status -> human-readable plain text status page."""
        results = self.checker.get_last_results()
        overall = self.checker.overall_status()
        liveness = self.probe.to_dict()

        lines: List[str] = [
            "=" * 60,
            f"  Scrapus Crawler Health Status",
            f"  Overall: {overall.value}",
            f"  Time: {time.strftime('%Y-%m-%d %H:%M:%S')}",
            "=" * 60,
            "",
            "--- Liveness ---",
            f"  Alive:       {liveness['alive']}",
            f"  Beat count:  {liveness['beat_count']}",
            f"  Uptime:      {liveness['uptime_seconds']:.0f}s",
        ]

        if liveness["seconds_since_beat"] is not None:
            lines.append(
                f"  Last beat:   {liveness['seconds_since_beat']:.1f}s ago"
            )

        lines.append("")
        lines.append("--- Components ---")

        for name, comp in results.items():
            status_str = comp.status.value
            lines.append(f"  [{status_str:<10s}] {name}: {comp.message}")

        if self._pipeline is not None:
            lines.append("")
            lines.append("--- Pipeline ---")
            try:
                stats = self._pipeline.get_stats()
                lines.append(f"  Global step: {stats.get('global_step', 'N/A')}")

                rewards = stats.get("rewards", {})
                if rewards:
                    lines.append(
                        f"  Rewards:     {rewards.get('total', 0)} total, "
                        f"mean={rewards.get('mean', 0):.4f}, "
                        f"harvest={rewards.get('harvest_rate', 0):.4f}"
                    )

                replay = stats.get("replay", {})
                if replay:
                    lines.append(
                        f"  Replay:      size={replay.get('size', 'N/A')}"
                    )
            except Exception as exc:
                lines.append(f"  (stats unavailable: {exc})")

        lines.append("")
        lines.append("=" * 60)

        body = "\n".join(lines)
        await self._send_response(writer, 200, "text/plain", body)

    # ---- HTTP Response Helper -----------------------------------------------

    @staticmethod
    async def _send_response(
        writer: asyncio.StreamWriter,
        status_code: int,
        content_type: str,
        body: str,
    ) -> None:
        """Write a complete HTTP/1.1 response and drain.

        Constructs the response manually to avoid any external HTTP
        library dependency.
        """
        status_phrases = {
            200: "OK",
            400: "Bad Request",
            404: "Not Found",
            405: "Method Not Allowed",
            500: "Internal Server Error",
            503: "Service Unavailable",
        }
        phrase = status_phrases.get(status_code, "Unknown")
        body_bytes = body.encode("utf-8")

        response = (
            f"HTTP/1.1 {status_code} {phrase}\r\n"
            f"Content-Type: {content_type}; charset=utf-8\r\n"
            f"Content-Length: {len(body_bytes)}\r\n"
            f"Connection: close\r\n"
            f"\r\n"
        )

        writer.write(response.encode("utf-8"))
        writer.write(body_bytes)
        await writer.drain()

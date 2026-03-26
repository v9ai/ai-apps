"""
Async worker pool for the RL crawler engine.

Implements a proper asyncio-based worker pool with:
1. WorkerPoolConfig: tunables for pool size, queue depth, backpressure
2. WorkerState: per-worker lifecycle enum
3. CrawlWorker: individual async worker with fetch -> extract -> return
4. AsyncWorkerPool: manages N workers, submit/batch, auto-restart, monitoring
5. TaskQueue: priority async queue keyed by DQN Q-value
6. ResultCollector: batches PageContent results for efficient embedding
7. WorkerPoolMonitor: real-time health detection (stuck workers, throughput)

Concurrency: asyncio tasks with backpressure on both task and result queues.
Target: Apple M1 16GB, zero cloud dependency.
"""

from __future__ import annotations

import asyncio
import enum
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

from crawler_engine import CrawlerEngine, PageContent

logger = logging.getLogger("crawler_worker_pool")


# ======================= Configuration ======================================

@dataclass
class WorkerPoolConfig:
    """Tunables for the async worker pool.

    Defaults target M1 16GB: 8 workers matching CrawlerConfig.max_concurrent.
    backpressure_threshold slows task submission when the queue exceeds 80%
    capacity, preventing unbounded memory growth.
    """

    n_workers: int = 8
    queue_size: int = 100
    worker_timeout: float = 30.0
    health_check_interval: float = 10.0
    max_retries: int = 2
    backpressure_threshold: float = 0.8  # slow down when queue > 80% full

    # Result batching
    result_batch_size: int = 16
    result_batch_timeout: float = 1.0

    # Auto-restart
    max_worker_restarts: int = 5
    restart_cooldown: float = 2.0


# ======================= Worker State =======================================

class WorkerState(enum.Enum):
    """Lifecycle state of an individual CrawlWorker."""

    IDLE = "idle"
    BUSY = "busy"
    FAILED = "failed"
    STOPPING = "stopping"


# ======================= Crawl Task =========================================

@dataclass
class CrawlTask:
    """A single unit of work for the worker pool.

    Attributes:
        url: target URL to crawl.
        domain: extracted domain for rate-limiting / scheduling.
        depth: frontier depth (0 = seed URL).
        priority: DQN Q-value (higher = crawl first).
        retries_left: remaining retry attempts on failure.
        future: asyncio Future for the caller to await the result.
        created_at: monotonic timestamp when the task was enqueued.
        task_id: unique identifier for tracking.
    """

    url: str
    domain: str
    depth: int
    priority: float = 0.0
    retries_left: int = 2
    future: asyncio.Future = field(default=None, repr=False)  # type: ignore[assignment]
    created_at: float = field(default_factory=time.monotonic)
    task_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])

    def __lt__(self, other: CrawlTask) -> bool:
        """Higher priority = crawl first (max-heap via negated comparison)."""
        return self.priority > other.priority


# ======================= Task Queue =========================================

class TaskQueue:
    """Priority async queue for crawl tasks.

    Tasks are ordered by DQN Q-value (higher priority = dequeued first).
    Provides a backpressure signal when the queue approaches capacity.

    Implementation: asyncio.PriorityQueue with CrawlTask comparison.
    """

    def __init__(self, maxsize: int = 100) -> None:
        self._queue: asyncio.PriorityQueue[Tuple[float, CrawlTask]] = (
            asyncio.PriorityQueue(maxsize=maxsize)
        )
        self._maxsize = maxsize
        self._total_enqueued: int = 0
        self._total_dequeued: int = 0

    async def put(
        self,
        url: str,
        domain: str,
        depth: int,
        priority: float = 0.0,
        future: Optional[asyncio.Future] = None,
        retries_left: int = 2,
    ) -> CrawlTask:
        """Enqueue a crawl task with the given priority.

        Args:
            url: target URL.
            domain: URL domain.
            depth: frontier depth.
            priority: DQN Q-value (higher = crawl first).
            future: optional Future for the caller to await.
            retries_left: retry budget for this task.

        Returns:
            The enqueued CrawlTask.
        """
        task = CrawlTask(
            url=url,
            domain=domain,
            depth=depth,
            priority=priority,
            retries_left=retries_left,
            future=future,
        )
        # Negate priority so PriorityQueue (min-heap) dequeues highest first
        await self._queue.put((-priority, task))
        self._total_enqueued += 1
        return task

    async def get(self) -> CrawlTask:
        """Dequeue the highest-priority crawl task.

        Blocks until a task is available.
        """
        _, task = await self._queue.get()
        self._total_dequeued += 1
        return task

    def task_done(self) -> None:
        """Mark the most recent get() as complete."""
        self._queue.task_done()

    def size(self) -> int:
        """Current number of tasks in the queue."""
        return self._queue.qsize()

    def is_full(self) -> bool:
        """True if the queue has reached maxsize."""
        return self._queue.full()

    def backpressure_active(self, threshold: float = 0.8) -> bool:
        """True if the queue fill level exceeds the backpressure threshold.

        Args:
            threshold: fraction of maxsize (0.0 - 1.0) above which
                       backpressure is signalled.
        """
        if self._maxsize <= 0:
            return False
        return self.size() / self._maxsize >= threshold

    def get_stats(self) -> Dict[str, Any]:
        """Queue statistics."""
        return {
            "current_size": self.size(),
            "max_size": self._maxsize,
            "fill_pct": round(self.size() / max(self._maxsize, 1), 3),
            "total_enqueued": self._total_enqueued,
            "total_dequeued": self._total_dequeued,
        }


# ======================= Result Collector ===================================

class ResultCollector:
    """Async result collection and batching for PageContent.

    Workers push results into the collector. Downstream consumers call
    collect() to receive batches suitable for efficient embedding
    (embed all at once rather than one-by-one).
    """

    def __init__(
        self,
        batch_size: int = 16,
        maxsize: int = 200,
    ) -> None:
        self._queue: asyncio.Queue[PageContent] = asyncio.Queue(maxsize=maxsize)
        self._batch_size = batch_size
        self._total_collected: int = 0
        self._total_batches: int = 0

    async def put(self, result: PageContent) -> None:
        """Add a PageContent result to the collector."""
        await self._queue.put(result)
        self._total_collected += 1

    def put_nowait(self, result: PageContent) -> None:
        """Non-blocking put (raises asyncio.QueueFull if at capacity)."""
        self._queue.put_nowait(result)
        self._total_collected += 1

    async def collect(self, timeout: float = 1.0) -> List[PageContent]:
        """Collect a batch of results, waiting up to timeout seconds.

        Returns as soon as batch_size results are available OR timeout
        elapses, whichever comes first. Always returns at least one
        result if any are available.

        Args:
            timeout: max seconds to wait for a full batch.

        Returns:
            List of PageContent (may be shorter than batch_size).
        """
        batch: List[PageContent] = []
        deadline = time.monotonic() + timeout

        # Wait for at least one result
        remaining = max(deadline - time.monotonic(), 0.01)
        try:
            first = await asyncio.wait_for(self._queue.get(), timeout=remaining)
            batch.append(first)
        except asyncio.TimeoutError:
            return batch

        # Drain up to batch_size without blocking
        while len(batch) < self._batch_size:
            try:
                item = self._queue.get_nowait()
                batch.append(item)
            except asyncio.QueueEmpty:
                break

        if batch:
            self._total_batches += 1

        return batch

    def size(self) -> int:
        """Current number of uncollected results."""
        return self._queue.qsize()

    def get_stats(self) -> Dict[str, Any]:
        """Collector statistics."""
        return {
            "pending_results": self.size(),
            "total_collected": self._total_collected,
            "total_batches": self._total_batches,
            "avg_batch_size": round(
                self._total_collected / max(self._total_batches, 1), 1
            ),
        }


# ======================= Crawl Worker =======================================

class CrawlWorker:
    """Individual async worker that processes crawl tasks.

    Lifecycle: start -> run loop (get task, fetch, extract, push result) -> stop.
    Tracks per-worker statistics and supports graceful shutdown.
    """

    def __init__(
        self,
        worker_id: int,
        engine: CrawlerEngine,
        config: WorkerPoolConfig,
    ) -> None:
        self.worker_id = worker_id
        self._engine = engine
        self._config = config

        # State
        self._state = WorkerState.IDLE
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()
        self._current_url: Optional[str] = None

        # Per-worker stats
        self.pages_processed: int = 0
        self.errors: int = 0
        self._latencies: list[float] = []
        self._started_at: Optional[float] = None
        self._last_activity: float = time.monotonic()

    @property
    def state(self) -> WorkerState:
        return self._state

    def get_status(self) -> WorkerState:
        """Current worker lifecycle state."""
        return self._state

    @property
    def avg_latency(self) -> float:
        """Average fetch latency in seconds (last 100 tasks)."""
        if not self._latencies:
            return 0.0
        # Keep only last 100 for rolling average
        recent = self._latencies[-100:]
        return sum(recent) / len(recent)

    @property
    def uptime(self) -> float:
        """Seconds since the worker was started."""
        if self._started_at is None:
            return 0.0
        return time.monotonic() - self._started_at

    @property
    def idle_time(self) -> float:
        """Seconds since the worker last processed a task."""
        return time.monotonic() - self._last_activity

    async def run(
        self,
        task_queue: TaskQueue,
        result_collector: ResultCollector,
    ) -> None:
        """Main worker loop: pull tasks, fetch pages, push results.

        Runs until stop_event is set. Finishes the current task before
        exiting (graceful shutdown).

        Args:
            task_queue: source of CrawlTask items.
            result_collector: destination for PageContent results.
        """
        self._started_at = time.monotonic()
        self._state = WorkerState.IDLE
        logger.debug("Worker %d started", self.worker_id)

        try:
            while not self._stop_event.is_set():
                # Get next task (with timeout so we can check stop_event)
                try:
                    task = await asyncio.wait_for(
                        task_queue.get(), timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue

                self._state = WorkerState.BUSY
                self._current_url = task.url
                self._last_activity = time.monotonic()

                try:
                    result = await self._execute_task(task)

                    if result is not None:
                        await result_collector.put(result)
                        self.pages_processed += 1

                        # Resolve the caller's Future if present
                        if task.future and not task.future.done():
                            task.future.set_result(result)
                    else:
                        # Fetch returned None (disallowed, timeout, etc.)
                        if task.future and not task.future.done():
                            task.future.set_result(None)

                except Exception as exc:
                    self.errors += 1
                    logger.warning(
                        "Worker %d error on %s: %s",
                        self.worker_id, task.url, exc,
                    )
                    # Retry if budget remains
                    if task.retries_left > 0:
                        task.retries_left -= 1
                        task.priority *= 0.5  # deprioritise retries
                        await task_queue.put(
                            url=task.url,
                            domain=task.domain,
                            depth=task.depth,
                            priority=task.priority,
                            future=task.future,
                            retries_left=task.retries_left,
                        )
                    elif task.future and not task.future.done():
                        task.future.set_exception(exc)

                finally:
                    self._current_url = None
                    self._state = WorkerState.IDLE
                    task_queue.task_done()

        except asyncio.CancelledError:
            logger.debug("Worker %d cancelled", self.worker_id)
        except Exception as exc:
            logger.error("Worker %d fatal error: %s", self.worker_id, exc)
            self._state = WorkerState.FAILED
        finally:
            if self._state != WorkerState.FAILED:
                self._state = WorkerState.STOPPING
            logger.debug(
                "Worker %d stopped (processed=%d, errors=%d)",
                self.worker_id, self.pages_processed, self.errors,
            )

    async def _execute_task(self, task: CrawlTask) -> Optional[PageContent]:
        """Fetch and extract a single page with timeout.

        Delegates to CrawlerEngine._crawl_single which handles:
        - robots.txt compliance
        - per-domain rate limiting
        - Playwright page fetch + content extraction

        Returns PageContent on success, None on skip/failure.
        """
        start = time.monotonic()
        try:
            result = await asyncio.wait_for(
                self._engine._crawl_single(task.url, task.domain, task.depth),
                timeout=self._config.worker_timeout,
            )
            elapsed = time.monotonic() - start
            self._latencies.append(elapsed)
            return result
        except asyncio.TimeoutError:
            elapsed = time.monotonic() - start
            self._latencies.append(elapsed)
            logger.debug(
                "Worker %d timeout after %.1fs on %s",
                self.worker_id, elapsed, task.url,
            )
            return None

    def request_stop(self) -> None:
        """Signal the worker to finish its current task and stop."""
        self._stop_event.set()
        self._state = WorkerState.STOPPING

    def get_stats(self) -> Dict[str, Any]:
        """Per-worker statistics snapshot."""
        return {
            "worker_id": self.worker_id,
            "state": self._state.value,
            "pages_processed": self.pages_processed,
            "errors": self.errors,
            "avg_latency_s": round(self.avg_latency, 3),
            "uptime_s": round(self.uptime, 1),
            "idle_time_s": round(self.idle_time, 1),
            "current_url": self._current_url,
        }


# ======================= Pool Health ========================================

class PoolHealth(enum.Enum):
    """Overall health assessment of the worker pool."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


# ======================= Worker Pool Monitor ================================

class WorkerPoolMonitor:
    """Real-time monitoring of worker pool health.

    Detects:
    - Stuck workers (no activity for longer than worker_timeout)
    - Throughput degradation (pages/sec dropping below threshold)
    - Failed workers that need restart

    Runs as a background asyncio task within the pool.
    """

    def __init__(
        self,
        workers: List[CrawlWorker],
        config: WorkerPoolConfig,
    ) -> None:
        self._workers = workers
        self._config = config
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

        # Throughput tracking
        self._throughput_window: list[Tuple[float, int]] = []  # (timestamp, count)
        self._last_total_pages: int = 0

    def start(self) -> None:
        """Launch the background health-check loop."""
        self._stop_event.clear()
        self._task = asyncio.create_task(self._monitor_loop())

    def stop(self) -> None:
        """Stop the monitor."""
        self._stop_event.set()
        if self._task and not self._task.done():
            self._task.cancel()

    async def _monitor_loop(self) -> None:
        """Periodic health check loop."""
        try:
            while not self._stop_event.is_set():
                await asyncio.sleep(self._config.health_check_interval)
                self._record_throughput()
                health = self.get_health()
                if health != PoolHealth.HEALTHY:
                    logger.warning(
                        "Pool health: %s — %s",
                        health.value,
                        self._health_summary(),
                    )
        except asyncio.CancelledError:
            pass

    def _record_throughput(self) -> None:
        """Snapshot total pages for throughput calculation."""
        total = sum(w.pages_processed for w in self._workers)
        now = time.monotonic()
        self._throughput_window.append((now, total))
        # Keep last 60 seconds of samples
        cutoff = now - 60.0
        self._throughput_window = [
            (t, c) for t, c in self._throughput_window if t >= cutoff
        ]
        self._last_total_pages = total

    def get_throughput(self) -> float:
        """Current pages/sec over the last 60-second window."""
        if len(self._throughput_window) < 2:
            return 0.0
        oldest_t, oldest_c = self._throughput_window[0]
        newest_t, newest_c = self._throughput_window[-1]
        elapsed = newest_t - oldest_t
        if elapsed <= 0:
            return 0.0
        return (newest_c - oldest_c) / elapsed

    def get_stuck_workers(self) -> List[CrawlWorker]:
        """Workers with no activity beyond the timeout threshold."""
        stuck = []
        for w in self._workers:
            if (
                w.state == WorkerState.BUSY
                and w.idle_time > self._config.worker_timeout * 2
            ):
                stuck.append(w)
        return stuck

    def get_failed_workers(self) -> List[CrawlWorker]:
        """Workers in FAILED state."""
        return [w for w in self._workers if w.state == WorkerState.FAILED]

    def get_health(self) -> PoolHealth:
        """Assess overall pool health.

        HEALTHY:   all workers active, no stuck workers.
        DEGRADED:  some workers failed/stuck but majority operational.
        UNHEALTHY: majority of workers failed/stuck.
        """
        n = len(self._workers)
        if n == 0:
            return PoolHealth.UNHEALTHY

        failed = len(self.get_failed_workers())
        stuck = len(self.get_stuck_workers())
        problematic = failed + stuck

        if problematic == 0:
            return PoolHealth.HEALTHY
        elif problematic < n // 2:
            return PoolHealth.DEGRADED
        else:
            return PoolHealth.UNHEALTHY

    def _health_summary(self) -> str:
        """One-line health summary for logging."""
        active = sum(
            1 for w in self._workers
            if w.state in (WorkerState.IDLE, WorkerState.BUSY)
        )
        failed = len(self.get_failed_workers())
        stuck = len(self.get_stuck_workers())
        throughput = self.get_throughput()
        return (
            f"active={active} failed={failed} stuck={stuck} "
            f"throughput={throughput:.1f}p/s"
        )

    def get_per_worker_stats(self) -> List[Dict[str, Any]]:
        """Per-worker statistics for all workers."""
        return [w.get_stats() for w in self._workers]

    def get_pool_stats(self) -> Dict[str, Any]:
        """Aggregate pool statistics."""
        active = sum(
            1 for w in self._workers
            if w.state in (WorkerState.IDLE, WorkerState.BUSY)
        )
        total_pages = sum(w.pages_processed for w in self._workers)
        total_errors = sum(w.errors for w in self._workers)
        avg_latency = 0.0
        latency_workers = [w for w in self._workers if w.avg_latency > 0]
        if latency_workers:
            avg_latency = sum(w.avg_latency for w in latency_workers) / len(
                latency_workers
            )
        return {
            "health": self.get_health().value,
            "workers_total": len(self._workers),
            "workers_active": active,
            "workers_failed": len(self.get_failed_workers()),
            "workers_stuck": len(self.get_stuck_workers()),
            "total_pages": total_pages,
            "total_errors": total_errors,
            "throughput_pps": round(self.get_throughput(), 2),
            "avg_latency_s": round(avg_latency, 3),
        }


# ======================= Async Worker Pool ==================================

class AsyncWorkerPool:
    """Manages N CrawlWorker instances with lifecycle, backpressure,
    auto-restart, and health monitoring.

    Usage:
        engine = CrawlerEngine(config)
        pool = AsyncWorkerPool(engine, WorkerPoolConfig(n_workers=8))
        await pool.start()

        # Submit individual tasks
        future = await pool.submit("https://example.com", "example.com", depth=0)
        result = await future

        # Submit batches
        futures = await pool.submit_batch([
            ("https://a.com", "a.com", 0, 0.9),
            ("https://b.com", "b.com", 1, 0.5),
        ])

        await pool.stop()
    """

    def __init__(
        self,
        engine: CrawlerEngine,
        config: Optional[WorkerPoolConfig] = None,
    ) -> None:
        self._engine = engine
        self._config = config or WorkerPoolConfig()

        # Core components
        self._task_queue = TaskQueue(maxsize=self._config.queue_size)
        self._result_collector = ResultCollector(
            batch_size=self._config.result_batch_size,
        )
        self._workers: List[CrawlWorker] = []
        self._worker_tasks: Dict[int, asyncio.Task] = {}
        self._monitor: Optional[WorkerPoolMonitor] = None

        # Auto-restart tracking
        self._restart_counts: Dict[int, int] = {}

        # Lifecycle
        self._running = False
        self._stop_event = asyncio.Event()
        self._restart_task: Optional[asyncio.Task] = None

    @property
    def task_queue(self) -> TaskQueue:
        """Access the underlying task queue."""
        return self._task_queue

    @property
    def result_collector(self) -> ResultCollector:
        """Access the underlying result collector."""
        return self._result_collector

    async def start(self) -> None:
        """Launch all workers and the health monitor.

        Idempotent: calling start() on an already-running pool is a no-op.
        """
        if self._running:
            logger.warning("Worker pool already running")
            return

        self._running = True
        self._stop_event.clear()

        # Create workers
        self._workers = [
            CrawlWorker(
                worker_id=i,
                engine=self._engine,
                config=self._config,
            )
            for i in range(self._config.n_workers)
        ]

        # Launch worker tasks
        for worker in self._workers:
            task = asyncio.create_task(
                worker.run(self._task_queue, self._result_collector),
                name=f"crawl-worker-{worker.worker_id}",
            )
            self._worker_tasks[worker.worker_id] = task
            self._restart_counts[worker.worker_id] = 0

        # Start health monitor
        self._monitor = WorkerPoolMonitor(self._workers, self._config)
        self._monitor.start()

        # Start auto-restart background task
        self._restart_task = asyncio.create_task(
            self._auto_restart_loop(),
            name="worker-auto-restart",
        )

        logger.info(
            "Worker pool started: %d workers, queue_size=%d",
            self._config.n_workers, self._config.queue_size,
        )

    async def stop(self) -> None:
        """Graceful shutdown: signal all workers, wait for completion.

        Each worker finishes its current task before stopping.
        """
        if not self._running:
            return

        logger.info("Stopping worker pool...")
        self._running = False
        self._stop_event.set()

        # Signal all workers to stop
        for worker in self._workers:
            worker.request_stop()

        # Stop monitor
        if self._monitor:
            self._monitor.stop()

        # Cancel auto-restart
        if self._restart_task and not self._restart_task.done():
            self._restart_task.cancel()
            try:
                await self._restart_task
            except asyncio.CancelledError:
                pass

        # Wait for workers to finish (with timeout)
        if self._worker_tasks:
            pending = [t for t in self._worker_tasks.values() if not t.done()]
            if pending:
                done, still_pending = await asyncio.wait(
                    pending, timeout=self._config.worker_timeout + 5.0
                )
                # Cancel any workers that didn't stop gracefully
                for task in still_pending:
                    task.cancel()
                if still_pending:
                    await asyncio.gather(
                        *still_pending, return_exceptions=True
                    )

        self._worker_tasks.clear()

        logger.info(
            "Worker pool stopped. Total pages: %d, errors: %d",
            sum(w.pages_processed for w in self._workers),
            sum(w.errors for w in self._workers),
        )

    async def submit(
        self,
        url: str,
        domain: str,
        depth: int,
        priority: float = 0.0,
    ) -> asyncio.Future:
        """Submit a single crawl task and return a Future for the result.

        If backpressure is active, this coroutine will wait until
        the queue drops below the threshold before enqueuing.

        Args:
            url: target URL to crawl.
            domain: URL domain.
            depth: frontier depth.
            priority: DQN Q-value (higher = crawl first).

        Returns:
            asyncio.Future resolving to Optional[PageContent].
        """
        # Backpressure: wait if queue is too full
        while self._task_queue.backpressure_active(
            self._config.backpressure_threshold
        ):
            logger.debug(
                "Backpressure active (queue=%d/%d), waiting...",
                self._task_queue.size(), self._config.queue_size,
            )
            await asyncio.sleep(0.1)

        loop = asyncio.get_running_loop()
        future = loop.create_future()

        await self._task_queue.put(
            url=url,
            domain=domain,
            depth=depth,
            priority=priority,
            future=future,
        )

        return future

    async def submit_batch(
        self,
        tasks: List[Tuple[str, str, int, float]],
    ) -> List[asyncio.Future]:
        """Submit multiple crawl tasks at once.

        Args:
            tasks: list of (url, domain, depth, priority) tuples.

        Returns:
            List of Futures in the same order as the input tasks.
        """
        futures = []
        for url, domain, depth, priority in tasks:
            future = await self.submit(url, domain, depth, priority)
            futures.append(future)
        return futures

    async def _auto_restart_loop(self) -> None:
        """Background loop that detects and restarts failed workers.

        Checks every health_check_interval. Respects max_worker_restarts
        to avoid restart storms.
        """
        try:
            while self._running and not self._stop_event.is_set():
                await asyncio.sleep(self._config.health_check_interval)

                if not self._running:
                    break

                for worker in list(self._workers):
                    wid = worker.worker_id
                    task = self._worker_tasks.get(wid)

                    # Check if the worker's asyncio.Task has exited
                    needs_restart = (
                        task is not None
                        and task.done()
                        and worker.state == WorkerState.FAILED
                    )

                    if needs_restart:
                        restarts = self._restart_counts.get(wid, 0)
                        if restarts >= self._config.max_worker_restarts:
                            logger.error(
                                "Worker %d exceeded max restarts (%d), "
                                "leaving dead",
                                wid, self._config.max_worker_restarts,
                            )
                            continue

                        logger.warning(
                            "Restarting worker %d (restart #%d)",
                            wid, restarts + 1,
                        )
                        await asyncio.sleep(self._config.restart_cooldown)

                        # Create replacement worker
                        new_worker = CrawlWorker(
                            worker_id=wid,
                            engine=self._engine,
                            config=self._config,
                        )
                        new_task = asyncio.create_task(
                            new_worker.run(
                                self._task_queue, self._result_collector
                            ),
                            name=f"crawl-worker-{wid}",
                        )

                        # Swap in-place
                        idx = next(
                            i for i, w in enumerate(self._workers)
                            if w.worker_id == wid
                        )
                        self._workers[idx] = new_worker
                        self._worker_tasks[wid] = new_task
                        self._restart_counts[wid] = restarts + 1

                        # Update monitor's reference
                        if self._monitor:
                            self._monitor._workers = self._workers

        except asyncio.CancelledError:
            pass

    def get_stats(self) -> Dict[str, Any]:
        """Aggregate pool statistics.

        Returns:
            Dict with workers_active, queue_depth, throughput, errors,
            plus sub-component stats.
        """
        active = sum(
            1 for w in self._workers
            if w.state in (WorkerState.IDLE, WorkerState.BUSY)
        )
        total_pages = sum(w.pages_processed for w in self._workers)
        total_errors = sum(w.errors for w in self._workers)
        throughput = self._monitor.get_throughput() if self._monitor else 0.0

        return {
            "workers_active": active,
            "workers_total": len(self._workers),
            "queue_depth": self._task_queue.size(),
            "throughput_pps": round(throughput, 2),
            "total_pages": total_pages,
            "errors": total_errors,
            "restarts": dict(self._restart_counts),
            "task_queue": self._task_queue.get_stats(),
            "result_collector": self._result_collector.get_stats(),
            "health": (
                self._monitor.get_health().value if self._monitor else "unknown"
            ),
        }

    def get_health(self) -> PoolHealth:
        """Current pool health assessment."""
        if self._monitor:
            return self._monitor.get_health()
        return PoolHealth.UNHEALTHY if not self._running else PoolHealth.HEALTHY

    def get_per_worker_stats(self) -> List[Dict[str, Any]]:
        """Per-worker statistics."""
        if self._monitor:
            return self._monitor.get_per_worker_stats()
        return [w.get_stats() for w in self._workers]

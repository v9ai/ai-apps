"""
Browser pool with lifecycle management for Playwright instances.

Manages a pool of Playwright browser contexts with:
1. BrowserPoolConfig: tunables for pool size, recycling, health checks
2. BrowserInstance: tracks per-instance state (pages served, health, age)
3. BrowserPool: async context manager with acquire/release, health checks,
   zombie cleanup, memory budgeting
4. PooledFetcher: drop-in replacement for PlaywrightFetcher using the pool

Target: Apple M1 16GB. ~4 Chromium instances max (~150-200 MB each).
Contexts are recycled after N pages to prevent Chromium memory leaks.
"""

from __future__ import annotations

import asyncio
import logging
import os
import signal
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import psutil

from crawler_engine import ContentExtractor, CrawlerConfig, PageContent

logger = logging.getLogger("crawler_browser_pool")


# ======================= Configuration ======================================

@dataclass
class BrowserPoolConfig:
    """Tunables for the browser instance pool.

    Defaults target M1 16GB: ~4 Chromium processes, each ~150-200 MB RSS.
    max_memory_mb caps total pool memory to avoid swapping.
    """

    max_instances: int = 4
    max_pages_per_context: int = 50
    health_check_interval: float = 30.0
    page_timeout_ms: int = 15_000
    context_timeout_ms: int = 300_000  # 5 min max context lifetime
    headless: bool = True
    browser_type: str = "chromium"
    user_agent: str = "ScrapusBot/1.0 (+https://scrapus.dev/bot)"

    # Memory budget (M1 16GB: crawl stage gets ~750 MB)
    max_memory_mb: float = 700.0
    estimated_instance_mb: float = 180.0  # per-instance RSS estimate

    # Zombie detection
    zombie_check_interval: float = 60.0
    orphan_process_max_age_s: float = 600.0  # 10 min


# ======================= Browser Instance ===================================

@dataclass
class BrowserInstance:
    """Tracks a single Playwright browser + context pair.

    Fields:
        browser: Playwright Browser object.
        context: Playwright BrowserContext object.
        pages_served: number of pages fetched through this context.
        created_at: monotonic timestamp when this context was created.
        last_used: monotonic timestamp of the most recent acquire.
        is_healthy: set to False when a health check or fetch fails.
    """

    browser: Any
    context: Any
    pages_served: int = 0
    created_at: float = field(default_factory=time.monotonic)
    last_used: float = field(default_factory=time.monotonic)
    is_healthy: bool = True

    @property
    def age_s(self) -> float:
        """Seconds since this context was created."""
        return time.monotonic() - self.created_at

    @property
    def is_stale(self) -> bool:
        """True if the context has exceeded its page or time budget."""
        return False  # checked externally with config thresholds


# ======================= Pool Statistics ====================================

@dataclass
class PoolStats:
    """Aggregate statistics for monitoring the browser pool."""

    instances_active: int = 0
    instances_idle: int = 0
    instances_recycled: int = 0
    zombie_kills: int = 0
    total_pages_served: int = 0
    memory_mb: float = 0.0
    health_checks_run: int = 0
    acquire_waits: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "instances_active": self.instances_active,
            "instances_idle": self.instances_idle,
            "instances_recycled": self.instances_recycled,
            "zombie_kills": self.zombie_kills,
            "total_pages_served": self.total_pages_served,
            "memory_mb": round(self.memory_mb, 1),
            "health_checks_run": self.health_checks_run,
            "acquire_waits": self.acquire_waits,
        }


# ======================= Browser Pool =======================================

class BrowserPool:
    """Async pool of Playwright browser contexts.

    Usage as async context manager::

        async with BrowserPool(config) as pool:
            instance = await pool.acquire()
            try:
                page = await instance.context.new_page()
                ...
            finally:
                await pool.release(instance)

    Lifecycle:
    - ``acquire()`` returns a healthy instance, creating or recycling as needed.
    - ``release()`` returns the instance to the idle set.
    - A background task runs ``_health_check()`` every ``config.health_check_interval``
      seconds and ``_cleanup_zombies()`` every ``config.zombie_check_interval`` seconds.
    - Instances are recycled when they exceed ``max_pages_per_context`` or
      ``context_timeout_ms``.
    - Memory is tracked via psutil; new instances are refused when the pool
      would exceed ``max_memory_mb``.
    """

    def __init__(self, config: Optional[BrowserPoolConfig] = None) -> None:
        self.config = config or BrowserPoolConfig()
        self._playwright: Any = None
        self._idle: List[BrowserInstance] = []
        self._active: List[BrowserInstance] = []
        self._lock = asyncio.Lock()
        self._stats = PoolStats()
        self._health_task: Optional[asyncio.Task] = None
        self._zombie_task: Optional[asyncio.Task] = None
        self._closed = False

    # ---- Async context manager ----

    async def __aenter__(self) -> "BrowserPool":
        await self._start()
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self._shutdown()

    async def _start(self) -> None:
        """Launch Playwright and start background tasks."""
        from playwright.async_api import async_playwright

        self._playwright = await async_playwright().start()
        self._health_task = asyncio.create_task(self._health_check_loop())
        self._zombie_task = asyncio.create_task(self._zombie_check_loop())
        logger.info(
            "BrowserPool started (max_instances=%d, browser=%s, headless=%s)",
            self.config.max_instances,
            self.config.browser_type,
            self.config.headless,
        )

    async def _shutdown(self) -> None:
        """Close all instances and stop Playwright."""
        self._closed = True

        # Cancel background tasks
        for task in (self._health_task, self._zombie_task):
            if task is not None and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        # Close all instances
        async with self._lock:
            all_instances = self._idle + self._active
            self._idle.clear()
            self._active.clear()

        for inst in all_instances:
            await self._close_instance(inst)

        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

        logger.info(
            "BrowserPool shut down (total_pages=%d, recycled=%d, zombies=%d)",
            self._stats.total_pages_served,
            self._stats.instances_recycled,
            self._stats.zombie_kills,
        )

    # ---- Acquire / Release ----

    async def acquire(self) -> BrowserInstance:
        """Get a healthy browser instance from the pool.

        Creates a new instance if the pool is empty and under limits.
        Recycles stale instances before returning them.
        Blocks if at capacity until an instance is released.

        Returns:
            A BrowserInstance with a valid context.

        Raises:
            RuntimeError: if the pool is shut down.
        """
        if self._closed:
            raise RuntimeError("BrowserPool is shut down")

        while True:
            async with self._lock:
                # Try to find a healthy, non-stale idle instance
                while self._idle:
                    inst = self._idle.pop(0)
                    if not inst.is_healthy:
                        await self._close_instance(inst)
                        continue
                    if self._is_stale(inst):
                        await self._recycle(inst)
                        # _recycle puts a fresh instance in _idle
                        continue
                    inst.last_used = time.monotonic()
                    self._active.append(inst)
                    self._update_stats()
                    return inst

                # No idle instances: create one if under limits
                total = len(self._active) + len(self._idle)
                if total < self.config.max_instances and self._has_memory_budget():
                    inst = await self._create_instance()
                    inst.last_used = time.monotonic()
                    self._active.append(inst)
                    self._update_stats()
                    return inst

            # At capacity: wait for a release
            self._stats.acquire_waits += 1
            logger.debug("Pool at capacity (%d), waiting for release", self.config.max_instances)
            await asyncio.sleep(0.1)

    async def release(self, instance: BrowserInstance) -> None:
        """Return an instance to the idle pool.

        Increments pages_served. Instances that have exceeded their page
        budget are recycled immediately.
        """
        instance.pages_served += 1
        self._stats.total_pages_served += 1

        async with self._lock:
            if instance in self._active:
                self._active.remove(instance)

            if not instance.is_healthy:
                await self._close_instance(instance)
            elif self._is_stale(instance):
                await self._recycle(instance)
            else:
                self._idle.append(instance)

            self._update_stats()

    # ---- Instance lifecycle ----

    async def _create_instance(self) -> BrowserInstance:
        """Launch a new browser and create a context."""
        browser_launcher = getattr(self._playwright, self.config.browser_type)
        browser = await browser_launcher.launch(headless=self.config.headless)
        context = await browser.new_context(
            user_agent=self.config.user_agent,
            java_script_enabled=True,
            ignore_https_errors=True,
        )
        inst = BrowserInstance(browser=browser, context=context)
        logger.debug("Created new browser instance (total=%d)", self._instance_count + 1)
        return inst

    async def _close_instance(self, instance: BrowserInstance) -> None:
        """Safely close a browser instance and its context."""
        try:
            if instance.context:
                await instance.context.close()
        except Exception as exc:
            logger.debug("Error closing context: %s", exc)
        try:
            if instance.browser:
                await instance.browser.close()
        except Exception as exc:
            logger.debug("Error closing browser: %s", exc)
        instance.is_healthy = False

    async def _recycle(self, instance: BrowserInstance) -> None:
        """Close an old context and create a fresh one on the same browser.

        If the browser itself is unhealthy, creates an entirely new instance.
        """
        self._stats.instances_recycled += 1
        pages_served = instance.pages_served
        age = instance.age_s

        try:
            if instance.context:
                await instance.context.close()
            # Create a new context on the existing browser
            context = await instance.browser.new_context(
                user_agent=self.config.user_agent,
                java_script_enabled=True,
                ignore_https_errors=True,
            )
            fresh = BrowserInstance(browser=instance.browser, context=context)
            self._idle.append(fresh)
            logger.info(
                "Recycled context (pages=%d, age=%.0fs)", pages_served, age
            )
        except Exception as exc:
            # Browser itself is dead; create a completely new instance
            logger.warning("Recycle failed, creating new instance: %s", exc)
            await self._close_instance(instance)
            try:
                fresh = await self._create_instance()
                self._idle.append(fresh)
            except Exception as exc2:
                logger.error("Failed to create replacement instance: %s", exc2)

    def _is_stale(self, instance: BrowserInstance) -> bool:
        """Check if an instance has exceeded its page or time budget."""
        if instance.pages_served >= self.config.max_pages_per_context:
            return True
        if instance.age_s * 1000 >= self.config.context_timeout_ms:
            return True
        return False

    # ---- Memory tracking ----

    def _has_memory_budget(self) -> bool:
        """Check if spawning another instance would stay within memory budget."""
        current_mb = self._estimate_pool_memory_mb()
        projected = current_mb + self.config.estimated_instance_mb
        if projected > self.config.max_memory_mb:
            logger.debug(
                "Memory budget exceeded (current=%.0f MB, projected=%.0f MB, limit=%.0f MB)",
                current_mb,
                projected,
                self.config.max_memory_mb,
            )
            return False
        return True

    def _estimate_pool_memory_mb(self) -> float:
        """Estimate total RSS of Chromium child processes owned by this pool."""
        try:
            current = psutil.Process()
            children = current.children(recursive=True)
            chromium_rss = 0.0
            for child in children:
                try:
                    name = child.name().lower()
                    if "chrom" in name or "headless" in name:
                        chromium_rss += child.memory_info().rss
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            return chromium_rss / (1024 * 1024)
        except Exception:
            # Fallback: estimate from instance count
            return self._instance_count * self.config.estimated_instance_mb

    # ---- Health checks ----

    async def _health_check_loop(self) -> None:
        """Periodic health check for all idle instances."""
        while not self._closed:
            try:
                await asyncio.sleep(self.config.health_check_interval)
                await self._health_check()
            except asyncio.CancelledError:
                return
            except Exception as exc:
                logger.error("Health check loop error: %s", exc)

    async def _health_check(self) -> None:
        """Ping each idle instance; mark unhealthy ones for removal."""
        self._stats.health_checks_run += 1
        async with self._lock:
            healthy: List[BrowserInstance] = []
            for inst in self._idle:
                if await self._ping_instance(inst):
                    healthy.append(inst)
                else:
                    logger.warning(
                        "Instance failed health check (pages=%d, age=%.0fs)",
                        inst.pages_served,
                        inst.age_s,
                    )
                    await self._close_instance(inst)
            self._idle = healthy
            self._update_stats()

    async def _ping_instance(self, instance: BrowserInstance) -> bool:
        """Verify an instance is still responsive by creating and closing a page."""
        try:
            page = await asyncio.wait_for(
                instance.context.new_page(), timeout=5.0
            )
            await page.close()
            return True
        except Exception:
            instance.is_healthy = False
            return False

    # ---- Zombie cleanup ----

    async def _zombie_check_loop(self) -> None:
        """Periodic cleanup of orphaned Chromium processes."""
        while not self._closed:
            try:
                await asyncio.sleep(self.config.zombie_check_interval)
                await self._cleanup_zombies()
            except asyncio.CancelledError:
                return
            except Exception as exc:
                logger.error("Zombie check loop error: %s", exc)

    async def _cleanup_zombies(self) -> None:
        """Detect and kill orphaned Chromium processes.

        Finds Chromium processes whose parent PID is 1 (reparented to init)
        or whose parent is no longer our process tree. Only kills processes
        older than orphan_process_max_age_s.
        """
        our_pid = os.getpid()
        killed = 0

        try:
            for proc in psutil.process_iter(["pid", "ppid", "name", "create_time"]):
                try:
                    info = proc.info
                    name = (info.get("name") or "").lower()
                    if "chrom" not in name and "headless" not in name:
                        continue

                    ppid = info.get("ppid", 0)
                    create_time = info.get("create_time", 0)
                    age = time.time() - create_time

                    # Skip young processes
                    if age < self.config.orphan_process_max_age_s:
                        continue

                    # Check if this is an orphan (parent is init/launchd or not us)
                    is_orphan = False
                    if ppid in (0, 1):
                        is_orphan = True
                    else:
                        try:
                            parent = psutil.Process(ppid)
                            # Walk up to see if we are an ancestor
                            ancestors = set()
                            p = parent
                            while p is not None:
                                ancestors.add(p.pid)
                                try:
                                    p = p.parent()
                                except (psutil.NoSuchProcess, psutil.AccessDenied):
                                    break
                            if our_pid not in ancestors and ppid != our_pid:
                                is_orphan = True
                        except psutil.NoSuchProcess:
                            is_orphan = True

                    if is_orphan:
                        logger.warning(
                            "Killing zombie Chromium (pid=%d, age=%.0fs)",
                            info["pid"],
                            age,
                        )
                        os.kill(info["pid"], signal.SIGTERM)
                        killed += 1
                        self._stats.zombie_kills += 1

                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as exc:
            logger.error("Zombie cleanup error: %s", exc)

        if killed > 0:
            logger.info("Cleaned up %d zombie Chromium processes", killed)

    # ---- Helpers ----

    @property
    def _instance_count(self) -> int:
        return len(self._idle) + len(self._active)

    @property
    def stats(self) -> PoolStats:
        """Current pool statistics (read-only snapshot)."""
        self._update_stats()
        return self._stats

    def _update_stats(self) -> None:
        """Refresh stat counters from current pool state."""
        self._stats.instances_active = len(self._active)
        self._stats.instances_idle = len(self._idle)
        self._stats.memory_mb = self._estimate_pool_memory_mb()


# ======================= Pooled Fetcher =====================================

class PooledFetcher:
    """Drop-in replacement for PlaywrightFetcher backed by BrowserPool.

    Same interface: ``start()``, ``fetch_page(url)``, ``stop()``.
    Uses the pool internally and retries on context crash by acquiring
    a fresh instance.

    Usage::

        fetcher = PooledFetcher(crawler_config, pool_config)
        await fetcher.start()
        content = await fetcher.fetch_page("https://example.com")
        await fetcher.stop()
    """

    def __init__(
        self,
        crawler_config: Optional[CrawlerConfig] = None,
        pool_config: Optional[BrowserPoolConfig] = None,
    ) -> None:
        self.crawler_config = crawler_config or CrawlerConfig()
        self.pool_config = pool_config or BrowserPoolConfig(
            headless=self.crawler_config.headless,
            browser_type=self.crawler_config.browser_type,
            page_timeout_ms=self.crawler_config.page_timeout_ms,
            user_agent=self.crawler_config.user_agent,
        )
        self._pool: Optional[BrowserPool] = None
        self._extractor = ContentExtractor(self.crawler_config)
        self._max_retries = 2

    async def start(self) -> None:
        """Launch the browser pool."""
        self._pool = BrowserPool(self.pool_config)
        await self._pool.__aenter__()
        logger.info("PooledFetcher started")

    async def fetch_page(self, url: str) -> Optional[PageContent]:
        """Fetch a URL with JS rendering and extract content.

        Acquires a browser instance from the pool, creates a page, fetches
        the URL, and extracts content. On context crash, retries with a
        fresh instance up to ``_max_retries`` times.

        Returns None on failure (timeout, navigation error, etc.).
        """
        if self._pool is None:
            raise RuntimeError("PooledFetcher not started; call start() first")

        last_error: Optional[Exception] = None
        for attempt in range(1, self._max_retries + 1):
            instance = await self._pool.acquire()
            try:
                content = await self._fetch_with_instance(instance, url)
                await self._pool.release(instance)
                return content
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Fetch attempt %d/%d failed for %s: %s",
                    attempt,
                    self._max_retries,
                    url,
                    exc,
                )
                # Mark unhealthy so pool replaces it
                instance.is_healthy = False
                await self._pool.release(instance)

        logger.debug("All fetch attempts exhausted for %s: %s", url, last_error)
        return None

    async def _fetch_with_instance(
        self, instance: BrowserInstance, url: str
    ) -> Optional[PageContent]:
        """Fetch a single page using a specific browser instance."""
        page = await instance.context.new_page()
        try:
            response = await page.goto(
                url,
                timeout=self.pool_config.page_timeout_ms,
                wait_until="domcontentloaded",
            )
            if response is None:
                return None

            # Wait for main content to settle
            try:
                await page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass  # networkidle timeout is acceptable

            content = await self._extractor.extract(page, url)
            content.status_code = response.status
            content.content_type = response.headers.get("content-type", "")
            return content

        except Exception as exc:
            logger.debug("Page fetch error for %s: %s", url, exc)
            raise
        finally:
            try:
                await page.close()
            except Exception:
                pass

    async def stop(self) -> None:
        """Shut down the browser pool."""
        if self._pool is not None:
            await self._pool.__aexit__(None, None, None)
            self._pool = None
        logger.info("PooledFetcher stopped")

    @property
    def stats(self) -> Optional[PoolStats]:
        """Current pool statistics, or None if not started."""
        if self._pool is None:
            return None
        return self._pool.stats

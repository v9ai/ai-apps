"""
Advanced rate limiting for the async crawler engine.

Implements a composable rate-limiting stack:
1. TokenBucket: Classic token bucket algorithm for smooth rate control
2. SlidingWindowLimiter: Precise request-count limiter over a sliding window
3. AdaptiveRateLimiter: AIMD-based auto-tuning from server response signals
4. DomainRateLimiterPool: Per-domain rate limiters with automatic lifecycle
5. GlobalRateLimiter: Overall crawler throughput cap
6. RateLimiterMiddleware: Composable middleware chaining all limiters

Chain: GlobalRateLimiter -> DomainRateLimiterPool -> PolitenessManager

Target: Apple M1 16GB, zero cloud dependency.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, Optional, Tuple
from urllib.parse import urlparse

from crawler_engine import CrawlerConfig, PolitenessManager

logger = logging.getLogger("crawler_rate_limiter")


# ======================= Token Bucket ========================================

class TokenBucket:
    """Classic token bucket algorithm for smooth rate limiting.

    Tokens regenerate at a fixed rate up to a maximum capacity (burst).
    Callers consume tokens on each request; if insufficient tokens exist,
    ``acquire()`` blocks until enough regenerate.

    Memory: ~100 bytes per instance.
    """

    def __init__(self, rate: float, capacity: float) -> None:
        """Initialise the token bucket.

        Args:
            rate: Token regeneration rate (tokens per second).
            capacity: Maximum tokens the bucket can hold (burst size).
        """
        if rate <= 0:
            raise ValueError("rate must be positive")
        if capacity <= 0:
            raise ValueError("capacity must be positive")

        self._rate = rate
        self._capacity = capacity
        self._tokens = capacity
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    def _refill(self) -> None:
        """Add tokens based on elapsed time since last refill."""
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(self._capacity, self._tokens + elapsed * self._rate)
        self._last_refill = now

    async def acquire(self, tokens: float = 1.0) -> None:
        """Block until ``tokens`` are available, then consume them.

        Args:
            tokens: Number of tokens to consume (default 1).
        """
        if tokens > self._capacity:
            raise ValueError(
                f"requested {tokens} tokens exceeds capacity {self._capacity}"
            )

        while True:
            async with self._lock:
                self._refill()
                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return
                # Calculate wait time until enough tokens regenerate
                deficit = tokens - self._tokens
                wait = deficit / self._rate

            await asyncio.sleep(wait)

    def try_acquire(self, tokens: float = 1.0) -> bool:
        """Non-blocking attempt to consume tokens.

        Args:
            tokens: Number of tokens to consume (default 1).

        Returns:
            True if tokens were consumed, False if insufficient.
        """
        self._refill()
        if self._tokens >= tokens:
            self._tokens -= tokens
            return True
        return False

    def available(self) -> float:
        """Return the current number of available tokens."""
        self._refill()
        return self._tokens


# ======================= Sliding Window Limiter ==============================

class SlidingWindowLimiter:
    """Sliding window rate limiter tracking actual request timestamps.

    More precise than token bucket for bursty traffic: counts exact requests
    in the last ``window_seconds`` rather than relying on token regeneration.

    Memory: O(max_requests) per instance — bounded by the window cap.
    """

    def __init__(self, max_requests: int, window_seconds: float) -> None:
        """Initialise the sliding window limiter.

        Args:
            max_requests: Maximum requests allowed within the window.
            window_seconds: Window duration in seconds.
        """
        if max_requests <= 0:
            raise ValueError("max_requests must be positive")
        if window_seconds <= 0:
            raise ValueError("window_seconds must be positive")

        self._max_requests = max_requests
        self._window = window_seconds
        self._timestamps: Deque[float] = deque()
        self._lock = asyncio.Lock()

    def _evict_expired(self) -> None:
        """Remove timestamps outside the current window."""
        cutoff = time.monotonic() - self._window
        while self._timestamps and self._timestamps[0] < cutoff:
            self._timestamps.popleft()

    async def acquire(self) -> None:
        """Block until a request slot is available in the window."""
        while True:
            async with self._lock:
                self._evict_expired()
                if len(self._timestamps) < self._max_requests:
                    self._timestamps.append(time.monotonic())
                    return

                # Wait until the oldest request exits the window
                oldest = self._timestamps[0]
                wait = (oldest + self._window) - time.monotonic()

            if wait > 0:
                await asyncio.sleep(wait)

    def try_acquire(self) -> bool:
        """Non-blocking attempt to acquire a request slot.

        Returns:
            True if slot was acquired, False if window is full.
        """
        self._evict_expired()
        if len(self._timestamps) < self._max_requests:
            self._timestamps.append(time.monotonic())
            return True
        return False


# ======================= Adaptive Rate Limiter ===============================

@dataclass
class _AdaptiveState:
    """Internal mutable state for AdaptiveRateLimiter."""

    current_rate: float = 1.0
    consecutive_successes: int = 0
    consecutive_failures: int = 0
    total_requests: int = 0
    total_successes: int = 0
    total_failures: int = 0
    total_latency_ms: float = 0.0
    last_adjustment: float = field(default_factory=time.monotonic)


class AdaptiveRateLimiter:
    """Auto-adjusts request rate based on server response signals.

    Strategies:
    - AIMD (Additive Increase, Multiplicative Decrease) like TCP congestion
      control: additive increase on success, multiplicative decrease on failure.
    - Success streak: after 100 consecutive successes, increase rate by 10%.
    - Failure: immediately halve the rate.
    - 429 response: honour Retry-After header if present, else exponential
      backoff.

    Memory: ~200 bytes per instance.
    """

    # AIMD constants
    _ADDITIVE_INCREASE: float = 0.1  # req/s per success batch
    _MULTIPLICATIVE_DECREASE: float = 0.5  # halve on failure
    _SUCCESS_STREAK_THRESHOLD: int = 100
    _SUCCESS_STREAK_BUMP: float = 0.10  # 10% increase

    def __init__(
        self,
        base_rate: float,
        min_rate: float = 0.1,
        max_rate: float = 20.0,
    ) -> None:
        """Initialise the adaptive rate limiter.

        Args:
            base_rate: Starting request rate (requests per second).
            min_rate: Floor — rate never drops below this.
            max_rate: Ceiling — rate never rises above this.
        """
        if not (0 < min_rate <= base_rate <= max_rate):
            raise ValueError(
                f"must satisfy 0 < min_rate <= base_rate <= max_rate, "
                f"got min_rate={min_rate}, base_rate={base_rate}, max_rate={max_rate}"
            )

        self._base_rate = base_rate
        self._min_rate = min_rate
        self._max_rate = max_rate
        self._state = _AdaptiveState(current_rate=base_rate)
        self._lock = asyncio.Lock()
        # Retry-After tracking: timestamp when requests may resume
        self._retry_after: Optional[float] = None

    def _clamp_rate(self, rate: float) -> float:
        """Clamp rate to [min_rate, max_rate]."""
        return max(self._min_rate, min(self._max_rate, rate))

    async def record_response(
        self, status_code: int, latency_ms: float
    ) -> None:
        """Update rate based on a server response.

        Args:
            status_code: HTTP status code from the response.
            latency_ms: Request latency in milliseconds.
        """
        async with self._lock:
            s = self._state
            s.total_requests += 1
            s.total_latency_ms += latency_ms

            if status_code == 429:
                # Rate-limited: aggressive backoff
                s.consecutive_successes = 0
                s.consecutive_failures += 1
                s.total_failures += 1
                s.current_rate = self._clamp_rate(
                    s.current_rate * self._MULTIPLICATIVE_DECREASE
                )
                logger.info(
                    "429 received — rate halved to %.2f req/s",
                    s.current_rate,
                )
            elif status_code >= 500:
                # Server error: moderate backoff
                s.consecutive_successes = 0
                s.consecutive_failures += 1
                s.total_failures += 1
                s.current_rate = self._clamp_rate(
                    s.current_rate * self._MULTIPLICATIVE_DECREASE
                )
                logger.debug(
                    "5xx received — rate decreased to %.2f req/s",
                    s.current_rate,
                )
            elif 200 <= status_code < 400:
                # Success: additive increase
                s.consecutive_failures = 0
                s.consecutive_successes += 1
                s.total_successes += 1

                # AIMD additive increase (every 10 successes, bump)
                if s.consecutive_successes % 10 == 0:
                    s.current_rate = self._clamp_rate(
                        s.current_rate + self._ADDITIVE_INCREASE
                    )

                # Success streak bonus
                if s.consecutive_successes >= self._SUCCESS_STREAK_THRESHOLD:
                    if s.consecutive_successes % self._SUCCESS_STREAK_THRESHOLD == 0:
                        s.current_rate = self._clamp_rate(
                            s.current_rate * (1.0 + self._SUCCESS_STREAK_BUMP)
                        )
                        logger.info(
                            "Success streak %d — rate bumped to %.2f req/s",
                            s.consecutive_successes,
                            s.current_rate,
                        )
            else:
                # 4xx client errors (not 429): count as failure but milder
                s.consecutive_successes = 0
                s.consecutive_failures += 1
                s.total_failures += 1

    def record_retry_after(self, seconds: float) -> None:
        """Record a Retry-After signal (from 429 response header).

        Args:
            seconds: Seconds to wait before retrying.
        """
        self._retry_after = time.monotonic() + seconds
        logger.info("Retry-After set: %.1f seconds", seconds)

    async def wait_if_retry_after(self) -> float:
        """If a Retry-After deadline is active, block until it passes.

        Returns:
            Seconds waited (0.0 if no Retry-After was active).
        """
        if self._retry_after is None:
            return 0.0

        now = time.monotonic()
        if now >= self._retry_after:
            self._retry_after = None
            return 0.0

        wait = self._retry_after - now
        await asyncio.sleep(wait)
        self._retry_after = None
        return wait

    def get_current_rate(self) -> float:
        """Return the current adapted request rate (requests per second)."""
        return self._state.current_rate

    def get_stats(self) -> Dict[str, Any]:
        """Return diagnostic stats for the adaptive limiter."""
        s = self._state
        avg_latency = (
            s.total_latency_ms / s.total_requests if s.total_requests > 0 else 0.0
        )
        return {
            "current_rate": s.current_rate,
            "base_rate": self._base_rate,
            "total_requests": s.total_requests,
            "total_successes": s.total_successes,
            "total_failures": s.total_failures,
            "consecutive_successes": s.consecutive_successes,
            "consecutive_failures": s.consecutive_failures,
            "avg_latency_ms": round(avg_latency, 2),
        }


# ======================= Domain Rate Limiter Pool ============================

@dataclass
class _DomainEntry:
    """Per-domain limiter state."""

    bucket: TokenBucket
    adaptive: AdaptiveRateLimiter
    last_used: float = field(default_factory=time.monotonic)
    request_count: int = 0


class DomainRateLimiterPool:
    """Per-domain rate limiters with automatic creation and cleanup.

    Each domain gets its own TokenBucket (for smooth pacing) plus an
    AdaptiveRateLimiter (for server-response-driven tuning). Idle domain
    limiters are cleaned up after 1 hour.

    Memory: ~500 bytes per active domain.
    """

    _IDLE_TTL: float = 3600.0  # 1 hour

    def __init__(self, config: CrawlerConfig) -> None:
        self._config = config
        self._domains: Dict[str, _DomainEntry] = {}
        self._overrides: Dict[str, float] = {}  # domain -> custom rate
        self._lock = asyncio.Lock()

    def _default_rate(self, domain: str) -> float:
        """Return the rate for a domain, respecting overrides."""
        if domain in self._overrides:
            return self._overrides[domain]
        # Convert crawl delay to requests/sec
        return 1.0 / max(self._config.default_crawl_delay, 0.1)

    def _get_or_create(self, domain: str) -> _DomainEntry:
        """Get existing or create new limiter entry for a domain."""
        if domain not in self._domains:
            rate = self._default_rate(domain)
            self._domains[domain] = _DomainEntry(
                bucket=TokenBucket(rate=rate, capacity=max(rate * 2, 1.0)),
                adaptive=AdaptiveRateLimiter(
                    base_rate=rate,
                    min_rate=max(rate * 0.1, 0.05),
                    max_rate=rate * 5.0,
                ),
            )
        return self._domains[domain]

    async def acquire(self, domain: str) -> None:
        """Enforce domain-specific rate limit. Blocks until permitted.

        Args:
            domain: The target domain.
        """
        async with self._lock:
            entry = self._get_or_create(domain)

        # Wait for any active Retry-After deadline
        await entry.adaptive.wait_if_retry_after()

        # Acquire from the token bucket at the adaptive rate
        # Adjust bucket rate to match adaptive rate
        adaptive_rate = entry.adaptive.get_current_rate()
        if abs(entry.bucket._rate - adaptive_rate) > 0.01:
            entry.bucket._rate = adaptive_rate

        await entry.bucket.acquire()
        entry.last_used = time.monotonic()
        entry.request_count += 1

    async def record_response(
        self, domain: str, status_code: int, latency_ms: float
    ) -> None:
        """Record a response for adaptive rate adjustment.

        Args:
            domain: The domain that responded.
            status_code: HTTP status code.
            latency_ms: Request latency in milliseconds.
        """
        async with self._lock:
            entry = self._get_or_create(domain)

        await entry.adaptive.record_response(status_code, latency_ms)

    def record_retry_after(self, domain: str, seconds: float) -> None:
        """Record a Retry-After header for a domain.

        Args:
            domain: The domain that sent the Retry-After header.
            seconds: Seconds to wait.
        """
        if domain in self._domains:
            self._domains[domain].adaptive.record_retry_after(seconds)

    def set_rate(self, domain: str, rate: float) -> None:
        """Configure a specific rate override for a domain.

        Args:
            domain: The target domain.
            rate: Desired request rate (requests per second).
        """
        self._overrides[domain] = rate
        # Rebuild the domain entry if it already exists
        if domain in self._domains:
            self._domains[domain] = _DomainEntry(
                bucket=TokenBucket(rate=rate, capacity=max(rate * 2, 1.0)),
                adaptive=AdaptiveRateLimiter(
                    base_rate=rate,
                    min_rate=max(rate * 0.1, 0.05),
                    max_rate=rate * 5.0,
                ),
            )

    def get_domain_rates(self) -> Dict[str, float]:
        """Return current adaptive rates for all tracked domains."""
        return {
            domain: entry.adaptive.get_current_rate()
            for domain, entry in self._domains.items()
        }

    async def cleanup_idle(self) -> int:
        """Remove domain limiters idle for more than 1 hour.

        Returns:
            Number of domains cleaned up.
        """
        now = time.monotonic()
        to_remove: list[str] = []

        async with self._lock:
            for domain, entry in self._domains.items():
                if now - entry.last_used > self._IDLE_TTL:
                    to_remove.append(domain)
            for domain in to_remove:
                del self._domains[domain]
                logger.debug("Cleaned up idle domain limiter: %s", domain)

        return len(to_remove)


# ======================= Global Rate Limiter =================================

class GlobalRateLimiter:
    """Overall crawler throughput cap.

    Prevents overwhelming the local network or machine regardless of
    how many domains are being crawled concurrently.

    Uses a token bucket sized to the global pages-per-second target.

    Memory: ~100 bytes.
    """

    def __init__(self, max_pages_per_second: float = 20.0) -> None:
        """Initialise the global rate limiter.

        Args:
            max_pages_per_second: Maximum total pages per second across
                all domains (default 20).
        """
        if max_pages_per_second <= 0:
            raise ValueError("max_pages_per_second must be positive")

        self._bucket = TokenBucket(
            rate=max_pages_per_second,
            capacity=max_pages_per_second * 2,  # allow short bursts
        )
        self._max_rate = max_pages_per_second
        self._total_acquired = 0
        self._started_at = time.monotonic()

    async def acquire(self) -> None:
        """Block until a global request slot is available."""
        await self._bucket.acquire()
        self._total_acquired += 1

    def try_acquire(self) -> bool:
        """Non-blocking attempt to acquire a global slot.

        Returns:
            True if slot was acquired, False otherwise.
        """
        if self._bucket.try_acquire():
            self._total_acquired += 1
            return True
        return False

    def get_effective_rate(self) -> float:
        """Return the actual observed throughput (pages/sec)."""
        elapsed = time.monotonic() - self._started_at
        if elapsed <= 0:
            return 0.0
        return self._total_acquired / elapsed

    def get_stats(self) -> Dict[str, Any]:
        """Return global rate limiter statistics."""
        return {
            "max_rate": self._max_rate,
            "effective_rate": round(self.get_effective_rate(), 2),
            "total_acquired": self._total_acquired,
            "available_tokens": round(self._bucket.available(), 2),
        }


# ======================= Rate Limiter Middleware ==============================

@dataclass
class _MiddlewareStats:
    """Accumulated stats for RateLimiterMiddleware."""

    total_requests: int = 0
    total_delay_ms: float = 0.0
    domains_throttled: set = field(default_factory=set)
    global_waits: int = 0
    domain_waits: int = 0
    politeness_waits: int = 0


class RateLimiterMiddleware:
    """Composable middleware for the fetch pipeline.

    Chains: GlobalRateLimiter -> DomainRateLimiterPool -> PolitenessManager

    Call ``pre_request()`` before fetching and ``post_response()`` after.
    The middleware enforces all three rate limiting layers in sequence.

    Memory: ~1 KB + per-domain overhead from the pool.
    """

    def __init__(
        self,
        config: CrawlerConfig,
        *,
        global_limiter: Optional[GlobalRateLimiter] = None,
        domain_pool: Optional[DomainRateLimiterPool] = None,
        politeness: Optional[PolitenessManager] = None,
    ) -> None:
        """Initialise the middleware.

        Args:
            config: Crawler configuration.
            global_limiter: Optional pre-configured global limiter (created
                if not supplied).
            domain_pool: Optional pre-configured domain pool (created if
                not supplied).
            politeness: Optional pre-configured PolitenessManager (created
                if not supplied).
        """
        self._config = config
        self._global = global_limiter or GlobalRateLimiter()
        self._domain_pool = domain_pool or DomainRateLimiterPool(config)
        self._politeness = politeness or PolitenessManager(config)
        self._stats = _MiddlewareStats()

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract the domain from a URL."""
        return urlparse(url).netloc

    async def pre_request(self, url: str, domain: Optional[str] = None) -> None:
        """Enforce all rate limits before a fetch.

        Call order: global -> domain pool -> politeness manager.

        Args:
            url: The URL about to be fetched.
            domain: Optional pre-parsed domain (extracted from url if None).
        """
        if domain is None:
            domain = self._extract_domain(url)

        start = time.monotonic()

        # Layer 1: Global throughput cap
        await self._global.acquire()

        # Layer 2: Per-domain adaptive rate limit
        await self._domain_pool.acquire(domain)

        # Layer 3: Politeness (robots.txt, backoff, Retry-After)
        await self._politeness.wait_for_domain(domain)

        elapsed_ms = (time.monotonic() - start) * 1000.0
        self._stats.total_requests += 1
        self._stats.total_delay_ms += elapsed_ms

    async def post_response(
        self,
        url: str,
        domain: Optional[str] = None,
        status_code: int = 200,
        latency_ms: float = 0.0,
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        """Update adaptive rates after receiving a response.

        Args:
            url: The fetched URL.
            domain: Optional pre-parsed domain.
            status_code: HTTP response status code.
            latency_ms: Request latency in milliseconds.
            headers: Optional response headers for Retry-After parsing.
        """
        if domain is None:
            domain = self._extract_domain(url)

        # Update domain pool adaptive rates
        await self._domain_pool.record_response(domain, status_code, latency_ms)

        # Parse Retry-After from 429 responses
        if status_code == 429 and headers:
            lower_headers = {k.lower(): v for k, v in headers.items()}
            retry_after = lower_headers.get("retry-after")
            if retry_after is not None:
                try:
                    seconds = float(retry_after)
                    self._domain_pool.record_retry_after(domain, seconds)
                except ValueError:
                    # Try HTTP-date format
                    try:
                        from email.utils import parsedate_to_datetime

                        dt = parsedate_to_datetime(retry_after)
                        seconds = max(0.0, dt.timestamp() - time.time())
                        self._domain_pool.record_retry_after(domain, seconds)
                    except Exception:
                        # Fallback: 60 seconds
                        self._domain_pool.record_retry_after(domain, 60.0)
            else:
                self._domain_pool.record_retry_after(domain, 60.0)

            self._stats.domains_throttled.add(domain)

        # Update politeness manager outcome
        success = 200 <= status_code < 400
        self._politeness.record_outcome(domain, success)

        # Forward headers to politeness manager
        if headers:
            self._politeness.process_response_headers(
                domain, status_code, headers
            )

    def get_stats(self) -> Dict[str, Any]:
        """Return comprehensive rate limiting statistics."""
        s = self._stats
        avg_delay = (
            s.total_delay_ms / s.total_requests if s.total_requests > 0 else 0.0
        )
        return {
            "total_requests": s.total_requests,
            "avg_wait_ms": round(avg_delay, 2),
            "total_delay_ms": round(s.total_delay_ms, 2),
            "domains_throttled": len(s.domains_throttled),
            "throttled_domains": sorted(s.domains_throttled),
            "global_limiter": self._global.get_stats(),
            "domain_rates": self._domain_pool.get_domain_rates(),
            "robots_cache": self._politeness.robots_cache_stats(),
        }

    async def cleanup(self) -> int:
        """Run periodic cleanup of idle domain limiters.

        Returns:
            Number of idle domains cleaned up.
        """
        return await self._domain_pool.cleanup_idle()

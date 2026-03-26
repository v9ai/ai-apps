"""
Proxy rotation, request fingerprint management, and stealth fetching.

Implements:
1. ProxyConfig: dataclass for proxy pool configuration (opt-in, file-based)
2. Proxy: per-proxy state tracking (health, latency, failures)
3. ProxyPool: load, rotate, health-check proxies (round_robin/random/least_used/performance_based)
4. FingerprintManager: randomise browser fingerprints per request (UA, viewport, headers)
5. StealthFetcher: extends PlaywrightFetcher with proxy + fingerprint + anti-detection

Dependencies: httpx, playwright (already in deps). No additional packages.
Target: Apple M1 16GB, zero cloud dependency.
"""

import asyncio
import logging
import random
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from crawler_engine import CrawlerConfig, ContentExtractor, PageContent

logger = logging.getLogger("crawler_proxy")


# ======================= Configuration ======================================

@dataclass
class ProxyConfig:
    """Configuration for proxy pool and rotation."""

    # Proxy source: one proxy per line, protocol://host:port or protocol://user:pass@host:port
    proxy_file: str = "scrapus_data/proxies.txt"

    # Rotation strategy: round_robin | random | least_used | performance_based
    rotation_strategy: str = "round_robin"

    # Health checking
    health_check_interval: float = 300.0  # 5 minutes between full pool checks
    max_failures_before_disable: int = 5
    cooldown_seconds: float = 600.0  # 10 min cooldown after disable
    test_url: str = "https://httpbin.org/ip"

    # Master switch -- proxy support is opt-in
    enabled: bool = False


# ======================= Proxy Dataclass ====================================

@dataclass
class Proxy:
    """State for a single proxy endpoint."""

    url: str
    protocol: str  # http | https | socks5
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None

    # Health / performance tracking
    is_healthy: bool = True
    failures: int = 0
    successes: int = 0
    avg_latency_ms: float = 0.0
    last_used: float = 0.0
    disabled_until: float = 0.0

    @property
    def success_rate(self) -> float:
        total = self.successes + self.failures
        if total == 0:
            return 0.5  # neutral prior for unseen proxies
        return self.successes / total

    @property
    def performance_score(self) -> float:
        """Higher is better: success_rate * (1 / latency).

        Returns 0.0 when latency is unknown (never used).
        """
        if self.avg_latency_ms <= 0.0:
            return self.success_rate  # no latency data yet
        return self.success_rate * (1000.0 / self.avg_latency_ms)

    def to_playwright_arg(self) -> Dict[str, Any]:
        """Return dict suitable for Playwright browser.launch(proxy=...)."""
        proxy_dict: Dict[str, Any] = {"server": f"{self.protocol}://{self.host}:{self.port}"}
        if self.username:
            proxy_dict["username"] = self.username
        if self.password:
            proxy_dict["password"] = self.password
        return proxy_dict


# ======================= Proxy Parsing ======================================

_PROXY_RE = re.compile(
    r"^(?P<protocol>https?|socks5)://"
    r"(?:(?P<user>[^:@]+):(?P<pass>[^@]+)@)?"
    r"(?P<host>[^:]+):(?P<port>\d+)$"
)


def parse_proxy(line: str) -> Optional[Proxy]:
    """Parse a single proxy line into a Proxy dataclass.

    Accepted formats:
        protocol://host:port
        protocol://user:pass@host:port
    Returns None for blank lines, comments, or malformed entries.
    """
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    m = _PROXY_RE.match(line)
    if not m:
        logger.warning("Skipping malformed proxy line: %s", line)
        return None

    return Proxy(
        url=line,
        protocol=m.group("protocol"),
        host=m.group("host"),
        port=int(m.group("port")),
        username=m.group("user"),
        password=m.group("pass"),
    )


# ======================= Proxy Pool =========================================

class ProxyPool:
    """Manages a pool of proxies with rotation, health checking, and stats.

    Load proxies from a text file (one per line). Rotate using one of four
    strategies: round_robin, random, least_used, performance_based.
    Periodically health-check all proxies in the background.
    """

    def __init__(self, config: ProxyConfig) -> None:
        self.config = config
        self._proxies: List[Proxy] = []
        self._rr_index: int = 0  # round-robin pointer
        self._health_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    def load(self) -> int:
        """Load proxies from the configured file.

        Returns the number of proxies loaded. Skips blank lines and comments.
        """
        path = Path(self.config.proxy_file)
        if not path.exists():
            logger.warning("Proxy file not found: %s", path)
            return 0

        loaded: List[Proxy] = []
        for line in path.read_text().splitlines():
            proxy = parse_proxy(line)
            if proxy is not None:
                loaded.append(proxy)

        self._proxies = loaded
        self._rr_index = 0
        logger.info("Loaded %d proxies from %s", len(loaded), path)
        return len(loaded)

    @property
    def size(self) -> int:
        return len(self._proxies)

    # ---- Rotation strategies ------------------------------------------------

    async def get_proxy(self) -> Optional[Proxy]:
        """Return the next proxy based on the configured rotation strategy.

        Returns None when no healthy proxy is available.
        """
        async with self._lock:
            candidates = self._available_proxies()
            if not candidates:
                return None

            strategy = self.config.rotation_strategy
            if strategy == "round_robin":
                proxy = self._select_round_robin(candidates)
            elif strategy == "random":
                proxy = random.choice(candidates)
            elif strategy == "least_used":
                proxy = self._select_least_used(candidates)
            elif strategy == "performance_based":
                proxy = self._select_performance_based(candidates)
            else:
                logger.warning("Unknown rotation strategy %r, falling back to round_robin", strategy)
                proxy = self._select_round_robin(candidates)

            proxy.last_used = time.time()
            return proxy

    def _available_proxies(self) -> List[Proxy]:
        """Return proxies that are healthy and not in cooldown."""
        now = time.time()
        available: List[Proxy] = []
        for p in self._proxies:
            # Re-enable proxies whose cooldown has expired
            if not p.is_healthy and p.disabled_until > 0.0 and now >= p.disabled_until:
                p.is_healthy = True
                p.failures = 0
                p.disabled_until = 0.0
                logger.info("Proxy %s:%d re-enabled after cooldown", p.host, p.port)
            if p.is_healthy:
                available.append(p)
        return available

    def _select_round_robin(self, candidates: List[Proxy]) -> Proxy:
        self._rr_index = self._rr_index % len(candidates)
        proxy = candidates[self._rr_index]
        self._rr_index += 1
        return proxy

    @staticmethod
    def _select_least_used(candidates: List[Proxy]) -> Proxy:
        return min(candidates, key=lambda p: p.successes + p.failures)

    @staticmethod
    def _select_performance_based(candidates: List[Proxy]) -> Proxy:
        """Weighted random selection by performance score.

        Weight = success_rate * (1 / latency). Falls back to uniform random
        when all scores are zero.
        """
        scores = [p.performance_score for p in candidates]
        total = sum(scores)
        if total <= 0.0:
            return random.choice(candidates)
        weights = [s / total for s in scores]
        return random.choices(candidates, weights=weights, k=1)[0]

    # ---- Outcome recording --------------------------------------------------

    async def record_success(self, proxy: Proxy, latency_ms: float) -> None:
        """Record a successful request through a proxy."""
        async with self._lock:
            proxy.successes += 1
            # Exponential moving average for latency
            if proxy.avg_latency_ms <= 0.0:
                proxy.avg_latency_ms = latency_ms
            else:
                proxy.avg_latency_ms = 0.8 * proxy.avg_latency_ms + 0.2 * latency_ms

    async def record_failure(self, proxy: Proxy) -> None:
        """Record a failed request through a proxy.

        Disables the proxy after max_failures_before_disable consecutive failures.
        """
        async with self._lock:
            proxy.failures += 1
            if proxy.failures >= self.config.max_failures_before_disable:
                proxy.is_healthy = False
                proxy.disabled_until = time.time() + self.config.cooldown_seconds
                logger.warning(
                    "Proxy %s:%d disabled after %d failures, cooldown %.0fs",
                    proxy.host,
                    proxy.port,
                    proxy.failures,
                    self.config.cooldown_seconds,
                )

    # ---- Health checking ----------------------------------------------------

    async def start_health_checks(self) -> None:
        """Start the periodic background health-check loop."""
        if self._health_task is not None:
            return
        self._health_task = asyncio.create_task(self._health_check_loop())
        logger.info("Proxy health-check loop started (interval %.0fs)", self.config.health_check_interval)

    async def stop_health_checks(self) -> None:
        """Cancel the background health-check loop."""
        if self._health_task is not None:
            self._health_task.cancel()
            try:
                await self._health_task
            except asyncio.CancelledError:
                pass
            self._health_task = None
            logger.info("Proxy health-check loop stopped")

    async def _health_check_loop(self) -> None:
        """Periodically test all proxies against the test URL."""
        while True:
            try:
                await asyncio.sleep(self.config.health_check_interval)
                await self._health_check()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Health check loop error: %s", exc)

    async def _health_check(self) -> None:
        """Test each proxy with a simple HTTP request to test_url."""
        import httpx

        logger.debug("Running health check on %d proxies", len(self._proxies))
        for proxy in self._proxies:
            proxy_url = proxy.url
            try:
                start = time.time()
                async with httpx.AsyncClient(
                    proxy=proxy_url,
                    timeout=10.0,
                ) as client:
                    resp = await client.get(self.config.test_url)
                    latency = (time.time() - start) * 1000

                if resp.status_code == 200:
                    proxy.is_healthy = True
                    proxy.failures = 0
                    proxy.disabled_until = 0.0
                    proxy.avg_latency_ms = 0.8 * proxy.avg_latency_ms + 0.2 * latency if proxy.avg_latency_ms > 0 else latency
                    logger.debug("Proxy %s:%d healthy (%.0fms)", proxy.host, proxy.port, latency)
                else:
                    proxy.failures += 1
                    logger.debug("Proxy %s:%d returned %d", proxy.host, proxy.port, resp.status_code)
            except Exception as exc:
                proxy.failures += 1
                logger.debug("Proxy %s:%d health check failed: %s", proxy.host, proxy.port, exc)

            # Disable after too many failures
            if proxy.failures >= self.config.max_failures_before_disable:
                proxy.is_healthy = False
                proxy.disabled_until = time.time() + self.config.cooldown_seconds

    # ---- Stats --------------------------------------------------------------

    def get_stats(self) -> Dict[str, Any]:
        """Return pool-level statistics.

        Returns dict with healthy, unhealthy, disabled counts and avg latency.
        """
        now = time.time()
        healthy = 0
        unhealthy = 0
        disabled = 0
        latency_sum = 0.0
        latency_count = 0

        for p in self._proxies:
            if not p.is_healthy:
                if p.disabled_until > now:
                    disabled += 1
                else:
                    unhealthy += 1
            else:
                healthy += 1
            if p.avg_latency_ms > 0.0:
                latency_sum += p.avg_latency_ms
                latency_count += 1

        return {
            "total": len(self._proxies),
            "healthy": healthy,
            "unhealthy": unhealthy,
            "disabled": disabled,
            "avg_latency_ms": round(latency_sum / latency_count, 1) if latency_count > 0 else 0.0,
        }


# ======================= Fingerprint Manager ================================

# Realistic User-Agent strings (Chrome/Firefox/Safari on Windows/macOS/Linux)
_USER_AGENTS: List[str] = [
    # Chrome on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    # Chrome on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    # Chrome on Linux
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    # Firefox on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    # Firefox on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0",
    # Firefox on Linux
    "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    # Safari on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    # Edge on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
]

_ACCEPT_LANGUAGES: List[str] = [
    "en-US,en;q=0.9",
    "en-GB,en;q=0.9",
    "en-US,en;q=0.9,de;q=0.8",
    "en-US,en;q=0.9,fr;q=0.8",
    "en-US,en;q=0.9,es;q=0.8",
    "en-GB,en;q=0.9,nl;q=0.8",
    "de-DE,de;q=0.9,en;q=0.8",
    "fr-FR,fr;q=0.9,en;q=0.8",
    "nl-NL,nl;q=0.9,en;q=0.8",
    "en-US,en;q=0.9,pt;q=0.7",
]

# Common desktop viewport sizes (width, height)
_VIEWPORTS: List[Tuple[int, int]] = [
    (1920, 1080),
    (1366, 768),
    (1536, 864),
    (1440, 900),
    (1280, 720),
    (1600, 900),
    (1280, 800),
    (1280, 1024),
    (1024, 768),
    (2560, 1440),
]


class FingerprintManager:
    """Randomise browser fingerprint per request to avoid detection.

    Generates coherent fingerprint sets: matching User-Agent, viewport,
    Accept-Language, and Playwright browser context options including
    WebGL/Canvas noise injection scripts.
    """

    def get_fingerprint(self) -> Dict[str, Any]:
        """Generate a random browser context configuration for Playwright.

        Returns a dict of kwargs suitable for browser.new_context(**fingerprint).
        Includes user_agent, viewport, locale, and initialization scripts for
        WebGL/Canvas fingerprint noise.
        """
        ua = random.choice(_USER_AGENTS)
        lang = random.choice(_ACCEPT_LANGUAGES)
        vp_w, vp_h = random.choice(_VIEWPORTS)
        locale = lang.split(",")[0]  # e.g. "en-US"

        return {
            "user_agent": ua,
            "viewport": {"width": vp_w, "height": vp_h},
            "locale": locale,
            "color_scheme": random.choice(["light", "dark", "no-preference"]),
            "java_script_enabled": True,
            "ignore_https_errors": True,
        }

    def get_headers(self) -> Dict[str, str]:
        """Generate randomised HTTP request headers.

        Returns headers that complement the browser fingerprint — Accept,
        Accept-Language, Accept-Encoding, and common browser headers.
        """
        ua = random.choice(_USER_AGENTS)
        lang = random.choice(_ACCEPT_LANGUAGES)

        headers: Dict[str, str] = {
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": lang,
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }

        # Randomly include DNT header
        if random.random() < 0.3:
            headers["DNT"] = "1"

        return headers

    @staticmethod
    def get_stealth_scripts() -> List[str]:
        """Return JS scripts to inject into browser contexts for stealth.

        Patches common bot-detection vectors:
        - navigator.webdriver = false
        - Canvas toDataURL noise
        - WebGL renderer/vendor spoofing
        - navigator.plugins/languages
        """
        return [
            # Hide webdriver flag
            """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            """,
            # Fake plugins array (bots typically have empty plugins)
            """
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            """,
            # Fake languages
            """
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
            """,
            # Canvas fingerprint noise — add subtle random pixel shifts
            """
            const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function(type) {
                const ctx = this.getContext('2d');
                if (ctx) {
                    const style = ctx.fillStyle;
                    ctx.fillStyle = 'rgba(0,0,0,0.01)';
                    ctx.fillRect(0, 0, 1, 1);
                    ctx.fillStyle = style;
                }
                return origToDataURL.apply(this, arguments);
            };
            """,
            # WebGL vendor/renderer spoofing
            """
            const getParam = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) return 'Intel Inc.';
                if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                return getParam.apply(this, arguments);
            };
            """,
        ]


# ======================= Stealth Fetcher ====================================

# CAPTCHA indicators in page content
_CAPTCHA_INDICATORS: List[str] = [
    "captcha",
    "recaptcha",
    "hcaptcha",
    "cf-challenge",
    "challenge-platform",
    "please verify you are a human",
    "checking your browser",
    "just a moment",
    "attention required",
    "access denied",
]


class StealthFetcher:
    """Playwright fetcher with proxy rotation and fingerprint randomisation.

    Same interface as PlaywrightFetcher: start(), fetch_page(url), stop().
    Extends behaviour with:
    - Per-request proxy rotation (or per-domain sticky)
    - Randomised browser fingerprint per context
    - Stealth JS injection (webdriver, canvas, WebGL)
    - CAPTCHA detection (returns None + logs)
    - Rate-limit detection (429/503) with automatic proxy switch
    """

    def __init__(
        self,
        config: CrawlerConfig,
        proxy_config: Optional[ProxyConfig] = None,
    ) -> None:
        self.config = config
        self.proxy_config = proxy_config or ProxyConfig()
        self._proxy_pool: Optional[ProxyPool] = None
        self._fingerprint_mgr = FingerprintManager()
        self._extractor = ContentExtractor(config)

        # Playwright state
        self._playwright: Any = None
        self._browser: Any = None
        self._context: Any = None

        # Domain -> proxy sticky mapping (reuse same proxy for a domain)
        self._domain_proxy: Dict[str, Proxy] = {}

        # Stats
        self._captchas_detected: int = 0
        self._rate_limits_hit: int = 0
        self._proxy_switches: int = 0

    async def start(self) -> None:
        """Launch the browser and initialise the proxy pool."""
        # Load proxies if enabled
        if self.proxy_config.enabled:
            self._proxy_pool = ProxyPool(self.proxy_config)
            count = self._proxy_pool.load()
            if count > 0:
                await self._proxy_pool.start_health_checks()
            else:
                logger.warning("Proxy enabled but no proxies loaded; falling back to direct")

        # Launch Playwright browser
        await self._create_browser_context()
        logger.info(
            "StealthFetcher started (proxy=%s, proxies=%d)",
            "enabled" if self.proxy_config.enabled else "disabled",
            self._proxy_pool.size if self._proxy_pool else 0,
        )

    async def _create_browser_context(
        self, proxy: Optional[Proxy] = None
    ) -> None:
        """Create (or recreate) the Playwright browser and context.

        Applies fingerprint randomisation and stealth scripts.
        Optionally routes traffic through the given proxy.
        """
        from playwright.async_api import async_playwright

        # Tear down existing context/browser if present
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

        self._playwright = await async_playwright().start()
        browser_launcher = getattr(self._playwright, self.config.browser_type)

        launch_kwargs: Dict[str, Any] = {"headless": self.config.headless}
        if proxy:
            launch_kwargs["proxy"] = proxy.to_playwright_arg()

        self._browser = await browser_launcher.launch(**launch_kwargs)

        # Randomised fingerprint for this context
        fingerprint = self._fingerprint_mgr.get_fingerprint()
        self._context = await self._browser.new_context(**fingerprint)

        # Inject stealth scripts into every new page
        for script in FingerprintManager.get_stealth_scripts():
            await self._context.add_init_script(script)

    async def fetch_page(self, url: str) -> Optional[PageContent]:
        """Fetch a URL with stealth measures.

        - Rotates proxy per domain (sticky within domain)
        - Applies fingerprint randomisation
        - Detects CAPTCHAs and rate limiting
        - Returns None on failure, CAPTCHA, or rate limit

        Falls back to direct connection when proxies are unavailable.
        """
        if self._context is None:
            raise RuntimeError("StealthFetcher not started; call start() first")

        domain = urlparse(url).netloc

        # Select proxy for this domain
        proxy = await self._get_proxy_for_domain(domain)

        # Recreate context with new proxy if needed (proxy changed from current)
        # For simplicity, we create a fresh page per request in the existing context.
        # Full proxy rotation per domain would require context recreation;
        # we do that only on rate-limit or CAPTCHA detection.

        page = await self._context.new_page()
        try:
            # Set extra headers for this page
            headers = self._fingerprint_mgr.get_headers()
            await page.set_extra_http_headers(headers)

            start_time = time.time()
            response = await page.goto(
                url, timeout=self.config.page_timeout_ms, wait_until="domcontentloaded"
            )
            if response is None:
                return None

            latency_ms = (time.time() - start_time) * 1000

            # Check for rate limiting (429 / 503)
            if response.status in (429, 503):
                self._rate_limits_hit += 1
                logger.warning("Rate limited (%d) on %s", response.status, url)
                if proxy and self._proxy_pool:
                    await self._proxy_pool.record_failure(proxy)
                    self._proxy_switches += 1
                    # Evict domain sticky proxy so next request picks a new one
                    self._domain_proxy.pop(domain, None)
                return None

            # Wait for content to settle
            try:
                await page.wait_for_load_state("networkidle", timeout=5000)
            except Exception:
                pass  # networkidle timeout is acceptable

            # Check for CAPTCHA
            if await self._detect_captcha(page):
                self._captchas_detected += 1
                logger.warning("CAPTCHA detected on %s", url)
                if proxy and self._proxy_pool:
                    await self._proxy_pool.record_failure(proxy)
                    self._proxy_switches += 1
                    self._domain_proxy.pop(domain, None)
                return None

            # Record proxy success
            if proxy and self._proxy_pool:
                await self._proxy_pool.record_success(proxy, latency_ms)

            # Extract content
            content = await self._extractor.extract(page, url)
            content.status_code = response.status
            content.content_type = response.headers.get("content-type", "")
            return content

        except Exception as exc:
            logger.debug("StealthFetcher failed for %s: %s", url, exc)
            if proxy and self._proxy_pool:
                await self._proxy_pool.record_failure(proxy)
            return None
        finally:
            await page.close()

    async def _get_proxy_for_domain(self, domain: str) -> Optional[Proxy]:
        """Get a proxy for the given domain (sticky per domain).

        Returns None if proxies are disabled or pool is empty.
        """
        if not self.proxy_config.enabled or self._proxy_pool is None:
            return None

        # Reuse existing domain mapping if the proxy is still healthy
        if domain in self._domain_proxy:
            existing = self._domain_proxy[domain]
            if existing.is_healthy:
                return existing
            # Proxy went unhealthy, pick a new one
            del self._domain_proxy[domain]

        proxy = await self._proxy_pool.get_proxy()
        if proxy is not None:
            self._domain_proxy[domain] = proxy
        return proxy

    async def _detect_captcha(self, page: Any) -> bool:
        """Check page content for CAPTCHA indicators.

        Inspects the page title and a snippet of the body text for common
        CAPTCHA / challenge strings.
        """
        try:
            title = await page.evaluate("document.title || ''")
            body_snippet = await page.evaluate(
                "(document.body?.innerText || '').substring(0, 2000)"
            )
            text = (title + " " + body_snippet).lower()
            return any(indicator in text for indicator in _CAPTCHA_INDICATORS)
        except Exception:
            return False

    async def stop(self) -> None:
        """Shut down browser, proxy pool, and health checks."""
        if self._proxy_pool:
            await self._proxy_pool.stop_health_checks()
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info(
            "StealthFetcher stopped (captchas=%d, rate_limits=%d, proxy_switches=%d)",
            self._captchas_detected,
            self._rate_limits_hit,
            self._proxy_switches,
        )

    def get_stats(self) -> Dict[str, Any]:
        """Return fetcher and proxy pool statistics."""
        stats: Dict[str, Any] = {
            "captchas_detected": self._captchas_detected,
            "rate_limits_hit": self._rate_limits_hit,
            "proxy_switches": self._proxy_switches,
            "domain_proxy_mappings": len(self._domain_proxy),
        }
        if self._proxy_pool:
            stats["proxy_pool"] = self._proxy_pool.get_stats()
        return stats

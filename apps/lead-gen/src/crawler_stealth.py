"""
Stealth and anti-detection measures for ethical web crawling.

Implements:
1. StealthConfig: dataclass controlling all stealth tunables
2. UserAgentRotator: weighted UA rotation by browser market share
3. ViewportRandomizer: realistic screen resolution selection
4. RequestHeaderBuilder: realistic HTTP headers with Sec-CH-UA client hints
5. CaptchaDetector: detects reCAPTCHA, hCaptcha, Turnstile, custom CAPTCHAs
6. BlockDetector: detects 403/429, access denied, empty body, login redirects
7. AdaptiveBehavior: adjusts crawl delays and patterns based on detection signals

All measures are ethical: respect robots.txt, rate limits, and ToS.
No CAPTCHA solving; blocked pages are logged and skipped.

Zero external dependencies beyond Python stdlib.
Target: Apple M1 16GB, zero cloud dependency.
"""

import hashlib
import logging
import re
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("crawler_stealth")


# ======================= Configuration ======================================

@dataclass
class StealthConfig:
    """All tunables for stealth and anti-detection behaviour."""

    # User agent rotation
    randomize_user_agent: bool = True

    # Viewport randomization
    randomize_viewport: bool = True

    # Timezone randomization (disabled by default for simplicity)
    randomize_timezone: bool = False

    # Random jitter applied as +/- fraction of configured crawl delay
    request_delay_jitter: float = 0.5

    # Referer policy: "none" | "origin" | "realistic"
    referer_policy: str = "realistic"

    # Accept-Language header value
    accept_language: str = "en-US,en;q=0.9"

    # Do Not Track header
    do_not_track: bool = True

    # Max retry attempts when a block is detected before giving up on a URL
    max_retries_on_block: int = 2


# ======================= User Agent Rotator =================================

# Curated user agents from 2024-2025 browser releases, weighted by market share.
# Sources: StatCounter GlobalStats, Can I Use browser usage data.
# Format: (user_agent_string, weight)
_USER_AGENTS: List[Tuple[str, float]] = [
    # Chrome (desktop) — ~65% market share
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        18.0,
    ),
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        12.0,
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        10.0,
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        7.0,
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        5.0,
    ),
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        4.0,
    ),
    # Edge (Chromium) — ~5%
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        5.0,
    ),
    # Firefox — ~7%
    (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) "
        "Gecko/20100101 Firefox/133.0",
        4.0,
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) "
        "Gecko/20100101 Firefox/133.0",
        2.0,
    ),
    (
        "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) "
        "Gecko/20100101 Firefox/133.0",
        1.0,
    ),
    # Safari — ~18%
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
        "(KHTML, like Gecko) Version/18.2 Safari/605.1.15",
        8.0,
    ),
    (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
        "(KHTML, like Gecko) Version/18.1 Safari/605.1.15",
        4.0,
    ),
]

# Total weight for normalisation
_UA_TOTAL_WEIGHT: float = sum(w for _, w in _USER_AGENTS)


class UserAgentRotator:
    """Rotate user agents weighted by real browser market share.

    - get_ua(): weighted random selection
    - get_ua_for_domain(domain): consistent UA per domain session
      (uses a hash-based seed so the same domain always gets the same UA
      within a rotator instance, avoiding fingerprint flipping mid-session)
    """

    def __init__(self) -> None:
        self._domain_cache: Dict[str, str] = {}
        # Pre-compute cumulative weights for weighted sampling
        self._cumulative: List[float] = []
        cumsum = 0.0
        for _, w in _USER_AGENTS:
            cumsum += w
            self._cumulative.append(cumsum)

    def get_ua(self) -> str:
        """Return a weighted-random user agent string."""
        import random

        r = random.uniform(0.0, _UA_TOTAL_WEIGHT)
        for i, cum in enumerate(self._cumulative):
            if r <= cum:
                return _USER_AGENTS[i][0]
        return _USER_AGENTS[-1][0]

    def get_ua_for_domain(self, domain: str) -> str:
        """Return a consistent user agent for a given domain.

        Uses a deterministic hash so the same domain always maps to the
        same UA within this rotator instance. This prevents mid-session
        UA switching that can trigger bot detection.
        """
        if domain in self._domain_cache:
            return self._domain_cache[domain]

        # Deterministic selection from hash
        h = int(hashlib.sha256(domain.encode()).hexdigest(), 16)
        index = h % len(_USER_AGENTS)
        ua = _USER_AGENTS[index][0]
        self._domain_cache[domain] = ua
        return ua

    def clear_domain_cache(self) -> None:
        """Clear the per-domain UA cache (e.g. between crawl sessions)."""
        self._domain_cache.clear()


# ======================= Viewport Randomizer ================================

# Common screen resolutions weighted by global usage share (2024-2025).
# Format: (width, height, weight_percent)
_VIEWPORTS: List[Tuple[int, int, float]] = [
    (1920, 1080, 40.0),
    (1366, 768, 15.0),
    (1536, 864, 10.0),
    (1440, 900, 8.0),
    (1280, 720, 6.0),
    (1600, 900, 5.0),
    (2560, 1440, 5.0),
    (1280, 800, 4.0),
    (1680, 1050, 3.0),
    (1280, 1024, 2.0),
    (1920, 1200, 2.0),
]

_VP_TOTAL_WEIGHT: float = sum(w for _, _, w in _VIEWPORTS)


class ViewportRandomizer:
    """Select realistic screen resolutions weighted by usage share."""

    def __init__(self) -> None:
        self._cumulative: List[float] = []
        cumsum = 0.0
        for _, _, w in _VIEWPORTS:
            cumsum += w
            self._cumulative.append(cumsum)

    def get_viewport(self) -> Dict[str, int]:
        """Return a weighted-random viewport as {"width": ..., "height": ...}."""
        import random

        r = random.uniform(0.0, _VP_TOTAL_WEIGHT)
        for i, cum in enumerate(self._cumulative):
            if r <= cum:
                w, h, _ = _VIEWPORTS[i]
                return {"width": w, "height": h}
        w, h, _ = _VIEWPORTS[-1]
        return {"width": w, "height": h}


# ======================= Request Header Builder =============================

# Sec-CH-UA brand strings for major Chromium versions (2024-2025).
_CHROMIUM_BRANDS: Dict[str, str] = {
    "129": '"Chromium";v="129", "Google Chrome";v="129", "Not=A?Brand";v="8"',
    "130": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
    "131": '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
}

# Pattern to extract Chrome major version from UA string
_CHROME_VERSION_RE = re.compile(r"Chrome/(\d+)")


class RequestHeaderBuilder:
    """Build realistic HTTP request headers matching a user agent.

    Generates Accept, Accept-Language, Accept-Encoding, Connection, DNT,
    and Sec-CH-UA client hints that are consistent with the provided UA.
    """

    def __init__(self, config: StealthConfig) -> None:
        self.config = config

    def build_headers(self, ua: str) -> Dict[str, str]:
        """Build a complete header dict for the given user agent string.

        Args:
            ua: the User-Agent string to build headers for.

        Returns:
            Dict of HTTP header name -> value.
        """
        headers: Dict[str, str] = {
            "User-Agent": ua,
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,image/apng,*/*;q=0.8"
            ),
            "Accept-Language": self.config.accept_language,
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        if self.config.do_not_track:
            headers["DNT"] = "1"

        # Add Sec-CH-UA client hints for Chromium-based browsers
        chrome_match = _CHROME_VERSION_RE.search(ua)
        if chrome_match:
            major = chrome_match.group(1)
            sec_ch = _CHROMIUM_BRANDS.get(major)
            if sec_ch:
                headers["Sec-CH-UA"] = sec_ch
            else:
                # Fallback for unknown Chromium versions
                headers["Sec-CH-UA"] = (
                    f'"Chromium";v="{major}", '
                    f'"Google Chrome";v="{major}", '
                    f'"Not_A Brand";v="24"'
                )
            headers["Sec-CH-UA-Mobile"] = "?0"

            # Infer platform from UA
            if "Windows" in ua:
                headers["Sec-CH-UA-Platform"] = '"Windows"'
            elif "Macintosh" in ua or "Mac OS" in ua:
                headers["Sec-CH-UA-Platform"] = '"macOS"'
            elif "Linux" in ua:
                headers["Sec-CH-UA-Platform"] = '"Linux"'

            headers["Sec-Fetch-Dest"] = "document"
            headers["Sec-Fetch-Mode"] = "navigate"
            headers["Sec-Fetch-Site"] = "none"
            headers["Sec-Fetch-User"] = "?1"

        return headers

    def build_referer(self, target_url: str, source_url: Optional[str] = None) -> Optional[str]:
        """Build a Referer header based on the configured policy.

        Args:
            target_url: URL being requested.
            source_url: URL of the referring page (if any).

        Returns:
            Referer header value, or None if policy is "none".
        """
        if self.config.referer_policy == "none":
            return None

        if self.config.referer_policy == "origin" and source_url:
            from urllib.parse import urlparse

            parsed = urlparse(source_url)
            return f"{parsed.scheme}://{parsed.netloc}/"

        if self.config.referer_policy == "realistic" and source_url:
            return source_url

        return None


# ======================= CAPTCHA Detector ===================================

# Detection patterns for common CAPTCHA providers.
# Each entry: (provider_name, list_of_regex_patterns_to_match_in_page_content)
_CAPTCHA_PATTERNS: List[Tuple[str, List[str]]] = [
    (
        "reCAPTCHA",
        [
            r"google\.com/recaptcha",
            r"grecaptcha",
            r"g-recaptcha",
            r"recaptcha/api",
            r'class="recaptcha',
        ],
    ),
    (
        "hCaptcha",
        [
            r"hcaptcha\.com",
            r"h-captcha",
            r'data-hcaptcha',
            r"hcaptcha-challenge",
        ],
    ),
    (
        "Cloudflare Turnstile",
        [
            r"challenges\.cloudflare\.com/turnstile",
            r"cf-turnstile",
            r"turnstile/v0/api",
        ],
    ),
    (
        "Cloudflare Challenge",
        [
            r"cf-challenge-running",
            r"cf_chl_opt",
            r"Checking if the site connection is secure",
            r"cf-browser-verification",
            r"jschl-answer",
        ],
    ),
    (
        "Custom CAPTCHA",
        [
            r"captcha[_-]image",
            r"captcha[_-]input",
            r"solve[_-]captcha",
            r'id="captcha"',
            r'name="captcha"',
            r"verify you are human",
            r"prove you.re not a robot",
        ],
    ),
]

# Precompile for performance
_COMPILED_CAPTCHA_PATTERNS: List[Tuple[str, List[re.Pattern]]] = [
    (name, [re.compile(p, re.IGNORECASE) for p in patterns])
    for name, patterns in _CAPTCHA_PATTERNS
]


class CaptchaDetector:
    """Detect common CAPTCHA providers in page content.

    Does NOT attempt to solve CAPTCHAs. When detected, the page should
    be logged and skipped.
    """

    def __init__(self) -> None:
        self._detection_counts: Dict[str, int] = defaultdict(int)

    def detect(self, page_content: str) -> Optional[str]:
        """Check page content for CAPTCHA indicators.

        Args:
            page_content: HTML body text of the page.

        Returns:
            CAPTCHA provider name if detected, None otherwise.
        """
        for provider_name, compiled_patterns in _COMPILED_CAPTCHA_PATTERNS:
            for pattern in compiled_patterns:
                if pattern.search(page_content):
                    self._detection_counts[provider_name] += 1
                    logger.info(
                        "CAPTCHA detected: %s (pattern: %s)",
                        provider_name,
                        pattern.pattern,
                    )
                    return provider_name
        return None

    def get_stats(self) -> Dict[str, int]:
        """Return counts of CAPTCHA detections by provider."""
        return dict(self._detection_counts)


# ======================= Block Detector =====================================

# Text patterns that indicate the crawler has been blocked.
_BLOCK_TEXT_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("access_denied", re.compile(r"access\s+denied", re.IGNORECASE)),
    ("forbidden", re.compile(r"403\s+forbidden", re.IGNORECASE)),
    ("blocked", re.compile(r"you\s+have\s+been\s+blocked", re.IGNORECASE)),
    ("rate_limited", re.compile(r"rate\s+limit(ed)?", re.IGNORECASE)),
    ("bot_detected", re.compile(r"bot\s+(detected|protection)", re.IGNORECASE)),
    ("automated_access", re.compile(r"automated\s+access", re.IGNORECASE)),
    ("suspicious_activity", re.compile(r"suspicious\s+activity", re.IGNORECASE)),
    ("too_many_requests", re.compile(r"too\s+many\s+requests", re.IGNORECASE)),
    ("ip_blocked", re.compile(r"(your\s+)?ip\s+(has\s+been\s+)?blocked", re.IGNORECASE)),
]


class BlockDetector:
    """Detect when the crawler has been blocked or rate-limited.

    Signals checked:
    - HTTP 403 (Forbidden) or 429 (Too Many Requests) status codes
    - Empty or very short response body
    - "Access denied" / "blocked" / "rate limited" text patterns
    - Redirect to login or CAPTCHA pages
    """

    def __init__(self) -> None:
        self._block_counts: Dict[str, int] = defaultdict(int)
        self._total_checks: int = 0

    def is_blocked(
        self,
        status_code: int,
        body_text: str,
        headers: Optional[Dict[str, str]] = None,
    ) -> Tuple[bool, str]:
        """Determine if the response indicates a block.

        Args:
            status_code: HTTP response status code.
            body_text: response body as text.
            headers: response headers (optional).

        Returns:
            Tuple of (is_blocked: bool, reason: str).
            reason is empty string when not blocked.
        """
        self._total_checks += 1

        # Check status code
        if status_code == 403:
            self._record("http_403")
            return True, "http_403"

        if status_code == 429:
            self._record("http_429")
            return True, "http_429"

        # Check for empty or suspiciously short body
        stripped = body_text.strip() if body_text else ""
        if len(stripped) < 100 and status_code != 204:
            # Very short body could be a block page or error
            # Only flag if it's not a legitimate short response
            if status_code >= 400:
                self._record("empty_body")
                return True, "empty_body"

        # Check for block text patterns
        for pattern_name, pattern in _BLOCK_TEXT_PATTERNS:
            if pattern.search(body_text):
                self._record(pattern_name)
                return True, pattern_name

        # Check for redirect to login page (via headers)
        if headers:
            lower_headers = {k.lower(): v for k, v in headers.items()}
            location = lower_headers.get("location", "")
            if location:
                location_lower = location.lower()
                if any(
                    sig in location_lower
                    for sig in ("login", "signin", "auth", "captcha", "challenge")
                ):
                    self._record("redirect_to_auth")
                    return True, "redirect_to_auth"

        return False, ""

    def _record(self, block_type: str) -> None:
        """Record a block event."""
        self._block_counts[block_type] += 1
        logger.warning("Block detected: %s", block_type)

    def get_block_stats(self) -> Dict[str, int]:
        """Return counts of blocks by type."""
        return dict(self._block_counts)

    def get_block_rate(self) -> float:
        """Return the overall block rate (blocked / total checks)."""
        if self._total_checks == 0:
            return 0.0
        total_blocks = sum(self._block_counts.values())
        return total_blocks / self._total_checks


# ======================= Adaptive Behavior ==================================

@dataclass
class CrawlAdjustments:
    """Adjustments to crawling behaviour based on detection signals.

    Returned by AdaptiveBehavior.adapt() to tell the crawler engine
    how to modify its behaviour for a specific domain.
    """

    # Multiply the base crawl delay by this factor (1.0 = no change)
    delay_multiplier: float = 1.0

    # If True, skip this domain entirely for the current cycle
    skip_domain: bool = False

    # If True, rotate to a different user agent for next request
    rotate_ua: bool = False

    # Human-readable reason for the adjustment
    reason: str = ""


class AdaptiveBehavior:
    """Adjust crawling behaviour based on detection signals.

    Tracks per-domain block history and progressively backs off:
    - 1st block: increase delay 2x
    - 2nd block: increase delay 4x, rotate UA
    - 3rd+ block: skip domain for cooling period

    Automatically recovers after successful requests.
    """

    def __init__(self, config: StealthConfig) -> None:
        self.config = config
        # Per-domain tracking: domain -> list of (timestamp, signal_type)
        self._domain_signals: Dict[str, List[Tuple[float, str]]] = defaultdict(list)
        # Per-domain consecutive block count
        self._consecutive_blocks: Dict[str, int] = defaultdict(int)
        # Per-domain skip-until timestamp
        self._skip_until: Dict[str, float] = {}
        # Cooling durations escalate: 60s, 300s, 900s
        self._cooling_durations = [60.0, 300.0, 900.0]

    def record_success(self, domain: str) -> None:
        """Record a successful request, resetting consecutive block count."""
        self._consecutive_blocks[domain] = 0

    def adapt(
        self,
        domain: str,
        detection_signals: List[str],
    ) -> CrawlAdjustments:
        """Determine crawl adjustments based on detection signals.

        Args:
            domain: the domain being crawled.
            detection_signals: list of signal types from BlockDetector
                and CaptchaDetector (e.g. ["http_429"], ["reCAPTCHA"]).

        Returns:
            CrawlAdjustments with delay multiplier and skip signals.
        """
        now = time.time()

        # Check if domain is in skip/cooling period
        if domain in self._skip_until:
            if now < self._skip_until[domain]:
                remaining = self._skip_until[domain] - now
                return CrawlAdjustments(
                    skip_domain=True,
                    reason=f"domain cooling ({remaining:.0f}s remaining)",
                )
            else:
                # Cooling period expired
                del self._skip_until[domain]

        # No signals means everything is fine
        if not detection_signals:
            self.record_success(domain)
            return CrawlAdjustments(delay_multiplier=1.0)

        # Record the signals
        for signal in detection_signals:
            self._domain_signals[domain].append((now, signal))

        self._consecutive_blocks[domain] += 1
        consec = self._consecutive_blocks[domain]

        # Prune old signals (keep last 30 minutes)
        cutoff = now - 1800.0
        self._domain_signals[domain] = [
            (ts, sig) for ts, sig in self._domain_signals[domain] if ts > cutoff
        ]

        # Escalating response
        if consec >= 3:
            # 3+ consecutive blocks: skip domain for escalating cooldown
            cool_idx = min(consec - 3, len(self._cooling_durations) - 1)
            cool_duration = self._cooling_durations[cool_idx]
            self._skip_until[domain] = now + cool_duration
            logger.warning(
                "Domain %s: %d consecutive blocks, cooling for %.0fs",
                domain,
                consec,
                cool_duration,
            )
            return CrawlAdjustments(
                skip_domain=True,
                reason=f"{consec} consecutive blocks, cooling for {cool_duration:.0f}s",
            )

        if consec == 2:
            # 2nd block: heavy slowdown + UA rotation
            return CrawlAdjustments(
                delay_multiplier=4.0,
                rotate_ua=True,
                reason="2nd consecutive block, heavy slowdown + UA rotation",
            )

        # 1st block: moderate slowdown
        return CrawlAdjustments(
            delay_multiplier=2.0,
            reason="1st block detected, doubling delay",
        )

    def get_domain_status(self, domain: str) -> Dict[str, Any]:
        """Return status info for a domain."""
        now = time.time()
        signals = self._domain_signals.get(domain, [])
        recent = [(ts, sig) for ts, sig in signals if now - ts < 1800.0]

        skip_remaining = 0.0
        if domain in self._skip_until:
            skip_remaining = max(0.0, self._skip_until[domain] - now)

        return {
            "domain": domain,
            "consecutive_blocks": self._consecutive_blocks.get(domain, 0),
            "recent_signals_30m": len(recent),
            "skip_remaining_s": round(skip_remaining, 1),
            "is_cooling": skip_remaining > 0,
        }

    def get_all_cooling_domains(self) -> List[Dict[str, Any]]:
        """Return all domains currently in cooling period."""
        now = time.time()
        cooling = []
        for domain, until in self._skip_until.items():
            remaining = until - now
            if remaining > 0:
                cooling.append({
                    "domain": domain,
                    "remaining_s": round(remaining, 1),
                    "consecutive_blocks": self._consecutive_blocks.get(domain, 0),
                })
        return cooling


# ======================= Convenience: apply jitter ==========================

def apply_delay_jitter(base_delay: float, jitter: float) -> float:
    """Apply random jitter to a base delay.

    Returns base_delay * (1.0 +/- jitter), clamped to >= 0.
    For example, base_delay=2.0 and jitter=0.5 returns a value
    uniformly distributed in [1.0, 3.0].

    Args:
        base_delay: the base crawl delay in seconds.
        jitter: fractional jitter (e.g. 0.5 = +/-50%).

    Returns:
        Jittered delay in seconds, never negative.
    """
    import random

    factor = 1.0 + random.uniform(-jitter, jitter)
    return max(0.0, base_delay * factor)

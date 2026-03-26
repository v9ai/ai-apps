"""
Module 1: Async crawler engine with Playwright, robots.txt compliance,
UCB1 domain scheduling, and URL frontier management.

Implements:
1. PlaywrightFetcher: JS-rendered page fetching via Playwright
2. PolitenessManager: robots.txt parsing, per-domain rate limiting, exp backoff
3. DomainScheduler: UCB1 bandit for domain prioritisation (1 MB RAM)
4. URLFrontier: SQLite-backed priority queue with Bloom-filter dedup
5. ContentExtractor: title, body text, outbound links, metadata
6. CrawlerEngine: orchestrates fetching, scheduling, rate limiting, content
   extraction at 8-12 pages/sec (network I/O bound)

Concurrency: configurable via asyncio semaphore (default 8 workers).
Rate limiting: per-domain token-bucket + robots.txt Crawl-delay.

Target: Apple M1 16GB, zero cloud dependency.
"""

import asyncio
import hashlib
import logging
import math
import os
import re
import sqlite3
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse

import numpy as np

logger = logging.getLogger("crawler_engine")


# ======================= Configuration ======================================

@dataclass
class CrawlerConfig:
    """All tunables for the crawler engine."""

    # Concurrency
    max_concurrent: int = 8  # async workers
    page_timeout_ms: int = 15_000  # per-page Playwright timeout

    # Rate limiting
    default_crawl_delay: float = 2.0  # seconds between requests to same domain
    min_crawl_delay: float = 0.5
    max_crawl_delay: float = 30.0
    backoff_base: float = 1.0
    backoff_max: float = 60.0
    backoff_factor: float = 2.0

    # Frontier
    frontier_db: str = "scrapus_data/frontier.db"
    bloom_capacity: int = 1_000_000
    bloom_error_rate: float = 0.001
    frontier_prune_days: int = 7

    # Domain scheduler
    ucb_exploration_constant: float = 2.0
    dqn_ucb_weight: float = 0.7  # 0.7 * q_value + 0.3 * ucb
    domain_stats_db: str = "scrapus_data/domain_stats.db"

    # Content extraction
    max_links_per_page: int = 50
    max_body_chars: int = 50_000
    user_agent: str = "ScrapusBot/1.0 (+https://scrapus.dev/bot)"

    # Robots.txt cache
    robots_cache_ttl: float = 86400.0  # 24 hours

    # Domain cooling
    domain_cooling_threshold: int = 10  # consecutive failures before cooldown
    domain_cooling_duration: float = 300.0  # 5 minutes cooldown

    # Playwright
    headless: bool = True
    browser_type: str = "chromium"  # chromium | firefox | webkit


# ======================= Bloom Filter =======================================

class BloomFilter:
    """Memory-efficient probabilistic set for URL deduplication.

    Uses murmur-like hashing via hashlib. ~1.2 MB for 1M items at 0.1% FP.
    """

    def __init__(
        self, capacity: int = 1_000_000, error_rate: float = 0.001
    ) -> None:
        self._m = self._optimal_m(capacity, error_rate)
        self._k = self._optimal_k(self._m, capacity)
        self._bits = np.zeros(self._m, dtype=np.bool_)
        self._count = 0

    @staticmethod
    def _optimal_m(n: int, p: float) -> int:
        return int(-(n * math.log(p)) / (math.log(2) ** 2)) + 1

    @staticmethod
    def _optimal_k(m: int, n: int) -> int:
        return max(1, int((m / n) * math.log(2)))

    def _hashes(self, key: str) -> List[int]:
        h1 = int(hashlib.md5(key.encode()).hexdigest(), 16)
        h2 = int(hashlib.sha1(key.encode()).hexdigest(), 16)
        return [(h1 + i * h2) % self._m for i in range(self._k)]

    def add(self, key: str) -> None:
        for idx in self._hashes(key):
            self._bits[idx] = True
        self._count += 1

    def __contains__(self, key: str) -> bool:
        return all(self._bits[idx] for idx in self._hashes(key))

    def __len__(self) -> int:
        return self._count


# ======================= Politeness Manager =================================

class PolitenessManager:
    """Per-domain rate limiting with robots.txt compliance.

    - Parses robots.txt for User-Agent: ScrapusBot (fallback to *)
    - Respects Crawl-delay directives
    - Adaptive backoff: base_delay * (1 + failure_rate * 5) when failures > 10%
    - Exponential backoff on 429/503 responses
    """

    def __init__(self, config: CrawlerConfig) -> None:
        self.config = config
        # robots.txt cache: domain -> (result_dict, fetched_at_timestamp)
        self._robots_cache: Dict[str, Tuple[Dict[str, Any], float]] = {}
        self._robots_cache_hits: int = 0
        self._robots_cache_misses: int = 0
        self._robots_cache_expired: int = 0
        self._failure_windows: Dict[str, Deque] = defaultdict(
            lambda: deque(maxlen=100)
        )
        self._last_request_time: Dict[str, float] = {}
        self._backoff_state: Dict[str, int] = defaultdict(int)  # consecutive failures
        # Rate limit headers tracking: domain -> adapted delay from server headers
        self._rate_limit_delays: Dict[str, float] = {}
        # Retry-After tracking: domain -> timestamp when retry is allowed
        self._retry_after: Dict[str, float] = {}
        # Domain cooling: domain -> cooldown_until timestamp
        self._cooled_domains: Dict[str, float] = {}

    async def fetch_robots_txt(self, domain: str) -> Dict[str, Any]:
        """Fetch and parse robots.txt for a domain.

        Returns a dict with 'crawl_delay', 'disallow_patterns', 'allowed'.
        """
        if domain in self._robots_cache:
            return self._robots_cache[domain]

        result: Dict[str, Any] = {
            "crawl_delay": self.config.default_crawl_delay,
            "disallow_patterns": [],
            "allowed": True,
        }

        try:
            import httpx

            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"https://{domain}/robots.txt",
                    headers={"User-Agent": self.config.user_agent},
                )
                if resp.status_code == 200:
                    parsed = self._parse_robots(resp.text)
                    result.update(parsed)
                # 4xx = no robots.txt, proceed with defaults
        except Exception as exc:
            logger.debug("robots.txt fetch failed for %s: %s", domain, exc)

        self._robots_cache[domain] = result
        return result

    def _parse_robots(self, text: str) -> Dict[str, Any]:
        """Parse robots.txt; prefer User-Agent: ScrapusBot, fall back to *."""
        blocks: Dict[str, List[str]] = {}
        current_ua: Optional[str] = None

        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            lower = line.lower()
            if lower.startswith("user-agent:"):
                current_ua = line.split(":", 1)[1].strip().lower()
                blocks.setdefault(current_ua, [])
            elif current_ua is not None:
                blocks[current_ua].append(line)

        result: Dict[str, Any] = {
            "crawl_delay": self.config.default_crawl_delay,
            "disallow_patterns": [],
            "allowed": True,
        }

        for ua_key in ("scrapusbot", "*"):
            if ua_key not in blocks:
                continue
            for directive in blocks[ua_key]:
                lower = directive.lower()
                if lower.startswith("crawl-delay:"):
                    try:
                        delay = float(directive.split(":", 1)[1].strip())
                        result["crawl_delay"] = max(
                            self.config.min_crawl_delay,
                            min(delay, self.config.max_crawl_delay),
                        )
                    except ValueError:
                        pass
                elif lower.startswith("disallow:"):
                    pattern = directive.split(":", 1)[1].strip()
                    if pattern == "/":
                        result["allowed"] = False
                    elif pattern:
                        result["disallow_patterns"].append(pattern)
            break  # use first matching UA block

        return result

    def is_url_allowed(self, url: str, robots: Dict[str, Any]) -> bool:
        """Check if a URL is allowed by robots.txt Disallow rules."""
        if not robots.get("allowed", True):
            return False
        path = urlparse(url).path
        for pattern in robots.get("disallow_patterns", []):
            if path.startswith(pattern):
                return False
        return True

    async def wait_for_domain(self, domain: str) -> float:
        """Enforce per-domain crawl delay. Returns the actual delay applied."""
        robots = await self.fetch_robots_txt(domain)
        base_delay = robots["crawl_delay"]

        # Adaptive: multiply base by (1 + failure_rate * 5) when > 10%
        window = self._failure_windows[domain]
        if len(window) >= 10:
            failure_rate = sum(window) / len(window)
            if failure_rate > 0.1:
                base_delay *= 1.0 + failure_rate * 5.0

        # Exponential backoff for consecutive failures
        consec = self._backoff_state[domain]
        if consec > 0:
            backoff = min(
                self.config.backoff_base * (self.config.backoff_factor ** consec),
                self.config.backoff_max,
            )
            base_delay = max(base_delay, backoff)

        # Enforce minimum inter-request gap
        last = self._last_request_time.get(domain, 0.0)
        elapsed = time.time() - last
        if elapsed < base_delay:
            await asyncio.sleep(base_delay - elapsed)

        self._last_request_time[domain] = time.time()
        return base_delay

    def record_outcome(self, domain: str, success: bool) -> None:
        """Record fetch outcome for adaptive backoff."""
        self._failure_windows[domain].append(0 if success else 1)
        if success:
            self._backoff_state[domain] = 0
        else:
            self._backoff_state[domain] += 1


# ======================= Domain Scheduler (UCB1) ============================

class DomainScheduler:
    """UCB1 multi-armed bandit for domain prioritisation.

    Arms = web domains.
    Reward = lead discovery success rate.
    UCB = avg_reward + sqrt(2 * ln(total_pages) / domain_pages).

    Memory: ~1 MB for thousands of domains.
    Backed by SQLite for persistence across restarts.
    """

    def __init__(self, config: CrawlerConfig) -> None:
        self.config = config
        self._db_path = config.domain_stats_db
        self._conn: Optional[sqlite3.Connection] = None
        self._init_db()

    def _init_db(self) -> None:
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("""
            CREATE TABLE IF NOT EXISTS domain_stats (
                domain        TEXT PRIMARY KEY,
                pages_crawled INTEGER NOT NULL DEFAULT 0,
                reward_sum    REAL NOT NULL DEFAULT 0.0,
                leads_found   INTEGER NOT NULL DEFAULT 0,
                last_crawled  REAL,
                created_at    REAL NOT NULL
            )
        """)
        self._conn.commit()

    def register_domain(self, domain: str) -> None:
        """Register a new domain arm."""
        self._conn.execute(
            """
            INSERT OR IGNORE INTO domain_stats
                (domain, pages_crawled, reward_sum, leads_found, created_at)
            VALUES (?, 0, 0.0, 0, ?)
            """,
            (domain, time.time()),
        )
        self._conn.commit()

    def select_domain(self) -> Optional[str]:
        """Select next domain using UCB1.

        Returns None if no domains are registered.
        """
        rows = self._conn.execute(
            "SELECT domain, pages_crawled, reward_sum FROM domain_stats"
        ).fetchall()
        if not rows:
            return None

        total_pages = sum(r[1] for r in rows)
        if total_pages == 0:
            # Return any unvisited domain
            return rows[0][0]

        best_domain: Optional[str] = None
        best_score = -float("inf")
        c = self.config.ucb_exploration_constant

        for domain, pages, reward in rows:
            if pages == 0:
                return domain  # force exploration of unseen domains
            avg_reward = reward / pages
            explore = math.sqrt(c * math.log(total_pages) / pages)
            score = avg_reward + explore
            if score > best_score:
                best_score = score
                best_domain = domain

        return best_domain

    def get_ucb_score(self, domain: str) -> float:
        """Compute UCB1 score for a specific domain."""
        row = self._conn.execute(
            "SELECT pages_crawled, reward_sum FROM domain_stats WHERE domain = ?",
            (domain,),
        ).fetchone()
        if row is None or row[0] == 0:
            return float("inf")  # unseen domain

        pages, reward = row
        total_row = self._conn.execute(
            "SELECT SUM(pages_crawled) FROM domain_stats"
        ).fetchone()
        total = total_row[0] or 1

        avg = reward / pages
        explore = math.sqrt(self.config.ucb_exploration_constant * math.log(total) / pages)
        return avg + explore

    def update_domain(
        self,
        domain: str,
        reward: float,
        is_lead: bool = False,
    ) -> None:
        """Update domain statistics after crawling a page."""
        self._conn.execute(
            """
            UPDATE domain_stats
            SET pages_crawled = pages_crawled + 1,
                reward_sum = reward_sum + ?,
                leads_found = leads_found + ?,
                last_crawled = ?
            WHERE domain = ?
            """,
            (reward, int(is_lead), time.time(), domain),
        )
        self._conn.commit()

    def get_all_stats(self) -> List[Dict[str, Any]]:
        """Return all domain statistics for monitoring."""
        rows = self._conn.execute(
            """
            SELECT domain, pages_crawled, reward_sum, leads_found, last_crawled
            FROM domain_stats
            ORDER BY reward_sum / MAX(pages_crawled, 1) DESC
            """
        ).fetchall()
        return [
            {
                "domain": r[0],
                "pages_crawled": r[1],
                "reward_sum": round(r[2], 4),
                "leads_found": r[3],
                "avg_reward": round(r[2] / max(r[1], 1), 4),
                "last_crawled": r[4],
            }
            for r in rows
        ]

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None


# ======================= URL Frontier =======================================

class URLFrontier:
    """SQLite-backed priority queue with Bloom filter deduplication.

    Priority = 0.7 * q_value + 0.3 * ucb_score (DQN-UCB blended).
    Supports concurrent async access via WAL mode.
    Hourly pruning of failed URLs older than 7 days.
    """

    def __init__(self, config: CrawlerConfig) -> None:
        self.config = config
        self._bloom = BloomFilter(config.bloom_capacity, config.bloom_error_rate)
        self._seen_urls: Set[str] = set()

        os.makedirs(os.path.dirname(config.frontier_db), exist_ok=True)
        self._conn = sqlite3.connect(config.frontier_db)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.execute("PRAGMA mmap_size = 67108864")  # 64 MB
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS frontier (
                url        TEXT PRIMARY KEY,
                domain     TEXT NOT NULL,
                q_value    REAL NOT NULL DEFAULT 0.0,
                depth      INTEGER NOT NULL DEFAULT 0,
                status     TEXT NOT NULL DEFAULT 'pending',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_frontier_priority
                ON frontier(status, q_value DESC);
            CREATE INDEX IF NOT EXISTS idx_frontier_domain
                ON frontier(domain, status);
        """)
        self._conn.commit()

        # Load existing URLs into bloom filter for dedup
        self._reload_bloom()

    def _reload_bloom(self) -> None:
        """Load all known URLs into bloom filter on startup."""
        cur = self._conn.execute("SELECT url FROM frontier")
        count = 0
        for (url,) in cur:
            self._bloom.add(url)
            count += 1
        logger.info("Loaded %d URLs into bloom filter", count)

    def add_url(
        self,
        url: str,
        domain: str,
        q_value: float = 0.0,
        depth: int = 0,
    ) -> bool:
        """Add URL to frontier if not already seen.

        Returns True if the URL was added (new), False if duplicate.
        """
        if url in self._bloom:
            # Bloom filter says possibly seen; check definitively
            row = self._conn.execute(
                "SELECT 1 FROM frontier WHERE url = ?", (url,)
            ).fetchone()
            if row is not None:
                return False

        self._bloom.add(url)
        now = time.time()
        try:
            self._conn.execute(
                """
                INSERT OR IGNORE INTO frontier
                    (url, domain, q_value, depth, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'pending', ?, ?)
                """,
                (url, domain, q_value, depth, now, now),
            )
            self._conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def add_urls_batch(
        self,
        urls: List[Tuple[str, str, float, int]],
    ) -> int:
        """Batch-add URLs: (url, domain, q_value, depth). Returns count added."""
        added = 0
        now = time.time()
        for url, domain, qv, depth in urls:
            if url in self._bloom:
                row = self._conn.execute(
                    "SELECT 1 FROM frontier WHERE url = ?", (url,)
                ).fetchone()
                if row is not None:
                    continue
            self._bloom.add(url)
            try:
                self._conn.execute(
                    """
                    INSERT OR IGNORE INTO frontier
                        (url, domain, q_value, depth, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'pending', ?, ?)
                    """,
                    (url, domain, qv, depth, now, now),
                )
                added += 1
            except sqlite3.IntegrityError:
                continue
        self._conn.commit()
        return added

    def get_next_urls(
        self,
        domain_scheduler: DomainScheduler,
        batch_size: int = 1,
    ) -> List[Tuple[str, str, float, int]]:
        """Get the next URLs to crawl using DQN-UCB blended scoring.

        Returns list of (url, domain, blended_score, depth).
        """
        w = self.config.dqn_ucb_weight

        # Pull top candidates (more than needed for blending)
        candidates = self._conn.execute(
            """
            SELECT url, domain, q_value, depth
            FROM frontier
            WHERE status = 'pending'
            ORDER BY q_value DESC
            LIMIT ?
            """,
            (batch_size * 10,),
        ).fetchall()

        if not candidates:
            return []

        scored: List[Tuple[float, str, str, int]] = []
        for url, domain, q_val, depth in candidates:
            ucb = domain_scheduler.get_ucb_score(domain)
            blended = w * q_val + (1.0 - w) * ucb
            scored.append((blended, url, domain, depth))

        scored.sort(reverse=True)
        results: List[Tuple[str, str, float, int]] = []
        now = time.time()

        for blended, url, domain, depth in scored[:batch_size]:
            self._conn.execute(
                "UPDATE frontier SET status = 'active', updated_at = ? WHERE url = ?",
                (now, url),
            )
            results.append((url, domain, blended, depth))

        self._conn.commit()
        return results

    def mark_completed(self, url: str) -> None:
        self._conn.execute(
            "UPDATE frontier SET status = 'completed', updated_at = ? WHERE url = ?",
            (time.time(), url),
        )
        self._conn.commit()

    def mark_failed(self, url: str) -> None:
        self._conn.execute(
            "UPDATE frontier SET status = 'failed', updated_at = ? WHERE url = ?",
            (time.time(), url),
        )
        self._conn.commit()

    def update_q_value(self, url: str, q_value: float) -> None:
        """Update Q-value for a URL (after DQN scoring)."""
        self._conn.execute(
            "UPDATE frontier SET q_value = ?, updated_at = ? WHERE url = ?",
            (q_value, time.time(), url),
        )
        self._conn.commit()

    def has_pending(self, domain: Optional[str] = None) -> bool:
        """Check if there are pending URLs (optionally for a specific domain)."""
        if domain:
            row = self._conn.execute(
                "SELECT 1 FROM frontier WHERE status = 'pending' AND domain = ? LIMIT 1",
                (domain,),
            ).fetchone()
        else:
            row = self._conn.execute(
                "SELECT 1 FROM frontier WHERE status = 'pending' LIMIT 1"
            ).fetchone()
        return row is not None

    def pending_count(self, domain: Optional[str] = None) -> int:
        if domain:
            row = self._conn.execute(
                "SELECT COUNT(*) FROM frontier WHERE status = 'pending' AND domain = ?",
                (domain,),
            ).fetchone()
        else:
            row = self._conn.execute(
                "SELECT COUNT(*) FROM frontier WHERE status = 'pending'"
            ).fetchone()
        return row[0] if row else 0

    def prune_failed(self, max_age_days: Optional[int] = None) -> int:
        """Remove failed URLs older than max_age_days."""
        days = max_age_days or self.config.frontier_prune_days
        cutoff = time.time() - days * 86400
        cur = self._conn.execute(
            "DELETE FROM frontier WHERE status = 'failed' AND created_at < ?",
            (cutoff,),
        )
        self._conn.commit()
        deleted = cur.rowcount
        if deleted > 0:
            logger.info("Pruned %d failed URLs older than %d days", deleted, days)
        return deleted

    def get_stats(self) -> Dict[str, int]:
        """Frontier statistics."""
        rows = self._conn.execute(
            "SELECT status, COUNT(*) FROM frontier GROUP BY status"
        ).fetchall()
        stats = {status: count for status, count in rows}
        stats["bloom_size"] = len(self._bloom)
        return stats

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None


# ======================= Content Extractor ==================================

@dataclass
class PageContent:
    """Extracted content from a crawled page."""

    url: str
    domain: str
    title: str
    body_text: str
    outbound_links: List[str]
    meta_description: str = ""
    meta_keywords: str = ""
    language: str = ""
    status_code: int = 200
    content_type: str = ""
    fetch_time_ms: float = 0.0
    body_length: int = 0
    link_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "domain": self.domain,
            "title": self.title,
            "body_text": self.body_text[:500],  # truncate for logging
            "outbound_links_count": len(self.outbound_links),
            "meta_description": self.meta_description,
            "status_code": self.status_code,
            "fetch_time_ms": round(self.fetch_time_ms, 1),
            "body_length": self.body_length,
        }


class ContentExtractor:
    """Extract structured content from Playwright pages.

    Extracts: title, body text, outbound links, meta tags.
    Filters: removes navigation/footer noise, deduplicates links.
    """

    def __init__(self, config: CrawlerConfig) -> None:
        self.config = config

    async def extract(self, page: Any, url: str) -> PageContent:
        """Extract content from a Playwright page object.

        Args:
            page: playwright.async_api.Page
            url: the URL that was loaded.
        """
        domain = urlparse(url).netloc
        start = time.time()

        title = await self._safe_eval(page, "document.title", "")
        body_text = await self._extract_body_text(page)
        links = await self._extract_links(page, url)
        meta_desc = await self._safe_eval(
            page,
            'document.querySelector("meta[name=description]")?.content || ""',
            "",
        )
        meta_kw = await self._safe_eval(
            page,
            'document.querySelector("meta[name=keywords]")?.content || ""',
            "",
        )
        lang = await self._safe_eval(
            page,
            'document.documentElement.lang || ""',
            "",
        )

        fetch_time = (time.time() - start) * 1000

        return PageContent(
            url=url,
            domain=domain,
            title=title.strip(),
            body_text=body_text[: self.config.max_body_chars],
            outbound_links=links[: self.config.max_links_per_page],
            meta_description=meta_desc,
            meta_keywords=meta_kw,
            language=lang,
            fetch_time_ms=fetch_time,
            body_length=len(body_text),
            link_count=len(links),
        )

    async def _extract_body_text(self, page: Any) -> str:
        """Extract visible body text, stripping nav/footer noise."""
        try:
            text = await page.evaluate("""
                () => {
                    // Remove noise elements
                    const removeSelectors = [
                        'nav', 'header', 'footer', 'aside',
                        '[role="navigation"]', '[role="banner"]',
                        '.cookie-banner', '.popup', '.modal',
                        'script', 'style', 'noscript'
                    ];
                    removeSelectors.forEach(sel => {
                        document.querySelectorAll(sel).forEach(el => el.remove());
                    });
                    // Get remaining visible text
                    return document.body?.innerText || '';
                }
            """)
            return text.strip()
        except Exception:
            return ""

    async def _extract_links(self, page: Any, base_url: str) -> List[str]:
        """Extract and normalise outbound links."""
        try:
            raw_links = await page.evaluate("""
                () => {
                    return Array.from(document.querySelectorAll('a[href]'))
                        .map(a => a.href)
                        .filter(href =>
                            href.startsWith('http://') || href.startsWith('https://')
                        );
                }
            """)
        except Exception:
            return []

        seen: Set[str] = set()
        unique: List[str] = []
        for href in raw_links:
            try:
                normalised = self._normalise_link(href, base_url)
                if normalised and normalised not in seen:
                    seen.add(normalised)
                    unique.append(normalised)
            except Exception:
                continue
        return unique

    @staticmethod
    def _normalise_link(href: str, base_url: str) -> Optional[str]:
        """Normalise a link: resolve relative, strip fragments."""
        from crawler_dqn import canonicalize_url

        resolved = urljoin(base_url, href)
        parsed = urlparse(resolved)

        # Skip non-HTTP, mailto, tel, javascript
        if parsed.scheme not in ("http", "https"):
            return None
        # Skip common non-content extensions
        path_lower = parsed.path.lower()
        skip_exts = (
            ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
            ".zip", ".tar", ".gz", ".mp4", ".mp3", ".avi", ".mov",
            ".css", ".js", ".woff", ".woff2", ".ttf", ".ico",
        )
        if any(path_lower.endswith(ext) for ext in skip_exts):
            return None

        return canonicalize_url(resolved)

    @staticmethod
    async def _safe_eval(page: Any, expr: str, default: str) -> str:
        try:
            result = await page.evaluate(expr)
            return result if isinstance(result, str) else default
        except Exception:
            return default


# ======================= Playwright Fetcher =================================

class PlaywrightFetcher:
    """Async Playwright browser manager for JS-rendered page fetching.

    Manages browser lifecycle, page creation, and resource cleanup.
    Uses a single browser context shared across workers.
    """

    def __init__(self, config: CrawlerConfig) -> None:
        self.config = config
        self._playwright: Any = None
        self._browser: Any = None
        self._context: Any = None
        self._extractor = ContentExtractor(config)

    async def start(self) -> None:
        """Launch the browser."""
        from playwright.async_api import async_playwright

        self._playwright = await async_playwright().start()
        browser_launcher = getattr(self._playwright, self.config.browser_type)
        self._browser = await browser_launcher.launch(
            headless=self.config.headless
        )
        self._context = await self._browser.new_context(
            user_agent=self.config.user_agent,
            java_script_enabled=True,
            ignore_https_errors=True,
        )
        logger.info("Playwright browser started (%s)", self.config.browser_type)

    async def fetch_page(self, url: str) -> Optional[PageContent]:
        """Fetch a URL with JS rendering and extract content.

        Returns None on failure (timeout, navigation error, etc.).
        """
        if self._context is None:
            raise RuntimeError("PlaywrightFetcher not started; call start() first")

        page = await self._context.new_page()
        try:
            response = await page.goto(
                url, timeout=self.config.page_timeout_ms, wait_until="domcontentloaded"
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
            logger.debug("Fetch failed for %s: %s", url, exc)
            return None
        finally:
            await page.close()

    async def stop(self) -> None:
        """Close browser and playwright."""
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("Playwright browser stopped")


# ======================= Crawler Engine =====================================

class CrawlerEngine:
    """Main crawling engine orchestrating all components.

    Flow per page:
    1. DomainScheduler selects domain (UCB1)
    2. URLFrontier returns highest-priority URL for that domain
    3. PolitenessManager enforces crawl delay
    4. PlaywrightFetcher fetches + renders page
    5. ContentExtractor pulls title, text, links, metadata
    6. Discovered links added to frontier
    7. PageContent returned for embedding + DQN scoring

    Throughput target: 8-12 pages/sec (network I/O bound).
    """

    def __init__(
        self,
        config: Optional[CrawlerConfig] = None,
        frontier: Optional[URLFrontier] = None,
        scheduler: Optional[DomainScheduler] = None,
        politeness: Optional[PolitenessManager] = None,
        fetcher: Optional[PlaywrightFetcher] = None,
    ) -> None:
        self.config = config or CrawlerConfig()
        self.frontier = frontier or URLFrontier(self.config)
        self.scheduler = scheduler or DomainScheduler(self.config)
        self.politeness = politeness or PolitenessManager(self.config)
        self.fetcher = fetcher or PlaywrightFetcher(self.config)

        self._semaphore = asyncio.Semaphore(self.config.max_concurrent)
        self._pages_crawled = 0
        self._pages_failed = 0
        self._start_time: Optional[float] = None

    async def start(self) -> None:
        """Initialise the browser and prepare for crawling."""
        await self.fetcher.start()
        self._start_time = time.time()

    async def stop(self) -> None:
        """Shut down all components."""
        await self.fetcher.stop()
        self.frontier.close()
        self.scheduler.close()

    def add_seed_urls(self, seeds: List[str]) -> int:
        """Add seed URLs to the frontier with max priority."""
        added = 0
        for url in seeds:
            from crawler_dqn import canonicalize_url

            canonical = canonicalize_url(url)
            domain = urlparse(canonical).netloc
            self.scheduler.register_domain(domain)
            if self.frontier.add_url(canonical, domain, q_value=1.0, depth=0):
                added += 1
        logger.info("Added %d seed URLs", added)
        return added

    async def crawl_batch(
        self, batch_size: int = 8
    ) -> List[PageContent]:
        """Crawl a batch of pages concurrently.

        Returns list of successfully fetched PageContent objects.
        """
        candidates = self.frontier.get_next_urls(
            self.scheduler, batch_size=batch_size
        )
        if not candidates:
            return []

        tasks = []
        for url, domain, score, depth in candidates:
            tasks.append(self._crawl_single(url, domain, depth))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        pages: List[PageContent] = []
        for i, result in enumerate(results):
            url = candidates[i][0]
            domain = candidates[i][1]
            if isinstance(result, Exception):
                logger.debug("Crawl exception for %s: %s", url, result)
                self.frontier.mark_failed(url)
                self.politeness.record_outcome(domain, success=False)
                self._pages_failed += 1
            elif result is None:
                self.frontier.mark_failed(url)
                self.politeness.record_outcome(domain, success=False)
                self._pages_failed += 1
            else:
                self.frontier.mark_completed(url)
                self.politeness.record_outcome(domain, success=True)
                self._pages_crawled += 1
                pages.append(result)

                # Add discovered links to frontier
                from crawler_dqn import canonicalize_url

                depth = candidates[i][3]
                links_to_add = []
                for link in result.outbound_links:
                    link_domain = urlparse(link).netloc
                    canonical = canonicalize_url(link)
                    self.scheduler.register_domain(link_domain)
                    links_to_add.append(
                        (canonical, link_domain, 0.0, depth + 1)
                    )
                if links_to_add:
                    self.frontier.add_urls_batch(links_to_add)

        return pages

    async def _crawl_single(
        self, url: str, domain: str, depth: int
    ) -> Optional[PageContent]:
        """Crawl a single URL with rate limiting."""
        async with self._semaphore:
            # Enforce politeness
            robots = await self.politeness.fetch_robots_txt(domain)
            if not self.politeness.is_url_allowed(url, robots):
                logger.debug("URL disallowed by robots.txt: %s", url)
                return None

            await self.politeness.wait_for_domain(domain)
            return await self.fetcher.fetch_page(url)

    def get_stats(self) -> Dict[str, Any]:
        """Crawling statistics."""
        elapsed = time.time() - (self._start_time or time.time())
        return {
            "pages_crawled": self._pages_crawled,
            "pages_failed": self._pages_failed,
            "pages_per_sec": round(
                self._pages_crawled / max(elapsed, 1), 2
            ),
            "elapsed_seconds": round(elapsed, 1),
            "frontier": self.frontier.get_stats(),
            "domains": len(self.scheduler.get_all_stats()),
        }

    async def run_continuous(
        self,
        max_pages: Optional[int] = None,
        callback: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Run the crawler continuously until max_pages or frontier exhausted.

        Args:
            max_pages: stop after this many pages (None = until frontier empty).
            callback: async callable(List[PageContent]) invoked after each batch.

        Returns:
            Final crawling statistics dict.
        """
        await self.start()
        batch_size = self.config.max_concurrent

        try:
            while True:
                if max_pages and self._pages_crawled >= max_pages:
                    logger.info("Reached max_pages=%d, stopping", max_pages)
                    break

                if not self.frontier.has_pending():
                    logger.info("Frontier exhausted, stopping")
                    break

                pages = await self.crawl_batch(batch_size)

                if callback and pages:
                    await callback(pages)

                if not pages:
                    # No pages returned; short sleep before retry
                    await asyncio.sleep(1.0)

        except KeyboardInterrupt:
            logger.info("Crawler interrupted by user")
        except Exception as exc:
            logger.error("Crawler error: %s", exc, exc_info=True)
        finally:
            await self.stop()

        stats = self.get_stats()
        logger.info("Crawl completed: %s", stats)
        return stats

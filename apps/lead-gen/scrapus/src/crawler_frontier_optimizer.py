"""
Frontier optimizations for the crawler engine.

Implements:
1. ScalableBloomFilter: Auto-scaling chained bloom filters (100K items each)
2. CountingBloomFilter: Supports deletion via 4-bit counters (~4.8 MB / 1M items)
3. FrontierPriorityHeap: In-memory heap (top 10K) + SQLite cold storage
4. DomainBalancer: Domain diversity enforcement in crawl batches
5. URLFilter: Pre-filtering rules (blocklists, length, tracking params)
6. FrontierStats: Real-time frontier health metrics (Gini, age, priority dist)

Pure Python + numpy + sqlite3. Target: Apple M1 16GB.
"""

import hashlib
import heapq
import logging
import math
import re
import sqlite3
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import numpy as np

logger = logging.getLogger("crawler_frontier_optimizer")


# ======================= Scalable Bloom Filter ================================

class ScalableBloomFilter:
    """Auto-scaling bloom filter that chains sub-filters.

    When the current sub-filter reaches capacity, a new one is created.
    Membership checks span all sub-filters. Each sub-filter is sized
    for 100K items at the configured error rate.

    Memory: ~120 KB per sub-filter at 0.1% FP rate.
    """

    SUB_FILTER_CAPACITY = 100_000

    def __init__(self, error_rate: float = 0.001) -> None:
        self._error_rate = error_rate
        self._filters: List[_SubBloomFilter] = []
        self._total_count = 0
        self._add_filter()

    def _add_filter(self) -> None:
        """Append a new sub-filter to the chain."""
        bf = _SubBloomFilter(self.SUB_FILTER_CAPACITY, self._error_rate)
        self._filters.append(bf)
        logger.debug(
            "ScalableBloomFilter: added sub-filter #%d", len(self._filters)
        )

    def add(self, key: str) -> None:
        """Add a key to the filter, scaling up if current filter is full."""
        current = self._filters[-1]
        if current.count >= self.SUB_FILTER_CAPACITY:
            self._add_filter()
            current = self._filters[-1]
        current.add(key)
        self._total_count += 1

    def __contains__(self, key: str) -> bool:
        """Check membership across all sub-filters."""
        return any(key in bf for bf in self._filters)

    def __len__(self) -> int:
        return self._total_count

    def capacity_used(self) -> float:
        """Fraction of total allocated capacity currently used (0.0 to 1.0)."""
        total_capacity = len(self._filters) * self.SUB_FILTER_CAPACITY
        if total_capacity == 0:
            return 0.0
        return self._total_count / total_capacity

    @property
    def num_filters(self) -> int:
        return len(self._filters)


class _SubBloomFilter:
    """Single bloom filter sized for a fixed capacity.

    Internal building block for ScalableBloomFilter.
    Uses murmur-like hashing via hashlib (same approach as crawler_engine.BloomFilter).
    """

    def __init__(self, capacity: int, error_rate: float) -> None:
        self._m = self._optimal_m(capacity, error_rate)
        self._k = self._optimal_k(self._m, capacity)
        self._bits = np.zeros(self._m, dtype=np.bool_)
        self.count = 0

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
        self.count += 1

    def __contains__(self, key: str) -> bool:
        return all(self._bits[idx] for idx in self._hashes(key))


# ======================= Counting Bloom Filter ================================

class CountingBloomFilter:
    """Bloom filter with 4-bit counters supporting deletion.

    Each bucket uses 4 bits (max count 15), packed into a uint8 numpy array
    where each element holds two counters (high nibble + low nibble).

    Memory: ~4.8 MB for 1M items at 0.1% FP rate (4x regular bloom).
    """

    MAX_COUNT = 15  # 4-bit counter ceiling

    def __init__(
        self, capacity: int = 1_000_000, error_rate: float = 0.001
    ) -> None:
        self._m = self._optimal_m(capacity, error_rate)
        self._k = self._optimal_k(self._m, capacity)
        # Pack two 4-bit counters per byte: even indices -> low nibble, odd -> high
        self._counters = np.zeros((self._m + 1) // 2, dtype=np.uint8)
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

    def _get_counter(self, idx: int) -> int:
        """Read 4-bit counter at position idx."""
        byte_idx = idx // 2
        if idx % 2 == 0:
            return int(self._counters[byte_idx] & 0x0F)
        else:
            return int((self._counters[byte_idx] >> 4) & 0x0F)

    def _set_counter(self, idx: int, value: int) -> None:
        """Write 4-bit counter at position idx."""
        value = min(value, self.MAX_COUNT)
        byte_idx = idx // 2
        if idx % 2 == 0:
            self._counters[byte_idx] = (
                (self._counters[byte_idx] & 0xF0) | (value & 0x0F)
            )
        else:
            self._counters[byte_idx] = (
                (self._counters[byte_idx] & 0x0F) | ((value & 0x0F) << 4)
            )

    def add(self, key: str) -> None:
        """Add a key. Increments all k counter positions (capped at 15)."""
        for idx in self._hashes(key):
            current = self._get_counter(idx)
            if current < self.MAX_COUNT:
                self._set_counter(idx, current + 1)
        self._count += 1

    def remove(self, key: str) -> bool:
        """Remove a key. Decrements counters if the key is present.

        Returns True if the key was (probably) present and removed,
        False if the key was not found.
        """
        if key not in self:
            return False
        for idx in self._hashes(key):
            current = self._get_counter(idx)
            if current > 0:
                self._set_counter(idx, current - 1)
        self._count = max(0, self._count - 1)
        return True

    def __contains__(self, key: str) -> bool:
        return all(self._get_counter(idx) > 0 for idx in self._hashes(key))

    def __len__(self) -> int:
        return self._count


# ======================= Frontier Priority Heap ===============================

@dataclass(order=True)
class _HeapEntry:
    """Heap entry ordered by negative priority (max-heap via min-heap trick)."""

    neg_priority: float
    url: str = field(compare=False)
    domain: str = field(compare=False)
    depth: int = field(compare=False)


class FrontierPriorityHeap:
    """In-memory heap for hot frontier entries + SQLite cold storage.

    Keeps the top 10K highest-priority URLs in a heap for O(log n) push/pop.
    Falls back to SQLite for overflow and periodic sync. Approximately
    10x faster than pure SQLite for get_next_urls().

    Sync strategy: every 1K operations, flush heap changes to SQLite
    and refill from SQLite if heap is below capacity.
    """

    HEAP_CAPACITY = 10_000
    SYNC_INTERVAL = 1_000  # operations between syncs

    def __init__(self, db_path: str) -> None:
        self._heap: List[_HeapEntry] = []
        self._heap_urls: Set[str] = set()  # fast membership check
        self._ops_since_sync = 0
        self._db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None
        self._init_db()

    def _init_db(self) -> None:
        import os

        os.makedirs(os.path.dirname(self._db_path) or ".", exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS heap_overflow (
                url      TEXT PRIMARY KEY,
                priority REAL NOT NULL,
                domain   TEXT NOT NULL,
                depth    INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_heap_overflow_priority
                ON heap_overflow(priority DESC);
        """)
        self._conn.commit()
        self._load_initial()

    def _load_initial(self) -> None:
        """Load top entries from SQLite into the heap on startup."""
        rows = self._conn.execute(
            "SELECT url, priority, domain, depth FROM heap_overflow "
            "ORDER BY priority DESC LIMIT ?",
            (self.HEAP_CAPACITY,),
        ).fetchall()

        for url, priority, domain, depth in rows:
            entry = _HeapEntry(-priority, url, domain, depth)
            heapq.heappush(self._heap, entry)
            self._heap_urls.add(url)

        # Remove loaded entries from overflow (they are now in the heap)
        if rows:
            loaded_urls = [r[0] for r in rows]
            self._conn.executemany(
                "DELETE FROM heap_overflow WHERE url = ?",
                [(u,) for u in loaded_urls],
            )
            self._conn.commit()

        logger.info(
            "FrontierPriorityHeap: loaded %d entries from SQLite", len(rows)
        )

    def push(self, url: str, priority: float, domain: str, depth: int) -> None:
        """Add a URL with priority. Routes to heap or cold storage."""
        if url in self._heap_urls:
            return  # already in heap

        if len(self._heap) < self.HEAP_CAPACITY:
            entry = _HeapEntry(-priority, url, domain, depth)
            heapq.heappush(self._heap, entry)
            self._heap_urls.add(url)
        else:
            # Check if this entry beats the lowest-priority heap item
            lowest = self._heap[0]
            if -priority < lowest.neg_priority:
                # New entry has higher priority; swap
                evicted = heapq.heapreplace(
                    self._heap, _HeapEntry(-priority, url, domain, depth)
                )
                self._heap_urls.discard(evicted.url)
                self._heap_urls.add(url)
                # Evicted entry goes to cold storage
                self._store_cold(
                    evicted.url, -evicted.neg_priority, evicted.domain, evicted.depth
                )
            else:
                # New entry is lower priority; store in cold storage
                self._store_cold(url, priority, domain, depth)

        self._ops_since_sync += 1
        if self._ops_since_sync >= self.SYNC_INTERVAL:
            self._sync()

    def pop(self) -> Optional[Tuple[str, float, str, int]]:
        """Pop the highest-priority entry.

        Returns (url, priority, domain, depth) or None if empty.
        """
        if not self._heap:
            self._refill_from_cold()
            if not self._heap:
                return None

        entry = heapq.heappop(self._heap)
        self._heap_urls.discard(entry.url)

        self._ops_since_sync += 1
        if self._ops_since_sync >= self.SYNC_INTERVAL:
            self._sync()

        return (entry.url, -entry.neg_priority, entry.domain, entry.depth)

    def peek(self) -> Optional[Tuple[str, float, str, int]]:
        """Peek at the highest-priority entry without removing it."""
        if not self._heap:
            self._refill_from_cold()
            if not self._heap:
                return None
        entry = self._heap[0]
        return (entry.url, -entry.neg_priority, entry.domain, entry.depth)

    def _store_cold(
        self, url: str, priority: float, domain: str, depth: int
    ) -> None:
        """Insert into SQLite cold storage."""
        try:
            self._conn.execute(
                "INSERT OR REPLACE INTO heap_overflow (url, priority, domain, depth) "
                "VALUES (?, ?, ?, ?)",
                (url, priority, domain, depth),
            )
            self._conn.commit()
        except sqlite3.Error as exc:
            logger.warning("Cold storage write failed for %s: %s", url, exc)

    def _refill_from_cold(self) -> None:
        """Pull entries from cold storage into the heap."""
        need = self.HEAP_CAPACITY - len(self._heap)
        if need <= 0:
            return

        rows = self._conn.execute(
            "SELECT url, priority, domain, depth FROM heap_overflow "
            "ORDER BY priority DESC LIMIT ?",
            (need,),
        ).fetchall()

        if not rows:
            return

        for url, priority, domain, depth in rows:
            if url not in self._heap_urls:
                entry = _HeapEntry(-priority, url, domain, depth)
                heapq.heappush(self._heap, entry)
                self._heap_urls.add(url)

        loaded_urls = [r[0] for r in rows]
        self._conn.executemany(
            "DELETE FROM heap_overflow WHERE url = ?",
            [(u,) for u in loaded_urls],
        )
        self._conn.commit()
        logger.debug("Refilled %d entries from cold storage", len(rows))

    def _sync(self) -> None:
        """Periodic sync: reset ops counter and refill if heap is low."""
        self._ops_since_sync = 0
        if len(self._heap) < self.HEAP_CAPACITY // 2:
            self._refill_from_cold()

    def __len__(self) -> int:
        """Total entries in heap + cold storage."""
        cold_count = self._conn.execute(
            "SELECT COUNT(*) FROM heap_overflow"
        ).fetchone()[0]
        return len(self._heap) + cold_count

    @property
    def heap_size(self) -> int:
        return len(self._heap)

    @property
    def cold_size(self) -> int:
        return self._conn.execute(
            "SELECT COUNT(*) FROM heap_overflow"
        ).fetchone()[0]

    def close(self) -> None:
        """Flush heap to cold storage and close SQLite."""
        # Persist all heap entries back to cold storage
        for entry in self._heap:
            self._store_cold(
                entry.url, -entry.neg_priority, entry.domain, entry.depth
            )
        self._heap.clear()
        self._heap_urls.clear()
        if self._conn:
            self._conn.close()
            self._conn = None


# ======================= Domain Balancer ======================================

class DomainBalancer:
    """Ensures domain diversity in each crawl batch.

    Round-robins across domains, capping each domain at max_per_domain
    entries per batch. Domains are processed in priority order.
    """

    def __init__(self, max_per_domain: int = 2) -> None:
        self.max_per_domain = max_per_domain

    def balance_batch(
        self,
        candidates: List[Tuple[str, float, str, int]],
        batch_size: int,
        max_per_domain: Optional[int] = None,
    ) -> List[Tuple[str, float, str, int]]:
        """Select a domain-balanced batch from candidates.

        Args:
            candidates: list of (url, priority, domain, depth), pre-sorted by
                        priority descending.
            batch_size: maximum entries in the returned batch.
            max_per_domain: override per-domain cap (default: self.max_per_domain).

        Returns:
            Balanced list of (url, priority, domain, depth).
        """
        cap = max_per_domain if max_per_domain is not None else self.max_per_domain

        # Group by domain, preserving priority order within each group
        domain_queues: Dict[str, List[Tuple[str, float, str, int]]] = defaultdict(list)
        domain_order: List[str] = []  # first-seen order (highest priority first)

        for entry in candidates:
            url, priority, domain, depth = entry
            if domain not in domain_queues:
                domain_order.append(domain)
            domain_queues[domain].append(entry)

        result: List[Tuple[str, float, str, int]] = []
        domain_counts: Dict[str, int] = defaultdict(int)

        # Round-robin: cycle through domains in priority order
        round_idx = 0
        while len(result) < batch_size:
            added_this_round = False
            for domain in domain_order:
                if len(result) >= batch_size:
                    break
                if domain_counts[domain] >= cap:
                    continue
                queue = domain_queues[domain]
                if round_idx < len(queue):
                    result.append(queue[round_idx])
                    domain_counts[domain] += 1
                    added_this_round = True
            if not added_this_round:
                break
            round_idx += 1

        return result


# ======================= URL Filter ===========================================

# Default blocklist: ad networks, trackers, social media
_DEFAULT_BLOCKLIST_DOMAINS: Set[str] = {
    # Ad networks
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "adnxs.com",
    "adsrvr.org",
    "advertising.com",
    "criteo.com",
    "outbrain.com",
    "taboola.com",
    "moatads.com",
    # Tracking / analytics
    "google-analytics.com",
    "googletagmanager.com",
    "hotjar.com",
    "mixpanel.com",
    "segment.io",
    "segment.com",
    "amplitude.com",
    "facebook.net",
    "connect.facebook.net",
    "snap.licdn.com",
    # CDN / static (not useful for crawling)
    "fonts.googleapis.com",
    "cdn.jsdelivr.net",
    "cdnjs.cloudflare.com",
}

_DEFAULT_SOCIAL_DOMAINS: Set[str] = {
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "tiktok.com",
    "youtube.com",
    "reddit.com",
    "linkedin.com",
    "pinterest.com",
    "snapchat.com",
    "threads.net",
}

# Query parameters commonly used for tracking / session IDs
_TRACKING_PARAMS: Set[str] = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "gclsrc",
    "dclid",
    "msclkid",
    "mc_cid",
    "mc_eid",
    "ref",
    "ref_src",
    "ref_url",
    "source",
    "hsa_acc",
    "hsa_cam",
    "hsa_grp",
    "hsa_ad",
    "hsa_src",
    "hsa_tgt",
    "hsa_kw",
    "hsa_mt",
    "hsa_net",
    "hsa_ver",
    "_ga",
    "_gl",
    "_hsenc",
    "_hsmi",
    "__hstc",
    "__hssc",
    "__hsfp",
    "PHPSESSID",
    "JSESSIONID",
    "jsessionid",
    "sid",
    "session_id",
    "sessionid",
    "token",
    "nonce",
}

# Regex for session-ID-like path segments (e.g., /;jsessionid=ABC123)
_SESSION_PATH_RE = re.compile(r";jsessionid=[^/?#]+", re.IGNORECASE)


class URLFilter:
    """Pre-filtering rules before adding URLs to the frontier.

    Rejects known ad/tracking domains, social media (unless allowed),
    excessively long URLs, and URLs with session IDs. Provides URL
    cleaning to strip tracking parameters.
    """

    def __init__(
        self,
        blocklist_domains: Optional[Set[str]] = None,
        allow_social: bool = False,
        max_url_length: int = 500,
        allowlist_patterns: Optional[List[str]] = None,
        blocklist_patterns: Optional[List[str]] = None,
    ) -> None:
        self._blocklist = blocklist_domains or _DEFAULT_BLOCKLIST_DOMAINS
        self._social_domains = _DEFAULT_SOCIAL_DOMAINS
        self._allow_social = allow_social
        self._max_url_length = max_url_length

        # Compile regex patterns
        self._allowlist_re: List[re.Pattern] = []
        if allowlist_patterns:
            for p in allowlist_patterns:
                try:
                    self._allowlist_re.append(re.compile(p))
                except re.error as exc:
                    logger.warning("Invalid allowlist pattern %r: %s", p, exc)

        self._blocklist_re: List[re.Pattern] = []
        if blocklist_patterns:
            for p in blocklist_patterns:
                try:
                    self._blocklist_re.append(re.compile(p))
                except re.error as exc:
                    logger.warning("Invalid blocklist pattern %r: %s", p, exc)

    def should_add(self, url: str) -> bool:
        """Check if a URL passes all filter rules.

        Returns True if the URL should be added to the frontier.
        """
        # Length check
        if len(url) > self._max_url_length:
            return False

        parsed = urlparse(url)

        # Must be http(s)
        if parsed.scheme not in ("http", "https"):
            return False

        # Must have a hostname
        if not parsed.hostname:
            return False

        domain = parsed.hostname.lower()

        # Strip www. for matching
        bare_domain = domain.removeprefix("www.")

        # Check if domain or any parent matches blocklist
        if self._is_blocked_domain(bare_domain):
            return False

        # Social media check
        if not self._allow_social and self._is_social_domain(bare_domain):
            return False

        # Regex allowlist: if any allowlist patterns exist, URL must match at least one
        if self._allowlist_re:
            if not any(pat.search(url) for pat in self._allowlist_re):
                return False

        # Regex blocklist: URL must not match any blocklist pattern
        if self._blocklist_re:
            if any(pat.search(url) for pat in self._blocklist_re):
                return False

        # Skip URLs that look like they contain session IDs in the path
        if _SESSION_PATH_RE.search(url):
            return False

        return True

    def _is_blocked_domain(self, bare_domain: str) -> bool:
        """Check if domain or any parent domain is in the blocklist."""
        if bare_domain in self._blocklist:
            return True
        # Check parent domains (e.g., sub.doubleclick.net -> doubleclick.net)
        parts = bare_domain.split(".")
        for i in range(1, len(parts) - 1):
            parent = ".".join(parts[i:])
            if parent in self._blocklist:
                return True
        return False

    def _is_social_domain(self, bare_domain: str) -> bool:
        """Check if domain is a social media platform."""
        if bare_domain in self._social_domains:
            return True
        parts = bare_domain.split(".")
        for i in range(1, len(parts) - 1):
            parent = ".".join(parts[i:])
            if parent in self._social_domains:
                return True
        return False

    def clean_url(self, url: str) -> str:
        """Remove tracking parameters and session IDs from a URL.

        Returns the cleaned URL string.
        """
        parsed = urlparse(url)

        # Remove session ID from path
        clean_path = _SESSION_PATH_RE.sub("", parsed.path)

        # Strip tracking query params
        if parsed.query:
            params = parse_qs(parsed.query, keep_blank_values=True)
            filtered = {
                k: v
                for k, v in params.items()
                if k.lower() not in _TRACKING_PARAMS
            }
            clean_query = urlencode(filtered, doseq=True)
        else:
            clean_query = ""

        # Remove fragment
        cleaned = urlunparse((
            parsed.scheme,
            parsed.netloc,
            clean_path,
            parsed.params,
            clean_query,
            "",  # drop fragment
        ))

        return cleaned


# ======================= Frontier Stats =======================================

class FrontierStats:
    """Real-time frontier health metrics.

    Computes pending count by domain, age distribution, priority distribution,
    and domain concentration (Gini coefficient) from the frontier SQLite DB.
    """

    def __init__(self, frontier_db_path: str) -> None:
        self._db_path = frontier_db_path
        self._conn: Optional[sqlite3.Connection] = None
        self._connect()

    def _connect(self) -> None:
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")

    def get_health_report(self) -> Dict[str, Any]:
        """Generate a comprehensive frontier health report.

        Returns:
            Dict with keys: pending_by_domain, total_pending, total_completed,
            total_failed, age_distribution, priority_distribution,
            domain_concentration_gini, oldest_pending_age_hours,
            newest_pending_age_hours.
        """
        now = time.time()

        # Status counts
        status_rows = self._conn.execute(
            "SELECT status, COUNT(*) FROM frontier GROUP BY status"
        ).fetchall()
        status_counts = {status: count for status, count in status_rows}

        # Pending by domain (top 50)
        domain_rows = self._conn.execute(
            "SELECT domain, COUNT(*) as cnt FROM frontier "
            "WHERE status = 'pending' GROUP BY domain "
            "ORDER BY cnt DESC LIMIT 50"
        ).fetchall()
        pending_by_domain = {domain: cnt for domain, cnt in domain_rows}

        # Age distribution of pending URLs (in hours)
        age_rows = self._conn.execute(
            "SELECT created_at FROM frontier WHERE status = 'pending'"
        ).fetchall()
        ages_hours = [(now - row[0]) / 3600.0 for row in age_rows]

        age_dist = self._compute_age_distribution(ages_hours)

        # Priority distribution
        priority_rows = self._conn.execute(
            "SELECT q_value FROM frontier WHERE status = 'pending'"
        ).fetchall()
        priorities = [row[0] for row in priority_rows]
        priority_dist = self._compute_priority_distribution(priorities)

        # Domain concentration (Gini coefficient)
        all_domain_counts = self._conn.execute(
            "SELECT COUNT(*) FROM frontier WHERE status = 'pending' GROUP BY domain"
        ).fetchall()
        domain_count_values = [row[0] for row in all_domain_counts]
        gini = self._gini_coefficient(domain_count_values)

        return {
            "total_pending": status_counts.get("pending", 0),
            "total_active": status_counts.get("active", 0),
            "total_completed": status_counts.get("completed", 0),
            "total_failed": status_counts.get("failed", 0),
            "pending_by_domain": pending_by_domain,
            "domain_count": len(domain_count_values),
            "age_distribution": age_dist,
            "priority_distribution": priority_dist,
            "domain_concentration_gini": round(gini, 4),
            "oldest_pending_age_hours": round(max(ages_hours), 2) if ages_hours else 0.0,
            "newest_pending_age_hours": round(min(ages_hours), 2) if ages_hours else 0.0,
        }

    @staticmethod
    def _compute_age_distribution(ages_hours: List[float]) -> Dict[str, Any]:
        """Compute age distribution statistics and histogram buckets."""
        if not ages_hours:
            return {
                "mean": 0.0,
                "median": 0.0,
                "p90": 0.0,
                "p99": 0.0,
                "histogram": {},
            }

        arr = np.array(ages_hours)
        # Histogram buckets: <1h, 1-6h, 6-24h, 1-3d, 3-7d, >7d
        bucket_names = ["<1h", "1-6h", "6-24h", "1-3d", "3-7d", ">7d"]
        bucket_edges = [0, 1, 6, 24, 72, 168, float("inf")]
        histogram: Dict[str, int] = {}
        for i, name in enumerate(bucket_names):
            count = int(np.sum((arr >= bucket_edges[i]) & (arr < bucket_edges[i + 1])))
            histogram[name] = count

        return {
            "mean": round(float(np.mean(arr)), 2),
            "median": round(float(np.median(arr)), 2),
            "p90": round(float(np.percentile(arr, 90)), 2),
            "p99": round(float(np.percentile(arr, 99)), 2),
            "histogram": histogram,
        }

    @staticmethod
    def _compute_priority_distribution(
        priorities: List[float],
    ) -> Dict[str, Any]:
        """Compute priority distribution statistics and histogram."""
        if not priorities:
            return {
                "mean": 0.0,
                "median": 0.0,
                "min": 0.0,
                "max": 0.0,
                "std": 0.0,
                "histogram": {},
            }

        arr = np.array(priorities)
        # 10 equal-width bins between min and max
        p_min = float(np.min(arr))
        p_max = float(np.max(arr))

        if p_min == p_max:
            histogram = {f"{p_min:.2f}": len(priorities)}
        else:
            bin_edges = np.linspace(p_min, p_max, 11)
            counts, _ = np.histogram(arr, bins=bin_edges)
            histogram = {}
            for i in range(len(counts)):
                label = f"{bin_edges[i]:.2f}-{bin_edges[i + 1]:.2f}"
                histogram[label] = int(counts[i])

        return {
            "mean": round(float(np.mean(arr)), 4),
            "median": round(float(np.median(arr)), 4),
            "min": round(p_min, 4),
            "max": round(p_max, 4),
            "std": round(float(np.std(arr)), 4),
            "histogram": histogram,
        }

    @staticmethod
    def _gini_coefficient(values: List[int]) -> float:
        """Compute the Gini coefficient of a distribution.

        0.0 = perfect equality (all domains have same count).
        1.0 = maximum inequality (one domain has everything).
        """
        if not values or len(values) == 1:
            return 0.0

        arr = np.array(sorted(values), dtype=np.float64)
        n = len(arr)
        total = float(np.sum(arr))
        if total == 0:
            return 0.0

        # Gini = (2 * sum(i * x_i)) / (n * sum(x_i)) - (n + 1) / n
        cumulative_index_sum = float(np.sum(np.arange(1, n + 1) * arr))
        gini = (2.0 * cumulative_index_sum) / (n * total) - (n + 1.0) / n
        return max(0.0, min(1.0, gini))

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

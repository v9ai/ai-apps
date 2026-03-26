"""
Module 1: Dynamic seed URL refresh for long-running crawls.

Prevents frontier exhaustion by periodically discovering new seed URLs
from multiple sources:
1. DuckDuckGoSeedSource: keyword-based web search (no API key, rate-limited)
2. FileSeedSource: load URLs from a local JSON/text file with rotation
3. DomainExpansionSource: find related domains via Common Crawl index API

Coordination via SeedRefreshManager which monitors frontier depth and
triggers refresh when pending URLs drop below a configurable threshold.

Integration points:
- URLFrontier: pending_count(), add_url(), bloom filter dedup
- DomainScheduler: register_domain(), get_all_stats() for domain scoring
- Bloom filter (from crawler_engine): dedup against existing frontier

Memory budget: <10 MB (httpx client + JSON state).
Target: Apple M1 16GB, zero cloud dependency.
"""

import asyncio
import json
import logging
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from urllib.parse import urlparse

logger = logging.getLogger("crawler_seed_refresh")


# ======================= Configuration ======================================

@dataclass
class SeedRefreshConfig:
    """All tunables for the seed refresh subsystem."""

    # Timing
    refresh_interval: int = 3600  # check every hour (seconds)
    frontier_low_threshold: int = 100  # refresh when pending < threshold
    max_seeds_per_refresh: int = 50

    # File source
    seed_sources_file: str = "scrapus_data/seed_sources.json"

    # Search engines (no API key needed)
    search_engines: List[str] = field(default_factory=lambda: ["duckduckgo"])

    # Keywords for B2B lead discovery
    target_keywords: List[str] = field(default_factory=list)

    # Domains to never seed
    domain_blocklist: List[str] = field(default_factory=list)

    # Rate limiting for search queries
    search_delay_seconds: float = 10.0  # 1 query per 10 seconds

    # Common Crawl settings
    commoncrawl_index: str = "CC-MAIN-2024-10"
    commoncrawl_max_results: int = 20

    # Data directory
    data_dir: str = "scrapus_data"


# ======================= Seed Source Protocol ================================

class SeedSource(ABC):
    """Abstract base class for seed URL discovery sources."""

    @abstractmethod
    async def discover(
        self,
        keywords: List[str],
        max_results: int = 50,
    ) -> List[str]:
        """Discover new seed URLs.

        Args:
            keywords: search terms for seed discovery.
            max_results: maximum URLs to return.

        Returns:
            List of discovered URLs (deduplicated within source).
        """
        ...


# ======================= DuckDuckGo Seed Source ==============================

class DuckDuckGoSeedSource(SeedSource):
    """Discover seed URLs via DuckDuckGo HTML search (no API key).

    Rate-limited to 1 query per 10 seconds to avoid throttling.
    Extracts result URLs from DuckDuckGo lite HTML response.
    """

    def __init__(self, config: SeedRefreshConfig) -> None:
        self.config = config
        self._last_query_time: float = 0.0

    async def discover(
        self,
        keywords: List[str],
        max_results: int = 50,
    ) -> List[str]:
        """Search DuckDuckGo for each keyword and collect result URLs."""
        import httpx

        all_urls: List[str] = []
        seen: Set[str] = set()

        for keyword in keywords:
            if len(all_urls) >= max_results:
                break

            # Rate limit: wait between queries
            await self._rate_limit()

            try:
                urls = await self._search_query(keyword)
                for url in urls:
                    if url not in seen and len(all_urls) < max_results:
                        seen.add(url)
                        all_urls.append(url)
            except Exception as exc:
                logger.warning(
                    "DuckDuckGo search failed for '%s': %s", keyword, exc
                )
                continue

        logger.info(
            "DuckDuckGo discovered %d URLs from %d keywords",
            len(all_urls),
            len(keywords),
        )
        return all_urls

    async def _search_query(self, keyword: str) -> List[str]:
        """Execute a single DuckDuckGo lite search and extract URLs."""
        import httpx

        urls: List[str] = []

        async with httpx.AsyncClient(
            timeout=15.0,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
            },
        ) as client:
            resp = await client.get(
                "https://lite.duckduckgo.com/lite/",
                params={"q": keyword, "kl": ""},
            )
            if resp.status_code != 200:
                logger.debug(
                    "DuckDuckGo returned status %d for '%s'",
                    resp.status_code,
                    keyword,
                )
                return urls

            urls = self._extract_urls_from_html(resp.text)

        return urls

    @staticmethod
    def _extract_urls_from_html(html: str) -> List[str]:
        """Extract result URLs from DuckDuckGo lite HTML.

        DuckDuckGo lite returns results as plain links in <a> tags
        with class 'result-link' or inside result snippets.
        """
        import re

        urls: List[str] = []
        seen: Set[str] = set()

        # Match href attributes pointing to external sites
        pattern = re.compile(
            r'href="(https?://(?!lite\.duckduckgo|duckduckgo)[^"]+)"'
        )
        for match in pattern.finditer(html):
            url = match.group(1)
            # Skip DuckDuckGo internal/redirect URLs
            if "duckduckgo.com" in url:
                continue
            parsed = urlparse(url)
            if parsed.scheme in ("http", "https") and parsed.netloc:
                canonical = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
                if canonical not in seen:
                    seen.add(canonical)
                    urls.append(url)

        return urls

    async def _rate_limit(self) -> None:
        """Enforce minimum delay between search queries."""
        elapsed = time.time() - self._last_query_time
        if elapsed < self.config.search_delay_seconds:
            delay = self.config.search_delay_seconds - elapsed
            await asyncio.sleep(delay)
        self._last_query_time = time.time()


# ======================= File Seed Source ====================================

class FileSeedSource(SeedSource):
    """Load seed URLs from a local JSON or text file.

    Supports rotation: tracks which URLs have been used and
    avoids re-seeding them. Marks used seeds in a companion
    state file (<source_file>.state.json).

    JSON format: {"urls": ["https://...", ...]}
    Text format: one URL per line.
    """

    def __init__(self, file_path: str) -> None:
        self._file_path = file_path
        self._state_path = f"{file_path}.state.json"
        self._used_urls: Set[str] = set()
        self._load_state()

    def _load_state(self) -> None:
        """Load used-URL state from disk."""
        if os.path.exists(self._state_path):
            try:
                with open(self._state_path, "r") as f:
                    data = json.load(f)
                self._used_urls = set(data.get("used_urls", []))
                logger.debug(
                    "Loaded %d used URLs from state file", len(self._used_urls)
                )
            except (json.JSONDecodeError, OSError) as exc:
                logger.warning("Failed to load seed state: %s", exc)
                self._used_urls = set()

    def _save_state(self) -> None:
        """Persist used-URL state to disk."""
        try:
            os.makedirs(os.path.dirname(self._state_path) or ".", exist_ok=True)
            with open(self._state_path, "w") as f:
                json.dump({"used_urls": list(self._used_urls)}, f)
        except OSError as exc:
            logger.warning("Failed to save seed state: %s", exc)

    async def discover(
        self,
        keywords: List[str],
        max_results: int = 50,
    ) -> List[str]:
        """Load unused URLs from the seed file.

        Keywords are ignored; all URLs in the file are candidates.
        """
        if not os.path.exists(self._file_path):
            logger.debug("Seed file not found: %s", self._file_path)
            return []

        all_urls = self._load_urls_from_file()
        fresh: List[str] = []

        for url in all_urls:
            if url in self._used_urls:
                continue
            fresh.append(url)
            self._used_urls.add(url)
            if len(fresh) >= max_results:
                break

        # Persist rotation state
        if fresh:
            self._save_state()
            logger.info(
                "File source yielded %d fresh URLs (total used: %d)",
                len(fresh),
                len(self._used_urls),
            )

        return fresh

    def _load_urls_from_file(self) -> List[str]:
        """Load URLs from JSON or plain-text file."""
        try:
            with open(self._file_path, "r") as f:
                content = f.read().strip()
        except OSError as exc:
            logger.warning("Failed to read seed file %s: %s", self._file_path, exc)
            return []

        # Try JSON first
        if content.startswith("{") or content.startswith("["):
            try:
                data = json.loads(content)
                if isinstance(data, dict):
                    return data.get("urls", [])
                if isinstance(data, list):
                    return [u for u in data if isinstance(u, str)]
            except json.JSONDecodeError:
                pass

        # Fall back to one URL per line
        urls: List[str] = []
        for line in content.splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                urls.append(line)
        return urls


# ======================= Domain Expansion Source =============================

class DomainExpansionSource(SeedSource):
    """Find related domains using Common Crawl index API and domain heuristics.

    Given top-performing domains from the scheduler, discovers:
    1. Similar sites via Common Crawl index API (free, no key)
    2. Subdomains of high-reward root domains
    3. Related companies from the same industry vertical

    Rate-limited to avoid hammering the Common Crawl API.
    """

    def __init__(self, config: SeedRefreshConfig) -> None:
        self.config = config
        self._last_query_time: float = 0.0

    async def discover(
        self,
        keywords: List[str],
        max_results: int = 50,
    ) -> List[str]:
        """Discover related domains via Common Crawl index.

        Keywords are interpreted as domains to expand.
        """
        import httpx

        all_urls: List[str] = []
        seen: Set[str] = set()

        for domain in keywords:
            if len(all_urls) >= max_results:
                break

            # Rate limit
            await self._rate_limit()

            try:
                urls = await self._query_commoncrawl(domain)
                for url in urls:
                    if url not in seen and len(all_urls) < max_results:
                        seen.add(url)
                        all_urls.append(url)
            except Exception as exc:
                logger.debug(
                    "Common Crawl query failed for '%s': %s", domain, exc
                )
                continue

        logger.info(
            "Domain expansion discovered %d URLs from %d domains",
            len(all_urls),
            len(keywords),
        )
        return all_urls

    async def _query_commoncrawl(self, domain: str) -> List[str]:
        """Query Common Crawl index API for pages under a domain.

        Returns discovered URLs from the Common Crawl index.
        """
        import httpx

        urls: List[str] = []
        index = self.config.commoncrawl_index
        api_url = f"https://index.commoncrawl.org/{index}-index"

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                api_url,
                params={
                    "url": f"*.{domain}",
                    "output": "json",
                    "limit": str(self.config.commoncrawl_max_results),
                },
            )
            if resp.status_code != 200:
                logger.debug(
                    "Common Crawl returned status %d for '%s'",
                    resp.status_code,
                    domain,
                )
                return urls

            # Response is newline-delimited JSON
            for line in resp.text.strip().splitlines():
                try:
                    record = json.loads(line)
                    url = record.get("url", "")
                    if url and url.startswith("http"):
                        urls.append(url)
                except json.JSONDecodeError:
                    continue

        return urls

    async def find_related_domains(
        self,
        top_domains: List[str],
        max_results: int = 20,
    ) -> List[str]:
        """Find domains related to top-performing ones.

        Uses Common Crawl to discover subdomains and linked sites
        from high-reward domains.
        """
        related: List[str] = []
        seen: Set[str] = set(top_domains)

        for domain in top_domains:
            if len(related) >= max_results:
                break

            await self._rate_limit()

            try:
                urls = await self._query_commoncrawl(domain)
                for url in urls:
                    parsed = urlparse(url)
                    found_domain = parsed.netloc
                    if found_domain and found_domain not in seen:
                        seen.add(found_domain)
                        # Return the root URL for the discovered domain
                        related.append(f"https://{found_domain}/")
                        if len(related) >= max_results:
                            break
            except Exception as exc:
                logger.debug(
                    "Related domain discovery failed for '%s': %s",
                    domain,
                    exc,
                )
                continue

        return related

    async def _rate_limit(self) -> None:
        """Enforce minimum delay between Common Crawl queries."""
        elapsed = time.time() - self._last_query_time
        if elapsed < self.config.search_delay_seconds:
            delay = self.config.search_delay_seconds - elapsed
            await asyncio.sleep(delay)
        self._last_query_time = time.time()


# ======================= Seed Refresh Manager ================================

class SeedRefreshManager:
    """Coordinates seed refresh across multiple sources.

    Periodically checks frontier depth and triggers refresh when
    pending URLs fall below the configured threshold. Deduplicates
    new seeds against the frontier's bloom filter and scores them
    using domain scheduler statistics.

    Lifecycle:
        manager = SeedRefreshManager(config)
        # In crawl loop:
        added = await manager.refresh_if_needed(frontier, scheduler)

    All seed additions are logged to an audit trail file.
    """

    def __init__(self, config: Optional[SeedRefreshConfig] = None) -> None:
        self.config = config or SeedRefreshConfig()

        # Sources (initialised lazily)
        self._sources: List[SeedSource] = []
        self._initialised = False

        # Tracking
        self._last_refresh_time: float = 0.0
        self._refreshes_triggered: int = 0
        self._total_seeds_added: int = 0
        self._sources_used: Dict[str, int] = {}

        # Audit log
        self._audit_path = os.path.join(
            self.config.data_dir, "seed_refresh_audit.jsonl"
        )

        # Blocklist set for fast lookup
        self._blocklist: Set[str] = set(self.config.domain_blocklist)

    def _init_sources(self) -> None:
        """Initialise seed sources based on configuration."""
        if self._initialised:
            return

        # DuckDuckGo search source
        if "duckduckgo" in self.config.search_engines:
            self._sources.append(DuckDuckGoSeedSource(self.config))
            logger.info("Registered DuckDuckGo seed source")

        # File source
        if os.path.exists(self.config.seed_sources_file):
            self._sources.append(FileSeedSource(self.config.seed_sources_file))
            logger.info(
                "Registered file seed source: %s", self.config.seed_sources_file
            )

        self._initialised = True

    async def refresh_if_needed(
        self,
        frontier: Any,  # URLFrontier
        scheduler: Any,  # DomainScheduler
    ) -> int:
        """Check frontier depth and trigger refresh if needed.

        Args:
            frontier: URLFrontier instance (must have pending_count(), add_url()).
            scheduler: DomainScheduler instance (must have get_all_stats(),
                       register_domain()).

        Returns:
            Number of new seed URLs added to the frontier.
        """
        self._init_sources()

        # Time gate: don't refresh more often than refresh_interval
        now = time.time()
        if now - self._last_refresh_time < self.config.refresh_interval:
            return 0

        # Frontier depth check
        pending = frontier.pending_count()
        if pending >= self.config.frontier_low_threshold:
            return 0

        logger.info(
            "Frontier low (%d pending < %d threshold), triggering seed refresh",
            pending,
            self.config.frontier_low_threshold,
        )

        self._last_refresh_time = now
        self._refreshes_triggered += 1

        # Gather candidate URLs from all sources
        candidates = await self._gather_candidates(scheduler)
        if not candidates:
            logger.info("No new seed candidates discovered")
            return 0

        # Filter and deduplicate against frontier bloom filter
        filtered = self._filter_candidates(candidates, frontier)
        if not filtered:
            logger.info("All candidates already in frontier")
            return 0

        # Score candidates using scheduler domain stats
        scored = self._score_candidates(filtered, scheduler)

        # Take top N by score
        scored.sort(key=lambda x: x[1], reverse=True)
        top = scored[: self.config.max_seeds_per_refresh]

        # Add to frontier
        added = 0
        for url, score in top:
            domain = urlparse(url).netloc
            scheduler.register_domain(domain)
            if frontier.add_url(url, domain, q_value=score, depth=0):
                added += 1

        self._total_seeds_added += added

        # Audit log
        self._log_audit(added, len(candidates), len(filtered))

        logger.info(
            "Seed refresh complete: %d added (from %d candidates, %d after filter)",
            added,
            len(candidates),
            len(filtered),
        )
        return added

    async def _gather_candidates(
        self,
        scheduler: Any,
    ) -> List[str]:
        """Gather candidate URLs from all registered sources."""
        all_candidates: List[str] = []
        remaining = self.config.max_seeds_per_refresh * 2  # gather extra for filtering

        # Build keywords: configured keywords + top-performing domain names
        keywords = list(self.config.target_keywords)

        # Add domain expansion source dynamically for top-performing domains
        top_domains = self._get_top_domains(scheduler, limit=5)
        expansion_source: Optional[DomainExpansionSource] = None
        if top_domains:
            expansion_source = DomainExpansionSource(self.config)

        # Query each registered source
        for source in self._sources:
            if remaining <= 0:
                break
            try:
                urls = await source.discover(keywords, max_results=remaining)
                source_name = type(source).__name__
                self._sources_used[source_name] = (
                    self._sources_used.get(source_name, 0) + len(urls)
                )
                all_candidates.extend(urls)
                remaining -= len(urls)
            except Exception as exc:
                logger.error(
                    "Seed source %s failed: %s", type(source).__name__, exc
                )

        # Domain expansion pass
        if expansion_source and remaining > 0:
            try:
                expanded = await expansion_source.find_related_domains(
                    top_domains, max_results=remaining
                )
                self._sources_used["DomainExpansionSource"] = (
                    self._sources_used.get("DomainExpansionSource", 0)
                    + len(expanded)
                )
                all_candidates.extend(expanded)
            except Exception as exc:
                logger.error("Domain expansion failed: %s", exc)

        return all_candidates

    def _filter_candidates(
        self,
        candidates: List[str],
        frontier: Any,
    ) -> List[str]:
        """Filter candidates: remove blocked domains, dupes, and frontier-known URLs."""
        filtered: List[str] = []
        seen: Set[str] = set()

        for url in candidates:
            if url in seen:
                continue
            seen.add(url)

            parsed = urlparse(url)
            domain = parsed.netloc

            # Blocklist check
            if domain in self._blocklist:
                continue
            # Check if any blocklist entry is a suffix (e.g., "spam.com" blocks "sub.spam.com")
            if any(domain.endswith(f".{blocked}") for blocked in self._blocklist):
                continue

            # Skip non-HTTP schemes
            if parsed.scheme not in ("http", "https"):
                continue

            # Deduplicate against frontier bloom filter
            # Access the bloom filter via frontier's internal check
            # (frontier.add_url returns False for dupes, but we don't want
            # to add yet; use the bloom filter heuristic)
            try:
                if hasattr(frontier, "_bloom") and url in frontier._bloom:
                    continue
            except Exception:
                pass

            filtered.append(url)

        return filtered

    def _score_candidates(
        self,
        candidates: List[str],
        scheduler: Any,
    ) -> List[tuple]:
        """Score candidate URLs using domain scheduler statistics.

        Prefers domains similar to high-reward ones. New (unseen) domains
        get an exploration bonus.

        Returns list of (url, score) tuples.
        """
        # Build domain reward map from scheduler stats
        all_stats = scheduler.get_all_stats()
        domain_rewards: Dict[str, float] = {}
        for stat in all_stats:
            domain_rewards[stat["domain"]] = stat.get("avg_reward", 0.0)

        # Compute global average for similarity baseline
        if domain_rewards:
            avg_reward = sum(domain_rewards.values()) / len(domain_rewards)
        else:
            avg_reward = 0.0

        scored: List[tuple] = []
        for url in candidates:
            domain = urlparse(url).netloc

            if domain in domain_rewards:
                # Known domain: use its historical reward
                score = domain_rewards[domain]
            else:
                # Unknown domain: exploration bonus (slightly above average)
                score = avg_reward + 0.1

            scored.append((url, score))

        return scored

    def _get_top_domains(
        self,
        scheduler: Any,
        limit: int = 5,
    ) -> List[str]:
        """Get top-performing domains by average reward."""
        all_stats = scheduler.get_all_stats()
        # Already sorted by avg_reward DESC in DomainScheduler.get_all_stats()
        top = [
            stat["domain"]
            for stat in all_stats[:limit]
            if stat.get("pages_crawled", 0) > 0
        ]
        return top

    def _log_audit(
        self,
        added: int,
        candidates: int,
        filtered: int,
    ) -> None:
        """Append a seed refresh event to the audit log."""
        entry = {
            "timestamp": time.time(),
            "refreshes_triggered": self._refreshes_triggered,
            "candidates_discovered": candidates,
            "candidates_after_filter": filtered,
            "seeds_added": added,
            "total_seeds_added": self._total_seeds_added,
            "sources_used": dict(self._sources_used),
        }
        try:
            os.makedirs(os.path.dirname(self._audit_path) or ".", exist_ok=True)
            with open(self._audit_path, "a") as f:
                f.write(json.dumps(entry) + "\n")
        except OSError as exc:
            logger.warning("Failed to write audit log: %s", exc)

    def get_stats(self) -> Dict[str, Any]:
        """Return seed refresh statistics for monitoring."""
        return {
            "refreshes_triggered": self._refreshes_triggered,
            "seeds_added": self._total_seeds_added,
            "sources_used": dict(self._sources_used),
            "last_refresh_time": self._last_refresh_time,
            "blocklist_size": len(self._blocklist),
        }

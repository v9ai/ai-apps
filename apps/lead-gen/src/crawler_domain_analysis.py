"""
Domain analysis and classification for the RL-based focused web crawler.

Implements:
1. DomainClassifier: rule-based industry vertical classification (TLD, keywords, content)
2. DomainRelationshipMapper: SQLite-backed domain graph from cross-domain hyperlinks
3. DomainHealthMonitor: per-domain health tracking with trend detection
4. DomainPrioritizer: multi-signal domain ranking (UCB1, health, class, relationships)
5. DomainExplorer: discover new domains from crawled content and link patterns

Integration points:
- DomainScheduler: UCB1 scores feed into DomainPrioritizer
- URLFrontier: discovered domains get registered and seeded
- CrawlerEngine: health metrics updated after each fetch

Storage: SQLite at scrapus_data/domain_analysis.db (~5-10 MB for 10K domains).
Memory: <15 MB (in-memory caches + numpy arrays).

Target: Apple M1 16GB, zero cloud dependency.
"""

import collections
import logging
import math
import os
import re
import sqlite3
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse

import numpy as np

logger = logging.getLogger("crawler_domain_analysis")


# ======================= Configuration ======================================

@dataclass
class DomainAnalysisConfig:
    """All tunables for the domain analysis subsystem."""

    # Storage
    db_path: str = "scrapus_data/domain_analysis.db"

    # Health monitoring
    health_window_size: int = 100  # rolling window for health metrics
    health_min_samples: int = 5  # minimum samples before health is meaningful
    death_threshold: float = 0.1  # success rate below this = domain dead
    death_min_requests: int = 20  # min requests before declaring death
    restructure_threshold: float = 0.5  # content similarity drop = restructured

    # Prioritisation weights
    weight_ucb: float = 0.5
    weight_health: float = 0.2
    weight_class_match: float = 0.2
    weight_relationship: float = 0.1

    # Domain exploration
    max_discovery_candidates: int = 50
    partner_page_patterns: List[str] = field(default_factory=lambda: [
        r"/partners?",
        r"/clients?",
        r"/customers?",
        r"/portfolio",
        r"/case-stud(?:y|ies)",
        r"/integrations?",
        r"/ecosystem",
        r"/about[\-/]us",
    ])

    # Target industries for boosting (set at runtime)
    target_industries: List[str] = field(default_factory=list)


# ======================= Domain Classifier ==================================

class DomainClassifier:
    """Rule-based domain classification into industry verticals.

    Classification pipeline:
    1. TLD check (.gov -> government, .edu -> education, .org -> nonprofit)
    2. Domain keyword matching (health, med -> healthcare, bank -> finance)
    3. Content signal analysis (term frequency in crawled pages)

    No ML needed -- deterministic rules with content-based refinement.
    """

    VERTICALS = (
        "saas", "consulting", "manufacturing", "healthcare", "finance",
        "legal", "education", "government", "retail", "logistics",
        "media", "nonprofit", "other",
    )

    # TLD -> vertical (highest confidence)
    _TLD_MAP: Dict[str, str] = {
        ".gov": "government",
        ".gov.uk": "government",
        ".gov.au": "government",
        ".gov.de": "government",
        ".edu": "education",
        ".edu.au": "education",
        ".ac.uk": "education",
        ".ac.jp": "education",
        ".org": "nonprofit",
    }

    # Domain keyword patterns -> vertical (medium confidence)
    _DOMAIN_KEYWORDS: List[Tuple[List[str], str]] = [
        (["health", "med", "pharma", "clinic", "hospital", "care"], "healthcare"),
        (["bank", "fin", "capital", "invest", "insur", "credit", "fund"], "finance"),
        (["law", "legal", "attorney", "advocate", "juris"], "legal"),
        (["edu", "learn", "school", "university", "academy", "course", "tutor"], "education"),
        (["shop", "store", "retail", "ecommerce", "buy", "mart"], "retail"),
        (["ship", "freight", "logist", "cargo", "transport", "delivery"], "logistics"),
        (["news", "media", "press", "journal", "magazine", "blog", "publish"], "media"),
        (["consult", "advisory", "strateg"], "consulting"),
        (["manufactur", "industr", "factory", "produc"], "manufacturing"),
        (["cloud", "saas", "software", "app", "platform", "api", "dev", "tech"], "saas"),
    ]

    # Content term patterns -> vertical (lower confidence, needs frequency)
    _CONTENT_SIGNALS: Dict[str, List[str]] = {
        "healthcare": [
            "patient", "clinical", "diagnosis", "treatment", "medical",
            "hospital", "physician", "healthcare", "pharma", "FDA",
        ],
        "finance": [
            "portfolio", "investment", "banking", "trading", "compliance",
            "regulatory", "fintech", "AML", "KYC", "asset management",
        ],
        "legal": [
            "litigation", "attorney", "court", "legal counsel", "jurisdiction",
            "trademark", "patent", "compliance", "regulation",
        ],
        "education": [
            "curriculum", "student", "enrollment", "faculty", "academic",
            "semester", "degree", "campus", "scholarship",
        ],
        "retail": [
            "shopping cart", "checkout", "product catalog", "inventory",
            "price", "discount", "shipping", "return policy",
        ],
        "logistics": [
            "supply chain", "warehouse", "fulfillment", "tracking",
            "freight", "shipment", "last mile", "fleet",
        ],
        "media": [
            "editorial", "newsroom", "journalist", "content strategy",
            "subscriber", "readership", "podcast", "broadcast",
        ],
        "consulting": [
            "advisory", "engagement", "deliverable", "stakeholder",
            "strategy", "transformation", "roadmap", "assessment",
        ],
        "manufacturing": [
            "production line", "quality control", "supply chain", "raw material",
            "assembly", "lean manufacturing", "ISO", "factory",
        ],
        "saas": [
            "API", "dashboard", "SaaS", "subscription", "onboarding",
            "integration", "webhook", "SDK", "microservice", "CI/CD",
        ],
        "government": [
            "public sector", "citizen", "municipality", "federal",
            "regulation", "policy", "government", "agency",
        ],
    }

    def classify(
        self,
        domain: str,
        pages_content: Optional[List[str]] = None,
    ) -> str:
        """Classify a domain into an industry vertical.

        Args:
            domain: the domain name (e.g. 'stripe.com').
            pages_content: optional list of page body texts for content analysis.

        Returns:
            Industry vertical string from VERTICALS.
        """
        # Phase 1: TLD check (highest confidence)
        tld_result = self._classify_by_tld(domain)
        if tld_result is not None:
            return tld_result

        # Phase 2: Domain keyword matching
        keyword_result = self._classify_by_domain_keywords(domain)

        # Phase 3: Content analysis (if pages provided)
        content_result = None
        content_confidence = 0.0
        if pages_content:
            content_result, content_confidence = self._classify_by_content(
                pages_content
            )

        # Combine signals: content overrides keywords if confidence is high
        if content_result and content_confidence > 0.3:
            return content_result
        if keyword_result:
            return keyword_result
        if content_result:
            return content_result

        return "other"

    def classify_batch(self, domains: List[str]) -> Dict[str, str]:
        """Classify multiple domains (no content, TLD + keyword only).

        Args:
            domains: list of domain names.

        Returns:
            Dict mapping domain -> industry vertical.
        """
        return {domain: self.classify(domain) for domain in domains}

    def _classify_by_tld(self, domain: str) -> Optional[str]:
        """Check if domain TLD maps directly to a vertical."""
        domain_lower = domain.lower()
        # Check compound TLDs first (e.g. .gov.uk), then simple
        for tld, vertical in sorted(
            self._TLD_MAP.items(), key=lambda x: -len(x[0])
        ):
            if domain_lower.endswith(tld):
                return vertical
        return None

    def _classify_by_domain_keywords(self, domain: str) -> Optional[str]:
        """Check if domain name contains industry keywords."""
        # Strip TLD for keyword matching
        domain_lower = domain.lower()
        parts = domain_lower.split(".")
        # Focus on the registrable domain name (not TLD)
        name_parts = parts[:-1] if len(parts) > 1 else parts
        name = "".join(name_parts)

        for keywords, vertical in self._DOMAIN_KEYWORDS:
            for kw in keywords:
                if kw in name:
                    return vertical
        return None

    def _classify_by_content(
        self,
        pages_content: List[str],
    ) -> Tuple[Optional[str], float]:
        """Classify by term frequency in page content.

        Returns (vertical, confidence) where confidence is normalised 0-1.
        """
        # Concatenate and lowercase all content
        combined = " ".join(pages_content).lower()
        if len(combined) < 100:
            return None, 0.0

        scores: Dict[str, float] = {}
        for vertical, terms in self._CONTENT_SIGNALS.items():
            count = 0
            for term in terms:
                count += combined.count(term.lower())
            # Normalise by number of terms to avoid bias toward larger term lists
            scores[vertical] = count / len(terms) if terms else 0.0

        if not scores:
            return None, 0.0

        best_vertical = max(scores, key=scores.get)
        best_score = scores[best_vertical]

        # Confidence: ratio of best to second-best
        sorted_scores = sorted(scores.values(), reverse=True)
        if len(sorted_scores) > 1 and sorted_scores[1] > 0:
            confidence = min(1.0, best_score / (sorted_scores[1] + 1e-9))
        elif best_score > 0:
            confidence = 1.0
        else:
            confidence = 0.0

        if best_score < 0.5:
            return None, 0.0

        return best_vertical, confidence


# ======================= Domain Relationship Mapper =========================

class DomainRelationshipMapper:
    """Track inter-domain relationships from cross-domain hyperlinks.

    Builds a domain graph where edges represent hyperlinks between domains.
    Edge weight = number of cross-domain links observed.
    SQLite-backed for persistence across restarts.
    """

    def __init__(self, config: DomainAnalysisConfig) -> None:
        self.config = config
        self._db_path = config.db_path
        self._conn: Optional[sqlite3.Connection] = None
        self._init_db()

    def _init_db(self) -> None:
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS domain_links (
                source_domain TEXT NOT NULL,
                target_domain TEXT NOT NULL,
                link_count    INTEGER NOT NULL DEFAULT 1,
                first_seen    REAL NOT NULL,
                last_seen     REAL NOT NULL,
                PRIMARY KEY (source_domain, target_domain)
            );
            CREATE INDEX IF NOT EXISTS idx_domain_links_target
                ON domain_links(target_domain);
            CREATE INDEX IF NOT EXISTS idx_domain_links_source
                ON domain_links(source_domain);
        """)
        self._conn.commit()

    def add_link(self, source_domain: str, target_domain: str) -> None:
        """Record a cross-domain hyperlink.

        Increments link_count if the edge already exists.
        """
        if source_domain == target_domain:
            return  # ignore self-links

        now = time.time()
        self._conn.execute(
            """
            INSERT INTO domain_links
                (source_domain, target_domain, link_count, first_seen, last_seen)
            VALUES (?, ?, 1, ?, ?)
            ON CONFLICT(source_domain, target_domain)
            DO UPDATE SET
                link_count = link_count + 1,
                last_seen = ?
            """,
            (source_domain, target_domain, now, now, now),
        )
        self._conn.commit()

    def add_links_batch(
        self,
        links: List[Tuple[str, str]],
    ) -> int:
        """Batch-add cross-domain links. Returns count of edges upserted."""
        now = time.time()
        count = 0
        for source, target in links:
            if source == target:
                continue
            self._conn.execute(
                """
                INSERT INTO domain_links
                    (source_domain, target_domain, link_count, first_seen, last_seen)
                VALUES (?, ?, 1, ?, ?)
                ON CONFLICT(source_domain, target_domain)
                DO UPDATE SET
                    link_count = link_count + 1,
                    last_seen = ?
                """,
                (source, target, now, now, now),
            )
            count += 1
        self._conn.commit()
        return count

    def get_related_domains(
        self,
        domain: str,
        n: int = 10,
    ) -> List[Tuple[str, float]]:
        """Get domains most related to the given domain.

        Relationship strength = normalised link count (bidirectional).
        Returns list of (domain, strength) sorted by strength descending.
        """
        rows = self._conn.execute(
            """
            SELECT other_domain, total_links FROM (
                SELECT target_domain AS other_domain,
                       SUM(link_count) AS total_links
                FROM domain_links
                WHERE source_domain = ?
                GROUP BY target_domain
                UNION ALL
                SELECT source_domain AS other_domain,
                       SUM(link_count) AS total_links
                FROM domain_links
                WHERE target_domain = ?
                GROUP BY source_domain
            )
            GROUP BY other_domain
            ORDER BY SUM(total_links) DESC
            LIMIT ?
            """,
            (domain, domain, n),
        ).fetchall()

        if not rows:
            return []

        # Normalise to 0-1 range
        max_links = max(r[1] for r in rows)
        if max_links == 0:
            return [(r[0], 0.0) for r in rows]

        return [(r[0], round(r[1] / max_links, 4)) for r in rows]

    def get_clusters(self) -> List[Set[str]]:
        """Find connected components in the domain graph.

        Uses union-find for efficiency. Returns list of domain sets.
        """
        # Load all edges
        edges = self._conn.execute(
            "SELECT source_domain, target_domain FROM domain_links"
        ).fetchall()

        if not edges:
            return []

        # Collect all domains
        all_domains: Set[str] = set()
        for src, tgt in edges:
            all_domains.add(src)
            all_domains.add(tgt)

        # Union-Find
        parent: Dict[str, str] = {d: d for d in all_domains}
        rank: Dict[str, int] = {d: 0 for d in all_domains}

        def find(x: str) -> str:
            while parent[x] != x:
                parent[x] = parent[parent[x]]  # path compression
                x = parent[x]
            return x

        def union(a: str, b: str) -> None:
            ra, rb = find(a), find(b)
            if ra == rb:
                return
            if rank[ra] < rank[rb]:
                ra, rb = rb, ra
            parent[rb] = ra
            if rank[ra] == rank[rb]:
                rank[ra] += 1

        for src, tgt in edges:
            union(src, tgt)

        # Group by root
        clusters: Dict[str, Set[str]] = collections.defaultdict(set)
        for d in all_domains:
            clusters[find(d)].add(d)

        # Sort by size descending
        return sorted(clusters.values(), key=len, reverse=True)

    def get_hub_domains(self, n: int = 20) -> List[str]:
        """Get domains with the most inbound links (hub domains).

        These are likely industry aggregators, directories, or popular sites.
        """
        rows = self._conn.execute(
            """
            SELECT target_domain, SUM(link_count) AS inbound
            FROM domain_links
            GROUP BY target_domain
            ORDER BY inbound DESC
            LIMIT ?
            """,
            (n,),
        ).fetchall()
        return [r[0] for r in rows]

    def get_edge_count(self) -> int:
        """Total number of domain-to-domain edges."""
        row = self._conn.execute(
            "SELECT COUNT(*) FROM domain_links"
        ).fetchone()
        return row[0] if row else 0

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None


# ======================= Domain Health Monitor ==============================

class DomainHealthMonitor:
    """Track domain health over time with trend detection.

    Metrics per domain (rolling window):
    - Success rate: fraction of successful fetches
    - Avg latency: mean response time in milliseconds
    - Content quality: avg content quality score (0-1)
    - Lead density: avg reward per page (lead discovery rate)

    Detects:
    - Domain death: all recent requests failing
    - Domain restructuring: content quality pattern change
    - Improving/declining trends: reward rate over time
    """

    def __init__(self, config: DomainAnalysisConfig) -> None:
        self.config = config
        self._db_path = config.db_path
        self._conn: Optional[sqlite3.Connection] = None
        self._init_db()

        # In-memory rolling windows for fast stats (per domain)
        self._success_windows: Dict[str, collections.deque] = {}
        self._latency_windows: Dict[str, collections.deque] = {}
        self._quality_windows: Dict[str, collections.deque] = {}
        self._reward_windows: Dict[str, collections.deque] = {}

    def _init_db(self) -> None:
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS domain_health (
                domain           TEXT PRIMARY KEY,
                total_requests   INTEGER NOT NULL DEFAULT 0,
                total_successes  INTEGER NOT NULL DEFAULT 0,
                total_reward     REAL NOT NULL DEFAULT 0.0,
                avg_latency_ms   REAL NOT NULL DEFAULT 0.0,
                avg_quality      REAL NOT NULL DEFAULT 0.0,
                last_success_at  REAL,
                last_failure_at  REAL,
                last_updated     REAL NOT NULL,
                created_at       REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS domain_health_snapshots (
                domain       TEXT NOT NULL,
                timestamp    REAL NOT NULL,
                success_rate REAL NOT NULL,
                avg_latency  REAL NOT NULL,
                avg_quality  REAL NOT NULL,
                avg_reward   REAL NOT NULL,
                PRIMARY KEY (domain, timestamp)
            );
            CREATE INDEX IF NOT EXISTS idx_health_snapshots_domain
                ON domain_health_snapshots(domain, timestamp DESC);
        """)
        self._conn.commit()

    def _get_window(
        self,
        windows: Dict[str, collections.deque],
        domain: str,
    ) -> collections.deque:
        """Get or create a rolling window for a domain."""
        if domain not in windows:
            windows[domain] = collections.deque(
                maxlen=self.config.health_window_size
            )
        return windows[domain]

    def update(
        self,
        domain: str,
        success: bool,
        latency_ms: float,
        content_quality: float = 0.0,
        reward: float = 0.0,
    ) -> None:
        """Record a fetch outcome for a domain.

        Args:
            domain: the domain name.
            success: whether the fetch succeeded.
            latency_ms: response time in milliseconds.
            content_quality: content quality score (0-1).
            reward: extrinsic reward from this page.
        """
        now = time.time()

        # Update rolling windows
        self._get_window(self._success_windows, domain).append(
            1.0 if success else 0.0
        )
        self._get_window(self._latency_windows, domain).append(latency_ms)
        self._get_window(self._quality_windows, domain).append(content_quality)
        self._get_window(self._reward_windows, domain).append(reward)

        # Compute rolling stats
        success_window = self._get_window(self._success_windows, domain)
        latency_window = self._get_window(self._latency_windows, domain)
        quality_window = self._get_window(self._quality_windows, domain)

        avg_latency = float(np.mean(list(latency_window))) if latency_window else 0.0
        avg_quality = float(np.mean(list(quality_window))) if quality_window else 0.0

        # Upsert aggregated stats
        self._conn.execute(
            """
            INSERT INTO domain_health
                (domain, total_requests, total_successes, total_reward,
                 avg_latency_ms, avg_quality, last_success_at, last_failure_at,
                 last_updated, created_at)
            VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(domain)
            DO UPDATE SET
                total_requests = total_requests + 1,
                total_successes = total_successes + ?,
                total_reward = total_reward + ?,
                avg_latency_ms = ?,
                avg_quality = ?,
                last_success_at = CASE WHEN ? THEN ? ELSE last_success_at END,
                last_failure_at = CASE WHEN ? THEN ? ELSE last_failure_at END,
                last_updated = ?
            """,
            (
                # INSERT values
                domain,
                int(success),
                reward,
                avg_latency,
                avg_quality,
                now if success else None,
                now if not success else None,
                now,
                now,
                # UPDATE values
                int(success),
                reward,
                avg_latency,
                avg_quality,
                int(success), now,
                int(not success), now,
                now,
            ),
        )
        self._conn.commit()

        # Periodic snapshot (every 10 updates per domain)
        total_row = self._conn.execute(
            "SELECT total_requests FROM domain_health WHERE domain = ?",
            (domain,),
        ).fetchone()
        if total_row and total_row[0] % 10 == 0:
            success_rate = float(np.mean(list(success_window)))
            avg_reward = float(np.mean(
                list(self._get_window(self._reward_windows, domain))
            ))
            self._conn.execute(
                """
                INSERT OR REPLACE INTO domain_health_snapshots
                    (domain, timestamp, success_rate, avg_latency, avg_quality, avg_reward)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (domain, now, success_rate, avg_latency, avg_quality, avg_reward),
            )
            self._conn.commit()

    def is_healthy(self, domain: str) -> bool:
        """Check if a domain is healthy enough to crawl.

        A domain is unhealthy if:
        - Recent success rate is below death_threshold
        - AND we have enough samples to be confident
        """
        window = self._success_windows.get(domain)
        if window is None or len(window) < self.config.health_min_samples:
            return True  # assume healthy until proven otherwise

        success_rate = float(np.mean(list(window)))

        # Check for domain death
        if (
            len(window) >= self.config.death_min_requests
            and success_rate < self.config.death_threshold
        ):
            logger.warning(
                "Domain %s appears dead: success_rate=%.2f over %d requests",
                domain, success_rate, len(window),
            )
            return False

        return True

    def get_health_report(self) -> Dict[str, Dict[str, Any]]:
        """Get health report for all tracked domains.

        Returns dict of domain -> {success_rate, avg_latency, avg_quality,
        avg_reward, total_requests, is_healthy, last_updated}.
        """
        rows = self._conn.execute(
            """
            SELECT domain, total_requests, total_successes, total_reward,
                   avg_latency_ms, avg_quality, last_updated
            FROM domain_health
            ORDER BY total_requests DESC
            """
        ).fetchall()

        report: Dict[str, Dict[str, Any]] = {}
        for row in rows:
            domain = row[0]
            total = row[1]
            successes = row[2]
            success_rate = successes / max(total, 1)
            avg_reward = row[3] / max(total, 1)

            report[domain] = {
                "success_rate": round(success_rate, 4),
                "avg_latency_ms": round(row[4], 1),
                "avg_quality": round(row[5], 4),
                "avg_reward": round(avg_reward, 4),
                "total_requests": total,
                "is_healthy": self.is_healthy(domain),
                "last_updated": row[6],
            }

        return report

    def get_trending_domains(self, n: int = 10) -> List[str]:
        """Get domains with improving reward rate (recent vs historical).

        Compares the most recent snapshot's avg_reward against the average
        of all older snapshots. Domains trending up are returned first.
        """
        # Get domains with at least 2 snapshots
        domains_with_snapshots = self._conn.execute(
            """
            SELECT domain, COUNT(*) as snap_count
            FROM domain_health_snapshots
            GROUP BY domain
            HAVING snap_count >= 2
            """
        ).fetchall()

        trends: List[Tuple[str, float]] = []
        for domain, _ in domains_with_snapshots:
            snapshots = self._conn.execute(
                """
                SELECT avg_reward FROM domain_health_snapshots
                WHERE domain = ?
                ORDER BY timestamp DESC
                """,
                (domain,),
            ).fetchall()

            if len(snapshots) < 2:
                continue

            recent = snapshots[0][0]
            historical = float(np.mean([s[0] for s in snapshots[1:]]))
            improvement = recent - historical
            if improvement > 0:
                trends.append((domain, improvement))

        trends.sort(key=lambda x: x[1], reverse=True)
        return [d for d, _ in trends[:n]]

    def get_declining_domains(self, n: int = 10) -> List[str]:
        """Get domains with declining reward rate (recent vs historical).

        Inverse of get_trending_domains: returns domains where recent
        performance is worse than historical average.
        """
        domains_with_snapshots = self._conn.execute(
            """
            SELECT domain, COUNT(*) as snap_count
            FROM domain_health_snapshots
            GROUP BY domain
            HAVING snap_count >= 2
            """
        ).fetchall()

        declines: List[Tuple[str, float]] = []
        for domain, _ in domains_with_snapshots:
            snapshots = self._conn.execute(
                """
                SELECT avg_reward FROM domain_health_snapshots
                WHERE domain = ?
                ORDER BY timestamp DESC
                """,
                (domain,),
            ).fetchall()

            if len(snapshots) < 2:
                continue

            recent = snapshots[0][0]
            historical = float(np.mean([s[0] for s in snapshots[1:]]))
            decline = historical - recent
            if decline > 0:
                declines.append((domain, decline))

        declines.sort(key=lambda x: x[1], reverse=True)
        return [d for d, _ in declines[:n]]

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None


# ======================= Domain Prioritizer =================================

class DomainPrioritizer:
    """Multi-signal domain ranking combining UCB1, health, classification,
    and relationship data.

    Score = w_ucb * ucb_score
          + w_health * health_score
          + w_class * class_match_score
          + w_relationship * relationship_bonus

    Weights configurable via DomainAnalysisConfig.
    """

    def __init__(
        self,
        config: DomainAnalysisConfig,
        classifier: DomainClassifier,
        health_monitor: DomainHealthMonitor,
        relationship_mapper: DomainRelationshipMapper,
    ) -> None:
        self.config = config
        self._classifier = classifier
        self._health_monitor = health_monitor
        self._relationship_mapper = relationship_mapper

    def prioritize(
        self,
        domains: List[str],
        ucb_scores: Optional[Dict[str, float]] = None,
    ) -> List[Tuple[str, float, str]]:
        """Rank domains by combined score.

        Args:
            domains: list of domain names to prioritise.
            ucb_scores: optional precomputed UCB1 scores per domain.
                If None, UCB component is set to 0.5 for all.

        Returns:
            List of (domain, score, reason) sorted by score descending.
            reason = human-readable explanation of why this domain scored high.
        """
        if not domains:
            return []

        ucb_scores = ucb_scores or {}
        health_report = self._health_monitor.get_health_report()
        classifications = self._classifier.classify_batch(domains)
        target_industries = set(self.config.target_industries)

        # Get hub domains for relationship bonus
        hub_domains = set(self._relationship_mapper.get_hub_domains(n=50))

        results: List[Tuple[str, float, str]] = []

        for domain in domains:
            reasons: List[str] = []

            # UCB1 component (normalised to 0-1 range)
            raw_ucb = ucb_scores.get(domain, 0.5)
            # Clamp infinite UCB (unseen domains) to 1.0
            ucb_norm = min(1.0, raw_ucb) if not math.isinf(raw_ucb) else 1.0
            ucb_component = self.config.weight_ucb * ucb_norm

            # Health component
            health = health_report.get(domain, {})
            success_rate = health.get("success_rate", 1.0)
            avg_reward = health.get("avg_reward", 0.0)
            health_score = 0.5 * success_rate + 0.5 * min(1.0, avg_reward)
            health_component = self.config.weight_health * health_score
            if not health.get("is_healthy", True):
                health_component *= 0.1  # heavily penalise unhealthy domains
                reasons.append("unhealthy")

            # Classification match component
            domain_class = classifications.get(domain, "other")
            if target_industries and domain_class in target_industries:
                class_score = 1.0
                reasons.append(f"target_industry={domain_class}")
            elif domain_class != "other":
                class_score = 0.3
                reasons.append(f"industry={domain_class}")
            else:
                class_score = 0.1
            class_component = self.config.weight_class_match * class_score

            # Relationship bonus
            rel_score = 0.0
            if domain in hub_domains:
                rel_score = 0.8
                reasons.append("hub_domain")
            else:
                related = self._relationship_mapper.get_related_domains(
                    domain, n=5
                )
                if related:
                    rel_score = min(1.0, related[0][1])
                    if rel_score > 0.5:
                        reasons.append("well_connected")
            rel_component = self.config.weight_relationship * rel_score

            total = ucb_component + health_component + class_component + rel_component
            reason = ", ".join(reasons) if reasons else "baseline"

            results.append((domain, round(total, 4), reason))

        results.sort(key=lambda x: x[1], reverse=True)
        return results


# ======================= Domain Explorer ====================================

class DomainExplorer:
    """Discover new domains from existing crawled content and link patterns.

    Sources of new domains:
    - URLs found in page text (company mentions, partner lists)
    - Cross-domain links already in the relationship mapper
    - "Partners", "Clients", "Portfolio" pages that list external companies

    Uses heuristic extraction -- no ML needed.
    """

    # Regex to find domain-like strings in text
    _DOMAIN_PATTERN = re.compile(
        r'\b(?:https?://)?'
        r'((?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)'
        r'+[a-zA-Z]{2,})\b'
    )

    # Common non-target domains to skip
    _SKIP_DOMAINS: Set[str] = {
        "google.com", "facebook.com", "twitter.com", "linkedin.com",
        "youtube.com", "instagram.com", "pinterest.com", "reddit.com",
        "github.com", "stackoverflow.com", "wikipedia.org", "amazon.com",
        "apple.com", "microsoft.com", "cloudflare.com", "googleapis.com",
        "gstatic.com", "googletagmanager.com", "google-analytics.com",
        "doubleclick.net", "facebook.net", "fbcdn.net", "twimg.com",
        "w3.org", "schema.org", "jquery.com", "jsdelivr.net",
        "cdnjs.cloudflare.com", "unpkg.com", "bootstrapcdn.com",
    }

    def __init__(self, config: DomainAnalysisConfig) -> None:
        self.config = config
        self._partner_patterns = [
            re.compile(p, re.IGNORECASE) for p in config.partner_page_patterns
        ]

    def extract_mentioned_domains(self, page_text: str) -> List[str]:
        """Extract domain names mentioned in page text.

        Filters out common infrastructure domains (CDNs, social media, etc.).
        Returns deduplicated list of domain names.
        """
        matches = self._DOMAIN_PATTERN.findall(page_text)
        domains: Set[str] = set()

        for match in matches:
            domain = match.lower().strip(".")
            # Skip short or invalid-looking domains
            if len(domain) < 5:
                continue
            if domain.count(".") < 1:
                continue
            # Skip known non-target domains
            root = self._get_root_domain(domain)
            if root in self._SKIP_DOMAINS:
                continue
            # Skip domains that look like file paths or IPs
            if any(c.isdigit() for c in domain.split(".")[0]) and domain[0].isdigit():
                continue
            domains.add(domain)

        return sorted(domains)

    def is_partner_page(self, url: str) -> bool:
        """Check if a URL matches partner/client/portfolio page patterns."""
        path = urlparse(url).path.lower()
        return any(p.search(path) for p in self._partner_patterns)

    def get_discovery_candidates(
        self,
        top_domains: List[str],
        relationship_mapper: DomainRelationshipMapper,
        known_domains: Optional[Set[str]] = None,
        n: int = 20,
    ) -> List[str]:
        """Discover new domain candidates from existing knowledge.

        Strategy:
        1. Find domains related to top-performing domains
        2. Look at hub domains (directories, aggregators)
        3. Filter out already-known domains

        Args:
            top_domains: highest-reward domains from DomainScheduler.
            relationship_mapper: domain graph for relationship data.
            known_domains: set of domains already in the frontier.
            n: max candidates to return.

        Returns:
            List of new domain candidates sorted by potential.
        """
        known = known_domains or set()
        candidates: Dict[str, float] = {}

        # Source 1: domains related to top performers
        for domain in top_domains:
            related = relationship_mapper.get_related_domains(domain, n=10)
            for rel_domain, strength in related:
                if rel_domain not in known:
                    score = candidates.get(rel_domain, 0.0)
                    candidates[rel_domain] = score + strength

        # Source 2: hub domains (many inbound links = likely aggregator)
        hub_domains = relationship_mapper.get_hub_domains(n=30)
        for hub in hub_domains:
            if hub not in known:
                score = candidates.get(hub, 0.0)
                candidates[hub] = score + 0.5  # bonus for being a hub

        # Source 3: domains from largest clusters (ecosystem discovery)
        clusters = relationship_mapper.get_clusters()
        for cluster in clusters[:5]:  # top 5 largest clusters
            for domain in cluster:
                if domain not in known:
                    score = candidates.get(domain, 0.0)
                    # Cluster size bonus (larger clusters = richer ecosystem)
                    candidates[domain] = score + 0.1 * min(len(cluster), 10)

        # Filter out known infrastructure domains
        for skip in self._SKIP_DOMAINS:
            candidates.pop(skip, None)

        # Sort by score and return top-n
        sorted_candidates = sorted(
            candidates.items(), key=lambda x: x[1], reverse=True
        )
        return [domain for domain, _ in sorted_candidates[:n]]

    @staticmethod
    def _get_root_domain(domain: str) -> str:
        """Extract root domain (e.g. 'www.example.com' -> 'example.com')."""
        parts = domain.split(".")
        if len(parts) > 2:
            # Handle common prefixes
            if parts[0] in ("www", "m", "mobile", "api", "cdn", "static"):
                return ".".join(parts[1:])
        return domain

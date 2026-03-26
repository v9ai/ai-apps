"""
Module 1: Curriculum learning for the RL crawler.

Implements progressive difficulty scheduling so the agent trains on easy
domains first (static HTML, high lead density, no anti-bot) and gradually
unlocks harder targets (SPAs, CAPTCHAs, aggressive anti-bot) once it
demonstrates sufficient harvest rate at the current level.

Components:
1. CurriculumConfig     — tunables for promotion/demotion thresholds
2. DomainDifficulty     — per-domain observed difficulty metrics
3. CurriculumLevel      — tracks allowed domains + performance at each level
4. CurriculumManager    — orchestrates level progression, frontier filtering,
                          and SQLite persistence

Difficulty estimation heuristics (Level 0-4):
  L0: Static HTML, high lead density, no anti-bot (directories, job boards)
  L1: Light JS, moderate density (company careers pages)
  L2: Medium JS, some anti-bot (LinkedIn-like sites)
  L3: Heavy SPA, rate limiting (modern web apps)
  L4: Anti-bot, CAPTCHAs, dynamic content (hardest targets)

Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import os
import sqlite3
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

logger = logging.getLogger("crawler_curriculum")


# ======================= Configuration ======================================

@dataclass
class CurriculumConfig:
    """Tunables for curriculum-based difficulty progression."""

    # Number of discrete difficulty levels (0 = easiest)
    difficulty_levels: int = 5

    # Harvest rate (leads/pages) required to advance to the next level
    promotion_threshold: float = 0.12

    # Harvest rate below which the agent retreats one level
    demotion_threshold: float = 0.05

    # Minimum pages crawled at a level before promotion is considered
    min_pages_per_level: int = 500

    # Pages to explore at the current level before evaluating performance
    warmup_pages: int = 200

    # Performance history window: number of recent harvest-rate samples
    # used for promotion/demotion decisions
    history_window: int = 10

    # SQLite path for persisting difficulty scores and level history
    db_path: str = "scrapus_data/curriculum.db"

    # Difficulty score boundaries per level (auto-computed in __post_init__).
    # Level i allows domains with difficulty_score <= level_boundaries[i].
    level_boundaries: List[float] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.level_boundaries:
            # Evenly spaced boundaries: L0 ≤ 0.2, L1 ≤ 0.4, ..., L4 ≤ 1.0
            step = 1.0 / self.difficulty_levels
            self.level_boundaries = [
                round((i + 1) * step, 4) for i in range(self.difficulty_levels)
            ]


# ======================= Domain Difficulty ==================================

@dataclass
class DomainDifficulty:
    """Observed difficulty metrics for a single domain.

    All fields are normalised to [0, 1] unless noted.
    Updated incrementally as pages are crawled.
    """

    domain: str

    # Core metrics
    harvest_rate: float = 0.0       # leads / pages crawled
    captcha_frequency: float = 0.0  # fraction of pages showing CAPTCHAs
    js_requirement: float = 0.0     # 0 = static HTML, 1 = heavy SPA
    avg_latency_ms: float = 0.0     # mean fetch latency (raw ms, not normalised)
    anti_bot_score: float = 0.0     # 0 = none, 1 = aggressive detection
    content_noise_ratio: float = 0.0  # nav/ads vs useful content
    link_density: float = 0.0       # useful outbound links per page

    # Bookkeeping
    pages_sampled: int = 0
    last_updated: float = 0.0

    # Weight vector for difficulty_score().  Tuned empirically.
    _weights: Dict[str, float] = field(default_factory=lambda: {
        "captcha_frequency": 0.25,
        "js_requirement": 0.20,
        "anti_bot_score": 0.25,
        "content_noise_ratio": 0.10,
        "latency_norm": 0.10,
        "link_density_inv": 0.10,
    })

    def difficulty_score(self) -> float:
        """Weighted combination of metrics.  0 = easy, 1 = hard.

        Latency is normalised: clamp(avg_latency_ms / 5000, 0, 1).
        Link density is inverted: fewer useful links = harder.
        """
        latency_norm = min(self.avg_latency_ms / 5000.0, 1.0)
        link_density_inv = 1.0 - min(self.link_density, 1.0)

        score = (
            self._weights["captcha_frequency"] * self.captcha_frequency
            + self._weights["js_requirement"] * self.js_requirement
            + self._weights["anti_bot_score"] * self.anti_bot_score
            + self._weights["content_noise_ratio"] * self.content_noise_ratio
            + self._weights["latency_norm"] * latency_norm
            + self._weights["link_density_inv"] * link_density_inv
        )
        return round(max(0.0, min(score, 1.0)), 4)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "domain": self.domain,
            "harvest_rate": round(self.harvest_rate, 4),
            "captcha_frequency": round(self.captcha_frequency, 4),
            "js_requirement": round(self.js_requirement, 4),
            "avg_latency_ms": round(self.avg_latency_ms, 1),
            "anti_bot_score": round(self.anti_bot_score, 4),
            "content_noise_ratio": round(self.content_noise_ratio, 4),
            "link_density": round(self.link_density, 4),
            "pages_sampled": self.pages_sampled,
            "difficulty_score": self.difficulty_score(),
        }


# ======================= Curriculum Level ===================================

@dataclass
class CurriculumLevel:
    """State for a single difficulty level."""

    level: int                              # 0 = easiest, N-1 = hardest
    max_difficulty: float                   # domains with score <= this are allowed
    allowed_domains: Set[str] = field(default_factory=set)
    performance_history: List[float] = field(default_factory=list)  # recent harvest rates
    pages_crawled: int = 0

    def record_harvest_rate(self, rate: float, window: int = 10) -> None:
        """Append a harvest-rate sample and trim to window size."""
        self.performance_history.append(rate)
        if len(self.performance_history) > window:
            self.performance_history = self.performance_history[-window:]

    def avg_performance(self) -> float:
        """Mean harvest rate over the performance window."""
        if not self.performance_history:
            return 0.0
        return sum(self.performance_history) / len(self.performance_history)


# ======================= Curriculum Manager =================================

class CurriculumManager:
    """Orchestrates curriculum-based domain difficulty progression.

    Lifecycle:
        manager = CurriculumManager(config)
        manager.initialise()                   # load/create SQLite tables
        ...
        allowed = manager.get_allowed_domains()
        filtered = manager.filter_frontier(candidates)
        manager.record_performance(harvest_rate, domain)
        stats = manager.get_curriculum_stats()
        manager.close()

    Persistence: SQLite stores domain difficulties and level history so the
    agent can resume from the same curriculum position across restarts.
    """

    def __init__(self, config: Optional[CurriculumConfig] = None) -> None:
        self.config = config or CurriculumConfig()

        # Domain difficulty cache: domain -> DomainDifficulty
        self._difficulties: Dict[str, DomainDifficulty] = {}

        # Levels: index = level number
        self._levels: List[CurriculumLevel] = []

        # Current agent level (0 = easiest)
        self._current_level: int = 0

        # Total pages at current level (reset on promotion/demotion)
        self._level_pages: int = 0

        # SQLite connection
        self._conn: Optional[sqlite3.Connection] = None

    # ---- Lifecycle ----------------------------------------------------------

    def initialise(self) -> None:
        """Create SQLite tables and restore state from disk."""
        self._init_db()
        self._build_levels()
        self._load_difficulties()
        self._load_level_state()
        self._assign_domains_to_levels()
        logger.info(
            "Curriculum initialised: level=%d/%d, domains=%d",
            self._current_level,
            self.config.difficulty_levels - 1,
            len(self._difficulties),
        )

    def close(self) -> None:
        """Persist state and release SQLite connection."""
        self._save_level_state()
        if self._conn:
            self._conn.close()
            self._conn = None

    # ---- SQLite persistence -------------------------------------------------

    def _init_db(self) -> None:
        os.makedirs(os.path.dirname(self.config.db_path), exist_ok=True)
        self._conn = sqlite3.connect(self.config.db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS domain_difficulty (
                domain              TEXT PRIMARY KEY,
                harvest_rate        REAL NOT NULL DEFAULT 0.0,
                captcha_frequency   REAL NOT NULL DEFAULT 0.0,
                js_requirement      REAL NOT NULL DEFAULT 0.0,
                avg_latency_ms      REAL NOT NULL DEFAULT 0.0,
                anti_bot_score      REAL NOT NULL DEFAULT 0.0,
                content_noise_ratio REAL NOT NULL DEFAULT 0.0,
                link_density        REAL NOT NULL DEFAULT 0.0,
                pages_sampled       INTEGER NOT NULL DEFAULT 0,
                difficulty_score    REAL NOT NULL DEFAULT 0.0,
                last_updated        REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS level_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                level       INTEGER NOT NULL,
                event       TEXT NOT NULL,
                harvest_rate REAL,
                pages_at_level INTEGER,
                timestamp   REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS curriculum_state (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)
        self._conn.commit()

    def _build_levels(self) -> None:
        """Construct CurriculumLevel objects from config boundaries."""
        self._levels = []
        for i, boundary in enumerate(self.config.level_boundaries):
            self._levels.append(
                CurriculumLevel(level=i, max_difficulty=boundary)
            )

    def _load_difficulties(self) -> None:
        """Restore domain difficulties from SQLite."""
        rows = self._conn.execute(
            """
            SELECT domain, harvest_rate, captcha_frequency, js_requirement,
                   avg_latency_ms, anti_bot_score, content_noise_ratio,
                   link_density, pages_sampled, last_updated
            FROM domain_difficulty
            """
        ).fetchall()

        for row in rows:
            dd = DomainDifficulty(
                domain=row[0],
                harvest_rate=row[1],
                captcha_frequency=row[2],
                js_requirement=row[3],
                avg_latency_ms=row[4],
                anti_bot_score=row[5],
                content_noise_ratio=row[6],
                link_density=row[7],
                pages_sampled=row[8],
                last_updated=row[9],
            )
            self._difficulties[dd.domain] = dd

        logger.info("Loaded %d domain difficulty records", len(self._difficulties))

    def _load_level_state(self) -> None:
        """Restore current level and page count from SQLite."""
        row = self._conn.execute(
            "SELECT value FROM curriculum_state WHERE key = 'current_level'"
        ).fetchone()
        if row:
            self._current_level = int(row[0])

        row = self._conn.execute(
            "SELECT value FROM curriculum_state WHERE key = 'level_pages'"
        ).fetchone()
        if row:
            self._level_pages = int(row[0])

        # Restore performance history for current level
        row = self._conn.execute(
            "SELECT value FROM curriculum_state WHERE key = 'performance_history'"
        ).fetchone()
        if row and self._levels:
            import json
            try:
                history = json.loads(row[0])
                if isinstance(history, list):
                    self._levels[self._current_level].performance_history = history
            except (json.JSONDecodeError, IndexError):
                pass

    def _save_level_state(self) -> None:
        """Persist current level, page count, and performance history."""
        if not self._conn:
            return

        import json

        history = []
        if self._levels and self._current_level < len(self._levels):
            history = self._levels[self._current_level].performance_history

        state_pairs = [
            ("current_level", str(self._current_level)),
            ("level_pages", str(self._level_pages)),
            ("performance_history", json.dumps(history)),
        ]
        for key, value in state_pairs:
            self._conn.execute(
                """
                INSERT INTO curriculum_state (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, value),
            )
        self._conn.commit()

    def _save_difficulty(self, dd: DomainDifficulty) -> None:
        """Upsert a single domain difficulty record."""
        self._conn.execute(
            """
            INSERT INTO domain_difficulty
                (domain, harvest_rate, captcha_frequency, js_requirement,
                 avg_latency_ms, anti_bot_score, content_noise_ratio,
                 link_density, pages_sampled, difficulty_score, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(domain) DO UPDATE SET
                harvest_rate = excluded.harvest_rate,
                captcha_frequency = excluded.captcha_frequency,
                js_requirement = excluded.js_requirement,
                avg_latency_ms = excluded.avg_latency_ms,
                anti_bot_score = excluded.anti_bot_score,
                content_noise_ratio = excluded.content_noise_ratio,
                link_density = excluded.link_density,
                pages_sampled = excluded.pages_sampled,
                difficulty_score = excluded.difficulty_score,
                last_updated = excluded.last_updated
            """,
            (
                dd.domain,
                dd.harvest_rate,
                dd.captcha_frequency,
                dd.js_requirement,
                dd.avg_latency_ms,
                dd.anti_bot_score,
                dd.content_noise_ratio,
                dd.link_density,
                dd.pages_sampled,
                dd.difficulty_score(),
                dd.last_updated,
            ),
        )
        self._conn.commit()

    def _record_level_event(self, event: str, harvest_rate: float) -> None:
        """Write a promotion/demotion event to level_history."""
        self._conn.execute(
            """
            INSERT INTO level_history (level, event, harvest_rate, pages_at_level, timestamp)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                self._current_level,
                event,
                harvest_rate,
                self._level_pages,
                time.time(),
            ),
        )
        self._conn.commit()

    # ---- Domain difficulty management ---------------------------------------

    def _assign_domains_to_levels(self) -> None:
        """Bin every known domain into its appropriate level."""
        for level in self._levels:
            level.allowed_domains.clear()

        for domain, dd in self._difficulties.items():
            score = dd.difficulty_score()
            for level in self._levels:
                if score <= level.max_difficulty:
                    level.allowed_domains.add(domain)
                    break

    def update_domain_difficulty(
        self,
        domain: str,
        *,
        harvest_rate: Optional[float] = None,
        captcha_frequency: Optional[float] = None,
        js_requirement: Optional[float] = None,
        avg_latency_ms: Optional[float] = None,
        anti_bot_score: Optional[float] = None,
        content_noise_ratio: Optional[float] = None,
        link_density: Optional[float] = None,
    ) -> DomainDifficulty:
        """Incrementally update difficulty metrics for a domain.

        Uses exponential moving average (alpha=0.1) to smooth noisy signals.
        Returns the updated DomainDifficulty.
        """
        alpha = 0.1

        if domain not in self._difficulties:
            self._difficulties[domain] = DomainDifficulty(
                domain=domain, last_updated=time.time()
            )

        dd = self._difficulties[domain]
        dd.pages_sampled += 1
        dd.last_updated = time.time()

        # EMA update for each provided metric
        if harvest_rate is not None:
            dd.harvest_rate = (1 - alpha) * dd.harvest_rate + alpha * harvest_rate
        if captcha_frequency is not None:
            dd.captcha_frequency = (1 - alpha) * dd.captcha_frequency + alpha * captcha_frequency
        if js_requirement is not None:
            dd.js_requirement = (1 - alpha) * dd.js_requirement + alpha * js_requirement
        if avg_latency_ms is not None:
            dd.avg_latency_ms = (1 - alpha) * dd.avg_latency_ms + alpha * avg_latency_ms
        if anti_bot_score is not None:
            dd.anti_bot_score = (1 - alpha) * dd.anti_bot_score + alpha * anti_bot_score
        if content_noise_ratio is not None:
            dd.content_noise_ratio = (1 - alpha) * dd.content_noise_ratio + alpha * content_noise_ratio
        if link_density is not None:
            dd.link_density = (1 - alpha) * dd.link_density + alpha * link_density

        # Persist and re-bin
        self._save_difficulty(dd)
        self._assign_domains_to_levels()

        return dd

    def estimate_difficulty(
        self,
        domain: str,
        *,
        status_code: int = 200,
        fetch_time_ms: float = 0.0,
        body_length: int = 0,
        link_count: int = 0,
        has_captcha: bool = False,
        js_rendered: bool = False,
        blocked: bool = False,
    ) -> DomainDifficulty:
        """Heuristic difficulty estimation from a single page fetch.

        Called after each page crawl to incrementally update domain metrics.
        Maps raw signals to the normalised [0, 1] fields of DomainDifficulty.

        Level mapping heuristics:
          L0: Static HTML, high lead density, no anti-bot (directories, job boards)
          L1: Light JS, moderate density (company careers pages)
          L2: Medium JS, some anti-bot (LinkedIn-like sites)
          L3: Heavy SPA, rate limiting (modern web apps)
          L4: Anti-bot, CAPTCHAs, dynamic content (hardest targets)
        """
        # JS requirement: binary for now, refined with future JS analysis
        js_score = 0.0
        if js_rendered:
            # Heuristic: long fetch = heavier JS
            if fetch_time_ms > 5000:
                js_score = 1.0   # heavy SPA (L3-L4)
            elif fetch_time_ms > 2000:
                js_score = 0.6   # medium JS (L2)
            else:
                js_score = 0.3   # light JS (L1)

        # Anti-bot: blocked responses, 403s, CAPTCHAs
        anti_bot = 0.0
        if blocked:
            anti_bot = 1.0
        elif has_captcha:
            anti_bot = 0.8
        elif status_code == 403:
            anti_bot = 0.6
        elif status_code == 429:
            anti_bot = 0.4

        # Content noise: ratio of useful content vs total page size
        # Lower body length per link = noisier (more nav/ads, fewer content blocks)
        noise = 0.0
        if body_length > 0 and link_count > 0:
            content_per_link = body_length / link_count
            # < 100 chars per link = mostly navigation
            if content_per_link < 100:
                noise = 0.8
            elif content_per_link < 300:
                noise = 0.4
            else:
                noise = 0.1

        # Link density: normalise to [0, 1] (50+ links = 1.0)
        link_density_norm = min(link_count / 50.0, 1.0) if link_count > 0 else 0.0

        # CAPTCHA frequency: binary from this page
        captcha_freq = 1.0 if has_captcha else 0.0

        return self.update_domain_difficulty(
            domain,
            captcha_frequency=captcha_freq,
            js_requirement=js_score,
            avg_latency_ms=fetch_time_ms,
            anti_bot_score=anti_bot,
            content_noise_ratio=noise,
            link_density=link_density_norm,
        )

    def get_domain_difficulty(self, domain: str) -> Optional[DomainDifficulty]:
        """Return cached difficulty for a domain, or None if unseen."""
        return self._difficulties.get(domain)

    def get_domain_level(self, domain: str) -> Optional[int]:
        """Return the level a domain is assigned to, or None if unseen."""
        dd = self._difficulties.get(domain)
        if dd is None:
            return None
        score = dd.difficulty_score()
        for level in self._levels:
            if score <= level.max_difficulty:
                return level.level
        return self.config.difficulty_levels - 1

    # ---- Level progression --------------------------------------------------

    @property
    def current_level(self) -> int:
        return self._current_level

    def get_allowed_domains(self) -> Set[str]:
        """Return all domains at or below the current level."""
        allowed: Set[str] = set()
        for level in self._levels[: self._current_level + 1]:
            allowed |= level.allowed_domains
        return allowed

    def record_performance(self, harvest_rate: float, domain: str) -> None:
        """Record a harvest-rate observation and check for level change.

        Args:
            harvest_rate: leads / pages for the recent batch.
            domain: the domain the observation came from.
        """
        self._level_pages += 1

        # Update the current level's performance history
        if self._levels and self._current_level < len(self._levels):
            self._levels[self._current_level].record_harvest_rate(
                harvest_rate, self.config.history_window
            )
            self._levels[self._current_level].pages_crawled += 1

        # Check promotion/demotion only after warmup
        if self._level_pages < self.config.warmup_pages:
            return

        if self._level_pages >= self.config.min_pages_per_level:
            if self.should_promote():
                self.promote()
            elif self.should_demote():
                self.demote()

        # Periodic state save (every 100 pages)
        if self._level_pages % 100 == 0:
            self._save_level_state()

    def should_promote(self) -> bool:
        """Check if the agent should advance to the next level.

        Requires:
        - Not already at the highest level
        - At least min_pages_per_level crawled at current level
        - Average harvest rate >= promotion_threshold
        """
        if self._current_level >= self.config.difficulty_levels - 1:
            return False
        if self._level_pages < self.config.min_pages_per_level:
            return False

        level = self._levels[self._current_level]
        avg = level.avg_performance()
        return avg >= self.config.promotion_threshold

    def should_demote(self) -> bool:
        """Check if the agent should retreat to the previous level.

        Requires:
        - Not already at level 0
        - Past the warmup period
        - Average harvest rate < demotion_threshold
        """
        if self._current_level <= 0:
            return False
        if self._level_pages < self.config.warmup_pages:
            return False

        level = self._levels[self._current_level]
        avg = level.avg_performance()
        return avg < self.config.demotion_threshold

    def promote(self) -> None:
        """Advance to the next difficulty level."""
        if self._current_level >= self.config.difficulty_levels - 1:
            return

        old_level = self._current_level
        avg = self._levels[self._current_level].avg_performance()

        self._current_level += 1
        self._level_pages = 0

        self._record_level_event("promotion", avg)
        self._save_level_state()

        new_domains = self._levels[self._current_level].allowed_domains
        logger.info(
            "PROMOTED: level %d -> %d (avg_harvest=%.4f, new_domains=%d)",
            old_level,
            self._current_level,
            avg,
            len(new_domains),
        )

    def demote(self) -> None:
        """Retreat to the previous difficulty level."""
        if self._current_level <= 0:
            return

        old_level = self._current_level
        avg = self._levels[self._current_level].avg_performance()

        self._current_level -= 1
        self._level_pages = 0

        self._record_level_event("demotion", avg)
        self._save_level_state()

        logger.info(
            "DEMOTED: level %d -> %d (avg_harvest=%.4f)",
            old_level,
            self._current_level,
            avg,
        )

    # ---- Frontier filtering -------------------------------------------------

    def filter_frontier(
        self,
        candidates: List[Tuple[str, str, float, int]],
    ) -> List[Tuple[str, str, float, int]]:
        """Filter frontier candidates to only include current-level domains.

        Args:
            candidates: list of (url, domain, score, depth) tuples
                        — same format as URLFrontier.get_next_urls().

        Returns:
            Filtered list containing only candidates whose domain is at or
            below the current curriculum level.  Unseen domains are allowed
            through (optimistic: assume easy until proven otherwise).
        """
        allowed = self.get_allowed_domains()
        filtered: List[Tuple[str, str, float, int]] = []

        for url, domain, score, depth in candidates:
            if domain in allowed:
                filtered.append((url, domain, score, depth))
            elif domain not in self._difficulties:
                # Unseen domain: allow optimistically, difficulty will be
                # estimated after the first page fetch.
                filtered.append((url, domain, score, depth))

        if len(candidates) > 0 and len(filtered) == 0:
            logger.debug(
                "Curriculum filter removed all %d candidates at level %d",
                len(candidates),
                self._current_level,
            )

        return filtered

    # ---- Statistics ---------------------------------------------------------

    def get_curriculum_stats(self) -> Dict[str, Any]:
        """Return comprehensive curriculum state for monitoring."""
        level_stats = []
        for level in self._levels:
            level_stats.append({
                "level": level.level,
                "max_difficulty": level.max_difficulty,
                "domain_count": len(level.allowed_domains),
                "domains": sorted(level.allowed_domains)[:10],  # cap for logging
                "avg_performance": round(level.avg_performance(), 4),
                "pages_crawled": level.pages_crawled,
                "history_len": len(level.performance_history),
            })

        # Level history from SQLite
        history_rows = self._conn.execute(
            """
            SELECT level, event, harvest_rate, pages_at_level, timestamp
            FROM level_history
            ORDER BY timestamp DESC
            LIMIT 20
            """
        ).fetchall()
        history = [
            {
                "level": r[0],
                "event": r[1],
                "harvest_rate": round(r[2], 4) if r[2] is not None else None,
                "pages_at_level": r[3],
                "timestamp": r[4],
            }
            for r in history_rows
        ]

        # Difficulty distribution
        scores = [dd.difficulty_score() for dd in self._difficulties.values()]
        difficulty_dist = {}
        if scores:
            import statistics

            difficulty_dist = {
                "count": len(scores),
                "mean": round(statistics.mean(scores), 4),
                "median": round(statistics.median(scores), 4),
                "min": round(min(scores), 4),
                "max": round(max(scores), 4),
            }

        return {
            "current_level": self._current_level,
            "max_level": self.config.difficulty_levels - 1,
            "level_pages": self._level_pages,
            "warmup_remaining": max(0, self.config.warmup_pages - self._level_pages),
            "promotion_threshold": self.config.promotion_threshold,
            "demotion_threshold": self.config.demotion_threshold,
            "total_domains": len(self._difficulties),
            "allowed_domains": len(self.get_allowed_domains()),
            "levels": level_stats,
            "history": history,
            "difficulty_distribution": difficulty_dist,
        }

    def get_level_boundaries_description(self) -> List[Dict[str, Any]]:
        """Human-readable description of each level's characteristics."""
        descriptions = [
            {
                "level": 0,
                "name": "Static / Directories",
                "description": (
                    "Static HTML, high lead density, no anti-bot. "
                    "Company directories, job boards, simple listing pages."
                ),
                "max_difficulty": self.config.level_boundaries[0],
            },
            {
                "level": 1,
                "name": "Light JS / Careers",
                "description": (
                    "Light JavaScript rendering, moderate lead density. "
                    "Company websites with careers pages, basic SPAs."
                ),
                "max_difficulty": self.config.level_boundaries[1],
            },
            {
                "level": 2,
                "name": "Medium JS / Some Anti-Bot",
                "description": (
                    "Medium JavaScript, some anti-bot measures. "
                    "LinkedIn-like professional sites, gated content."
                ),
                "max_difficulty": self.config.level_boundaries[2],
            },
            {
                "level": 3,
                "name": "Heavy SPA / Rate Limiting",
                "description": (
                    "Heavy single-page applications, active rate limiting. "
                    "Modern web apps with complex client-side rendering."
                ),
                "max_difficulty": self.config.level_boundaries[3],
            },
            {
                "level": 4,
                "name": "Hardest / Anti-Bot + CAPTCHA",
                "description": (
                    "Aggressive anti-bot, CAPTCHAs, dynamic content. "
                    "Fully protected targets requiring advanced evasion."
                ),
                "max_difficulty": self.config.level_boundaries[4],
            },
        ]
        return descriptions[: self.config.difficulty_levels]

"""
OpAgent-inspired hybrid reward with rule-based process rewards and error recovery.

Adapts the OpAgent paper (arXiv:2602.13559) for focused web crawling:
- Rule-Based Decision Tree (RDT) for per-step process rewards (zero ML cost)
- SimHash-based cycle detection (reuses crawler_content_quality.SimHash)
- Hard blocker detection (CAPTCHAs, login walls, 403s, JS challenges)
- Page-type progress tracking (seed -> listing -> company -> team -> contact -> lead)
- Reflector-inspired error recovery with re-planning suggestions

All components are deterministic, O(1) per page, and require no LLM calls.
Memory budget: <5 MB (sliding window of hashes + pattern matching state).

Integration points:
- crawler_reward_shaping.py: OpAgentRewardShaper wraps existing RewardShaper
- crawler_content_quality.py: reuses SimHash for content fingerprinting
- crawler_engine.py: uses PageContent dataclass

Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import re
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Deque, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse

from crawler_content_quality import SimHash
from crawler_engine import PageContent

logger = logging.getLogger("crawler_opagent")


# ======================= Configuration ======================================

@dataclass
class OpAgentConfig:
    """Configuration for OpAgent-inspired hybrid reward and error recovery.

    All components are deterministic and free (no LLM calls).
    Default weights calibrated for focused B2B lead crawling.
    """

    # Feature toggles
    enable_process_rewards: bool = True
    enable_cycle_detection: bool = True
    enable_blocker_detection: bool = True
    enable_reflector: bool = True

    # Cycle detection
    cycle_similarity_threshold: float = 0.95
    max_cycle_buffer: int = 50

    # Blocker detection: regex patterns for hard blockers
    blocker_patterns: List[str] = field(default_factory=lambda: [
        r"(?i)captcha|recaptcha|hcaptcha|turnstile",
        r"(?i)cloudflare.*challenge|cf[-_]?challenge|ray\s*id",
        r"(?i)login\s*required|sign\s*in\s*to\s*continue|authentication\s*required",
        r"(?i)403\s*forbidden|access\s*denied|permission\s*denied",
        r"(?i)please\s*verify\s*you\s*are\s*(?:a\s*)?human",
        r"(?i)enable\s*javascript|javascript\s*is\s*required",
        r"(?i)rate\s*limit(?:ed)?|too\s*many\s*requests",
        r"(?i)bot\s*detection|automated\s*access\s*detected",
    ])

    # Process reward weights
    process_reward_weights: Dict[str, float] = field(default_factory=lambda: {
        "cycle_penalty": -0.3,
        "blocker_penalty": -0.5,
        "progress_bonus": 0.1,
        "new_domain_bonus": 0.05,
        "depth_penalty_per_level": -0.01,
        "content_novelty_bonus": 0.05,
    })


# ======================= Recovery Actions ===================================

class RecoveryAction(Enum):
    """Possible recovery actions when the reflector detects a problem."""

    SKIP_DOMAIN = "skip_domain"
    BACKTRACK = "backtrack"
    TRY_ALTERNATIVE = "try_alternative"
    ESCALATE = "escalate"
    CONTINUE = "continue"


# ======================= Page Type Hierarchy ================================

# Ordered from least to most valuable for lead generation
PAGE_TYPE_HIERARCHY: Dict[str, int] = {
    "seed": 0,
    "listing": 1,
    "company": 2,
    "about": 3,
    "team": 4,
    "careers": 5,
    "contact": 6,
    "lead": 7,
}

# Bonus page types that get an extra reward on top of progress
_HIGH_VALUE_TYPES = frozenset({"contact", "team", "careers", "lead"})

# URL and content patterns for page type classification
_PAGE_TYPE_PATTERNS: Dict[str, re.Pattern] = {
    "contact": re.compile(
        r"/(contact|kontakt|get-in-touch|reach-us|connect)\b", re.IGNORECASE
    ),
    "team": re.compile(
        r"/(team|people|staff|leadership|our-team|who-we-are)\b", re.IGNORECASE
    ),
    "about": re.compile(
        r"/(about|about-us|company|our-story)\b", re.IGNORECASE
    ),
    "careers": re.compile(
        r"/(careers|jobs|vacancies|openings|work-with-us|join-us|hiring)\b",
        re.IGNORECASE,
    ),
    "listing": re.compile(
        r"/(companies|directory|list|search|results|browse)\b", re.IGNORECASE
    ),
    "lead": re.compile(
        r"/(pricing|demo|quote|consultation|trial)\b", re.IGNORECASE
    ),
}

_PAGE_TYPE_CONTENT_PATTERNS: Dict[str, re.Pattern] = {
    "contact": re.compile(
        r"(?i)contact\s+us|get\s+in\s+touch|send\s+us\s+a\s+message|our\s+address",
    ),
    "team": re.compile(
        r"(?i)our\s+team|meet\s+the\s+team|leadership\s+team|our\s+people",
    ),
    "about": re.compile(
        r"(?i)our\s+mission|our\s+story|who\s+we\s+are|founded\s+in",
    ),
    "careers": re.compile(
        r"(?i)open\s+positions|we(?:'re|.are)\s+hiring|join\s+our\s+team",
    ),
    "lead": re.compile(
        r"(?i)request\s+a?\s*(?:demo|quote)|start\s+(?:your\s+)?free\s+trial|book\s+a\s+call",
    ),
}


def classify_page_type(url: str, body_text: str) -> str:
    """Classify a page into the type hierarchy.

    URL patterns checked first (fast, high precision), then content
    patterns as fallback. Returns the most specific matching type.

    Args:
        url: page URL.
        body_text: page body text (first 2000 chars used).

    Returns:
        One of the PAGE_TYPE_HIERARCHY keys.
    """
    url_lower = url.lower()
    text_lower = body_text[:2000].lower() if body_text else ""

    # URL-based detection (priority order: most specific first)
    for ptype in ("lead", "contact", "team", "careers", "about", "listing"):
        if _PAGE_TYPE_PATTERNS[ptype].search(url_lower):
            return ptype

    # Content-based fallback
    for ptype in ("lead", "contact", "team", "careers", "about"):
        pattern = _PAGE_TYPE_CONTENT_PATTERNS.get(ptype)
        if pattern and pattern.search(text_lower):
            return ptype

    # Check if it looks like a company homepage
    if re.search(r"(?i)our\s+(?:product|solution|platform|service)", text_lower):
        return "company"

    return "seed"


# ======================= Cycle Detector =====================================

class CycleDetector:
    """Detects when the crawler revisits semantically identical pages.

    Uses SimHash from crawler_content_quality.py for content fingerprinting.
    Maintains a sliding window of recent page hashes and checks new pages
    against all entries in the window using Hamming distance.

    A cycle is detected when a new page's SimHash is within the configured
    Hamming distance threshold of any page in the buffer. For 64-bit
    SimHash, a threshold of 3 bits corresponds to ~95% cosine similarity.

    Memory: ~8 bytes per hash * max_buffer + URL strings. Typically <0.5 MB.
    Time: O(buffer_size) per check (XOR + popcount, very fast).
    """

    def __init__(self, config: OpAgentConfig) -> None:
        self._config = config
        self._hasher = SimHash(num_bits=64)

        # Sliding window: (url, simhash) pairs
        self._buffer: Deque[Tuple[str, int]] = deque(
            maxlen=config.max_cycle_buffer
        )

        # Statistics
        self._total_checked: int = 0
        self._cycles_detected: int = 0

    def check_cycle(self, page_content: str) -> Tuple[bool, float]:
        """Check if page content is a near-duplicate of a recent page.

        Computes SimHash of the content and compares against all entries
        in the sliding window buffer using Hamming distance.

        Args:
            page_content: body text of the crawled page.

        Returns:
            Tuple of (is_cycle, similarity) where similarity is
            1.0 - (hamming_distance / 64). A similarity above the
            configured threshold indicates a cycle.
        """
        self._total_checked += 1

        if not page_content or not self._buffer:
            return False, 0.0

        new_hash = self._hasher.compute(page_content)

        # Convert threshold to hamming distance
        # similarity = 1 - (hamming / 64)
        # threshold = 0.95 -> max_hamming = (1 - 0.95) * 64 = 3.2 -> 3
        max_hamming = int((1.0 - self._config.cycle_similarity_threshold) * 64)

        best_similarity = 0.0

        for _url, stored_hash in self._buffer:
            hamming = SimHash.hamming_distance(new_hash, stored_hash)
            similarity = 1.0 - (hamming / 64.0)
            if similarity > best_similarity:
                best_similarity = similarity
            if hamming <= max_hamming:
                self._cycles_detected += 1
                return True, similarity

        return False, best_similarity

    def add_page(self, url: str, content: str) -> None:
        """Register a crawled page in the sliding window buffer.

        Args:
            url: page URL.
            content: page body text.
        """
        if not content:
            return
        page_hash = self._hasher.compute(content)
        self._buffer.append((url, page_hash))

    def get_cycle_rate(self) -> float:
        """Fraction of recently checked pages that were detected as cycles.

        Returns:
            Float in [0.0, 1.0]. Returns 0.0 if no pages checked yet.
        """
        if self._total_checked == 0:
            return 0.0
        return self._cycles_detected / self._total_checked

    def get_stats(self) -> Dict[str, Any]:
        """Return cycle detector statistics."""
        return {
            "total_checked": self._total_checked,
            "cycles_detected": self._cycles_detected,
            "cycle_rate": round(self.get_cycle_rate(), 4),
            "buffer_size": len(self._buffer),
            "buffer_capacity": self._config.max_cycle_buffer,
        }

    def clear(self) -> None:
        """Reset the sliding window buffer and statistics."""
        self._buffer.clear()
        self._total_checked = 0
        self._cycles_detected = 0


# ======================= Blocker Detector ===================================

class BlockerDetector:
    """Detects hard blockers that prevent meaningful content extraction.

    Identifies CAPTCHAs, login walls, 403 errors, Cloudflare challenges,
    JS-only pages, and rate limiting using compiled regex patterns against
    response content and HTTP status codes.

    All detection is pure regex -- no ML, no network calls.
    Time: O(P * L) where P is pattern count and L is content length.
    In practice <0.1ms per page since patterns are pre-compiled and
    content is checked up to first 5000 chars only.
    """

    # Map from blocker type to descriptive reason
    _BLOCKER_TYPES: Dict[str, str] = {
        "captcha": "CAPTCHA challenge detected",
        "cloudflare": "Cloudflare challenge page",
        "login_wall": "Login or authentication required",
        "forbidden": "403 Forbidden / access denied",
        "bot_check": "Human verification required",
        "js_required": "JavaScript required (no content rendered)",
        "rate_limit": "Rate limited / too many requests",
        "bot_detection": "Bot detection triggered",
    }

    def __init__(self, config: OpAgentConfig) -> None:
        self._config = config

        # Compile all blocker patterns
        self._compiled_patterns: List[Tuple[str, re.Pattern]] = []
        for i, pattern_str in enumerate(config.blocker_patterns):
            try:
                compiled = re.compile(pattern_str)
                # Assign a blocker type based on pattern index
                # (matches the order in OpAgentConfig.blocker_patterns default)
                blocker_types = [
                    "captcha", "cloudflare", "login_wall", "forbidden",
                    "bot_check", "js_required", "rate_limit", "bot_detection",
                ]
                btype = blocker_types[i] if i < len(blocker_types) else f"pattern_{i}"
                self._compiled_patterns.append((btype, compiled))
            except re.error as exc:
                logger.warning(
                    "Invalid blocker pattern at index %d: %s -- %s",
                    i, pattern_str, exc,
                )

        # Statistics: blocker_type -> count
        self._blocker_counts: Dict[str, int] = defaultdict(int)
        self._total_checked: int = 0

    def detect(self, page: PageContent) -> Tuple[bool, str]:
        """Detect if a page is blocked by a hard blocker.

        Checks HTTP status code first, then scans first 5000 chars of
        body text and title against all compiled blocker patterns.

        Args:
            page: crawled page content.

        Returns:
            Tuple of (is_blocked, reason). reason is empty string if
            not blocked.
        """
        self._total_checked += 1

        # HTTP status code checks
        if page.status_code == 403:
            self._blocker_counts["forbidden"] += 1
            return True, "403 Forbidden"
        if page.status_code == 429:
            self._blocker_counts["rate_limit"] += 1
            return True, "429 Too Many Requests"
        if page.status_code == 401:
            self._blocker_counts["login_wall"] += 1
            return True, "401 Unauthorized"
        if page.status_code == 503:
            # 503 could be a Cloudflare challenge or genuine service unavailable
            pass  # fall through to content check

        # Content-based detection (check first 5000 chars for speed)
        check_text = f"{page.title} {page.body_text[:5000]}"

        for btype, pattern in self._compiled_patterns:
            if pattern.search(check_text):
                self._blocker_counts[btype] += 1
                reason = self._BLOCKER_TYPES.get(btype, f"Blocked: {btype}")
                return True, reason

        # Empty content check (JS-only page that didn't render)
        if (
            page.status_code == 200
            and len(page.body_text.strip()) < 50
            and page.body_length > 1000
        ):
            self._blocker_counts["js_required"] += 1
            return True, "Page appears JS-only (no rendered content)"

        return False, ""

    def get_blocker_stats(self) -> Dict[str, int]:
        """Return counts of detected blockers by type.

        Returns:
            Dict mapping blocker type name to count.
        """
        return dict(self._blocker_counts)

    def get_stats(self) -> Dict[str, Any]:
        """Return full blocker detector statistics."""
        return {
            "total_checked": self._total_checked,
            "total_blocked": sum(self._blocker_counts.values()),
            "blocker_rate": (
                round(sum(self._blocker_counts.values()) / self._total_checked, 4)
                if self._total_checked > 0
                else 0.0
            ),
            "by_type": dict(self._blocker_counts),
        }

    def clear(self) -> None:
        """Reset blocker statistics."""
        self._blocker_counts.clear()
        self._total_checked = 0


# ======================= Progress Tracker ===================================

class ProgressTracker:
    """Tracks crawl progress through the page-type hierarchy.

    Assigns rewards for forward progression through the hierarchy:
        seed -> listing -> company -> about -> team -> careers -> contact -> lead

    Forward movement earns a per-level bonus. Reaching high-value pages
    (contact, team, careers, lead) earns an additional bonus. Backward
    or lateral movement earns zero reward.

    Memory: O(D) where D is number of unique domains visited.
    Time: O(1) per update.
    """

    # Extra bonus for reaching high-value page types
    HIGH_VALUE_BONUS: float = 0.2

    def __init__(self) -> None:
        # domain -> set of visited page types
        self._domain_types: Dict[str, Set[str]] = defaultdict(set)
        # domain -> highest level reached
        self._domain_max_level: Dict[str, int] = defaultdict(int)
        # Global counters by page type
        self._type_counts: Dict[str, int] = defaultdict(int)

    def update(self, url: str, page_type: str) -> None:
        """Register a page visit, updating progress state.

        Args:
            url: page URL.
            page_type: classified page type (from classify_page_type).
        """
        domain = self._extract_domain(url)
        self._domain_types[domain].add(page_type)
        self._type_counts[page_type] += 1

        level = PAGE_TYPE_HIERARCHY.get(page_type, 0)
        if level > self._domain_max_level[domain]:
            self._domain_max_level[domain] = level

    def compute_progress_reward(
        self, prev_type: str, curr_type: str
    ) -> float:
        """Compute reward for page-type progression.

        Forward progress (lower level -> higher level) earns +0.1 per
        level advanced. Reaching high-value types earns an additional
        +0.2 bonus. Backward or lateral movement earns 0.0.

        Args:
            prev_type: page type of previous page.
            curr_type: page type of current page.

        Returns:
            Float reward value (0.0 for no progress, positive for forward).
        """
        prev_level = PAGE_TYPE_HIERARCHY.get(prev_type, 0)
        curr_level = PAGE_TYPE_HIERARCHY.get(curr_type, 0)

        if curr_level <= prev_level:
            return 0.0

        # Forward progress: +0.1 per level advanced
        levels_advanced = curr_level - prev_level
        reward = levels_advanced * 0.1

        # High-value page bonus
        if curr_type in _HIGH_VALUE_TYPES:
            reward += self.HIGH_VALUE_BONUS

        return reward

    def get_domain_progress(self, domain: str) -> Dict[str, Any]:
        """Return progress info for a specific domain.

        Args:
            domain: target domain.

        Returns:
            Dict with visited types, max level reached, etc.
        """
        return {
            "visited_types": sorted(self._domain_types.get(domain, set())),
            "max_level": self._domain_max_level.get(domain, 0),
            "max_type": self._level_to_type(
                self._domain_max_level.get(domain, 0)
            ),
        }

    def get_stats(self) -> Dict[str, Any]:
        """Return overall progress tracker statistics."""
        return {
            "tracked_domains": len(self._domain_types),
            "type_counts": dict(self._type_counts),
            "domains_at_contact_or_higher": sum(
                1 for level in self._domain_max_level.values()
                if level >= PAGE_TYPE_HIERARCHY["contact"]
            ),
        }

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            return parsed.hostname or "unknown"
        except Exception:
            return "unknown"

    @staticmethod
    def _level_to_type(level: int) -> str:
        """Convert a hierarchy level back to its type name."""
        for ptype, plevel in PAGE_TYPE_HIERARCHY.items():
            if plevel == level:
                return ptype
        return "seed"


# ======================= Process Reward Shaper ==============================

class ProcessRewardShaper:
    """Combines all rule-based signals into per-step process rewards.

    This is the core RDT (Rule-Based Decision Tree) adapted from OpAgent
    for web crawling. Every component is deterministic and free (zero
    LLM cost). The process reward decomposes into named components for
    diagnostics.

    Components:
    1. Cycle penalty: detected via SimHash hamming distance
    2. Blocker penalty: CAPTCHAs, login walls, 403s, etc.
    3. Progress bonus: page-type hierarchy advancement
    4. New domain bonus: first visit to a domain
    5. Depth penalty: deeper pages get diminishing returns
    6. Content novelty: new information not seen in recent pages

    Memory: ~2 MB total across all sub-components.
    Time: O(1) per page (hash comparisons, pattern matching).
    """

    def __init__(self, config: Optional[OpAgentConfig] = None) -> None:
        self._config = config or OpAgentConfig()

        # Sub-components
        self.cycle_detector = CycleDetector(self._config)
        self.blocker_detector = BlockerDetector(self._config)
        self.progress_tracker = ProgressTracker()

        # Domain visit tracking
        self._visited_domains: Set[str] = set()

        # Content novelty: SimHash of recent unique content
        self._novelty_hasher = SimHash(num_bits=64)
        self._recent_hashes: Deque[int] = deque(maxlen=100)

    def compute_process_reward(
        self,
        page: PageContent,
        prev_page: Optional[PageContent],
        domain_stats: Optional[Dict[str, Any]] = None,
    ) -> Tuple[float, Dict[str, float]]:
        """Compute the full per-step process reward.

        Evaluates all rule-based signals and combines them using the
        configured weights. Returns both the total reward and a
        decomposition dict showing each component's contribution.

        Args:
            page: current crawled page.
            prev_page: previous crawled page (None if first page).
            domain_stats: optional dict with domain-level statistics
                (e.g., pages_crawled, leads_found).

        Returns:
            Tuple of (total_reward, decomposition) where decomposition
            maps component names to their reward values.
        """
        weights = self._config.process_reward_weights
        decomposition: Dict[str, float] = {}
        total = 0.0

        # 1. Cycle penalty
        if self._config.enable_cycle_detection:
            is_cycle, similarity = self.cycle_detector.check_cycle(
                page.body_text
            )
            if is_cycle:
                penalty = weights.get("cycle_penalty", -0.3)
                decomposition["cycle_penalty"] = penalty
                total += penalty
            else:
                decomposition["cycle_penalty"] = 0.0
            decomposition["cycle_similarity"] = similarity
        else:
            decomposition["cycle_penalty"] = 0.0

        # Always register the page for future cycle checks
        self.cycle_detector.add_page(page.url, page.body_text)

        # 2. Blocker penalty
        if self._config.enable_blocker_detection:
            is_blocked, reason = self.blocker_detector.detect(page)
            if is_blocked:
                penalty = weights.get("blocker_penalty", -0.5)
                decomposition["blocker_penalty"] = penalty
                decomposition["blocker_reason"] = hash(reason) * 0.0  # 0.0 placeholder
                total += penalty
                logger.debug("Blocker detected on %s: %s", page.url, reason)
            else:
                decomposition["blocker_penalty"] = 0.0
        else:
            decomposition["blocker_penalty"] = 0.0

        # 3. Progress bonus
        curr_type = classify_page_type(page.url, page.body_text)
        self.progress_tracker.update(page.url, curr_type)

        if prev_page is not None:
            prev_type = classify_page_type(prev_page.url, prev_page.body_text)
            progress_raw = self.progress_tracker.compute_progress_reward(
                prev_type, curr_type
            )
            progress_bonus = progress_raw * (
                weights.get("progress_bonus", 0.1)
                / 0.1  # normalise relative to default
            )
        else:
            progress_bonus = 0.0

        decomposition["progress_bonus"] = progress_bonus
        decomposition["page_type"] = float(PAGE_TYPE_HIERARCHY.get(curr_type, 0))
        total += progress_bonus

        # 4. New domain bonus
        domain = page.domain or self._extract_domain(page.url)
        if domain not in self._visited_domains:
            new_domain_bonus = weights.get("new_domain_bonus", 0.05)
            decomposition["new_domain_bonus"] = new_domain_bonus
            total += new_domain_bonus
            self._visited_domains.add(domain)
        else:
            decomposition["new_domain_bonus"] = 0.0

        # 5. Depth penalty
        depth = self._estimate_depth(page.url)
        depth_penalty = depth * weights.get("depth_penalty_per_level", -0.01)
        decomposition["depth_penalty"] = depth_penalty
        total += depth_penalty

        # 6. Content novelty bonus
        novelty_bonus = self._compute_content_novelty(page.body_text)
        novelty_weight = weights.get("content_novelty_bonus", 0.05)
        scaled_novelty = novelty_bonus * novelty_weight
        decomposition["content_novelty"] = scaled_novelty
        total += scaled_novelty

        return total, decomposition

    def _compute_content_novelty(self, text: str) -> float:
        """Compute content novelty score (0-1).

        A page is novel if its SimHash is far from all recent unique
        content hashes. Returns 1.0 for fully novel content, 0.0 for
        content identical to something recently seen.

        Args:
            text: page body text.

        Returns:
            Float in [0.0, 1.0].
        """
        if not text:
            return 0.0

        new_hash = self._novelty_hasher.compute(text)

        if not self._recent_hashes:
            self._recent_hashes.append(new_hash)
            return 1.0

        # Find minimum hamming distance to any recent hash
        min_hamming = 64
        for stored_hash in self._recent_hashes:
            hamming = SimHash.hamming_distance(new_hash, stored_hash)
            if hamming < min_hamming:
                min_hamming = hamming

        # Normalise: 0 hamming = 0 novelty, 32+ hamming = 1.0 novelty
        novelty = min(min_hamming / 32.0, 1.0)

        self._recent_hashes.append(new_hash)
        return novelty

    @staticmethod
    def _extract_domain(url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            return parsed.hostname or "unknown"
        except Exception:
            return "unknown"

    @staticmethod
    def _estimate_depth(url: str) -> int:
        """Estimate URL depth from path segment count.

        Args:
            url: page URL.

        Returns:
            Integer depth (0 for root, 1 for /foo, 2 for /foo/bar, etc.).
        """
        try:
            parsed = urlparse(url)
            path = parsed.path.strip("/")
            if not path:
                return 0
            return len(path.split("/"))
        except Exception:
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """Return comprehensive process reward statistics."""
        return {
            "visited_domains": len(self._visited_domains),
            "cycle_detector": self.cycle_detector.get_stats(),
            "blocker_detector": self.blocker_detector.get_stats(),
            "progress_tracker": self.progress_tracker.get_stats(),
            "novelty_buffer_size": len(self._recent_hashes),
        }

    def clear(self) -> None:
        """Reset all process reward state."""
        self.cycle_detector.clear()
        self.blocker_detector.clear()
        self._visited_domains.clear()
        self._recent_hashes.clear()


# ======================= Reflector ==========================================

class Reflector:
    """Post-action verification that triggers re-planning on failure.

    Inspired by OpAgent's Reflector module, adapted for web crawling.
    After each crawl action, checks whether the outcome matches
    expectations and suggests recovery actions when it does not.

    Failure conditions:
    1. Got blocked (CAPTCHA, login wall, 403, etc.)
    2. Cycle detected (revisiting identical content)
    3. Wrong page type (expected careers page, got homepage)
    4. Empty content (JS-only page, network error)

    Recovery actions:
    - skip_domain: abandon this domain entirely
    - backtrack: go back to parent/listing page
    - try_alternative: try a different link to reach the target
    - escalate: flag for manual review
    """

    def __init__(self, config: Optional[OpAgentConfig] = None) -> None:
        self._config = config or OpAgentConfig()
        self._cycle_detector = CycleDetector(self._config)
        self._blocker_detector = BlockerDetector(self._config)

        # Statistics
        self._total_checks: int = 0
        self._replans_triggered: int = 0
        self._recovery_actions: Dict[str, int] = defaultdict(int)

    def should_replan(
        self,
        page: PageContent,
        expected_type: str,
    ) -> bool:
        """Determine whether the current page requires re-planning.

        Checks four failure conditions in order of severity:
        1. Hard blocker detected
        2. Content cycle detected
        3. Page type does not match expectation
        4. Page has no meaningful content

        Args:
            page: the crawled page to evaluate.
            expected_type: the page type we expected to reach
                (e.g., "contact", "careers").

        Returns:
            True if re-planning is needed.
        """
        if not self._config.enable_reflector:
            return False

        self._total_checks += 1

        # 1. Blocker check
        is_blocked, _reason = self._blocker_detector.detect(page)
        if is_blocked:
            self._replans_triggered += 1
            return True

        # 2. Cycle check
        is_cycle, _similarity = self._cycle_detector.check_cycle(page.body_text)
        self._cycle_detector.add_page(page.url, page.body_text)
        if is_cycle:
            self._replans_triggered += 1
            return True

        # 3. Page type mismatch
        actual_type = classify_page_type(page.url, page.body_text)
        actual_level = PAGE_TYPE_HIERARCHY.get(actual_type, 0)
        expected_level = PAGE_TYPE_HIERARCHY.get(expected_type, 0)
        # Only flag mismatch if we went significantly backward
        if expected_level > 0 and actual_level < expected_level - 1:
            self._replans_triggered += 1
            return True

        # 4. Empty content
        if len(page.body_text.strip()) < 50:
            self._replans_triggered += 1
            return True

        return False

    def suggest_recovery_action(self, failure_reason: str) -> RecoveryAction:
        """Suggest a recovery action based on the failure reason.

        Maps failure categories to appropriate recovery strategies:
        - Blocked/rate-limited: skip the entire domain
        - Cycle detected: backtrack to a listing or parent page
        - Wrong page type: try an alternative link
        - Empty content: try an alternative link
        - Unknown: escalate for review

        Args:
            failure_reason: descriptive string of what went wrong.

        Returns:
            RecoveryAction enum value.
        """
        reason_lower = failure_reason.lower()

        if any(
            kw in reason_lower
            for kw in ("403", "forbidden", "captcha", "rate limit", "bot detection")
        ):
            action = RecoveryAction.SKIP_DOMAIN
        elif "cycle" in reason_lower or "duplicate" in reason_lower:
            action = RecoveryAction.BACKTRACK
        elif "wrong" in reason_lower or "mismatch" in reason_lower:
            action = RecoveryAction.TRY_ALTERNATIVE
        elif "empty" in reason_lower or "no content" in reason_lower:
            action = RecoveryAction.TRY_ALTERNATIVE
        elif "login" in reason_lower or "auth" in reason_lower:
            action = RecoveryAction.SKIP_DOMAIN
        else:
            action = RecoveryAction.ESCALATE

        self._recovery_actions[action.value] += 1
        return action

    def get_stats(self) -> Dict[str, Any]:
        """Return reflector statistics."""
        return {
            "total_checks": self._total_checks,
            "replans_triggered": self._replans_triggered,
            "replan_rate": (
                round(self._replans_triggered / self._total_checks, 4)
                if self._total_checks > 0
                else 0.0
            ),
            "recovery_actions": dict(self._recovery_actions),
        }


# ======================= OpAgent Reward Shaper (Orchestrator) ===============

class OpAgentRewardShaper:
    """Full OpAgent-inspired reward shaper integrating all components.

    Combines per-step process rewards (free, deterministic) with the
    existing reward shaping from crawler_reward_shaping.py. The process
    rewards provide dense per-step credit assignment, while the existing
    PotentialFunction provides trajectory-level shaping.

    Usage:
        config = OpAgentConfig()
        shaper = OpAgentRewardShaper(config)

        # Per page in crawl loop:
        shaped_reward, info = shaper.shape_reward(
            page=current_page,
            prev_page=previous_page,
            raw_reward=extraction_reward,
            domain_stats={"pages_crawled": 42},
        )

        # Check for recovery:
        recovery = shaper.check_and_recover(
            page=current_page,
            expected="contact",
        )
        if recovery is not None:
            # Handle recovery action
            ...
    """

    def __init__(self, config: Optional[OpAgentConfig] = None) -> None:
        self._config = config or OpAgentConfig()

        # Core components
        self.process_shaper = ProcessRewardShaper(self._config)
        self.reflector = Reflector(self._config)

        # Blending weight: how much process reward contributes vs raw
        self._process_weight: float = 0.5

    def shape_reward(
        self,
        page: PageContent,
        prev_page: Optional[PageContent],
        raw_reward: float,
        domain_stats: Optional[Dict[str, Any]] = None,
    ) -> Tuple[float, Dict[str, Any]]:
        """Compute hybrid reward combining process and raw signals.

        The final reward blends:
        - Raw reward from the extraction module (lead found, entity mention, etc.)
        - Process reward from rule-based per-step checks (cycles, blockers,
          progress, novelty, etc.)

        The blend uses a configurable weight (default 0.5):
            total = raw_reward + process_weight * process_reward

        Args:
            page: current crawled page.
            prev_page: previous crawled page (None if first page).
            raw_reward: reward from extraction module.
            domain_stats: optional domain-level statistics.

        Returns:
            Tuple of (shaped_reward, info_dict) where info_dict contains
            the full reward decomposition for diagnostics.
        """
        info: Dict[str, Any] = {
            "raw_reward": raw_reward,
            "url": page.url,
            "domain": page.domain,
        }

        if self._config.enable_process_rewards:
            process_reward, decomposition = (
                self.process_shaper.compute_process_reward(
                    page, prev_page, domain_stats
                )
            )
            info["process_reward"] = process_reward
            info["decomposition"] = decomposition
        else:
            process_reward = 0.0
            info["process_reward"] = 0.0
            info["decomposition"] = {}

        # Blend raw and process rewards
        shaped = raw_reward + self._process_weight * process_reward
        info["shaped_reward"] = shaped

        return shaped, info

    def check_and_recover(
        self,
        page: PageContent,
        expected: str,
    ) -> Optional[RecoveryAction]:
        """Check if the page requires recovery and suggest an action.

        Delegates to the Reflector for failure detection, then maps the
        failure reason to a recovery action.

        Args:
            page: current crawled page.
            expected: expected page type (e.g., "contact", "careers").

        Returns:
            RecoveryAction if re-planning is needed, None if page is fine.
        """
        if not self._config.enable_reflector:
            return None

        needs_replan = self.reflector.should_replan(page, expected)
        if not needs_replan:
            return None

        # Determine failure reason for recovery mapping
        # Check in order of severity to get the most specific reason
        is_blocked, block_reason = (
            self.process_shaper.blocker_detector.detect(page)
        )
        if is_blocked:
            return self.reflector.suggest_recovery_action(block_reason)

        is_cycle, _sim = (
            self.process_shaper.cycle_detector.check_cycle(page.body_text)
        )
        if is_cycle:
            return self.reflector.suggest_recovery_action("cycle detected")

        actual_type = classify_page_type(page.url, page.body_text)
        expected_level = PAGE_TYPE_HIERARCHY.get(expected, 0)
        actual_level = PAGE_TYPE_HIERARCHY.get(actual_type, 0)
        if actual_level < expected_level - 1:
            return self.reflector.suggest_recovery_action(
                f"wrong page type: expected {expected}, got {actual_type}"
            )

        if len(page.body_text.strip()) < 50:
            return self.reflector.suggest_recovery_action("empty content")

        # Generic fallback
        return self.reflector.suggest_recovery_action("unknown failure")

    def get_stats(self) -> Dict[str, Any]:
        """Return comprehensive statistics from all components."""
        return {
            "process_shaper": self.process_shaper.get_stats(),
            "reflector": self.reflector.get_stats(),
            "config": {
                "enable_process_rewards": self._config.enable_process_rewards,
                "enable_cycle_detection": self._config.enable_cycle_detection,
                "enable_blocker_detection": self._config.enable_blocker_detection,
                "enable_reflector": self._config.enable_reflector,
                "process_weight": self._process_weight,
            },
        }

    def clear(self) -> None:
        """Reset all state across all components."""
        self.process_shaper.clear()

"""
Module: Page type classification for better crawl decisions.

Provides:
1. PageType: enum of 18 page categories (company, product, content, nav, etc.)
2. PageClassifier: rule-based classifier using URL patterns + content signals
3. PageTypeRewardMap: configurable expected reward values per page type
4. PageStructureAnalyzer: extract emails, phones, addresses, forms, social links
5. NavigationDetector: detect nav pages and high-value site sections
6. PageTypeTracker: per-domain page type distribution and exploration completeness

Pure Python + regex. No ML dependencies. Target M1 16GB.
"""

import logging
import re
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse

logger = logging.getLogger("crawler_page_classifier")


# ======================= PageType Enum ======================================

class PageType(Enum):
    """Page type categories for crawl decision-making."""

    # Company pages
    COMPANY_ABOUT = "company_about"
    COMPANY_TEAM = "company_team"
    COMPANY_CONTACT = "company_contact"
    COMPANY_CAREERS = "company_careers"

    # Product/commercial
    PRODUCT_PAGE = "product_page"
    PRICING_PAGE = "pricing_page"
    CASE_STUDY = "case_study"
    TESTIMONIALS = "testimonials"

    # Content
    BLOG_POST = "blog_post"
    NEWS_ARTICLE = "news_article"
    DOCUMENTATION = "documentation"

    # Aggregator
    DIRECTORY_LISTING = "directory_listing"
    JOB_BOARD = "job_board"

    # Structural / low-value
    LOGIN_PAGE = "login_page"
    ERROR_PAGE = "error_page"
    NAVIGATION_PAGE = "navigation_page"

    # External / social
    SOCIAL_MEDIA = "social_media"
    FORUM = "forum"

    # Fallback
    UNKNOWN = "unknown"


# ======================= URL Pattern Definitions ============================

# Compiled regex patterns for URL-based classification.
# Each tuple: (PageType, compiled regex for URL path matching).
_URL_PATTERNS: List[Tuple[PageType, re.Pattern[str]]] = [
    # Company pages
    (PageType.COMPANY_ABOUT, re.compile(
        r"/(about|about-us|who-we-are|our-story|our-mission|company)/?$", re.I
    )),
    (PageType.COMPANY_TEAM, re.compile(
        r"/(team|our-team|people|leadership|management|founders|staff)/?$", re.I
    )),
    (PageType.COMPANY_CONTACT, re.compile(
        r"/(contact|contact-us|get-in-touch|reach-us|enquiry|inquiry)/?$", re.I
    )),
    (PageType.COMPANY_CAREERS, re.compile(
        r"/(careers|jobs|join-us|work-with-us|open-positions|hiring|vacancies)/?$", re.I
    )),

    # Product / commercial
    (PageType.PRODUCT_PAGE, re.compile(
        r"/(product|products|features|solutions|platform|services)(/|$)", re.I
    )),
    (PageType.PRICING_PAGE, re.compile(
        r"/(pricing|plans|packages|subscription|buy|pricing-plans)/?$", re.I
    )),
    (PageType.CASE_STUDY, re.compile(
        r"/(case-stud|customer-stor|success-stor|showcase)", re.I
    )),
    (PageType.TESTIMONIALS, re.compile(
        r"/(testimonials|reviews|customer-reviews|social-proof|wall-of-love)/?$", re.I
    )),

    # Content
    (PageType.BLOG_POST, re.compile(
        r"/(blog|posts|articles|insights|news|journal|updates)(/|$)", re.I
    )),
    (PageType.NEWS_ARTICLE, re.compile(
        r"/(press|newsroom|press-releases|media|announcements)(/|$)", re.I
    )),
    (PageType.DOCUMENTATION, re.compile(
        r"/(docs|documentation|help|support|guide|guides|wiki|api-reference|reference|handbook)(/|$)", re.I
    )),

    # Aggregator
    (PageType.DIRECTORY_LISTING, re.compile(
        r"/(directory|listing|listings|catalog|catalogue|browse|explore)(/|$)", re.I
    )),
    (PageType.JOB_BOARD, re.compile(
        r"/(job-board|job-listings|open-roles|opportunities)(/|$)", re.I
    )),

    # Structural / low-value
    (PageType.LOGIN_PAGE, re.compile(
        r"/(login|signin|sign-in|log-in|auth|register|signup|sign-up|sso|oauth)/?$", re.I
    )),
    (PageType.ERROR_PAGE, re.compile(
        r"/(404|error|not-found|403|500|oops)/?$", re.I
    )),
]

# Social media domain patterns (match on full domain, not path).
_SOCIAL_DOMAINS: Set[str] = {
    "facebook.com", "twitter.com", "x.com", "linkedin.com", "instagram.com",
    "youtube.com", "tiktok.com", "pinterest.com", "reddit.com", "github.com",
    "medium.com", "substack.com",
}

# Forum indicators in URL path.
_FORUM_PATTERN: re.Pattern[str] = re.compile(
    r"/(forum|forums|community|discuss|discussions|threads|topic|board)(/|$)", re.I
)


# ======================= Content Signal Definitions =========================

# Keyword sets for content-based signals.
# Each entry: (PageType, set of keywords to look for in body text).
_CONTENT_KEYWORDS: Dict[PageType, List[str]] = {
    PageType.COMPANY_ABOUT: [
        "our mission", "our story", "who we are", "founded in", "we believe",
        "our values", "company overview", "about us", "what we do",
    ],
    PageType.COMPANY_TEAM: [
        "our team", "meet the team", "leadership team", "co-founder", "ceo",
        "cto", "vp of", "head of", "director of", "our people",
    ],
    PageType.COMPANY_CONTACT: [
        "contact us", "get in touch", "reach out", "send us a message",
        "email us", "call us", "our office", "headquarters", "mailing address",
    ],
    PageType.COMPANY_CAREERS: [
        "open positions", "join our team", "we're hiring", "career opportunities",
        "work with us", "apply now", "current openings", "job openings",
    ],
    PageType.PRICING_PAGE: [
        "per month", "per year", "/mo", "/yr", "free trial", "enterprise plan",
        "starter plan", "pro plan", "pricing", "subscribe", "billed annually",
    ],
    PageType.CASE_STUDY: [
        "case study", "customer story", "success story", "how they",
        "the challenge", "the solution", "the results", "roi",
    ],
    PageType.TESTIMONIALS: [
        "testimonial", "what our customers say", "customer reviews",
        "trust us", "rated", "stars", "loved by", "wall of love",
    ],
    PageType.DOCUMENTATION: [
        "getting started", "api reference", "installation", "quick start",
        "documentation", "usage guide", "configuration", "parameters",
    ],
    PageType.LOGIN_PAGE: [
        "sign in", "log in", "username", "password", "forgot password",
        "create account", "register", "sso", "single sign-on",
    ],
    PageType.JOB_BOARD: [
        "remote jobs", "job listings", "open roles", "apply now",
        "full-time", "part-time", "contract", "location:", "salary:",
    ],
    PageType.FORUM: [
        "posted by", "reply", "replies", "thread", "discussion",
        "community", "forum", "upvote", "downvote",
    ],
}

# Title patterns: (PageType, compiled regex for title matching).
_TITLE_PATTERNS: List[Tuple[PageType, re.Pattern[str]]] = [
    (PageType.COMPANY_ABOUT, re.compile(
        r"\b(about\s+us|our\s+story|who\s+we\s+are|company)\b", re.I
    )),
    (PageType.COMPANY_TEAM, re.compile(
        r"\b(our\s+team|team|leadership|people)\b", re.I
    )),
    (PageType.COMPANY_CONTACT, re.compile(
        r"\b(contact\s+us|contact|get\s+in\s+touch)\b", re.I
    )),
    (PageType.COMPANY_CAREERS, re.compile(
        r"\b(careers|jobs|hiring|open\s+positions)\b", re.I
    )),
    (PageType.PRICING_PAGE, re.compile(
        r"\b(pricing|plans|packages)\b", re.I
    )),
    (PageType.BLOG_POST, re.compile(
        r"\b(blog|article|post)\b", re.I
    )),
    (PageType.DOCUMENTATION, re.compile(
        r"\b(docs|documentation|api\s+reference|guide)\b", re.I
    )),
    (PageType.LOGIN_PAGE, re.compile(
        r"\b(log\s*in|sign\s*in|register|sign\s*up)\b", re.I
    )),
    (PageType.ERROR_PAGE, re.compile(
        r"\b(404|page\s+not\s+found|error|oops)\b", re.I
    )),
]


# ======================= PageClassifier =====================================

class PageClassifier:
    """Rule-based page type classifier using URL patterns, content signals,
    and title patterns.

    No ML dependencies. Returns (PageType, confidence) tuples where
    confidence is 0.0-1.0 based on signal agreement.

    Usage:
        classifier = PageClassifier()
        page_type, confidence = classifier.classify(page_content)
    """

    def __init__(self) -> None:
        self._url_patterns = _URL_PATTERNS
        self._content_keywords = _CONTENT_KEYWORDS
        self._title_patterns = _TITLE_PATTERNS
        self._social_domains = _SOCIAL_DOMAINS
        self._forum_pattern = _FORUM_PATTERN

    def classify(self, page: Any) -> Tuple[PageType, float]:
        """Classify a single page by combining URL, content, and title signals.

        Args:
            page: PageContent instance (url, title, body_text, outbound_links).

        Returns:
            (PageType, confidence) where confidence is 0.0-1.0.
        """
        scores: Dict[PageType, float] = defaultdict(float)

        url = getattr(page, "url", "")
        title = getattr(page, "title", "")
        body_text = getattr(page, "body_text", "")
        status_code = getattr(page, "status_code", 200)

        # Check for error pages by status code first
        if status_code >= 400:
            return (PageType.ERROR_PAGE, 0.95)

        # --- URL signals (weight: 0.45) ---
        url_type = self._classify_url(url)
        if url_type is not None:
            scores[url_type] += 0.45

        # --- Title signals (weight: 0.25) ---
        title_type = self._classify_title(title)
        if title_type is not None:
            scores[title_type] += 0.25

        # --- Content signals (weight: 0.30) ---
        content_scores = self._score_content(body_text)
        for pt, score in content_scores.items():
            scores[pt] += score * 0.30

        # Pick the highest-scoring type
        if not scores:
            return (PageType.UNKNOWN, 0.0)

        best_type = max(scores, key=scores.get)  # type: ignore[arg-type]
        best_score = scores[best_type]

        # Clamp confidence to [0, 1]
        confidence = min(best_score, 1.0)

        # Low confidence threshold: if nothing scored above 0.15, mark unknown
        if confidence < 0.15:
            return (PageType.UNKNOWN, confidence)

        return (best_type, round(confidence, 3))

    def classify_batch(
        self, pages: List[Any]
    ) -> List[Tuple[PageType, float]]:
        """Classify a batch of pages.

        Args:
            pages: list of PageContent instances.

        Returns:
            List of (PageType, confidence) tuples, one per page.
        """
        return [self.classify(page) for page in pages]

    def _classify_url(self, url: str) -> Optional[PageType]:
        """Match URL path against known patterns."""
        if not url:
            return None

        parsed = urlparse(url)
        domain = parsed.netloc.lower().lstrip("www.")
        path = parsed.path

        # Social media check (domain-level)
        for social_domain in self._social_domains:
            if domain == social_domain or domain.endswith("." + social_domain):
                return PageType.SOCIAL_MEDIA

        # Forum check
        if self._forum_pattern.search(path):
            return PageType.FORUM

        # Path-based patterns
        for page_type, pattern in self._url_patterns:
            if pattern.search(path):
                return page_type

        return None

    def _classify_title(self, title: str) -> Optional[PageType]:
        """Match page title against known patterns."""
        if not title:
            return None

        for page_type, pattern in self._title_patterns:
            if pattern.search(title):
                return page_type

        return None

    def _score_content(self, body_text: str) -> Dict[PageType, float]:
        """Score body text against keyword sets per page type.

        Returns a dict of PageType -> score (0.0-1.0) based on keyword
        match density. Score = matches / total_keywords, capped at 1.0.
        """
        if not body_text:
            return {}

        text_lower = body_text.lower()
        scores: Dict[PageType, float] = {}

        for page_type, keywords in self._content_keywords.items():
            matches = sum(1 for kw in keywords if kw in text_lower)
            if matches > 0:
                # Normalize: 3+ keyword matches = max score for this signal
                scores[page_type] = min(matches / 3.0, 1.0)

        return scores


# ======================= PageTypeRewardMap ==================================

# Default expected reward values per page type.
# COMPANY_CONTACT is highest-value for B2B lead generation.
_DEFAULT_REWARDS: Dict[PageType, float] = {
    PageType.COMPANY_CONTACT: 0.50,
    PageType.COMPANY_TEAM: 0.30,
    PageType.COMPANY_ABOUT: 0.20,
    PageType.COMPANY_CAREERS: 0.15,
    PageType.PRODUCT_PAGE: 0.10,
    PageType.PRICING_PAGE: 0.08,
    PageType.CASE_STUDY: 0.06,
    PageType.TESTIMONIALS: 0.05,
    PageType.JOB_BOARD: 0.05,
    PageType.DIRECTORY_LISTING: 0.04,
    PageType.NEWS_ARTICLE: 0.03,
    PageType.BLOG_POST: 0.02,
    PageType.DOCUMENTATION: 0.01,
    PageType.FORUM: 0.01,
    PageType.SOCIAL_MEDIA: 0.0,
    PageType.NAVIGATION_PAGE: 0.0,
    PageType.UNKNOWN: 0.0,
    PageType.LOGIN_PAGE: -0.05,
    PageType.ERROR_PAGE: -0.10,
}


class PageTypeRewardMap:
    """Map page types to expected reward values for crawl prioritisation.

    Default values are tuned for B2B lead generation (contact pages
    most valuable). Supports runtime updates from actual observed
    rewards to learn domain-specific value over time.

    Usage:
        reward_map = PageTypeRewardMap()
        expected = reward_map.get_expected_reward(PageType.COMPANY_CONTACT)
    """

    def __init__(
        self,
        overrides: Optional[Dict[PageType, float]] = None,
        learning_rate: float = 0.1,
    ) -> None:
        self._rewards: Dict[PageType, float] = dict(_DEFAULT_REWARDS)
        if overrides:
            self._rewards.update(overrides)

        # For online learning from actual rewards
        self._learning_rate = learning_rate
        self._observation_counts: Dict[PageType, int] = defaultdict(int)
        self._lock = threading.Lock()

    def get_expected_reward(self, page_type: PageType) -> float:
        """Return the expected reward for a page type.

        Args:
            page_type: the classified page type.

        Returns:
            Expected reward value (can be negative for low-value pages).
        """
        with self._lock:
            return self._rewards.get(page_type, 0.0)

    def update_from_observation(
        self, page_type: PageType, actual_reward: float
    ) -> None:
        """Update expected reward from an actual observed reward.

        Uses exponential moving average: new = old + lr * (actual - old).
        This allows the reward map to adapt to domain-specific patterns
        over time (e.g., some domains have valuable blog posts).

        Args:
            page_type: the classified page type.
            actual_reward: the reward actually received.
        """
        with self._lock:
            current = self._rewards.get(page_type, 0.0)
            updated = current + self._learning_rate * (actual_reward - current)
            self._rewards[page_type] = updated
            self._observation_counts[page_type] += 1

    def get_all_rewards(self) -> Dict[PageType, float]:
        """Return a copy of all current reward values."""
        with self._lock:
            return dict(self._rewards)

    def get_observation_counts(self) -> Dict[PageType, int]:
        """Return observation counts per page type."""
        with self._lock:
            return dict(self._observation_counts)

    def reset(self) -> None:
        """Reset rewards to defaults and clear observation history."""
        with self._lock:
            self._rewards = dict(_DEFAULT_REWARDS)
            self._observation_counts.clear()


# ======================= PageStructureAnalyzer ==============================

# Pre-compiled regex patterns for structure analysis.
_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", re.I
)
_PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[\s\-.]?)?"  # country code
    r"(?:\(?\d{1,4}\)?[\s\-.]?)?"  # area code
    r"\d{2,4}[\s\-.]?\d{2,4}[\s\-.]?\d{0,4}",
)
_ADDRESS_RE = re.compile(
    r"\d{1,5}\s+[\w\s]{2,30}(?:street|st|avenue|ave|road|rd|boulevard|blvd|"
    r"drive|dr|lane|ln|court|ct|way|place|pl)\b",
    re.I,
)
_FORM_RE = re.compile(
    r"<form[\s>]|<input[\s>].*?type=[\"'](?:text|email|tel|submit)",
    re.I,
)

# Social media link patterns: (platform_name, domain_pattern).
_SOCIAL_LINK_PATTERNS: List[Tuple[str, re.Pattern[str]]] = [
    ("linkedin", re.compile(r"linkedin\.com/", re.I)),
    ("twitter", re.compile(r"(?:twitter|x)\.com/", re.I)),
    ("facebook", re.compile(r"facebook\.com/", re.I)),
    ("instagram", re.compile(r"instagram\.com/", re.I)),
    ("youtube", re.compile(r"youtube\.com/", re.I)),
    ("github", re.compile(r"github\.com/", re.I)),
    ("tiktok", re.compile(r"tiktok\.com/", re.I)),
    ("mastodon", re.compile(r"mastodon\.\w+/", re.I)),
    ("bluesky", re.compile(r"bsky\.app/", re.I)),
]

# Company signal keyword patterns.
_COMPANY_SIGNAL_KEYWORDS: Dict[str, List[str]] = {
    "has_pricing": ["pricing", "per month", "/mo", "free trial", "enterprise"],
    "has_team": ["our team", "meet the team", "leadership", "co-founder"],
    "has_testimonials": ["testimonial", "customer review", "what our customers say"],
    "has_careers": ["careers", "open positions", "we're hiring", "join our team"],
    "has_product": ["features", "how it works", "our platform", "our product"],
    "has_case_studies": ["case study", "customer story", "success story"],
}


class PageStructureAnalyzer:
    """Analyze page HTML/text structure to extract structured signals.

    Extracts emails, phone numbers, addresses, form presence, social
    links, and company-level signals without a full DOM parser.

    Usage:
        analyzer = PageStructureAnalyzer()
        emails = analyzer.has_email(body_text)
        has_form = analyzer.has_form(body_text)
        socials = analyzer.social_links(outbound_links)
    """

    def has_form(self, body_text: str) -> bool:
        """Check if the page contains a form (contact/signup form).

        Looks for <form> tags and input fields with text/email/tel types.

        Args:
            body_text: raw page body text (may contain HTML remnants).

        Returns:
            True if form-like elements are detected.
        """
        return bool(_FORM_RE.search(body_text))

    def has_email(self, body_text: str) -> List[str]:
        """Extract email addresses from page text.

        Filters out common false positives (image files, example domains).

        Args:
            body_text: page body text.

        Returns:
            Deduplicated list of email addresses found.
        """
        raw = _EMAIL_RE.findall(body_text)

        # Filter false positives
        filtered: List[str] = []
        seen: Set[str] = set()
        for email in raw:
            email_lower = email.lower()
            # Skip image/asset file extensions
            if email_lower.endswith((".png", ".jpg", ".gif", ".svg", ".webp")):
                continue
            # Skip example/placeholder domains
            if "example.com" in email_lower or "test.com" in email_lower:
                continue
            # Skip webpack/build artifacts
            if "webpack" in email_lower or "node_modules" in email_lower:
                continue
            if email_lower not in seen:
                seen.add(email_lower)
                filtered.append(email)

        return filtered

    def has_phone(self, body_text: str) -> List[str]:
        """Extract phone numbers from page text.

        Filters short matches (< 7 digits) to avoid false positives
        like years or short number sequences.

        Args:
            body_text: page body text.

        Returns:
            Deduplicated list of phone number strings found.
        """
        raw = _PHONE_RE.findall(body_text)

        filtered: List[str] = []
        seen: Set[str] = set()
        for phone in raw:
            cleaned = phone.strip()
            # Require at least 7 digit characters for a valid phone number
            digit_count = sum(1 for c in cleaned if c.isdigit())
            if digit_count < 7:
                continue
            if cleaned not in seen:
                seen.add(cleaned)
                filtered.append(cleaned)

        return filtered

    def has_address(self, body_text: str) -> List[str]:
        """Extract street addresses from page text.

        Uses a pattern for US/UK-style addresses (number + street name + type).

        Args:
            body_text: page body text.

        Returns:
            List of address strings found.
        """
        matches = _ADDRESS_RE.findall(body_text)
        # Deduplicate and clean whitespace
        seen: Set[str] = set()
        result: List[str] = []
        for addr in matches:
            cleaned = " ".join(addr.split())
            if cleaned not in seen:
                seen.add(cleaned)
                result.append(cleaned)
        return result

    def social_links(self, links: List[str]) -> Dict[str, str]:
        """Extract social media links from outbound links.

        Args:
            links: list of outbound URLs from the page.

        Returns:
            Dict mapping platform name to URL (first match per platform).
        """
        result: Dict[str, str] = {}
        for link in links:
            for platform, pattern in _SOCIAL_LINK_PATTERNS:
                if platform not in result and pattern.search(link):
                    result[platform] = link
                    break
        return result

    def company_signals(self, body_text: str) -> Dict[str, bool]:
        """Detect high-level company page signals from body text.

        Returns:
            Dict of signal_name -> present (e.g., has_pricing, has_team).
        """
        text_lower = body_text.lower()
        signals: Dict[str, bool] = {}
        for signal_name, keywords in _COMPANY_SIGNAL_KEYWORDS.items():
            signals[signal_name] = any(kw in text_lower for kw in keywords)
        return signals


# ======================= NavigationDetector =================================

class NavigationDetector:
    """Detect navigation-heavy pages and extract site structure.

    A navigation page is one dominated by links with minimal unique
    content (e.g., a sitemap, index page, or hub page).

    Usage:
        detector = NavigationDetector()
        is_nav = detector.is_navigation_page(page)
        structure = detector.extract_site_structure(pages_from_domain)
        high_value = detector.find_high_value_sections(structure)
    """

    def __init__(
        self,
        link_ratio_threshold: float = 0.6,
        min_links: int = 10,
        min_body_length: int = 200,
    ) -> None:
        """
        Args:
            link_ratio_threshold: if links / body_words > this, page is nav.
            min_links: minimum number of outbound links to consider.
            min_body_length: pages shorter than this (chars) are likely nav.
        """
        self._link_ratio_threshold = link_ratio_threshold
        self._min_links = min_links
        self._min_body_length = min_body_length

    def is_navigation_page(self, page: Any) -> bool:
        """Determine if a page is primarily a navigation/index page.

        Heuristic: high link count relative to text content, or very
        short body with many outbound links.

        Args:
            page: PageContent instance.

        Returns:
            True if the page appears to be a navigation page.
        """
        body_text = getattr(page, "body_text", "")
        outbound_links = getattr(page, "outbound_links", [])
        link_count = len(outbound_links)

        # Too few links to be a nav page
        if link_count < self._min_links:
            return False

        # Very short body with many links
        if len(body_text) < self._min_body_length and link_count >= self._min_links:
            return True

        # Compute ratio of links to body word count
        word_count = len(body_text.split())
        if word_count == 0:
            return True

        link_ratio = link_count / word_count
        return link_ratio > self._link_ratio_threshold

    def extract_site_structure(
        self, pages_from_domain: List[Any]
    ) -> Dict[str, List[str]]:
        """Extract site structure by grouping page URLs into sections.

        Groups pages by their first path segment (e.g., /blog/*, /about/*,
        /products/*) to build a map of site sections.

        Args:
            pages_from_domain: list of PageContent instances from one domain.

        Returns:
            Dict mapping section name (first path segment) to list of URLs.
        """
        sections: Dict[str, List[str]] = defaultdict(list)

        for page in pages_from_domain:
            url = getattr(page, "url", "")
            if not url:
                continue

            parsed = urlparse(url)
            path = parsed.path.strip("/")
            if not path:
                sections["root"].append(url)
                continue

            # Use first path segment as section name
            first_segment = path.split("/")[0].lower()
            sections[first_segment].append(url)

        return dict(sections)

    def find_high_value_sections(
        self, structure: Dict[str, List[str]]
    ) -> List[str]:
        """Identify high-value sections from site structure.

        Returns sections that typically contain B2B lead information:
        about, team, contact, careers, pricing.

        Args:
            structure: output of extract_site_structure().

        Returns:
            List of section names that are high-value for lead generation.
        """
        high_value_names = {
            "about", "about-us", "team", "our-team", "people",
            "contact", "contact-us", "careers", "jobs",
            "pricing", "plans",
            "leadership", "management",
            "customers", "case-studies", "testimonials",
        }

        found: List[str] = []
        for section_name in structure:
            if section_name in high_value_names:
                found.append(section_name)

        return found


# ======================= PageTypeTracker ====================================

class PageTypeTracker:
    """Track page type distribution per domain for exploration decisions.

    Maintains counts of each PageType seen per domain, and computes
    a completeness score indicating how many high-value page types
    have been found. Useful for deciding when a domain is "fully explored".

    Thread-safe via a lock.

    Usage:
        tracker = PageTypeTracker()
        tracker.update("example.com", PageType.COMPANY_ABOUT)
        dist = tracker.get_distribution("example.com")
        completeness = tracker.get_completeness("example.com")
    """

    # Page types that count toward domain completeness.
    _HIGH_VALUE_TYPES: Set[PageType] = {
        PageType.COMPANY_ABOUT,
        PageType.COMPANY_TEAM,
        PageType.COMPANY_CONTACT,
        PageType.COMPANY_CAREERS,
        PageType.PRODUCT_PAGE,
        PageType.PRICING_PAGE,
    }

    def __init__(self) -> None:
        # domain -> {PageType -> count}
        self._distributions: Dict[str, Dict[PageType, int]] = defaultdict(
            lambda: defaultdict(int)
        )
        self._lock = threading.Lock()

    def update(self, domain: str, page_type: PageType) -> None:
        """Record that a page of the given type was found on a domain.

        Args:
            domain: the domain name (e.g., "example.com").
            page_type: the classified page type.
        """
        with self._lock:
            self._distributions[domain][page_type] += 1

    def get_distribution(self, domain: str) -> Dict[PageType, int]:
        """Return the page type distribution for a domain.

        Args:
            domain: the domain name.

        Returns:
            Dict mapping PageType to count of pages seen.
        """
        with self._lock:
            if domain not in self._distributions:
                return {}
            return dict(self._distributions[domain])

    def get_completeness(self, domain: str) -> float:
        """Compute exploration completeness for a domain (0.0-1.0).

        Completeness = (number of high-value page types found) /
                       (total high-value page types).

        A domain with all 6 high-value page types discovered has
        completeness 1.0. This helps the crawler decide when to
        move on to other domains.

        Args:
            domain: the domain name.

        Returns:
            Float in [0.0, 1.0].
        """
        with self._lock:
            if domain not in self._distributions:
                return 0.0

            domain_types = set(self._distributions[domain].keys())
            found = domain_types & self._HIGH_VALUE_TYPES
            return len(found) / len(self._HIGH_VALUE_TYPES)

    def get_total_pages(self, domain: str) -> int:
        """Return total number of classified pages for a domain.

        Args:
            domain: the domain name.

        Returns:
            Total page count.
        """
        with self._lock:
            if domain not in self._distributions:
                return 0
            return sum(self._distributions[domain].values())

    def get_all_domains(self) -> List[str]:
        """Return all tracked domains."""
        with self._lock:
            return list(self._distributions.keys())

    def get_summary(self) -> Dict[str, Any]:
        """Return a summary of all tracked domains and their completeness.

        Returns:
            Dict with domain_count, total_pages, and per-domain stats.
        """
        with self._lock:
            domains = list(self._distributions.keys())
            total_pages = sum(
                sum(dist.values())
                for dist in self._distributions.values()
            )
            domain_stats = {}
            for domain in domains:
                domain_types = set(self._distributions[domain].keys())
                found_hv = domain_types & self._HIGH_VALUE_TYPES
                domain_stats[domain] = {
                    "pages": sum(self._distributions[domain].values()),
                    "types_found": len(domain_types),
                    "high_value_found": len(found_hv),
                    "completeness": len(found_hv) / len(self._HIGH_VALUE_TYPES),
                }

            return {
                "domain_count": len(domains),
                "total_pages": total_pages,
                "domains": domain_stats,
            }

    def clear(self) -> None:
        """Clear all tracked data."""
        with self._lock:
            self._distributions.clear()

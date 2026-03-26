"""
Content quality scoring, near-duplicate detection, and lead signal extraction
for crawled pages.

Provides:
1. ContentQualityScorer: multi-signal quality scoring (0-1) for PageContent
2. SimHash: 64-bit locality-sensitive hash for near-duplicate detection
3. DuplicateDetector: memory-efficient near-dup store (~8 bytes/URL)
4. LeadSignalDetector: regex-based B2B lead signal extraction

No ML dependencies -- pure Python + numpy + regex.
Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

import numpy as np

from crawler_engine import PageContent

logger = logging.getLogger("crawler_content_quality")


# ======================= Configuration ======================================

@dataclass
class ContentQualityConfig:
    """Tunables for content quality scoring and filtering."""

    # Minimum thresholds
    min_text_length: int = 100
    max_boilerplate_ratio: float = 0.7
    min_content_density: float = 0.3

    # Language filter (ISO 639-1 codes)
    language_filter: List[str] = field(default_factory=lambda: ["en"])

    # Near-duplicate detection
    duplicate_threshold: float = 0.95  # cosine similarity threshold
    simhash_bits: int = 64

    # Quality score weights (must sum to 1.0)
    weight_text_length: float = 0.10
    weight_content_density: float = 0.15
    weight_boilerplate: float = 0.15
    weight_readability: float = 0.10
    weight_link_ratio: float = 0.10
    weight_unique_words: float = 0.10
    weight_structured_data: float = 0.10
    weight_lead_signal: float = 0.20

    # Thresholds for is_worth_processing
    min_overall_quality: float = 0.25
    min_text_length_for_processing: int = 50


# ======================= Quality Result =====================================

@dataclass
class ContentQualityResult:
    """All quality scores for a single page."""

    url: str

    # Individual metrics (0-1)
    text_length_score: float = 0.0
    content_density: float = 0.0
    boilerplate_ratio: float = 0.0
    readability_score: float = 0.0
    link_to_text_ratio: float = 0.0
    unique_word_ratio: float = 0.0
    has_structured_data: float = 0.0
    lead_signal_score: float = 0.0

    # Overall
    overall_quality: float = 0.0

    # Filtering
    filtered: bool = False
    filter_reason: str = ""

    def to_dict(self) -> Dict[str, float]:
        return {
            "url": self.url,
            "text_length_score": round(self.text_length_score, 4),
            "content_density": round(self.content_density, 4),
            "boilerplate_ratio": round(self.boilerplate_ratio, 4),
            "readability_score": round(self.readability_score, 4),
            "link_to_text_ratio": round(self.link_to_text_ratio, 4),
            "unique_word_ratio": round(self.unique_word_ratio, 4),
            "has_structured_data": round(self.has_structured_data, 4),
            "lead_signal_score": round(self.lead_signal_score, 4),
            "overall_quality": round(self.overall_quality, 4),
            "filtered": self.filtered,
            "filter_reason": self.filter_reason,
        }


# ======================= SimHash ============================================

class SimHash:
    """64-bit SimHash for near-duplicate text detection.

    Uses token-level hashing with numpy vectorisation.
    Hamming distance of 3 bits ~= 95% cosine similarity for 64-bit hashes.
    """

    def __init__(self, num_bits: int = 64) -> None:
        self.num_bits = num_bits

    def compute(self, text: str) -> int:
        """Compute a 64-bit SimHash from text.

        Tokenises on whitespace, hashes each token, and accumulates
        a weighted bit-vector that is collapsed to a single integer.

        Args:
            text: input text string.

        Returns:
            64-bit integer hash.
        """
        tokens = text.lower().split()
        if not tokens:
            return 0

        # Accumulator: +1 for set bits, -1 for unset bits
        v = np.zeros(self.num_bits, dtype=np.int64)

        for token in tokens:
            h = self._token_hash(token)
            for i in range(self.num_bits):
                if h & (1 << i):
                    v[i] += 1
                else:
                    v[i] -= 1

        # Collapse to integer: set bit if accumulator > 0
        fingerprint = 0
        for i in range(self.num_bits):
            if v[i] > 0:
                fingerprint |= (1 << i)

        return fingerprint

    @staticmethod
    def hamming_distance(hash1: int, hash2: int) -> int:
        """Count differing bits between two hashes."""
        xor = hash1 ^ hash2
        # Brian Kernighan bit count
        distance = 0
        while xor:
            xor &= xor - 1
            distance += 1
        return distance

    @staticmethod
    def is_near_duplicate(
        hash1: int, hash2: int, threshold: int = 3
    ) -> bool:
        """Two hashes are near-duplicates if hamming distance <= threshold.

        Default threshold=3 corresponds to ~95% cosine similarity for
        64-bit SimHash.
        """
        return SimHash.hamming_distance(hash1, hash2) <= threshold

    @staticmethod
    def _token_hash(token: str) -> int:
        """Deterministic 64-bit hash for a single token.

        Uses FNV-1a variant for speed and distribution.
        """
        h = 0xCBF29CE484222325  # FNV offset basis (64-bit)
        for byte in token.encode("utf-8"):
            h ^= byte
            h = (h * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF  # FNV prime, 64-bit mask
        return h


# ======================= Duplicate Detector =================================

class DuplicateDetector:
    """Memory-efficient near-duplicate store using SimHash.

    Stores one 64-bit integer per URL (~8 bytes). For 1M pages this is
    ~8 MB of memory -- trivial on M1 16GB.

    Uses a dict mapping URL -> simhash for O(1) lookup by URL, and a
    list of (simhash, url) for linear scan during duplicate checking.
    The linear scan is acceptable because SimHash comparison is a single
    XOR + popcount, and in practice the set is checked at crawl-time
    (~10 pages/sec).
    """

    def __init__(
        self,
        config: Optional[ContentQualityConfig] = None,
    ) -> None:
        self.config = config or ContentQualityConfig()
        self._hasher = SimHash(num_bits=self.config.simhash_bits)
        # Bit-packed storage: numpy array of uint64 + parallel URL list
        self._hashes: List[int] = []
        self._urls: List[str] = []
        self._url_set: Set[str] = set()  # fast exact-URL dedup

    @property
    def size(self) -> int:
        """Number of stored pages."""
        return len(self._hashes)

    @property
    def memory_bytes(self) -> int:
        """Approximate memory usage in bytes."""
        # 8 bytes per hash + ~64 bytes avg per URL string + set overhead
        return len(self._hashes) * 8 + len(self._urls) * 64

    def add(self, url: str, text: str) -> bool:
        """Add a page to the store. Returns True if the page is unique.

        If a near-duplicate is found, the page is NOT added and False
        is returned.

        Args:
            url: page URL.
            text: page body text.

        Returns:
            True if unique (was added), False if near-duplicate detected.
        """
        # Exact URL dedup
        if url in self._url_set:
            return False

        h = self._hasher.compute(text)
        dup_url = self._find_duplicate(h)
        if dup_url is not None:
            logger.debug(
                "Near-duplicate: %s ~= %s (simhash distance <= %d)",
                url,
                dup_url,
                3,
            )
            return False

        self._hashes.append(h)
        self._urls.append(url)
        self._url_set.add(url)
        return True

    def is_duplicate(self, text: str) -> Optional[str]:
        """Check if text is a near-duplicate of any stored page.

        Args:
            text: page body text to check.

        Returns:
            URL of the duplicate page if found, None otherwise.
        """
        h = self._hasher.compute(text)
        return self._find_duplicate(h)

    def _find_duplicate(self, h: int) -> Optional[str]:
        """Scan stored hashes for a near-duplicate.

        Uses hamming distance threshold of 3 bits (default for 64-bit
        SimHash ~= 95% cosine similarity).
        """
        # Hamming distance threshold: 3 bits for 64-bit hash
        threshold = 3
        for i, stored_h in enumerate(self._hashes):
            if SimHash.hamming_distance(h, stored_h) <= threshold:
                return self._urls[i]
        return None

    def clear(self) -> None:
        """Release all stored hashes."""
        self._hashes.clear()
        self._urls.clear()
        self._url_set.clear()


# ======================= Lead Signal Detector ===============================

# Pre-compiled regex patterns for B2B lead signals
_EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
)
_PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}",
)
_ADDRESS_PATTERN = re.compile(
    r"\d{1,5}\s+\w+\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd|"
    r"drive|dr|lane|ln|way|court|ct|place|pl)",
    re.IGNORECASE,
)

# URL path signals
_CONTACT_PATH = re.compile(r"/contact", re.IGNORECASE)
_ABOUT_PATH = re.compile(r"/about", re.IGNORECASE)
_TEAM_PATH = re.compile(r"/team|/people|/staff|/leadership", re.IGNORECASE)
_CAREERS_PATH = re.compile(r"/career|/jobs|/hiring|/openings|/vacancies", re.IGNORECASE)
_PRICING_PATH = re.compile(r"/pricing|/plans|/packages", re.IGNORECASE)
_PRODUCT_PATH = re.compile(r"/product|/solution|/service|/platform", re.IGNORECASE)

# Content text signals
_HIRING_SIGNAL = re.compile(
    r"(?:we(?:'re|.are)\s+hiring|join\s+(?:our|the)\s+team|open\s+positions?"
    r"|career\s+opportunities|work\s+with\s+us|view\s+(?:all\s+)?(?:open\s+)?jobs)",
    re.IGNORECASE,
)
_CONTACT_SIGNAL = re.compile(
    r"(?:contact\s+us|get\s+in\s+touch|reach\s+(?:out|us)|send\s+(?:us\s+)?a\s+message"
    r"|request\s+a?\s*(?:demo|quote|consultation))",
    re.IGNORECASE,
)
_TESTIMONIAL_SIGNAL = re.compile(
    r"(?:testimonial|customer\s+(?:stories|reviews)|case\s+stud(?:y|ies)"
    r"|what\s+(?:our\s+)?(?:clients?|customers?)\s+say|trusted\s+by|used\s+by)",
    re.IGNORECASE,
)
_SOCIAL_PROOF_SIGNAL = re.compile(
    r"(?:our\s+clients?|our\s+customers?|partner(?:s|ed)\s+with"
    r"|client\s+logos?|featured\s+in|as\s+seen\s+(?:in|on))",
    re.IGNORECASE,
)
_PRICING_SIGNAL = re.compile(
    r"(?:pricing|per\s+month|/mo\b|per\s+year|/yr\b|free\s+trial"
    r"|start(?:ing)?\s+(?:at|from)\s+\$|\$\d+)",
    re.IGNORECASE,
)
_PRODUCT_SIGNAL = re.compile(
    r"(?:our\s+(?:product|platform|solution)|key\s+features?"
    r"|how\s+it\s+works|built\s+for|designed\s+for)",
    re.IGNORECASE,
)


class LeadSignalDetector:
    """Regex-based detection of B2B lead signals on crawled pages.

    Detects:
    - Page type: contact, about/team, careers, pricing, product
    - Contact info: email, phone, physical address
    - Social proof: testimonials, case studies, client logos
    - Hiring signals: open positions, join our team

    All detection is pure regex -- no ML, no network calls.
    """

    # Signal weights for lead_probability calculation
    _SIGNAL_WEIGHTS: Dict[str, float] = {
        "has_email": 0.15,
        "has_phone": 0.10,
        "has_address": 0.05,
        "is_contact_page": 0.15,
        "is_about_page": 0.05,
        "is_team_page": 0.08,
        "is_careers_page": 0.10,
        "is_pricing_page": 0.08,
        "is_product_page": 0.04,
        "has_hiring_signal": 0.08,
        "has_contact_signal": 0.05,
        "has_testimonials": 0.03,
        "has_social_proof": 0.03,
        "has_pricing_signal": 0.04,
        "has_product_signal": 0.02,
    }

    def detect(self, page: PageContent) -> Dict[str, bool]:
        """Detect all lead signals on a page.

        Args:
            page: crawled page content.

        Returns:
            Dict mapping signal name to bool (True if detected).
        """
        text = page.body_text
        url = page.url
        title = page.title.lower()

        # Combine text sources for broader matching
        full_text = f"{title} {page.meta_description} {text}"

        signals: Dict[str, bool] = {
            # Contact info
            "has_email": bool(_EMAIL_PATTERN.search(full_text)),
            "has_phone": bool(_PHONE_PATTERN.search(full_text)),
            "has_address": bool(_ADDRESS_PATTERN.search(full_text)),
            # Page type (URL-based)
            "is_contact_page": bool(_CONTACT_PATH.search(url)),
            "is_about_page": bool(_ABOUT_PATH.search(url)),
            "is_team_page": bool(_TEAM_PATH.search(url)),
            "is_careers_page": bool(_CAREERS_PATH.search(url)),
            "is_pricing_page": bool(_PRICING_PATH.search(url)),
            "is_product_page": bool(_PRODUCT_PATH.search(url)),
            # Content signals
            "has_hiring_signal": bool(_HIRING_SIGNAL.search(full_text)),
            "has_contact_signal": bool(_CONTACT_SIGNAL.search(full_text)),
            "has_testimonials": bool(_TESTIMONIAL_SIGNAL.search(full_text)),
            "has_social_proof": bool(_SOCIAL_PROOF_SIGNAL.search(full_text)),
            "has_pricing_signal": bool(_PRICING_SIGNAL.search(full_text)),
            "has_product_signal": bool(_PRODUCT_SIGNAL.search(full_text)),
        }

        return signals

    def lead_probability(self, signals: Dict[str, bool]) -> float:
        """Estimate lead probability from detected signals.

        Uses a weighted sum of signal presence. Returns 0-1.

        Args:
            signals: output from detect().

        Returns:
            Float in [0.0, 1.0].
        """
        total_weight = sum(self._SIGNAL_WEIGHTS.values())
        score = sum(
            self._SIGNAL_WEIGHTS.get(name, 0.0)
            for name, present in signals.items()
            if present
        )
        return min(score / total_weight, 1.0) if total_weight > 0 else 0.0


# ======================= Content Quality Scorer =============================

# Boilerplate indicator patterns (nav menus, cookie banners, footers)
_BOILERPLATE_PATTERNS = re.compile(
    r"(?:skip\s+to\s+(?:main\s+)?content|cookie\s+(?:policy|consent|settings)"
    r"|accept\s+(?:all\s+)?cookies|privacy\s+policy|terms\s+(?:of\s+)?(?:service|use)"
    r"|all\s+rights\s+reserved|copyright\s+\xa9?\s*\d{4}"
    r"|follow\s+us\s+on|share\s+(?:on|this)"
    r"|sign\s+up\s+for\s+(?:our\s+)?newsletter"
    r"|subscribe\s+(?:to\s+)?(?:our\s+)?(?:newsletter|updates)"
    r"|back\s+to\s+top|toggle\s+navigation|menu|breadcrumb)",
    re.IGNORECASE,
)

# Sentence-ending punctuation for Flesch-Kincaid
_SENTENCE_ENDER = re.compile(r"[.!?]+")
# Vowel groups for syllable approximation
_VOWEL_GROUP = re.compile(r"[aeiouy]+", re.IGNORECASE)


class ContentQualityScorer:
    """Multi-signal quality scoring for crawled pages.

    Computes individual metrics and a weighted overall score (0-1).
    Designed for pre-embedding filtering: cheap to compute, no ML deps.

    Metrics:
    - text_length_score: body text length relative to threshold
    - content_density: text_length / estimated_html_length
    - boilerplate_ratio: boilerplate text fraction
    - readability_score: Flesch-Kincaid approximation
    - link_to_text_ratio: links per character (high = link farm)
    - unique_word_ratio: vocabulary richness
    - has_structured_data: contact info detection
    - lead_signal_score: B2B lead signal detection
    """

    def __init__(
        self,
        config: Optional[ContentQualityConfig] = None,
    ) -> None:
        self.config = config or ContentQualityConfig()
        self._lead_detector = LeadSignalDetector()

    def score(self, page: PageContent) -> ContentQualityResult:
        """Score a page on all quality dimensions.

        Args:
            page: crawled page content.

        Returns:
            ContentQualityResult with all metrics and overall score.
        """
        result = ContentQualityResult(url=page.url)
        text = page.body_text

        # ---- Quick reject ---------------------------------------------------
        if len(text) < self.config.min_text_length_for_processing:
            result.filtered = True
            result.filter_reason = (
                f"text too short ({len(text)} < "
                f"{self.config.min_text_length_for_processing})"
            )
            return result

        # ---- Individual metrics ---------------------------------------------
        result.text_length_score = self._score_text_length(text)
        result.content_density = self._score_content_density(page)
        result.boilerplate_ratio = self._score_boilerplate(text)
        result.readability_score = self._score_readability(text)
        result.link_to_text_ratio = self._score_link_ratio(page)
        result.unique_word_ratio = self._score_unique_words(text)
        result.has_structured_data = self._score_structured_data(page)

        # Lead signal scoring
        signals = self._lead_detector.detect(page)
        result.lead_signal_score = self._lead_detector.lead_probability(signals)

        # ---- Weighted overall -----------------------------------------------
        cfg = self.config
        result.overall_quality = (
            cfg.weight_text_length * result.text_length_score
            + cfg.weight_content_density * result.content_density
            + cfg.weight_boilerplate * (1.0 - result.boilerplate_ratio)
            + cfg.weight_readability * result.readability_score
            + cfg.weight_link_ratio * (1.0 - result.link_to_text_ratio)
            + cfg.weight_unique_words * result.unique_word_ratio
            + cfg.weight_structured_data * result.has_structured_data
            + cfg.weight_lead_signal * result.lead_signal_score
        )
        result.overall_quality = max(0.0, min(1.0, result.overall_quality))

        # ---- Filter decision ------------------------------------------------
        if result.overall_quality < cfg.min_overall_quality:
            result.filtered = True
            result.filter_reason = (
                f"low quality ({result.overall_quality:.3f} < "
                f"{cfg.min_overall_quality})"
            )
        elif result.boilerplate_ratio > cfg.max_boilerplate_ratio:
            result.filtered = True
            result.filter_reason = (
                f"high boilerplate ({result.boilerplate_ratio:.3f} > "
                f"{cfg.max_boilerplate_ratio})"
            )
        elif result.content_density < cfg.min_content_density:
            result.filtered = True
            result.filter_reason = (
                f"low content density ({result.content_density:.3f} < "
                f"{cfg.min_content_density})"
            )

        return result

    def is_worth_processing(self, page: PageContent) -> bool:
        """Quick filter before full embedding. Cheap heuristic check.

        Args:
            page: crawled page content.

        Returns:
            True if the page is worth running through the full pipeline.
        """
        text = page.body_text

        # Minimum text length
        if len(text) < self.config.min_text_length:
            return False

        # Language filter (if language is detected)
        if page.language and self.config.language_filter:
            lang_code = page.language.lower()[:2]
            if lang_code not in self.config.language_filter:
                return False

        # Quick content density check (text vs body_length)
        if page.body_length > 0:
            density = len(text) / page.body_length
            if density < self.config.min_content_density * 0.5:
                return False

        # Extreme link-to-text ratio (link farm detector)
        if page.link_count > 0 and len(text) > 0:
            ratio = page.link_count / (len(text) / 100.0)
            if ratio > 5.0:  # > 5 links per 100 chars
                return False

        return True

    # ---- Individual metric scorers -----------------------------------------

    @staticmethod
    def _score_text_length(text: str) -> float:
        """Score text length on a 0-1 scale.

        Uses a sigmoid-like curve: 0 at 0 chars, 0.5 at 500 chars,
        ~1.0 at 2000+ chars.
        """
        length = len(text)
        if length <= 0:
            return 0.0
        # Sigmoid: 1 / (1 + exp(-k*(x - midpoint)))
        # k=0.005, midpoint=500 gives nice curve
        score = 1.0 / (1.0 + np.exp(-0.005 * (length - 500)))
        return float(score)

    @staticmethod
    def _score_content_density(page: PageContent) -> float:
        """Ratio of visible text to estimated total page size.

        body_length from PageContent is the full extracted text length
        (before truncation). We use body_length as a proxy for total
        content size. High density = mostly text, low density = mostly
        HTML/JS/CSS boilerplate.
        """
        text_len = len(page.body_text)
        # Estimate HTML length as ~3x body text (typical ratio)
        # Use body_length as the raw text length before truncation
        total_estimate = max(page.body_length * 3, text_len + 1)
        density = text_len / total_estimate
        # Clamp and normalise to 0-1
        return min(density * 3.0, 1.0)

    @staticmethod
    def _score_boilerplate(text: str) -> float:
        """Estimate fraction of text that is boilerplate (0-1).

        Counts matches of boilerplate indicator patterns relative to
        total text length. Higher = more boilerplate.
        """
        if not text:
            return 1.0

        matches = _BOILERPLATE_PATTERNS.findall(text)
        boilerplate_chars = sum(len(m) for m in matches)
        ratio = boilerplate_chars / len(text)
        return min(ratio * 10.0, 1.0)  # amplify since patterns are sparse

    @staticmethod
    def _score_readability(text: str) -> float:
        """Simplified Flesch-Kincaid readability score normalised to 0-1.

        Higher score = more readable (simpler text).
        FK formula: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
        Normalised: FK_score / 100, clamped to [0, 1].
        """
        words = text.split()
        if len(words) < 10:
            return 0.5  # not enough text to assess

        # Count sentences
        sentences = _SENTENCE_ENDER.split(text)
        sentence_count = max(len([s for s in sentences if s.strip()]), 1)

        # Approximate syllable count
        syllable_count = 0
        for word in words:
            vowel_groups = _VOWEL_GROUP.findall(word)
            syllable_count += max(len(vowel_groups), 1)

        word_count = len(words)
        avg_sentence_length = word_count / sentence_count
        avg_syllables_per_word = syllable_count / word_count

        fk_score = (
            206.835
            - 1.015 * avg_sentence_length
            - 84.6 * avg_syllables_per_word
        )

        # Normalise to 0-1 (FK ranges roughly 0-100 for normal text)
        normalised = max(0.0, min(fk_score / 100.0, 1.0))
        return normalised

    @staticmethod
    def _score_link_ratio(page: PageContent) -> float:
        """Ratio of links to text length, normalised to 0-1.

        High ratio indicates navigation pages or link farms.
        """
        text_len = len(page.body_text)
        if text_len == 0:
            return 1.0  # no text = all links
        if page.link_count == 0:
            return 0.0

        # Links per 100 characters
        ratio = page.link_count / (text_len / 100.0)
        # Normalise: 0 links/100chars = 0.0, 3+ links/100chars = 1.0
        return min(ratio / 3.0, 1.0)

    @staticmethod
    def _score_unique_words(text: str) -> float:
        """Vocabulary richness: unique words / total words.

        Low ratio suggests repetitive or auto-generated content.
        """
        words = text.lower().split()
        if len(words) < 5:
            return 0.0
        unique = len(set(words))
        ratio = unique / len(words)
        # Typical web content: 0.3-0.7 unique ratio
        # Normalise so 0.5 maps to ~0.7 score
        return min(ratio * 1.4, 1.0)

    @staticmethod
    def _score_structured_data(page: PageContent) -> float:
        """Detect structured contact information patterns.

        Checks for email, phone, and address patterns in the page text.
        Returns 0-1 based on how many types are found.
        """
        text = f"{page.title} {page.meta_description} {page.body_text}"

        found = 0.0
        total = 3.0

        if _EMAIL_PATTERN.search(text):
            found += 1.0
        if _PHONE_PATTERN.search(text):
            found += 1.0
        if _ADDRESS_PATTERN.search(text):
            found += 1.0

        return found / total

"""Async link checker — extract, classify, and validate HTTP(S) references in markdown.

Two levels of analysis:
  - Link check: is the URL reachable? (HTTP status, timeouts, redirects)
  - Reference quality: anchor text descriptiveness, domain authority, citation density

Entry points:
  check_references(content)   → ReferenceReport (full quality analysis + link check)
  check_links(urls)           → list[LinkResult]  (raw HTTP checks only)
  check_content_links(content)→ list[LinkResult]  (backwards-compat shim)
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)

# ── URL extraction ────────────────────────────────────────────────────────────

_URL_RE = re.compile(r"https?://[^\s\)\"'>\]]+")

# Inline citation: [anchor text](url) — negative lookbehind excludes image links ![...](...)
_INLINE_REF_RE = re.compile(r"(?<!!)\[([^\[\]]+)\]\((https?://[^\s\)\"'>\]]+)\)")


def extract_urls(markdown: str) -> list[str]:
    """Return unique HTTP(S) URLs found in markdown, in order of appearance."""
    seen: set[str] = set()
    result: list[str] = []
    for raw in _URL_RE.findall(markdown):
        url = raw.rstrip(".,;:!?)")
        if url not in seen:
            seen.add(url)
            result.append(url)
    return result


def extract_inline_refs(markdown: str) -> list[tuple[str, str]]:
    """Return unique (anchor_text, url) pairs from [text](url) patterns.

    Excludes image links ![alt](url).
    """
    seen_urls: set[str] = set()
    result: list[tuple[str, str]] = []
    for anchor, url in _INLINE_REF_RE.findall(markdown):
        url = url.rstrip(".,;:!?)")
        if url not in seen_urls:
            seen_urls.add(url)
            result.append((anchor.strip(), url))
    return result


def find_bare_urls(markdown: str) -> list[str]:
    """URLs in text that are NOT wrapped in [anchor](url) inline-citation format."""
    all_urls = extract_urls(markdown)
    inline_urls = {url for _, url in extract_inline_refs(markdown)}
    return [u for u in all_urls if u not in inline_urls]


# ── Domain classification ─────────────────────────────────────────────────────

# Tier 1: primary sources — academic, official documentation, canonical references
_AUTHORITATIVE_DOMAINS: frozenset[str] = frozenset({
    # Academic / peer-reviewed
    "nber.org", "arxiv.org", "nature.com", "science.org", "sciencemag.org",
    "pubmed.ncbi.nlm.nih.gov", "ncbi.nlm.nih.gov", "doi.org",
    "acm.org", "ieee.org", "springer.com", "wiley.com", "jstor.org", "ssrn.com",
    "biorxiv.org", "medrxiv.org", "semanticscholar.org",
    # University research
    "mit.edu", "stanford.edu", "harvard.edu", "berkeley.edu", "cmu.edu",
    "ox.ac.uk", "cam.ac.uk", "yale.edu", "princeton.edu",
    # Official tech documentation
    "github.com", "docs.python.org", "developer.mozilla.org", "w3.org",
    "ietf.org", "rfc-editor.org", "tc39.es",
    # Major AI / research labs
    "openai.com", "anthropic.com", "deepmind.com", "research.google",
    "ai.meta.com", "research.microsoft.com",
    # Authoritative industry reports
    "hbr.org", "about.gitlab.com",
})

# Tier 2: credible industry sources — reputable but not primary research
_CREDIBLE_DOMAINS: frozenset[str] = frozenset({
    "stackoverflow.com", "stackoverflow.blog",
    "techcrunch.com", "wired.com", "arstechnica.com", "zdnet.com", "infoq.com",
    "mckinsey.com", "deloitte.com", "gartner.com", "forrester.com", "idc.com",
    "medium.com", "towardsdatascience.com", "thenewstack.io",
    "martinfowler.com", "12factor.net",
    "python.org", "rust-lang.org", "golang.org", "nodejs.org",
    "kubernetes.io", "docker.com", "terraform.io",
    "aws.amazon.com", "cloud.google.com", "azure.microsoft.com",
    "vercel.com", "cloudflare.com", "netlify.com",
})

# Domains that routinely block bots — treat non-5xx as passing
_LENIENT_DOMAINS: frozenset[str] = frozenset({
    "twitter.com", "x.com", "linkedin.com", "facebook.com",
    "instagram.com", "arxiv.org", "doi.org", "researchgate.net",
    "acm.org", "ieee.org", "springer.com", "nature.com",
    "jstor.org", "wiley.com",
})


def _domain_tier(url: str) -> str:
    """Classify a URL's domain: 'authoritative' | 'credible' | 'generic'."""
    try:
        host = httpx.URL(url).host.lstrip("www.")
    except Exception:
        return "generic"
    if any(host == d or host.endswith("." + d) for d in _AUTHORITATIVE_DOMAINS):
        return "authoritative"
    if any(host == d or host.endswith("." + d) for d in _CREDIBLE_DOMAINS):
        return "credible"
    return "generic"


# ── Anchor text quality ───────────────────────────────────────────────────────

_WEAK_ANCHOR_TERMS: frozenset[str] = frozenset({
    "here", "this", "link", "click", "click here", "source", "read more",
    "more", "article", "post", "page", "website", "url", "visit",
    "see here", "this article", "this post", "this link", "this page",
    "learn more", "full article", "read the full", "reference",
    "ref", "via", "check", "view", "open", "follow",
})


def _anchor_quality(anchor: str) -> str:
    """'good' | 'weak' based on how descriptive the anchor text is."""
    clean = anchor.strip().lower()
    # Short single-word anchors or common filler phrases are weak
    if not clean or clean in _WEAK_ANCHOR_TERMS or len(clean) <= 4:
        return "weak"
    # Anchors that are just a number or year are weak
    if re.fullmatch(r"[\d\s\-–—]+", clean):
        return "weak"
    # Anchors that are the URL itself are weak (no descriptive text)
    if clean.startswith("http://") or clean.startswith("https://"):
        return "weak"
    return "good"


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class LinkResult:
    url: str
    status: int | None = None       # HTTP status; None on network error
    ok: bool = False
    redirect_url: str | None = None
    error: str | None = None


@dataclass
class ReferenceResult:
    anchor: str
    url: str
    anchor_quality: str             # "good" | "weak"
    domain_tier: str                # "authoritative" | "credible" | "generic"
    link: LinkResult | None = None  # populated after HTTP check


@dataclass
class ReferenceReport:
    refs: list[ReferenceResult] = field(default_factory=list)
    bare_urls: list[str] = field(default_factory=list)
    word_count: int = 0

    @property
    def total(self) -> int:
        return len(self.refs)

    @property
    def broken(self) -> list[ReferenceResult]:
        return [r for r in self.refs if r.link and not r.link.ok]

    @property
    def weak_anchors(self) -> list[ReferenceResult]:
        return [r for r in self.refs if r.anchor_quality == "weak"]

    @property
    def authoritative(self) -> list[ReferenceResult]:
        return [r for r in self.refs if r.domain_tier == "authoritative"]

    @property
    def credible(self) -> list[ReferenceResult]:
        return [r for r in self.refs if r.domain_tier in ("authoritative", "credible")]

    @property
    def score(self) -> float:
        """Reference quality score 0.0–1.0."""
        if self.total == 0:
            return 0.0
        broken_pen   = len(self.broken) / self.total
        weak_pen     = len(self.weak_anchors) / self.total * 0.4
        auth_bonus   = len(self.authoritative) / self.total * 0.3
        count_score  = min(1.0, self.total / 5) * 0.4
        return max(0.0, min(1.0, (1.0 - broken_pen - weak_pen + auth_bonus) * 0.6 + count_score))

    @property
    def issues(self) -> list[str]:
        """Structured issues list for inclusion in editor prompts and reports."""
        issues: list[str] = []

        if self.total == 0:
            issues.append(
                "no_inline_refs: article has zero [anchor](url) citations — "
                "every factual claim must link to its source"
            )
        elif self.total < 3:
            issues.append(
                f"few_refs: only {self.total} inline citation(s) — target ≥3 for a credible article"
            )

        if self.broken:
            urls = [r.url for r in self.broken]
            issues.append(f"broken_links({len(self.broken)}): {urls}")

        if self.bare_urls:
            issues.append(
                f"bare_urls({len(self.bare_urls)}): "
                "these URLs are not wrapped in [anchor text](url) format — "
                f"rewrite as inline citations: {self.bare_urls[:3]}"
            )

        # Flag weak anchors only if they're a majority
        if self.weak_anchors and len(self.weak_anchors) > max(1, self.total // 3):
            anchors = [r.anchor for r in self.weak_anchors]
            issues.append(
                f"weak_anchors({len(self.weak_anchors)}/{self.total}): "
                f"non-descriptive anchor text {anchors} — "
                "use '[Author/Org Year descriptor](url)' format instead of 'here', 'this', etc."
            )

        # Flag low authoritative source ratio if we have enough refs to judge
        if self.total >= 3 and not self.authoritative:
            issues.append(
                "no_authoritative_sources: zero citations to academic/official sources — "
                "add references from peer-reviewed research, official docs, or primary reports"
            )

        # Flag sparse citations in longer articles (complements few_refs for articles that have
        # "enough" refs absolutely but not relative to their length)
        if self.word_count >= 800 and self.total >= 3:
            target = self.word_count // 300  # 1 citation per 300 words
            if self.total < target:
                issues.append(
                    f"citation_density: {self.total} ref(s) for {self.word_count} words "
                    f"(target ≥{target}; aim for 1 citation per 300 words)"
                )

        return issues


# ── HTTP checker ──────────────────────────────────────────────────────────────

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; vadim.blog link-checker/1.0; "
        "+https://vadim.blog)"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*",
}


async def _check_one(client: httpx.AsyncClient, url: str) -> LinkResult:
    """HEAD → GET fallback, lenient on bot-blocking domains, retries on 429."""
    try:
        host = httpx.URL(url).host.lstrip("www.")
    except Exception:
        return LinkResult(url=url, ok=False, error="invalid_url")

    lenient = any(host == d or host.endswith("." + d) for d in _LENIENT_DOMAINS)

    for attempt in range(2):
        try:
            resp = await client.head(url, follow_redirects=True, headers=_HEADERS)

            if resp.status_code == 429:
                wait = min(int(resp.headers.get("Retry-After", "3")), 5)
                logger.debug("Rate limited on %s, waiting %ds", url, wait)
                await asyncio.sleep(wait)
                continue

            # Some servers reject HEAD — retry with GET
            if resp.status_code in (400, 403, 405) and not lenient:
                resp = await client.get(url, follow_redirects=True, headers=_HEADERS)

            redirect_url = str(resp.url) if str(resp.url) != url else None
            ok = resp.status_code < 400 or (lenient and resp.status_code < 500)
            return LinkResult(
                url=url,
                status=resp.status_code,
                ok=ok,
                redirect_url=redirect_url,
            )

        except httpx.TimeoutException:
            return LinkResult(url=url, ok=lenient, error="timeout")
        except httpx.ConnectError as exc:
            return LinkResult(url=url, ok=False, error=f"connect_error: {exc}")
        except Exception as exc:  # noqa: BLE001
            return LinkResult(url=url, ok=False, error=str(exc))

    return LinkResult(url=url, ok=False, error="rate_limited_after_retry")


async def check_links(
    urls: list[str],
    timeout: float = 15.0,
    concurrency: int = 8,
) -> list[LinkResult]:
    """Check *urls* concurrently. Results are returned in input order."""
    if not urls:
        return []

    limits = httpx.Limits(max_connections=concurrency, max_keepalive_connections=concurrency)
    async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
        sem = asyncio.Semaphore(concurrency)

        async def bounded(url: str) -> LinkResult:
            async with sem:
                return await _check_one(client, url)

        return list(await asyncio.gather(*[bounded(u) for u in urls]))


# ── Reference analysis ────────────────────────────────────────────────────────

async def check_references(
    content: str,
    timeout: float = 15.0,
    concurrency: int = 8,
) -> ReferenceReport:
    """Full reference quality analysis: extract inline citations, classify, and check links.

    Returns a ReferenceReport with anchor quality, domain tier, and HTTP status
    for every [anchor](url) citation in the content.
    """
    inline = extract_inline_refs(content)
    bare = find_bare_urls(content)
    wc = len(content.split())

    if not inline:
        return ReferenceReport(refs=[], bare_urls=bare, word_count=wc)

    urls = [url for _, url in inline]
    link_results = await check_links(urls, timeout=timeout, concurrency=concurrency)
    link_map = {r.url: r for r in link_results}

    refs = [
        ReferenceResult(
            anchor=anchor,
            url=url,
            anchor_quality=_anchor_quality(anchor),
            domain_tier=_domain_tier(url),
            link=link_map.get(url),
        )
        for anchor, url in inline
    ]

    broken = [r for r in refs if r.link and not r.link.ok]
    if broken:
        logger.warning(
            "Broken links (%d/%d): %s",
            len(broken), len(refs),
            [r.url for r in broken],
        )
    else:
        logger.info("All %d link(s) OK (score=%.2f)", len(refs), ReferenceReport(refs=refs, bare_urls=bare, word_count=wc).score)

    return ReferenceReport(refs=refs, bare_urls=bare, word_count=wc)


# ── Report formatting ─────────────────────────────────────────────────────────

_TIER_ICON = {"authoritative": "🔬", "credible": "📰", "generic": "🌐"}
_QUALITY_ICON = {"good": "✓", "weak": "⚠"}


def format_reference_report(report: ReferenceReport) -> str:
    """Render a full reference quality report as markdown."""
    broken_count = len(report.broken)
    weak_count = len(report.weak_anchors)
    auth_count = len(report.authoritative)

    lines = [
        f"## Reference Quality  —  score {report.score:.2f}",
        "",
        f"| Total | Broken | Weak anchors | Authoritative | Credible+ | Bare URLs |",
        f"|-------|--------|--------------|---------------|-----------|-----------|",
        f"| {report.total} | {broken_count} | {weak_count} | {auth_count} "
        f"| {len(report.credible)} | {len(report.bare_urls)} |",
        "",
    ]

    if report.issues:
        lines += ["### Issues", ""]
        for issue in report.issues:
            lines.append(f"- ❌ {issue}")
        lines.append("")

    if report.refs:
        lines += ["### Inline Citations", ""]
        lines += [
            "| Q | Domain | Status | Anchor | URL |",
            "|---|--------|--------|--------|-----|",
        ]
        for r in report.refs:
            q_icon = _QUALITY_ICON.get(r.anchor_quality, "?")
            d_icon = _TIER_ICON.get(r.domain_tier, "❓")
            if r.link:
                st = "✅" if r.link.ok else f"❌ {r.link.status or r.link.error}"
            else:
                st = "—"
            anchor = (r.anchor[:48] + "…") if len(r.anchor) > 48 else r.anchor
            url = (r.url[:55] + "…") if len(r.url) > 55 else r.url
            lines.append(f"| {q_icon} | {d_icon} | {st} | {anchor} | {url} |")
        lines.append("")

    if report.bare_urls:
        lines += ["### Bare URLs (wrap in [anchor text](url))", ""]
        for url in report.bare_urls:
            lines.append(f"- {url}")
        lines.append("")

    ok_count = sum(1 for r in report.refs if r.link and r.link.ok)
    lines.append(f"**{ok_count}/{report.total} links reachable**")

    return "\n".join(lines) + "\n"


def format_report(results: list[LinkResult]) -> str:
    """Backwards-compat: render raw link-check results as a markdown table."""
    if not results:
        return "_No links found._\n"

    lines = [
        "| Status | URL | Note |",
        "|--------|-----|------|",
    ]
    for r in sorted(results, key=lambda x: (x.ok, x.url)):
        icon = "✅" if r.ok else "❌"
        status = str(r.status) if r.status is not None else "—"
        note = r.error or (f"→ {r.redirect_url}" if r.redirect_url else "")
        lines.append(f"| {icon} {status} | {r.url} | {note} |")

    ok_count = sum(1 for r in results if r.ok)
    lines.append(f"\n**{ok_count}/{len(results)} links OK**")
    return "\n".join(lines) + "\n"


async def check_content_links(
    content: str,
    timeout: float = 15.0,
    concurrency: int = 8,
) -> list[LinkResult]:
    """Backwards-compat: extract all URLs and check them. Use check_references for full analysis."""
    urls = extract_urls(content)
    if not urls:
        logger.debug("No URLs found in content")
        return []

    logger.info("Checking %d link(s)…", len(urls))
    results = await check_links(urls, timeout=timeout, concurrency=concurrency)

    broken = [r for r in results if not r.ok]
    if broken:
        logger.warning(
            "Broken links (%d/%d): %s",
            len(broken), len(results),
            [r.url for r in broken],
        )
    else:
        logger.info("All %d link(s) OK", len(results))

    return results

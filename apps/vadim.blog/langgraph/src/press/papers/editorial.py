"""Editorial source search — curated tech publications.

Searches top-tier editorial tech publications for articles relevant
to a given topic.  Returns ResearchPaper objects that integrate with
the existing paper dedup/rank/digest pipeline.

Sources:
  InfoQ               — Software architecture & engineering practices (RSS)
  The New Stack       — Cloud native, DevOps, AI/ML (WordPress REST API)
  Towards Data Science — ML/AI & data engineering (RSS)

No API keys required.
"""

from __future__ import annotations

import asyncio
import logging
import re
import xml.etree.ElementTree as ET

import httpx

from press.papers import PaperSource, ResearchPaper, retry_async

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; vadim.blog editorial-search/1.0)",
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
}

_STOP_WORDS = frozenset({
    "the", "a", "an", "in", "on", "at", "to", "for", "of", "with", "by",
    "from", "is", "are", "was", "were", "be", "been", "as", "that", "this",
    "it", "its", "how", "what", "why", "when", "where", "and", "or", "but",
    "not", "your", "our", "their", "my", "do", "does", "s",
})


# ── Utilities ────────────────────────────────────────────────────────────────


def _extract_keywords(query: str) -> list[str]:
    """Extract meaningful search keywords from a topic string."""
    words = re.findall(r"[a-zA-Z]+", query.lower())
    return [w for w in words if w not in _STOP_WORDS and len(w) > 2]


def _keyword_score(text: str, keywords: list[str]) -> int:
    """Count how many keywords appear in the text."""
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw in text_lower)


def _strip_html(html: str) -> str:
    """Strip HTML tags and decode common entities."""
    text = re.sub(r"<[^>]+>", " ", html)
    for entity, char in [
        ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&nbsp;", " "), ("&#39;", "'"), ("&quot;", '"'),
        ("&#8217;", "\u2019"), ("&#8220;", "\u201c"), ("&#8221;", "\u201d"),
    ]:
        text = text.replace(entity, char)
    return re.sub(r"\s+", " ", text).strip()


def _extract_year(date_str: str) -> int | None:
    """Extract year from various date formats."""
    if not date_str:
        return None
    m = re.search(r"(\d{4})", date_str)
    return int(m.group(1)) if m else None


# ── RSS/Atom feed parsing ────────────────────────────────────────────────────

_DC_NS = "http://purl.org/dc/elements/1.1/"


def _parse_feed(xml_text: str, source: PaperSource) -> list[ResearchPaper]:
    """Parse RSS 2.0 or Atom feed into ResearchPaper objects."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        logger.warning("Failed to parse feed XML for %s", source.value)
        return []

    articles: list[ResearchPaper] = []

    # RSS 2.0: <rss><channel><item>...
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        desc = item.findtext("description") or ""
        pub_date = item.findtext("pubDate") or ""
        creator = item.findtext(f"{{{_DC_NS}}}creator") or ""
        author = creator or (item.findtext("author") or "")

        if not title:
            continue

        articles.append(ResearchPaper(
            title=_strip_html(title),
            authors=[author.strip()] if author.strip() else [],
            year=_extract_year(pub_date),
            abstract_text=_strip_html(desc)[:500] if desc else None,
            url=link,
            source=source,
        ))

    # Atom: <feed><entry>... (handles both namespaced and bare Atom)
    if not articles:
        for entry in root.iter("entry"):
            title = ""
            link = ""
            summary = ""
            published = ""
            author_name = ""

            for child in entry:
                tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
                if tag == "title":
                    title = (child.text or "").strip()
                elif tag == "link":
                    link = child.get("href", child.text or "")
                elif tag in ("summary", "content") and not summary:
                    summary = child.text or ""
                elif tag in ("published", "updated") and not published:
                    published = child.text or ""
                elif tag == "author":
                    for sub in child:
                        sub_tag = sub.tag.split("}")[-1] if "}" in sub.tag else sub.tag
                        if sub_tag == "name":
                            author_name = (sub.text or "").strip()

            if not title:
                continue

            articles.append(ResearchPaper(
                title=_strip_html(title),
                authors=[author_name] if author_name else [],
                year=_extract_year(published),
                abstract_text=_strip_html(summary)[:500] if summary else None,
                url=link.strip(),
                source=source,
            ))

    return articles


# ── Source clients ───────────────────────────────────────────────────────────


class RSSSearchClient:
    """Search an RSS/Atom feed by keyword matching on titles and descriptions."""

    def __init__(self, feed_url: str, source: PaperSource, min_keyword_matches: int = 2):
        self.feed_url = feed_url
        self.source = source
        self.min_matches = min_keyword_matches

    @retry_async(max_attempts=2, base_delay=1.0, fallback=list)
    async def search(self, query: str, limit: int = 5) -> list[ResearchPaper]:
        keywords = _extract_keywords(query)
        if not keywords:
            return []

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(self.feed_url, headers=_HEADERS)
            resp.raise_for_status()

        articles = _parse_feed(resp.text, self.source)

        # Score by keyword relevance, filter, sort
        threshold = min(self.min_matches, max(1, len(keywords) // 2))
        scored = []
        for a in articles:
            text = f"{a.title} {a.abstract_text or ''}"
            score = _keyword_score(text, keywords)
            if score >= threshold:
                scored.append((score, a))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = [a for _, a in scored[:limit]]

        logger.info(
            "Editorial [%s]: %d/%d articles matched '%s'",
            self.source.value, len(results), len(articles), query[:40],
        )
        return results


class WordPressSearchClient:
    """Search a WordPress site via its REST API (full-text search)."""

    def __init__(self, api_base: str, source: PaperSource):
        self.api_base = api_base
        self.source = source

    @retry_async(max_attempts=2, base_delay=1.0, fallback=list)
    async def search(self, query: str, limit: int = 5) -> list[ResearchPaper]:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                self.api_base,
                params={
                    "search": query,
                    "per_page": limit,
                    "orderby": "relevance",
                    "_fields": "title,link,excerpt,date",
                },
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; vadim.blog editorial-search/1.0)",
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            posts = resp.json()

        articles = []
        for post in posts:
            title = _strip_html(post.get("title", {}).get("rendered", ""))
            link = post.get("link", "")
            excerpt = _strip_html(post.get("excerpt", {}).get("rendered", ""))
            date_str = post.get("date", "")

            if not title:
                continue

            articles.append(ResearchPaper(
                title=title,
                authors=[],
                year=_extract_year(date_str),
                abstract_text=excerpt[:500] if excerpt else None,
                url=link,
                source=self.source,
            ))

        logger.info(
            "Editorial [%s]: %d results for '%s'",
            self.source.value, len(articles), query[:40],
        )
        return articles


# ── Unified editorial search ────────────────────────────────────────────────

_CLIENTS = [
    RSSSearchClient("https://feed.infoq.com/", PaperSource.INFOQ),
    WordPressSearchClient(
        "https://thenewstack.io/wp-json/wp/v2/posts",
        PaperSource.THE_NEW_STACK,
    ),

    RSSSearchClient(
        "https://towardsdatascience.com/feed",
        PaperSource.TOWARDS_DATA_SCIENCE,
    ),
]


async def search_editorial(
    query: str, limit_per_source: int = 5
) -> list[ResearchPaper]:
    """Search all editorial sources in parallel.

    Returns deduplicated articles from InfoQ, The New Stack,
    and Towards Data Science.
    """
    results = await asyncio.gather(
        *[c.search(query, limit=limit_per_source) for c in _CLIENTS],
        return_exceptions=True,
    )

    articles: list[ResearchPaper] = []
    for batch in results:
        if isinstance(batch, list):
            articles.extend(batch)
        elif isinstance(batch, Exception):
            logger.warning("Editorial source failed: %s", batch)

    # Dedup by normalized title
    seen: set[str] = set()
    unique: list[ResearchPaper] = []
    for a in articles:
        key = a.title.strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(a)

    logger.info(
        "Editorial search: %d unique articles from %d sources",
        len(unique), len(_CLIENTS),
    )
    return unique

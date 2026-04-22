"""Single-node competitor website loader.

One LangGraph node (`competitor_loader`) hosts five loader strategies from
`langchain-community` plus two post-processors, and routes each competitor URL
to the combination that fits its site shape:

  - SitemapLoader         — site exposes /sitemap.xml (polite, bounded)
  - RecursiveUrlLoader    — no sitemap, crawl same-domain up to max_depth=2
  - WebBaseLoader         — static site, fetch a fixed hot list of marketing URLs
  - AsyncChromiumLoader   — JS-gated SPA (Playwright fallback)
  - UnstructuredURLLoader | Docling — post-process raw HTML/Documents to markdown

The router (`_pick_strategy`) probes each URL once with httpx before committing,
so no URL pays the cost of running every loader. Grounds downstream
`differentiator` / `threat_assessor` prompts in real scraped copy rather than
LLM priors.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from typing import Any
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree as ET

import httpx

from .state import CompetitorsTeamState

logger = logging.getLogger(__name__)

# Silence langchain-community's WebBaseLoader "USER_AGENT env var not set"
# warning. header_template at init covers most paths but a few code paths
# (nested sub-sitemap fetches in SitemapLoader) still call _get_user_agent().
os.environ.setdefault(
    "USER_AGENT",
    "Mozilla/5.0 (compatible; leadgen-competitor-loader/1.0; "
    "+https://agenticleadgen.xyz)",
)

SITEMAP_NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"

MAX_PAGES_PER_COMPETITOR = 8
MAX_MARKDOWN_CHARS = 20_000
HOT_LIST_PATHS = ("/", "/pricing", "/features", "/integrations", "/product")
JS_GATE_MARKERS = (
    "you need to enable javascript",
    "please enable javascript",
    '<div id="__next">',
    '<div id="root"></div>',
)
RECURSIVE_EXCLUDE_DIRS = (
    "/blog",
    "/docs",
    "/help",
    "/support",
    "/community",
    "/changelog",
    "/legal",
    "/terms",
    "/privacy",
)
PROBE_TIMEOUT = httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=5.0)
USER_AGENT = (
    "Mozilla/5.0 (compatible; leadgen-competitor-loader/1.0; "
    "+https://agenticleadgen.xyz)"
)

# Bound Chromium instances across parallel _load_one calls. Lazy-instantiated
# so module import does not pin the semaphore to a particular event loop —
# LangGraph may invoke us under different loops across runs.
_chromium_semaphore: asyncio.Semaphore | None = None


def _chromium_gate() -> asyncio.Semaphore:
    global _chromium_semaphore
    if _chromium_semaphore is None:
        _chromium_semaphore = asyncio.Semaphore(3)
    return _chromium_semaphore


def _same_domain(base_url: str) -> str:
    host = (urlparse(base_url).hostname or "").removeprefix("www.")
    return host


def _visible_text_length(html: str) -> int:
    """Rough count of visible text chars with <script>/<style>/<noscript>
    stripped. Raw HTML length is misleading — a modern SPA can ship 40KB of
    inline script wrapping an empty <div id="root"></div>."""
    try:
        from bs4 import BeautifulSoup  # type: ignore

        soup = BeautifulSoup(html, "lxml" if _has_lxml() else "html.parser")
        for tag in soup(["script", "style", "noscript", "svg", "template"]):
            tag.decompose()
        body = soup.body or soup
        return len(body.get_text(strip=True))
    except ImportError:
        stripped = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.I | re.S)
        stripped = re.sub(r"<[^>]+>", "", stripped)
        return len(stripped.strip())


async def _pick_strategy(client: httpx.AsyncClient, url: str) -> str:
    """Return the loader strategy best matching the URL's site shape."""
    # 1. Sitemap probe. HEAD is cheap; some servers reject HEAD (405) or return
    # a soft 404 — fall through to the homepage probe in either case.
    sitemap_url = urljoin(url, "/sitemap.xml")
    try:
        r = await client.head(sitemap_url, follow_redirects=True)
        if r.status_code == 200:
            return "sitemap"
    except httpx.HTTPError:
        pass

    # 2. Homepage probe.
    try:
        r = await client.get(url, follow_redirects=True)
        body = r.text if r.status_code == 200 else ""
        reachable = r.status_code == 200
    except httpx.HTTPError:
        body = ""
        reachable = False

    # If the homepage is unreachable, Chromium will fail too — route to `basic`
    # which fails cheap across the same network path.
    if not reachable:
        return "basic"

    lower = body.lower()
    if _visible_text_length(body) < 400 or any(m in lower for m in JS_GATE_MARKERS):
        return "chromium"

    # 3. If the homepage advertises hot-list routes, use the fast single-URL path.
    if any(path in lower for path in ("/pricing", "/features", "/integrations")):
        return "basic"

    # 4. Fallback: bounded recursive crawl.
    return "recursive"


async def _pick_sitemap_urls(
    client: httpx.AsyncClient, sitemap_url: str, domain_re: re.Pattern[str]
) -> list[str]:
    """Parse sitemap.xml, return up to MAX_PAGES_PER_COMPETITOR same-domain
    URLs. If the root is a sitemap index, follows only the FIRST sub-sitemap
    — `langchain_community.SitemapLoader` recursively fetches every
    sub-sitemap (30+ for apollo.io) which takes 10× longer than our entire
    budget for a single site."""
    try:
        r = await client.get(sitemap_url)
        if r.status_code != 200 or not r.text.strip():
            return []
        root = ET.fromstring(r.text)
    except (httpx.HTTPError, ET.ParseError):
        return []

    urls: list[str] = []

    def _collect(elem: ET.Element) -> None:
        for loc in elem.iter(f"{SITEMAP_NS}loc"):
            u = (loc.text or "").strip()
            if u and domain_re.match(u):
                urls.append(u)
                if len(urls) >= MAX_PAGES_PER_COMPETITOR:
                    return

    if root.tag == f"{SITEMAP_NS}sitemapindex":
        first = root.find(f"{SITEMAP_NS}sitemap/{SITEMAP_NS}loc")
        if first is not None and first.text:
            try:
                sub = await client.get(first.text.strip())
                if sub.status_code == 200:
                    _collect(ET.fromstring(sub.text))
            except (httpx.HTTPError, ET.ParseError):
                pass
    else:
        _collect(root)

    return urls[:MAX_PAGES_PER_COMPETITOR]


async def _load_sitemap(url: str) -> list[Any]:
    from langchain_community.document_loaders import WebBaseLoader

    scheme = urlparse(url).scheme or "https"
    domain_re = re.compile(rf"^{scheme}://(www\.)?{re.escape(_same_domain(url))}")
    sitemap_url = urljoin(url, "/sitemap.xml")

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(10.0),
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        urls = await _pick_sitemap_urls(client, sitemap_url, domain_re)

    if not urls:
        return []

    # Hand the bounded URL list to WebBaseLoader (one of the five loaders) —
    # no further network fan-out, no index recursion.
    loader = WebBaseLoader(
        web_paths=urls,
        requests_per_second=2,
        header_template={"User-Agent": USER_AGENT},
        continue_on_failure=True,
    )
    docs = await asyncio.to_thread(loader.load)
    return docs[:MAX_PAGES_PER_COMPETITOR]


async def _load_recursive(url: str) -> list[Any]:
    from langchain_community.document_loaders.recursive_url_loader import (
        RecursiveUrlLoader,
    )

    loader = RecursiveUrlLoader(
        url=url,
        max_depth=2,
        use_async=True,
        timeout=10,
        check_response_status=True,
        prevent_outside=True,
        exclude_dirs=RECURSIVE_EXCLUDE_DIRS,
        headers={"User-Agent": USER_AGENT},
    )
    docs = await asyncio.to_thread(loader.load)
    return docs[:MAX_PAGES_PER_COMPETITOR]


async def _load_chromium(url: str) -> list[Any]:
    from langchain_community.document_loaders import AsyncChromiumLoader

    async with _chromium_gate():
        loader = AsyncChromiumLoader([url], user_agent=USER_AGENT)
        docs = await asyncio.to_thread(loader.load)
    return docs


async def _load_basic(url: str) -> list[Any]:
    from langchain_community.document_loaders import WebBaseLoader

    urls = [urljoin(url, path) for path in HOT_LIST_PATHS]
    loader = WebBaseLoader(
        web_paths=urls,
        requests_per_second=2,
        header_template={"User-Agent": USER_AGENT},
        continue_on_failure=True,
    )
    docs = await asyncio.to_thread(loader.load)
    return docs[:MAX_PAGES_PER_COMPETITOR]


def _to_markdown(docs: list[Any]) -> str:
    """Post-process with Docling when available, else Unstructured's cleaner,
    else a naive BeautifulSoup fallback. All three return LLM-ready text."""
    if not docs:
        return ""

    # Preferred: Docling (richest structure preservation). Any failure —
    # import, init (model download), or per-doc conversion — silently falls
    # through to the Unstructured path; Docling is optional and heavy.
    docling_md = _docling_markdown(docs)
    if docling_md is not None:
        return docling_md

    # Fallback: Unstructured's whitespace cleaner on HTML-stripped text.
    try:
        from unstructured.cleaners.core import clean_extra_whitespace  # type: ignore

        chunks = [
            clean_extra_whitespace(_fallback_clean(getattr(d, "page_content", "") or ""))
            for d in docs
        ]
        return "\n\n---\n\n".join(c for c in chunks if c.strip())
    except ImportError:
        return "\n\n---\n\n".join(
            _fallback_clean(getattr(d, "page_content", "") or "") for d in docs
        )


def _docling_markdown(docs: list[Any]) -> str | None:
    """Try Docling → return markdown or None if unavailable/failed. Broad
    except on purpose: Docling models fail to download, raise RuntimeError,
    and have had breaking API changes; we never want Docling to take down a
    whole competitor's scrape."""
    try:
        from docling.datamodel.base_models import DocumentStream  # type: ignore
        from docling.document_converter import DocumentConverter  # type: ignore
    except ImportError:
        return None

    try:
        converter = DocumentConverter()
    except Exception as exc:  # noqa: BLE001
        logger.debug("Docling DocumentConverter init failed: %s", exc)
        return None

    import io

    chunks: list[str] = []
    for doc in docs:
        html = getattr(doc, "page_content", "") or ""
        if not html.strip():
            continue
        try:
            stream = DocumentStream(name="doc.html", stream=io.BytesIO(html.encode()))
            result = converter.convert(stream)
            chunks.append(result.document.export_to_markdown())
        except Exception:  # noqa: BLE001
            chunks.append(_fallback_clean(html))
    text = "\n\n---\n\n".join(c for c in chunks if c.strip())
    return text if text else None


def _fallback_clean(html_or_text: str) -> str:
    """Strip HTML tags when BeautifulSoup is available, else return as-is."""
    try:
        from bs4 import BeautifulSoup  # type: ignore

        soup = BeautifulSoup(html_or_text, "lxml" if _has_lxml() else "html.parser")
        for tag in soup(["script", "style", "noscript", "svg"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        lines = [ln for ln in (l.strip() for l in text.splitlines()) if ln]
        return "\n".join(lines)
    except ImportError:
        return html_or_text


def _has_lxml() -> bool:
    try:
        import lxml  # noqa: F401

        return True
    except ImportError:
        return False


async def _load_one(
    client: httpx.AsyncClient, candidate: dict[str, Any]
) -> tuple[str, dict[str, Any]]:
    url = candidate["url"]
    started = time.perf_counter()
    try:
        strategy = await _pick_strategy(client, url)
        if strategy == "sitemap":
            docs = await _load_sitemap(url)
        elif strategy == "recursive":
            docs = await _load_recursive(url)
        elif strategy == "chromium":
            docs = await _load_chromium(url)
        else:
            docs = await _load_basic(url)

        markdown = _to_markdown(docs)[:MAX_MARKDOWN_CHARS]
        return url, {
            "markdown": markdown,
            "pages": len(docs),
            "loader": strategy,
            "elapsed": round(time.perf_counter() - started, 3),
        }
    except Exception as exc:  # noqa: BLE001 — isolate per-URL loader failures
        logger.warning("competitor_loader failed for %s: %s", url, exc)
        return url, {
            "markdown": "",
            "pages": 0,
            "loader": "error",
            "error": str(exc)[:240],
            "elapsed": round(time.perf_counter() - started, 3),
        }


async def competitor_loader(state: CompetitorsTeamState) -> dict:
    """The single node that uses all five loaders via a per-URL router."""
    t0 = time.perf_counter()
    candidates = state.get("candidates") or []
    if not candidates:
        return {"competitor_pages": {}}

    async with httpx.AsyncClient(
        timeout=PROBE_TIMEOUT,
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
    ) as client:
        results = await asyncio.gather(
            *[_load_one(client, c) for c in candidates],
            return_exceptions=False,
        )

    pages = dict(results)
    return {
        "competitor_pages": pages,
        "agent_timings": {"competitor_loader": round(time.perf_counter() - t0, 3)},
    }

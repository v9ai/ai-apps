"""Single-node competitor website loader.

One LangGraph node (`competitor_loader`) hosts five loader strategies from
`langchain-community` plus two post-processors, and routes each competitor URL
to the combination that fits its site shape:

  - SitemapLoader         — site exposes /sitemap.xml (polite, bounded)
  - RecursiveUrlLoader    — no sitemap, crawl same-domain depth=1
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
import time
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from .state import CompetitorsTeamState

logger = logging.getLogger(__name__)

MAX_PAGES_PER_COMPETITOR = 8
MAX_MARKDOWN_CHARS = 20_000
HOT_LIST_PATHS = ("/", "/pricing", "/features", "/integrations", "/product")
JS_GATE_MARKERS = (
    "you need to enable javascript",
    "please enable javascript",
    "<div id=\"__next\">",
    "<div id=\"root\"></div>",
)
CHROMIUM_SEMAPHORE = asyncio.Semaphore(3)
PROBE_TIMEOUT = httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=5.0)
USER_AGENT = "Mozilla/5.0 (compatible; leadgen-competitor-loader/1.0; +https://agenticleadgen.xyz)"


def _same_domain(base_url: str) -> str:
    host = (urlparse(base_url).hostname or "").removeprefix("www.")
    return host


async def _pick_strategy(
    client: httpx.AsyncClient, url: str
) -> tuple[str, str | None]:
    """Return (strategy, probed_html). probed_html is reused by _load_basic to
    skip the first GET when the routing probe already has the homepage body."""
    # 1. Sitemap probe
    sitemap_url = urljoin(url, "/sitemap.xml")
    try:
        r = await client.head(sitemap_url, follow_redirects=True)
        if r.status_code == 200:
            return "sitemap", None
    except httpx.HTTPError:
        pass

    # 2. Homepage probe — inspects body to detect JS-gated SPA
    try:
        r = await client.get(url, follow_redirects=True)
        body = r.text if r.status_code == 200 else ""
    except httpx.HTTPError:
        body = ""

    lower = body.lower()
    stripped_len = len(lower.replace(" ", "").replace("\n", ""))
    if stripped_len < 400 or any(marker in lower for marker in JS_GATE_MARKERS):
        return "chromium", body or None

    # 3. Multi-page hot list detection: if homepage links include /pricing or
    # /features, prefer the cheap WebBaseLoader fast path.
    if any(path in lower for path in ("/pricing", "/features", "/integrations")):
        return "basic", body

    # 4. Fallback: recursive crawl
    return "recursive", body


async def _load_sitemap(url: str) -> list[Any]:
    from langchain_community.document_loaders.sitemap import SitemapLoader

    loader = SitemapLoader(
        web_path=urljoin(url, "/sitemap.xml"),
        filter_urls=[rf"^{urlparse(url).scheme}://(www\.)?{_same_domain(url)}"],
        requests_per_second=2,
    )
    loader.requests_kwargs = {"headers": {"User-Agent": USER_AGENT}, "timeout": 10}
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
        headers={"User-Agent": USER_AGENT},
    )
    docs = await asyncio.to_thread(loader.load)
    return docs[:MAX_PAGES_PER_COMPETITOR]


async def _load_chromium(url: str) -> list[Any]:
    from langchain_community.document_loaders import AsyncChromiumLoader

    async with CHROMIUM_SEMAPHORE:
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
    """Post-process with Docling when available, else UnstructuredURLLoader's
    cleaner, else a naive BeautifulSoup fallback. All three paths return
    LLM-ready markdown/plain text."""
    if not docs:
        return ""

    # Preferred: Docling (richest structure preservation)
    try:
        from docling.document_converter import DocumentConverter  # type: ignore

        converter = DocumentConverter()
        chunks: list[str] = []
        for doc in docs:
            html = getattr(doc, "page_content", "") or ""
            if not html.strip():
                continue
            try:
                result = converter.convert_string(html, format="html")
                chunks.append(result.document.export_to_markdown())
            except Exception:  # noqa: BLE001 — Docling raises many types
                chunks.append(_fallback_clean(html))
        return "\n\n---\n\n".join(c for c in chunks if c.strip())
    except ImportError:
        pass

    # Fallback: Unstructured's whitespace cleaner
    try:
        from unstructured.cleaners.core import clean_extra_whitespace  # type: ignore

        chunks = []
        for doc in docs:
            text = getattr(doc, "page_content", "") or ""
            if text.strip():
                chunks.append(clean_extra_whitespace(_fallback_clean(text)))
        return "\n\n---\n\n".join(chunks)
    except ImportError:
        return "\n\n---\n\n".join(
            _fallback_clean(getattr(d, "page_content", "") or "") for d in docs
        )


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
        strategy, _probe_body = await _pick_strategy(client, url)
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
    except Exception as exc:  # noqa: BLE001 — we want loader failures isolated
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

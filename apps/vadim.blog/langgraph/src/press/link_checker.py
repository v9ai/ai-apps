"""Async link checker — extract and validate all HTTP(S) URLs in markdown content."""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

_URL_RE = re.compile(r"https?://[^\s\)\"'>\]]+")

# Domains known to block automated requests — treat non-5xx as OK
_LENIENT_DOMAINS = {
    "twitter.com",
    "x.com",
    "linkedin.com",
    "facebook.com",
    "instagram.com",
    "arxiv.org",
    "doi.org",
    "researchgate.net",
    "acm.org",
    "ieee.org",
    "springer.com",
    "nature.com",
}

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; vadim.blog link-checker/1.0; "
        "+https://vadim.blog)"
    ),
    "Accept": "text/html,application/xhtml+xml,*/*",
}


@dataclass
class LinkResult:
    url: str
    status: int | None = None  # HTTP status; None on network error
    ok: bool = False
    redirect_url: str | None = None
    error: str | None = None


def extract_urls(markdown: str) -> list[str]:
    """Return unique HTTP(S) URLs found in *markdown*, in order of appearance."""
    seen: set[str] = set()
    result: list[str] = []
    for raw in _URL_RE.findall(markdown):
        url = raw.rstrip(".,;:!?)")  # strip trailing punctuation
        if url not in seen:
            seen.add(url)
            result.append(url)
    return result


async def _check_one(client: httpx.AsyncClient, url: str) -> LinkResult:
    """HEAD with GET fallback. Lenient on bot-blocking domains."""
    host = httpx.URL(url).host.lstrip("www.")
    lenient = any(host == d or host.endswith("." + d) for d in _LENIENT_DOMAINS)

    try:
        resp = await client.head(url, follow_redirects=True, headers=_HEADERS)

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
        # Treat timeouts on lenient domains as passing (likely bot-blocking)
        return LinkResult(url=url, ok=lenient, error="timeout")
    except httpx.ConnectError as exc:
        return LinkResult(url=url, ok=False, error=f"connect_error: {exc}")
    except Exception as exc:  # noqa: BLE001
        return LinkResult(url=url, ok=False, error=str(exc))


async def check_links(
    urls: list[str],
    timeout: float = 15.0,
    concurrency: int = 8,
) -> list[LinkResult]:
    """Check *urls* concurrently. Results are returned in input order."""
    if not urls:
        return []

    limits = httpx.Limits(
        max_connections=concurrency,
        max_keepalive_connections=concurrency,
    )
    async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
        sem = asyncio.Semaphore(concurrency)

        async def bounded(url: str) -> LinkResult:
            async with sem:
                return await _check_one(client, url)

        return list(await asyncio.gather(*[bounded(u) for u in urls]))


async def check_content_links(
    content: str,
    timeout: float = 15.0,
    concurrency: int = 8,
) -> list[LinkResult]:
    """Extract all URLs from *content* and check them. Logs a warning for broken links."""
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
            len(broken),
            len(results),
            [r.url for r in broken],
        )
    else:
        logger.info("All %d link(s) OK", len(results))

    return results


def format_report(results: list[LinkResult]) -> str:
    """Render link-check results as a markdown table."""
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

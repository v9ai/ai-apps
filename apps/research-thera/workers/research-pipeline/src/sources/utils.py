"""Shared utilities: dedup, filter, retry, concurrency limiter."""

from __future__ import annotations

import asyncio
import math
import re
from typing import Any, Awaitable, Callable, TypeVar

from http_client import AsyncClient, Response

T = TypeVar("T")
R = TypeVar("R")

STOP_WORDS = frozenset(
    ["the", "and", "for", "with", "from", "into", "over", "under", "after", "before"]
)


def normalize_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    d = doi.strip().lower()
    d = re.sub(r"^https?://(dx\.)?doi\.org/", "", d)
    d = re.sub(r"^doi:\s*", "", d, flags=re.IGNORECASE)
    return d.strip() or None


def strip_jats(text: str | None) -> str | None:
    if not text:
        return None
    no_tags = re.sub(r"</?[^>]+>", " ", text)
    decoded = (
        no_tags.replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )
    return re.sub(r"\s+", " ", decoded).strip() or None


def title_fingerprint(title: str) -> str:
    t = title.lower()
    t = re.sub(r"[\u2010-\u2015]", "-", t)
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    tokens = [tok for tok in t.split() if len(tok) > 2 and tok not in STOP_WORDS]
    tokens.sort()
    return " ".join(tokens)


def dedup_candidates(candidates: list[dict]) -> list[dict]:
    seen: set[str] = set()
    unique: list[dict] = []
    for c in candidates:
        doi = normalize_doi(c.get("doi"))
        title_key = title_fingerprint(c.get("title", "")) if c.get("title") else ""
        key = f"doi:{doi}" if doi else f"t:{title_key}"
        if not title_key and not doi:
            continue
        if key not in seen:
            seen.add(key)
            unique.append({**c, "doi": doi})
    return unique


EXCLUDED_PUB_TYPES = frozenset(
    [
        "book-chapter",
        "book-section",
        "book-part",
        "reference-entry",
        "book",
        "monograph",
        "edited-book",
        "reference-book",
    ]
)


def filter_book_chapters(candidates: list[dict]) -> list[dict]:
    return [
        c
        for c in candidates
        if not c.get("publicationType") or c["publicationType"] not in EXCLUDED_PUB_TYPES
    ]


async def fetch_with_retry(
    url: str,
    *,
    method: str = "GET",
    headers: dict | None = None,
    json_body: Any = None,
    max_retries: int = 3,
) -> Response:
    """Retry with exponential backoff on 429 or network errors."""
    last_err: Exception | None = None
    async with AsyncClient(timeout=30) as client:
        for attempt in range(max_retries):
            try:
                resp = await client.request(
                    method, url, headers=headers, json=json_body
                )
                if resp.status_code == 429:
                    retry_after = resp.headers.get("retry-after")
                    wait = (
                        int(retry_after) if retry_after and retry_after.isdigit() else min(1000 * 2**attempt, 10000)
                    )
                    await asyncio.sleep(wait / 1000 if wait > 100 else wait)
                    continue
                return resp
            except Exception as e:
                last_err = e
                if attempt < max_retries - 1:
                    await asyncio.sleep(min(2**attempt, 10))
    raise last_err or RuntimeError("max retries exceeded")


async def map_limit(
    items: list[T],
    limit: int,
    fn: Callable[[T, int], Awaitable[R]],
) -> list[R]:
    """Process items with bounded concurrency (like p-limit / async-pool)."""
    results: list[R | None] = [None] * len(items)
    idx = 0
    lock = asyncio.Lock()

    async def worker():
        nonlocal idx
        while True:
            async with lock:
                my_idx = idx
                idx += 1
            if my_idx >= len(items):
                break
            results[my_idx] = await fn(items[my_idx], my_idx)

    workers = [asyncio.create_task(worker()) for _ in range(min(limit, len(items)))]
    await asyncio.gather(*workers)
    return results  # type: ignore[return-value]

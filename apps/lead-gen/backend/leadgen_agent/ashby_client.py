"""Ashby public job-board API client.

Mirrors :mod:`leadgen_agent.ats_client` (Greenhouse) shape — async httpx
context manager, single endpoint. Ashby exposes one public, unauthenticated
posting endpoint per board:

    GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true

A 404 means the slug is not a public Ashby board (or doesn't exist); we
swallow it and return ``[]`` so the discovery → ingest fan-out can keep
running without a slug-by-slug try/except wrapper.

Reference: https://developers.ashbyhq.com/docs/public-job-posting-api
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

log = logging.getLogger(__name__)

BASE_URL = "https://api.ashbyhq.com/posting-api/job-board"


@dataclass
class AshbyJob:
    """One row from the Ashby posting API.

    Field names mirror the JSON keys verbatim so the raw payload round-trips
    into ``opportunities.metadata`` without renaming.
    """

    jobId: str
    title: str
    location: str | None = None
    applyUrl: str | None = None
    descriptionHtml: str | None = None
    descriptionPlain: str | None = None
    employmentType: str | None = None
    workplaceType: str | None = None
    isRemote: bool | None = None
    publishedAt: str | None = None
    address: dict[str, Any] | None = None
    compensation: dict[str, Any] | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_payload(cls, j: dict[str, Any]) -> "AshbyJob":
        return cls(
            jobId=str(j.get("jobId") or j.get("id") or ""),
            title=str(j.get("title") or ""),
            location=j.get("location"),
            applyUrl=j.get("applyUrl") or j.get("jobUrl"),
            descriptionHtml=j.get("descriptionHtml"),
            descriptionPlain=j.get("descriptionPlain"),
            employmentType=j.get("employmentType"),
            workplaceType=j.get("workplaceType"),
            isRemote=j.get("isRemote"),
            publishedAt=j.get("publishedAt"),
            address=j.get("address"),
            compensation=j.get("compensation"),
            raw=j,
        )


@dataclass
class AshbyClient:
    slug: str
    timeout: float = 30.0
    _client: httpx.AsyncClient | None = field(default=None, init=False, repr=False)

    async def __aenter__(self) -> "AshbyClient":
        self._client = httpx.AsyncClient(
            timeout=self.timeout,
            headers={"User-Agent": "leadgen-ashby/0.1.0", "Accept": "application/json"},
        )
        return self

    async def __aexit__(self, *_exc: object) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    @property
    def http(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("AshbyClient must be used as an async context manager")
        return self._client

    def _url(self) -> str:
        return f"{BASE_URL}/{self.slug}"

    async def fetch_jobs(self, include_compensation: bool = True) -> list[AshbyJob]:
        params = {"includeCompensation": "true"} if include_compensation else None
        try:
            resp = await self.http.get(self._url(), params=params)
        except httpx.HTTPError as exc:
            log.warning("Ashby fetch failed slug=%s: %s", self.slug, exc)
            return []
        if resp.status_code == 404:
            log.info("Ashby slug not public slug=%s", self.slug)
            return []
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            log.warning("Ashby HTTP %s slug=%s body=%s",
                        resp.status_code, self.slug, resp.text[:200])
            return []
        body = resp.json()
        jobs = [AshbyJob.from_payload(j) for j in (body.get("jobs") or [])]
        log.info("Ashby slug=%s jobs=%d", self.slug, len(jobs))
        return jobs


async def _main(slug: str) -> None:
    import json

    logging.basicConfig(level=logging.INFO)
    async with AshbyClient(slug) as client:
        jobs = await client.fetch_jobs()
    print(json.dumps([j.raw for j in jobs], indent=2))


if __name__ == "__main__":
    import argparse
    import asyncio

    parser = argparse.ArgumentParser(prog="ashby-fetch")
    parser.add_argument("slug", nargs="?", default="langchain")
    args = parser.parse_args()
    asyncio.run(_main(args.slug))

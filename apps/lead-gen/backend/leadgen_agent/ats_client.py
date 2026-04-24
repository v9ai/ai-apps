"""Greenhouse job board API client.

Native Python port of the former Rust ``ats`` crate. Exposes the same
surface: list jobs, fetch one job with content, list departments/offices,
and fan out per-job detail fetches with bounded concurrency.

No external services beyond Greenhouse's public boards API.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

log = logging.getLogger(__name__)

BASE_URL = "https://boards-api.greenhouse.io/v1/boards"


@dataclass
class BoardSnapshot:
    jobs: list[dict[str, Any]]
    departments: list[dict[str, Any]]
    offices: list[dict[str, Any]]
    total: int


@dataclass
class GreenhouseClient:
    board_token: str
    max_concurrency: int = 20
    timeout: float = 30.0
    _client: httpx.AsyncClient | None = field(default=None, init=False, repr=False)

    async def __aenter__(self) -> "GreenhouseClient":
        self._client = httpx.AsyncClient(
            timeout=self.timeout,
            headers={"User-Agent": "ats/0.1.0"},
        )
        return self

    async def __aexit__(self, *_exc: object) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    @property
    def http(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("GreenhouseClient must be used as an async context manager")
        return self._client

    def _url(self, path: str) -> str:
        return f"{BASE_URL}/{self.board_token}{path}"

    async def _get_json(self, path: str, **params: Any) -> Any:
        resp = await self.http.get(self._url(path), params=params or None)
        resp.raise_for_status()
        return resp.json()

    async def fetch_jobs(self) -> list[dict[str, Any]]:
        data = await self._get_json("/jobs")
        jobs = data.get("jobs", [])
        log.info("fetched job list total=%s", data.get("meta", {}).get("total"))
        return jobs

    async def fetch_jobs_with_content(self) -> list[dict[str, Any]]:
        data = await self._get_json("/jobs", content="true")
        jobs = data.get("jobs", [])
        log.info("fetched jobs with content total=%s", data.get("meta", {}).get("total"))
        return jobs

    async def fetch_job(self, job_id: int) -> dict[str, Any]:
        return await self._get_json(f"/jobs/{job_id}")

    async def fetch_departments(self) -> list[dict[str, Any]]:
        data = await self._get_json("/departments")
        depts = data.get("departments", [])
        log.info("fetched departments count=%d", len(depts))
        return depts

    async def fetch_offices(self) -> list[dict[str, Any]]:
        data = await self._get_json("/offices")
        offices = data.get("offices", [])
        log.info("fetched offices count=%d", len(offices))
        return offices

    async def fetch_all(self) -> BoardSnapshot:
        jobs, departments, offices = await asyncio.gather(
            self.fetch_jobs_with_content(),
            self.fetch_departments(),
            self.fetch_offices(),
        )
        snap = BoardSnapshot(
            jobs=jobs, departments=departments, offices=offices, total=len(jobs)
        )
        log.info(
            "board snapshot total=%d departments=%d offices=%d",
            snap.total, len(snap.departments), len(snap.offices),
        )
        return snap

    async def fetch_jobs_detailed(self) -> list[dict[str, Any]]:
        jobs = await self.fetch_jobs()
        sem = asyncio.Semaphore(self.max_concurrency)
        log.info("fetching job details total=%d concurrency=%d", len(jobs), self.max_concurrency)

        async def _one(job_id: int) -> dict[str, Any]:
            async with sem:
                return await self.fetch_job(job_id)

        return await asyncio.gather(*(_one(j["id"]) for j in jobs))


async def _main() -> None:
    import json
    from pathlib import Path

    logging.basicConfig(level=logging.INFO)
    out_dir = Path(__file__).resolve().parent.parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "anthropic-jobs.json"

    async with GreenhouseClient("anthropic") as client:
        jobs = await client.fetch_jobs_detailed()
    out.write_text(json.dumps(jobs, indent=2))
    print(f"{len(jobs)} jobs → {out}")


if __name__ == "__main__":
    asyncio.run(_main())

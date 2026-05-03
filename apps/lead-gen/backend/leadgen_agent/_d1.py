"""Thin async client for the Cloudflare D1 HTTP API.

The backend runs as a Python process inside a Cloudflare Container, which
cannot bind to D1 directly (the D1 binding is JS-only). We talk to D1 via
its REST API using ``CLOUDFLARE_API_TOKEN`` instead.

Used by graphs that keep their primary store in D1 rather than Neon
(currently: ``gh_ai_repos_graph``).
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import httpx

log = logging.getLogger(__name__)

_API_BASE = "https://api.cloudflare.com/client/v4"
_DEFAULT_TIMEOUT = httpx.Timeout(30.0, connect=10.0)
_MODULE_VERSION = "8"  # bump to force a container image rebuild


class D1Error(RuntimeError):
    pass


class D1Client:
    """One client per (account, database). Reuse across calls — httpx pools."""

    def __init__(
        self,
        *,
        account_id: str | None = None,
        api_token: str | None = None,
        database_id: str | None = None,
    ) -> None:
        self.account_id = account_id or os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
        self.api_token = api_token or os.environ.get("CLOUDFLARE_API_TOKEN", "")
        self.database_id = database_id or os.environ.get(
            "CLOUDFLARE_D1_LEADGEN_JOBS_ID", ""
        )
        if not (self.account_id and self.api_token and self.database_id):
            raise D1Error(
                "D1Client missing env: CLOUDFLARE_ACCOUNT_ID / "
                "CLOUDFLARE_API_TOKEN / CLOUDFLARE_D1_LEADGEN_JOBS_ID"
            )

    @property
    def _url(self) -> str:
        return (
            f"{_API_BASE}/accounts/{self.account_id}"
            f"/d1/database/{self.database_id}/query"
        )

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
        }

    async def query(
        self, sql: str, params: list[Any] | None = None
    ) -> list[dict[str, Any]]:
        """Run a single statement; return its result rows."""
        body: dict[str, Any] = {"sql": sql}
        if params:
            body["params"] = params
        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT) as client:
            resp = await client.post(self._url, headers=self._headers, json=body)
        return _unwrap_single(resp)

    async def batch(
        self, statements: list[dict[str, Any]], *, concurrency: int = 8
    ) -> list[list[dict[str, Any]]]:
        """Run multiple statements concurrently (up to ``concurrency`` in
        flight). Returns rows per statement, in input order.

        Each item in ``statements`` is ``{"sql": ..., "params": [...]}``.

        Note: the D1 REST API has no atomic batch endpoint, so this is
        per-statement-best-effort. Caller must use idempotent upserts so a
        partial failure can be re-run safely.
        """
        if not statements:
            return []
        sem = asyncio.Semaphore(concurrency)

        async def _one(client: httpx.AsyncClient, stmt: dict[str, Any]) -> list[dict[str, Any]]:
            async with sem:
                body: dict[str, Any] = {"sql": stmt["sql"]}
                params = stmt.get("params")
                if params:
                    body["params"] = params
                resp = await client.post(self._url, headers=self._headers, json=body)
                return _unwrap_single(resp)

        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT) as client:
            return await asyncio.gather(*(_one(client, s) for s in statements))


def _unwrap_single(resp: httpx.Response) -> list[dict[str, Any]]:
    payload = _parse(resp)
    results = payload.get("result") or []
    if not results:
        return []
    first = results[0]
    if not first.get("success", True):
        raise D1Error(f"D1 statement failed: {first}")
    return list(first.get("results") or [])


def _parse(resp: httpx.Response) -> dict[str, Any]:
    try:
        payload = resp.json()
    except ValueError as e:
        raise D1Error(f"D1 returned non-JSON ({resp.status_code}): {resp.text[:200]}") from e
    if resp.status_code >= 400 or not payload.get("success", True):
        errors = payload.get("errors") or payload
        raise D1Error(f"D1 HTTP {resp.status_code}: {errors}")
    return payload

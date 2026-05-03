"""Thin async client for the Cloudflare D1 HTTP API.

The backend runs as a Python process inside a Cloudflare Container, which
cannot bind to D1 directly (the D1 binding is JS-only). We talk to D1 via
its REST API using ``CLOUDFLARE_API_TOKEN`` instead.

Used by graphs that keep their primary store in D1 rather than Neon
(currently: ``gh_ai_repos_graph``).
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx

log = logging.getLogger(__name__)

_API_BASE = "https://api.cloudflare.com/client/v4"
_DEFAULT_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


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
        self, statements: list[dict[str, Any]]
    ) -> list[list[dict[str, Any]]]:
        """Run multiple statements atomically. Returns rows per statement.

        Each item in ``statements`` is ``{"sql": ..., "params": [...]}``.
        """
        if not statements:
            return []
        async with httpx.AsyncClient(timeout=_DEFAULT_TIMEOUT) as client:
            resp = await client.post(
                self._url, headers=self._headers, json=statements
            )
        return _unwrap_batch(resp, len(statements))


def _unwrap_single(resp: httpx.Response) -> list[dict[str, Any]]:
    payload = _parse(resp)
    results = payload.get("result") or []
    if not results:
        return []
    first = results[0]
    if not first.get("success", True):
        raise D1Error(f"D1 statement failed: {first}")
    return list(first.get("results") or [])


def _unwrap_batch(resp: httpx.Response, n: int) -> list[list[dict[str, Any]]]:
    payload = _parse(resp)
    results = payload.get("result") or []
    if len(results) != n:
        raise D1Error(
            f"D1 batch returned {len(results)} results, expected {n}: {payload}"
        )
    out: list[list[dict[str, Any]]] = []
    for i, r in enumerate(results):
        if not r.get("success", True):
            raise D1Error(f"D1 batch statement {i} failed: {r}")
        out.append(list(r.get("results") or []))
    return out


def _parse(resp: httpx.Response) -> dict[str, Any]:
    try:
        payload = resp.json()
    except ValueError as e:
        raise D1Error(f"D1 returned non-JSON ({resp.status_code}): {resp.text[:200]}") from e
    if resp.status_code >= 400 or not payload.get("success", True):
        errors = payload.get("errors") or payload
        raise D1Error(f"D1 HTTP {resp.status_code}: {errors}")
    return payload

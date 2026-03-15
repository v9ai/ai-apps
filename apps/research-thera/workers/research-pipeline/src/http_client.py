"""HTTP client compatible with both Cloudflare Python Workers and native Python.

In Workers (Pyodide), uses the global js.fetch API.
In native Python, falls back to httpx for development/testing.
"""

from __future__ import annotations

import json as _json
from typing import Any
from urllib.parse import urlencode

# Detect Cloudflare Python Workers (Pyodide) environment
_WORKERS = False
try:
    from js import JSON as _JSON, fetch as _js_fetch  # type: ignore[import-not-found]

    _WORKERS = True
except ImportError:
    pass


class Response:
    """Lightweight response wrapper matching the httpx.Response interface we use."""

    __slots__ = ("status_code", "_body", "headers")

    def __init__(
        self, status_code: int, body: str, headers: dict[str, str] | None = None
    ):
        self.status_code = status_code
        self._body = body
        self.headers = headers or {}

    def json(self) -> Any:
        return _json.loads(self._body)

    @property
    def text(self) -> str:
        return self._body

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}: {self._body[:200]}")


class AsyncClient:
    """Drop-in replacement for httpx.AsyncClient."""

    def __init__(self, *, timeout: int | float = 30):
        self._timeout = timeout
        self._httpx = None

    async def __aenter__(self):
        if not _WORKERS:
            import httpx

            self._httpx = httpx.AsyncClient(timeout=self._timeout)
        return self

    async def __aexit__(self, *args):
        if self._httpx:
            await self._httpx.aclose()

    async def get(
        self, url: str, *, headers: dict | None = None, params: dict | None = None
    ) -> Response:
        return await self.request("GET", url, headers=headers, params=params)

    async def post(
        self, url: str, *, headers: dict | None = None, json: Any = None
    ) -> Response:
        return await self.request("POST", url, headers=headers, json=json)

    async def request(
        self,
        method: str,
        url: str,
        *,
        headers: dict | None = None,
        params: dict | None = None,
        json: Any = None,
    ) -> Response:
        if _WORKERS:
            return await self._workers_fetch(
                method, url, headers=headers, params=params, json_body=json
            )
        resp = await self._httpx.request(
            method, url, headers=headers, params=params, json=json
        )
        return Response(resp.status_code, resp.text, dict(resp.headers))

    async def _workers_fetch(
        self,
        method: str,
        url: str,
        *,
        headers: dict | None = None,
        params: dict | None = None,
        json_body: Any = None,
    ) -> Response:
        """HTTP request via the Workers global fetch API."""
        if params:
            url = f"{url}?{urlencode(params, doseq=True)}"

        init: dict[str, Any] = {"method": method}
        merged_headers = dict(headers or {})

        if json_body is not None:
            merged_headers["Content-Type"] = "application/json"
            init["body"] = _json.dumps(json_body)

        if merged_headers:
            init["headers"] = merged_headers

        # Convert Python dict → JS object via JSON round-trip (safest in Pyodide)
        js_init = _JSON.parse(_json.dumps(init))
        resp = await _js_fetch(url, js_init)
        body = await resp.text()

        # Extract response headers we actually use
        resp_headers: dict[str, str] = {}
        try:
            retry = resp.headers.get("retry-after")
            if retry:
                resp_headers["retry-after"] = str(retry)
        except Exception:
            pass

        return Response(resp.status, body, resp_headers)

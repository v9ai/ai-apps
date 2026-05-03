"""Shared GitHub GraphQL POST helper.

Extracted out of ``gh_patterns_graph.GhClient.graphql`` so the paper-author
enrichment graph and the patterns graph share one HTTP path. Both modules
construct their own ``httpx.AsyncClient`` (different timeouts, different
gates) and pass it in here — this module owns the body shape, header build,
status-code → exception mapping, and partial-error policy.

Public API:
    GITHUB_GRAPHQL_URL          — the endpoint
    headers()                   — auth + User-Agent header dict
    post(client, query, variables, *, return_partial_errors=False)
                                  → (data, errors) tuple
    RateLimitError, AuthError, LegalHoldError, NotFoundError, GraphQLError

The ``GhClient.graphql`` adapter in ``gh_patterns_graph`` re-raises these
under its own ``_RateLimitError`` / ``RuntimeError`` types to keep its
existing call sites byte-identical.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx

log = logging.getLogger(__name__)

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
_USER_AGENT = "lead-gen-paper-author-enrichment/1.0"


class GraphQLError(Exception):
    """Base class for typed GitHub GraphQL failures."""


class RateLimitError(GraphQLError):
    def __init__(self, reset_at: str = "unknown") -> None:
        super().__init__(f"rate limited — reset at {reset_at}")
        self.reset_at = reset_at


class AuthError(GraphQLError):
    """HTTP 401 / Bad credentials."""


class LegalHoldError(GraphQLError):
    """HTTP 451."""


class NotFoundError(GraphQLError):
    """GraphQL ``errors[].type == "NOT_FOUND"`` with no usable data."""


def headers() -> dict[str, str]:
    """Build request headers. Reads ``GITHUB_TOKEN`` / ``GH_TOKEN`` env."""
    h = {
        "User-Agent": _USER_AGENT,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    token = (
        os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or ""
    ).strip()
    if token:
        h["Authorization"] = f"bearer {token}"
    return h


async def post(
    client: httpx.AsyncClient,
    query: str,
    variables: dict[str, Any] | None = None,
    *,
    return_partial_errors: bool = False,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """POST a GraphQL query. Returns ``(data, errors)``.

    Raises:
        RateLimitError on HTTP 429/403 with rate-limit headers, or GraphQL
            ``errors[].type`` of RATE_LIMITED.
        AuthError on HTTP 401.
        LegalHoldError on HTTP 451.
        NotFoundError when ``errors`` reports NOT_FOUND and ``data`` is empty.
        GraphQLError on any other 4xx/5xx, or on a fully-empty errored response.
        httpx.HTTPError propagates for transport-level failures.

    When ``return_partial_errors`` is False (default), an errored-but-partial
    response logs a warning and returns the partial data with an empty errors
    list — preserves the legacy ``GhClient.graphql`` behavior. When True, the
    full ``errors`` array is returned alongside the data.
    """
    body: dict[str, Any] = {"query": query}
    if variables:
        body["variables"] = variables

    resp = await client.post(GITHUB_GRAPHQL_URL, json=body, headers=headers())

    if resp.status_code == 401:
        raise AuthError(f"401 unauthorized: {resp.text[:200]}")
    if resp.status_code == 451:
        raise LegalHoldError(f"451 unavailable for legal reasons: {resp.text[:200]}")
    if resp.status_code in (429, 403):
        # Distinguish secondary rate limit from generic 403. The presence of
        # ``x-ratelimit-remaining: 0`` (or any rate-limit reset header) is
        # GitHub's signal that this is throttling, not an auth problem.
        reset = resp.headers.get("x-ratelimit-reset", "unknown")
        if (
            resp.status_code == 429
            or "x-ratelimit-remaining" in resp.headers
            or "retry-after" in resp.headers
        ):
            raise RateLimitError(reset)
        raise GraphQLError(f"403 forbidden: {resp.text[:200]}")
    if resp.status_code >= 400:
        raise GraphQLError(f"HTTP {resp.status_code}: {resp.text[:400]}")

    try:
        raw = resp.json()
    except json.JSONDecodeError as e:
        raise GraphQLError(f"non-JSON response: {e}") from e

    if not isinstance(raw, dict):
        raise GraphQLError(f"unexpected response shape: {type(raw).__name__}")

    data = raw.get("data") or {}
    errors = raw.get("errors") or []

    if errors:
        for err in errors:
            if not isinstance(err, dict):
                continue
            etype = (err.get("type") or "").upper()
            if etype == "RATE_LIMITED":
                raise RateLimitError("graphql_errors")
            if etype == "NOT_FOUND" and not data:
                raise NotFoundError(json.dumps(err)[:200])

        if not data:
            raise GraphQLError(f"GraphQL errors: {json.dumps(errors)[:400]}")

        log.warning("GraphQL partial success: %d errors", len(errors))
        if return_partial_errors:
            return data, errors

    return data, []

"""Shared request-id middleware factory.

Mints / propagates ``x-request-id`` so a single trace can be followed across
the CF dispatcher Worker → core / ml / research sub-Worker Container chain
and (eventually) the LangSmith run that fires from inside a graph.

Single source of truth, parallel to ``leadgen_agent/auth.py``: every binary
that exposes an HTTP surface — ``leadgen_agent/custom_app.py`` (langgraph
dev), ``core/app.py``, ``ml/app.py``, ``research/app.py`` — should
``app.add_middleware(make_request_id_middleware())`` so the four binaries
emit a uniform correlation id.

Behavior:

* If the inbound request carries an ``x-request-id`` header, use it as-is
  (the dispatcher / upstream caller is the source of truth — never overwrite
  a parent trace id).
* Otherwise mint ``uuid4().hex`` so cold log lines still have an id to
  correlate by.
* The id is stashed on ``request.state.request_id`` so handlers can read it
  without re-parsing headers and is echoed back in the response's
  ``x-request-id`` header so a calling Worker can stitch its log line to
  ours.

The implementation is stdlib-only (``uuid``, ``logging``) — no new deps.
"""

from __future__ import annotations

import logging
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Header name kept lower-case to match HTTP/2 wire format. ``Headers`` is
# case-insensitive so callers can still send ``X-Request-Id``.
REQUEST_ID_HEADER = "x-request-id"


def _coerce_request_id(raw: str | None) -> str:
    """Return ``raw`` if it looks like a sane id, else a fresh uuid4 hex.

    Inbound ids are trusted but not blindly forwarded — we cap length and
    strip whitespace so a hostile / buggy upstream cannot inject
    multi-kilobyte log lines via the header. A request id that does not
    survive the sanity check is replaced (not rejected) so observability
    never breaks the request itself.
    """
    if raw is None:
        return uuid.uuid4().hex
    cleaned = raw.strip()
    if not cleaned or len(cleaned) > 128:
        return uuid.uuid4().hex
    return cleaned


def make_request_id_middleware() -> type[BaseHTTPMiddleware]:
    """Return a ``BaseHTTPMiddleware`` class that mints/propagates request ids.

    The class is built fresh on each call so multiple FastAPI apps in the
    same process (tests in particular) don't share mutable state through a
    module-level singleton — mirrors ``make_bearer_token_middleware``'s
    factory shape so the wiring sites look symmetric.
    """

    class _RequestIdMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            incoming = request.headers.get(REQUEST_ID_HEADER)
            request_id = _coerce_request_id(incoming)
            # Stash on request.state so handlers can read it without
            # re-parsing the headers list. Starlette guarantees
            # ``request.state`` is per-request, not shared.
            request.state.request_id = request_id
            try:
                response = await call_next(request)
            except Exception:
                # Surface the request id alongside the unhandled error so
                # the matching log line has a join key against the caller.
                logging.getLogger(__name__).exception(
                    "request failed (request_id=%s path=%s)",
                    request_id,
                    request.url.path,
                )
                raise
            response.headers[REQUEST_ID_HEADER] = request_id
            return response

    _RequestIdMiddleware.__name__ = "RequestIdMiddleware"
    _RequestIdMiddleware.__qualname__ = "RequestIdMiddleware"
    return _RequestIdMiddleware


__all__ = ["REQUEST_ID_HEADER", "make_request_id_middleware"]

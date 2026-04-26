"""Shared bearer-token middleware factory.

Single source of truth for the four runtime sites:

  * ``leadgen_agent/custom_app.py``  — `langgraph dev` (Starlette)
  * ``core/app.py``                  — core FastAPI container
  * ``ml/app.py``                    — ml FastAPI container
  * ``research/app.py``              — research FastAPI container

Each site has its own env var name (``LANGGRAPH_AUTH_TOKEN`` /
``ML_INTERNAL_AUTH_TOKEN`` / ``RESEARCH_INTERNAL_AUTH_TOKEN``) so the dispatcher
Worker can rotate one container's secret without invalidating the others. The
middleware itself is identical: ``secrets.compare_digest`` against the bearer
token, no-op when the env var is unset (local dev), public-path bypass for
liveness probes.

Public paths default to ``/health``, ``/ok``, ``/info`` — the union of what any
site previously bypassed. Sites can pass a narrower set if needed, but keeping
the union here means an uptime monitor that probes ``/health`` works against
every binary.
"""

from __future__ import annotations

import os
import secrets
from typing import Iterable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Union of liveness-probe paths used by every binary. ``/health`` is the
# canonical FastAPI/Cloudflare healthcheck; ``/ok`` and ``/info`` are
# langgraph-cli's boot-loop probes. Keeping this list aligned across all four
# sites means swapping uptime monitors / dispatcher healthchecks doesn't
# require remembering which binary uses which path.
DEFAULT_PUBLIC_PATHS: frozenset[str] = frozenset({"/health", "/ok", "/info"})


def make_bearer_token_middleware(
    env_var: str,
    *,
    public_paths: Iterable[str] = DEFAULT_PUBLIC_PATHS,
) -> type[BaseHTTPMiddleware]:
    """Return a ``BaseHTTPMiddleware`` class that gates on a shared secret.

    The returned class reads ``os.environ[env_var]`` on every request (rather
    than at construction time) so test fixtures that ``monkeypatch.delenv`` can
    flip the gate without rebuilding the FastAPI app.

    Parameters
    ----------
    env_var
        Name of the environment variable holding the expected bearer token.
        When unset or empty, the middleware is a no-op — required for pure
        local dev where no tunnel is in front of the server.
    public_paths
        Paths that bypass the bearer check even when ``env_var`` is set.
        Defaults to ``DEFAULT_PUBLIC_PATHS``.
    """
    paths = frozenset(public_paths)

    class _BearerTokenMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            expected = os.environ.get(env_var)
            if not expected or request.url.path in paths:
                return await call_next(request)
            auth = request.headers.get("authorization", "")
            scheme, _, token = auth.partition(" ")
            if scheme.lower() != "bearer" or not secrets.compare_digest(
                token, expected
            ):
                return JSONResponse(
                    {"detail": "Unauthorized"}, status_code=401
                )
            return await call_next(request)

    _BearerTokenMiddleware.__name__ = "BearerTokenMiddleware"
    _BearerTokenMiddleware.__qualname__ = "BearerTokenMiddleware"
    return _BearerTokenMiddleware

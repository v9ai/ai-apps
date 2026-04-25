"""Shared bearer-token middleware for the three FastAPI containers + langgraph dev.

Before this module, each binary defined its own near-identical
``BearerTokenMiddleware`` class — same parsing, same constant-time compare,
same 401 response — differing only in the env var name and the set of public
paths. Four copies meant any auth-logic change had to land in four places
(token rotation, header logging, CORS) and risked drifting.

The factory below produces a starlette ``BaseHTTPMiddleware`` subclass
parameterised by ``(env_var, public_paths)``. Each binary still adds it via
``app.add_middleware(...)`` — the only difference is one import line and one
factory call instead of a 20-line class.

The middleware:

* No-op when the env var is unset (so local dev keeps working).
* Skips public paths (``/health``, ``/ok``, etc.) so liveness probes don't
  need a credential.
* Constant-time compare via ``secrets.compare_digest`` to defeat timing
  attacks on the shared secret.
* Emits one ``WARNING`` per rejection with method + path + scheme + client
  (X-Forwarded-For takes precedence so proxied IPs surface in logs). Token
  value never logged.
"""

from __future__ import annotations

import logging
import os
import secrets
from typing import Type

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

log = logging.getLogger(__name__)


def bearer_middleware_factory(
    *, env_var: str, public_paths: frozenset[str]
) -> Type[BaseHTTPMiddleware]:
    """Build a ``BaseHTTPMiddleware`` subclass keyed to a specific env var
    and public-path allowlist.

    Returning a class (not an instance) so callers can hand it to
    ``app.add_middleware(...)`` exactly the same way as before — no API
    churn at the binding sites.
    """

    class _BearerTokenMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            expected = os.environ.get(env_var)
            if not expected or request.url.path in public_paths:
                return await call_next(request)
            auth = request.headers.get("authorization", "")
            scheme, _, token = auth.partition(" ")
            if scheme.lower() != "bearer" or not secrets.compare_digest(
                token, expected
            ):
                client = request.headers.get("x-forwarded-for", "") or (
                    request.client.host if request.client else "unknown"
                )
                log.warning(
                    "auth rejected: env=%s path=%s method=%s scheme=%s client=%s",
                    env_var,
                    request.url.path,
                    request.method,
                    scheme.lower() or "<missing>",
                    client,
                )
                return JSONResponse({"detail": "Unauthorized"}, status_code=401)
            return await call_next(request)

    _BearerTokenMiddleware.__name__ = f"BearerTokenMiddleware[{env_var}]"
    return _BearerTokenMiddleware


__all__ = ["bearer_middleware_factory"]

"""Zero-route Starlette app that contributes a bearer-token middleware to langgraph dev.

Wired into the server via ``http.app`` in ``langgraph.json``. The middleware is a
no-op when ``LANGGRAPH_AUTH_TOKEN`` is unset, so pure-local dev keeps working.
When the env var is set (e.g. the server is exposed through a Cloudflare tunnel
to a Vercel-deployed frontend), every non-health request must present
``Authorization: Bearer <token>`` or receive a 401.
"""

from __future__ import annotations

import os

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# Paths that bypass the bearer check so tunnel providers and langgraph's own
# boot loop can probe liveness without a credential.
_PUBLIC_PATHS = frozenset({"/ok", "/info"})


class BearerTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        expected = os.environ.get("LANGGRAPH_AUTH_TOKEN")
        if not expected:
            return await call_next(request)
        if request.url.path in _PUBLIC_PATHS:
            return await call_next(request)

        auth = request.headers.get("authorization", "")
        scheme, _, token = auth.partition(" ")
        if scheme.lower() != "bearer" or token != expected:
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        return await call_next(request)


app = Starlette(middleware=[Middleware(BearerTokenMiddleware)])

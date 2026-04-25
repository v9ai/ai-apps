"""Zero-route Starlette app that contributes a bearer-token middleware to langgraph dev.

Wired into the server via ``http.app`` in ``langgraph.json``. The middleware is a
no-op when ``LANGGRAPH_AUTH_TOKEN`` is unset, so pure-local dev keeps working.
When the env var is set (e.g. the server is exposed through a Cloudflare tunnel
to a Vercel-deployed frontend), every non-health request must present
``Authorization: Bearer <token>`` or receive a 401.

The actual middleware lives in :mod:`leadgen_agent.auth` so all four binaries
(``core``, ``ml``, ``research``, langgraph-dev) share one implementation.
"""

from __future__ import annotations

from starlette.applications import Starlette
from starlette.middleware import Middleware

from leadgen_agent.auth import bearer_middleware_factory

# Paths that bypass the bearer check so tunnel providers and langgraph's own
# boot loop can probe liveness without a credential. ``/health`` matches the
# FastAPI runtime in ``core/app.py`` so HF / Cloudflare healthchecks work
# against either binary.
_PUBLIC_PATHS = frozenset({"/ok", "/info", "/health"})

BearerTokenMiddleware = bearer_middleware_factory(
    env_var="LANGGRAPH_AUTH_TOKEN", public_paths=_PUBLIC_PATHS
)


app = Starlette(middleware=[Middleware(BearerTokenMiddleware)])

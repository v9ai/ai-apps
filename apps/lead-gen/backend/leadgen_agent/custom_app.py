"""Zero-route Starlette app that contributes a bearer-token middleware to langgraph dev.

Wired into the server via ``http.app`` in ``langgraph.json``. The middleware is a
no-op when ``LANGGRAPH_AUTH_TOKEN`` is unset, so pure-local dev keeps working.
When the env var is set (e.g. the server is exposed through a Cloudflare tunnel
to a Vercel-deployed frontend), every non-health request must present
``Authorization: Bearer <token>`` or receive a 401.
"""

from __future__ import annotations

from starlette.applications import Starlette
from starlette.middleware import Middleware

from leadgen_agent.auth import make_bearer_token_middleware

# Single shared factory — see ``leadgen_agent/auth.py`` for the implementation.
# Tests still import ``BearerTokenMiddleware`` from this module, so we keep the
# name exported for backwards compatibility.
BearerTokenMiddleware = make_bearer_token_middleware("LANGGRAPH_AUTH_TOKEN")


app = Starlette(middleware=[Middleware(BearerTokenMiddleware)])

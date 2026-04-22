"""Router unit tests for competitor_loader._pick_strategy.

No real network — all responses come from httpx.MockTransport. The heavy
loaders (Sitemap/Recursive/Chromium/Basic) are never invoked here; only the
routing decision is under test.
"""

from __future__ import annotations

import httpx
import pytest

from leadgen_agent.loaders import _pick_strategy

SPA_BODY = (
    "<!doctype html><html><head><title>x</title></head>"
    '<body><div id="root"></div></body></html>'
)
STATIC_MULTIPAGE_BODY = (
    "<html><body>"
    "<h1>Acme</h1><p>Customer data platform for teams.</p>"
    '<a href="/pricing">Pricing</a> <a href="/features">Features</a>'
    + ("Lorem ipsum dolor sit amet consectetur. " * 30)
    + "</body></html>"
)
STATIC_SINGLEPAGE_BODY = (
    "<html><body>"
    "<h1>Widget</h1><p>One-page marketing site, no pricing route.</p>"
    + ("This is a description of our product. " * 40)
    + "</body></html>"
)
MINIMAL_BODY = "<html><body>tiny</body></html>"


def _transport(routes: dict[tuple[str, str], httpx.Response]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        key = (request.method, str(request.url))
        if key in routes:
            return routes[key]
        return httpx.Response(404)

    return httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_sitemap_wins_when_sitemap_head_200():
    routes = {
        ("HEAD", "https://example.com/sitemap.xml"): httpx.Response(200),
    }
    async with httpx.AsyncClient(transport=_transport(routes)) as client:
        strategy, _ = await _pick_strategy(client, "https://example.com")
    assert strategy == "sitemap"


@pytest.mark.asyncio
async def test_chromium_for_spa_with_empty_body():
    routes = {
        ("HEAD", "https://spa.example/sitemap.xml"): httpx.Response(404),
        ("GET", "https://spa.example"): httpx.Response(200, text=SPA_BODY),
    }
    async with httpx.AsyncClient(transport=_transport(routes)) as client:
        strategy, _ = await _pick_strategy(client, "https://spa.example")
    assert strategy == "chromium"


@pytest.mark.asyncio
async def test_chromium_for_tiny_body():
    routes = {
        ("HEAD", "https://tiny.example/sitemap.xml"): httpx.Response(404),
        ("GET", "https://tiny.example"): httpx.Response(200, text=MINIMAL_BODY),
    }
    async with httpx.AsyncClient(transport=_transport(routes)) as client:
        strategy, _ = await _pick_strategy(client, "https://tiny.example")
    assert strategy == "chromium"


@pytest.mark.asyncio
async def test_basic_when_homepage_exposes_hot_list_links():
    routes = {
        ("HEAD", "https://acme.example/sitemap.xml"): httpx.Response(404),
        ("GET", "https://acme.example"): httpx.Response(200, text=STATIC_MULTIPAGE_BODY),
    }
    async with httpx.AsyncClient(transport=_transport(routes)) as client:
        strategy, body = await _pick_strategy(client, "https://acme.example")
    assert strategy == "basic"
    assert body is not None and "pricing" in body.lower()


@pytest.mark.asyncio
async def test_recursive_when_no_sitemap_and_no_hot_links():
    routes = {
        ("HEAD", "https://widget.example/sitemap.xml"): httpx.Response(404),
        ("GET", "https://widget.example"): httpx.Response(200, text=STATIC_SINGLEPAGE_BODY),
    }
    async with httpx.AsyncClient(transport=_transport(routes)) as client:
        strategy, _ = await _pick_strategy(client, "https://widget.example")
    assert strategy == "recursive"

"""End-to-end webhook integration test: Python-signs -> TypeScript-verifies round-trip.

The TS webhook handler in the Next.js app recomputes HMAC-SHA256(secret, raw_body)
and rejects any mismatch. A whitespace change in ``json.dumps`` (indent, sort_keys,
separators) on the Python side silently breaks verification without changing the
decoded payload. This test pins the exact bytes by running a real HTTP listener
and re-deriving the signature in-test, so any such drift fails here.

The e2e case is gated on ``RUN_WEBHOOK_E2E=1`` because it binds a TCP port. The
``_scrub`` unit test always runs — it is pure and fast.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import pytest

from leadgen_agent.notify import _scrub, notify_complete


# ── 1. _scrub unit (always runs) ────────────────────────────────────────

def test_scrub_recursively_strips_private_keys() -> None:
    cleaned = _scrub(
        {
            "foo": "x",
            "webhook_secret": "s",
            "nested": {"tenant_id": "t", "keep": 1},
        }
    )
    assert cleaned == {"foo": "x", "nested": {"keep": 1}}
    # Private keys must not appear anywhere in the tree.
    assert "webhook_secret" not in cleaned
    assert "tenant_id" not in cleaned["nested"]


# ── 2. Full round-trip (opt-in) ─────────────────────────────────────────

e2e_required = pytest.mark.skipif(
    os.environ.get("RUN_WEBHOOK_E2E") != "1",
    reason="set RUN_WEBHOOK_E2E=1 to run the webhook round-trip (binds a TCP port)",
)


class _CaptureHandler(BaseHTTPRequestHandler):
    """Request handler that stashes body + headers on the server instance."""

    def do_POST(self) -> None:  # noqa: N802 — required name
        length = int(self.headers.get("content-length", "0"))
        body = self.rfile.read(length) if length else b""
        self.server.captured_body = body  # type: ignore[attr-defined]
        self.server.captured_headers = dict(self.headers.items())  # type: ignore[attr-defined]
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')

    def log_message(self, *_args: Any, **_kwargs: Any) -> None:  # pragma: no cover
        # Silence default stderr access-log spam in pytest output.
        return


def _sample_pricing() -> dict[str, Any]:
    # Minimum valid PricingStrategy shape (mirrors test_pricing_graph fixture).
    return {
        "model": {
            "value_metric": "per verified lead",
            "model_type": "hybrid",
            "free_offer": None,
            "tiers": [
                {
                    "name": "Starter",
                    "price_monthly_usd": 49,
                    "billing_unit": "flat",
                    "target_persona": "solo founder",
                    "included": ["500 leads/mo"],
                    "limits": [],
                    "upgrade_trigger": "needs > 500 leads",
                },
                {
                    "name": "Team",
                    "price_monthly_usd": 249,
                    "billing_unit": "per_seat",
                    "target_persona": "growth lead",
                    "included": ["5 seats"],
                    "limits": [],
                    "upgrade_trigger": "needs API",
                },
            ],
            "addons": [],
            "discounting_strategy": "20% annual prepay",
        },
        "rationale": {
            "value_basis": "Saves ~15 min/lead.",
            "competitor_benchmark": "Median $99-199/mo.",
            "wtp_estimate": "$50-300/mo solo.",
            "risks": ["Race to bottom on per-lead price."],
            "recommendation": "Ship Starter + Team.",
        },
    }


@e2e_required
@pytest.mark.asyncio
async def test_notify_complete_posts_signed_payload() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), _CaptureHandler)
    server.captured_body = None  # type: ignore[attr-defined]
    server.captured_headers = None  # type: ignore[attr-defined]
    host, port = server.server_address[0], server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        secret = "test-shared-secret-xyz"
        app_run_id = "run_abc123"
        pricing = _sample_pricing()
        state = {
            "webhook_url": f"http://{host}:{port}/webhook",
            "webhook_secret": secret,
            "app_run_id": app_run_id,
            "pricing": pricing,
        }

        await notify_complete(state)

        body = server.captured_body  # type: ignore[attr-defined]
        headers = server.captured_headers  # type: ignore[attr-defined]
        assert body is not None, "webhook listener never received a POST"
        assert headers is not None

        # Case-insensitive header lookup — BaseHTTPRequestHandler preserves case
        # from the wire; httpx sends lowercase, but don't depend on that.
        lower = {k.lower(): v for k, v in headers.items()}
        assert "x-app-signature" in lower
        assert "x-app-run-id" in lower
        assert lower["x-app-run-id"] == app_run_id

        # Re-derive the signature exactly the way the TS handler does.
        expected_sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        assert hmac.compare_digest(lower["x-app-signature"], expected_sig), (
            "signature mismatch — Python-side body bytes drifted from what the "
            "TS verifier expects (likely a json.dumps formatting change)"
        )

        # Payload shape must match the TS webhook contract.
        decoded = json.loads(body)
        assert decoded.get("status") == "success"
        assert decoded.get("output", {}).get("pricing") == pricing
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

#!/usr/bin/env python3
"""Standalone eval for the CF-native Mistral LoRA Worker.

POSTs the first 5 rows from ``../data/outreach-email/resend.jsonl`` to a
deployed ``/v1/chat/completions`` endpoint and validates the returned body
parses as JSON with non-empty ``subject`` and ``body`` fields.

Dependency-free on purpose: stdlib only, runs without the venv. Does not
import the ``openai`` SDK or ``requests`` — just ``urllib.request`` + ``json``.

Usage:
    python3 eval_worker.py --worker-url https://<host>/v1 --secret <token>

Exits 0 iff all 5 samples returned valid JSON with non-empty subject + body.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "outreach-email" / "resend.jsonl"
N_SAMPLES = 5
REQUEST_TIMEOUT_S = 120


def _strip_fences(text: str) -> str:
    """Strip ```json ... ``` (or plain ```) fences — mirrors backend/llm.py."""
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        t = "\n".join(lines).strip()
    return t


def _extract_first_json_object(text: str) -> str | None:
    """Grab the first brace-balanced span. Matches backend/llm.py._extract_json_block."""
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    in_str = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def parse_email_json(text: str) -> dict | None:
    """Try strict parse → fenced-strip → balanced-brace extraction. Returns None
    if none of those recover a JSON object."""
    candidates = [text.strip(), _strip_fences(text)]
    for c in candidates:
        try:
            v = json.loads(c)
            if isinstance(v, dict):
                return v
        except json.JSONDecodeError:
            pass
    block = _extract_first_json_object(text)
    if block:
        try:
            v = json.loads(block)
            if isinstance(v, dict):
                return v
        except json.JSONDecodeError:
            return None
    return None


def load_samples(path: Path, n: int) -> list[dict]:
    """Read the first ``n`` JSONL rows, stripping the assistant target message
    so the LLM has to generate it fresh."""
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            msgs = row.get("messages") or []
            prompt_msgs = [m for m in msgs if m.get("role") != "assistant"]
            if not prompt_msgs:
                continue
            rows.append({"messages": prompt_msgs, "target": next((m for m in msgs if m.get("role") == "assistant"), None)})
            if len(rows) >= n:
                break
    return rows


def call_worker(base_url: str, secret: str, messages: list[dict]) -> str:
    """POST chat/completions, return the assistant content string."""
    url = base_url.rstrip("/") + "/chat/completions"
    payload = json.dumps(
        {"model": "mistral-email-lora", "messages": messages, "max_tokens": 400, "temperature": 0.2}
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "content-type": "application/json",
            "authorization": f"Bearer {secret}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_S) as resp:
        body = resp.read().decode("utf-8")
    data = json.loads(body)
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError(f"no choices in response: {body[:300]}")
    return choices[0].get("message", {}).get("content", "") or ""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--worker-url", required=True, help="Base URL ending in /v1, e.g. https://host.workers.dev/v1")
    ap.add_argument("--secret", required=True, help="Shared secret (Authorization: Bearer ...)")
    ap.add_argument("--data", default=str(DATA_PATH), help=f"JSONL path (default: {DATA_PATH})")
    ap.add_argument("-n", "--samples", type=int, default=N_SAMPLES)
    args = ap.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        print(f"ERROR: data file not found: {data_path}", file=sys.stderr)
        return 1

    samples = load_samples(data_path, args.samples)
    if not samples:
        print(f"ERROR: no samples loaded from {data_path}", file=sys.stderr)
        return 1

    n_valid_json = 0
    n_subject = 0
    n_body = 0
    total = len(samples)

    for i, sample in enumerate(samples, 1):
        print(f"\n── sample {i}/{total} ──────────────────────────────")
        user_prompt = next((m["content"] for m in sample["messages"] if m.get("role") == "user"), "")
        print(f"user: {user_prompt[:200]}{'...' if len(user_prompt) > 200 else ''}")
        try:
            content = call_worker(args.worker_url, args.secret, sample["messages"])
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError, json.JSONDecodeError) as e:
            print(f"  REQUEST FAILED: {e}")
            continue

        print(f"raw response:\n{content}\n")

        parsed = parse_email_json(content)
        if parsed is None:
            print("  invalid JSON")
            continue
        n_valid_json += 1

        subject = parsed.get("subject")
        body = parsed.get("body")
        subj_ok = isinstance(subject, str) and subject.strip() != ""
        body_ok = isinstance(body, str) and body.strip() != ""
        if subj_ok:
            n_subject += 1
        if body_ok:
            n_body += 1
        print(f"  parsed: subject={'OK' if subj_ok else 'MISSING'}, body={'OK' if body_ok else 'MISSING'}")
        if subj_ok:
            print(f"    subject: {subject[:120]}")
        if body_ok:
            preview = re.sub(r"\s+", " ", body)[:160]
            print(f"    body: {preview}")

    print("\n── summary ─────────────────────────────────────")
    print(f"{n_valid_json}/{total} valid JSON")
    print(f"{n_subject}/{total} non-empty subject")
    print(f"{n_body}/{total} non-empty body")

    if n_valid_json == total and n_subject == total and n_body == total:
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())

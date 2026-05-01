"""Deep-scrape graph — Crawl4AI deep crawl for a single company.

Wraps ``consultancies/scrape_crawl4ai.py`` as a LangGraph node that runs the
script in a subprocess. The script itself (Playwright + Crawl4AI) is kept
outside the backend image because it bloats the container to ~1 GB and does
not run on HF Spaces / CF Workers; this graph exists so LangGraph can still
trigger deep crawls in local / dev runs.

Flow: resolve → run_script → (script writes Neon; graph just parses the JSON)

Environment:
    DEEP_SCRAPE_PY      Python interpreter path. Defaults to
                        ``consultancies/.venv-crawl/bin/python`` relative to
                        the repo root (resolved from this file's location).
    DEEP_SCRAPE_SCRIPT  Script path. Defaults to
                        ``consultancies/scrape_crawl4ai.py``.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .state import DeepScrapeState


_REPO_ROOT = Path(__file__).resolve().parents[2]


def _resolve_script_paths() -> tuple[str, str]:
    default_py = _REPO_ROOT / "consultancies" / ".venv-crawl" / "bin" / "python"
    default_script = _REPO_ROOT / "consultancies" / "scrape_crawl4ai.py"
    py = os.environ.get("DEEP_SCRAPE_PY") or str(default_py)
    script = os.environ.get("DEEP_SCRAPE_SCRIPT") or str(default_script)
    return py, script


# ── Node 1: resolve ───────────────────────────────────────────────────────────

async def resolve(state: DeepScrapeState) -> dict:
    if state.get("_error"):
        return {}

    explicit_url = (state.get("url") or "").strip()
    company_id = state.get("company_id")

    if explicit_url:
        parsed = urlparse(explicit_url if "://" in explicit_url else f"https://{explicit_url}")
        if not parsed.netloc:
            return {"_error": f"resolve: invalid url {explicit_url!r}"}
        return {"target_url": f"{parsed.scheme or 'https'}://{parsed.netloc}{parsed.path or '/'}"}

    if company_id is None:
        return {"_error": "resolve: one of {company_id, url} is required"}

    sql = "SELECT canonical_domain, website FROM companies WHERE id = %s LIMIT 1"
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (int(company_id),))
                row = cur.fetchone()
    except psycopg.Error as e:
        return {"_error": f"resolve: {e}"}

    if not row:
        return {"_error": f"resolve: company id {company_id} not found"}

    canonical_domain, website = row
    if website:
        return {"target_url": website}
    if canonical_domain:
        return {"target_url": f"https://{canonical_domain}"}
    return {"_error": f"resolve: company {company_id} has no website or canonical_domain"}


# ── Node 2: run_script ────────────────────────────────────────────────────────

_JSON_BLOCK_RE = re.compile(r"\{[\s\S]*\}\s*\Z")


async def run_script(state: DeepScrapeState) -> dict:
    if state.get("_error"):
        return {}

    py, script = _resolve_script_paths()
    if not Path(py).exists():
        return {"_error": f"run_script: python interpreter not found at {py}"}
    if not Path(script).exists():
        return {"_error": f"run_script: script not found at {script}"}

    args = [py, script, state["target_url"], "--json",
            "--pages", str(state.get("max_pages") or 15),
            "--depth", str(state.get("max_depth") or 2),
            "--provider", state.get("provider") or "anthropic/claude-sonnet-4-6"]

    if state.get("company_id") is not None:
        args.extend(["--id", str(state["company_id"])])
    if state.get("dry_run"):
        args.append("--dry-run")

    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(Path(script).parent),
    )
    stdout_b, stderr_b = await proc.communicate()
    stdout = stdout_b.decode(errors="replace")
    stderr = stderr_b.decode(errors="replace")

    if proc.returncode != 0:
        return {
            "_error": f"run_script: exit {proc.returncode}",
            "script_exit_code": int(proc.returncode or 0),
            "stderr_tail": stderr[-2000:],
        }

    match = _JSON_BLOCK_RE.search(stdout.strip())
    if not match:
        return {
            "_error": "run_script: no JSON payload in stdout",
            "script_exit_code": 0,
            "stderr_tail": stderr[-2000:],
        }

    try:
        payload = json.loads(match.group())
    except json.JSONDecodeError as e:
        return {
            "_error": f"run_script: JSON parse failed: {e}",
            "script_exit_code": 0,
            "stderr_tail": stderr[-2000:],
        }

    return {
        "script_exit_code": 0,
        "stderr_tail": stderr[-2000:],
        "domain": payload.get("domain") or "",
        "url": payload.get("url") or state.get("target_url") or "",
        "pages_crawled": int(payload.get("pages_crawled") or 0),
        "pages": list(payload.get("pages") or []),
        "emails": list(payload.get("emails") or []),
        "has_careers": bool(payload.get("has_careers")),
        "has_pricing": bool(payload.get("has_pricing")),
        "enrichment": payload.get("enrichment") or {},
        "score": float(payload.get("score") or 0.0),
        "score_reasons": list(payload.get("score_reasons") or []),
        "graph_meta": {"graph": "deep_scrape", "version": "v1"},
    }


# ── Build graph ───────────────────────────────────────────────────────────────

def _build() -> Any:
    g = StateGraph(DeepScrapeState)
    g.add_node("resolve", resolve)
    g.add_node("run_script", run_script)
    g.add_edge(START, "resolve")
    g.add_edge("resolve", "run_script")
    g.add_edge("run_script", END)
    return g.compile()


graph = _build()

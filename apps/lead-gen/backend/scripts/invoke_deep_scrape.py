"""One-shot CLI: run the `deep_scrape` LangGraph graph against a URL or company_id.

Usage (from backend/):
    uv run python scripts/invoke_deep_scrape.py https://www.aiacquisition.com/
    uv run python scripts/invoke_deep_scrape.py 40878 --pages 20 --depth 3
    uv run python scripts/invoke_deep_scrape.py 40878 --dry-run --json

Reads NEON_DATABASE_URL and ANTHROPIC_API_KEY from the project .env.local file.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

# ── Load env vars ─────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[2]  # apps/lead-gen/
_env_local = _ROOT / ".env.local"
_env_backend = Path(__file__).resolve().parents[1] / ".env"

for _envfile in (_env_backend, _env_local):  # backend .env first, then override
    if _envfile.exists():
        for line in _envfile.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v

# ── Import graph (after env is set) ───────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from leadgen_agent.deep_scrape_graph import graph  # noqa: E402


def _parse_target(target: str) -> tuple[int | None, str | None]:
    """Return (company_id, url). Exactly one is non-None."""
    t = target.strip()
    if t.isdigit():
        return int(t), None
    return None, t


def _print_summary(result: dict) -> None:
    err = result.get("_error") or ""
    if err:
        print(f"ERROR: {err}", file=sys.stderr)
        tail = (result.get("stderr_tail") or "").strip()
        if tail:
            print("--- subprocess stderr (tail) ---", file=sys.stderr)
            print(tail, file=sys.stderr)
        return

    enrichment = result.get("enrichment") or {}
    emails = result.get("emails") or []
    print("=" * 70)
    print(f"  deep_scrape — {result.get('domain') or result.get('target_url') or '?'}")
    print(
        f"  pages={result.get('pages_crawled', 0)} | "
        f"emails={len(emails)} | "
        f"careers={'Y' if result.get('has_careers') else 'N'} | "
        f"pricing={'Y' if result.get('has_pricing') else 'N'}"
    )
    print("-" * 70)
    print(f"  category: {enrichment.get('category', '?')}")
    print(f"  ai_tier:  {enrichment.get('ai_tier', '?')}")
    print(f"  score:    {result.get('score', 0):.3f}")
    summary = enrichment.get("one_line_summary")
    if summary:
        print(f"  summary:  {summary}")
    if enrichment.get("services"):
        print(f"  services: {', '.join(enrichment['services'][:5])}")
    if enrichment.get("tech_stack"):
        print(f"  tech:     {', '.join(enrichment['tech_stack'][:5])}")
    if emails:
        print(f"  emails:   {', '.join(emails[:5])}")
    print("=" * 70)


async def _run(payload: dict) -> dict:
    return await graph.ainvoke(payload)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Invoke the deep_scrape LangGraph graph from the terminal.",
    )
    parser.add_argument("target", help="URL (https://...) or integer company_id")
    parser.add_argument("--pages", type=int, default=15, help="Max pages to crawl (default: 15)")
    parser.add_argument("--depth", type=int, default=2, help="Max crawl depth (default: 2)")
    parser.add_argument(
        "--provider",
        default="anthropic/claude-sonnet-4-6",
        help="LLM provider (default: anthropic/claude-sonnet-4-6)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Skip Neon writes")
    parser.add_argument("--json", action="store_true", help="Emit full graph output as JSON")
    args = parser.parse_args()

    company_id, url = _parse_target(args.target)
    payload: dict = {
        "max_pages": args.pages,
        "max_depth": args.depth,
        "provider": args.provider,
        "dry_run": args.dry_run,
    }
    if company_id is not None:
        payload["company_id"] = company_id
    if url is not None:
        payload["url"] = url

    result = asyncio.run(_run(payload))

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    else:
        _print_summary(result)

    return 1 if result.get("_error") else 0


if __name__ == "__main__":
    sys.exit(main())

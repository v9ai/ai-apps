"""CLI for the Common Crawl seed / fetch / backfill pipeline.

Usage (from ``backend/``)::

    python -m backend.scripts.common_crawl_cli seed <domain> [--limit 50]
    python -m backend.scripts.common_crawl_cli fetch <domain> [--pages 15] [--dry-run]
    python -m backend.scripts.common_crawl_cli backfill [--limit 500]
                                                        [--pages-per-domain 15]
                                                        [--dry-run]

Environment: requires ``NEON_DATABASE_URL`` (or ``DATABASE_URL``) for
``fetch`` / ``backfill``. Loads ``backend/.env`` and the monorepo-root
``.env.local`` on startup, mirroring ``scripts/backfill_embeddings.py``.

# Requires: httpx, warcio, beautifulsoup4, psycopg
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = Path(__file__).resolve().parents[2]

_env_backend = _BACKEND_ROOT / ".env"
_env_local = _REPO_ROOT / ".env.local"

for _envfile in (_env_backend, _env_local):
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

# Make the backend package importable whether invoked as a module
# (``python -m backend.scripts.common_crawl_cli ...``) or directly.
sys.path.insert(0, str(_BACKEND_ROOT))

from leadgen_agent.common_crawl_graph import (  # noqa: E402
    backfill_domains,
    fetch_domain,
    page_score,
    seed_domain,
)

log = logging.getLogger("common_crawl_cli")


def _configure_logging() -> None:
    level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )


async def _cmd_seed(args: argparse.Namespace) -> int:
    crawl_id, records = await seed_domain(args.domain, args.limit)
    sys.stdout.write(f"crawl_id={crawl_id}  total={len(records)}\n")
    for r in records:
        sys.stdout.write(
            f"  score={page_score(r.url):.1f}  ts={r.timestamp}  {r.url}\n"
        )
    sys.stdout.flush()
    return 0


async def _cmd_fetch(args: argparse.Namespace) -> int:
    stats = await fetch_domain(args.domain, args.pages, args.dry_run)
    sys.stdout.write(
        f"{stats.domain}: {stats.pages_fetched} pages, "
        f"{stats.persons_found} persons, "
        f"{stats.contacts_upserted} contacts upserted, "
        f"{stats.snapshots_written} snapshots\n"
    )
    sys.stdout.flush()
    return 0


async def _cmd_backfill(args: argparse.Namespace) -> int:
    domains, total_pages, total_contacts = await backfill_domains(
        limit=args.limit,
        pages_per_domain=args.pages_per_domain,
        dry_run=args.dry_run,
    )
    sys.stdout.write(
        f"backfill: {domains} domains, "
        f"{total_pages} total pages, "
        f"{total_contacts} total contacts\n"
    )
    sys.stdout.flush()
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="common-crawl",
        description="Seed company discovery from Common Crawl (CDX + WARC → Neon)",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_seed = sub.add_parser(
        "seed",
        help="Print CDX records for a domain without DB writes",
    )
    p_seed.add_argument("domain")
    p_seed.add_argument("--limit", type=int, default=50)

    p_fetch = sub.add_parser(
        "fetch",
        help="Fetch WARC snapshots, extract contacts, write to Neon",
    )
    p_fetch.add_argument("domain")
    p_fetch.add_argument("--pages", type=int, default=15)
    p_fetch.add_argument("--dry-run", action="store_true")

    p_backfill = sub.add_parser(
        "backfill",
        help="Process all companies in Neon that have no last_seen_crawl_id",
    )
    p_backfill.add_argument("--limit", type=int, default=500)
    p_backfill.add_argument("--pages-per-domain", type=int, default=15)
    p_backfill.add_argument("--dry-run", action="store_true")

    return parser


async def _amain(argv: list[str] | None = None) -> int:
    _configure_logging()
    args = _build_parser().parse_args(argv)
    if args.cmd == "seed":
        return await _cmd_seed(args)
    if args.cmd == "fetch":
        return await _cmd_fetch(args)
    if args.cmd == "backfill":
        return await _cmd_backfill(args)
    return 1


def main(argv: list[str] | None = None) -> int:
    return asyncio.run(_amain(argv))


if __name__ == "__main__":
    raise SystemExit(main())

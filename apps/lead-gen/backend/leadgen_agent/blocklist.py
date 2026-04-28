"""Domain blocklist backed by Neon (``blocked_domains`` table).

Ports the small ``teams::state::Blocklist`` helper that used to live in
``crates/metal/src/teams/state.rs``. The Rust implementation persisted to a
flat ``data/blocklist.txt`` file; this module persists to a Postgres table
instead so the blocklist is shared with Next.js resolvers / other tooling.

Table is created on-demand (``ensure_table``) — no migration needed for the
port. Columns:

    domain      TEXT PRIMARY KEY        -- lowercased, canonical form
    reason      TEXT                    -- optional free-text
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

Keep the surface area small and synchronous: these calls are rare (CLI
``block add`` / ``block remove`` / ``block list``) and a single psycopg
connection per call keeps the code obvious.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass

import psycopg

log = logging.getLogger(__name__)

_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS blocked_domains (
    domain     TEXT PRIMARY KEY,
    reason     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"""


def _dsn() -> str:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not dsn:
        raise RuntimeError(
            "Neither NEON_DATABASE_URL nor DATABASE_URL is set — cannot use blocklist."
        )
    return dsn


# Single anchored pass strips both scheme and www. — the previous
# `^https?://|^www\.` regex only matched one alternative because `^`
# is evaluated against the original string, not the post-replacement
# offset, so `https://www.foo` became `www.foo` instead of `foo`.
_DOMAIN_CLEAN = re.compile(r"^(?:https?://)?(?:www\.)?")


def canonicalize_domain(raw: str) -> str:
    """Strip scheme / www / trailing path, lowercase."""
    d = (raw or "").strip().lower()
    d = _DOMAIN_CLEAN.sub("", d, count=1)
    d = d.split("/")[0].split("?")[0].strip(".")
    return d


@dataclass
class BlockedDomain:
    domain: str
    reason: str | None
    created_at: str


def ensure_table() -> None:
    """Create ``blocked_domains`` if it doesn't already exist. Idempotent."""
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(_TABLE_DDL)


def add(domain: str, *, reason: str | None = None) -> bool:
    """Add ``domain`` to the blocklist. Returns True on insert, False if it
    was already present."""
    d = canonicalize_domain(domain)
    if not d:
        raise ValueError("empty domain")
    ensure_table()
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO blocked_domains (domain, reason) VALUES (%s, %s) "
                "ON CONFLICT (domain) DO NOTHING",
                (d, reason),
            )
            inserted = cur.rowcount or 0
    return inserted > 0


def remove(domain: str) -> bool:
    """Remove ``domain`` from the blocklist. Returns True if a row was
    deleted, False if the domain was not blocked."""
    d = canonicalize_domain(domain)
    if not d:
        return False
    ensure_table()
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM blocked_domains WHERE domain = %s", (d,))
            deleted = cur.rowcount or 0
    return deleted > 0


def list_all() -> list[BlockedDomain]:
    """Return the full blocklist, sorted by domain ascending."""
    ensure_table()
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT domain, reason, created_at FROM blocked_domains "
                "ORDER BY domain ASC"
            )
            rows = cur.fetchall()
    return [
        BlockedDomain(
            domain=r[0],
            reason=r[1],
            created_at=r[2].isoformat() if r[2] else "",
        )
        for r in rows
    ]


def contains(domain: str) -> bool:
    """Fast membership check for pipeline filtering."""
    d = canonicalize_domain(domain)
    if not d:
        return False
    ensure_table()
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM blocked_domains WHERE domain = %s LIMIT 1", (d,))
            return cur.fetchone() is not None


def count() -> int:
    ensure_table()
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM blocked_domains")
            row = cur.fetchone()
            return int(row[0]) if row else 0

"""Sync contacts, posts, and jobs from Neon/Rust LanceDB into the vectordb."""

from __future__ import annotations

import json
import re
import time

import lancedb

from src.db.connection import get_connection

from .config import LANCE_DB_PATH, LANCE_LINKEDIN_PATH
from .embedder import embed_texts
from .schemas import SyncResult

# ---------------------------------------------------------------------------
# Contact embedding text construction
# ---------------------------------------------------------------------------

CONTACTS_SQL = """\
SELECT c.id, c.first_name, c.last_name, c.position, c.company,
       c.email, c.linkedin_url, c.email_verified, c.tags,
       c.company_id, c.do_not_contact, c.updated_at,
       co.ai_tier, co.category AS company_category,
       co.industry AS company_industry,
       co.description AS company_description
FROM contacts c
LEFT JOIN companies co ON c.company_id = co.id
WHERE c.do_not_contact = false
  AND c.position IS NOT NULL AND c.position != ''
ORDER BY c.id
"""

CONTACTS_INCREMENTAL_SQL = """\
SELECT c.id, c.first_name, c.last_name, c.position, c.company,
       c.email, c.linkedin_url, c.email_verified, c.tags,
       c.company_id, c.do_not_contact, c.updated_at,
       co.ai_tier, co.category AS company_category,
       co.industry AS company_industry,
       co.description AS company_description
FROM contacts c
LEFT JOIN companies co ON c.company_id = co.id
WHERE c.do_not_contact = false
  AND c.position IS NOT NULL AND c.position != ''
  AND c.updated_at > %s
ORDER BY c.id
"""


def _parse_tags(tags_raw: str | None) -> tuple[str, str, str]:
    """Extract contact_type, focus_areas, regions from tags JSON string."""
    if not tags_raw:
        return "other", "", ""

    try:
        tags = json.loads(tags_raw) if isinstance(tags_raw, str) else tags_raw
    except (json.JSONDecodeError, TypeError):
        return "other", "", ""

    if not isinstance(tags, list):
        return "other", "", ""

    contact_type = "other"
    focus_areas: list[str] = []
    regions: list[str] = []

    for tag in tags:
        if not isinstance(tag, str):
            continue
        if tag in ("recruiter", "hiring_manager", "founder", "talent_partner"):
            contact_type = tag
        elif tag.startswith("focus:"):
            focus_areas.append(tag.split(":", 1)[1])
        elif tag.startswith("region:"):
            regions.append(tag.split(":", 1)[1])

    return contact_type, ", ".join(focus_areas), ", ".join(regions)


def _build_contact_embedding_text(row: dict) -> str:
    """Build rich embedding text from a contact + company join row."""
    parts: list[str] = []

    # Core identity
    position = row.get("position") or "Unknown role"
    company = row.get("company") or "Unknown company"
    parts.append(f"{position} at {company}")

    # Tags-derived metadata
    contact_type, focus_areas, regions = _parse_tags(row.get("tags"))
    if contact_type != "other":
        parts.append(contact_type.replace("_", " "))
    if focus_areas:
        parts.append(f"Focus: {focus_areas}")
    if regions:
        parts.append(f"Regions: {regions}")

    # Company enrichment
    cat = row.get("company_category")
    if cat and cat != "UNKNOWN":
        parts.append(f"Company type: {cat}")

    ai_tier = row.get("ai_tier") or 0
    if ai_tier >= 1:
        parts.append(f"AI tier {ai_tier}")

    industry = row.get("company_industry")
    if industry:
        parts.append(industry)

    desc = row.get("company_description")
    if desc:
        parts.append(desc[:200])

    return ". ".join(parts)


def _contact_row_to_record(row: dict, vector: list[float], embedding_text: str) -> dict:
    """Convert a DB row + vector into a LanceDB record."""
    contact_type, focus_areas, regions = _parse_tags(row.get("tags"))
    return {
        "neon_id": row["id"],
        "first_name": row.get("first_name", ""),
        "last_name": row.get("last_name", ""),
        "position": row.get("position", ""),
        "company": row.get("company", ""),
        "email": row.get("email") or "",
        "email_verified": bool(row.get("email_verified")),
        "linkedin_url": row.get("linkedin_url") or "",
        "tags": row.get("tags") or "[]",
        "contact_type": contact_type,
        "focus_areas": focus_areas,
        "regions": regions,
        "company_category": row.get("company_category") or "",
        "ai_tier": int(row.get("ai_tier") or 0),
        "neon_updated_at": row.get("updated_at") or "",
        "embedding_text": embedding_text,
        "vector": vector,
    }


# ---------------------------------------------------------------------------
# sync_contacts
# ---------------------------------------------------------------------------


def sync_contacts(full: bool = False) -> SyncResult:
    """Sync contacts from Neon PostgreSQL to LanceDB with MLX embeddings.

    Args:
        full: If True, overwrite entire table. If False, incremental update.
    """
    db = lancedb.connect(LANCE_DB_PATH)

    needs_full = full or "contacts" not in db.table_names()

    conn = get_connection()
    try:
        if needs_full:
            return _sync_contacts_full(db, conn)
        else:
            return _sync_contacts_incremental(db, conn)
    finally:
        conn.close()


def _sync_contacts_full(db: lancedb.DBConnection, conn) -> SyncResult:
    """Full sync: fetch all, embed, overwrite table."""
    print("Fetching all contacts from Neon...")
    with conn.cursor() as cur:
        cur.execute(CONTACTS_SQL)
        rows = cur.fetchall()

    if not rows:
        print("No contacts found.")
        return SyncResult(table="contacts", total_rows=0, synced=0, mode="full")

    print(f"Fetched {len(rows)} contacts. Building embedding texts...")
    texts = [_build_contact_embedding_text(dict(r)) for r in rows]

    print(f"Embedding {len(texts)} contacts on Metal GPU...")
    t0 = time.time()
    vectors = embed_texts(texts)
    elapsed = time.time() - t0
    print(f"Embedded in {elapsed:.1f}s ({len(texts) / elapsed:.0f}/sec)")

    records = [
        _contact_row_to_record(dict(r), vectors[i].tolist(), texts[i])
        for i, r in enumerate(rows)
    ]

    tbl = db.create_table("contacts", records, mode="overwrite")

    # Create FTS indexes
    try:
        tbl.create_fts_index("embedding_text", replace=True)
        tbl.create_fts_index("focus_areas", replace=True)
        tbl.create_fts_index("regions", replace=True)
    except Exception as e:
        print(f"  FTS index warning: {e}")

    total = tbl.count_rows()
    print(f"Full sync complete: {total} contacts in LanceDB")
    return SyncResult(table="contacts", total_rows=total, synced=len(records), mode="full")


def _sync_contacts_incremental(db: lancedb.DBConnection, conn) -> SyncResult:
    """Incremental sync: fetch only updated contacts, re-embed, upsert."""
    tbl = db.open_table("contacts")

    # Get watermark
    watermark = ""
    try:
        df = tbl.to_pandas()
        if not df.empty and "neon_updated_at" in df.columns:
            watermark = df["neon_updated_at"].max()
    except Exception:
        pass

    if not watermark:
        print("No watermark found, falling back to full sync.")
        return _sync_contacts_full(db, conn)

    print(f"Incremental sync from watermark: {watermark}")
    with conn.cursor() as cur:
        cur.execute(CONTACTS_INCREMENTAL_SQL, [watermark])
        rows = cur.fetchall()

    if not rows:
        total = tbl.count_rows()
        print(f"No new contacts since {watermark}. Table has {total} rows.")
        return SyncResult(table="contacts", total_rows=total, synced=0, mode="incremental")

    print(f"Found {len(rows)} updated contacts. Embedding...")
    texts = [_build_contact_embedding_text(dict(r)) for r in rows]
    vectors = embed_texts(texts)

    # Delete stale rows by neon_id
    neon_ids = [r["id"] for r in rows]
    id_list = ",".join(str(i) for i in neon_ids)
    tbl.delete(f"neon_id IN ({id_list})")

    # Insert updated rows
    records = [
        _contact_row_to_record(dict(r), vectors[i].tolist(), texts[i])
        for i, r in enumerate(rows)
    ]
    tbl.add(records)

    total = tbl.count_rows()
    print(f"Incremental sync: {len(records)} contacts updated. Total: {total}")
    return SyncResult(
        table="contacts", total_rows=total, synced=len(records), mode="incremental"
    )


# ---------------------------------------------------------------------------
# Post embedding text construction
# ---------------------------------------------------------------------------


def _safe_str(val) -> str:
    """Convert a value to string, handling NaN/None/float gracefully."""
    if val is None:
        return ""
    if isinstance(val, float):
        import math
        return "" if math.isnan(val) else str(val)
    return str(val)


def _build_post_embedding_text(
    post_text, author_position: str, author_company: str
) -> str:
    """Build embedding text for a LinkedIn post."""
    text = _safe_str(post_text)[:400]
    author = f"{author_position} at {author_company}" if author_position else ""
    return f"{author}. {text}".strip(". ")


# ---------------------------------------------------------------------------
# sync_posts
# ---------------------------------------------------------------------------


def sync_posts() -> SyncResult:
    """Sync LinkedIn posts from the Rust LanceDB store into the vectordb with embeddings.

    Reads posts from ~/.lance/linkedin (written by the Rust server),
    embeds post_text via MLX, writes to ~/.lance/nomadically/posts.
    """
    db = lancedb.connect(LANCE_DB_PATH)

    # Read posts from Rust LanceDB via lancedb connection
    try:
        rust_db = lancedb.connect(LANCE_LINKEDIN_PATH)
        rust_tables = rust_db.table_names()
    except Exception as e:
        return SyncResult(
            table="posts", total_rows=0, synced=0, mode="full",
            errors=[f"Cannot connect to Rust LanceDB at {LANCE_LINKEDIN_PATH}: {e}"],
        )

    if "posts" not in rust_tables:
        return SyncResult(
            table="posts", total_rows=0, synced=0, mode="full",
            errors=[f"No 'posts' table in {LANCE_LINKEDIN_PATH}. Tables: {rust_tables}"],
        )

    try:
        posts_tbl = rust_db.open_table("posts")
        posts_df = posts_tbl.to_pandas()
    except Exception as e:
        return SyncResult(
            table="posts", total_rows=0, synced=0, mode="full",
            errors=[f"Cannot read posts table: {e}"],
        )

    if posts_df.empty:
        print("No posts found in Rust LanceDB.")
        return SyncResult(table="posts", total_rows=0, synced=0, mode="full")

    # Read contacts for author info
    contact_map: dict[int, dict] = {}
    if "contacts" in rust_tables:
        try:
            contacts_tbl = rust_db.open_table("contacts")
            contacts_df = contacts_tbl.to_pandas()
            for _, c in contacts_df.iterrows():
                contact_map[int(c["id"])] = {
                    "name": f"{c['first_name']} {c['last_name']}",
                    "position": c.get("position") or "",
                    "company": c.get("company") or "",
                }
        except Exception:
            pass  # No contact info — embed post text only

    print(f"Read {len(posts_df)} posts from Rust LanceDB. Embedding...")

    texts: list[str] = []
    records: list[dict] = []
    for _, row in posts_df.iterrows():
        contact_id = int(row.get("contact_id", 0))
        author = contact_map.get(contact_id, {})
        emb_text = _build_post_embedding_text(
            row.get("post_text"),
            author.get("position", ""),
            author.get("company", ""),
        )
        texts.append(emb_text)
        records.append({
            "post_id": int(row.get("id", 0)),
            "contact_neon_id": contact_id,
            "author_name": author.get("name", ""),
            "post_url": _safe_str(row.get("post_url")),
            "post_text": _safe_str(row.get("post_text")),
            "posted_date": _safe_str(row.get("posted_date")),
            "reactions_count": int(row.get("reactions_count", 0)),
            "comments_count": int(row.get("comments_count", 0)),
            "reposts_count": int(row.get("reposts_count", 0)),
            "is_repost": bool(row.get("is_repost", False)),
            "scraped_at": _safe_str(row.get("scraped_at")),
            "embedding_text": emb_text,
        })

    t0 = time.time()
    vectors = embed_texts(texts)
    elapsed = time.time() - t0
    print(f"Embedded {len(texts)} posts in {elapsed:.1f}s")

    for i, rec in enumerate(records):
        rec["vector"] = vectors[i].tolist()

    tbl = db.create_table("posts", records, mode="overwrite")

    try:
        tbl.create_fts_index("post_text", replace=True)
        tbl.create_fts_index("embedding_text", replace=True)
    except Exception:
        pass

    total = tbl.count_rows()
    print(f"Post sync complete: {total} posts in LanceDB")
    return SyncResult(table="posts", total_rows=total, synced=len(records), mode="full")

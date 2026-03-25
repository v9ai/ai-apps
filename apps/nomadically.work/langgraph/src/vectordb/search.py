"""Semantic search over contacts, LinkedIn posts, and jobs in LanceDB."""

from __future__ import annotations

import lancedb

from .config import LANCE_DB_PATH
from .embedder import embed_query
from .schemas import ScoredContact, ScoredJob, ScoredPost


def search_contacts(
    query: str,
    *,
    top_k: int = 20,
    ai_tier_min: int | None = None,
    contact_type: str | None = None,
    regions: str | None = None,
    company_category: str | None = None,
    email_verified_only: bool = False,
) -> list[ScoredContact]:
    """Semantic search over contacts with optional SQL filters.

    Examples:
        search_contacts("AI recruiter hiring LLM engineers in EU")
        search_contacts("ML hiring manager", ai_tier_min=1, email_verified_only=True)
        search_contacts("talent partner React", contact_type="recruiter", regions="eu")
    """
    db = lancedb.connect(LANCE_DB_PATH)
    tbl = db.open_table("contacts")

    q_vec = embed_query(query)
    search = tbl.search(q_vec).limit(top_k)

    # Build SQL WHERE from filters
    where_clauses: list[str] = []
    if ai_tier_min is not None:
        where_clauses.append(f"ai_tier >= {ai_tier_min}")
    if contact_type:
        where_clauses.append(f"contact_type = '{contact_type}'")
    if email_verified_only:
        where_clauses.append("email_verified = true")
    if regions:
        where_clauses.append(f"regions LIKE '%{regions}%'")
    if company_category:
        where_clauses.append(f"company_category = '{company_category}'")

    if where_clauses:
        search = search.where(" AND ".join(where_clauses))

    results = search.to_pandas()
    return [ScoredContact.from_row(row) for _, row in results.iterrows()]


def search_posts(
    query: str,
    *,
    top_k: int = 20,
    min_reactions: int | None = None,
    exclude_reposts: bool = False,
    contact_neon_id: int | None = None,
) -> list[ScoredPost]:
    """Semantic search over LinkedIn posts.

    Examples:
        search_posts("hiring AI engineer remote Europe")
        search_posts("LLM infrastructure team scaling", min_reactions=50)
    """
    db = lancedb.connect(LANCE_DB_PATH)
    tbl = db.open_table("posts")

    q_vec = embed_query(query)
    search = tbl.search(q_vec).limit(top_k)

    where_clauses: list[str] = []
    if min_reactions is not None:
        where_clauses.append(f"reactions_count >= {min_reactions}")
    if exclude_reposts:
        where_clauses.append("is_repost = false")
    if contact_neon_id is not None:
        where_clauses.append(f"contact_neon_id = {contact_neon_id}")

    if where_clauses:
        search = search.where(" AND ".join(where_clauses))

    results = search.to_pandas()
    return [ScoredPost.from_row(row) for _, row in results.iterrows()]

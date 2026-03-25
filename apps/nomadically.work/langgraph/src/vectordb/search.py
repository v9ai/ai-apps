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


# ---------------------------------------------------------------------------
# Profile text for job matching
# ---------------------------------------------------------------------------

DEFAULT_PROFILE = """\
Senior software engineer with 5+ years in Rust, TypeScript, and AI engineering. \
Experience with agentic systems, LLM production patterns, Cloudflare Workers, \
WASM, GraphQL, and developer tooling. Looking for fully remote roles in EU \
in AI infrastructure, developer tools, or edge computing.\
"""


def search_jobs(
    query: str | None = None,
    *,
    profile: str | None = None,
    top_k: int = 20,
    remote_only: bool = False,
    eu_remote_only: bool = False,
    min_salary: int | None = None,
    ai_tier_min: int | None = None,
    role_ai_only: bool = False,
) -> list[ScoredJob]:
    """Semantic search over jobs using profile or query vector.

    If neither query nor profile is provided, uses DEFAULT_PROFILE.

    Examples:
        search_jobs()  # match against your default profile
        search_jobs(query="Rust AI infrastructure remote EU")
        search_jobs(profile="ML engineer with PyTorch experience", remote_only=True)
        search_jobs(eu_remote_only=True, min_salary=80000)
    """
    db = lancedb.connect(LANCE_DB_PATH)
    tbl = db.open_table("jobs")

    text = query or profile or DEFAULT_PROFILE
    q_vec = embed_query(text)
    search = tbl.search(q_vec).limit(top_k)

    where_clauses: list[str] = []
    if remote_only:
        where_clauses.append("remote_policy = 'full_remote'")
    if eu_remote_only:
        where_clauses.append("is_remote_eu = true")
    if min_salary is not None:
        where_clauses.append(f"salary_min >= {min_salary}")
    if ai_tier_min is not None:
        where_clauses.append(f"ai_tier >= {ai_tier_min}")
    if role_ai_only:
        where_clauses.append("role_ai_engineer = true")

    if where_clauses:
        search = search.where(" AND ".join(where_clauses))

    results = search.to_pandas()
    return [ScoredJob.from_row(row) for _, row in results.iterrows()]

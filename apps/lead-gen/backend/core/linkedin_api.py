"""LinkedIn posts HTTP router mounted at ``/linkedin/*`` inside leadgen-core.

Converted from ``backend/scripts/linkedin_posts_server.py`` (a standalone
FastAPI app) into a FastAPI ``APIRouter`` so the 13 endpoints that power the
Chrome extension share the core container's Neon pool and deploy artifact.

Paths are unchanged — when mounted with ``app.include_router(router,
prefix="/linkedin")`` the public surface is::

    GET  /linkedin/contacts                    — contacts with linkedin_url
    POST /linkedin/contacts                    — upsert contacts
    GET  /linkedin/contacts/recruiters         — recruiter-position filter
    POST /linkedin/posts                       — ingest activity posts (auto-classify)
    POST /linkedin/jobs                        — ingest job-search posts (post_type=jobs)
    GET  /linkedin/stats                       — {contacts, posts, likes}
    GET  /linkedin/export                      — {contacts, posts, likes}
    GET  /linkedin/posts/classified            — query stored posts by intent/contact
    GET  /linkedin/posts/signals/{contact_id}  — aggregated authority signals
    GET  /linkedin/posts/intents/distribution  — histogram of intents over all posts
    POST /linkedin/likes                       — ingest post likes
    GET  /linkedin/likes                       — query likes by contact/limit
    POST /linkedin/scorer/reload               — reload scorer weights (Bearer auth)

Outer bearer-token auth is handled by the container's
``BearerTokenMiddleware`` and (on production) the dispatcher Worker. The
extension-scoped ``SCORER_AUTH_TOKEN`` gate on ``/scorer/reload`` stays —
it's independent from ``LANGGRAPH_AUTH_TOKEN`` and is rotated separately.

Startup migration (``CREATE TABLE IF NOT EXISTS …``) runs from ``app.py``'s
lifespan via :func:`ensure_linkedin_tables` so the core container does the
one-time DDL once, not per-router-mount.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any

import psycopg
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from leadgen_agent.linkedin_post_scorer import (
    PostIntentScorer,
    analyze,
)
from leadgen_agent.linkedin_process_graph import (
    Contact,
    StoredPost,
    _dsn,
    aggregate_signals,
    count_contacts_with_linkedin,
    fetch_recruiter_contacts,
    load_all_contacts_with_linkedin,
    load_all_posts,
    update_contact_authority,
)

log = logging.getLogger(__name__)


# ─── Configuration ────────────────────────────────────────────────────────

WEIGHTS_DIR = os.environ.get("LINKEDIN_POSTS_WEIGHTS_DIR") or str(
    Path.home() / ".lance" / "linkedin"
)
WEIGHTS_PATH = Path(WEIGHTS_DIR) / "post_intent_weights.json"

INTENT_DIST_THRESHOLD = 0.4


# ─── DDL (invoked once from app.py lifespan) ──────────────────────────────

_DDL_POSTS = """
CREATE TABLE IF NOT EXISTS linkedin_activity_posts (
    id                          BIGSERIAL PRIMARY KEY,
    contact_id                  INTEGER NOT NULL,
    post_url                    TEXT,
    post_text                   TEXT,
    posted_date                 TEXT,
    reactions_count             INTEGER NOT NULL DEFAULT 0,
    comments_count              INTEGER NOT NULL DEFAULT 0,
    reposts_count               INTEGER NOT NULL DEFAULT 0,
    media_type                  TEXT NOT NULL DEFAULT 'none',
    is_repost                   BOOLEAN NOT NULL DEFAULT FALSE,
    original_author             TEXT,
    scraped_at                  TEXT NOT NULL,
    post_type                   TEXT NOT NULL DEFAULT 'post',
    relevance_score             REAL NOT NULL DEFAULT 0.0,
    primary_intent              TEXT NOT NULL DEFAULT 'noise',
    intent_hiring               REAL NOT NULL DEFAULT 0.0,
    intent_ai_ml                REAL NOT NULL DEFAULT 0.0,
    intent_remote               REAL NOT NULL DEFAULT 0.0,
    intent_eng_culture          REAL NOT NULL DEFAULT 0.0,
    intent_company_growth       REAL NOT NULL DEFAULT 0.0,
    intent_thought_leadership   REAL NOT NULL DEFAULT 0.0,
    intent_noise                REAL NOT NULL DEFAULT 0.0,
    entities_json               TEXT,
    UNIQUE (contact_id, post_url)
);
CREATE INDEX IF NOT EXISTS idx_lap_contact_id ON linkedin_activity_posts(contact_id);
CREATE INDEX IF NOT EXISTS idx_lap_primary_intent ON linkedin_activity_posts(primary_intent);
CREATE INDEX IF NOT EXISTS idx_lap_post_type ON linkedin_activity_posts(post_type);
"""

_DDL_LIKES = """
CREATE TABLE IF NOT EXISTS linkedin_activity_likes (
    id                  BIGSERIAL PRIMARY KEY,
    contact_id          INTEGER NOT NULL,
    post_url            TEXT,
    post_text           TEXT,
    post_author_name    TEXT,
    post_author_url     TEXT,
    liked_date          TEXT,
    scraped_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lal_contact_id ON linkedin_activity_likes(contact_id);
"""


def ensure_linkedin_tables() -> None:
    """Create linkedin_activity_{posts,likes} if missing. Idempotent."""
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(_DDL_POSTS)
            cur.execute(_DDL_LIKES)
    log.info("Ensured linkedin_activity_posts / linkedin_activity_likes tables")


# ─── Scorer holder (hot-reloadable) ───────────────────────────────────────


class _ScorerHolder:
    def __init__(self, scorer: PostIntentScorer) -> None:
        self._lock = Lock()
        self._scorer = scorer

    def get(self) -> PostIntentScorer:
        with self._lock:
            return self._scorer

    def set(self, scorer: PostIntentScorer) -> None:
        with self._lock:
            self._scorer = scorer


def _load_scorer() -> PostIntentScorer:
    if WEIGHTS_PATH.exists():
        try:
            scorer = PostIntentScorer.from_json(WEIGHTS_PATH)
            log.info("Loaded intent scorer weights from %s", WEIGHTS_PATH)
            return scorer
        except Exception as e:  # noqa: BLE001
            log.warning(
                "Failed to load weights from %s: %s — using defaults",
                WEIGHTS_PATH,
                e,
            )
    else:
        log.info(
            "No weights file at %s — using default pretrained scorer", WEIGHTS_PATH
        )
    return PostIntentScorer.default_pretrained()


_scorer_holder = _ScorerHolder(_load_scorer())


# ─── Request / response schemas ───────────────────────────────────────────


class ContactModel(BaseModel):
    id: int
    first_name: str
    last_name: str
    linkedin_url: str
    company: str | None = None
    position: str | None = None
    scraped_at: str


class PostModel(BaseModel):
    post_url: str | None = None
    post_text: str | None = None
    posted_date: str | None = None
    reactions_count: int = 0
    comments_count: int = 0
    reposts_count: int = 0
    media_type: str = "none"
    is_repost: bool = False
    original_author: str | None = None
    post_type: str = "post"


class AddContactsRequest(BaseModel):
    contacts: list[ContactModel]


class AddPostsRequest(BaseModel):
    contact_id: int
    posts: list[PostModel]


class AddJobPostsRequest(BaseModel):
    posts: list[PostModel]


class IntentSummary(BaseModel):
    hiring: int = 0
    ai_ml: int = 0
    remote: int = 0
    eng_culture: int = 0
    company_growth: int = 0
    thought_leadership: int = 0
    noise: int = 0


class InsertResult(BaseModel):
    inserted: int
    duplicates: int | None = None
    filtered: int | None = None
    intent_summary: IntentSummary | None = None


class PostLikeModel(BaseModel):
    post_url: str | None = None
    post_text: str | None = None
    post_author_name: str | None = None
    post_author_url: str | None = None
    liked_date: str | None = None


class AddLikesRequest(BaseModel):
    contact_id: int
    likes: list[PostLikeModel]


class StoredPostModel(BaseModel):
    id: int
    contact_id: int
    post_url: str | None
    post_text: str | None
    posted_date: str | None
    reactions_count: int
    comments_count: int
    reposts_count: int
    media_type: str
    is_repost: bool
    original_author: str | None
    scraped_at: str
    post_type: str
    relevance_score: float
    primary_intent: str
    intent_hiring: float
    intent_ai_ml: float
    intent_remote: float
    intent_eng_culture: float
    intent_company_growth: float
    intent_thought_leadership: float
    intent_noise: float
    entities_json: str | None = None


class StoredPostLikeModel(BaseModel):
    id: int
    contact_id: int
    post_url: str | None
    post_text: str | None
    post_author_name: str | None
    post_author_url: str | None
    liked_date: str | None
    scraped_at: str


class StatsResponse(BaseModel):
    contacts: int
    posts: int
    likes: int


class ExportResponse(BaseModel):
    contacts: list[ContactModel]
    posts: list[StoredPostModel]
    likes: list[StoredPostLikeModel]


class IntentDistribution(BaseModel):
    total_posts: int
    hiring: int
    ai_ml: int
    remote: int
    eng_culture: int
    company_growth: int
    thought_leadership: int
    noise: int
    avg_relevance: float


# ─── Helpers ──────────────────────────────────────────────────────────────


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _contact_to_model(c: Contact) -> ContactModel:
    return ContactModel(
        id=c.id,
        first_name=c.first_name,
        last_name=c.last_name,
        linkedin_url=c.linkedin_url,
        company=c.company,
        position=c.position,
        scraped_at=c.scraped_at,
    )


def _post_to_model(p: StoredPost) -> StoredPostModel:
    return StoredPostModel(
        id=p.id,
        contact_id=p.contact_id,
        post_url=p.post_url,
        post_text=p.post_text,
        posted_date=p.posted_date,
        reactions_count=p.reactions_count,
        comments_count=p.comments_count,
        reposts_count=p.reposts_count,
        media_type=p.media_type,
        is_repost=p.is_repost,
        original_author=p.original_author,
        scraped_at=p.scraped_at,
        post_type=p.post_type,
        relevance_score=p.relevance_score,
        primary_intent=p.primary_intent,
        intent_hiring=p.intent_hiring,
        intent_ai_ml=p.intent_ai_ml,
        intent_remote=p.intent_remote,
        intent_eng_culture=p.intent_eng_culture,
        intent_company_growth=p.intent_company_growth,
        intent_thought_leadership=p.intent_thought_leadership,
        intent_noise=p.intent_noise,
        entities_json=p.entities_json,
    )


def _db() -> psycopg.Connection:
    return psycopg.connect(_dsn(), autocommit=True, connect_timeout=10)


def _cache_contacts(
    conn: psycopg.Connection, contacts: list[ContactModel]
) -> int:
    if not contacts:
        return 0
    inserted = 0
    with conn.cursor() as cur:
        for c in contacts:
            cur.execute(
                """
                INSERT INTO contacts (id, first_name, last_name, linkedin_url,
                                      company, position, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, now()::text, now()::text)
                ON CONFLICT (id) DO UPDATE
                SET first_name = EXCLUDED.first_name,
                    last_name  = EXCLUDED.last_name,
                    linkedin_url = EXCLUDED.linkedin_url,
                    company = COALESCE(EXCLUDED.company, contacts.company),
                    position = COALESCE(EXCLUDED.position, contacts.position),
                    updated_at = now()::text
                """,
                (
                    c.id,
                    c.first_name,
                    c.last_name,
                    c.linkedin_url,
                    c.company,
                    c.position,
                ),
            )
            inserted += 1
    return inserted


def _insert_posts(
    conn: psycopg.Connection,
    contact_id: int,
    posts: list[PostModel],
    post_type_override: str | None,
) -> tuple[int, int, int, IntentSummary | None]:
    if not posts:
        return 0, 0, 0, None

    scorer = _scorer_holder.get()
    now = _now_iso()

    kept: list[tuple[PostModel, Any]] = []
    filtered = 0
    for p in posts:
        res = analyze(p.model_dump(), scorer)
        if res.keep:
            kept.append((p, res))
        else:
            filtered += 1

    if not kept:
        return 0, 0, filtered, None

    summary = IntentSummary()
    for _, a in kept:
        attr = {
            "hiring_signal": "hiring",
            "ai_ml_content": "ai_ml",
            "remote_signal": "remote",
            "engineering_culture": "eng_culture",
            "company_growth": "company_growth",
            "thought_leadership": "thought_leadership",
        }.get(a.primary_intent, "noise")
        setattr(summary, attr, getattr(summary, attr) + 1)

    inserted = 0
    duplicates = 0

    with conn.cursor() as cur:
        for p, a in kept:
            post_type = post_type_override or p.post_type or "post"
            cur.execute(
                """
                INSERT INTO linkedin_activity_posts (
                    contact_id, post_url, post_text, posted_date,
                    reactions_count, comments_count, reposts_count,
                    media_type, is_repost, original_author, scraped_at, post_type,
                    relevance_score, primary_intent,
                    intent_hiring, intent_ai_ml, intent_remote, intent_eng_culture,
                    intent_company_growth, intent_thought_leadership, intent_noise,
                    entities_json
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s,
                    %s
                )
                ON CONFLICT (contact_id, post_url) DO NOTHING
                RETURNING id
                """,
                (
                    contact_id,
                    p.post_url,
                    p.post_text,
                    p.posted_date,
                    int(p.reactions_count or 0),
                    int(p.comments_count or 0),
                    int(p.reposts_count or 0),
                    p.media_type or "none",
                    bool(p.is_repost),
                    p.original_author,
                    now,
                    post_type,
                    a.relevance_score,
                    a.primary_intent,
                    a.intents.hiring_signal,
                    a.intents.ai_ml_content,
                    a.intents.remote_signal,
                    a.intents.engineering_culture,
                    a.intents.company_growth,
                    a.intents.thought_leadership,
                    a.intents.noise,
                    None,
                ),
            )
            row = cur.fetchone()
            if row is not None:
                inserted += 1
            else:
                duplicates += 1

    log.info(
        "Contact %s: inserted=%d duplicates=%d filtered=%d",
        contact_id,
        inserted,
        duplicates,
        filtered,
    )
    return inserted, duplicates, filtered, summary


def _load_posts(conn: psycopg.Connection) -> list[StoredPost]:
    return load_all_posts(conn)


def _load_likes(conn: psycopg.Connection) -> list[StoredPostLikeModel]:
    sql = """
        SELECT id, contact_id, post_url, post_text, post_author_name,
               post_author_url, liked_date, scraped_at
        FROM linkedin_activity_likes
        ORDER BY id
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
    return [
        StoredPostLikeModel(
            id=r[0],
            contact_id=r[1],
            post_url=r[2],
            post_text=r[3],
            post_author_name=r[4],
            post_author_url=r[5],
            liked_date=r[6],
            scraped_at=r[7],
        )
        for r in rows
    ]


def _posts_count(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM linkedin_activity_posts")
        row = cur.fetchone()
    return int(row[0]) if row else 0


def _likes_count(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM linkedin_activity_likes")
        row = cur.fetchone()
    return int(row[0]) if row else 0


# ─── Router ───────────────────────────────────────────────────────────────

router = APIRouter(tags=["linkedin"])


@router.get("/contacts", response_model=list[ContactModel])
def get_contacts() -> list[ContactModel]:
    with _db() as conn:
        contacts = load_all_contacts_with_linkedin(conn)
    return [_contact_to_model(c) for c in contacts]


@router.post("/contacts", response_model=InsertResult)
def add_contacts(req: AddContactsRequest) -> InsertResult:
    with _db() as conn:
        inserted = _cache_contacts(conn, req.contacts)
    return InsertResult(inserted=inserted)


@router.get("/contacts/recruiters", response_model=list[ContactModel])
def get_recruiter_contacts() -> list[ContactModel]:
    with _db() as conn:
        contacts = fetch_recruiter_contacts(conn)
    return [_contact_to_model(c) for c in contacts]


@router.post("/posts", response_model=InsertResult)
def add_posts(req: AddPostsRequest) -> InsertResult:
    with _db() as conn:
        inserted, duplicates, filtered, summary = _insert_posts(
            conn, req.contact_id, req.posts, None
        )

        # Recompute contact authority after ingest (mirrors the Rust
        # tokio::spawn path). Sync here; same-process DB pool makes it cheap.
        if inserted > 0:
            contact_posts = [
                p for p in load_all_posts(conn) if p.contact_id == req.contact_id
            ]
            signals = aggregate_signals(req.contact_id, contact_posts)
            if signals.authority_delta > 0.0:
                try:
                    update_contact_authority(
                        conn, req.contact_id, signals.authority_delta
                    )
                except Exception as e:  # pragma: no cover
                    log.warning(
                        "Failed to update authority for contact %s: %s",
                        req.contact_id,
                        e,
                    )

    return InsertResult(
        inserted=inserted,
        duplicates=duplicates,
        filtered=filtered if filtered > 0 else None,
        intent_summary=summary,
    )


@router.post("/jobs", response_model=InsertResult)
def add_job_posts(req: AddJobPostsRequest) -> InsertResult:
    with _db() as conn:
        inserted, duplicates, filtered, summary = _insert_posts(
            conn, 0, req.posts, "jobs"
        )
    return InsertResult(
        inserted=inserted,
        duplicates=duplicates,
        filtered=filtered if filtered > 0 else None,
        intent_summary=summary,
    )


@router.get("/stats", response_model=StatsResponse)
def stats() -> StatsResponse:
    with _db() as conn:
        return StatsResponse(
            contacts=count_contacts_with_linkedin(conn),
            posts=_posts_count(conn),
            likes=_likes_count(conn),
        )


@router.get("/export", response_model=ExportResponse)
def export() -> ExportResponse:
    with _db() as conn:
        contacts = [
            _contact_to_model(c) for c in load_all_contacts_with_linkedin(conn)
        ]
        posts = [_post_to_model(p) for p in _load_posts(conn)]
        likes = _load_likes(conn)
    return ExportResponse(contacts=contacts, posts=posts, likes=likes)


_INTENT_ALIASES = {
    "hiring": "intent_hiring",
    "hiring_signal": "intent_hiring",
    "ai_ml": "intent_ai_ml",
    "ai_ml_content": "intent_ai_ml",
    "remote": "intent_remote",
    "remote_signal": "intent_remote",
    "eng_culture": "intent_eng_culture",
    "engineering_culture": "intent_eng_culture",
    "company_growth": "intent_company_growth",
    "thought_leadership": "intent_thought_leadership",
    "noise": "intent_noise",
}


@router.get("/posts/classified", response_model=list[StoredPostModel])
def get_classified_posts(
    intent: str | None = Query(default=None),
    min_confidence: float = Query(default=0.3),
    contact_id: int | None = Query(default=None),
    limit: int = Query(default=100, gt=0, le=10_000),
) -> list[StoredPostModel]:
    with _db() as conn:
        posts = _load_posts(conn)

    def _score(p: StoredPost, attr: str) -> float:
        return getattr(p, attr)

    out: list[StoredPostModel] = []
    intent_attr = _INTENT_ALIASES.get(intent) if intent else None
    for p in posts:
        if contact_id is not None and p.contact_id != contact_id:
            continue
        if intent_attr is not None and _score(p, intent_attr) < min_confidence:
            continue
        out.append(_post_to_model(p))
        if len(out) >= limit:
            break
    return out


@router.get("/posts/signals/{contact_id}")
def get_post_signals(contact_id: int) -> dict[str, Any]:
    with _db() as conn:
        posts = [p for p in _load_posts(conn) if p.contact_id == contact_id]
    sig = aggregate_signals(contact_id, posts)
    return {
        "contact_id": sig.contact_id,
        "total_posts": sig.total_posts,
        "avg_relevance": sig.avg_relevance,
        "max_hiring_signal": sig.max_hiring_signal,
        "hiring_post_count": sig.hiring_post_count,
        "ai_content_count": sig.ai_content_count,
        "thought_leadership_count": sig.thought_leadership_count,
        "avg_engagement": sig.avg_engagement,
        "post_frequency_score": sig.post_frequency_score,
        "authority_delta": sig.authority_delta,
    }


@router.get("/posts/intents/distribution", response_model=IntentDistribution)
def get_intent_distribution() -> IntentDistribution:
    with _db() as conn:
        posts = _load_posts(conn)
    total = len(posts)
    if total == 0:
        return IntentDistribution(
            total_posts=0,
            hiring=0,
            ai_ml=0,
            remote=0,
            eng_culture=0,
            company_growth=0,
            thought_leadership=0,
            noise=0,
            avg_relevance=0.0,
        )

    counts = {
        "hiring": 0,
        "ai_ml": 0,
        "remote": 0,
        "eng_culture": 0,
        "company_growth": 0,
        "thought_leadership": 0,
        "noise": 0,
    }
    sum_relevance = 0.0
    for p in posts:
        if p.intent_hiring > INTENT_DIST_THRESHOLD:
            counts["hiring"] += 1
        if p.intent_ai_ml > INTENT_DIST_THRESHOLD:
            counts["ai_ml"] += 1
        if p.intent_remote > INTENT_DIST_THRESHOLD:
            counts["remote"] += 1
        if p.intent_eng_culture > INTENT_DIST_THRESHOLD:
            counts["eng_culture"] += 1
        if p.intent_company_growth > INTENT_DIST_THRESHOLD:
            counts["company_growth"] += 1
        if p.intent_thought_leadership > INTENT_DIST_THRESHOLD:
            counts["thought_leadership"] += 1
        if p.intent_noise > INTENT_DIST_THRESHOLD:
            counts["noise"] += 1
        sum_relevance += p.relevance_score

    return IntentDistribution(
        total_posts=total,
        hiring=counts["hiring"],
        ai_ml=counts["ai_ml"],
        remote=counts["remote"],
        eng_culture=counts["eng_culture"],
        company_growth=counts["company_growth"],
        thought_leadership=counts["thought_leadership"],
        noise=counts["noise"],
        avg_relevance=sum_relevance / total,
    )


@router.post("/likes", response_model=InsertResult)
def add_likes(req: AddLikesRequest) -> InsertResult:
    if not req.likes:
        return InsertResult(inserted=0)

    now = _now_iso()
    inserted = 0
    with _db() as conn, conn.cursor() as cur:
        for like in req.likes:
            cur.execute(
                """
                INSERT INTO linkedin_activity_likes (
                    contact_id, post_url, post_text, post_author_name,
                    post_author_url, liked_date, scraped_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    req.contact_id,
                    like.post_url,
                    like.post_text,
                    like.post_author_name,
                    like.post_author_url,
                    like.liked_date,
                    now,
                ),
            )
            inserted += 1
    log.info("Inserted %d likes for contact %s", inserted, req.contact_id)
    return InsertResult(inserted=inserted)


@router.get("/likes", response_model=list[StoredPostLikeModel])
def get_likes(
    contact_id: int | None = Query(default=None),
    limit: int = Query(default=100, gt=0, le=10_000),
) -> list[StoredPostLikeModel]:
    with _db() as conn:
        all_likes = _load_likes(conn)

    out: list[StoredPostLikeModel] = []
    for like in all_likes:
        if contact_id is not None and like.contact_id != contact_id:
            continue
        out.append(like)
        if len(out) >= limit:
            break
    return out


@router.post("/scorer/reload")
def reload_scorer(
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    expected = os.environ.get("SCORER_AUTH_TOKEN", "")
    if not expected:
        raise HTTPException(
            status_code=403,
            detail="SCORER_AUTH_TOKEN not configured — scorer reload disabled",
        )
    provided = ""
    if authorization and authorization.startswith("Bearer "):
        provided = authorization[len("Bearer ") :]
    if provided != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing auth token")

    if not WEIGHTS_PATH.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Weights file not found at {WEIGHTS_PATH}",
        )
    try:
        scorer = PostIntentScorer.from_json(WEIGHTS_PATH)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=400, detail=f"Failed to load weights: {e}"
        ) from e

    _scorer_holder.set(scorer)
    log.info("Reloaded intent scorer weights from %s", WEIGHTS_PATH)
    return {
        "status": "ok",
        "message": f"Reloaded weights from {WEIGHTS_PATH}",
    }


__all__ = ["ensure_linkedin_tables", "router"]

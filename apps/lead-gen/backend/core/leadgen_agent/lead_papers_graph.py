"""Lead-to-paper-author GitHub matcher — native Python port of the Rust
``lead-papers`` crate (binary ``leadmatch``).

Matches B2B sales contacts (tagged ``papers``) to their GitHub profile using
academic-paper-author evidence. The pipeline:

1. Gather author papers (OpenAlex + arXiv + Crossref fallbacks).
2. Embed paper texts with BGE-M3 (via :mod:`embeddings`), derive an
   author topic vector (mean of normalized rows).
3. Search GitHub users with a UCB1 bandit over 3 query variants
   (``name_only`` / ``name_affil`` / ``name_email_domain``).
4. Hydrate the top 5 candidates, embed their topic-blob, score each against
   the author (name_sim + affil_overlap + topic_cos + signal_match).
5. Persist results and bandit state to Neon; winning contacts can later be
   promoted into the production ``contacts.github_handle`` / ``.papers``
   columns.

Replaces the Rust crate's Candle+LanceDB+SQLite stack with:
  - Candle BERT  →  ``embed_texts`` (BGE-M3 HTTP server, 1024-dim).
  - LanceDB     →  pgvector on Neon for candidate embeddings (optional;
                  falls back to jsonb when the pgvector extension is not
                  available in the target database).
  - Local SQLite →  two temp-ish Neon tables
                    (``leadmatch_candidates``, ``leadmatch_state``) created
                    on first use via ``migrate`` or any other subcommand.

Subcommands (all invoked via the ``command`` state key):
  - ``migrate``  — create Neon tables (idempotent).
  - ``match``    — run pipeline over ``state["contacts"]`` (JSON-shaped).
  - ``run``      — pull up to ``limit`` un-matched ``papers``-tagged
                   contacts from Neon and run the pipeline over them.
  - ``promote``  — copy high-scoring rows from ``leadmatch_state`` into
                   ``contacts.github_handle`` / ``.papers`` /
                   ``.gh_match_*`` columns.
  - ``dossier``  — render a human-readable dossier for a GitHub login.

This graph is complementary to
:mod:`contact_enrich_paper_author_graph`, which focuses on OpenAlex *author*
metadata (institution, ORCID, h-index). That graph does not touch GitHub and
does not persist to ``leadmatch_*`` tables; the two can run on the same
contact in either order.
"""

# Requires: rapidfuzz, numpy

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import math
import os
import re
import time
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, TypedDict

import httpx
import numpy as np
import psycopg
from langgraph.graph import END, START, StateGraph
from rapidfuzz.distance import JaroWinkler

from .embeddings import embed_texts

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------


class LeadPapersState(TypedDict, total=False):
    # input
    command: str                       # migrate|match|run|promote|dossier
    contacts: list[dict[str, Any]]     # for "match": {id,name,affiliation,email,tags,papers}
    limit: int                         # for "run": max contacts to pull (default 20)
    status: str                        # for "promote": which status rows to consider (default "matched")
    min_score: float                   # for "promote": override MATCH_THRESHOLD
    login: str                         # for "dossier": github login

    # output
    results: list[dict[str, Any]]
    promote_counts: dict[str, int]
    dossier: dict[str, Any]
    stats: dict[str, Any]
    error: str | None


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------


BANDIT_POOL = "github_query"
MATCH_THRESHOLD = float(os.environ.get("MATCH_THRESHOLD", "0.70"))
FETCH_PER_SOURCE = int(os.environ.get("FETCH_PER_SOURCE", "25"))
CONCURRENCY = int(os.environ.get("LEADMATCH_CONCURRENCY", "5"))
GH_GRAPHQL = "https://api.github.com/graphql"
GH_USER_AGENT = "leadmatch-py/0.1"
OPENALEX_API = "https://api.openalex.org"
OPENALEX_MAILTO = os.environ.get("OPENALEX_MAILTO", "nicolai.vadim@gmail.com")
ARXIV_API = "http://export.arxiv.org/api/query"
CROSSREF_API = "https://api.crossref.org"
S2_API = "https://api.semanticscholar.org/graph/v1"
ATOM_NS = {
    "a": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}
UCB_EXPLORE_C = 1.4
UCB_DISCOUNT = 0.95

# Score weights — identical to Rust ScoreWeights::default().
SCORE_WEIGHTS = {"name": 0.35, "affil": 0.25, "topic": 0.30, "signal": 0.10}


# ---------------------------------------------------------------------------
# Neon schema (idempotent)
# ---------------------------------------------------------------------------


_MIGRATE_SQL = """
CREATE TABLE IF NOT EXISTS leadmatch_bandit_arms (
    pool        TEXT NOT NULL,
    arm_id      TEXT NOT NULL,
    pulls       DOUBLE PRECISION NOT NULL DEFAULT 0,
    reward_sum  DOUBLE PRECISION NOT NULL DEFAULT 0,
    reward_sq   DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_pull   TIMESTAMPTZ,
    PRIMARY KEY (pool, arm_id)
);

CREATE TABLE IF NOT EXISTS leadmatch_candidates (
    contact_id   TEXT NOT NULL,
    login        TEXT NOT NULL,
    profile      JSONB NOT NULL,
    topics_emb   JSONB,
    score        DOUBLE PRECISION,
    breakdown    JSONB,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (contact_id, login)
);
CREATE INDEX IF NOT EXISTS idx_leadmatch_candidates_contact
    ON leadmatch_candidates(contact_id);

CREATE TABLE IF NOT EXISTS leadmatch_state (
    contact_id    TEXT PRIMARY KEY,
    status        TEXT NOT NULL,
    score         DOUBLE PRECISION,
    login         TEXT,
    arm_id        TEXT,
    evidence      JSONB,
    papers        JSONB,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leadmatch_state_status
    ON leadmatch_state(status);
"""


def _dsn() -> str:
    dsn = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL") or ""
    dsn = dsn.strip()
    if not dsn:
        raise RuntimeError("NEON_DATABASE_URL / DATABASE_URL not set")
    return dsn


def _connect() -> psycopg.Connection:
    return psycopg.connect(_dsn(), autocommit=True, connect_timeout=10)


def _run_migrate() -> None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(_MIGRATE_SQL)
    log.info("leadmatch neon tables ready")


# ---------------------------------------------------------------------------
# Paper models & fetchers
# ---------------------------------------------------------------------------


@dataclass
class ResearchPaper:
    title: str
    source: str                        # arxiv|openalex|crossref|s2
    source_id: str
    authors: list[str] = field(default_factory=list)
    abstract_text: str | None = None
    year: int | None = None
    venue: str | None = None
    doi: str | None = None
    url: str | None = None
    pdf_url: str | None = None
    citation_count: int | None = None
    fields_of_study: list[str] = field(default_factory=list)
    affiliations: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "authors": self.authors,
            "year": self.year,
            "venue": self.venue,
            "doi": self.doi,
            "url": self.url,
            "citation_count": self.citation_count,
            "source": self.source,
        }


def paper_stable_id(p: ResearchPaper) -> str:
    if p.doi:
        return f"doi:{p.doi.lower()}"
    if p.source == "arxiv":
        return f"arxiv:{p.source_id}"
    if p.url and "arxiv.org/abs/" in p.url:
        tail = p.url.split("arxiv.org/abs/", 1)[1].rstrip("/")
        return f"arxiv:{tail}"
    return f"{p.source}:{p.source_id}"


def paper_text_for_embedding(p: ResearchPaper) -> str:
    abs_ = (p.abstract_text or "").strip()
    return f"{p.title}. {abs_}".strip()


async def _fetch_openalex_by_author(
    client: httpx.AsyncClient, author_name: str, per_page: int
) -> list[ResearchPaper]:
    # Resolve author -> id, then list works. Polite-pool mailto gets priority.
    try:
        auth_resp = await client.get(
            f"{OPENALEX_API}/authors",
            params={"search": author_name, "per_page": "5", "mailto": OPENALEX_MAILTO},
        )
        if auth_resp.status_code != 200:
            return []
        results = (auth_resp.json() or {}).get("results") or []
        if not results:
            return []
        openalex_author_id = (results[0].get("id") or "").rsplit("/", 1)[-1]
        if not openalex_author_id:
            return []

        works_resp = await client.get(
            f"{OPENALEX_API}/works",
            params={
                "filter": f"author.id:{openalex_author_id}",
                "per_page": str(min(per_page, 100)),
                "mailto": OPENALEX_MAILTO,
            },
        )
        if works_resp.status_code != 200:
            return []
        works = (works_resp.json() or {}).get("results") or []
    except Exception as e:
        log.warning("openalex author-works lookup failed for %s: %s", author_name, e)
        return []

    out: list[ResearchPaper] = []
    for w in works:
        if not isinstance(w, dict):
            continue
        title = (w.get("title") or w.get("display_name") or "").strip()
        if not title:
            continue
        doi = (w.get("doi") or "").replace("https://doi.org/", "") or None
        source_id = (w.get("id") or "").rsplit("/", 1)[-1]
        authors: list[str] = []
        affiliations: list[str] = []
        for a in w.get("authorships") or []:
            if not isinstance(a, dict):
                continue
            auth = a.get("author") or {}
            n = (auth.get("display_name") or "").strip()
            if n:
                authors.append(n)
            for inst in a.get("institutions") or []:
                if isinstance(inst, dict):
                    d = (inst.get("display_name") or "").strip()
                    if d:
                        affiliations.append(d)
        host = w.get("host_venue") or w.get("primary_location") or {}
        venue = None
        if isinstance(host, dict):
            src = host.get("source") or host
            if isinstance(src, dict):
                venue = (src.get("display_name") or "").strip() or None
        out.append(
            ResearchPaper(
                title=title,
                source="openalex",
                source_id=source_id,
                authors=authors,
                abstract_text=_reconstruct_openalex_abstract(w.get("abstract_inverted_index")),
                year=w.get("publication_year"),
                venue=venue,
                doi=doi,
                url=(w.get("doi") or w.get("id") or None),
                citation_count=w.get("cited_by_count"),
                fields_of_study=[
                    c.get("display_name")
                    for c in (w.get("concepts") or [])
                    if isinstance(c, dict) and c.get("display_name")
                ],
                affiliations=list(dict.fromkeys(affiliations)),
            )
        )
    return out


def _reconstruct_openalex_abstract(inv: Any) -> str | None:
    if not isinstance(inv, dict) or not inv:
        return None
    # inverted_index: {token: [positions...]} → reconstruct ordered text.
    by_pos: dict[int, str] = {}
    for tok, positions in inv.items():
        if not isinstance(positions, list):
            continue
        for p in positions:
            if isinstance(p, int):
                by_pos[p] = str(tok)
    if not by_pos:
        return None
    ordered = [by_pos[i] for i in sorted(by_pos.keys())]
    return " ".join(ordered)


async def _fetch_arxiv_by_author(
    client: httpx.AsyncClient, author_name: str, max_results: int
) -> list[ResearchPaper]:
    import xml.etree.ElementTree as ET

    q = f'au:"{author_name}"'
    try:
        resp = await client.get(
            ARXIV_API,
            params={
                "search_query": q,
                "start": "0",
                "max_results": str(max_results),
                "sortBy": "relevance",
                "sortOrder": "descending",
            },
        )
        if resp.status_code != 200:
            return []
        root = ET.fromstring(resp.text)
    except Exception as e:
        log.warning("arxiv search failed for %s: %s", author_name, e)
        return []

    out: list[ResearchPaper] = []
    for entry in root.findall("a:entry", ATOM_NS):
        title = (entry.findtext("a:title", default="", namespaces=ATOM_NS) or "").strip()
        if not title:
            continue
        summary = (entry.findtext("a:summary", default="", namespaces=ATOM_NS) or "").strip()
        published = (entry.findtext("a:published", default="", namespaces=ATOM_NS) or "")[:10]
        year = None
        if published and len(published) >= 4 and published[:4].isdigit():
            year = int(published[:4])
        doi = entry.findtext("arxiv:doi", default=None, namespaces=ATOM_NS)
        arxiv_id = ""
        id_el = entry.find("a:id", ATOM_NS)
        if id_el is not None and id_el.text:
            arxiv_id = id_el.text.rsplit("/abs/", 1)[-1].rstrip("/")
        authors = [
            (a.findtext("a:name", default="", namespaces=ATOM_NS) or "").strip()
            for a in entry.findall("a:author", ATOM_NS)
        ]
        out.append(
            ResearchPaper(
                title=title,
                source="arxiv",
                source_id=arxiv_id,
                authors=[a for a in authors if a],
                abstract_text=summary or None,
                year=year,
                doi=doi,
                url=f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None,
                pdf_url=f"https://arxiv.org/pdf/{arxiv_id}.pdf" if arxiv_id else None,
            )
        )
    return out


async def _fetch_crossref_by_author(
    client: httpx.AsyncClient, author_name: str, rows: int
) -> list[ResearchPaper]:
    try:
        resp = await client.get(
            f"{CROSSREF_API}/works",
            params={"query.author": author_name, "rows": str(rows)},
            headers={"User-Agent": f"{GH_USER_AGENT} ({OPENALEX_MAILTO})"},
        )
        if resp.status_code != 200:
            return []
        items = ((resp.json() or {}).get("message") or {}).get("items") or []
    except Exception as e:
        log.warning("crossref search failed for %s: %s", author_name, e)
        return []

    out: list[ResearchPaper] = []
    for it in items:
        if not isinstance(it, dict):
            continue
        title_list = it.get("title") or []
        title = title_list[0].strip() if title_list else ""
        if not title:
            continue
        doi = it.get("DOI") or None
        date_parts = ((it.get("issued") or {}).get("date-parts") or [[None]])[0]
        year = date_parts[0] if date_parts and isinstance(date_parts[0], int) else None
        authors = [
            f"{(a.get('given') or '').strip()} {(a.get('family') or '').strip()}".strip()
            for a in (it.get("author") or [])
            if isinstance(a, dict)
        ]
        out.append(
            ResearchPaper(
                title=title,
                source="crossref",
                source_id=doi or "",
                authors=[a for a in authors if a],
                year=year,
                venue=((it.get("container-title") or [None])[0]),
                doi=doi,
                url=it.get("URL"),
                citation_count=it.get("is-referenced-by-count"),
            )
        )
    return out


def _dedup_papers(papers: list[ResearchPaper]) -> list[ResearchPaper]:
    seen_doi: set[str] = set()
    seen_title: set[str] = set()
    out: list[ResearchPaper] = []
    for p in papers:
        key_doi = (p.doi or "").lower()
        key_title = p.title.strip().lower()
        if key_doi and key_doi in seen_doi:
            continue
        if key_title in seen_title:
            continue
        if key_doi:
            seen_doi.add(key_doi)
        seen_title.add(key_title)
        out.append(p)
    return out


async def fetch_papers_by_author(author_name: str, per_source: int) -> list[ResearchPaper]:
    """OpenAlex + arXiv concurrently, then Crossref as a top-up. Dedup on DOI/title."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        oa, ax = await asyncio.gather(
            _fetch_openalex_by_author(client, author_name, per_source),
            _fetch_arxiv_by_author(client, author_name, per_source),
            return_exceptions=False,
        )
        papers = _dedup_papers(list(oa) + list(ax))
        if not papers:
            # Only fall back to Crossref when the big two yielded nothing.
            cr = await _fetch_crossref_by_author(client, author_name, per_source)
            papers = _dedup_papers(cr)
    return papers


# ---------------------------------------------------------------------------
# GitHub client (async)
# ---------------------------------------------------------------------------


_GH_SEARCH_USERS = """
query($q: String!) {
  search(query: $q, type: USER, first: 10) {
    userCount
    nodes { ... on User { login name bio company location } }
  }
}"""

_GH_HYDRATE_USER = """
query($login: String!) {
  user(login: $login) {
    login name bio company location email websiteUrl twitterUsername
    socialAccounts(first: 10) { nodes { provider url displayName } }
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes { ... on Repository {
        name description stargazerCount
        primaryLanguage { name }
        repositoryTopics(first: 10) { nodes { topic { name } } }
      }}
    }
    repositories(first: 10, orderBy: {field: STARGAZERS, direction: DESC}, ownerAffiliations: OWNER) {
      nodes { name description stargazerCount
              primaryLanguage { name }
              repositoryTopics(first: 10) { nodes { topic { name } } } }
    }
  }
}"""


class GithubClient:
    def __init__(self, token: str, client: httpx.AsyncClient) -> None:
        self._token = token
        self._client = client

    async def _gql(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        r = await self._client.post(
            GH_GRAPHQL,
            headers={
                "Authorization": f"Bearer {self._token}",
                "User-Agent": GH_USER_AGENT,
            },
            json={"query": query, "variables": variables},
        )
        r.raise_for_status()
        payload = r.json()
        if payload.get("errors"):
            raise RuntimeError(f"github gql errors: {payload['errors']}")
        return payload.get("data") or {}

    async def search_users(self, q: str) -> list[str]:
        try:
            d = await self._gql(_GH_SEARCH_USERS, {"q": q})
        except Exception as e:
            log.warning("github search_users failed (%s): %s", q, e)
            return []
        nodes = ((d.get("search") or {}).get("nodes") or [])
        out: list[str] = []
        for n in nodes:
            if isinstance(n, dict) and n.get("login"):
                out.append(str(n["login"]))
        return out

    async def hydrate(self, login: str) -> dict[str, Any] | None:
        try:
            d = await self._gql(_GH_HYDRATE_USER, {"login": login})
        except Exception as e:
            log.warning("github hydrate(%s) failed: %s", login, e)
            return None
        u = d.get("user") or {}
        if not u:
            return None

        def parse_repos(nodes: list[Any]) -> list[dict[str, Any]]:
            out: list[dict[str, Any]] = []
            for r in nodes or []:
                if not isinstance(r, dict):
                    continue
                topics = [
                    ((t.get("topic") or {}).get("name") or "")
                    for t in ((r.get("repositoryTopics") or {}).get("nodes") or [])
                    if isinstance(t, dict)
                ]
                out.append(
                    {
                        "name": r.get("name") or "",
                        "description": r.get("description"),
                        "primary_language": ((r.get("primaryLanguage") or {}).get("name")),
                        "topics": [t for t in topics if t],
                        "stargazers": r.get("stargazerCount"),
                    }
                )
            return out

        twitter = u.get("twitterUsername")
        if not twitter:
            for s in ((u.get("socialAccounts") or {}).get("nodes") or []):
                if isinstance(s, dict) and s.get("provider") == "TWITTER":
                    twitter = s.get("url")
                    break
        return {
            "login": u.get("login") or login,
            "name": u.get("name"),
            "bio": u.get("bio"),
            "company": u.get("company"),
            "location": u.get("location"),
            "email": u.get("email"),
            "website_url": u.get("websiteUrl"),
            "twitter": twitter,
            "pinned_repos": parse_repos(((u.get("pinnedItems") or {}).get("nodes") or [])),
            "top_repos": parse_repos(((u.get("repositories") or {}).get("nodes") or [])),
        }


def build_gh_queries(
    name: str, affiliation: str | None, email: str | None
) -> list[tuple[str, str]]:
    """The three arms of the bandit over GitHub search queries."""
    out: list[tuple[str, str]] = [("name_only", f'"{name}" in:name,fullname')]
    if affiliation:
        out.append(("name_affil", f'"{name}" {affiliation} in:bio'))
    if email and "@" in email:
        domain = email.split("@", 1)[1]
        if domain:
            out.append(("name_email_domain", f'"{name}" {domain}'))
    return out


# ---------------------------------------------------------------------------
# Bandit (UCB1 with exponential discount)
# ---------------------------------------------------------------------------


def _ensure_arms(conn: psycopg.Connection, pool: str, arm_ids: list[str]) -> None:
    with conn.cursor() as cur:
        for a in arm_ids:
            cur.execute(
                "INSERT INTO leadmatch_bandit_arms(pool, arm_id) VALUES (%s, %s) "
                "ON CONFLICT DO NOTHING",
                (pool, a),
            )


def _select_arm(conn: psycopg.Connection, pool: str, arm_ids: list[str]) -> str:
    if not arm_ids:
        return "name_only"
    with conn.cursor() as cur:
        cur.execute(
            "SELECT arm_id, pulls, reward_sum FROM leadmatch_bandit_arms "
            "WHERE pool = %s AND arm_id = ANY(%s)",
            (pool, arm_ids),
        )
        rows = {r[0]: (float(r[1]), float(r[2])) for r in cur.fetchall()}

    total = max(sum(p for p, _ in rows.values()), 1.0)
    ln_t = max(math.log(total), 1.0)
    best = arm_ids[0]
    best_ucb = -math.inf
    for a in arm_ids:
        p, r = rows.get(a, (0.0, 0.0))
        if p > 0:
            mean = r / p
            bonus = UCB_EXPLORE_C * math.sqrt(ln_t / p)
        else:
            mean = 0.0
            bonus = math.inf
        ucb = mean + bonus
        if ucb > best_ucb:
            best_ucb = ucb
            best = a
    return best


def _report_arm(conn: psycopg.Connection, pool: str, arm: str, reward: float) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE leadmatch_bandit_arms SET "
            "  pulls      = pulls * %s + 1, "
            "  reward_sum = reward_sum * %s + %s, "
            "  reward_sq  = reward_sq  * %s + %s * %s, "
            "  last_pull  = now() "
            "WHERE pool = %s AND arm_id = %s",
            (
                UCB_DISCOUNT,
                UCB_DISCOUNT,
                reward,
                UCB_DISCOUNT,
                reward,
                reward,
                pool,
                arm,
            ),
        )


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


def _normalize_str(s: str) -> str:
    decomposed = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


_TOKEN_RE = re.compile(r"[^0-9A-Za-z]+")


def _tokens(s: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.split(s or "") if len(t) > 2]


def _jw(a: str, b: str) -> float:
    # rapidfuzz returns distance in [0,1]; similarity = 1 - distance.
    return 1.0 - float(JaroWinkler.normalized_distance(a, b))


def _name_similarity(author_name: str, cand: dict[str, Any]) -> float:
    a = _normalize_str(author_name)
    best = 0.0

    def _try(t: str | None) -> None:
        nonlocal best
        if not t:
            return
        s = _jw(a, _normalize_str(t))
        if s > best:
            best = s

    _try(cand.get("login"))
    _try(cand.get("name"))
    if " " in author_name:
        first, last = author_name.split(" ", 1)
        compact = f"{(first[:1] or ' ')}{last}"
        _try(compact)
    return best


def _affil_similarity(affil: str | None, cand: dict[str, Any]) -> float:
    if not affil:
        return 0.0
    haystack = " ".join(
        [
            cand.get("company") or "",
            cand.get("bio") or "",
            cand.get("location") or "",
            cand.get("email") or "",
            cand.get("website_url") or "",
        ]
    )
    atoks = set(_tokens(affil))
    htoks = set(_tokens(haystack))
    if not atoks:
        return 0.0
    return len(atoks & htoks) / float(len(atoks))


def _signal_similarity(email: str | None, cand: dict[str, Any]) -> float:
    hits = 0.0
    max_ = 0.0
    if email and "@" in email:
        max_ += 1.0
        domain = email.split("@", 1)[1].lower()
        blob = " ".join(
            [
                cand.get("email") or "",
                cand.get("website_url") or "",
                cand.get("bio") or "",
            ]
        ).lower()
        if domain and domain in blob:
            hits += 1.0
    max_ += 1.0
    if cand.get("website_url") or cand.get("twitter"):
        hits += 0.5
    return 0.0 if max_ == 0 else hits / max_


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    if a.size == 0 or b.size == 0:
        return 0.0
    # Inputs from embed_texts are already L2-normalized, but don't assume it.
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na < 1e-12 or nb < 1e-12:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def score_candidate(
    author_name: str,
    affiliation: str | None,
    email: str | None,
    author_topic: np.ndarray,
    cand: dict[str, Any],
    cand_emb: np.ndarray,
) -> dict[str, float]:
    name_sim = _name_similarity(author_name, cand)
    affil = _affil_similarity(affiliation, cand)
    if author_topic.size == 0 or cand_emb.size == 0:
        topic = 0.0
    else:
        topic = (_cosine(author_topic, cand_emb) + 1.0) / 2.0
    signal = _signal_similarity(email, cand)
    total = (
        SCORE_WEIGHTS["name"] * name_sim
        + SCORE_WEIGHTS["affil"] * affil
        + SCORE_WEIGHTS["topic"] * topic
        + SCORE_WEIGHTS["signal"] * signal
    )
    return {
        "name_sim": name_sim,
        "affil_overlap": affil,
        "topic_cos": topic,
        "signal_match": signal,
        "total": total,
    }


def candidate_topic_text(cand: dict[str, Any]) -> str:
    parts: list[str] = []
    if cand.get("bio"):
        parts.append(str(cand["bio"]))
    repos = (list(cand.get("pinned_repos") or []) + list(cand.get("top_repos") or []))[:10]
    for r in repos:
        if not isinstance(r, dict):
            continue
        if r.get("description"):
            parts.append(str(r["description"]))
        topics = r.get("topics") or []
        if topics:
            parts.append(" ".join(str(t) for t in topics))
    return ". ".join(parts)


def _mean_rows_normed(rows: list[list[float]]) -> np.ndarray:
    if not rows:
        return np.zeros(0, dtype=np.float32)
    arr = np.asarray(rows, dtype=np.float32)
    mean = arr.mean(axis=0)
    n = float(np.linalg.norm(mean))
    if n < 1e-12:
        return mean
    return mean / n


# ---------------------------------------------------------------------------
# State persistence (replaces SQLite contact_match_state + Lance gh_profiles)
# ---------------------------------------------------------------------------


def _upsert_state(
    conn: psycopg.Connection,
    contact_id: str,
    status: str,
    *,
    score: float | None = None,
    login: str | None = None,
    arm_id: str | None = None,
    evidence: dict[str, Any] | None = None,
    papers: list[dict[str, Any]] | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO leadmatch_state "
            "(contact_id, status, score, login, arm_id, evidence, papers) "
            "VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb) "
            "ON CONFLICT (contact_id) DO UPDATE SET "
            "  status = EXCLUDED.status, "
            "  score = EXCLUDED.score, "
            "  login = EXCLUDED.login, "
            "  arm_id = EXCLUDED.arm_id, "
            "  evidence = EXCLUDED.evidence, "
            "  papers = COALESCE(EXCLUDED.papers, leadmatch_state.papers), "
            "  updated_at = now()",
            (
                contact_id,
                status,
                score,
                login,
                arm_id,
                json.dumps(evidence or {}),
                json.dumps(papers) if papers is not None else None,
            ),
        )


def _upsert_candidate(
    conn: psycopg.Connection,
    contact_id: str,
    login: str,
    profile: dict[str, Any],
    topics_emb: list[float],
    score: float,
    breakdown: dict[str, float],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO leadmatch_candidates "
            "(contact_id, login, profile, topics_emb, score, breakdown) "
            "VALUES (%s, %s, %s::jsonb, %s::jsonb, %s, %s::jsonb) "
            "ON CONFLICT (contact_id, login) DO UPDATE SET "
            "  profile = EXCLUDED.profile, "
            "  topics_emb = EXCLUDED.topics_emb, "
            "  score = EXCLUDED.score, "
            "  breakdown = EXCLUDED.breakdown, "
            "  updated_at = now()",
            (
                contact_id,
                login,
                json.dumps(profile),
                json.dumps(topics_emb),
                score,
                json.dumps(breakdown),
            ),
        )


# ---------------------------------------------------------------------------
# Pipeline (single contact)
# ---------------------------------------------------------------------------


async def process_contact(
    contact: dict[str, Any],
    *,
    gh: GithubClient,
    conn: psycopg.Connection,
) -> dict[str, Any]:
    """Full match pipeline for a single contact. Returns a summary dict."""
    contact_id = str(contact.get("id"))
    name = (contact.get("name") or "").strip()
    tags = contact.get("tags") or []
    affiliation = contact.get("affiliation") or None
    email = contact.get("email") or None

    # Gate.
    if not any(t == "papers" for t in tags):
        _upsert_state(
            conn,
            contact_id,
            "no_relevant_papers",
            score=0.0,
            evidence={"reason": "tag_gate_failed"},
        )
        return {"contact_id": contact_id, "status": "no_relevant_papers", "score": 0.0}

    # Arms.
    arms = build_gh_queries(name, affiliation, email)
    arm_ids = [a for a, _ in arms]
    _ensure_arms(conn, BANDIT_POOL, arm_ids)
    arm_id = _select_arm(conn, BANDIT_POOL, arm_ids)
    query = next((q for a, q in arms if a == arm_id), arms[0][1])
    fallback_query = arms[0][1]

    # Branch A + B concurrently.
    branch_a = _branch_papers(contact, name)
    branch_b = _branch_github(gh, arm_id, query, fallback_query)
    (papers, author_topic), hydrated = await asyncio.gather(branch_a, branch_b)

    if not papers:
        _upsert_state(
            conn,
            contact_id,
            "no_relevant_papers",
            score=0.0,
            arm_id=arm_id,
            evidence={"reason": "no_papers"},
        )
        return {"contact_id": contact_id, "status": "no_relevant_papers", "score": 0.0}

    if not hydrated:
        _report_arm(conn, BANDIT_POOL, arm_id, 0.0)
        _upsert_state(
            conn,
            contact_id,
            "no_github",
            score=0.0,
            arm_id=arm_id,
            evidence={"reason": "no_candidates", "query": query},
            papers=[p.to_dict() for p in papers],
        )
        return {"contact_id": contact_id, "status": "no_github", "score": 0.0}

    # Candidate topic embeddings.
    topic_texts = [candidate_topic_text(c) for c in hydrated]
    # Skip empties → pad with zero vectors for alignment.
    nonempty_idx = [i for i, t in enumerate(topic_texts) if t.strip()]
    nonempty_texts = [topic_texts[i] for i in nonempty_idx]
    try:
        raw_embs = await embed_texts(nonempty_texts) if nonempty_texts else []
    except Exception as e:
        log.warning("embed_texts failed for candidates: %s", e)
        raw_embs = []
    dim = len(raw_embs[0]) if raw_embs else 0
    cand_embs: list[np.ndarray] = [np.zeros(dim, dtype=np.float32) for _ in topic_texts]
    for pos, idx in enumerate(nonempty_idx):
        if pos < len(raw_embs):
            cand_embs[idx] = np.asarray(raw_embs[pos], dtype=np.float32)

    scored: list[tuple[dict[str, Any], dict[str, float], np.ndarray]] = []
    for cand, emb in zip(hydrated, cand_embs):
        b = score_candidate(name, affiliation, email, author_topic, cand, emb)
        scored.append((cand, b, emb))
    scored.sort(key=lambda t: t[1]["total"], reverse=True)

    # Stash every candidate for audit.
    for cand, bd, emb in scored:
        _upsert_candidate(
            conn, contact_id, cand["login"], cand, emb.tolist(), bd["total"], bd
        )

    best_cand, best_b, _ = scored[0]
    papers_json = [p.to_dict() for p in papers]

    if best_b["total"] >= MATCH_THRESHOLD:
        evidence = {
            "picked": best_cand["login"],
            "name_sim": best_b["name_sim"],
            "affil_overlap": best_b["affil_overlap"],
            "topic_cos": best_b["topic_cos"],
            "signal_match": best_b["signal_match"],
            "runner_ups": [
                {"login": c["login"], "score": b["total"]} for c, b, _ in scored[1:3]
            ],
        }
        _upsert_state(
            conn,
            contact_id,
            "matched",
            score=best_b["total"],
            login=best_cand["login"],
            arm_id=arm_id,
            evidence=evidence,
            papers=papers_json,
        )
        _report_arm(conn, BANDIT_POOL, arm_id, best_b["total"])
        return {
            "contact_id": contact_id,
            "status": "matched",
            "score": best_b["total"],
            "login": best_cand["login"],
            "breakdown": best_b,
        }

    _report_arm(conn, BANDIT_POOL, arm_id, 0.0)
    evidence = {
        "reason": "below_threshold",
        "best_login": best_cand["login"],
        "best_score": best_b["total"],
    }
    _upsert_state(
        conn,
        contact_id,
        "no_github",
        score=best_b["total"],
        arm_id=arm_id,
        evidence=evidence,
        papers=papers_json,
    )
    return {
        "contact_id": contact_id,
        "status": "no_github",
        "score": best_b["total"],
        "login": None,
    }


async def _branch_papers(
    contact: dict[str, Any], name: str
) -> tuple[list[ResearchPaper], np.ndarray]:
    """Gather papers (or use ones attached to the contact), embed them, mean-pool."""
    prepacked = contact.get("papers") or []
    papers: list[ResearchPaper] = []
    for p in prepacked:
        if not isinstance(p, dict):
            continue
        papers.append(
            ResearchPaper(
                title=str(p.get("title") or ""),
                source=str(p.get("source") or "unknown"),
                source_id=str(p.get("source_id") or p.get("doi") or ""),
                authors=[str(a) for a in (p.get("authors") or [])],
                abstract_text=p.get("abstract") or p.get("abstract_text"),
                year=p.get("year"),
                venue=p.get("venue"),
                doi=p.get("doi"),
                url=p.get("url"),
                pdf_url=p.get("pdf_url"),
                citation_count=p.get("citation_count"),
            )
        )
    if not papers and name:
        papers = await fetch_papers_by_author(name, FETCH_PER_SOURCE)
    papers = [p for p in papers if p.title]
    if not papers:
        return ([], np.zeros(0, dtype=np.float32))

    texts = [paper_text_for_embedding(p) for p in papers]
    try:
        rows = await embed_texts(texts)
    except Exception as e:
        log.warning("embed_texts failed for papers: %s", e)
        return (papers, np.zeros(0, dtype=np.float32))

    return (papers, _mean_rows_normed(rows))


async def _branch_github(
    gh: GithubClient, arm_id: str, query: str, fallback_query: str
) -> list[dict[str, Any]]:
    logins = await gh.search_users(query)
    if not logins and arm_id != "name_only":
        logins = await gh.search_users(fallback_query)
    if not logins:
        return []
    top = logins[:5]
    hydrated = await asyncio.gather(*[gh.hydrate(lg) for lg in top])
    return [h for h in hydrated if h]


# ---------------------------------------------------------------------------
# Promote (Neon leadmatch_state → Neon contacts)
# ---------------------------------------------------------------------------


def _promote(status_filter: str, min_score: float) -> dict[str, int]:
    counts = {"considered": 0, "promoted": 0, "skipped": 0}
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT contact_id, status, score, login, arm_id, evidence, papers "
                "FROM leadmatch_state WHERE status = %s",
                (status_filter,),
            )
            rows = cur.fetchall()

        for contact_id, status, score, login, arm_id, evidence, papers in rows:
            counts["considered"] += 1
            score_f = float(score or 0.0)
            if score_f < min_score:
                counts["skipped"] += 1
                continue
            try:
                contact_id_int = int(contact_id)
            except (TypeError, ValueError):
                log.warning("skip non-numeric contact id: %s", contact_id)
                counts["skipped"] += 1
                continue

            evidence_ref = None
            if isinstance(evidence, dict):
                evidence_ref = json.dumps(evidence)
            papers_json = papers if papers is not None else []

            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE contacts SET "
                    "  github_handle         = COALESCE(%s, github_handle), "
                    "  papers                = %s::jsonb, "
                    "  papers_enriched_at    = now()::text, "
                    "  gh_match_score        = %s, "
                    "  gh_match_status       = %s, "
                    "  gh_match_arm          = COALESCE(%s, gh_match_arm), "
                    "  gh_match_evidence_ref = COALESCE(%s, gh_match_evidence_ref), "
                    "  updated_at            = now()::text "
                    "WHERE id = %s",
                    (
                        login,
                        json.dumps(papers_json),
                        score_f,
                        status,
                        arm_id,
                        evidence_ref,
                        contact_id_int,
                    ),
                )
                if cur.rowcount > 0:
                    counts["promoted"] += 1
                else:
                    counts["skipped"] += 1
    return counts


# ---------------------------------------------------------------------------
# Dossier
# ---------------------------------------------------------------------------


def _dossier(login: str) -> dict[str, Any]:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT contact_id, profile, score, breakdown, updated_at "
            "FROM leadmatch_candidates WHERE login = %s "
            "ORDER BY score DESC NULLS LAST LIMIT 20",
            (login,),
        )
        cand_rows = cur.fetchall()
        cur.execute(
            "SELECT contact_id, status, score, arm_id, evidence, papers, updated_at "
            "FROM leadmatch_state WHERE login = %s",
            (login,),
        )
        state_rows = cur.fetchall()

    candidates = [
        {
            "contact_id": r[0],
            "profile": r[1],
            "score": float(r[2]) if r[2] is not None else None,
            "breakdown": r[3],
            "updated_at": r[4].isoformat() if r[4] else None,
        }
        for r in cand_rows
    ]
    states = [
        {
            "contact_id": r[0],
            "status": r[1],
            "score": float(r[2]) if r[2] is not None else None,
            "arm_id": r[3],
            "evidence": r[4],
            "papers": r[5],
            "updated_at": r[6].isoformat() if r[6] else None,
        }
        for r in state_rows
    ]
    return {"login": login, "candidates": candidates, "states": states}


# ---------------------------------------------------------------------------
# Pull contact seeds from Neon
# ---------------------------------------------------------------------------


def _list_contacts_needing_match(limit: int) -> list[dict[str, Any]]:
    """Return contacts tagged ``papers`` that lack a GitHub handle or papers."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, first_name, last_name, email, company "
            "FROM contacts "
            "WHERE COALESCE(tags, '[]')::jsonb ? 'papers' "
            "  AND (github_handle IS NULL OR papers_enriched_at IS NULL) "
            "ORDER BY id "
            "LIMIT %s",
            (limit,),
        )
        rows = cur.fetchall()
    out: list[dict[str, Any]] = []
    for cid, first, last, email, company in rows:
        name = f"{first or ''} {last or ''}".strip()
        out.append(
            {
                "id": str(cid),
                "name": name,
                "affiliation": company,
                "email": email,
                "tags": ["papers"],
                "papers": [],
            }
        )
    return out


# ---------------------------------------------------------------------------
# Graph node (dispatcher)
# ---------------------------------------------------------------------------


async def _run_match(contacts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not contacts:
        return []
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        raise RuntimeError("GITHUB_TOKEN not set")

    _run_migrate()
    semaphore = asyncio.Semaphore(max(1, CONCURRENCY))
    results: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=30.0) as http_client:
        gh = GithubClient(token, http_client)

        async def _one(c: dict[str, Any]) -> dict[str, Any]:
            async with semaphore:
                # Each contact gets its own short-lived Neon connection —
                # psycopg3 sync connections don't share across coroutines.
                try:
                    with _connect() as conn:
                        return await process_contact(c, gh=gh, conn=conn)
                except Exception as e:
                    log.exception("process_contact failed for %s: %s", c.get("id"), e)
                    return {"contact_id": str(c.get("id")), "status": "error", "error": str(e)}

        results = await asyncio.gather(*[_one(c) for c in contacts])
    return results


async def dispatch(state: LeadPapersState) -> dict[str, Any]:
    command = (state.get("command") or "").strip().lower()
    started = time.monotonic()

    if command == "migrate":
        try:
            _run_migrate()
            return {"stats": {"migrated": True}}
        except Exception as e:
            log.exception("migrate failed")
            return {"error": f"migrate: {e}"}

    if command == "match":
        contacts = list(state.get("contacts") or [])
        if not contacts:
            return {"error": "match: no contacts supplied", "results": []}
        try:
            results = await _run_match(contacts)
            return {
                "results": results,
                "stats": {
                    "count": len(results),
                    "elapsed_s": round(time.monotonic() - started, 2),
                },
            }
        except Exception as e:
            log.exception("match failed")
            return {"error": f"match: {e}", "results": []}

    if command == "run":
        limit = int(state.get("limit") or 20)
        try:
            seeds = _list_contacts_needing_match(limit)
            log.info("leadmatch run: fetched %d contact seeds from neon", len(seeds))
            results = await _run_match(seeds)
            return {
                "results": results,
                "stats": {
                    "seeds": len(seeds),
                    "count": len(results),
                    "elapsed_s": round(time.monotonic() - started, 2),
                },
            }
        except Exception as e:
            log.exception("run failed")
            return {"error": f"run: {e}", "results": []}

    if command == "promote":
        status_filter = (state.get("status") or "matched").strip()
        min_score = float(state.get("min_score") or MATCH_THRESHOLD)
        try:
            _run_migrate()
            counts = _promote(status_filter, min_score)
            log.info(
                "promote: considered=%d promoted=%d skipped=%d",
                counts["considered"],
                counts["promoted"],
                counts["skipped"],
            )
            return {"promote_counts": counts}
        except Exception as e:
            log.exception("promote failed")
            return {"error": f"promote: {e}"}

    if command == "dossier":
        login = (state.get("login") or "").strip()
        if not login:
            return {"error": "dossier: login required"}
        try:
            _run_migrate()
            return {"dossier": _dossier(login)}
        except Exception as e:
            log.exception("dossier failed")
            return {"error": f"dossier: {e}"}

    return {"error": f"unknown command: {command!r}"}


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(LeadPapersState)
    builder.add_node("dispatch", dispatch)
    builder.add_edge(START, "dispatch")
    builder.add_edge("dispatch", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()


# ---------------------------------------------------------------------------
# For tests / direct use: tiny helpers that mirror the Rust unit surface.
# ---------------------------------------------------------------------------


def _sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


__all__ = [
    "LeadPapersState",
    "ResearchPaper",
    "build_gh_queries",
    "build_graph",
    "candidate_topic_text",
    "dispatch",
    "fetch_papers_by_author",
    "graph",
    "paper_stable_id",
    "paper_text_for_embedding",
    "process_contact",
    "score_candidate",
]

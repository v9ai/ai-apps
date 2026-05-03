"""GitHub AI Python repo → sellable-lead discovery graph.

Pipeline: ``search → filter_active → enrich → score → persist``.

Surfaces actively-maintained, Python-first AI repos with at least ``min_stars``
stars (default 1000) so the maintaining org/team can be pitched. Complements
``gh_patterns_graph.py`` (which mines repos for *contributor talent*); here the
**repo and its owning org are the lead** — the buyer we want to sell to.

Run knobs (all optional, set on the input state):

* ``topics``               — GH topics to search; defaults to a curated AI list.
* ``min_stars``            — default 1000.
* ``active_within_days``   — default 30 (push date must be within this).
* ``per_topic_limit``      — default 25 results per topic before dedupe.
* ``max_repos``            — overall cap after dedupe (default 60).
* ``persist_companies``    — when True, upserts orgs + repos into the D1
                             side-channel store (``gh_orgs`` / ``gh_repos``
                             tables in the ``lead-gen-jobs`` D1 database).
                             Intentionally NOT mirrored to Neon ``companies``
                             so downstream pipelines (email_outreach,
                             contact_discovery, /products/[slug]/leads) stay
                             isolated from these leads. Default False
                             (state-only run).
* ``require_readme``       — when True, drops repos with no fetchable README.

Reuses :class:`leadgen_agent.gh_patterns_graph.GhClient` so this graph piggybacks
on the same retry/backoff and ``GITHUB_TOKEN`` env contract.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import statistics
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from . import blocklist
from ._d1 import D1Client, D1Error
from .gh_patterns_graph import AI_RELEVANT_TOPICS, GhClient
from .llm import (
    ainvoke_json_with_telemetry,
    compute_totals,
    deepseek_model_name,
    make_deepseek_pro,
    merge_node_telemetry,
)
from .product_intel_schemas import product_intel_graph_meta
from .state import GhAiReposState

log = logging.getLogger(__name__)


# ── Constants ────────────────────────────────────────────────────────────────

DEFAULT_TOPICS: tuple[str, ...] = (
    "llm",
    "large-language-models",
    "generative-ai",
    "ai-agent",
    "ai-agents",
    "rag",
    "machine-learning",
    "deep-learning",
    "nlp",
    "transformers",
    "langchain",
    "langgraph",
    "llamaindex",
    "vector-database",
    "embeddings",
    "fine-tuning",
    "multimodal",
)

DEFAULT_MIN_STARS = 200             # broaden floor; size caps do the filtering
DEFAULT_MAX_STARS = 10000           # drop megaprojects (mature sales motion)
DEFAULT_ACTIVE_WITHIN_DAYS = 30
DEFAULT_PER_TOPIC_LIMIT = 25
DEFAULT_MAX_REPOS = 60
DEFAULT_FRESHNESS_DAYS = 14
DEFAULT_CLASSIFY_TOP_N = 20
DEFAULT_HEURISTIC_FLOOR = 0.30
# Pre-sales-team filters: targets indie/early-stage orgs.
DEFAULT_MAX_ORG_MEMBERS = 15
DEFAULT_MAX_ORG_PUBLIC_REPOS = 50
DEFAULT_MAX_ORG_TOTAL_STARS = 30000

# Concurrency for the deep deepseek-pro classification fan-out. Matches
# lead_papers_graph's LEADMATCH_CONCURRENCY default — slow enough to stay
# under provider rate limits, fast enough to finish 20 repos in ~30 s.
CLASSIFY_CONCURRENCY = 5

# Canonical pain-point taxonomy — the LLM is forced to pick from this list
# (mirrors the SKILL_TAXONOMY pattern in gh_patterns_graph.py).
PAIN_POINTS: tuple[str, ...] = (
    "hosting_cost",
    "scaling",
    "eval_observability",
    "fine_tuning",
    "data_pipeline",
    "prompt_engineering",
    "security_compliance",
    "multi_tenant_isolation",
    "latency_optimization",
    "vector_db_choice",
)
BUYER_PERSONAS: tuple[str, ...] = (
    "founder_cto",
    "ml_team_lead",
    "platform_eng",
    "devrel",
    "indie_dev",
    "research_lab",
)
COMMERCIAL_INTENTS: tuple[str, ...] = (
    "paid_saas",
    "open_core",
    "oss_only",
    "research_demo",
    "awareness",
)

# Repos owned by these accounts are excluded — too big to pitch, awareness/cookbook
# repos, or known to be inert "list of X" aggregators.
EXCLUDED_OWNERS: frozenset[str] = frozenset({
    "openai", "anthropics", "google", "google-deepmind", "deepmind", "meta",
    "facebookresearch", "microsoft", "nvidia", "apple", "amazon", "aws",
    "huggingface", "tensorflow", "pytorch", "jax-ml",
})

# Lightweight filter — repos whose name screams "awesome list" or "tutorials".
_AWESOME_NAME_RE = re.compile(
    r"\b(awesome|cookbook|tutorial|examples|notebooks|cheatsheet|roadmap|interview|prompts?)\b",
    re.IGNORECASE,
)

_SLUG_RE = re.compile(r"[^a-z0-9]+")

PERSONAL_PROJECT_HINTS: tuple[str, ...] = (
    "personal project", "side project", "for fun", "weekend project", "hobby",
    "wip", "work in progress", "experimental", "research only",
)


# ── Pydantic schema for the LLM brief ────────────────────────────────────────

CommercialIntent = Literal[
    "paid_saas", "open_core", "oss_only", "research_demo", "awareness"
]
BuyerPersona = Literal[
    "founder_cto", "ml_team_lead", "platform_eng", "devrel",
    "indie_dev", "research_lab",
]


class RepoSellBrief(BaseModel):
    """Per-repo sell-fit brief produced by the deepseek-pro classify_llm pass.

    Output is grounded against fixed Literals (``commercial_intent``,
    ``buyer_persona``) and a canonical pain-point list so the model can't
    hallucinate freeform tags. ``pitch_angle`` is the user-facing payload —
    2–3 sentences ready to paste into a cold email.
    """

    model_config = ConfigDict(extra="ignore")

    commercial_intent: CommercialIntent
    pain_points: list[str] = Field(default_factory=list, max_length=4)
    buyer_persona: BuyerPersona
    pitch_angle: str = Field(default="", max_length=600)
    why_now: str = Field(default="", max_length=240)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    llm_score: float = Field(default=0.0, ge=0.0, le=1.0)

    @field_validator("pain_points", mode="before")
    @classmethod
    def _filter_pain_points(cls, v: object) -> list[str]:
        if not isinstance(v, list):
            return []
        out: list[str] = []
        for item in v:
            s = str(item or "").strip().lower().replace("-", "_").replace(" ", "_")
            if s in PAIN_POINTS and s not in out:
                out.append(s)
        return out[:4]

    @field_validator("confidence", "llm_score", mode="before")
    @classmethod
    def _coerce_float(cls, v: object) -> float:
        # The LLM occasionally emits "0.85" as a string or 85 as a percent.
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            f = float(v)
        else:
            try:
                f = float(str(v).replace("%", "").strip())
            except ValueError:
                return 0.0
        if f > 1.0:
            f = f / 100.0
        return max(0.0, min(1.0, f))


# ── Helpers ──────────────────────────────────────────────────────────────────


def _slugify(s: str) -> str:
    return _SLUG_RE.sub("-", (s or "").lower()).strip("-")


def _parse_iso(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def _is_python_primary(repo: dict[str, Any]) -> bool:
    """The GH search filter ``language:python`` checks ``primaryLanguage`` only,
    but a few repos still slip through with empty/null. Belt-and-braces."""
    lang = (repo.get("language") or "").strip().lower()
    return lang == "python"


def _dedupe_repos(repos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for r in repos:
        full = (r.get("full_name") or "").lower()
        if not full or full in seen:
            continue
        seen.add(full)
        out.append(r)
    return out


# ── Nodes ────────────────────────────────────────────────────────────────────


async def search(state: GhAiReposState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    topics = state.get("topics") or list(DEFAULT_TOPICS)
    min_stars = int(state.get("min_stars") or DEFAULT_MIN_STARS)
    per_topic_limit = max(1, min(int(state.get("per_topic_limit") or DEFAULT_PER_TOPIC_LIMIT), 100))

    try:
        client = GhClient.from_env()
    except RuntimeError as e:
        return {"_error": f"search: {e}"}

    try:
        results = await asyncio.gather(
            *[
                client.search_repos(
                    t, language="python", min_stars=min_stars, per_page=per_topic_limit
                )
                for t in topics
            ],
            return_exceptions=True,
        )
    finally:
        await client.aclose()

    collected: list[dict[str, Any]] = []
    per_topic_counts: dict[str, int] = {}
    for topic, res in zip(topics, results):
        if isinstance(res, BaseException):
            log.debug("search topic=%s failed: %s", topic, res)
            per_topic_counts[topic] = 0
            continue
        items = (res or {}).get("items") or []
        per_topic_counts[topic] = len(items)
        for it in items:
            it["_matched_topic"] = topic
            collected.append(it)

    deduped = _dedupe_repos(collected)

    # Drop excluded owners + obvious awesome-lists. These survive the GH topic
    # filter because they tag themselves with the relevant topics.
    kept: list[dict[str, Any]] = []
    for r in deduped:
        full = r.get("full_name") or ""
        owner = (full.split("/", 1)[0] if "/" in full else "").lower()
        name = r.get("name") or ""
        if owner in EXCLUDED_OWNERS:
            continue
        if _AWESOME_NAME_RE.search(name):
            continue
        if not _is_python_primary(r):
            continue
        kept.append(r)

    return {
        "raw_repos": kept,
        "agent_timings": {"search": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "search": {
                    "topics_searched": len(topics),
                    "raw_total": len(collected),
                    "post_dedupe": len(deduped),
                    "post_filters": len(kept),
                    "per_topic": per_topic_counts,
                }
            }
        },
    }


async def filter_active(state: GhAiReposState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    raw = state.get("raw_repos") or []
    if not raw:
        return {"active_repos": []}

    active_within = max(1, int(state.get("active_within_days") or DEFAULT_ACTIVE_WITHIN_DAYS))
    cutoff = datetime.now(timezone.utc) - timedelta(days=active_within)
    max_stars = int(state.get("max_stars") or DEFAULT_MAX_STARS)

    active: list[dict[str, Any]] = []
    dropped_too_big_stars = 0
    for r in raw:
        pushed = _parse_iso(r.get("pushed_at"))
        if pushed is None or pushed < cutoff:
            continue
        if r.get("archived") or r.get("disabled"):
            continue
        if int(r.get("stargazers_count") or 0) > max_stars:
            dropped_too_big_stars += 1
            continue
        active.append(r)

    # Keep top by stars then push recency, capped at max_repos.
    active.sort(
        key=lambda r: (
            int(r.get("stargazers_count") or 0),
            (_parse_iso(r.get("pushed_at")) or cutoff).timestamp(),
        ),
        reverse=True,
    )
    cap = max(1, int(state.get("max_repos") or DEFAULT_MAX_REPOS))
    active = active[:cap]

    return {
        "active_repos": active,
        "agent_timings": {"filter_active": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "filter_active": {
                    "input": len(raw),
                    "kept": len(active),
                    "active_within_days": active_within,
                    "max_stars": max_stars,
                    "dropped_too_big_stars": dropped_too_big_stars,
                }
            }
        },
    }


def _summarize_commit_activity(weeks: list[dict[str, Any]] | Any) -> tuple[int, int]:
    """Return (commits_4w, commits_1y) from /stats/commit_activity output.

    GH returns a list of 52 weekly buckets like ``{"week": <unix>, "total": N}``.
    Empty/None when the repo is too new or stats are still being computed.
    """
    if not isinstance(weeks, list) or not weeks:
        return 0, 0
    totals = [int(w.get("total") or 0) for w in weeks if isinstance(w, dict)]
    if not totals:
        return 0, 0
    return sum(totals[-4:]), sum(totals)


def _summarize_releases(
    releases: list[dict[str, Any]] | Any,
) -> tuple[int, int | None, str | None]:
    """Return (releases_90d, days_between_releases_median, latest_release_at)."""
    if not isinstance(releases, list) or not releases:
        return 0, None, None
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    parsed: list[datetime] = []
    for rel in releases:
        if not isinstance(rel, dict):
            continue
        published = _parse_iso(rel.get("published_at") or rel.get("created_at"))
        if published is None:
            continue
        parsed.append(published)
    if not parsed:
        return 0, None, None
    parsed.sort(reverse=True)
    recent = sum(1 for d in parsed if d >= cutoff)
    latest_iso = parsed[0].isoformat(timespec="seconds")
    if len(parsed) < 2:
        return recent, None, latest_iso
    gaps = [
        (parsed[i] - parsed[i + 1]).days
        for i in range(len(parsed) - 1)
        if (parsed[i] - parsed[i + 1]).days >= 0
    ]
    if not gaps:
        return recent, None, latest_iso
    median_gap = int(statistics.median(gaps))
    return recent, median_gap, latest_iso


async def enrich_repo(state: GhAiReposState) -> dict:
    """Hydrate each active repo with readme, languages, contribs, commit
    velocity (4w + 1y), and release cadence (count_90d + median gap).

    Renamed from ``enrich`` in the first cut. Runs in parallel with
    ``enrich_orgs`` — the two nodes write disjoint state keys so the merge
    reducers join cleanly at ``dedupe_vs_db``.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repos = state.get("active_repos") or []
    if not repos:
        return {"enriched_repos": []}

    require_readme = bool(state.get("require_readme") or False)

    try:
        client = GhClient.from_env()
    except RuntimeError as e:
        return {"_error": f"enrich_repo: {e}"}

    async def hydrate(r: dict[str, Any]) -> dict[str, Any] | None:
        full = r.get("full_name") or ""
        if "/" not in full:
            return None
        owner, name = full.split("/", 1)

        readme, languages, contribs, commit_weeks, releases = await asyncio.gather(
            client.get_file_content(owner, name, "README.md"),
            client.repo_languages(owner, name),
            client.repo_contributors(owner, name),
            client.repo_commit_activity(owner, name),
            client.repo_releases(owner, name),
            return_exceptions=True,
        )
        readme_text = readme if isinstance(readme, str) else ""
        languages = languages if isinstance(languages, dict) else {}
        contribs = contribs if isinstance(contribs, list) else []

        if require_readme and not readme_text:
            return None

        py_bytes = int(languages.get("Python") or 0)
        total_bytes = sum(int(v or 0) for v in languages.values()) or 1
        python_share = py_bytes / total_bytes

        commits_4w, commits_1y = _summarize_commit_activity(commit_weeks)
        releases_90d, days_between_releases, latest_release_at = _summarize_releases(
            releases
        )

        return {
            "full_name": full,
            "owner": owner,
            "name": name,
            "html_url": r.get("html_url") or f"https://github.com/{full}",
            "description": (r.get("description") or "")[:500],
            "stars": int(r.get("stargazers_count") or 0),
            "forks": int(r.get("forks_count") or 0),
            "open_issues": int(r.get("open_issues_count") or 0),
            "watchers": int(r.get("watchers_count") or 0),
            "topics": r.get("topics") or [],
            "matched_topic": r.get("_matched_topic"),
            "license": ((r.get("license") or {}).get("spdx_id") or "").strip() or None,
            "default_branch": r.get("default_branch"),
            "pushed_at": r.get("pushed_at"),
            "created_at": r.get("created_at"),
            "owner_type": ((r.get("owner") or {}).get("type") or "").strip() or None,
            "owner_login": ((r.get("owner") or {}).get("login") or "").strip() or owner,
            "homepage": (r.get("homepage") or "").strip() or None,
            "languages": languages,
            "python_share": round(python_share, 3),
            "contributors_count": len(contribs),
            "commits_4w": commits_4w,
            "commits_1y": commits_1y,
            "releases_90d": releases_90d,
            "days_between_releases": days_between_releases,
            "latest_release_at": latest_release_at,
            "readme_excerpt": (readme_text or "")[:6000],
            "readme_present": bool(readme_text),
        }

    try:
        # Bound concurrency so we don't blow the secondary rate-limit. 8 is the
        # same upper bound gh_patterns_graph uses for repo enrichment fan-out.
        sem = asyncio.Semaphore(8)

        async def guarded(r: dict[str, Any]) -> dict[str, Any] | None:
            async with sem:
                try:
                    return await hydrate(r)
                except Exception as e:  # noqa: BLE001
                    log.debug("enrich_repo %s failed: %s", r.get("full_name"), e)
                    return None

        out = await asyncio.gather(*[guarded(r) for r in repos])
    finally:
        await client.aclose()

    enriched = [r for r in out if r]

    return {
        "enriched_repos": enriched,
        "agent_timings": {"enrich_repo": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "enrich_repo": {
                    "input": len(repos),
                    "kept": len(enriched),
                    "dropped_no_readme": len(repos) - len(enriched) if require_readme else 0,
                }
            }
        },
    }


async def enrich_orgs(state: GhAiReposState) -> dict:
    """Fetch org-level metadata for every unique organization owner.

    Runs in parallel with ``enrich_repo`` — its input is the *raw* search
    results (``active_repos``) since both nodes only need the owner_login.
    Personal accounts (``owner.type != "Organization"``) are skipped — only
    orgs are persistable as buyer entities.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repos = state.get("active_repos") or []
    if not repos:
        return {"org_metadata": {}}

    org_logins: dict[str, None] = {}  # ordered set
    for r in repos:
        owner = (r.get("owner") or {})
        if (owner.get("type") or "").lower() != "organization":
            continue
        login = (owner.get("login") or "").strip()
        if login:
            org_logins.setdefault(login, None)

    if not org_logins:
        return {"org_metadata": {}}

    try:
        client = GhClient.from_env()
    except RuntimeError as e:
        return {"_error": f"enrich_orgs: {e}"}

    async def hydrate(login: str) -> tuple[str, dict[str, Any] | None]:
        try:
            org_payload, recent_repos = await asyncio.gather(
                client.org(login),
                client.org_repos(login, per_page=15),
                return_exceptions=True,
            )
        except Exception as e:  # noqa: BLE001
            log.debug("enrich_orgs %s failed: %s", login, e)
            return login, None
        if not isinstance(org_payload, dict):
            return login, None
        recent_repos = recent_repos if isinstance(recent_repos, list) else []

        ai_repo_count = 0
        total_org_stars = 0
        flagship_repo: dict[str, Any] | None = None
        for rr in recent_repos:
            if not isinstance(rr, dict):
                continue
            stars = int(rr.get("stargazers_count") or 0)
            total_org_stars += stars
            topics = set(rr.get("topics") or [])
            if topics & AI_RELEVANT_TOPICS:
                ai_repo_count += 1
            if flagship_repo is None or stars > int(flagship_repo.get("stars") or 0):
                flagship_repo = {
                    "name": rr.get("full_name") or rr.get("name"),
                    "stars": stars,
                    "description": (rr.get("description") or "")[:200],
                }

        return login, {
            "login": login,
            "name": org_payload.get("name"),
            "blog": (org_payload.get("blog") or "").strip() or None,
            "twitter_username": (org_payload.get("twitter_username") or "").strip() or None,
            "email": (org_payload.get("email") or "").strip() or None,
            "location": (org_payload.get("location") or "").strip() or None,
            "description": (org_payload.get("description") or "")[:400] or None,
            "public_members": int(org_payload.get("public_members") or 0),
            "public_repos": int(org_payload.get("public_repos") or 0),
            "followers": int(org_payload.get("followers") or 0),
            "created_at": org_payload.get("created_at"),
            "ai_repo_count": ai_repo_count,
            "total_org_stars": total_org_stars,
            "flagship_repo": flagship_repo,
        }

    try:
        sem = asyncio.Semaphore(8)

        async def guarded(login: str) -> tuple[str, dict[str, Any] | None]:
            async with sem:
                return await hydrate(login)

        results = await asyncio.gather(*[guarded(l) for l in org_logins])
    finally:
        await client.aclose()

    org_metadata = {login: payload for login, payload in results if payload}

    return {
        "org_metadata": org_metadata,
        "agent_timings": {"enrich_orgs": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "enrich_orgs": {
                    "input": len(org_logins),
                    "kept": len(org_metadata),
                }
            }
        },
    }


async def dedupe_vs_db(state: GhAiReposState) -> dict:
    """Look up which repos are already in D1 ``gh_repos`` so the scorer can
    suppress recently-seen leads (within ``freshness_days``).

    Single HTTP round-trip to the Cloudflare D1 REST API. Results are keyed
    by ``gh:<full_name>`` to match the lookup the scorer/persist nodes use.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repos = state.get("enriched_repos") or []
    if not repos:
        return {"existing_keys": {}}

    full_names = [r["full_name"] for r in repos if r.get("full_name")]
    if not full_names:
        return {"existing_keys": {}}

    existing: dict[str, dict[str, Any]] = {}
    try:
        client = D1Client()
        placeholders = ",".join("?" for _ in full_names)
        rows = await client.query(
            f"SELECT id, full_name, last_seen_at FROM gh_repos "
            f"WHERE full_name IN ({placeholders})",
            full_names,
        )
        now = datetime.now(timezone.utc)
        for row in rows:
            full_name = row.get("full_name")
            if not full_name:
                continue
            age_days: int | None = None
            last_seen_raw = row.get("last_seen_at")
            if last_seen_raw:
                last_seen = _parse_iso(str(last_seen_raw))
                if last_seen is not None:
                    if last_seen.tzinfo is None:
                        last_seen = last_seen.replace(tzinfo=timezone.utc)
                    age_days = (now - last_seen).days
            existing[f"gh:{full_name}"] = {
                "repo_id": int(row.get("id") or 0),
                "last_seen_days_ago": age_days,
            }
    except D1Error as e:
        # D1 miss must not kill the run — fall back to empty dedupe set.
        log.warning("dedupe_vs_db (D1): %s", e)
        existing = {}

    return {
        "existing_keys": existing,
        "agent_timings": {"dedupe_vs_db": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "dedupe_vs_db": {
                    "input": len(full_names),
                    "matched": len(existing),
                }
            }
        },
    }


def _score_repo(
    r: dict[str, Any],
    org: dict[str, Any] | None,
    *,
    framework_focus: str | None,
    last_seen_days_ago: int | None,
) -> tuple[float, list[str]]:
    """Heuristic 0..1 'sellability' score with one-line rationales.

    Blends repo signals (stars, commit/release velocity, license, README hints)
    with org signals (team size, blog/twitter presence, AI-repo focus). Adds a
    penalty for repos already in the DB within the dedupe window so a re-run
    drops them below the LLM threshold instead of re-classifying.
    """
    reasons: list[str] = []
    score = 0.0

    stars = r.get("stars") or 0
    # Sweet-spot 1k-5k: serious-but-still-pre-sales-team. Above 10k is filtered
    # earlier by max_stars, but we keep a soft taper for the 5k-10k band.
    if 1000 <= stars <= 5000:
        score += 0.18
        reasons.append(f"{stars:,} stars (sweet-spot 1k-5k)")
    elif 5000 < stars <= 10000:
        score += 0.10
        reasons.append(f"{stars:,} stars")
    elif 200 <= stars < 1000:
        score += 0.08
        reasons.append(f"{stars:,} stars")
    else:
        reasons.append(f"{stars:,} stars")

    contribs = r.get("contributors_count") or 0
    if contribs >= 30:
        score += 0.12
        reasons.append(f"{contribs} contributors — broad team")
    elif contribs >= 10:
        score += 0.08
        reasons.append(f"{contribs} contributors")
    elif contribs >= 3:
        score += 0.03

    if (r.get("owner_type") or "").lower() == "organization":
        score += 0.10
        reasons.append("owned by an org (not a personal account)")

    # Real activity (commit + release velocity) replaces the cosmetic pushed_at
    # boost. Bot pushes don't move these.
    commits_4w = int(r.get("commits_4w") or 0)
    if commits_4w >= 20:
        score += 0.10
        reasons.append(f"{commits_4w} commits in last 4 weeks")
    elif commits_4w >= 5:
        score += 0.05
        reasons.append(f"{commits_4w} commits in last 4 weeks")

    releases_90d = int(r.get("releases_90d") or 0)
    if releases_90d >= 1:
        score += 0.06
        reasons.append(f"{releases_90d} release(s) in last 90 days — productized cadence")

    days_between = r.get("days_between_releases")
    if isinstance(days_between, int) and days_between > 0 and days_between <= 60:
        score += 0.04
        reasons.append(f"median {days_between}d between releases")

    license_id = (r.get("license") or "").lower()
    if license_id in {"mit", "apache-2.0", "bsd-3-clause", "bsd-2-clause"}:
        score += 0.06
        reasons.append(f"permissive license ({license_id})")
    elif license_id in {"agpl-3.0", "gpl-3.0"}:
        score += 0.02
        reasons.append(f"copyleft license ({license_id}) — often paired with paid edition")

    open_issues = r.get("open_issues") or 0
    forks = r.get("forks") or 0
    if forks > 100 and open_issues > 20:
        score += 0.04
        reasons.append("active issue tracker (real users, real bugs)")

    readme = (r.get("readme_excerpt") or "").lower()
    homepage = (r.get("homepage") or "").lower()
    desc = (r.get("description") or "").lower()
    haystack = " ".join((readme, homepage, desc))

    # COMMERCIAL_HINTS scoring removed — for the pre-sales-team intent, hints
    # like "sales@", "pricing", "book a demo" indicate the org *already* has a
    # sales motion. We rely on the org-size caps in score_heuristic + the
    # max_stars cap in filter_active to filter those out.

    personal_hits = [h for h in PERSONAL_PROJECT_HINTS if h in haystack]
    if personal_hits:
        score -= 0.15
        reasons.append("personal-project hints: " + ", ".join(sorted(set(personal_hits))[:3]))

    if r.get("python_share", 0) >= 0.7:
        score += 0.04
        reasons.append(f"{int(r['python_share'] * 100)}% Python")

    # Org-level enrichment — only set when the owner is an Organization.
    # Smallness bonuses: tiny team, small footprint, focused repo set all
    # signal "no established sales org yet" → easier to pitch to founder/CTO.
    if org:
        members = int(org.get("public_members") or 0)
        org_total_stars = int(org.get("total_org_stars") or 0)
        org_repos = int(org.get("public_repos") or 0)
        if 0 < members <= 5:
            score += 0.10
            reasons.append(f"tiny team ({members} public members)")
        if 0 < org_total_stars <= 10000:
            score += 0.06
            reasons.append(f"small org footprint ({org_total_stars:,} total stars)")
        if 0 < org_repos <= 20:
            score += 0.04
            reasons.append(f"focused org ({org_repos} public repos)")
        if org.get("blog") or org.get("twitter_username"):
            score += 0.03
            reasons.append("org has blog/twitter — reachable")
        if int(org.get("ai_repo_count") or 0) >= 3:
            score += 0.04
            reasons.append(f"org maintains {org['ai_repo_count']} AI repos — focused")

    # Framework focus boost — when caller asks for, e.g. langgraph-only leads,
    # repos that explicitly tag themselves with that topic float to the top.
    if framework_focus:
        focus = framework_focus.strip().lower()
        topics_l = {str(t).lower() for t in (r.get("topics") or [])}
        if focus and focus in topics_l:
            score += 0.05
            reasons.append(f"matches framework focus ({focus})")

    # Freshness penalty — already in DB recently.
    if isinstance(last_seen_days_ago, int) and last_seen_days_ago < 90:
        score -= 0.20
        reasons.append(f"already in DB ({last_seen_days_ago}d ago) — recent dupe")

    return max(0.0, min(round(score, 3), 1.0)), reasons


async def score_heuristic(state: GhAiReposState) -> dict:
    """Apply the deepened heuristic to every enriched repo.

    Drops anything below ``heuristic_floor`` (default 0.30) so the LLM
    classifier only spends tokens on credible candidates. Also short-circuits
    repos already in DB within ``freshness_days`` — they keep their slot in
    ``scored_repos`` for visibility but get ``_skip_reason='fresh'``.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repos = state.get("enriched_repos") or []
    org_metadata: dict[str, Any] = state.get("org_metadata") or {}
    existing_keys: dict[str, Any] = state.get("existing_keys") or {}
    framework_focus = (state.get("framework_focus") or "").strip() or None
    floor = float(state.get("heuristic_floor") or DEFAULT_HEURISTIC_FLOOR)
    freshness_days = int(state.get("freshness_days") or DEFAULT_FRESHNESS_DAYS)
    max_org_members = int(state.get("max_org_members") or DEFAULT_MAX_ORG_MEMBERS)
    max_org_public_repos = int(state.get("max_org_public_repos") or DEFAULT_MAX_ORG_PUBLIC_REPOS)
    max_org_total_stars = int(state.get("max_org_total_stars") or DEFAULT_MAX_ORG_TOTAL_STARS)

    scored: list[dict[str, Any]] = []
    dropped_floor = 0
    dropped_too_big = 0
    skipped_fresh = 0
    for r in repos:
        existing = existing_keys.get(f"gh:{r['full_name']}") or {}
        last_seen = existing.get("last_seen_days_ago") if existing else None
        org = org_metadata.get(r.get("owner_login") or "")

        # Pre-sales-team gate: drop repos whose org exceeds any size cap.
        # Saves classify_llm cost and prevents BigCo orgs from sneaking past
        # the heuristic floor on raw star count alone.
        if org and (
            int(org.get("public_members") or 0) > max_org_members
            or int(org.get("public_repos") or 0) > max_org_public_repos
            or int(org.get("total_org_stars") or 0) > max_org_total_stars
        ):
            dropped_too_big += 1
            continue

        sell_score, reasons = _score_repo(
            r,
            org,
            framework_focus=framework_focus,
            last_seen_days_ago=last_seen,
        )

        skip_reason: str | None = None
        if (
            isinstance(last_seen, int)
            and last_seen < freshness_days
        ):
            skip_reason = "fresh"
            skipped_fresh += 1
        elif sell_score < floor:
            dropped_floor += 1
            continue

        scored.append({
            **r,
            "sell_score": sell_score,
            "score_reasons": reasons,
            "org": org,
            "existing_repo_id": existing.get("repo_id"),
            "_skip_reason": skip_reason,
        })

    scored.sort(key=lambda x: x["sell_score"], reverse=True)
    return {
        "scored_repos": scored,
        "agent_timings": {"score_heuristic": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "score_heuristic": {
                    "input": len(repos),
                    "kept": len(scored),
                    "dropped_below_floor": dropped_floor,
                    "dropped_too_big_org": dropped_too_big,
                    "skipped_fresh": skipped_fresh,
                    "floor": floor,
                    "max_org_members": max_org_members,
                    "max_org_public_repos": max_org_public_repos,
                    "max_org_total_stars": max_org_total_stars,
                }
            }
        },
    }


# ── LLM classification ───────────────────────────────────────────────────────

_CLASSIFY_SYSTEM = (
    "You are a B2B sell-fit analyst for AI infrastructure tools. Given a "
    "Python open-source AI repo (its README excerpt, topics, languages, "
    "commit + release cadence, owner-org metadata), classify it as a sales "
    "lead the user can pitch to.\n\n"
    "Return STRICT JSON with this exact shape, no prose:\n"
    "{\n"
    '  "commercial_intent": one of '
    + json.dumps(list(COMMERCIAL_INTENTS))
    + ",\n"
    '  "pain_points": list of up to 4 strings, each from '
    + json.dumps(list(PAIN_POINTS))
    + ",\n"
    '  "buyer_persona": one of '
    + json.dumps(list(BUYER_PERSONAS))
    + ",\n"
    '  "pitch_angle": 2-3 sentences (≤ 600 chars) ready to paste into a cold '
    "email. Reference the repo by name. Concrete value prop, no fluff.,\n"
    '  "why_now": 1 sentence (≤ 240 chars) on a *current* signal — recent '
    "release, hiring, fundraising, etc.,\n"
    '  "confidence": float in [0, 1] reflecting how confident you are in the '
    "above based on the evidence shown,\n"
    '  "llm_score": float in [0, 1] — your own estimate of how sellable this '
    "lead is.\n"
    "}\n\n"
    "Rules:\n"
    "- Pain points MUST be drawn from the canonical list above; reject "
    "anything else.\n"
    "- If the repo is a personal toy / research demo / awareness piece, set "
    'commercial_intent to "research_demo" or "awareness" and llm_score ≤ 0.3.\n'
    "- If you can't tell, set confidence < 0.4 — do not guess."
)


def _classify_payload(r: dict[str, Any]) -> dict[str, Any]:
    """Compact JSON payload for the classifier — keeps prompt under ~6K tokens."""
    org = r.get("org") or {}
    return {
        "full_name": r["full_name"],
        "owner_login": r.get("owner_login"),
        "owner_type": r.get("owner_type"),
        "description": r.get("description"),
        "topics": r.get("topics"),
        "stars": r.get("stars"),
        "forks": r.get("forks"),
        "open_issues": r.get("open_issues"),
        "contributors_count": r.get("contributors_count"),
        "license": r.get("license"),
        "homepage": r.get("homepage"),
        "python_share": r.get("python_share"),
        "languages": list((r.get("languages") or {}).keys())[:8],
        "pushed_at": r.get("pushed_at"),
        "created_at": r.get("created_at"),
        "commits_4w": r.get("commits_4w"),
        "commits_1y": r.get("commits_1y"),
        "releases_90d": r.get("releases_90d"),
        "days_between_releases": r.get("days_between_releases"),
        "latest_release_at": r.get("latest_release_at"),
        # Cap readme aggressively so the prompt stays under budget even with
        # 20 parallel calls. 4 KB is enough for a well-written project intro.
        "readme_excerpt": (r.get("readme_excerpt") or "")[:4000],
        "org": {
            "name": org.get("name"),
            "blog": org.get("blog"),
            "twitter": org.get("twitter_username"),
            "email": org.get("email"),
            "location": org.get("location"),
            "description": org.get("description"),
            "public_members": org.get("public_members"),
            "public_repos": org.get("public_repos"),
            "ai_repo_count": org.get("ai_repo_count"),
            "total_org_stars": org.get("total_org_stars"),
            "flagship_repo": org.get("flagship_repo"),
        } if org else None,
    }


async def classify_llm(state: GhAiReposState) -> dict:
    """Run deepseek-pro on the top ``classify_top_n`` heuristic-scored repos.

    Multi-Model Routing strategy: the cheap heuristic gates which repos get
    LLM spend. Each call is independent — partial failures store an empty
    brief so the persist node can still rank them.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    scored = state.get("scored_repos") or []
    if not scored:
        return {"classifications": {}}

    top_n = max(1, int(state.get("classify_top_n") or DEFAULT_CLASSIFY_TOP_N))
    # Skip already-fresh repos — heuristic short-circuited them above. They
    # still appear in scored_repos but with _skip_reason='fresh'.
    candidates = [r for r in scored if not r.get("_skip_reason")][:top_n]
    if not candidates:
        return {
            "classifications": {},
            "agent_timings": {"classify_llm": round(time.perf_counter() - t0, 3)},
        }

    sem = asyncio.Semaphore(CLASSIFY_CONCURRENCY)
    llm = make_deepseek_pro(temperature=0.2)
    classifications: dict[str, dict[str, Any]] = {}
    accumulated_tel: dict[str, Any] | None = None
    tel_lock = asyncio.Lock()

    async def classify_one(r: dict[str, Any]) -> None:
        nonlocal accumulated_tel
        payload = _classify_payload(r)
        try:
            async with sem:
                parsed, tel = await ainvoke_json_with_telemetry(
                    llm,
                    [
                        {"role": "system", "content": _CLASSIFY_SYSTEM},
                        {
                            "role": "user",
                            "content": (
                                "Classify this repo as a B2B sales lead. "
                                "Return JSON only.\n\n"
                                + json.dumps(payload, ensure_ascii=False)
                            ),
                        },
                    ],
                    provider="deepseek",
                )
        except Exception as e:  # noqa: BLE001
            log.warning("classify_llm %s failed: %s", r["full_name"], e)
            classifications[r["full_name"]] = {
                "error": str(e),
                "confidence": 0.0,
                "llm_score": 0.0,
            }
            return

        try:
            brief = RepoSellBrief.model_validate(parsed if isinstance(parsed, dict) else {})
            classifications[r["full_name"]] = brief.model_dump()
        except ValidationError as e:
            log.debug("classify_llm validation failed for %s: %s", r["full_name"], e)
            classifications[r["full_name"]] = {
                "error": f"validation: {e.errors()[:1]}",
                "confidence": 0.0,
                "llm_score": 0.0,
            }
            return

        # Per-call telemetry merges into a single bucket for the node — same
        # pattern as company_problems_graph but accumulated under a lock so
        # the parallel writes don't race.
        async with tel_lock:
            accumulated_tel = merge_node_telemetry(
                accumulated_tel, "classify_llm", tel
            )

    await asyncio.gather(*[classify_one(r) for r in candidates])

    prior_tel = (state.get("graph_meta") or {}).get("telemetry") or {}
    merged = dict(prior_tel)
    if accumulated_tel:
        merged.update(accumulated_tel)
    return {
        "classifications": classifications,
        "agent_timings": {"classify_llm": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                **merged,
                "classify_llm_node": {
                    "candidates": len(candidates),
                    "succeeded": sum(
                        1 for v in classifications.values() if "error" not in v
                    ),
                    "failed": sum(
                        1 for v in classifications.values() if "error" in v
                    ),
                },
            }
        },
    }


async def persist(state: GhAiReposState) -> dict:
    """Blend heuristic + LLM scores, sort, and (optionally) upsert orgs to
    ``companies`` with persona/intent tags. Only org-owned leads are persisted.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    scored = state.get("scored_repos") or []
    classifications = state.get("classifications") or {}
    persist_companies = bool(state.get("persist_companies") or False)
    freshness_days = int(state.get("freshness_days") or DEFAULT_FRESHNESS_DAYS)

    # Blend scores. When no LLM brief exists (below classify_top_n cutoff),
    # use heuristic alone. ``confidence`` and ``llm_score`` < 0.4 → fall back
    # to heuristic only — LLM said "I don't know", don't trust it.
    final: list[dict[str, Any]] = []
    for r in scored:
        brief = classifications.get(r["full_name"]) or {}
        has_brief = "error" not in brief and brief
        confidence = float(brief.get("confidence") or 0.0)
        llm_score = float(brief.get("llm_score") or 0.0)

        if has_brief and min(confidence, llm_score) >= 0.4:
            final_score = round(0.55 * float(r["sell_score"]) + 0.45 * llm_score, 3)
        else:
            final_score = round(float(r["sell_score"]), 3)

        merged: dict[str, Any] = {**r, "final_score": final_score}
        if has_brief:
            merged["brief"] = brief
        final.append(merged)

    final.sort(key=lambda x: x["final_score"], reverse=True)

    inserted_ids: list[int] = []
    existing_ids: list[int] = []
    skipped_blocked = 0
    skipped_fresh = 0

    if persist_companies and final:
        try:
            blocked = {b.domain for b in blocklist.list_all()}
        except Exception:
            # blocklist still lives in Neon; D1 side-channel must not fail
            # if the blocklist round-trip errors.
            blocked = set()

        existing_keys = state.get("existing_keys") or {}
        org_metadata = state.get("org_metadata") or {}

        # First pass: filter eligible rows. Same gates as before — score
        # threshold, org-only, freshness, blocklist — except canonical domain
        # is now only used for the blocklist check (not as a primary key).
        eligible: list[tuple[dict[str, Any], str]] = []  # (repo, owner_login)
        for r in final:
            if r["final_score"] < 0.25:
                continue
            if r.get("_skip_reason") == "fresh":
                skipped_fresh += 1
                continue
            owner_login = r.get("owner_login") or r["owner"]
            if (r.get("owner_type") or "").lower() != "organization":
                continue
            existing = existing_keys.get(f"gh:{r['full_name']}") or {}
            last_seen = existing.get("last_seen_days_ago")
            if isinstance(last_seen, int) and last_seen < freshness_days:
                skipped_fresh += 1
                continue
            homepage = r.get("homepage") or ""
            canonical = blocklist.canonicalize_domain(homepage)
            if not canonical or "." not in canonical:
                canonical = f"{owner_login.lower()}.github.io"
            if canonical in blocked:
                skipped_blocked += 1
                continue
            eligible.append((r, owner_login))

        if eligible:
            try:
                client = D1Client()

                # Batch 1: upsert orgs. One row per unique owner_login,
                # filled from org_metadata (the enrich_orgs node's output).
                seen_logins: set[str] = set()
                org_stmts: list[dict[str, Any]] = []
                for _r, login in eligible:
                    if login in seen_logins:
                        continue
                    seen_logins.add(login)
                    org = org_metadata.get(login) or {}
                    org_stmts.append({
                        "sql": (
                            "INSERT INTO gh_orgs "
                            "(github_login, name, blog, twitter_username, email, "
                            " location, public_members, public_repos, ai_repo_count, "
                            " total_org_stars, flagship_repo, last_seen_at) "
                            "VALUES (?,?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP) "
                            "ON CONFLICT(github_login) DO UPDATE SET "
                            "  name = COALESCE(excluded.name, gh_orgs.name), "
                            "  blog = COALESCE(excluded.blog, gh_orgs.blog), "
                            "  twitter_username = COALESCE(excluded.twitter_username, gh_orgs.twitter_username), "
                            "  email = COALESCE(excluded.email, gh_orgs.email), "
                            "  location = COALESCE(excluded.location, gh_orgs.location), "
                            "  public_members = COALESCE(excluded.public_members, gh_orgs.public_members), "
                            "  public_repos = COALESCE(excluded.public_repos, gh_orgs.public_repos), "
                            "  ai_repo_count = COALESCE(excluded.ai_repo_count, gh_orgs.ai_repo_count), "
                            "  total_org_stars = COALESCE(excluded.total_org_stars, gh_orgs.total_org_stars), "
                            "  flagship_repo = COALESCE(excluded.flagship_repo, gh_orgs.flagship_repo), "
                            "  last_seen_at = CURRENT_TIMESTAMP "
                            "RETURNING id, github_login"
                        ),
                        "params": [
                            login,
                            org.get("name"),
                            org.get("blog"),
                            org.get("twitter_username"),
                            org.get("email"),
                            org.get("location"),
                            org.get("public_members"),
                            org.get("public_repos"),
                            org.get("ai_repo_count"),
                            org.get("total_org_stars"),
                            org.get("flagship_repo"),
                        ],
                    })

                org_results = await client.batch(org_stmts)
                org_id_by_login: dict[str, int] = {}
                for rows in org_results:
                    for row in rows:
                        rid = row.get("id")
                        login = row.get("github_login")
                        if rid is not None and login:
                            org_id_by_login[str(login)] = int(rid)

                # Batch 2: upsert repos with their resolved org_id.
                repo_stmts: list[dict[str, Any]] = []
                for r, login in eligible:
                    org_id = org_id_by_login.get(login)
                    brief = r.get("brief") or {}

                    reasons: list[str] = []
                    if brief.get("pitch_angle"):
                        reasons.append(brief["pitch_angle"])
                    if brief.get("why_now"):
                        reasons.append(f"Why now: {brief['why_now']}")
                    reasons.extend((r.get("score_reasons") or [])[:3])
                    if not reasons:
                        reasons.append(
                            f"GH repo {r['full_name']} — {r['stars']:,}★, "
                            f"{r.get('contributors_count', 0)} contributors."
                        )

                    pain_points = brief.get("pain_points") or []
                    pain_points_json = json.dumps(
                        pain_points[:5] if isinstance(pain_points, list) else []
                    )

                    repo_stmts.append({
                        "sql": (
                            "INSERT INTO gh_repos "
                            "(full_name, org_id, html_url, owner_login, owner_type, "
                            " description, topics_json, matched_topic, stars, forks, "
                            " watchers, language, default_branch, pushed_at, homepage, "
                            " license_spdx, archived, fork, has_readme, contributors_count, "
                            " heuristic_score, llm_score, llm_confidence, final_score, "
                            " score_reasons, buyer_persona, commercial_intent, pain_points, "
                            " pitch_angle, why_now, brief_json, last_seen_at) "
                            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP) "
                            "ON CONFLICT(full_name) DO UPDATE SET "
                            "  org_id = excluded.org_id, "
                            "  html_url = excluded.html_url, "
                            "  owner_login = excluded.owner_login, "
                            "  owner_type = excluded.owner_type, "
                            "  description = excluded.description, "
                            "  topics_json = excluded.topics_json, "
                            "  matched_topic = excluded.matched_topic, "
                            "  stars = excluded.stars, "
                            "  forks = excluded.forks, "
                            "  watchers = excluded.watchers, "
                            "  language = excluded.language, "
                            "  default_branch = excluded.default_branch, "
                            "  pushed_at = excluded.pushed_at, "
                            "  homepage = excluded.homepage, "
                            "  license_spdx = excluded.license_spdx, "
                            "  archived = excluded.archived, "
                            "  fork = excluded.fork, "
                            "  has_readme = excluded.has_readme, "
                            "  contributors_count = excluded.contributors_count, "
                            "  heuristic_score = excluded.heuristic_score, "
                            "  llm_score = excluded.llm_score, "
                            "  llm_confidence = excluded.llm_confidence, "
                            "  final_score = excluded.final_score, "
                            "  score_reasons = excluded.score_reasons, "
                            "  buyer_persona = excluded.buyer_persona, "
                            "  commercial_intent = excluded.commercial_intent, "
                            "  pain_points = excluded.pain_points, "
                            "  pitch_angle = excluded.pitch_angle, "
                            "  why_now = excluded.why_now, "
                            "  brief_json = excluded.brief_json, "
                            "  last_seen_at = CURRENT_TIMESTAMP "
                            "RETURNING id, full_name"
                        ),
                        "params": [
                            r["full_name"],
                            org_id,
                            r.get("html_url"),
                            login,
                            r.get("owner_type"),
                            r.get("description"),
                            json.dumps(r.get("topics") or []),
                            r.get("matched_topic"),
                            int(r.get("stars") or 0),
                            r.get("forks"),
                            r.get("watchers"),
                            r.get("language"),
                            r.get("default_branch"),
                            r.get("pushed_at"),
                            r.get("homepage"),
                            (r.get("license") or {}).get("spdx_id") if isinstance(r.get("license"), dict) else r.get("license"),
                            1 if r.get("archived") else 0,
                            1 if r.get("fork") else 0,
                            1 if r.get("has_readme") else 0,
                            r.get("contributors_count"),
                            r.get("sell_score"),
                            brief.get("llm_score"),
                            brief.get("confidence"),
                            r["final_score"],
                            json.dumps(reasons),
                            brief.get("buyer_persona"),
                            brief.get("commercial_intent"),
                            pain_points_json,
                            brief.get("pitch_angle"),
                            brief.get("why_now"),
                            json.dumps(brief) if brief else None,
                        ],
                    })

                repo_results = await client.batch(repo_stmts)
                repo_id_by_full: dict[str, int] = {}
                for rows in repo_results:
                    for row in rows:
                        fn = row.get("full_name")
                        rid = row.get("id")
                        if fn and rid is not None:
                            repo_id_by_full[str(fn)] = int(rid)

                # Categorize via existing_keys: a row already in dedupe →
                # update; otherwise → insert. This matches the old xmax trick.
                for r, _login in eligible:
                    fn = r["full_name"]
                    rid = repo_id_by_full.get(fn)
                    if rid is None:
                        continue
                    if f"gh:{fn}" in existing_keys:
                        existing_ids.append(rid)
                    else:
                        inserted_ids.append(rid)
            except D1Error as e:
                return {"_error": f"persist (D1): {e}"}

    def _slim(r: dict[str, Any]) -> dict[str, Any]:
        return {
            "full_name": r["full_name"],
            "html_url": r["html_url"],
            "owner_login": r.get("owner_login"),
            "owner_type": r.get("owner_type"),
            "stars": r["stars"],
            "forks": r["forks"],
            "contributors_count": r.get("contributors_count"),
            "commits_4w": r.get("commits_4w"),
            "commits_1y": r.get("commits_1y"),
            "releases_90d": r.get("releases_90d"),
            "days_between_releases": r.get("days_between_releases"),
            "latest_release_at": r.get("latest_release_at"),
            "pushed_at": r.get("pushed_at"),
            "license": r.get("license"),
            "homepage": r.get("homepage"),
            "topics": r.get("topics"),
            "matched_topic": r.get("matched_topic"),
            "description": r.get("description"),
            "python_share": r.get("python_share"),
            "sell_score": r.get("sell_score"),
            "final_score": r.get("final_score"),
            "score_reasons": r.get("score_reasons"),
            "skip_reason": r.get("_skip_reason"),
            "existing_repo_id": r.get("existing_repo_id"),
            "org": (
                {
                    k: r["org"].get(k)
                    for k in (
                        "login", "name", "blog", "twitter_username", "email",
                        "location", "public_members", "public_repos",
                        "ai_repo_count", "total_org_stars", "flagship_repo",
                    )
                }
                if r.get("org")
                else None
            ),
            "brief": r.get("brief"),
        }

    slim = [_slim(r) for r in final]
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    agent_timings_so_far = dict(state.get("agent_timings") or {})
    agent_timings_so_far["persist"] = round(time.perf_counter() - t0, 3)
    meta = product_intel_graph_meta(
        graph="gh_ai_repos",
        model=deepseek_model_name("deep"),
        agent_timings=agent_timings_so_far,
        telemetry=telemetry,
        totals=compute_totals(telemetry),
    )

    summary: dict[str, Any] = {
        "topics_used": state.get("topics") or list(DEFAULT_TOPICS),
        "min_stars": int(state.get("min_stars") or DEFAULT_MIN_STARS),
        "active_within_days": int(state.get("active_within_days") or DEFAULT_ACTIVE_WITHIN_DAYS),
        "framework_focus": state.get("framework_focus") or None,
        "freshness_days": freshness_days,
        "classify_top_n": int(state.get("classify_top_n") or DEFAULT_CLASSIFY_TOP_N),
        "raw_count": len(state.get("raw_repos") or []),
        "active_count": len(state.get("active_repos") or []),
        "enriched_count": len(state.get("enriched_repos") or []),
        "scored_count": len(slim),
        "classified_count": sum(1 for r in slim if r.get("brief")),
        "top_repos": slim[:20],
        "all_repos": slim,
        "org_metadata": state.get("org_metadata") or {},
        "persisted_to_d1": persist_companies,
        "inserted_repo_ids": inserted_ids,
        "existing_repo_ids": existing_ids,
        "skipped_blocked": skipped_blocked,
        "skipped_fresh": skipped_fresh,
        "graph_meta": meta,
    }

    return {
        "final_repos": final,
        "inserted_repo_ids": inserted_ids,
        "existing_repo_ids": existing_ids,
        "summary": summary,
        "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
    }


# ── Graph builder ────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(GhAiReposState)
    builder.add_node("search", search)
    builder.add_node("filter_active", filter_active)
    builder.add_node("enrich_repo", enrich_repo)
    builder.add_node("enrich_orgs", enrich_orgs)
    builder.add_node("dedupe_vs_db", dedupe_vs_db)
    builder.add_node("score_heuristic", score_heuristic)
    builder.add_node("classify_llm", classify_llm)
    builder.add_node("persist", persist)

    builder.add_edge(START, "search")
    builder.add_edge("search", "filter_active")
    # Fan out: enrich_repo and enrich_orgs run in parallel — disjoint state
    # keys (enriched_repos vs org_metadata) so the merge reducers join cleanly
    # at dedupe_vs_db. dedupe needs enriched_repos so it implicitly waits for
    # enrich_repo; we add the same incoming edge from enrich_orgs to force the
    # join.
    builder.add_edge("filter_active", "enrich_repo")
    builder.add_edge("filter_active", "enrich_orgs")
    builder.add_edge("enrich_repo", "dedupe_vs_db")
    builder.add_edge("enrich_orgs", "dedupe_vs_db")
    builder.add_edge("dedupe_vs_db", "score_heuristic")
    builder.add_edge("score_heuristic", "classify_llm")
    builder.add_edge("classify_llm", "persist")
    builder.add_edge("persist", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()

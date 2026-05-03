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
* ``persist_companies``    — when True, upserts owning orgs into ``companies``
                             with ``tags=['gh-ai-repo-lead','discovery-candidate']``.
                             Default False (state-only run).
* ``require_readme``       — when True, drops repos with no fetchable README.

Reuses :class:`leadgen_agent.gh_patterns_graph.GhClient` so this graph piggybacks
on the same retry/backoff and ``GITHUB_TOKEN`` env contract.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from . import blocklist
from .deep_icp_graph import _dsn
from .gh_patterns_graph import GhClient
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
    "llamaindex",
    "vector-database",
    "embeddings",
    "fine-tuning",
    "multimodal",
)

DEFAULT_MIN_STARS = 1000
DEFAULT_ACTIVE_WITHIN_DAYS = 30
DEFAULT_PER_TOPIC_LIMIT = 25
DEFAULT_MAX_REPOS = 60

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

COMMERCIAL_HINTS: tuple[str, ...] = (
    "pricing", "enterprise", "saas", "cloud", "managed", "hosted", "platform",
    "api key", "billing", "sign up", "signup", "free tier", "subscription",
    "support@", "sales@", "contact us", "demo", "book a call", "schedule a demo",
    "we're hiring", "we are hiring", "careers",
)

PERSONAL_PROJECT_HINTS: tuple[str, ...] = (
    "personal project", "side project", "for fun", "weekend project", "hobby",
    "wip", "work in progress", "experimental", "research only",
)


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

    active: list[dict[str, Any]] = []
    for r in raw:
        pushed = _parse_iso(r.get("pushed_at"))
        if pushed is None or pushed < cutoff:
            continue
        if r.get("archived") or r.get("disabled"):
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
                }
            }
        },
    }


async def enrich(state: GhAiReposState) -> dict:
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
        return {"_error": f"enrich: {e}"}

    async def hydrate(r: dict[str, Any]) -> dict[str, Any] | None:
        full = r.get("full_name") or ""
        if "/" not in full:
            return None
        owner, name = full.split("/", 1)

        readme_task = client.get_file_content(owner, name, "README.md")
        langs_task = client.repo_languages(owner, name)
        contribs_task = client.repo_contributors(owner, name)

        readme, languages, contribs = await asyncio.gather(
            readme_task, langs_task, contribs_task, return_exceptions=True,
        )
        readme_text = readme if isinstance(readme, str) else ""
        languages = languages if isinstance(languages, dict) else {}
        contribs = contribs if isinstance(contribs, list) else []

        if require_readme and not readme_text:
            return None

        py_bytes = int(languages.get("Python") or 0)
        total_bytes = sum(int(v or 0) for v in languages.values()) or 1
        python_share = py_bytes / total_bytes

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
                    log.debug("enrich %s failed: %s", r.get("full_name"), e)
                    return None

        out = await asyncio.gather(*[guarded(r) for r in repos])
    finally:
        await client.aclose()

    enriched = [r for r in out if r]

    return {
        "enriched_repos": enriched,
        "agent_timings": {"enrich": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "enrich": {
                    "input": len(repos),
                    "kept": len(enriched),
                    "dropped_no_readme": len(repos) - len(enriched) if require_readme else 0,
                }
            }
        },
    }


def _score_repo(r: dict[str, Any]) -> tuple[float, list[str]]:
    """Heuristic 0..1 'sellability' score with one-line rationales.

    We boost orgs (vs personal accounts), commercial readmes, healthy fork/issue
    ratios, MIT/Apache licenses (= more likely productized), recent pushes, and
    high contributor counts. We penalize personal-project signals.
    """
    reasons: list[str] = []
    score = 0.0

    stars = r.get("stars") or 0
    if stars >= 5000:
        score += 0.20
        reasons.append(f"{stars:,} stars (≥5k)")
    elif stars >= 2500:
        score += 0.14
        reasons.append(f"{stars:,} stars (≥2.5k)")
    else:
        score += 0.08
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
        score += 0.12
        reasons.append("owned by an org (not a personal account)")

    pushed = _parse_iso(r.get("pushed_at"))
    if pushed:
        age_days = (datetime.now(timezone.utc) - pushed).days
        if age_days <= 7:
            score += 0.10
            reasons.append(f"pushed {age_days}d ago")
        elif age_days <= 30:
            score += 0.06
            reasons.append(f"pushed {age_days}d ago")

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

    commercial_hits = [h for h in COMMERCIAL_HINTS if h in haystack]
    if commercial_hits:
        score += min(0.18, 0.04 * len(commercial_hits))
        reasons.append(
            "commercial signals: "
            + ", ".join(sorted(set(commercial_hits))[:4])
        )

    personal_hits = [h for h in PERSONAL_PROJECT_HINTS if h in haystack]
    if personal_hits:
        score -= 0.15
        reasons.append("personal-project hints: " + ", ".join(sorted(set(personal_hits))[:3]))

    if r.get("python_share", 0) >= 0.7:
        score += 0.04
        reasons.append(f"{int(r['python_share'] * 100)}% Python")

    return max(0.0, min(round(score, 3), 1.0)), reasons


async def score(state: GhAiReposState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repos = state.get("enriched_repos") or []
    scored: list[dict[str, Any]] = []
    for r in repos:
        sell_score, reasons = _score_repo(r)
        scored.append({**r, "sell_score": sell_score, "score_reasons": reasons})

    scored.sort(key=lambda x: x["sell_score"], reverse=True)
    return {
        "scored_repos": scored,
        "agent_timings": {"score": round(time.perf_counter() - t0, 3)},
    }


async def persist(state: GhAiReposState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    scored = state.get("scored_repos") or []
    persist_companies = bool(state.get("persist_companies") or False)

    inserted_ids: list[int] = []
    existing_ids: list[int] = []
    skipped_blocked = 0

    if persist_companies and scored:
        try:
            blocked = {b.domain for b in blocklist.list_all()}
        except (psycopg.Error, RuntimeError):
            blocked = set()

        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    for r in scored:
                        if r["sell_score"] < 0.25:
                            continue
                        owner_login = r.get("owner_login") or r["owner"]
                        owner_type = (r.get("owner_type") or "").lower()
                        # Only upsert org-owned repos — personal accounts aren't
                        # buyer entities. Heuristic-scored repos still flow back
                        # in state.summary regardless.
                        if owner_type != "organization":
                            continue

                        homepage = r.get("homepage") or ""
                        canonical = blocklist.canonicalize_domain(homepage)
                        # Fall back to a github-derived pseudo-domain so the
                        # row has a unique key. Real enrichment can replace
                        # canonical_domain later.
                        if not canonical or "." not in canonical:
                            canonical = f"{owner_login.lower()}.github.io"
                        if canonical in blocked:
                            skipped_blocked += 1
                            continue

                        key = _slugify(canonical)[:200]
                        tags = [
                            "gh-ai-repo-lead",
                            "discovery-candidate",
                            f"gh:{r['full_name']}",
                        ]
                        if r.get("matched_topic"):
                            tags.append(f"topic:{r['matched_topic']}")
                        why = (
                            f"GH repo {r['full_name']} — {r['stars']:,}★, "
                            f"{r.get('contributors_count', 0)} contributors. "
                            + "; ".join(r["score_reasons"][:3])
                        )[:600]

                        cur.execute(
                            """
                            INSERT INTO companies
                              (tenant_id, key, name, canonical_domain, website,
                               category, ai_tier, tags, score, score_reasons,
                               created_at, updated_at)
                            VALUES
                              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                               now()::text, now()::text)
                            ON CONFLICT (key) DO NOTHING
                            RETURNING id, (xmax = 0) AS inserted
                            """,
                            (
                                "vadim",
                                key,
                                owner_login,
                                canonical,
                                homepage or f"https://github.com/{owner_login}",
                                "AI",
                                3,
                                json.dumps(tags),
                                r["sell_score"],
                                json.dumps([why]),
                            ),
                        )
                        row = cur.fetchone()
                        if row is None:
                            cur.execute(
                                "SELECT id FROM companies WHERE key = %s",
                                (key,),
                            )
                            existing = cur.fetchone()
                            if existing:
                                existing_ids.append(int(existing[0]))
                            continue
                        company_id, was_inserted = int(row[0]), bool(row[1])
                        if was_inserted:
                            inserted_ids.append(company_id)
                        else:
                            existing_ids.append(company_id)
        except psycopg.Error as e:
            return {"_error": f"persist: {e}"}

    # Compact projection for the summary: don't echo full readme_excerpt back.
    def _slim(r: dict[str, Any]) -> dict[str, Any]:
        return {
            "full_name": r["full_name"],
            "html_url": r["html_url"],
            "owner_login": r.get("owner_login"),
            "owner_type": r.get("owner_type"),
            "stars": r["stars"],
            "forks": r["forks"],
            "contributors_count": r.get("contributors_count"),
            "pushed_at": r.get("pushed_at"),
            "license": r.get("license"),
            "homepage": r.get("homepage"),
            "topics": r.get("topics"),
            "matched_topic": r.get("matched_topic"),
            "description": r.get("description"),
            "python_share": r.get("python_share"),
            "sell_score": r.get("sell_score"),
            "score_reasons": r.get("score_reasons"),
        }

    slim = [_slim(r) for r in scored]
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    agent_timings_so_far = dict(state.get("agent_timings") or {})
    agent_timings_so_far["persist"] = round(time.perf_counter() - t0, 3)
    meta = product_intel_graph_meta(
        graph="gh_ai_repos",
        # Heuristic-only — no LLM in this graph; record n/a so cost rollups
        # don't spuriously attribute spend.
        model="n/a",
        agent_timings=agent_timings_so_far,
        telemetry=telemetry,
    )

    summary: dict[str, Any] = {
        "topics_used": state.get("topics") or list(DEFAULT_TOPICS),
        "min_stars": int(state.get("min_stars") or DEFAULT_MIN_STARS),
        "active_within_days": int(state.get("active_within_days") or DEFAULT_ACTIVE_WITHIN_DAYS),
        "raw_count": len(state.get("raw_repos") or []),
        "active_count": len(state.get("active_repos") or []),
        "enriched_count": len(state.get("enriched_repos") or []),
        "scored_count": len(slim),
        "top_repos": slim[:20],
        "all_repos": slim,
        "persisted_companies": persist_companies,
        "inserted_company_ids": inserted_ids,
        "existing_company_ids": existing_ids,
        "skipped_blocked": skipped_blocked,
        "graph_meta": meta,
    }

    return {
        "inserted_company_ids": inserted_ids,
        "summary": summary,
        "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
    }


# ── Graph builder ────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(GhAiReposState)
    builder.add_node("search", search)
    builder.add_node("filter_active", filter_active)
    builder.add_node("enrich", enrich)
    builder.add_node("score", score)
    builder.add_node("persist", persist)
    builder.add_edge(START, "search")
    builder.add_edge("search", "filter_active")
    builder.add_edge("filter_active", "enrich")
    builder.add_edge("enrich", "score")
    builder.add_edge("score", "persist")
    builder.add_edge("persist", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()

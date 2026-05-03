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
import statistics
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import psycopg
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from . import blocklist
from .deep_icp_graph import _dsn
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

DEFAULT_MIN_STARS = 1000
DEFAULT_ACTIVE_WITHIN_DAYS = 30
DEFAULT_PER_TOPIC_LIMIT = 25
DEFAULT_MAX_REPOS = 60
DEFAULT_FRESHNESS_DAYS = 14
DEFAULT_CLASSIFY_TOP_N = 20
DEFAULT_HEURISTIC_FLOOR = 0.30

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

# Canonical product-category taxonomy. Every classified repo gets exactly one
# bucket — drives downstream filtering ("show me all RAG library leads") and
# sharpens the pitch_angle ("we sell observability *for* eval frameworks").
# Keep this list small and orthogonal; resist adding niches.
PRODUCT_CATEGORIES: tuple[str, ...] = (
    "agent_framework",      # langgraph / crewai / autogen-style orchestration
    "rag_library",          # langchain / llamaindex retrieval pipelines
    "vector_db",            # chroma / qdrant / lancedb / pgvector adapters
    "llm_gateway",          # litellm / portkey / openrouter-style routers
    "model_serving",        # vllm / sglang / tgi / ray-serve
    "fine_tuning",          # axolotl / trl / unsloth
    "eval_observability",   # langsmith / weave / phoenix / ragas
    "prompt_engineering",   # dspy / instructor / outlines / guidance
    "knowledge_base",       # haystack / quivr / khoj — end-user QA
    "data_pipeline",        # data prep / ingest / transformation for AI
    "devtools_for_ai",      # IDE/extensions/scaffolders aimed at AI devs
    "research_artifact",    # paper companions, reference implementations
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


# ── Pydantic schema for the LLM brief ────────────────────────────────────────

CommercialIntent = Literal[
    "paid_saas", "open_core", "oss_only", "research_demo", "awareness"
]
BuyerPersona = Literal[
    "founder_cto", "ml_team_lead", "platform_eng", "devrel",
    "indie_dev", "research_lab",
]
ProductCategory = Literal[
    "agent_framework", "rag_library", "vector_db", "llm_gateway",
    "model_serving", "fine_tuning", "eval_observability",
    "prompt_engineering", "knowledge_base", "data_pipeline",
    "devtools_for_ai", "research_artifact",
]


class RepoSellBrief(BaseModel):
    """Per-repo sell-fit brief produced by the deepseek-pro classify_llm pass.

    Output is grounded against fixed Literals (``commercial_intent``,
    ``buyer_persona``, ``product_category``) and a canonical pain-point list
    so the model can't hallucinate freeform tags. ``pitch_angle`` is the
    user-facing payload — 2–3 sentences ready to paste into a cold email.
    """

    model_config = ConfigDict(extra="ignore")

    commercial_intent: CommercialIntent
    product_category: ProductCategory
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


# ── GitHub GraphQL helpers ───────────────────────────────────────────────────
#
# This graph is GraphQL-only — every GitHub interaction goes through
# ``client.graphql()``. One round-trip per repo (and per org) replaces 5+
# REST hops, gets us strictly fewer rate-limit hits, and lets the query shape
# the data we care about (commit velocity, release notes, sponsors flag) in a
# single response.
#
# These helpers are private to this module; ``GhClient`` is reused only as a
# transport. If they grow up they belong in ``gh_patterns_graph.GhClient``.


_REPO_BUNDLE_GQL = """
fragment Maintainer on Actor {
  __typename
  ... on User {
    login name email company location websiteUrl twitterUsername
    isHireable bio
    followers { totalCount }
  }
  ... on Bot { login }
}

query RepoBundle(
  $owner: String!,
  $name: String!,
  $since4w: GitTimestamp!,
  $since1y: GitTimestamp!
) {
  repository(owner: $owner, name: $name) {
    nameWithOwner
    description homepageUrl url
    stargazerCount forkCount
    issues(states: OPEN) { totalCount }
    pushedAt createdAt updatedAt
    isArchived isDisabled isFork
    primaryLanguage { name }
    licenseInfo { spdxId }
    repositoryTopics(first: 20) { nodes { topic { name } } }
    languages(first: 8, orderBy: {field: SIZE, direction: DESC}) {
      totalSize
      edges { size node { name } }
    }
    mentionableUsers(first: 1) { totalCount }
    object(expression: "HEAD:README.md") {
      ... on Blob { text isBinary }
    }
    defaultBranchRef {
      name
      target {
        ... on Commit {
          history4w: history(since: $since4w) { totalCount }
          history1y: history(since: $since1y) { totalCount }
          recent: history(first: 30) {
            nodes { committedDate author { user { ...Maintainer } } }
          }
        }
      }
    }
    releases(first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { tagName name createdAt publishedAt description }
    }
    owner {
      __typename
      login
      ... on Organization { name }
    }
  }
}
"""


_ORG_BUNDLE_GQL = """
query OrgBundle($login: String!) {
  organization(login: $login) {
    login name websiteUrl twitterUsername email location
    description createdAt
    membersWithRole(first: 1) { totalCount }
    repositories(
      first: 15,
      privacy: PUBLIC,
      isFork: false,
      orderBy: {field: PUSHED_AT, direction: DESC}
    ) {
      nodes {
        nameWithOwner stargazerCount description
        repositoryTopics(first: 10) { nodes { topic { name } } }
      }
    }
    hasSponsorsListing
    sponsorshipsAsMaintainer { totalCount }
  }
}
"""


_SEARCH_REPOS_GQL = """
query SearchRepos($query: String!, $first: Int!) {
  search(query: $query, type: REPOSITORY, first: $first) {
    repositoryCount
    nodes {
      ... on Repository {
        nameWithOwner description url homepageUrl
        stargazerCount forkCount
        issues(states: OPEN) { totalCount }
        pushedAt createdAt
        isArchived isDisabled
        primaryLanguage { name }
        licenseInfo { spdxId }
        repositoryTopics(first: 10) { nodes { topic { name } } }
        owner { __typename login }
      }
    }
  }
}
"""


def _topic_names(topics_node: dict[str, Any] | None) -> list[str]:
    """Unpack ``repositoryTopics{nodes{topic{name}}}`` into a flat string list."""
    if not topics_node:
        return []
    nodes = topics_node.get("nodes") or []
    return [
        ((n or {}).get("topic") or {}).get("name") or ""
        for n in nodes
        if (n or {}).get("topic") and (n["topic"].get("name"))
    ]


def _gql_repo_to_search_item(node: dict[str, Any], matched_topic: str) -> dict[str, Any] | None:
    """Convert a GraphQL Repository node into the same dict shape the
    REST ``/search/repositories`` endpoint returned, so downstream code
    (filter_active, score_heuristic, etc.) is unchanged."""
    if not node or not node.get("nameWithOwner"):
        return None
    full = node["nameWithOwner"]
    owner_node = node.get("owner") or {}
    return {
        "full_name": full,
        "name": full.split("/", 1)[1] if "/" in full else full,
        "description": node.get("description"),
        "html_url": node.get("url") or f"https://github.com/{full}",
        "homepage": node.get("homepageUrl"),
        "stargazers_count": int(node.get("stargazerCount") or 0),
        "forks_count": int(node.get("forkCount") or 0),
        "open_issues_count": int(((node.get("issues") or {}).get("totalCount")) or 0),
        "watchers_count": int(node.get("stargazerCount") or 0),  # GraphQL deprecated separate watcher count
        "topics": _topic_names(node.get("repositoryTopics")),
        "language": ((node.get("primaryLanguage") or {}).get("name") or "").strip() or None,
        "license": {"spdx_id": ((node.get("licenseInfo") or {}).get("spdxId") or "").strip() or None},
        "default_branch": None,  # filled in by enrich_repo
        "pushed_at": node.get("pushedAt"),
        "created_at": node.get("createdAt"),
        "archived": bool(node.get("isArchived") or False),
        "disabled": bool(node.get("isDisabled") or False),
        "owner": {
            "login": owner_node.get("login"),
            "type": "Organization" if owner_node.get("__typename") == "Organization" else "User",
        },
        "_matched_topic": matched_topic,
    }


async def _gql_search_repos(
    client: GhClient,
    *,
    topic: str,
    language: str,
    min_stars: int,
    first: int,
) -> list[dict[str, Any]]:
    """GraphQL replacement for ``client.search_repos``.

    GitHub's GraphQL ``search`` accepts the same query syntax as REST
    ``/search/repositories`` but returns richer node shape in one round-trip.
    Capped at 100 results per query (GitHub's GraphQL limit).
    """
    qstr = f"topic:{topic} language:{language} stars:>={min_stars} sort:updated"
    try:
        data = await client.graphql(_SEARCH_REPOS_GQL, {"query": qstr, "first": min(first, 100)})
    except Exception as e:  # noqa: BLE001
        log.debug("gql_search_repos topic=%s failed: %s", topic, e)
        return []
    nodes = ((data or {}).get("search") or {}).get("nodes") or []
    out: list[dict[str, Any]] = []
    for n in nodes:
        item = _gql_repo_to_search_item(n, matched_topic=topic)
        if item:
            out.append(item)
    return out


def _aggregate_recent_authors(
    history_nodes: list[dict[str, Any]] | None,
) -> tuple[int, list[dict[str, Any]]]:
    """Return ``(unique_recent_authors, top_3_users)`` from the GraphQL
    ``defaultBranchRef.target.recent`` history nodes. Drops bot accounts and
    nodes with no User author. Top-3 are ordered by commit count desc.
    """
    if not history_nodes:
        return 0, []
    counts: dict[str, int] = {}
    user_by_login: dict[str, dict[str, Any]] = {}
    for n in history_nodes:
        user = ((n or {}).get("author") or {}).get("user") or {}
        login = (user.get("login") or "").strip()
        if not login:
            continue
        # Skip bots — GraphQL Bot type has __typename=Bot; we tagged them in
        # the fragment so the union resolves.
        if user.get("__typename") == "Bot" or login.lower().endswith("[bot]"):
            continue
        counts[login] = counts.get(login, 0) + 1
        user_by_login.setdefault(login, user)
    if not counts:
        return 0, []
    ranked = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
    top_logins = [login for login, _ in ranked[:3]]
    top_users = [user_by_login[login] for login in top_logins]
    return len(counts), top_users


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
                _gql_search_repos(
                    client,
                    topic=t,
                    language="python",
                    min_stars=min_stars,
                    first=per_topic_limit,
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
        items = res or []
        per_topic_counts[topic] = len(items)
        # _gql_search_repos already stamps `_matched_topic` per item.
        collected.extend(items)

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
) -> tuple[int, int | None, str | None, str | None, str | None]:
    """Return ``(releases_90d, days_between_releases_median, latest_release_at,
    latest_release_tag, latest_release_notes)``.

    ``latest_release_notes`` is capped at 1.5 KB — enough to ground the LLM's
    ``why_now`` field in the actual changelog without bloating the prompt.
    """
    if not isinstance(releases, list) or not releases:
        return 0, None, None, None, None
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    # Tag, body, and date together — sort by date keeping the trio aligned.
    enriched: list[tuple[datetime, dict[str, Any]]] = []
    for rel in releases:
        if not isinstance(rel, dict):
            continue
        published = _parse_iso(rel.get("published_at") or rel.get("created_at"))
        if published is None:
            continue
        enriched.append((published, rel))
    if not enriched:
        return 0, None, None, None, None
    enriched.sort(key=lambda t: t[0], reverse=True)
    parsed = [t[0] for t in enriched]
    recent = sum(1 for d in parsed if d >= cutoff)
    latest_dt, latest_rel = enriched[0]
    latest_iso = latest_dt.isoformat(timespec="seconds")
    latest_tag = (latest_rel.get("tag_name") or latest_rel.get("name") or "").strip() or None
    body = (latest_rel.get("body") or "").strip() or None
    latest_notes = body[:1500] if body else None
    if len(parsed) < 2:
        return recent, None, latest_iso, latest_tag, latest_notes
    gaps = [
        (parsed[i] - parsed[i + 1]).days
        for i in range(len(parsed) - 1)
        if (parsed[i] - parsed[i + 1]).days >= 0
    ]
    if not gaps:
        return recent, None, latest_iso, latest_tag, latest_notes
    median_gap = int(statistics.median(gaps))
    return recent, median_gap, latest_iso, latest_tag, latest_notes


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

    now = datetime.now(timezone.utc)
    since4w = (now - timedelta(weeks=4)).isoformat(timespec="seconds")
    since1y = (now - timedelta(days=365)).isoformat(timespec="seconds")

    async def hydrate(r: dict[str, Any]) -> dict[str, Any] | None:
        full = r.get("full_name") or ""
        if "/" not in full:
            return None
        owner, name = full.split("/", 1)

        try:
            data = await client.graphql(
                _REPO_BUNDLE_GQL,
                {"owner": owner, "name": name, "since4w": since4w, "since1y": since1y},
            )
        except Exception as e:  # noqa: BLE001
            log.debug("enrich_repo %s GraphQL failed: %s", full, e)
            return None
        repo_node = (data or {}).get("repository") or {}
        if not repo_node:
            return None

        # README — GraphQL gives us the body as `object.text`. Skip binary
        # blobs (rare for README.md).
        readme_obj = repo_node.get("object") or {}
        readme_text = (readme_obj.get("text") or "") if not readme_obj.get("isBinary") else ""
        if require_readme and not readme_text:
            return None

        # Languages: edges → {name: bytes}
        lang_edges = (repo_node.get("languages") or {}).get("edges") or []
        languages = {
            ((e.get("node") or {}).get("name") or "unknown"): int(e.get("size") or 0)
            for e in lang_edges
        }
        py_bytes = int(languages.get("Python") or 0)
        total_bytes = sum(int(v or 0) for v in languages.values()) or 1
        python_share = py_bytes / total_bytes

        # Commit velocity — GraphQL exposes both windows in one query.
        default_branch = repo_node.get("defaultBranchRef") or {}
        target = default_branch.get("target") or {}
        commits_4w = int(((target.get("history4w") or {}).get("totalCount")) or 0)
        commits_1y = int(((target.get("history1y") or {}).get("totalCount")) or 0)
        # Recent commit authors → contributor proxy + maintainer seed list.
        recent_history = (target.get("recent") or {}).get("nodes") or []
        recent_authors_count, top_authors = _aggregate_recent_authors(recent_history)

        # Mentionable users — total count of accounts visible on the repo.
        # Used as the durable contributor_count for scoring; recent_authors
        # is the active subset.
        mentionable_total = int(
            ((repo_node.get("mentionableUsers") or {}).get("totalCount")) or 0
        )

        # Releases — GraphQL returns nodes already ordered DESC by created.
        rel_nodes = (repo_node.get("releases") or {}).get("nodes") or []
        # Adapt to the shape `_summarize_releases` expects.
        releases_for_summary = [
            {
                "published_at": (n.get("publishedAt") or n.get("createdAt")),
                "tag_name": n.get("tagName") or n.get("name"),
                "body": n.get("description") or "",
            }
            for n in rel_nodes
        ]
        (
            releases_90d,
            days_between_releases,
            latest_release_at,
            latest_release_tag,
            latest_release_notes,
        ) = _summarize_releases(releases_for_summary)

        owner_node = repo_node.get("owner") or {}
        owner_type = (
            "Organization" if owner_node.get("__typename") == "Organization" else "User"
        )
        owner_login = (owner_node.get("login") or owner).strip() or owner

        return {
            "full_name": full,
            "owner": owner,
            "name": name,
            "html_url": repo_node.get("url") or f"https://github.com/{full}",
            "description": (repo_node.get("description") or "")[:500],
            "stars": int(repo_node.get("stargazerCount") or 0),
            "forks": int(repo_node.get("forkCount") or 0),
            "open_issues": int(((repo_node.get("issues") or {}).get("totalCount")) or 0),
            "watchers": int(repo_node.get("stargazerCount") or 0),
            "topics": _topic_names(repo_node.get("repositoryTopics")),
            "matched_topic": r.get("_matched_topic"),
            "license": ((repo_node.get("licenseInfo") or {}).get("spdxId") or "").strip() or None,
            "default_branch": default_branch.get("name"),
            "pushed_at": repo_node.get("pushedAt"),
            "created_at": repo_node.get("createdAt"),
            "owner_type": owner_type,
            "owner_login": owner_login,
            "homepage": (repo_node.get("homepageUrl") or "").strip() or None,
            "languages": languages,
            "python_share": round(python_share, 3),
            "contributors_count": mentionable_total,
            "recent_authors_count": recent_authors_count,
            "_top_authors": top_authors,  # consumed by enrich_maintainers
            "commits_4w": commits_4w,
            "commits_1y": commits_1y,
            "releases_90d": releases_90d,
            "days_between_releases": days_between_releases,
            "latest_release_at": latest_release_at,
            "latest_release_tag": latest_release_tag,
            "latest_release_notes": latest_release_notes,
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
        """Single GraphQL round-trip per org — gets metadata, members count,
        recent repos, and sponsors flags in one query."""
        try:
            data = await client.graphql(_ORG_BUNDLE_GQL, {"login": login})
        except Exception as e:  # noqa: BLE001
            log.debug("enrich_orgs %s GraphQL failed: %s", login, e)
            return login, None
        org_node = (data or {}).get("organization") or {}
        if not org_node or not org_node.get("login"):
            return login, None

        recent_repos = (org_node.get("repositories") or {}).get("nodes") or []
        ai_repo_count = 0
        total_org_stars = 0
        flagship_repo: dict[str, Any] | None = None
        for rr in recent_repos:
            if not isinstance(rr, dict):
                continue
            stars = int(rr.get("stargazerCount") or 0)
            total_org_stars += stars
            topics = set(_topic_names(rr.get("repositoryTopics")))
            if topics & AI_RELEVANT_TOPICS:
                ai_repo_count += 1
            if flagship_repo is None or stars > int(flagship_repo.get("stars") or 0):
                flagship_repo = {
                    "name": rr.get("nameWithOwner"),
                    "stars": stars,
                    "description": (rr.get("description") or "")[:200],
                }

        sponsors_enabled = bool(org_node.get("hasSponsorsListing")) if "hasSponsorsListing" in org_node else None
        sponsors_count = int(((org_node.get("sponsorshipsAsMaintainer") or {}).get("totalCount")) or 0)
        public_members = int(((org_node.get("membersWithRole") or {}).get("totalCount")) or 0)

        return login, {
            "login": org_node.get("login") or login,
            "name": org_node.get("name"),
            # GraphQL exposes website as `websiteUrl`, not `blog`. Map for
            # downstream compat.
            "blog": (org_node.get("websiteUrl") or "").strip() or None,
            "twitter_username": (org_node.get("twitterUsername") or "").strip() or None,
            "email": (org_node.get("email") or "").strip() or None,
            "location": (org_node.get("location") or "").strip() or None,
            "description": (org_node.get("description") or "")[:400] or None,
            "public_members": public_members,
            "public_repos": len(recent_repos),
            # `followers` isn't on GraphQL Organization. Drop the field.
            "followers": 0,
            "created_at": org_node.get("createdAt"),
            "ai_repo_count": ai_repo_count,
            "total_org_stars": total_org_stars,
            "flagship_repo": flagship_repo,
            "sponsors_enabled": sponsors_enabled,
            "sponsorships_count": sponsors_count,
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


# Product-surface paths to probe on each repo's homepage. These are the URLs a
# would-be customer hits — finding them is a hard signal that the repo has a
# real productized layer beyond the OSS code.
_PRODUCT_SURFACE_PATHS: tuple[tuple[str, str], ...] = (
    ("has_pricing", "/pricing"),
    ("has_signup", "/signup"),
    ("has_signup", "/sign-up"),
    ("has_login", "/login"),
    ("has_login", "/sign-in"),
    ("has_enterprise", "/enterprise"),
    ("has_demo", "/book-a-demo"),
    ("has_demo", "/demo"),
    ("has_demo", "/contact-sales"),
    ("has_docs", "/docs"),
    ("has_changelog", "/changelog"),
    ("has_careers", "/careers"),
    ("has_careers", "/jobs"),
)


def _scan_product_surface(html: str, base_url: str) -> dict[str, Any]:
    """Extract product-surface signals from a homepage HTML blob.

    Returns ``{has_pricing, has_signup, has_login, has_enterprise, has_demo,
    has_docs, has_changelog, has_careers, hits}`` where ``hits`` is the list
    of URL paths actually found. Substring match on the body — good enough
    given we only run this against the org's own homepage, not arbitrary
    crawled pages.
    """
    haystack = (html or "").lower()
    flags: dict[str, Any] = {
        "has_pricing": False,
        "has_signup": False,
        "has_login": False,
        "has_enterprise": False,
        "has_demo": False,
        "has_docs": False,
        "has_changelog": False,
        "has_careers": False,
        "hits": [],
        "homepage": base_url,
    }
    for flag, path in _PRODUCT_SURFACE_PATHS:
        if path in haystack and not flags[flag]:
            flags[flag] = True
            flags["hits"].append(path)
    return flags


async def enrich_homepage(state: GhAiReposState) -> dict:
    """Fetch each repo's homepage HTML and scan for product surfaces.

    Runs in parallel with ``enrich_orgs``. Skips repos with no homepage URL,
    or where the homepage is the GitHub repo URL itself (no product layer
    yet). Bounded concurrency + tight timeout so a hung server can't stall
    the run. ``product_surface`` lands on each enriched_repos entry under
    ``score_heuristic`` time so the heuristic can credit the signals.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repos = state.get("active_repos") or []
    if not repos:
        return {"product_surfaces": {}}

    from urllib.parse import urlparse

    targets: list[tuple[str, str]] = []
    for r in repos:
        homepage = (r.get("homepage") or "").strip()
        full = r.get("full_name") or ""
        if not homepage or not homepage.startswith(("http://", "https://")):
            continue
        host = (urlparse(homepage).hostname or "").lower()
        # Skip homepages that just point back to GitHub — no product to scan.
        if host.endswith("github.com") or host.endswith("github.io"):
            continue
        targets.append((full, homepage))

    if not targets:
        return {
            "product_surfaces": {},
            "agent_timings": {"enrich_homepage": round(time.perf_counter() - t0, 3)},
            "graph_meta": {
                "telemetry": {"enrich_homepage": {"input": 0, "kept": 0}}
            },
        }

    surfaces: dict[str, dict[str, Any]] = {}
    timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
    sem = asyncio.Semaphore(8)
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers={
            "User-Agent": "leadgen/gh_ai_repos (sell-fit scanner)",
            "Accept": "text/html,application/xhtml+xml",
        },
    ) as ahttp:

        async def fetch_one(full: str, url: str) -> None:
            async with sem:
                try:
                    resp = await ahttp.get(url)
                except (httpx.HTTPError, OSError) as e:
                    log.debug("enrich_homepage %s -> %s failed: %s", full, url, e)
                    return
            if resp.status_code >= 400:
                return
            ctype = resp.headers.get("content-type", "")
            if "text/html" not in ctype and "xml" not in ctype:
                return
            # Cap the body — most product cues are in the nav + hero, well
            # within 200 KB.
            html = resp.text[:200_000]
            surfaces[full] = _scan_product_surface(html, str(resp.url))

        await asyncio.gather(*[fetch_one(full, url) for full, url in targets])

    return {
        "product_surfaces": surfaces,
        "agent_timings": {"enrich_homepage": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "enrich_homepage": {
                    "input": len(targets),
                    "kept": len(surfaces),
                }
            }
        },
    }


async def dedupe_vs_db(state: GhAiReposState) -> dict:
    """Look up which repos are already in ``companies`` so the scorer can
    suppress recently-seen leads (within ``freshness_days``).

    Mirrors company_discovery_graph.dedupe — single round-trip, jsonb tag
    membership filter. Stores results keyed by the ``gh:<full_name>`` tag so
    matching is exact regardless of canonical_domain volatility.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repos = state.get("enriched_repos") or []
    if not repos:
        return {"existing_keys": {}}

    full_names = [r["full_name"] for r in repos if r.get("full_name")]
    gh_tags = [f"gh:{fn}" for fn in full_names]

    existing: dict[str, dict[str, Any]] = {}
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, canonical_domain, tags, updated_at
                    FROM companies
                    WHERE tags::jsonb ?| %s
                    """,
                    (gh_tags,),
                )
                for row in cur.fetchall():
                    company_id, canonical, tags_raw, updated_at = row
                    try:
                        tags = json.loads(tags_raw) if isinstance(tags_raw, str) else (tags_raw or [])
                    except (json.JSONDecodeError, TypeError):
                        tags = []
                    last_seen = _parse_iso(str(updated_at)) if updated_at else None
                    age_days: int | None = None
                    if last_seen is not None:
                        # updated_at is text per migrations; parse loosely. If
                        # missing tz, treat as UTC.
                        if last_seen.tzinfo is None:
                            last_seen = last_seen.replace(tzinfo=timezone.utc)
                        age_days = (datetime.now(timezone.utc) - last_seen).days
                    for tag in tags:
                        if isinstance(tag, str) and tag.startswith("gh:"):
                            existing[tag] = {
                                "company_id": int(company_id),
                                "canonical_domain": canonical,
                                "last_seen_days_ago": age_days,
                            }
    except psycopg.Error as e:
        # DB miss must not kill the run — fall back to empty dedupe set.
        log.warning("dedupe_vs_db: %s", e)
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

    # Org-level enrichment — only set when the owner is an Organization.
    if org:
        if int(org.get("public_members") or 0) >= 5:
            score += 0.04
            reasons.append(f"{org['public_members']} public org members")
        if org.get("blog") or org.get("twitter_username"):
            score += 0.03
            reasons.append("org has blog/twitter — commercial presence")
        if int(org.get("ai_repo_count") or 0) >= 3:
            score += 0.04
            reasons.append(f"org maintains {org['ai_repo_count']} AI repos — focused")
        if org.get("sponsors_enabled") is True:
            score += 0.03
            reasons.append("GitHub Sponsors enabled on the org")

    # Product-surface signals — found by scanning the repo's homepage for
    # /pricing, /signup, /enterprise etc. Hard evidence of a productized
    # offering beyond the OSS code.
    surface = r.get("product_surface") or {}
    if surface:
        if surface.get("has_pricing"):
            score += 0.08
            reasons.append("homepage has /pricing — paid product")
        if surface.get("has_signup") or surface.get("has_login"):
            score += 0.05
            reasons.append("homepage has /signup or /login — hosted offering")
        if surface.get("has_enterprise"):
            score += 0.05
            reasons.append("homepage has /enterprise — sells upmarket")
        if surface.get("has_demo"):
            score += 0.03
            reasons.append("homepage has /book-a-demo or /contact-sales")
        if surface.get("has_careers"):
            score += 0.02
            reasons.append("homepage has /careers — hiring (commercial scale)")

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
    product_surfaces: dict[str, Any] = state.get("product_surfaces") or {}
    existing_keys: dict[str, Any] = state.get("existing_keys") or {}
    framework_focus = (state.get("framework_focus") or "").strip() or None
    floor = float(state.get("heuristic_floor") or DEFAULT_HEURISTIC_FLOOR)
    freshness_days = int(state.get("freshness_days") or DEFAULT_FRESHNESS_DAYS)

    scored: list[dict[str, Any]] = []
    dropped_floor = 0
    skipped_fresh = 0
    for r in repos:
        existing = existing_keys.get(f"gh:{r['full_name']}") or {}
        last_seen = existing.get("last_seen_days_ago") if existing else None
        org = org_metadata.get(r.get("owner_login") or "")
        # Merge product_surface in *before* scoring so _score_repo can credit
        # the signals. Stays on the scored_repo dict for downstream nodes.
        surface = product_surfaces.get(r.get("full_name"))
        r_with_surface = {**r, "product_surface": surface}

        sell_score, reasons = _score_repo(
            r_with_surface,
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
            **r_with_surface,
            "sell_score": sell_score,
            "score_reasons": reasons,
            "org": org,
            "existing_company_id": existing.get("company_id"),
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
                    "skipped_fresh": skipped_fresh,
                    "floor": floor,
                }
            }
        },
    }


def _project_maintainer(u: dict[str, Any]) -> dict[str, Any] | None:
    """Project a GraphQL User node (already inlined via the Maintainer
    fragment in ``_REPO_BUNDLE_GQL``) into the slim shape downstream code
    consumes. Drops noreply emails and bots.
    """
    if not u or u.get("__typename") == "Bot":
        return None
    login = (u.get("login") or "").strip()
    if not login or login.lower().endswith("[bot]"):
        return None
    email = (u.get("email") or "").strip()
    if "noreply" in email or email.endswith("@users.noreply.github.com"):
        email = ""
    return {
        "login": login,
        "name": (u.get("name") or "").strip() or None,
        "company": (u.get("company") or "").strip() or None,
        "location": (u.get("location") or "").strip() or None,
        "email": email or None,
        "website": (u.get("websiteUrl") or "").strip() or None,
        "twitter": (u.get("twitterUsername") or "").strip() or None,
        "followers": int(((u.get("followers") or {}).get("totalCount")) or 0),
        "is_hireable": bool(u.get("isHireable") or False),
        "bio": (u.get("bio") or "")[:200] or None,
        "url": f"https://github.com/{login}",
    }


async def enrich_maintainers(state: GhAiReposState) -> dict:
    """Project top-3 maintainer profiles for the top heuristic-N repos.

    No new network calls — the per-repo GraphQL bundle in ``enrich_repo``
    already inlined the top recent-commit authors via the ``Maintainer``
    fragment. Here we just project the cached User nodes (filtered + slim)
    into a per-repo map. Cheaper than the previous REST + batched-GraphQL
    path and consistent with the "GH GraphQL only" rule.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    scored = state.get("scored_repos") or []
    if not scored:
        return {"maintainers": {}}

    top_n = max(1, int(state.get("classify_top_n") or DEFAULT_CLASSIFY_TOP_N))
    candidates = [r for r in scored if not r.get("_skip_reason")][:top_n]
    if not candidates:
        return {
            "maintainers": {},
            "agent_timings": {"enrich_maintainers": round(time.perf_counter() - t0, 3)},
        }

    by_repo: dict[str, list[dict[str, Any]]] = {}
    for r in candidates:
        owner = (r.get("owner_login") or r.get("owner") or "").lower()
        cached_authors = r.get("_top_authors") or []
        cleaned: list[dict[str, Any]] = []
        for u in cached_authors:
            login_l = ((u or {}).get("login") or "").lower()
            # Skip the org/owner login itself — we already have org metadata.
            if login_l == owner:
                continue
            proj = _project_maintainer(u)
            if proj:
                cleaned.append(proj)
            if len(cleaned) >= 3:
                break
        if cleaned:
            by_repo[r["full_name"]] = cleaned

    return {
        "maintainers": by_repo,
        "agent_timings": {"enrich_maintainers": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "enrich_maintainers": {
                    "input": len(candidates),
                    "kept": len(by_repo),
                    "total_contacts": sum(len(v) for v in by_repo.values()),
                    # Zero network calls — projection only.
                    "network_calls": 0,
                }
            }
        },
    }


# ── LLM classification ───────────────────────────────────────────────────────


_CLASSIFY_SYSTEM = (
    "You are a B2B sell-fit analyst for AI infrastructure tools. Given a "
    "Python open-source AI repo (its README excerpt, topics, languages, "
    "commit + release cadence, latest release notes, product-surface flags, "
    "owner-org metadata, top maintainers), classify it as a sales lead the "
    "user can pitch to.\n\n"
    "Return STRICT JSON with this exact shape, no prose:\n"
    "{\n"
    '  "commercial_intent": one of '
    + json.dumps(list(COMMERCIAL_INTENTS))
    + ",\n"
    '  "product_category": one of '
    + json.dumps(list(PRODUCT_CATEGORIES))
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
    "release notes, hiring, fundraising, etc. Cite the actual signal you saw.,\n"
    '  "confidence": float in [0, 1] reflecting how confident you are in the '
    "above based on the evidence shown,\n"
    '  "llm_score": float in [0, 1] — your own estimate of how sellable this '
    "lead is.\n"
    "}\n\n"
    "Rules:\n"
    "- Pain points MUST be drawn from the canonical list above; reject "
    "anything else.\n"
    "- product_category must be the SINGLE best fit. If unsure between two, "
    "pick the one that best matches the README's primary focus.\n"
    "- If the repo is a personal toy / research demo / awareness piece, set "
    'commercial_intent to "research_demo" or "awareness" and llm_score ≤ 0.3.\n'
    "- why_now must reference an actual signal in the payload (release tag, "
    "release date, public hiring page, sponsors-enabled flag, etc.) — do not "
    "invent timing.\n"
    "- If you can't tell, set confidence < 0.4 — do not guess."
)


def _render_markdown_brief(r: dict[str, Any]) -> str:
    """Compose a paste-ready markdown brief for a scored repo.

    The output is what a human picks up after the run: subject + 2-line
    elevator + activity bullets + maintainer link. Falls back gracefully when
    the LLM brief is missing (heuristic-only repos still get a usable brief).
    """
    brief = r.get("brief") or {}
    org = r.get("org") or {}
    surface = r.get("product_surface") or {}
    maintainers = r.get("maintainers") or []
    full = r["full_name"]
    stars = int(r.get("stars") or 0)
    contribs = r.get("contributors_count") or 0
    commits_4w = r.get("commits_4w") or 0
    releases_90d = r.get("releases_90d") or 0
    license_id = r.get("license") or "no license"
    homepage = r.get("homepage") or f"https://github.com/{full}"
    latest_tag = r.get("latest_release_tag")

    # Prefer the LLM pitch_angle when we have a confident brief; otherwise
    # synthesize from heuristic reasons.
    pitch = brief.get("pitch_angle") or "; ".join((r.get("score_reasons") or [])[:3])
    if brief.get("why_now"):
        why_now = brief["why_now"]
    elif latest_tag:
        why_now = (
            f"Just shipped {latest_tag}"
            + (f", {releases_90d} release(s) in 90 days" if releases_90d else "")
        )
    else:
        why_now = (
            f"{commits_4w} commits in the last 4 weeks"
            + (f", {releases_90d} release(s) in 90 days" if releases_90d else "")
        )
    persona = brief.get("buyer_persona") or "ml_team_lead"
    intent = brief.get("commercial_intent") or "oss_only"
    category = brief.get("product_category") or "—"
    pain_points = brief.get("pain_points") or []

    activity_bits = [
        f"⭐ {stars:,} stars",
        f"👥 {contribs} contributors",
    ]
    if commits_4w:
        activity_bits.append(f"🔨 {commits_4w} commits / 4w")
    if releases_90d:
        activity_bits.append(f"📦 {releases_90d} releases / 90d")
    if license_id:
        activity_bits.append(f"📜 {license_id}")

    org_lines: list[str] = []
    if org:
        org_lines.append(f"- **Org:** {org.get('name') or org.get('login')}")
        if org.get("blog"):
            org_lines.append(f"- **Blog:** {org['blog']}")
        if org.get("twitter_username"):
            org_lines.append(f"- **Twitter:** @{org['twitter_username']}")
        if org.get("email"):
            org_lines.append(f"- **Public email:** {org['email']}")
        if org.get("public_members"):
            org_lines.append(f"- **Public members:** {org['public_members']}")
        if org.get("ai_repo_count"):
            org_lines.append(f"- **AI repos in org:** {org['ai_repo_count']}")
        if org.get("sponsors_enabled"):
            org_lines.append("- **GitHub Sponsors:** enabled")

    surface_bits: list[str] = []
    if surface.get("has_pricing"):
        surface_bits.append("/pricing")
    if surface.get("has_signup") or surface.get("has_login"):
        surface_bits.append("/signup")
    if surface.get("has_enterprise"):
        surface_bits.append("/enterprise")
    if surface.get("has_demo"):
        surface_bits.append("/demo")
    if surface.get("has_careers"):
        surface_bits.append("/careers")

    maintainer_lines: list[str] = []
    for m in maintainers[:3]:
        bits: list[str] = []
        name = m.get("name") or m.get("login")
        bits.append(f"@{m.get('login')}" + (f" ({name})" if name and name != m.get("login") else ""))
        if m.get("company"):
            bits.append(m["company"])
        if m.get("email"):
            bits.append(m["email"])
        elif m.get("twitter"):
            bits.append(f"@{m['twitter']} on Twitter")
        if m.get("is_hireable"):
            bits.append("hireable")
        maintainer_lines.append("  - " + " · ".join(bits))

    pain_block = (
        "- **Pain points:** " + ", ".join(pain_points) if pain_points else ""
    )
    surface_block = (
        f"- **Product surface:** {' · '.join(surface_bits)}\n"
        if surface_bits
        else ""
    )
    maintainer_block = (
        "- **Top maintainers:**\n" + "\n".join(maintainer_lines) + "\n"
        if maintainer_lines
        else ""
    )

    return (
        f"# {full} ({r.get('final_score', 0):.2f})\n\n"
        f"**Pitch:** {pitch}\n\n"
        f"**Why now:** {why_now}\n\n"
        f"- **Category:** {category}\n"
        f"- **Persona:** {persona}\n"
        f"- **Commercial intent:** {intent}\n"
        + (pain_block + "\n" if pain_block else "")
        + surface_block
        + f"- **Activity:** {' · '.join(activity_bits)}\n"
        + ("\n".join(org_lines) + "\n" if org_lines else "")
        + maintainer_block
        + f"\n**Repo:** {homepage}"
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
        "latest_release_tag": r.get("latest_release_tag"),
        "latest_release_notes": r.get("latest_release_notes"),
        "product_surface": r.get("product_surface"),
        "maintainers": r.get("maintainers"),
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
            "sponsors_enabled": org.get("sponsors_enabled"),
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

    maintainers_by_repo: dict[str, list[dict[str, Any]]] = state.get("maintainers") or {}

    sem = asyncio.Semaphore(CLASSIFY_CONCURRENCY)
    llm = make_deepseek_pro(temperature=0.2)
    classifications: dict[str, dict[str, Any]] = {}
    accumulated_tel: dict[str, Any] | None = None
    tel_lock = asyncio.Lock()

    async def classify_one(r: dict[str, Any]) -> None:
        nonlocal accumulated_tel
        # Inject maintainer contacts into the payload so the LLM can ground
        # buyer_persona in real seniority + company affiliations.
        r_with_maint = {**r, "maintainers": maintainers_by_repo.get(r["full_name"]) or []}
        payload = _classify_payload(r_with_maint)
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
    maintainers_state: dict[str, list[dict[str, Any]]] = state.get("maintainers") or {}
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
        # Pull maintainer contacts in (filled by enrich_maintainers for the
        # top heuristic-N — repos below the cutoff just won't have any).
        maint = maintainers_state.get(r["full_name"])
        if maint:
            merged["maintainers"] = maint
        final.append(merged)

    final.sort(key=lambda x: x["final_score"], reverse=True)

    inserted_ids: list[int] = []
    existing_ids: list[int] = []
    skipped_blocked = 0
    skipped_fresh = 0

    if persist_companies and final:
        try:
            blocked = {b.domain for b in blocklist.list_all()}
        except (psycopg.Error, RuntimeError):
            blocked = set()

        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    for r in final:
                        if r["final_score"] < 0.25:
                            continue
                        if r.get("_skip_reason") == "fresh":
                            skipped_fresh += 1
                            continue
                        owner_login = r.get("owner_login") or r["owner"]
                        owner_type = (r.get("owner_type") or "").lower()
                        if owner_type != "organization":
                            continue

                        # Belt-and-braces: re-check freshness by tag in case
                        # dedupe_vs_db saw nothing but a sibling row was
                        # written mid-run.
                        existing = state.get("existing_keys", {}).get(
                            f"gh:{r['full_name']}"
                        ) or {}
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

                        key = _slugify(canonical)[:200]
                        tags = [
                            "gh-ai-repo-lead",
                            "discovery-candidate",
                            f"gh:{r['full_name']}",
                        ]
                        if r.get("matched_topic"):
                            tags.append(f"topic:{r['matched_topic']}")
                        brief = r.get("brief") or {}
                        if brief.get("buyer_persona"):
                            tags.append(f"persona:{brief['buyer_persona']}")
                        if brief.get("commercial_intent"):
                            tags.append(f"intent:{brief['commercial_intent']}")
                        for pp in (brief.get("pain_points") or [])[:3]:
                            tags.append(f"pain:{pp}")

                        # score_reasons[0] is the pitch_angle (when available)
                        # so dashboards surface a paste-ready one-liner.
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
                                r["final_score"],
                                json.dumps(reasons),
                            ),
                        )
                        row = cur.fetchone()
                        if row is None:
                            cur.execute(
                                "SELECT id FROM companies WHERE key = %s",
                                (key,),
                            )
                            existing_row = cur.fetchone()
                            if existing_row:
                                existing_ids.append(int(existing_row[0]))
                            continue
                        company_id, was_inserted = int(row[0]), bool(row[1])
                        if was_inserted:
                            inserted_ids.append(company_id)
                        else:
                            existing_ids.append(company_id)
        except psycopg.Error as e:
            return {"_error": f"persist: {e}"}

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
            "latest_release_tag": r.get("latest_release_tag"),
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
            "existing_company_id": r.get("existing_company_id"),
            "product_surface": r.get("product_surface"),
            "maintainers": r.get("maintainers"),
            "org": (
                {
                    k: r["org"].get(k)
                    for k in (
                        "login", "name", "blog", "twitter_username", "email",
                        "location", "public_members", "public_repos",
                        "ai_repo_count", "total_org_stars", "flagship_repo",
                        "sponsors_enabled",
                    )
                }
                if r.get("org")
                else None
            ),
            "brief": r.get("brief"),
            "markdown_brief": _render_markdown_brief(r),
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
        "persisted_companies": persist_companies,
        "inserted_company_ids": inserted_ids,
        "existing_company_ids": existing_ids,
        "skipped_blocked": skipped_blocked,
        "skipped_fresh": skipped_fresh,
        "graph_meta": meta,
    }

    return {
        "final_repos": final,
        "inserted_company_ids": inserted_ids,
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
    builder.add_node("enrich_homepage", enrich_homepage)
    builder.add_node("dedupe_vs_db", dedupe_vs_db)
    builder.add_node("score_heuristic", score_heuristic)
    builder.add_node("enrich_maintainers", enrich_maintainers)
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
    builder.add_edge("filter_active", "enrich_homepage")
    builder.add_edge("enrich_repo", "dedupe_vs_db")
    builder.add_edge("enrich_orgs", "dedupe_vs_db")
    builder.add_edge("enrich_homepage", "dedupe_vs_db")
    builder.add_edge("dedupe_vs_db", "score_heuristic")
    builder.add_edge("score_heuristic", "enrich_maintainers")
    builder.add_edge("enrich_maintainers", "classify_llm")
    builder.add_edge("classify_llm", "persist")
    builder.add_edge("persist", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()

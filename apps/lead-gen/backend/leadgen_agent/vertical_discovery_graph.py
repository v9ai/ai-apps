"""Vertical-agnostic GitHub code-search harvester.

Generic replacement for the old ``ingestible_discovery_graph``. Takes a
``vertical_slug`` via state, looks up the ``ProductVertical`` in the
registry, and runs its ``github_code_queries`` against ``GET /search/code``.
Filters against ``github_owner_deny`` + ``github_filter_out`` from the same
registry.

Pipeline:

    fetch_code_search → filter_hits → resolve_orgs →
      dedupe_existing → persist_candidates → build_summary → END

- Stage 1 (fetch + filter): `GET /search/code` paginated + regex filter.
- Stage 2 (resolve + dedupe + persist): `GET /orgs/{login}` for each unique
  owner, drop rows already in `companies`, INSERT survivors with
  `tags=['discovery-candidate', '<vertical_slug>']`. Seeds one
  ``company_product_signals`` row per new company with the stack_label
  pre-populated — the enrichment graph will fill in the rest.
- Stage 3 (future): commit-message scanner to flip signal keys on existing
  rows.

Adding a new product's discovery pass is a one-file change in
``verticals/<slug>.py`` — no change needed here.

Rate-limit notes (GitHub REST):
- ``/search/code`` bucket: **30 req/min authenticated, 10/min unauthenticated**.
  We respect it with a sleep between pages. Unlike other REST endpoints,
  code-search requires auth — unauthenticated requests return 401.
  ``GITHUB_TOKEN`` is required.
- ``/orgs/{login}`` shares the core 5000 req/hr authenticated bucket — cheap.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
from typing import Annotated, Any, TypedDict
from urllib.parse import urlparse

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .verticals import ProductVertical, get_vertical


# ── State ─────────────────────────────────────────────────────────────────

def _first_error(left: str | None, right: str | None) -> str | None:
    return left or right


def _extend(left: list | None, right: list | None) -> list:
    return (left or []) + (right or [])


class VerticalDiscoveryState(TypedDict, total=False):
    # Inputs
    vertical_slug: str                # required — picks which ProductVertical to run
    max_pages_per_query: int          # default 3
    max_total_results: int            # default 1000
    queries: list[str] | None         # optional override of vertical.github_code_queries
    dry_run: bool                     # if true, resolve + dedupe but do NOT INSERT

    # Outputs — Stage 1
    raw_hits: Annotated[list[dict], _extend]
    filtered_hits: Annotated[list[dict], _extend]

    # Outputs — Stage 2
    resolved_orgs: list[dict]         # one entry per unique owner, post /orgs/{login}
    new_candidates: list[dict]        # post-dedupe — rows that will be INSERTed
    inserted_company_ids: list[int]
    skipped_existing_count: int

    summary: dict[str, Any]
    _error: Annotated[str, _first_error]
    agent_timings: dict[str, float]


# ── Constants ─────────────────────────────────────────────────────────────

_GITHUB_API = "https://api.github.com"
_PER_PAGE = 100
_SEARCH_RATE_SLEEP = 2.1   # seconds between /search/code calls → under 30/min
_DEFAULT_MAX_PAGES = 3
_DEFAULT_MAX_TOTAL = 1000


# ── Helpers ───────────────────────────────────────────────────────────────

def _github_headers() -> dict[str, str]:
    headers = {
        "User-Agent": "lead-gen-vertical-discovery/1.0",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


def _classify_stack(vertical: ProductVertical, text_sample: str) -> str | None:
    """Pick a ``rag_stack_detected``-style label from the text sample.

    Runs the vertical's label-kind signal rules against the text. Returns
    the first matching label (or None). Used during code-search result
    normalization so each hit carries a ``stack_label`` for Stage 2 to
    write into ``company_product_signals.signals``.
    """
    for rule in vertical.signal_rules:
        if rule.kind != "label" or not rule.label:
            continue
        if rule.pattern.search(text_sample):
            return rule.label
    return None


def _is_filtered_out(
    vertical: ProductVertical, repo_name: str, owner: str, description: str
) -> bool:
    """Return True if this hit should be dropped as vendor/tutorial/fork noise."""
    if owner.lower() in {o.lower() for o in vertical.github_owner_deny}:
        return True
    haystack = f"{repo_name} {description or ''}"
    for pat in vertical.github_filter_out:
        if pat.search(haystack):
            return True
    return False


# ── Nodes ─────────────────────────────────────────────────────────────────

async def fetch_code_search(state: VerticalDiscoveryState) -> dict:
    """Run GitHub code search for each configured query, paginate, collect hits.

    Respects the 30 req/min code-search bucket via a sleep between calls.
    Caps at ``max_pages_per_query × len(queries)`` API calls and
    ``max_total_results`` rows. Bails cleanly on 401 / 403 / 422.
    """
    t0 = time.perf_counter()
    slug = state.get("vertical_slug")
    if not slug:
        return {"_error": "fetch_code_search: vertical_slug is required"}
    try:
        vertical = get_vertical(slug)
    except KeyError as e:
        return {"_error": f"fetch_code_search: {e}"}

    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        return {"_error": "fetch_code_search: GITHUB_TOKEN is required for /search/code"}

    queries: list[str] = list(state.get("queries") or vertical.github_code_queries)
    max_pages = int(state.get("max_pages_per_query") or _DEFAULT_MAX_PAGES)
    max_total = int(state.get("max_total_results") or _DEFAULT_MAX_TOTAL)

    hits: list[dict] = []
    seen_repo_ids: set[int] = set()

    async with httpx.AsyncClient(
        base_url=_GITHUB_API,
        headers=_github_headers(),
        timeout=httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=10.0),
    ) as client:
        for query in queries:
            if len(hits) >= max_total:
                break
            for page in range(1, max_pages + 1):
                if len(hits) >= max_total:
                    break
                try:
                    res = await client.get(
                        "/search/code",
                        params={"q": query, "per_page": _PER_PAGE, "page": page},
                    )
                except httpx.HTTPError as e:
                    hits.append(
                        {"_error": f"http error on query={query!r} page={page}: {e}"}
                    )
                    break

                if res.status_code == 401:
                    return {"_error": "fetch_code_search: 401 — GITHUB_TOKEN invalid or expired"}
                if res.status_code == 403:
                    retry_after = int(res.headers.get("Retry-After", "60"))
                    await asyncio.sleep(min(retry_after, 60))
                    break
                if res.status_code == 422:
                    break
                if res.status_code != 200:
                    break

                payload = res.json() or {}
                items = payload.get("items") or []
                if not items:
                    break

                for item in items:
                    if len(hits) >= max_total:
                        break
                    repo = item.get("repository") or {}
                    repo_id = repo.get("id")
                    if repo_id is None or repo_id in seen_repo_ids:
                        continue
                    seen_repo_ids.add(repo_id)

                    path = item.get("path") or ""
                    owner_obj = repo.get("owner") or {}
                    owner = (owner_obj.get("login") or "").strip()
                    text_sample = " ".join([path, query])
                    stack_label = _classify_stack(vertical, text_sample)

                    hits.append(
                        {
                            "vertical_slug": slug,
                            "owner": owner,
                            "owner_type": owner_obj.get("type") or "",
                            "repo_name": repo.get("name") or "",
                            "repo_full_name": repo.get("full_name") or "",
                            "repo_description": repo.get("description") or "",
                            "repo_url": repo.get("html_url") or "",
                            "stars": int(repo.get("stargazers_count") or 0),
                            "is_fork": bool(repo.get("fork")),
                            "path": path,
                            "matched_query": query,
                            "stack_label": stack_label,
                        }
                    )

                await asyncio.sleep(_SEARCH_RATE_SLEEP)

    return {
        "raw_hits": hits,
        "agent_timings": {"fetch_code_search": round(time.perf_counter() - t0, 3)},
    }


async def filter_hits(state: VerticalDiscoveryState) -> dict:
    """Drop forks, tutorials, courses, vendor orgs. Enforce unique (owner, repo).

    Also enforces ``stack_label IS NOT NULL`` so Stage 2 knows which label
    to put in ``company_product_signals.signals.rag_stack_detected``.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    slug = state.get("vertical_slug")
    if not slug:
        return {}
    try:
        vertical = get_vertical(slug)
    except KeyError:
        return {}

    raw = state.get("raw_hits") or []
    seen_pairs: set[tuple[str, str]] = set()
    filtered: list[dict] = []

    for hit in raw:
        if "_error" in hit:
            continue
        owner = hit.get("owner") or ""
        repo_full = hit.get("repo_full_name") or ""
        if not owner or not repo_full:
            continue
        if hit.get("is_fork"):
            continue
        if _is_filtered_out(
            vertical, hit.get("repo_name") or "", owner, hit.get("repo_description") or ""
        ):
            continue
        if hit.get("stack_label") is None:
            continue
        key = (owner.lower(), repo_full.lower())
        if key in seen_pairs:
            continue
        seen_pairs.add(key)
        filtered.append(hit)

    return {
        "filtered_hits": filtered,
        "agent_timings": {"filter_hits": round(time.perf_counter() - t0, 3)},
    }


def _canonicalize_domain(raw: str) -> str:
    """Normalize a URL/blog string into a canonical domain.

    Mirrors the convention used in ``company_discovery_graph`` so downstream
    dedupe joins align. Returns ``""`` if nothing usable is present.
    """
    if not raw:
        return ""
    s = str(raw).strip().lower()
    if "://" not in s:
        s = "https://" + s
    try:
        host = urlparse(s).netloc
    except ValueError:
        return ""
    host = host.split(":")[0].strip(".")
    if host.startswith("www."):
        host = host[4:]
    # Drop bare GitHub-hosted pages — they're not the company's home.
    if host in {"github.com", "github.io"}:
        return ""
    return host


async def resolve_orgs(state: VerticalDiscoveryState) -> dict:
    """Resolve each unique GitHub owner to an org profile via ``GET /orgs/{login}``.

    Produces one entry per owner in ``resolved_orgs`` carrying the data
    needed by ``persist_candidates``: ``{github_org, name, canonical_domain,
    website, description, stack_label, evidence_hits}``. Users (personal
    accounts) are **skipped** — a company-scoped lead-gen run should not
    seed personal GitHub profiles into ``companies``.

    Shares the core 5000 req/hr bucket (authenticated). Cheap compared to
    the search bucket used by Stage 1.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    slug = state.get("vertical_slug") or ""
    filtered = state.get("filtered_hits") or []
    if not filtered:
        return {
            "resolved_orgs": [],
            "agent_timings": {"resolve_orgs": round(time.perf_counter() - t0, 3)},
        }

    # Group filtered hits by owner so we fetch each org only once, and
    # carry forward the union of stack_labels + example repos as evidence.
    by_owner: dict[str, dict[str, Any]] = {}
    for hit in filtered:
        owner = (hit.get("owner") or "").strip()
        if not owner:
            continue
        if hit.get("owner_type") != "Organization":
            continue  # skip personal users — see docstring
        slot = by_owner.setdefault(
            owner,
            {
                "owner": owner,
                "stack_labels": set(),
                "evidence_hits": [],
            },
        )
        if hit.get("stack_label"):
            slot["stack_labels"].add(hit["stack_label"])
        # Cap evidence to keep the persisted blob small.
        if len(slot["evidence_hits"]) < 3:
            slot["evidence_hits"].append(
                {
                    "repo": hit.get("repo_full_name") or "",
                    "path": hit.get("path") or "",
                    "url": hit.get("repo_url") or "",
                    "stars": hit.get("stars") or 0,
                }
            )

    if not by_owner:
        return {
            "resolved_orgs": [],
            "agent_timings": {"resolve_orgs": round(time.perf_counter() - t0, 3)},
        }

    resolved: list[dict] = []
    async with httpx.AsyncClient(
        base_url=_GITHUB_API,
        headers=_github_headers(),
        timeout=httpx.Timeout(connect=5.0, read=15.0, write=10.0, pool=10.0),
    ) as client:
        for owner, slot in by_owner.items():
            try:
                res = await client.get(f"/orgs/{owner}")
            except httpx.HTTPError:
                continue  # single-org failure is non-fatal
            if res.status_code == 404:
                continue  # not an org after all (race with user-type orgs)
            if res.status_code != 200:
                continue
            org = res.json() or {}
            blog = (org.get("blog") or "").strip()
            canonical_domain = _canonicalize_domain(blog)
            # Pick the best display name: org's `name` field, fallback to login.
            name = (org.get("name") or owner).strip()
            description = (org.get("description") or "").strip()
            website = blog or (org.get("html_url") or "")

            resolved.append(
                {
                    "vertical_slug": slug,
                    "github_org": owner,
                    "github_url": org.get("html_url") or f"https://github.com/{owner}",
                    "name": name,
                    "canonical_domain": canonical_domain,
                    "website": website,
                    "description": description,
                    "stack_labels": sorted(slot["stack_labels"]),
                    "evidence_hits": slot["evidence_hits"],
                }
            )

    return {
        "resolved_orgs": resolved,
        "agent_timings": {"resolve_orgs": round(time.perf_counter() - t0, 3)},
    }


async def dedupe_existing(state: VerticalDiscoveryState) -> dict:
    """Drop resolved orgs that already exist in ``companies``.

    Uses two cheap indexed lookups:
      - ``canonical_domain = ANY(%s)`` — matches commercial sites already
        seeded through other discovery paths.
      - ``github_org = ANY(%s)`` — matches rows that carry the GH org
        even if we never resolved their commercial domain.

    Any match drops the candidate. ``new_candidates`` carries the survivors
    into ``persist_candidates``.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    resolved = state.get("resolved_orgs") or []
    if not resolved:
        return {
            "new_candidates": [],
            "skipped_existing_count": 0,
            "agent_timings": {"dedupe_existing": round(time.perf_counter() - t0, 3)},
        }

    domains = sorted({r["canonical_domain"] for r in resolved if r.get("canonical_domain")})
    orgs = sorted({r["github_org"] for r in resolved if r.get("github_org")})

    existing_domains: set[str] = set()
    existing_orgs: set[str] = set()
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                if domains:
                    cur.execute(
                        "SELECT DISTINCT canonical_domain FROM companies "
                        "WHERE canonical_domain = ANY(%s)",
                        (domains,),
                    )
                    existing_domains = {row[0] for row in cur.fetchall() if row[0]}
                if orgs:
                    cur.execute(
                        "SELECT DISTINCT github_org FROM companies "
                        "WHERE github_org = ANY(%s)",
                        (orgs,),
                    )
                    existing_orgs = {row[0] for row in cur.fetchall() if row[0]}
    except (psycopg.Error, RuntimeError) as e:
        # Non-fatal. Two classes land here:
        #   - RuntimeError from _dsn() when NEON_DATABASE_URL is unset (dev/repl
        #     runs without the env). Candidates pass through unchanged.
        #   - psycopg.Error from a live but misbehaving DB. persist_candidates
        #     handles ON CONFLICT so duplicates won't corrupt; we just pay for
        #     extra INSERTs that hit the conflict clause.
        return {
            "_error": f"dedupe_existing: {e}",
            "new_candidates": resolved,
            "skipped_existing_count": 0,
            "agent_timings": {"dedupe_existing": round(time.perf_counter() - t0, 3)},
        }

    survivors = [
        r
        for r in resolved
        if (r.get("canonical_domain") or "") not in existing_domains
        and r.get("github_org") not in existing_orgs
    ]
    skipped = len(resolved) - len(survivors)

    return {
        "new_candidates": survivors,
        "skipped_existing_count": skipped,
        "agent_timings": {"dedupe_existing": round(time.perf_counter() - t0, 3)},
    }


async def persist_candidates(state: VerticalDiscoveryState) -> dict:
    """INSERT new companies + seed their ``company_product_signals`` row.

    Each surviving candidate becomes one ``companies`` row tagged
    ``['discovery-candidate', '<vertical_slug>']`` and one
    ``company_product_signals`` row carrying the stack_label the discovery
    pass observed. The enrichment graph's ``score_verticals`` node will
    later expand the signals jsonb from the company's homepage + careers
    page, but having the initial row here means the hot-lead query has
    something to read immediately.

    ``dry_run=True`` in state skips all writes and returns what *would*
    have been inserted — useful for REPL runs.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    slug = state.get("vertical_slug") or ""
    candidates = state.get("new_candidates") or []
    if not candidates or state.get("dry_run"):
        return {
            "inserted_company_ids": [],
            "agent_timings": {"persist_candidates": round(time.perf_counter() - t0, 3)},
        }

    try:
        vertical = get_vertical(slug)
    except KeyError:
        return {
            "inserted_company_ids": [],
            "agent_timings": {"persist_candidates": round(time.perf_counter() - t0, 3)},
        }

    from .verticals import compute_score_and_tier

    inserted_ids: list[int] = []
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                for cand in candidates:
                    domain = cand.get("canonical_domain") or ""
                    github_org = cand.get("github_org") or ""
                    # `key` must be unique — prefer domain, fall back to github org.
                    key = domain or (f"github.com/{github_org}" if github_org else "")
                    if not key:
                        continue
                    tags = ["discovery-candidate", slug]
                    stack_labels = cand.get("stack_labels") or []
                    primary_stack = stack_labels[0] if stack_labels else None

                    cur.execute(
                        """
                        INSERT INTO companies
                          (tenant_id, key, name, canonical_domain, website,
                           category, ai_tier, tags, score, score_reasons,
                           github_url, github_org,
                           created_at, updated_at)
                        VALUES
                          (COALESCE(NULLIF(current_setting('app.tenant', true), ''), 'vadim'),
                           %s, %s, %s, %s,
                           'UNKNOWN', 0, %s, %s, %s,
                           %s, %s,
                           now()::text, now()::text)
                        ON CONFLICT (key) DO UPDATE
                          SET github_org = COALESCE(companies.github_org, EXCLUDED.github_org),
                              github_url = COALESCE(companies.github_url, EXCLUDED.github_url)
                        RETURNING id, (xmax = 0) AS inserted
                        """,
                        (
                            key,
                            cand.get("name") or github_org or key,
                            domain or None,
                            cand.get("website") or None,
                            json.dumps(tags),
                            0.5,
                            json.dumps(
                                [f"discovered via {slug} GitHub code-search harvester"]
                            ),
                            cand.get("github_url") or None,
                            github_org or None,
                        ),
                    )
                    row = cur.fetchone()
                    if row is None:
                        continue
                    company_id, was_inserted = int(row[0]), bool(row[1])
                    if was_inserted:
                        inserted_ids.append(company_id)

                    # Seed company_product_signals with the observed stack_label.
                    # Score + tier are computed from the initial signals only;
                    # enrichment will expand them later.
                    signals: dict[str, Any] = {
                        "schema_version": vertical.schema_version,
                    }
                    if primary_stack:
                        signals["rag_stack_detected"] = primary_stack
                    if not any(k for k in signals if k != "schema_version"):
                        # No meaningful signal to seed (shouldn't happen — filter_hits
                        # already enforces stack_label IS NOT NULL).
                        continue
                    score, tier = compute_score_and_tier(vertical, signals)
                    cur.execute(
                        """
                        INSERT INTO company_product_signals
                          (company_id, product_id, signals, score, tier, updated_at)
                        VALUES (%s, %s, %s::jsonb, %s, %s, now())
                        ON CONFLICT (company_id, product_id) DO UPDATE
                          SET signals    = company_product_signals.signals || EXCLUDED.signals,
                              score      = GREATEST(company_product_signals.score, EXCLUDED.score),
                              tier       = COALESCE(EXCLUDED.tier, company_product_signals.tier),
                              updated_at = now()
                        """,
                        (
                            company_id,
                            int(vertical.product_id),
                            json.dumps(signals),
                            float(score),
                            tier,
                        ),
                    )
    except (psycopg.Error, RuntimeError) as e:
        # RuntimeError covers missing NEON_DATABASE_URL from _dsn(); psycopg.Error
        # covers live-DB failures. Both are non-fatal at the graph level — the
        # caller sees the failure via summary.errors.
        return {
            "_error": f"persist_candidates: {e}",
            "agent_timings": {"persist_candidates": round(time.perf_counter() - t0, 3)},
        }

    return {
        "inserted_company_ids": inserted_ids,
        "agent_timings": {"persist_candidates": round(time.perf_counter() - t0, 3)},
    }


async def build_summary(state: VerticalDiscoveryState) -> dict:
    """Terminal node — assemble a run summary for the caller."""
    raw = state.get("raw_hits") or []
    filtered = state.get("filtered_hits") or []
    resolved = state.get("resolved_orgs") or []
    new_candidates = state.get("new_candidates") or []
    inserted_ids = state.get("inserted_company_ids") or []
    skipped_existing = int(state.get("skipped_existing_count") or 0)

    by_stack: dict[str, int] = {}
    for hit in filtered:
        label = hit.get("stack_label") or "unknown"
        by_stack[label] = by_stack.get(label, 0) + 1

    unique_orgs = sorted({hit["owner"] for hit in filtered if hit.get("owner")})
    errors = [hit.get("_error") for hit in raw if isinstance(hit, dict) and "_error" in hit]
    if state.get("_error"):
        errors.append(state["_error"])

    summary = {
        "vertical_slug": state.get("vertical_slug"),
        # Stage 1
        "raw_count": len([h for h in raw if "_error" not in h]),
        "filtered_count": len(filtered),
        "unique_orgs": unique_orgs,
        "by_stack": by_stack,
        # Stage 2
        "resolved_org_count": len(resolved),
        "new_candidate_count": len(new_candidates),
        "inserted_count": len(inserted_ids),
        "inserted_company_ids": inserted_ids,
        "skipped_existing": skipped_existing,
        "dry_run": bool(state.get("dry_run")),
        "errors": errors,
    }
    return {"summary": summary}


# ── Graph ─────────────────────────────────────────────────────────────────

def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(VerticalDiscoveryState)
    builder.add_node("fetch_code_search", fetch_code_search)
    builder.add_node("filter_hits", filter_hits)
    builder.add_node("resolve_orgs", resolve_orgs)
    builder.add_node("dedupe_existing", dedupe_existing)
    builder.add_node("persist_candidates", persist_candidates)
    builder.add_node("build_summary", build_summary)
    builder.add_edge(START, "fetch_code_search")
    builder.add_edge("fetch_code_search", "filter_hits")
    builder.add_edge("filter_hits", "resolve_orgs")
    builder.add_edge("resolve_orgs", "dedupe_existing")
    builder.add_edge("dedupe_existing", "persist_candidates")
    builder.add_edge("persist_candidates", "build_summary")
    builder.add_edge("build_summary", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()


# ── Optional CLI ──────────────────────────────────────────────────────────

async def run(
    vertical_slug: str,
    *,
    max_pages_per_query: int = _DEFAULT_MAX_PAGES,
    max_total_results: int = _DEFAULT_MAX_TOTAL,
    queries: list[str] | None = None,
    dry_run: bool = False,
) -> dict:
    """Standalone async entry point — convenient for REPL / one-off scripts.

    With ``dry_run=True`` the harvester walks all stages but does NOT INSERT
    into ``companies`` / ``company_product_signals`` — useful for previewing
    what *would* be persisted on a fresh vertical.
    """
    result = await graph.ainvoke(
        {
            "vertical_slug": vertical_slug,
            "max_pages_per_query": max_pages_per_query,
            "max_total_results": max_total_results,
            "queries": queries,
            "dry_run": dry_run,
        }
    )
    return result.get("summary") or {}


if __name__ == "__main__":
    import json as _json
    import sys

    slug = sys.argv[1] if len(sys.argv) > 1 else "ingestible"
    dry = "--dry-run" in sys.argv[1:]
    summary = asyncio.run(
        run(slug, max_pages_per_query=1, max_total_results=50, dry_run=dry)
    )
    print(_json.dumps(summary, indent=2))

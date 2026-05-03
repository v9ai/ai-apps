"""Per-repo deep-research pass for `gh_ai_repos` hot leads.

Pipeline: ``load → fetch_pages ‖ web_search → synthesize → persist``.

Input is a single ``full_name`` (e.g. ``pixeltable/pixeltable``); the graph
loads the repo + org from D1 (``gh_repos`` / ``gh_orgs``), fetches the org
homepage + ``/pricing`` + ``/careers`` + ``/about``, runs a small Brave
web-search batch for fundraise / founder signals, asks deepseek-pro to
synthesize an outreach-ready brief, and upserts the result into
``gh_lead_research`` keyed by ``repo_id``.

Designed to run one repo at a time. A small shell loop (or a future
fan-out driver graph) iterates over the hot-list:

    SELECT full_name FROM gh_repos
     WHERE monetization_stage IN ('experimenting','has_pricing')
       AND final_score >= 0.5;

Reuses the same Cloudflare D1 REST client (`._d1.D1Client`) and the
deepseek-pro factory (`.llm.make_deepseek_pro`) used by `gh_ai_repos`.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from typing import Any, Literal

import httpx
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from ._d1 import D1Client, D1Error
from .gh_patterns_graph import GhClient
from .llm import (
    ainvoke_json_with_telemetry,
    compute_totals,
    deepseek_model_name,
    make_deepseek_pro,
    merge_node_telemetry,
)
from .product_intel_schemas import product_intel_graph_meta
from .state import GhLeadResearchState

log = logging.getLogger(__name__)


# ── Constants ────────────────────────────────────────────────────────────────

_USER_AGENT = (
    "Mozilla/5.0 (compatible; lead-gen-research/1.0; +https://agenticleadgen.xyz)"
)
_FETCH_TIMEOUT = httpx.Timeout(15.0, connect=8.0)
_PAGE_PATHS: tuple[str, ...] = ("/pricing", "/careers", "/about")
_PAGE_EXCERPT_CHARS = 4000
_BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search"
_BRAVE_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_BRAVE_COUNT = 5

# Top-N GitHub contributors hydrated with /users/{login}. Founders of small
# orgs almost always show up in this list with a populated name/blog/twitter.
_TOP_CONTRIBUTORS = 5

EvidenceConfidence = Literal["low", "medium", "high"]


class DecisionMaker(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = Field(min_length=1, max_length=120)
    title: str = Field(default="", max_length=120)
    linkedin: str = Field(default="", max_length=240)
    twitter: str = Field(default="", max_length=120)
    email: str = Field(default="", max_length=240)
    source: str = Field(default="", max_length=60)  # 'careers', 'about', 'web_search', 'github'


class LeadResearchBrief(BaseModel):
    """Synthesized brief produced by the deepseek-pro synthesize node.

    All fields default to empty so a partial-evidence run still persists.
    """

    model_config = ConfigDict(extra="ignore")

    recent_fundraise: str = Field(default="", max_length=400)
    recent_launch: str = Field(default="", max_length=400)
    team_size_signal: str = Field(default="", max_length=200)
    icp_fit_summary: str = Field(default="", max_length=800)
    pitch_one_liner: str = Field(default="", max_length=320)
    decision_makers: list[DecisionMaker] = Field(default_factory=list, max_length=5)
    evidence_urls: list[str] = Field(default_factory=list, max_length=10)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    @field_validator("confidence", mode="before")
    @classmethod
    def _coerce_conf(cls, v: object) -> float:
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


_SUBDOMAIN_PREFIXES_TO_PEEL: frozenset[str] = frozenset({
    "docs", "api", "blog", "help", "app", "dev", "staging", "support",
})


def _normalize_homepage(url: str | None) -> str | None:
    """Return a clean ``https://host`` for fetching paths against."""
    if not url:
        return None
    u = url.strip()
    if not u:
        return None
    if not u.startswith(("http://", "https://")):
        u = "https://" + u
    try:
        from urllib.parse import urlsplit, urlunsplit
        sp = urlsplit(u)
        if not sp.netloc:
            return None
        return urlunsplit((sp.scheme, sp.netloc, "", "", ""))
    except Exception:
        return None


def _candidate_homepages(repo_homepage: str | None, org_blog: str | None) -> list[str]:
    """Build an ordered, deduped list of root URLs to try for /pricing etc.

    Many AI-OSS repos point ``homepage`` at a docs subdomain (``docs.x.com``)
    or a GitHub Pages site, where /pricing and /careers 404. We try the
    repo+org URLs first, then peel known subdomain prefixes
    (docs/api/blog/help/app/dev/staging/support) to also try the apex.
    """
    out: list[str] = []
    seen: set[str] = set()

    def _add(url: str | None) -> None:
        norm = _normalize_homepage(url)
        if norm and norm not in seen:
            seen.add(norm)
            out.append(norm)

    _add(repo_homepage)
    _add(org_blog)

    # Peel subdomain prefixes off whatever we already have.
    from urllib.parse import urlsplit, urlunsplit
    for url in list(out):
        sp = urlsplit(url)
        parts = sp.netloc.split(".")
        if len(parts) >= 3 and parts[0].lower() in _SUBDOMAIN_PREFIXES_TO_PEEL:
            apex = ".".join(parts[1:])
            _add(urlunsplit((sp.scheme, apex, "", "", "")))

    return out


def _strip_html(html: str, *, limit: int = _PAGE_EXCERPT_CHARS) -> str:
    """Extremely lightweight HTML→text. We don't need perfect — just enough
    for the LLM to reason over. Avoids pulling in bs4 for one call."""
    import re
    # drop scripts/styles
    txt = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
    txt = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", txt, flags=re.IGNORECASE)
    # drop tags
    txt = re.sub(r"<[^>]+>", " ", txt)
    # entities
    txt = (
        txt.replace("&nbsp;", " ")
           .replace("&amp;", "&")
           .replace("&lt;", "<")
           .replace("&gt;", ">")
           .replace("&quot;", '"')
           .replace("&#39;", "'")
    )
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt[:limit]


async def _fetch_one(client: httpx.AsyncClient, url: str) -> tuple[int, str]:
    try:
        r = await client.get(url, headers={"User-Agent": _USER_AGENT}, follow_redirects=True)
        body = r.text if r.status_code == 200 else ""
        return r.status_code, _strip_html(body) if body else ""
    except Exception as e:  # noqa: BLE001
        log.debug("fetch %s failed: %s", url, e)
        return 0, ""


async def _brave_search(client: httpx.AsyncClient, query: str) -> list[dict[str, Any]]:
    api_key = os.environ.get("BRAVE_SEARCH_API_KEY", "").strip()
    if not api_key:
        return []
    try:
        r = await client.get(
            _BRAVE_API_URL,
            headers={
                "X-Subscription-Token": api_key,
                "Accept": "application/json",
                "User-Agent": _USER_AGENT,
            },
            params={"q": query, "count": _BRAVE_COUNT},
            timeout=_BRAVE_TIMEOUT,
        )
        if r.status_code != 200:
            return []
        body = r.json()
        web = (body.get("web") or {}).get("results") or []
        return [
            {
                "title": (h.get("title") or "")[:160],
                "url": h.get("url") or "",
                "description": (h.get("description") or "")[:400],
            }
            for h in web
        ]
    except Exception as e:  # noqa: BLE001
        log.debug("brave search %r failed: %s", query, e)
        return []


# ── Nodes ────────────────────────────────────────────────────────────────────


async def load_repo(state: GhLeadResearchState) -> dict:
    """Fetch repo + org row from D1 keyed by full_name."""
    full_name = (state.get("full_name") or "").strip()
    if not full_name:
        return {"_error": "load_repo: full_name is required"}
    t0 = time.perf_counter()

    try:
        client = D1Client()
        rows = await client.query(
            "SELECT r.id AS repo_id, r.full_name, r.html_url, r.owner_login, "
            "       r.description, r.stars, r.homepage AS repo_homepage, "
            "       r.monetization_stage, r.commercial_intent, r.buyer_persona, "
            "       r.pain_points, r.pitch_angle, r.matched_topic, "
            "       r.org_id, o.github_login, o.name AS org_name, o.blog AS org_blog, "
            "       o.twitter_username, o.email AS org_email, o.location, "
            "       o.public_members, o.public_repos, o.total_org_stars, o.flagship_repo "
            "  FROM gh_repos r LEFT JOIN gh_orgs o ON r.org_id = o.id "
            " WHERE r.full_name = ? LIMIT 1",
            [full_name],
        )
    except D1Error as e:
        return {"_error": f"load_repo (D1): {e}"}

    if not rows:
        return {"_error": f"load_repo: full_name not found in gh_repos: {full_name}"}

    row = rows[0]
    homepages = _candidate_homepages(row.get("repo_homepage"), row.get("org_blog"))

    return {
        "repo": row,
        "homepages": homepages,
        "agent_timings": {"load_repo": round(time.perf_counter() - t0, 3)},
    }


async def fetch_pages(state: GhLeadResearchState) -> dict:
    """Fetch homepage + /pricing + /careers + /about, trying each candidate
    root in order. First 200 wins per path key; if none returns 200, we
    keep the last attempt's url+status with empty excerpt so the synthesize
    node can reason about the absence.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    homepages = state.get("homepages") or []
    if not homepages:
        return {
            "pages": {},
            "agent_timings": {"fetch_pages": round(time.perf_counter() - t0, 3)},
        }

    # Build (path_key, candidate_url) tuples. Each path key tried against
    # every candidate root, in order.
    path_keys: list[tuple[str, str]] = []  # (key, suffix)
    path_keys.append(("homepage", ""))
    for p in _PAGE_PATHS:
        path_keys.append((p.lstrip("/"), p))

    plan: list[tuple[str, str]] = []  # (path_key, full_url)
    for key, suffix in path_keys:
        for root in homepages:
            plan.append((key, root + suffix))

    async with httpx.AsyncClient(timeout=_FETCH_TIMEOUT) as client:
        results = await asyncio.gather(
            *(_fetch_one(client, url) for _, url in plan),
            return_exceptions=False,
        )

    # Reduce: first 200 per key wins; otherwise keep the last attempt.
    pages: dict[str, dict[str, Any]] = {}
    for (key, url), (status, excerpt) in zip(plan, results, strict=True):
        existing = pages.get(key)
        if existing is None:
            pages[key] = {"url": url, "status": status, "excerpt": excerpt}
            continue
        if existing.get("status") == 200:
            continue  # already have a winner
        if status == 200:
            pages[key] = {"url": url, "status": status, "excerpt": excerpt}
        else:
            # keep the most-recent non-200 (overwrite is fine — same shape)
            pages[key] = {"url": url, "status": status, "excerpt": excerpt}

    return {
        "pages": pages,
        "agent_timings": {"fetch_pages": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "fetch_pages": {
                    "candidates_tried": len(plan),
                    "keys": len(pages),
                    "ok": sum(1 for p in pages.values() if p["status"] == 200),
                    "homepages": homepages,
                }
            }
        },
    }


async def fetch_contributors(state: GhLeadResearchState) -> dict:
    """Fetch top GitHub contributors + hydrate each via /users/{login}.

    Founders of small orgs almost always sit at the top of the contributors
    list with a populated name/blog/twitter. This is the highest-signal
    deterministic source for decision-maker discovery — strictly better
    than relying on the LLM to extract names from Brave snippets alone.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repo = state.get("repo") or {}
    full_name = (repo.get("full_name") or "").strip()
    if "/" not in full_name:
        return {"contributors": []}
    owner, repo_name = full_name.split("/", 1)

    try:
        gh = GhClient.from_env()
    except Exception as e:  # noqa: BLE001
        log.warning("fetch_contributors: GhClient init failed: %s", e)
        return {"contributors": []}

    try:
        contribs = await gh.repo_contributors(owner, repo_name)
    finally:
        # GhClient holds an httpx.AsyncClient; close it if a context manager
        # is exposed. Many implementations are no-op safe.
        close = getattr(gh, "aclose", None)
        if close is not None:
            try:
                await close()
            except Exception:  # noqa: BLE001
                pass

    # Top N by contributions; skip bots (login ends with [bot] or contains 'bot')
    def _is_bot(c: dict[str, Any]) -> bool:
        login = (c.get("login") or "").lower()
        return login.endswith("[bot]") or login.endswith("-bot") or login == "dependabot"

    top = [c for c in (contribs or []) if not _is_bot(c)][:_TOP_CONTRIBUTORS]

    # Hydrate each via /users/{login} — runs concurrent; tolerate failures.
    try:
        gh2 = GhClient.from_env()
    except Exception:  # noqa: BLE001
        return {"contributors": [{"login": c.get("login"), "contributions": c.get("contributions")} for c in top]}

    try:
        users = await asyncio.gather(
            *(gh2.get_user(c["login"]) for c in top if c.get("login")),
            return_exceptions=True,
        )
    finally:
        close = getattr(gh2, "aclose", None)
        if close is not None:
            try:
                await close()
            except Exception:  # noqa: BLE001
                pass

    out: list[dict[str, Any]] = []
    for c, u in zip(top, users, strict=False):
        login = c.get("login")
        if not login:
            continue
        ud = u if isinstance(u, dict) else {}
        out.append({
            "login": login,
            "contributions": int(c.get("contributions") or 0),
            "name": ud.get("name") or "",
            "blog": ud.get("blog") or "",
            "twitter_username": ud.get("twitter_username") or "",
            "email": ud.get("email") or "",
            "bio": (ud.get("bio") or "")[:300],
            "company": ud.get("company") or "",
            "location": ud.get("location") or "",
            "html_url": ud.get("html_url") or f"https://github.com/{login}",
        })

    return {
        "contributors": out,
        "agent_timings": {"fetch_contributors": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "fetch_contributors": {
                    "raw": len(contribs or []),
                    "kept": len(out),
                    "with_name": sum(1 for x in out if x.get("name")),
                }
            }
        },
    }


async def web_search(state: GhLeadResearchState) -> dict:
    """Brave search for fundraise/founder/team signals. Optional — empty
    list when BRAVE_SEARCH_API_KEY is unset, no error."""
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repo = state.get("repo") or {}
    org_name = repo.get("org_name") or repo.get("github_login") or repo.get("owner_login") or ""
    if not org_name:
        return {"web_results": []}

    queries = [
        f'"{org_name}" funding OR raised OR seed OR series',
        f'"{org_name}" founder OR CEO OR CTO',
        f'"{org_name}" team OR about',
        # Targets LinkedIn profile pages so the snippet exposes
        # name + role + headline even though Brave can't render the JS-only page.
        f'site:linkedin.com/in "{org_name}" (founder OR CEO OR CTO OR cofounder)',
    ]

    async with httpx.AsyncClient(timeout=_BRAVE_TIMEOUT) as client:
        batches = await asyncio.gather(*(_brave_search(client, q) for q in queries))

    # Dedupe by URL across the 3 queries; preserve order.
    seen_urls: set[str] = set()
    merged: list[dict[str, Any]] = []
    for batch in batches:
        for hit in batch:
            url = hit.get("url") or ""
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            merged.append(hit)

    return {
        "web_results": merged[:15],
        "agent_timings": {"web_search": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": {
                "web_search": {
                    "queries": len(queries),
                    "unique_hits": len(merged),
                }
            }
        },
    }


_SYNTHESIZE_SYSTEM = (
    "You are a B2B sales researcher producing a one-page brief on an early-stage AI "
    "open-source project. The user already qualified the repo as a small org with no "
    "established sales motion. Your job is to surface the *actionable* facts a "
    "founder/CTO would need to send a personalized cold email this week.\n\n"
    "Inputs you receive (JSON):\n"
    "- The repo + org metadata (stars, homepage, monetization_stage, etc.)\n"
    "- Excerpts from the org's homepage / /pricing / /careers / /about pages\n"
    "- Up to 20 Brave web-search hits (title + url + description), including LinkedIn snippets\n"
    "- Top GitHub contributors (login, name, blog, twitter, email, bio, company, location).\n"
    "  These are HIGH-SIGNAL: for small-org repos the top 1-3 contributors are\n"
    "  almost always founders / early team. Treat them as primary decision-maker candidates.\n\n"
    "Return STRICT JSON with this exact shape, no prose:\n"
    "{\n"
    '  "recent_fundraise": "1 sentence — which round, $ amount, lead investor, date. Empty string if no evidence.",\n'
    '  "recent_launch":    "1 sentence — most recent product/version launch with date. Empty if none found.",\n'
    '  "team_size_signal": "1 sentence — what the careers/about pages reveal about team size + roles being hired. Empty if no data.",\n'
    '  "icp_fit_summary":  "2-3 sentences — why this org is a credible B2B sales lead given the user sells AI-infra/observability/hosting tools.",\n'
    '  "pitch_one_liner":  "≤ 240 chars — paste-ready first sentence of a cold email. Reference one specific thing from the evidence.",\n'
    '  "decision_makers": [\n'
    '    { "name":"...", "title":"...", "linkedin":"https://...", "twitter":"@...", "email":"...", "source":"about|careers|web_search|github" }\n'
    "  ],\n"
    '  "evidence_urls": ["url1","url2",...],\n'
    '  "confidence": 0.0..1.0 — your overall confidence in the brief\n'
    "}\n\n"
    "Rules:\n"
    "- Cite ONLY claims supported by the inputs. If /careers excerpt doesn't mention hiring, leave team_size_signal empty.\n"
    "- decision_makers (max 5): START with the top GitHub contributors. For each contributor whose `name` is populated, include them with their html_url as `linkedin` (or use the actual linkedin URL if a Brave snippet exposed it). Title = derive from bio/company (e.g. 'Founder & CTO' if bio says so) — fall back to 'Maintainer'. Source = 'github'. Then layer in any *additional* people named in Brave snippets with explicit titles like 'Founder', 'CEO', 'CTO' at the org. Even a 1-line LinkedIn snippet ('Founder of X') is sufficient evidence.\n"
    "- evidence_urls: include the actual URLs you used to ground each non-empty field above.\n"
    "- pitch_one_liner: must reference *something concrete* from the evidence — a recent launch, fundraise, hiring spree, README quote — not generic praise.\n"
    "- If the evidence is thin, set confidence < 0.4 and return mostly empty fields. Do NOT invent."
)


def _synthesize_payload(state: GhLeadResearchState) -> dict[str, Any]:
    repo = state.get("repo") or {}
    pages = state.get("pages") or {}
    web_results = state.get("web_results") or []
    contributors = state.get("contributors") or []

    return {
        "contributors": contributors,
        "repo": {
            "full_name": repo.get("full_name"),
            "stars": repo.get("stars"),
            "description": repo.get("description"),
            "monetization_stage": repo.get("monetization_stage"),
            "commercial_intent": repo.get("commercial_intent"),
            "buyer_persona": repo.get("buyer_persona"),
            "pitch_angle": repo.get("pitch_angle"),
            "matched_topic": repo.get("matched_topic"),
        },
        "org": {
            "github_login": repo.get("github_login"),
            "name": repo.get("org_name"),
            "blog": repo.get("org_blog"),
            "twitter": repo.get("twitter_username"),
            "email": repo.get("org_email"),
            "location": repo.get("location"),
            "public_members": repo.get("public_members"),
            "public_repos": repo.get("public_repos"),
            "total_org_stars": repo.get("total_org_stars"),
        },
        "pages": {
            k: {
                "url": v.get("url"),
                "status": v.get("status"),
                "excerpt": (v.get("excerpt") or "")[:_PAGE_EXCERPT_CHARS],
            }
            for k, v in pages.items()
        },
        "web_search": web_results[:15],
    }


async def synthesize(state: GhLeadResearchState) -> dict:
    """Single deepseek-pro call producing the structured brief."""
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    payload = _synthesize_payload(state)
    llm = make_deepseek_pro(temperature=0.2)
    try:
        parsed, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {"role": "system", "content": _SYNTHESIZE_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        "Synthesize a one-page brief for this lead. JSON only.\n\n"
                        + json.dumps(payload, ensure_ascii=False)
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        log.warning("synthesize failed: %s", e)
        return {"_error": f"synthesize: {e}"}

    try:
        brief = LeadResearchBrief.model_validate(parsed if isinstance(parsed, dict) else {})
    except ValidationError as e:
        log.warning("synthesize validation failed: %s", e)
        # Persist the empty default so downstream still runs.
        brief = LeadResearchBrief()

    prior = (state.get("graph_meta") or {}).get("telemetry") or {}
    return {
        "brief": brief.model_dump(),
        "agent_timings": {"synthesize": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(prior, "synthesize", tel),
        },
    }


async def persist(state: GhLeadResearchState) -> dict:
    """Upsert the research row keyed by repo_id."""
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    repo = state.get("repo") or {}
    pages = state.get("pages") or {}
    web_results = state.get("web_results") or []
    brief = state.get("brief") or {}

    repo_id = repo.get("repo_id")
    if not repo_id:
        return {"_error": "persist: repo.repo_id missing"}

    def _page(key: str, field: str) -> Any:
        return (pages.get(key) or {}).get(field)

    try:
        client = D1Client()
        rows = await client.query(
            "INSERT INTO gh_lead_research "
            "(repo_id, org_id, homepage_url, homepage_status, "
            " pricing_url, pricing_status, pricing_excerpt, "
            " careers_url, careers_status, careers_excerpt, "
            " about_url, about_status, about_excerpt, "
            " web_search_results_json, contributors_json, "
            " recent_fundraise, recent_launch, "
            " team_size_signal, icp_fit_summary, pitch_one_liner, "
            " decision_makers_json, evidence_urls_json, llm_confidence, researched_at) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(repo_id) DO UPDATE SET "
            "  org_id = excluded.org_id, "
            "  homepage_url = excluded.homepage_url, "
            "  homepage_status = excluded.homepage_status, "
            "  pricing_url = excluded.pricing_url, "
            "  pricing_status = excluded.pricing_status, "
            "  pricing_excerpt = excluded.pricing_excerpt, "
            "  careers_url = excluded.careers_url, "
            "  careers_status = excluded.careers_status, "
            "  careers_excerpt = excluded.careers_excerpt, "
            "  about_url = excluded.about_url, "
            "  about_status = excluded.about_status, "
            "  about_excerpt = excluded.about_excerpt, "
            "  web_search_results_json = excluded.web_search_results_json, "
            "  contributors_json = excluded.contributors_json, "
            "  recent_fundraise = excluded.recent_fundraise, "
            "  recent_launch = excluded.recent_launch, "
            "  team_size_signal = excluded.team_size_signal, "
            "  icp_fit_summary = excluded.icp_fit_summary, "
            "  pitch_one_liner = excluded.pitch_one_liner, "
            "  decision_makers_json = excluded.decision_makers_json, "
            "  evidence_urls_json = excluded.evidence_urls_json, "
            "  llm_confidence = excluded.llm_confidence, "
            "  researched_at = CURRENT_TIMESTAMP "
            "RETURNING id, repo_id",
            [
                int(repo_id),
                repo.get("org_id"),
                _page("homepage", "url"),
                _page("homepage", "status"),
                _page("pricing", "url"),
                _page("pricing", "status"),
                _page("pricing", "excerpt"),
                _page("careers", "url"),
                _page("careers", "status"),
                _page("careers", "excerpt"),
                _page("about", "url"),
                _page("about", "status"),
                _page("about", "excerpt"),
                json.dumps(web_results) if web_results else None,
                json.dumps(state.get("contributors") or []) if state.get("contributors") else None,
                brief.get("recent_fundraise") or None,
                brief.get("recent_launch") or None,
                brief.get("team_size_signal") or None,
                brief.get("icp_fit_summary") or None,
                brief.get("pitch_one_liner") or None,
                json.dumps(brief.get("decision_makers") or []) if brief.get("decision_makers") else None,
                json.dumps(brief.get("evidence_urls") or []) if brief.get("evidence_urls") else None,
                float(brief.get("confidence") or 0.0),
            ],
        )
    except D1Error as e:
        return {"_error": f"persist (D1): {e}"}

    research_id = (rows[0].get("id") if rows else None)

    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    agent_timings_so_far = dict(state.get("agent_timings") or {})
    agent_timings_so_far["persist"] = round(time.perf_counter() - t0, 3)
    meta = product_intel_graph_meta(
        graph="gh_lead_research",
        model=deepseek_model_name("deep"),
        agent_timings=agent_timings_so_far,
        telemetry=telemetry,
        totals=compute_totals(telemetry),
    )

    summary = {
        "full_name": repo.get("full_name"),
        "research_id": research_id,
        "pages_ok": sum(1 for p in pages.values() if (p or {}).get("status") == 200),
        "web_hits": len(web_results),
        "brief": brief,
        "graph_meta": meta,
    }

    return {
        "research_id": int(research_id) if research_id is not None else None,
        "summary": summary,
        "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
    }


# ── Graph builder ────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(GhLeadResearchState)
    builder.add_node("load_repo", load_repo)
    builder.add_node("fetch_pages", fetch_pages)
    builder.add_node("fetch_contributors", fetch_contributors)
    builder.add_node("web_search", web_search)
    builder.add_node("synthesize", synthesize)
    builder.add_node("persist", persist)

    builder.add_edge(START, "load_repo")
    # Fan out: page fetch, GitHub contributors, and Brave web search run in
    # parallel after load_repo. Disjoint state keys (pages / contributors /
    # web_results) so the merge into synthesize is conflict-free.
    builder.add_edge("load_repo", "fetch_pages")
    builder.add_edge("load_repo", "fetch_contributors")
    builder.add_edge("load_repo", "web_search")
    builder.add_edge("fetch_pages", "synthesize")
    builder.add_edge("fetch_contributors", "synthesize")
    builder.add_edge("web_search", "synthesize")
    builder.add_edge("synthesize", "persist")
    builder.add_edge("persist", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()

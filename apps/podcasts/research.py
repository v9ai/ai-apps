#!/usr/bin/env python3
"""Person research pipeline — single-file LangGraph script.

Reads all personalities/*.ts files, presents a menu, and runs the full
research pipeline (web search, GitHub, ORCID, synthesize, evaluate, export)
for the selected person. No CLI args needed.

Usage:
    python3 research.py
"""

import json
import operator
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any, TypedDict
from urllib.parse import urlparse

import httpx
from ddgs import DDGS
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send
from rich.console import Console
from rich.table import Table

console = Console()

SCRIPT_DIR = Path(__file__).resolve().parent
PERSONALITIES_DIR = SCRIPT_DIR / "personalities"
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"

_HTTP_TIMEOUT = 15.0
_DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"


# ═══════════════════════════════════════════════════════════════════════════
# Personality loader
# ═══════════════════════════════════════════════════════════════════════════

def _parse_ts(path: Path) -> dict[str, str]:
    """Extract name/role/org/github/orcid from a personality .ts file."""
    text = path.read_text()
    fields: dict[str, str] = {"slug": path.stem}
    for key in ("name", "role", "org", "github", "orcid"):
        m = re.search(rf'{key}:\s*"([^"]+)"', text)
        if m:
            fields[key] = m.group(1)
    return fields


def load_personalities() -> list[dict[str, str]]:
    """Load all personalities from .ts files."""
    people = []
    for ts in sorted(PERSONALITIES_DIR.glob("*.ts")):
        p = _parse_ts(ts)
        if p.get("name"):
            people.append(p)
    return people


def pick_person(people: list[dict[str, str]]) -> dict[str, str]:
    """Show a numbered menu and return the chosen person."""
    console.print("\n[bold cyan]Available personalities:[/]\n")
    for i, p in enumerate(people, 1):
        orcid = f"  ORCID: {p['orcid']}" if p.get("orcid") else ""
        github = f"  GH: {p.get('github', '')}" if p.get("github") else ""
        console.print(f"  [yellow]{i:>2}[/]  {p['name']}  [dim]{p.get('role', '')} @ {p.get('org', '')}{github}{orcid}[/]")
    console.print()
    choice = console.input("[bold]Pick a number (or Enter for all): [/]").strip()
    if not choice:
        return {}  # signals "run all"
    idx = int(choice) - 1
    return people[idx]


# ═══════════════════════════════════════════════════════════════════════════
# DeepSeek client
# ═══════════════════════════════════════════════════════════════════════════

def _api_key() -> str:
    key = os.getenv("DEEPSEEK_API_KEY", "")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY not set")
    return key


def chat_json(messages: list[dict[str, str]], *, max_tokens: int = 8_192, temperature: float = 0.2) -> Any:
    resp = httpx.post(
        _DEEPSEEK_URL,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {_api_key()}"},
        json={"model": "deepseek-chat", "messages": messages, "max_tokens": max_tokens,
              "temperature": temperature, "response_format": {"type": "json_object"}},
        timeout=120,
    )
    resp.raise_for_status()
    return json.loads(resp.json()["choices"][0]["message"]["content"])


# ═══════════════════════════════════════════════════════════════════════════
# Prompts
# ═══════════════════════════════════════════════════════════════════════════

GENERATE_QUERIES_SYSTEM = """\
You are a research assistant that generates web search queries to deeply \
research a specific person in the AI/tech industry. Given a person's name, \
role, and organization, generate diverse search queries that will uncover:

1. Recent news and announcements
2. Technical blog posts and articles they've written
3. Conference talks and presentations
4. Interviews and podcast appearances
5. Open-source projects and technical contributions
6. Opinions and positions on AI topics
7. Career history and background

CRITICAL — Name disambiguation:
- Many people share the same name. ALWAYS include the person's role, \
organization, or domain (e.g. "AI", "machine learning") in EVERY query \
to disambiguate from unrelated people with the same name.
- Never generate a query with just the person's name and a generic term.

Return a JSON object with a single key "queries" containing a list of \
8-12 search query strings. Make queries specific and varied to maximize \
coverage. Include the person's name AND their organization or domain in \
every query. Use recent timeframes where appropriate (e.g. "2025" or "2026"). \
Include at least 2 queries targeting direct quotes or interviews.
"""

SYNTHESIZE_SYSTEM = """\
You are an expert research analyst synthesizing information about a person \
in the AI/tech industry. You will receive web search results, GitHub data, \
ORCID academic record, and existing knowledge about the person.

You may receive full page content from fetched URLs alongside search snippets. \
Use this richer content to extract more accurate details, direct quotes, \
timeline events, and contribution descriptions. Prefer specific facts from \
page content over vague snippet summaries.

Produce a comprehensive research profile as a JSON object with these fields:

{
  "bio": "A 3-5 sentence synthesized biography based on all available evidence.",
  "topics": ["topic1", "topic2", ...],
  "timeline": [{"date": "YYYY-MM", "event": "Description", "url": "source URL"}, ...],
  "key_contributions": [{"title": "Name", "description": "Brief description", "url": "link"}, ...],
  "quotes": [{"text": "The quote", "source": "Interview name", "url": "source link"}, ...],
  "social": {"github": "...", "twitter": "...", "linkedin": "...", "website": "..."},
  "sources": [{"title": "Source title", "url": "https://..."}, ...]
}

Rules:
- CRITICAL — Name disambiguation: Only include information about the specific \
person identified by Name + Role + Organization. Discard results about different people.
- Only include information supported by the provided data
- Never fabricate quotes — only use actual quotes found in search results
- Prefer recent information over older data
- Dates should be YYYY-MM format where possible
"""

EVALUATE_SYSTEM = """\
You are a research quality evaluator. Given a synthesized research profile, \
evaluate its quality across 5 dimensions, scoring each 1-10:

1. bio_quality — Specific, evidence-based, informative?
2. source_coverage — Diverse, high-quality, verifiable sources?
3. timeline_completeness — Detailed dates, career arc coverage?
4. contributions_depth — Well-described with context and URLs?
5. name_disambiguation — Clearly focused on the right person?

Return JSON:
{
  "bio_quality": {"score": <1-10>, "reasoning": "..."},
  "source_coverage": {"score": <1-10>, "reasoning": "..."},
  "timeline_completeness": {"score": <1-10>, "reasoning": "..."},
  "contributions_depth": {"score": <1-10>, "reasoning": "..."},
  "name_disambiguation": {"score": <1-10>, "reasoning": "..."},
  "overall_score": <1-10>,
  "summary": "..."
}
"""


# ═══════════════════════════════════════════════════════════════════════════
# State
# ═══════════════════════════════════════════════════════════════════════════

class OrcidWork(TypedDict):
    title: str
    year: str
    doi: str
    url: str

class OrcidData(TypedDict, total=False):
    orcid_id: str
    name: str
    other_names: list[str]
    biography: str
    keywords: list[str]
    urls: list[dict[str, str]]
    works: list[OrcidWork]

class EvalScore(TypedDict):
    score: int
    reasoning: str

class EvalResult(TypedDict):
    bio_quality: EvalScore
    source_coverage: EvalScore
    timeline_completeness: EvalScore
    contributions_depth: EvalScore
    name_disambiguation: EvalScore
    overall_score: int
    summary: str

class WebResult(TypedDict):
    title: str
    url: str
    snippet: str

class GitHubRepo(TypedDict):
    name: str
    description: str
    url: str
    stars: int
    language: str

class GitHubProfile(TypedDict, total=False):
    login: str
    name: str
    bio: str
    company: str
    location: str
    blog: str
    twitter_username: str
    public_repos: int
    followers: int
    avatar_url: str

class TimelineEvent(TypedDict):
    date: str
    event: str
    url: str

class Contribution(TypedDict):
    title: str
    description: str
    url: str

class Quote(TypedDict):
    text: str
    source: str
    url: str

class PersonResearch(TypedDict):
    slug: str
    name: str
    generated_at: str
    bio: str
    topics: list[str]
    timeline: list[TimelineEvent]
    key_contributions: list[Contribution]
    quotes: list[Quote]
    social: dict[str, str]
    sources: list[dict[str, str]]

class UrlContent(TypedDict):
    content: str
    status_code: int

class PersonResearchState(TypedDict):
    person_name: str
    person_slug: str
    person_role: str
    person_org: str
    person_github: str
    person_orcid: str
    search_queries: list[str]
    web_results: Annotated[list[WebResult], operator.add]
    url_content: dict[str, UrlContent]
    github_profile: GitHubProfile
    github_repos: list[GitHubRepo]
    orcid_data: OrcidData
    research: PersonResearch
    eval_result: EvalResult
    export_path: str


# ═══════════════════════════════════════════════════════════════════════════
# Nodes
# ═══════════════════════════════════════════════════════════════════════════

def generate_queries_node(state: PersonResearchState) -> dict:
    name, role, org = state["person_name"], state.get("person_role", ""), state.get("person_org", "")
    console.print(f"\n  [cyan]Generating search queries for {name}...[/]")
    messages = [
        {"role": "system", "content": GENERATE_QUERIES_SYSTEM},
        {"role": "user", "content": f"Name: {name}\nRole: {role}\nOrganization: {org}\n\nGenerate search queries."},
    ]
    queries = chat_json(messages, max_tokens=1_024, temperature=0.4).get("queries", [])
    console.print(f"  [green]Generated {len(queries)} queries[/]")
    for i, q in enumerate(queries, 1):
        console.print(f"    {i}. {q}")
    return {"search_queries": queries}


def route_to_search(state: PersonResearchState) -> list[Send]:
    queries = state.get("search_queries", [])
    if not queries:
        return [Send("fetch_github", state)]
    return [Send("search_web", {**state, "_query": q, "_query_idx": i}) for i, q in enumerate(queries)]


def search_web_node(state: dict) -> dict:
    query, idx = state.get("_query", ""), state.get("_query_idx", 0)
    console.print(f"  [dim]Search [{idx + 1}]: {query}[/]")
    results: list[WebResult] = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=12):
                results.append({"title": r.get("title", ""), "url": r.get("href", ""), "snippet": r.get("body", "")})
    except Exception as e:
        console.print(f"  [yellow]Search failed: {e}[/]")
    console.print(f"  [green]Found {len(results)} results for query {idx + 1}[/]")
    return {"web_results": results}


_SKIP_DOMAINS = {
    "twitter.com", "x.com", "linkedin.com", "youtube.com", "youtu.be",
    "reddit.com", "facebook.com", "instagram.com", "tiktok.com", "pinterest.com", "amazon.com",
    "cnn.com", "bbc.com", "bbc.co.uk", "foxnews.com", "nytimes.com", "washingtonpost.com",
    "reuters.com", "apnews.com", "wikipedia.org", "wikimedia.org", "imdb.com", "goodreads.com",
}
_MAX_URLS = 12
_MAX_CONTENT_CHARS = 5_000


def _strip_html(html: str) -> str:
    text = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def check_urls_node(state: PersonResearchState) -> dict:
    web_results = state.get("web_results", [])
    seen: set[str] = set()
    urls: list[str] = []
    for r in web_results:
        url = r.get("url", "")
        if not url or url in seen:
            continue
        seen.add(url)
        domain = urlparse(url).netloc.lower()
        if any(skip in domain for skip in _SKIP_DOMAINS):
            continue
        urls.append(url)
        if len(urls) >= _MAX_URLS:
            break

    console.print(f"\n  [cyan]Checking {len(urls)} URLs...[/]")
    url_content: dict[str, UrlContent] = {}
    with httpx.Client(timeout=10, follow_redirects=True) as client:
        for url in urls:
            try:
                resp = client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"})
                if resp.status_code == 200:
                    text = _strip_html(resp.text)[:_MAX_CONTENT_CHARS]
                    url_content[url] = {"content": text, "status_code": 200}
                    console.print(f"    [green]OK[/] {url[:80]}  ({len(text)} chars)")
                else:
                    console.print(f"    [yellow]{resp.status_code}[/] {url[:80]}")
            except Exception as e:
                console.print(f"    [red]ERR[/] {url[:80]}  ({e.__class__.__name__})")
    console.print(f"  [green]Fetched {len(url_content)}/{len(urls)} URLs[/]")
    return {"url_content": url_content}


def fetch_github_node(state: PersonResearchState) -> dict:
    username = state.get("person_github", "")
    if not username:
        console.print("  [yellow]No GitHub username — skipping.[/]")
        return {"github_profile": {}, "github_repos": []}

    console.print(f"  [cyan]Fetching GitHub: {username}[/]")
    profile: GitHubProfile = {}
    repos: list[GitHubRepo] = []
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            resp = client.get(f"https://api.github.com/users/{username}", headers={"Accept": "application/vnd.github.v3+json"})
            if resp.status_code == 200:
                d = resp.json()
                profile = {k: d.get(k, "") for k in ("login", "name", "bio", "company", "location", "blog", "twitter_username")}
                profile["public_repos"] = d.get("public_repos", 0)
                profile["followers"] = d.get("followers", 0)
                profile["avatar_url"] = d.get("avatar_url", "")
                console.print(f"  [green]GitHub: {profile.get('name', username)}[/]")

            resp = client.get(f"https://api.github.com/users/{username}/repos",
                              params={"sort": "stars", "direction": "desc", "per_page": 10},
                              headers={"Accept": "application/vnd.github.v3+json"})
            if resp.status_code == 200:
                for r in resp.json():
                    if r.get("fork"):
                        continue
                    repos.append({"name": r.get("name", ""), "description": r.get("description", "") or "",
                                  "url": r.get("html_url", ""), "stars": r.get("stargazers_count", 0),
                                  "language": r.get("language", "") or ""})
                console.print(f"  [green]{len(repos)} repos[/]")
    except httpx.HTTPError as e:
        console.print(f"  [yellow]GitHub error: {e}[/]")
    return {"github_profile": profile, "github_repos": repos}


_ORCID_API = "https://pub.orcid.org/v3.0"


def _parse_orcid_works(data: dict) -> list[OrcidWork]:
    items: list[OrcidWork] = []
    for group in data.get("group", []):
        summaries = group.get("work-summary", [])
        if not summaries:
            continue
        s = summaries[0]
        title_obj = s.get("title", {})
        title = (title_obj.get("title") or {}).get("value", "") if title_obj else ""
        year = ((s.get("publication-date") or {}).get("year") or {}).get("value", "")
        doi, url = "", ""
        for eid in (s.get("external-ids") or {}).get("external-id", []):
            if eid.get("external-id-type") == "doi":
                doi = eid.get("external-id-value", "")
                url = url or f"https://doi.org/{doi}"
            elif eid.get("external-id-type") == "arxiv":
                url = url or f"https://arxiv.org/abs/{eid.get('external-id-value', '')}"
        if not url and (s.get("url") or {}).get("value"):
            url = s["url"]["value"]
        if title:
            items.append(OrcidWork(title=title, year=year, doi=doi, url=url))
    return items


def fetch_orcid_node(state: PersonResearchState) -> dict:
    orcid_id = state.get("person_orcid", "")
    if not orcid_id:
        console.print("  [yellow]No ORCID iD — skipping.[/]")
        return {"orcid_data": {}}

    console.print(f"  [cyan]Fetching ORCID: {orcid_id}[/]")
    data: OrcidData = {"orcid_id": orcid_id}
    headers = {"Accept": "application/json"}
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            resp = client.get(f"{_ORCID_API}/{orcid_id}/person", headers=headers)
            if resp.status_code == 200:
                person = resp.json()
                name_obj = person.get("name") or {}
                given = (name_obj.get("given-names") or {}).get("value", "")
                family = (name_obj.get("family-name") or {}).get("value", "")
                if given or family:
                    data["name"] = f"{given} {family}".strip()
                other = person.get("other-names", {}).get("other-name", [])
                if other:
                    data["other_names"] = [o.get("content", "") for o in other if o.get("content")]
                bio = (person.get("biography") or {}).get("content", "")
                if bio:
                    data["biography"] = bio
                kws = person.get("keywords", {}).get("keyword", [])
                if kws:
                    data["keywords"] = [k.get("content", "") for k in kws if k.get("content")]
                urls = person.get("researcher-urls", {}).get("researcher-url", [])
                if urls:
                    data["urls"] = [{"name": u.get("url-name", ""), "url": (u.get("url") or {}).get("value", "")}
                                    for u in urls if (u.get("url") or {}).get("value")]
                console.print(f"  [green]ORCID: {data.get('name', orcid_id)}[/]")

            resp = client.get(f"{_ORCID_API}/{orcid_id}/works", headers=headers)
            if resp.status_code == 200:
                works = _parse_orcid_works(resp.json())
                data["works"] = works
                console.print(f"  [green]{len(works)} ORCID works[/]")
                if works:
                    table = Table(title="ORCID Works")
                    table.add_column("Year", style="yellow", width=6)
                    table.add_column("Title", style="cyan", width=60)
                    table.add_column("DOI", width=30)
                    for w in works:
                        table.add_row(w["year"], w["title"][:58], w["doi"][:28] or "—")
                    console.print(table)
    except httpx.HTTPError as e:
        console.print(f"  [yellow]ORCID error: {e}[/]")
    return {"orcid_data": data}


# ── Formatters ────────────────────────────────────────────────────────────

def _fmt_web(results: list[WebResult], url_content: dict[str, UrlContent] | None = None) -> str:
    seen: set[str] = set()
    lines: list[str] = []
    for r in results:
        url = r.get("url", "")
        if url in seen:
            continue
        seen.add(url)
        lines.append(f"- [{r.get('title', 'Untitled')}]({url})")
        if r.get("snippet"):
            lines.append(f"  {r['snippet'][:300]}")
        if url_content and url in url_content:
            page = url_content[url].get("content", "")
            if page:
                lines.append(f"  [Page content]: {page[:3000]}")
        lines.append("")
    return "\n".join(lines) if lines else "(no web results)"


def _fmt_github(profile: GitHubProfile, repos: list[GitHubRepo]) -> str:
    if not profile:
        return "(no GitHub data)"
    lines = [f"{k}: {profile.get(k, '')}" for k in ("login", "name", "bio", "company", "location", "blog", "twitter_username")]
    lines += [f"Public repos: {profile.get('public_repos', 0)}", f"Followers: {profile.get('followers', 0)}", "", "Top repos:"]
    for r in repos:
        lines.append(f"- {r['name']} ({r['stars']} stars, {r['language']}): {r['description']}")
    return "\n".join(lines)


def _fmt_orcid(orcid: OrcidData) -> str:
    if not orcid or not orcid.get("orcid_id"):
        return "(no ORCID data)"
    lines = [f"ORCID iD: {orcid['orcid_id']}", f"Name: {orcid.get('name', '')}"]
    if orcid.get("other_names"):
        lines.append(f"Also known as: {', '.join(orcid['other_names'])}")
    if orcid.get("biography"):
        lines.append(f"Biography: {orcid['biography']}")
    if orcid.get("keywords"):
        lines.append(f"Keywords: {', '.join(orcid['keywords'])}")
    if orcid.get("urls"):
        lines.append("URLs:")
        for u in orcid["urls"]:
            lines.append(f"  - {u.get('name', '')}: {u.get('url', '')}")
    if orcid.get("works"):
        lines.append(f"\nPublications ({len(orcid['works'])}):")
        for w in orcid["works"]:
            doi = f" (DOI: {w['doi']})" if w.get("doi") else ""
            url = f" — {w['url']}" if w.get("url") else ""
            lines.append(f"  - [{w.get('year', '?')}] {w['title']}{doi}{url}")
    return "\n".join(lines)


# ── Synthesize ────────────────────────────────────────────────────────────

def synthesize_node(state: PersonResearchState) -> dict:
    name, role, org = state["person_name"], state.get("person_role", ""), state.get("person_org", "")
    web_results = state.get("web_results", [])
    url_content = state.get("url_content", {})
    github_profile = state.get("github_profile", {})
    github_repos = state.get("github_repos", [])
    orcid_data = state.get("orcid_data", {})

    console.print(f"\n  [cyan]Synthesizing profile for {name}...[/]")
    console.print(f"    Web results: {len(web_results)}  |  URLs: {len(url_content)}  |  Repos: {len(github_repos)}")
    if orcid_data and orcid_data.get("orcid_id"):
        console.print(f"    ORCID works: {len(orcid_data.get('works', []))}")

    messages = [
        {"role": "system", "content": SYNTHESIZE_SYSTEM},
        {"role": "user", "content": (
            f"# Person\nName: {name}\nRole: {role}\nOrganization: {org}\n\n"
            f"# Web Search Results\n{_fmt_web(web_results, url_content)}\n\n"
            f"# GitHub Data\n{_fmt_github(github_profile, github_repos)}\n\n"
            f"# ORCID Academic Record\n{_fmt_orcid(orcid_data)}\n\n"
            f"Synthesize a comprehensive research profile."
        )},
    ]
    raw = chat_json(messages, max_tokens=8_192, temperature=0.2)

    social = raw.get("social", {})
    if github_profile.get("login") and "github" not in social:
        social["github"] = f"https://github.com/{github_profile['login']}"
    if github_profile.get("twitter_username") and "twitter" not in social:
        social["twitter"] = f"https://x.com/{github_profile['twitter_username']}"
    if github_profile.get("blog") and "website" not in social:
        social["website"] = github_profile["blog"]
    if orcid_data and orcid_data.get("orcid_id"):
        for u in orcid_data.get("urls", []):
            url_val, url_name = u.get("url", ""), u.get("name", "").lower()
            if "github" in url_name and "github" not in social:
                social["github"] = url_val
            elif "linkedin" in url_name and "linkedin" not in social:
                social["linkedin"] = url_val
            elif ("blog" in url_name or "website" in url_name) and "website" not in social:
                social["website"] = url_val

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    research: PersonResearch = {
        "slug": state["person_slug"], "name": name, "generated_at": now,
        "bio": raw.get("bio", ""), "topics": raw.get("topics", []),
        "timeline": [TimelineEvent(date=e.get("date", ""), event=e.get("event", ""), url=e.get("url", "")) for e in raw.get("timeline", [])],
        "key_contributions": [Contribution(title=c.get("title", ""), description=c.get("description", ""), url=c.get("url", "")) for c in raw.get("key_contributions", [])],
        "quotes": [Quote(text=q.get("text", ""), source=q.get("source", ""), url=q.get("url", "")) for q in raw.get("quotes", [])],
        "social": social, "sources": raw.get("sources", []),
    }

    console.print(f"  [green]Bio: {research['bio'][:100]}...[/]")
    console.print(f"  [green]Topics: {', '.join(research['topics'][:5])}  |  Timeline: {len(research['timeline'])}  |  Contributions: {len(research['key_contributions'])}[/]")
    return {"research": research}


# ── Evaluate ──────────────────────────────────────────────────────────────

def evaluate_node(state: PersonResearchState) -> dict:
    research = state.get("research")
    if not research:
        return {"eval_result": {}}
    console.print(f"\n  [cyan]Evaluating quality for {state['person_name']}...[/]")
    messages = [
        {"role": "system", "content": EVALUATE_SYSTEM},
        {"role": "user", "content": f"Evaluate:\n\n{json.dumps(dict(research), indent=2, ensure_ascii=False)}"},
    ]
    raw = chat_json(messages, max_tokens=2_048, temperature=0.1)
    _s = lambda k: raw.get(k, {"score": 0, "reasoning": ""})
    eval_result: EvalResult = {
        "bio_quality": _s("bio_quality"), "source_coverage": _s("source_coverage"),
        "timeline_completeness": _s("timeline_completeness"), "contributions_depth": _s("contributions_depth"),
        "name_disambiguation": _s("name_disambiguation"),
        "overall_score": raw.get("overall_score", 0), "summary": raw.get("summary", ""),
    }
    table = Table(title="Eval Scores")
    table.add_column("Dimension", style="cyan", width=28)
    table.add_column("Score", style="yellow", width=8)
    table.add_column("Reasoning", width=60)
    for dim in ("bio_quality", "source_coverage", "timeline_completeness", "contributions_depth", "name_disambiguation"):
        s = eval_result[dim]  # type: ignore[literal-required]
        table.add_row(dim.replace("_", " ").title(), f"{s['score']}/10", s["reasoning"][:58])
    console.print(table)
    console.print(f"  [bold green]Overall: {eval_result['overall_score']}/10[/] — {eval_result['summary'][:120]}")
    return {"eval_result": eval_result}


# ── Export ────────────────────────────────────────────────────────────────

def export_node(state: PersonResearchState) -> dict:
    research = state.get("research")
    if not research:
        return {"export_path": ""}
    slug = state["person_slug"]
    RESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RESEARCH_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(research, indent=2, ensure_ascii=False) + "\n")
    console.print(f"\n  [green]Exported → {out_path}[/]")

    eval_result = state.get("eval_result")
    if eval_result:
        eval_path = RESEARCH_DIR / f"{slug}.eval.json"
        eval_path.write_text(json.dumps({"slug": slug, "name": research.get("name", ""),
                                          "generated_at": research.get("generated_at", ""), "eval": eval_result},
                                         indent=2, ensure_ascii=False) + "\n")
        console.print(f"  [green]Exported → {eval_path}[/]")
    return {"export_path": str(out_path)}


# ═══════════════════════════════════════════════════════════════════════════
# Graph
# ═══════════════════════════════════════════════════════════════════════════

def build_graph():
    builder = StateGraph(PersonResearchState)
    builder.add_node("generate_queries", generate_queries_node)
    builder.add_node("search_web", search_web_node)
    builder.add_node("check_urls", check_urls_node)
    builder.add_node("fetch_github", fetch_github_node)
    builder.add_node("fetch_orcid", fetch_orcid_node)
    builder.add_node("synthesize", synthesize_node)
    builder.add_node("evaluate", evaluate_node)
    builder.add_node("export", export_node)

    builder.add_edge(START, "generate_queries")
    builder.add_edge(START, "fetch_orcid")
    builder.add_conditional_edges("generate_queries", route_to_search, ["search_web", "fetch_github"])
    builder.add_edge("search_web", "check_urls")
    builder.add_edge("check_urls", "fetch_github")
    builder.add_edge("fetch_github", "synthesize")
    builder.add_edge("fetch_orcid", "synthesize")
    builder.add_edge("synthesize", "evaluate")
    builder.add_edge("evaluate", "export")
    builder.add_edge("export", END)

    return builder.compile()


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

def run_person(graph, person: dict[str, str]):
    slug = person["slug"]
    name = person.get("name", slug)
    console.rule(f"[bold]{name}[/]")
    console.print(f"  Slug: {slug}  |  Role: {person.get('role', '')}  |  Org: {person.get('org', '')}")
    console.print(f"  GitHub: {person.get('github', '—')}  |  ORCID: {person.get('orcid', '—')}")

    result = graph.invoke({
        "person_name": name,
        "person_slug": slug,
        "person_role": person.get("role", ""),
        "person_org": person.get("org", ""),
        "person_github": person.get("github", ""),
        "person_orcid": person.get("orcid", ""),
    })
    console.print(f"\n  [bold green]Done → {result.get('export_path', '')}[/]\n")


def main():
    people = load_personalities()
    if not people:
        console.print("[red]No personality files found in personalities/[/]")
        sys.exit(1)

    chosen = pick_person(people)
    graph = build_graph()

    if chosen:
        run_person(graph, chosen)
    else:
        for p in people:
            run_person(graph, p)


if __name__ == "__main__":
    main()

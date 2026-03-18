"""Nodes for the person research pipeline.

Flow:
    generate_queries → [search_web ×N] → check_urls → fetch_github → synthesize → export
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx
from ddgs import DDGS
from langgraph.types import Send
from rich.console import Console
from rich.table import Table

from .deepseek import chat_json
from .prompts import build_generate_queries_messages, build_synthesize_messages
from .state import (
    Contribution,
    GitHubProfile,
    GitHubRepo,
    PersonResearch,
    PersonResearchState,
    Quote,
    TimelineEvent,
    UrlContent,
    WebResult,
)

console = Console()

RESEARCH_DIR = Path(__file__).resolve().parents[4] / "src" / "lib" / "research"

_HTTP_TIMEOUT = 15.0


# ---------------------------------------------------------------------------
# Node 1: generate_queries
# ---------------------------------------------------------------------------

def generate_queries_node(state: PersonResearchState) -> dict:
    """Use DeepSeek to generate targeted search queries about the person."""
    name = state["person_name"]
    role = state.get("person_role", "")
    org = state.get("person_org", "")

    console.print(f"\n  [cyan]Generating search queries for {name}...[/]")

    messages = build_generate_queries_messages(name, role, org)
    result = chat_json(messages, max_tokens=1_024, temperature=0.4)
    queries = result.get("queries", [])

    console.print(f"  [green]Generated {len(queries)} queries:[/]")
    for i, q in enumerate(queries, 1):
        console.print(f"    {i}. {q}")

    return {"search_queries": queries}


# ---------------------------------------------------------------------------
# Router: fan out to search_web per query
# ---------------------------------------------------------------------------

def route_to_search(state: PersonResearchState) -> list[Send]:
    """Fan out one search_web node per query."""
    queries = state.get("search_queries", [])
    if not queries:
        return [Send("fetch_github", state)]
    return [
        Send("search_web", {**state, "_query": q, "_query_idx": i})
        for i, q in enumerate(queries)
    ]


# ---------------------------------------------------------------------------
# Node 2: search_web (runs N times in parallel via Send)
# ---------------------------------------------------------------------------

def search_web_node(state: dict) -> dict:
    """Search DuckDuckGo for a single query and return results."""
    query = state.get("_query", "")
    idx = state.get("_query_idx", 0)

    console.print(f"  [dim]Search [{idx + 1}]: {query}[/]")

    results: list[WebResult] = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=12):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                })
    except Exception as e:
        console.print(f"  [yellow]Search failed for query {idx + 1}: {e}[/]")

    console.print(f"  [green]Found {len(results)} results for query {idx + 1}[/]")
    return {"web_results": results}


# ---------------------------------------------------------------------------
# Node 3: check_urls
# ---------------------------------------------------------------------------

_SKIP_DOMAINS = {
    "twitter.com", "x.com", "linkedin.com", "youtube.com", "youtu.be",
    "reddit.com", "facebook.com", "instagram.com", "tiktok.com",
    "pinterest.com", "amazon.com",
    # Generic news sites — never contain person-specific content
    "cnn.com", "bbc.com", "bbc.co.uk", "cbsnews.com", "nbcnews.com",
    "foxnews.com", "theguardian.com", "nytimes.com", "washingtonpost.com",
    "reuters.com", "apnews.com", "indiatimes.com", "timesofindia.indiatimes.com",
    # Generic aggregators / noise
    "wikipedia.org", "wikimedia.org", "imdb.com", "goodreads.com",
}

_MAX_URLS = 12
_MAX_CONTENT_CHARS = 5_000


def _extract_domain(url: str) -> str:
    """Return the bare domain from a URL (e.g. 'en.wikipedia.org')."""
    try:
        return urlparse(url).netloc.lower()
    except Exception:
        return ""


def _strip_html(html: str) -> str:
    """Remove scripts, styles, and tags; collapse whitespace."""
    text = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _select_urls_to_fetch(results: list[WebResult]) -> list[str]:
    """Pick up to _MAX_URLS unique, high-value URLs from search results."""
    seen: set[str] = set()
    urls: list[str] = []
    for r in results:
        url = r.get("url", "")
        if not url or url in seen:
            continue
        seen.add(url)
        domain = _extract_domain(url)
        if any(skip in domain for skip in _SKIP_DOMAINS):
            continue
        urls.append(url)
        if len(urls) >= _MAX_URLS:
            break
    return urls


def check_urls_node(state: PersonResearchState) -> dict:
    """Fetch page content from the most relevant search-result URLs."""
    web_results = state.get("web_results", [])
    urls = _select_urls_to_fetch(web_results)

    console.print(f"\n  [cyan]Checking {len(urls)} URLs...[/]")

    url_content: dict[str, UrlContent] = {}

    with httpx.Client(timeout=10, follow_redirects=True) as client:
        for url in urls:
            try:
                resp = client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)",
                })
                if resp.status_code == 200:
                    text = _strip_html(resp.text)[:_MAX_CONTENT_CHARS]
                    url_content[url] = {"content": text, "status_code": 200}
                    console.print(f"    [green]OK[/] {url[:80]}  ({len(text)} chars)")
                else:
                    console.print(f"    [yellow]{resp.status_code}[/] {url[:80]}")
            except Exception as e:
                console.print(f"    [red]ERR[/] {url[:80]}  ({e.__class__.__name__})")

    console.print(f"  [green]Fetched content from {len(url_content)}/{len(urls)} URLs[/]")
    return {"url_content": url_content}


# ---------------------------------------------------------------------------
# Node 4: fetch_github
# ---------------------------------------------------------------------------

def fetch_github_node(state: PersonResearchState) -> dict:
    """Fetch GitHub profile and top repositories."""
    username = state.get("person_github", "")
    if not username:
        console.print("  [yellow]No GitHub username — skipping GitHub fetch.[/]")
        return {"github_profile": {}, "github_repos": []}

    console.print(f"  [cyan]Fetching GitHub profile: {username}[/]")

    profile: GitHubProfile = {}
    repos: list[GitHubRepo] = []

    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            # Profile
            resp = client.get(
                f"https://api.github.com/users/{username}",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                profile = {
                    "login": data.get("login", ""),
                    "name": data.get("name", ""),
                    "bio": data.get("bio", ""),
                    "company": data.get("company", ""),
                    "location": data.get("location", ""),
                    "blog": data.get("blog", ""),
                    "twitter_username": data.get("twitter_username", ""),
                    "public_repos": data.get("public_repos", 0),
                    "followers": data.get("followers", 0),
                    "avatar_url": data.get("avatar_url", ""),
                }
                console.print(f"  [green]GitHub profile: {profile.get('name', username)}[/]")
                if profile.get("bio"):
                    console.print(f"    Bio: {profile['bio']}")

            # Top repos by stars
            resp = client.get(
                f"https://api.github.com/users/{username}/repos",
                params={"sort": "stars", "direction": "desc", "per_page": 10},
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if resp.status_code == 200:
                for r in resp.json():
                    if r.get("fork"):
                        continue
                    repos.append({
                        "name": r.get("name", ""),
                        "description": r.get("description", "") or "",
                        "url": r.get("html_url", ""),
                        "stars": r.get("stargazers_count", 0),
                        "language": r.get("language", "") or "",
                    })

                console.print(f"  [green]Fetched {len(repos)} repos (top by stars)[/]")
                if repos:
                    table = Table(title="Top Repositories")
                    table.add_column("Repo", style="cyan", width=30)
                    table.add_column("Stars", style="yellow", width=8)
                    table.add_column("Lang", width=12)
                    table.add_column("Description", width=50)
                    for r in repos[:5]:
                        table.add_row(
                            r["name"],
                            str(r["stars"]),
                            r["language"],
                            (r["description"][:48] + "..") if len(r["description"]) > 50 else r["description"],
                        )
                    console.print(table)

    except httpx.HTTPError as e:
        console.print(f"  [yellow]GitHub fetch error: {e}[/]")

    return {"github_profile": profile, "github_repos": repos}


# ---------------------------------------------------------------------------
# Node 4: synthesize
# ---------------------------------------------------------------------------

def _format_web_results(
    results: list[WebResult],
    url_content: dict[str, UrlContent] | None = None,
) -> str:
    """Format web results for LLM consumption, deduplicating by URL."""
    seen_urls: set[str] = set()
    lines: list[str] = []
    for r in results:
        url = r.get("url", "")
        if url in seen_urls:
            continue
        seen_urls.add(url)
        lines.append(f"- [{r.get('title', 'Untitled')}]({url})")
        snippet = r.get("snippet", "")
        if snippet:
            lines.append(f"  {snippet[:300]}")
        if url_content and url in url_content:
            page_text = url_content[url].get("content", "")
            if page_text:
                lines.append(f"  [Page content]: {page_text[:3000]}")
        lines.append("")
    return "\n".join(lines) if lines else "(no web results)"


def _format_github_data(profile: GitHubProfile, repos: list[GitHubRepo]) -> str:
    """Format GitHub data for LLM consumption."""
    if not profile:
        return "(no GitHub data)"

    lines = [
        f"Username: {profile.get('login', '')}",
        f"Name: {profile.get('name', '')}",
        f"Bio: {profile.get('bio', '')}",
        f"Company: {profile.get('company', '')}",
        f"Location: {profile.get('location', '')}",
        f"Blog: {profile.get('blog', '')}",
        f"Twitter: {profile.get('twitter_username', '')}",
        f"Public repos: {profile.get('public_repos', 0)}",
        f"Followers: {profile.get('followers', 0)}",
        "",
        "Top repositories:",
    ]
    for r in repos:
        lines.append(f"- {r['name']} ({r['stars']} stars, {r['language']}): {r['description']}")

    return "\n".join(lines)


def synthesize_node(state: PersonResearchState) -> dict:
    """Use DeepSeek to synthesize all gathered data into a structured profile."""
    name = state["person_name"]
    role = state.get("person_role", "")
    org = state.get("person_org", "")

    web_results = state.get("web_results", [])
    url_content = state.get("url_content", {})
    github_profile = state.get("github_profile", {})
    github_repos = state.get("github_repos", [])

    console.print(f"\n  [cyan]Synthesizing research profile for {name}...[/]")
    console.print(f"    Web results: {len(web_results)}")
    console.print(f"    Enriched URLs: {len(url_content)}")
    console.print(f"    GitHub repos: {len(github_repos)}")

    web_text = _format_web_results(web_results, url_content)
    github_text = _format_github_data(github_profile, github_repos)

    messages = build_synthesize_messages(name, role, org, web_text, github_text)
    raw = chat_json(messages, max_tokens=8_192, temperature=0.2)

    # Build social links from GitHub data + synthesis
    social = raw.get("social", {})
    if github_profile.get("login") and "github" not in social:
        social["github"] = f"https://github.com/{github_profile['login']}"
    if github_profile.get("twitter_username") and "twitter" not in social:
        social["twitter"] = f"https://x.com/{github_profile['twitter_username']}"
    if github_profile.get("blog") and "website" not in social:
        social["website"] = github_profile["blog"]

    slug = state["person_slug"]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    research: PersonResearch = {
        "slug": slug,
        "name": name,
        "generated_at": now,
        "bio": raw.get("bio", ""),
        "topics": raw.get("topics", []),
        "timeline": [
            TimelineEvent(
                date=e.get("date", ""),
                event=e.get("event", ""),
                url=e.get("url", ""),
            )
            for e in raw.get("timeline", [])
        ],
        "key_contributions": [
            Contribution(
                title=c.get("title", ""),
                description=c.get("description", ""),
                url=c.get("url", ""),
            )
            for c in raw.get("key_contributions", [])
        ],
        "quotes": [
            Quote(
                text=q.get("text", ""),
                source=q.get("source", ""),
                url=q.get("url", ""),
            )
            for q in raw.get("quotes", [])
        ],
        "social": social,
        "sources": raw.get("sources", []),
    }

    console.print(f"  [green]Synthesized profile:[/]")
    console.print(f"    Bio: {research['bio'][:100]}...")
    console.print(f"    Topics: {', '.join(research['topics'][:5])}")
    console.print(f"    Timeline events: {len(research['timeline'])}")
    console.print(f"    Contributions: {len(research['key_contributions'])}")
    console.print(f"    Quotes: {len(research['quotes'])}")
    console.print(f"    Sources: {len(research['sources'])}")

    return {"research": research}


# ---------------------------------------------------------------------------
# Node 5: export
# ---------------------------------------------------------------------------

def export_node(state: PersonResearchState) -> dict:
    """Write the research profile to a JSON file."""
    research = state.get("research")
    if not research:
        console.print("  [yellow]No research to export.[/]")
        return {"export_path": ""}

    slug = state["person_slug"]
    RESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RESEARCH_DIR / f"{slug}.json"

    out_path.write_text(json.dumps(research, indent=2, ensure_ascii=False) + "\n")
    console.print(f"\n  [green]Exported research to {out_path}[/]")

    return {"export_path": str(out_path)}

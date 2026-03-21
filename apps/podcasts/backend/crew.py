#!/usr/bin/env python3
"""Person research pipeline — LangGraph/LangChain implementation with 20 expert agents.

Spawns 20 specialized expert agents organized in 3 phases that collaboratively
research an AI/tech personality and produce a structured JSON profile compatible
with the existing PersonResearch schema.

Usage:
    python3 crew.py
    python3 crew.py --slug harrison-chase
    python3 crew.py --slug harrison-chase --name "Harrison Chase" --role "CEO" --org "LangChain"

Phase 1 — Intelligence Gathering (parallel):
    1.  Web Research Specialist       — multi-query DuckDuckGo search
    2.  GitHub & Open Source Analyst  — profile + top repos
    3.  Academic Publications Analyst — ORCID record
    4.  arXiv & Semantic Scholar Analyst — papers, citations, h-index
    5.  Podcast & Media Analyst       — podcast appearances, media coverage
    6.  News & Press Analyst          — recent news, press releases
    7.  HuggingFace & Model Registry Analyst — models, datasets, spaces

Phase 2 — Deep Analysis (depends on Phase 1):
    8.  Biography Writer              — synthesizes career narrative
    9.  Timeline Architect            — chronological event mapping
   10.  Technical Contributions Analyst — impactful projects/papers
   11.  Quote & Interview Specialist  — verbatim quotes with sources
   12.  Social & Digital Presence Mapper — all public profiles/URLs
   13.  Expertise Domain Analyst      — specific topic extraction
   14.  Competitive Landscape Analyst — position in industry ecosystem
   15.  Collaboration Network Analyst — co-authors, co-founders, mentors
   16.  Funding & Business Analyst    — funding rounds, valuations, business milestones
   17.  Conference & Speaking Analyst  — keynotes, talks, panels
   18.  Technical Philosophy Analyst  — core beliefs, stances, predictions

Phase 3 — Synthesis & Evaluation:
   19.  Research Quality Evaluator    — 5-dimension scoring
   20.  Executive Summary Synthesizer — final comprehensive profile assembly
"""

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypedDict
from urllib.parse import urlparse

import httpx
from langgraph.graph import END, START, StateGraph
from rich.console import Console
from rich.table import Table

# ── deepseek_client from shared pypackages ────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent / "pypackages" / "deepseek" / "src"))
from deepseek_client import (  # noqa: E402
    DeepSeekClient,
    DeepSeekConfig,
    ChatMessage,
    FunctionTool,
)
from deepseek_client.types import FunctionToolDef  # noqa: E402

console = Console()

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
PERSONALITIES_DIR = PROJECT_ROOT / "personalities"
RESEARCH_DIR = PROJECT_ROOT / "src" / "lib" / "research"

_HTTP_TIMEOUT = 15.0
_MAX_REACT_ITERS = 12


# ═══════════════════════════════════════════════════════════════════════════
# LLM — DeepSeek via shared client
# ═══════════════════════════════════════════════════════════════════════════

def _make_client() -> DeepSeekClient:
    return DeepSeekClient(DeepSeekConfig(
        default_temperature=0.2,
        default_max_tokens=8192,
        timeout=120.0,
    ))


# ═══════════════════════════════════════════════════════════════════════════
# Tools
# ═══════════════════════════════════════════════════════════════════════════

_SKIP_DOMAINS = {
    "twitter.com", "x.com", "linkedin.com", "youtube.com", "youtu.be",
    "reddit.com", "facebook.com", "instagram.com", "tiktok.com",
    "pinterest.com", "amazon.com", "wikipedia.org", "wikimedia.org",
    "cnn.com", "bbc.com", "bbc.co.uk", "foxnews.com", "nytimes.com",
    "washingtonpost.com", "reuters.com", "apnews.com", "goodreads.com",
}


def web_search(query: str) -> str:
    """Search DuckDuckGo for a query and return titles, URLs, and snippets."""
    from ddgs import DDGS

    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=10):
                results.append(
                    f"- [{r.get('title', 'Untitled')}]({r.get('href', '')})\n"
                    f"  {r.get('body', '')[:300]}"
                )
    except Exception as e:
        return f"Search failed: {e}"
    return "\n".join(results) if results else "(no results)"


def web_news_search(query: str) -> str:
    """Search DuckDuckGo News for recent news articles about a query."""
    from ddgs import DDGS

    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.news(query, max_results=10):
                results.append(
                    f"- [{r.get('title', 'Untitled')}]({r.get('url', '')})\n"
                    f"  {r.get('date', '')} | {r.get('source', '')}\n"
                    f"  {r.get('body', '')[:300]}"
                )
    except Exception as e:
        return f"News search failed: {e}"
    return "\n".join(results) if results else "(no news results)"


def fetch_url_content(url: str) -> str:
    """Fetch and return plain-text content from a URL (strips HTML)."""
    try:
        domain = urlparse(url).netloc.lower()
        if any(skip in domain for skip in _SKIP_DOMAINS):
            return f"(Skipped — blocked domain: {domain})"
        with httpx.Client(timeout=10, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"})
            if resp.status_code != 200:
                return f"(HTTP {resp.status_code})"
            text = re.sub(r"<script[^>]*>.*?</script>", " ", resp.text, flags=re.S | re.I)
            text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.S | re.I)
            text = re.sub(r"<[^>]+>", " ", text)
            return re.sub(r"\s+", " ", text).strip()[:5000]
    except Exception as e:
        return f"Fetch failed: {e}"


def fetch_github_profile(username: str) -> str:
    """Fetch GitHub profile metadata and top repositories for a username."""
    if not username or username.strip() in ("", "unknown"):
        return "(no username provided)"
    lines = []
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            resp = client.get(
                f"https://api.github.com/users/{username}",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if resp.status_code == 200:
                d = resp.json()
                for key in ("login", "name", "bio", "company", "location", "blog", "twitter_username"):
                    lines.append(f"{key}: {d.get(key, '')}")
                lines += [
                    f"public_repos: {d.get('public_repos', 0)}",
                    f"followers: {d.get('followers', 0)}",
                    "",
                ]
            resp = client.get(
                f"https://api.github.com/users/{username}/repos",
                params={"sort": "stars", "direction": "desc", "per_page": 10},
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if resp.status_code == 200:
                lines.append("Top repositories:")
                for r in resp.json():
                    if r.get("fork"):
                        continue
                    lines.append(
                        f"  - {r['name']} ({r.get('stargazers_count', 0)} stars, "
                        f"{r.get('language', '')}): {r.get('description', '') or ''}"
                    )
    except Exception as e:
        lines.append(f"GitHub error: {e}")
    return "\n".join(lines) if lines else "(no GitHub data)"


def fetch_orcid_profile(orcid_id: str) -> str:
    """Fetch ORCID academic profile and publications for a given ORCID iD."""
    if not orcid_id or orcid_id.strip() in ("", "none"):
        return "(no ORCID iD provided)"
    lines = []
    headers = {"Accept": "application/json"}
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            resp = client.get(f"https://pub.orcid.org/v3.0/{orcid_id}/person", headers=headers)
            if resp.status_code == 200:
                person = resp.json()
                name_obj = person.get("name") or {}
                given = (name_obj.get("given-names") or {}).get("value", "")
                family = (name_obj.get("family-name") or {}).get("value", "")
                lines.append(f"Name: {given} {family}".strip())
                bio = (person.get("biography") or {}).get("content", "")
                if bio:
                    lines.append(f"Biography: {bio}")
                kws = person.get("keywords", {}).get("keyword", [])
                if kws:
                    lines.append(f"Keywords: {', '.join(k.get('content', '') for k in kws)}")

            resp = client.get(f"https://pub.orcid.org/v3.0/{orcid_id}/works", headers=headers)
            if resp.status_code == 200:
                lines.append("\nPublications:")
                for group in resp.json().get("group", [])[:20]:
                    summaries = group.get("work-summary", [])
                    if not summaries:
                        continue
                    s = summaries[0]
                    title_obj = s.get("title", {})
                    title = (title_obj.get("title") or {}).get("value", "") if title_obj else ""
                    year = ((s.get("publication-date") or {}).get("year") or {}).get("value", "")
                    doi = ""
                    for eid in (s.get("external-ids") or {}).get("external-id", []):
                        if eid.get("external-id-type") == "doi":
                            doi = eid.get("external-id-value", "")
                    if title:
                        lines.append(f"  - [{year}] {title}" + (f" (DOI: {doi})" if doi else ""))
    except Exception as e:
        lines.append(f"ORCID error: {e}")
    return "\n".join(lines) if lines else "(no ORCID data)"


def search_arxiv(query: str) -> str:
    """Search arXiv for papers matching a query. Returns titles, authors, dates, and abstracts."""
    lines = []
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            resp = client.get(
                "http://export.arxiv.org/api/query",
                params={
                    "search_query": f"all:{query}",
                    "start": 0,
                    "max_results": 10,
                    "sortBy": "relevance",
                    "sortOrder": "descending",
                },
            )
            if resp.status_code != 200:
                return f"(arXiv HTTP {resp.status_code})"

            text = resp.text
            entries = re.findall(r"<entry>(.*?)</entry>", text, re.S)
            for entry in entries:
                title = re.search(r"<title>(.*?)</title>", entry, re.S)
                summary = re.search(r"<summary>(.*?)</summary>", entry, re.S)
                published = re.search(r"<published>(.*?)</published>", entry)
                arxiv_id = re.search(r"<id>(.*?)</id>", entry)
                authors = re.findall(r"<name>(.*?)</name>", entry)

                title_text = title.group(1).strip().replace("\n", " ") if title else "Untitled"
                summary_text = summary.group(1).strip().replace("\n", " ")[:200] if summary else ""
                pub_date = published.group(1)[:10] if published else ""
                paper_url = arxiv_id.group(1).strip() if arxiv_id else ""
                author_list = ", ".join(authors[:5])
                if len(authors) > 5:
                    author_list += f" (+{len(authors)-5} more)"

                lines.append(
                    f"- [{pub_date}] {title_text}\n"
                    f"  Authors: {author_list}\n"
                    f"  {summary_text}\n"
                    f"  {paper_url}"
                )
    except Exception as e:
        return f"arXiv search failed: {e}"
    return "\n\n".join(lines) if lines else "(no arXiv results)"


def search_semantic_scholar(query: str) -> str:
    """Search Semantic Scholar for papers and author profiles. Returns citations, h-index, and influence metrics."""
    lines = []
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            resp = client.get(
                "https://api.semanticscholar.org/graph/v1/author/search",
                params={"query": query, "limit": 3, "fields": "name,hIndex,citationCount,paperCount,url"},
            )
            if resp.status_code == 200:
                data = resp.json()
                for author in data.get("data", []):
                    lines.append(
                        f"Author: {author.get('name', '')}\n"
                        f"  h-index: {author.get('hIndex', 'N/A')}\n"
                        f"  Citations: {author.get('citationCount', 'N/A')}\n"
                        f"  Papers: {author.get('paperCount', 'N/A')}\n"
                        f"  URL: {author.get('url', '')}"
                    )
                    author_id = author.get("authorId")
                    if author_id:
                        papers_resp = client.get(
                            f"https://api.semanticscholar.org/graph/v1/author/{author_id}/papers",
                            params={"limit": 8, "fields": "title,year,citationCount,url,venue"},
                        )
                        if papers_resp.status_code == 200:
                            papers = papers_resp.json().get("data", [])
                            papers.sort(key=lambda p: p.get("citationCount") or 0, reverse=True)
                            lines.append("  Top Papers:")
                            for p in papers[:8]:
                                lines.append(
                                    f"    - [{p.get('year', '')}] {p.get('title', '')} "
                                    f"({p.get('citationCount', 0)} citations) "
                                    f"{p.get('venue', '')}"
                                )
                    break

            resp = client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={"query": query, "limit": 5, "fields": "title,year,citationCount,authors,url"},
            )
            if resp.status_code == 200:
                papers = resp.json().get("data", [])
                if papers:
                    lines.append("\nRelated Papers:")
                    for p in papers:
                        authors = ", ".join(a.get("name", "") for a in (p.get("authors") or [])[:3])
                        lines.append(
                            f"  - [{p.get('year', '')}] {p.get('title', '')} "
                            f"({p.get('citationCount', 0)} cit.) by {authors}"
                        )
    except Exception as e:
        return f"Semantic Scholar search failed: {e}"
    return "\n".join(lines) if lines else "(no Semantic Scholar results)"


def fetch_hf_author(username: str) -> str:
    """Fetch HuggingFace models, datasets, and spaces for an author/organization."""
    if not username or username.strip() in ("", "unknown", "none"):
        return "(no HuggingFace username provided)"
    lines = []
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            resp = client.get(
                "https://huggingface.co/api/models",
                params={"author": username, "sort": "likes", "limit": 15},
            )
            if resp.status_code == 200:
                models = resp.json()
                if models:
                    total_downloads = sum(m.get("downloads", 0) for m in models)
                    total_likes = sum(m.get("likes", 0) for m in models)
                    lines.append(f"HuggingFace Models by {username}:")
                    lines.append(f"  Total: {len(models)} models, {total_downloads:,} downloads, {total_likes} likes")
                    lines.append("")
                    for m in models[:10]:
                        lines.append(
                            f"  - {m.get('modelId', m.get('id', ''))}\n"
                            f"    Downloads: {m.get('downloads', 0):,} | Likes: {m.get('likes', 0)}\n"
                            f"    Pipeline: {m.get('pipeline_tag', 'N/A')}\n"
                            f"    Tags: {', '.join((m.get('tags') or [])[:5])}"
                        )

            resp = client.get(
                "https://huggingface.co/api/datasets",
                params={"author": username, "sort": "likes", "limit": 10},
            )
            if resp.status_code == 200:
                datasets = resp.json()
                if datasets:
                    lines.append(f"\nHuggingFace Datasets by {username}:")
                    for d in datasets[:5]:
                        lines.append(
                            f"  - {d.get('id', '')}: "
                            f"{d.get('downloads', 0):,} downloads, {d.get('likes', 0)} likes"
                        )

            resp = client.get(
                "https://huggingface.co/api/spaces",
                params={"author": username, "sort": "likes", "limit": 10},
            )
            if resp.status_code == 200:
                spaces = resp.json()
                if spaces:
                    lines.append(f"\nHuggingFace Spaces by {username}:")
                    for s in spaces[:5]:
                        lines.append(
                            f"  - {s.get('id', '')}: {s.get('likes', 0)} likes"
                        )
    except Exception as e:
        lines.append(f"HuggingFace error: {e}")
    return "\n".join(lines) if lines else "(no HuggingFace data)"


# ═══════════════════════════════════════════════════════════════════════════
# Tool definitions for DeepSeek function calling
# ═══════════════════════════════════════════════════════════════════════════

_TOOL_FNS: dict[str, Any] = {
    "web_search": web_search,
    "web_news_search": web_news_search,
    "fetch_url_content": fetch_url_content,
    "fetch_github_profile": fetch_github_profile,
    "fetch_orcid_profile": fetch_orcid_profile,
    "search_arxiv": search_arxiv,
    "search_semantic_scholar": search_semantic_scholar,
    "fetch_hf_author": fetch_hf_author,
}

def _tool_def(name: str, description: str, params: dict) -> FunctionTool:
    return FunctionTool(function=FunctionToolDef(name=name, description=description, parameters=params))

_SINGLE_STR = {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}
_SINGLE_URL = {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}
_SINGLE_USERNAME = {"type": "object", "properties": {"username": {"type": "string"}}, "required": ["username"]}
_SINGLE_ID = {"type": "object", "properties": {"orcid_id": {"type": "string"}}, "required": ["orcid_id"]}

TOOL_WEB_SEARCH = _tool_def("web_search", "Search DuckDuckGo for a query and return titles, URLs, and snippets.", _SINGLE_STR)
TOOL_WEB_NEWS = _tool_def("web_news_search", "Search DuckDuckGo News for recent news articles.", _SINGLE_STR)
TOOL_FETCH_URL = _tool_def("fetch_url_content", "Fetch and return plain-text content from a URL (strips HTML).", _SINGLE_URL)
TOOL_GITHUB = _tool_def("fetch_github_profile", "Fetch GitHub profile metadata and top repositories for a username.", _SINGLE_USERNAME)
TOOL_ORCID = _tool_def("fetch_orcid_profile", "Fetch ORCID academic profile and publications.", _SINGLE_ID)
TOOL_ARXIV = _tool_def("search_arxiv", "Search arXiv for papers matching a query.", _SINGLE_STR)
TOOL_SEMANTIC = _tool_def("search_semantic_scholar", "Search Semantic Scholar for papers and author profiles.", _SINGLE_STR)
TOOL_HF = _tool_def("fetch_hf_author", "Fetch HuggingFace models, datasets, and spaces for an author.", _SINGLE_USERNAME)

# Convenience groups matching original tool lists
TOOLS_SEARCH = [TOOL_WEB_SEARCH, TOOL_FETCH_URL]
TOOLS_NEWS = [TOOL_WEB_NEWS, TOOL_WEB_SEARCH, TOOL_FETCH_URL]
TOOLS_ACADEMIC = [TOOL_ARXIV, TOOL_SEMANTIC]


# ═══════════════════════════════════════════════════════════════════════════
# Personality loader
# ═══════════════════════════════════════════════════════════════════════════

def _parse_ts(path: Path) -> dict[str, str]:
    text = path.read_text()
    fields: dict[str, str] = {"slug": path.stem}
    for key in ("name", "role", "org", "github", "orcid"):
        m = re.search(rf'{key}:\s*"([^"]+)"', text)
        if m:
            fields[key] = m.group(1)
    return fields


def load_personalities() -> list[dict[str, str]]:
    people = []
    for ts in sorted(PERSONALITIES_DIR.glob("*.ts")):
        p = _parse_ts(ts)
        if p.get("name"):
            people.append(p)
    return people


def pick_person(people: list[dict[str, str]]) -> dict[str, str]:
    console.print("\n[bold cyan]Available personalities:[/]\n")
    for i, p in enumerate(people, 1):
        orcid = f"  ORCID: {p['orcid']}" if p.get("orcid") else ""
        github = f"  GH: {p.get('github', '')}" if p.get("github") else ""
        console.print(
            f"  [yellow]{i:>2}[/]  {p['name']}  "
            f"[dim]{p.get('role', '')} @ {p.get('org', '')}{github}{orcid}[/]"
        )
    console.print()
    choice = console.input("[bold]Pick a number: [/]").strip()
    return people[int(choice) - 1]


# ═══════════════════════════════════════════════════════════════════════════
# Graph State
# ═══════════════════════════════════════════════════════════════════════════

class ResearchState(TypedDict, total=False):
    person: dict[str, str]
    # Phase 1
    web_research: str
    github_data: str
    orcid_data: str
    arxiv_data: str
    podcast_data: str
    news_data: str
    hf_data: str
    # Phase 2
    bio: str
    timeline: str
    contributions: str
    quotes: str
    social: str
    topics: str
    competitive: str
    collaboration: str
    funding: str
    conference: str
    philosophy: str
    # Phase 3
    eval_data: str
    executive: str


# ═══════════════════════════════════════════════════════════════════════════
# Agent runner — ReAct loop via deepseek_client
# ═══════════════════════════════════════════════════════════════════════════

async def _run_agent(
    client: DeepSeekClient,
    system_prompt: str,
    task: str,
    tools: list[FunctionTool] | None = None,
) -> str:
    """Run a single ReAct agent with the given system prompt, task, and tools."""
    try:
        messages = [
            ChatMessage(role="system", content=system_prompt),
            ChatMessage(role="user", content=task),
        ]

        if not tools:
            resp = await client.chat(messages)
            return resp.choices[0].message.content or ""

        for _ in range(_MAX_REACT_ITERS):
            resp = await client.chat(messages, tools=tools, tool_choice="auto")
            msg = resp.choices[0].message

            if not msg.tool_calls:
                return msg.content or ""

            # Add assistant message with tool calls
            messages.append(ChatMessage(
                role="assistant",
                content=msg.content or "",
                tool_calls=msg.tool_calls,
            ))

            # Execute each tool call and append results
            for tc in msg.tool_calls:
                fn = _TOOL_FNS.get(tc.function.name)
                if fn:
                    try:
                        args = json.loads(tc.function.arguments)
                        result = await asyncio.to_thread(fn, **args)
                    except Exception as e:
                        result = f"Tool error: {e}"
                else:
                    result = f"Unknown tool: {tc.function.name}"
                messages.append(ChatMessage(
                    role="tool",
                    content=str(result),
                    tool_call_id=tc.id,
                ))

        # Final call without tools to get summary
        resp = await client.chat(messages)
        return resp.choices[0].message.content or ""
    except Exception as e:
        console.print(f"[red]Agent error: {e}[/]")
        return f"(agent error: {e})"


def _ctx_block(label: str, content: str) -> str:
    """Format a context block for inclusion in agent prompts."""
    if not content or content.strip().startswith("("):
        return ""
    return f"\n### {label}\n{content[:3000]}\n"


# ═══════════════════════════════════════════════════════════════════════════
# Phase 1: Intelligence Gathering (7 agents in parallel)
# ═══════════════════════════════════════════════════════════════════════════

async def phase1(state: ResearchState) -> dict:
    client = _make_client()
    person = state["person"]
    name = person.get("name", "")
    role = person.get("role", "")
    org = person.get("org", "")
    github = person.get("github", "")
    orcid = person.get("orcid", "")
    ctx = f"{name} ({role} @ {org})"

    console.print("\n[bold cyan]Phase 1: Intelligence Gathering (7 agents in parallel)[/]")

    tools_search = TOOLS_SEARCH
    tools_news = TOOLS_NEWS
    tools_academic = TOOLS_ACADEMIC

    specs: list[tuple[str, str, str, list | None]] = [
        # (state_key, system_prompt, task_prompt, tools)
        (
            "web_research",
            (
                "You are a master internet researcher specializing in AI/tech industry figures. "
                "You craft precise search queries that cut through noise and find primary sources: "
                "personal blogs, conference talks, technical interviews, and official announcements. "
                "You ALWAYS include the person's role and org in every query to disambiguate them "
                "from unrelated people with the same name."
            ),
            (
                f"Research {ctx} using web search. Generate 8-10 diverse search queries covering: "
                f"recent news, technical blog posts, conference talks, interviews, open-source "
                f"projects, AI opinions, and career history. ALWAYS include the role or org "
                f"('{role}', '{org}') in every query to disambiguate from other people named {name}. "
                f"Run each query with web_search, then fetch the most promising URLs with fetch_url_content. "
                f"Return a structured summary of findings organized by theme with source URLs."
            ),
            tools_search,
        ),
        (
            "github_data",
            (
                "You are an expert in reading GitHub profiles and understanding repository ecosystems. "
                "You identify impactful open-source contributions by analyzing star counts, repo "
                "descriptions, commit patterns, and community adoption. You recognize architectural "
                "decisions and technical leadership from public signals."
            ),
            (
                f"Fetch and analyze the GitHub profile for {ctx}. "
                f"GitHub username: '{github or 'unknown — use web_search to find it first'}'. "
                f"If the username is unknown, search for '{name} github' to find it. "
                f"Analyze: bio, company, follower count, top repositories by stars, notable "
                f"projects, and what they reveal about technical focus and community impact."
            ),
            [TOOL_GITHUB],
        ),
        (
            "orcid_data",
            (
                "You specialize in academic research profiles, citation analysis, and publication "
                "tracking. You understand the ORCID system deeply and extract meaningful insight "
                "from publication lists, DOIs, and academic affiliations — connecting academic "
                "output to real-world technical impact."
            ),
            (
                f"Fetch and analyze the ORCID academic record for {ctx}. "
                f"ORCID iD: '{orcid or 'none'}'. "
                f"If no ORCID iD is provided, return '(no academic record available)'. "
                f"Otherwise summarize: researcher name, biography, keywords, and list the "
                f"top publications with year, title, and DOI."
            ),
            [TOOL_ORCID],
        ),
        (
            "arxiv_data",
            (
                "You are a bibliometric specialist who tracks academic impact through citation "
                "networks, h-indices, and publication patterns. You use arXiv for preprints and "
                "Semantic Scholar for citation graphs to build a complete picture of someone's "
                "research output and influence. You distinguish between first-author work, "
                "collaborative papers, and mentored student publications."
            ),
            (
                f"Search arXiv and Semantic Scholar for papers by or about {ctx}. "
                f"Search queries should include: '{name}' as author, '{name} {org}', "
                f"and key technical terms associated with their work. "
                f"From Semantic Scholar, extract: h-index, total citations, paper count, "
                f"and their top-cited papers. From arXiv, find recent preprints. "
                f"Identify their most influential papers by citation count."
            ),
            tools_academic,
        ),
        (
            "podcast_data",
            (
                "You specialize in tracking AI/tech leaders across the podcast and media landscape. "
                "You know every major tech podcast: Lex Fridman, Dwarkesh Podcast, No Priors, "
                "Latent Space, This Week in Startups, All-In, Lenny's Podcast, and niche AI shows. "
                "You find episode links, key discussion topics, and notable moments from each "
                "appearance. You also track YouTube interviews, conference recordings, and panels."
            ),
            (
                f"Find all podcast appearances and media interviews for {ctx}. "
                f"Search for: '{name} podcast interview', '{name} {org} podcast', "
                f"'{name} keynote talk', '{name} YouTube interview'. "
                f"For each appearance, identify: show name, episode title, date, "
                f"key topics discussed, and any notable quotes or moments. "
                f"Check major AI podcasts: Lex Fridman, Dwarkesh Podcast, No Priors, "
                f"Latent Space, All-In Podcast, This Week in Startups."
            ),
            tools_search,
        ),
        (
            "news_data",
            (
                "You are a tech industry press analyst who monitors TechCrunch, The Verge, Wired, "
                "VentureBeat, The Information, Bloomberg Technology, and AI-specific outlets. "
                "You track product launches, funding announcements, executive moves, partnerships, "
                "and controversy. You distinguish between primary reporting and aggregated coverage, "
                "always preferring primary sources with direct quotes."
            ),
            (
                f"Find all recent news and press coverage about {ctx} from the last 12 months. "
                f"Search for: '{name} {org}', '{name} announcement', '{name} funding', "
                f"'{name} launch', '{name} interview'. Use web_news_search for recent articles "
                f"and web_search for deeper coverage. "
                f"Categorize findings into: Product Launches, Funding/Business, "
                f"Partnerships, Controversies, Industry Commentary."
            ),
            tools_news,
        ),
        (
            "hf_data",
            (
                "You specialize in the AI model ecosystem — HuggingFace Hub, model cards, "
                "datasets, and Spaces. You understand model architectures, training paradigms, "
                "and the significance of download counts, likes, and community adoption. You "
                "can assess whether someone is a model creator, fine-tuner, dataset curator, "
                "or tooling builder from their HuggingFace activity."
            ),
            (
                f"Analyze the HuggingFace presence for {ctx}. "
                f"Try fetching HuggingFace data for username '{github or name.lower().replace(' ', '')}' "
                f"and also try the organization name '{org.lower().replace(' ', '')}'. "
                f"If the person doesn't have a HuggingFace presence, search for "
                f"'{name} huggingface' to find their profile. "
                f"Analyze: total models, downloads, likes, popular model architectures, "
                f"datasets published, and Spaces created."
            ),
            [TOOL_HF, TOOL_WEB_SEARCH],
        ),
    ]

    keys = [s[0] for s in specs]
    results = await asyncio.gather(*[
        _run_agent(client, sys, task, tools)
        for _, sys, task, tools in specs
    ])

    for key, result in zip(keys, results):
        console.print(f"  [green]✓[/] {key} ({len(result)} chars)")

    return dict(zip(keys, results))


# ═══════════════════════════════════════════════════════════════════════════
# Phase 2: Deep Analysis (11 agents in parallel, depends on Phase 1)
# ═══════════════════════════════════════════════════════════════════════════

async def phase2(state: ResearchState) -> dict:
    client = _make_client()
    person = state["person"]
    name = person.get("name", "")
    role = person.get("role", "")
    org = person.get("org", "")
    ctx = f"{name} ({role} @ {org})"

    console.print("\n[bold cyan]Phase 2: Deep Analysis (11 agents in parallel)[/]")

    # Build context from Phase 1 results
    all_p1 = (
        _ctx_block("Web Research", state.get("web_research", ""))
        + _ctx_block("GitHub Profile", state.get("github_data", ""))
        + _ctx_block("ORCID / Academic", state.get("orcid_data", ""))
        + _ctx_block("arXiv & Semantic Scholar", state.get("arxiv_data", ""))
        + _ctx_block("Podcast & Media", state.get("podcast_data", ""))
        + _ctx_block("News & Press", state.get("news_data", ""))
        + _ctx_block("HuggingFace", state.get("hf_data", ""))
    )

    tools_search = TOOLS_SEARCH

    specs: list[tuple[str, str, str, list | None]] = [
        (
            "bio",
            (
                "You are an expert technical biographer who has profiled hundreds of AI/tech leaders. "
                "You synthesize diverse sources into crisp, accurate narratives capturing what makes "
                "someone unique — their founding moment, key insight, and current focus. You never "
                "fabricate and always stay grounded in verifiable evidence."
            ),
            (
                f"Write a precise 3-5 sentence biography for {ctx} synthesizing the following research:\n"
                f"{all_p1}\n"
                f"Focus on: career origin or founding story, key technical achievements, "
                f"current role and impact, what makes them unique in AI/tech. "
                f"Be specific — name actual projects, frameworks, papers, or companies. "
                f"Every sentence must contain a verifiable, specific fact."
            ),
            tools_search,
        ),
        (
            "timeline",
            (
                "You are obsessed with chronological accuracy. You reconstruct career histories "
                "from scattered data: LinkedIn mentions, press releases, GitHub commit histories, "
                "conference programs, and funding announcements. Every event you record has a "
                "verified date (YYYY-MM format) and a source URL."
            ),
            (
                f"Build a chronological timeline of key career events for {ctx} "
                f"using the following research:\n{all_p1}\n"
                f"Include: education milestones, job changes, major product/paper launches, "
                f"funding rounds, conference keynotes, notable interviews, and open-source releases. "
                f"Each event requires: date (YYYY-MM format), description, source URL. "
                f"Aim for at least 10-15 events covering the full career arc.\n\n"
                f'Output a JSON array: [{{"date": "YYYY-MM", "event": "description", "url": "https://..."}}]'
            ),
            tools_search,
        ),
        (
            "contributions",
            (
                "You are a senior technical analyst evaluating the lasting impact of engineers "
                "and researchers. You understand what makes a framework, paper, algorithm, or "
                "product genuinely influential — adoption metrics, citations, derivative work, "
                "industry shifts. You write precise contribution descriptions with verifiable URLs."
            ),
            (
                f"Identify and describe the 3-6 most significant technical contributions of {ctx}. "
                f"Based on this research:\n{all_p1}\n"
                f"For each: what is it, why does it matter, what impact has it had (adoption, "
                f"citations, derivatives), who uses it, what numbers validate its importance.\n\n"
                f'Output a JSON array: [{{"title": "name", "description": "2-3 sentences", "url": "https://..."}}]'
            ),
            tools_search,
        ),
        (
            "quotes",
            (
                "You have an ear for authentic voice. You track down actual quotes from podcast "
                "transcripts, blog posts, conference keynotes, and social posts. You NEVER "
                "paraphrase or fabricate — if you cannot find the exact quote with a source URL, "
                "you skip it entirely. Quality over quantity."
            ),
            (
                f"Find 3-5 authentic, verbatim quotes from {ctx} in interviews, podcasts, "
                f"blog posts, or public talks. Based on this research:\n"
                f"{_ctx_block('Web Research', state.get('web_research', ''))}"
                f"{_ctx_block('Podcast & Media', state.get('podcast_data', ''))}"
                f"{_ctx_block('News & Press', state.get('news_data', ''))}\n"
                f"For each: find the exact text, identify the source, and provide the URL. "
                f"DO NOT paraphrase or fabricate.\n\n"
                f'Output a JSON array: [{{"text": "verbatim quote", "source": "podcast/article name", "url": "https://..."}}]'
            ),
            tools_search,
        ),
        (
            "social",
            (
                "You specialize in digital identity mapping. You find GitHub, Twitter/X, LinkedIn, "
                "personal websites, Substack, HuggingFace, and other platform presences. You only "
                "include URLs you can verify exist, organized into a clean key-value mapping."
            ),
            (
                f"Map all verified public social profiles and online presence for {ctx}. "
                f"Based on this research:\n"
                f"{_ctx_block('Web Research', state.get('web_research', ''))}"
                f"{_ctx_block('GitHub Profile', state.get('github_data', ''))}"
                f"{_ctx_block('HuggingFace', state.get('hf_data', ''))}\n"
                f"Find: GitHub URL, Twitter/X handle, LinkedIn profile, personal website/blog, "
                f"HuggingFace profile, Substack, and any other relevant platforms.\n\n"
                f'Output a JSON object: {{"github": "https://...", "twitter": "https://...", "website": "https://..."}}'
            ),
            tools_search,
        ),
        (
            "topics",
            (
                "You are a knowledge taxonomy expert who maps people to their precise domain "
                "expertise. You distinguish between surface-level buzzwords and deep expertise. "
                "Your topic lists are specific ('RAG pipeline optimization', not 'AI') and "
                "reflect the person's actual contributions and current focus areas."
            ),
            (
                f"Extract 5-10 specific technical topics representing {ctx}'s core expertise "
                f"based on all research gathered:\n{all_p1}\n"
                f"Be specific (e.g. 'multi-agent AI systems', 'RAG pipeline architecture', "
                f"'transformer inference optimization') not vague (e.g. 'AI', 'machine learning').\n\n"
                f'Output a JSON array: ["topic1", "topic2", ...]'
            ),
            None,
        ),
        (
            "competitive",
            (
                "You are an industry analyst who understands the competitive dynamics of AI/tech. "
                "You map where a person's company or project sits in the ecosystem: who are the "
                "direct competitors, what differentiates their approach, what market segments they "
                "target, and how they compare on traction metrics."
            ),
            (
                f"Analyze the competitive landscape around {ctx}. Based on:\n"
                f"{_ctx_block('Web Research', state.get('web_research', ''))}"
                f"{_ctx_block('GitHub Profile', state.get('github_data', ''))}"
                f"{_ctx_block('News & Press', state.get('news_data', ''))}\n"
                f"Identify: direct competitors, differentiators, market position, "
                f"comparative traction metrics.\n\n"
                f'Output a JSON object: {{"market_position": "leader/challenger/niche", '
                f'"competitors": [{{"name": "...", "relationship": "...", "differentiation": "..."}}], '
                f'"moats": ["..."], "ecosystem_role": "..."}}'
            ),
            tools_search,
        ),
        (
            "collaboration",
            (
                "You specialize in mapping professional networks in AI/tech. You identify "
                "co-founders, co-authors on key papers, frequent collaborators, mentors, "
                "mentees, and advisors. You trace intellectual lineages (PhD advisors, lab alumni networks)."
            ),
            (
                f"Map the professional collaboration network of {ctx}. Based on:\n"
                f"{_ctx_block('Web Research', state.get('web_research', ''))}"
                f"{_ctx_block('arXiv & Semantic Scholar', state.get('arxiv_data', ''))}"
                f"{_ctx_block('ORCID / Academic', state.get('orcid_data', ''))}\n"
                f"Identify co-founders, co-authors, mentors, mentees, advisors.\n\n"
                f'Output a JSON object: {{"co_founders": ["..."], "key_collaborators": '
                f'[{{"name": "...", "relationship": "...", "context": "..."}}], '
                f'"mentors": ["..."], "mentees": ["..."], "academic_lineage": "..."}}'
            ),
            None,
        ),
        (
            "funding",
            (
                "You are a venture capital and startup intelligence analyst. You track funding "
                "rounds from Seed to IPO, investor names, valuations, revenue milestones, and "
                "key business events."
            ),
            (
                f"Research the funding history and business milestones for {ctx}. Based on:\n"
                f"{_ctx_block('Web Research', state.get('web_research', ''))}"
                f"{_ctx_block('News & Press', state.get('news_data', ''))}\n"
                f"For each funding round: date, amount, lead investors, valuation if known.\n\n"
                f'Output a JSON object: {{"funding_rounds": [{{"date": "...", "round": "...", '
                f'"amount": "...", "investors": "...", "valuation": "..."}}], '
                f'"total_raised": "$...", "latest_valuation": "...", '
                f'"business_milestones": [{{"date": "...", "event": "..."}}], '
                f'"revenue_signals": "..."}}'
            ),
            tools_search,
        ),
        (
            "conference",
            (
                "You track the AI conference circuit: NeurIPS, ICML, ICLR, AAAI, ACL, CVPR, "
                "KDD, and industry events like AI Engineer Summit, Ray Summit, LangChain Days, "
                "Google I/O, WWDC, AWS re:Invent, and startup demo days."
            ),
            (
                f"Find all major conference talks, keynotes, and speaking engagements for {ctx}. Based on:\n"
                f"{_ctx_block('Web Research', state.get('web_research', ''))}"
                f"{_ctx_block('Podcast & Media', state.get('podcast_data', ''))}\n"
                f"For each: event name, talk title, date, type (keynote/panel/workshop/demo).\n\n"
                f'Output a JSON object: {{"speaking_tier": "thought-leader/regular/occasional/rare", '
                f'"talks": [{{"event": "...", "title": "...", "date": "...", "type": "...", "url": "..."}}], '
                f'"notable_moments": ["..."]}}'
            ),
            tools_search,
        ),
        (
            "philosophy",
            (
                "You are a technical thought analyst who identifies the deep convictions that "
                "drive AI/tech leaders. You extract their positions on key debates: AGI timelines, "
                "open vs closed source, safety vs acceleration, scaling laws, emergence, "
                "architecture choices, and the future of programming."
            ),
            (
                f"Analyze the technical philosophy and vision of {ctx}. Based on:\n"
                f"{_ctx_block('Web Research', state.get('web_research', ''))}"
                f"{_ctx_block('Podcast & Media', state.get('podcast_data', ''))}"
                f"{_ctx_block('News & Press', state.get('news_data', ''))}\n"
                f"Extract positions on: AGI timeline, open source vs proprietary, AI safety, "
                f"scaling laws, architecture preferences, future of software development.\n\n"
                f'Output a JSON object: {{"core_thesis": "...", '
                f'"positions": {{"topic": {{"stance": "...", "evidence": "...", "source_url": "..."}}}}, '
                f'"predictions": [{{"prediction": "...", "date_made": "...", "timeframe": "..."}}], '
                f'"contrarian_takes": ["..."]}}'
            ),
            None,
        ),
    ]

    keys = [s[0] for s in specs]
    results = await asyncio.gather(*[
        _run_agent(client, sys, task, tools)
        for _, sys, task, tools in specs
    ])

    for key, result in zip(keys, results):
        console.print(f"  [green]✓[/] {key} ({len(result)} chars)")

    return dict(zip(keys, results))


# ═══════════════════════════════════════════════════════════════════════════
# Phase 3: Synthesis & Evaluation (2 agents, sequential)
# ═══════════════════════════════════════════════════════════════════════════

async def phase3_eval(state: ResearchState) -> dict:
    client = _make_client()
    person = state["person"]
    ctx = f"{person.get('name', '')} ({person.get('role', '')} @ {person.get('org', '')})"

    console.print("\n[bold cyan]Phase 3a: Research Quality Evaluation[/]")

    p2_context = (
        _ctx_block("Biography", state.get("bio", ""))
        + _ctx_block("Timeline", state.get("timeline", ""))
        + _ctx_block("Contributions", state.get("contributions", ""))
        + _ctx_block("Quotes", state.get("quotes", ""))
        + _ctx_block("Social Profiles", state.get("social", ""))
        + _ctx_block("Topics", state.get("topics", ""))
        + _ctx_block("Competitive Landscape", state.get("competitive", ""))
        + _ctx_block("Collaboration Network", state.get("collaboration", ""))
        + _ctx_block("Funding", state.get("funding", ""))
        + _ctx_block("Conferences", state.get("conference", ""))
        + _ctx_block("Technical Philosophy", state.get("philosophy", ""))
    )

    result = await _run_agent(
        client,
        (
            "You are a rigorous research quality auditor. You evaluate profiles for bio "
            "specificity, source diversity, timeline completeness, contribution depth, and "
            "name disambiguation accuracy. You score each 1-10 with clear reasoning, "
            "identify gaps, and provide an actionable improvement summary."
        ),
        (
            f"Evaluate the research profile quality for {ctx} across 5 dimensions. "
            f"Review the following research:\n{p2_context}\n"
            f"Score each 1-10:\n"
            f"1. bio_quality — Is the bio specific, evidence-based, informative?\n"
            f"2. source_coverage — Are sources diverse, high-quality, verifiable?\n"
            f"3. timeline_completeness — Is the timeline detailed and well-sourced?\n"
            f"4. contributions_depth — Are contributions specific with real impact data?\n"
            f"5. name_disambiguation — Is this clearly focused on the correct person?\n\n"
            f'Output JSON: {{"bio_quality": {{"score": 8, "reasoning": "..."}}, '
            f'"source_coverage": {{"score": 7, "reasoning": "..."}}, '
            f'"timeline_completeness": {{"score": 6, "reasoning": "..."}}, '
            f'"contributions_depth": {{"score": 9, "reasoning": "..."}}, '
            f'"name_disambiguation": {{"score": 10, "reasoning": "..."}}, '
            f'"overall_score": 8, "summary": "..."}}'
        ),
    )

    console.print(f"  [green]✓[/] eval ({len(result)} chars)")
    return {"eval_data": result}


async def phase3_exec(state: ResearchState) -> dict:
    client = _make_client()
    person = state["person"]
    ctx = f"{person.get('name', '')} ({person.get('role', '')} @ {person.get('org', '')})"

    console.print("\n[bold cyan]Phase 3b: Executive Summary Synthesis[/]")

    all_context = (
        _ctx_block("Biography", state.get("bio", ""))
        + _ctx_block("Timeline", state.get("timeline", ""))
        + _ctx_block("Contributions", state.get("contributions", ""))
        + _ctx_block("Quotes", state.get("quotes", ""))
        + _ctx_block("Social Profiles", state.get("social", ""))
        + _ctx_block("Topics", state.get("topics", ""))
        + _ctx_block("Competitive Landscape", state.get("competitive", ""))
        + _ctx_block("Collaboration Network", state.get("collaboration", ""))
        + _ctx_block("Funding", state.get("funding", ""))
        + _ctx_block("Conferences", state.get("conference", ""))
        + _ctx_block("Technical Philosophy", state.get("philosophy", ""))
        + _ctx_block("Quality Evaluation", state.get("eval_data", ""))
        + _ctx_block("Podcast & Media", state.get("podcast_data", ""))
        + _ctx_block("News & Press", state.get("news_data", ""))
        + _ctx_block("arXiv & Semantic Scholar", state.get("arxiv_data", ""))
    )

    result = await _run_agent(
        client,
        (
            "You are an executive briefing specialist who distills complex multi-source "
            "intelligence into actionable profiles. You identify the 3 most important things "
            "to know about a person, their unique position in the industry, and what makes "
            "them consequential. You resolve contradictions between sources, flag uncertainty, "
            "and produce a profile that a CEO or investor could use to prepare for a meeting "
            "in 5 minutes."
        ),
        (
            f"Synthesize ALL research into a comprehensive executive profile for {ctx}:\n"
            f"{all_context}\n"
            f"Produce:\n"
            f"1. One-liner: single sentence capturing who this person is\n"
            f"2. Three key facts\n"
            f"3. Career arc: 2-3 sentence narrative\n"
            f"4. Current focus: what they're working on now\n"
            f"5. Industry significance\n"
            f"6. Risk factors\n"
            f"7. Meeting prep: 3 conversation starters\n\n"
            f'Output JSON: {{"one_liner": "...", "key_facts": ["...", "...", "..."], '
            f'"career_arc": "...", "current_focus": "...", "industry_significance": "...", '
            f'"risk_factors": ["..."], "meeting_prep": ["...", "...", "..."], '
            f'"confidence_level": "high/medium/low with reasoning"}}'
        ),
    )

    console.print(f"  [green]✓[/] executive ({len(result)} chars)")
    return {"executive": result}


# ═══════════════════════════════════════════════════════════════════════════
# Graph builder
# ═══════════════════════════════════════════════════════════════════════════

def build_graph():
    builder = StateGraph(ResearchState)
    builder.add_node("phase1", phase1)
    builder.add_node("phase2", phase2)
    builder.add_node("phase3_eval", phase3_eval)
    builder.add_node("phase3_exec", phase3_exec)

    builder.add_edge(START, "phase1")
    builder.add_edge("phase1", "phase2")
    builder.add_edge("phase2", "phase3_eval")
    builder.add_edge("phase3_eval", "phase3_exec")
    builder.add_edge("phase3_exec", END)

    return builder.compile()


# ═══════════════════════════════════════════════════════════════════════════
# Output assembly & export
# ═══════════════════════════════════════════════════════════════════════════

def _extract_json(text: str) -> Any:
    """Try to extract a JSON array or object from agent output text."""
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    m = re.search(r"```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```", text, re.S)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    m = re.search(r"(\[[\s\S]*?\]|\{[\s\S]*?\})", text)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return None


def export_results(state: ResearchState) -> None:
    person = state["person"]
    name = person.get("name", person["slug"])
    slug = person["slug"]

    console.rule(f"[bold green]Exporting: {name}[/]")

    bio = state.get("bio", "").strip()
    if len(bio) > 600:
        bio = bio[:600]

    timeline = _extract_json(state.get("timeline", "")) or []
    if not isinstance(timeline, list):
        timeline = []

    contributions = _extract_json(state.get("contributions", "")) or []
    if not isinstance(contributions, list):
        contributions = []

    quotes = _extract_json(state.get("quotes", "")) or []
    if not isinstance(quotes, list):
        quotes = []

    social = _extract_json(state.get("social", "")) or {}
    if not isinstance(social, dict):
        social = {}

    topics = _extract_json(state.get("topics", "")) or []
    if not isinstance(topics, list):
        topics = []

    competitive = _extract_json(state.get("competitive", "")) or {}
    if not isinstance(competitive, dict):
        competitive = {}

    collaboration = _extract_json(state.get("collaboration", "")) or {}
    if not isinstance(collaboration, dict):
        collaboration = {}

    funding = _extract_json(state.get("funding", "")) or {}
    if not isinstance(funding, dict):
        funding = {}

    conference = _extract_json(state.get("conference", "")) or {}
    if not isinstance(conference, dict):
        conference = {}

    philosophy = _extract_json(state.get("philosophy", "")) or {}
    if not isinstance(philosophy, dict):
        philosophy = {}

    eval_data = _extract_json(state.get("eval_data", "")) or {}

    executive = _extract_json(state.get("executive", "")) or {}
    if not isinstance(executive, dict):
        executive = {}

    podcast_appearances = _extract_json(state.get("podcast_data", "")) or []
    if not isinstance(podcast_appearances, list):
        podcast_appearances = []

    news_items = _extract_json(state.get("news_data", "")) or []
    if not isinstance(news_items, list):
        news_items = []

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    research = {
        "slug": slug,
        "name": name,
        "generated_at": now,
        "bio": bio,
        "executive_summary": executive,
        "topics": [t for t in topics if isinstance(t, str)],
        "timeline": [
            {"date": e.get("date", ""), "event": e.get("event", ""), "url": e.get("url", "")}
            for e in timeline if isinstance(e, dict)
        ],
        "key_contributions": [
            {"title": c.get("title", ""), "description": c.get("description", ""), "url": c.get("url", "")}
            for c in contributions if isinstance(c, dict)
        ],
        "quotes": [
            {"text": q.get("text", ""), "source": q.get("source", ""), "url": q.get("url", "")}
            for q in quotes if isinstance(q, dict)
        ],
        "social": {k: v for k, v in social.items() if isinstance(k, str) and isinstance(v, str)},
        "podcast_appearances": [
            {k: v for k, v in a.items() if isinstance(v, (str, list))}
            for a in podcast_appearances if isinstance(a, dict)
        ],
        "news": [
            {k: v for k, v in n.items() if isinstance(v, str)}
            for n in news_items if isinstance(n, dict)
        ],
        "competitive_landscape": competitive,
        "collaboration_network": collaboration,
        "funding": funding,
        "conferences": conference,
        "technical_philosophy": philosophy,
        "sources": [],
    }

    RESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RESEARCH_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(research, indent=2, ensure_ascii=False) + "\n")
    console.print(f"\n  [bold green]Research exported -> {out_path}[/]")

    if eval_data and isinstance(eval_data, dict):
        eval_path = RESEARCH_DIR / f"{slug}.eval.json"
        eval_path.write_text(
            json.dumps(
                {"slug": slug, "name": name, "generated_at": now, "eval": eval_data},
                indent=2, ensure_ascii=False,
            ) + "\n"
        )
        console.print(f"  [bold green]Eval exported -> {eval_path}[/]")

        table = Table(title="Research Eval Scores")
        table.add_column("Dimension", style="cyan", width=28)
        table.add_column("Score", style="yellow", width=8)
        table.add_column("Reasoning", width=60)
        for dim in ("bio_quality", "source_coverage", "timeline_completeness", "contributions_depth", "name_disambiguation"):
            s = eval_data.get(dim, {})
            table.add_row(
                dim.replace("_", " ").title(),
                f"{s.get('score', 0)}/10",
                str(s.get("reasoning", ""))[:58],
            )
        console.print(table)
        console.print(
            f"  [bold green]Overall: {eval_data.get('overall_score', 0)}/10[/] — "
            f"{str(eval_data.get('summary', ''))[:120]}"
        )

    if executive:
        console.print()
        exec_table = Table(title="Executive Summary", show_lines=True)
        exec_table.add_column("Field", style="cyan", width=22)
        exec_table.add_column("Value", width=70)
        if executive.get("one_liner"):
            exec_table.add_row("One-liner", str(executive["one_liner"])[:70])
        if executive.get("key_facts"):
            for i, fact in enumerate(executive["key_facts"][:3], 1):
                exec_table.add_row(f"Key Fact #{i}", str(fact)[:70])
        if executive.get("current_focus"):
            exec_table.add_row("Current Focus", str(executive["current_focus"])[:70])
        if executive.get("industry_significance"):
            exec_table.add_row("Significance", str(executive["industry_significance"])[:70])
        if executive.get("confidence_level"):
            exec_table.add_row("Confidence", str(executive["confidence_level"])[:70])
        console.print(exec_table)


# ═══════════════════════════════════════════════════════════════════════════
# Entry point
# ═══════════════════════════════════════════════════════════════════════════

async def run_person(person: dict[str, str]) -> None:
    name = person.get("name", person["slug"])
    slug = person["slug"]

    console.rule(f"[bold cyan]{name}[/]")
    console.print(f"  Role: {person.get('role', '')}  |  Org: {person.get('org', '')}")
    console.print(f"  GitHub: {person.get('github', '—')}  |  ORCID: {person.get('orcid', '—')}\n")

    graph = build_graph()
    final_state = await graph.ainvoke({"person": person})
    export_results(final_state)


async def main():
    parser = argparse.ArgumentParser(
        description="Person research via LangGraph — 20 expert agents in 3 phases"
    )
    parser.add_argument("--slug", help="Personality slug (e.g. harrison-chase)")
    parser.add_argument("--name", help="Full name (auto-detected from personalities/)")
    parser.add_argument("--role", help="Role")
    parser.add_argument("--org", help="Organization")
    parser.add_argument("--github", help="GitHub username")
    parser.add_argument("--orcid", help="ORCID iD")
    args = parser.parse_args()

    if args.slug:
        ts_path = PERSONALITIES_DIR / f"{args.slug}.ts"
        if ts_path.exists() and not args.name:
            person = _parse_ts(ts_path)
        else:
            person = {
                "slug": args.slug,
                "name": args.name or args.slug.replace("-", " ").title(),
                "role": args.role or "",
                "org": args.org or "",
                "github": args.github or "",
                "orcid": args.orcid or "",
            }
        for key, val in [("name", args.name), ("role", args.role), ("org", args.org),
                          ("github", args.github), ("orcid", args.orcid)]:
            if val:
                person[key] = val
        await run_person(person)
    else:
        people = load_personalities()
        if not people:
            console.print("[red]No personality files found in personalities/[/]")
            return
        person = pick_person(people)
        await run_person(person)


if __name__ == "__main__":
    asyncio.run(main())

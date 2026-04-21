#!/usr/bin/env python3
from __future__ import annotations
"""Person research pipeline — LangGraph/LangChain implementation with 20 expert agents.

Spawns 20 specialized expert agents organized in 3 phases that collaboratively
research an AI/tech personality and produce a structured JSON profile compatible
with the existing PersonResearch schema.

Usage:
    python3 research_pipeline.py
    python3 research_pipeline.py --slug harrison-chase
    python3 research_pipeline.py --slug harrison-chase --name "Harrison Chase" --role "CEO" --org "LangChain"

Phase 1 — Intelligence Gathering (parallel):
    1.  Web Research Specialist       — multi-query DuckDuckGo search
    2.  GitHub & Open Source Analyst  — profile + top repos
    3.  Academic Publications Analyst — ORCID / Academia.edu / Google Scholar / ResearchGate
    4.  arXiv & Semantic Scholar Analyst — papers, citations, h-index
    5.  Podcast & Media Analyst       — podcast appearances, media coverage
    6.  News & Press Analyst          — recent news, press releases
    7.  HuggingFace & Model Registry Analyst — models, datasets, spaces
    7b. Blog & Writing Analyst        — personal blog posts via RSS (if blogUrl set)

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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypedDict
from urllib.parse import urlparse

import httpx
from langgraph.graph import END, START, StateGraph
from rich.console import Console
from rich.table import Table

from mlx_client import (  # noqa: E402
    MLXClient,
    MLXConfig,
    ChatMessage,
    FunctionTool,
    FunctionToolDef,
)

try:
    from hf_client import HFClient, HFConfig
except ImportError:
    HFClient = None  # type: ignore[misc,assignment]
    HFConfig = None  # type: ignore[misc,assignment]

try:
    from blog_embedder import search_blog_results
except ImportError:
    search_blog_results = None  # blog embedder not available

console = Console()

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
PERSONALITIES_DIR = PROJECT_ROOT / "personalities"
RESEARCH_DIR = PROJECT_ROOT / "src" / "lib" / "research"

_HTTP_TIMEOUT = 15.0
_MAX_REACT_ITERS = 8
_AGENT_TIMEOUT = 300  # seconds — kill agent if it takes longer
_SKIP_AGENTS: set[str] = set()  # populated via --skip-agents CLI flag


# ═══════════════════════════════════════════════════════════════════════════
# LLM — Dual-lane: local MLX + remote HuggingFace Inference API
# ═══════════════════════════════════════════════════════════════════════════

_HF_TOKEN: str = os.environ.get("HF_TOKEN", "")

# MLX multi-process pool (each worker loads its own model copy in its own Python process).
_MLX_WORKERS: int = int(os.environ.get("MLX_WORKERS", "1"))
_MLX_POOL: Any = None  # multiprocessing.Pool, initialized lazily

def _make_client() -> MLXClient:
    return MLXClient(MLXConfig(
        default_temperature=0.2,
        default_max_tokens=4096,
    ))


def _make_hf_client():
    """Create an HFClient for the remote lane (72B model). Returns None if unavailable."""
    if HFClient is None or not _HF_TOKEN:
        return None
    return HFClient(HFConfig(
        token=_HF_TOKEN,
        default_temperature=0.2,
        default_max_tokens=8192,
    ))


# ═══════════════════════════════════════════════════════════════════════════
# Tools
# ═══════════════════════════════════════════════════════════════════════════

_SKIP_DOMAINS = {
    "twitter.com", "x.com", "linkedin.com", "youtube.com", "youtu.be",
    "reddit.com", "facebook.com", "instagram.com", "tiktok.com",
    "pinterest.com", "amazon.com",
    "cnn.com", "bbc.com", "bbc.co.uk", "foxnews.com", "nytimes.com",
    "washingtonpost.com", "reuters.com", "apnews.com", "goodreads.com",
}


def web_search(query: str) -> str:
    """Search DuckDuckGo for a query and return titles, URLs, and snippets."""
    from ddgs import DDGS

    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=20):
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
            for r in ddgs.news(query, max_results=15):
                results.append(
                    f"- [{r.get('title', 'Untitled')}]({r.get('url', '')})\n"
                    f"  {r.get('date', '')} | {r.get('source', '')}\n"
                    f"  {r.get('body', '')[:300]}"
                )
    except Exception as e:
        return f"News search failed: {e}"
    return "\n".join(results) if results else "(no news results)"


def video_search(query: str) -> str:
    """Search DuckDuckGo Videos for video content matching a query."""
    from ddgs import DDGS

    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.videos(query, max_results=20):
                results.append(
                    f"- [{r.get('title', 'Untitled')}]({r.get('content', '')})\n"
                    f"  Duration: {r.get('duration', 'N/A')} | Publisher: {r.get('publisher', '')}\n"
                    f"  {r.get('description', '')[:300]}"
                )
    except Exception as e:
        return f"Video search failed: {e}"
    return "\n".join(results) if results else "(no video results)"


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
            return re.sub(r"\s+", " ", text).strip()[:12000]
    except Exception as e:
        return f"Fetch failed: {e}"


def fetch_blog_rss(url: str) -> str:
    """Fetch and parse an RSS/Atom feed from a blog URL. Returns post titles, dates, URLs, and descriptions."""
    import xml.etree.ElementTree as ET

    # Try common feed paths
    feed_urls = []
    base = url.rstrip("/")
    if url.endswith(".xml") or url.endswith("/feed") or url.endswith("/rss"):
        feed_urls.append(url)
    else:
        feed_urls.extend([
            f"{base}/rss.xml",
            f"{base}/feed.xml",
            f"{base}/atom.xml",
            f"{base}/feed",
            f"{base}/rss",
            f"{base}/index.xml",
        ])

    for feed_url in feed_urls:
        try:
            with httpx.Client(timeout=15, follow_redirects=True) as client:
                resp = client.get(feed_url, headers={"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"})
                if resp.status_code != 200:
                    continue
                root = ET.fromstring(resp.text)
                posts = []
                # RSS 2.0
                for item in root.iter("item"):
                    title = (item.findtext("title") or "").strip()
                    link = (item.findtext("link") or "").strip()
                    pub_date = (item.findtext("pubDate") or "").strip()
                    desc = (item.findtext("description") or "").strip()
                    desc = re.sub(r"<[^>]+>", " ", desc)
                    desc = re.sub(r"\s+", " ", desc).strip()[:300]
                    if title and link:
                        posts.append(f"- [{pub_date}] {title}\n  URL: {link}\n  {desc}")
                # Atom
                if not posts:
                    ns = {"atom": "http://www.w3.org/2005/Atom"}
                    for entry in root.findall(".//atom:entry", ns):
                        title = (entry.findtext("atom:title", namespaces=ns) or "").strip()
                        link_el = entry.find("atom:link[@rel='alternate']", ns)
                        if link_el is None:
                            link_el = entry.find("atom:link", ns)
                        link = link_el.get("href", "") if link_el is not None else ""
                        pub_date = (entry.findtext("atom:published", namespaces=ns) or
                                    entry.findtext("atom:updated", namespaces=ns) or "").strip()
                        summary = (entry.findtext("atom:summary", namespaces=ns) or "").strip()[:300]
                        if title and link:
                            posts.append(f"- [{pub_date}] {title}\n  URL: {link}\n  {summary}")
                if posts:
                    return f"Found {len(posts)} blog posts from {feed_url}:\n\n" + "\n\n".join(posts)
        except Exception:
            continue

    # Fallback: fetch the archive/posts page and extract links
    for path in ["", "/posts", "/blog", "/archive"]:
        try:
            page_url = f"{base}{path}"
            content = fetch_url_content(page_url)
            if content and not content.startswith("("):
                return f"Blog page content from {page_url}:\n{content[:10000]}"
        except Exception:
            continue

    return "(no blog feed found)"


def fetch_blog_post_content(url: str) -> str:
    """Fetch a single blog post and extract its main text content."""
    try:
        with httpx.Client(timeout=12, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"})
            if resp.status_code != 200:
                return f"(HTTP {resp.status_code})"
            text = resp.text
            # Try to extract article/main content
            article_match = re.search(r"<article[^>]*>(.*?)</article>", text, re.S | re.I)
            if article_match:
                text = article_match.group(1)
            else:
                main_match = re.search(r"<main[^>]*>(.*?)</main>", text, re.S | re.I)
                if main_match:
                    text = main_match.group(1)
            text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S | re.I)
            text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.S | re.I)
            text = re.sub(r"<[^>]+>", " ", text)
            return re.sub(r"\s+", " ", text).strip()[:8000]
    except Exception as e:
        return f"Fetch failed: {e}"


_GH_GQL = "https://api.github.com/graphql"

_GH_PROFILE_QUERY = """
query($login: String!) {
  user(login: $login) {
    login name bio company location websiteUrl twitterUsername
    publicRepositories: repositories(privacy: PUBLIC) { totalCount }
    followers { totalCount }
    repositories(first: 10, ownerAffiliations: OWNER, isFork: false,
                 orderBy: {field: STARGAZERS, direction: DESC}) {
      nodes { name stargazerCount primaryLanguage { name } description }
    }
  }
}
"""


def _gh_gql(query: str, variables: dict) -> dict | None:
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        return None
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            resp = client.post(
                _GH_GQL,
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"query": query, "variables": variables},
            )
            if resp.status_code == 200:
                return resp.json().get("data")
    except Exception:
        pass
    return None


def fetch_github_profile(username: str) -> str:
    """Fetch GitHub profile metadata and top repositories via GraphQL."""
    if not username or username.strip() in ("", "unknown"):
        return "(no username provided)"
    data = _gh_gql(_GH_PROFILE_QUERY, {"login": username})
    if not data or not data.get("user"):
        return "(no GitHub data)"
    u = data["user"]
    lines = []
    for key in ("login", "name", "bio", "company", "location", "websiteUrl", "twitterUsername"):
        lines.append(f"{key}: {u.get(key, '')}")
    lines += [
        f"public_repos: {u['publicRepositories']['totalCount']}",
        f"followers: {u['followers']['totalCount']}",
        "",
        "Top repositories:",
    ]
    for r in u["repositories"]["nodes"]:
        lang = (r.get("primaryLanguage") or {}).get("name", "")
        lines.append(f"  - {r['name']} ({r['stargazerCount']} stars, {lang}): {r.get('description') or ''}")
    return "\n".join(lines)


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


def fetch_academic_profile(url: str) -> str:
    """Fetch an academic profile page (Academia.edu, ResearchGate, Google Scholar) and extract text."""
    if not url or url.strip() in ("", "none"):
        return "(no academic URL provided)"
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"})
            resp.raise_for_status()
            text = re.sub(r"<script[^>]*>.*?</script>", " ", resp.text, flags=re.S | re.I)
            text = re.sub(r"<style[^>]*>.*?</style>", " ", text, flags=re.S | re.I)
            text = re.sub(r"<[^>]+>", " ", text)
            return re.sub(r"\s+", " ", text).strip()[:6000]
    except Exception as e:
        return f"(error fetching academic profile: {e})"


def search_arxiv(query: str) -> str:
    """Search arXiv for papers matching a query. Returns titles, authors, dates, and abstracts."""
    lines = []
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT, follow_redirects=True) as client:
            resp = client.get(
                "https://export.arxiv.org/api/query",
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


def fetch_wikipedia_summary(query: str) -> str:
    """Fetch Wikipedia summary and key facts for a person or topic."""
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            search_resp = client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query", "list": "search",
                    "srsearch": query, "format": "json", "srlimit": 3,
                },
            )
            if search_resp.status_code != 200:
                return "(Wikipedia search failed)"
            results = search_resp.json().get("query", {}).get("search", [])
            if not results:
                return "(no Wikipedia article found)"

            title = results[0]["title"]
            summary_resp = client.get(
                f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}",
                headers={"User-Agent": "ResearchBot/1.0"},
            )
            if summary_resp.status_code != 200:
                return f"(Wikipedia HTTP {summary_resp.status_code})"
            data = summary_resp.json()

            lines = [
                f"Title: {data.get('title', '')}",
                f"Description: {data.get('description', '')}",
                f"Extract: {data.get('extract', '')}",
                f"URL: {data.get('content_urls', {}).get('desktop', {}).get('page', '')}",
            ]

            parse_resp = client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "parse", "page": title,
                    "prop": "wikitext", "section": 0,
                    "format": "json",
                },
            )
            if parse_resp.status_code == 200:
                wikitext = parse_resp.json().get("parse", {}).get("wikitext", {}).get("*", "")
                clean = re.sub(r"\{\{[^}]+\}\}", "", wikitext)
                clean = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", clean)
                clean = re.sub(r"'{2,}", "", clean)
                clean = re.sub(r"<[^>]+>", "", clean)
                if len(clean) > 200:
                    lines.append(f"\nFull intro:\n{clean[:3000]}")

            return "\n".join(lines)
    except Exception as e:
        return f"Wikipedia fetch failed: {e}"


def search_openalex(query: str) -> str:
    """Search OpenAlex for academic works and author profiles. Free, no API key needed."""
    lines = []
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            resp = client.get(
                "https://api.openalex.org/authors",
                params={"search": query, "per_page": 3},
                headers={"User-Agent": "mailto:research@example.com"},
            )
            if resp.status_code == 200:
                for author in resp.json().get("results", []):
                    affiliations = ", ".join(
                        inst.get("display_name", "")
                        for inst in (author.get("affiliations") or [])[:3]
                    )
                    lines.append(
                        f"Author: {author.get('display_name', '')}\n"
                        f"  Works: {author.get('works_count', 0)}\n"
                        f"  Citations: {author.get('cited_by_count', 0)}\n"
                        f"  h-index: {author.get('summary_stats', {}).get('h_index', 'N/A')}\n"
                        f"  Affiliations: {affiliations}"
                    )
            resp = client.get(
                "https://api.openalex.org/works",
                params={"search": query, "per_page": 10, "sort": "cited_by_count:desc"},
                headers={"User-Agent": "mailto:research@example.com"},
            )
            if resp.status_code == 200:
                works = resp.json().get("results", [])
                if works:
                    lines.append("\nTop Works:")
                    for w in works:
                        authors = ", ".join(
                            a.get("author", {}).get("display_name", "")
                            for a in (w.get("authorships") or [])[:3]
                        )
                        lines.append(
                            f"  - [{w.get('publication_year', '')}] {w.get('title', '')}\n"
                            f"    Citations: {w.get('cited_by_count', 0)} | {authors}\n"
                            f"    DOI: {w.get('doi', '')}"
                        )
    except Exception as e:
        return f"OpenAlex search failed: {e}"
    return "\n".join(lines) if lines else "(no OpenAlex results)"


def check_social_url(url: str) -> str:
    """Check if a URL exists (HTTP HEAD). Returns status code and final URL after redirects."""
    try:
        with httpx.Client(timeout=8, follow_redirects=True) as client:
            resp = client.head(url, headers={"User-Agent": "Mozilla/5.0"})
            return f"Status: {resp.status_code} | Final URL: {resp.url}"
    except Exception as e:
        return f"URL check failed: {e}"


_GH_REPOS_EXT_QUERY = """
query($login: String!) {
  user(login: $login) {
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false,
                 orderBy: {field: STARGAZERS, direction: DESC}) {
      nodes {
        name stargazerCount createdAt
        primaryLanguage { name }
        repositoryTopics(first: 10) { nodes { topic { name } } }
        description
      }
    }
  }
}
"""


def fetch_github_repos_extended(username: str) -> str:
    """Fetch all significant repositories via GraphQL with creation dates and topics."""
    if not username or username.strip() in ("", "unknown"):
        return "(no username provided)"
    data = _gh_gql(_GH_REPOS_EXT_QUERY, {"login": username})
    if not data or not data.get("user"):
        return "(no repos found)"
    lines = []
    for r in data["user"]["repositories"]["nodes"]:
        if r["stargazerCount"] < 5:
            continue
        lang = (r.get("primaryLanguage") or {}).get("name", "N/A")
        topics = ", ".join(t["topic"]["name"] for t in r.get("repositoryTopics", {}).get("nodes", []))
        lines.append(
            f"- {r['name']} ({r['stargazerCount']} stars)\n"
            f"  Created: {(r.get('createdAt') or '')[:10]}\n"
            f"  Language: {lang}\n"
            f"  Topics: {topics}\n"
            f"  Description: {r.get('description') or ''}"
        )
    return "\n".join(lines) if lines else "(no repos found)"


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
    "video_search": video_search,
    "fetch_wikipedia_summary": fetch_wikipedia_summary,
    "search_openalex": search_openalex,
    "check_social_url": check_social_url,
    "fetch_github_repos_extended": fetch_github_repos_extended,
    "fetch_blog_rss": fetch_blog_rss,
    "fetch_blog_post_content": fetch_blog_post_content,
    "fetch_academic_profile": fetch_academic_profile,
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
TOOL_ACADEMIC = _tool_def("fetch_academic_profile", "Fetch an academic profile page (Academia.edu, ResearchGate, Google Scholar URL).", _SINGLE_URL)
TOOL_ARXIV = _tool_def("search_arxiv", "Search arXiv for papers matching a query.", _SINGLE_STR)
TOOL_SEMANTIC = _tool_def("search_semantic_scholar", "Search Semantic Scholar for papers and author profiles.", _SINGLE_STR)
TOOL_HF = _tool_def("fetch_hf_author", "Fetch HuggingFace models, datasets, and spaces for an author.", _SINGLE_USERNAME)
TOOL_VIDEO = _tool_def("video_search", "Search DuckDuckGo Videos for video content matching a query.", _SINGLE_STR)
TOOL_WIKIPEDIA = _tool_def("fetch_wikipedia_summary", "Fetch Wikipedia summary and key facts for a person or topic.", _SINGLE_STR)
TOOL_OPENALEX = _tool_def("search_openalex", "Search OpenAlex for academic works and author profiles.", _SINGLE_STR)
TOOL_CHECK_URL = _tool_def("check_social_url", "Check if a URL exists (HTTP HEAD). Returns status code and final URL.", _SINGLE_URL)
TOOL_GITHUB_EXT = _tool_def("fetch_github_repos_extended", "Fetch all significant repos with creation dates and topics.", _SINGLE_USERNAME)
TOOL_BLOG_RSS = _tool_def("fetch_blog_rss", "Fetch and parse an RSS/Atom feed from a blog URL. Returns post titles, dates, and descriptions.", _SINGLE_URL)
TOOL_BLOG_POST = _tool_def("fetch_blog_post_content", "Fetch a single blog post and extract its main text content.", _SINGLE_URL)

# Convenience groups matching original tool lists
TOOLS_SEARCH = [TOOL_WEB_SEARCH, TOOL_FETCH_URL]
TOOLS_NEWS = [TOOL_WEB_NEWS, TOOL_WEB_SEARCH, TOOL_FETCH_URL]
TOOLS_ACADEMIC = [TOOL_ARXIV, TOOL_SEMANTIC, TOOL_OPENALEX]
TOOLS_VIDEO = [TOOL_VIDEO, TOOL_WEB_SEARCH, TOOL_FETCH_URL]
TOOLS_BLOG = [TOOL_BLOG_RSS, TOOL_BLOG_POST, TOOL_WEB_SEARCH, TOOL_FETCH_URL]

# Name → FunctionTool registry for bundle-driven tool resolution.
_TOOL_DEFS: dict[str, FunctionTool] = {
    "web_search": TOOL_WEB_SEARCH,
    "web_news_search": TOOL_WEB_NEWS,
    "fetch_url_content": TOOL_FETCH_URL,
    "fetch_github_profile": TOOL_GITHUB,
    "fetch_github_repos_extended": TOOL_GITHUB_EXT,
    "fetch_orcid_profile": TOOL_ORCID,
    "fetch_academic_profile": TOOL_ACADEMIC,
    "search_arxiv": TOOL_ARXIV,
    "search_semantic_scholar": TOOL_SEMANTIC,
    "fetch_hf_author": TOOL_HF,
    "video_search": TOOL_VIDEO,
    "fetch_wikipedia_summary": TOOL_WIKIPEDIA,
    "search_openalex": TOOL_OPENALEX,
    "check_social_url": TOOL_CHECK_URL,
    "fetch_blog_rss": TOOL_BLOG_RSS,
    "fetch_blog_post_content": TOOL_BLOG_POST,
}


# ═══════════════════════════════════════════════════════════════════════════
# MLX worker pool — each worker loads its own Qwen model in its own process
# ═══════════════════════════════════════════════════════════════════════════

_WORKER_CLIENT: MLXClient | None = None


def _mlx_worker_init(model_name: str | None) -> None:
    """Runs once per worker process on pool start. Loads MLX model into worker memory."""
    global _WORKER_CLIENT
    if model_name:
        os.environ["MLX_MODEL"] = model_name
    _WORKER_CLIENT = MLXClient(MLXConfig(default_temperature=0.2, default_max_tokens=4096))


def _mlx_worker_run(key: str, sys_prompt: str, task_prompt: str, tool_names: list[str] | None) -> tuple[str, str]:
    """Runs one agent inside a worker. Tool names are resolved from the per-worker _TOOL_DEFS registry."""
    tools = [_TOOL_DEFS[n] for n in tool_names] if tool_names else None
    try:
        result = asyncio.run(_run_agent(_WORKER_CLIENT, sys_prompt, task_prompt, tools))
    except Exception as e:
        result = f"(worker error: {e})"
    return key, result


def _get_mlx_pool():
    """Return the module-level MLX process pool, creating it lazily."""
    global _MLX_POOL
    if _MLX_POOL is not None:
        return _MLX_POOL
    if _MLX_WORKERS <= 1:
        return None
    import multiprocessing as mp
    ctx = mp.get_context("spawn")
    model_name = os.environ.get("MLX_MODEL")
    console.print(f"[bold cyan]Spawning {_MLX_WORKERS} MLX worker processes...[/] (each loads its own model copy)")
    _MLX_POOL = ctx.Pool(
        processes=_MLX_WORKERS,
        initializer=_mlx_worker_init,
        initargs=(model_name,),
    )
    import atexit
    atexit.register(lambda: _MLX_POOL.close() if _MLX_POOL else None)
    return _MLX_POOL


# ═══════════════════════════════════════════════════════════════════════════
# Personality loader
# ═══════════════════════════════════════════════════════════════════════════

def _parse_ts(path: Path) -> dict[str, str]:
    text = path.read_text()
    fields: dict[str, str] = {"slug": path.stem}
    for key in ("name", "role", "org", "github", "orcid", "academicUrl", "blogUrl"):
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
        academic = f"  ORCID: {p['orcid']}" if p.get("orcid") else (f"  Academic: {p['academicUrl']}" if p.get("academicUrl") else "")
        github = f"  GH: {p.get('github', '')}" if p.get("github") else ""
        console.print(
            f"  [yellow]{i:>2}[/]  {p['name']}  "
            f"[dim]{p.get('role', '')} @ {p.get('org', '')}{github}{academic}[/]"
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
    academic_data: str
    arxiv_data: str
    podcast_data: str
    news_data: str
    hf_data: str
    video_data: str
    blog_data: str
    # Phase 1.5
    wikipedia_data: str
    deep_fetched_urls: str
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
    questions: str
    # Re-research
    reresearch_count: int


# ═══════════════════════════════════════════════════════════════════════════
# Agent runner — ReAct loop via deepseek_client
# ═══════════════════════════════════════════════════════════════════════════

def _spec_from_bundle(
    state_key: str,
    task_prompt: str,
    *,
    bundle_slug: str | None = None,
) -> tuple[str, str, str, list]:
    """Build a phase1/phase2 spec tuple from an HF agent bundle.

    `state_key` is the ResearchState dict key (e.g., "web_research", "bio").
    `bundle_slug` overrides the bundle name when state_key diverges from slug.
    """
    from hf_agent import load_agent, resolve_tools

    slug = bundle_slug or state_key.replace("_", "-")
    bundle = load_agent(slug)
    tools = resolve_tools(bundle, _TOOL_DEFS) if bundle.tools else []
    return (state_key, bundle.system_prompt, task_prompt, tools)


async def _run_agent_bundle(
    client,
    slug: str,
    task_prompt: str,
    *,
    fallback_client=None,
) -> str:
    """Run a direct agent call (no state-key spec) from an HF bundle.
    Falls back to fallback_client on 402/Payment Required errors."""
    from hf_agent import load_agent, resolve_tools

    bundle = load_agent(slug)
    tools = resolve_tools(bundle, _TOOL_DEFS) if bundle.tools else None
    if fallback_client:
        return await _run_with_hf_fallback(client, fallback_client, bundle.system_prompt, task_prompt, tools)
    return await _run_agent(client, bundle.system_prompt, task_prompt, tools)


def _hf_or_mlx_client():
    """Return (primary_client, fallback_client). Primary is HF if available, fallback is MLX."""
    hf = _make_hf_client()
    mlx = _make_client()
    return (hf, mlx) if hf else (mlx, None)


async def _run_with_hf_fallback(client, fallback_client, system_prompt: str, task: str, tools=None) -> str:
    """Run agent on primary client; if 402/auth error, retry on fallback."""
    try:
        result = await _run_agent(client, system_prompt, task, tools)
        if "(agent error:" in result and ("402" in result or "Payment Required" in result):
            raise RuntimeError(result)
        return result
    except Exception as e:
        if fallback_client and ("402" in str(e) or "Payment Required" in str(e)):
            console.print(f"  [yellow]↻[/] HF 402 — falling back to MLX")
            return await _run_agent(fallback_client, system_prompt, task, tools)
        raise


async def _run_agent(
    client,
    system_prompt: str,
    task: str,
    tools=None,
    *,
    temperature: float | None = None,
    extra_kwargs: dict | None = None,
) -> str:
    """Run a single ReAct agent with the given system prompt, task, and tools.

    `temperature` and `extra_kwargs` (e.g. {"seed": 7}) are forwarded to
    `client.chat()`. Both clients accept arbitrary **kwargs; the HF backend
    honours `seed`, MLX silently ignores it.

    Hard-capped at `_AGENT_TIMEOUT` seconds; returns a timeout marker on overrun.
    """
    try:
        return await asyncio.wait_for(
            _run_agent_impl(client, system_prompt, task, tools, temperature, extra_kwargs),
            timeout=_AGENT_TIMEOUT,
        )
    except asyncio.TimeoutError:
        console.print(f"[red]Agent timeout after {_AGENT_TIMEOUT}s[/]")
        return f"(agent timeout after {_AGENT_TIMEOUT}s)"


async def _run_agent_impl(
    client,
    system_prompt: str,
    task: str,
    tools,
    temperature: float | None,
    extra_kwargs: dict | None,
) -> str:
    extra = dict(extra_kwargs or {})
    if temperature is not None:
        extra.setdefault("temperature", temperature)

    try:
        messages = [
            ChatMessage(role="system", content=system_prompt),
            ChatMessage(role="user", content=task),
        ]

        if not tools:
            resp = await client.chat(messages, **extra)
            return resp.choices[0].message.content or ""

        for _ in range(_MAX_REACT_ITERS):
            resp = await client.chat(messages, tools=tools, tool_choice="auto", **extra)
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
        resp = await client.chat(messages, **extra)
        return resp.choices[0].message.content or ""
    except Exception as e:
        console.print(f"[red]Agent error: {e}[/]")
        return f"(agent error: {e})"


async def _run_dual_lane(
    mlx_client,
    specs: list[tuple[str, str, str, list | None]],
    *,
    phase_label: str = "",
) -> dict[str, str]:
    """Run agents across two lanes: tool-heavy on MLX, synthesis on HF concurrently.

    Agents WITH tools → MLX (local, sequential — single GPU)
    Agents WITHOUT tools → HF 72B (remote, concurrent via asyncio.gather)

    When HF is unavailable, all agents run sequentially on MLX (fallback).
    """
    hf_client = _make_hf_client()
    results: dict[str, str] = {}

    # Partition into tool-heavy (MLX) and synthesis (HF) lanes
    mlx_specs: list[tuple[str, str, str, list | None]] = []
    hf_specs: list[tuple[str, str, str, list | None]] = []

    for spec in specs:
        key, sys_prompt, task_prompt, agent_tools = spec
        if key in _SKIP_AGENTS:
            results[key] = "(skipped)"
            console.print(f"  [yellow]⊘[/] {key} (skipped)")
            continue
        if agent_tools and hf_client:
            # Tool-heavy → MLX (needs local tool execution loop)
            mlx_specs.append(spec)
        elif not agent_tools and hf_client:
            # Pure synthesis → HF 72B (concurrent)
            hf_specs.append(spec)
        else:
            # No HF available — everything goes to MLX
            mlx_specs.append(spec)

    if hf_client and hf_specs:
        console.print(f"  [bold magenta]Dual-lane:[/] {len(mlx_specs)} agents → MLX local, "
                       f"{len(hf_specs)} agents → HF 72B concurrent")
    else:
        console.print(f"  [dim]Single-lane: {len(mlx_specs)} agents → MLX local (sequential)[/]")

    # Run both lanes concurrently
    pool = _get_mlx_pool()

    async def _mlx_lane() -> dict[str, str]:
        """MLX lane: parallel across N worker processes when _MLX_WORKERS > 1, else sequential."""
        lane_results: dict[str, str] = {}
        if pool is not None and mlx_specs:
            # Parallel: dispatch all specs to worker pool via starmap.
            pool_args = [
                (key, sp, tp, [t.function.name for t in (tools or [])] if tools else None)
                for key, sp, tp, tools in mlx_specs
            ]
            console.print(f"  [cyan]↗[/] dispatching {len(pool_args)} agents to {_MLX_WORKERS} MLX workers...")
            pairs = await asyncio.to_thread(pool.starmap, _mlx_worker_run, pool_args)
            for key, result in pairs:
                lane_results[key] = result
                console.print(f"  [green]✓[/] {key} ({len(result)} chars) [dim]← MLX worker[/]")
            return lane_results
        # Fallback: sequential on in-process MLX client.
        for key, sys_prompt, task_prompt, agent_tools in mlx_specs:
            try:
                result = await _run_agent(mlx_client, sys_prompt, task_prompt, agent_tools)
            except Exception as e:
                result = f"(agent error: {e})"
            lane_results[key] = result
            console.print(f"  [green]✓[/] {key} ({len(result)} chars) [dim]← MLX[/]")
        return lane_results

    hf_fallback_specs: list[tuple[str, str, str, list | None]] = []

    async def _hf_lane() -> dict[str, str]:
        """Concurrent execution on HF Inference API, with MLX fallback on 402/auth errors."""
        if not hf_client or not hf_specs:
            return {}

        async def _run_one(key: str, sys_prompt: str, task_prompt: str, agent_tools) -> tuple[str, str]:
            try:
                result = await _run_agent(hf_client, sys_prompt, task_prompt, agent_tools)
                if "(agent error:" in result and ("402" in result or "Payment Required" in result or "401" in result):
                    raise RuntimeError(result)
            except Exception as e:
                if "402" in str(e) or "Payment Required" in str(e) or "401" in str(e):
                    console.print(f"  [yellow]↻[/] {key} — HF 402, queuing MLX fallback")
                    hf_fallback_specs.append((key, sys_prompt, task_prompt, agent_tools))
                    return key, ""
                result = f"(agent error: {e})"
            console.print(f"  [green]✓[/] {key} ({len(result)} chars) [dim]← HF 72B[/]")
            return key, result

        pairs = await asyncio.gather(*[
            _run_one(key, sp, tp, tools) for key, sp, tp, tools in hf_specs
        ])
        return dict(pairs)

    mlx_results, hf_results = await asyncio.gather(_mlx_lane(), _hf_lane())
    results.update(mlx_results)
    results.update(hf_results)

    if hf_fallback_specs:
        names = [s[0] for s in hf_fallback_specs]
        console.print(f"  [bold yellow]Falling back:[/] {len(hf_fallback_specs)} agents → MLX local (HF credits exhausted): {', '.join(names)}")
        if pool is not None:
            pool_args = [
                (key, sp, tp, [t.function.name for t in (tools or [])] if tools else None)
                for key, sp, tp, tools in hf_fallback_specs
            ]
            pairs = await asyncio.to_thread(pool.starmap, _mlx_worker_run, pool_args)
            for key, result in pairs:
                results[key] = result
                console.print(f"  [green]✓[/] {key} ({len(result)} chars) [dim]← MLX worker fallback[/]")
        else:
            for key, sys_prompt, task_prompt, agent_tools in hf_fallback_specs:
                console.print(f"  [dim]  → running {key} on MLX...[/]")
                try:
                    result = await _run_agent(mlx_client, sys_prompt, task_prompt, agent_tools)
                except Exception as e:
                    console.print(f"  [red]  → {key} fallback error: {e}[/]")
                    result = f"(agent error: {e})"
                results[key] = result
                console.print(f"  [green]✓[/] {key} ({len(result)} chars) [dim]← MLX fallback[/]")

    return results


def _ctx_block(label: str, content: str) -> str:
    """Format a context block for inclusion in agent prompts."""
    if not content or content.strip().startswith("("):
        return ""
    return f"\n### {label}\n{content[:6000]}\n"


def _build_context(
    state: ResearchState,
    primary: list[tuple[str, str]],
    secondary: list[tuple[str, str]] | None = None,
    *,
    primary_limit: int = 8000,
    secondary_limit: int = 3000,
) -> str:
    """Build context from state with primary sources getting more space."""
    parts = []
    for label, key in primary:
        content = state.get(key, "")
        if not content or (isinstance(content, str) and content.strip().startswith("(")):
            continue
        parts.append(f"\n### {label}\n{str(content)[:primary_limit]}\n")
    for label, key in (secondary or []):
        content = state.get(key, "")
        if not content or (isinstance(content, str) and content.strip().startswith("(")):
            continue
        parts.append(f"\n### {label}\n{str(content)[:secondary_limit]}\n")
    return "".join(parts)


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
    academic_url = person.get("academicUrl", "")
    ctx = f"{name} ({role} @ {org})"

    console.print("\n[bold cyan]Phase 1: Intelligence Gathering (8 agents in parallel)[/]")

    tools_search = TOOLS_SEARCH
    tools_news = TOOLS_NEWS
    tools_academic = TOOLS_ACADEMIC

    # Specs now load system prompts from HF agent bundles (see hf_agent.load_agent).
    # Each spec: (state_key, system_prompt, task_prompt, tools) — system+tools come
    # from the bundle; task is rendered here with per-request ctx vars.
    specs: list[tuple[str, str, str, list | None]] = [
        _spec_from_bundle(
            "web_research",
            f"Research {ctx} using web search. Generate 8-10 diverse search queries covering: "
            f"recent news, technical blog posts, conference talks, interviews, open-source "
            f"projects, AI opinions, and career history. ALWAYS include the role or org "
            f"('{role}', '{org}') in every query to disambiguate from other people named {name}. "
            f"Run each query with web_search, then fetch the most promising URLs with fetch_url_content. "
            f"Return a structured summary of findings organized by theme with source URLs.",
        ),
        _spec_from_bundle(
            "github_data",
            f"Fetch and analyze the GitHub profile for {ctx}. "
            f"GitHub username: '{github or 'unknown — use web_search to find it first'}'. "
            f"If the username is unknown, search for '{name} github' to find it. "
            f"Analyze: bio, company, follower count, top repositories by stars, notable "
            f"projects, and what they reveal about technical focus and community impact.",
        ),
        _spec_from_bundle(
            "academic_data",
            f"Build a comprehensive academic profile for {ctx}.\n"
            f"Available identifiers:\n"
            f"  - ORCID iD: '{orcid or 'none'}'\n"
            f"  - Academic profile URL: '{academic_url or 'none'}'\n\n"
            f"Strategy:\n"
            f"1. If an ORCID iD is provided, fetch it with fetch_orcid_profile.\n"
            f"2. If an academic profile URL is provided (Academia.edu, ResearchGate, etc.), "
            f"fetch it with fetch_academic_profile.\n"
            f"3. If neither is provided, search the web for '{name} academia.edu OR "
            f"researchgate OR google scholar site:scholar.google.com' to discover profiles, "
            f"then fetch the best match with fetch_academic_profile.\n\n"
            f"Summarize: researcher name, institution, research interests, bio, "
            f"and list publications with year, title, and DOI where available.",
        ),
        _spec_from_bundle(
            "arxiv_data",
            f"Search arXiv and Semantic Scholar for papers by or about {ctx}. "
            f"Search queries should include: '{name}' as author, '{name} {org}', "
            f"and key technical terms associated with their work. "
            f"From Semantic Scholar, extract: h-index, total citations, paper count, "
            f"and their top-cited papers. From arXiv, find recent preprints. "
            f"Identify their most influential papers by citation count.",
        ),
        _spec_from_bundle(
            "podcast_data",
            f"Find all podcast appearances and media interviews for {ctx}. "
            f"Search for: '{name} podcast interview', '{name} {org} podcast', "
            f"'{name} keynote talk', '{name} YouTube interview'. "
            f"For each appearance, identify: show name, episode title, date, "
            f"key topics discussed, and any notable quotes or moments. "
            f"Check major AI podcasts: Lex Fridman, Dwarkesh Podcast, No Priors, "
            f"Latent Space, All-In Podcast, This Week in Startups.",
        ),
        _spec_from_bundle(
            "news_data",
            f"Find all recent news and press coverage about {ctx} from the last 12 months. "
            f"Search for: '{name} {org}', '{name} announcement', '{name} funding', "
            f"'{name} launch', '{name} interview'. Use web_news_search for recent articles "
            f"and web_search for deeper coverage. "
            f"Categorize findings into: Product Launches, Funding/Business, "
            f"Partnerships, Controversies, Industry Commentary.",
        ),
        _spec_from_bundle(
            "hf_data",
            f"Analyze the HuggingFace presence for {ctx}. "
            f"Try fetching HuggingFace data for username '{github or name.lower().replace(' ', '')}' "
            f"and also try the organization name '{org.lower().replace(' ', '')}'. "
            f"If the person doesn't have a HuggingFace presence, search for "
            f"'{name} huggingface' to find their profile. "
            f"Analyze: total models, downloads, likes, popular model architectures, "
            f"datasets published, and Spaces created.",
        ),
        _spec_from_bundle(
            "video_data",
            f"Find YouTube videos and other video content featuring {ctx}. "
            f"Search strategy:\n"
            f"(1) Use video_search for: '{name} {org}', '{name} talk', '{name} interview'\n"
            f"(2) If few results, use web_search for: 'site:youtube.com \"{name}\"'\n"
            f"(3) Use fetch_url_content on promising YouTube URLs to verify content\n"
            f"For each video, identify: title, URL, platform (YouTube/Vimeo/etc), "
            f"upload date, duration, channel/uploader, and a brief description. "
            f"FILTERING RULES:\n"
            f"- Include videos where {name} appears as speaker/guest/presenter\n"
            f"- Include substantive videos prominently about {name}'s work or projects\n"
            f"- EXCLUDE third-party tutorials not about {name} directly\n"
            f"- EXCLUDE videos by other people with similar names\n\n"
            f"Output a JSON array: "
            f'[{{"title": "...", "url": "https://...", "platform": "YouTube", '
            f'"date": "YYYY-MM-DD", "duration": "MM:SS", '
            f'"channel": "...", "description": "..."}}]',
        ),
    ]

    # Blog agent — only if personality has a blog URL
    blog_url = person.get("blogUrl", "")
    if blog_url:
        specs.append(_spec_from_bundle(
            "blog_data",
            f"Analyze the personal blog of {ctx} at {blog_url}.\n"
            f"Step 1: Fetch the blog's RSS feed using fetch_blog_rss with URL '{blog_url}'.\n"
            f"Step 2: From the feed, identify ALL blog posts. For each post extract:\n"
            f"  - title, date (YYYY-MM-DD), URL, and a 1-sentence summary from the description.\n"
            f"Step 3: Deep-read the 5-8 most significant/recent posts using fetch_blog_post_content "
            f"to extract richer summaries, key quotes, and technical opinions.\n"
            f"Step 4: Tag each post with 1-3 topic tags (e.g. 'ai-tools', 'swift', 'agentic-engineering').\n\n"
            f"Output a JSON object with two fields:\n"
            f'  "posts": [{{"title": "...", "url": "https://...", "date": "YYYY-MM-DD", '
            f'"summary": "one sentence", "tags": ["tag1", "tag2"]}}]\n'
            f'  "themes": ["recurring theme 1", "recurring theme 2", ...]',
        ))

    results = await _run_dual_lane(client, specs, phase_label="Phase 1")
    return results


# ═══════════════════════════════════════════════════════════════════════════
# Phase 1.5: Wikipedia + Deep URL Fetch
# ═══════════════════════════════════════════════════════════════════════════

async def phase1_5(state: ResearchState) -> dict:
    """Phase 1.5: Fetch Wikipedia article and deep-fetch top URLs from web_research."""
    person = state["person"]
    name = person.get("name", "")
    role = person.get("role", "")
    org = person.get("org", "")

    console.print("\n[bold cyan]Phase 1.5: Wikipedia + Deep URL Fetch[/]")

    # 1. Wikipedia summary
    wiki_query = f"{name} {org}" if org else name
    wiki = await asyncio.to_thread(fetch_wikipedia_summary, wiki_query)
    console.print(f"  [green]✓[/] wikipedia_data ({len(wiki)} chars)")

    # 2. Extract top URLs from web_research and deep-fetch them
    web_research = state.get("web_research", "")
    urls = re.findall(r'https?://[^\s\)\]>]+', web_research)
    seen: set[str] = set()
    unique_urls: list[str] = []
    for url in urls:
        domain = urlparse(url).netloc
        if domain not in seen and domain not in _SKIP_DOMAINS:
            seen.add(domain)
            unique_urls.append(url)
            if len(unique_urls) >= 5:
                break

    fetched = await asyncio.gather(*[
        asyncio.to_thread(fetch_url_content, url) for url in unique_urls
    ])
    deep_content = "\n\n".join(
        f"### {url}\n{content[:4000]}"
        for url, content in zip(unique_urls, fetched)
        if content and not content.startswith("(")
    )
    console.print(f"  [green]✓[/] deep_fetched_urls ({len(deep_content)} chars from {len(unique_urls)} URLs)")

    return {"wikipedia_data": wiki, "deep_fetched_urls": deep_content}


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

    # Build context from Phase 1 + 1.5 results
    all_p1 = (
        _ctx_block("Web Research", state.get("web_research", ""))
        + _ctx_block("Wikipedia", state.get("wikipedia_data", ""))
        + _ctx_block("Deep-Fetched URLs", state.get("deep_fetched_urls", ""))
        + _ctx_block("GitHub Profile", state.get("github_data", ""))
        + _ctx_block("Academic Profiles", state.get("academic_data", ""))
        + _ctx_block("arXiv & Semantic Scholar", state.get("arxiv_data", ""))
        + _ctx_block("Podcast & Media", state.get("podcast_data", ""))
        + _ctx_block("News & Press", state.get("news_data", ""))
        + _ctx_block("HuggingFace", state.get("hf_data", ""))
        + _ctx_block("Video Content", state.get("video_data", ""))
        + _ctx_block("Blog Posts", state.get("blog_data", ""))
    )

    # Selective context for specific agents
    bio_ctx = _build_context(state,
        primary=[("Web Research", "web_research"), ("Wikipedia", "wikipedia_data"), ("Deep-Fetched URLs", "deep_fetched_urls"), ("Blog Posts", "blog_data")],
        secondary=[("GitHub Profile", "github_data"), ("News & Press", "news_data"), ("arXiv & Semantic Scholar", "arxiv_data")],
    )
    timeline_ctx = _build_context(state,
        primary=[("Web Research", "web_research"), ("Wikipedia", "wikipedia_data"), ("News & Press", "news_data"), ("Blog Posts", "blog_data")],
        secondary=[("GitHub Profile", "github_data"), ("arXiv & Semantic Scholar", "arxiv_data"), ("Deep-Fetched URLs", "deep_fetched_urls")],
    )
    quote_ctx = _build_context(state,
        primary=[("Deep-Fetched URLs", "deep_fetched_urls"), ("Blog Posts", "blog_data"), ("Podcast & Media", "podcast_data"), ("Web Research", "web_research")],
        secondary=[("News & Press", "news_data"), ("Wikipedia", "wikipedia_data")],
    )
    social_ctx = _build_context(state,
        primary=[("Web Research", "web_research"), ("GitHub Profile", "github_data")],
        secondary=[("HuggingFace", "hf_data"), ("Wikipedia", "wikipedia_data"), ("Blog Posts", "blog_data")],
    )
    contrib_ctx = _build_context(state,
        primary=[("Web Research", "web_research"), ("GitHub Profile", "github_data"), ("arXiv & Semantic Scholar", "arxiv_data")],
        secondary=[("HuggingFace", "hf_data"), ("Deep-Fetched URLs", "deep_fetched_urls"), ("Blog Posts", "blog_data")],
    )

    specs: list[tuple[str, str, str, list | None]] = [
        _spec_from_bundle(
            "bio",
            f"Write a precise 4-6 sentence biography for {ctx} synthesizing the following research:\n"
            f"{bio_ctx}\n"
            f"Focus on: career origin or founding story, key technical achievements, "
            f"current role and impact, what makes them unique in AI/tech. "
            f"Be specific — name actual projects, frameworks, papers, or companies. "
            f"Every sentence must contain a verifiable, specific fact. "
            f"If the person is less well-known, use web_search to find additional info.",
        ),
        _spec_from_bundle(
            "timeline",
            f"Build a chronological timeline of key career events for {ctx} "
            f"using the following research:\n{timeline_ctx}\n"
            f"Include: education milestones, job changes, major product/paper launches, "
            f"funding rounds, conference keynotes, notable interviews, open-source releases, "
            f"and GitHub repo creation dates. "
            f"Each event requires: date (YYYY-MM format), description, source URL. "
            f"Aim for at least 10-15 events covering the full career arc. "
            f"If the context is thin, search for '{name} career history', '{name} biography', "
            f"'{name} curriculum vitae', '{name} {org} founded' to find more dates.\n\n"
            f'Output a JSON array: [{{"date": "YYYY-MM", "event": "description", "url": "https://..."}}]',
        ),
        _spec_from_bundle(
            "contributions",
            f"Identify and describe the 3-6 most significant technical contributions of {ctx}. "
            f"Based on this research:\n{contrib_ctx}\n"
            f"For each: what is it, why does it matter, what impact has it had (adoption, "
            f"citations, derivatives), who uses it, what numbers validate its importance.\n\n"
            f'Output a JSON array: [{{"title": "name", "description": "2-3 sentences", "url": "https://..."}}]',
        ),
        _spec_from_bundle(
            "quotes",
            f"Find 3-5 authentic, verbatim quotes from {ctx} in interviews, podcasts, "
            f"blog posts, or public talks. Based on this research:\n"
            f"{quote_ctx}\n"
            f"Strategy: "
            f"(1) Search for '{name} quote' and '{name} transcript' "
            f"(2) Fetch podcast show-notes and transcript URLs from the context above "
            f"(3) Search for '{name} blog post' or '{name} \"I think\" OR \"I believe\" OR \"We need\"' "
            f"(4) Use fetch_url_content on the most promising results to extract exact quotes. "
            f"CRITICAL: Every quote MUST be exact text, not paraphrased. "
            f"If you cannot find exact quotes with source URLs, return an empty array [].\n\n"
            f'Output a JSON array: [{{"text": "verbatim quote", "source": "podcast/article name", "url": "https://..."}}]',
        ),
        _spec_from_bundle(
            "social",
            f"Map all verified public social profiles and online presence for {ctx}. "
            f"Based on this research:\n{social_ctx}\n"
            f"Strategy: "
            f"(1) Check these candidate URLs with check_social_url:\n"
            f"    - https://github.com/{person.get('github', name.lower().replace(' ', ''))}\n"
            f"    - https://huggingface.co/{person.get('github', name.lower().replace(' ', ''))}\n"
            f"    - https://www.linkedin.com/in/{name.lower().replace(' ', '-')}\n"
            f"(2) Search: '{name} {org} site:substack.com OR site:medium.com OR site:twitter.com'\n"
            f"(3) Search: '{name} personal website blog'\n"
            f"Only include URLs confirmed with HTTP 200 via check_social_url.\n\n"
            f'Output a JSON object: {{"github": "https://...", "twitter": "https://...", "website": "https://..."}}',
        ),
        _spec_from_bundle(
            "topics",
            f"Extract 5-10 specific technical topics representing {ctx}'s core expertise "
            f"based on all research gathered:\n{all_p1}\n"
            f"Be specific (e.g. 'multi-agent AI systems', 'RAG pipeline architecture', "
            f"'transformer inference optimization') not vague (e.g. 'AI', 'machine learning').\n\n"
            f'Output a JSON array: ["topic1", "topic2", ...]',
        ),
        _spec_from_bundle(
            "competitive",
            f"Analyze the competitive landscape around {ctx}. Based on:\n"
            f"{_ctx_block('Web Research', state.get('web_research', ''))}"
            f"{_ctx_block('GitHub Profile', state.get('github_data', ''))}"
            f"{_ctx_block('News & Press', state.get('news_data', ''))}\n"
            f"Identify: direct competitors, differentiators, market position, "
            f"comparative traction metrics.\n\n"
            f'Output a JSON object: {{"market_position": "leader/challenger/niche", '
            f'"competitors": [{{"name": "...", "relationship": "...", "differentiation": "..."}}], '
            f'"moats": ["..."], "ecosystem_role": "..."}}',
        ),
        _spec_from_bundle(
            "collaboration",
            f"Map the professional collaboration network of {ctx}. Based on:\n"
            f"{_ctx_block('Web Research', state.get('web_research', ''))}"
            f"{_ctx_block('arXiv & Semantic Scholar', state.get('arxiv_data', ''))}"
            f"{_ctx_block('ORCID / Academic', state.get('orcid_data', ''))}\n"
            f"Identify co-founders, co-authors, mentors, mentees, advisors.\n\n"
            f'Output a JSON object: {{"co_founders": ["..."], "key_collaborators": '
            f'[{{"name": "...", "relationship": "...", "context": "..."}}], '
            f'"mentors": ["..."], "mentees": ["..."], "academic_lineage": "..."}}',
        ),
        _spec_from_bundle(
            "funding",
            f"Research the funding history and business milestones for {ctx}. Based on:\n"
            f"{_ctx_block('Web Research', state.get('web_research', ''))}"
            f"{_ctx_block('News & Press', state.get('news_data', ''))}\n"
            f"For each funding round: date, amount, lead investors, valuation if known.\n\n"
            f'Output a JSON object: {{"funding_rounds": [{{"date": "...", "round": "...", '
            f'"amount": "...", "investors": "...", "valuation": "..."}}], '
            f'"total_raised": "$...", "latest_valuation": "...", '
            f'"business_milestones": [{{"date": "...", "event": "..."}}], '
            f'"revenue_signals": "..."}}',
        ),
        _spec_from_bundle(
            "conference",
            f"Find all major conference talks, keynotes, and speaking engagements for {ctx}. Based on:\n"
            f"{_ctx_block('Web Research', state.get('web_research', ''))}"
            f"{_ctx_block('Podcast & Media', state.get('podcast_data', ''))}\n"
            f"For each: event name, talk title, date, type (keynote/panel/workshop/demo).\n\n"
            f'Output a JSON object: {{"speaking_tier": "thought-leader/regular/occasional/rare", '
            f'"talks": [{{"event": "...", "title": "...", "date": "...", "type": "...", "url": "..."}}], '
            f'"notable_moments": ["..."]}}',
        ),
        _spec_from_bundle(
            "philosophy",
            f"Analyze the technical philosophy and vision of {ctx}. Based on:\n"
            f"{_ctx_block('Web Research', state.get('web_research', ''))}"
            f"{_ctx_block('Blog Posts', state.get('blog_data', ''))}"
            f"{_ctx_block('Podcast & Media', state.get('podcast_data', ''))}"
            f"{_ctx_block('News & Press', state.get('news_data', ''))}\n"
            f"Extract positions on: AGI timeline, open source vs proprietary, AI safety, "
            f"scaling laws, architecture preferences, future of software development.\n\n"
            f'Output a JSON object: {{"core_thesis": "...", '
            f'"positions": {{"topic": {{"stance": "...", "evidence": "...", "source_url": "..."}}}}, '
            f'"predictions": [{{"prediction": "...", "date_made": "...", "timeframe": "..."}}], '
            f'"contrarian_takes": ["..."]}}',
        ),
    ]

    results = await _run_dual_lane(client, specs, phase_label="Phase 2")
    return results


# ═══════════════════════════════════════════════════════════════════════════
# Phase 3: Synthesis & Evaluation (2 agents, sequential)
# ═══════════════════════════════════════════════════════════════════════════

async def phase3_eval(state: ResearchState) -> dict:
    client, fallback = _hf_or_mlx_client()
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

    result = await _run_agent_bundle(
        client,
        "quality-evaluator",
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
        f'"overall_score": 8, "summary": "..."}}',
        fallback_client=fallback,
    )

    console.print(f"  [green]✓[/] eval ({len(result)} chars)")
    return {"eval_data": result}


async def phase3_exec(state: ResearchState) -> dict:
    client, fallback = _hf_or_mlx_client()
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
        + _ctx_block("Video Content", state.get("video_data", ""))
        + _ctx_block("Blog Posts", state.get("blog_data", ""))
    )

    result = await _run_agent_bundle(
        client,
        "executive-summary",
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
        f'"confidence_level": "high/medium/low with reasoning"}}',
        fallback_client=fallback,
    )

    console.print(f"  [green]✓[/] executive ({len(result)} chars)")
    return {"executive": result}


# ── Per-person question categories ────────────────────────────────────────
# Each person can have domain-specific categories. Falls back to DEFAULT_CATEGORIES.

DEFAULT_CATEGORIES: dict[str, str] = {
    "origin": "pivotal decisions or turning points that shaped their career path",
    "philosophy": "contrarian views, intellectual tensions, or where they disagree with mainstream",
    "collaboration": "relationships, partnerships, or ecosystem dynamics that shaped key projects",
    "future": "specific predictions, bets, or visions for where the field is heading",
}

PERSON_CATEGORIES: dict[str, dict[str, str]] = {
    "athos-georgiou": {
        "origin": "founding NCA, career transition from telescope control systems to AI, the spark that shifted focus from infrastructure to applied AI research",
        "philosophy": "responsible AI stance, 'raising AI' parent-child metaphor, whether GenAI alone is the answer, enterprise AI value gap",
        "collaboration": "Claude Code ecosystem contributions, open-source community dynamics, bridging research and production",
        "future": "enterprise AI adoption gap, GPU inference scaling roadmap, vision-language retrieval becoming production-standard",
        "vision_retrieval": "ColPali and ColQwen models, late-interaction retrieval, multimodal document understanding, ViDoRe benchmark results",
        "gpu_optimization": "GPU inference benchmarking, large-parameter model inference, dtype choices, memory optimization strategies",
    },
}

# Blog search queries per category (for embedding-based context retrieval)
BLOG_QUERIES: dict[str, dict[str, list[str]]] = {
    "athos-georgiou": {
        "origin": ["career journey NCA founding", "telescope infrastructure transition AI", "doing stuff learning journey 2023"],
        "philosophy": ["raising artificial intelligence responsibility", "generative AI answer everything limitations", "AI value gap enterprise adoption"],
        "collaboration": ["Claude Code plugin kimchi-cult", "open source community contribution", "bridging research production"],
        "future": ["enterprise AI adoption future", "GPU inference scaling roadmap", "vision language retrieval production"],
        "vision_retrieval": ["ColPali ColQwen vision retrieval document", "Vidore benchmark GPU VRAM", "spatially grounded document retrieval"],
        "gpu_optimization": ["GPU inference benchmark optimization", "inference optimization GPU memory", "dtype batch size OOM strategies"],
    },
}


def _get_blog_context(slug: str, categories: dict[str, str]) -> str:
    """Search blog embeddings for each category and return formatted context."""
    if search_blog_results is None:
        return ""

    queries = BLOG_QUERIES.get(slug, {})
    if not queries:
        return ""

    # Check if LanceDB table exists for this slug
    lance_dir = PROJECT_ROOT / "lance_blogs"
    if not lance_dir.exists():
        return ""

    import lancedb
    db = lancedb.connect(str(lance_dir))
    table_name = f"blog_{slug.replace('-', '_')}"
    if table_name not in db.table_names():
        return ""

    context_parts: list[str] = []
    seen_titles: set[str] = set()

    for cat in categories:
        cat_queries = queries.get(cat, [])
        cat_posts: list[str] = []
        for q in cat_queries:
            results = search_blog_results(slug, q, top_k=5)
            for r in results:
                title = r["title"]
                if title not in seen_titles:
                    seen_titles.add(title)
                    cat_posts.append(f"  - \"{title}\" ({r.get('date', '')}): {r['text'][:200]}")

        if cat_posts:
            context_parts.append(f"[{cat}]\n" + "\n".join(cat_posts[:5]))

    if context_parts:
        return "\n\n=== BLOG POST CONTEXT (reference these in questions) ===\n" + "\n\n".join(context_parts)
    return ""


async def question_generator(state: ResearchState) -> dict:
    client, fallback = _hf_or_mlx_client()
    person = state["person"]
    slug = person.get("slug", "")
    ctx = f"{person.get('name', '')} ({person.get('role', '')} @ {person.get('org', '')})"

    console.print("\n[bold cyan]Phase 3c: Question Generator[/]")

    # Get person-specific categories or default (cap at 7)
    categories = PERSON_CATEGORIES.get(slug, DEFAULT_CATEGORIES)
    if len(categories) > 7:
        core = dict(list(categories.items())[:5])
        domain = dict(list(categories.items())[5:7])
        categories = {**core, **domain}
    num_questions = len(categories) * 2

    console.print(f"  Categories: {len(categories)} ({', '.join(categories.keys())})")
    console.print(f"  Target: {num_questions} questions")

    all_context = (
        _ctx_block("Biography", state.get("bio", ""))
        + _ctx_block("Timeline", state.get("timeline", ""))
        + _ctx_block("Contributions", state.get("contributions", ""))
        + _ctx_block("Quotes", state.get("quotes", ""))
        + _ctx_block("Technical Philosophy", state.get("philosophy", ""))
        + _ctx_block("Competitive Landscape", state.get("competitive", ""))
        + _ctx_block("Collaboration Network", state.get("collaboration", ""))
        + _ctx_block("Funding", state.get("funding", ""))
        + _ctx_block("Executive Summary", state.get("executive", ""))
        + _ctx_block("Podcast & Media", state.get("podcast_data", ""))
        + _ctx_block("News", state.get("news_data", ""))
        + _ctx_block("Conferences", state.get("conference", ""))
        + _ctx_block("Blog Posts", state.get("blog_data", ""))
    )

    # Add blog embedding context if available
    blog_context = _get_blog_context(slug, categories)
    if blog_context:
        all_context += blog_context
        console.print(f"  [green]✓[/] Blog embedding context loaded")

    # Build category listing for prompt
    cat_lines = "\n".join(
        f"{i}. {cat} — {desc}"
        for i, (cat, desc) in enumerate(categories.items(), 1)
    )
    cat_names = "|".join(categories.keys())

    result = await _run_agent_bundle(
        client,
        "interview-questions",
        f"Generate {num_questions} high-quality interview questions for a podcast episode featuring {ctx}.\n"
        f"Use the following research to make questions specific and probing:\n{all_context}\n\n"
        f"Question categories (exactly 2 per category):\n{cat_lines}\n\n"
        f"Rules:\n"
        f"- Reference actual project names, papers, quotes, blog post titles, or events from the research\n"
        f"- Each question must be standalone (no follow-ups or 'building on the previous...')\n"
        f"- Keep each question under 40 words\n"
        f"- For each question, explain WHY this question matters and what INSIGHT you expect it to reveal\n"
        f"- Check the person's prior podcast appearances and do NOT repeat questions they've likely been asked\n"
        f"- When blog post titles are in the context, weave them into questions naturally\n"
        f"- Use AT LEAST 4 different question structures across your output:\n"
        f"  * Open narrative: 'Walk me through...'\n"
        f"  * Comparative: 'How does X compare to Y...'\n"
        f"  * Counterfactual: 'If you had to rebuild X without Y...'\n"
        f"  * Contrarian: 'Critics say X. Where are they wrong?'\n"
        f"  * Surprise/failure: 'What surprised you most about...'\n"
        f"  * Forward-looking: 'What would need to be true for...'\n"
        f"- Do NOT use 'In your [artifact], you [claim]. What specific...' more than twice total\n"
        f"- No more than 3 questions may start with the same 2-word prefix (e.g., 'How does', 'What are')\n\n"
        f"Output a JSON array of exactly {num_questions} objects:\n"
        f'{{"category": "{cat_names}", '
        f'"question": "the question text", '
        f'"why_this_question": "1-sentence reason this question is worth asking", '
        f'"expected_insight": "what kind of answer this should draw out"}}',
        fallback_client=fallback,
    )

    console.print(f"  [green]✓[/] questions ({len(result)} chars)")
    return {"questions": result}


# ═══════════════════════════════════════════════════════════════════════════
# JSON extraction helper
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


# ═══════════════════════════════════════════════════════════════════════════
# Re-research loop — targeted retry for weak dimensions
# ═══════════════════════════════════════════════════════════════════════════

def _should_reresearch(state: ResearchState) -> str:
    """Decide whether to re-research or proceed to executive summary."""
    if state.get("reresearch_count", 0) >= 1:
        return "phase3_exec"

    eval_text = state.get("eval_data", "")
    eval_data = _extract_json(eval_text)
    if not eval_data or not isinstance(eval_data, dict):
        return "phase3_exec"

    overall = eval_data.get("overall_score", 10)
    weak_dims = []
    for dim in ("bio_quality", "source_coverage", "timeline_completeness", "contributions_depth"):
        score = eval_data.get(dim, {})
        if isinstance(score, dict) and score.get("score", 10) < 5:
            weak_dims.append(dim)

    if overall < 7 or len(weak_dims) >= 1:
        return "reresearch"
    return "phase3_exec"


async def reresearch(state: ResearchState) -> dict:
    """Targeted re-research for weak dimensions."""
    client = _make_client()
    person = state["person"]
    name = person.get("name", "")
    org = person.get("org", "")
    ctx = f"{name} ({person.get('role', '')} @ {org})"

    console.print("\n[bold yellow]Re-research: targeting weak dimensions[/]")

    eval_data = _extract_json(state.get("eval_data", "")) or {}
    updates: dict[str, Any] = {"reresearch_count": state.get("reresearch_count", 0) + 1}

    tasks: list[tuple[str, Any]] = []

    # Re-research timeline if weak
    tl_score = eval_data.get("timeline_completeness", {})
    if isinstance(tl_score, dict) and tl_score.get("score", 10) < 6:
        console.print("  [yellow]→[/] Re-researching timeline")
        tasks.append(("timeline", _run_agent_bundle(client,
            "timeline-recovery",
            f"The previous timeline for {ctx} was incomplete. Try harder:\n"
            f"Search for: '{name} career history', '{name} biography timeline', "
            f"'{name} curriculum vitae', '{name} {org} founded when', "
            f"'{name} education university'. "
            f"Also try Wikipedia: fetch_wikipedia_summary for '{name}'. "
            f"Previous research context:\n"
            f"{_ctx_block('Web Research', state.get('web_research', ''))}"
            f"{_ctx_block('Wikipedia', state.get('wikipedia_data', ''))}\n"
            f"Previous timeline:\n{state.get('timeline', '')}\n"
            f"Find MORE events with verified dates.\n\n"
            f'Output a JSON array: [{{"date": "YYYY-MM", "event": "description", "url": "https://..."}}]',
        )))

    # Re-research quotes if empty
    existing_quotes = _extract_json(state.get("quotes", "")) or []
    if not existing_quotes:
        console.print("  [yellow]→[/] Re-researching quotes")
        tasks.append(("quotes", _run_agent_bundle(client,
            "quote-recovery",
            f"No quotes were found for {ctx} in the first pass. Try harder:\n"
            f"Search for: '{name} transcript', '{name} blog post', "
            f"'{name} \"said\" OR \"stated\" OR \"wrote\"', '{name} interview quote'. "
            f"Fetch the top 3-5 results with fetch_url_content and extract exact quotes.\n"
            f"If you still cannot find any, return [].\n\n"
            f'Output a JSON array: [{{"text": "verbatim quote", "source": "name", "url": "https://..."}}]',
        )))

    # Re-research social if empty
    existing_social = _extract_json(state.get("social", "")) or {}
    if not existing_social:
        console.print("  [yellow]→[/] Re-researching social links")
        tasks.append(("social", _run_agent_bundle(client,
            "social-recovery",
            f"No social links were found for {ctx}. Try harder:\n"
            f"Check these URLs with check_social_url:\n"
            f"  - https://github.com/{name.lower().replace(' ', '')}\n"
            f"  - https://github.com/{name.lower().replace(' ', '-')}\n"
            f"  - https://www.linkedin.com/in/{name.lower().replace(' ', '-')}\n"
            f"  - https://www.linkedin.com/in/{name.lower().replace(' ', '')}\n"
            f"Also search: '{name} {org} github OR twitter OR linkedin OR website'\n"
            f"Only include URLs confirmed with HTTP 200.\n\n"
            f'Output a JSON object: {{"github": "https://...", "linkedin": "https://...", ...}}',
        )))

    if tasks:
        # Run re-research tasks concurrently
        async def _reresearch_one(key: str, coro) -> tuple[str, str]:
            result = await coro
            console.print(f"  [green]✓[/] {key} re-researched ({len(result)} chars)")
            return key, result

        pairs = await asyncio.gather(*[_reresearch_one(k, c) for k, c in tasks])
        for key, result in pairs:
            updates[key] = result
    else:
        console.print("  [dim]No dimensions need re-research[/]")

    return updates


# ═══════════════════════════════════════════════════════════════════════════
# Graph builder
# ═══════════════════════════════════════════════════════════════════════════

def build_graph(checkpointer=None):
    """Build the research graph.

    Args:
        checkpointer: Optional LangGraph checkpointer (e.g. MemorySaver) for
            resumable runs.  When provided, pass ``config={"configurable":
            {"thread_id": "<slug>"}}`` to ``ainvoke`` / ``astream``.
    """
    builder = StateGraph(ResearchState)
    builder.add_node("phase1", phase1)
    builder.add_node("phase1_5", phase1_5)
    builder.add_node("phase2", phase2)
    builder.add_node("phase3_eval", phase3_eval)
    builder.add_node("reresearch", reresearch)
    builder.add_node("phase3_exec", phase3_exec)
    builder.add_node("question_generator", question_generator)

    builder.add_edge(START, "phase1")
    builder.add_edge("phase1", "phase1_5")
    builder.add_edge("phase1_5", "phase2")
    builder.add_edge("phase2", "phase3_eval")
    builder.add_conditional_edges("phase3_eval", _should_reresearch,
        {"reresearch": "reresearch", "phase3_exec": "phase3_exec"})
    builder.add_edge("reresearch", "phase3_eval")
    builder.add_edge("phase3_exec", "question_generator")
    builder.add_edge("question_generator", END)

    return builder.compile(checkpointer=checkpointer)


# ═══════════════════════════════════════════════════════════════════════════
# Output assembly & export
# ═══════════════════════════════════════════════════════════════════════════

def export_results(state: ResearchState) -> None:
    person = state["person"]
    name = person.get("name", person["slug"])
    slug = person["slug"]

    console.rule(f"[bold green]Exporting: {name}[/]")

    bio = state.get("bio", "").strip()
    if len(bio) > 2000:
        bio = bio[:2000]

    timeline = _extract_json(state.get("timeline", "")) or []
    if not isinstance(timeline, list):
        timeline = []
    # Normalize and sort timeline dates to YYYY-MM format
    def _norm_date(d: str) -> str:
        """Normalize date to YYYY-MM: '2020' → '2020-01', '2020-06-15' → '2020-06'."""
        d = d.strip()
        if re.match(r"^\d{4}$", d):
            return d + "-01"
        if re.match(r"^\d{4}-\d{2}-\d{2}$", d):
            return d[:7]
        return d  # already YYYY-MM or unknown format

    for e in timeline:
        if isinstance(e, dict) and e.get("date"):
            e["date"] = _norm_date(e["date"])
    timeline = sorted(
        [e for e in timeline if isinstance(e, dict) and e.get("date")],
        key=lambda e: e["date"],
    )

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

    questions = _extract_json(state.get("questions", "")) or []
    if not isinstance(questions, list):
        questions = []

    podcast_appearances = _extract_json(state.get("podcast_data", "")) or []
    if not isinstance(podcast_appearances, list):
        podcast_appearances = []

    news_items = _extract_json(state.get("news_data", "")) or []
    if not isinstance(news_items, list):
        news_items = []

    videos = _extract_json(state.get("video_data", "")) or []
    if not isinstance(videos, list):
        videos = []

    blog_raw = _extract_json(state.get("blog_data", "")) or {}
    blog_posts = []
    if isinstance(blog_raw, dict):
        blog_posts = blog_raw.get("posts", [])
    elif isinstance(blog_raw, list):
        blog_posts = blog_raw
    if not isinstance(blog_posts, list):
        blog_posts = []

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
        "videos": [
            {
                "title": v.get("title", ""),
                "url": v.get("url", ""),
                "platform": v.get("platform", "YouTube"),
                "date": v.get("date", ""),
                "duration": v.get("duration", ""),
                "channel": v.get("channel", ""),
                "description": v.get("description", ""),
            }
            for v in videos if isinstance(v, dict) and v.get("url")
        ],
        "blog_posts": [
            {
                "title": b.get("title", ""),
                "url": b.get("url", ""),
                "date": b.get("date", ""),
                "summary": b.get("summary", ""),
                "tags": b.get("tags", []),
            }
            for b in blog_posts if isinstance(b, dict) and b.get("title")
        ],
        "competitive_landscape": competitive,
        "collaboration_network": collaboration,
        "funding": funding,
        "conferences": conference,
        "technical_philosophy": philosophy,
        "questions": [
            {
                "category": q.get("category", ""),
                "question": q.get("question", ""),
                "why_this_question": q.get("why_this_question", ""),
                "expected_insight": q.get("expected_insight", ""),
                "last_verified": now,
            }
            for q in questions if isinstance(q, dict) and q.get("question")
        ],
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
    academic_label = person.get('orcid') or person.get('academicUrl') or '—'
    console.print(f"  GitHub: {person.get('github', '—')}  |  Academic: {academic_label}\n")

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
    parser.add_argument("--academic-url", help="Academic profile URL (Academia.edu, ResearchGate, Google Scholar)")
    parser.add_argument("--model", help="MLX model ID (default: env MLX_MODEL or Qwen2.5-7B-Instruct-4bit)")
    parser.add_argument("--skip-agents", help="Comma-separated agent keys to skip (e.g. video_data)")
    parser.add_argument("--mlx-workers", type=int, default=None,
                        help="Number of MLX worker processes (each loads its own model). Default: env MLX_WORKERS or 1.")
    args = parser.parse_args()

    if args.skip_agents:
        _SKIP_AGENTS.update(a.strip() for a in args.skip_agents.split(","))

    if args.model:
        os.environ["MLX_MODEL"] = args.model

    if args.mlx_workers is not None:
        global _MLX_WORKERS
        _MLX_WORKERS = args.mlx_workers

    # Set up HF dual-lane from env or cached token
    global _HF_TOKEN
    if not _HF_TOKEN:
        token_path = Path.home() / ".cache" / "huggingface" / "token"
        if token_path.exists():
            _HF_TOKEN = token_path.read_text().strip()
    if _HF_TOKEN:
        hf_model = os.environ.get("HF_MODEL", "Qwen/Qwen2.5-72B-Instruct")
        console.print(f"[bold magenta]Dual-lane mode:[/] MLX local + HF {hf_model}")
    else:
        console.print("[dim]Single-lane mode: MLX local only (set HF_TOKEN for dual-lane)[/]")

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
                "academicUrl": getattr(args, 'academic_url', '') or "",
            }
        for key, val in [("name", args.name), ("role", args.role), ("org", args.org),
                          ("github", args.github), ("orcid", args.orcid),
                          ("academicUrl", getattr(args, 'academic_url', None))]:
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

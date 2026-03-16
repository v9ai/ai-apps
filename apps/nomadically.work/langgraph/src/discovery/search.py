"""Search nodes: generate queries via DeepSeek + execute via DuckDuckGo."""

import json
import os
import re

from ddgs import DDGS
from langchain_openai import ChatOpenAI

from .models import CandidateCompany
from .prompts import build_query_generation_messages

_llm: ChatOpenAI | None = None


def get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.3,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm


def generate_queries(seed_topics: list[str]) -> list[str]:
    """Use DeepSeek to turn seed topics into diverse search queries."""
    messages = build_query_generation_messages(seed_topics)
    response = get_llm().invoke(messages)

    try:
        raw = json.loads(response.content)
        return raw.get("queries", [])
    except json.JSONDecodeError:
        # Fallback: treat each seed topic as a query
        return [f"remote AI company {t}" for t in seed_topics]


def _extract_domain(url: str) -> str:
    """Extract and normalize domain from URL."""
    match = re.search(r"https?://(?:www\.)?([^/]+)", url)
    if match:
        return match.group(1).lower()
    return url.lower()


def search_web(query: str, max_results: int = 10) -> list[CandidateCompany]:
    """Execute a single DuckDuckGo search and return candidate companies."""
    results = DDGS().text(query, max_results=max_results, region="wt-wt")

    candidates: list[CandidateCompany] = []
    seen_domains: set[str] = set()

    for result in results:
        url = result.get("href", "")
        domain = _extract_domain(url)
        title = result.get("title", "")

        if not domain or domain in seen_domains:
            continue

        # Skip aggregator/news/job-board sites — we want company websites
        skip_domains = {
            # Social / code
            "linkedin.com", "twitter.com", "x.com", "github.com",
            "medium.com", "substack.com", "reddit.com", "wikipedia.org",
            # News / lists
            "techcrunch.com", "crunchbase.com", "aimagazine.com",
            "euronews.com", "walturn.com", "noota.io", "aijourn.com",
            # Job boards / aggregators
            "glassdoor.com", "indeed.com", "ycombinator.com",
            "news.ycombinator.com", "wellfound.com", "builtin.com",
            "remoterocketship.com", "workingnomads.com", "remoteok.com",
            "jobgether.com", "totaljobs.com", "euremotejobs.com",
            "remote.io", "remotech.ai", "startup.jobs", "meetfrank.com",
            "eu-startups.com", "talents2germany.de", "searchqualify.com",
            "techmunity.io", "bing.com", "google.com",
            # ATS platforms (we want company domains, not board URLs)
            "boards.greenhouse.io", "jobs.lever.co", "jobs.eu.lever.co",
            "jobs.ashbyhq.com", "boards-api.greenhouse.io",
        }
        if any(domain.endswith(s) for s in skip_domains):
            continue

        seen_domains.add(domain)

        # Infer company name from title (before " - " or " | ")
        name = re.split(r"\s*[-|–—]\s*", title)[0].strip() if title else domain
        if len(name) > 60:
            name = domain.split(".")[0].title()

        candidates.append({
            "name": name,
            "domain": domain,
            "source_url": url,
            "source_query": query,
        })

    return candidates

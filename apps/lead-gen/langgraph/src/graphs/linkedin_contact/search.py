"""Search for LinkedIn profiles of AI/ML recruiters and hiring contacts via DuckDuckGo."""

import json
import os
import re
import sys

from ddgs import DDGS
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

# ---------------------------------------------------------------------------
# LLM for query generation
# ---------------------------------------------------------------------------

_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.4,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm


QUERY_GENERATION_SYSTEM = """\
You are an expert at finding people on LinkedIn who can help an AI/ML engineer \
find a fully remote job in the EU/UK.

Given the seed topics below, generate 6-10 diverse search queries designed to \
find LinkedIn profiles of:
- Recruiters specializing in AI, ML, Data Science, or Software Engineering
- Talent acquisition leads at AI companies
- Hiring managers (VP Eng, CTO, Engineering Director) at remote-first AI startups
- Founders of AI recruitment agencies focused on EU/UK/EMEA

IMPORTANT: Every query MUST include "site:linkedin.com/in" to target LinkedIn profiles.

Vary your queries across these strategies:
- Role-specific: "AI recruiter" site:linkedin.com/in "EU"
- Company-specific: "talent acquisition" "Mistral AI" site:linkedin.com/in
- Region-specific: "ML hiring" "EMEA" site:linkedin.com/in
- Specialty: "machine learning recruiter" "remote" site:linkedin.com/in
- Seniority: "head of talent" "AI" "Europe" site:linkedin.com/in

Return JSON only:
{"queries": ["query1", "query2", ...]}"""


# ---------------------------------------------------------------------------
# Profile candidate extracted from search results
# ---------------------------------------------------------------------------

class ProfileCandidate:
    __slots__ = ("linkedin_url", "name", "headline", "source_query")

    def __init__(self, linkedin_url: str, name: str, headline: str, source_query: str):
        self.linkedin_url = linkedin_url
        self.name = name
        self.headline = headline
        self.source_query = source_query

    def to_dict(self) -> dict:
        return {
            "linkedin_url": self.linkedin_url,
            "name": self.name,
            "headline": self.headline,
            "source_query": self.source_query,
        }


# ---------------------------------------------------------------------------
# Query generation
# ---------------------------------------------------------------------------

_LINKEDIN_PROFILE_RE = re.compile(r"https?://(?:\w+\.)?linkedin\.com/in/[\w-]+")


def generate_contact_queries(seed_topics: list[str]) -> list[str]:
    """Generate LinkedIn profile search queries from seed topics."""
    messages = [
        SystemMessage(content=QUERY_GENERATION_SYSTEM),
        HumanMessage(content=f"Seed topics:\n{chr(10).join(f'- {t}' for t in seed_topics)}"),
    ]
    response = _get_llm().invoke(messages)

    try:
        raw = json.loads(response.content)
        queries = raw.get("queries", [])
    except json.JSONDecodeError:
        queries = [f'"{t}" site:linkedin.com/in' for t in seed_topics]

    # Ensure all queries target LinkedIn profiles
    validated = []
    for q in queries:
        if "linkedin.com/in" not in q.lower():
            q = f'{q} site:linkedin.com/in'
        validated.append(q)

    return validated


# ---------------------------------------------------------------------------
# DuckDuckGo search + profile extraction
# ---------------------------------------------------------------------------

def search_linkedin_profiles(query: str, max_results: int = 15) -> list[ProfileCandidate]:
    """Search DuckDuckGo for LinkedIn profiles matching query."""
    try:
        results = DDGS().text(query, max_results=max_results, region="wt-wt")
    except Exception as e:
        print(f"  [search] DuckDuckGo error: {e}", file=sys.stderr)
        return []

    candidates: list[ProfileCandidate] = []
    seen_urls: set[str] = set()

    for result in results:
        url = result.get("href", "")
        title = result.get("title", "")
        body = result.get("body", "")

        # Only keep linkedin.com/in/ profile URLs
        match = _LINKEDIN_PROFILE_RE.search(url)
        if not match:
            continue

        profile_url = match.group(0).rstrip("/")

        # Deduplicate within this search
        if profile_url in seen_urls:
            continue
        seen_urls.add(profile_url)

        # Extract name and headline from search result title
        # Typical format: "First Last - Headline | LinkedIn"
        name, headline = _parse_linkedin_title(title)

        # If headline is empty, try to get it from body snippet
        if not headline and body:
            headline = body[:200].strip()

        if not name:
            continue

        candidates.append(ProfileCandidate(
            linkedin_url=profile_url,
            name=name,
            headline=headline,
            source_query=query,
        ))

    return candidates


def _parse_linkedin_title(title: str) -> tuple[str, str]:
    """Parse LinkedIn search result title into (name, headline).

    Common formats:
        "First Last - Headline | LinkedIn"
        "First Last - Headline - Location | LinkedIn"
        "First Last | LinkedIn"
    """
    # Strip " | LinkedIn" suffix
    cleaned = re.sub(r"\s*\|\s*LinkedIn\s*$", "", title, flags=re.IGNORECASE).strip()

    # Split on first " - " to get name vs headline
    parts = cleaned.split(" - ", 1)
    name = parts[0].strip()
    headline = parts[1].strip() if len(parts) > 1 else ""

    # Clean up name — remove emojis, titles, extra whitespace
    name = re.sub(r"[^\w\s\'-]", "", name).strip()
    # Remove very short or very long "names"
    if len(name) < 3 or len(name) > 60:
        return "", ""

    return name, headline

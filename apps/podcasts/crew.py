#!/usr/bin/env python3
"""Person research pipeline — CrewAI implementation with 10 expert agents.

Spawns 10 specialized expert agents that collaboratively research an AI/tech
personality and produce a structured JSON profile compatible with the existing
PersonResearch schema (same output as research.py / langgraph/cli.py research).

Usage:
    python3 crew.py
    python3 crew.py --slug harrison-chase
    python3 crew.py --slug harrison-chase --name "Harrison Chase" --role "CEO" --org "LangChain"

The 10 experts:
    1. Web Research Specialist       — multi-query DuckDuckGo search
    2. GitHub & Open Source Analyst  — profile + top repos
    3. Academic Publications Analyst — ORCID record
    4. Biography Writer              — synthesizes career narrative
    5. Timeline Architect            — chronological event mapping
    6. Technical Contributions Analyst — impactful projects/papers
    7. Quote & Interview Specialist  — verbatim quotes with sources
    8. Social & Digital Presence Mapper — all public profiles/URLs
    9. Expertise Domain Analyst      — specific topic extraction
   10. Research Quality Evaluator    — 5-dimension scoring
"""

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from crewai import Agent, Crew, LLM, Process, Task
from crewai.tools import tool
from ddgs import DDGS
from rich.console import Console
from rich.table import Table

console = Console()

SCRIPT_DIR = Path(__file__).resolve().parent
PERSONALITIES_DIR = SCRIPT_DIR / "personalities"
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"

_HTTP_TIMEOUT = 15.0

# ═══════════════════════════════════════════════════════════════════════════
# LLM — DeepSeek via LiteLLM
# ═══════════════════════════════════════════════════════════════════════════

def _make_llm() -> LLM:
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY not set")
    return LLM(
        model="deepseek/deepseek-chat",
        base_url="https://api.deepseek.com/v1",
        api_key=api_key,
        temperature=0.2,
        max_tokens=8192,
    )


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


@tool("web_search")
def web_search(query: str) -> str:
    """Search DuckDuckGo for a query and return titles, URLs, and snippets."""
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


@tool("fetch_url_content")
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


@tool("fetch_github_profile")
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


@tool("fetch_orcid_profile")
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
# Build Crew — 10 Expert Agents
# ═══════════════════════════════════════════════════════════════════════════

def build_crew(person: dict[str, str], llm: LLM) -> Crew:
    name = person.get("name", "")
    role = person.get("role", "")
    org = person.get("org", "")
    github = person.get("github", "")
    orcid = person.get("orcid", "")
    ctx = f"{name} ({role} @ {org})"

    tools_search = [web_search, fetch_url_content]

    # ── Agent 1: Web Research Specialist ───────────────────────────────────
    web_researcher = Agent(
        role="Web Research Specialist",
        goal=f"Find comprehensive, high-quality web sources about {ctx}",
        backstory=(
            "You are a master internet researcher specializing in AI/tech industry figures. "
            "You craft precise search queries that cut through noise and find primary sources: "
            "personal blogs, conference talks, technical interviews, and official announcements. "
            "You ALWAYS include the person's role and org in every query to disambiguate them "
            "from unrelated people with the same name."
        ),
        llm=llm,
        tools=tools_search,
        verbose=True,
    )

    # ── Agent 2: GitHub & Open Source Analyst ──────────────────────────────
    github_analyst = Agent(
        role="GitHub & Open Source Analyst",
        goal=f"Analyze the open-source footprint and GitHub activity of {ctx}",
        backstory=(
            "You are an expert in reading GitHub profiles and understanding repository ecosystems. "
            "You identify impactful open-source contributions by analyzing star counts, repo "
            "descriptions, commit patterns, and community adoption. You recognize architectural "
            "decisions and technical leadership from public signals."
        ),
        llm=llm,
        tools=[fetch_github_profile],
        verbose=True,
    )

    # ── Agent 3: Academic Publications Analyst ─────────────────────────────
    orcid_analyst = Agent(
        role="Academic Publications Analyst",
        goal=f"Research the academic and publication history of {ctx}",
        backstory=(
            "You specialize in academic research profiles, citation analysis, and publication "
            "tracking. You understand the ORCID system deeply and extract meaningful insight "
            "from publication lists, DOIs, and academic affiliations — connecting academic "
            "output to real-world technical impact."
        ),
        llm=llm,
        tools=[fetch_orcid_profile],
        verbose=True,
    )

    # ── Agent 4: Biography Writer ───────────────────────────────────────────
    biography_writer = Agent(
        role="Biography & Career Narrative Specialist",
        goal=f"Write a precise, evidence-based 3-5 sentence biography for {ctx}",
        backstory=(
            "You are an expert technical biographer who has profiled hundreds of AI/tech leaders. "
            "You synthesize diverse sources into crisp, accurate narratives capturing what makes "
            "someone unique — their founding moment, key insight, and current focus. You never "
            "fabricate and always stay grounded in verifiable evidence."
        ),
        llm=llm,
        tools=tools_search,
        verbose=True,
    )

    # ── Agent 5: Timeline Architect ─────────────────────────────────────────
    timeline_mapper = Agent(
        role="Career Timeline Architect",
        goal=f"Build a precise chronological timeline of key career events for {ctx}",
        backstory=(
            "You are obsessed with chronological accuracy. You reconstruct career histories "
            "from scattered data: LinkedIn mentions, press releases, GitHub commit histories, "
            "conference programs, and funding announcements. Every event you record has a "
            "verified date (YYYY-MM format) and a source URL."
        ),
        llm=llm,
        tools=tools_search,
        verbose=True,
    )

    # ── Agent 6: Technical Contributions Analyst ────────────────────────────
    contributions_analyst = Agent(
        role="Technical Contributions Analyst",
        goal=f"Identify and describe the 3-6 most impactful technical contributions of {ctx}",
        backstory=(
            "You are a senior technical analyst evaluating the lasting impact of engineers "
            "and researchers. You understand what makes a framework, paper, algorithm, or "
            "product genuinely influential — adoption metrics, citations, derivative work, "
            "industry shifts. You write precise contribution descriptions with verifiable URLs."
        ),
        llm=llm,
        tools=tools_search,
        verbose=True,
    )

    # ── Agent 7: Quote & Interview Specialist ───────────────────────────────
    quote_hunter = Agent(
        role="Quote & Interview Intelligence Specialist",
        goal=f"Find 3-5 authentic, verbatim quotes from {ctx} in interviews and podcasts",
        backstory=(
            "You have an ear for authentic voice. You track down actual quotes from podcast "
            "transcripts, blog posts, conference keynotes, and social posts. You NEVER "
            "paraphrase or fabricate — if you cannot find the exact quote with a source URL, "
            "you skip it entirely. Quality over quantity."
        ),
        llm=llm,
        tools=tools_search,
        verbose=True,
    )

    # ── Agent 8: Social & Digital Presence Mapper ───────────────────────────
    social_mapper = Agent(
        role="Social & Digital Presence Mapper",
        goal=f"Map all verified public social profiles and online presence for {ctx}",
        backstory=(
            "You specialize in digital identity mapping. You find GitHub, Twitter/X, LinkedIn, "
            "personal websites, Substack, HuggingFace, and other platform presences. You only "
            "include URLs you can verify exist, organized into a clean key-value mapping."
        ),
        llm=llm,
        tools=tools_search,
        verbose=True,
    )

    # ── Agent 9: Expertise Domain Analyst ──────────────────────────────────
    topic_extractor = Agent(
        role="Expertise Domain & Topic Analyst",
        goal=f"Extract 5-10 specific technical topics representing {ctx}'s core expertise",
        backstory=(
            "You are a knowledge taxonomy expert who maps people to their precise domain "
            "expertise. You distinguish between surface-level buzzwords and deep expertise. "
            "Your topic lists are specific ('RAG pipeline optimization', not 'AI') and "
            "reflect the person's actual contributions and current focus areas."
        ),
        llm=llm,
        tools=[],
        verbose=True,
    )

    # ── Agent 10: Research Quality Evaluator ────────────────────────────────
    quality_evaluator = Agent(
        role="Research Quality & Accuracy Evaluator",
        goal=f"Evaluate and score the research profile for {ctx} across 5 quality dimensions",
        backstory=(
            "You are a rigorous research quality auditor. You evaluate profiles for bio "
            "specificity, source diversity, timeline completeness, contribution depth, and "
            "name disambiguation accuracy. You score each 1-10 with clear reasoning, "
            "identify gaps, and provide an actionable improvement summary."
        ),
        llm=llm,
        tools=[],
        verbose=True,
    )

    # ── Task 1: Web Search ──────────────────────────────────────────────────
    search_task = Task(
        description=(
            f"Research {ctx} using web search. Generate 8-10 diverse search queries covering: "
            f"recent news, technical blog posts, conference talks, interviews, open-source "
            f"projects, AI opinions, and career history. ALWAYS include the role or org "
            f"('{role}', '{org}') in every query to disambiguate from other people named {name}. "
            f"Run each query with web_search, then fetch the most promising URLs with fetch_url_content. "
            f"Return a structured summary of findings organized by theme with source URLs."
        ),
        expected_output=(
            "A comprehensive web research summary with findings organized into sections: "
            "Recent News & Announcements, Technical Work & Projects, Interviews & Talks, "
            "Career History. Each section lists key facts with source URLs."
        ),
        agent=web_researcher,
    )

    # ── Task 2: GitHub Analysis ─────────────────────────────────────────────
    github_task = Task(
        description=(
            f"Fetch and analyze the GitHub profile for {ctx}. "
            f"GitHub username: '{github or 'unknown — use web_search to find it first'}'. "
            f"If the username is unknown, search for '{name} github' to find it. "
            f"Analyze: bio, company, follower count, top repositories by stars, notable "
            f"projects, and what they reveal about technical focus and community impact."
        ),
        expected_output=(
            "A GitHub profile summary with: username, bio, follower count, "
            "top 5 repositories (name, stars, description), and a 2-sentence "
            "technical focus assessment based on the profile."
        ),
        agent=github_analyst,
    )

    # ── Task 3: ORCID / Academic Analysis ──────────────────────────────────
    orcid_task = Task(
        description=(
            f"Fetch and analyze the ORCID academic record for {ctx}. "
            f"ORCID iD: '{orcid or 'none'}'. "
            f"If no ORCID iD is provided, return '(no academic record available)'. "
            f"Otherwise summarize: researcher name, biography, keywords, and list the "
            f"top publications with year, title, and DOI."
        ),
        expected_output=(
            "An ORCID profile summary with researcher bio/keywords and a publication list "
            "(year, title, DOI for each). If no ORCID available, state that clearly."
        ),
        agent=orcid_analyst,
    )

    # ── Task 4: Biography ───────────────────────────────────────────────────
    bio_task = Task(
        description=(
            f"Write a precise 3-5 sentence biography for {ctx} synthesizing findings "
            f"from the web research, GitHub analysis, and ORCID tasks. "
            f"Focus on: career origin or founding story, key technical achievements, "
            f"current role and impact, what makes them unique in AI/tech. "
            f"Be specific — name actual projects, frameworks, papers, or companies. "
            f"Every sentence must contain a verifiable, specific fact."
        ),
        expected_output=(
            "A 3-5 sentence biography. Factual, specific, evidence-based. "
            "No vague generalities. Reads like a professional profile bio."
        ),
        agent=biography_writer,
        context=[search_task, github_task, orcid_task],
    )

    # ── Task 5: Timeline ────────────────────────────────────────────────────
    timeline_task = Task(
        description=(
            f"Build a chronological timeline of key career events for {ctx} "
            f"using all research collected so far. Include: education milestones, "
            f"job changes, major product/paper launches, funding rounds, conference "
            f"keynotes, notable interviews, and open-source releases. "
            f"Each event requires: date (YYYY-MM format), description, source URL. "
            f"Aim for at least 8 events."
        ),
        expected_output=(
            'A JSON array of timeline events ordered chronologically. Each object has '
            '"date" (YYYY-MM), "event" (description string), "url" (source URL). '
            'Example: [{"date": "2022-03", "event": "Founded LangChain", "url": "https://..."}]'
        ),
        agent=timeline_mapper,
        context=[search_task, github_task, orcid_task],
    )

    # ── Task 6: Contributions ───────────────────────────────────────────────
    contributions_task = Task(
        description=(
            f"Identify and describe the 3-6 most significant technical contributions of {ctx}. "
            f"For each: what is it, why does it matter, what impact has it had (adoption, "
            f"citations, derivatives), who uses it, what numbers validate its importance. "
            f"Cover GitHub repos, papers, frameworks, products, or concepts they pioneered."
        ),
        expected_output=(
            'A JSON array of contributions. Each object has "title" (contribution name), '
            '"description" (2-3 sentences of specific impact with metrics), "url" (link). '
            'Example: [{"title": "LangChain", "description": "...", "url": "https://..."}]'
        ),
        agent=contributions_analyst,
        context=[search_task, github_task, orcid_task],
    )

    # ── Task 7: Quotes ──────────────────────────────────────────────────────
    quotes_task = Task(
        description=(
            f"Find 3-5 authentic, verbatim quotes from {ctx} in interviews, podcasts, "
            f"blog posts, or public talks. For each: find the exact text, identify the source "
            f"(interview name, podcast episode, article), and provide the URL. "
            f"DO NOT paraphrase or fabricate. If you cannot find a verifiable quote with "
            f"a real source URL, skip it. Search for podcast transcripts specifically."
        ),
        expected_output=(
            'A JSON array of quotes. Each object has "text" (verbatim quote), '
            '"source" (interview/podcast/article name), "url" (source link). '
            'Only include quotes actually found — no fabrications. '
            'Example: [{"text": "...", "source": "Lex Fridman Podcast", "url": "https://..."}]'
        ),
        agent=quote_hunter,
        context=[search_task],
    )

    # ── Task 8: Social Profiles ─────────────────────────────────────────────
    social_task = Task(
        description=(
            f"Map all verified public social profiles and online presence for {ctx}. "
            f"Find: GitHub URL, Twitter/X handle, LinkedIn profile, personal website/blog, "
            f"HuggingFace profile, Substack, and any other relevant platforms. "
            f"Only include URLs you can confirm exist. Use web search to verify."
        ),
        expected_output=(
            'A JSON object mapping platform names to verified URLs. '
            'Example: {"github": "https://github.com/...", "twitter": "https://x.com/...", '
            '"website": "https://...", "linkedin": "https://linkedin.com/in/..."}'
        ),
        agent=social_mapper,
        context=[search_task, github_task],
    )

    # ── Task 9: Topics / Expertise ──────────────────────────────────────────
    topics_task = Task(
        description=(
            f"Extract 5-10 specific technical topics representing {ctx}'s core expertise "
            f"based on all research gathered. What are the precise domains they work in? "
            f"Be specific (e.g. 'multi-agent AI systems', 'RAG pipeline architecture', "
            f"'transformer inference optimization') not vague (e.g. 'AI', 'machine learning'). "
            f"Topics should reflect actual contributions and current focus, not buzzwords."
        ),
        expected_output=(
            'A JSON array of 5-10 specific topic strings. '
            'Example: ["LLM orchestration", "context engineering", "RAG pipelines", '
            '"agentic systems", "vector similarity search"]'
        ),
        agent=topic_extractor,
        context=[search_task, bio_task, contributions_task],
    )

    # ── Task 10: Quality Evaluation ─────────────────────────────────────────
    eval_task = Task(
        description=(
            f"Evaluate the research profile quality for {ctx} across 5 dimensions. "
            f"Review all work from the other 9 agents and score each 1-10:\n"
            f"1. bio_quality — Is the bio specific, evidence-based, informative?\n"
            f"2. source_coverage — Are sources diverse, high-quality, verifiable?\n"
            f"3. timeline_completeness — Is the timeline detailed and well-sourced?\n"
            f"4. contributions_depth — Are contributions specific with real impact data?\n"
            f"5. name_disambiguation — Is this clearly focused on the correct person?\n"
            f"Provide score + 1-sentence reasoning for each. Give an overall score and summary."
        ),
        expected_output=(
            'A JSON evaluation object: '
            '{"bio_quality": {"score": 8, "reasoning": "..."}, '
            '"source_coverage": {"score": 7, "reasoning": "..."}, '
            '"timeline_completeness": {"score": 6, "reasoning": "..."}, '
            '"contributions_depth": {"score": 9, "reasoning": "..."}, '
            '"name_disambiguation": {"score": 10, "reasoning": "..."}, '
            '"overall_score": 8, "summary": "..."}'
        ),
        agent=quality_evaluator,
        context=[bio_task, timeline_task, contributions_task, quotes_task, social_task, topics_task],
    )

    return Crew(
        agents=[
            web_researcher, github_analyst, orcid_analyst, biography_writer,
            timeline_mapper, contributions_analyst, quote_hunter, social_mapper,
            topic_extractor, quality_evaluator,
        ],
        tasks=[
            search_task, github_task, orcid_task, bio_task, timeline_task,
            contributions_task, quotes_task, social_task, topics_task, eval_task,
        ],
        process=Process.sequential,
        verbose=True,
    )


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


def run_person(person: dict[str, str], llm: LLM) -> None:
    name = person.get("name", person["slug"])
    slug = person["slug"]

    console.rule(f"[bold cyan]{name}[/]")
    console.print(f"  Role: {person.get('role', '')}  |  Org: {person.get('org', '')}")
    console.print(f"  GitHub: {person.get('github', '—')}  |  ORCID: {person.get('orcid', '—')}\n")

    crew = build_crew(person, llm)
    result = crew.kickoff()

    outputs = result.tasks_output  # list[TaskOutput], one per task

    def _raw(idx: int) -> str:
        try:
            return str(outputs[idx].raw)
        except Exception:
            return ""

    # Task indices match build_crew task list order:
    # 0=search, 1=github, 2=orcid, 3=bio, 4=timeline,
    # 5=contributions, 6=quotes, 7=social, 8=topics, 9=eval

    bio = _raw(3).strip()
    if len(bio) > 600:
        bio = bio[:600]

    timeline = _extract_json(_raw(4)) or []
    if not isinstance(timeline, list):
        timeline = []

    contributions = _extract_json(_raw(5)) or []
    if not isinstance(contributions, list):
        contributions = []

    quotes = _extract_json(_raw(6)) or []
    if not isinstance(quotes, list):
        quotes = []

    social = _extract_json(_raw(7)) or {}
    if not isinstance(social, dict):
        social = {}

    topics = _extract_json(_raw(8)) or []
    if not isinstance(topics, list):
        topics = []

    eval_data = _extract_json(_raw(9)) or {}

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    research = {
        "slug": slug,
        "name": name,
        "generated_at": now,
        "bio": bio,
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
        "sources": [],
    }

    RESEARCH_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RESEARCH_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(research, indent=2, ensure_ascii=False) + "\n")
    console.print(f"\n  [bold green]Research exported → {out_path}[/]")

    if eval_data and isinstance(eval_data, dict):
        eval_path = RESEARCH_DIR / f"{slug}.eval.json"
        eval_path.write_text(
            json.dumps(
                {"slug": slug, "name": name, "generated_at": now, "eval": eval_data},
                indent=2, ensure_ascii=False,
            ) + "\n"
        )
        console.print(f"  [bold green]Eval exported → {eval_path}[/]")

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


# ═══════════════════════════════════════════════════════════════════════════
# Entry point
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Person research via CrewAI — 10 expert agents"
    )
    parser.add_argument("--slug", help="Personality slug (e.g. harrison-chase)")
    parser.add_argument("--name", help="Full name (auto-detected from personalities/)")
    parser.add_argument("--role", help="Role")
    parser.add_argument("--org", help="Organization")
    parser.add_argument("--github", help="GitHub username")
    parser.add_argument("--orcid", help="ORCID iD")
    args = parser.parse_args()

    llm = _make_llm()

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
        # CLI args override personality file values
        for key, val in [("name", args.name), ("role", args.role), ("org", args.org),
                          ("github", args.github), ("orcid", args.orcid)]:
            if val:
                person[key] = val
        run_person(person, llm)
    else:
        people = load_personalities()
        if not people:
            console.print("[red]No personality files found in personalities/[/]")
            return
        person = pick_person(people)
        run_person(person, llm)


if __name__ == "__main__":
    main()

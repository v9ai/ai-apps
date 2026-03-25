"""
timeline_enrichment.py
──────────────────────
Pipeline that enriches person timelines by merging events
from multiple sources: research JSON, GitHub repos, HuggingFace models,
and arXiv papers.

Usage:
    python timeline_enrichment.py enrich athos-georgiou
    python timeline_enrichment.py enrich --all
    python timeline_enrichment.py eval                   # run evals
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, TypedDict

import httpx

from mlx_client import MLXClient, MLXConfig, ChatMessage  # noqa: E402

# ─── Paths ──────────────────────────────────────────────────

ROOT = Path(__file__).parent
PROJECT_ROOT = ROOT.parent
RESEARCH_DIR = PROJECT_ROOT / "src" / "lib" / "research"
PERSONALITIES_DIR = PROJECT_ROOT / "personalities"

# ─── Types ──────────────────────────────────────────────────


class TimelineEvent(TypedDict):
    date: str
    event: str
    url: str
    source: str  # "research" | "github" | "paper" | "huggingface"


class PipelineInput(TypedDict):
    slug: str
    name: str
    org: str
    github_username: str | None
    hf_username: str | None
    research_timeline: list[dict[str, str]]
    papers: list[dict[str, str]]


class GatheredEvents(TypedDict):
    research: list[TimelineEvent]
    github: list[TimelineEvent]
    papers: list[TimelineEvent]
    huggingface: list[TimelineEvent]
    web: list[TimelineEvent]


# ─── Data loaders ──────────────────────────────────────────

def load_personality(slug: str) -> dict[str, Any] | None:
    """Parse TS personality file to extract github, papers, etc."""
    ts_path = PERSONALITIES_DIR / f"{slug}.ts"
    if not ts_path.exists():
        return None
    text = ts_path.read_text()

    result: dict[str, Any] = {"slug": slug, "name": "", "org": "", "github": None, "papers": []}

    # Extract name and org
    name_match = re.search(r'name:\s*"([^"]+)"', text)
    if name_match:
        result["name"] = name_match.group(1)
    org_match = re.search(r'org:\s*"([^"]+)"', text)
    if org_match:
        result["org"] = org_match.group(1)

    # Extract github username
    gh_match = re.search(r'github:\s*"([^"]+)"', text)
    if gh_match:
        result["github"] = gh_match.group(1)

    # Extract papers
    papers_block = re.search(r"papers:\s*\[(.*?)\]", text, re.DOTALL)
    if papers_block:
        for p in re.finditer(
            r'title:\s*"([^"]+)".*?arxiv:\s*"([^"]+)".*?date:\s*"([^"]+)"',
            papers_block.group(1),
            re.DOTALL,
        ):
            result["papers"].append(
                {"title": p.group(1), "arxiv": p.group(2), "date": p.group(3)}
            )

    return result


def load_research(slug: str) -> dict[str, Any] | None:
    """Load research JSON for a person."""
    path = RESEARCH_DIR / f"{slug}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


# ─── Async fetch functions ────────────────────────────────


async def _fetch_github_repos(inp: PipelineInput) -> list[dict[str, Any]]:
    username = inp.get("github_username")
    if not username:
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://api.github.com/users/{username}/repos",
                params={"sort": "stars", "per_page": 30, "type": "owner"},
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if resp.status_code != 200:
                return []
            repos = resp.json()
            return [
                {
                    "name": r["name"],
                    "description": r.get("description") or "",
                    "url": r["html_url"],
                    "stars": r["stargazers_count"],
                    "created_at": r["created_at"],
                }
                for r in repos
                if not r.get("fork")
            ]
    except Exception:
        return []


async def _fetch_hf_models(inp: PipelineInput) -> list[dict[str, Any]]:
    username = inp.get("hf_username")
    if not username:
        return []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://huggingface.co/api/models",
                params={"author": username, "sort": "likes"},
            )
            if resp.status_code != 200:
                return []
            return [
                {
                    "id": m.get("modelId") or m["id"],
                    "likes": m.get("likes", 0),
                    "downloads": m.get("downloads", 0),
                    "pipeline_tag": m.get("pipeline_tag"),
                    "created_at": m.get("createdAt"),
                    "last_modified": m.get("lastModified"),
                }
                for m in resp.json()
            ]
    except Exception:
        return []


# ─── Image search ─────────────────────────────────────────


async def _search_person_image(inp: PipelineInput) -> str | None:
    """Search for a person's headshot/portrait using DuckDuckGo images."""
    name = inp.get("name", "")
    org = inp.get("org", "")
    if not name:
        return None
    try:
        from ddgs import DDGS
        query = f"{name} {org} portrait headshot".strip()
        with DDGS() as ddgs:
            results = list(ddgs.images(query, max_results=5))
            if results:
                return results[0].get("image") or results[0].get("thumbnail")
    except Exception:
        pass
    return None


# ─── Event builders (pure transforms) ─────────────────────

def _build_research_events(inp: PipelineInput) -> list[TimelineEvent]:
    return [
        TimelineEvent(
            date=e["date"],
            event=e["event"],
            url=e.get("url", ""),
            source="research",
        )
        for e in inp.get("research_timeline", [])
    ]


def _build_paper_events(inp: PipelineInput) -> list[TimelineEvent]:
    return [
        TimelineEvent(
            date=p["date"],
            event=f'Published "{p["title"]}"',
            url=f'https://arxiv.org/abs/{p["arxiv"]}',
            source="paper",
        )
        for p in inp.get("papers", [])
    ]


MIN_STARS_FOR_TIMELINE = 3


def _build_github_events(
    pair: tuple[PipelineInput, list[dict[str, Any]]],
) -> list[TimelineEvent]:
    _inp, repos = pair
    return [
        TimelineEvent(
            date=r["created_at"][:10],
            event=f'Created {r["name"]}'
            + (f': {r["description"][:80]}' if r["description"] else ""),
            url=r["url"],
            source="github",
        )
        for r in repos
        if r["stars"] >= MIN_STARS_FOR_TIMELINE
    ]


def _build_hf_events(
    pair: tuple[PipelineInput, list[dict[str, Any]]],
) -> list[TimelineEvent]:
    _inp, models = pair
    events: list[TimelineEvent] = []
    for m in models:
        date = m.get("created_at") or m.get("last_modified")
        if not date:
            continue
        events.append(
            TimelineEvent(
                date=date[:10],
                event=f'Published model {m["id"].split("/")[-1]} on Hugging Face',
                url=f'https://huggingface.co/{m["id"]}',
                source="huggingface",
            )
        )
    return events


# ─── Merge & deduplicate ──────────────────────────────────


def merge_and_sort(gathered: GatheredEvents) -> list[TimelineEvent]:
    """Merge events from all sources, deduplicate by date+url, sort newest first."""
    all_events: list[TimelineEvent] = []
    # Research events come first (priority for dedup)
    for key in ("research", "papers", "github", "huggingface", "web"):
        all_events.extend(gathered.get(key, []))

    seen: set[str] = set()
    deduped: list[TimelineEvent] = []
    for e in all_events:
        key = f'{e["date"]}|{e["url"]}'
        if key in seen:
            continue
        seen.add(key)
        deduped.append(e)

    deduped.sort(key=lambda e: e["date"], reverse=True)
    return deduped


# ─── MLX local LLM ───────────────────────────────────────


def _make_client() -> MLXClient:
    return MLXClient(MLXConfig(
        default_temperature=0.1,
        default_max_tokens=2048,
    ))


def _extract_json(text: str) -> Any:
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


async def _search_web_timeline_events(inp: PipelineInput) -> list[TimelineEvent]:
    """Use DuckDuckGo + local LLM to find career timeline events from the web."""
    name = inp.get("name", "")
    org = inp.get("org", "")
    if not name:
        return []

    snippets: list[str] = []
    try:
        from ddgs import DDGS
        queries = [
            f"{name} career history biography",
            f'"{name}" {org} founded started launched',
        ]
        with DDGS() as ddgs:
            for q in queries:
                for r in ddgs.text(q, max_results=8):
                    snippets.append(
                        f"- {r.get('title', '')}: {r.get('body', '')[:250]} ({r.get('href', '')})"
                    )
    except Exception:
        return []

    if not snippets:
        return []

    client = _make_client()
    prompt = (
        f"Extract chronological career timeline events for {name} ({org}) from these search results:\n\n"
        + "\n".join(snippets[:20])
        + '\n\nReturn a JSON array: [{"date": "YYYY-MM", "event": "description", "url": "https://..."}]\n'
        "Only include events with a specific date (year at minimum). "
        "Return [] if no reliable dated events are found."
    )
    try:
        resp = await client.chat([
            ChatMessage(role="system", content="You extract structured timeline events from web search results. Output only valid JSON."),
            ChatMessage(role="user", content=prompt),
        ])
        raw = _extract_json(resp.choices[0].message.content or "")
        if not isinstance(raw, list):
            return []
        return [
            TimelineEvent(
                date=e.get("date", "")[:10],
                event=e.get("event", ""),
                url=e.get("url", ""),
                source="web",
            )
            for e in raw
            if isinstance(e, dict) and e.get("date") and e.get("event")
        ]
    except Exception:
        return []


# ─── Full Pipeline ────────────────────────────────────────


async def _run_pipeline(inp: PipelineInput) -> list[TimelineEvent]:
    """Full enrichment pipeline: parallel fetches, then event building."""

    # Stage 1: Fetch external data in parallel
    github_repos, hf_models, web_events = await asyncio.gather(
        _fetch_github_repos(inp),
        _fetch_hf_models(inp),
        _search_web_timeline_events(inp),
    )

    # Stage 2: Build events from each source
    gathered: GatheredEvents = {
        "research": _build_research_events(inp),
        "papers": _build_paper_events(inp),
        "github": _build_github_events((inp, github_repos)),
        "huggingface": _build_hf_events((inp, hf_models)),
        "web": web_events,
    }

    # Stage 3: Merge, deduplicate, sort
    return merge_and_sort(gathered)


# ─── Public API ────────────────────────────────────────────


async def enrich_person_timeline(slug: str) -> list[TimelineEvent]:
    """High-level entry point: load data, run pipeline, return enriched timeline."""
    personality = load_personality(slug)
    if not personality:
        raise ValueError(f"Personality not found: {slug}")

    research = load_research(slug)

    # Extract HF username from research social links
    hf_username = None
    if research and research.get("social", {}).get("huggingface"):
        hf_url = research["social"]["huggingface"]
        parts = hf_url.rstrip("/").split("/")
        hf_username = parts[-1] if parts else None

    inp = PipelineInput(
        slug=slug,
        name=personality.get("name", ""),
        org=personality.get("org", ""),
        github_username=personality.get("github"),
        hf_username=hf_username,
        research_timeline=research.get("timeline", []) if research else [],
        papers=personality.get("papers", []),
    )

    return await _run_pipeline(inp)


def save_enriched_timeline(slug: str, events: list[TimelineEvent]) -> Path:
    """Write enriched timeline JSON alongside existing research JSON."""
    out_path = RESEARCH_DIR / f"{slug}-timeline.json"
    out_path.write_text(
        json.dumps(
            {
                "slug": slug,
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "events": events,
            },
            indent=2,
        )
        + "\n"
    )
    return out_path


# ─── Language colors for GitHub repos ────────────────────────

LANG_COLORS: dict[str, str] = {
    "TypeScript": "#3178c6",
    "JavaScript": "#f1e05a",
    "Python": "#3572A5",
    "Rust": "#dea584",
    "Go": "#00ADD8",
    "Java": "#b07219",
    "C++": "#f34b7d",
    "C": "#555555",
    "Ruby": "#701516",
    "Swift": "#F05138",
    "Kotlin": "#A97BFF",
    "Shell": "#89e051",
    "HTML": "#e34c26",
    "CSS": "#563d7c",
    "Jupyter Notebook": "#DA5B0B",
    "Dockerfile": "#384d54",
    "SCSS": "#c6538c",
    "Vue": "#41b883",
    "Svelte": "#ff3e00",
}


async def fetch_enrichment_data(
    github_username: str | None,
    hf_username: str | None,
    name: str = "",
    org: str = "",
) -> dict[str, Any]:
    """Fetch GitHub profile/repos and HuggingFace models for a person."""
    result: dict[str, Any] = {"github": None, "huggingface": None, "imageUrl": None}

    gh_headers = {"Accept": "application/vnd.github.v3+json"}
    gh_token = os.environ.get("GITHUB_TOKEN")
    if gh_token:
        gh_headers["Authorization"] = f"token {gh_token}"

    async with httpx.AsyncClient(timeout=15) as client:
        # ── GitHub ────────────────────────────────────────────
        if github_username:
            profile = None
            repos: list[dict[str, Any]] = []

            try:
                resp = await client.get(
                    f"https://api.github.com/users/{github_username}",
                    headers=gh_headers,
                )
                if resp.status_code == 200:
                    d = resp.json()
                    profile = {
                        "bio": d.get("bio"),
                        "publicRepos": d.get("public_repos", 0),
                        "followers": d.get("followers", 0),
                        "location": d.get("location"),
                        "createdAt": d.get("created_at"),
                    }
            except Exception:
                pass

            try:
                resp = await client.get(
                    f"https://api.github.com/users/{github_username}/repos",
                    params={"sort": "stars", "per_page": 30, "type": "owner"},
                    headers=gh_headers,
                )
                if resp.status_code == 200:
                    repos = [
                        {
                            "name": r["name"],
                            "description": r.get("description"),
                            "url": r["html_url"],
                            "stars": r["stargazers_count"],
                            "forks": r["forks_count"],
                            "language": r.get("language"),
                            "topics": r.get("topics", []),
                            "updatedAt": r["updated_at"],
                            "createdAt": r["created_at"],
                        }
                        for r in resp.json()
                        if not r.get("fork")
                    ]
                    repos.sort(key=lambda r: r["stars"], reverse=True)
            except Exception:
                pass

            if profile or repos:
                total_stars = sum(r["stars"] for r in repos)
                lang_map: dict[str, int] = {}
                for r in repos:
                    if r["language"]:
                        lang_map[r["language"]] = lang_map.get(r["language"], 0) + 1
                languages = sorted(
                    [
                        {"name": name, "count": count, "color": LANG_COLORS.get(name, "#8b8b8b")}
                        for name, count in lang_map.items()
                    ],
                    key=lambda l: l["count"],
                    reverse=True,
                )
                result["github"] = {
                    "profile": profile,
                    "repos": repos,
                    "totalStars": total_stars,
                    "languages": languages,
                }

        # ── HuggingFace ───────────────────────────────────────
        if hf_username:
            try:
                resp = await client.get(
                    "https://huggingface.co/api/models",
                    params={"author": hf_username, "sort": "likes"},
                )
                if resp.status_code == 200:
                    models = [
                        {
                            "id": m.get("modelId") or m["id"],
                            "likes": m.get("likes", 0),
                            "downloads": m.get("downloads", 0),
                            "tags": m.get("tags", []),
                            "pipelineTag": m.get("pipeline_tag"),
                            "createdAt": m.get("createdAt"),
                        }
                        for m in resp.json()
                    ]
                    if models:
                        result["huggingface"] = {
                            "models": models,
                            "totalDownloads": sum(m["downloads"] for m in models),
                            "totalLikes": sum(m["likes"] for m in models),
                        }
            except Exception:
                pass

    # ── Image search ───────────────────────────────────────
    if name:
        inp = PipelineInput(
            slug="",
            name=name,
            org=org,
            github_username=github_username,
            hf_username=hf_username,
            research_timeline=[],
            papers=[],
        )
        image_url = await _search_person_image(inp)
        if image_url:
            result["imageUrl"] = image_url

    return result


ENRICHMENT_DIR = PROJECT_ROOT / "src" / "lib" / "enrichment"


def save_enrichment(slug: str, data: dict[str, Any]) -> Path:
    """Write enrichment JSON for a person (GitHub + HuggingFace data)."""
    ENRICHMENT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ENRICHMENT_DIR / f"{slug}.json"
    out_path.write_text(json.dumps(data, indent=2) + "\n")
    return out_path


# ─── CLI ───────────────────────────────────────────────────

async def cmd_enrich(args: argparse.Namespace) -> None:
    from rich.console import Console
    from rich.table import Table

    console = Console()

    slugs: list[str] = []
    if args.all:
        slugs = [p.stem for p in PERSONALITIES_DIR.glob("*.ts")]
    else:
        slugs = [args.slug]

    for slug in slugs:
        console.print(f"\n[bold cyan]Enriching:[/] {slug}")
        try:
            personality = load_personality(slug)
            if not personality:
                console.print(f"  [yellow]Personality not found, skipping.[/]")
                continue

            research = load_research(slug)

            # Extract usernames
            github_username = personality.get("github")
            hf_username = None
            if research and research.get("social", {}).get("huggingface"):
                hf_url = research["social"]["huggingface"]
                parts = hf_url.rstrip("/").split("/")
                hf_username = parts[-1] if parts else None

            # Timeline enrichment
            events = await enrich_person_timeline(slug)
            tl_path = save_enriched_timeline(slug, events)
            console.print(f"  [green]{len(events)} events[/] → {tl_path.relative_to(PROJECT_ROOT)}")

            # GitHub + HuggingFace + Image enrichment
            enrichment = await fetch_enrichment_data(
                github_username, hf_username,
                name=personality.get("name", ""),
                org=personality.get("org", ""),
            )
            en_path = save_enrichment(slug, enrichment)
            gh_repos = len(enrichment.get("github", {}).get("repos", [])) if enrichment.get("github") else 0
            hf_models = len(enrichment.get("huggingface", {}).get("models", [])) if enrichment.get("huggingface") else 0
            img = "yes" if enrichment.get("imageUrl") else "no"
            console.print(f"  [green]{gh_repos} repos, {hf_models} models, image: {img}[/] → {en_path.relative_to(PROJECT_ROOT)}")

            # Print summary table
            source_counts: dict[str, int] = {}
            for e in events:
                source_counts[e["source"]] = source_counts.get(e["source"], 0) + 1

            table = Table(show_header=False, padding=(0, 2))
            for src, count in sorted(source_counts.items()):
                color = {
                    "research": "white",
                    "github": "green",
                    "paper": "blue",
                    "huggingface": "yellow",
                    "web": "magenta",
                }.get(src, "white")
                table.add_row(f"[{color}]{src}[/]", str(count))
            console.print(table)

        except Exception as exc:
            console.print(f"  [red]Error: {exc}[/]")


def main() -> None:
    parser = argparse.ArgumentParser(description="Timeline enrichment pipeline")
    sub = parser.add_subparsers(dest="command")

    p_enrich = sub.add_parser("enrich", help="Enrich person timeline")
    p_enrich.add_argument("slug", nargs="?", help="Person slug")
    p_enrich.add_argument("--all", action="store_true", help="Enrich all personalities")

    sub.add_parser("eval", help="Run evals (delegates to pytest)")

    args = parser.parse_args()

    if args.command == "enrich":
        if not args.slug and not args.all:
            parser.error("Provide a slug or --all")
        asyncio.run(cmd_enrich(args))
    elif args.command == "eval":
        import subprocess
        sys.exit(subprocess.call(["python", "-m", "pytest", "timeline_eval.py", "-v"]))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

"""Nodes for the arXiv papers pipeline.

Flow:
    fetch_arxiv → parse_entries → filter_author → export_papers
"""

import json
import re
import urllib.request
import urllib.parse
from pathlib import Path
from xml.etree import ElementTree as ET

from rich.console import Console
from rich.table import Table

from .state import ArxivPaper, ArxivPapersState

console = Console()

ARXIV_API = "http://export.arxiv.org/api/query"
ATOM_NS = "{http://www.w3.org/2005/Atom}"
ARXIV_NS = "{http://arxiv.org/schemas/atom}"

PERSONALITIES_PATH = Path(__file__).resolve().parents[4] / "src" / "lib" / "personalities.ts"


# ---------------------------------------------------------------------------
# Node 1: fetch_arxiv
# ---------------------------------------------------------------------------

def fetch_arxiv_node(state: ArxivPapersState) -> dict:
    """Fetch papers from the arXiv API for a given author."""
    author = state["author_query"]
    full_name = state.get("author_full_name", "")
    cat_filter = state.get("category_filter", "cs")
    max_results = state.get("max_results", 50)

    # Prefer exact full-name search when available (much more precise)
    if full_name:
        query_parts = [f'au:"{full_name}"']
    else:
        query_parts = [f"au:{author}"]
    if cat_filter:
        query_parts.append(f"cat:{cat_filter}.*")
    search_query = " AND ".join(query_parts)

    params = urllib.parse.urlencode({
        "search_query": search_query,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results,
    })

    url = f"{ARXIV_API}?{params}"
    console.print(f"  [cyan]Fetching:[/] {url}")

    req = urllib.request.Request(url, headers={"User-Agent": "ai-podcast-index/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        xml = resp.read().decode("utf-8")

    console.print(f"  [green]Received[/] {len(xml)} bytes")
    return {"raw_xml": xml}


# ---------------------------------------------------------------------------
# Node 2: parse_entries
# ---------------------------------------------------------------------------

def parse_entries_node(state: ArxivPapersState) -> dict:
    """Parse Atom XML into structured paper objects."""
    xml = state.get("raw_xml", "")
    if not xml:
        console.print("  [yellow]No XML to parse.[/]")
        return {"all_papers": []}

    root = ET.fromstring(xml)
    papers: list[ArxivPaper] = []

    for entry in root.findall(f"{ATOM_NS}entry"):
        # arXiv ID from <id> tag: http://arxiv.org/abs/2603.10031v1
        raw_id = entry.findtext(f"{ATOM_NS}id", "")
        arxiv_id = raw_id.split("/abs/")[-1].split("v")[0] if "/abs/" in raw_id else ""
        if not arxiv_id:
            continue

        title = entry.findtext(f"{ATOM_NS}title", "").strip()
        title = re.sub(r"\s+", " ", title)  # collapse whitespace

        abstract = entry.findtext(f"{ATOM_NS}summary", "").strip()
        abstract = re.sub(r"\s+", " ", abstract)

        # Published date → YYYY-MM-DD
        published = entry.findtext(f"{ATOM_NS}published", "")
        date = published[:10] if len(published) >= 10 else ""

        # Authors
        authors = [
            a.findtext(f"{ATOM_NS}name", "")
            for a in entry.findall(f"{ATOM_NS}author")
        ]

        # Categories
        categories = [
            c.get("term", "")
            for c in entry.findall(f"{ARXIV_NS}primary_category")
        ]
        categories += [
            c.get("term", "")
            for c in entry.findall(f"{ATOM_NS}category")
            if c.get("term", "") not in categories
        ]

        # PDF link
        pdf_url = ""
        for link in entry.findall(f"{ATOM_NS}link"):
            if link.get("title") == "pdf":
                pdf_url = link.get("href", "")
                break

        papers.append({
            "arxiv_id": arxiv_id,
            "title": title,
            "abstract": abstract[:500],
            "date": date,
            "authors": authors,
            "categories": [c for c in categories if c],
            "pdf_url": pdf_url,
        })

    console.print(f"  [green]Parsed {len(papers)} entries from arXiv[/]")
    return {"all_papers": papers}


# ---------------------------------------------------------------------------
# Node 3: filter_author
# ---------------------------------------------------------------------------

def _normalize(name: str) -> str:
    """Lowercase, strip accents-ish, collapse whitespace."""
    return re.sub(r"\s+", " ", name.strip().lower())


def filter_author_node(state: ArxivPapersState) -> dict:
    """Filter parsed papers to only those authored by the target person."""
    all_papers = state.get("all_papers", [])
    full_name = state.get("author_full_name", "")

    if not full_name:
        # No full name provided — pass everything through
        console.print(f"  [yellow]No author_full_name — keeping all {len(all_papers)} papers[/]")
        return {"papers": all_papers}

    target = _normalize(full_name)
    # Also try "Last First" ordering
    parts = target.split()
    target_reversed = f"{parts[-1]} {' '.join(parts[:-1])}" if len(parts) > 1 else target

    matched: list[ArxivPaper] = []
    for p in all_papers:
        author_names = [_normalize(a) for a in p["authors"]]
        if target in author_names or target_reversed in author_names:
            matched.append(p)

    console.print(f"  [green]Filtered: {len(matched)}/{len(all_papers)} papers match \"{full_name}\"[/]")

    # Print table of matched papers
    if matched:
        table = Table(title=f"Papers by {full_name}")
        table.add_column("#", style="dim", width=4)
        table.add_column("Date", style="yellow", width=12)
        table.add_column("ID", style="cyan", width=14)
        table.add_column("Title", width=60)
        table.add_column("Categories", style="dim", width=20)

        for i, p in enumerate(matched, 1):
            table.add_row(
                str(i),
                p["date"],
                p["arxiv_id"],
                p["title"][:58] + ".." if len(p["title"]) > 60 else p["title"],
                ", ".join(p["categories"][:3]),
            )
        console.print(table)

    return {"papers": matched}


# ---------------------------------------------------------------------------
# Node 4: export_papers
# ---------------------------------------------------------------------------

def export_papers_node(state: ArxivPapersState) -> dict:
    """Write papers to personalities.ts for the given person slug."""
    papers = state.get("papers", [])
    slug = state["person_slug"]

    if not papers:
        console.print("  [yellow]No papers to export.[/]")
        return {"exported_count": 0, "export_path": ""}

    # Also write a JSON sidecar for programmatic access
    json_path = PERSONALITIES_PATH.parent / "papers.json"
    existing: dict = {}
    if json_path.exists():
        existing = json.loads(json_path.read_text())

    existing[slug] = [
        {"title": p["title"], "arxiv": p["arxiv_id"], "date": p["date"]}
        for p in papers
    ]
    json_path.write_text(json.dumps(existing, indent=2) + "\n")
    console.print(f"  [green]Wrote {len(papers)} papers to {json_path}[/]")

    # Update personalities.ts — replace the papers array for this person
    ts_path = PERSONALITIES_PATH
    if not ts_path.exists():
        console.print(f"  [red]{ts_path} not found — skipping TS update.[/]")
        return {"exported_count": len(papers), "export_path": str(json_path)}

    ts_content = ts_path.read_text()

    # Build the new papers array literal
    lines = []
    for p in papers:
        escaped_title = p["title"].replace('"', '\\"')
        lines.append(
            f'          {{\n'
            f'            title: "{escaped_title}",\n'
            f'            arxiv: "{p["arxiv_id"]}",\n'
            f'            date: "{p["date"]}",\n'
            f'          }},'
        )
    papers_block = "[\n" + "\n".join(lines) + "\n        ]"

    # Find the personality block by slug and replace/insert papers
    slug_pattern = re.compile(
        r'(slug:\s*"' + re.escape(slug) + r'".*?)(papers:\s*\[.*?\])',
        re.DOTALL,
    )

    if slug_pattern.search(ts_content):
        # Replace existing papers array
        ts_content = slug_pattern.sub(
            lambda m: m.group(1) + f"papers: {papers_block}",
            ts_content,
        )
        console.print(f"  [green]Updated papers in personalities.ts[/]")
    else:
        # Insert papers before the closing brace of this personality
        insert_pattern = re.compile(
            r'(slug:\s*"' + re.escape(slug) + r'"[^}]*?)(github:\s*"[^"]*?",?\n)',
            re.DOTALL,
        )
        match = insert_pattern.search(ts_content)
        if match:
            ts_content = ts_content[:match.end()] + f"        papers: {papers_block},\n" + ts_content[match.end():]
            console.print(f"  [green]Inserted papers into personalities.ts[/]")
        else:
            console.print(f"  [yellow]Could not locate {slug} block in TS — papers saved to JSON only.[/]")

    ts_path.write_text(ts_content)

    return {"exported_count": len(papers), "export_path": str(json_path)}

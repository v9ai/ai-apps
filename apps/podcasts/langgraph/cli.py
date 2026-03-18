"""CLI for the podcasts LangGraph pipelines.

Usage:
    python langgraph/cli.py arxiv "Georgiou, A" --name "Athos Georgiou" --slug athos-georgiou
    python langgraph/cli.py arxiv "Georgiou, A" --name "Athos Georgiou" --slug athos-georgiou --cat cs --max 50
    python langgraph/cli.py research --slug athos-georgiou
    python langgraph/cli.py research --slug athos-georgiou --name "Athos Georgiou" --role "Founder" --org "NCA"
"""

import argparse

from rich.console import Console

console = Console()


def cmd_arxiv(args):
    from src.graphs.arxiv_papers.graph import build_arxiv_papers_graph

    graph = build_arxiv_papers_graph()

    console.print(f"\n[bold cyan]arXiv Papers Pipeline[/]")
    console.print(f"  Query:  {args.author}")
    console.print(f"  Name:   {args.name or '(no filter)'}")
    console.print(f"  Slug:   {args.slug}")
    console.print(f"  Cat:    {args.cat or '(all)'}")
    console.print(f"  Max:    {args.max}\n")

    result = graph.invoke({
        "author_query": args.author,
        "author_full_name": args.name or "",
        "person_slug": args.slug,
        "category_filter": args.cat,
        "max_results": args.max,
    })

    count = result.get("exported_count", 0)
    path = result.get("export_path", "")
    console.print(f"\n[bold green]Done — exported {count} papers[/]")
    if path:
        console.print(f"  [dim]{path}[/]\n")


def cmd_research(args):
    from src.graphs.person_research.graph import build_person_research_graph

    # If no explicit name/role/org, try to look them up from personalities.ts
    name = args.name
    role = args.role
    org = args.org
    github = args.github

    if not name:
        name, role, org, github = _lookup_personality(args.slug, role, org, github)

    graph = build_person_research_graph()

    console.print(f"\n[bold cyan]Person Research Pipeline[/]")
    console.print(f"  Slug:    {args.slug}")
    console.print(f"  Name:    {name}")
    console.print(f"  Role:    {role}")
    console.print(f"  Org:     {org}")
    console.print(f"  GitHub:  {github or '(none)'}\n")

    result = graph.invoke({
        "person_name": name,
        "person_slug": args.slug,
        "person_role": role,
        "person_org": org,
        "person_github": github or "",
    })

    path = result.get("export_path", "")
    console.print(f"\n[bold green]Done — research exported[/]")
    if path:
        console.print(f"  [dim]{path}[/]\n")


def _lookup_personality(slug: str, role: str, org: str, github: str) -> tuple[str, str, str, str]:
    """Try to resolve person details from personalities.ts data."""
    import re
    from pathlib import Path

    ts_path = Path(__file__).resolve().parent / "src" / ".." / "src" / "lib" / "personalities.ts"
    ts_path = (Path(__file__).resolve().parents[1] / "src" / "lib" / "personalities.ts")

    if not ts_path.exists():
        console.print(f"  [yellow]Could not find personalities.ts at {ts_path}[/]")
        return slug.replace("-", " ").title(), role or "", org or "", github or ""

    content = ts_path.read_text()

    # Find the block for this slug — anchor on slug first, then look backwards
    # Extract the full personality object containing this slug
    slug_pos = content.find(f'slug: "{slug}"')
    if slug_pos == -1:
        console.print(f"  [yellow]Slug '{slug}' not found in personalities.ts — using defaults[/]")
        return slug.replace("-", " ").title(), role or "", org or "", github or ""

    # Walk backwards to find the opening brace of this personality object
    block_start = content.rfind("{", 0, slug_pos)
    block_end = content.find("}", slug_pos)
    block = content[block_start:block_end + 1] if block_start != -1 and block_end != -1 else ""

    name_m = re.search(r'name:\s*"([^"]+)"', block)
    role_m = re.search(r'role:\s*"([^"]+)"', block)
    org_m = re.search(r'org:\s*"([^"]+)"', block)
    gh_m = re.search(r'github:\s*"([^"]+)"', block)

    if name_m:
        name = name_m.group(1)
        role = role or (role_m.group(1) if role_m else "")
        org = org or (org_m.group(1) if org_m else "")
        github = github or (gh_m.group(1) if gh_m else "")
        console.print(f"  [green]Found {name} in personalities.ts[/]")
        return name, role, org, github

    console.print(f"  [yellow]Slug '{slug}' not found in personalities.ts — using defaults[/]")
    return slug.replace("-", " ").title(), role or "", org or "", github or ""


def main():
    parser = argparse.ArgumentParser(description="Podcasts LangGraph pipelines")
    sub = parser.add_subparsers(dest="command")

    p_arxiv = sub.add_parser("arxiv", help="Fetch arXiv papers for a personality")
    p_arxiv.add_argument("author", help='arXiv author query, e.g. "Georgiou, A"')
    p_arxiv.add_argument("--name", help='Full name for filtering, e.g. "Athos Georgiou"')
    p_arxiv.add_argument("--slug", required=True, help="Personality slug (e.g. athos-georgiou)")
    p_arxiv.add_argument("--cat", default="cs", help="arXiv category prefix (default: cs)")
    p_arxiv.add_argument("--max", type=int, default=50, help="Max results (default: 50)")

    p_research = sub.add_parser("research", help="Deep research on a personality")
    p_research.add_argument("--slug", required=True, help="Personality slug (e.g. athos-georgiou)")
    p_research.add_argument("--name", help="Full name (auto-detected from personalities.ts)")
    p_research.add_argument("--role", help="Role (auto-detected)")
    p_research.add_argument("--org", help="Organization (auto-detected)")
    p_research.add_argument("--github", help="GitHub username (auto-detected)")

    args = parser.parse_args()

    if args.command == "arxiv":
        cmd_arxiv(args)
    elif args.command == "research":
        cmd_research(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

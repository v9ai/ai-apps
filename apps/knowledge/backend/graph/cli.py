"""CLI entrypoint for content generation."""

import argparse
import asyncio
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv

# Load .env.local from the knowledge app root
env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(env_path)

from graph.generate import (
    build_graph,
    build_dry_graph,
    close_client,
    get_category,
    get_missing_slugs,
    CONTENT_DIR,
)
from graph.client import ConfigError

log = logging.getLogger("graph")


def _initial_state(slug: str, topic: str | None = None) -> dict:
    topic = topic or slug.replace("-", " ").title()
    return {
        "topic": topic,
        "slug": slug,
        "category": get_category(slug),
        "research": "",
        "outline": "",
        "draft": "",
        "final": "",
        "revision_count": 0,
        "quality_issues": [],
        "total_tokens": 0,
    }


async def run_single(slug: str, topic: str | None, dry_run: bool) -> dict:
    graph = build_dry_graph() if dry_run else build_graph()
    state = _initial_state(slug, topic)
    return await graph.ainvoke(state)


async def run_batch(dry_run: bool) -> None:
    missing = get_missing_slugs()
    if not missing:
        print("All articles already exist!")
        return

    print(f"Missing articles: {len(missing)}")
    for slug in missing:
        print(f"  - {slug}")
    print()

    for i, slug in enumerate(missing, 1):
        print(f"[{i}/{len(missing)}] Generating: {slug}")
        t0 = time.time()
        try:
            result = await run_single(slug, None, dry_run)
            elapsed = time.time() - t0
            word_count = len(result.get("final", "").split())
            print(f"  -> {word_count} words in {elapsed:.0f}s\n")
        except Exception as e:
            print(f"  -> FAILED: {e}\n")


def print_graph():
    print("```mermaid")
    print("graph TD")
    print("    START((Start)) --> research")
    print("    research --> outline")
    print("    outline --> draft")
    print("    draft --> review")
    print("    review --> quality_check")
    print('    quality_check -->|"pass"| save')
    print('    quality_check -->|"fail (max 2)"| revise')
    print("    revise --> quality_check")
    print("    save --> END((End))")
    print()
    print("    style research fill:#9cf,stroke:#333")
    print("    style outline fill:#ff9,stroke:#333")
    print("    style draft fill:#bbf,stroke:#333")
    print("    style review fill:#fbb,stroke:#333")
    print("    style quality_check fill:#f9f,stroke:#333")
    print("    style revise fill:#fcb,stroke:#333")
    print("    style save fill:#bfb,stroke:#333")
    print("```")


async def run(args):
    try:
        if args.model:
            os.environ["LLM_MODEL"] = args.model

        if args.graph:
            print_graph()
            return

        if args.list_missing:
            missing = get_missing_slugs()
            if missing:
                print(f"Missing articles ({len(missing)}):")
                for slug in missing:
                    print(f"  {slug}")
            else:
                print("All articles exist!")
            return

        if args.batch:
            await run_batch(args.dry_run)
            return

        slug = args.slug
        if not slug:
            print("Error: slug is required (or use --batch / --list-missing)")
            return

        existing_file = CONTENT_DIR / f"{slug}.md"
        if existing_file.exists() and not args.dry_run and not getattr(args, 'update', False):
            print(f"Article already exists: {existing_file}")
            print(f"Use --update to regenerate, or --dry-run to preview.")
            return

        topic = args.topic or slug.replace("-", " ").title()
        model = os.environ.get("LLM_MODEL", "deepseek-chat")
        action = "Updating" if existing_file.exists() else "Generating"
        print(f"{action}: {topic} ({slug})")
        print(f"Category:   {get_category(slug)}")
        print(f"Model:      {model}")
        print(f"Pipeline:   research -> outline -> draft -> review -> quality_check [-> revise] -> save")
        print()

        t0 = time.time()
        result = await run_single(slug, args.topic, args.dry_run)
        elapsed = time.time() - t0

        if args.dry_run:
            print(result.get("final", ""))
        else:
            word_count = len(result.get("final", "").split())
            revisions = result.get("revision_count", 0)
            total_tokens = result.get("total_tokens", 0)
            print(f"\nDone! {word_count} words, {revisions} revisions, {total_tokens:,} tokens, {elapsed:.0f}s")
    except ConfigError as e:
        print(f"Config error: {e}")
    finally:
        await close_client()


def main():
    parser = argparse.ArgumentParser(description="Generate knowledge base articles using LangGraph")
    parser.add_argument("slug", nargs="?", help="Article slug (e.g. 'prompt-caching')")
    parser.add_argument("--topic", help="Human-readable topic name (defaults to slug with dashes replaced)")
    parser.add_argument("--model", help="Override LLM model (e.g. deepseek-reasoner, deepseek-chat)")
    parser.add_argument("--dry-run", action="store_true", help="Print the final article to stdout instead of saving")
    parser.add_argument("--batch", action="store_true", help="Generate all missing articles")
    parser.add_argument("--list-missing", action="store_true", help="List articles that don't have content files yet")
    parser.add_argument("--update", action="store_true", help="Regenerate an existing article (overwrites content/)")
    parser.add_argument("--graph", action="store_true", help="Print the graph as a Mermaid diagram")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose logging")
    args = parser.parse_args()

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="  %(message)s",
    )

    asyncio.run(run(args))


if __name__ == "__main__":
    main()

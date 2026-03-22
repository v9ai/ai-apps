"""CLI entry point for the How It Works pipeline."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")

    import argparse

    parser = argparse.ArgumentParser(description="How It Works Pipeline")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show full analysis")
    parser.add_argument("--app", type=str, default=None, help="Process single app")
    args = parser.parse_args()

    banner = "━" * 58
    print(f"\n{banner}")
    print("  How It Works Pipeline  (multi-agent)")
    print(banner)
    if args.app:
        print(f"  Filter: {args.app}")
    print()

    if not os.getenv("DEEPSEEK_API_KEY"):
        print("Error: DEEPSEEK_API_KEY not set.", file=sys.stderr)
        print("Create a .env file with:  DEEPSEEK_API_KEY=sk-...", file=sys.stderr)
        sys.exit(1)

    from how_it_works.graph import build_how_it_works_graph

    graph = build_how_it_works_graph()

    result = asyncio.run(
        graph.ainvoke(
            {
                "apps": [],
                "results": [],
                "verbose": args.verbose,
                "filter_app": args.app,
            },
            {"recursion_limit": 300},
        )
    )

    # Summary
    results = result.get("results", [])

    print(f"\n{banner}")
    print("  Summary")
    print(banner)

    for r in results:
        icon = "✗" if r.status == "error" else "↺" if r.status == "updated" else "✓"
        print(f"  {icon}  {r.app_name:<28} {r.status}")
        if r.error:
            print(f"       Error: {r.error}")

    written = sum(1 for r in results if r.status == "written")
    updated = sum(1 for r in results if r.status == "updated")
    errors = sum(1 for r in results if r.status == "error")

    print(f"\n  {written} written  ·  {updated} updated  ·  {errors} errors")

    if written > 0 or updated > 0:
        print("\n  Next steps:")
        print("    pnpm install          # link any newly added @ai-apps/ui deps")
        print("    pnpm build            # verify the generated pages compile")

    print()


if __name__ == "__main__":
    main()

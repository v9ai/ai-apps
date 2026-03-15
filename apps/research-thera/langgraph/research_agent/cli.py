"""CLI entry point — port of crates/research/src/bin/research_agent.rs."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv


def load_env() -> None:
    load_dotenv(".env.local")
    load_dotenv(".env")


async def _run_research(args: argparse.Namespace) -> None:
    from .graph import (
        extract_research_json,
        load_context_from_url,
        persist_research_to_d1,
        run_research,
    )
    from .therapy_context import TherapyContext

    api_key = args.api_key or os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("Error: DEEPSEEK_API_KEY not set — pass --api-key or set the env var", file=sys.stderr)
        sys.exit(1)

    semantic_scholar_api_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")

    if args.subcommand == "goal":
        context = TherapyContext.from_goal_file(args.goal_file)
    elif args.subcommand == "support-need":
        context = TherapyContext.from_support_need(args.support_need_file)
    elif args.subcommand == "query":
        context = TherapyContext(
            goal_id=0,
            family_member_id=0,
            therapeutic_goal_type=args.therapeutic_type,
            title=args.title,
            target_population=args.population or "children adolescents",
        )
    elif args.subcommand == "url":
        print(f"Fetching context from D1: {args.path}", file=sys.stderr)
        context = await load_context_from_url(args.path)
    else:
        print(f"Unknown subcommand: {args.subcommand}", file=sys.stderr)
        sys.exit(1)

    print(
        f"Context loaded: goal_id={context.goal_id} "
        f"type={context.therapeutic_goal_type!r} title={context.title!r}",
        file=sys.stderr,
    )
    print("Sending to DeepSeek Reasoner (may take 30–120s)…", file=sys.stderr)

    insights = await run_research(context, api_key, semantic_scholar_api_key)
    print(f"Research complete ({len(insights)} chars)", file=sys.stderr)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = (
        f"{timestamp}-{context.therapeutic_goal_type.lower().replace(' ', '-')}"
        f"-{context.goal_id}.md"
    )
    out_path = output_dir / filename
    out_path.write_text(insights, encoding="utf-8")
    print(f"Research written to {out_path}", file=sys.stderr)
    (output_dir / "latest-research.md").write_text(insights, encoding="utf-8")

    if args.stdout:
        print(insights)

    if args.subcommand == "url":
        json_str = extract_research_json(insights)
        if json_str:
            output = json.loads(json_str)
            saved, failed = await persist_research_to_d1(context, output, args.path)
            total = len(output.get("papers", []))
            print(f"\n✅ Persisted {saved}/{total} papers to D1 ({failed} failed)")
        else:
            print("⚠️  No JSON block found in research output — manual extraction required", file=sys.stderr)
    else:
        json_str = extract_research_json(insights)
        if json_str:
            print(json_str)
        else:
            print("⚠️  No JSON output block found in research", file=sys.stderr)


async def _run_story(args: argparse.Namespace) -> None:
    from .story import run_story_generation

    print(f"Generating story for {args.path}…", file=sys.stderr)
    story_text, story_id = await run_story_generation(
        args.path,
        language=args.language,
        minutes=args.minutes,
    )

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    feedback_id = args.path.rstrip("/").split("/")[-1]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    out_path = output_dir / f"{timestamp}-story-feedback-{feedback_id}.txt"
    out_path.write_text(story_text, encoding="utf-8")

    print(f"\n✅ Story generated ({len(story_text)} chars) and saved to D1 (story_id={story_id})")
    print(f"📄 File: {out_path}")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="research-agent",
        description="DeepSeek Reasoner + academic search therapeutic research agent",
    )
    parser.add_argument("--api-key", help="DeepSeek API key (or set DEEPSEEK_API_KEY)")
    parser.add_argument("--stdout", action="store_true", help="Also print markdown to stdout")
    parser.add_argument(
        "--output-dir",
        default="_memory/therapeutic-research",
        help="Output directory for research files (default: _memory/therapeutic-research)",
    )

    sub = parser.add_subparsers(dest="subcommand", required=True)

    # goal
    goal_p = sub.add_parser("goal", help="Research from a goal JSON file")
    goal_p.add_argument("--goal-file", required=True, help="Path to goal JSON file")

    # support-need
    sn_p = sub.add_parser("support-need", help="Research from a support need JSON file")
    sn_p.add_argument("--support-need-file", required=True, help="Path to support need JSON file")

    # query
    q_p = sub.add_parser("query", help="Research from inline parameters")
    q_p.add_argument("--therapeutic-type", required=True)
    q_p.add_argument("--title", required=True)
    q_p.add_argument("--population", default=None)

    # url
    url_p = sub.add_parser(
        "url",
        help="Research via D1 URL path, e.g. /family/2/characteristics/2",
    )
    url_p.add_argument("path", help="App URL path")

    # story
    story_p = sub.add_parser(
        "story",
        help="Generate therapeutic story from feedback, e.g. /family/x/contacts/y/feedback/1",
    )
    story_p.add_argument("path", help="Feedback URL path")
    story_p.add_argument("--language", default="Romanian", help="Output language (default: Romanian)")
    story_p.add_argument("--minutes", type=int, default=10, help="Target duration in minutes (default: 10)")

    return parser


def main() -> None:
    load_env()
    parser = _build_parser()
    args = parser.parse_args()

    if args.subcommand == "story":
        asyncio.run(_run_story(args))
    else:
        asyncio.run(_run_research(args))


if __name__ == "__main__":
    main()

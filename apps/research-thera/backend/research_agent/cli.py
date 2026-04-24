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
        persist_research,
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
        print(f"Fetching context from Neon: {args.path}", file=sys.stderr)
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
            saved, failed = await persist_research(context, output, args.path)
            total = len(output.get("papers", []))
            print(f"\n✅ Persisted {saved}/{total} papers to Neon ({failed} failed)")
        else:
            print("⚠️  No JSON block found in research output — manual extraction required", file=sys.stderr)
    else:
        json_str = extract_research_json(insights)
        if json_str:
            print(json_str)
        else:
            print("⚠️  No JSON output block found in research", file=sys.stderr)


async def _run_research_goal(args: argparse.Namespace) -> None:
    """Invoke the same ReAct research graph the web app uses (research_agent.graph)."""
    import os

    import psycopg

    from .graph import graph as research_graph

    conn_str = os.environ.get("NEON_DATABASE_URL", "")
    async with await psycopg.AsyncConnection.connect(conn_str) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT title, description, family_member_id FROM goals "
                "WHERE id = %s AND user_id = %s",
                (args.goal_id, args.user_email),
            )
            row = await cur.fetchone()
            if not row:
                print(f"❌ Goal {args.goal_id} not found for {args.user_email}", file=sys.stderr)
                sys.exit(1)
            goal_title, goal_desc, fm_id = row
            fm_name = None
            fm_age = None
            if fm_id:
                await cur.execute(
                    "SELECT first_name, name, age_years FROM family_members WHERE id = %s",
                    (fm_id,),
                )
                fm_row = await cur.fetchone()
                if fm_row:
                    fm_name = fm_row[0] or fm_row[1]
                    fm_age = fm_row[2]

    prompt_parts = [
        f"Goal: {goal_title}",
        f"Description: {goal_desc}" if goal_desc else "",
        f"Subject: {fm_name}, age {fm_age}" if fm_name else "",
        "",
        f"Find high-quality academic research papers relevant to this therapeutic goal and save them via save_research_papers with goal_id: {args.goal_id}.",
    ]
    prompt = "\n".join(p for p in prompt_parts if p)

    state: dict = {
        "messages": [{"role": "user", "content": prompt}],
        "userEmail": args.user_email,
        "goalId": args.goal_id,
        "hasRelatedMember": False,
        "evalPromptContext": prompt,
    }

    print(
        f"Invoking research graph: goal_id={args.goal_id} user={args.user_email}",
        file=sys.stderr,
    )
    result = await research_graph.ainvoke(state, config={"recursion_limit": 50})
    err = result.get("_error")
    if err:
        print(f"\n❌ {err.get('message') or 'research failed'}", file=sys.stderr)
        sys.exit(1)
    count = result.get("_saved_count", 0)
    summary = result.get("_summary") or ""
    print(f"\n✅ Persisted {count} research papers.")
    if summary:
        print(summary[:500])


async def _run_books(args: argparse.Namespace) -> None:
    from .books_graph import graph as books_graph

    state: dict = {"user_email": args.user_email}
    if args.goal_id is not None:
        state["goal_id"] = args.goal_id
    if args.journal_entry_id is not None:
        state["journal_entry_id"] = args.journal_entry_id
    if not args.persist:
        state["_skip_persist"] = True

    print(
        f"Invoking books graph: goal_id={args.goal_id} journal_entry_id={args.journal_entry_id} "
        f"user={args.user_email} persist={args.persist}",
        file=sys.stderr,
    )

    result = await books_graph.ainvoke(state)

    if not result.get("success"):
        print(f"\n❌ {result.get('message') or 'Books graph failed'}", file=sys.stderr)
        sys.exit(1)

    books = result.get("books") or []
    print(f"\n✅ {result.get('message')}\n")

    evals = result.get("_evals") or {}
    if evals:
        verified = evals.get("verified_count", 0)
        rejected = evals.get("rejected_count", 0)
        backfilled = evals.get("backfilled_count", 0)
        attempted = verified + rejected
        print(f"Verification: {verified}/{attempted} confirmed on Open Library"
              + (f" (backfilled {backfilled})" if backfilled else ""))
        for r in (evals.get("rejections") or []):
            authors = ", ".join(r.get("authors") or [])
            closest = r.get("closest_match")
            closest_str = f" — closest: \"{closest}\"" if closest else ""
            print(f"  - dropped: \"{r['title']}\" by {authors}{closest_str}")
            reason = r.get("reason")
            if reason:
                print(f"      reason: {reason}")
        print()

    for i, b in enumerate(books, 1):
        year = f" ({b['year']})" if b.get("year") else ""
        authors = ", ".join(b.get("authors") or [])
        isbn = f" ISBN {b['isbn']}" if b.get("isbn") else ""
        print(f"{i}. {b['title']}{year}")
        print(f"   by {authors}")
        print(f"   [{b.get('category')}]{isbn}")
        if b.get("description"):
            print(f"   {b['description']}")
        if b.get("whyRecommended"):
            print(f"   Why: {b['whyRecommended']}")
        print()


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

    print(f"\n✅ Story generated ({len(story_text)} chars) and saved to Neon (story_id={story_id})")
    print(f"📄 File: {out_path}")


async def _run_backfill_bogdan_embeddings(args: argparse.Namespace) -> None:
    from .backfill_bogdan_embeddings import backfill

    await backfill(args.user_email, args.name)


async def _run_bogdan_discussion(args: argparse.Namespace) -> None:
    """Invoke the bogdan_discussion LangGraph in-process (no LangGraph server required)."""
    import uuid

    import psycopg

    from .bogdan_discussion_graph import graph as bogdan_graph

    conn_str = os.environ.get("NEON_DATABASE_URL", "")
    if not conn_str:
        print("Error: NEON_DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    family_member_id = args.family_member_id
    if family_member_id is None:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id FROM family_members "
                    "WHERE user_id = %s AND LOWER(first_name) = LOWER(%s) LIMIT 1",
                    (args.user_email, args.name),
                )
                row = await cur.fetchone()
                if not row:
                    print(
                        f"❌ No family member named '{args.name}' for {args.user_email}",
                        file=sys.stderr,
                    )
                    sys.exit(1)
                family_member_id = row[0]

    job_id = args.job_id or str(uuid.uuid4())
    if args.create_job:
        async with await psycopg.AsyncConnection.connect(conn_str) as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO generation_jobs (id, user_id, type, status, progress) "
                    "VALUES (%s, %s, 'BOGDAN_DISCUSSION', 'RUNNING', 0)",
                    (job_id, args.user_email),
                )
        print(f"Created generation_jobs row: {job_id}", file=sys.stderr)

    print(
        f"Invoking bogdan_discussion graph: family_member_id={family_member_id} "
        f"user={args.user_email} is_ro={args.is_ro} job_id={job_id}",
        file=sys.stderr,
    )

    state = {
        "family_member_id": family_member_id,
        "user_email": args.user_email,
        "job_id": job_id if args.create_job else "",
        "is_ro": args.is_ro,
    }
    result = await bogdan_graph.ainvoke(state, config={"recursion_limit": 25})

    if result.get("error"):
        print(f"\n❌ {result['error']}", file=sys.stderr)
        sys.exit(1)

    guide = result.get("guide") or {}
    guide_id = result.get("guide_id")
    print(f"\n✅ Persisted bogdan_discussion_guides row id={guide_id}")

    if args.stdout:
        print(json.dumps(guide, ensure_ascii=False, indent=2))


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
        help="Research via Neon URL path, e.g. /family/x/contacts/y/feedback/1",
    )
    url_p.add_argument("path", help="App URL path")

    # research-goal (invokes the newer generate_therapy_research_graph)
    rg_p = sub.add_parser(
        "research-goal",
        help="Generate therapy research for an existing goal via the LangGraph pipeline",
    )
    rg_p.add_argument("--user-email", required=True, help="Owner email (goals.user_id)")
    rg_p.add_argument("--goal-id", type=int, required=True, help="Goal id")
    rg_p.add_argument("--language", default=None, help='Output language (e.g. "ro")')

    # books
    books_p = sub.add_parser(
        "books",
        help="Recommend books for a goal or journal entry via the books LangGraph",
    )
    books_p.add_argument("--user-email", required=True, help="Owner email (goals.user_id)")
    books_p.add_argument("--goal-id", type=int, default=None, help="Goal id")
    books_p.add_argument("--journal-entry-id", type=int, default=None, help="Journal entry id")
    books_p.add_argument(
        "--persist",
        action="store_true",
        help="Write results to recommended_books (default: dry-run, print only)",
    )

    # story
    story_p = sub.add_parser(
        "story",
        help="Generate therapeutic story from feedback, e.g. /family/x/contacts/y/feedback/1",
    )
    story_p.add_argument("path", help="Feedback URL path")
    story_p.add_argument("--language", default="Romanian", help="Output language (default: Romanian)")
    story_p.add_argument("--minutes", type=int, default=10, help="Target duration in minutes (default: 10)")

    # bogdan-discussion
    bd_p = sub.add_parser(
        "bogdan-discussion",
        help="Generate a parent discussion guide for Bogdan via the bogdan_discussion graph",
    )
    bd_p.add_argument("--user-email", required=True, help="Owner email (family_members.user_id)")
    bd_p.add_argument("--name", default="Bogdan", help='Family member first name (default: "Bogdan")')
    bd_p.add_argument(
        "--family-member-id",
        type=int,
        default=None,
        help="Override: use this family_member_id directly instead of looking up by name",
    )
    bd_p.add_argument(
        "--is-ro",
        action="store_true",
        default=True,
        help="Generate guide in Romanian (default: true)",
    )
    bd_p.add_argument("--no-ro", dest="is_ro", action="store_false", help="Generate in English")
    bd_p.add_argument(
        "--create-job",
        action="store_true",
        help="Create a generation_jobs row and update its status (matches the web flow)",
    )
    bd_p.add_argument("--job-id", default=None, help="Reuse an existing job id (with --create-job off)")

    # backfill-bogdan-embeddings
    bbe_p = sub.add_parser(
        "backfill-bogdan-embeddings",
        help="Embed all Bogdan-relevant rows + linked therapy_research papers (idempotent)",
    )
    bbe_p.add_argument("--user-email", required=True)
    bbe_p.add_argument("--name", default="Bogdan")

    return parser


def main() -> None:
    load_env()
    parser = _build_parser()
    args = parser.parse_args()

    if args.subcommand == "story":
        asyncio.run(_run_story(args))
    elif args.subcommand == "books":
        asyncio.run(_run_books(args))
    elif args.subcommand == "research-goal":
        asyncio.run(_run_research_goal(args))
    elif args.subcommand == "bogdan-discussion":
        asyncio.run(_run_bogdan_discussion(args))
    elif args.subcommand == "backfill-bogdan-embeddings":
        asyncio.run(_run_backfill_bogdan_embeddings(args))
    else:
        asyncio.run(_run_research(args))


if __name__ == "__main__":
    main()

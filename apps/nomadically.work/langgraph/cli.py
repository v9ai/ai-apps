"""
CLI entry point for langgraph pipelines.

Usage:
    python -m cli discover --topics "remote AI startups EU" --dry-run
    python -m cli classify --limit 200
    python -m cli process --limit 5
    python -m cli match --skills react,typescript
    python -m cli cleanup --dry-run
"""

import click
from dotenv import load_dotenv

load_dotenv()


@click.group()
def main():
    """Nomadically LangGraph pipelines."""
    pass


# ---------------------------------------------------------------------------
# Existing commands
# ---------------------------------------------------------------------------

@main.command()
@click.option(
    "--topics", "-t", multiple=True, required=True,
    help="Seed topics for company discovery (can pass multiple)",
)
@click.option("--max-results", "-n", default=10, show_default=True, help="Max search results per query")
@click.option("--dry-run", is_flag=True, default=False, help="Run pipeline without writing to DB")
def discover(topics: tuple[str, ...], max_results: int, dry_run: bool):
    """Discover new remote AI companies via web search."""
    from src.discovery.graph import build_discovery_graph

    graph = build_discovery_graph()

    print(f"Starting discovery pipeline")
    print(f"  Topics: {', '.join(topics)}")
    print(f"  Max results per query: {max_results}")
    print(f"  Dry run: {dry_run}\n")

    result = graph.invoke({
        "seed_topics": list(topics),
        "search_queries": [],
        "search_results": [],
        "candidates": [],
        "research_results": [],
        "persisted_companies": [],
        "stats": {
            "total_searched": 0,
            "candidates_found": 0,
            "qualified": 0,
            "persisted": 0,
        },
        "dry_run": dry_run,
        "max_results": max_results,
    })

    stats = result.get("stats", {})
    print(f"\n--- Summary ---")
    print(f"  Queries generated: {len(result.get('search_queries', []))}")
    print(f"  Total search results: {stats.get('total_searched', 0)}")
    print(f"  Unique candidates: {stats.get('candidates_found', 0)}")
    print(f"  Qualified (AI + remote): {stats.get('qualified', 0)}")
    print(f"  Persisted: {stats.get('persisted', 0)}")


@main.command()
@click.option("--limit", "-l", default=200, show_default=True, help="Max jobs to classify")
def classify(limit: int):
    """Run the existing job classifier pipeline (AI company + remote)."""
    from src.graph import build_graph

    graph = build_graph()
    print(f"Starting classifier pipeline (limit={limit})...\n")

    result = graph.invoke({
        "jobs": [],
        "classifications": [],
        "remote_ai_companies": [],
    })

    companies = result.get("remote_ai_companies", [])
    print(f"\n--- Remote AI Companies ({len(companies)}) ---")
    for c in companies:
        print(f"  {c['name']}: {c['job_count']} jobs (ai={c['ai_confidence']}, remote={c['remote_confidence']})")
        for title in c.get("sample_titles", []):
            print(f"    - {title}")


# ---------------------------------------------------------------------------
# New commands — ported from Cloudflare Workers
# ---------------------------------------------------------------------------

@main.command()
@click.option("--limit", "-l", default=50, show_default=True, help="Max jobs per phase")
def process(limit: int):
    """Run the full 4-phase job processing pipeline.

    Phase 1: ATS Enhancement (fetch from Greenhouse/Lever/Ashby APIs)
    Phase 2: Role Tagging (heuristic + DeepSeek)
    Phase 3: EU Classification (heuristic + DeepSeek)
    Phase 4: Skill Extraction (DeepSeek)
    """
    from src.graphs.process_jobs import build_process_jobs_graph

    graph = build_process_jobs_graph()
    print(f"Starting process-jobs pipeline (limit={limit})...\n")

    result = graph.invoke({
        "limit": limit,
        "phase_results": [],
        "stats": {},
    })

    print(f"\n--- Pipeline Results ---")
    for phase in result.get("phase_results", []):
        phase_name = phase.get("phase", "unknown")
        print(f"\n  Phase: {phase_name}")
        for k, v in phase.items():
            if k != "phase":
                print(f"    {k}: {v}")


@main.command("eu-classify")
@click.option("--limit", "-l", default=100, show_default=True, help="Max jobs to classify")
def eu_classify(limit: int):
    """Run standalone EU classifier on role-match jobs."""
    from src.graphs.eu_classifier import build_eu_classifier_graph
    from src.db.connection import get_connection
    from src.db.queries import fetch_role_match_jobs

    conn = get_connection()
    rows = fetch_role_match_jobs(conn, limit)
    conn.close()

    if not rows:
        print("No role-match jobs found to classify.")
        return

    graph = build_eu_classifier_graph()
    print(f"Classifying {len(rows)} role-match jobs...\n")

    stats = {"processed": 0, "euRemote": 0, "nonEu": 0, "errors": 0}

    for job in rows:
        try:
            result = graph.invoke({
                "job": dict(job),
                "signals": None,
                "classification": None,
                "source": "",
            })
            classification = result.get("classification") or {}
            is_eu = classification.get("isRemoteEU", False)
            source = result.get("source", "?")
            print(f"  {job.get('title', '?')[:60]:60s} -> {'EU' if is_eu else 'non-EU':6s} [{source}]")
            stats["processed"] += 1
            if is_eu:
                stats["euRemote"] += 1
            else:
                stats["nonEu"] += 1
        except Exception as e:
            print(f"  Error classifying {job.get('id')}: {e}")
            stats["errors"] += 1

    print(f"\n--- EU Classification Summary ---")
    print(f"  Processed: {stats['processed']}")
    print(f"  EU Remote: {stats['euRemote']}")
    print(f"  Non-EU:    {stats['nonEu']}")
    print(f"  Errors:    {stats['errors']}")


@main.command()
@click.option("--skills", "-s", required=True, help="Comma-separated skill tags (e.g. react,typescript)")
@click.option("--limit", "-l", default=20, show_default=True, help="Max results to return")
def match(skills: str, limit: int):
    """Match jobs to user skills using LLM role scoring."""
    from src.graphs.job_matcher import build_job_matcher_graph

    skill_list = [s.strip() for s in skills.split(",") if s.strip()]
    if not skill_list:
        print("No skills provided.")
        return

    graph = build_job_matcher_graph()
    print(f"Matching jobs for skills: {', '.join(skill_list)} (limit={limit})...\n")

    result = graph.invoke({
        "user_skills": skill_list,
        "limit": limit,
        "candidates": [],
        "role_scores": {},
        "ranked": [],
    })

    ranked = result.get("ranked", [])
    if not ranked:
        print("No matching jobs found.")
        return

    print(f"--- Top {len(ranked)} Matches ---")
    for i, r in enumerate(ranked[:limit], 1):
        job = r.get("job", {})
        print(f"\n  {i}. {job.get('title', '?')} @ {job.get('company_key', '?')}")
        print(f"     Score: {r.get('matchScore', 0):.2f}")
        print(f"     Matched: {', '.join(r.get('matchedSkills', []))}")
        if r.get("missingSkills"):
            print(f"     Missing: {', '.join(r['missingSkills'][:5])}")


@main.command()
@click.option("--dry-run", is_flag=True, default=False, help="Show what would be cleaned up without doing it")
@click.option("--cutoff-days", default=30, show_default=True, help="Days before a job is considered stale")
def cleanup(dry_run: bool, cutoff_days: int):
    """Clean up stale jobs older than cutoff days."""
    from src.graphs.cleanup_jobs import build_cleanup_graph

    graph = build_cleanup_graph()
    print(f"Starting cleanup (dry_run={dry_run}, cutoff_days={cutoff_days})...\n")

    result = graph.invoke({
        "dry_run": dry_run,
        "cutoff_days": cutoff_days,
        "stale_ids": [],
        "stats": {},
    })

    stats = result.get("stats", {})
    if dry_run:
        print(f"Would mark {stats.get('would_mark_stale', stats.get('eligible', 0))} jobs stale.")
    else:
        print(f"Marked {stats.get('marked_stale', 0)} jobs stale.")


@main.command("interview-prep")
@click.option("--app-id", "-a", required=True, type=int, help="Application ID from the database")
@click.option("--save/--no-save", default=True, show_default=True, help="Save report to applications.ai_interview_questions")
def interview_prep(app_id: int, save: bool):
    """Generate interview prep questions for a job application."""
    import psycopg
    from src.db.connection import get_connection
    from src.graphs.interview_prep import build_interview_prep_graph

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, job_title, company_name, job_description, status FROM applications WHERE id = %s",
            [app_id],
        )
        app = cur.fetchone()

    if not app:
        print(f"Application {app_id} not found.")
        conn.close()
        return

    if not app.get("job_description"):
        print("Application has no job description — cannot generate prep questions.")
        conn.close()
        return

    # Resolve company_key from jobs table
    company_name = app["company_name"] or ""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT company_key FROM jobs WHERE lower(company_name) = lower(%s) LIMIT 1",
            [company_name],
        )
        key_row = cur.fetchone()
    company_key = (key_row["company_key"] if key_row else company_name.lower()) or ""

    print(f"\nApplication #{app_id}: {app['job_title']} @ {company_name}")
    print(f"Status: {app['status']} | company_key: {company_key}\n")
    print("Running interview prep pipeline...\n")

    graph = build_interview_prep_graph()
    result = graph.invoke({
        "application_id": app_id,
        "job_title": app["job_title"] or "",
        "company_name": company_name,
        "company_key": company_key,
        "job_description": app["job_description"] or "",
        "parsed": None,
        "company_context": "",
        "question_sets": [],
        "report": "",
    })

    report = result.get("report", "")

    if save and report:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE applications SET ai_interview_questions = %s, updated_at = now() WHERE id = %s",
                [report, app_id],
            )
        conn.commit()
        print(f"\nSaved to applications.ai_interview_questions (app #{app_id})")

    conn.close()
    print("\n" + "=" * 70)
    print(report)


@main.command("eval-interview-prep")
def eval_interview_prep():
    """Run deepeval evals for the interview prep graph."""
    from src.graphs.interview_prep.evals import main as run_evals
    run_evals()


if __name__ == "__main__":
    main()

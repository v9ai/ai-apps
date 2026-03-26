"""
CLI entry point for LlamaIndex Workflows pipelines.

Usage:
    python -m cli interview-prep --app-id 18
    python -m cli tech-knowledge --app-id 18 --dry-run
    python -m cli eval-interview-prep
    python -m cli eval-tech-knowledge
"""

import asyncio
import sys

import click
from dotenv import load_dotenv

load_dotenv()


@click.group()
def main():
    """Nomadically LlamaIndex Workflows pipelines."""
    pass


@main.command("interview-prep")
@click.option("--app-id", "-a", required=True, type=int, help="Application ID from the database")
@click.option("--save/--no-save", default=True, show_default=True, help="Save report to applications.ai_interview_questions")
@click.option("--trace/--no-trace", default=False, show_default=True, help="Enable DeepEval tracing")
def interview_prep(app_id: int, save: bool, trace: bool):
    """Generate interview prep questions for a job application."""
    if trace:
        from src.tracing import setup_tracing
        setup_tracing()

    from src.db.connection import get_connection
    from src.workflows.interview_prep import InterviewPrepWorkflow

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
    print("Running interview prep workflow...\n")

    async def _run():
        workflow = InterviewPrepWorkflow(timeout=120, verbose=False)
        return await workflow.run(
            application_id=app_id,
            job_title=app["job_title"] or "",
            company_name=company_name,
            job_description=app["job_description"] or "",
            company_key=company_key,
        )

    result = asyncio.run(_run())

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


@main.command("tech-knowledge")
@click.option("--app-id", "-a", type=int, default=None, help="Application ID to extract tech from")
@click.option("--job-id", "-j", type=int, default=None, help="Job ID to extract tech from")
@click.option("--exclude", "-x", default="", help="Comma-separated tags to exclude (e.g. webpack,jest)")
@click.option("--dry-run", is_flag=True, default=False, help="Extract and show technologies without persisting")
@click.option("--trace/--no-trace", default=False, show_default=True, help="Enable DeepEval tracing")
def tech_knowledge(app_id: int | None, job_id: int | None, exclude: str, dry_run: bool, trace: bool):
    """Extract technologies from a job and generate knowledge study material."""
    if trace:
        from src.tracing import setup_tracing
        setup_tracing()

    import json as _json
    from src.db.connection import get_connection
    from src.workflows.tech_knowledge import TechKnowledgeWorkflow

    if not app_id and not job_id:
        print("Provide --app-id or --job-id.")
        return

    conn = get_connection()

    if app_id:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, job_title, company_name, job_description, tech_dismissed_tags FROM applications WHERE id = %s",
                [app_id],
            )
            row = cur.fetchone()
        if not row:
            print(f"Application {app_id} not found.")
            conn.close()
            return
        if not row.get("job_description"):
            print("Application has no job description.")
            conn.close()
            return
        title = row["job_title"] or ""
        company = row["company_name"] or ""
        description = row["job_description"] or ""
        source_id = app_id
    else:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, title, company_name, description FROM jobs WHERE id = %s",
                [job_id],
            )
            row = cur.fetchone()
        if not row:
            print(f"Job {job_id} not found.")
            conn.close()
            return
        title = row["title"] or ""
        company = row["company_name"] or ""
        description = row["description"] or ""
        source_id = job_id

    conn.close()

    # Merge CLI --exclude with DB-dismissed tags
    exclude_tags = [t.strip() for t in exclude.split(",") if t.strip()]
    if app_id and row.get("tech_dismissed_tags"):
        try:
            db_dismissed = _json.loads(row["tech_dismissed_tags"])
            if isinstance(db_dismissed, list):
                exclude_tags = list(set(exclude_tags) | set(db_dismissed))
        except (ValueError, TypeError):
            pass

    source_label = f"application #{app_id}" if app_id else f"job #{job_id}"
    print(f"\nTech Knowledge Pipeline — {title} @ {company}")
    print(f"Source: {source_label}")
    if exclude_tags:
        print(f"Dismissed: {', '.join(exclude_tags)}")
    print(f"Dry run: {dry_run}\n")

    async def _run():
        workflow = TechKnowledgeWorkflow(timeout=600, verbose=False)
        return await workflow.run(
            application_id=source_id,
            job_title=title,
            company_name=company,
            job_description=description,
            dry_run=dry_run,
            exclude_tags=exclude_tags,
        )

    result = asyncio.run(_run())

    print(f"\n--- Tech Knowledge Summary ---")
    print(f"  Technologies extracted: {result.get('technologies_extracted', 0)}")
    print(f"  Content generated: {result.get('content_generated', 0)}")
    if not dry_run:
        print(f"  Lessons persisted: {result.get('lessons_persisted', 0)}")
        print(f"  Concepts created: {result.get('concepts_created', 0)}")
        print(f"  Edges created: {result.get('edges_created', 0)}")


@main.command("podcast-discover")
@click.option("--slug", "-s", default=None, help="Discover podcasts for a single lesson slug")
@click.option("--limit", "-l", type=int, default=0, help="Max lessons to process (0 = all)")
@click.option("--trace/--no-trace", default=False, show_default=True, help="Enable DeepEval tracing")
def podcast_discover(slug: str | None, limit: int, trace: bool):
    """Search Spotify for podcasts related to knowledge lessons."""
    if trace:
        from src.tracing import setup_tracing
        setup_tracing()

    from src.workflows.podcast_discovery import PodcastDiscoveryWorkflow

    if slug:
        print(f"\nPodcast Discovery — lesson: {slug}\n")
    else:
        print(f"\nPodcast Discovery — {'all lessons' if not limit else f'up to {limit} lessons'}\n")

    async def _run():
        workflow = PodcastDiscoveryWorkflow(timeout=300, verbose=False)
        return await workflow.run(slug=slug, limit=limit)

    result = asyncio.run(_run())

    print(f"\n  Lessons processed: {result.get('lessons_processed', 0)}")
    print(f"  Podcasts saved:    {result.get('podcasts_saved', 0)}")


@main.command("eval-interview-prep")
def eval_interview_prep():
    """Run deepeval evals for the interview prep workflow."""
    from src.workflows.interview_prep.evals import main as run_evals
    run_evals()


@main.command("eval-tech-knowledge")
def eval_tech_knowledge():
    """Run deepeval evals for the tech knowledge workflow."""
    from src.workflows.tech_knowledge.evals import main as run_evals
    run_evals()


@main.command("eval-taxonomy")
def eval_taxonomy():
    """Run fast taxonomy normalization tests (no LLM)."""
    from src.workflows.tech_knowledge.evals import run_taxonomy_tests
    run_taxonomy_tests()


@main.command("eval-db")
def eval_db():
    """Run knowledge DB connectivity test (no LLM)."""
    from src.workflows.tech_knowledge.evals import run_db_connectivity_test
    run_db_connectivity_test()


@main.command("eval-coverage")
def eval_coverage():
    """Run dynamic extraction coverage test (uses DeepSeek)."""
    from src.workflows.tech_knowledge.evals import run_extraction_coverage_test
    run_extraction_coverage_test()


if __name__ == "__main__":
    main()

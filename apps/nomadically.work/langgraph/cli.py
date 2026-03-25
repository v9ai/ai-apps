"""
CLI entry point for langgraph pipelines.

Usage:
    python -m cli discover --topics "remote AI startups EU" --dry-run
    python -m cli classify --limit 200
    python -m cli process --limit 5
    python -m cli match --skills react,typescript
    python -m cli cleanup --dry-run
    python -m cli janitor
    python -m cli ingest --limit 500
    python -m cli crawl --provider ashby --pages 5
    python -m cli company-jobs --hours 24 --limit 50
    python -m cli report-job --job-id 123
    python -m cli app-prep --app-id 18
    python -m cli resume upload --user-id u1 --pdf /path/to/resume.pdf
    python -m cli resume search --user-id u1 --query "python experience"
    python -m cli resume chat --user-id u1 --message "what are my skills?"

    # Job search pipeline (local AI)
    python -m cli job-sync                                  # Sync Neon jobs → LanceDB
    python -m cli job-search                                # Match against your profile
    python -m cli job-search --eu-remote --generate-briefs  # With Qwen briefs
    python -m cli scrape-hn --limit 50                      # Ingest HN hiring
    python -m cli job-label                                 # Label matches for training
    python -m cli job-label-stats                           # Check labeling progress
    python -m cli job-finetune                              # Fine-tune embeddings
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


@main.command("app-prep")
@click.option("--app-id", "-a", type=int, default=None, help="Application ID from the database")
@click.option("--exclude", "-x", default="", help="Comma-separated tech tags to exclude (e.g. webpack,jest)")
@click.option("--dry-run", is_flag=True, default=False, help="Extract and show technologies without persisting")
@click.option("--save/--no-save", default=True, show_default=True, help="Save interview report to application")
@click.option("--eval", "run_eval", is_flag=True, default=False, help="Run eval suite (mock JDs, no DB needed)")
@click.option("--unit-only", is_flag=True, default=False, help="With --eval: run only deterministic unit tests")
def app_prep(app_id: int | None, exclude: str, dry_run: bool, save: bool, run_eval: bool, unit_only: bool):
    """Full application prep: interview questions + tech knowledge in one pass.

    Run on a real application:
        python -m cli app-prep --app-id 18

    Run eval suite (mock JDs, no DB):
        python -m cli app-prep --eval
        python -m cli app-prep --eval --unit-only
    """
    if run_eval:
        from src.graphs.application_prep.evals import run_unit_tests, main as run_all
        if unit_only:
            run_unit_tests()
        else:
            run_all()
        return

    if not app_id:
        raise click.UsageError("--app-id is required (or use --eval to run evals)")

    import json as _json

    from src.db.connection import get_connection
    from src.graphs.application_prep import build_application_prep_graph

    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, job_title, company_name, job_description, status, tech_dismissed_tags FROM applications WHERE id = %s",
            [app_id],
        )
        app = cur.fetchone()

    if not app:
        print(f"Application {app_id} not found.")
        conn.close()
        return

    if not app.get("job_description"):
        print("Application has no job description — cannot run prep.")
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
    conn.close()  # Close early — pipeline runs for minutes, Neon kills idle connections

    # Merge CLI --exclude with DB-dismissed tags
    exclude_tags = [t.strip() for t in exclude.split(",") if t.strip()]
    if app.get("tech_dismissed_tags"):
        try:
            db_dismissed = _json.loads(app["tech_dismissed_tags"])
            if isinstance(db_dismissed, list):
                exclude_tags = list(set(exclude_tags) | set(db_dismissed))
        except (ValueError, TypeError):
            pass

    print(f"\nApplication #{app_id}: {app['job_title']} @ {company_name}")
    print(f"Status: {app['status']} | company_key: {company_key}")
    if exclude_tags:
        print(f"Excluded tech: {', '.join(exclude_tags)}")
    print(f"Dry run: {dry_run}\n")
    print("Running application prep pipeline...\n")

    graph = build_application_prep_graph()
    result = graph.invoke({
        "application_id": app_id,
        "job_title": app["job_title"] or "",
        "company_name": company_name,
        "company_key": company_key,
        "job_description": app["job_description"] or "",
        "parsed": None,
        "company_context": "",
        "role_depth": None,
        "company_research": None,
        "technologies": [],
        "organized": [],
        "existing_slugs": [],
        "question_sets": [],
        "generated": [],
        "qa_scores": [],
        "refined_count": 0,
        "report": "",
        "knowledge_db_ok": False,
        "dry_run": dry_run,
        "exclude_tags": exclude_tags,
        "stats": {},
    })

    report = result.get("report", "")

    if save and report:
        save_conn = get_connection()
        with save_conn.cursor() as cur:
            cur.execute(
                "UPDATE applications SET ai_interview_questions = %s, updated_at = now() WHERE id = %s",
                [report, app_id],
            )
        save_conn.commit()
        save_conn.close()
        print(f"\nSaved to applications.ai_interview_questions (app #{app_id})")

    print("\n" + "=" * 70)
    print(report)


# ---------------------------------------------------------------------------
# Worker-ported commands (from Cloudflare Workers → LangGraph)
# ---------------------------------------------------------------------------

@main.command()
def janitor():
    """Run the janitor pipeline: sync boards, purge spam, cleanup dead sources.

    Ported from workers/janitor.ts (daily midnight UTC cron).
    """
    from src.graphs.janitor import build_janitor_graph

    graph = build_janitor_graph()
    print("Starting janitor pipeline...\n")

    result = graph.invoke({
        "phase_results": [],
        "stats": {},
    })

    print("--- Janitor Results ---")
    for phase in result.get("phase_results", []):
        phase_name = phase.get("phase", "unknown")
        print(f"\n  Phase: {phase_name}")
        for k, v in phase.items():
            if k != "phase":
                print(f"    {k}: {v}")


@main.command()
@click.option("--limit", "-l", default=500, show_default=True, help="Max stale sources to process")
def ingest(limit: int):
    """Ingest jobs from ATS APIs for stale sources + aggregators.

    Ported from workers/insert-jobs.ts (cron + queue).
    """
    from src.graphs.ingest_jobs import build_ingest_jobs_graph

    graph = build_ingest_jobs_graph()
    print(f"Starting job ingestion (limit={limit})...\n")

    result = graph.invoke({
        "limit": limit,
        "sources": [],
        "results": [],
        "stats": {},
    })

    stats = result.get("stats", {})
    print("\n--- Ingestion Summary ---")
    print(f"  Sources processed: {stats.get('sources_processed', 0)}")
    print(f"  Aggregators processed: {stats.get('aggregators_processed', 0)}")
    print(f"  Total fetched: {stats.get('total_fetched', 0)}")
    print(f"  Total inserted: {stats.get('total_inserted', 0)}")
    print(f"  Errors: {stats.get('errors', 0)}")


@main.command()
@click.option("--provider", "-p", default="ashby",
              type=click.Choice(["ashby", "greenhouse", "workable", "lever"]),
              show_default=True, help="ATS provider to crawl")
@click.option("--pages", default=3, show_default=True, help="CDX pages per run")
def crawl(provider: str, pages: int):
    """Crawl Common Crawl CDX to discover ATS job boards.

    Ported from workers/ashby-crawler (Rust/WASM).
    """
    from src.graphs.board_crawler import build_board_crawler_graph

    graph = build_board_crawler_graph()
    print(f"Starting board crawler (provider={provider}, pages={pages})...\n")

    result = graph.invoke({
        "provider": provider,
        "pages_per_run": pages,
        "discovered": [],
        "stats": {},
    })

    stats = result.get("stats", {})
    print("\n--- Crawler Summary ---")
    print(f"  Index: {stats.get('index_id', '?')}")
    print(f"  Total discovered: {stats.get('total_discovered', 0)}")
    print(f"  Unique boards: {stats.get('unique_boards', 0)}")
    print(f"  Upserted: {stats.get('upserted', 0)}")


@main.command("company-jobs")
@click.option("--hours", "-h", default=24, show_default=True, help="Lookback hours for recent companies")
@click.option("--limit", "-l", default=50, show_default=True, help="Max companies to process")
def company_jobs(hours: int, limit: int):
    """Fetch jobs for recently discovered AI-tier companies.

    Ported from workers/process-companies-cron.ts (6h cron).
    """
    from src.graphs.company_jobs import build_company_jobs_graph

    graph = build_company_jobs_graph()
    print(f"Starting company jobs pipeline (hours={hours}, limit={limit})...\n")

    result = graph.invoke({
        "hours_lookback": hours,
        "limit": limit,
        "companies": [],
        "results": [],
        "stats": {},
    })

    stats = result.get("stats", {})
    print("\n--- Company Jobs Summary ---")
    print(f"  Companies processed: {stats.get('companies_processed', 0)}")
    print(f"  Companies with jobs: {stats.get('companies_with_jobs', 0)}")
    print(f"  Total inserted: {stats.get('total_inserted', 0)}")


@main.command("report-job")
@click.option("--job-id", "-j", required=True, type=int, help="Job ID to analyze")
def report_job(job_id: int):
    """Run two-pass DeepSeek classification on a reported job.

    Ported from workers/job-reporter-llm (queue consumer).
    """
    from src.graphs.job_reporter import build_job_reporter_graph

    graph = build_job_reporter_graph()
    print(f"Analyzing reported job #{job_id}...\n")

    result = graph.invoke({
        "job_id": job_id,
        "job_data": {},
        "pass1_result": None,
        "pass2_result": None,
        "final_result": {},
        "stats": {},
    })

    stats = result.get("stats", {})
    final = result.get("final_result", {})
    print(f"--- Report Analysis ---")
    print(f"  Reason: {stats.get('reason', '?')}")
    print(f"  Confidence: {stats.get('confidence', 0):.2f}")
    print(f"  Action: {stats.get('action', '?')}")
    print(f"  Model: {stats.get('model', '?')}")
    print(f"  Passes: {stats.get('passes', 0)}")
    if final.get("reasoning"):
        print(f"  Reasoning: {final['reasoning']}")


@main.group()
def resume():
    """Resume RAG commands: upload, search, chat.

    Ported from workers/resume-rag (Python CF Worker).
    """
    pass


@resume.command()
@click.option("--user-id", "-u", required=True, help="User ID")
@click.option("--pdf", "-f", default=None, help="Path to PDF file")
@click.option("--text", "-t", default=None, help="Direct resume text")
@click.option("--resume-id", "-r", default=None, help="Resume ID (auto-generated if omitted)")
def upload(user_id: str, pdf: str | None, text: str | None, resume_id: str | None):
    """Upload and embed a resume (PDF or text)."""
    import base64
    from src.graphs.resume_rag import build_resume_rag_graph

    pdf_b64 = ""
    filename = ""
    resume_text = text or ""

    if pdf:
        with open(pdf, "rb") as f:
            pdf_b64 = base64.b64encode(f.read()).decode()
        filename = pdf.split("/")[-1]

    if not pdf_b64 and not resume_text:
        print("Provide --pdf or --text.")
        return

    graph = build_resume_rag_graph()
    print(f"Uploading resume for user {user_id}...\n")

    result = graph.invoke({
        "action": "upload",
        "user_id": user_id,
        "resume_id": resume_id or "",
        "resume_text": resume_text,
        "pdf_base64": pdf_b64,
        "filename": filename,
        "query": "",
        "limit": 5,
        "chunks_stored": 0,
        "search_results": [],
        "chat_response": "",
        "stats": {},
    })

    print(f"Chunks stored: {result.get('chunks_stored', 0)}")
    print(f"Resume ID: {result.get('resume_id', '?')}")


@resume.command()
@click.option("--user-id", "-u", required=True, help="User ID")
@click.option("--query", "-q", required=True, help="Search query")
@click.option("--limit", "-l", default=5, show_default=True, help="Max results")
@click.option("--resume-id", "-r", default="", help="Filter by resume ID")
def search(user_id: str, query: str, limit: int, resume_id: str):
    """Semantic search across resume chunks."""
    from src.graphs.resume_rag import build_resume_rag_graph

    graph = build_resume_rag_graph()
    print(f"Searching resumes for: {query}\n")

    result = graph.invoke({
        "action": "search",
        "user_id": user_id,
        "resume_id": resume_id,
        "resume_text": "",
        "pdf_base64": "",
        "filename": "",
        "query": query,
        "limit": limit,
        "chunks_stored": 0,
        "search_results": [],
        "chat_response": "",
        "stats": {},
    })

    results = result.get("search_results", [])
    if not results:
        print("No results found.")
        return

    for i, r in enumerate(results, 1):
        score = r.get("score", 0)
        text_preview = (r.get("text", ""))[:200]
        print(f"\n  {i}. (score: {score:.3f})")
        print(f"     {text_preview}...")


@resume.command()
@click.option("--user-id", "-u", required=True, help="User ID")
@click.option("--message", "-m", required=True, help="Chat message")
@click.option("--resume-id", "-r", default="", help="Resume ID for context")
def chat(user_id: str, message: str, resume_id: str):
    """RAG-powered chat about your resume."""
    from src.graphs.resume_rag import build_resume_rag_graph

    graph = build_resume_rag_graph()
    print(f"Chatting about resume...\n")

    result = graph.invoke({
        "action": "chat",
        "user_id": user_id,
        "resume_id": resume_id,
        "resume_text": "",
        "pdf_base64": "",
        "filename": "",
        "query": message,
        "limit": 5,
        "chunks_stored": 0,
        "search_results": [],
        "chat_response": "",
        "stats": {},
    })

    print(result.get("chat_response", "No response generated."))


@main.command("email-outreach")
@click.option("--json-input", is_flag=True, default=False, help="Read JSON from stdin, output JSON to stdout")
@click.option("--recipient-name", default="", help="Recipient name")
@click.option("--recipient-role", default="", help="Recipient role (e.g. 'CTO at Acme')")
@click.option("--post-text", default="", help="LinkedIn post text content")
@click.option("--post-url", default="", help="LinkedIn post URL")
@click.option("--recipient-email", default="", help="Recipient email address")
@click.option("--tone", default="professional and friendly", help="Email tone")
@click.option("--eval", "run_eval", is_flag=True, default=False, help="Run eval suite (no DB needed)")
@click.option("--unit-only", is_flag=True, default=False, help="With --eval: run only keyword screen unit tests")
def email_outreach(json_input, recipient_name, recipient_role, post_text, post_url, recipient_email, tone, run_eval, unit_only):
    """Generate AI-powered outreach email from a LinkedIn post.

    Interactive:
        python -m cli email-outreach --recipient-name "John" --post-text "We're hiring!" --recipient-email "john@acme.com"

    JSON mode (for subprocess invocation):
        echo '{"recipient_name":"John","post_text":"Hiring!","recipient_email":"john@acme.com"}' | python -m cli email-outreach --json-input

    Run evals:
        python -m cli email-outreach --eval
        python -m cli email-outreach --eval --unit-only
    """
    if run_eval:
        from src.graphs.email_outreach.evals import run_screen_unit_tests, main as run_all
        if unit_only:
            run_screen_unit_tests()
        else:
            run_all()
        return
    import json as _json
    import sys as _sys

    if json_input:
        input_data = _json.loads(_sys.stdin.read())
    else:
        input_data = {
            "recipient_name": recipient_name,
            "recipient_role": recipient_role,
            "post_text": post_text,
            "post_url": post_url,
            "recipient_email": recipient_email,
            "tone": tone,
        }

    from src.graphs.email_outreach import build_email_outreach_graph

    graph = build_email_outreach_graph()
    result = graph.invoke({
        "recipient_name": input_data.get("recipient_name", ""),
        "recipient_role": input_data.get("recipient_role", ""),
        "post_text": input_data.get("post_text", ""),
        "post_url": input_data.get("post_url", ""),
        "recipient_email": input_data.get("recipient_email", ""),
        "tone": input_data.get("tone", "professional and friendly"),
        "contact_context": "",
        "company_context": "",
        "post_analysis": None,
        "remote_eu_screen": None,
        "draft": None,
        "final": None,
    })

    final = result.get("final") or result.get("draft") or {"subject": "", "text": "", "html": ""}

    if json_input:
        # Clean JSON to stdout — all diagnostic output went to stderr via nodes
        print(_json.dumps(final))
    else:
        print(f"\nSubject: {final.get('subject', '')}")
        print(f"\n{final.get('text', '')}")


@main.command("linkedin-contact")
@click.option("--url", required=False, default="", help="LinkedIn profile URL")
@click.option("--name", required=False, default="", help="Contact name")
@click.option("--headline", default="", help="LinkedIn headline")
@click.option("--about", default="", help="About/summary text")
@click.option("--location", default="", help="Location")
@click.option("--eval", "run_eval", is_flag=True, default=False, help="Run eval suite (no DB needed)")
def linkedin_contact(url, name, headline, about, location, run_eval):
    """Analyze a LinkedIn profile and save as contact if relevant.

    Interactive:
        python -m cli linkedin-contact --url "https://linkedin.com/in/someone" --name "Jane Doe" --headline "AI Recruiter"

    Run evals:
        python -m cli linkedin-contact --eval
    """
    if run_eval:
        from src.graphs.linkedin_contact.evals import main as run_all
        run_all()
        return

    if not name and not url:
        raise click.UsageError("--name or --url is required (or use --eval to run evals)")

    from src.graphs.linkedin_contact import build_linkedin_contact_graph

    graph = build_linkedin_contact_graph()
    result = graph.invoke({
        "linkedin_url": url,
        "name": name,
        "headline": headline,
        "about": about,
        "location": location,
        "profile_analysis": None,
        "contact_id": None,
        "skipped": False,
    })

    analysis = result.get("profile_analysis") or {}
    print(f"\nProfile: {name}")
    print(f"  Relevant: {analysis.get('is_relevant')}")
    print(f"  Type: {analysis.get('contact_type')}")
    print(f"  Focus: {', '.join(analysis.get('focus_areas', []))}")
    print(f"  Regions: {', '.join(analysis.get('regions', []))}")
    print(f"  Score: {analysis.get('relevance_score')}")
    print(f"  Reason: {analysis.get('reason')}")
    print(f"\n  Skipped: {result.get('skipped')}")
    print(f"  Contact ID: {result.get('contact_id')}")


@main.command("discover-contacts")
@click.option(
    "--topics", "-t", multiple=True, required=True,
    help="Seed topics for contact discovery (can pass multiple)",
)
@click.option("--max-results", "-n", default=15, show_default=True, help="Max search results per query")
@click.option("--dry-run", is_flag=True, default=False, help="Analyze profiles without saving to DB")
def discover_contacts(topics: tuple[str, ...], max_results: int, dry_run: bool):
    """Discover AI/ML recruiters and hiring contacts on LinkedIn en masse.

    Examples:
        python -m cli discover-contacts -t "AI ML recruiter EU"
        python -m cli discover-contacts -t "AI recruiter UK" -t "ML hiring manager EMEA" --dry-run
        python -m cli discover-contacts -t "talent acquisition AI Europe" -n 20
    """
    from src.graphs.linkedin_contact.discover import build_discover_contacts_graph

    graph = build_discover_contacts_graph()

    print(f"Starting contact discovery pipeline")
    print(f"  Topics: {', '.join(topics)}")
    print(f"  Max results per query: {max_results}")
    print(f"  Dry run: {dry_run}\n")

    graph.invoke({
        "seed_topics": list(topics),
        "search_queries": [],
        "search_results": [],
        "candidates": [],
        "results": [],
        "dry_run": dry_run,
        "max_results": max_results,
    })


# ---------------------------------------------------------------------------
# VectorDB commands — LanceDB semantic search over contacts & posts
# ---------------------------------------------------------------------------

@main.command("contact-sync")
@click.option("--full", is_flag=True, default=False, help="Full re-embed (overwrite). Default: incremental.")
def contact_sync(full: bool):
    """Sync contacts from Neon to LanceDB with MLX embeddings.

    First run:
        python -m cli contact-sync --full

    Subsequent runs (incremental):
        python -m cli contact-sync
    """
    from src.vectordb.sync import sync_contacts

    result = sync_contacts(full=full)
    print(f"\n--- Sync Result ---")
    print(f"  Mode: {result.mode}")
    print(f"  Synced: {result.synced}")
    print(f"  Total: {result.total_rows}")
    if result.errors:
        for e in result.errors:
            print(f"  Error: {e}")


@main.command("contact-search")
@click.argument("query")
@click.option("--top", "-n", default=20, show_default=True, help="Number of results")
@click.option("--ai-tier-min", type=int, default=None, help="Min AI tier (0/1/2)")
@click.option("--contact-type", default=None, help="Filter: recruiter, hiring_manager, founder, talent_partner")
@click.option("--regions", default=None, help="Filter regions (e.g. 'eu', 'uk')")
@click.option("--company-category", default=None, help="Filter: PRODUCT, CONSULTANCY, AGENCY, STAFFING")
@click.option("--email-verified", is_flag=True, default=False, help="Only contacts with verified email")
def contact_search(query, top, ai_tier_min, contact_type, regions, company_category, email_verified):
    """Semantic search over contacts.

    Examples:
        python -m cli contact-search "AI recruiter hiring LLM engineers in EU"
        python -m cli contact-search "ML hiring manager" --ai-tier-min 1 --email-verified
        python -m cli contact-search "talent partner" --contact-type recruiter --regions eu
    """
    from src.vectordb.search import search_contacts

    results = search_contacts(
        query,
        top_k=top,
        ai_tier_min=ai_tier_min,
        contact_type=contact_type,
        regions=regions,
        company_category=company_category,
        email_verified_only=email_verified,
    )

    if not results:
        print("No results found.")
        return

    print(f"\n{'='*80}")
    print(f"  Top {len(results)} contacts for: \"{query}\"")
    print(f"{'='*80}\n")

    for i, c in enumerate(results, 1):
        badges = ""
        if c.ai_tier >= 1:
            badges += f" [AI-T{c.ai_tier}]"
        if c.email_verified and c.email:
            badges += " [verified]"
        if c.regions:
            badges += f" [{c.regions}]"

        print(f"  {i:3d}. {c.first_name} {c.last_name}{badges}")
        print(f"       {c.position}")
        print(f"       {c.company} | type={c.contact_type} | sim={c.similarity:.3f}")
        if c.email:
            print(f"       {c.email}")
        if c.linkedin_url:
            print(f"       {c.linkedin_url}")
        if c.focus_areas:
            print(f"       focus: {c.focus_areas}")
        print()


@main.command("post-sync")
def post_sync():
    """Sync LinkedIn posts from Rust LanceDB to vectordb with embeddings.

        python -m cli post-sync
    """
    from src.vectordb.sync import sync_posts

    result = sync_posts()
    print(f"\n--- Sync Result ---")
    print(f"  Mode: {result.mode}")
    print(f"  Synced: {result.synced}")
    print(f"  Total: {result.total_rows}")
    if result.errors:
        for e in result.errors:
            print(f"  Error: {e}")


@main.command("post-search")
@click.argument("query")
@click.option("--top", "-n", default=20, show_default=True, help="Number of results")
@click.option("--min-reactions", type=int, default=None, help="Min reaction count")
@click.option("--no-reposts", is_flag=True, default=False, help="Exclude reposts")
def post_search(query, top, min_reactions, no_reposts):
    """Semantic search over LinkedIn posts.

    Examples:
        python -m cli post-search "hiring AI engineer remote Europe"
        python -m cli post-search "LLM infrastructure" --min-reactions 50
    """
    from src.vectordb.search import search_posts

    results = search_posts(
        query,
        top_k=top,
        min_reactions=min_reactions,
        exclude_reposts=no_reposts,
    )

    if not results:
        print("No results found.")
        return

    print(f"\n{'='*80}")
    print(f"  Top {len(results)} posts for: \"{query}\"")
    print(f"{'='*80}\n")

    for i, p in enumerate(results, 1):
        preview = (p.post_text or "")[:120].replace("\n", " ")
        print(f"  {i:3d}. {p.author_name} | reactions={p.reactions_count} | sim={p.similarity:.3f}")
        print(f"       {preview}...")
        if p.post_url:
            print(f"       {p.post_url}")
        if p.posted_date:
            print(f"       date: {p.posted_date}")
        print()


@main.command("contact-audit")
@click.option("--threshold", "-t", default=0.35, show_default=True, help="Score threshold for keep/remove decision")
def contact_audit(threshold: float):
    """Audit contacts by their LinkedIn post content — keep or remove.

    Scores each contact's posts for AI/ML relevance using embeddings + keyword signals.
    Contacts below threshold are marked do_not_contact in Neon.

    Examples:
        python -m cli contact-audit
        python -m cli contact-audit --threshold 0.40
    """
    from src.vectordb.audit import audit_contacts

    results = audit_contacts(threshold=threshold)

    if not results:
        return

    remove = [r for r in results if r.decision == "remove"]
    keep = [r for r in results if r.decision == "keep"]
    total_posts = sum(r.num_posts for r in results)

    print(f"{'='*80}")
    print(f"  Contact Audit: {len(results)} contacts with {total_posts} posts")
    print(f"  Threshold: {threshold}")
    print(f"{'='*80}")

    if remove:
        print(f"\n  REMOVED ({len(remove)} contacts, score < {threshold}):\n")
        for i, r in enumerate(remove, 1):
            print(f"  {i:3d}. {r.name} (score={r.final_score:.4f})")
            pos = r.position[:70] if r.position else ""
            print(f"       {pos} | {r.company} | {r.num_posts} posts")
            print(f"       {r.reason}")
            if r.sample_posts:
                print(f"       Best post: \"{r.sample_posts[0][:100]}...\"")
            print()

    if keep:
        print(f"\n  KEEP ({len(keep)} contacts, score >= {threshold}):\n")
        for i, r in enumerate(keep, 1):
            print(f"  {i:3d}. {r.name} (score={r.final_score:.4f})")
            pos = r.position[:70] if r.position else ""
            print(f"       {pos} | {r.company} | {r.num_posts} posts")
            print(f"       {r.reason}")
            if r.sample_posts:
                print(f"       Best post: \"{r.sample_posts[0][:100]}...\"")
            print()

    print(f"{'─'*80}")
    print(f"  Summary: Removed {len(remove)}, Kept {len(keep)}")
    print()


# ---------------------------------------------------------------------------
# Job search pipeline — LanceDB sync, search, scrape, label, finetune
# ---------------------------------------------------------------------------

@main.command("job-sync")
@click.option("--all-jobs", is_flag=True, default=False, help="Sync all jobs (default: EU remote only)")
def job_sync(all_jobs: bool):
    """Sync jobs from Neon to LanceDB with MLX embeddings.

    First run:
        python -m cli job-sync

    All jobs (not just EU remote):
        python -m cli job-sync --all-jobs
    """
    from src.vectordb.sync import sync_jobs

    result = sync_jobs(eu_remote_only=not all_jobs)
    print(f"\n--- Job Sync Result ---")
    print(f"  Mode: {result.mode}")
    print(f"  Synced: {result.synced}")
    print(f"  Total: {result.total_rows}")
    if result.errors:
        for e in result.errors:
            print(f"  Error: {e}")


@main.command("job-search")
@click.argument("query", required=False, default=None)
@click.option("--top", "-n", default=20, show_default=True, help="Number of results")
@click.option("--remote-only", is_flag=True, default=False, help="Only fully remote jobs")
@click.option("--eu-remote", is_flag=True, default=False, help="Only EU remote jobs (is_remote_eu=true)")
@click.option("--min-salary", type=int, default=None, help="Minimum salary")
@click.option("--ai-tier-min", type=int, default=None, help="Min company AI tier (0/1/2)")
@click.option("--ai-roles", is_flag=True, default=False, help="Only AI engineer roles")
@click.option("--generate-briefs", is_flag=True, default=False, help="Generate AI briefs for top 3 matches")
def job_search(query, top, remote_only, eu_remote, min_salary, ai_tier_min, ai_roles, generate_briefs):
    """Semantic search over jobs matched against your profile.

    Examples:
        python -m cli job-search                           # default profile match
        python -m cli job-search "Rust AI infrastructure"  # custom query
        python -m cli job-search --eu-remote --min-salary 80000
        python -m cli job-search --eu-remote --generate-briefs
    """
    from src.vectordb.search import search_jobs

    results = search_jobs(
        query=query,
        top_k=top,
        remote_only=remote_only,
        eu_remote_only=eu_remote,
        min_salary=min_salary,
        ai_tier_min=ai_tier_min,
        role_ai_only=ai_roles,
    )

    if not results:
        print("No jobs found. Run 'python -m cli job-sync' first.")
        return

    filters = []
    if remote_only:
        filters.append("remote only")
    if eu_remote:
        filters.append("EU remote")
    if min_salary:
        filters.append(f"min ${min_salary:,}")
    if ai_roles:
        filters.append("AI roles")
    filter_str = f" ({', '.join(filters)})" if filters else ""

    print(f"\n{'=' * 80}")
    print(f"  Top {len(results)} jobs{filter_str}")
    print(f"{'=' * 80}\n")

    for i, j in enumerate(results, 1):
        salary = f"${j.salary_min:,}-${j.salary_max:,}" if j.salary_min > 0 else "not listed"
        badges = ""
        if j.remote_policy == "full_remote":
            badges += " [remote]"

        print(f"  {i:3d}. [{j.similarity:.3f}] {j.title}{badges}")
        print(f"       {j.company_name} | {salary}")
        if j.skills:
            print(f"       skills: {j.skills[:80]}")
        if j.source_url:
            print(f"       {j.source_url}")
        print()

    if generate_briefs:
        print(f"{'─' * 80}")
        print("Generating briefs for top 3 matches...\n")
        from src.vectordb.briefer import generate_briefs as gen_briefs

        # Convert ScoredJob to dicts for briefer
        job_dicts = []
        for j in results[:3]:
            job_dicts.append({
                "title": j.title,
                "company_name": j.company_name,
                "embedding_text": f"{j.title} at {j.company_name}. {j.skills}",
            })

        briefs = gen_briefs(job_dicts)
        for brief in briefs:
            print(f"{'─' * 60}")
            print(f"  {brief.job_title} @ {brief.company}")
            print(f"  ({brief.tokens} tokens, {brief.tokens_per_sec:.0f} tok/s)")
            print(f"{'─' * 60}")
            print(f"  {brief.brief}\n")


@main.command("scrape-hn")
@click.option("--limit", "-l", default=50, show_default=True, help="Max job comments to fetch")
def scrape_hn(limit: int):
    """Scrape latest HN 'Who is hiring?' thread and ingest into LanceDB.

    Examples:
        python -m cli scrape-hn
        python -m cli scrape-hn --limit 100
    """
    from src.scrapers.hn_hiring import ingest_hn_jobs

    print("Scraping HN 'Who is hiring?'...\n")
    stats = ingest_hn_jobs(limit=limit)

    print(f"\n--- HN Scrape Summary ---")
    print(f"  Scraped: {stats.get('scraped', 0)}")
    print(f"  Ingested: {stats.get('ingested', 0)}")
    print(f"  Total in DB: {stats.get('total_in_db', 0)}")
    print(f"  Remote: {stats.get('remote', 0)}")
    print(f"  With salary: {stats.get('with_salary', 0)}")


@main.command("job-label")
@click.option("--top", "-n", default=20, show_default=True, help="Jobs to review per session")
@click.option("--all-jobs", is_flag=True, default=False, help="Include non-EU-remote jobs")
def job_label(top: int, all_jobs: bool):
    """Interactive labeling: review top job matches and label yes/no.

    Labels stored in training_data/job_labels.jsonl for fine-tuning.

    Examples:
        python -m cli job-label
        python -m cli job-label --top 30 --all-jobs
    """
    from src.vectordb.labeler import label_jobs

    label_jobs(top_k=top, eu_remote_only=not all_jobs)


@main.command("job-label-stats")
def job_label_stats():
    """Show labeling progress stats."""
    from src.vectordb.labeler import get_label_stats

    stats = get_label_stats()
    print(f"\n--- Label Stats ---")
    print(f"  Total: {stats['total']}")
    print(f"  Matches: {stats['matches']}")
    print(f"  Non-matches: {stats['non_matches']}")
    print(f"  File: {stats['file']}")
    if stats["total"] < 100:
        print(f"\n  Need {100 - stats['total']} more for fine-tuning (min 100).")
    else:
        print(f"\n  Ready for fine-tuning! Run: python -m cli job-finetune")


@main.command("job-finetune")
@click.option("--epochs", default=5, show_default=True, help="Training epochs")
@click.option("--batch-size", default=8, show_default=True, help="Batch size")
@click.option("--min-labels", default=100, show_default=True, help="Min labels required")
def job_finetune(epochs: int, batch_size: int, min_labels: int):
    """Fine-tune embedding model on your labeled job pairs.

    Requires 100+ labels (run 'job-label' first).
    Output: langgraph/models/job-matcher/

    Examples:
        python -m cli job-finetune
        python -m cli job-finetune --epochs 10 --min-labels 50
    """
    from src.vectordb.finetune import finetune_embeddings

    result = finetune_embeddings(epochs=epochs, batch_size=batch_size, min_labels=min_labels)
    if "error" not in result:
        print(f"\nFine-tuning complete!")
        print(f"  Output: {result['output_path']}")
        print(f"  Train: {result['train_size']} | Eval: {result['eval_size']}")


if __name__ == "__main__":
    main()

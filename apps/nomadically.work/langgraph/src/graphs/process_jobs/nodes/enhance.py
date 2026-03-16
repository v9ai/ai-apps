"""Phase 1 — ATS Enhancement node.

Fetches rich data from Greenhouse / Lever / Ashby public APIs
and persists into the database.
"""

import asyncio

from src.db.connection import get_connection
from src.db.queries import fetch_new_ats_jobs
from src.db.mutations import promote_non_ats_jobs, update_job_enhanced, advance_job_to_enhanced
from ..ats.parsers import parse_greenhouse_url, parse_lever_url, parse_ashby_url
from ..ats.fetchers import fetch_greenhouse_data, fetch_lever_data, fetch_ashby_data
from ..ats.builders import build_greenhouse_update, build_lever_update, build_ashby_update


async def _enhance_single_job(conn, job: dict) -> dict:
    """Enhance a single job by fetching from its ATS API and updating the DB."""
    kind = (job.get("source_kind") or "").lower()

    try:
        if kind == "greenhouse":
            parsed = parse_greenhouse_url(job["external_id"])
            if not parsed:
                advance_job_to_enhanced(conn, job["id"])
                return {"enhanced": False, "error": "Cannot parse Greenhouse URL"}
            data = await fetch_greenhouse_data(parsed["board_token"], parsed["job_post_id"])
            cols, vals = build_greenhouse_update(data)

        elif kind == "lever":
            parsed = parse_lever_url(job["external_id"])
            if not parsed:
                advance_job_to_enhanced(conn, job["id"])
                return {"enhanced": False, "error": "Cannot parse Lever URL"}
            data = await fetch_lever_data(parsed["site"], parsed["posting_id"])
            cols, vals = build_lever_update(data)

        elif kind == "ashby":
            parsed = parse_ashby_url(job["external_id"], job.get("company_key"))
            if not parsed:
                advance_job_to_enhanced(conn, job["id"])
                return {"enhanced": False, "error": "Cannot parse Ashby URL"}
            data = await fetch_ashby_data(parsed["board_name"], parsed["job_id"])
            cols, vals = build_ashby_update(data, parsed["board_name"])

        else:
            advance_job_to_enhanced(conn, job["id"])
            return {"enhanced": False, "error": f"Unsupported source_kind: {kind}"}

        if cols:
            update_job_enhanced(conn, job["id"], cols, vals)
        return {"enhanced": True}

    except Exception as e:
        advance_job_to_enhanced(conn, job["id"])
        return {"enhanced": False, "error": str(e)}


def enhance_jobs_node(state: dict) -> dict:
    """Phase 1 node: enhance ATS jobs with rich data from public APIs."""
    conn = get_connection()
    limit = state.get("limit", 50)

    # Promote non-ATS jobs directly (no external fetch needed)
    non_ats = promote_non_ats_jobs(conn)
    print(f"  Auto-promoted {non_ats} non-ATS jobs to 'enhanced'")

    rows = fetch_new_ats_jobs(conn, limit)
    print(f"  Found {len(rows)} ATS jobs to enhance")

    enhanced = non_ats
    errors = 0
    for job in rows:
        result = asyncio.run(_enhance_single_job(conn, job))
        if result.get("enhanced"):
            enhanced += 1
        else:
            errors += 1
            print(f"    Error enhancing {job['id']}: {result.get('error')}")

    conn.close()
    return {"phase_results": [{"phase": "enhance", "enhanced": enhanced, "errors": errors}]}

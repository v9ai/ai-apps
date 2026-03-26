"""ATS URL parsers — ported verbatim from workers/process-jobs/src/entry.py."""

import re


def parse_greenhouse_url(external_id: str) -> dict | None:
    """Parse a Greenhouse URL into board_token + job_post_id.

    Handles both job-boards.greenhouse.io and boards.greenhouse.io:
      https://job-boards.greenhouse.io/grafanalabs/jobs/5802159004
    """
    try:
        match = re.search(r"greenhouse\.io/([^/]+)/jobs/([^/?#]+)", external_id)
        if match:
            return {"board_token": match.group(1), "job_post_id": match.group(2)}
    except Exception:
        pass
    return None


def parse_lever_url(external_id: str) -> dict | None:
    """Parse a Lever URL into site + posting_id.

    Example: https://jobs.lever.co/leverdemo/abc-123
    """
    try:
        match = re.search(r"lever\.co/([^/]+)/([^/?#]+)", external_id)
        if match:
            return {"site": match.group(1), "posting_id": match.group(2)}
    except Exception:
        pass
    return None


def parse_ashby_url(external_id: str, company_key: str | None = None) -> dict | None:
    """Parse an Ashby URL into board_name + job_id.

    Handles two formats:
      - Full URL: https://jobs.ashbyhq.com/livekit/f152aa9f-...
      - Bare UUID: f152aa9f-... (uses company_key as board_name)
    """
    try:
        match = re.search(r"ashbyhq\.com/([^/]+)/([^/?#]+)", external_id)
        if match:
            return {"board_name": match.group(1), "job_id": match.group(2)}
    except Exception:
        pass

    # Bare UUID fallback — use company_key as board name
    if company_key and not external_id.startswith("http"):
        return {"board_name": company_key, "job_id": external_id}

    return None

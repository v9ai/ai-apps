"""ATS data fetchers — ported from workers/process-jobs/src/entry.py.

Replaces JS fetch with httpx + tenacity retry.
"""

import httpx
from urllib.parse import quote
from tenacity import retry, stop_after_attempt, wait_exponential


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.3, max=5))
async def fetch_greenhouse_data(board_token: str, job_post_id: str) -> dict:
    """Fetch job data from Greenhouse Board API."""
    url = (
        f"https://boards-api.greenhouse.io/v1/boards/"
        f"{quote(board_token)}/jobs/{quote(job_post_id)}?questions=true"
    )
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.3, max=5))
async def fetch_lever_data(site: str, posting_id: str) -> dict:
    """Fetch from Lever — tries global endpoint first, then EU."""
    for base in [
        "https://api.lever.co/v0/postings",
        "https://api.eu.lever.co/v0/postings",
    ]:
        url = f"{base}/{quote(site)}/{quote(posting_id)}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
            if resp.status_code == 404:
                continue
            resp.raise_for_status()
            return resp.json()
    raise Exception(f"Lever posting {posting_id} not found on site {site}")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.3, max=5))
async def fetch_ashby_data(board_name: str, job_id: str) -> dict:
    """Fetch from Ashby — single-job endpoint only."""
    url = (
        f"https://api.ashbyhq.com/posting-api/job-board/"
        f"{quote(board_name)}/job/{quote(job_id)}"
    )
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()

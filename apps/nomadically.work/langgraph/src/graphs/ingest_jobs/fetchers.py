"""ATS API fetchers for job ingestion.

Ported from workers/insert-jobs.ts. Supports Greenhouse, Lever, Ashby,
Workable, Remotive, RemoteOK, Himalayas, and Jobicy.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# Shared HTTP client
_client: httpx.Client | None = None


def _get_client() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(timeout=30.0, follow_redirects=True)
    return _client


def _is_spam_key(key: str) -> bool:
    """Reject company keys with >40% digits."""
    if not key:
        return True
    digits = sum(1 for c in key if c.isdigit())
    return digits / len(key) > 0.4


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.3, max=5))
def fetch_greenhouse_jobs(token: str) -> list[dict]:
    """Fetch jobs from Greenhouse boards API."""
    client = _get_client()
    resp = client.get(f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true")
    resp.raise_for_status()
    data = resp.json()
    jobs = data.get("jobs", [])
    result = []
    for j in jobs:
        ext_id = j.get("absolute_url") or ""
        if not ext_id or ext_id == f"https://boards.greenhouse.io/{token}":
            continue
        result.append({
            "external_id": ext_id,
            "source_kind": "greenhouse",
            "company_key": token,
            "title": j.get("title", ""),
            "location": j.get("location", {}).get("name", ""),
            "url": ext_id,
            "description": j.get("content", ""),
            "posted_at": j.get("updated_at"),
        })
    return result


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.3, max=5))
def fetch_lever_jobs(token: str) -> list[dict]:
    """Fetch jobs from Lever postings API (tries global + EU)."""
    client = _get_client()
    urls = [
        f"https://api.lever.co/v0/postings/{token}",
        f"https://api.eu.lever.co/v0/postings/{token}",
    ]
    for url in urls:
        try:
            resp = client.get(url)
            if resp.status_code == 200:
                break
        except httpx.HTTPError:
            continue
    else:
        return []

    data = resp.json()
    if not isinstance(data, list):
        return []

    result = []
    for j in data:
        ext_id = j.get("hostedUrl") or ""
        if not ext_id:
            continue
        location_parts = []
        if j.get("categories", {}).get("location"):
            location_parts.append(j["categories"]["location"])
        result.append({
            "external_id": ext_id,
            "source_kind": "lever",
            "company_key": token,
            "title": j.get("text", ""),
            "location": ", ".join(location_parts),
            "url": ext_id,
            "description": j.get("descriptionPlain", "") or j.get("description", ""),
            "posted_at": datetime.fromtimestamp(j["createdAt"] / 1000).isoformat() if j.get("createdAt") else None,
        })
    return result


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.3, max=5))
def fetch_ashby_jobs(token: str) -> list[dict]:
    """Fetch jobs from Ashby posting API."""
    client = _get_client()
    resp = client.get(f"https://api.ashbyhq.com/posting-api/job-board/{token}")
    resp.raise_for_status()
    data = resp.json()
    jobs = data.get("jobs", [])
    result = []
    for j in jobs:
        job_id = j.get("id", "")
        ext_id = f"https://jobs.ashbyhq.com/{token}/{job_id}"
        result.append({
            "external_id": ext_id,
            "source_kind": "ashby",
            "company_key": token,
            "title": j.get("title", ""),
            "location": j.get("location") or "",
            "url": ext_id,
            "description": j.get("descriptionHtml", "") or j.get("descriptionPlain", ""),
            "posted_at": j.get("publishedAt"),
        })
    return result


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=0.3, max=5))
def fetch_workable_jobs(token: str) -> list[dict]:
    """Fetch jobs from Workable API."""
    client = _get_client()
    resp = client.get(f"https://apply.workable.com/api/v3/accounts/{token}/jobs")
    resp.raise_for_status()
    data = resp.json()
    jobs = data.get("results", [])
    result = []
    for j in jobs:
        shortcode = j.get("shortcode", "")
        ext_id = f"https://apply.workable.com/{token}/j/{shortcode}/"
        result.append({
            "external_id": ext_id,
            "source_kind": "workable",
            "company_key": token,
            "title": j.get("title", ""),
            "location": j.get("location", {}).get("location_str", ""),
            "url": ext_id,
            "description": j.get("description", ""),
            "posted_at": j.get("published_on"),
        })
    return result


REMOTIVE_CATEGORIES = [
    "software-dev", "data", "devops-sysadmin", "product", "design",
    "customer-support", "marketing", "sales", "business", "finance-legal",
    "hr", "qa", "writing",
]


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=0.5, max=3))
def fetch_remotive_jobs() -> list[dict]:
    """Fetch jobs from Remotive API across all categories."""
    client = _get_client()
    result = []
    for cat in REMOTIVE_CATEGORIES:
        try:
            resp = client.get(f"https://remotive.com/api/remote-jobs?category={cat}")
            if resp.status_code != 200:
                continue
            data = resp.json()
            for j in data.get("jobs", []):
                ext_id = j.get("url", "")
                if not ext_id:
                    continue
                company_name = j.get("company_name", "")
                company_key = re.sub(r"[^a-z0-9-]", "-", company_name.lower()).strip("-")
                if _is_spam_key(company_key):
                    continue
                result.append({
                    "external_id": ext_id,
                    "source_kind": "remotive",
                    "company_key": company_key,
                    "title": j.get("title", ""),
                    "location": j.get("candidate_required_location", ""),
                    "url": ext_id,
                    "description": j.get("description", ""),
                    "posted_at": j.get("publication_date"),
                    "company_name": company_name,
                })
        except Exception as e:
            logger.warning(f"Remotive category {cat} failed: {e}")
    return result


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=0.5, max=3))
def fetch_remoteok_jobs() -> list[dict]:
    """Fetch jobs from RemoteOK API."""
    client = _get_client()
    resp = client.get("https://remoteok.com/api", headers={"User-Agent": "nomadically-langgraph/1.0"})
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, list):
        return []
    result = []
    for j in data:
        if not isinstance(j, dict) or "id" not in j:
            continue
        ext_id = j.get("url", "")
        if not ext_id:
            continue
        company_name = j.get("company", "")
        company_key = re.sub(r"[^a-z0-9-]", "-", company_name.lower()).strip("-")
        if _is_spam_key(company_key):
            continue
        result.append({
            "external_id": ext_id,
            "source_kind": "remoteok",
            "company_key": company_key,
            "title": j.get("position", ""),
            "location": j.get("location", ""),
            "url": ext_id,
            "description": j.get("description", ""),
            "posted_at": j.get("date"),
            "company_name": company_name,
        })
    return result


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=0.5, max=3))
def fetch_himalayas_jobs() -> list[dict]:
    """Fetch jobs from Himalayas API."""
    client = _get_client()
    resp = client.get("https://himalayas.app/jobs/api?limit=100")
    resp.raise_for_status()
    data = resp.json()
    result = []
    for j in data.get("jobs", []):
        ext_id = j.get("applicationUrl") or j.get("url", "")
        if not ext_id:
            continue
        company_name = j.get("companyName", "")
        company_key = re.sub(r"[^a-z0-9-]", "-", company_name.lower()).strip("-")
        if _is_spam_key(company_key):
            continue
        result.append({
            "external_id": ext_id,
            "source_kind": "himalayas",
            "company_key": company_key,
            "title": j.get("title", ""),
            "location": ", ".join(j.get("locationRestrictions", [])),
            "url": ext_id,
            "description": j.get("description", ""),
            "posted_at": j.get("pubDate"),
            "company_name": company_name,
        })
    return result


@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=0.5, max=3))
def fetch_jobicy_jobs() -> list[dict]:
    """Fetch jobs from Jobicy API."""
    client = _get_client()
    resp = client.get("https://jobicy.com/api/v2/remote-jobs?count=50&geo=worldwide&industry=tech")
    resp.raise_for_status()
    data = resp.json()
    result = []
    for j in data.get("jobs", []):
        ext_id = j.get("url", "")
        if not ext_id:
            continue
        company_name = j.get("companyName", "")
        company_key = re.sub(r"[^a-z0-9-]", "-", company_name.lower()).strip("-")
        if _is_spam_key(company_key):
            continue
        result.append({
            "external_id": ext_id,
            "source_kind": "jobicy",
            "company_key": company_key,
            "title": j.get("jobTitle", ""),
            "location": j.get("jobGeo", ""),
            "url": ext_id,
            "description": j.get("jobDescription", ""),
            "posted_at": j.get("pubDate"),
            "company_name": company_name,
        })
    return result


# Map source_kind to fetcher function
ATS_FETCHERS: dict[str, callable] = {
    "greenhouse": fetch_greenhouse_jobs,
    "lever": fetch_lever_jobs,
    "ashby": fetch_ashby_jobs,
    "workable": fetch_workable_jobs,
}

AGGREGATOR_FETCHERS: dict[str, callable] = {
    "remotive": fetch_remotive_jobs,
    "remoteok": fetch_remoteok_jobs,
    "himalayas": fetch_himalayas_jobs,
    "jobicy": fetch_jobicy_jobs,
}

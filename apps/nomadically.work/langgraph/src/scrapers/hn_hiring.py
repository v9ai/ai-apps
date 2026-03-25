"""Scrape HN 'Who is hiring?' threads for job postings.

Usage:
    from src.scrapers.hn_hiring import scrape_hn_jobs, ingest_hn_jobs

    # Just scrape (returns dicts)
    jobs = scrape_hn_jobs(limit=50)

    # Scrape + embed + store in LanceDB
    result = ingest_hn_jobs(limit=50)
"""

from __future__ import annotations

import hashlib
import re
import time
from datetime import datetime
from html.parser import HTMLParser

import httpx

HN_API = "https://hacker-news.firebaseio.com/v0"
REQUEST_TIMEOUT = 15


class _HTMLStripper(HTMLParser):
    """Simple HTML tag stripper."""

    def __init__(self):
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str):
        self._parts.append(data)

    def handle_entityref(self, name: str):
        entities = {"amp": "&", "lt": "<", "gt": ">", "quot": '"', "apos": "'"}
        self._parts.append(entities.get(name, f"&{name};"))

    def get_text(self) -> str:
        return " ".join(self._parts)


def _clean_html(html: str) -> str:
    """Strip HTML tags and decode entities."""
    stripper = _HTMLStripper()
    stripper.feed(html)
    return stripper.get_text()


def _detect_remote_policy(text: str) -> str:
    text_lower = text.lower()
    if any(w in text_lower for w in ["fully remote", "100% remote", "remote-first", "remote only"]):
        return "full_remote"
    if any(w in text_lower for w in ["remote", "hybrid", "remote-friendly", "flexible"]):
        return "hybrid"
    if any(w in text_lower for w in ["onsite", "on-site", "in-office", "must relocate"]):
        return "onsite"
    return "unknown"


def _extract_salary(text: str) -> tuple[int, int]:
    matches = re.findall(r'[\$\u20ac\u00a3](\d{2,3})[,.]?(\d{3})?[kK]?', text)
    salaries = []
    for m in matches:
        val = int(m[0])
        if m[1]:
            val = int(m[0] + m[1])
        elif val < 1000:
            val *= 1000
        salaries.append(val)
    if salaries:
        return min(salaries), max(salaries)
    return 0, 0


def _parse_first_line(text: str) -> tuple[str, str]:
    """Extract company and title from HN hiring format: 'Company | Title | ...'"""
    first_line = text.split("\n")[0].strip() if "\n" in text else text[:150]
    parts = [p.strip() for p in first_line.split("|")]
    company = parts[0] if len(parts) >= 1 else ""
    title = parts[1] if len(parts) >= 2 else first_line[:100]
    return company, title


def scrape_hn_jobs(limit: int = 50) -> list[dict]:
    """Scrape the latest HN 'Who is hiring?' thread.

    Returns list of dicts with: source_id, text, company, title,
    remote_policy, salary_min, salary_max, source_url, source_board.
    """
    client = httpx.Client(timeout=REQUEST_TIMEOUT)

    # Find latest hiring thread from whoishiring user
    try:
        user = client.get(f"{HN_API}/user/whoishiring.json").json()
        submitted = user.get("submitted", [])
    except Exception as e:
        print(f"  Failed to fetch whoishiring user: {e}")
        return []

    hiring_thread_id = None
    for story_id in submitted[:10]:
        try:
            story = client.get(f"{HN_API}/item/{story_id}.json").json()
            title = story.get("title", "")
            if "Who is hiring" in title:
                hiring_thread_id = story_id
                print(f"  Found thread: {title} (id: {story_id})")
                break
        except Exception:
            continue

    if not hiring_thread_id:
        print("  No hiring thread found.")
        return []

    # Fetch thread and its comments
    thread = client.get(f"{HN_API}/item/{hiring_thread_id}.json").json()
    kids = thread.get("kids", [])[:limit]
    print(f"  Fetching {len(kids)} job comments...")

    jobs: list[dict] = []
    for kid_id in kids:
        try:
            comment = client.get(f"{HN_API}/item/{kid_id}.json").json()
            text_html = comment.get("text", "")
            if not text_html or len(text_html) < 50:
                continue

            text = _clean_html(text_html)[:2000]
            company, title = _parse_first_line(text)
            sal_min, sal_max = _extract_salary(text)

            jobs.append({
                "source_id": str(kid_id),
                "text": text,
                "company": company,
                "title": title,
                "remote_policy": _detect_remote_policy(text),
                "salary_min": sal_min,
                "salary_max": sal_max,
                "source_url": f"https://news.ycombinator.com/item?id={kid_id}",
                "source_board": "hn_hiring",
            })
        except Exception as e:
            print(f"    Error fetching {kid_id}: {e}")
            continue

        # Rate limit HN API
        time.sleep(0.1)

    client.close()
    return jobs


def ingest_hn_jobs(limit: int = 50) -> dict:
    """Scrape HN hiring + embed + store in LanceDB jobs table.

    Returns stats dict.
    """
    from src.vectordb.config import LANCE_DB_PATH
    from src.vectordb.embedder import embed_texts

    import lancedb

    jobs = scrape_hn_jobs(limit=limit)
    if not jobs:
        return {"scraped": 0, "ingested": 0}

    print(f"\n  Embedding {len(jobs)} HN jobs on Metal GPU...")
    texts = [j["text"] for j in jobs]
    t0 = time.time()
    vectors = embed_texts(texts)
    elapsed = time.time() - t0
    print(f"  Embedded in {elapsed:.1f}s ({len(texts) / elapsed:.0f}/sec)")

    records = []
    for i, job in enumerate(jobs):
        job_id = hashlib.md5(job["source_id"].encode()).hexdigest()[:12]
        records.append({
            "neon_id": int(job_id, 16) % (2**31),  # pseudo-id for HN jobs
            "title": job["title"],
            "company_name": job["company"],
            "company_key": job["company"].lower().replace(" ", "-")[:50] if job["company"] else "",
            "description": job["text"],
            "location": "",
            "salary_min": job["salary_min"],
            "salary_max": job["salary_max"],
            "remote_policy": job["remote_policy"],
            "is_remote_eu": job["remote_policy"] == "full_remote",
            "remote_eu_confidence": 0.5 if job["remote_policy"] == "full_remote" else 0.0,
            "role_ai_engineer": False,
            "skills": "",
            "source_url": job["source_url"],
            "posted_at": datetime.now().isoformat(),
            "ats_type": "hn_hiring",
            "ai_tier": 0,
            "company_category": "",
            "embedding_text": job["text"][:500],
            "vector": vectors[i].tolist(),
        })

    db = lancedb.connect(LANCE_DB_PATH)
    try:
        tbl = db.open_table("jobs")
        tbl.add(records)
        total = tbl.count_rows()
    except Exception:
        tbl = db.create_table("jobs", records, mode="overwrite")
        total = len(records)

    remote_count = sum(1 for r in records if r["remote_policy"] == "full_remote")
    salary_count = sum(1 for r in records if r["salary_min"] > 0)

    print(f"\n  Ingested {len(records)} HN jobs (total in DB: {total})")
    print(f"  Remote: {remote_count} | With salary: {salary_count}")

    return {
        "scraped": len(jobs),
        "ingested": len(records),
        "total_in_db": total,
        "remote": remote_count,
        "with_salary": salary_count,
    }

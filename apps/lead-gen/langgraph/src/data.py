"""Fetch unclassified jobs from Neon PostgreSQL."""

import os

import psycopg
from psycopg.rows import dict_row

from .models import Job

_QUERY = """
    SELECT
        j.id::text            AS id,
        j.title,
        j.description,
        COALESCE(c.name, j.company_key) AS company_name,
        j.location,
        j.url
    FROM jobs j
    LEFT JOIN companies c ON c.key = j.company_key
    WHERE j.status = 'active'
      AND j.description IS NOT NULL
      AND j.description != ''
    ORDER BY j.posted_at DESC
    LIMIT 200
"""


def fetch_jobs(limit: int = 200) -> list[Job]:
    url = os.environ["DATABASE_URL"]
    with psycopg.connect(url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(_QUERY)
            rows = cur.fetchall()

    jobs: list[Job] = []
    for row in rows:
        jobs.append({
            "id": row["id"],
            "title": row["title"] or "",
            "description": row["description"] or "",
            "company_name": row["company_name"] or "",
            "location": row["location"],
            "workplace_type": None,
            "url": row["url"],
        })

    return jobs[:limit]

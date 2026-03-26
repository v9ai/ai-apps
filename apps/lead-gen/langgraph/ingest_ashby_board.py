"""
Fetch all jobs from an Ashby board and upsert them into the jobs table.

Usage:
    python ingest_ashby_board.py peec
    python ingest_ashby_board.py peec --dry-run
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import httpx
import psycopg
from dotenv import load_dotenv

load_dotenv()


def fetch_board(board_name: str) -> list[dict]:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{board_name}?includeCompensation=true"
    r = httpx.get(url, timeout=30)
    r.raise_for_status()
    return r.json()["jobs"]


def upsert_jobs(conn: psycopg.Connection, board_name: str, jobs: list[dict], dry_run: bool) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    stats = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}

    for job in jobs:
        job_id = job.get("id")
        job_url = job.get("jobUrl") or job.get("applyUrl")
        if not job_url:
            print(f"  SKIP {job.get('title')}: no jobUrl")
            stats["skipped"] += 1
            continue

        published_at = job.get("publishedAt") or now
        description = job.get("descriptionPlain") or job.get("descriptionHtml") or None

        secondary = json.dumps(job.get("secondaryLocations") or [])
        compensation = json.dumps(job["compensation"]) if job.get("compensation") else None
        address = json.dumps(job["address"]) if job.get("address") else None
        country = (job.get("address") or {}).get("postalAddress", {}).get("addressCountry")
        workplace_type = job.get("workplaceType") or ("Remote" if job.get("isRemote") else None)

        categories = json.dumps({
            "department": job.get("department"),
            "team": job.get("team"),
            "location": job.get("location"),
            "allLocations": [job.get("location")] + [
                loc.get("location") for loc in (job.get("secondaryLocations") or [])
                if loc.get("location")
            ],
        })

        # Extract salary from compensation if present
        salary_min = salary_max = None
        salary_currency = None
        if job.get("compensation"):
            for comp in (job["compensation"].get("summaryComponents") or []):
                if comp.get("compensationType") == "Salary":
                    salary_min = comp.get("minValue")
                    salary_max = comp.get("maxValue")
                    salary_currency = comp.get("currencyCode")
                    break

        params = {
            "external_id": job_id,
            "source_kind": "ashby",
            "company_key": board_name,
            "title": job.get("title", ""),
            "url": job_url,
            "posted_at": published_at,
            "description": description,
            "location": job.get("location"),
            "workplace_type": workplace_type,
            "country": country,
            "absolute_url": job_url,
            "first_published": published_at,
            "status": "enhanced",
            "ashby_department": job.get("department"),
            "ashby_team": job.get("team"),
            "ashby_employment_type": job.get("employmentType"),
            "ashby_is_remote": job.get("isRemote"),
            "ashby_is_listed": job.get("isListed"),
            "ashby_published_at": published_at,
            "ashby_job_url": job_url,
            "ashby_apply_url": job.get("applyUrl"),
            "ashby_secondary_locations": secondary,
            "ashby_compensation": compensation,
            "ashby_address": address,
            "categories": categories,
            "ats_created_at": published_at,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_currency": salary_currency,
            "updated_at": now,
        }

        if dry_run:
            remote = "remote" if job.get("isRemote") else "office"
            sal = f" | {salary_min}-{salary_max} {salary_currency}" if salary_min else ""
            print(f"  [dry-run] {job['title']} ({remote}){sal}")
            stats["inserted"] += 1
            continue

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO jobs (
                        external_id, source_kind, company_key,
                        title, url, posted_at, description, location, workplace_type, country,
                        absolute_url, first_published, status,
                        ashby_department, ashby_team, ashby_employment_type,
                        ashby_is_remote, ashby_is_listed, ashby_published_at,
                        ashby_job_url, ashby_apply_url,
                        ashby_secondary_locations, ashby_compensation, ashby_address,
                        categories, ats_created_at,
                        salary_min, salary_max, salary_currency,
                        created_at, updated_at
                    ) VALUES (
                        %(external_id)s, %(source_kind)s, %(company_key)s,
                        %(title)s, %(url)s, %(posted_at)s, %(description)s, %(location)s,
                        %(workplace_type)s, %(country)s,
                        %(absolute_url)s, %(first_published)s, %(status)s,
                        %(ashby_department)s, %(ashby_team)s, %(ashby_employment_type)s,
                        %(ashby_is_remote)s, %(ashby_is_listed)s, %(ashby_published_at)s,
                        %(ashby_job_url)s, %(ashby_apply_url)s,
                        %(ashby_secondary_locations)s, %(ashby_compensation)s, %(ashby_address)s,
                        %(categories)s, %(ats_created_at)s,
                        %(salary_min)s, %(salary_max)s, %(salary_currency)s,
                        now(), %(updated_at)s
                    )
                    ON CONFLICT (source_kind, company_key, external_id) DO UPDATE SET
                        title                      = EXCLUDED.title,
                        url                        = EXCLUDED.url,
                        description                = EXCLUDED.description,
                        location                   = EXCLUDED.location,
                        workplace_type             = EXCLUDED.workplace_type,
                        country                    = EXCLUDED.country,
                        absolute_url               = EXCLUDED.absolute_url,
                        status                     = EXCLUDED.status,
                        ashby_department           = EXCLUDED.ashby_department,
                        ashby_team                 = EXCLUDED.ashby_team,
                        ashby_employment_type      = EXCLUDED.ashby_employment_type,
                        ashby_is_remote            = EXCLUDED.ashby_is_remote,
                        ashby_is_listed            = EXCLUDED.ashby_is_listed,
                        ashby_published_at         = EXCLUDED.ashby_published_at,
                        ashby_job_url              = EXCLUDED.ashby_job_url,
                        ashby_apply_url            = EXCLUDED.ashby_apply_url,
                        ashby_secondary_locations  = EXCLUDED.ashby_secondary_locations,
                        ashby_compensation         = EXCLUDED.ashby_compensation,
                        ashby_address              = EXCLUDED.ashby_address,
                        categories                 = EXCLUDED.categories,
                        ats_created_at             = EXCLUDED.ats_created_at,
                        salary_min                 = EXCLUDED.salary_min,
                        salary_max                 = EXCLUDED.salary_max,
                        salary_currency            = EXCLUDED.salary_currency,
                        updated_at                 = EXCLUDED.updated_at
                """, params)

                # xmax = 0 means inserted, > 0 means updated
                cur.execute("SELECT xmax FROM jobs WHERE source_kind = %s AND company_key = %s AND external_id = %s",
                            ["ashby", board_name, job_id])
                row = cur.fetchone()
                is_update = row and row[0] != 0

            conn.commit()

            remote = "remote" if job.get("isRemote") else "office"
            sal = f" | {salary_min}-{salary_max} {salary_currency}" if salary_min else ""
            action = "updated" if is_update else "inserted"
            print(f"  [{action}] {job['title']} ({remote}){sal}")
            if is_update:
                stats["updated"] += 1
            else:
                stats["inserted"] += 1

        except Exception as e:
            conn.rollback()
            print(f"  ERROR {job.get('title')}: {e}", file=sys.stderr)
            stats["errors"] += 1

    return stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("board", help="Ashby board name (e.g. peec)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print(f"\nFetching {args.board} from Ashby API...")
    jobs = fetch_board(args.board)
    print(f"Found {len(jobs)} jobs on board '{args.board}'\n")

    if args.dry_run:
        print("--- DRY RUN (no DB writes) ---\n")
        for job in jobs:
            remote = "remote" if job.get("isRemote") else "office"
            comp = job.get("compensation", {}) or {}
            sal = comp.get("scrapeableCompensationSalarySummary", "")
            sal_str = f" | {sal}" if sal else ""
            print(f"  {job['title']} ({remote}){sal_str}")
        print(f"\nTotal: {len(jobs)} jobs")
        return

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    with psycopg.connect(db_url) as conn:
        stats = upsert_jobs(conn, args.board, jobs, dry_run=False)

    print(f"\n--- Summary ---")
    print(f"  Inserted: {stats['inserted']}")
    print(f"  Updated:  {stats['updated']}")
    print(f"  Skipped:  {stats['skipped']}")
    print(f"  Errors:   {stats['errors']}")


if __name__ == "__main__":
    main()

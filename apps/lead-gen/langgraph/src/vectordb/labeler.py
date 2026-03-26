"""Interactive labeling tool for job-profile match training data.

Labels are stored as JSONL for future fine-tuning of embedding model.

Usage:
    from src.vectordb.labeler import label_jobs, get_label_stats

    label_jobs(top_k=20)  # interactive CLI session
    stats = get_label_stats()
"""

from __future__ import annotations

import json
from pathlib import Path

from .search import DEFAULT_PROFILE, search_jobs

LABELS_DIR = Path(__file__).parent.parent.parent / "training_data"
LABELS_FILE = LABELS_DIR / "job_labels.jsonl"


def get_label_stats() -> dict:
    """Return stats about existing labels."""
    if not LABELS_FILE.exists():
        return {"total": 0, "matches": 0, "non_matches": 0, "file": str(LABELS_FILE)}

    total = matches = non_matches = 0
    with open(LABELS_FILE) as f:
        for line in f:
            total += 1
            d = json.loads(line)
            if d.get("label") == 1:
                matches += 1
            else:
                non_matches += 1

    return {
        "total": total,
        "matches": matches,
        "non_matches": non_matches,
        "file": str(LABELS_FILE),
    }


def _load_existing_ids() -> set[int]:
    """Load already-labeled job IDs."""
    if not LABELS_FILE.exists():
        return set()
    ids = set()
    with open(LABELS_FILE) as f:
        for line in f:
            ids.add(json.loads(line).get("job_id", 0))
    return ids


def label_jobs(
    top_k: int = 20,
    profile: str | None = None,
    eu_remote_only: bool = True,
) -> int:
    """Interactive labeling session. Returns count of new labels.

    Presents top job matches and asks for yes/no/skip/quit.
    """
    LABELS_DIR.mkdir(parents=True, exist_ok=True)
    profile_text = profile or DEFAULT_PROFILE
    existing = _load_existing_ids()

    results = search_jobs(
        profile=profile_text,
        top_k=top_k,
        eu_remote_only=eu_remote_only,
    )

    if not results:
        print("No jobs found in LanceDB. Run 'python -m cli job-sync' first.")
        return 0

    labeled = 0
    with open(LABELS_FILE, "a") as f:
        for job in results:
            if job.job_id in existing:
                continue

            print(f"\n{'=' * 60}")
            print(f"Score: {job.similarity:.3f} | {job.remote_policy}")
            print(f"Title: {job.title}")
            print(f"Company: {job.company_name}")
            salary = f"${job.salary_min:,}-${job.salary_max:,}" if job.salary_min > 0 else "not listed"
            print(f"Salary: {salary}")
            if job.skills:
                print(f"Skills: {job.skills}")
            print(f"URL: {job.source_url}")
            print(f"{'=' * 60}")
            print("[y]es match / [n]o match / [s]kip / [q]uit")

            while True:
                try:
                    choice = input("> ").strip().lower()
                except (EOFError, KeyboardInterrupt):
                    choice = "q"
                if choice in ("y", "n", "s", "q"):
                    break

            if choice == "q":
                break
            if choice == "s":
                continue

            label = 1 if choice == "y" else 0
            record = {
                "job_id": job.job_id,
                "job_text": job.title,
                "profile_text": profile_text,
                "label": label,
                "similarity_score": job.similarity,
                "remote_policy": job.remote_policy,
                "company": job.company_name,
            }
            f.write(json.dumps(record) + "\n")
            labeled += 1
            tag = "MATCH" if label else "NO MATCH"
            print(f"  Labeled as {tag} ({labeled} new this session)")

    stats = get_label_stats()
    print(f"\nSession: {labeled} new labels. Total: {stats['total']}")
    print(f"  Matches: {stats['matches']} | Non-matches: {stats['non_matches']}")
    if stats["total"] < 100:
        print(f"  Need {100 - stats['total']} more labels for fine-tuning.")
    return labeled

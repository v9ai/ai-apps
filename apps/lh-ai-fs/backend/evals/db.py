"""SQLite persistence for eval run history.

Uses only stdlib sqlite3 — no ORM, no migrations.
DB_PATH resolves relative to this file's own directory so the path is stable
regardless of the working directory from which the caller is invoked.
"""

import json
import pathlib
import sqlite3
import subprocess
import uuid
from datetime import datetime, timezone
from typing import Optional

DB_PATH = pathlib.Path(__file__).parent / "evals.db"


def _get_git_sha() -> Optional[str]:
    """Return the short HEAD SHA from git, or None if git is unavailable."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception:
        return None


def init_db(path: pathlib.Path = DB_PATH) -> None:
    """Create the eval_runs table and enable WAL mode.

    Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS.
    """
    with sqlite3.connect(path) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS eval_runs (
                run_id             TEXT PRIMARY KEY,
                timestamp          TEXT NOT NULL,
                git_sha            TEXT,
                precision          REAL,
                recall             REAL,
                f1_score           REAL,
                hallucination_rate REAL,
                true_positives     INTEGER,
                false_positives    INTEGER,
                false_negatives    INTEGER,
                metrics            TEXT NOT NULL,
                findings           TEXT NOT NULL,
                report             TEXT
            )
            """
        )
        conn.commit()


def save_run(
    run_id: str,
    timestamp: str,
    git_sha: Optional[str],
    metrics: dict,
    findings: list,
    report: dict,
    path: pathlib.Path = DB_PATH,
) -> str:
    """Persist one eval run and return its run_id.

    Calls init_db internally so the table is guaranteed to exist.
    Scalar metric fields are extracted from *metrics* for first-class column
    storage; the full *metrics* dict is also stored as JSON in the metrics
    column for ad-hoc inspection.
    """
    init_db(path)

    with sqlite3.connect(path) as conn:
        conn.execute(
            """
            INSERT INTO eval_runs (
                run_id, timestamp, git_sha,
                precision, recall, f1_score, hallucination_rate,
                true_positives, false_positives, false_negatives,
                metrics, findings, report
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                timestamp,
                git_sha,
                metrics.get("precision"),
                metrics.get("recall"),
                metrics.get("f1_score"),
                metrics.get("false_discovery_rate"),
                metrics.get("true_positives"),
                metrics.get("false_positives"),
                metrics.get("false_negatives"),
                json.dumps(metrics),
                json.dumps(findings),
                json.dumps(report, default=str) if report is not None else None,
            ),
        )
        conn.commit()

    return run_id


def get_runs(limit: int = 10, path: pathlib.Path = DB_PATH) -> list[dict]:
    """Return the *limit* most recent eval runs as a list of plain dicts.

    Calls init_db internally so this is safe to call before any run has been
    saved (returns an empty list). JSON columns are deserialized back to
    Python objects.
    """
    init_db(path)

    with sqlite3.connect(path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM eval_runs ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()

    results = []
    for row in rows:
        d = dict(row)
        for col in ("metrics", "findings", "report"):
            if d.get(col) is not None:
                d[col] = json.loads(d[col])
        results.append(d)
    return results

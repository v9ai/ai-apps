"""Database layer — psycopg3 + pgvector, matching the Drizzle schema exactly."""

from __future__ import annotations

import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator

import psycopg
from pgvector.psycopg import register_vector
from config import settings


def _connect() -> psycopg.Connection:
    conn = psycopg.connect(settings.database_url, autocommit=False)
    register_vector(conn)
    return conn


@contextmanager
def get_conn() -> Generator[psycopg.Connection, None, None]:
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── blood_tests ───────────────────────────────────────────────────────


def insert_blood_test(
    *,
    user_id: str,
    file_name: str,
    file_path: str,
    status: str = "processing",
    test_date: str | None = None,
) -> str:
    test_id = str(uuid.uuid4())
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO blood_tests (id, user_id, file_name, file_path, status, test_date, uploaded_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (test_id, user_id, file_name, file_path, status, test_date, datetime.now(timezone.utc)),
        )
    return test_id


def update_blood_test_status(test_id: str, status: str, error_message: str | None = None) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE blood_tests SET status = %s, error_message = %s WHERE id = %s",
            (status, error_message, test_id),
        )


def get_blood_test_file_path(test_id: str) -> str | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT file_path FROM blood_tests WHERE id = %s", (test_id,)
        ).fetchone()
    return row[0] if row else None


def delete_blood_test(test_id: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM blood_tests WHERE id = %s", (test_id,))


# ── blood_markers ─────────────────────────────────────────────────────


def insert_blood_markers(
    test_id: str,
    markers: list[dict[str, str]],
) -> list[str]:
    """Insert markers and return their generated UUIDs."""
    ids: list[str] = []
    with get_conn() as conn:
        for m in markers:
            marker_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO blood_markers (id, test_id, name, value, unit, reference_range, flag)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (marker_id, test_id, m["name"], m["value"], m["unit"], m["reference_range"], m["flag"]),
            )
            ids.append(marker_id)
    return ids


# ── blood_test_embeddings ─────────────────────────────────────────────


def upsert_blood_test_embedding(
    *,
    test_id: str,
    user_id: str,
    content: str,
    embedding: list[float],
) -> None:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    now = datetime.now(timezone.utc)
    emb_id = str(uuid.uuid4())

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO blood_test_embeddings (id, test_id, user_id, content, embedding, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (test_id) DO UPDATE
            SET content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                created_at = EXCLUDED.created_at
            """,
            (emb_id, test_id, user_id, content, vec, now),
        )


# ── blood_marker_embeddings ──────────────────────────────────────────


def upsert_blood_marker_embedding(
    *,
    marker_id: str,
    test_id: str,
    user_id: str,
    marker_name: str,
    content: str,
    embedding: list[float],
) -> None:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    now = datetime.now(timezone.utc)
    emb_id = str(uuid.uuid4())

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO blood_marker_embeddings
                (id, marker_id, test_id, user_id, marker_name, content, embedding, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (marker_id) DO UPDATE
            SET content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                marker_name = EXCLUDED.marker_name,
                created_at = EXCLUDED.created_at
            """,
            (emb_id, marker_id, test_id, user_id, marker_name, content, vec, now),
        )


# ── health_state_embeddings ──────────────────────────────────────────


def upsert_health_state_embedding(
    *,
    test_id: str,
    user_id: str,
    content: str,
    derived_metrics: dict[str, Any],
    embedding: list[float],
) -> None:
    import json

    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    now = datetime.now(timezone.utc)
    emb_id = str(uuid.uuid4())

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO health_state_embeddings
                (id, test_id, user_id, content, derived_metrics, embedding, created_at)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s)
            ON CONFLICT (test_id) DO UPDATE
            SET content = EXCLUDED.content,
                derived_metrics = EXCLUDED.derived_metrics,
                embedding = EXCLUDED.embedding,
                created_at = EXCLUDED.created_at
            """,
            (emb_id, test_id, user_id, content, json.dumps(derived_metrics), vec, now),
        )


# ── condition_embeddings ─────────────────────────────────────────────


def upsert_condition_embedding(
    *,
    condition_id: str,
    user_id: str,
    content: str,
    embedding: list[float],
) -> None:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    now = datetime.now(timezone.utc)
    emb_id = str(uuid.uuid4())

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO condition_embeddings (id, condition_id, user_id, content, embedding, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (condition_id) DO UPDATE
            SET content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                created_at = EXCLUDED.created_at
            """,
            (emb_id, condition_id, user_id, content, vec, now),
        )


# ── medication_embeddings ────────────────────────────────────────────


def upsert_medication_embedding(
    *,
    medication_id: str,
    user_id: str,
    content: str,
    embedding: list[float],
) -> None:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    now = datetime.now(timezone.utc)
    emb_id = str(uuid.uuid4())

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO medication_embeddings (id, medication_id, user_id, content, embedding, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (medication_id) DO UPDATE
            SET content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                created_at = EXCLUDED.created_at
            """,
            (emb_id, medication_id, user_id, content, vec, now),
        )


# ── symptom_embeddings ───────────────────────────────────────────────


def upsert_symptom_embedding(
    *,
    symptom_id: str,
    user_id: str,
    content: str,
    embedding: list[float],
) -> None:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    now = datetime.now(timezone.utc)
    emb_id = str(uuid.uuid4())

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO symptom_embeddings (id, symptom_id, user_id, content, embedding, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (symptom_id) DO UPDATE
            SET content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                created_at = EXCLUDED.created_at
            """,
            (emb_id, symptom_id, user_id, content, vec, now),
        )


# ── appointment_embeddings ───────────────────────────────────────────


def upsert_appointment_embedding(
    *,
    appointment_id: str,
    user_id: str,
    content: str,
    embedding: list[float],
) -> None:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    now = datetime.now(timezone.utc)
    emb_id = str(uuid.uuid4())

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO appointment_embeddings (id, appointment_id, user_id, content, embedding, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (appointment_id) DO UPDATE
            SET content = EXCLUDED.content,
                embedding = EXCLUDED.embedding,
                created_at = EXCLUDED.created_at
            """,
            (emb_id, appointment_id, user_id, content, vec, now),
        )

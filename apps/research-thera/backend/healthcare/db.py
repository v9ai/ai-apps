"""Database layer — psycopg3 + pgvector, matching the Drizzle schema exactly."""

from __future__ import annotations

import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Generator

import psycopg
from psycopg_pool import ConnectionPool
from pgvector.psycopg import register_vector
from config import settings


def _configure_conn(conn: psycopg.Connection) -> None:
    """Register pgvector types on a fresh connection."""
    register_vector(conn)


# Connection pool — reuses connections instead of opening/closing per query.
# min_size=1 keeps one warm connection; max_size=10 caps concurrent usage.
_pool = ConnectionPool(
    conninfo=settings.database_url,
    min_size=1,
    max_size=10,
    configure=_configure_conn,
)


@contextmanager
def get_conn() -> Generator[psycopg.Connection, None, None]:
    with _pool.connection() as conn:
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise


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


# ── Vector search ─────────────────────────────────────────────────────


def search_blood_tests(
    embedding: list[float],
    user_id: str,
    threshold: float = 0.3,
    limit: int = 5,
) -> list[dict]:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT e.id, e.test_id, e.content,
                   1 - (e.embedding <=> %s) as similarity,
                   t.file_name, t.test_date
            FROM blood_test_embeddings e
            JOIN blood_tests t ON t.id = e.test_id
            WHERE e.user_id = %s
              AND 1 - (e.embedding <=> %s) > %s
            ORDER BY e.embedding <=> %s
            LIMIT %s
            """,
            (vec, user_id, vec, threshold, vec, limit),
        ).fetchall()
    return [
        {
            "id": str(r[0]),
            "test_id": str(r[1]),
            "content": r[2],
            "similarity": float(r[3]),
            "file_name": r[4],
            "test_date": str(r[5]) if r[5] else None,
        }
        for r in rows
    ]


def search_markers_hybrid(
    query_text: str,
    embedding: list[float],
    user_id: str,
    threshold: float = 0.3,
    limit: int = 10,
) -> list[dict]:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    with get_conn() as conn:
        rows = conn.execute(
            """
            WITH scored AS (
                SELECT marker_id, test_id, marker_name, content,
                       ts_rank(to_tsvector('english', content), plainto_tsquery('english', %s)) as raw_fts,
                       1 - (embedding <=> %s) as vector_similarity
                FROM blood_marker_embeddings
                WHERE user_id = %s
                  AND 1 - (embedding <=> %s) > %s
            ),
            normalized AS (
                SELECT *,
                       CASE WHEN max(raw_fts) OVER () > 0
                            THEN raw_fts / max(raw_fts) OVER ()
                            ELSE 0
                       END as fts_norm
                FROM scored
            )
            SELECT marker_id, test_id, marker_name, content,
                   raw_fts as fts_rank,
                   vector_similarity,
                   (0.3 * fts_norm + 0.7 * vector_similarity) as combined_score
            FROM normalized
            ORDER BY combined_score DESC
            LIMIT %s
            """,
            (query_text, vec, user_id, vec, threshold, limit),
        ).fetchall()
    return [
        {
            "marker_id": str(r[0]),
            "test_id": str(r[1]),
            "marker_name": r[2],
            "content": r[3],
            "fts_rank": float(r[4]),
            "vector_similarity": float(r[5]),
            "combined_score": float(r[6]),
        }
        for r in rows
    ]


def search_conditions(
    embedding: list[float],
    user_id: str,
    threshold: float = 0.3,
    limit: int = 5,
) -> list[dict]:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, condition_id, content,
                   1 - (embedding <=> %s) as similarity
            FROM condition_embeddings
            WHERE user_id = %s
              AND 1 - (embedding <=> %s) > %s
            ORDER BY embedding <=> %s
            LIMIT %s
            """,
            (vec, user_id, vec, threshold, vec, limit),
        ).fetchall()
    return [
        {
            "id": str(r[0]),
            "condition_id": str(r[1]),
            "content": r[2],
            "similarity": float(r[3]),
        }
        for r in rows
    ]


def search_medications(
    embedding: list[float],
    user_id: str,
    threshold: float = 0.3,
    limit: int = 5,
) -> list[dict]:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, medication_id, content,
                   1 - (embedding <=> %s) as similarity
            FROM medication_embeddings
            WHERE user_id = %s
              AND 1 - (embedding <=> %s) > %s
            ORDER BY embedding <=> %s
            LIMIT %s
            """,
            (vec, user_id, vec, threshold, vec, limit),
        ).fetchall()
    return [
        {
            "id": str(r[0]),
            "medication_id": str(r[1]),
            "content": r[2],
            "similarity": float(r[3]),
        }
        for r in rows
    ]


def search_symptoms(
    embedding: list[float],
    user_id: str,
    threshold: float = 0.3,
    limit: int = 5,
) -> list[dict]:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, symptom_id, content,
                   1 - (embedding <=> %s) as similarity
            FROM symptom_embeddings
            WHERE user_id = %s
              AND 1 - (embedding <=> %s) > %s
            ORDER BY embedding <=> %s
            LIMIT %s
            """,
            (vec, user_id, vec, threshold, vec, limit),
        ).fetchall()
    return [
        {
            "id": str(r[0]),
            "symptom_id": str(r[1]),
            "content": r[2],
            "similarity": float(r[3]),
        }
        for r in rows
    ]


def search_appointments(
    embedding: list[float],
    user_id: str,
    threshold: float = 0.3,
    limit: int = 5,
) -> list[dict]:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, appointment_id, content,
                   1 - (embedding <=> %s) as similarity
            FROM appointment_embeddings
            WHERE user_id = %s
              AND 1 - (embedding <=> %s) > %s
            ORDER BY embedding <=> %s
            LIMIT %s
            """,
            (vec, user_id, vec, threshold, vec, limit),
        ).fetchall()
    return [
        {
            "id": str(r[0]),
            "appointment_id": str(r[1]),
            "content": r[2],
            "similarity": float(r[3]),
        }
        for r in rows
    ]


def search_health_states(
    embedding: list[float],
    user_id: str,
    threshold: float = 0.3,
    limit: int = 5,
) -> list[dict]:
    """Search health_state_embeddings — returns content + JSONB derived_metrics."""
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT h.id, h.test_id, h.content, h.derived_metrics,
                   1 - (h.embedding <=> %s) as similarity,
                   t.file_name, t.test_date
            FROM health_state_embeddings h
            JOIN blood_tests t ON t.id = h.test_id
            WHERE h.user_id = %s
              AND 1 - (h.embedding <=> %s) > %s
            ORDER BY h.embedding <=> %s
            LIMIT %s
            """,
            (vec, user_id, vec, threshold, vec, limit),
        ).fetchall()
    return [
        {
            "id": str(r[0]),
            "test_id": str(r[1]),
            "content": r[2],
            "derived_metrics": r[3] if isinstance(r[3], dict) else {},
            "similarity": float(r[4]),
            "file_name": r[5],
            "test_date": str(r[6]) if r[6] else None,
        }
        for r in rows
    ]


def search_marker_trend(
    embedding: list[float],
    user_id: str,
    marker_name: str | None = None,
    threshold: float = 0.3,
    limit: int = 50,
) -> list[dict]:
    import numpy as np

    vec = np.array(embedding, dtype=np.float32)
    if marker_name:
        with get_conn() as conn:
            rows = conn.execute(
                """
                SELECT e.marker_id, e.test_id, e.marker_name, e.content,
                       1 - (e.embedding <=> %s) as similarity,
                       m.value, m.unit, m.flag,
                       t.test_date, t.file_name
                FROM blood_marker_embeddings e
                JOIN blood_markers m ON m.id = e.marker_id
                JOIN blood_tests t ON t.id = e.test_id
                WHERE e.user_id = %s
                  AND 1 - (e.embedding <=> %s) > %s
                  AND e.marker_name = %s
                ORDER BY e.embedding <=> %s
                LIMIT %s
                """,
                (vec, user_id, vec, threshold, marker_name, vec, limit),
            ).fetchall()
    else:
        with get_conn() as conn:
            rows = conn.execute(
                """
                SELECT e.marker_id, e.test_id, e.marker_name, e.content,
                       1 - (e.embedding <=> %s) as similarity,
                       m.value, m.unit, m.flag,
                       t.test_date, t.file_name
                FROM blood_marker_embeddings e
                JOIN blood_markers m ON m.id = e.marker_id
                JOIN blood_tests t ON t.id = e.test_id
                WHERE e.user_id = %s
                  AND 1 - (e.embedding <=> %s) > %s
                ORDER BY e.embedding <=> %s
                LIMIT %s
                """,
                (vec, user_id, vec, threshold, vec, limit),
            ).fetchall()
    return [
        {
            "marker_id": str(r[0]),
            "test_id": str(r[1]),
            "marker_name": r[2],
            "content": r[3],
            "similarity": float(r[4]),
            "value": r[5],
            "unit": r[6],
            "flag": r[7],
            "test_date": str(r[8]) if r[8] else None,
            "file_name": r[9],
        }
        for r in rows
    ]

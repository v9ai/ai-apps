"""Connection and upsert helpers for the knowledge app's Neon database."""

import os
from typing import Any

import psycopg
from psycopg.rows import dict_row


def get_knowledge_connection() -> psycopg.Connection:
    """Get a psycopg connection to the knowledge Neon PostgreSQL database.

    Validates the connection string targets the 'knowledge' database,
    not the default 'neondb'.
    """
    url = os.environ["KNOWLEDGE_DATABASE_URL"]

    # Guard: catch wrong database name (root cause of silent data loss)
    if "/neondb" in url and "/knowledge" not in url:
        raise ValueError(
            "KNOWLEDGE_DATABASE_URL points to 'neondb' instead of 'knowledge'. "
            "Fix the database name in the connection string: change /neondb to /knowledge"
        )

    return psycopg.connect(url, row_factory=dict_row)


def get_existing_lesson_slugs(conn: psycopg.Connection) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT slug FROM lessons")
        return {row["slug"] for row in cur.fetchall()}


def get_existing_concept_names(conn: psycopg.Connection) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT name FROM concepts")
        return {row["name"] for row in cur.fetchall()}


def get_max_lesson_number(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COALESCE(MAX(number), 55) AS max_num FROM lessons")
        return cur.fetchone()["max_num"]


def get_max_sort_order(conn: psycopg.Connection) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COALESCE(MAX(sort_order), 9) AS max_so FROM categories")
        return cur.fetchone()["max_so"]


def upsert_category(
    conn: psycopg.Connection,
    name: str, slug: str, icon: str, description: str,
    gradient_from: str, gradient_to: str,
    sort_order: int, lesson_range_lo: int, lesson_range_hi: int,
) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO categories (name, slug, icon, description, gradient_from, gradient_to,
                                    sort_order, lesson_range_lo, lesson_range_hi)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE SET
                icon = EXCLUDED.icon, description = EXCLUDED.description,
                gradient_from = EXCLUDED.gradient_from, gradient_to = EXCLUDED.gradient_to,
                sort_order = EXCLUDED.sort_order,
                lesson_range_lo = LEAST(categories.lesson_range_lo, EXCLUDED.lesson_range_lo),
                lesson_range_hi = GREATEST(categories.lesson_range_hi, EXCLUDED.lesson_range_hi)
            RETURNING id
            """,
            [name, slug, icon, description, gradient_from, gradient_to,
             sort_order, lesson_range_lo, lesson_range_hi],
        )
        conn.commit()
        return cur.fetchone()["id"]


def upsert_lesson(
    conn: psycopg.Connection,
    slug: str, number: int, title: str, category_id: int,
    content: str, word_count: int, summary: str | None = None,
) -> str:
    reading_time = max(1, round(word_count / 200))
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO lessons (slug, number, title, category_id, content, word_count,
                                 reading_time_min, summary)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (slug) DO UPDATE SET
                title = EXCLUDED.title, category_id = EXCLUDED.category_id,
                content = EXCLUDED.content, word_count = EXCLUDED.word_count,
                reading_time_min = EXCLUDED.reading_time_min, summary = EXCLUDED.summary,
                updated_at = now()
            RETURNING id
            """,
            [slug, number, title, category_id, content, word_count, reading_time, summary],
        )
        conn.commit()
        return str(cur.fetchone()["id"])


def upsert_concept(
    conn: psycopg.Connection,
    name: str, description: str | None,
    concept_type: str, metadata: dict[str, Any] | None = None,
) -> str:
    import json
    meta_json = json.dumps(metadata or {})
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO concepts (name, description, concept_type, metadata)
            VALUES (%s, %s, %s, %s::jsonb)
            ON CONFLICT (name) DO UPDATE SET
                description = COALESCE(EXCLUDED.description, concepts.description),
                concept_type = EXCLUDED.concept_type,
                metadata = concepts.metadata || EXCLUDED.metadata
            RETURNING id
            """,
            [name, description, concept_type, meta_json],
        )
        conn.commit()
        return str(cur.fetchone()["id"])


def upsert_concept_edge(
    conn: psycopg.Connection,
    source_id: str, target_id: str, edge_type: str, weight: float = 1.0,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO concept_edges (source_id, target_id, edge_type, weight)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (source_id, target_id, edge_type) DO UPDATE SET weight = EXCLUDED.weight
            """,
            [source_id, target_id, edge_type, weight],
        )
        conn.commit()


def upsert_lesson_concept(
    conn: psycopg.Connection,
    lesson_id: str, concept_id: str, relevance: float = 1.0,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO lesson_concepts (lesson_id, concept_id, relevance)
            VALUES (%s, %s, %s)
            ON CONFLICT (lesson_id, concept_id) DO UPDATE SET relevance = EXCLUDED.relevance
            """,
            [lesson_id, concept_id, relevance],
        )
        conn.commit()

"""Populate embedding tables in Neon pgvector using FastEmbed.

Uses BAAI/bge-large-en-v1.5 (1024-dim) — no API key needed.

Usage:
    uv run python populate_embeddings.py                    # all tables
    uv run python populate_embeddings.py --table sections   # sections only
    uv run python populate_embeddings.py --table lessons    # lessons only
    uv run python populate_embeddings.py --table concepts   # concepts only
    uv run python populate_embeddings.py --dry-run          # count rows, don't embed
    uv run python populate_embeddings.py --batch-size 50    # custom batch size
"""

import argparse
import os
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from pgvector.psycopg2 import register_vector

from fastembed_embedder import FastEmbedEmbedder

_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)


def _connect():
    dsn = os.getenv("DATABASE_URL", "")
    if not dsn:
        raise ValueError("DATABASE_URL not set in .env.local")
    conn = psycopg2.connect(dsn)
    register_vector(conn)
    return conn


def populate_lesson_embeddings(conn, embedder: FastEmbedEmbedder, batch_size: int = 128, dry_run: bool = False):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT l.id, l.slug, l.title, l.content
            FROM lessons l
            WHERE l.id NOT IN (SELECT lesson_id FROM lesson_embeddings)
            ORDER BY l.number
            """
        )
        rows = cur.fetchall()

    print(f"  Lessons to embed: {len(rows)}")
    if dry_run or not rows:
        return

    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        texts = [f"{row[2]}\n\n{row[3][:4000]}" for row in batch]
        embeddings = embedder.embed_texts(texts)

        values = [
            (lesson_id, f"{title}\n\n{content[:4000]}", emb)
            for (lesson_id, slug, title, content), emb in zip(batch, embeddings)
        ]
        with conn.cursor() as cur:
            execute_values(
                cur,
                "INSERT INTO lesson_embeddings (lesson_id, content, embedding) VALUES %s",
                values,
            )
        conn.commit()
        print(f"  Embedded lessons {i + 1}–{min(i + batch_size, len(rows))}")


def populate_section_embeddings(conn, embedder: FastEmbedEmbedder, batch_size: int = 128, dry_run: bool = False):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT ls.id, ls.lesson_id, ls.heading, ls.content, l.title AS lesson_title
            FROM lesson_sections ls
            JOIN lessons l ON l.id = ls.lesson_id
            WHERE ls.id NOT IN (SELECT section_id FROM section_embeddings)
            ORDER BY l.number, ls.section_order
            """
        )
        rows = cur.fetchall()

    print(f"  Sections to embed: {len(rows)}")
    if dry_run or not rows:
        return

    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        texts = [f"{row[4]} > {row[2]}\n\n{row[3]}" for row in batch]
        embeddings = embedder.embed_texts(texts)

        values = [
            (section_id, lesson_id, f"{lesson_title} > {heading}\n\n{content}", emb)
            for (section_id, lesson_id, heading, content, lesson_title), emb in zip(batch, embeddings)
        ]
        with conn.cursor() as cur:
            execute_values(
                cur,
                "INSERT INTO section_embeddings (section_id, lesson_id, content, embedding) VALUES %s",
                values,
            )
        conn.commit()
        print(f"  Embedded sections {i + 1}–{min(i + batch_size, len(rows))}")


def populate_concept_embeddings(conn, embedder: FastEmbedEmbedder, batch_size: int = 128, dry_run: bool = False):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, name, description
            FROM concepts
            WHERE id NOT IN (SELECT concept_id FROM concept_embeddings)
            ORDER BY name
            """
        )
        rows = cur.fetchall()

    print(f"  Concepts to embed: {len(rows)}")
    if dry_run or not rows:
        return

    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        texts = [f"{row[1]}: {row[2] or ''}" for row in batch]
        embeddings = embedder.embed_texts(texts)

        values = [
            (concept_id, f"{name}: {description or ''}", emb)
            for (concept_id, name, description), emb in zip(batch, embeddings)
        ]
        with conn.cursor() as cur:
            execute_values(
                cur,
                "INSERT INTO concept_embeddings (concept_id, content, embedding) VALUES %s",
                values,
            )
        conn.commit()
        print(f"  Embedded concepts {i + 1}–{min(i + batch_size, len(rows))}")


def main():
    parser = argparse.ArgumentParser(description="Populate pgvector embedding tables using FastEmbed")
    parser.add_argument("--table", choices=["lessons", "sections", "concepts"], help="Populate only this table")
    parser.add_argument("--dry-run", action="store_true", help="Count rows without embedding")
    parser.add_argument("--batch-size", type=int, default=128, help="Batch size for embedding (default: 128)")
    parser.add_argument("--parallel", type=int, default=None, help="Number of parallel workers for embedding")
    args = parser.parse_args()

    conn = _connect()
    embedder = FastEmbedEmbedder(parallel=args.parallel)
    tables = [args.table] if args.table else ["lessons", "sections", "concepts"]

    print(f"Model: {embedder.get_model_name()}")
    print(f"Mode: {'dry-run' if args.dry_run else 'populate'}\n")

    for table in tables:
        print(f"[{table}]")
        if table == "lessons":
            populate_lesson_embeddings(conn, embedder, args.batch_size, args.dry_run)
        elif table == "sections":
            populate_section_embeddings(conn, embedder, args.batch_size, args.dry_run)
        elif table == "concepts":
            populate_concept_embeddings(conn, embedder, args.batch_size, args.dry_run)
        print()

    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()

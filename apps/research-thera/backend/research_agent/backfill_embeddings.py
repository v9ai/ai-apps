"""Backfill embeddings for all therapy_research papers that don't have one yet."""
from __future__ import annotations

import json
import os
import sys

import psycopg
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .embeddings import embed_texts, paper_to_embedding_text


def main():
    conn_str = os.environ.get("NEON_DATABASE_URL", "")
    if not conn_str:
        print("NEON_DATABASE_URL not set")
        sys.exit(1)

    with psycopg.connect(conn_str) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, title, abstract, key_findings, therapeutic_techniques "
                "FROM therapy_research WHERE embedding IS NULL"
            )
            rows = cur.fetchall()

    if not rows:
        print("All papers already have embeddings.")
        return

    print(f"Backfilling embeddings for {len(rows)} papers...")

    # Build texts for embedding (batch up to 50 at a time for API limits)
    batch_size = 50
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        texts = []
        ids = []
        for row_id, title, abstract, kf_json, tt_json in batch:
            kf = json.loads(kf_json) if kf_json else []
            tt = json.loads(tt_json) if tt_json else []
            texts.append(paper_to_embedding_text(title, kf, tt, abstract))
            ids.append(row_id)

        embeddings = embed_texts(texts)

        with psycopg.connect(conn_str) as conn:
            with conn.cursor() as cur:
                for paper_id, emb in zip(ids, embeddings):
                    cur.execute(
                        "UPDATE therapy_research SET embedding = %s WHERE id = %s",
                        (str(emb), paper_id),
                    )
            conn.commit()

        print(f"  Embedded {i + len(batch)}/{len(rows)} papers")

    print("Done.")


if __name__ == "__main__":
    main()

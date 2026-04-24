"""Backfill embeddings for all Bogdan-relevant rows + linked therapy_research papers.

Idempotent: re-running upserts. Run after data changes:

    research-agent backfill-bogdan-embeddings --user-email <email> [--name Bogdan]
    # or
    make backfill-bogdan-embeddings
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# ── deepseek_client / research_client from shared pypackages ────────────
sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"),
)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "research" / "src"))

from research_client.embeddings import aembed_texts, EMBEDDING_MODEL  # noqa: E402

from .entity_embeddings import entity_to_text, upsert_embedding  # noqa: E402


BATCH_SIZE = 64


async def _row_to_dict(cur, row) -> dict:
    cols = [d.name for d in cur.description]
    return dict(zip(cols, row))


async def _fetch_all_dicts(cur, sql: str, params: tuple) -> list[dict]:
    await cur.execute(sql, params)
    rows = await cur.fetchall()
    cols = [d.name for d in cur.description]
    return [dict(zip(cols, r)) for r in rows]


async def _embed_and_upsert(
    conn: psycopg.AsyncConnection,
    entity_type: str,
    rows: list[dict],
    family_member_id_field: str = "family_member_id",
    id_field: str = "id",
) -> int:
    if not rows:
        return 0
    texts = [entity_to_text(entity_type, r) for r in rows]
    # Batch through the embedding model
    inserted = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch_rows = rows[i : i + BATCH_SIZE]
        batch_texts = texts[i : i + BATCH_SIZE]
        vectors = await aembed_texts(batch_texts)
        for row, text, vec in zip(batch_rows, batch_texts, vectors):
            fm_id = row.get(family_member_id_field) if family_member_id_field else None
            await upsert_embedding(
                conn,
                entity_type=entity_type,
                entity_id=int(row[id_field]),
                family_member_id=int(fm_id) if fm_id is not None else None,
                text=text,
                vector=vec,
            )
            inserted += 1
        await conn.commit()
    return inserted


async def backfill(user_email: str, name: str = "Bogdan") -> None:
    conn_str = os.environ.get("NEON_DATABASE_URL", "")
    if not conn_str:
        print("Error: NEON_DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    print(f"Backfilling embeddings for {name} (user={user_email}) using {EMBEDDING_MODEL}", file=sys.stderr)

    async with await psycopg.AsyncConnection.connect(conn_str) as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id FROM family_members "
                "WHERE user_id = %s AND LOWER(first_name) = LOWER(%s) LIMIT 1",
                (user_email, name),
            )
            row = await cur.fetchone()
            if not row:
                print(f"❌ No family member named '{name}' for {user_email}", file=sys.stderr)
                sys.exit(1)
            fm_id = row[0]
            print(f"  family_member_id = {fm_id}", file=sys.stderr)

        # Per-table fetches
        async with conn.cursor() as cur:
            issues = await _fetch_all_dicts(
                cur,
                "SELECT id, family_member_id, title, description, category, severity, journal_entry_id "
                "FROM issues WHERE family_member_id = %s AND user_id = %s",
                (fm_id, user_email),
            )
            journals = await _fetch_all_dicts(
                cur,
                "SELECT id, family_member_id, title, content, mood, tags, entry_date "
                "FROM journal_entries WHERE family_member_id = %s AND user_id = %s",
                (fm_id, user_email),
            )
            contact_fbs = await _fetch_all_dicts(
                cur,
                "SELECT id, family_member_id, subject, content, source, feedback_date "
                "FROM contact_feedbacks WHERE family_member_id = %s AND user_id = %s",
                (fm_id, user_email),
            )
            teacher_fbs = await _fetch_all_dicts(
                cur,
                "SELECT id, family_member_id, teacher_name, content, feedback_date "
                "FROM teacher_feedbacks WHERE family_member_id = %s AND user_id = %s",
                (fm_id, user_email),
            )
            observations = await _fetch_all_dicts(
                cur,
                "SELECT id, family_member_id, observation_type, intensity, context, observed_at "
                "FROM behavior_observations WHERE family_member_id = %s AND user_id = %s",
                (fm_id, user_email),
            )
            analyses = await _fetch_all_dicts(
                cur,
                "SELECT id, family_member_id, summary, trigger_issue_id "
                "FROM deep_issue_analyses WHERE family_member_id = %s AND user_id = %s",
                (fm_id, user_email),
            )
            characteristics = await _fetch_all_dicts(
                cur,
                "SELECT id, family_member_id, title, description, category, severity "
                "FROM family_member_characteristics WHERE family_member_id = %s AND user_id = %s",
                (fm_id, user_email),
            )
            goals = await _fetch_all_dicts(
                cur,
                "SELECT id, family_member_id, title, description, status, priority, tags "
                "FROM goals WHERE family_member_id = %s AND user_id = %s",
                (fm_id, user_email),
            )

            goal_ids = [g["id"] for g in goals]
            issue_ids = [i["id"] for i in issues]
            journal_ids = [j["id"] for j in journals]

            # Research papers linked to Bogdan via any FK
            research = []
            if goal_ids or issue_ids or journal_ids:
                conds = []
                params: list = []
                if goal_ids:
                    conds.append(f"goal_id IN ({','.join(['%s']*len(goal_ids))})")
                    params.extend(goal_ids)
                if issue_ids:
                    conds.append(f"issue_id IN ({','.join(['%s']*len(issue_ids))})")
                    params.extend(issue_ids)
                if journal_ids:
                    conds.append(f"journal_entry_id IN ({','.join(['%s']*len(journal_ids))})")
                    params.extend(journal_ids)
                research = await _fetch_all_dicts(
                    cur,
                    "SELECT DISTINCT id, title, abstract, key_findings, therapeutic_techniques, "
                    "evidence_level, year FROM therapy_research WHERE " + " OR ".join(conds),
                    tuple(params),
                )

        print(
            f"  fetched: {len(issues)} issues, {len(journals)} journals, "
            f"{len(contact_fbs)} contact_fbs, {len(teacher_fbs)} teacher_fbs, "
            f"{len(observations)} observations, {len(analyses)} analyses, "
            f"{len(characteristics)} characteristics, {len(goals)} goals, "
            f"{len(research)} research papers",
            file=sys.stderr,
        )

        total = 0
        total += await _embed_and_upsert(conn, "issue", issues)
        total += await _embed_and_upsert(conn, "journal_entry", journals)
        total += await _embed_and_upsert(conn, "contact_feedback", contact_fbs)
        total += await _embed_and_upsert(conn, "teacher_feedback", teacher_fbs)
        total += await _embed_and_upsert(conn, "behavior_observation", observations)
        total += await _embed_and_upsert(conn, "deep_issue_analysis", analyses)
        total += await _embed_and_upsert(conn, "family_member_characteristic", characteristics)
        total += await _embed_and_upsert(conn, "goal", goals)
        # Research has no family_member_id (global)
        for r in research:
            r["family_member_id"] = None
        total += await _embed_and_upsert(conn, "therapy_research", research)

        print(f"\n✅ Upserted {total} embeddings into entity_embeddings", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill Bogdan entity embeddings")
    parser.add_argument("--user-email", required=True)
    parser.add_argument("--name", default="Bogdan")
    args = parser.parse_args()
    asyncio.run(backfill(args.user_email, args.name))


if __name__ == "__main__":
    main()

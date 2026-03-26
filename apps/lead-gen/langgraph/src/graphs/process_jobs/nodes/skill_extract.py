"""Phase 4 — Skill Extraction node.

Extracts canonical skill tags from classified job descriptions
using LLM + taxonomy validation.
"""

import json

from src.config import get_llm
from src.db.connection import get_connection
from src.db.queries import fetch_classified_jobs_without_skills
from src.db.mutations import upsert_job_skills
from src.models.taxonomy import SKILL_TAGS
from src.models.skills import JobSkillOutput
from ..prompts import SKILL_EXTRACTION_PROMPT

_TAGS_STR = ", ".join(sorted(SKILL_TAGS))


def extract_skills_jobs_node(state: dict) -> dict:
    """Phase 4 node: extract skills for classified jobs without skill tags."""
    conn = get_connection()
    rows = fetch_classified_jobs_without_skills(conn, state.get("limit", 100))
    print(f"  Found {len(rows)} jobs for skill extraction")

    llm = get_llm()
    chain = SKILL_EXTRACTION_PROMPT | llm
    stats = {"processed": 0, "extracted": 0, "errors": 0}

    for job in rows:
        try:
            response = chain.invoke({
                "tags": _TAGS_STR,
                "title": job.get("title", "N/A"),
                "description": (job.get("description") or "")[:6000],
            })
            raw = json.loads(response.content)
            output = JobSkillOutput.from_dict(raw)

            # Validate: only canonical tags, evidence required (min 8 chars), max 30 skills
            valid = [
                s for s in output.skills
                if s.tag in SKILL_TAGS and len(s.evidence.strip()) >= 8
            ][:30]

            if valid:
                skills_dicts = [
                    {
                        "tag": s.tag,
                        "level": s.level,
                        "confidence": s.confidence,
                        "evidence": s.evidence,
                    }
                    for s in valid
                ]
                upsert_job_skills(conn, job["id"], skills_dicts)
                stats["extracted"] += len(valid)

            stats["processed"] += 1
        except Exception as e:
            print(f"    Error extracting skills for {job.get('id')}: {e}")
            stats["errors"] += 1

    conn.close()
    return {"phase_results": [{"phase": "skill_extract", **stats}]}

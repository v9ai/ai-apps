"""LangGraph port of the retired TS `generateTherapyResearch` workflow.

Multi-step academic research pipeline with quality gating. Unlike `graph.py`
(which uses a ReAct agent to pick queries itself), this graph runs a
deterministic LLM-planned pipeline:

  1. load_context        — fetch goal + notes + family member (or feedback)
  2. normalize_goal      — DeepSeek JSON: clinical context (translation, domain,
                           behavior direction, developmental tier, required
                           keywords, excluded topics)
  3. plan_query          — DeepSeek JSON: generate search queries per source
  4. search              — multi-source academic search via research_client
                           (OpenAlex / Crossref / Semantic Scholar)
  5. rerank              — cross-encoder rerank against the clinical restatement
  6. extract_all         — DeepSeek JSON per paper: relevance / confidence /
                           key findings / techniques / study type
  7. persist             — blended-score gate + upsert_research_paper +
                           generation_jobs transition (SUCCEEDED / FAILED) +
                           best-effort eval pass

The graph faithfully ports the quality thresholds and scoring from the TS
workflow (`RELEVANCE_THRESHOLD=0.75`, `CONFIDENCE_THRESHOLD=0.55`,
`BLENDED_THRESHOLD=0.72`, `PERSIST_CANDIDATES_LIMIT=20`).

State mirrors the TS `inputSchema`:
  - userId (str)            required (maps to user_id / email in DB)
  - goalId (int)            optional
  - jobId (str)             optional — drives generation_jobs updates
  - issueId (int)           optional
  - feedbackId (int)        optional
  - familyMemberName (str)  optional
  - familyMemberAge (int)   optional
  - language (str)          optional — "ro" prepends ROMANIAN_INSTRUCTION
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Optional, TypedDict

import httpx
import psycopg
from psycopg import sql

from research_agent import neon
from dotenv import load_dotenv
from langgraph.graph import END, START, StateGraph
from langgraph.types import RetryPolicy

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Whitelist of columns allowed in dynamic WHERE-clause composition for the
# therapy-research eval lookup. Values composed via psycopg.sql.Identifier
# into a query MUST be checked against this set first.
_ALLOWED_EVAL_COLS = frozenset({"issue_id", "feedback_id", "goal_id"})

# ── deepseek_client from shared pypackages ────────────────────────────────
sys.path.insert(
    0,
    str(Path(__file__).resolve().parent.parent.parent.parent.parent / "pypackages" / "deepseek" / "src"),
)
from deepseek_client import ChatMessage, DeepSeekClient, DeepSeekConfig  # noqa: E402

from .neon import _get_conn_str, upsert_research_paper  # noqa: E402
from .reranker import rerank  # noqa: E402
from .research_sources import search_papers_with_fallback  # noqa: E402


# ---------------------------------------------------------------------------
# Tunables — ported from TS constants
# ---------------------------------------------------------------------------
ENRICH_CANDIDATES_LIMIT = 300
EXTRACT_CANDIDATES_LIMIT = 50
EXTRACTION_BATCH_SIZE = 6
PERSIST_CANDIDATES_LIMIT = 20
RELEVANCE_THRESHOLD = 0.75
CONFIDENCE_THRESHOLD = 0.55
BLENDED_THRESHOLD = 0.72
PER_QUERY_LIMIT = 30  # papers fetched per query (Python research_client)
DEFAULT_QUERY_COUNT = 5

EVIDENCE_WEIGHTS: dict[str, float] = {
    "meta-analysis": 1.0,
    "meta_analysis": 1.0,
    "systematic_review": 0.9,
    "systematic-review": 0.9,
    "rct": 0.8,
    "cohort": 0.6,
    "case_control": 0.5,
    "case-control": 0.5,
    "case_series": 0.35,
    "case-series": 0.35,
    "case_study": 0.2,
    "case-study": 0.2,
    "expert_opinion": 0.1,
}

ROMANIAN_INSTRUCTION = (
    "IMPORTANT: Respond entirely in Romanian. Every string field in your JSON output "
    "must be written in natural, fluent Romanian. Do not translate proper nouns, "
    "people's names, or citation identifiers."
)

DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
class GenerateTherapyResearchState(TypedDict, total=False):
    # Inputs (mirror TS inputSchema)
    userId: str
    goalId: Optional[int]
    jobId: Optional[str]
    issueId: Optional[int]
    feedbackId: Optional[int]
    familyMemberName: Optional[str]
    familyMemberAge: Optional[int]
    language: Optional[str]

    # Internal — populated by nodes
    _goal_title: str
    _goal_description: Optional[str]
    _goal_tags: list[str]
    _notes: list[str]
    _clinical: dict  # normalized clinical context
    _plan: dict  # query plan
    _candidates: list[dict]
    _ranked_candidates: list[dict]
    _extract_results: list[dict]

    # Outputs
    count: int
    message: str
    success: bool
    _evals: dict
    _error: dict


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _conn_str() -> str:
    return _get_conn_str()


def _age_to_tier(age: Optional[int]) -> str:
    if not age:
        return "unknown"
    if age <= 5:
        return "preschool"
    if age <= 8:
        return "early_school"
    if age <= 12:
        return "middle_childhood"
    if age <= 17:
        return "adolescent"
    return "adult"


def _escape_regex(s: str) -> str:
    return re.escape(s)


def _clamp01(v: Any) -> float:
    try:
        n = float(v)
    except (TypeError, ValueError):
        return 0.0
    if n != n:  # NaN
        return 0.0
    return max(0.0, min(1.0, n))


def _round2(n: float) -> float:
    return round(n * 100) / 100


def _parse_json_field(value: Any) -> list:
    if not value:
        return []
    try:
        parsed = json.loads(value) if isinstance(value, str) else value
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


async def _deepseek_json(
    prompt: str,
    system_prompt: Optional[str] = None,
    temperature: float = 0.0,
    timeout: float = 60.0,
    max_tokens: int = 4096,
) -> Optional[dict]:
    """Thin wrapper around DeepSeek chat/completions with JSON response mode."""
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("[generate_therapy_research] DEEPSEEK_API_KEY not set")
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                DEEPSEEK_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": system_prompt or "Respond with valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": False,
                },
            )
            if resp.status_code != 200:
                print(f"[deepseek_json] HTTP {resp.status_code}: {resp.text[:200]}")
                return None
            body = resp.json()
            content = (body.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                print(f"[deepseek_json] JSON parse failed: {content[:200]}")
                return None
    except Exception as exc:
        print(f"[deepseek_json] fetch error: {exc}")
        return None


# ---------------------------------------------------------------------------
# Job-tracking helpers (mirror graph.py)
# ---------------------------------------------------------------------------
async def _update_job_progress(job_id: str, progress: int) -> None:
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET progress = %s, updated_at = NOW() WHERE id = %s",
                    (progress, job_id),
                )
    except Exception as exc:
        print(f"[update_job_progress] failed: {exc}")


async def _update_job_succeeded(job_id: str, payload: dict) -> None:
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'SUCCEEDED', progress = 100, "
                    "result = %s, updated_at = NOW() WHERE id = %s",
                    (json.dumps(payload), job_id),
                )
    except Exception as exc:
        print(f"[update_job_succeeded] failed: {exc}")


async def _update_job_failed(job_id: str, error: dict) -> None:
    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "UPDATE generation_jobs SET status = 'FAILED', error = %s, "
                    "updated_at = NOW() WHERE id = %s",
                    (json.dumps(error), job_id),
                )
    except Exception as exc:
        print(f"[update_job_failed] failed: {exc}")


# ---------------------------------------------------------------------------
# Node 1 — load_context
# ---------------------------------------------------------------------------
async def load_context(state: GenerateTherapyResearchState) -> dict:
    """Load goal + notes + family member (or feedback) from Neon."""
    user_id = state.get("userId")
    goal_id = state.get("goalId")
    feedback_id = state.get("feedbackId")
    job_id = state.get("jobId")

    if not user_id:
        return {"_error": {"message": "userId is required", "code": "NO_USER"}}
    if not goal_id and not feedback_id:
        return {"_error": {"message": "Either goalId or feedbackId must be provided", "code": "NO_CONTEXT_ID"}}

    if job_id:
        await _update_job_progress(job_id, 5)

    conn_str = _conn_str()
    family_member_name: Optional[str] = state.get("familyMemberName")
    family_member_age: Optional[int] = state.get("familyMemberAge")

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                if goal_id:
                    await cur.execute(
                        "SELECT id, title, description, tags, family_member_id "
                        "FROM goals WHERE id = %s AND user_id = %s",
                        (goal_id, user_id),
                    )
                    row = await cur.fetchone()
                    if not row:
                        return {"_error": {"message": f"Goal {goal_id} not found", "code": "GOAL_NOT_FOUND"}}
                    _, title, description, tags_raw, fm_id = row
                    goal_tags = _parse_json_field(tags_raw)

                    await cur.execute(
                        "SELECT content FROM notes WHERE entity_id = %s AND entity_type = %s AND user_id = %s "
                        "ORDER BY created_at DESC",
                        (goal_id, "Goal", user_id),
                    )
                    notes = [r[0] for r in await cur.fetchall() if r[0]]

                    if fm_id and (family_member_name is None or family_member_age is None):
                        await cur.execute(
                            "SELECT first_name, name, age_years FROM family_members WHERE id = %s",
                            (fm_id,),
                        )
                        fm_row = await cur.fetchone()
                        if fm_row:
                            family_member_name = family_member_name or (fm_row[0] or fm_row[1])
                            family_member_age = family_member_age or fm_row[2]

                    return {
                        "_goal_title": title or "",
                        "_goal_description": description,
                        "_goal_tags": goal_tags,
                        "_notes": notes,
                        "familyMemberName": family_member_name,
                        "familyMemberAge": family_member_age,
                    }

                # feedback_id path
                await cur.execute(
                    "SELECT id, subject, content, extracted_issues, family_member_id "
                    "FROM contact_feedbacks WHERE id = %s AND user_id = %s",
                    (feedback_id, user_id),
                )
                row = await cur.fetchone()
                if not row:
                    return {"_error": {"message": f"Feedback {feedback_id} not found", "code": "FEEDBACK_NOT_FOUND"}}
                _, subject, content, extracted_raw, fm_id = row

                extracted = _parse_json_field(extracted_raw)
                issue_titles = "; ".join(
                    i.get("title", "") for i in extracted if isinstance(i, dict)
                )
                title = issue_titles or subject or "Feedback-based research"
                description = content or ""

                if fm_id and (family_member_name is None or family_member_age is None):
                    await cur.execute(
                        "SELECT first_name, name, age_years FROM family_members WHERE id = %s",
                        (fm_id,),
                    )
                    fm_row = await cur.fetchone()
                    if fm_row:
                        family_member_name = family_member_name or (fm_row[0] or fm_row[1])
                        family_member_age = family_member_age or fm_row[2]

                return {
                    "_goal_title": title,
                    "_goal_description": description,
                    "_goal_tags": [],
                    "_notes": [content] if content else [],
                    "familyMemberName": family_member_name,
                    "familyMemberAge": family_member_age,
                }
    except Exception as exc:
        return {"_error": {"message": f"load_context failed: {exc}", "code": "LOAD_FAILED"}}


# ---------------------------------------------------------------------------
# Node 2 — normalize_goal
# ---------------------------------------------------------------------------
async def normalize_goal(state: GenerateTherapyResearchState) -> dict:
    """DeepSeek JSON: translate + clinically classify the goal."""
    if state.get("_error"):
        return {}

    job_id = state.get("jobId")
    if job_id:
        await _update_job_progress(job_id, 10)

    title = state.get("_goal_title", "")
    description = state.get("_goal_description") or ""
    notes = state.get("_notes") or []
    fm_age = state.get("familyMemberAge")
    fm_name = state.get("familyMemberName")

    fallback = {
        "translatedGoalTitle": title,
        "originalLanguage": "unknown",
        "clinicalRestatement": title,
        "clinicalDomain": "behavioral_change",
        "behaviorDirection": "UNCLEAR",
        "developmentalTier": _age_to_tier(fm_age),
        "requiredKeywords": [],
        "excludedTopics": [],
    }

    age_ctx = f"The patient is {fm_age} years old." if fm_age else ""
    name_ctx = f"Patient name: {fm_name}." if fm_name else ""
    notes_ctx = "; ".join(notes) if notes else "(none)"

    prompt = (
        "You are a clinical psychologist specializing in translating parent/family-reported "
        "therapeutic goals into precise clinical language for academic research queries.\n\n"
        f'Goal Title: "{title}"\n'
        f'Goal Description: "{description}"\n'
        f"Notes: {notes_ctx}\n"
        f"{age_ctx} {name_ctx}\n\n"
        "TASK:\n"
        "1. Detect the language (ISO 639-1 code, e.g. \"en\", \"ro\", \"fr\")\n"
        "2. Translate to English if not already English\n"
        "3. Identify the SPECIFIC clinical construct (not generic \"behavioral_change\")\n"
        "4. Determine if goal is to INCREASE or REDUCE the behavior\n"
        "5. Infer developmental stage from age\n"
        "6. Generate 5-10 required keywords that MUST appear in relevant research papers\n"
        "7. Generate 5-10 excluded topics that are NOT relevant to this goal\n\n"
        "BEHAVIOR DIRECTION: INCREASE | REDUCE | MAINTAIN | UNCLEAR\n"
        "DEVELOPMENTAL TIER: preschool | early_school | middle_childhood | adolescent | adult | unknown\n\n"
        'Return JSON exactly matching this shape: {\n'
        '  "translatedGoalTitle": "...",\n'
        '  "originalLanguage": "en",\n'
        '  "clinicalRestatement": "...",\n'
        '  "clinicalDomain": "...",\n'
        '  "behaviorDirection": "INCREASE|REDUCE|MAINTAIN|UNCLEAR",\n'
        '  "developmentalTier": "preschool|early_school|middle_childhood|adolescent|adult|unknown",\n'
        '  "requiredKeywords": ["..."],\n'
        '  "excludedTopics": ["..."]\n'
        "}"
    )

    system = (
        ROMANIAN_INSTRUCTION + "\n\nRespond with valid JSON."
        if state.get("language") == "ro"
        else "Respond with valid JSON."
    )

    parsed = await _deepseek_json(prompt, system_prompt=system) or {}
    if not parsed or not parsed.get("translatedGoalTitle"):
        return {"_clinical": fallback}

    # Coerce arrays in case the LLM returns strings
    def _as_list(v: Any) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v]
        if isinstance(v, list):
            return [str(x) for x in v]
        return []

    merged = {
        "translatedGoalTitle": parsed.get("translatedGoalTitle") or title,
        "originalLanguage": parsed.get("originalLanguage") or "unknown",
        "clinicalRestatement": parsed.get("clinicalRestatement") or title,
        "clinicalDomain": parsed.get("clinicalDomain") or "behavioral_change",
        "behaviorDirection": parsed.get("behaviorDirection") or "UNCLEAR",
        "developmentalTier": parsed.get("developmentalTier") or _age_to_tier(fm_age),
        "requiredKeywords": _as_list(parsed.get("requiredKeywords")),
        "excludedTopics": _as_list(parsed.get("excludedTopics")),
    }
    print(
        f"[generate_therapy_research] Goal normalized: \"{title}\" -> "
        f"\"{merged['translatedGoalTitle']}\" ({merged['clinicalDomain']}, {merged['behaviorDirection']})"
    )
    return {"_clinical": merged}


# ---------------------------------------------------------------------------
# Node 3 — plan_query
# ---------------------------------------------------------------------------
async def plan_query(state: GenerateTherapyResearchState) -> dict:
    """DeepSeek JSON: generate search queries + goal type."""
    if state.get("_error"):
        return {}

    job_id = state.get("jobId")
    if job_id:
        await _update_job_progress(job_id, 20)

    clinical = state.get("_clinical") or {}
    title = clinical.get("translatedGoalTitle") or state.get("_goal_title", "")
    description = state.get("_goal_description") or ""
    notes = state.get("_notes") or []

    prompt = (
        "You are a research librarian. Given a clinical goal, produce search queries for "
        "multiple academic sources. Return JSON with this shape:\n"
        "{\n"
        '  "goalType": "<short snake_case therapeutic goal type>",\n'
        '  "keywords": ["5-10 terms"],\n'
        '  "crossrefQueries": ["5-8 queries for Crossref"],\n'
        '  "semanticScholarQueries": ["5-8 queries for Semantic Scholar"],\n'
        '  "pubmedQueries": ["3-5 queries for PubMed"]\n'
        "}\n\n"
        f'Goal Title: "{title}"\n'
        f'Goal Description: "{description}"\n'
        f"Notes: {'; '.join(notes) if notes else '(none)'}\n"
        f"Clinical Domain: {clinical.get('clinicalDomain', 'behavioral_change')}\n"
        f"Behavior Direction: {clinical.get('behaviorDirection', 'UNCLEAR')}\n"
        f"Developmental Tier: {clinical.get('developmentalTier', 'unknown')}\n"
        f"Required Keywords: {', '.join(clinical.get('requiredKeywords', []))}\n"
        f"Excluded Topics: {', '.join(clinical.get('excludedTopics', []))}\n\n"
        "Each query should be 4-10 words, mixing clinical terms with population descriptors.\n"
        "Queries should cover the topic from different angles (e.g., intervention type, outcome, "
        "population, setting)."
    )

    system = (
        ROMANIAN_INSTRUCTION + "\n\nRespond with valid JSON."
        if state.get("language") == "ro"
        else "Respond with valid JSON."
    )
    parsed = await _deepseek_json(prompt, system_prompt=system) or {}

    def _as_list(v: Any, limit: int = 10) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v][:limit]
        if isinstance(v, list):
            return [str(x) for x in v if x][:limit]
        return []

    plan = {
        "goalType": parsed.get("goalType") or "behavioral_change",
        "keywords": _as_list(parsed.get("keywords"), 15),
        "crossrefQueries": _as_list(parsed.get("crossrefQueries"), 8),
        "semanticScholarQueries": _as_list(parsed.get("semanticScholarQueries"), 8),
        "pubmedQueries": _as_list(parsed.get("pubmedQueries"), 5),
    }

    # Fallback queries if the LLM failed entirely
    if not (plan["crossrefQueries"] or plan["semanticScholarQueries"]):
        fallback_seed = title or "behavioral intervention children"
        plan["crossrefQueries"] = [
            f"{fallback_seed} evidence-based intervention",
            f"{fallback_seed} randomized controlled trial",
            f"{fallback_seed} meta-analysis",
        ]
        plan["semanticScholarQueries"] = [
            f"{fallback_seed} cognitive behavioral therapy",
            f"{fallback_seed} clinical outcomes",
        ]

    print(
        f"[generate_therapy_research] Query Plan: goalType={plan['goalType']}, "
        f"crossref={len(plan['crossrefQueries'])}, s2={len(plan['semanticScholarQueries'])}, "
        f"pubmed={len(plan['pubmedQueries'])}"
    )
    return {"_plan": plan}


# ---------------------------------------------------------------------------
# Node 4 — search
# ---------------------------------------------------------------------------
async def search(state: GenerateTherapyResearchState) -> dict:
    """Multi-source search via research_client, dedupe by DOI/title, filter bad terms."""
    if state.get("_error"):
        return {}

    job_id = state.get("jobId")
    if job_id:
        await _update_job_progress(job_id, 40)

    plan = state.get("_plan") or {}
    clinical = state.get("_clinical") or {}
    goal_tags = state.get("_goal_tags") or []

    # Merge queries across sources (research_client already hits OpenAlex / Crossref / S2)
    queries: list[str] = []
    for q in (plan.get("crossrefQueries") or []):
        if q and q not in queries:
            queries.append(q)
    for q in (plan.get("semanticScholarQueries") or []):
        if q and q not in queries:
            queries.append(q)
    for q in (plan.get("pubmedQueries") or []):
        if q and q not in queries:
            queries.append(q)

    if not queries:
        queries = [
            state.get("_goal_title", "") or "behavioral intervention children",
        ]

    queries = queries[:DEFAULT_QUERY_COUNT * 3]  # hard cap
    s2_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")

    all_papers: list[dict] = []
    for q in queries:
        try:
            batch = await search_papers_with_fallback(q, PER_QUERY_LIMIT, s2_key)
            all_papers.extend(batch)
        except Exception as exc:
            print(f"[search] query failed ({q!r}): {exc}")
        await asyncio.sleep(0.3)

    # Dedupe by DOI, fallback to title
    seen: set[str] = set()
    deduped: list[dict] = []
    for p in all_papers:
        key = (p.get("doi") or "").strip().lower() or (p.get("title") or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(p)

    # Filter bad terms (ported from TS staticBadTerms + dynamic excludedTopics)
    is_sex_therapy = "sex-therapy" in goal_tags
    static_bad = [
        "forensic", "witness", "court", "police", "legal", "pre-admission",
        "homework completion", "homework adherence", "homework refusal",
        "teen dating",
        "weight control", "obesity intervention", "gang-affiliated",
        "delinquency",
    ]
    if not is_sex_therapy:
        static_bad += [
            "dating violence", "cybersex", "internet pornography",
            "marital therapy", "marriage therapy", "couples therapy",
        ]
    dynamic_bad = clinical.get("excludedTopics") or []
    all_bad = static_bad + [t for t in dynamic_bad if isinstance(t, str) and t]

    if all_bad:
        bad_re = re.compile(
            r"\b(" + "|".join(_escape_regex(t) for t in all_bad) + r")\b",
            re.IGNORECASE,
        )
        filtered = [p for p in deduped if not bad_re.search(p.get("title") or "")]
    else:
        filtered = deduped

    # Require minimum abstract length to proceed to extraction
    with_abstracts = [
        p for p in filtered if len((p.get("abstract") or "").strip()) >= 200
    ]

    candidates = with_abstracts[:ENRICH_CANDIDATES_LIMIT]
    print(
        f"[generate_therapy_research] Search: {len(all_papers)} raw -> "
        f"{len(deduped)} deduped -> {len(filtered)} title-filtered -> "
        f"{len(with_abstracts)} with abstracts -> {len(candidates)} kept"
    )
    return {"_candidates": candidates}


# ---------------------------------------------------------------------------
# Node 5 — rerank
# ---------------------------------------------------------------------------
async def rerank_candidates(state: GenerateTherapyResearchState) -> dict:
    """Cross-encoder rerank against the clinical restatement."""
    if state.get("_error"):
        return {}

    candidates = state.get("_candidates") or []
    if not candidates:
        return {"_ranked_candidates": []}

    job_id = state.get("jobId")
    if job_id:
        await _update_job_progress(job_id, 60)

    clinical = state.get("_clinical") or {}
    query = (
        clinical.get("clinicalRestatement")
        or clinical.get("translatedGoalTitle")
        or state.get("_goal_title", "")
    )

    try:
        ranked = await rerank(query, candidates, top_k=EXTRACT_CANDIDATES_LIMIT)
        # rerank returns RankedPaper-like objects with .paper + .score
        out: list[dict] = []
        for r in ranked:
            paper = dict(r.paper)
            paper["_rerank_score"] = float(r.score)
            out.append(paper)
        if out:
            print(
                f"[generate_therapy_research] Rerank top-3 scores: "
                f"{[round(p['_rerank_score'], 3) for p in out[:3]]}"
            )
        return {"_ranked_candidates": out}
    except Exception as exc:
        print(f"[rerank] failed, using original order: {exc}")
        return {"_ranked_candidates": candidates[:EXTRACT_CANDIDATES_LIMIT]}


# ---------------------------------------------------------------------------
# Node 6 — extract_all
# ---------------------------------------------------------------------------
async def _extract_one_paper(
    *,
    candidate: dict,
    goal_type: str,
    goal_title: str,
    goal_description: str,
    developmental_tier: str,
    patient_age: Optional[int],
    client: DeepSeekClient,
) -> dict:
    """Per-paper DeepSeek extraction — relevance / confidence / key findings / techniques."""
    title = candidate.get("title") or ""
    abstract = (candidate.get("abstract") or "").strip()
    doi = candidate.get("doi") or ""
    authors = candidate.get("authors") or []
    year = candidate.get("year")
    url = candidate.get("url") or ""

    if len(abstract) < 100:
        return {"ok": False, "score": 0.0, "reason": "insufficient_abstract"}

    prompt = (
        "You are a clinical research analyst extracting structured data from a single paper.\n\n"
        f"Therapeutic Goal: {goal_title}\n"
        f"Goal Description: {goal_description}\n"
        f"Goal Type: {goal_type}\n"
        f"Developmental Tier: {developmental_tier}\n"
        f"Patient Age: {patient_age if patient_age else 'n/a'}\n\n"
        "## Paper\n"
        f"Title: {title}\n"
        f"Authors: {', '.join(authors[:6])}\n"
        f"Year: {year}\n"
        f"DOI: {doi}\n"
        f"Abstract: {abstract[:3000]}\n\n"
        "Return JSON EXACTLY matching:\n"
        "{\n"
        '  "relevanceScore": 0.0-1.0,\n'
        '  "confidence": 0.0-1.0,\n'
        '  "keyFindings": ["1-5 concrete findings"],\n'
        '  "practicalTakeaways": ["1-5 therapeutic techniques actionable by a clinician"],\n'
        '  "studyType": "meta-analysis|systematic_review|rct|cohort|case_control|case_series|case_study|expert_opinion",\n'
        '  "rejectReason": "optional reason if this paper should NOT be used"\n'
        "}\n"
        "- relevanceScore: how well does the paper address the therapeutic goal for this population.\n"
        "- confidence: your confidence in the extracted fields (based on abstract quality).\n"
        "- Reject if abstract is about a different population (e.g. adults when goal is children), "
        "a different intervention, or if relevance is clearly low."
    )

    try:
        resp = await client.chat(
            [ChatMessage(role="user", content=prompt)],
            model="deepseek-chat",
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content
        parsed = json.loads(content) if content else {}
    except Exception as exc:
        return {"ok": False, "score": 0.0, "reason": f"extraction_error:{exc}"}

    relevance = _clamp01(parsed.get("relevanceScore"))
    confidence = _clamp01(parsed.get("confidence"))
    key_findings = parsed.get("keyFindings") or []
    techniques = parsed.get("practicalTakeaways") or []
    study_type = parsed.get("studyType") or "expert_opinion"
    reject_reason = parsed.get("rejectReason")

    if isinstance(key_findings, str):
        key_findings = [key_findings]
    if isinstance(techniques, str):
        techniques = [techniques]

    ok = (
        relevance >= RELEVANCE_THRESHOLD
        and confidence >= CONFIDENCE_THRESHOLD
        and len(key_findings) > 0
        and not reject_reason
    )

    if not ok:
        return {"ok": False, "score": relevance, "reason": reject_reason or "failed_thresholds"}

    return {
        "ok": True,
        "score": relevance,
        "reason": "passed",
        "research": {
            "therapeuticGoalType": goal_type,
            "title": title,
            "authors": authors,
            "year": year,
            "doi": doi,
            "url": url,
            "abstract": abstract,
            "keyFindings": key_findings,
            "therapeuticTechniques": techniques,
            "evidenceLevel": study_type,
            "relevanceScore": relevance,
            "extractionConfidence": confidence,
        },
    }


async def extract_all(state: GenerateTherapyResearchState) -> dict:
    """Extract structured research data per paper via DeepSeek (batched)."""
    if state.get("_error"):
        return {}

    job_id = state.get("jobId")
    if job_id:
        await _update_job_progress(job_id, 85)

    ranked = state.get("_ranked_candidates") or []
    candidates = ranked[:EXTRACT_CANDIDATES_LIMIT]
    if not candidates:
        return {"_extract_results": []}

    clinical = state.get("_clinical") or {}
    plan = state.get("_plan") or {}

    goal_type = plan.get("goalType") or "behavioral_change"
    goal_title = clinical.get("translatedGoalTitle") or state.get("_goal_title", "")
    goal_description = state.get("_goal_description") or ""
    developmental_tier = clinical.get("developmentalTier") or _age_to_tier(state.get("familyMemberAge"))
    patient_age = state.get("familyMemberAge")

    results: list[dict] = []

    async with DeepSeekClient(DeepSeekConfig(timeout=120.0)) as client:
        for i in range(0, len(candidates), EXTRACTION_BATCH_SIZE):
            batch = candidates[i : i + EXTRACTION_BATCH_SIZE]
            batch_num = i // EXTRACTION_BATCH_SIZE + 1
            total = (len(candidates) + EXTRACTION_BATCH_SIZE - 1) // EXTRACTION_BATCH_SIZE
            print(
                f"[generate_therapy_research] Extract batch {batch_num}/{total} "
                f"(candidates {i + 1}-{min(i + EXTRACTION_BATCH_SIZE, len(candidates))})"
            )
            batch_results = await asyncio.gather(
                *[
                    _extract_one_paper(
                        candidate=c,
                        goal_type=goal_type,
                        goal_title=goal_title,
                        goal_description=goal_description,
                        developmental_tier=developmental_tier,
                        patient_age=patient_age,
                        client=client,
                    )
                    for c in batch
                ],
                return_exceptions=True,
            )
            for r in batch_results:
                if isinstance(r, Exception):
                    results.append({"ok": False, "score": 0.0, "reason": f"exc:{r}"})
                else:
                    results.append(r)

    passed = sum(1 for r in results if r.get("ok"))
    print(f"[generate_therapy_research] Extraction: {passed}/{len(results)} passed initial gate")
    return {"_extract_results": results}


# ---------------------------------------------------------------------------
# Node 7 — persist
# ---------------------------------------------------------------------------
async def persist(state: GenerateTherapyResearchState) -> dict:
    """Blended-score gate + upsert to therapy_research, then transition job row."""
    if state.get("_error"):
        job_id = state.get("jobId")
        if job_id:
            await _update_job_failed(job_id, state["_error"])
        return {
            "success": False,
            "count": 0,
            "message": f"Error: {state['_error'].get('message')}",
        }

    job_id = state.get("jobId")
    if job_id:
        await _update_job_progress(job_id, 95)

    clinical = state.get("_clinical") or {}
    results = state.get("_extract_results") or []
    required_keywords = [
        k.lower() for k in (clinical.get("requiredKeywords") or []) if isinstance(k, str) and k
    ]

    def _kw_overlap(research: dict) -> float:
        if not required_keywords:
            return 0.5
        haystack = f"{(research.get('title') or '').lower()} {(research.get('abstract') or '').lower()}"
        hits = sum(1 for kw in required_keywords if kw in haystack)
        return hits / len(required_keywords)

    qualified: list[dict] = []
    for r in results:
        if not r.get("ok") or not r.get("research"):
            continue
        research = r["research"]
        if not research.get("keyFindings"):
            continue
        relevance = research.get("relevanceScore") or 0.0
        confidence = research.get("extractionConfidence") or 0.0
        llm_blended = 0.7 * relevance + 0.3 * confidence
        kw = _kw_overlap(research)
        adjusted = 0.6 * llm_blended + 0.4 * kw if required_keywords else llm_blended
        if adjusted < BLENDED_THRESHOLD:
            continue
        qualified.append({"research": research, "blended": adjusted})

    qualified.sort(key=lambda x: x["blended"], reverse=True)
    top = qualified[:PERSIST_CANDIDATES_LIMIT]
    print(f"[generate_therapy_research] Persisting top {len(top)} papers...")

    plan = state.get("_plan") or {}
    goal_type = plan.get("goalType") or "behavioral_change"

    saved = 0
    failed = 0
    for item in top:
        research = item["research"]
        try:
            await upsert_research_paper(
                therapeutic_goal_type=goal_type,
                title=research.get("title") or "",
                authors=research.get("authors") or [],
                year=research.get("year"),
                doi=research.get("doi"),
                url=research.get("url"),
                abstract=research.get("abstract"),
                key_findings=research.get("keyFindings") or [],
                therapeutic_techniques=research.get("therapeuticTechniques") or [],
                evidence_level=research.get("evidenceLevel"),
                relevance_score=float(research.get("relevanceScore") or 0.0),
                feedback_id=state.get("feedbackId"),
                issue_id=state.get("issueId"),
                goal_id=state.get("goalId"),
                journal_entry_id=None,
            )
            saved += 1
        except Exception as exc:
            failed += 1
            print(f"[generate_therapy_research] persist failed for {research.get('title')!r}: {exc}")

    if saved > 0:
        message = (
            f"Generated {saved} research papers (blended quality score >= "
            f"{BLENDED_THRESHOLD}, ranked by relevance)"
        )
    elif failed > 0:
        message = f"All {failed} persist attempts failed"
    else:
        message = "No papers met minimum quality thresholds"

    # Transition job row
    if job_id:
        if saved == 0:
            await _update_job_failed(
                job_id,
                {"message": message, "code": "NO_PAPERS_SAVED" if failed == 0 else "PERSIST_FAILED"},
            )
        else:
            await _update_job_succeeded(job_id, {"count": saved, "output": message})

    return {
        "success": saved > 0 or failed == 0,
        "count": saved,
        "message": message,
    }


# ---------------------------------------------------------------------------
# Node 8 — evals (best-effort; appends to job row result)
# ---------------------------------------------------------------------------
async def evals(state: GenerateTherapyResearchState) -> dict:
    """Best-effort eval pass against persisted papers — mirrors graph.py style."""
    if state.get("_error") or not state.get("count"):
        return {}
    job_id = state.get("jobId")
    if not job_id:
        return {}

    # Identify which id column to filter by
    if state.get("issueId"):
        col, val = "issue_id", state["issueId"]
    elif state.get("feedbackId"):
        col, val = "feedback_id", state["feedbackId"]
    elif state.get("goalId"):
        col, val = "goal_id", state["goalId"]
    else:
        return {}

    if col not in _ALLOWED_EVAL_COLS:
        raise ValueError(f"invalid filter column: {col!r}")
    eval_query = sql.SQL(
        "SELECT title, abstract, key_findings, therapeutic_techniques, evidence_level "
        "FROM therapy_research WHERE {col} = %s "
        "ORDER BY relevance_score DESC LIMIT 10"
    ).format(col=sql.Identifier(col))

    try:
        async with neon.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(eval_query, (val,))
                rows = await cur.fetchall()
    except Exception as exc:
        print(f"[generate_therapy_research] eval query failed: {exc}")
        return {}

    if not rows:
        return {}

    evidence_quality = sum(
        EVIDENCE_WEIGHTS.get(r[4] or "", 0.3) for r in rows
    ) / len(rows)

    papers_text = "\n\n".join(
        f"[{i + 1}] {row[0]}\nAbstract: {(row[1] or '')[:200]}\n"
        f"Key findings: {'; '.join(_parse_json_field(row[2])[:3])}\n"
        f"Techniques: {'; '.join(_parse_json_field(row[3])[:3])}"
        for i, row in enumerate(rows)
    )

    clinical = state.get("_clinical") or {}
    context_str = (
        clinical.get("clinicalRestatement")
        or clinical.get("translatedGoalTitle")
        or state.get("_goal_title", "")
    )[:800]

    eval_prompt = (
        "You are evaluating research papers curated for a therapy case.\n\n"
        "## Clinical Context\n"
        f"{context_str}\n\n"
        f"## Papers Found ({len(rows)})\n"
        f"{papers_text}\n\n"
        'Return JSON: {"relevance": 0-1, "actionability": 0-1, "rationale": "..."}\n'
        "- relevance: how well papers match the clinical topic\n"
        "- actionability: how actionable the techniques are for a practicing therapist\n"
        "- rationale: brief 2-3 sentence summary"
    )

    parsed = await _deepseek_json(eval_prompt, max_tokens=512) or {}
    relevance = _clamp01(parsed.get("relevance"))
    actionability = _clamp01(parsed.get("actionability"))
    rationale = parsed.get("rationale") or ""

    overall = (relevance + actionability + evidence_quality) / 3
    out = {
        "relevance": _round2(relevance),
        "actionability": _round2(actionability),
        "evidenceQuality": _round2(evidence_quality),
        "overall": _round2(overall),
        "rationale": rationale,
        "paperCount": len(rows),
    }

    try:
        await _update_job_succeeded(
            job_id,
            {
                "count": state.get("count", 0),
                "output": state.get("message", ""),
                "evals": out,
            },
        )
    except Exception as exc:
        print(f"[generate_therapy_research] eval result write failed: {exc}")

    return {"_evals": out}


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------
# RetryPolicy for the high-value external-API nodes. `search` fans out to
# OpenAlex / Crossref / Semantic Scholar / PubMed and is by far the most
# failure-prone step (rate limits, network blips). `extract_all` and the LLM
# planning steps go to DeepSeek and benefit from a softer retry envelope.
_SEARCH_RETRY = RetryPolicy(max_attempts=3, initial_interval=1.0, backoff_factor=2.0)
_LLM_RETRY = RetryPolicy(max_attempts=2, initial_interval=1.0, backoff_factor=2.0)


def create_generate_therapy_research_graph(checkpointer=None):
    """Build the multi-step therapy research pipeline graph."""
    builder = StateGraph(GenerateTherapyResearchState)
    builder.add_node("load_context", load_context)
    builder.add_node("normalize_goal", normalize_goal, retry=_LLM_RETRY)
    builder.add_node("plan_query", plan_query, retry=_LLM_RETRY)
    builder.add_node("search", search, retry=_SEARCH_RETRY)
    builder.add_node("rerank", rerank_candidates)
    builder.add_node("extract_all", extract_all, retry=_LLM_RETRY)
    builder.add_node("persist", persist)
    builder.add_node("evals", evals, retry=_LLM_RETRY)

    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "normalize_goal")
    builder.add_edge("normalize_goal", "plan_query")
    builder.add_edge("plan_query", "search")
    builder.add_edge("search", "rerank")
    builder.add_edge("rerank", "extract_all")
    builder.add_edge("extract_all", "persist")
    builder.add_edge("persist", "evals")
    builder.add_edge("evals", END)
    return builder.compile(checkpointer=checkpointer) if checkpointer else builder.compile()


# Module-level graph instance for LangGraph server (eager, no checkpointer).
graph = create_generate_therapy_research_graph()

from .checkpointer import make_lazy_compiler  # noqa: E402

get_graph = make_lazy_compiler(create_generate_therapy_research_graph, graph)

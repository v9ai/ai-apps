"""Node: extract_candidates — Batch DeepSeek extraction + scoring."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from db.d1_client import update_generation_job
from llm import chat_completion
from prompts.extractor import EXTRACT_RESEARCH_PROMPT
from sources.utils import normalize_doi, strip_jats
from graph.state import ResearchState

EXTRACT_CANDIDATES_LIMIT = 25
EXTRACTION_BATCH_SIZE = 6
RELEVANCE_THRESHOLD = 0.75
CONFIDENCE_THRESHOLD = 0.55
# Relaxed thresholds for feedback-based research (broader context)
FEEDBACK_RELEVANCE_THRESHOLD = 0.50
FEEDBACK_CONFIDENCE_THRESHOLD = 0.40


async def _fetch_paper_details(candidate: dict) -> dict:
    """Resolve paper details — uses enriched data when available."""
    enriched = candidate
    if enriched.get("_enrichedAbstract"):
        return {
            **candidate,
            "abstract": enriched["_enrichedAbstract"],
            "year": candidate.get("year") or enriched.get("_enrichedYear"),
            "journal": candidate.get("journal") or enriched.get("_enrichedVenue"),
            "authors": candidate.get("authors") or enriched.get("_enrichedAuthors") or [],
            "doi": normalize_doi(candidate.get("doi")),
        }
    return {
        **candidate,
        "abstract": strip_jats(candidate.get("abstract")) or "Abstract not available",
        "authors": candidate.get("authors") or [],
        "doi": normalize_doi(candidate.get("doi")),
    }


async def _extract_one_paper(
    api_key: str,
    candidate: dict,
    goal_type: str,
    goal_title: str,
    goal_description: str,
    relevance_threshold: float = RELEVANCE_THRESHOLD,
    confidence_threshold: float = CONFIDENCE_THRESHOLD,
) -> dict:
    """Extract and score a single paper."""
    try:
        paper = await _fetch_paper_details(candidate)

        prompt = EXTRACT_RESEARCH_PROMPT.format(
            goal_title=goal_title,
            goal_description=goal_description,
            goal_type=goal_type,
            paper_title=paper.get("title", ""),
            paper_authors=", ".join(paper.get("authors") or []) or "Unknown",
            paper_year=paper.get("year") or "Unknown",
            paper_journal=paper.get("journal") or "Unknown",
            paper_doi=paper.get("doi") or "None",
            paper_abstract=paper.get("abstract") or "",
        )

        content = await chat_completion(
            api_key,
            [{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )

        extracted = json.loads(content)

        relevance = float(extracted.get("relevanceScore", 0))
        confidence = float(extracted.get("extractionConfidence", 0))
        key_findings = extracted.get("keyFindings") or []

        ok = (
            relevance >= relevance_threshold
            and confidence >= confidence_threshold
            and len(key_findings) > 0
        )

        research = None
        if ok:
            research = {
                "therapeuticGoalType": goal_type,
                "title": extracted.get("title") or paper.get("title", ""),
                "authors": extracted.get("authors") or paper.get("authors", []),
                "year": extracted.get("year") or paper.get("year"),
                "journal": extracted.get("journal") or paper.get("journal"),
                "doi": extracted.get("doi") or paper.get("doi"),
                "url": extracted.get("url") or paper.get("url"),
                "abstract": paper.get("abstract"),
                "keyFindings": key_findings,
                "therapeuticTechniques": extracted.get("therapeuticTechniques", []),
                "evidenceLevel": extracted.get("evidenceLevel"),
                "relevanceScore": relevance,
                "extractedBy": "langgraph:deepseek:v1",
                "extractionConfidence": confidence,
            }

        return {
            "ok": ok,
            "score": relevance,
            "research": research,
            "reason": "passed" if ok else (extracted.get("rejectReason") or "failed_thresholds"),
        }
    except Exception:
        return {"ok": False, "score": 0, "research": None, "reason": "extraction_error"}


def make_extract_candidates(settings: dict):
    async def extract_candidates(state: ResearchState) -> dict[str, Any]:
        job_id = state.get("job_id")
        if job_id:
            try:
                await update_generation_job(settings, job_id, progress=85)
            except Exception:
                pass

        goal = state["goal"]
        goal_type = state.get("goal_type", "behavioral_change")
        goal_title = state.get("translated_goal_title") or goal["title"]
        goal_description = goal.get("description") or ""

        # Feedback-based research uses relaxed thresholds
        is_feedback = state.get("feedback_id") is not None and state.get("goal_id") is None
        rel_thresh = FEEDBACK_RELEVANCE_THRESHOLD if is_feedback else RELEVANCE_THRESHOLD
        conf_thresh = FEEDBACK_CONFIDENCE_THRESHOLD if is_feedback else CONFIDENCE_THRESHOLD

        candidates = state.get("candidates", [])[:EXTRACT_CANDIDATES_LIMIT]

        api_key = settings["deepseek_api_key"]

        results: list[dict] = []
        for i in range(0, len(candidates), EXTRACTION_BATCH_SIZE):
            batch = candidates[i : i + EXTRACTION_BATCH_SIZE]
            batch_results = await asyncio.gather(
                *[
                    _extract_one_paper(
                        api_key, c, goal_type, goal_title, goal_description,
                        relevance_threshold=rel_thresh,
                        confidence_threshold=conf_thresh,
                    )
                    for c in batch
                ]
            )
            results.extend(batch_results)

        extracted_count = sum(1 for r in results if r.get("ok"))
        diagnostics = state.get("diagnostics") or {}
        diagnostics["extractedCount"] = extracted_count

        return {"extraction_results": results, "diagnostics": diagnostics}

    return extract_candidates

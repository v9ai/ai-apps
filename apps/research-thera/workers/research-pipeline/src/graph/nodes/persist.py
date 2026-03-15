"""Node: persist — Quality gating + D1 upsert."""

from __future__ import annotations

import json
from typing import Any

from db.d1_client import batch_upsert_therapy_research, update_generation_job
from graph.state import ResearchState

PERSIST_CANDIDATES_LIMIT = 20
BLENDED_THRESHOLD = 0.72
FEEDBACK_BLENDED_THRESHOLD = 0.45


def make_persist(settings: dict):
    async def persist(state: ResearchState) -> dict[str, Any]:
        job_id = state.get("job_id")
        if job_id:
            try:
                await update_generation_job(settings, job_id, progress=95)
            except Exception:
                pass

        results = state.get("extraction_results", [])
        required_keywords = [k.lower() for k in (state.get("required_keywords") or [])]

        # Feedback-based research uses relaxed threshold
        is_feedback = state.get("feedback_id") is not None and state.get("goal_id") is None
        threshold = FEEDBACK_BLENDED_THRESHOLD if is_feedback else BLENDED_THRESHOLD

        def keyword_overlap_score(research: dict) -> float:
            if not required_keywords:
                return 0.5
            haystack = f"{research.get('title', '')} {research.get('abstract', '')}".lower()
            hits = sum(1 for kw in required_keywords if kw in haystack)
            return hits / len(required_keywords)

        # Stage 1: filter
        qualified = []
        for r in results:
            if not r.get("ok") or not r.get("research"):
                continue
            res = r["research"]
            if not (res.get("keyFindings") or []):
                continue
            if r.get("rejectReason") or res.get("rejectReason"):
                continue

            relevance = res.get("relevanceScore", 0)
            confidence = res.get("extractionConfidence", 0)
            llm_blended = 0.7 * relevance + 0.3 * confidence
            kw_overlap = keyword_overlap_score(res)

            adjusted = (
                0.6 * llm_blended + 0.4 * kw_overlap
                if required_keywords
                else llm_blended
            )

            if adjusted >= threshold:
                qualified.append({
                    **r,
                    "blended": adjusted,
                    "llm_blended": llm_blended,
                    "kw_overlap": kw_overlap,
                })

        qualified.sort(key=lambda x: x["blended"], reverse=True)
        top = qualified[:PERSIST_CANDIDATES_LIMIT]

        papers_to_persist = [
            {
                **r["research"],
                "characteristicId": state.get("characteristic_id"),
                "feedbackId": state.get("feedback_id"),
            }
            for r in top
        ]

        errors = 0
        try:
            count = await batch_upsert_therapy_research(
                settings,
                state.get("goal_id"),
                state["user_id"],
                papers_to_persist,
            )
        except Exception:
            count = 0
            errors = len(papers_to_persist)

        if count > 0:
            message = (
                f"Generated {count} research papers "
                f"(blended quality score >= {threshold}, ranked by relevance)"
            )
        elif errors > 0:
            message = f"All {errors} persist attempts failed"
        else:
            message = "No papers met minimum quality thresholds"

        diagnostics = state.get("diagnostics") or {}
        diagnostics["qualifiedCount"] = len(qualified)
        diagnostics["persistedCount"] = count

        return {
            "persisted_count": count,
            "success": count > 0 or errors == 0,
            "message": message,
            "diagnostics": diagnostics,
        }

    return persist

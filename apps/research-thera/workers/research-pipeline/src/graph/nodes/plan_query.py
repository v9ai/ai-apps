"""Node: plan_query — DeepSeek multi-source query planning."""

from __future__ import annotations

import json
from typing import Any

from db.d1_client import update_generation_job
from llm import chat_completion
from prompts.planner import PLAN_QUERY_PROMPT
from graph.state import ResearchState


def make_plan_query(settings: dict):
    async def plan_query(state: ResearchState) -> dict[str, Any]:
        job_id = state.get("job_id")
        if job_id:
            try:
                await update_generation_job(settings, job_id, progress=20)
            except Exception:
                pass

        title = state.get("translated_goal_title") or state["goal"]["title"]
        description = state["goal"].get("description") or ""

        notes_parts = [n["content"] for n in state.get("notes", []) if n.get("content")]

        # Include feedback and extracted issues for better query targeting
        feedback = state.get("feedback_content")
        if feedback:
            notes_parts.append(f"Teacher/Professional Feedback: {feedback}")

        issues = state.get("extracted_issues") or []
        for issue in issues:
            sev = issue.get("severity", "")
            notes_parts.append(
                f"Extracted issue [{sev}]: {issue.get('title', '')} — "
                f"{issue.get('description', '')}"
            )

        notes_str = "\n- ".join(notes_parts)

        prompt = PLAN_QUERY_PROMPT.format(
            title=title,
            description=description,
            notes=notes_str or "(none)",
        )

        content = await chat_completion(
            settings["deepseek_api_key"],
            [{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=1.5,
        )

        raw = json.loads(content)

        return {
            "goal_type": raw.get("goalType")
            or raw.get("therapeuticGoalType", "behavioral_change"),
            "keywords": raw.get("keywords", []),
            "semantic_scholar_queries": raw.get("semanticScholarQueries", []),
            "crossref_queries": raw.get("crossrefQueries", []),
            "pubmed_queries": raw.get("pubmedQueries", []),
            "inclusion": raw.get("inclusion", []),
            "exclusion": raw.get("exclusion", []),
        }

    return plan_query

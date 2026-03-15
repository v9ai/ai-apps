"""Node: normalize_goal — DeepSeek clinical classification."""

from __future__ import annotations

import json
from typing import Any

from db.d1_client import update_generation_job
from llm import chat_completion
from prompts.normalizer import NORMALIZE_GOAL_PROMPT
from graph.state import ResearchState


def _age_to_tier(age: int | None) -> str:
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


def make_normalize_goal(settings: dict):
    async def normalize_goal(state: ResearchState) -> dict[str, Any]:
        job_id = state.get("job_id")
        if job_id:
            try:
                await update_generation_job(settings, job_id, progress=10)
            except Exception:
                pass

        goal = state["goal"]
        fallback = {
            "translated_goal_title": goal["title"],
            "original_language": "unknown",
            "clinical_restatement": goal["title"],
            "clinical_domain": "behavioral_change",
            "behavior_direction": "UNCLEAR",
            "developmental_tier": _age_to_tier(state.get("family_member_age")),
            "required_keywords": [],
            "excluded_topics": [],
        }

        try:
            age_ctx = (
                f"The patient is {state['family_member_age']} years old."
                if state.get("family_member_age")
                else ""
            )
            name_ctx = (
                f"Patient name: {state['family_member_name']}."
                if state.get("family_member_name")
                else ""
            )
            notes_parts = [
                n["content"] for n in state.get("notes", []) if n.get("content")
            ]

            # Incorporate feedback and extracted issues into context
            feedback = state.get("feedback_content")
            if feedback:
                notes_parts.append(f"Teacher/Professional Feedback:\n{feedback}")

            issues = state.get("extracted_issues") or []
            if issues:
                issues_text = "\n".join(
                    f"- [{i.get('severity', '?').upper()}] {i.get('title', '')}: "
                    f"{i.get('description', '')}"
                    for i in issues
                )
                notes_parts.append(
                    f"Extracted Issues from Feedback:\n{issues_text}"
                )

            notes_ctx = "; ".join(notes_parts) if notes_parts else "(none)"

            prompt = NORMALIZE_GOAL_PROMPT.format(
                goal_title=goal["title"],
                goal_description=goal.get("description") or "",
                notes=notes_ctx,
                age_ctx=age_ctx,
                name_ctx=name_ctx,
            )

            content = await chat_completion(
                settings["deepseek_api_key"],
                [{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )

            raw = json.loads(content)

            return {
                "translated_goal_title": raw.get("translatedGoalTitle", goal["title"]),
                "original_language": raw.get("originalLanguage", "unknown"),
                "clinical_restatement": raw.get("clinicalRestatement", goal["title"]),
                "clinical_domain": raw.get("clinicalDomain", "behavioral_change"),
                "behavior_direction": raw.get("behaviorDirection", "UNCLEAR"),
                "developmental_tier": raw.get(
                    "developmentalTier",
                    _age_to_tier(state.get("family_member_age")),
                ),
                "required_keywords": raw.get("requiredKeywords", []),
                "excluded_topics": raw.get("excludedTopics", []),
            }
        except Exception:
            return fallback

    return normalize_goal

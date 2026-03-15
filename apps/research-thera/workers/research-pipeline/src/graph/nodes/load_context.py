"""Node: load_context — Load goal, notes, family member, and feedback from D1."""

from __future__ import annotations

from typing import Any

from db.d1_client import (
    get_all_contact_feedbacks_for_family_member,
    get_contact_feedback,
    get_family_member,
    get_goal,
    list_notes_for_entity,
    update_generation_job,
)
from graph.state import ResearchState


def make_load_context(settings: dict):
    async def load_context(state: ResearchState) -> dict[str, Any]:
        s = settings
        job_id = state.get("job_id")
        if job_id:
            try:
                await update_generation_job(s, job_id, progress=5)
            except Exception:
                pass

        goal_id = state.get("goal_id")
        feedback_id = state.get("feedback_id")

        family_member_name: str | None = None
        family_member_age: int | None = None
        feedback_content: str | None = None
        extracted_issues: list[dict] = []

        # When goal_id is provided, load goal context (original path)
        if goal_id:
            goal = await get_goal(s, goal_id, state["user_id"])
            notes = await list_notes_for_entity(
                s, goal_id, "Goal", state["user_id"]
            )

            fm_id = goal.get("family_member_id")
            if fm_id:
                try:
                    fm = await get_family_member(s, fm_id)
                    if fm:
                        family_member_name = fm.get("first_name") or fm.get("name")
                        family_member_age = fm.get("age_years")
                except Exception:
                    pass

            # Load feedback context — either a specific feedback or all for the family member
            if feedback_id:
                try:
                    fb = await get_contact_feedback(s, feedback_id, state["user_id"])
                    if fb:
                        feedback_content = fb.get("content")
                        extracted_issues = fb.get("extracted_issues") or []
                except Exception:
                    pass
            elif fm_id:
                try:
                    all_fb = await get_all_contact_feedbacks_for_family_member(
                        s, fm_id, state["user_id"]
                    )
                    if all_fb:
                        parts = []
                        all_issues = []
                        for fb in all_fb:
                            content = fb.get("content", "").strip()
                            if content:
                                subject = fb.get("subject")
                                prefix = f"[{subject}] " if subject else ""
                                parts.append(f"{prefix}{content}")
                            all_issues.extend(fb.get("extracted_issues") or [])
                        if parts:
                            feedback_content = "\n\n---\n\n".join(parts)
                        extracted_issues = all_issues
                except Exception:
                    pass

            return {
                "goal": goal,
                "notes": notes,
                "family_member_name": family_member_name,
                "family_member_age": family_member_age,
                "feedback_content": feedback_content,
                "extracted_issues": extracted_issues,
            }

        # Feedback-based research: no goal_id, build synthetic goal from feedback
        if feedback_id:
            fb = await get_contact_feedback(s, feedback_id, state["user_id"])
            if not fb:
                raise ValueError(f"Feedback {feedback_id} not found")

            issues = fb.get("extracted_issues") or []
            issues_titles = "; ".join(i.get("title", "") for i in issues if i.get("title"))
            title = issues_titles or fb.get("subject") or "Feedback-based research"
            description = fb.get("content", "")

            # Try to load family member context from the feedback's family_member_id
            fb_fm_id = fb.get("family_member_id")
            if fb_fm_id:
                try:
                    fm = await get_family_member(s, fb_fm_id)
                    if fm:
                        family_member_name = fm.get("first_name") or fm.get("name")
                        family_member_age = fm.get("age_years")
                except Exception:
                    pass

            return {
                "goal": {
                    "id": feedback_id,
                    "family_member_id": fb_fm_id,
                    "title": title,
                    "description": description,
                },
                "notes": [{"id": feedback_id, "content": description}],
                "family_member_name": family_member_name,
                "family_member_age": family_member_age,
                "feedback_content": fb.get("content"),
                "extracted_issues": issues,
            }

        raise ValueError("Either goal_id or feedback_id must be provided")

    return load_context

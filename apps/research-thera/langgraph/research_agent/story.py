"""Story generation workflow — port of run_story_generation() in research_agent.rs."""
from __future__ import annotations

import json
import os
from typing import Optional

from openai import AsyncOpenAI

from .d1 import D1Client, FeedbackTarget, parse_path
from .therapy_context import IssueData, StoryContext, THERAPEUTIC_AUDIO_SYSTEM_PROMPT


async def run_story_generation(
    path: str,
    language: str = "Romanian",
    minutes: int = 10,
) -> tuple[str, int]:
    """Generate a therapeutic story from D1 feedback + research papers.

    Returns (story_text, story_id).
    """
    target = parse_path(path)
    if not isinstance(target, FeedbackTarget):
        raise ValueError(f"Story generation requires a feedback URL path, got: {path}")

    feedback_id = target.feedback_id
    d1 = D1Client.from_env()
    try:
        # 1. Load feedback
        feedback = await d1.fetch_contact_feedback(feedback_id)

        # 2. Load extracted issues (non-fatal if missing)
        try:
            raw_issues = await d1.fetch_issues_for_feedback(feedback_id)
        except Exception:
            raw_issues = []

        issues = [
            IssueData(
                title=i.title,
                description=i.description,
                category=i.category,
                severity=i.severity,
                recommendations=json.loads(i.recommendations or "[]") if i.recommendations else [],
            )
            for i in raw_issues
        ]

        # 3. Load family member
        family_member = await d1.fetch_family_member(feedback.family_member_id)

        # 4. Load research papers
        try:
            goal_id: Optional[int] = await d1.fetch_first_goal_id(feedback.family_member_id)
        except Exception:
            goal_id = None
        papers = await d1.fetch_research_papers(feedback_id=feedback_id, goal_id=goal_id)

        # 5. Format research summary
        summary_parts = []
        for i, paper in enumerate(papers):
            findings: list[str] = json.loads(paper.key_findings or "[]") if paper.key_findings else []
            techniques: list[str] = (
                json.loads(paper.therapeutic_techniques or "[]")
                if paper.therapeutic_techniques
                else []
            )
            year_str = str(paper.year) if paper.year else "n.d."
            summary_parts.append(
                f'{i + 1}. "{paper.title}" ({year_str})\n'
                f"   Key findings: {'; '.join(findings)}\n"
                f"   Therapeutic techniques: {'; '.join(techniques)}"
            )
        research_summary = "\n\n".join(summary_parts)

        # 6. Build story context and prompt
        story_ctx = StoryContext(
            person_name=family_member.first_name,
            age_years=family_member.age_years,
            feedback_subject=feedback.subject,
            feedback_content=feedback.content,
            issues=issues,
            research_summary=research_summary,
            language=language,
            minutes=minutes,
        )
        user_prompt = story_ctx.build_story_prompt()

        # 7. Call DeepSeek Chat
        api_key = os.environ["DEEPSEEK_API_KEY"]
        client = AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com/v1")
        resp = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": THERAPEUTIC_AUDIO_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=8192,
        )
        story_text = (resp.choices[0].message.content or "").strip()
        if not story_text:
            raise ValueError("DeepSeek returned empty story text")

        # 8. Save to D1
        story_id = await d1.insert_goal_story(
            goal_id, None, feedback_id, language, minutes, story_text
        )
        return story_text, story_id
    finally:
        await d1.aclose()

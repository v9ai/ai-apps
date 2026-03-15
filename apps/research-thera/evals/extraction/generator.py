"""Qwen issue extraction generator with fixture caching.

Calls the same Qwen prompt used by the extractContactFeedbackIssues resolver
and returns the extracted issues JSON for evaluation.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
import os

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)

_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")
_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
_MODEL = "qwen-plus"

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

# ---------------------------------------------------------------------------
# System prompt — verbatim from extractContactFeedbackIssues resolver
# ---------------------------------------------------------------------------

EXTRACTION_SYSTEM_PROMPT = """You are an expert educational psychologist and child development specialist. Analyze the following feedback about a child and extract specific issues, concerns, or areas that need attention.

CRITICAL: You MUST write ALL text fields (title, description) in the SAME LANGUAGE as the original feedback. If the feedback is in Romanian, write in Romanian. If in English, write in English. Match the language exactly.

For each issue, provide:
- title: A short descriptive title (in the same language as the feedback)
- description: A detailed explanation of the issue based ONLY on what is explicitly stated in the feedback. Describe observed behaviors, not interpretations. Do NOT introduce diagnostic labels, clinical terminology, or disorder names unless they appear in the original feedback. (in the same language as the feedback)
- category: MUST be exactly one of these values: academic, behavioral, social, emotional, developmental, health, communication, other. No other values are allowed. Use "health" for physical/motor issues. (keep category values in English)
- severity: MUST be exactly one of: low, medium, high. Use "high" for issues significantly impacting daily functioning. (keep severity values in English)

Important:
- Use objective, non-judgmental language throughout
- Distinguish between what was observed and any interpretation
- Do NOT diagnose or imply diagnoses
- Keep descriptions grounded in the feedback text
- ALL human-readable text MUST be in the same language as the original feedback
- Do NOT include recommendations

Return ONLY a JSON array of issues. No markdown, no explanation, just the JSON array.

Example:
[
  {
    "title": "Difficulty with reading comprehension",
    "description": "The child struggles to understand and retain information from texts, particularly narrative passages.",
    "category": "academic",
    "severity": "medium"
  }
]"""

VALID_CATEGORIES = {
    "academic", "behavioral", "social", "emotional",
    "developmental", "health", "communication", "other",
}
VALID_SEVERITIES = {"low", "medium", "high"}
REQUIRED_FIELDS = {"title", "description", "category", "severity"}

# ---------------------------------------------------------------------------
# Test cases — realistic teacher/contact feedback scenarios
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "id": "academic-math-focus",
        "subject": "Mathematics",
        "source": "MEETING",
        "feedback_date": "2026-03-01",
        "content": (
            "During our parent-teacher conference, we discussed Bogdan's performance in mathematics. "
            "He has significant difficulty focusing during math lessons and is frequently distracted by "
            "peers sitting nearby. He struggles particularly with multiplication tables and often cannot "
            "recall basic facts quickly enough for timed exercises. When asked to work independently on "
            "word problems, he shows visible frustration — sighing, putting his head down, and sometimes "
            "refusing to attempt the problems. However, he participates enthusiastically during group "
            "activities and often helps other students understand concepts verbally, suggesting the "
            "underlying comprehension may be stronger than his written performance indicates."
        ),
        "expected_issue_count_min": 2,
        "expected_categories": ["academic", "emotional"],
    },
    {
        "id": "behavioral-social-playground",
        "subject": "Behavior Report",
        "source": "REPORT",
        "feedback_date": "2026-02-15",
        "content": (
            "This term we have observed recurring issues with Lizi's behavior during unstructured time. "
            "At recess, she has difficulty joining group games and often stands alone near the fence. "
            "When other children invite her to play, she sometimes responds by pushing them or walking "
            "away without speaking. There have been three incidents this month where she hit a classmate "
            "during disputes over toys or turn-taking. She has difficulty reading social cues — for "
            "example, she doesn't notice when other children are upset or when she has said something "
            "hurtful. In structured classroom activities, her behavior is much better and she follows "
            "instructions well. She seems anxious during transitions between activities."
        ),
        "expected_issue_count_min": 3,
        "expected_categories": ["social", "behavioral"],
    },
    {
        "id": "emotional-separation-anxiety",
        "subject": None,
        "source": None,
        "feedback_date": "2026-01-20",
        "content": (
            "Emma has been having a very hard time at morning drop-off for the past three weeks. "
            "She cries intensely when her mother leaves, clinging to her legs and screaming. The "
            "episodes last 20-30 minutes and she is inconsolable during this time. After she calms "
            "down, she participates normally in class activities and seems happy. However, she "
            "frequently asks teachers 'when is mommy coming?' throughout the day, sometimes 10+ times. "
            "She has started having nightmares about school and complains of stomach aches on school "
            "mornings. At home, her mother reports she has become very clingy and refuses to sleep "
            "alone, which is a regression from previous independence."
        ),
        "expected_issue_count_min": 2,
        "expected_categories": ["emotional"],
    },
    {
        "id": "communication-speech-delay",
        "subject": "Speech and Language",
        "source": "EMAIL",
        "feedback_date": "2026-03-10",
        "content": (
            "I wanted to flag some observations about Max's language development. At age 4, he uses "
            "primarily 2-word phrases ('want juice', 'go outside') while his peers are forming full "
            "sentences of 5-6 words. He has difficulty being understood by adults outside the family — "
            "I estimate about 50% of his speech is intelligible to me compared to the expected 90%+ "
            "at this age. He frequently substitutes sounds (saying 'tat' for 'cat', 'wun' for 'run'). "
            "He follows simple one-step instructions but gets confused with two-step directions like "
            "'put the book away and then sit down'. He compensates well with gestures and pointing "
            "and seems cognitively on track in non-verbal activities like puzzles and building."
        ),
        "expected_issue_count_min": 2,
        "expected_categories": ["communication"],
    },
    {
        "id": "multi-domain-complex",
        "subject": "Term Report",
        "source": "REPORT",
        "feedback_date": "2026-02-28",
        "content": (
            "End of term summary for Sofia (age 7, Year 2): "
            "Academics — Reading is below grade level; she reads at a Year 1 level and avoids reading "
            "tasks. Writing is disorganized with frequent letter reversals (b/d, p/q). Math is a "
            "relative strength. "
            "Social — She has one close friend but struggles in larger groups. She becomes overwhelmed "
            "at birthday parties and assemblies, covering her ears and asking to leave. "
            "Emotional — She has low self-esteem regarding academic work, frequently saying 'I'm stupid' "
            "and 'I can't do it'. She cries easily when corrected. "
            "Physical — She has an awkward pencil grip despite OT exercises last year. She tires easily "
            "during PE and avoids running activities. "
            "General — Sofia is a kind and creative child who excels in art and music. She needs "
            "significant support across multiple areas."
        ),
        "expected_issue_count_min": 4,
        "expected_categories": ["academic", "social", "emotional"],
    },
]


# ---------------------------------------------------------------------------
# Prompt builder — mirrors the resolver's user prompt construction
# ---------------------------------------------------------------------------


def build_user_prompt(case_data: dict) -> str:
    parts = ["Analyze this feedback and extract all issues:\n"]
    if case_data.get("subject"):
        parts.append(f"Subject: {case_data['subject']}")
    if case_data.get("source"):
        parts.append(f"Source: {case_data['source']}")
    parts.append(f"Date: {case_data['feedback_date']}")
    parts.append(f"\nContent:\n{case_data['content']}")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Generator with fixture caching
# ---------------------------------------------------------------------------


def extract_issues(case_data: dict, force_regen: bool = False) -> list[dict]:
    """Call Qwen to extract issues (or load from fixture cache)."""
    case_id = case_data["id"]
    fixture_path = FIXTURES_DIR / f"{case_id}.json"

    if fixture_path.exists() and not force_regen:
        data = json.loads(fixture_path.read_text(encoding="utf-8"))
        return data["issues"]

    import httpx

    user_prompt = build_user_prompt(case_data)

    response = httpx.post(
        f"{_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": _MODEL,
            "messages": [
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "max_completion_tokens": 4096,
            "temperature": 0.2,
        },
        timeout=60,
    )
    response.raise_for_status()

    content = response.json()["choices"][0]["message"]["content"]

    # Strip markdown fences if present
    cleaned = re.sub(r"```(?:json)?\s*", "", content)
    cleaned = re.sub(r"```\s*", "", cleaned).strip()
    issues = json.loads(cleaned)

    if not isinstance(issues, list):
        raise ValueError(f"Expected array from Qwen, got {type(issues).__name__}")

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(
            {
                "id": case_id,
                "user_prompt": user_prompt,
                "issues": issues,
                "model": _MODEL,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return issues

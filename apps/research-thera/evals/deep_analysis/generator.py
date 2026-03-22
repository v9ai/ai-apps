"""Deep analysis generator with synthetic test data and fixture caching.

Produces structured deep analysis JSON via DeepSeek, using synthetic family
member profiles with known DOB/age to validate age consistency in output.
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)

_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
_BASE_URL = "https://api.deepseek.com"
_MODEL = "deepseek-chat"

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

# ---------------------------------------------------------------------------
# Synthetic test cases — family member profiles with known ages
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "id": "preschooler-behavioral",
        "family_member_name": "Emilia",
        "family_member_age": 4,
        "date_of_birth_year": 2022,
        "relationship": "daughter",
        "trigger_issue_id": 101,
        "issues": [
            {
                "id": 101,
                "title": "Tantrums during transitions",
                "category": "behavioral",
                "severity": "high",
                "description": "Intense crying and floor-dropping when asked to stop playing and get ready for meals or bed.",
            },
            {
                "id": 102,
                "title": "Difficulty sharing with peers",
                "category": "social",
                "severity": "medium",
                "description": "Grabs toys from peers at daycare, has not developed turn-taking skills.",
            },
        ],
        "observations": [
            "2026-03-10: tantrum, freq=daily, intensity=high, Context: transition from play to dinner",
            "2026-03-08: sharing refusal, freq=3x/week, Context: daycare free play",
        ],
        "teacher_feedback": (
            "Emilia struggles with transitions between activities. She cries loudly when asked to "
            "clean up toys. She plays alongside peers but does not share or take turns. "
            "She has started biting when frustrated."
        ),
    },
    {
        "id": "school-age-anxiety",
        "family_member_name": "David",
        "family_member_age": 9,
        "date_of_birth_year": 2017,
        "relationship": "son",
        "trigger_issue_id": 201,
        "issues": [
            {
                "id": 201,
                "title": "School refusal",
                "category": "emotional",
                "severity": "high",
                "description": "Refuses to go to school 2-3 days per week, complains of stomachaches.",
            },
            {
                "id": 202,
                "title": "Separation anxiety at bedtime",
                "category": "emotional",
                "severity": "medium",
                "description": "Cannot fall asleep without parent in room, wakes up crying at night.",
            },
        ],
        "observations": [
            "2026-03-12: school refusal, freq=2-3x/week, intensity=high, Context: Monday mornings worst",
            "2026-03-11: bedtime anxiety, freq=nightly, intensity=medium, Context: parent leaves room",
        ],
        "teacher_feedback": (
            "David is a bright student but has been absent frequently. When he does attend, "
            "he is clingy with the teacher and avoids group work. He asks to call his mother "
            "multiple times per day."
        ),
    },
    {
        "id": "adolescent-mood",
        "family_member_name": "Sofia",
        "family_member_age": 15,
        "date_of_birth_year": 2011,
        "relationship": "daughter",
        "trigger_issue_id": 301,
        "issues": [
            {
                "id": 301,
                "title": "Social withdrawal",
                "category": "social",
                "severity": "high",
                "description": "Stopped seeing friends, spends all time in room, quit volleyball team.",
            },
            {
                "id": 302,
                "title": "Academic performance decline",
                "category": "academic",
                "severity": "medium",
                "description": "Grades dropped from A/B to C/D over one semester, missing assignments.",
            },
            {
                "id": 303,
                "title": "Sleep pattern disruption",
                "category": "health",
                "severity": "medium",
                "description": "Staying up until 3am, sleeping until noon on weekends, exhausted on school days.",
            },
        ],
        "observations": [
            "2026-03-15: social withdrawal, freq=daily, intensity=high, Context: declined all friend invitations",
            "2026-03-14: sleep disruption, freq=nightly, Context: phone use until 3am",
        ],
        "teacher_feedback": (
            "Sofia has become increasingly disengaged. She used to be an active participant "
            "but now sits silently. Her homework quality has declined significantly. "
            "She seems tired and distracted in morning classes."
        ),
    },
    {
        "id": "toddler-speech",
        "family_member_name": "Matei",
        "family_member_age": 2,
        "date_of_birth_year": 2024,
        "relationship": "son",
        "trigger_issue_id": 401,
        "issues": [
            {
                "id": 401,
                "title": "Limited vocabulary for age",
                "category": "communication",
                "severity": "high",
                "description": "Only uses 5-10 words at 24 months, should be using 50+.",
            },
            {
                "id": 402,
                "title": "Frustration tantrums from communication gaps",
                "category": "behavioral",
                "severity": "medium",
                "description": "Screams and throws objects when cannot communicate needs.",
            },
        ],
        "observations": [
            "2026-03-09: communication frustration, freq=5x/day, intensity=high, Context: mealtimes, requesting toys",
        ],
        "teacher_feedback": "",
    },
]


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------


def build_deep_analysis_prompt(case: dict) -> str:
    """Build the deep analysis prompt matching the LangGraph deep_analysis_graph format.

    When trigger_issue_id is set, the prompt focuses on that specific issue.
    """
    sections = []
    trigger_issue_id = case.get("trigger_issue_id")
    trigger_issue = None
    other_issues = []
    for issue in case["issues"]:
        if trigger_issue_id and issue["id"] == trigger_issue_id:
            trigger_issue = issue
        else:
            other_issues.append(issue)

    if trigger_issue:
        sections.append(
            "You are a clinical psychologist and family systems analyst. "
            "Your PRIMARY task is to provide an in-depth analysis of a SPECIFIC issue for this family member. "
            "The other issues, observations, and feedback are provided as CONTEXT to help you understand "
            "how this issue fits into the broader picture — but your analysis must CENTER on the trigger issue.\n\n"
            "IMPORTANT: Only reference issue IDs that appear in the data below. "
            "Pay careful attention to the family member's age and date of birth — all analysis, "
            "recommendations, and developmental references must be consistent with their actual age."
        )
    else:
        sections.append(
            "You are a clinical psychologist and family systems analyst. Analyze the complete history "
            "of issues, observations, and feedback for a family member to identify "
            "patterns, systemic dynamics, and priorities.\n\n"
            "IMPORTANT: Only reference issue IDs that appear in the data below. "
            "Pay careful attention to the family member's age and date of birth — all analysis, "
            "recommendations, and developmental references must be consistent with their actual age."
        )

    # Family member profile
    profile_parts = [f"Name: {case['family_member_name']}"]
    profile_parts.append(f"Age: {case['family_member_age']} years old")
    profile_parts.append(f"Date of Birth Year: {case['date_of_birth_year']}")
    profile_parts.append(f"Relationship: {case['relationship']}")
    sections.append("## Family Member Profile\n" + "\n".join(profile_parts))

    # Trigger issue (highlighted)
    if trigger_issue:
        sections.append(
            f'## TRIGGER ISSUE (Primary Focus)\n'
            f'- [ID:{trigger_issue["id"]}] "{trigger_issue["title"]}" '
            f'({trigger_issue["category"]}, {trigger_issue["severity"]} severity)\n'
            f'  {trigger_issue["description"]}'
        )
        sections.append(
            "Your summary, pattern clusters, and priority recommendations must primarily address the trigger issue above. "
            "Other issues should be referenced only when they relate to or shed light on the trigger issue."
        )

    # Other issues as context (or all issues if no trigger)
    context_issues = other_issues if trigger_issue else case["issues"]
    if context_issues:
        issue_lines = []
        for issue in context_issues:
            line = f'- [ID:{issue["id"]}] "{issue["title"]}" ({issue["category"]}, {issue["severity"]} severity)'
            line += f'\n  {issue["description"]}'
            issue_lines.append(line)
        header = "## Other Issues (Context)" if trigger_issue else f"## Issues ({len(case['issues'])})"
        sections.append(f"{header}\n" + "\n".join(issue_lines))

    # Observations
    if case.get("observations"):
        sections.append(
            f"## Behavior Observations ({len(case['observations'])})\n"
            + "\n".join(f"- {o}" for o in case["observations"])
        )

    # Teacher feedback
    if case.get("teacher_feedback"):
        sections.append(f"## Teacher Feedback\n{case['teacher_feedback']}")

    # Instructions — mirrors production DeepAnalysisOutput schema
    if trigger_issue:
        sections.append(f"""## Instructions
Analyze the data above with PRIMARY FOCUS on the trigger issue (ID:{trigger_issue['id']}: "{trigger_issue['title']}").
Produce a structured JSON analysis with these fields:

1. **summary**: 2-3 paragraph executive summary for a parent/caregiver CENTERED on the trigger issue. Start with the trigger issue, then explain how other issues relate to it. MUST correctly reference the child's age and use age-appropriate language.
2. **patternClusters**: Array of related issue groups. The trigger issue MUST appear in at least one cluster. Each has: name, description, issueIds (array of ints), issueTitles (array of strings), categories (array of strings), pattern (recurring|escalating|co-occurring|seasonal|triggered), confidence (0-1), suggestedRootCause (optional string).
3. **timelineAnalysis**: Object with phases (array of {{period, issueIds, description, moodTrend (declining|improving|stable|volatile), keyEvents (array of strings)}}), moodCorrelation (optional string), escalationTrend (improving|worsening|stable|cyclical), criticalPeriods (array of strings). Focus timeline on the trigger issue's evolution.
4. **familySystemInsights**: Array of {{insight, involvedMemberIds (array of ints), involvedMemberNames (array of strings), evidenceIssueIds (array of ints), systemicPattern (optional string), actionable (bool)}}. Prioritize insights related to the trigger issue.
5. **priorityRecommendations**: Array of {{rank (int), issueId (optional int), issueTitle (optional string), rationale, urgency (immediate|short_term|long_term), suggestedApproach, relatedResearchIds (optional array of ints)}}. The FIRST recommendation (rank 1) MUST address the trigger issue directly. Recommendations MUST be age-appropriate for the child's actual age.
6. **researchRelevance**: Array of {{patternClusterName, relevantResearchIds (array of ints), relevantResearchTitles (array of strings), coverageGaps (array of strings)}}.
7. **developmentalContext**: Object with {{statedAge (int), dobYear (int), developmentalStage (string), ageAppropriateExpectations (string), flags (array of strings for any developmental concerns)}}.

IMPORTANT: All fields marked as "array" MUST be JSON arrays, never bare strings. For example coverageGaps must be ["gap1", "gap2"], not "gap1, gap2".

Write the analysis in English.""")
    else:
        sections.append("""## Instructions
Analyze all the data above and produce a structured JSON analysis with these fields:

1. **summary**: 2-3 paragraph executive summary for a parent/caregiver. MUST correctly reference the child's age and use age-appropriate language.
2. **patternClusters**: Array of related issue groups. Each has: name, description, issueIds (array of ints), issueTitles (array of strings), categories (array of strings), pattern (recurring|escalating|co-occurring|seasonal|triggered), confidence (0-1), suggestedRootCause (optional string).
3. **timelineAnalysis**: Object with phases (array of {period, issueIds, description, moodTrend (declining|improving|stable|volatile), keyEvents (array of strings)}), moodCorrelation (optional string), escalationTrend (improving|worsening|stable|cyclical), criticalPeriods (array of strings).
4. **familySystemInsights**: Array of {insight, involvedMemberIds (array of ints), involvedMemberNames (array of strings), evidenceIssueIds (array of ints), systemicPattern (optional string), actionable (bool)}.
5. **priorityRecommendations**: Array of {rank (int), issueId (optional int), issueTitle (optional string), rationale, urgency (immediate|short_term|long_term), suggestedApproach, relatedResearchIds (optional array of ints)}. Recommendations MUST be age-appropriate for the child's actual age.
6. **researchRelevance**: Array of {patternClusterName, relevantResearchIds (array of ints), relevantResearchTitles (array of strings), coverageGaps (array of strings)}.
7. **developmentalContext**: Object with {statedAge (int), dobYear (int), developmentalStage (string), ageAppropriateExpectations (string), flags (array of strings for any developmental concerns)}.

IMPORTANT: All fields marked as "array" MUST be JSON arrays, never bare strings. For example coverageGaps must be ["gap1", "gap2"], not "gap1, gap2".

Write the analysis in English.""")

    return "\n\n".join(sections)


def build_input_description(case: dict) -> str:
    """Build a human-readable description for LLMTestCase.input."""
    issues_text = "; ".join(i["title"] for i in case["issues"])
    trigger_id = case.get("trigger_issue_id")
    trigger_text = ""
    if trigger_id:
        trigger_issue = next((i for i in case["issues"] if i["id"] == trigger_id), None)
        if trigger_issue:
            trigger_text = f'\nTrigger issue (primary focus): [ID:{trigger_id}] "{trigger_issue["title"]}"'
    return (
        f"Family member: {case['family_member_name']}, "
        f"age {case['family_member_age']} (born {case['date_of_birth_year']}), "
        f"{case['relationship']}.\n"
        f"Issues: {issues_text}"
        f"{trigger_text}"
    )


# ---------------------------------------------------------------------------
# Runner with fixture caching
# ---------------------------------------------------------------------------


def _call_deepseek(prompt: str, temperature: float = 0.3, retries: int = 2) -> dict:
    """Call DeepSeek and return parsed JSON."""
    import httpx
    from json_repair import repair_json

    last_err = None
    for attempt in range(retries + 1):
        response = httpx.post(
            f"{_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": _MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": temperature,
            },
            timeout=180,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        cleaned = re.sub(r"```(?:json)?\s*", "", content)
        cleaned = re.sub(r"```\s*", "", cleaned).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            try:
                repaired = repair_json(cleaned, return_objects=True)
                if isinstance(repaired, dict):
                    return repaired
                return json.loads(str(repaired))
            except Exception as e:
                last_err = e
                if attempt < retries:
                    continue
    raise last_err


def run_deep_analysis(case: dict, force_regen: bool = False) -> dict:
    """Run deep analysis and cache the result."""
    case_id = case["id"]
    fixture_path = FIXTURES_DIR / f"{case_id}_analysis.json"

    if fixture_path.exists() and not force_regen:
        return json.loads(fixture_path.read_text(encoding="utf-8"))["result"]

    prompt = build_deep_analysis_prompt(case)
    result = _call_deepseek(prompt, temperature=0.3)

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(
            {
                "id": case_id,
                "stage": "deep_analysis",
                "prompt": prompt,
                "result": result,
                "model": _MODEL,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return result

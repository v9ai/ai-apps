"""Games suitability analysis for Bogdan via deep analysis reuse.

Reuses run_deep_analysis() from the deep_analysis eval to load (or generate)
Bogdan's structured analysis, then asks DeepSeek which games are therapeutically
suitable given his profile and the analysis output.

Fixtures are cached to avoid re-running expensive DeepSeek calls.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Reuse generator utilities from the sibling deep_analysis eval
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "deep_analysis"))
from generator import TEST_CASES, _call_deepseek, run_deep_analysis  # noqa: E402

BOGDAN_CASE = next(c for c in TEST_CASES if c["id"] == "school-age-selective-mutism")
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def build_games_prompt(case: dict, deep_analysis: dict) -> str:
    sections = []

    sections.append(
        "You are a child development specialist and play therapist. "
        "Given a 7-year-old boy's clinical profile and a structured deep analysis of his issues, "
        "recommend specific games that are therapeutically appropriate for him. "
        "Prioritize games with LOW verbal pressure (critical — he has selective mutism), "
        "structured rules he can follow independently, and opportunities for mastery without "
        "timed pressure. Mix solo and social options."
    )

    # Child profile
    profile_lines = [
        f"Name: {case['family_member_name']}",
        f"Age: {case['family_member_age']} years old (born {case['date_of_birth_year']})",
        f"Relationship: {case['relationship']}",
        "Developmental stage: school_age (6–11)",
    ]
    sections.append("## Child Profile\n" + "\n".join(profile_lines))

    # Issues
    issue_lines = [
        f"- [ID:{i['id']}] {i['title']} ({i['category']}, {i['severity']} severity): {i['description']}"
        for i in case["issues"]
    ]
    sections.append("## Known Issues\n" + "\n".join(issue_lines))

    # Deep analysis excerpts — the parts most relevant to game selection
    dev_ctx = deep_analysis.get("developmentalContext", {})
    if dev_ctx:
        sections.append(
            "## Developmental Context (from deep analysis)\n"
            + json.dumps(dev_ctx, indent=2, ensure_ascii=False)
        )

    priority_recs = deep_analysis.get("priorityRecommendations", [])
    if priority_recs:
        sections.append(
            "## Priority Recommendations (from deep analysis)\n"
            + json.dumps(priority_recs, indent=2, ensure_ascii=False)
        )

    parent_advice = deep_analysis.get("parentAdvice", [])
    if parent_advice:
        sections.append(
            "## Parent Advice (from deep analysis)\n"
            + json.dumps(parent_advice, indent=2, ensure_ascii=False)
        )

    sections.append("""## Instructions
Produce a JSON object with exactly two top-level fields:

1. **summary** (string): 2–3 sentences explaining the overall game selection rationale for Bogdan, \
referencing his selective mutism and math anxiety.

2. **recommendations** (array of 5–7 objects): Each game recommendation must have:
   - name (string): the game's common name
   - gameType (string): exactly one of board_game, card_game, puzzle, digital, outdoor, cooperative, role_play
   - targetIssueIds (array of ints): which of Bogdan's issue IDs (501–504) this game addresses
   - therapeuticBenefit (string): 1–2 sentences on the specific therapeutic value
   - noVerbalPressure (bool): true if the game can be played without speaking
   - minPlayers (int): minimum players required
   - maxPlayers (int): maximum players (use 1 for solo)
   - concreteHowToPlay (array of 2–4 strings): specific steps for a parent to introduce this game with Bogdan
   - priority (string): exactly one of immediate, short_term, long_term

IMPORTANT:
- All targetIssueIds must be integers from the list [501, 502, 503, 504].
- noVerbalPressure must be true for at least 4 of the 5–7 recommendations.
- Include at least one solo game (maxPlayers = 1) and at least one cooperative game.
- concreteHowToPlay steps must be specific to Bogdan's profile (reference his issues where relevant).
- Do NOT recommend games that require reading aloud or verbal answers under pressure.

Return only valid JSON, no markdown fences.""")

    return "\n\n".join(sections)


def run_games_analysis(force_regen: bool = False) -> dict:
    """Run games analysis for Bogdan and cache the result."""
    fixture_path = FIXTURES_DIR / "bogdan-games.json"

    if fixture_path.exists() and not force_regen:
        return json.loads(fixture_path.read_text(encoding="utf-8"))["result"]

    deep_analysis = run_deep_analysis(BOGDAN_CASE)
    prompt = build_games_prompt(BOGDAN_CASE, deep_analysis)
    result = _call_deepseek(prompt, temperature=0.3)

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(
            {
                "id": "bogdan-games",
                "stage": "games_analysis",
                "prompt": prompt,
                "result": result,
                "model": "deepseek-chat",
                "generated_at": datetime.now(timezone.utc).isoformat(),
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return result

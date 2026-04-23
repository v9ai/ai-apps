"""CLI runner for Bogdan's games suitability analysis.

Usage:
    uv run python run_games.py              # use cached fixture
    uv run python run_games.py --regen      # force re-generate from DeepSeek
"""

import argparse
import json

from generator import BOGDAN_CASE, run_games_analysis

GAME_TYPE_LABELS = {
    "board_game": "Board game",
    "card_game": "Card game",
    "puzzle": "Puzzle",
    "digital": "Digital",
    "outdoor": "Outdoor",
    "cooperative": "Cooperative",
    "role_play": "Role play",
}

PRIORITY_ORDER = {"immediate": 0, "short_term": 1, "long_term": 2}


def print_recommendations(result: dict) -> None:
    print(f"\n{'=' * 60}")
    print(f"Games suitability analysis — {BOGDAN_CASE['family_member_name']}, "
          f"age {BOGDAN_CASE['family_member_age']}")
    print("=" * 60)

    summary = result.get("summary", "")
    if summary:
        print(f"\nSummary\n-------\n{summary}\n")

    recs = result.get("recommendations", [])
    if not recs:
        print("No recommendations found.")
        return

    sorted_recs = sorted(recs, key=lambda r: PRIORITY_ORDER.get(r.get("priority", "long_term"), 2))

    for i, rec in enumerate(sorted_recs, 1):
        name = rec.get("name", "Unknown")
        game_type = GAME_TYPE_LABELS.get(rec.get("gameType", ""), rec.get("gameType", ""))
        priority = rec.get("priority", "—")
        no_verbal = rec.get("noVerbalPressure", False)
        players = f"{rec.get('minPlayers', '?')}–{rec.get('maxPlayers', '?')} players"
        benefit = rec.get("therapeuticBenefit", "")
        issue_ids = rec.get("targetIssueIds", [])
        steps = rec.get("concreteHowToPlay", [])

        verbal_tag = "no verbal pressure" if no_verbal else "verbal required"
        print(f"{i}. {name}  [{game_type}]  {priority}  ({verbal_tag})  {players}")
        print(f"   Issues: {issue_ids}")
        print(f"   Benefit: {benefit}")
        if steps:
            print("   How to introduce:")
            for step in steps:
                print(f"     • {step}")
        print()

    verbal_safe = sum(1 for r in recs if r.get("noVerbalPressure"))
    print(f"{'=' * 60}")
    print(f"Total: {len(recs)} recommendations, {verbal_safe} with no verbal pressure")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Games suitability analysis for Bogdan")
    parser.add_argument(
        "--regen",
        action="store_true",
        help="Force re-generate from DeepSeek (ignore fixture cache)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="json_output",
        help="Print raw JSON output instead of formatted summary",
    )
    args = parser.parse_args()

    result = run_games_analysis(force_regen=args.regen)

    if args.json_output:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print_recommendations(result)

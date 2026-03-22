"""CLI runner for the knowledge app red-team pipeline.

Usage:
    uv run python -m redteam quick         # fast scan, eval agent only (~30s)
    uv run python -m redteam safety        # full safety scan, eval agent (~2min)
    uv run python -m redteam editorial     # editorial pipeline attacks (~2min)
    uv run python -m redteam full          # all targets, all attacks (~5min)
    uv run python -m redteam deepteam      # use deepteam's built-in scanner
"""

import sys
from pathlib import Path

# Ensure evals dir is on path
_evals_dir = str(Path(__file__).resolve().parent.parent)
if _evals_dir not in sys.path:
    sys.path.insert(0, _evals_dir)


def run_langgraph_profile(profile: str):
    """Run the LangGraph red-team graph with the given profile."""
    from redteam.graph import build_redteam_graph

    graph = build_redteam_graph()
    result = graph.invoke({
        "profile": profile,
        "targets": [],
        "pending_attacks": [],
        "results": [],
        "summary": "",
    })
    print(result["summary"])


def run_deepteam_scan():
    """Run deepteam's built-in scanner against the eval agent."""
    from deepteam import red_team
    from deepteam.attacks.single_turn import PromptInjection, GoalRedirection, SystemOverride
    from deepteam.vulnerabilities import Misinformation, Robustness, Toxicity, PromptLeakage

    from deepseek_model import DeepSeekModel
    from redteam.callbacks import eval_agent_callback
    from redteam.vulnerabilities import KNOWLEDGE_VULNERABILITIES

    model = DeepSeekModel()

    assessment = red_team(
        model_callback=eval_agent_callback,
        vulnerabilities=[
            Misinformation(),
            Robustness(),
            PromptLeakage(),
            *KNOWLEDGE_VULNERABILITIES,
        ],
        attacks=[
            PromptInjection(),
            GoalRedirection(),
            SystemOverride(),
        ],
        simulator_model=model,
        evaluation_model=model,
        attacks_per_vulnerability_type=2,
        target_purpose="Answer questions about AI, ML, and deep learning",
        max_concurrent=5,
    )

    print(f"\nPass rate: {assessment.overview.pass_rate:.0%}")
    print(f"Passing: {assessment.overview.passing}")
    print(f"Failing: {assessment.overview.failing}")
    print(f"Errored: {assessment.overview.errored}")

    # Save results
    results_dir = Path(__file__).resolve().parent.parent / "redteam-results"
    results_dir.mkdir(exist_ok=True)
    assessment.save(str(results_dir))


def main():
    profile = sys.argv[1] if len(sys.argv) > 1 else "quick"
    valid = ["quick", "safety", "editorial", "full", "deepteam"]

    if profile not in valid:
        print(f"Usage: python -m redteam [{' | '.join(valid)}]")
        sys.exit(1)

    if profile == "deepteam":
        run_deepteam_scan()
    else:
        run_langgraph_profile(profile)


if __name__ == "__main__":
    main()

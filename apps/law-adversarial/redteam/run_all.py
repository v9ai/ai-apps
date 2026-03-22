"""
Run all deepteam red-team evaluations for the law-adversarial app.

Usage:
    python -m redteam               # run all
    python -m redteam attacker      # run single target
    python -m redteam owasp         # OWASP LLM Top 10 scan
    python -m redteam nist          # NIST AI RMF scan
"""

import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.evals")

from . import eval_attacker, eval_defender, eval_judge, eval_pipeline, eval_frameworks

RUNNERS = {
    "attacker": ("Attacker Agent", eval_attacker.run),
    "defender": ("Defender Agent", eval_defender.run),
    "judge": ("Judge Agent", eval_judge.run),
    "pipeline": ("Full Pipeline", eval_pipeline.run),
    "owasp": ("OWASP LLM Top 10", eval_frameworks.run_owasp),
    "nist": ("NIST AI RMF", eval_frameworks.run_nist),
}

ALL_TARGETS = ["attacker", "defender", "judge", "pipeline"]


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "all":
        selected = [(k, RUNNERS[k]) for k in ALL_TARGETS]
    elif target in RUNNERS:
        selected = [(target, RUNNERS[target])]
    else:
        print(f"Unknown target: {target}")
        print(f"Options: all, {', '.join(RUNNERS.keys())}")
        sys.exit(1)

    results = {}
    passed = 0
    failed = 0

    for key, (label, run_fn) in selected:
        print(f"\n{'=' * 60}")
        print(f"  {label}")
        print(f"{'=' * 60}")
        try:
            results[key] = run_fn()
            passed += 1
        except Exception as e:
            print(f"\n  [FAILED] {e}")
            results[key] = None
            failed += 1

    print(f"\n{'=' * 60}")
    print(f"  Summary: {passed} passed, {failed} failed, {passed + failed} total")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Run all analyzer evals — formulas (offline) + GEval (needs DEEPSEEK_API_KEY).

Usage:
    python run_all_evals.py              # all tests (requires DEEPSEEK_API_KEY)
    python run_all_evals.py --offline    # formula + unit tests only (no API key)
    python run_all_evals.py --geval      # GEval tests only
    python run_all_evals.py --safety     # safety/compliance tests only
    python run_all_evals.py --structural # structural schema + formula validation
    python run_all_evals.py --e2e        # end-to-end pipeline tests
    python run_all_evals.py -k parking   # pass-through to pytest -k
"""

import os
import sys
import subprocess

EVAL_DIR = os.path.join(os.path.dirname(__file__), "eval")

# Tests that need no API key (pure Python, instant)
OFFLINE_FILES = [
    os.path.join(EVAL_DIR, "test_formulas.py"),
    os.path.join(EVAL_DIR, "test_parking.py") + "::TestBuildValuationPromptParking",
    os.path.join(EVAL_DIR, "test_structural.py") + "::TestValidateValuationFormulas",
    os.path.join(EVAL_DIR, "test_structural.py") + "::TestListingExtractionSchema",
    os.path.join(EVAL_DIR, "test_structural.py") + "::TestValuationResultSchema",
    os.path.join(EVAL_DIR, "test_e2e.py") + "::TestExtractorWithTestModel",
    os.path.join(EVAL_DIR, "test_e2e.py") + "::TestValuatorWithTestModel",
    os.path.join(EVAL_DIR, "test_e2e.py") + "::TestValuatorWithFunctionModel",
    os.path.join(EVAL_DIR, "test_e2e.py") + "::TestPipelineWiring",
    os.path.join(EVAL_DIR, "test_e2e.py") + "::TestAnalyzerDeps",
]

# GEval metrics (require DEEPSEEK_API_KEY)
GEVAL_FILES = [
    os.path.join(EVAL_DIR, "test_extraction.py"),
    os.path.join(EVAL_DIR, "test_valuation.py"),
    os.path.join(EVAL_DIR, "test_investment.py"),
    os.path.join(EVAL_DIR, "test_parking.py") + "::test_parking_extraction",
    os.path.join(EVAL_DIR, "test_comparables.py"),
]

# Safety and compliance (require DEEPSEEK_API_KEY)
SAFETY_FILES = [
    os.path.join(EVAL_DIR, "test_safety.py"),
]

# Structural schema validation with GEval (require DEEPSEEK_API_KEY)
STRUCTURAL_FILES = [
    os.path.join(EVAL_DIR, "test_structural.py") + "::test_schema_extraction",
]

# End-to-end pipeline live test (require DEEPSEEK_API_KEY, slow)
E2E_FILES = [
    os.path.join(EVAL_DIR, "test_e2e.py") + "::test_full_pipeline_live",
]


def _require_api_key():
    if not os.getenv("DEEPSEEK_API_KEY"):
        print("error: DEEPSEEK_API_KEY not set", file=sys.stderr)
        sys.exit(1)


def main():
    args = sys.argv[1:]

    if "--offline" in args:
        args.remove("--offline")
        targets = OFFLINE_FILES
    elif "--geval" in args:
        args.remove("--geval")
        _require_api_key()
        targets = GEVAL_FILES
    elif "--safety" in args:
        args.remove("--safety")
        _require_api_key()
        targets = SAFETY_FILES
    elif "--structural" in args:
        args.remove("--structural")
        _require_api_key()
        targets = STRUCTURAL_FILES
    elif "--e2e" in args:
        args.remove("--e2e")
        _require_api_key()
        targets = E2E_FILES
    else:
        targets = [EVAL_DIR]

    cmd = [sys.executable, "-m", "pytest", *targets, "-v", *args]
    print(f"→ {' '.join(cmd)}\n")
    sys.exit(subprocess.call(cmd))


if __name__ == "__main__":
    main()

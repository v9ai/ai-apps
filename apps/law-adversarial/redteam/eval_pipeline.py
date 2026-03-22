"""
Red-team the full adversarial pipeline (attacker -> defender -> judge).

Tests the end-to-end system for:
  - Prompt injection propagation across agent boundaries
  - Citation hallucination introduced at any stage
  - Overall legal misinformation in the final judgment
  - Pipeline robustness under adversarial inputs
"""

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.evals")

from deepteam import red_team
from deepteam.attacks.single_turn import (
    PromptInjection,
    ContextPoisoning,
    SyntheticContextInjection,
    Multilingual,
    GoalRedirection,
)
from deepteam.attacks.multi_turn import LinearJailbreaking, CrescendoJailbreaking

from .agents import pipeline_callback
from .vulnerabilities import (
    PROMPT_INJECTION_RESISTANCE,
    CITATION_HALLUCINATION,
    LEGAL_MISINFORMATION,
    ANALYSIS_COMPLETENESS,
    MISINFORMATION,
    ROBUSTNESS,
)


def run() -> object:
    print("=== Red-Teaming: Full Pipeline ===\n")

    return red_team(
        model_callback=pipeline_callback,
        target_purpose="End-to-end legal brief stress testing: attacker finds weaknesses, defender rebuts, judge scores",
        vulnerabilities=[
            PROMPT_INJECTION_RESISTANCE,
            CITATION_HALLUCINATION,
            LEGAL_MISINFORMATION,
            ANALYSIS_COMPLETENESS,
            MISINFORMATION,
            ROBUSTNESS,
        ],
        attacks=[
            PromptInjection(weight=2),
            ContextPoisoning(weight=2),
            SyntheticContextInjection(weight=1),
            Multilingual(weight=1),
            GoalRedirection(weight=1),
            LinearJailbreaking(weight=1),
            CrescendoJailbreaking(weight=1),
        ],
        attacks_per_vulnerability_type=2,
        async_mode=True,
    )

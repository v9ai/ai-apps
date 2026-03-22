"""
Red-team the attacker agent.

Tests:
  - Prompt injection resistance (injected instructions in brief text)
  - Citation hallucination (does attacker invent fake case law in its output?)
  - Analysis completeness (does attacker miss obvious weaknesses?)
  - General robustness (consistency across similar briefs)
"""

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.evals")

from deepteam import red_team
from deepteam.attacks.single_turn import (
    PromptInjection,
    ContextPoisoning,
    AuthorityEscalation,
    SyntheticContextInjection,
    Multilingual,
)

from .agents import attacker_callback
from .vulnerabilities import (
    PROMPT_INJECTION_RESISTANCE,
    CITATION_HALLUCINATION,
    ANALYSIS_COMPLETENESS,
    ROBUSTNESS,
)


def run() -> object:
    print("=== Red-Teaming: Attacker Agent ===\n")

    return red_team(
        model_callback=attacker_callback,
        target_purpose="Analyze legal briefs for weaknesses and vulnerabilities",
        vulnerabilities=[
            PROMPT_INJECTION_RESISTANCE,
            CITATION_HALLUCINATION,
            ANALYSIS_COMPLETENESS,
            ROBUSTNESS,
        ],
        attacks=[
            PromptInjection(weight=2),
            ContextPoisoning(weight=2),
            AuthorityEscalation(weight=1),
            SyntheticContextInjection(weight=1),
            Multilingual(weight=1),
        ],
        attacks_per_vulnerability_type=3,
        async_mode=True,
    )

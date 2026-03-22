"""
Red-team the defender agent.

Tests:
  - Prompt injection resistance (can defender be tricked into abandoning its role?)
  - Citation hallucination (does defender fabricate supporting authority?)
  - Legal misinformation (does defender cite wrong law or overruled precedent?)
  - Robustness (consistent defense quality across similar inputs)
"""

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.evals")

from deepteam import red_team
from deepteam.attacks.single_turn import (
    PromptInjection,
    ContextPoisoning,
    Roleplay,
    GoalRedirection,
    EmotionalManipulation,
)

from .agents import defender_callback
from .vulnerabilities import (
    PROMPT_INJECTION_RESISTANCE,
    CITATION_HALLUCINATION,
    LEGAL_MISINFORMATION,
    ROBUSTNESS,
)


def run() -> object:
    print("=== Red-Teaming: Defender Agent ===\n")

    return red_team(
        model_callback=defender_callback,
        target_purpose="Rebut adversarial attacks on legal briefs with accurate legal authority",
        vulnerabilities=[
            PROMPT_INJECTION_RESISTANCE,
            CITATION_HALLUCINATION,
            LEGAL_MISINFORMATION,
            ROBUSTNESS,
        ],
        attacks=[
            PromptInjection(weight=2),
            ContextPoisoning(weight=2),
            Roleplay(weight=1),
            GoalRedirection(weight=1),
            EmotionalManipulation(weight=1),
        ],
        attacks_per_vulnerability_type=3,
        async_mode=True,
    )

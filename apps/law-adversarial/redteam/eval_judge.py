"""
Red-team the judge agent.

Tests:
  - Prompt injection via previousFindings and brief text
  - Judge bias (does judge consistently favour one side?)
  - Legal misinformation (does judge accept and echo wrong law?)
  - Robustness (consistent scoring across equivalent inputs)
"""

from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env.evals")

from deepteam import red_team
from deepteam.attacks.single_turn import (
    PromptInjection,
    ContextPoisoning,
    EmbeddedInstructionJSON,
    AuthorityEscalation,
)
from deepteam.attacks.multi_turn import LinearJailbreaking

from .agents import judge_callback
from .vulnerabilities import (
    PROMPT_INJECTION_RESISTANCE,
    JUDGE_BIAS,
    LEGAL_MISINFORMATION,
    ROBUSTNESS,
)


def run() -> object:
    print("=== Red-Teaming: Judge Agent ===\n")

    return red_team(
        model_callback=judge_callback,
        target_purpose="Render impartial judicial findings on legal briefs",
        vulnerabilities=[
            PROMPT_INJECTION_RESISTANCE,
            JUDGE_BIAS,
            LEGAL_MISINFORMATION,
            ROBUSTNESS,
        ],
        attacks=[
            PromptInjection(weight=2),
            ContextPoisoning(weight=2),
            EmbeddedInstructionJSON(weight=2),
            AuthorityEscalation(weight=1),
            LinearJailbreaking(weight=1),
        ],
        attacks_per_vulnerability_type=3,
        async_mode=True,
    )

"""State definitions for the red-team LangGraph graph."""

from __future__ import annotations

import operator
from typing import Annotated, TypedDict


class AttackCase(TypedDict):
    target: str        # "eval_agent" | "editorial"
    vulnerability: str
    attack_type: str
    attack_input: str
    actual_output: str
    score: float | None
    passed: bool | None
    reason: str


class RedTeamState(TypedDict):
    profile: str
    targets: list[str]
    pending_attacks: list[AttackCase]
    results: Annotated[list[AttackCase], operator.add]
    summary: str


class CrescendoState(TypedDict):
    """State for multi-turn escalation attacks (crescendo pattern).

    The attacker starts with a benign prompt and escalates over turns,
    tracking conversation history and checking for goal achievement.
    """
    target: str
    goal: str               # the adversarial objective
    turns: list[dict]       # conversation history: [{role, content}, ...]
    max_turns: int
    current_turn: int
    achieved: bool          # did the attack succeed?
    final_output: str
    reason: str

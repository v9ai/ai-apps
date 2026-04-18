"""DeepEval `BaseMetric` wrapper around the adversarial debate protocol.

Lets pytest tests call the same advocate → critic → jury protocol used by
`regen_questions.py`, scored as a single 0..1 number with a reason string.

Usage:

    from metrics.debate_metric import DebateMetric
    from deepeval.test_case import LLMTestCase

    metric = DebateMetric(
        criteria="Questions must reference specific projects/papers/quotes "
                 "from the research and avoid generic phrasing.",
        threshold=0.7,
        rounds=2,
        jury=3,
    )
    test_case = LLMTestCase(
        input="Generate interview questions for Harrison Chase",
        actual_output=json.dumps(questions),
    )
    metric.measure(test_case)
    print(metric.score, metric.reason, metric.is_successful())
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from deepeval.metrics import BaseMetric
    from deepeval.test_case import LLMTestCase
    _HAS_DEEPEVAL = True
except (ImportError, TypeError):
    _HAS_DEEPEVAL = False
    BaseMetric = object  # type: ignore[misc,assignment]
    LLMTestCase = object  # type: ignore[misc,assignment]

from research_pipeline import _run_agent, _extract_json
from metrics._debate_primitives import (
    ADVOCATE_SYSTEM,
    CRITIC_SYSTEM,
    JUDGE_SYSTEM,
    JUDGE_JSON_INSTRUCTION,
    jury_aggregate,
    synthesise_critique_text,
)


def _default_clients(jury_size: int) -> tuple[Any, Any, list]:
    """Build (advocate, critic, judges) using the same fallback ladder as
    regen_questions: HF 72B if HF_TOKEN is set, else local MLX 7B for everyone."""
    from regen_questions import _build_client
    advocate, _ = _build_client("mlx")
    critic, _ = _build_client("mlx")
    judge, _ = _build_client("hf")
    return advocate, critic, [judge] * max(1, jury_size)


class DebateMetric(BaseMetric):  # type: ignore[misc]
    """Score an LLM output via a structured multi-agent debate.

    The metric runs:
        Round 1   : advocate defends `actual_output` against `criteria`,
                    critic attacks it.
        Rounds 2.. : advocate rebuts (using prior critique), critic counters.
        Final     : N judges issue independent verdicts → aggregated score.

    `score`  — median of overall_score across judges (0..1).
    `reason` — concatenated overall_reason from each judge.
    `success` — score >= threshold.
    """

    def __init__(
        self,
        criteria: str,
        *,
        threshold: float = 0.7,
        rounds: int = 2,
        jury: int = 1,
        advocate_client: Optional[Any] = None,
        critic_client: Optional[Any] = None,
        judges: Optional[list] = None,
        include_reason: bool = True,
    ):
        self.criteria = criteria
        self.threshold = threshold
        self.rounds = max(1, rounds)
        self.jury = max(1, jury)
        self.include_reason = include_reason
        self._advocate_client = advocate_client
        self._critic_client = critic_client
        self._judges = judges
        self.score: float = 0.0
        self.reason: Optional[str] = None
        self.success: bool = False

    @property
    def __name__(self) -> str:  # type: ignore[override]
        return "Debate"

    def is_successful(self) -> bool:
        return self.success

    def measure(self, test_case: "LLMTestCase") -> float:
        return asyncio.run(self.a_measure(test_case))

    async def a_measure(self, test_case: "LLMTestCase") -> float:
        advocate_client = self._advocate_client
        critic_client = self._critic_client
        judges = self._judges
        if advocate_client is None or critic_client is None or not judges:
            a, c, js = _default_clients(self.jury)
            advocate_client = advocate_client or a
            critic_client = critic_client or c
            judges = judges or js

        input_text = getattr(test_case, "input", "") or ""
        output_text = getattr(test_case, "actual_output", "") or ""

        # Round 1: opening arguments (parallel)
        defender_task = self._defender_open(advocate_client, input_text, output_text)
        critic_task = self._critic_open(critic_client, input_text, output_text)
        defender_arg, critic_arg = await asyncio.gather(defender_task, critic_task)

        transcript = f"DEFENDER: {defender_arg}\n\nCRITIC: {critic_arg}"

        # Subsequent rounds: sequential rebuttals
        for _ in range(self.rounds - 1):
            rebuttal_d = await self._defender_rebut(advocate_client, transcript)
            transcript += f"\n\nDEFENDER: {rebuttal_d}"
            rebuttal_c = await self._critic_rebut(critic_client, transcript)
            transcript += f"\n\nCRITIC: {rebuttal_c}"

        # Jury verdict (parallel) — per-juror temperature/seed for diversity
        from regen_questions import _judge_sampling_for
        total = len(judges)
        coros = []
        for idx, j in enumerate(judges):
            temp, seed = _judge_sampling_for(idx, total)
            coros.append(self._judge(
                j, input_text, output_text, transcript,
                temperature=temp, seed=seed,
                judge_label=f"JUROR-{idx + 1}-OF-{total}",
            ))
        judgments = await asyncio.gather(*coros)
        aggregated = jury_aggregate(judgments)

        self.score = float(aggregated.get("overall_score", 0.0))
        self.reason = (
            aggregated.get("overall_reason") if self.include_reason else None
        )
        self.success = self.score >= self.threshold
        return self.score

    # ── per-role prompt builders ─────────────────────────────────────────

    async def _defender_open(self, client, input_text: str, output_text: str) -> str:
        prompt = (
            f"You are defending the quality of an LLM output against a critic.\n"
            f"CRITERIA: {self.criteria}\n\n"
            f"INPUT (task given to the LLM):\n{input_text}\n\n"
            f"OUTPUT (what the LLM produced):\n{output_text}\n\n"
            f"Argue why this output SATISFIES the criteria. Be specific and cite "
            f"evidence from the output. Two short paragraphs maximum."
        )
        return await _run_agent(client, ADVOCATE_SYSTEM, prompt)

    async def _critic_open(self, client, input_text: str, output_text: str) -> str:
        prompt = (
            f"You are critiquing the quality of an LLM output.\n"
            f"CRITERIA: {self.criteria}\n\n"
            f"INPUT (task given to the LLM):\n{input_text}\n\n"
            f"OUTPUT (what the LLM produced):\n{output_text}\n\n"
            f"Argue why this output FAILS the criteria. Be specific and cite "
            f"evidence from the output. Two short paragraphs maximum."
        )
        return await _run_agent(client, CRITIC_SYSTEM, prompt)

    async def _defender_rebut(self, client, transcript: str) -> str:
        prompt = (
            f"DEBATE TRANSCRIPT SO FAR:\n{transcript}\n\n"
            f"As the DEFENDER, respond to the critic's most recent points. "
            f"Concede where they're right, push back where they're wrong, "
            f"cite specifics. One short paragraph."
        )
        return await _run_agent(client, ADVOCATE_SYSTEM, prompt)

    async def _critic_rebut(self, client, transcript: str) -> str:
        prompt = (
            f"DEBATE TRANSCRIPT SO FAR:\n{transcript}\n\n"
            f"As the CRITIC, respond to the defender's most recent points. "
            f"Find the weakest claim and attack it with specifics. "
            f"One short paragraph."
        )
        return await _run_agent(client, CRITIC_SYSTEM, prompt)

    async def _judge(
        self, client, input_text: str, output_text: str, transcript: str,
        *,
        temperature: float | None = None,
        seed: int | None = None,
        judge_label: str = "JUDGE",
    ) -> dict:
        prompt = (
            f"You are {judge_label}, ruling independently of any other juror. "
            f"Read the debate and decide how well the output meets the criteria.\n\n"
            f"CRITERIA: {self.criteria}\n\n"
            f"INPUT:\n{input_text}\n\n"
            f"OUTPUT:\n{output_text}\n\n"
            f"DEBATE TRANSCRIPT:\n{transcript}\n\n"
            f"Score the OUTPUT itself, weighing specific evidence over rhetoric. "
            f"Treat the OUTPUT as a single item with index=1.\n\n"
            f"{JUDGE_JSON_INSTRUCTION}"
        )
        extra: dict = {}
        if seed is not None:
            extra["seed"] = seed
        raw = await _run_agent(
            client, JUDGE_SYSTEM, prompt,
            temperature=temperature, extra_kwargs=extra or None,
        )
        parsed = _extract_json(raw)
        if isinstance(parsed, dict) and "overall_score" in parsed:
            return parsed
        return {
            "questions": [],
            "overall_score": 0.0,
            "overall_reason": "judge response unparseable",
        }


__all__ = ["DebateMetric"]

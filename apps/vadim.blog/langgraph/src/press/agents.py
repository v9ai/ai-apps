"""Agent wrapper with retry."""

from __future__ import annotations

import asyncio
import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


class Agent:
    """Single agent that calls an LLM with a system prompt and retry logic."""

    def __init__(self, name: str, system_prompt: str, model: ChatOpenAI):
        self.name = name
        self.system_prompt = system_prompt
        self.model = model

    async def run(self, input_text: str) -> str:
        logger.info("[%s] starting (%s)", self.name, self.model.model_name)
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=input_text),
        ]

        last_err = None
        for attempt in range(MAX_RETRIES):
            try:
                response = await self.model.ainvoke(messages)
                content = response.content
                if content:
                    logger.info("[%s] done (%d chars)", self.name, len(content))
                    return content
                if attempt < MAX_RETRIES - 1:
                    logger.warning(
                        "[%s] attempt %d returned empty, retrying...",
                        self.name, attempt + 1,
                    )
                    await asyncio.sleep(2**attempt)
                    continue
            except Exception as e:
                last_err = e
                if attempt < MAX_RETRIES - 1:
                    logger.warning(
                        "[%s] attempt %d failed (%s), retrying...",
                        self.name, attempt + 1, e,
                    )
                    await asyncio.sleep(2**attempt)
                    continue
                raise

        raise RuntimeError(
            f"Agent {self.name} returned empty after {MAX_RETRIES} attempts"
            + (f": {last_err}" if last_err else "")
        )


async def run_parallel(a: Agent, b: Agent, input_text: str) -> tuple[str, str]:
    """Run two agents concurrently with the same input."""
    logger.info("Running [%s] and [%s] in parallel...", a.name, b.name)
    return await asyncio.gather(a.run(input_text), b.run(input_text))


async def run_all(tasks: list[tuple[Agent, str]]) -> list[str]:
    """Run N agents concurrently, each with its own input. Returns results in order."""
    if not tasks:
        return []
    if len(tasks) == 1:
        return [await tasks[0][0].run(tasks[0][1])]

    logger.info(
        "Running %d agents in parallel: [%s]",
        len(tasks),
        ", ".join(a.name for a, _ in tasks),
    )

    async def _run_indexed(idx: int, agent: Agent, inp: str) -> tuple[int, str]:
        result = await agent.run(inp)
        return (idx, result)

    results = await asyncio.gather(
        *(_run_indexed(i, a, inp) for i, (a, inp) in enumerate(tasks))
    )
    results = sorted(results, key=lambda x: x[0])
    return [r for _, r in results]

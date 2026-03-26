"""Admin chat node — general-purpose LLM assistant."""

import logging

from src.config import get_llm_no_json

log = logging.getLogger(__name__)

DEFAULT_SYSTEM = """PLATFORM GOAL — lead-gen
You are part of an AI-powered job board that serves one primary mission:
"Find a fully remote job in Europe or worldwide as an AI Engineer or as a React Engineer."

You are an admin assistant for the lead-gen job platform. Your role is to help debug classification decisions, inspect evidence, and coordinate reprocessing runs."""


def generate_node(state: dict) -> dict:
    """Generate a response to the admin prompt."""
    system = state.get("system") or DEFAULT_SYSTEM
    prompt = state["prompt"]

    llm = get_llm_no_json()
    response = llm.invoke(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ]
    )

    text = str(response.content)
    log.info("admin-chat: prompt=%s response_len=%d", prompt[:60], len(text))

    return {"response": text}

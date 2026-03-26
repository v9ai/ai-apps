"""Email compose nodes."""

import json
import logging

from src.config import get_llm

from .prompts import SYSTEM_PROMPT, build_compose_prompt, build_batch_prompt

log = logging.getLogger(__name__)


def compose_email_node(state: dict) -> dict:
    """Compose an outreach email."""
    prompt = build_compose_prompt(
        recipient_name=state.get("recipient_name", ""),
        company_name=state.get("company_name", ""),
        instructions=state.get("instructions", ""),
        recipient_context=state.get("recipient_context", ""),
        linkedin_post_content=state.get("linkedin_post_content", ""),
    )

    llm = get_llm()
    response = llm.invoke(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    content = str(response.content)

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        # Try to extract from markdown code block
        import re
        json_match = re.search(r"\{[^}]+\}", content, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group())
            except json.JSONDecodeError:
                result = {"subject": "Follow up", "body": content}
        else:
            result = {"subject": "Follow up", "body": content}

    log.info("email-compose: subject=%s", result.get("subject", "")[:60])

    return {
        "subject": result.get("subject", ""),
        "body": result.get("body", ""),
    }

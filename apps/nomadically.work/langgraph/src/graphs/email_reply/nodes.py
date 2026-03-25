"""Email reply generation nodes."""

import logging
import re

from src.config import get_llm_no_json

from .prompts import build_system_prompt, build_user_prompt

log = logging.getLogger(__name__)


def generate_reply_node(state: dict) -> dict:
    """Generate a reply email from the original email context."""
    system = build_system_prompt(state.get("tone"))
    user_prompt = build_user_prompt(
        original_email=state["original_email"],
        sender=state["sender"],
        reply_type=state.get("reply_type", ""),
        additional_details=state.get("additional_details", ""),
        instructions=state.get("instructions", ""),
        include_calendly=state.get("include_calendly", False),
    )

    llm = get_llm_no_json()
    response = llm.invoke(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ]
    )

    text = str(response.content)

    # Parse subject and body from response
    subject_match = re.search(r"Subject:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    body_match = re.search(
        r"Body:\s*([\s\S]+?)(?:\n\n---|$)", text, re.IGNORECASE
    )

    if subject_match and body_match:
        subject = subject_match.group(1).strip()
        body = body_match.group(1).strip()
    else:
        lines = [line for line in text.split("\n") if line.strip()]
        subject = re.sub(r"^(Subject:|##|Re:)\s*", "", lines[0]).strip() if lines else "Re: Your email"
        body = "\n".join(lines[1:]).strip() if len(lines) > 1 else text

    if not subject.startswith("Re:"):
        subject = f"Re: {subject}"

    log.info("email-reply: subject=%s body_len=%d", subject[:60], len(body))

    return {"subject": subject, "body": body}

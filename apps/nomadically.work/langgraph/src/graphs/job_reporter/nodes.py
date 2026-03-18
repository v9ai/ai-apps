"""Job Reporter graph nodes — two-pass DeepSeek classification with Langfuse.

Ported from workers/job-reporter-llm. Uses DeepSeek for classification
with confidence-based escalation to a second pass.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from psycopg.rows import dict_row

from src.db.connection import get_connection

from .prompts import REPORT_HUMAN_PROMPT, REPORT_SYSTEM_PROMPT
from .state import JobReporterState

logger = logging.getLogger(__name__)

CONFIDENCE_ESCALATE = 0.60
AUTO_RESTORE_THRESHOLD = 0.85

VALID_REASONS = {"spam", "irrelevant", "misclassified", "false_positive"}
VALID_TAGS = {
    "phishing", "wrong_location", "wrong_language", "closed_role",
    "agency_spam", "unpaid", "duplicate", "test_listing",
}


def _get_deepseek_chat() -> ChatOpenAI:
    """Get DeepSeek chat model (fast pass)."""
    return ChatOpenAI(
        model="deepseek-chat",
        api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
        base_url=os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        temperature=0.1,
        max_tokens=400,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


def _get_deepseek_reasoner() -> ChatOpenAI:
    """Get DeepSeek reasoner model (deep pass)."""
    return ChatOpenAI(
        model="deepseek-reasoner",
        api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
        base_url=os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        temperature=1,  # Only accepted value for reasoner
        max_tokens=600,
    )


def fetch_job_node(state: JobReporterState) -> dict:
    """Fetch job data from the database."""
    conn = get_connection()
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, title, company_key, location, source_kind,
                          url, description, is_remote_eu, status
                   FROM jobs WHERE id = %s""",
                [state["job_id"]],
            )
            job = cur.fetchone()

        if not job:
            return {"job_data": {}, "stats": {"error": f"Job {state['job_id']} not found"}}
        return {"job_data": dict(job)}
    finally:
        conn.close()


def pass1_classify_node(state: JobReporterState) -> dict:
    """Pass 1: Fast classification with deepseek-chat."""
    job = state.get("job_data", {})
    if not job:
        return {"pass1_result": None, "stats": {"error": "No job data"}}

    human_msg = REPORT_HUMAN_PROMPT.format(
        job_id=job.get("id", "?"),
        title=job.get("title", "?"),
        company_key=job.get("company_key", "?"),
        location=job.get("location", "?"),
        source_kind=job.get("source_kind", "?"),
        url=job.get("url", "?"),
        is_remote_eu=job.get("is_remote_eu", "?"),
        description=(job.get("description") or "")[:2000],
    )

    try:
        llm = _get_deepseek_chat()
        response = llm.invoke([
            SystemMessage(content=REPORT_SYSTEM_PROMPT),
            HumanMessage(content=human_msg),
        ])

        result = json.loads(response.content)
        # Validate and sanitize
        reason = result.get("reason", "")
        if reason not in VALID_REASONS:
            reason = "false_positive"
        confidence = max(0.0, min(1.0, float(result.get("confidence", 0.5))))
        tags = [t for t in result.get("tags", []) if t in VALID_TAGS]

        return {
            "pass1_result": {
                "reason": reason,
                "confidence": confidence,
                "reasoning": result.get("reasoning", ""),
                "tags": tags,
                "model": "deepseek-chat",
            },
        }
    except Exception as e:
        logger.error(f"Pass 1 failed: {e}")
        return {
            "pass1_result": {
                "reason": "false_positive",
                "confidence": 0.0,
                "reasoning": f"Pass 1 error: {e}",
                "tags": [],
                "model": "deepseek-chat",
            },
        }


def route_after_pass1(state: JobReporterState) -> str:
    """Route to pass2 if confidence is below threshold."""
    result = state.get("pass1_result")
    if not result:
        return "persist_result"
    if result.get("confidence", 0) < CONFIDENCE_ESCALATE:
        return "pass2_classify"
    return "persist_result"


def pass2_classify_node(state: JobReporterState) -> dict:
    """Pass 2: Deep classification with deepseek-reasoner for low-confidence cases."""
    job = state.get("job_data", {})
    pass1 = state.get("pass1_result", {})

    human_msg = REPORT_HUMAN_PROMPT.format(
        job_id=job.get("id", "?"),
        title=job.get("title", "?"),
        company_key=job.get("company_key", "?"),
        location=job.get("location", "?"),
        source_kind=job.get("source_kind", "?"),
        url=job.get("url", "?"),
        is_remote_eu=job.get("is_remote_eu", "?"),
        description=(job.get("description") or "")[:2000],
    )

    # Add pass1 context
    human_msg += f"\n\nPrevious analysis (low confidence {pass1.get('confidence', 0):.2f}):\n"
    human_msg += f"Reason: {pass1.get('reason', '?')}\n"
    human_msg += f"Reasoning: {pass1.get('reasoning', '?')}\n"
    human_msg += "Please provide a more thorough analysis with higher confidence."

    try:
        llm = _get_deepseek_reasoner()
        response = llm.invoke([
            SystemMessage(content=REPORT_SYSTEM_PROMPT),
            HumanMessage(content=human_msg),
        ])

        # Try to parse JSON from reasoner response
        text = response.content
        try:
            result = json.loads(text)
        except json.JSONDecodeError:
            # Extract JSON from markdown code block
            import re
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
            if match:
                result = json.loads(match.group(1))
            else:
                result = pass1  # Fall back to pass1

        reason = result.get("reason", pass1.get("reason", "false_positive"))
        if reason not in VALID_REASONS:
            reason = "false_positive"
        confidence = max(0.0, min(1.0, float(result.get("confidence", pass1.get("confidence", 0.5)))))
        tags = [t for t in result.get("tags", pass1.get("tags", [])) if t in VALID_TAGS]

        return {
            "pass2_result": {
                "reason": reason,
                "confidence": confidence,
                "reasoning": result.get("reasoning", ""),
                "tags": tags,
                "model": "deepseek-reasoner",
            },
        }
    except Exception as e:
        logger.error(f"Pass 2 failed: {e}")
        return {"pass2_result": state.get("pass1_result")}


def persist_result_node(state: JobReporterState) -> dict:
    """Persist classification result to the database."""
    # Use pass2 result if available, otherwise pass1
    result = state.get("pass2_result") or state.get("pass1_result")
    if not result:
        return {"final_result": {}, "stats": {"error": "No classification result"}}

    job_id = state["job_id"]
    reason = result["reason"]
    confidence = result["confidence"]

    # Determine action
    if reason == "false_positive" and confidence >= AUTO_RESTORE_THRESHOLD:
        action = "auto_restored"
    elif confidence < 0.40:
        action = "escalated"
    else:
        action = "pending"

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Update job with report data
            cur.execute(
                """UPDATE jobs SET
                       report_reason = %s,
                       report_confidence = %s,
                       report_reasoning = %s,
                       report_tags = %s,
                       report_action = %s,
                       updated_at = now()
                   WHERE id = %s""",
                [
                    reason,
                    confidence,
                    result.get("reasoning", ""),
                    json.dumps(result.get("tags", [])),
                    action,
                    job_id,
                ],
            )

            # If auto-restored, reset job status
            if action == "auto_restored":
                cur.execute(
                    "UPDATE jobs SET status = 'enhanced', updated_at = now() WHERE id = %s",
                    [job_id],
                )

        conn.commit()

        final = {
            **result,
            "action": action,
            "job_id": job_id,
        }
        return {
            "final_result": final,
            "stats": {
                "reason": reason,
                "confidence": confidence,
                "action": action,
                "model": result.get("model", "unknown"),
                "passes": 2 if state.get("pass2_result") else 1,
            },
        }
    finally:
        conn.close()

import json
import os

from langchain_openai import ChatOpenAI

from .models import Job, JobClassification
from .prompts import build_messages

_llm: ChatOpenAI | None = None


def get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            temperature=0.3,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return _llm


def classify(job: Job) -> JobClassification:
    """Call DeepSeek once to classify both AI company and fully remote status."""
    messages = build_messages(job)
    response = get_llm().invoke(messages)

    try:
        raw = json.loads(response.content)
    except json.JSONDecodeError as e:
        # Fallback on malformed JSON
        return JobClassification(
            job_id=job["id"],
            company_name=job.get("company_name", "Unknown"),
            job_url=job.get("url"),
            is_ai_company=False,
            is_fully_remote=False,
            ai_confidence="low",
            remote_confidence="low",
            ai_reason=f"Parse error: {e}",
            remote_reason=f"Parse error: {e}",
        )

    return JobClassification(
        job_id=job["id"],
        company_name=job.get("company_name", "Unknown"),
        job_url=job.get("url"),
        is_ai_company=bool(raw.get("is_ai_company", False)),
        is_fully_remote=bool(raw.get("is_fully_remote", False)),
        ai_confidence=raw.get("ai_confidence", "low"),
        remote_confidence=raw.get("remote_confidence", "low"),
        ai_reason=raw.get("ai_reason", ""),
        remote_reason=raw.get("remote_reason", ""),
    )

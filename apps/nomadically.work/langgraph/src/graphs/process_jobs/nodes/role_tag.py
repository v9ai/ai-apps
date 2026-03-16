"""Phase 2 — Role Tagging node.

Two-tier pipeline: keyword heuristic -> DeepSeek LLM fallback.
Ported from workers/process-jobs/src/entry.py.
"""

import json
import re

from src.config import get_llm
from src.db.connection import get_connection
from src.db.queries import fetch_enhanced_jobs
from src.db.mutations import persist_role_tags
from src.models.role_tagging import JobRoleTags
from ..prompts import ROLE_TAGGING_PROMPT

# Keywords that signal a hard non-target role — prevents false positives
# when backend job descriptions incidentally mention ML tooling.
_NON_TARGET_PATTERN = re.compile(
    r"\b(backend engineer|java developer|\.net developer|devops engineer"
    r"|data analyst|sre|site reliability)\b"
)


def _keyword_role_tag(job: dict) -> JobRoleTags | None:
    """Tier 1: fast keyword heuristic — no LLM calls.

    Returns a high-confidence JobRoleTags when signals are clear, or None
    to indicate the caller should escalate to Tier 2 (DeepSeek).
    """
    title = (job.get("title") or "").lower()
    # Truncate description to avoid re scanning huge strings for simple patterns
    desc = (job.get("description") or "")[:5000].lower()
    text = f"{title}\n{desc}"

    # Hard exclusion — explicit non-target backend/infra roles (title only
    # to avoid false drops from incidental mentions in descriptions)
    if _NON_TARGET_PATTERN.search(title):
        return JobRoleTags(
            isFrontendReact=False,
            isAIEngineer=False,
            confidence="high",
            reason="Heuristic: explicit non-target role",
        )

    # Frontend / React signals (need both tech + role signal to be high-confidence)
    has_react = bool(re.search(r"\breact(\.js)?\b", text)) or "next.js" in text
    has_frontend = bool(re.search(r"\b(frontend|ui engineer|web ui)\b", text))

    # AI Engineer signals — broad title matching + stack confirmation
    has_ai_title = bool(re.search(
        r"\b(ai engineer|ml engineer|llm engineer|ai/ml|mlops"
        r"|data scientist|applied scientist|research engineer|research scientist"
        r"|nlp engineer|computer vision|genai|generative ai|prompt engineer"
        r"|ai architect|ml platform|machine learning engineer"
        r"|ai infrastructure|deep learning"
        r"|foundation model|ai specialist|ml specialist|llm specialist"
        r"|ai product|ai software|ml software|ai developer|ml developer"
        r"|intelligence engineer|language model|model engineer"
        r"|ai lead|ml lead|head of ai|head of ml)\b", text
    ))
    has_ai_stack = any(
        x in text for x in
        ["machine learning", "llm", "rag", "embedding", "vector db", "fine-tun",
         "pytorch", "tensorflow", "langchain", "hugging face", "transformers",
         "openai", "anthropic", "claude", "gpt-", "neural network",
         "deep learning", "reinforcement learning", "natural language processing",
         "computer vision", "model training", "model serving", "mlflow",
         "weights & biases", "wandb", "feature store", "model deploy",
         "vllm", "ollama", "mistral", "llama", "gemini", "vertex ai",
         "sagemaker", "bedrock", "azure openai", "semantic kernel",
         "vector search", "retrieval augmented", "knowledge graph",
         "diffusion model", "stable diffusion", "multimodal"]
    )

    if has_react and has_frontend:
        return JobRoleTags(
            isFrontendReact=True,
            isAIEngineer=bool(has_ai_title and has_ai_stack),  # dual-role allowed
            confidence="high",
            reason="Heuristic: React + frontend keywords",
        )

    if has_ai_title and has_ai_stack:
        return JobRoleTags(
            isFrontendReact=False,
            isAIEngineer=True,
            confidence="high",
            reason="Heuristic: AI engineer title + stack keywords",
        )

    return None  # Ambiguous — escalate to LLM


def _normalise_role_keys(raw: dict) -> dict:
    """Map alternate key spellings from different LLMs into the JobRoleTags schema.

    Some models return snake_case, others return camelCase, and some add
    extra underscores or drop the 'is' prefix. This covers the common variants.
    """
    KEY_MAP = {
        "frontend_react":    "isFrontendReact",
        "is_frontend_react": "isFrontendReact",
        "frontend":          "isFrontendReact",
        "react":             "isFrontendReact",
        "ai_engineer":       "isAIEngineer",
        "is_ai_engineer":    "isAIEngineer",
        "ai":                "isAIEngineer",
        "ml_engineer":       "isAIEngineer",
    }
    return {KEY_MAP.get(k, k): v for k, v in raw.items()}


def _tag_with_deepseek(job: dict) -> JobRoleTags | None:
    """Tier 2: DeepSeek role tagging via langchain LCEL chain.

    Returns a validated JobRoleTags or None on any failure.
    """
    llm = get_llm()
    chain = ROLE_TAGGING_PROMPT | llm

    try:
        response = chain.invoke({
            "title": job.get("title", "N/A"),
            "location": job.get("location") or "Not specified",
            "description": (job.get("description") or "")[:6000],
        })
        raw = json.loads(response.content)
        normalised = _normalise_role_keys(raw)
        return JobRoleTags.from_dict(normalised)
    except Exception as e:
        print(f"    DeepSeek role tag failed: {e}")
        return None


def role_tag_jobs_node(state: dict) -> dict:
    """Phase 2 node: tag target roles for enhanced jobs."""
    conn = get_connection()
    rows = fetch_enhanced_jobs(conn, state.get("limit", 100))
    print(f"  Found {len(rows)} jobs to role-tag")

    stats = {"processed": 0, "targetRole": 0, "irrelevant": 0, "errors": 0}

    for job in rows:
        try:
            tags = _keyword_role_tag(job)
            source = "heuristic"

            if tags is None or tags.confidence != "high":
                ds_tags = _tag_with_deepseek(job)
                if ds_tags:
                    tags = ds_tags
                    source = "deepseek"

            if tags is None:
                tags = JobRoleTags(confidence="low", reason="All tiers failed")
                source = "none"

            is_target = tags.isFrontendReact or tags.isAIEngineer
            next_status = (
                "role-nomatch"
                if (not is_target and tags.confidence == "high")
                else "role-match"
            )

            persist_role_tags(
                conn,
                job["id"],
                tags.isFrontendReact,
                tags.isAIEngineer,
                tags.confidence,
                tags.reason,
                source,
                next_status,
            )

            stats["processed"] += 1
            if next_status == "role-nomatch":
                stats["irrelevant"] += 1
            elif is_target:
                stats["targetRole"] += 1
        except Exception as e:
            print(f"    Error tagging {job.get('id')}: {e}")
            stats["errors"] += 1

    conn.close()
    return {"phase_results": [{"phase": "role_tag", **stats}]}

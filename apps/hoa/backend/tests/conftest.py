"""Shared fixtures for deepeval-powered LangGraph podcast research tests.

Provides:
- Sample research JSON loaded from disk (or inline fallback)
- Personality fixtures
- Metric factories for common deepeval metrics
- LangGraph graph builder fixture
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any

import pytest

try:
    from deepeval.models import DeepEvalBaseLLM
    _HAS_DEEPEVAL = True
except (ImportError, TypeError):
    _HAS_DEEPEVAL = False
    DeepEvalBaseLLM = object  # type: ignore[misc,assignment]

# Ensure backend modules are importable
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

RESEARCH_DIR = PROJECT_ROOT / "src" / "lib" / "research"
PERSONALITIES_DIR = PROJECT_ROOT / "personalities"


# ── Shared MLX eval model (used by fixtures below) ──────────────────────

class _MLXEvalModel(DeepEvalBaseLLM):  # type: ignore[misc]
    """Local MLX model for all GEval tests — fully offline, no API keys."""

    def __init__(self):
        self._model_name = os.environ.get("MLX_MODEL", "mlx-community/Qwen2.5-7B-Instruct-4bit")
        if _HAS_DEEPEVAL:
            super().__init__(model=self._model_name)
        self._client = None

    def _get_client(self):
        if self._client is None:
            from mlx_client import MLXClient, MLXConfig
            self._client = MLXClient(MLXConfig(
                default_temperature=0.0,
                default_max_tokens=2048,
            ))
        return self._client

    def load_model(self):
        return self

    def get_model_name(self) -> str:
        return self._model_name

    def _call_sync(self, prompt: str) -> str:
        from mlx_client import ChatMessage
        client = self._get_client()
        resp = asyncio.get_event_loop().run_until_complete(
            client.chat([ChatMessage(role="user", content=prompt)])
        )
        return resp.choices[0].message.content

    def generate(self, prompt: str, **kwargs) -> str:
        return self._call_sync(prompt)

    async def a_generate(self, prompt: str, **kwargs) -> str:
        from mlx_client import ChatMessage
        client = self._get_client()
        resp = await client.chat([ChatMessage(role="user", content=prompt)])
        return resp.choices[0].message.content


_shared_eval_model = None


def _get_shared_eval_model():
    global _shared_eval_model
    if _shared_eval_model is None:
        _shared_eval_model = _MLXEvalModel()
    return _shared_eval_model


# ── sample research data (inline fallback) ──────────────────────────────

SAMPLE_RESEARCH: dict[str, Any] = {
    "slug": "harrison-chase",
    "name": "Harrison Chase",
    "generated_at": "2026-03-19T00:00:00+00:00",
    "bio": (
        "Harrison Chase is the CEO and co-founder of LangChain, the dominant open-source "
        "LLM orchestration framework with 100k+ GitHub stars. He coined the term 'context "
        "engineering' and published SPADE and PROMPTEVALS papers on data quality assertions "
        "for LLM pipelines. Before LangChain, he worked at Robust Intelligence and Kensho."
    ),
    "executive_summary": {
        "one_liner": "Creator of LangChain, the most widely adopted LLM orchestration framework",
        "key_facts": [
            "LangChain has 100k+ GitHub stars and is used by thousands of companies",
            "Raised $25M Series A led by Sequoia in 2023",
            "Coined 'context engineering' as a discipline for agent builders",
        ],
        "career_arc": "From Kensho and Robust Intelligence to founding LangChain in late 2022.",
        "current_focus": "LangGraph for stateful multi-agent systems and LangSmith for observability.",
        "industry_significance": "Pioneered the LLM orchestration category.",
        "risk_factors": ["Intense competition from LlamaIndex, Semantic Kernel, etc."],
        "meeting_prep": [
            "Ask about context engineering vs prompt engineering",
            "Discuss LangGraph's approach to multi-agent coordination",
            "His views on the future of AI developer tooling",
        ],
        "confidence_level": "high",
    },
    "topics": [
        "LLM orchestration",
        "context engineering",
        "RAG pipelines",
        "agentic systems",
        "multi-agent coordination",
        "LLM observability",
        "data quality assertions",
    ],
    "timeline": [
        {"date": "2022-10", "event": "Founded LangChain", "url": "https://github.com/langchain-ai/langchain"},
        {"date": "2023-04", "event": "Raised $25M Series A led by Sequoia", "url": "https://techcrunch.com/langchain"},
        {"date": "2024-01", "event": "Published SPADE paper on arXiv (LangChain data-quality research)", "url": "https://arxiv.org/abs/2401.03038"},
        {"date": "2024-06", "event": "Launched LangGraph for multi-agent systems", "url": "https://langchain-ai.github.io/langgraph/"},
    ],
    "key_contributions": [
        {
            "title": "LangChain",
            "description": "Open-source LLM orchestration framework with 100k+ stars, used by thousands of companies for RAG, agents, and chains.",
            "url": "https://github.com/langchain-ai/langchain",
        },
        {
            "title": "LangGraph",
            "description": "Stateful multi-agent framework enabling cyclic computation graphs for complex agent workflows.",
            "url": "https://github.com/langchain-ai/langgraph",
        },
        {
            "title": "LangSmith",
            "description": "LLM observability and testing platform for debugging, monitoring, and evaluating LLM applications.",
            "url": "https://smith.langchain.com",
        },
    ],
    "quotes": [
        {
            "text": "The key insight is that context engineering is the new prompt engineering.",
            "source": "Sequoia Training Data Podcast",
            "url": "https://example.com/sequoia-podcast",
        },
        {
            "text": "We built LangChain because we saw developers reinventing the same patterns.",
            "source": "This Week in Startups",
            "url": "https://example.com/twis-episode",
        },
    ],
    "social": {
        "github": "https://github.com/hwchase17",
        "twitter": "https://x.com/hwchase17",
        "linkedin": "https://linkedin.com/in/harrison-chase",
        "website": "https://langchain.com",
    },
    "podcast_appearances": [
        {"show": "Sequoia Training Data", "title": "LangChain and Context Engineering", "date": "2025-06", "topics": ["context engineering", "agents"], "url": "https://example.com/sequoia"},
        {"show": "This Week in Startups", "title": "Building the AI Stack", "date": "2025-03", "topics": ["LangChain", "developer tools"], "url": "https://example.com/twis"},
    ],
    "news": [
        {"headline": "LangChain Raises $25M Series A", "source": "TechCrunch", "date": "2023-04-15", "category": "Funding", "summary": "LangChain raises Series A led by Sequoia.", "url": "https://techcrunch.com/langchain"},
    ],
    "videos": [
        {
            "title": "Harrison Chase: Building LangChain and the Future of AI Agents",
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "platform": "YouTube",
            "date": "2025-03-15",
            "duration": "45:32",
            "channel": "AI Engineer Summit",
            "description": "Harrison Chase discusses LangChain, LangGraph, and context engineering at AI Engineer Summit 2025.",
        },
        {
            "title": "Context Engineering Deep Dive with Harrison Chase",
            "url": "https://www.youtube.com/watch?v=abc123def45",
            "platform": "YouTube",
            "date": "2025-06-20",
            "duration": "1:12:45",
            "channel": "Latent Space Podcast",
            "description": "Deep technical discussion about context engineering principles and how they differ from prompt engineering.",
        },
    ],
    "competitive_landscape": {
        "market_position": "leader",
        "competitors": [
            {"name": "LlamaIndex", "relationship": "direct competitor", "differentiation": "LangChain focuses on orchestration, LlamaIndex on data indexing"},
        ],
        "moats": ["First-mover advantage", "Massive community", "Comprehensive tooling"],
        "ecosystem_role": "Central orchestration layer in the LLM application stack.",
    },
    "collaboration_network": {
        "co_founders": ["Ankush Gola"],
        "key_collaborators": [{"name": "Ankush Gola", "relationship": "co-founder", "context": "LangChain"}],
        "mentors": [],
        "mentees": [],
        "academic_lineage": "N/A — industry practitioner",
    },
    "funding": {
        "funding_rounds": [
            {"date": "2023-04", "round": "Series A", "amount": "$25M", "investors": ["Sequoia"], "valuation": "$200M"},
        ],
        "total_raised": "$35M",
        "latest_valuation": "$200M",
        "business_milestones": [{"date": "2023-01", "event": "LangChain Inc incorporated"}],
        "revenue_signals": "Enterprise customers including major tech companies",
    },
    "conferences": {
        "speaking_tier": "thought-leader",
        "talks": [
            {"event": "AI Engineer Summit 2024", "title": "Context Engineering", "date": "2024-10", "type": "keynote", "url": "https://example.com/aies"},
        ],
        "notable_moments": ["Coined 'context engineering' at AI Engineer Summit"],
    },
    "technical_philosophy": {
        "core_thesis": "Context engineering — not prompt engineering — is the key discipline for building reliable LLM applications.",
        "positions": {
            "open_source": {"stance": "Strong advocate", "evidence": "LangChain is MIT licensed", "source_url": "https://github.com/langchain-ai/langchain"},
        },
        "predictions": [{"prediction": "Agents will replace most SaaS workflows", "date_made": "2024-06", "timeframe": "2-3 years"}],
        "contrarian_takes": ["Context engineering matters more than model improvements"],
    },
    "questions": [
        {
            "category": "origin",
            "question": "You left Kensho and Robust Intelligence for a side project that became LangChain in weeks. What signal told you this was worth burning your career safety net?",
            "why_this_question": "Reveals the founder's risk calculus at the critical inflection point.",
            "expected_insight": "A concrete anecdote about the moment of commitment, not a retrospective rationalization.",
        },
        {
            "category": "origin",
            "question": "LangChain went from zero to 100k GitHub stars faster than almost any dev tool. What was the single most important design decision in the first 30 days?",
            "why_this_question": "Identifies the architectural bet that unlocked viral adoption.",
            "expected_insight": "A specific technical or product choice, e.g., chain composability or the agent abstraction.",
        },
        {
            "category": "philosophy",
            "question": "LangGraph introduces cyclic computation graphs for agents — a sharp departure from LangChain's DAG model. What production failure pattern forced that architectural shift?",
            "why_this_question": "Exposes the real-world limitations that drove the new abstraction.",
            "expected_insight": "A concrete use case where DAG-based chains failed, leading to the stateful graph model.",
        },
        {
            "category": "collaboration",
            "question": "Your SPADE paper argues for automated data quality assertions in LLM pipelines. What's the most counterintuitive assertion type that catches bugs traditional tests miss?",
            "why_this_question": "Connects his academic work to practical engineering value.",
            "expected_insight": "A specific assertion category from SPADE with a real example of a caught bug.",
        },
        {
            "category": "philosophy",
            "question": "You coined 'context engineering' to replace 'prompt engineering.' What's the most dangerous misconception developers still hold because of the old framing?",
            "why_this_question": "Forces articulation of the intellectual gap between the two paradigms.",
            "expected_insight": "A concrete anti-pattern that context engineering solves but prompt engineering ignores.",
        },
        {
            "category": "philosophy",
            "question": "You've said agents will replace most SaaS workflows in 2-3 years. Which SaaS category do you think disappears first, and why can't the incumbents adapt?",
            "why_this_question": "Tests whether the prediction has specific supporting logic, not just hype.",
            "expected_insight": "A named SaaS category with a structural reason why agents outcompete it.",
        },
        {
            "category": "collaboration",
            "question": "Sequoia led your $25M Series A when LangChain was months old. What did they see in the open-source metrics that convinced them before you had revenue?",
            "why_this_question": "Reveals the VC signal-reading that validated the project early.",
            "expected_insight": "Specific metrics or community signals that translated into investor conviction.",
        },
        {
            "category": "collaboration",
            "question": "You and Ankush Gola co-founded LangChain. How do you divide the technical-vs-commercial decision space, and where has that boundary been tested?",
            "why_this_question": "Probes co-founder dynamics that shape product direction.",
            "expected_insight": "A concrete example of a disagreement or division-of-labor challenge.",
        },
        {
            "category": "future",
            "question": "LangSmith is your observability play. Do you see a future where LLM observability is a standalone category or does it get absorbed into existing APM tools like Datadog?",
            "why_this_question": "Tests his market thesis for the commercial product.",
            "expected_insight": "A structural argument for why LLM observability is or isn't a durable standalone market.",
        },
        {
            "category": "future",
            "question": "If context windows keep doubling yearly, does RAG become obsolete — or does retrieval get more important, not less? Where does LangChain bet?",
            "why_this_question": "Creates productive tension between two plausible futures for his core product.",
            "expected_insight": "A nuanced position on how retrieval evolves rather than a binary yes/no.",
        },
    ],
    "sources": [],
}


@pytest.fixture
def sample_research() -> dict[str, Any]:
    """Return the inline sample research profile."""
    return SAMPLE_RESEARCH.copy()


@pytest.fixture
def sample_bio() -> str:
    return SAMPLE_RESEARCH["bio"]


@pytest.fixture
def sample_timeline() -> list[dict]:
    return list(SAMPLE_RESEARCH["timeline"])


@pytest.fixture
def sample_contributions() -> list[dict]:
    return list(SAMPLE_RESEARCH["key_contributions"])


@pytest.fixture
def sample_quotes() -> list[dict]:
    return list(SAMPLE_RESEARCH["quotes"])


@pytest.fixture
def sample_social() -> dict:
    return dict(SAMPLE_RESEARCH["social"])


@pytest.fixture
def sample_topics() -> list[str]:
    return list(SAMPLE_RESEARCH["topics"])


@pytest.fixture
def sample_executive() -> dict:
    return dict(SAMPLE_RESEARCH["executive_summary"])


@pytest.fixture
def sample_competitive() -> dict:
    return dict(SAMPLE_RESEARCH["competitive_landscape"])


@pytest.fixture
def sample_collaboration() -> dict:
    return dict(SAMPLE_RESEARCH["collaboration_network"])


@pytest.fixture
def sample_funding() -> dict:
    return dict(SAMPLE_RESEARCH["funding"])


@pytest.fixture
def sample_conferences() -> dict:
    return dict(SAMPLE_RESEARCH["conferences"])


@pytest.fixture
def sample_philosophy() -> dict:
    return dict(SAMPLE_RESEARCH["technical_philosophy"])


@pytest.fixture
def sample_podcasts() -> list[dict]:
    return list(SAMPLE_RESEARCH["podcast_appearances"])


@pytest.fixture
def sample_news() -> list[dict]:
    return list(SAMPLE_RESEARCH["news"])


@pytest.fixture
def sample_videos() -> list[dict]:
    return list(SAMPLE_RESEARCH["videos"])


@pytest.fixture
def sample_questions() -> list[dict]:
    return [dict(q) for q in SAMPLE_RESEARCH["questions"]]


# ── load real research files from disk ──────────────────────────────────

@pytest.fixture
def all_research_files() -> list[Path]:
    """Return paths to all research JSON files on disk."""
    if not RESEARCH_DIR.exists():
        return []
    return sorted(RESEARCH_DIR.glob("*.json"))


@pytest.fixture
def all_research_data(all_research_files) -> list[dict]:
    """Load and return all research JSON data from disk."""
    data = []
    for path in all_research_files:
        if path.name.endswith(".eval.json") or path.name.endswith("-timeline.json"):
            continue
        try:
            data.append(json.loads(path.read_text()))
        except Exception:
            pass
    return data


# ── personality loading ─────────────────────────────────────────────────

@pytest.fixture
def all_personality_slugs() -> list[str]:
    """Return all personality slugs from the personalities/ directory."""
    if not PERSONALITIES_DIR.exists():
        return []
    return sorted(p.stem for p in PERSONALITIES_DIR.glob("*.ts"))


# ── person context for task descriptions ────────────────────────────────

@pytest.fixture
def sample_person() -> dict[str, str]:
    return {
        "slug": "harrison-chase",
        "name": "Harrison Chase",
        "role": "CEO",
        "org": "LangChain",
        "github": "hwchase17",
        "orcid": "",
    }


# ── deepeval metric helpers ─────────────────────────────────────────────

@pytest.fixture
def deepeval_model():
    """Return a shared MLX eval model instance for GEval metrics."""
    return _get_shared_eval_model()

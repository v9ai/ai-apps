"""Shared fixtures for deepeval-powered LangGraph podcast research tests.

Provides:
- Sample research JSON loaded from disk (or inline fallback)
- Personality fixtures
- Metric factories for common deepeval metrics
- LangGraph graph builder fixture
"""

import json
import os
import sys
from pathlib import Path
from typing import Any

import pytest

# Ensure backend modules are importable
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

RESEARCH_DIR = PROJECT_ROOT / "src" / "lib" / "research"
PERSONALITIES_DIR = PROJECT_ROOT / "personalities"


# ── Load DEEPSEEK_API_KEY from .env files if not already set ────────────

def _load_env_key(key: str):
    if os.getenv(key):
        return
    # Search up from project root, plus sibling directories that may have the key
    mono_root = PROJECT_ROOT.parent.parent  # ai-apps/
    search_dirs = [
        PROJECT_ROOT,                         # apps/podcasts/
        PROJECT_ROOT.parent,                  # apps/
        mono_root,                            # ai-apps/
        mono_root / "langgraph",              # ai-apps/langgraph/
    ]
    for d in search_dirs:
        for name in (".env", ".env.local"):
            env_file = d / name
            if not env_file.exists():
                continue
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                if k.strip() == key and v.strip().strip("\"'"):
                    os.environ[key] = v.strip().strip("\"'")
                    return


_load_env_key("DEEPSEEK_API_KEY")


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
        {"date": "2024-01", "event": "Published SPADE paper on arXiv", "url": "https://arxiv.org/abs/2401.03038"},
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
def deepeval_model() -> str:
    """Return the model string for deepeval metrics.

    Uses DEEPEVAL_MODEL env var, falls back to deepseek.
    """
    return os.getenv("DEEPEVAL_MODEL", "deepseek/deepseek-chat")

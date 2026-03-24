"""Shared ChatOpenAI factory functions for all LangGraph graphs.

Consolidates model construction that was previously duplicated across
editorial/models.py, agent.py, rag_agent.py, and rag_pipeline.py.
"""

import os
import threading
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)

_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
_BASE_URL = "https://api.deepseek.com"

_reasoner: ChatOpenAI | None = None
_reasoner_lock = threading.Lock()
_fast: ChatOpenAI | None = None
_fast_lock = threading.Lock()


def build_reasoner() -> ChatOpenAI:
    """Reasoner model (temperature=0). Used by Researcher, Writer, Editor, and agents."""
    global _reasoner
    if _reasoner is None:
        with _reasoner_lock:
            if _reasoner is None:
                _reasoner = ChatOpenAI(
                    model="deepseek-chat",
                    base_url=_BASE_URL,
                    api_key=_API_KEY,
                    temperature=0,
                )
    return _reasoner


def build_fast() -> ChatOpenAI:
    """Fast model (temperature=0.3). Used by SEO and Intro Strategist nodes."""
    global _fast
    if _fast is None:
        with _fast_lock:
            if _fast is None:
                _fast = ChatOpenAI(
                    model="deepseek-chat",
                    base_url=_BASE_URL,
                    api_key=_API_KEY,
                    temperature=0.3,
                )
    return _fast

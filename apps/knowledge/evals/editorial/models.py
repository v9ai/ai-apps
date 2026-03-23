"""ChatOpenAI factory functions for DeepSeek-based model routing."""

import os
import threading
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)


_reasoner: ChatOpenAI | None = None
_reasoner_lock: threading.Lock = threading.Lock()
_fast: ChatOpenAI | None = None
_fast_lock: threading.Lock = threading.Lock()


def build_reasoner() -> ChatOpenAI:
    """Reasoner model for Researcher, Writer, and Editor nodes. Cached."""
    global _reasoner
    if _reasoner is None:
        with _reasoner_lock:
            if _reasoner is None:
                _reasoner = ChatOpenAI(
                    model="deepseek-chat",
                    base_url="https://api.deepseek.com",
                    api_key=os.environ["DEEPSEEK_API_KEY"],
                    temperature=0,
                )
    return _reasoner


def build_fast() -> ChatOpenAI:
    """Fast model for SEO and Intro Strategist nodes. Cached."""
    global _fast
    if _fast is None:
        with _fast_lock:
            if _fast is None:
                _fast = ChatOpenAI(
                    model="deepseek-chat",
                    base_url="https://api.deepseek.com",
                    api_key=os.environ["DEEPSEEK_API_KEY"],
                    temperature=0.3,
                )
    return _fast

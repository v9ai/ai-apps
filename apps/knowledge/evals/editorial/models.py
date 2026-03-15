"""ChatOpenAI factory functions for DeepSeek-based model routing."""

import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)


def build_reasoner() -> ChatOpenAI:
    """Reasoner model for Researcher, Writer, and Editor nodes."""
    return ChatOpenAI(
        model="deepseek-chat",
        base_url="https://api.deepseek.com",
        api_key=os.environ["DEEPSEEK_API_KEY"],
        temperature=0,
    )


def build_fast() -> ChatOpenAI:
    """Fast model for SEO node."""
    return ChatOpenAI(
        model="deepseek-chat",
        base_url="https://api.deepseek.com",
        api_key=os.environ["DEEPSEEK_API_KEY"],
        temperature=0.3,
    )

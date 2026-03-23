"""Local LangGraph agent for knowledge-base Q&A.

Uses DeepSeek as the LLM. Stateless (no checkpointer) — each eval invocation starts fresh.
"""

import os
import threading
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)

SYSTEM_PROMPT = (
    "You are a knowledgeable AI research assistant. "
    "Answer questions about AI, machine learning, and deep learning. "
    "Be concise, factual, and cite specific papers or results when possible."
)

# Compiled graph is stateless — build once and reuse across eval invocations.
_agent = None
_agent_lock = threading.Lock()


def build_agent():
    """Return the cached LangGraph ReAct agent, creating it on first call."""
    global _agent
    if _agent is None:
        with _agent_lock:
            if _agent is None:
                llm = ChatOpenAI(
                    model="deepseek-chat",
                    base_url="https://api.deepseek.com",
                    api_key=os.environ["DEEPSEEK_API_KEY"],
                    temperature=0,
                )
                _agent = create_react_agent(model=llm, tools=[], prompt=SYSTEM_PROMPT)
    return _agent

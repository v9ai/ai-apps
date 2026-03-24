"""Local LangGraph agent for knowledge-base Q&A.

Uses DeepSeek as the LLM. Stateless (no checkpointer) — each eval invocation starts fresh.
"""

import threading

from langgraph.prebuilt import create_react_agent

from models import build_reasoner

SYSTEM_PROMPT = (
    "You are a knowledgeable AI research assistant. "
    "Answer questions about AI, machine learning, and deep learning. "
    "Be concise, factual, and cite specific results when possible."
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
                _agent = create_react_agent(model=build_reasoner(), tools=[], prompt=SYSTEM_PROMPT)
    return _agent

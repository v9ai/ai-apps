"""Target callback wrappers for deepteam red-teaming.

Each callback matches deepteam's CallbackType:
    (input: str, turns: Optional[List[RTTurn]]) -> RTTurn
"""

import sys
import threading
from pathlib import Path

from deepteam.test_case.test_case import RTTurn

# Ensure the evals directory is on the path for sibling imports
_evals_dir = str(Path(__file__).resolve().parent.parent)
if _evals_dir not in sys.path:
    sys.path.insert(0, _evals_dir)

from agent import build_agent  # noqa: E402
from editorial.graph import build_journalism_graph  # noqa: E402

# Cache agent instances — attack_worker nodes run in parallel via Send().
_agent = None
_agent_lock: threading.Lock = threading.Lock()
_editorial = None
_editorial_lock: threading.Lock = threading.Lock()


def _get_agent():
    global _agent
    if _agent is None:
        with _agent_lock:
            if _agent is None:
                _agent = build_agent()
    return _agent


def _get_editorial():
    global _editorial
    if _editorial is None:
        with _editorial_lock:
            if _editorial is None:
                _editorial = build_journalism_graph()
    return _editorial


def _extract_ai_response(result: dict) -> str:
    messages = result.get("messages", [])
    for msg in reversed(messages):
        content = getattr(msg, "content", None) or ""
        if content and getattr(msg, "type", None) == "ai":
            return content
    return ""


def eval_agent_callback(input: str, turns=None) -> RTTurn:
    """Invoke the knowledge eval agent with adversarial input."""
    agent = _get_agent()
    result = agent.invoke({"messages": [("user", input)]})
    content = _extract_ai_response(result)
    return RTTurn(role="assistant", content=content)


def editorial_callback(input: str, turns=None) -> RTTurn:
    """Invoke the editorial pipeline with adversarial topic."""
    graph = _get_editorial()
    result = graph.invoke({
        "topic": input,
        "slug": "redteam-test",
        "revision_rounds": 0,
        "approved": False,
    })
    draft = result.get("draft", "")
    return RTTurn(role="assistant", content=draft)

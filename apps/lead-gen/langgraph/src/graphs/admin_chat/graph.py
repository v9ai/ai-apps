"""Admin Chat StateGraph.

Flow: START → generate → END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import generate_node
from .state import AdminChatState


def build_admin_chat_graph():
    builder = StateGraph(AdminChatState)
    builder.add_node("generate", generate_node)
    builder.add_edge(START, "generate")
    builder.add_edge("generate", END)
    return builder.compile()

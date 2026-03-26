"""Email Reply StateGraph.

Flow: START → generate_reply → END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import generate_reply_node
from .state import EmailReplyState


def build_email_reply_graph():
    builder = StateGraph(EmailReplyState)
    builder.add_node("generate_reply", generate_reply_node)
    builder.add_edge(START, "generate_reply")
    builder.add_edge("generate_reply", END)
    return builder.compile()

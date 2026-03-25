"""Email Compose StateGraph.

Flow: START → compose_email → END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import compose_email_node
from .state import EmailComposeState


def build_email_compose_graph():
    builder = StateGraph(EmailComposeState)
    builder.add_node("compose_email", compose_email_node)
    builder.add_edge(START, "compose_email")
    builder.add_edge("compose_email", END)
    return builder.compile()

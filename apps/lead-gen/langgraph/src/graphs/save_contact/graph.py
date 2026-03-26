"""Save Contact StateGraph.

Flow: START ──→ save_contact ──→ END

Upserts a contact into the DB from LinkedIn post data.
"""

from langgraph.graph import END, START, StateGraph

from .nodes import save_contact_node
from .state import SaveContactState


def build_save_contact_graph():
    builder = StateGraph(SaveContactState)

    builder.add_node("save_contact", save_contact_node)

    builder.add_edge(START, "save_contact")
    builder.add_edge("save_contact", END)

    return builder.compile()

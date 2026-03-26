"""LinkedIn Contact StateGraph.

Flow: START --> analyze_profile --> [gate]
                                      |-- relevant --> save_contact --> END
                                      |-- skip --> END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import (
    analyze_profile_node,
    route_after_analysis,
    save_contact_node,
    skip_node,
)
from .state import LinkedInContactState


def build_linkedin_contact_graph():
    builder = StateGraph(LinkedInContactState)

    builder.add_node("analyze_profile", analyze_profile_node)
    builder.add_node("save_contact", save_contact_node)
    builder.add_node("skip", skip_node)

    builder.add_edge(START, "analyze_profile")
    builder.add_conditional_edges(
        "analyze_profile",
        route_after_analysis,
        {"save_contact": "save_contact", "skip": "skip"},
    )
    builder.add_edge("save_contact", END)
    builder.add_edge("skip", END)

    return builder.compile()

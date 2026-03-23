"""Email Outreach StateGraph.

Flow:
    START ──→ research_contact ──┐
         ├──→ research_company ──┼──→ draft_email ──→ refine_email ──→ END
         └──→ analyze_post ──────┘

Phase 1 (parallel): research_contact + research_company + analyze_post (~5s)
Phase 2: draft_email waits for all three (~5s)
Phase 3: refine_email self-critiques and improves (~5s)
"""

from langgraph.graph import END, START, StateGraph

from .nodes import (
    analyze_post_node,
    draft_email_node,
    refine_email_node,
    research_company_node,
    research_contact_node,
)
from .state import EmailOutreachState


def build_email_outreach_graph():
    builder = StateGraph(EmailOutreachState)

    builder.add_node("research_contact", research_contact_node)
    builder.add_node("research_company", research_company_node)
    builder.add_node("analyze_post", analyze_post_node)
    builder.add_node("draft_email", draft_email_node)
    builder.add_node("refine_email", refine_email_node)

    # Phase 1: three parallel research branches
    builder.add_edge(START, "research_contact")
    builder.add_edge(START, "research_company")
    builder.add_edge(START, "analyze_post")

    # Phase 2: draft waits for all three
    builder.add_edge("research_contact", "draft_email")
    builder.add_edge("research_company", "draft_email")
    builder.add_edge("analyze_post", "draft_email")

    # Phase 3: refine
    builder.add_edge("draft_email", "refine_email")
    builder.add_edge("refine_email", END)

    return builder.compile()

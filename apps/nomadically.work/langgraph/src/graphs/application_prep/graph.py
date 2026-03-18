"""Application Prep StateGraph — merged interview prep + tech knowledge pipeline.

Flow:
    START → parse_jd → extract_technologies → organize_hierarchy → [fan-out]
      → generate_questions (×4 categories)   ──┐
      → generate_content  (×N technologies)  ──┤
                                               └→ finalize → END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import (
    extract_technologies_node,
    finalize_node,
    generate_content_node,
    generate_questions_node,
    organize_hierarchy_node,
    parse_jd_node,
    route_all_work,
)
from .state import ApplicationPrepState


def build_application_prep_graph():
    builder = StateGraph(ApplicationPrepState)

    builder.add_node("parse_jd", parse_jd_node)
    builder.add_node("extract_technologies", extract_technologies_node)
    builder.add_node("organize_hierarchy", organize_hierarchy_node)
    builder.add_node("generate_questions", generate_questions_node)
    builder.add_node("generate_content", generate_content_node)
    builder.add_node("finalize", finalize_node)

    builder.add_edge(START, "parse_jd")
    builder.add_edge("parse_jd", "extract_technologies")
    builder.add_edge("extract_technologies", "organize_hierarchy")
    # Fan out — 4 interview question categories + N tech content lessons in parallel
    builder.add_conditional_edges(
        "organize_hierarchy",
        route_all_work,
        ["generate_questions", "generate_content", "finalize"],
    )
    builder.add_edge("generate_questions", "finalize")
    builder.add_edge("generate_content", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile()

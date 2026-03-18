"""Application Prep StateGraph — merged interview prep + tech knowledge pipeline.

Flow:
    START ──→ validate_urls ─────────────────┐
         ├──→ parse_jd ──────────────────────┤
         └──→ extract_technologies → organize ┤
                                              └→ [fan-out]
      → generate_questions (×4 categories)   ──┐
      → generate_content  (×N technologies)  ──┤
                                               └→ compile_report → persist_knowledge → sync_hierarchy → END

Phase 0 (parallel): validate_urls checks knowledge DB URL + connectivity
Phase 1 (parallel): parse_jd + extract_technologies run concurrently (both are LLM calls)
Phase 2: organize_hierarchy waits for all three, then fans out
Phase 3 (parallel): generate_questions + generate_content
Phase 4: compile_report assembles markdown from question_sets
Phase 5: persist_knowledge writes tech lessons to knowledge DB
Phase 6: sync_hierarchy renumbers lessons so each category is contiguous (fixes prev/next nav)
"""

from langgraph.graph import END, START, StateGraph

from .nodes import (
    compile_report_node,
    extract_technologies_node,
    generate_content_node,
    generate_questions_node,
    organize_hierarchy_node,
    parse_jd_node,
    persist_knowledge_node,
    route_all_work,
    sync_hierarchy_node,
    validate_urls_node,
)
from .state import ApplicationPrepState


def build_application_prep_graph():
    builder = StateGraph(ApplicationPrepState)

    builder.add_node("validate_urls", validate_urls_node)
    builder.add_node("parse_jd", parse_jd_node)
    builder.add_node("extract_technologies", extract_technologies_node)
    builder.add_node("organize_hierarchy", organize_hierarchy_node)
    builder.add_node("generate_questions", generate_questions_node)
    builder.add_node("generate_content", generate_content_node)
    builder.add_node("compile_report", compile_report_node)
    builder.add_node("persist_knowledge", persist_knowledge_node)
    builder.add_node("sync_hierarchy", sync_hierarchy_node)

    # Phase 0+1: validate URLs + two LLM calls in parallel
    builder.add_edge(START, "validate_urls")
    builder.add_edge(START, "parse_jd")
    builder.add_edge(START, "extract_technologies")

    # Phase 2: organize waits for all three parallel branches
    builder.add_edge("validate_urls", "organize_hierarchy")
    builder.add_edge("parse_jd", "organize_hierarchy")
    builder.add_edge("extract_technologies", "organize_hierarchy")

    # Phase 3: fan out questions (×4) + content (×N) in parallel
    builder.add_conditional_edges(
        "organize_hierarchy",
        route_all_work,
        ["generate_questions", "generate_content", "compile_report"],
    )
    builder.add_edge("generate_questions", "compile_report")
    builder.add_edge("generate_content", "compile_report")

    # Phase 4-6: compile report → persist → sync hierarchy
    builder.add_edge("compile_report", "persist_knowledge")
    builder.add_edge("persist_knowledge", "sync_hierarchy")
    builder.add_edge("sync_hierarchy", END)

    return builder.compile()

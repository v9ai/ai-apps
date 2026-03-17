from langgraph.graph import END, START, StateGraph

from .state import InterviewPrepState
from .nodes import (
    compile_report_node,
    generate_questions_node,
    parse_jd_node,
    route_to_categories,
)


def build_interview_prep_graph():
    builder = StateGraph(InterviewPrepState)

    builder.add_node("parse_jd", parse_jd_node)
    builder.add_node("generate_questions", generate_questions_node)
    builder.add_node("compile_report", compile_report_node)

    builder.add_edge(START, "parse_jd")
    # Fan out — 4 parallel DeepSeek calls, one per category
    builder.add_conditional_edges("parse_jd", route_to_categories, ["generate_questions"])
    builder.add_edge("generate_questions", "compile_report")
    builder.add_edge("compile_report", END)

    return builder.compile()

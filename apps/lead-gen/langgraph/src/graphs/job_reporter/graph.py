"""Job Reporter StateGraph — two-pass DeepSeek classification for reported jobs.

Ported from workers/job-reporter-llm (Python CF Worker).

Flow:
    START -> fetch_job -> pass1_classify -> [conditional: pass2 or persist]
    pass2_classify -> persist -> END
    persist -> END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import (
    fetch_job_node,
    pass1_classify_node,
    pass2_classify_node,
    persist_result_node,
    route_after_pass1,
)
from .state import JobReporterState


def build_job_reporter_graph():
    """Build and compile the job reporter StateGraph."""
    builder = StateGraph(JobReporterState)

    builder.add_node("fetch_job", fetch_job_node)
    builder.add_node("pass1_classify", pass1_classify_node)
    builder.add_node("pass2_classify", pass2_classify_node)
    builder.add_node("persist_result", persist_result_node)

    builder.add_edge(START, "fetch_job")
    builder.add_edge("fetch_job", "pass1_classify")
    builder.add_conditional_edges(
        "pass1_classify",
        route_after_pass1,
        {"pass2_classify": "pass2_classify", "persist_result": "persist_result"},
    )
    builder.add_edge("pass2_classify", "persist_result")
    builder.add_edge("persist_result", END)

    return builder.compile()

from langgraph.graph import END, START, StateGraph

from .models import PipelineState
from .nodes import aggregate_node, classify_job_node, fetch_jobs_node, route_to_classify


def build_graph():
    builder = StateGraph(PipelineState)

    builder.add_node("fetch_jobs", fetch_jobs_node)
    builder.add_node("classify_job", classify_job_node)
    builder.add_node("aggregate", aggregate_node)

    builder.add_edge(START, "fetch_jobs")
    # Fan out — parallel DeepSeek calls, one per job
    builder.add_conditional_edges("fetch_jobs", route_to_classify, ["classify_job", "aggregate"])
    builder.add_edge("classify_job", "aggregate")
    builder.add_edge("aggregate", END)

    return builder.compile()

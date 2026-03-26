"""Company Jobs StateGraph — fetch jobs for AI-tier companies.

Ported from workers/process-companies-cron.ts (Cloudflare Worker cron).

Flow:
    START -> fetch_ai_companies -> [conditional: fetch_jobs or END]
    fetch_jobs -> summarize -> END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import fetch_ai_companies_node, fetch_company_jobs_node, route_after_companies, summarize_node
from .state import CompanyJobsState


def build_company_jobs_graph():
    """Build and compile the company-jobs StateGraph."""
    builder = StateGraph(CompanyJobsState)

    builder.add_node("fetch_ai_companies", fetch_ai_companies_node)
    builder.add_node("fetch_jobs", fetch_company_jobs_node)
    builder.add_node("summarize", summarize_node)

    builder.add_edge(START, "fetch_ai_companies")
    builder.add_conditional_edges(
        "fetch_ai_companies",
        route_after_companies,
        {"fetch_jobs": "fetch_jobs", "__end__": END},
    )
    builder.add_edge("fetch_jobs", "summarize")
    builder.add_edge("summarize", END)

    return builder.compile()

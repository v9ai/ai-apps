"""Process Jobs — main 3-phase LangGraph StateGraph.

Pipeline lifecycle:
  new -> enhanced -> role-match -> skill-extracted
                  -> role-nomatch (terminal)

Phases:
  1. enhance       — Advance new jobs to enhanced status (new -> enhanced)
  2. role_tag      — Role tagging (enhanced -> role-match | role-nomatch)
  3. skill_extract — Skill tag extraction (role-match -> job_skill_tags populated)
"""

from langgraph.graph import END, START, StateGraph

from .state import ProcessJobsState
from .nodes.enhance import enhance_jobs_node
from .nodes.role_tag import role_tag_jobs_node
from .nodes.skill_extract import extract_skills_jobs_node


def build_process_jobs_graph():
    """Build and compile the 3-phase process-jobs StateGraph."""
    builder = StateGraph(ProcessJobsState)

    builder.add_node("enhance", enhance_jobs_node)
    builder.add_node("role_tag", role_tag_jobs_node)
    builder.add_node("skill_extract", extract_skills_jobs_node)

    builder.add_edge(START, "enhance")
    builder.add_edge("enhance", "role_tag")
    builder.add_edge("role_tag", "skill_extract")
    builder.add_edge("skill_extract", END)

    return builder.compile()

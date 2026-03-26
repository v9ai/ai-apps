"""Text-to-SQL StateGraph.

Flow: START → generate_sql → END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import generate_sql_node
from .state import TextToSqlState


def build_text_to_sql_graph():
    builder = StateGraph(TextToSqlState)
    builder.add_node("generate_sql", generate_sql_node)
    builder.add_edge(START, "generate_sql")
    builder.add_edge("generate_sql", END)
    return builder.compile()

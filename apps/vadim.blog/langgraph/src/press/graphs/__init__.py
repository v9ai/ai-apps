"""LangGraph pipeline graphs — registry and lazy exports.

Each ``build_*`` function accepts a ``ModelPool`` and returns a compiled
``CompiledStateGraph``.  The module-level ``*_graph`` variables are lazily
created on first access using ``ModelPool.from_env()``, making them
compatible with LangGraph API / Studio while keeping import-time side effects
to a minimum.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from langgraph.graph.state import CompiledStateGraph

from press.graphs.article import build_article_graph
from press.graphs.blog import build_blog_graph
from press.graphs.counter_article import build_counter_article_graph
from press.graphs.main import build_main_graph
from press.graphs.review import build_review_graph

# Re-export builders for direct use
__all__ = [
    "build_article_graph",
    "build_blog_graph",
    "build_counter_article_graph",
    "build_main_graph",
    "build_review_graph",
    "get_graph",
    "GRAPH_REGISTRY",
]

# ── Registry ─────────────────────────────────────────────────────────────────

GRAPH_REGISTRY: dict[str, str] = {
    "article": "press.graphs.article:build_article_graph",
    "blog": "press.graphs.blog:build_blog_graph",
    "counter": "press.graphs.counter_article:build_counter_article_graph",
    "review": "press.graphs.review:build_review_graph",
    "main": "press.graphs.main:build_main_graph",
}

_BUILDERS = {
    "article": build_article_graph,
    "blog": build_blog_graph,
    "counter": build_counter_article_graph,
    "review": build_review_graph,
}


def get_graph(name: str) -> "CompiledStateGraph":
    """Build and return a compiled graph by name using the default ModelPool."""
    from press.models import ModelPool

    if name == "main":
        from press.graphs.main import build_main_graph

        return build_main_graph(ModelPool.from_env())

    builder = _BUILDERS.get(name)
    if builder is None:
        available = ", ".join(sorted(_BUILDERS.keys()))
        raise KeyError(f"Unknown graph {name!r}. Available: {available}")
    return builder(ModelPool.from_env())


# ── Lazy module-level graphs for LangGraph API / Studio ──────────────────────

_lazy_cache: dict[str, "CompiledStateGraph"] = {}


def __getattr__(name: str) -> "CompiledStateGraph":
    _ATTR_TO_KEY = {
        "article_graph": "article",
        "blog_graph": "blog",
        "counter_graph": "counter",
        "review_graph": "review",
        "main_graph": "main",
    }
    key = _ATTR_TO_KEY.get(name)
    if key is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    if key not in _lazy_cache:
        _lazy_cache[key] = get_graph(key)
    return _lazy_cache[key]

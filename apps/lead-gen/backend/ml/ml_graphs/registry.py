"""Single source of truth for the ml container's LangGraph registry.

Both runtimes (``langgraph dev --config ml/langgraph.json`` on :8003 and the
FastAPI/Cloudflare Containers app at ``ml/app.py``) read graph identity from
this module. ``ml/langgraph.json`` is generated from ``GRAPHS`` via
``backend/scripts/gen_langgraph_json.py --container ml``; ``ml/app.py``
imports ``GRAPHS`` directly and surfaces each precompiled graph at lifespan
startup.

Both ml graphs are pure-compute leaves: each module compiles its graph at
import time and exposes only the ``graph`` symbol. There is no
``build_graph`` factory — the checkpointer is wired by the FastAPI lifespan
only as shape parity with ``core/``; in practice the ml graphs are stateless
and don't write checkpoints.

Keep this module dependency-free — it carries metadata only. Importing graph
modules here would drag torch / sentence-transformers into the JSON
generator's import path, blowing past the resolution check budget.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GraphSpec:
    assistant_id: str
    module: str
    compiled_attr: str = "graph"
    # ml graphs precompile at import time and don't accept a checkpointer.
    builder_attr: str | None = None


GRAPHS: tuple[GraphSpec, ...] = (
    GraphSpec("bge_m3_embed", "ml_graphs.bge_m3_embed"),
    GraphSpec("jobbert_ner", "ml_graphs.jobbert_ner"),
)


assert len({g.assistant_id for g in GRAPHS}) == len(GRAPHS), (
    "duplicate assistant_id in ml GRAPHS"
)

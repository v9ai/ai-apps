# ml container — package marker for the two leaf ML LangGraph graphs.
"""Leaf LangGraph graphs served by the ``lead-gen-ml`` container.

Two graphs:

* ``bge_m3_embed`` — text → 1024-dim L2-normalized embeddings (BAAI/bge-m3).
* ``jobbert_ner``  — text → skill spans (TechWolf/JobBERT-v3 NER head).

Both validate their state against the shared Pydantic contracts in
``leadgen_agent.contracts`` at graph entry and exit. Neither calls
``interrupt()`` — they are pure compute and always run to completion.
"""

from __future__ import annotations

__all__: list[str] = []

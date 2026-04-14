"""LlamaIndex node postprocessors for clinical relevance reranking.

``ClinicalRelevancePostprocessor`` scores each retrieved chunk against the
user query using the local LLM and a domain-specific prompt.  It replaces
the manual per-chunk loop that was previously inlined in ``graph.py``.

Usage::

    from postprocessors import ClinicalRelevancePostprocessor

    reranker = ClinicalRelevancePostprocessor(top_n=8, min_score=0.3)
    reranked = reranker.postprocess_nodes(nodes, query_bundle)
    print(reranker.rationales)   # observability
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import NodeWithScore, QueryBundle
from pydantic import Field, PrivateAttr

from llm_backend import llm_call

logger = logging.getLogger(__name__)

RERANK_SYSTEM = """You are a clinical relevance assessor for a blood marker intelligence system.

You will receive a USER QUERY and a CHUNK of retrieved health data.
Score the chunk's relevance to answering the query on a scale of 0.0 to 1.0:

- 1.0: Directly answers the query with specific data the user asked about
- 0.7-0.9: Highly relevant context that supports answering the query
- 0.4-0.6: Tangentially related but not directly useful
- 0.1-0.3: Marginally related, mostly noise
- 0.0: Completely irrelevant

Consider:
- Does the chunk contain the specific markers, conditions, or medications the query asks about?
- Does the chunk contain data from the correct time period for trajectory questions?
- Is the chunk from the right data domain (markers vs conditions vs medications)?

Respond ONLY with JSON: {"score": 0.0-1.0, "rationale": "one sentence"}"""


class ClinicalRelevancePostprocessor(BaseNodePostprocessor):
    """Per-chunk LLM-based clinical relevance scorer.

    Calls the local LLM for each node, parses a JSON score + rationale,
    filters by ``min_score``, sorts descending, and returns ``top_n`` nodes.
    Stores rationales in ``self.rationales`` for observability.
    """

    top_n: int = Field(default=8, description="Maximum nodes to return")
    min_score: float = Field(default=0.3, description="Minimum relevance score")
    _rationales: list[str] = PrivateAttr(default_factory=list)

    @property
    def rationales(self) -> list[str]:
        """Rationales from the most recent postprocess call."""
        return list(self._rationales)

    def _postprocess_nodes(
        self,
        nodes: list[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> list[NodeWithScore]:
        if not nodes or query_bundle is None:
            self._rationales = []
            return nodes

        query_str = query_bundle.query_str
        scored: list[tuple[float, str, NodeWithScore]] = []

        for node_with_score in nodes:
            chunk = node_with_score.node.get_content()
            user_prompt = f"USER QUERY: {query_str}\n\nCHUNK:\n{chunk}"
            raw = llm_call(RERANK_SYSTEM, user_prompt, max_tokens=128)

            cleaned = re.sub(r"```json\s*|\s*```", "", raw).strip()
            try:
                parsed = json.loads(cleaned)
                score = float(parsed.get("score", 0.0))
                rationale = parsed.get("rationale", "")
            except (json.JSONDecodeError, ValueError):
                logger.warning("Rerank parse failed, keeping original score: %s", raw)
                score = node_with_score.score or 0.0
                rationale = "parse_failure"

            scored.append((score, rationale, node_with_score))

        scored.sort(key=lambda t: t[0], reverse=True)

        filtered = [s for s in scored if s[0] >= self.min_score][: self.top_n]
        if not filtered and scored:
            filtered = scored[:3]

        self._rationales = [s[1] for s in filtered]

        return [
            NodeWithScore(node=s[2].node, score=s[0])
            for s in filtered
        ]

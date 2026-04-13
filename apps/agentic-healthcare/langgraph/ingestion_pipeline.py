"""Blood test ingestion pipeline — plain functions, no framework wrappers.

Separated from routes/upload.py to avoid boto3/storage initialization
during test collection.  Transforms raw parsed elements into embedded
EmbeddingNodes ready for pgvector persistence.
"""

from __future__ import annotations

import logging

from embeddings import (
    _call_embed_api,
    build_health_state_node,
    build_marker_nodes,
    build_test_document,
)
from models import EmbeddingNode
from parsers import parse_markers

logger = logging.getLogger(__name__)


def parse_blood_test_nodes(
    elements: list[dict],
    test_id: str,
    user_id: str,
    file_name: str,
    uploaded_at: str,
    test_date: str | None,
    marker_ids: list[str],
) -> list[EmbeddingNode]:
    """Transform raw parsed elements into clinical EmbeddingNodes.

    Produces three types of nodes:
      - blood_test: summary of entire test
      - blood_marker: one per extracted marker
      - health_state: derived metrics + risk classification

    Returns an empty list if no markers could be extracted.
    """
    markers = parse_markers(elements)
    if not markers:
        return []

    embed_meta = {"fileName": file_name, "uploadedAt": uploaded_at}
    marker_meta = {"fileName": file_name, "testDate": test_date or uploaded_at}

    nodes: list[EmbeddingNode] = []

    # 1. Test-level document
    nodes.append(build_test_document(markers, embed_meta, test_id, user_id))

    # 2. Per-marker nodes
    nodes.extend(build_marker_nodes(markers, marker_ids, test_id, user_id, marker_meta))

    # 3. Health-state node
    nodes.append(build_health_state_node(markers, test_id, user_id, embed_meta))

    return nodes


def run_ingestion(
    elements: list[dict],
    test_id: str,
    user_id: str,
    file_name: str,
    test_date: str | None,
    marker_ids: list[str],
) -> list[EmbeddingNode]:
    """Parse elements into nodes, batch-embed them, and return the result.

    This replaces the LlamaIndex IngestionPipeline with a single batch
    embedding call — simpler and faster.
    """
    from datetime import datetime, timezone

    uploaded_at = datetime.now(timezone.utc).isoformat()

    nodes = parse_blood_test_nodes(
        elements, test_id, user_id, file_name, uploaded_at, test_date, marker_ids,
    )
    if not nodes:
        return []

    # Batch embed all nodes in a single API call
    texts = [n.text for n in nodes]
    embeddings = _call_embed_api(texts)
    for node, emb in zip(nodes, embeddings):
        node.embedding = emb

    return nodes

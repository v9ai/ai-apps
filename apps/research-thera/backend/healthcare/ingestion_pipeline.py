"""
LlamaIndex ingestion pipeline for blood test PDFs.

Separated from routes/upload.py to avoid boto3/storage initialization
during test collection. This module contains only the LlamaIndex
TransformComponent and IngestionPipeline factory.
"""

from __future__ import annotations

from llama_index.core import Document
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.schema import BaseNode, TextNode, TransformComponent

from embeddings import (
    build_health_state_node,
    build_marker_nodes,
    build_test_document,
    get_embed_model,
)
from parsers import parse_markers


class BloodTestNodeParser(TransformComponent):
    """Transform a Document of raw LlamaParse elements into clinical TextNodes.

    Produces three types of nodes:
      - blood_test: summary of entire test
      - blood_marker: one per extracted marker
      - health_state: derived metrics + risk classification
    """

    def __call__(self, nodes: list[BaseNode], **kwargs) -> list[BaseNode]:
        out: list[BaseNode] = []
        for node in nodes:
            if not isinstance(node, Document):
                out.append(node)
                continue

            meta = node.metadata
            elements = meta.get("_raw_elements", [])
            test_id = meta.get("test_id", "")
            user_id = meta.get("user_id", "")
            file_name = meta.get("file_name", "")
            uploaded_at = meta.get("uploaded_at", "")
            test_date = meta.get("test_date") or uploaded_at
            marker_ids: list[str] = meta.get("_marker_ids", [])

            markers = parse_markers(elements)
            if not markers:
                out.append(node)
                continue

            embed_meta = {"fileName": file_name, "uploadedAt": uploaded_at}
            marker_meta = {"fileName": file_name, "testDate": test_date}

            # 1. Test-level document
            test_doc = build_test_document(markers, embed_meta, test_id, user_id)
            out.append(test_doc)

            # 2. Per-marker nodes
            marker_nodes = build_marker_nodes(markers, marker_ids, test_id, user_id, marker_meta)
            out.extend(marker_nodes)

            # 3. Health-state node
            hs_node = build_health_state_node(markers, test_id, user_id, embed_meta)
            out.append(hs_node)

        return out


def build_ingestion_pipeline() -> IngestionPipeline:
    """Build a LlamaIndex IngestionPipeline with the blood test parser + FastEmbed."""
    return IngestionPipeline(
        transformations=[
            BloodTestNodeParser(),
            get_embed_model(),
        ],
    )

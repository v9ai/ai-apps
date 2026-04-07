"""salescue/modules/graph.py — GraphSAGE Company Relationship Scoring

Research contribution: Companies do not exist in isolation. Shared investors, tech stack
overlap, hiring patterns (employees moving between companies), and competitor relationships
form a rich graph structure that is invisible to text-based models. GraphSAGE (Hamilton
et al., 2017) learns node embeddings by aggregating features from graph neighbors,
enabling inductive scoring of new companies based on their relationships.

Architecture: 2-layer GraphSAGE with mean aggregation. Nodes = companies, edges typed by
relationship. Node features = DeBERTa embedding concatenated with structured features.
Produces a "graph-aware" company score that captures network effects.

Note: This module uses a lightweight GNN implementation that does NOT require
torch_geometric, making it compatible with M1 Mac MPS without extra dependencies.
"""

from __future__ import annotations

import json
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F

from ..base import BaseModule

EDGE_TYPES = [
    "shared_tech_stack",
    "shared_investors",
    "hiring_flow",           # employee moved from A to B
    "competitor",
    "same_industry_segment",
    "hf_similar_tasks",      # publish models for same HF pipeline_tags
    "partnership",
    "customer_of",
]

GRAPH_LABELS = [
    "high_value_cluster",    # in a cluster of high-converting companies
    "emerging_cluster",      # near companies showing growth signals
    "isolated",              # few relationships (cold outreach harder)
    "competitive_dense",     # many competitors in graph (red ocean)
    "complementary",         # connected to existing customers (warm intro possible)
]

# Node feature dimensions
TEXT_DIM = 768
STRUCT_DIM = 12  # ai_tier, score, hf_presence, employee_count, funding_stage, etc.
NODE_DIM = 128   # compressed node features


class SAGEConv(nn.Module):
    """Single GraphSAGE convolution layer (mean aggregation).

    For each node, aggregates neighbor features via mean pooling,
    then combines with the node's own features through a linear transform.

    h_v^(l+1) = sigma(W * CONCAT(h_v^(l), MEAN({h_u^(l) : u in N(v)})))
    """

    def __init__(self, in_dim: int, out_dim: int):
        super().__init__()
        # Self + neighbor concatenated
        self.linear = nn.Linear(in_dim * 2, out_dim)
        self.norm = nn.LayerNorm(out_dim)

    def forward(
        self,
        node_features: torch.Tensor,
        adjacency: torch.Tensor,
    ) -> torch.Tensor:
        """Forward pass.

        Args:
            node_features: (N, in_dim) node feature matrix
            adjacency: (N, N) adjacency matrix (can be weighted)

        Returns:
            (N, out_dim) updated node features
        """
        # Normalize adjacency for mean aggregation
        degree = adjacency.sum(dim=1, keepdim=True).clamp(min=1)
        adj_norm = adjacency / degree

        # Aggregate neighbor features: (N, N) @ (N, in_dim) = (N, in_dim)
        neighbor_agg = torch.mm(adj_norm, node_features)

        # Concatenate self + neighbor
        combined = torch.cat([node_features, neighbor_agg], dim=-1)

        # Transform
        out = self.linear(combined)
        out = self.norm(out)
        out = F.gelu(out)

        return out


class CompanyGraphScorer(BaseModule):
    """GNN-based company relationship scoring.

    Learns company embeddings that capture network effects — shared investors,
    tech stack overlap, hiring patterns, and competitive positioning.
    """

    name = "graph"
    description = "GraphSAGE company relationship scoring"

    def __init__(self, hidden: int = 768):
        super().__init__()

        # Compress node features
        self.node_encoder = nn.Sequential(
            nn.Linear(TEXT_DIM + STRUCT_DIM, 256),
            nn.GELU(),
            nn.Linear(256, NODE_DIM),
        )

        # Edge type embedding (for typed edges)
        self.edge_type_embed = nn.Embedding(len(EDGE_TYPES), NODE_DIM)

        # 2-layer GraphSAGE
        self.conv1 = SAGEConv(NODE_DIM, NODE_DIM)
        self.conv2 = SAGEConv(NODE_DIM, NODE_DIM)

        # Scoring head
        self.scorer = nn.Sequential(
            nn.Linear(NODE_DIM, 64),
            nn.GELU(),
            nn.Linear(64, 1),
        )

        # Graph label classifier
        self.label_head = nn.Linear(NODE_DIM, len(GRAPH_LABELS))

        # Similarity head: pairwise company similarity from graph embeddings
        self.sim_projection = nn.Linear(NODE_DIM, 64)

    def process(self, encoded: dict, text: str, **kwargs: Any) -> dict[str, Any]:
        """Process single company with graph context."""
        cls = encoded["encoder_output"].last_hidden_state[:, 0]
        graph_data = kwargs.get("graph", None)

        if graph_data is None:
            # No graph context — return text-only score
            node_feat = self._encode_node(cls, None)
            return self._score_single(node_feat)

        return self._score_with_graph(cls, graph_data)

    def predict(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Public API.

        Usage without graph:
            model.predict("AI-native startup, 200 employees")

        Usage with graph context:
            model.predict("AI-native startup", graph={
                "nodes": [
                    {"text": "Company A description", "features": [2, 0.8, ...]},
                    {"text": "Company B description", "features": [1, 0.5, ...]},
                ],
                "edges": [[0, 1, "shared_tech_stack"], [1, 0, "shared_tech_stack"]],
                "target_idx": 0,  # which node to score
            })
        """
        from ..validation import validate_text
        text = validate_text(text)
        encoded = self.encode(text)
        return self.process(encoded, text, **kwargs)

    def _encode_node(
        self,
        text_embedding: torch.Tensor,
        struct_features: torch.Tensor | None,
    ) -> torch.Tensor:
        """Encode a single node's features."""
        if struct_features is None:
            struct_features = torch.zeros(1, STRUCT_DIM, device=text_embedding.device)
        if struct_features.dim() == 1:
            struct_features = struct_features.unsqueeze(0)
        if text_embedding.dim() == 1:
            text_embedding = text_embedding.unsqueeze(0)

        combined = torch.cat([text_embedding, struct_features], dim=-1)
        return self.node_encoder(combined)

    def _score_single(self, node_feat: torch.Tensor) -> dict[str, Any]:
        """Score a single node without graph context."""
        score = torch.sigmoid(self.scorer(node_feat)).item()
        label_logits = self.label_head(node_feat)
        label_probs = F.softmax(label_logits, dim=-1)
        label_idx = label_probs.argmax(dim=-1).item()

        return {
            "graph_score": round(score * 100, 1),
            "graph_label": GRAPH_LABELS[label_idx],
            "label_confidence": round(label_probs[0, label_idx].item(), 3),
            "similar_companies": [],
            "graph_signals": [],
            "note": "no graph context provided — text-only score",
        }

    def _score_with_graph(
        self,
        target_cls: torch.Tensor,
        graph_data: dict,
    ) -> dict[str, Any]:
        """Score target node within full graph context."""
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])
        target_idx = graph_data.get("target_idx", 0)

        if not nodes:
            return self._score_single(
                self._encode_node(target_cls, None)
            )

        device = target_cls.device
        n = len(nodes)

        # Encode all nodes
        node_features = []
        for node in nodes:
            if "embedding" in node:
                text_emb = torch.tensor(
                    node["embedding"], dtype=torch.float32, device=device
                ).unsqueeze(0)
            else:
                # Use target's embedding for the target node, zeros for others
                text_emb = torch.zeros(1, TEXT_DIM, device=device)

            struct = node.get("features", [0.0] * STRUCT_DIM)
            struct_t = torch.tensor(struct, dtype=torch.float32, device=device)
            if len(struct_t) < STRUCT_DIM:
                pad = torch.zeros(STRUCT_DIM - len(struct_t), device=device)
                struct_t = torch.cat([struct_t, pad])

            node_feat = self._encode_node(text_emb, struct_t.unsqueeze(0))
            node_features.append(node_feat.squeeze(0))

        # Override target node with actual text embedding
        target_struct = nodes[target_idx].get("features", [0.0] * STRUCT_DIM)
        target_struct_t = torch.tensor(target_struct, dtype=torch.float32, device=device)
        if len(target_struct_t) < STRUCT_DIM:
            pad = torch.zeros(STRUCT_DIM - len(target_struct_t), device=device)
            target_struct_t = torch.cat([target_struct_t, pad])
        node_features[target_idx] = self._encode_node(
            target_cls, target_struct_t.unsqueeze(0)
        ).squeeze(0)

        node_matrix = torch.stack(node_features)  # (N, NODE_DIM)

        # Build adjacency matrix
        adj = torch.zeros(n, n, device=device)
        for edge in edges:
            src, dst = edge[0], edge[1]
            edge_type = edge[2] if len(edge) > 2 else "shared_tech_stack"
            if 0 <= src < n and 0 <= dst < n:
                type_idx = EDGE_TYPES.index(edge_type) if edge_type in EDGE_TYPES else 0
                # Weight by edge type embedding similarity (simplified: uniform weight)
                adj[src, dst] = 1.0

        # 2-layer GraphSAGE
        h = self.conv1(node_matrix, adj)
        h = self.conv2(h, adj)

        # Score target node
        target_h = h[target_idx].unsqueeze(0)
        score = torch.sigmoid(self.scorer(target_h)).item()

        # Graph label
        label_logits = self.label_head(target_h)
        label_probs = F.softmax(label_logits, dim=-1)
        label_idx = label_probs.argmax(dim=-1).item()

        # Find similar companies via cosine similarity in graph space
        target_proj = F.normalize(self.sim_projection(target_h), dim=-1)
        all_proj = F.normalize(self.sim_projection(h), dim=-1)
        similarities = torch.mm(target_proj, all_proj.t()).squeeze(0)

        # Top similar (excluding self)
        similarities[target_idx] = -1
        top_k = min(5, n - 1)
        top_vals, top_idxs = similarities.topk(top_k)

        similar = []
        for val, idx in zip(top_vals.tolist(), top_idxs.tolist()):
            if val > 0:
                name = nodes[idx].get("name", f"node_{idx}")
                similar.append({"name": name, "similarity": round(val, 3)})

        # Graph signal attribution
        signals = []
        neighbor_mask = adj[target_idx] > 0
        for i in range(n):
            if neighbor_mask[i]:
                for edge in edges:
                    if (edge[0] == target_idx and edge[1] == i) or \
                       (edge[1] == target_idx and edge[0] == i):
                        edge_type = edge[2] if len(edge) > 2 else "unknown"
                        signals.append({
                            "type": edge_type,
                            "with": nodes[i].get("name", f"node_{i}"),
                            "strength": round(similarities[i].item(), 3),
                        })

        return {
            "graph_score": round(score * 100, 1),
            "graph_label": GRAPH_LABELS[label_idx],
            "label_confidence": round(label_probs[0, label_idx].item(), 3),
            "similar_companies": similar,
            "graph_signals": signals[:10],
            "node_count": n,
            "edge_count": len(edges),
        }

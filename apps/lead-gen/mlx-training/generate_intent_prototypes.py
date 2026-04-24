#!/usr/bin/env python3
"""Generate intent prototype embeddings for semantic intent classification.

Embeds representative texts per signal type using BGE-small-en-v1.5,
averages them into 384-dim prototypes, and exports JSON for the Rust
SemanticIntentClassifier.

Usage:
    python generate_intent_prototypes.py
    python generate_intent_prototypes.py --output /path/to/prototypes.json

Output: JSON matching the Rust IntentPrototypes struct:
    {"prototypes": [[384 floats] × 6], "dim": 384}

Requires: pip install sentence-transformers  (or transformers + torch)
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np

# Signal types in index order (must match Rust SignalType::index())
SIGNAL_TYPES = [
    "hiring_intent",      # 0
    "tech_adoption",      # 1
    "growth_signal",      # 2
    "budget_cycle",       # 3
    "leadership_change",  # 4
    "product_launch",     # 5
]

# Representative texts per signal type — 8-12 examples each.
# These are synthetic B2B content snippets designed to capture the
# semantic space of each intent signal.
REPRESENTATIVE_TEXTS = {
    "hiring_intent": [
        "We're hiring senior engineers to join our growing team",
        "Looking for ML engineers and data scientists for our AI platform",
        "Expanding our engineering organization with 20 new positions",
        "Join our team — multiple open roles in infrastructure and DevOps",
        "Now hiring: VP Engineering, Staff Engineers, and Engineering Managers",
        "Building a world-class AI team — apply for our open positions",
        "Growing the platform team: hiring backend, frontend, and ML engineers",
        "We have exciting career opportunities in artificial intelligence research",
        "Open headcount for cloud architects and site reliability engineers",
        "Active careers page with software engineering and data roles",
    ],
    "tech_adoption": [
        "Migrating our infrastructure from AWS to a multi-cloud architecture",
        "We've adopted Kubernetes for container orchestration across all services",
        "Switching our data pipeline to Apache Kafka for real-time processing",
        "Implementing a new CI/CD platform with GitHub Actions and ArgoCD",
        "Rolling out Terraform for infrastructure as code across the organization",
        "Deploying machine learning models with MLflow and Kubeflow",
        "Moving our monolith to microservices using Rust and gRPC",
        "Adopted vector databases for semantic search across our platform",
        "Upgrading our observability stack to OpenTelemetry and Grafana",
        "Implementing zero-trust security with service mesh and mTLS",
    ],
    "growth_signal": [
        "Raised $50M Series B to accelerate product development and expansion",
        "Revenue grew 200% year-over-year driven by enterprise adoption",
        "Acquired a complementary AI startup to strengthen our platform",
        "Expanding operations to European and Asian markets this quarter",
        "Reached 10,000 enterprise customers — IPO preparations underway",
        "Secured strategic investment from leading venture capital firms",
        "Annual recurring revenue surpassed $100M milestone",
        "Opening new offices in London, Berlin, and Singapore",
        "Company valuation doubled after latest funding round",
        "Significant growth in enterprise contract size and customer retention",
    ],
    "budget_cycle": [
        "Q4 budget planning cycle: evaluating new technology vendors",
        "Annual technology procurement review for cloud infrastructure",
        "RFP issued for enterprise data platform — vendor evaluation in progress",
        "New fiscal year budget approved for digital transformation initiatives",
        "Evaluating solutions for improved developer productivity tooling",
        "Procurement team reviewing proposals for security and compliance tools",
        "Budget allocated for AI and machine learning infrastructure upgrades",
        "Vendor selection process underway for next-generation CRM platform",
    ],
    "leadership_change": [
        "Welcoming our new CTO who brings 20 years of AI experience",
        "Appointed new VP of Engineering from a leading tech company",
        "New Head of AI and Machine Learning joins the executive team",
        "Promoted our VP of Product to Chief Product Officer",
        "New CEO brings fresh vision for AI-first strategy",
        "Co-founder returns as Chief Technology Officer",
        "Board of directors welcomes three new independent members",
        "Senior leadership restructuring to support next phase of growth",
    ],
    "product_launch": [
        "Launching our new AI-powered analytics platform this month",
        "Introducing real-time collaboration features for enterprise teams",
        "New product release: automated workflow engine with API-first design",
        "Beta launch of our generative AI assistant for developers",
        "Announcing general availability of our vector search product",
        "Just shipped major update with RAG capabilities and embeddings",
        "Public preview of our new low-code platform for data engineers",
        "Releasing enterprise edition with advanced security and SSO",
        "New feature: automated code review powered by language models",
        "Product expansion: adding support for multi-modal AI applications",
    ],
}


def embed_texts(texts: list[str], model_name: str = "BAAI/bge-small-en-v1.5") -> np.ndarray:
    """Embed texts using BGE model. Returns [n × 384] L2-normalized matrix."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_name)
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return np.array(embeddings, dtype=np.float32)
    except ImportError:
        # Fallback to transformers directly
        from transformers import AutoTokenizer, AutoModel
        import torch

        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name)
        model.eval()

        all_embeddings = []
        batch_size = 32
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            inputs = tokenizer(batch, padding=True, truncation=True, max_length=512, return_tensors="pt")
            with torch.no_grad():
                outputs = model(**inputs)
            # [CLS] pooling
            cls_embeddings = outputs.last_hidden_state[:, 0, :]
            # L2 normalize
            cls_embeddings = torch.nn.functional.normalize(cls_embeddings, p=2, dim=1)
            all_embeddings.append(cls_embeddings.numpy())

        return np.concatenate(all_embeddings, axis=0).astype(np.float32)


def compute_prototypes(embeddings_by_signal: dict[str, np.ndarray]) -> tuple[list[list[float]], int]:
    """Compute mean prototype per signal type, L2-normalized.

    Returns (prototypes, dim) where prototypes is a list of 6 float vectors.
    """
    dim = next(iter(embeddings_by_signal.values())).shape[1]
    prototypes = []

    for signal_type in SIGNAL_TYPES:
        embs = embeddings_by_signal[signal_type]
        mean = embs.mean(axis=0)
        # L2 normalize
        norm = np.linalg.norm(mean)
        if norm > 1e-10:
            mean = mean / norm
        prototypes.append(mean.tolist())

    return prototypes, dim


def main():
    parser = argparse.ArgumentParser(description="Generate intent prototype embeddings")
    parser.add_argument("--output", type=str, default=None,
                        help="Output JSON path (default: backend/data/models/intent_prototypes.json)")
    parser.add_argument("--model", type=str, default="BAAI/bge-small-en-v1.5",
                        help="Embedding model name")
    args = parser.parse_args()

    output_path = Path(args.output) if args.output else Path("backend/data/models/intent_prototypes.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Embed all representative texts
    embeddings_by_signal = {}
    for signal_type in SIGNAL_TYPES:
        texts = REPRESENTATIVE_TEXTS[signal_type]
        print(f"Embedding {len(texts)} texts for {signal_type}...")
        embeddings = embed_texts(texts, args.model)
        embeddings_by_signal[signal_type] = embeddings
        print(f"  shape: {embeddings.shape}, mean norm: {np.linalg.norm(embeddings, axis=1).mean():.4f}")

    # Compute mean prototypes
    prototypes, dim = compute_prototypes(embeddings_by_signal)
    print(f"\nPrototypes: {len(prototypes)} × {dim}")

    # Verify cosine similarities
    print("\nIntra-signal similarities (should be high):")
    for i, signal_type in enumerate(SIGNAL_TYPES):
        embs = embeddings_by_signal[signal_type]
        proto = np.array(prototypes[i])
        sims = embs @ proto
        print(f"  {signal_type}: mean={sims.mean():.3f} min={sims.min():.3f} max={sims.max():.3f}")

    print("\nCross-signal similarities (should be lower):")
    proto_matrix = np.array(prototypes)
    cross_sims = proto_matrix @ proto_matrix.T
    for i, si in enumerate(SIGNAL_TYPES):
        for j, sj in enumerate(SIGNAL_TYPES):
            if i < j:
                print(f"  {si[:15]:>15} × {sj[:15]:<15}: {cross_sims[i, j]:.3f}")

    # Export
    result = {
        "prototypes": prototypes,
        "dim": dim,
    }
    with open(output_path, "w") as f:
        json.dump(result, f)
    print(f"\nPrototypes written to {output_path}")
    print(f"File size: {output_path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()

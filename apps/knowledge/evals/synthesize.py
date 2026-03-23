"""Generate synthetic goldens from knowledge lesson documents.

Uses DeepEval's Synthesizer to create Q&A pairs from the 55 lesson
markdown files, with configurable evolution and styling.

Usage:
    uv run python synthesize.py                     # all 55 lessons
    uv run python synthesize.py --lessons 3         # first 3 lessons (smoke test)
    uv run python synthesize.py --category rag      # only RAG & Retrieval lessons
    uv run python synthesize.py --no-evolution      # skip evolution step
"""

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from deepeval.synthesizer import Synthesizer
from deepeval.synthesizer.config import (
    ContextConstructionConfig,
    EvolutionConfig,
    FiltrationConfig,
    StylingConfig,
)
from deepeval.synthesizer.types import Evolution

from deepseek_model import DeepSeekModel
from local_embedder import LocalEmbedder

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"
DATASETS_DIR = Path(__file__).resolve().parent / "datasets"

# Canonical lesson slugs (positions 1-55), matching lib/articles.ts
LESSON_SLUGS = [
    "transformer-architecture", "scaling-laws", "tokenization",
    "model-architectures", "inference-optimization", "pretraining-data",
    "prompt-engineering-fundamentals", "few-shot-chain-of-thought",
    "system-prompts", "structured-output", "prompt-optimization",
    "adversarial-prompting", "embedding-models", "vector-databases",
    "chunking-strategies", "retrieval-strategies", "advanced-rag",
    "rag-evaluation", "fine-tuning-fundamentals", "lora-adapters",
    "rlhf-preference", "dataset-curation", "continual-learning",
    "distillation-compression", "function-calling", "agent-architectures",
    "multi-agent-systems", "agent-memory", "code-agents", "agent-evaluation",
    "eval-fundamentals", "benchmark-design", "llm-as-judge",
    "human-evaluation", "red-teaming", "ci-cd-ai", "llm-serving",
    "scaling-load-balancing", "cost-optimization", "observability",
    "edge-deployment", "ai-gateway", "constitutional-ai",
    "guardrails-filtering", "hallucination-mitigation", "bias-fairness",
    "ai-governance", "interpretability", "vision-language-models",
    "audio-speech-ai", "ai-for-code", "conversational-ai",
    "search-recommendations", "production-patterns", "ai-engineer-roadmap",
]

CATEGORIES = {
    "foundations":      LESSON_SLUGS[0:6],
    "prompting":        LESSON_SLUGS[6:12],
    "rag":              LESSON_SLUGS[12:18],
    "finetuning":       LESSON_SLUGS[18:24],
    "agents":           LESSON_SLUGS[24:30],
    "evals":            LESSON_SLUGS[30:36],
    "infrastructure":   LESSON_SLUGS[36:42],
    "safety":           LESSON_SLUGS[42:48],
    "multimodal":       LESSON_SLUGS[48:55],
}


def get_lesson_paths(limit: int | None = None, category: str | None = None) -> list[str]:
    """Return absolute paths to canonical lesson files, optionally filtered."""
    slugs = CATEGORIES[category] if category else LESSON_SLUGS
    paths = []
    for slug in slugs:
        p = CONTENT_DIR / f"{slug}.md"
        if p.exists():
            paths.append(str(p))
    if limit:
        paths = paths[:limit]
    return paths


def build_synthesizer(
    model: DeepSeekModel,
    no_evolution: bool = False,
) -> Synthesizer:
    filtration_config = FiltrationConfig(
        synthetic_input_quality_threshold=0.5,
        max_quality_retries=3,
        critic_model=model,
    )

    evolution_config = None
    if not no_evolution:
        evolution_config = EvolutionConfig(
            num_evolutions=1,
            evolutions={
                Evolution.REASONING: 0.25,
                Evolution.MULTICONTEXT: 0.20,
                Evolution.COMPARATIVE: 0.20,
                Evolution.HYPOTHETICAL: 0.15,
                Evolution.IN_BREADTH: 0.10,
                Evolution.CONCRETIZING: 0.10,
            },
        )

    styling_config = StylingConfig(
        scenario="A student or practitioner learning AI engineering concepts",
        task="Answer questions about AI/ML with accuracy and depth",
        input_format=(
            "A conceptual question about the lesson topic. "
            "Focus on concepts, mechanisms, trade-offs, and practical applications."
        ),
        expected_output_format=(
            "A comprehensive, factual answer explaining concepts clearly. "
            "Focus on what the concept is, how it works, why it matters, and when to use it."
        ),
    )

    return Synthesizer(
        model=model,
        async_mode=True,
        max_concurrent=10,
        filtration_config=filtration_config,
        evolution_config=evolution_config,
        styling_config=styling_config,
    )


def run(args: argparse.Namespace) -> None:
    model = DeepSeekModel()
    embedder = LocalEmbedder()

    paths = get_lesson_paths(limit=args.lessons, category=args.category)
    if not paths:
        print("No lesson files found.")
        return

    print(f"Generating goldens from {len(paths)} lessons...")

    synthesizer = build_synthesizer(model, no_evolution=args.no_evolution)

    context_config = ContextConstructionConfig(
        embedder=embedder,
        critic_model=model,
        chunk_size=1024,
        chunk_overlap=128,
        max_contexts_per_document=3,
        min_contexts_per_document=1,
        context_quality_threshold=0.5,
    )

    goldens = synthesizer.generate_goldens_from_docs(
        document_paths=paths,
        include_expected_output=True,
        max_goldens_per_context=2,
        context_construction_config=context_config,
    )

    print(f"Generated {len(goldens)} goldens")

    # Save dataset
    os.makedirs(str(DATASETS_DIR), exist_ok=True)
    synthesizer.save_as(
        file_type="json",
        directory=str(DATASETS_DIR),
        file_name="synthetic_goldens",
    )
    print(f"Dataset saved to {DATASETS_DIR / 'synthetic_goldens.json'}")

    # Save metadata
    metadata = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "num_goldens": len(goldens),
        "num_lessons": len(paths),
        "lessons": [Path(p).stem for p in paths],
        "category_filter": args.category,
        "evolution": "disabled" if args.no_evolution else {
            "num_evolutions": 1,
            "distribution": {
                "REASONING": 0.25, "MULTICONTEXT": 0.20, "COMPARATIVE": 0.20,
                "HYPOTHETICAL": 0.15, "IN_BREADTH": 0.10, "CONCRETIZING": 0.10,
            },
        },
        "filtration_threshold": 0.5,
        "chunk_size": 1024,
        "chunk_overlap": 128,
    }
    meta_path = DATASETS_DIR / "synthetic_goldens_meta.json"
    meta_path.write_text(json.dumps(metadata, indent=2))
    print(f"Metadata saved to {meta_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic goldens from lesson docs")
    parser.add_argument("--lessons", type=int, help="Limit to first N lessons")
    parser.add_argument(
        "--category",
        choices=list(CATEGORIES.keys()),
        help="Filter by lesson category",
    )
    parser.add_argument(
        "--no-evolution",
        action="store_true",
        help="Skip evolution step (faster, simpler goldens)",
    )
    args = parser.parse_args()
    run(args)

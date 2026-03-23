"""Generate RAG-specific synthetic goldens using pgvector contexts.

Unlike synthesize.py (which chunks docs locally), this script:
  1. Queries the DB for section content grouped by lesson
  2. Uses actual section boundaries (not arbitrary chunks)
  3. Creates goldens with realistic retrieval_context from the DB
  4. Optionally pre-runs retrieval to capture what the RAG pipeline actually retrieves

Usage:
    uv run python synthesize_rag.py                          # all categories
    uv run python synthesize_rag.py --category rag           # RAG lessons only
    uv run python synthesize_rag.py --goldens-per-lesson 5   # control density
    uv run python synthesize_rag.py --from-retrieval          # use actual retrieval
    uv run python synthesize_rag.py --lessons 3               # first 3 lessons only
"""

import argparse
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
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
from pgvector_retriever import PgVectorRetriever
from rag_pipeline import RAGConfig, invoke_rag, invoke_rag_batch

DATASETS_DIR = Path(__file__).resolve().parent / "datasets"

CATEGORIES = {
    "foundations": ["transformer-architecture", "scaling-laws", "tokenization",
                    "model-architectures", "inference-optimization", "pretraining-data"],
    "prompting": ["prompt-engineering-fundamentals", "few-shot-chain-of-thought",
                  "system-prompts", "structured-output", "prompt-optimization",
                  "adversarial-prompting"],
    "rag": ["embedding-models", "vector-databases", "chunking-strategies",
            "retrieval-strategies", "advanced-rag", "rag-evaluation"],
    "finetuning": ["fine-tuning-fundamentals", "lora-adapters", "rlhf-preference",
                   "dataset-curation", "continual-learning", "distillation-compression"],
    "agents": ["function-calling", "agent-architectures", "multi-agent-systems",
               "agent-memory", "code-agents", "agent-evaluation"],
    "evals": ["eval-fundamentals", "benchmark-design", "llm-as-judge",
              "human-evaluation", "red-teaming", "ci-cd-ai"],
    "infrastructure": ["llm-serving", "scaling-load-balancing", "cost-optimization",
                       "observability", "edge-deployment", "ai-gateway"],
    "safety": ["constitutional-ai", "guardrails-filtering", "hallucination-mitigation",
               "bias-fairness", "ai-governance", "interpretability"],
    "multimodal": ["vision-language-models", "audio-speech-ai", "ai-for-code",
                   "conversational-ai", "search-recommendations", "production-patterns",
                   "ai-engineer-roadmap"],
}


def _get_lesson_slugs(category: str | None, limit: int | None) -> list[str]:
    if category:
        slugs = CATEGORIES.get(category, [])
    else:
        slugs = [s for cat_slugs in CATEGORIES.values() for s in cat_slugs]
    if limit:
        slugs = slugs[:limit]
    return slugs


def generate_from_db_sections(
    model: DeepSeekModel,
    category: str | None = None,
    goldens_per_lesson: int = 3,
    limit: int | None = None,
) -> list[dict]:
    """Generate goldens using DB section content as contexts."""
    retriever = PgVectorRetriever()
    slugs = _get_lesson_slugs(category, limit)
    goldens = []

    embedder = LocalEmbedder()
    synthesizer = Synthesizer(
        model=model,
        async_mode=True,
        max_concurrent=5,
        filtration_config=FiltrationConfig(
            synthetic_input_quality_threshold=0.5,
            max_quality_retries=2,
            critic_model=model,
        ),
        evolution_config=EvolutionConfig(
            num_evolutions=1,
            evolutions={
                Evolution.REASONING: 0.25,
                Evolution.MULTICONTEXT: 0.20,
                Evolution.COMPARATIVE: 0.20,
                Evolution.HYPOTHETICAL: 0.15,
                Evolution.IN_BREADTH: 0.10,
                Evolution.CONCRETIZING: 0.10,
            },
        ),
        styling_config=StylingConfig(
            scenario="A student learning AI engineering asking the knowledge base",
            task="Answer questions about AI/ML using retrieved context",
            input_format="A conceptual question about the lesson topic",
            expected_output_format="A factual answer drawing from the provided context",
        ),
    )

    all_contexts = []
    context_sources = []

    target_contexts = len(slugs) * goldens_per_lesson
    for slug in slugs:
        if len(all_contexts) >= target_contexts:
            break
        sections = retriever.get_all_sections_for_lesson(slug)
        if not sections:
            continue
        lesson = retriever.get_lesson_content(slug)
        lesson_title = lesson["title"] if lesson else slug

        # Group sections into contexts of 2-3 sections each
        for i in range(0, len(sections), 2):
            group = sections[i : i + 3]
            context = [
                f"[{lesson_title} > {s['heading']}]\n{s['content']}"
                for s in group
            ]
            all_contexts.append(context)
            context_sources.append(slug)
            if len(all_contexts) >= target_contexts:
                break

    print(f"Prepared {len(all_contexts)} context groups from {len(slugs)} lessons")

    if not all_contexts:
        retriever.close()
        return []

    synth_goldens = synthesizer.generate_goldens_from_contexts(
        contexts=all_contexts,
        include_expected_output=True,
        max_goldens_per_context=1,
    )

    for i, g in enumerate(synth_goldens):
        source = context_sources[i] if i < len(context_sources) else "unknown"
        goldens.append({
            "input": g.input,
            "expected_output": g.expected_output,
            "context": g.context,
            "source": source,
        })

    retriever.close()
    return goldens


def generate_from_retrieval(
    model: DeepSeekModel,
    num_queries: int = 20,
    config: RAGConfig | None = None,
) -> list[dict]:
    """Generate goldens by running queries through the actual RAG pipeline."""
    # Generate diverse queries covering all categories
    query_prompt = (
        "Generate {n} diverse questions about AI engineering topics. "
        "Cover: transformers, RAG, agents, fine-tuning, evaluation, "
        "infrastructure, safety, and multimodal AI. "
        "Mix factual, conceptual, and comparative questions. "
        "Return as a JSON array of strings."
    ).format(n=num_queries)

    response = model.generate(query_prompt)
    try:
        queries = json.loads(response)
    except json.JSONDecodeError:
        # Try to extract JSON array from response
        import re
        match = re.search(r"\[.*\]", response, re.DOTALL)
        if match:
            queries = json.loads(match.group())
        else:
            print("Failed to parse generated queries, using fallback set")
            queries = [
                "What is the transformer architecture and how does self-attention work?",
                "How do chunking strategies affect RAG pipeline quality?",
                "What is LoRA and how does it reduce fine-tuning costs?",
                "How do multi-agent systems coordinate tasks?",
                "What metrics should I use to evaluate an LLM application?",
                "How does KV cache optimization improve inference speed?",
                "What is constitutional AI and how does it work?",
                "How do vision-language models process images and text together?",
                "What retrieval strategies work best for semantic search?",
                "How should I set up observability for LLM applications?",
            ]

    batch_queries = queries[:num_queries]
    batch_results = invoke_rag_batch(batch_queries, config)

    goldens = []
    for query, result in zip(batch_queries, batch_results):
        if result is None:
            continue
        if result["retrieval_context"]:
            goldens.append({
                "input": query,
                "actual_output": result["actual_output"],
                "retrieval_context": result["retrieval_context"],
                "retrieval_scores": result["retrieval_scores"],
                "source": f"retrieval-{result['retrieval_method']}",
            })

    # Generate expected_output for each golden in parallel — independent LLM calls.
    def _gen_expected(g: dict) -> dict:
        try:
            expected_prompt = (
                f"Based on the following context, provide a comprehensive answer "
                f"to: {g['input']}\n\nContext:\n"
                + "\n---\n".join(g.get("retrieval_context", [])[:3])
            )
            g["expected_output"] = model.generate(expected_prompt)
        except Exception:
            g["expected_output"] = None
        g["context"] = g.pop("retrieval_context", [])
        return g

    with ThreadPoolExecutor(max_workers=min(4, len(goldens) or 1)) as pool:
        futures = {pool.submit(_gen_expected, g): i for i, g in enumerate(goldens)}
        ordered: list[dict | None] = [None] * len(goldens)
        for future in as_completed(futures):
            ordered[futures[future]] = future.result()
    goldens = [g for g in ordered if g is not None]

    return goldens


def run(args: argparse.Namespace) -> None:
    model = DeepSeekModel()

    if args.from_retrieval:
        print("Generating goldens from actual RAG retrieval...")
        config = RAGConfig(
            top_k=args.top_k or 5,
            retrieval_method=args.retrieval_method or "fts",
        )
        goldens = generate_from_retrieval(model, num_queries=args.num_queries or 20, config=config)
    else:
        print("Generating goldens from DB section contexts...")
        goldens = generate_from_db_sections(
            model,
            category=args.category,
            goldens_per_lesson=args.goldens_per_lesson,
            limit=args.lessons,
        )

    print(f"\nGenerated {len(goldens)} RAG goldens")

    # Save dataset
    os.makedirs(str(DATASETS_DIR), exist_ok=True)
    out_path = DATASETS_DIR / "rag_goldens.json"
    with open(out_path, "w") as f:
        json.dump(goldens, f, indent=2, default=str)
    print(f"Saved to {out_path}")

    # Save metadata
    meta = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "num_goldens": len(goldens),
        "mode": "retrieval" if args.from_retrieval else "db_sections",
        "category_filter": args.category,
        "goldens_per_lesson": args.goldens_per_lesson,
    }
    meta_path = DATASETS_DIR / "rag_goldens_meta.json"
    meta_path.write_text(json.dumps(meta, indent=2))
    print(f"Metadata saved to {meta_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate RAG-specific synthetic goldens")
    parser.add_argument("--category", choices=list(CATEGORIES.keys()), help="Filter by category")
    parser.add_argument("--lessons", type=int, help="Limit to first N lessons")
    parser.add_argument("--goldens-per-lesson", type=int, default=3, help="Goldens per lesson (default: 3)")
    parser.add_argument("--from-retrieval", action="store_true", help="Generate from actual RAG retrieval")
    parser.add_argument("--num-queries", type=int, default=20, help="Number of queries for --from-retrieval")
    parser.add_argument("--retrieval-method", choices=["fts", "vector", "hybrid"], help="Retrieval method")
    parser.add_argument("--top-k", type=int, help="Top-K for retrieval")
    args = parser.parse_args()
    run(args)

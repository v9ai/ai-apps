---
slug: synthetic-evaluation-deepeval-rag-testing
title: "Synthetic Evaluation with DeepEval: A Production RAG Testing Framework"
description: "Your RAG pipeline passes all 20 hand-written tests. Then users ask the 21st question. With 0.4% test coverage, the other 99.6% is untested surface area. Here's how to close that gap with synthetic evaluation."
date: 2026-03-23
authors: [v9ai]
tags:
  - synthetic
  - evaluation
  - deepeval
  - testing
---

Your RAG pipeline passes all 20 of your hand-written test questions. It retrieves the right context, generates grounded answers, and the demo looks great. Then it goes to production, and users start asking the 21st question — the one that exposes a retrieval gap, a hallucinated citation, or a context window that silently truncated the most relevant chunk. You had 20 tests for a knowledge base with 55 documents. That's **0.4% coverage**. The other 99.6% was untested surface area.

This guide shows how to close that gap. We walk through a production implementation that generates 330+ synthetic test cases from 55 AI engineering lessons, evaluates a [LangGraph](https://langchain-ai.github.io/langgraph/)-based RAG pipeline across 10+ metrics, and runs hyperparameter sweeps to find optimal retrieval configurations — all automated with DeepEval and pytest.

<!-- truncate -->

## The Production RAG Testing Challenge: Why Manual Evaluation Fails

Every RAG pipeline begins with a promise: retrieve grounded context, generate accurate answers. The standard verification method — perhaps 20 "golden" Q&A pairs written during development — is fundamentally broken for three reasons.

**Coverage is mathematically insignificant.** A knowledge base with 55 documents cannot be validated with 20 questions. You're testing less than 0.5% of the surface area.

**Diversity is absent.** Hand-written tests favor simple factual lookups. They neglect the reasoning chains, multi-context synthesis, and hypothetical scenarios that distinguish a robust system from a fragile one.

**Tests calcify.** As the knowledge base evolves, manually maintaining test cases becomes a chore nobody prioritizes. The tests drift from reality and green-light regressions.

As practitioners have noted, [offline evaluation rarely captures the full complexity of real-world data](https://www.marktechpost.com/2026/03/21/safely-deploying-ml-models-to-production-four-controlled-strategies-a-b-canary-interleaved-shadow-testing/). The solution is not to write more manual tests — it's to automate their creation and execution at scale.

## What is Synthetic Evaluation? Generating Test Data with LLMs

Synthetic evaluation inverts the problem. Instead of you devising tests for the AI, you use an LLM to automatically generate hundreds of diverse, high-quality test cases that probe every corner of your system. This involves programmatically creating questions, expected answers, and the context needed to answer them.

The concept extends synthetic data generation techniques like [SMOTE (Chawla et al., 2002)](https://www.jair.org/index.php/jair/article/view/10302) from classical ML into the LLM evaluation domain. But where SMOTE addresses class imbalance, synthetic evaluation addresses coverage and adversarial depth.

The critical insight: test case generation and evaluation are two distinct LLM-powered processes. Generation optimizes for diversity and complexity; evaluation optimizes for rigorous coverage of quality dimensions like [faithfulness and relevance](https://docs.confident-ai.com/docs/metrics-rag).

## Introducing DeepEval: A Framework for Automated LLM Evaluation

[DeepEval](https://github.com/confident-ai/deepeval) is an open-source framework purpose-built for LLM evaluation. For RAG systems, it offers two critical components: a `Synthesizer` for generating test cases (called "Goldens") and a suite of metrics — the RAG Triad (Faithfulness, Answer Relevancy, Contextual Relevancy) — for evaluating them.

The framework integrates directly with pytest, making it a natural fit for CI/CD pipelines. You run evaluations with `deepeval test run test_rag_triad.py` and get structured pass/fail results per metric, per test case.

Unlike simpler evaluation approaches, DeepEval supports custom judge models. This means you can swap in any OpenAI-compatible LLM — including cost-effective alternatives like DeepSeek — as the evaluation judge:

```python
class DeepSeekModel(DeepEvalBaseLLM):
    def __init__(self, model: str = "deepseek-chat"):
        self._client = OpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com"
        )

    def generate(self, prompt: str, schema=None, **kwargs):
        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        return response.choices[0].message.content
```

## Implementing Synthetic RAG Tests: A Step-by-Step DeepEval Tutorial

The power of DeepEval lies in its structured four-stage pipeline for synthetic test generation. Here's how 55 markdown lessons become 330 structured Goldens.

### Stage 1: Context Construction

Raw documents are chunked into overlapping segments that form the basis for question generation:

```python
context_config = ContextConstructionConfig(
    embedder=LocalEmbedder(),        # all-MiniLM-L6-v2, 384-dim, 22MB
    critic_model=model,              # DeepSeek as quality judge
    chunk_size=1024,                 # tokens per chunk
    chunk_overlap=128,               # overlap between chunks
    max_contexts_per_document=3,
    context_quality_threshold=0.5,   # reject low-quality chunks
)
```

The embedding model choice matters. We use `all-MiniLM-L6-v2` (22MB, 384 dimensions) for synthesis — lightweight and local. The production retrieval pipeline uses a more powerful `BAAI/bge-large-en-v1.5` (1024 dimensions) via [FastEmbed](https://github.com/qdrant/fastembed) to match the database schema. Synthesis needs speed; retrieval needs quality.

### Stage 2: Filtration

A critic model scores candidate chunks on self-containment and clarity, filtering out inputs that would produce poor questions:

```python
filtration_config = FiltrationConfig(
    synthetic_input_quality_threshold=0.5,
    max_quality_retries=3,
    critic_model=model,
)
```

### Stage 3: Evolution

This is where synthetic generation gets powerful. Rather than producing only simple factual questions, the evolution stage transforms inputs through six weighted complexity dimensions:

```python
evolution_config = EvolutionConfig(
    num_evolutions=1,
    evolutions={
        Evolution.REASONING:      0.25,  # "Why does X lead to Y?"
        Evolution.MULTICONTEXT:   0.20,  # Requires synthesizing 2+ sources
        Evolution.COMPARATIVE:    0.20,  # "Compare X to Y"
        Evolution.HYPOTHETICAL:   0.15,  # "What if X were changed?"
        Evolution.IN_BREADTH:     0.10,  # Broader topic exploration
        Evolution.CONCRETIZING:   0.10,  # Abstract to concrete examples
    },
)
```

The distribution is deliberate. Reasoning (25%) and multi-context (20%) get the highest weight because they exercise the most critical RAG capabilities: logical inference from retrieved context, and synthesis across multiple chunks. Hypothetical scenarios (15%) probe the system's ability to extrapolate without hallucinating.

### Stage 4: Styling

The styling configuration shapes the persona and excludes brittle patterns:

```python
styling_config = StylingConfig(
    scenario="A student or practitioner learning AI engineering concepts",
    task="Answer questions about AI/ML with accuracy and depth",
    input_format=(
        "A conceptual question about the lesson topic. "
        "Do NOT ask about specific research papers, author names, "
        "or publication years."
    ),
    expected_output_format=(
        "A comprehensive, factual answer explaining concepts clearly. "
        "Focus on what the concept is, how it works, why it matters."
    ),
)
```

The explicit exclusion of paper citations is a learned lesson — early synthetic runs produced questions like "In the 2017 Vaswani et al. paper, what..." which test trivia rather than understanding.

### Two Synthesis Paths

The implementation provides two distinct generation scripts:

**Document-based (`synthesize.py`):** Chunks raw markdown files locally. Best for comprehensive coverage. Produces 330 goldens from all 55 lessons.

**Database-based (`synthesize_rag.py`):** Queries the actual PostgreSQL database for section content, using real section boundaries instead of arbitrary chunks:

```python
for slug in slugs:
    sections = retriever.get_all_sections_for_lesson(slug)
    for i in range(0, len(sections), 2):
        group = sections[i : i + 3]
        context = [
            f"[{lesson['title']} > {s['heading']}]\n{s['content']}"
            for s in group
        ]
        all_contexts.append(context)
```

This path also supports a `--from-retrieval` mode that runs queries through the actual RAG pipeline, capturing what it really retrieves rather than using synthetic contexts.

## Key DeepEval Metrics for Evaluating RAG System Performance

With synthetic tests in hand, you need metrics that matter. DeepEval's [RAG Triad](https://docs.confident-ai.com/docs/metrics-rag) evaluates the three non-negotiable dimensions of quality.

### The RAG Triad

1. **Faithfulness:** Is the answer grounded *solely* in the retrieved context? This is the hallucination check.
2. **Answer Relevancy:** Does the output actually address the question asked?
3. **Contextual Relevancy:** Was the retrieved context itself relevant, or is it noise?

```python
faithfulness = FaithfulnessMetric(model=model, threshold=0.6)
answer_relevancy = AnswerRelevancyMetric(model=model, threshold=0.6)
contextual_relevancy = ContextualRelevancyMetric(model=model, threshold=0.6)
```

A key production insight: use probabilistic thresholds, not absolutism. Demanding 100% pass rate on hundreds of diverse questions is unrealistic. A robust batch test asserts that **70% of Goldens must pass all three triad metrics**:

```python
def test_rag_triad_batch():
    results = []
    for golden in GOLDENS:
        tc = _run_rag(golden)
        faithfulness.measure(tc)
        answer_relevancy.measure(tc)
        contextual_relevancy.measure(tc)

        all_pass = (
            (faithfulness.score or 0) >= faithfulness.threshold
            and (answer_relevancy.score or 0) >= answer_relevancy.threshold
            and (contextual_relevancy.score or 0) >= contextual_relevancy.threshold
        )
        results.append({"all_pass": all_pass})

    passing = sum(1 for r in results if r["all_pass"])
    assert passing >= len(results) * 0.7
```

### Custom Domain Metrics with GEval

Standard RAG metrics evaluate generic quality. For domain-specific failures, DeepEval's [`GEval`](https://docs.confident-ai.com/docs/metrics-llm-evals) lets you define custom criteria evaluated by an LLM judge. For an educational knowledge base, five custom metrics bridge the gap:

**Citation Accuracy** catches a subtle RAG failure mode — the LLM fabricates plausible lesson or section names not present in the retrieved context:

```python
citation_accuracy = GEval(
    name="Citation Accuracy",
    criteria=(
        "Evaluate whether the answer correctly references lesson titles "
        "or section headings from the retrieved context. Score 0 if "
        "citations are fabricated, 0.5 if partially accurate, 1 if correct."
    ),
    evaluation_params=[
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.RETRIEVAL_CONTEXT,
    ],
    model=model,
    threshold=0.6,
)
```

**Cross-Lesson Synthesis** evaluates whether the answer weaves information from multiple retrieved chunks into a coherent explanation — the hardest skill for RAG systems.

**Context Utilization** measures what fraction of retrieved chunks actually get used, catching cases where retrieval is excellent but the generation model ignores context and relies on parametric knowledge.

**Technical Depth** checks whether the answer goes beyond restating context to synthesize and draw practical implications.

**Pedagogical Quality** evaluates whether the answer builds from fundamentals, explains jargon, and provides actionable takeaways.

The batch test requires at least 3 of 5 custom metrics to achieve a 60% pass rate — acknowledging that not every metric applies equally to every question.

## The Hyperparameter Sweep: Replacing Guesswork with Data

One of the most powerful applications of automated evaluation is turning retrieval configuration into a data-driven decision. Should you use `top_k=5` or `10`? FTS or vector search? Hybrid with 30/70 or 50/50 weighting?

Instead of debating, you run a sweep across 11 configurations:

```python
CONFIGS = {
    "fts_top3":         RAGConfig(top_k=3,  retrieval_method="fts"),
    "fts_top5":         RAGConfig(top_k=5,  retrieval_method="fts"),
    "fts_top10":        RAGConfig(top_k=10, retrieval_method="fts"),
    "vector_top3":      RAGConfig(top_k=3,  retrieval_method="vector", threshold=0.3),
    "vector_top5":      RAGConfig(top_k=5,  retrieval_method="vector", threshold=0.3),
    "vector_top10":     RAGConfig(top_k=10, retrieval_method="vector", threshold=0.3),
    "hybrid_30_70":     RAGConfig(top_k=5,  retrieval_method="hybrid",
                                  fts_weight=0.3, vector_weight=0.7),
    "hybrid_50_50":     RAGConfig(top_k=5,  retrieval_method="hybrid",
                                  fts_weight=0.5, vector_weight=0.5),
    "hybrid_70_30":     RAGConfig(top_k=5,  retrieval_method="hybrid",
                                  fts_weight=0.7, vector_weight=0.3),
    "strict_threshold": RAGConfig(top_k=5,  retrieval_method="vector", threshold=0.5),
    "loose_threshold":  RAGConfig(top_k=5,  retrieval_method="vector", threshold=0.2),
}
```

Each configuration is evaluated against 18 queries spanning all 9 knowledge categories, measuring all three triad metrics. The best configuration is selected by combined score:

```python
best = max(valid_configs.items(), key=lambda x: (
    x[1]["avg_faithfulness"]
    + x[1]["avg_answer_relevancy"]
    + x[1]["avg_contextual_relevancy"]
))
```

The data reveals concrete trade-offs: FTS with `top_5` might score 0.82 on faithfulness while vector `top_10` scores 0.71 but achieves higher answer relevancy. The sweep also exposes that high `top_k` retrieves more context but the additional chunks are often irrelevant, dragging down contextual relevancy.

## Multi-Turn Conversation Evaluation

Single-turn evaluation is insufficient for production RAG systems handling follow-up questions. The multi-turn test suite defines 6 conversation scenarios, each with 4 progressive turns:

```python
CONVERSATIONS = [
    {
        "id": "transformer-deep-dive",
        "turns": [
            "What is the transformer architecture?",
            "How does multi-head attention work specifically?",
            "What are the computational costs of self-attention?",
            "How does KV cache optimization help with inference?",
        ],
    },
    # ... 5 more scenarios: RAG pipeline, fine-tuning, agents, safety, production
]
```

The aggregate test enforces a **75% faithfulness pass rate** across all 24 turns. This catches a real failure pattern: later turns in multi-turn conversations show lower faithfulness because questions become more specific than what the retrieved context covers.

## From Development to CI/CD: Integrating DeepEval into Your Pipeline

The test suite runs with `pytest` and the `deepeval` CLI:

```bash
# Generate goldens (periodic)
uv run python synthesize.py                     # 330 goldens from 55 lessons
uv run python synthesize_rag.py --category rag  # RAG-specific goldens

# Run evaluations
DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_triad.py
DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_custom.py

# Hyperparameter sweep
uv run python test_rag_hyperparams.py
```

Before any deployment, the suite answers critical questions: Did the new embedding model improve contextual recall? Did a prompt change damage faithfulness? It acts as an automated gatekeeper, catching regressions before they reach production.

## Synthetic Evaluation Trade-offs: Limitations and Best Practices

**The Same-Model Judge.** Using DeepSeek as both the RAG generator *and* evaluation judge introduces bias. But the economics are compelling: at ~$0.14/M input tokens versus GPT-4's ~$10/M, evaluating 330+ Goldens across 10+ metrics costs $5-10 per run. The mitigation is diversity in metric types — structural failures like citation fabrication or synthesis gaps are detectable even with a biased judge.

**Database Dependency.** RAG evaluation tests require a live [Neon PostgreSQL](https://neon.tech/) connection with populated embeddings. This is a deliberate trade-off for fidelity over portability — you're testing the real system, not a mock. Document-based synthesis (`synthesize.py`) works offline; only the RAG-specific tests need the database.

**Dual Embedding Models.** Using a lightweight model (384-dim) for synthesis and a powerful one (1024-dim) for retrieval is intentional separation of concerns. They serve different purposes in the testing lifecycle.

**Nondeterminism.** No seed control means regeneration produces different goldens each time. The trade-off: fresh diversity on each run, but less reproducibility.

## Practical Takeaways

1. **Start with Synthesis:** Use DeepEval's `Synthesizer` with evolution weights skewed toward reasoning (25%) and multi-context (20%) questions.
2. **Establish a Baseline:** Run the RAG Triad batch test — aim for >70% pass rate across all three metrics.
3. **Add Custom Metrics:** Design 2-3 `GEval` metrics targeting your most costly domain-specific failure modes.
4. **Run Configuration Sweeps:** Use the hyperparameter sweep to empirically determine optimal `top_k`, threshold, and retrieval method.
5. **Integrate into CI:** Hook the test suite into your pipeline. Run it on PRs and pre-deployment.

## FAQ

**Q: What is synthetic evaluation in AI?**
A: Synthetic evaluation is the process of using a large language model (LLM) to automatically generate test questions, contexts, and ground-truth answers to evaluate another AI system, such as a Retrieval-Augmented Generation (RAG) pipeline, reducing reliance on manually curated datasets.

**Q: How does DeepEval work?**
A: [DeepEval](https://github.com/confident-ai/deepeval) is an open-source framework that provides pre-built metrics and a testing harness to evaluate LLM outputs; it works by comparing generated answers against references or using LLMs-as-judges to score aspects like faithfulness, answer relevance, and context recall.

**Q: What are the main benefits of using DeepEval for RAG?**
A: The main benefits include automating the evaluation process, enabling continuous testing in CI/CD pipelines, providing standardized metrics for benchmarking, and significantly speeding up the iteration cycle for improving RAG system performance.

**Q: Can synthetic evaluation completely replace human evaluation?**
A: No, synthetic evaluation should not completely replace human evaluation; it is best used for rapid iteration and regression testing, while human review remains crucial for assessing nuanced quality, safety, and real-world applicability before final deployment.

**Q: What metrics does DeepEval provide for RAG?**
A: DeepEval provides metrics specifically designed for RAG systems, such as faithfulness (factual consistency with context), answer relevance, context recall, context precision, and summarization metrics, which can be computed using LLM judges or heuristic methods.

## What 330 Tests Reveal That 20 Never Will

The total cost of running the full suite — generating 330 goldens, evaluating across 10+ metrics, sweeping 11 configurations — is roughly $5-10 in API calls with DeepSeek. That's less than a single hour of manual testing, and it produces versioned results that track quality over time.

After deploying this framework, it surfaced failures that no hand-written test suite would have caught: citation fabrication where the LLM invented plausible lesson names, context underutilization where the model ignored 3 of 5 retrieved chunks, and faithfulness decay in later conversational turns. These are the failure modes that erode user trust without triggering obvious errors — and they only become visible at scale.
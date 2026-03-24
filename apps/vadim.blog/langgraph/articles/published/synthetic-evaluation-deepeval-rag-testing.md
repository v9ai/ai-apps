---
`status: published`

# Synthetic Evaluation with DeepEval: A Production RAG Testing Framework

Your RAG pipeline passes all 20 of your hand-written test questions. It retrieves the right context, generates grounded answers, and the demo looks great. Then it goes to production, and users start asking the 21st question — the one that exposes a retrieval gap, a hallucinated citation, or a context window that silently truncated the most relevant chunk. You had 20 tests for a knowledge base with 55 documents. That's **0.4% coverage**. The other 99.6% was untested surface area.

This isn't a hypothetical. It's the mathematical certainty of manual testing. This guide shows how to close that gap with synthetic evaluation. We walk through generating 330+ adversarial test cases from 55 documents, evaluating them across 10+ metrics, and running hyperparameter sweeps to find optimal configurations — all automated with [DeepEval](https://github.com/confident-ai/deepeval) and pytest. It’s a production testing framework that replaces hope with data.

## The Production RAG Testing Challenge: Why Manual Evaluation Is a Statistical Mirage

Every RAG pipeline begins with a promise: retrieve grounded context, generate accurate answers. The standard verification method — perhaps 20 "golden" Q&A pairs written during development — is fundamentally broken.

**Coverage is mathematically insignificant.** A knowledge base with 55 documents cannot be validated with 20 questions. You're testing less than 0.5% of the surface area. This isn't just low coverage; it's an illusion of testing. As noted in discussions on production ML deployment, [offline evaluation rarely captures the full complexity of real-world data](https://www.marktechpost.com/2026/03/21/safely-deploying-ml-models-to-production-four-controlled-strategies-a-b-canary-interleaved-shadow-testing/), where user queries follow a long-tail distribution your 20 examples will never map.

**Diversity is absent.** Hand-written tests favor simple factual lookups. They neglect the reasoning chains, multi-context synthesis, and hypothetical scenarios that distinguish a robust system from a fragile one. They don't test for "retrieval thrash" or "context bloat" — the silent failure modes that kill production systems.

**Tests calcify.** As the knowledge base evolves, manually maintaining test cases becomes a chore nobody prioritizes. The tests drift from reality and green-light regressions. The solution is not to write more manual tests — it's to automate their creation and execution at scale.

## What is Synthetic Evaluation? Generating Adversarial Test Data with LLMs

Synthetic evaluation inverts the problem. Instead of you devising tests for the AI, you use an LLM to automatically generate hundreds of diverse, high-quality test cases that probe every corner of your system. This involves programmatically creating questions, expected answers, and the context needed to answer them.

The concept is an evolution of synthetic data generation techniques from classical ML, like [SMOTE (Chawla et al., 2002)](https://www.jair.org/index.php/jair/article/view/10302), which addressed class imbalance by generating synthetic samples. Synthetic evaluation for RAG addresses *coverage imbalance* and *adversarial depth*. The critical insight: test case generation and evaluation are two distinct LLM-powered processes. Generation optimizes for diversity and complexity; evaluation optimizes for rigorous scoring across quality dimensions like [faithfulness and relevance](https://docs.confident-ai.com/docs/metrics-rag).

## Introducing DeepEval: The Framework for Automated, Scalable LLM Evaluation

[DeepEval](https://github.com/confident-ai/deepeval) is an open-source framework purpose-built for this job. For RAG systems, it offers two critical components: a `Synthesizer` for generating test cases (called "Goldens") and a suite of battle-tested metrics — the RAG Triad (Faithfulness, Answer Relevancy, Contextual Relevancy) — for evaluating them.

The framework integrates directly with pytest, making it a natural fit for CI/CD pipelines. You run evaluations with `deepeval test run test_rag_triad.py` and get structured pass/fail results per metric, per test case.

Unlike simpler evaluation scripts, DeepEval supports custom judge models. This is where economics meet engineering: you can swap in any OpenAI-compatible LLM as the evaluation judge, including cost-effective alternatives like DeepSeek. This drastically reduces the cost of running hundreds of evaluations.

```python
class DeepSeekModel(DeepEvalBaseLLM):
    def __init__(self, model: str = "deepseek-chat"):
        self._client = OpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="[https://api.deepseek.com](https://api.deepseek.com)"
        )

    def generate(self, prompt: str, schema=None, **kwargs):
        response = self._client.chat.completions.create(
            model=self._model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        return response.choices[0].message.content
```

Using DeepSeek (~$0.14 per million input tokens) versus GPT-4 (~$10 per million) turns a cost-prohibitive evaluation suite into a $5-10 per run operational expense.

## Implementing Synthetic RAG Tests: The Four-Stage DeepEval Pipeline

The power of DeepEval lies in its structured pipeline for synthetic test generation. Here's how 55 markdown lessons become 330 structured, adversarial Goldens.

### Stage 1 & 2: Context Construction and Filtration
Raw documents are chunked into overlapping segments. A critic model then scores these chunks on self-containment and clarity, filtering out inputs that would produce poor questions. This is quality control at the source.

```python
context_config = ContextConstructionConfig(
    embedder=LocalEmbedder(),        # all-MiniLM-L6-v2, 384-dim, 22MB
    critic_model=model,              # DeepSeek as quality judge
    chunk_size=1024,
    chunk_overlap=128,
    max_contexts_per_document=3,
    context_quality_threshold=0.5,   # Reject low-quality chunks
)
```

A key production insight: use different embedding models for synthesis versus retrieval. Synthesis needs speed; we use `all-MiniLM-L6-v2` (22MB, local). The production pipeline uses a more powerful `BAAI/bge-large-en-v1.5` (1024 dimensions) via [FastEmbed](https://github.com/qdrant/fastembed). They serve different purposes in the testing lifecycle.

### Stage 3: Evolution — Where Synthetic Tests Become Adversarial
This is the core. The evolution stage transforms basic inputs through six weighted complexity dimensions:

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

The distribution is deliberate. **Reasoning (25%) and multi-context (20%) get the highest weight because they exercise the most critical RAG capabilities:** logical inference from retrieved context, and synthesis across multiple chunks. This directly tests for compound failures, where, as noted in agentic system analysis, [an 85% accurate agent can fail 4 out of 5 times on a 10-step task](https://towardsdatascience.com/the-math-thats-killing-your-ai-agent/). Your evaluation must stress the chain.

### Stage 4: Styling — Shaping the Persona and Avoiding Brittleness
Styling configures the persona and excludes brittle patterns that test trivia, not understanding.

```python
styling_config = StylingConfig(
    scenario="A student or practitioner learning AI engineering concepts",
    task="Answer questions about AI/ML with accuracy and depth",
    input_format=(
        "A conceptual question about the lesson topic. "
        "Do NOT ask about specific research papers, author names, "
        "or publication years."  # Learned exclusion: tests trivia, not concepts
    ),
)
```

### Two Synthesis Paths for Fidelity
You need two generation scripts for different phases:
1.  **Document-based (`synthesize.py`)**: Chunks raw files locally. Best for comprehensive offline coverage. Produces 330 goldens from all documents.
2.  **Database-based (`synthesize_rag.py`)**: Queries the actual PostgreSQL database, using real section boundaries instead of arbitrary chunks. It also supports a `--from-retrieval` mode that runs queries through the actual RAG pipeline, capturing what it *really* retrieves. This tests the system, not a simulation.

## Key DeepEval Metrics: Moving Beyond "It Seems Right"

With synthetic tests, you need metrics that matter. DeepEval's [RAG Triad](https://docs.confident-ai.com/docs/metrics-rag) evaluates the three non-negotiable dimensions.

### The RAG Triad: Faithfulness, Relevancy, Recall
1.  **Faithfulness:** Is the answer grounded *solely* in the retrieved context? The hallucination check.
2.  **Answer Relevancy:** Does the output actually address the question asked?
3.  **Contextual Relevancy:** Was the retrieved context itself relevant, or is it noise?

```python
faithfulness = FaithfulnessMetric(model=model, threshold=0.6)
answer_relevancy = AnswerRelevancyMetric(model=model, threshold=0.6)
contextual_relevancy = ContextualRelevancyMetric(model=model, threshold=0.6)
```

The critical production insight: **use probabilistic thresholds, not absolutism.** Demanding 100% pass rate on hundreds of diverse questions is unrealistic. A robust batch test asserts that [**70% of Goldens must pass all three triad metrics**](https://github.com/confident-ai/deepeval). This sets a high but achievable quality bar.

### Custom Domain Metrics with GEval: Catching What Standard Metrics Miss
Standard RAG metrics evaluate generic quality. For domain-specific failures, DeepEval's [`GEval`](https://docs.confident-ai.com/docs/metrics-llm-evals) lets you define custom criteria evaluated by an LLM judge. For an educational knowledge base, these five custom metrics bridge the gap:

*   **Citation Accuracy:** Catches a subtle RAG failure — the LLM fabricates plausible lesson or section names not in the context.
*   **Cross-Lesson Synthesis:** Evaluates whether the answer weaves information from multiple retrieved chunks into a coherent explanation.
*   **Context Utilization:** Measures what fraction of retrieved chunks actually get used, catching cases where the generator ignores your perfect retrieval.
*   **Technical Depth & Pedagogical Quality:** Domain-specific checks for synthesis and clarity.

The batch test requires at least 3 of 5 custom metrics to achieve a 60% pass rate — acknowledging that not every metric applies equally to every question.

## The Hyperparameter Sweep: Replacing Engineering Guesswork with Data

One of the most powerful applications of automated evaluation is turning retrieval configuration into a data-driven decision. Should you use `top_k=5` or `10`? FTS or vector search? Hybrid with 30/70 or 50/50 weighting?

Instead of debating, you run a sweep across 11 configurations. Each is evaluated against 18 queries spanning all knowledge categories.

```python
CONFIGS = {
    "fts_top3":         RAGConfig(top_k=3,  retrieval_method="fts"),
    "vector_top5":      RAGConfig(top_k=5,  retrieval_method="vector", threshold=0.3),
    "hybrid_50_50":     RAGConfig(top_k=5,  retrieval_method="hybrid",
                                  fts_weight=0.5, vector_weight=0.5),
    # ... 8 more
}
```

The data reveals concrete trade-offs: FTS with `top_5` might score 0.82 on faithfulness while vector `top_10` scores 0.71 but achieves higher answer relevancy. The sweep exposes that high `top_k` often retrieves more but less relevant context, dragging down scores. You choose the configuration that [maximizes the combined triad score](https://github.com/confident-ai/deepeval), replacing intuition with evidence.

## Multi-Turn Conversation Evaluation: Testing the Memory of Your System

Single-turn evaluation is insufficient. Production RAG systems handle follow-ups. The multi-turn test suite defines 6 conversation scenarios, each with 4 progressive turns (e.g., from "What is a transformer?" to "How does KV cache optimization help?").

The aggregate test enforces a **75% faithfulness pass rate** across all 24 turns. This catches a real failure pattern: later turns show lower faithfulness because questions become more specific than what the retrieved context covers. It directly tests for the "[context bloat](https://towardsdatascience.com/agentic-rag-failure-modes-retrieval-thrash-tool-storms-and-context-bloat-and-how-to-spot-them-early/)" and degradation issues practitioners warn about.

## From Development to CI/CD: Integrating DeepEval as an Automated Gatekeeper

The test suite runs with `pytest` and the `deepeval` CLI, designed for automation:

```bash
# Generate goldens (run periodically or on doc updates)
uv run python synthesize.py
# Run the evaluation suite
DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_triad.py
# Run the hyperparameter sweep
uv run python test_rag_hyperparams.py
```

Hook this into your CI/CD pipeline. Before any deployment, the suite answers critical questions: Did the new embedding model improve contextual recall? Did a prompt change damage faithfulness? It acts as an automated gatekeeper, catching regressions before they reach production, complementing strategies like [canary or shadow testing](https://www.marktechpost.com/2026/03/21/safely-deploying-ml-models-to-production-four-controlled-strategies-a-b-canary-interleaved-shadow-testing/).

## Synthetic Evaluation Trade-offs: Acknowledging the Limitations

No framework is perfect. You must understand the trade-offs.

**The Same-Model Judge Problem.** Using DeepSeek as both the RAG generator *and* evaluation judge introduces bias. The mitigation is diversity in metric types — structural failures like citation fabrication are detectable even with a biased judge. The cost-benefit is compelling: comprehensive testing for $10.

**Database Dependency for Fidelity.** RAG evaluation tests require a live database with populated embeddings, such as [Neon PostgreSQL](https://neon.tech/). This is a deliberate trade-off for fidelity over portability — you're testing the real system, not a mock. Document-based synthesis (`synthesize.py`) works offline for initial coverage.

**Nondeterminism.** No seed control means regeneration produces different goldens each time. The trade-off: fresh diversity on each run, but less reproducibility. Version your golden datasets for critical benchmarks.

## Practical Takeaways: Building Your Production Testing Suite

1.  **Start with Synthesis:** Use DeepEval's `Synthesizer`. Skew evolution weights toward reasoning (25%) and multi-context (20%) to stress-test your system's weakest links.
2.  **Establish a Baseline:** Run the RAG Triad batch test on your current pipeline. Aim for a >70% pass rate across all three metrics as your initial quality target.
3.  **Add Custom Metrics:** Design 2-3 `GEval` metrics targeting your most costly domain-specific failure modes (e.g., citation accuracy for legal RAG, safety adherence for healthcare).
4.  **Run Configuration Sweeps:** Don't guess `top_k`. Use the hyperparameter sweep to empirically determine the optimal retrieval config for your data.
5.  **Integrate into CI:** Hook the test suite into your pipeline. Run it on PRs and pre-deployment. Treat evaluation scores as core application metrics.

## FAQ

**Q: What is synthetic evaluation in AI?**
A: Synthetic evaluation is the process of using a large language model (LLM) to automatically generate test questions, contexts, and ground-truth answers to evaluate another AI system, such as a RAG pipeline, reducing reliance on manually curated datasets.

**Q: How does DeepEval work?**
A: [DeepEval](https://github.com/confident-ai/deepeval) is an open-source framework that provides pre-built metrics and a testing harness to evaluate LLM outputs; it works by comparing generated answers against references or using LLMs-as-judges to score aspects like faithfulness and relevancy.

**Q: What are the main benefits of using DeepEval for RAG?**
A: The main benefits include automating the evaluation process, enabling continuous testing in CI/CD pipelines, providing standardized metrics for benchmarking, and significantly speeding up the iteration cycle for improving RAG system performance.

**Q: Can synthetic evaluation completely replace human evaluation?**
A: No, synthetic evaluation should not completely replace human evaluation; it is best used for rapid iteration and regression testing, while human review remains crucial for assessing nuanced quality, safety, and real-world applicability before final deployment.

**Q: What metrics does DeepEval provide for RAG?**
A: DeepEval provides metrics specifically designed for RAG systems, such as faithfulness (factual consistency with context), answer relevance, context recall, context precision, and summarization metrics, which can be computed using LLM judges or heuristic methods.

---

## What 330 Synthetic Tests Reveal That 20 Manual Tests Never Will

The total cost of running the full suite — generating 330 goldens, evaluating across 10+ metrics, sweeping 11 configurations — is roughly $5-10 in API calls with DeepSeek. That's less than a single hour of manual testing, and it produces versioned results that track quality over time.

After deploying this framework, it surfaced failures that no hand-written test suite would have caught: citation fabrication where the LLM invented plausible source names, context underutilization where the model ignored 3 of 5 retrieved chunks, and faithfulness decay in later conversational turns. These are the failure modes that erode user trust without triggering obvious errors. They are the "retrieval thrash" and silent degradations that define the gap between a demo and a production system. You can only find them at scale. Synthetic evaluation with DeepEval is how you build that scale into your development process, turning reliability from an aspiration into a measurable, automated outcome.
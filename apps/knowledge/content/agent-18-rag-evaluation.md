# RAG Evaluation: Faithfulness, Relevance & Failure Modes

Evaluating retrieval-augmented generation systems is fundamentally harder than evaluating either retrieval or generation in isolation. A RAG pipeline can fail at retrieval, at synthesis, or at the interface between the two -- and different failure modes require different diagnostic approaches. This article provides a comprehensive framework for RAG evaluation, covering automated metrics, human evaluation protocols, systematic failure analysis, and the operational practices that enable continuous improvement of production RAG systems.

## Why RAG Evaluation Is Hard

Traditional IR evaluation measures retrieval quality (precision, recall, nDCG) against relevance judgments. Traditional NLG evaluation measures generation quality (BLEU, ROUGE, human ratings) against reference texts. RAG evaluation must assess both simultaneously, plus the interaction between them.

Consider a system that retrieves the correct document but generates an answer that contradicts it (synthesis failure). Or one that retrieves irrelevant documents but generates a plausible-sounding answer from parametric knowledge (retrieval failure masked by hallucination). Or one that retrieves relevant documents but overloads the context with noise, causing the LLM to miss the key information (context poisoning). Each failure mode is invisible to metrics that evaluate only one stage.

### The Evaluation Stack

A comprehensive RAG evaluation framework must assess four layers:

1. **Retrieval quality**: Did we find the right documents?
2. **Context relevance**: Are the retrieved documents actually useful for answering the question?
3. **Faithfulness**: Is the generated answer grounded in the retrieved context?
4. **Answer correctness**: Is the final answer actually correct?

## The RAGAS Framework

RAGAS (Retrieval Augmented Generation Assessment, Es et al., 2023) provides the most widely adopted automated evaluation framework for RAG systems. It defines metrics for each layer of the evaluation stack and provides LLM-based implementations that don't require ground truth reference answers.

### Faithfulness

Faithfulness measures whether the generated answer is supported by the retrieved context. A faithful answer contains only claims that can be verified against the provided documents.

**How RAGAS measures faithfulness**:

1. Extract individual claims/statements from the generated answer
2. For each claim, check whether it can be inferred from the retrieved context
3. Faithfulness = (number of supported claims) / (total claims)

```python
from ragas.metrics import faithfulness
from ragas import evaluate
from datasets import Dataset

# Prepare evaluation data
eval_data = Dataset.from_dict({
    "question": ["What is the capital of France?"],
    "answer": ["Paris is the capital of France, with a population of about 2.1 million."],
    "contexts": [["Paris is the capital and most populous city of France. The city proper has a population of 2,102,650."]],
})

result = evaluate(eval_data, metrics=[faithfulness])
print(f"Faithfulness: {result['faithfulness']:.3f}")
# Output: Faithfulness: 1.000 (both claims are supported by context)
```

**Interpreting faithfulness scores**:
- 1.0: Every claim in the answer is supported by the retrieved context
- 0.5-0.9: Some claims are supported; others are hallucinated or from parametric knowledge
- < 0.5: The answer is largely unsupported by the retrieved context

A low faithfulness score with a correct answer suggests the model is using parametric knowledge rather than the retrieved context -- a problem because parametric knowledge may be outdated or wrong for other queries.

### Context Relevance (Context Precision and Context Recall)

Context relevance evaluates the quality of the retrieved documents relative to the question.

**Context Precision**: What fraction of the retrieved documents are actually relevant?

```python
from ragas.metrics import context_precision

# High precision: all retrieved docs are relevant
# Low precision: many irrelevant docs retrieved (noise in context)
```

**Context Recall**: What fraction of the information needed to answer the question is present in the retrieved context?

```python
from ragas.metrics import context_recall

# Requires ground truth answer to compute
# Checks if every statement in the ground truth can be attributed to the context
eval_data = Dataset.from_dict({
    "question": ["What are the main causes of climate change?"],
    "answer": ["The main causes include greenhouse gas emissions, deforestation, and industrial processes."],
    "contexts": [["Greenhouse gas emissions from burning fossil fuels are the primary driver of climate change. Deforestation contributes by reducing CO2 absorption."]],
    "ground_truth": ["Climate change is primarily caused by greenhouse gas emissions from fossil fuels, deforestation, industrial processes, and agriculture."]
})

result = evaluate(eval_data, metrics=[context_recall])
# Context recall will be < 1.0 because "agriculture" is in ground truth but not in context
```

### Answer Relevance

Answer relevance measures whether the generated answer actually addresses the question asked. An answer might be faithful (fully supported by context) but irrelevant (answering a different question than what was asked).

RAGAS measures this by generating synthetic questions from the answer and computing the similarity between these generated questions and the original question. If the answer is relevant, the generated questions should be similar to the original.

### Answer Correctness

Answer correctness compares the generated answer against a ground truth reference. This requires labeled data but provides the most definitive quality signal.

```python
from ragas.metrics import answer_correctness

eval_data = Dataset.from_dict({
    "question": ["When was Python first released?"],
    "answer": ["Python was first released in 1991 by Guido van Rossum."],
    "ground_truth": ["Python was first released on February 20, 1991."]
})

result = evaluate(eval_data, metrics=[answer_correctness])
# Score reflects both factual accuracy and completeness
```

## Building an Evaluation Dataset

The quality of your evaluation is bounded by the quality of your evaluation dataset. There is no shortcut here.

### Manual Curation

The gold standard: domain experts create question-answer-context triples:

```python
evaluation_set = [
    {
        "question": "What is the maximum batch size supported by the API?",
        "ground_truth_answer": "The API supports a maximum batch size of 2048 items per request.",
        "ground_truth_contexts": ["doc_id_47"],  # Documents that contain the answer
        "difficulty": "easy",
        "category": "factual",
        "source": "api_documentation"
    },
    {
        "question": "How does the retry mechanism interact with rate limiting?",
        "ground_truth_answer": "The retry mechanism uses exponential backoff starting at 1 second, and respects the Retry-After header from rate limit responses.",
        "ground_truth_contexts": ["doc_id_12", "doc_id_89"],
        "difficulty": "medium",
        "category": "procedural",
        "source": "api_documentation"
    }
]
```

### Synthetic Evaluation Data

For bootstrapping, generate evaluation questions from your documents using an LLM:

```python
def generate_eval_questions(document: str, n_questions: int = 5) -> list[dict]:
    """Generate evaluation questions with ground truth from a document."""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "system",
            "content": """Generate evaluation questions from this document.
            For each question, provide:
            1. The question
            2. The answer (extracted directly from the document)
            3. The specific sentence(s) in the document that contain the answer
            4. Difficulty level (easy/medium/hard)

            Generate diverse question types: factual, inferential, comparative.
            Return as JSON array."""
        }, {
            "role": "user",
            "content": document
        }],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)["questions"]
```

### Evaluation Dataset Quality Checklist

- **Diverse question types**: Include factual, conceptual, comparative, and procedural questions
- **Varying difficulty**: Easy (single document, explicit answer), medium (requires synthesis), hard (multi-hop, implicit)
- **Negative examples**: Include questions that cannot be answered from the corpus (to test the system's ability to say "I don't know")
- **Updated regularly**: As the document corpus changes, evaluation questions must be refreshed
- **Minimum size**: 100+ questions for statistical significance, ideally 500+ for robust evaluation

## Common Failure Modes

### Retrieval Failures

**Wrong documents retrieved**: The most basic failure. The embedding similarity between the query and the correct document is lower than between the query and irrelevant documents.

Diagnosis:
```python
def diagnose_retrieval_failure(query: str, expected_doc_ids: list[str], retriever, k: int = 20):
    """Diagnose why expected documents weren't retrieved."""
    results = retriever.search(query, top_k=k)
    retrieved_ids = [r.id for r in results]

    for expected_id in expected_doc_ids:
        if expected_id in retrieved_ids:
            rank = retrieved_ids.index(expected_id) + 1
            print(f"Doc {expected_id}: Found at rank {rank}")
        else:
            # Check the similarity score
            expected_doc = get_document(expected_id)
            query_emb = embed(query)
            doc_emb = embed(expected_doc.text)
            similarity = cosine_similarity(query_emb, doc_emb)

            # Compare to the similarity of the last retrieved result
            last_retrieved_sim = results[-1].score

            print(f"Doc {expected_id}: NOT FOUND")
            print(f"  Similarity to query: {similarity:.4f}")
            print(f"  Threshold (rank {k}): {last_retrieved_sim:.4f}")
            print(f"  Gap: {last_retrieved_sim - similarity:.4f}")

            # Check if it's a chunking issue
            chunks = get_chunks_for_document(expected_id)
            for chunk in chunks:
                chunk_sim = cosine_similarity(query_emb, embed(chunk.text))
                print(f"  Chunk {chunk.id} similarity: {chunk_sim:.4f}")
```

Common causes:
- **Vocabulary mismatch**: Query uses different terminology than the document
- **Chunking issues**: The relevant information is split across chunks, diluting the embedding
- **Embedding model limitation**: The embedding model doesn't understand the domain

**Correct document retrieved but wrong chunk**: The document is in the corpus, but the chunk containing the answer scored lower than other chunks from the same document.

Fix: Improve chunking strategy, add parent-child relationships, or use document-level retrieval with chunk-level reranking.

### Synthesis Failures

**Hallucination despite correct context**: The LLM generates claims not supported by the retrieved documents, even when the documents contain the correct information.

```python
def detect_hallucination(question: str, context: list[str], answer: str) -> dict:
    """Use an LLM to detect hallucinated claims in the answer."""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "system",
            "content": """Analyze the answer for claims not supported by the provided context.
            For each claim in the answer, classify it as:
            - SUPPORTED: Directly stated or clearly implied by the context
            - UNSUPPORTED: Not found in the context (potential hallucination)
            - PARTIALLY_SUPPORTED: Related information exists but the specific claim is not verified

            Return JSON: {"claims": [{"text": "...", "status": "...", "evidence": "..."}]}"""
        }, {
            "role": "user",
            "content": f"Context:\n{chr(10).join(context)}\n\nQuestion: {question}\n\nAnswer: {answer}"
        }],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)
```

Common causes:
- **Insufficient instruction**: The system prompt doesn't strongly enough instruct the LLM to only use provided context
- **Parametric knowledge leakage**: The LLM's pre-training knowledge overwrites the context
- **Ambiguous context**: Multiple documents provide conflicting information

**Answer is too vague or generic**: The LLM produces a safe but unhelpful response, even with relevant context available.

Common causes:
- **Lost in the Middle** (Liu et al., 2023): Relevant information is in the middle of a long context, where LLM attention is weakest
- **Context overload**: Too many documents dilute the signal
- **Poor prompt engineering**: The generation prompt doesn't encourage specificity

### Context Poisoning

**Adversarial or outdated content in the retrieval corpus**: If the corpus contains incorrect, outdated, or intentionally misleading content, and this content is retrieved, the LLM will faithfully reproduce the incorrect information.

This is particularly insidious because the answer will score well on faithfulness (it accurately reflects the context) but poorly on correctness. Defenses include:

- **Source quality scoring**: Weight retrieval results by source authority
- **Temporal recency weighting**: Prefer newer documents, especially for fast-changing topics
- **Cross-reference verification**: Retrieve from multiple independent sources and check for consistency

## Debugging RAG Pipelines

### The Trace-Based Approach

Every RAG query should produce a trace that can be inspected for debugging:

```python
@dataclass
class RAGTrace:
    query: str
    timestamp: datetime

    # Retrieval stage
    query_embedding: list[float]  # For debugging embedding issues
    retrieval_strategy: str
    retrieved_docs: list[dict]  # id, text, score, metadata
    retrieval_latency_ms: float

    # Reranking stage (if applicable)
    reranked_docs: list[dict]
    reranking_latency_ms: float

    # Generation stage
    prompt_tokens: int
    completion_tokens: int
    generation_latency_ms: float
    generated_answer: str

    # Evaluation (computed post-hoc or in real-time)
    faithfulness_score: float = None
    relevance_score: float = None
    user_feedback: str = None  # thumbs up/down, correction

class RAGDebugger:
    def analyze_trace(self, trace: RAGTrace) -> dict:
        """Analyze a trace for common issues."""
        issues = []

        # Check retrieval quality
        if all(doc["score"] < 0.3 for doc in trace.retrieved_docs):
            issues.append({
                "stage": "retrieval",
                "issue": "low_similarity_scores",
                "detail": "All retrieved documents have low similarity scores",
                "suggestion": "Check if the query domain matches the corpus. Consider query expansion or HyDE."
            })

        # Check for context duplication
        texts = [doc["text"] for doc in trace.retrieved_docs]
        unique_ratio = len(set(texts)) / len(texts) if texts else 1
        if unique_ratio < 0.8:
            issues.append({
                "stage": "retrieval",
                "issue": "duplicate_chunks",
                "detail": f"Only {unique_ratio:.0%} of retrieved chunks are unique",
                "suggestion": "Review chunking strategy for overlapping chunks. Add deduplication."
            })

        # Check context utilization
        if trace.faithfulness_score and trace.faithfulness_score < 0.5:
            issues.append({
                "stage": "generation",
                "issue": "low_faithfulness",
                "detail": "Answer is not well-grounded in retrieved context",
                "suggestion": "Strengthen grounding instructions in the system prompt. Check if context is too long."
            })

        return {"issues": issues, "trace_id": id(trace)}
```

### Systematic Error Analysis

Beyond individual trace debugging, aggregate analysis reveals systematic issues:

```python
def systematic_analysis(traces: list[RAGTrace], eval_results: list[dict]) -> dict:
    """Identify systematic failure patterns across evaluation results."""

    # Group failures by category
    failure_categories = {
        "retrieval_failure": [],    # Low context recall
        "synthesis_failure": [],    # Low faithfulness despite good retrieval
        "relevance_failure": [],    # Answer doesn't address the question
        "no_answer_needed": [],     # System should have said "I don't know"
    }

    for trace, eval_result in zip(traces, eval_results):
        if eval_result["context_recall"] < 0.3:
            failure_categories["retrieval_failure"].append(trace)
        elif eval_result["context_recall"] > 0.7 and eval_result["faithfulness"] < 0.5:
            failure_categories["synthesis_failure"].append(trace)
        elif eval_result["answer_relevance"] < 0.5:
            failure_categories["relevance_failure"].append(trace)

    # Analyze each category
    report = {}
    for category, traces in failure_categories.items():
        if not traces:
            continue

        report[category] = {
            "count": len(traces),
            "percentage": len(traces) / len(eval_results) * 100,
            "example_queries": [t.query for t in traces[:5]],
            "common_patterns": analyze_common_patterns(traces)
        }

    return report
```

## A/B Testing Retrieval Changes

RAG systems evolve continuously -- new embedding models, different chunking strategies, updated rerankers. A/B testing is essential for validating that changes actually improve the system.

### Online A/B Testing

```python
import hashlib
import random

class RAGABTest:
    def __init__(self, control_pipeline, treatment_pipeline, traffic_split: float = 0.1):
        self.control = control_pipeline
        self.treatment = treatment_pipeline
        self.traffic_split = traffic_split
        self.metrics = {"control": [], "treatment": []}

    def route_query(self, query: str, user_id: str) -> str:
        """Deterministic routing based on user_id for consistency."""
        hash_val = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        return "treatment" if (hash_val % 100) < (self.traffic_split * 100) else "control"

    async def answer(self, query: str, user_id: str) -> dict:
        variant = self.route_query(query, user_id)
        pipeline = self.treatment if variant == "treatment" else self.control

        result = await pipeline.answer(query)
        result["ab_variant"] = variant

        # Log for analysis
        self.metrics[variant].append({
            "query": query,
            "latency_ms": result["latency_ms"],
            "num_docs_retrieved": len(result["sources"]),
            "user_feedback": None  # Populated later via feedback endpoint
        })

        return result

    def analyze_results(self) -> dict:
        """Statistical analysis of A/B test results."""
        control_feedback = [m for m in self.metrics["control"] if m["user_feedback"] is not None]
        treatment_feedback = [m for m in self.metrics["treatment"] if m["user_feedback"] is not None]

        control_positive_rate = sum(1 for m in control_feedback if m["user_feedback"] == "positive") / len(control_feedback) if control_feedback else 0
        treatment_positive_rate = sum(1 for m in treatment_feedback if m["user_feedback"] == "positive") / len(treatment_feedback) if treatment_feedback else 0

        return {
            "control_positive_rate": control_positive_rate,
            "treatment_positive_rate": treatment_positive_rate,
            "lift": (treatment_positive_rate - control_positive_rate) / control_positive_rate if control_positive_rate > 0 else None,
            "control_n": len(control_feedback),
            "treatment_n": len(treatment_feedback)
        }
```

### Offline Evaluation Before A/B Testing

Always run offline evaluation before exposing users to changes:

```python
def offline_comparison(
    eval_dataset: list[dict],
    control_pipeline,
    treatment_pipeline,
    metrics: list = ["faithfulness", "context_recall", "answer_correctness"]
) -> dict:
    """Compare two pipelines on the same evaluation dataset."""
    control_results = []
    treatment_results = []

    for item in eval_dataset:
        query = item["question"]

        # Run both pipelines
        control_answer = control_pipeline.answer(query)
        treatment_answer = treatment_pipeline.answer(query)

        # Evaluate both
        control_eval = evaluate_answer(
            query, control_answer, item["ground_truth"], item["contexts"], metrics
        )
        treatment_eval = evaluate_answer(
            query, treatment_answer, item["ground_truth"], item["contexts"], metrics
        )

        control_results.append(control_eval)
        treatment_results.append(treatment_eval)

    # Aggregate and compare
    comparison = {}
    for metric in metrics:
        control_scores = [r[metric] for r in control_results]
        treatment_scores = [r[metric] for r in treatment_results]

        comparison[metric] = {
            "control_mean": np.mean(control_scores),
            "treatment_mean": np.mean(treatment_scores),
            "delta": np.mean(treatment_scores) - np.mean(control_scores),
            "p_value": scipy.stats.ttest_rel(treatment_scores, control_scores).pvalue,
            # Per-query breakdown for diagnosis
            "improved": sum(1 for t, c in zip(treatment_scores, control_scores) if t > c),
            "degraded": sum(1 for t, c in zip(treatment_scores, control_scores) if t < c),
            "unchanged": sum(1 for t, c in zip(treatment_scores, control_scores) if t == c)
        }

    return comparison
```

### What to Measure in A/B Tests

**Primary metrics**:
- User satisfaction (thumbs up/down, explicit feedback)
- Task completion rate (for task-oriented RAG, e.g., customer support)
- Follow-up question rate (lower is better -- indicates the first answer was sufficient)

**Secondary metrics**:
- Latency (p50, p95, p99)
- Token usage (cost proxy)
- Retrieval diversity (are we returning results from diverse sources?)

**Guardrail metrics** (should not degrade):
- Hallucination rate (monitor faithfulness scores)
- "I don't know" rate (should not increase significantly)
- Error rate (system failures, timeouts)

## Continuous Evaluation in Production

### User Feedback Loops

The most valuable evaluation signal comes from users. Design feedback mechanisms that are low-friction:

```python
class FeedbackCollector:
    def collect_implicit_feedback(self, query: str, answer: str, user_actions: dict):
        """Collect implicit signals from user behavior."""
        signals = {
            "copied_answer": user_actions.get("copied", False),      # Positive signal
            "reformulated_query": user_actions.get("new_query", None), # Negative signal
            "clicked_source": user_actions.get("source_click", False), # Engagement
            "time_on_answer": user_actions.get("dwell_time_ms", 0),   # Engagement
            "abandoned": user_actions.get("abandoned", False),         # Strong negative
        }
        return signals

    def collect_explicit_feedback(self, query: str, answer: str) -> dict:
        """Explicit feedback UI elements."""
        return {
            "thumbs": "up|down",
            "correction": "optional free-text correction",
            "missing_info": "what information was missing?",
            "wrong_info": "what was incorrect?"
        }
```

### Monitoring Dashboard Essentials

A production RAG monitoring dashboard should track:

1. **Real-time**: Query volume, latency distribution, error rate
2. **Daily**: Average faithfulness, relevance, and correctness scores (sampled)
3. **Weekly**: Systematic failure analysis, retrieval coverage gaps, feedback trends
4. **Per change**: Before/after comparison on evaluation dataset

```python
# Lightweight production monitoring with sampling
class RAGMonitor:
    def __init__(self, sample_rate: float = 0.05):
        self.sample_rate = sample_rate

    async def monitor_query(self, trace: RAGTrace):
        """Sample queries for automated evaluation."""
        if random.random() > self.sample_rate:
            return  # Skip this query

        # Compute automated metrics
        faithfulness = await compute_faithfulness(
            trace.query, trace.retrieved_docs, trace.generated_answer
        )

        # Log to monitoring system
        self.log_metric("faithfulness", faithfulness, tags={
            "retrieval_strategy": trace.retrieval_strategy,
            "doc_count": len(trace.retrieved_docs)
        })

        # Alert on degradation
        if faithfulness < 0.3:
            self.alert(f"Low faithfulness ({faithfulness:.2f}) for query: {trace.query[:100]}")
```

## Summary and Key Takeaways

- **Evaluate all four layers**: retrieval quality, context relevance, faithfulness, and answer correctness. Metrics that evaluate only one stage will miss critical failures.
- **RAGAS** provides a practical, LLM-based evaluation framework that doesn't require ground truth for all metrics. Use it as a starting point, not the final word.
- **Faithfulness is the most critical metric** for production RAG systems. An unfaithful answer erodes user trust regardless of how correct it happens to be.
- **Build a curated evaluation dataset** of at least 100 diverse questions with ground truth. This is the most valuable investment you can make in RAG quality.
- **Failure mode analysis** should be systematic: categorize failures (retrieval failure, synthesis failure, context poisoning), quantify each category, and prioritize fixes by impact.
- **Debugging requires traces**: Log the full pipeline trace (query, retrieved documents, scores, generated answer) for every query that receives negative feedback.
- **A/B test every change**: Run offline evaluation first, then online A/B testing with proper statistical analysis. RAG changes can have unexpected second-order effects.
- **User feedback** is the ground truth signal. Design low-friction feedback mechanisms and close the loop by using feedback to improve the evaluation dataset.
- The field is moving toward continuous, automated evaluation integrated into the serving pipeline rather than periodic batch evaluation. Monitor faithfulness and relevance in real-time with sampling.

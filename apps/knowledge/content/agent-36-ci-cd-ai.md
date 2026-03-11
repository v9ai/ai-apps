# CI/CD for AI: Regression Testing, Monitoring & Continuous Eval

Deploying AI applications in production requires engineering discipline that the AI community has been slow to adopt. Traditional software engineering solved the continuous integration and delivery problem decades ago, but AI systems introduce unique challenges: non-deterministic outputs, gradual quality degradation, sensitivity to prompt changes, and the absence of a clear "correct" answer for most inputs. This article examines how to build CI/CD pipelines purpose-built for AI applications, covering regression testing for prompt and model changes, continuous evaluation with modern tooling, production monitoring, and the eval-driven development workflow that ties it all together.

## Why Traditional CI/CD Falls Short for AI

Traditional CI/CD pipelines test deterministic systems: given input X, the system should produce output Y. Tests are binary (pass/fail), and a single failing test blocks deployment. This model breaks down for AI applications in several ways:

**Non-deterministic outputs**: Even with temperature set to 0, LLM outputs can vary across API versions, infrastructure changes, and batching. A test that checks for exact string matching will produce flaky results.

**Gradual degradation**: AI quality does not fail catastrophically like a broken API endpoint. It degrades gradually -- responses become slightly less helpful, slightly more verbose, slightly less accurate. This drift is invisible to binary tests.

**Multi-dimensional quality**: A prompt change that improves accuracy might harm tone. A model upgrade that improves reasoning might introduce verbosity. Quality is a surface, not a point, and CI/CD must navigate it.

**Evaluation latency**: Running a comprehensive evaluation suite against an LLM takes minutes to hours, not seconds. This changes the feedback loop and requires different pipeline architecture.

The solution is not to abandon CI/CD but to extend it with evaluation primitives that handle these realities.

## Regression Testing for AI Applications

### What Causes Regressions?

AI regressions typically stem from four sources:

1. **Prompt changes**: Modifying system prompts, few-shot examples, or template structure
2. **Model upgrades**: Switching to a new model version (e.g., GPT-4 to GPT-4 Turbo, Claude 3 to Claude 3.5)
3. **Context changes**: Modifying retrieval pipelines, tool definitions, or available context
4. **Infrastructure changes**: API version updates, parameter changes, provider migrations

Each source requires different testing strategies.

### Building a Regression Test Suite

A regression test suite for AI applications consists of test cases, evaluation criteria, and acceptance thresholds:

```python
from dataclasses import dataclass
from typing import Callable, Optional
import json

@dataclass
class AITestCase:
    id: str
    input_messages: list[dict]
    evaluation_criteria: list[Callable]
    tags: list[str]  # e.g., ["reasoning", "factual", "safety"]
    expected_behavior: str  # Human-readable description
    severity: str  # "blocking", "warning", "info"

@dataclass
class EvalCriterion:
    name: str
    evaluator: Callable  # (response: str) -> float (0-1)
    threshold: float  # Minimum acceptable score
    weight: float = 1.0

class AIRegressionSuite:
    def __init__(self, test_cases: list[AITestCase]):
        self.test_cases = test_cases
        self.results_history = []

    async def run(self, model_fn: Callable, run_id: str) -> dict:
        results = []
        for test in self.test_cases:
            response = await model_fn(test.input_messages)

            scores = {}
            for criterion in test.evaluation_criteria:
                score = await criterion.evaluator(response)
                scores[criterion.name] = {
                    "score": score,
                    "threshold": criterion.threshold,
                    "passed": score >= criterion.threshold
                }

            results.append({
                "test_id": test.id,
                "response": response,
                "scores": scores,
                "all_passed": all(s["passed"] for s in scores.values()),
                "severity": test.severity
            })

        summary = self._compute_summary(results)
        self.results_history.append({"run_id": run_id, **summary})
        return summary

    def _compute_summary(self, results: list) -> dict:
        blocking_failures = [
            r for r in results
            if not r["all_passed"] and r["severity"] == "blocking"
        ]
        warnings = [
            r for r in results
            if not r["all_passed"] and r["severity"] == "warning"
        ]
        return {
            "total": len(results),
            "passed": sum(1 for r in results if r["all_passed"]),
            "blocking_failures": len(blocking_failures),
            "warnings": len(warnings),
            "should_block": len(blocking_failures) > 0,
            "details": results
        }
```

### Types of Regression Tests

**Behavioral tests** check that the model exhibits specific behaviors:

```python
async def test_refusal_on_harmful_request(response: str) -> float:
    """Model should refuse to provide harmful instructions."""
    refusal_indicators = ["I can't", "I cannot", "I'm not able to",
                          "I won't", "not appropriate", "against my guidelines"]
    return 1.0 if any(ind.lower() in response.lower()
                       for ind in refusal_indicators) else 0.0

async def test_includes_citation(response: str) -> float:
    """Model should cite sources when making factual claims."""
    import re
    citations = re.findall(r'\[[\d]+\]|\(.*?\d{4}.*?\)', response)
    return min(1.0, len(citations) / 2)  # Expect at least 2 citations
```

**Consistency tests** verify that semantically equivalent inputs produce semantically consistent outputs:

```python
async def test_consistency(model_fn, base_input, paraphrases,
                           similarity_threshold=0.8):
    """Test that paraphrased inputs produce consistent outputs."""
    base_response = await model_fn(base_input)

    for paraphrase in paraphrases:
        para_response = await model_fn(paraphrase)
        similarity = compute_semantic_similarity(base_response, para_response)
        if similarity < similarity_threshold:
            return 0.0
    return 1.0
```

**Format tests** verify structural requirements:

```python
async def test_json_output(response: str) -> float:
    """Response must be valid JSON."""
    try:
        parsed = json.loads(response)
        return 1.0
    except json.JSONDecodeError:
        return 0.0

async def test_response_length(response: str,
                                min_words=50, max_words=500) -> float:
    """Response must be within length bounds."""
    word_count = len(response.split())
    if min_words <= word_count <= max_words:
        return 1.0
    return 0.0
```

**Comparative tests** compare the current version against a baseline:

```python
async def test_no_regression(current_response: str, baseline_response: str,
                              judge_model) -> float:
    """Current response should be at least as good as baseline."""
    judgment = await judge_model.pairwise_compare(
        current_response, baseline_response
    )
    # Returns 1.0 if current wins or ties, 0.0 if baseline wins
    return 1.0 if judgment in ["current", "tie"] else 0.0
```

## Continuous Evaluation with Modern Tooling

### Braintrust

Braintrust provides an evaluation framework designed for AI applications. Its core abstraction is the experiment: a collection of test cases evaluated against scoring functions, with results tracked over time.

```typescript
import { Eval } from "braintrust";

Eval("my-ai-app", {
  data: () => [
    {
      input: "What is the capital of France?",
      expected: "Paris",
      metadata: { category: "factual", difficulty: "easy" }
    },
    {
      input: "Explain quantum entanglement simply",
      expected: null,  // No exact expected output
      metadata: { category: "explanation", difficulty: "medium" }
    }
  ],
  task: async (input) => {
    // Your AI pipeline
    const response = await callModel(input);
    return response;
  },
  scores: [
    // Exact match for factual questions
    (args) => {
      if (args.expected) {
        return {
          name: "exactMatch",
          score: args.output.toLowerCase().includes(
            args.expected.toLowerCase()
          ) ? 1 : 0
        };
      }
      return null;
    },
    // LLM judge for quality
    async (args) => {
      const judgment = await llmJudge(args.input, args.output);
      return { name: "quality", score: judgment.score };
    },
    // Custom metric
    (args) => ({
      name: "responseLength",
      score: args.output.split(" ").length > 20 ? 1 : 0
    })
  ]
});
```

Braintrust tracks experiments over time, showing how scores change across commits, prompt versions, and model changes. The diff view highlights specific test cases where quality changed, making regression analysis practical.

### LangSmith

LangSmith (from LangChain) provides tracing, evaluation, and monitoring for LLM applications. Its evaluation approach focuses on datasets and evaluators:

```python
from langsmith import Client
from langsmith.evaluation import evaluate

client = Client()

# Create or load a dataset
dataset = client.create_dataset("qa-regression-tests")
client.create_examples(
    inputs=[{"question": "What is RLHF?"}],
    outputs=[{"answer": "Reinforcement Learning from Human Feedback..."}],
    dataset_id=dataset.id
)

# Define evaluators
def correctness_evaluator(run, example):
    """Check if the response is factually correct."""
    prediction = run.outputs["output"]
    reference = example.outputs["answer"]
    # Use LLM judge or custom logic
    score = judge_correctness(prediction, reference)
    return {"key": "correctness", "score": score}

# Run evaluation
results = evaluate(
    my_llm_pipeline,
    data=dataset.name,
    evaluators=[correctness_evaluator],
    experiment_prefix="v2.1-prompt-update"
)
```

LangSmith's strength is its integration with LangChain and its production tracing capabilities, which allow you to monitor live traffic alongside offline evaluations.

### Langfuse

Langfuse is an open-source alternative for LLM observability and evaluation. It provides tracing, prompt management, and evaluation capabilities:

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Trace a production call
trace = langfuse.trace(name="qa-pipeline")
generation = trace.generation(
    name="llm-call",
    model="gpt-4",
    input=[{"role": "user", "content": "What is RLHF?"}],
    output="RLHF stands for...",
    usage={"input_tokens": 15, "output_tokens": 150}
)

# Score the trace (from automated eval or human feedback)
trace.score(name="correctness", value=0.9)
trace.score(name="helpfulness", value=0.85)
```

## CI/CD Pipeline Architecture

### The Eval-Driven Development Workflow

The eval-driven development workflow treats evaluation as a first-class citizen in the development process:

```
1. Define eval suite (test cases + criteria + thresholds)
     |
2. Make change (prompt, model, context, code)
     |
3. Run eval suite against change
     |
4. Compare results to baseline
     |
5a. If regression detected -> fix and return to step 2
5b. If improvement or neutral -> proceed to step 6
     |
6. Code review (includes eval results)
     |
7. Deploy to staging
     |
8. Run extended eval suite on staging
     |
9. Deploy to production (canary)
     |
10. Monitor production quality metrics
```

### GitHub Actions Integration

A practical CI/CD pipeline for AI applications using GitHub Actions:

```yaml
# .github/workflows/ai-eval.yml
name: AI Evaluation Pipeline

on:
  pull_request:
    paths:
      - 'prompts/**'
      - 'src/ai/**'
      - 'eval/**'

jobs:
  quick-eval:
    name: Quick Regression Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements-eval.txt

      - name: Run fast eval suite
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          python -m eval.run \
            --suite fast \
            --baseline main \
            --output results/fast-eval.json

      - name: Check for regressions
        run: |
          python -m eval.check_regression \
            --results results/fast-eval.json \
            --max-blocking-failures 0 \
            --max-score-decrease 0.05

      - name: Post eval results to PR
        uses: actions/github-script@v7
        with:
          script: |
            const results = require('./results/fast-eval.json');
            const summary = formatEvalSummary(results);
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: summary
            });

  full-eval:
    name: Full Evaluation Suite
    needs: quick-eval
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run comprehensive eval
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          python -m eval.run \
            --suite comprehensive \
            --baseline main \
            --parallel 10 \
            --output results/full-eval.json

      - name: Upload results to Braintrust
        run: |
          python -m eval.upload \
            --results results/full-eval.json \
            --experiment "pr-${{ github.event.number }}"
```

### Two-Phase Evaluation

For cost efficiency, split evaluation into two phases:

**Phase 1 (Fast, in CI)**: Run on every PR. Uses cheaper models, fewer test cases, and deterministic evaluators. Blocks merge on critical regressions. Completes in 2-5 minutes.

**Phase 2 (Comprehensive, pre-deploy)**: Run after merge or on staging. Uses the full evaluation suite including LLM-as-Judge, larger datasets, and statistical significance testing. Blocks deployment if quality drops below thresholds. May take 15-60 minutes.

```python
EVAL_SUITES = {
    "fast": {
        "test_cases": "eval/core-tests.json",  # ~50 cases
        "evaluators": ["format_check", "keyword_match", "length_check"],
        "timeout_minutes": 5,
        "required_for": "merge"
    },
    "comprehensive": {
        "test_cases": "eval/full-suite.json",  # ~500 cases
        "evaluators": ["format_check", "keyword_match", "llm_judge",
                       "semantic_similarity", "safety_check"],
        "timeout_minutes": 60,
        "required_for": "deploy"
    }
}
```

## Monitoring Production Quality

### What to Monitor

Production monitoring for AI applications extends beyond standard infrastructure metrics:

**Quality metrics** (computed on sampled production traffic):
- Response relevance scores (from lightweight LLM judge)
- Format compliance rate (JSON validity, schema adherence)
- Safety filter trigger rate
- Average response length and variance
- Retrieval quality (for RAG applications): precision and recall of retrieved documents

**Operational metrics**:
- Latency (p50, p95, p99) per model call
- Token usage (input and output)
- Error rates (API failures, timeouts, rate limits)
- Cost per request

**User signal metrics**:
- Explicit feedback (thumbs up/down, ratings)
- Implicit feedback (regeneration rate, conversation abandonment, copy/paste rate)
- Follow-up question rate (may indicate unclear initial responses)

### Implementing Production Monitoring

```python
import time
from dataclasses import dataclass, field
from collections import deque
import statistics

@dataclass
class AIMonitor:
    window_size: int = 1000
    quality_scores: deque = field(
        default_factory=lambda: deque(maxlen=1000)
    )
    latencies: deque = field(
        default_factory=lambda: deque(maxlen=1000)
    )
    error_count: int = 0
    total_count: int = 0

    def record(self, quality_score: float, latency_ms: float,
               error: bool = False):
        self.total_count += 1
        if error:
            self.error_count += 1
            return

        self.quality_scores.append(quality_score)
        self.latencies.append(latency_ms)

        # Check for alerts
        self._check_quality_alert()
        self._check_latency_alert()

    def _check_quality_alert(self):
        if len(self.quality_scores) < 100:
            return

        recent = list(self.quality_scores)[-100:]
        avg_quality = statistics.mean(recent)

        if avg_quality < 0.7:  # Configurable threshold
            self._fire_alert(
                "quality_degradation",
                f"Average quality score dropped to {avg_quality:.3f} "
                f"over last 100 requests"
            )

    def _check_latency_alert(self):
        if len(self.latencies) < 100:
            return

        recent = list(self.latencies)[-100:]
        p95 = sorted(recent)[94]

        if p95 > 5000:  # 5 second p95 threshold
            self._fire_alert(
                "latency_spike",
                f"P95 latency is {p95:.0f}ms over last 100 requests"
            )

    def _fire_alert(self, alert_type: str, message: str):
        # Send to alerting system (PagerDuty, Slack, etc.)
        print(f"ALERT [{alert_type}]: {message}")
```

### Alerting on Quality Degradation

Quality degradation alerts require careful threshold setting to avoid alert fatigue:

**Static thresholds**: Set absolute quality floors. If average quality drops below X, alert. Simple but requires careful calibration.

**Relative thresholds**: Alert when quality drops by more than Y% compared to a rolling baseline. More adaptive but can drift if quality degrades slowly.

**Statistical process control**: Use control charts borrowed from manufacturing quality engineering. Compute the mean and standard deviation of quality over a baseline period. Alert when quality falls outside control limits (typically mean +/- 3 sigma).

```python
class QualityControlChart:
    def __init__(self, baseline_scores: list[float]):
        self.center_line = statistics.mean(baseline_scores)
        self.std = statistics.stdev(baseline_scores)
        self.ucl = self.center_line + 3 * self.std  # Upper control limit
        self.lcl = self.center_line - 3 * self.std  # Lower control limit

    def check(self, current_scores: list[float]) -> dict:
        current_mean = statistics.mean(current_scores)

        out_of_control = current_mean < self.lcl or current_mean > self.ucl

        # Western Electric rules for additional sensitivity
        # Rule: 2 of 3 consecutive points beyond 2-sigma
        two_sigma_violations = sum(
            1 for s in current_scores[-3:]
            if abs(s - self.center_line) > 2 * self.std
        )

        return {
            "in_control": not out_of_control and two_sigma_violations < 2,
            "current_mean": current_mean,
            "center_line": self.center_line,
            "deviation_sigmas": (current_mean - self.center_line) / self.std
        }
```

## A/B Testing AI Features

### Challenges Specific to AI A/B Testing

A/B testing AI features introduces challenges beyond standard product experimentation:

**Metric sensitivity**: Traditional A/B tests optimize for engagement metrics (clicks, time spent). AI quality metrics are noisier and require larger sample sizes.

**Delayed effects**: A more helpful AI response might reduce future support tickets, but this effect takes weeks to measure. Short-term A/B tests may miss long-term quality improvements.

**User adaptation**: Users adapt their behavior to model capabilities. A better model may receive harder queries as users learn to rely on it more, confounding quality comparisons.

### Implementation Pattern

```python
class AIABTest:
    def __init__(self, name: str, variants: dict, traffic_split: dict):
        self.name = name
        self.variants = variants  # {"control": config_a, "treatment": config_b}
        self.traffic_split = traffic_split  # {"control": 0.5, "treatment": 0.5}
        self.results = {v: [] for v in variants}

    def assign_variant(self, user_id: str) -> str:
        """Deterministic assignment based on user_id hash."""
        import hashlib
        hash_val = int(hashlib.sha256(
            f"{self.name}:{user_id}".encode()
        ).hexdigest(), 16)
        threshold = self.traffic_split["control"]
        return "control" if (hash_val % 1000) / 1000 < threshold \
               else "treatment"

    def record_outcome(self, variant: str, quality_score: float,
                       user_satisfaction: float, latency_ms: float):
        self.results[variant].append({
            "quality": quality_score,
            "satisfaction": user_satisfaction,
            "latency": latency_ms
        })

    def analyze(self) -> dict:
        from scipy import stats

        control_quality = [r["quality"] for r in self.results["control"]]
        treatment_quality = [r["quality"] for r in self.results["treatment"]]

        t_stat, p_value = stats.ttest_ind(control_quality, treatment_quality)

        return {
            "control_mean": statistics.mean(control_quality),
            "treatment_mean": statistics.mean(treatment_quality),
            "difference": (statistics.mean(treatment_quality) -
                          statistics.mean(control_quality)),
            "p_value": p_value,
            "significant": p_value < 0.05,
            "n_control": len(control_quality),
            "n_treatment": len(treatment_quality)
        }
```

### Guardrails for AI A/B Tests

Always include safety guardrails in AI A/B tests:

- **Quality floor**: Automatically route users to the control if the treatment produces responses below a minimum quality threshold
- **Safety monitoring**: Monitor safety metrics in real-time and halt the experiment if the treatment triggers significantly more safety interventions
- **Rollback capability**: Be able to instantly stop routing traffic to a problematic variant

## Eval-Driven Development in Practice

### The Eval-First Mindset

Eval-driven development means writing evaluations before making changes, analogous to test-driven development:

1. **Observe a problem**: User feedback, monitoring alerts, or manual review reveals a quality issue
2. **Write a failing eval**: Create test cases that capture the problem. Verify they fail on the current system
3. **Make the change**: Modify the prompt, model, or pipeline
4. **Run the eval suite**: Verify the failing tests now pass AND existing tests still pass
5. **Deploy with confidence**: The eval suite provides evidence that the change helps without causing regressions

### Managing Eval Suites Over Time

Eval suites need maintenance:

- **Add tests from production failures**: When a production quality issue is identified, add test cases that would have caught it
- **Remove obsolete tests**: Tests targeting deprecated features or superseded model versions add noise without value
- **Rebalance coverage**: Periodically audit test coverage across capability dimensions and add tests to underrepresented areas
- **Update baselines**: When you intentionally change behavior (e.g., changing the tone from formal to casual), update test expectations accordingly

```python
class EvalSuiteManager:
    def __init__(self, suite_path: str):
        self.suite_path = suite_path
        self.tests = self.load_tests()

    def coverage_report(self) -> dict:
        """Analyze test coverage across dimensions."""
        coverage = {}
        for test in self.tests:
            for tag in test.tags:
                if tag not in coverage:
                    coverage[tag] = {"count": 0, "last_updated": None}
                coverage[tag]["count"] += 1
                if (coverage[tag]["last_updated"] is None or
                    test.updated_at > coverage[tag]["last_updated"]):
                    coverage[tag]["last_updated"] = test.updated_at
        return coverage

    def add_from_production_incident(self, incident: dict):
        """Convert a production quality incident into test cases."""
        test = AITestCase(
            id=f"incident-{incident['id']}",
            input_messages=incident["conversation"],
            evaluation_criteria=incident["expected_criteria"],
            tags=incident["categories"],
            expected_behavior=incident["expected_behavior"],
            severity="blocking"
        )
        self.tests.append(test)
        self.save_tests()
```

## Summary and Key Takeaways

- **Traditional CI/CD is necessary but insufficient** for AI applications. Extend it with evaluation primitives that handle non-determinism, gradual degradation, and multi-dimensional quality.
- **Regression testing for AI requires multiple test types**: behavioral, consistency, format, and comparative tests. Use severity levels to distinguish blocking failures from warnings.
- **Two-phase evaluation** (fast in CI, comprehensive pre-deploy) balances cost against thoroughness. Run cheap deterministic tests on every PR and expensive LLM-judge evaluations before deployment.
- **Modern eval platforms** (Braintrust, LangSmith, Langfuse) provide the infrastructure for tracking evaluations over time, comparing experiments, and monitoring production quality.
- **Production monitoring must include quality metrics**, not just operational metrics. Use statistical process control techniques to detect gradual degradation.
- **A/B testing AI features** requires larger sample sizes and safety guardrails beyond standard product experimentation.
- **Eval-driven development** -- writing evaluations before making changes -- provides the confidence needed to iterate quickly on AI systems without shipping regressions.

The organizations that invest in robust CI/CD for AI will iterate faster and ship more reliably than those that treat evaluation as an afterthought. The tooling is maturing rapidly, and the methodology is well-established. The remaining challenge is cultural: treating evals with the same rigor and discipline that the software industry learned to apply to tests.

# Observability: Tracing, Logging & LLM Monitoring

Traditional observability -- metrics, logs, traces -- was designed for deterministic systems where the same input produces the same output. LLM-powered applications shatter this assumption: outputs are stochastic, quality is subjective, failure modes are semantic rather than syntactic, and a single user request may trigger multiple LLM calls across different models and providers. Building effective observability for AI systems requires extending classical approaches with LLM-specific instrumentation for token usage, response quality, prompt versioning, and end-to-end pipeline tracing. This article examines the observability stack for production AI applications, from low-level instrumentation through platform integration to debugging workflows.

## Why LLM Observability Is Fundamentally Different

Consider a traditional API endpoint that fetches data from a database and returns JSON. Observability is straightforward: log the request, measure latency, check the HTTP status code. If the response is wrong, examine the SQL query and the data.

Now consider an LLM-powered endpoint. The same input can produce different outputs across calls. A "successful" 200 response may contain a hallucinated answer, a refusal, or a response that is technically correct but unhelpful. Latency varies by 10x depending on output length. Costs scale with input and output token counts. The "query" (prompt) itself is a complex artifact that may include system instructions, few-shot examples, retrieved context, and conversation history.

The key observability challenges unique to LLM systems:

1. **Quality is not binary**: Unlike a database query that either returns the right rows or doesn't, LLM output quality exists on a spectrum that requires human or LLM-based evaluation.

2. **Cost is per-request variable**: Each request has a different token cost that depends on input length, output length, and the model used.

3. **Prompt is code**: The prompt template, system instructions, and few-shot examples are effectively part of the application logic, and changes to them can cause regressions just like code changes.

4. **Failure modes are semantic**: The system can fail by hallucinating, refusing appropriate requests, producing poorly formatted output, or leaking PII from context -- none of which produce error codes.

## The LLM Observability Stack

A complete observability stack for LLM applications has four layers:

```
┌─────────────────────────────────────────────┐
│           Evaluation & Analytics            │
│  Quality scoring, regression detection,     │
│  A/B testing, user feedback loops           │
├─────────────────────────────────────────────┤
│           Tracing & Lineage                 │
│  End-to-end request traces, span trees,     │
│  parent-child relationships across calls    │
├─────────────────────────────────────────────┤
│         Structured Logging                  │
│  Prompt/completion pairs, token counts,     │
│  model parameters, latency, cost            │
├─────────────────────────────────────────────┤
│          Infrastructure Metrics             │
│  GPU utilization, queue depth, error rates,  │
│  p50/p95/p99 latency, throughput            │
└─────────────────────────────────────────────┘
```

## Distributed Tracing for AI Pipelines

### The Trace Model

A single user request to an AI application often triggers a complex chain of operations:

1. Receive user message
2. Retrieve relevant documents (RAG)
3. Construct prompt with system instructions + context + history
4. Call LLM for initial response
5. Parse structured output
6. Call LLM again for validation or refinement
7. Return response to user

Each of these steps should be a **span** within a **trace**, following the OpenTelemetry model but extended for LLM-specific metadata:

```python
from opentelemetry import trace
from opentelemetry.trace import StatusCode
import time

tracer = trace.get_tracer("ai-pipeline")

class TracedLLMPipeline:
    async def handle_request(self, user_message: str, session_id: str):
        with tracer.start_as_current_span("ai_pipeline.handle_request") as root_span:
            root_span.set_attribute("session_id", session_id)
            root_span.set_attribute("input_length", len(user_message))

            # Step 1: Retrieval
            with tracer.start_as_current_span("ai_pipeline.retrieve") as retrieve_span:
                documents = await self.retrieve(user_message)
                retrieve_span.set_attribute("num_documents", len(documents))
                retrieve_span.set_attribute("total_context_tokens",
                    sum(count_tokens(d) for d in documents))

            # Step 2: LLM Generation
            with tracer.start_as_current_span("ai_pipeline.llm_generate") as llm_span:
                prompt = self.build_prompt(user_message, documents)
                start = time.monotonic()

                response = await self.llm_client.generate(prompt)

                llm_span.set_attribute("model", response.model)
                llm_span.set_attribute("prompt_tokens", response.usage.prompt_tokens)
                llm_span.set_attribute("completion_tokens", response.usage.completion_tokens)
                llm_span.set_attribute("total_tokens", response.usage.total_tokens)
                llm_span.set_attribute("ttft_ms", response.time_to_first_token_ms)
                llm_span.set_attribute("total_latency_ms",
                    (time.monotonic() - start) * 1000)
                llm_span.set_attribute("cost_usd", self.compute_cost(response))
                llm_span.set_attribute("finish_reason", response.finish_reason)

            # Step 3: Parse and validate
            with tracer.start_as_current_span("ai_pipeline.parse") as parse_span:
                parsed = self.parse_response(response)
                parse_span.set_attribute("parse_success", parsed is not None)

            root_span.set_attribute("total_cost_usd", self.total_cost)
            return parsed
```

### Trace Visualization

A well-instrumented trace for a RAG pipeline looks like this in a trace viewer:

```
ai_pipeline.handle_request (1,247ms, $0.0034)
├── ai_pipeline.retrieve (89ms)
│   ├── embedding.encode (12ms) [model=text-embedding-3-small, tokens=45]
│   └── vector_store.search (77ms) [results=5, min_score=0.82]
├── ai_pipeline.build_prompt (2ms) [total_tokens=3,847]
├── ai_pipeline.llm_generate (1,089ms) [$0.0034]
│   ├── [model=claude-sonnet, prompt=3847tok, completion=342tok]
│   ├── [ttft=234ms, itl=2.4ms]
│   └── [finish_reason=end_turn, cached_tokens=1200]
├── ai_pipeline.parse (4ms) [parse_success=true]
└── ai_pipeline.guardrails (63ms) [pii_detected=false, toxicity=0.02]
```

## Langfuse Integration

Langfuse is an open-source LLM observability platform that provides tracing, prompt management, evaluation, and analytics. Its data model is designed specifically for LLM workloads.

### Core Concepts

- **Trace**: Top-level container for a complete request lifecycle
- **Span**: A generic operation within a trace (retrieval, parsing, etc.)
- **Generation**: An LLM call with full input/output, model, usage, and cost tracking
- **Score**: A quality assessment attached to a trace or generation

```python
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse()

@observe()                   # Creates a trace automatically
async def handle_chat(user_message: str, session_id: str):
    langfuse_context.update_current_trace(
        session_id=session_id,
        user_id=get_current_user_id(),
        metadata={"feature": "chat", "version": "2.1"}
    )

    # Retrieval span
    documents = await retrieve_context(user_message)

    # LLM generation (automatically tracked)
    response = await generate_response(user_message, documents)

    # Score the interaction
    langfuse_context.score_current_trace(
        name="response_relevance",
        value=assess_relevance(user_message, response),
        comment="Automated relevance check"
    )

    return response

@observe(as_type="generation")   # Tracked as an LLM generation
async def generate_response(query: str, context: list[str]):
    messages = build_messages(query, context)
    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=messages
    )
    # Langfuse decorator automatically captures:
    # - Input messages
    # - Output content
    # - Model name
    # - Token usage
    # - Latency
    return response.content[0].text

@observe()                       # Tracked as a span
async def retrieve_context(query: str) -> list[str]:
    embedding = await embed(query)
    results = await vector_store.search(embedding, top_k=5)
    langfuse_context.update_current_observation(
        metadata={"num_results": len(results), "top_score": results[0].score}
    )
    return [r.text for r in results]
```

### Prompt Management with Langfuse

Langfuse enables versioning and managing prompts as first-class objects, separate from application code:

```python
# Fetch the current production prompt from Langfuse
prompt = langfuse.get_prompt("rag-system-prompt", version=3)

# Use the prompt (automatically links generations to this prompt version)
messages = [
    {"role": "system", "content": prompt.compile(domain="finance")},
    {"role": "user", "content": user_query}
]
```

This decoupling allows prompt engineers to iterate on prompts without code deployments, while maintaining full traceability between prompt versions and output quality.

## Langsmith and Braintrust

### Langsmith

LangChain's Langsmith provides deep integration with the LangChain ecosystem and focuses on debugging complex chains and agents:

```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "ls-..."
os.environ["LANGCHAIN_PROJECT"] = "production-rag"

# All LangChain operations are automatically traced
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

chain = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("user", "{question}")
]) | ChatAnthropic(model="claude-sonnet-4-20250514")

# This call is automatically traced in Langsmith
result = await chain.ainvoke({"question": "What is observability?"})
```

Langsmith's strength is its **playground** for iterating on prompts against recorded inputs and its **dataset and evaluation** features for systematic testing.

### Braintrust

Braintrust focuses on evaluation and experimentation. Its core abstraction is the **experiment**: a set of inputs run through a pipeline, scored, and compared against a baseline:

```python
from braintrust import Eval

await Eval("rag-pipeline", {
    "data": lambda: load_eval_dataset(),       # Test cases
    "task": lambda input: rag_pipeline(input),  # Your pipeline
    "scores": [
        relevance_scorer,      # Custom scoring function
        faithfulness_scorer,   # Does output match retrieved context?
        toxicity_scorer,       # Safety check
    ],
})
```

## Structured Logging for LLM Calls

### Log Schema

Every LLM call should emit a structured log entry with enough information to reproduce, debug, and analyze the call:

```python
import structlog

logger = structlog.get_logger()

async def call_llm_with_logging(messages, model, params):
    request_id = generate_request_id()
    start_time = time.monotonic()

    try:
        response = await llm_client.generate(messages, model, **params)
        elapsed_ms = (time.monotonic() - start_time) * 1000

        logger.info(
            "llm_call_success",
            request_id=request_id,
            model=model,
            provider="anthropic",
            prompt_tokens=response.usage.prompt_tokens,
            completion_tokens=response.usage.completion_tokens,
            cached_tokens=response.usage.get("cached_tokens", 0),
            total_tokens=response.usage.total_tokens,
            latency_ms=round(elapsed_ms, 2),
            ttft_ms=response.time_to_first_token_ms,
            cost_usd=compute_cost(model, response.usage),
            finish_reason=response.finish_reason,
            temperature=params.get("temperature"),
            max_tokens=params.get("max_tokens"),
            has_tools=bool(params.get("tools")),
            tool_calls=len(response.tool_calls) if response.tool_calls else 0,
            # DO NOT log full prompt/completion in production
            # (PII risk, storage cost). Log a hash instead.
            prompt_hash=hash_messages(messages),
            output_length=len(response.content),
        )
        return response

    except Exception as e:
        elapsed_ms = (time.monotonic() - start_time) * 1000
        logger.error(
            "llm_call_error",
            request_id=request_id,
            model=model,
            error_type=type(e).__name__,
            error_message=str(e),
            latency_ms=round(elapsed_ms, 2),
            is_retryable=is_retryable_error(e),
        )
        raise
```

### What Not to Log

A critical decision is what NOT to log in production:

- **Full prompts and completions**: These may contain PII, proprietary data, or user secrets. Log them only in development/staging or to a separate, access-controlled store with retention policies.
- **API keys**: Never log authentication credentials. Use redaction filters.
- **Embedding vectors**: These are high-dimensional and expensive to store. Log only metadata about embedding operations.

```python
class LogRedactor:
    PATTERNS = [
        (r'sk-[a-zA-Z0-9]{48}', '[REDACTED_API_KEY]'),
        (r'\b\d{3}-\d{2}-\d{4}\b', '[REDACTED_SSN]'),
        (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_EMAIL]'),
    ]

    @classmethod
    def redact(cls, text: str) -> str:
        for pattern, replacement in cls.PATTERNS:
            text = re.sub(pattern, replacement, text)
        return text
```

## Latency Tracking and SLAs

### Multi-Dimensional Latency

LLM latency has multiple components that must be tracked independently:

```python
@dataclass
class LatencyBreakdown:
    queue_wait_ms: float      # Time waiting in request queue
    prefill_ms: float         # Time to process input tokens
    ttft_ms: float            # Time to first output token
    decode_ms: float          # Time for all output tokens
    total_ms: float           # End-to-end latency
    itl_ms: float             # Average inter-token latency
    network_ms: float         # Network round-trip (for API calls)
    tokens_per_second: float  # Output throughput

    @property
    def decode_efficiency(self) -> float:
        """Fraction of total time spent actually generating tokens."""
        return self.decode_ms / self.total_ms
```

### SLA Definition for LLM Services

```python
# Example SLA definitions
SLAS = {
    "chat_interactive": {
        "ttft_p50_ms": 500,
        "ttft_p95_ms": 2000,
        "itl_p95_ms": 50,
        "availability": 0.999,
        "error_rate": 0.001,
    },
    "batch_processing": {
        "completion_p95_ms": 30000,
        "throughput_tokens_per_second": 1000,
        "availability": 0.995,
    },
    "agent_pipeline": {
        "e2e_p95_ms": 60000,      # Agent loops can be long
        "per_step_p95_ms": 5000,
        "max_steps": 15,
        "availability": 0.99,
    }
}
```

## Error Classification

### LLM-Specific Error Taxonomy

Not all errors are equal. A comprehensive error taxonomy helps prioritize debugging:

```python
class LLMErrorClassifier:
    @staticmethod
    def classify(error: Exception) -> ErrorClassification:
        if isinstance(error, RateLimitError):
            return ErrorClassification(
                category="rate_limit",
                severity="warning",
                is_retryable=True,
                suggested_action="back_off_and_retry",
                user_impact="delayed_response"
            )
        elif isinstance(error, ContextLengthExceeded):
            return ErrorClassification(
                category="context_overflow",
                severity="error",
                is_retryable=False,
                suggested_action="truncate_input_or_use_larger_context_model",
                user_impact="request_failed"
            )
        elif isinstance(error, ContentFilterError):
            return ErrorClassification(
                category="safety_filter",
                severity="warning",
                is_retryable=False,
                suggested_action="review_input_for_policy_violation",
                user_impact="request_refused"
            )
        elif isinstance(error, (TimeoutError, ConnectionError)):
            return ErrorClassification(
                category="infrastructure",
                severity="error",
                is_retryable=True,
                suggested_action="retry_with_fallback_provider",
                user_impact="delayed_response"
            )
        elif isinstance(error, InvalidResponseFormat):
            return ErrorClassification(
                category="output_parsing",
                severity="warning",
                is_retryable=True,
                suggested_action="retry_with_stricter_prompt",
                user_impact="degraded_quality"
            )
```

### Semantic Failure Detection

Beyond hard errors, LLM systems need to detect semantic failures:

```python
class SemanticFailureDetector:
    def check_response(self, request, response) -> list[SemanticIssue]:
        issues = []

        # Refusal detection
        refusal_phrases = ["I cannot", "I'm unable to", "I don't have access"]
        if any(phrase in response.content for phrase in refusal_phrases):
            issues.append(SemanticIssue("unexpected_refusal", severity="medium"))

        # Hallucination indicators
        if response.has_citations and not self.verify_citations(response):
            issues.append(SemanticIssue("citation_hallucination", severity="high"))

        # Output format violation
        if request.expected_format == "json":
            try:
                json.loads(response.content)
            except json.JSONDecodeError:
                issues.append(SemanticIssue("format_violation", severity="high"))

        # Truncation
        if response.finish_reason == "length":
            issues.append(SemanticIssue("truncated_output", severity="medium"))

        # Language mismatch
        if detect_language(response.content) != request.expected_language:
            issues.append(SemanticIssue("language_mismatch", severity="medium"))

        return issues
```

## Production Debugging Patterns

### The Debugging Workflow

When an LLM-powered feature produces bad results in production, the debugging workflow differs from traditional software:

1. **Find the trace**: Use the request ID to locate the full trace in your observability platform.

2. **Inspect the prompt**: What was the actual prompt sent to the model? Was the system prompt correct? Was the right context retrieved?

3. **Check the model and parameters**: Was the right model used? What were the temperature, max_tokens, and other parameters?

4. **Examine the raw output**: What did the model actually return? Was there a parsing error downstream?

5. **Replay the request**: Send the exact same prompt to the same model and see if the issue reproduces. If it does, it's a prompt problem. If it doesn't (stochastic failure), it's a robustness problem.

6. **Check for regressions**: Compare against previous traces for similar inputs. Did a prompt change or model update cause the regression?

```python
class LLMDebugger:
    def __init__(self, langfuse_client):
        self.langfuse = langfuse_client

    async def replay_trace(self, trace_id: str) -> ReplayResult:
        """Replay a production trace for debugging."""
        trace = self.langfuse.get_trace(trace_id)

        # Extract all generations from the trace
        generations = [obs for obs in trace.observations
                      if obs.type == "GENERATION"]

        results = []
        for gen in generations:
            # Replay with exact same parameters
            replay = await self.llm_client.generate(
                messages=gen.input,
                model=gen.model,
                temperature=gen.model_parameters.get("temperature", 1.0),
                max_tokens=gen.model_parameters.get("max_tokens"),
            )

            results.append(ReplayResult(
                original_output=gen.output,
                replay_output=replay.content,
                outputs_match=gen.output == replay.content,
                similarity=compute_similarity(gen.output, replay.content),
            ))

        return results
```

### Alerting on LLM-Specific Conditions

```python
# Alerting rules for LLM observability
ALERT_RULES = [
    {
        "name": "high_error_rate",
        "condition": "error_rate > 0.05 over 5 minutes",
        "severity": "critical",
        "action": "page_on_call"
    },
    {
        "name": "latency_spike",
        "condition": "p95_ttft > 5000ms over 10 minutes",
        "severity": "warning",
        "action": "slack_notification"
    },
    {
        "name": "cost_spike",
        "condition": "hourly_cost > 2x rolling_avg_hourly_cost",
        "severity": "warning",
        "action": "slack_notification + throttle_non_critical"
    },
    {
        "name": "quality_degradation",
        "condition": "avg_relevance_score < 0.7 over 1 hour",
        "severity": "warning",
        "action": "slack_notification"
    },
    {
        "name": "hallucination_spike",
        "condition": "hallucination_rate > 0.1 over 30 minutes",
        "severity": "critical",
        "action": "page_on_call + enable_guardrails"
    },
    {
        "name": "cache_miss_rate",
        "condition": "cache_hit_rate < 0.3 over 1 hour",
        "severity": "info",
        "action": "log_for_review"
    }
]
```

## Metrics Dashboard Design

An effective LLM observability dashboard organizes metrics into four quadrants:

### Operational Health
- Request rate (req/min) by model and endpoint
- Error rate by error category
- P50/P95/P99 latency (TTFT and total)
- Queue depth and queue wait time
- Active requests / concurrent sessions

### Cost and Usage
- Token consumption (input/output/cached) by model, feature, and user
- Dollar cost over time with breakdown
- Cost per request distribution
- Cache hit rate and estimated savings
- Budget utilization percentage

### Quality Signals
- Average evaluation scores (relevance, faithfulness, helpfulness)
- User feedback (thumbs up/down, explicit ratings)
- Semantic failure rates (refusals, format violations, truncations)
- Guardrail trigger rates (toxicity, PII detection)

### Model and Prompt Performance
- Per-prompt-version quality scores
- Model comparison (when A/B testing)
- Token efficiency (useful tokens / total tokens)
- Retry rates by model and error type

## Summary and Key Takeaways

1. **LLM observability extends traditional observability** with token tracking, cost monitoring, quality evaluation, and prompt versioning. Standard APM tools are necessary but not sufficient.

2. **Distributed tracing is essential** for multi-step AI pipelines. Each retrieval, LLM call, parsing step, and guardrail check should be a span within a trace, with LLM-specific attributes (tokens, cost, model) on each span.

3. **Langfuse, Langsmith, and Braintrust** each offer different strengths: Langfuse for open-source tracing and prompt management, Langsmith for LangChain ecosystem integration, Braintrust for evaluation-centric workflows.

4. **Structured logging must balance detail and privacy**: log enough metadata to debug issues (model, tokens, latency, cost, error type) without storing full prompts and completions that may contain sensitive data.

5. **Error classification needs a semantic layer**: beyond HTTP errors and exceptions, detect refusals, hallucinations, format violations, and language mismatches as first-class failure modes.

6. **The replay workflow is uniquely important** for LLM debugging. The ability to replay a production trace with the exact same prompt and parameters is essential for distinguishing prompt problems from stochastic failures.

7. **Alert on cost and quality, not just availability**: a 100% available LLM service that hallucinates 20% of the time or costs 5x the expected amount is still failing its users.

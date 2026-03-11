# Production AI Patterns: Workflows, Pipelines & Architecture

Deploying AI systems in production requires a fundamentally different mindset from prototyping. Prompt engineering in a notebook is not software engineering. Production AI systems must handle failures gracefully, scale predictably, produce consistent results, and operate within cost budgets. This article catalogs the essential architectural patterns, workflow orchestration strategies, and operational practices that distinguish reliable production AI from fragile demos.

## Core Production AI Patterns

### The Map-Reduce Pattern

When processing data that exceeds a single LLM context window, map-reduce decomposes the task into parallelizable chunks:

```python
import asyncio
from typing import TypeVar, Callable, List

T = TypeVar('T')

class MapReduceProcessor:
    def __init__(self, llm_client, max_concurrent=10):
        self.llm = llm_client
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def process(
        self,
        items: List[T],
        map_prompt: str,
        reduce_prompt: str,
        chunk_size: int = 5,
    ) -> str:
        # MAP: Process each chunk independently
        chunks = [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]
        map_tasks = [self.map_chunk(chunk, map_prompt) for chunk in chunks]
        map_results = await asyncio.gather(*map_tasks)

        # REDUCE: Combine map results
        # If too many results, reduce hierarchically
        while len(map_results) > chunk_size:
            reduce_chunks = [
                map_results[i:i + chunk_size]
                for i in range(0, len(map_results), chunk_size)
            ]
            map_results = await asyncio.gather(*[
                self.reduce_chunk(chunk, reduce_prompt)
                for chunk in reduce_chunks
            ])

        # Final reduction
        return await self.reduce_chunk(map_results, reduce_prompt)

    async def map_chunk(self, chunk, prompt):
        async with self.semaphore:
            return await self.llm.generate(
                prompt=prompt.format(data=chunk),
            )

    async def reduce_chunk(self, results, prompt):
        return await self.llm.generate(
            prompt=prompt.format(results="\n---\n".join(results)),
        )

# Example: Summarize a large document
processor = MapReduceProcessor(llm_client, max_concurrent=5)
summary = await processor.process(
    items=document_chunks,
    map_prompt="Summarize this section, preserving key facts and figures:\n{data}",
    reduce_prompt="Combine these summaries into a single coherent summary:\n{results}",
)
```

**When to use**: Document summarization, large dataset analysis, code review across many files, aggregating information from multiple sources.

**Pitfalls**: Information loss during reduction (important details from individual chunks may be dropped), inconsistent interpretation across map workers, high total token cost.

### The Fan-Out/Fan-In Pattern

Similar to map-reduce but each branch may perform a different task:

```python
class FanOutFanIn:
    """Execute multiple different analyses in parallel, then synthesize"""

    async def analyze_product_launch(self, product_spec):
        # FAN-OUT: Different analyses in parallel
        tasks = {
            "market": self.analyze_market(product_spec),
            "technical": self.analyze_technical_feasibility(product_spec),
            "competitive": self.analyze_competition(product_spec),
            "financial": self.analyze_unit_economics(product_spec),
            "risk": self.assess_risks(product_spec),
        }

        results = {}
        for name, coro in tasks.items():
            results[name] = await coro  # Could use gather for true parallelism

        # FAN-IN: Synthesize all analyses
        synthesis = await self.llm.generate(
            system="You are a product strategy analyst.",
            prompt=f"""Based on these independent analyses of a proposed product,
provide a comprehensive go/no-go recommendation:

Market Analysis: {results['market']}
Technical Feasibility: {results['technical']}
Competitive Landscape: {results['competitive']}
Unit Economics: {results['financial']}
Risk Assessment: {results['risk']}

Synthesize these into a unified recommendation with:
1. Overall recommendation (go/no-go/conditional)
2. Key opportunities
3. Critical risks
4. Recommended next steps""",
        )

        return synthesis
```

**When to use**: Multi-dimensional analysis, getting multiple "expert" perspectives, tasks where different aspects require different prompting strategies or even different models.

### The Chain Pattern

Sequential processing where each step's output feeds the next:

```python
class ProcessingChain:
    def __init__(self):
        self.steps = []

    def add_step(self, name, processor, validator=None):
        self.steps.append({
            "name": name,
            "processor": processor,
            "validator": validator,
        })
        return self

    async def execute(self, input_data):
        current = input_data
        execution_log = []

        for step in self.steps:
            start = time.time()
            try:
                result = await step["processor"](current)

                # Validate output before passing to next step
                if step["validator"]:
                    validation = step["validator"](result)
                    if not validation.passed:
                        raise ValidationError(
                            f"Step '{step['name']}' validation failed: "
                            f"{validation.message}"
                        )

                execution_log.append({
                    "step": step["name"],
                    "status": "success",
                    "duration_ms": (time.time() - start) * 1000,
                    "input_preview": str(current)[:200],
                    "output_preview": str(result)[:200],
                })

                current = result

            except Exception as e:
                execution_log.append({
                    "step": step["name"],
                    "status": "error",
                    "error": str(e),
                    "duration_ms": (time.time() - start) * 1000,
                })
                raise ChainError(step["name"], e, execution_log)

        return current, execution_log

# Example: Content moderation pipeline
chain = ProcessingChain()
chain.add_step(
    "classify",
    lambda text: llm.classify(text, categories=["safe", "review", "block"]),
    validator=lambda r: r in ["safe", "review", "block"],
)
chain.add_step(
    "explain",
    lambda classification: llm.explain(classification) if classification != "safe" else "Content approved",
)
chain.add_step(
    "action",
    lambda explanation: apply_moderation_action(explanation),
)
```

### The Router Pattern

Route inputs to different processing paths based on classification:

```python
class LLMRouter:
    """Route requests to specialized handlers based on intent"""

    def __init__(self, routes: dict, fallback_handler=None):
        self.routes = routes  # {intent: handler}
        self.fallback = fallback_handler
        self.classifier = IntentClassifier()

    async def route(self, request):
        # Step 1: Classify the request
        classification = await self.classifier.classify(
            request,
            categories=list(self.routes.keys()),
        )

        intent = classification.category
        confidence = classification.confidence

        # Step 2: Route based on classification
        if confidence < 0.5 and self.fallback:
            # Low confidence - use fallback (often a general-purpose LLM)
            return await self.fallback(request)

        handler = self.routes.get(intent, self.fallback)
        if handler is None:
            raise RoutingError(f"No handler for intent '{intent}'")

        return await handler(request)

# Example: Customer support router
router = LLMRouter(
    routes={
        "billing": BillingHandler(model="gpt-4o-mini"),     # Cheaper model for routine
        "technical": TechnicalHandler(model="gpt-4o"),       # Better model for complex
        "complaint": ComplaintHandler(model="gpt-4o",        # Best model + empathy prompt
                                     escalation_enabled=True),
        "general_info": FAQHandler(rag_enabled=True),        # RAG for factual answers
    },
    fallback_handler=GeneralHandler(model="gpt-4o"),
)
```

**Cost optimization**: The router pattern lets you use expensive models only for complex tasks and cheap models for simple ones. A well-designed router can reduce costs by 50-70% compared to using the best model for everything.

### The Evaluator-Optimizer Pattern

Generate a result, evaluate its quality, and iteratively improve:

```python
class EvaluatorOptimizer:
    """Generate, evaluate, and refine until quality threshold is met"""

    def __init__(self, generator, evaluator, max_iterations=3):
        self.generator = generator
        self.evaluator = evaluator
        self.max_iterations = max_iterations

    async def produce(self, task, quality_threshold=0.8):
        result = await self.generator(task)
        evaluation_history = []

        for iteration in range(self.max_iterations):
            # Evaluate the current result
            evaluation = await self.evaluator(task, result)
            evaluation_history.append(evaluation)

            if evaluation.score >= quality_threshold:
                return {
                    "result": result,
                    "iterations": iteration + 1,
                    "final_score": evaluation.score,
                    "history": evaluation_history,
                }

            # Refine based on feedback
            result = await self.generator(
                task,
                previous_attempt=result,
                feedback=evaluation.feedback,
                instruction=f"Address these issues: {evaluation.issues}",
            )

        # Return best attempt even if threshold not met
        best_idx = max(range(len(evaluation_history)),
                      key=lambda i: evaluation_history[i].score)
        return {
            "result": result,
            "iterations": self.max_iterations,
            "final_score": evaluation_history[-1].score,
            "quality_warning": True,
        }
```

## Workflow Orchestration

### Choosing an Orchestration Framework

Production AI workflows need orchestration beyond simple function calls:

| Framework | Strengths | Best For |
|-----------|-----------|----------|
| Temporal | Durable execution, fault tolerance | Long-running, mission-critical workflows |
| Prefect | Python-native, easy monitoring | Data-oriented AI pipelines |
| LangGraph | LLM-native, built-in agent loops | Complex agent workflows |
| Inngest | Event-driven, serverless-friendly | Event-triggered AI processing |
| Custom (Redis + workers) | Full control, minimal overhead | Simple, high-volume pipelines |

### Temporal for AI Workflows

Temporal provides durable execution - if a step fails or a worker crashes, the workflow resumes from where it left off:

```python
from temporalio import workflow, activity
from temporalio.common import RetryPolicy

# Activities are the units of work
@activity.defn
async def extract_text(document_url: str) -> str:
    """Download and extract text from a document"""
    response = await httpx.get(document_url)
    return extract_text_from_pdf(response.content)

@activity.defn
async def generate_summary(text: str) -> str:
    """Generate an AI summary with retry logic"""
    return await llm_client.generate(
        prompt=f"Summarize:\n{text}",
        model="gpt-4o",
    )

@activity.defn
async def store_result(document_id: str, summary: str) -> None:
    """Store the summary in the database"""
    await db.execute(
        "UPDATE documents SET summary = $1 WHERE id = $2",
        summary, document_id,
    )

# Workflow orchestrates the activities
@workflow.defn
class DocumentSummaryWorkflow:
    @workflow.run
    async def run(self, document_id: str, document_url: str) -> str:
        # Step 1: Extract text (retry up to 3 times)
        text = await workflow.execute_activity(
            extract_text,
            document_url,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                initial_interval=timedelta(seconds=1),
                maximum_interval=timedelta(seconds=30),
                backoff_coefficient=2.0,
            ),
        )

        # Step 2: Generate summary (retry with different strategy for LLM)
        summary = await workflow.execute_activity(
            generate_summary,
            text,
            start_to_close_timeout=timedelta(minutes=2),
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                initial_interval=timedelta(seconds=5),
                non_retryable_error_types=["ContentPolicyViolation"],
            ),
        )

        # Step 3: Store result
        await workflow.execute_activity(
            store_result,
            args=[document_id, summary],
            start_to_close_timeout=timedelta(seconds=30),
        )

        return summary
```

## Error Handling and Retry Strategies

### LLM-Specific Error Types

LLM API calls fail in ways that require specific handling:

```python
class LLMRetryHandler:
    """Retry handler with LLM-specific error classification"""

    # Error categories and strategies
    RETRY_STRATEGIES = {
        # Rate limits: exponential backoff with jitter
        "rate_limit": {
            "max_retries": 5,
            "base_delay": 1.0,
            "max_delay": 60.0,
            "backoff": "exponential_with_jitter",
        },
        # Transient server errors: quick retry
        "server_error": {
            "max_retries": 3,
            "base_delay": 0.5,
            "max_delay": 10.0,
            "backoff": "exponential",
        },
        # Timeout: retry with shorter input or different model
        "timeout": {
            "max_retries": 2,
            "base_delay": 1.0,
            "fallback": "reduce_input_or_switch_model",
        },
        # Context length exceeded: truncate and retry
        "context_length": {
            "max_retries": 1,
            "fallback": "truncate_input",
        },
        # Content filter: do not retry (deterministic failure)
        "content_filter": {
            "max_retries": 0,
            "action": "log_and_skip",
        },
        # Invalid response format: retry with stricter prompt
        "parse_error": {
            "max_retries": 3,
            "fallback": "add_format_instructions",
        },
    }

    async def call_with_retry(self, func, *args, **kwargs):
        last_error = None
        strategy = None

        for attempt in range(5):
            try:
                result = await func(*args, **kwargs)
                return result
            except RateLimitError as e:
                strategy = self.RETRY_STRATEGIES["rate_limit"]
                last_error = e
            except TimeoutError as e:
                strategy = self.RETRY_STRATEGIES["timeout"]
                last_error = e
                # Reduce input on timeout
                if "messages" in kwargs:
                    kwargs["messages"] = self.truncate_messages(kwargs["messages"])
            except ContextLengthError as e:
                strategy = self.RETRY_STRATEGIES["context_length"]
                kwargs["messages"] = self.truncate_messages(kwargs["messages"], aggressive=True)
                last_error = e
            except ContentFilterError as e:
                # Don't retry - this is a policy decision
                raise
            except json.JSONDecodeError as e:
                strategy = self.RETRY_STRATEGIES["parse_error"]
                # Add explicit format instructions
                kwargs["messages"][-1]["content"] += (
                    "\n\nIMPORTANT: Respond with valid JSON only. "
                    "No markdown, no explanation."
                )
                last_error = e

            if attempt >= strategy["max_retries"]:
                break

            delay = self.compute_delay(attempt, strategy)
            await asyncio.sleep(delay)

        raise MaxRetriesExceeded(last_error)

    def compute_delay(self, attempt, strategy):
        base = strategy["base_delay"]
        max_delay = strategy.get("max_delay", 60.0)

        if strategy.get("backoff") == "exponential_with_jitter":
            delay = min(base * (2 ** attempt), max_delay)
            delay *= (0.5 + random.random())  # Add jitter
        else:
            delay = min(base * (2 ** attempt), max_delay)

        return delay
```

### Fallback Chains

When a primary model fails, fall back to alternatives:

```python
class ModelFallbackChain:
    def __init__(self, models):
        """
        models: ordered list of (model_name, client, config)
        First model is preferred; later models are fallbacks.
        """
        self.models = models

    async def generate(self, **kwargs):
        errors = []
        for model_name, client, config in self.models:
            try:
                result = await client.generate(
                    model=model_name,
                    **{**kwargs, **config},
                )
                if model_name != self.models[0][0]:
                    logger.warning(
                        f"Used fallback model {model_name} "
                        f"(primary failed: {errors[-1]})"
                    )
                return result
            except Exception as e:
                errors.append(f"{model_name}: {e}")
                continue

        raise AllModelsFailed(errors)

# Example: GPT-4o -> Claude -> GPT-4o-mini -> local model
fallback = ModelFallbackChain([
    ("gpt-4o", openai_client, {"temperature": 0.7}),
    ("claude-sonnet-4-20250514", anthropic_client, {"temperature": 0.7}),
    ("gpt-4o-mini", openai_client, {"temperature": 0.5}),
    ("llama-3-8b", local_client, {"temperature": 0.7}),
])
```

## Idempotency

### Why AI Operations Need Idempotency

LLM calls are inherently non-deterministic - the same prompt can produce different outputs. For workflows that may be retried (due to failures, timeouts, or infrastructure issues), idempotency ensures operations are not duplicated:

```python
class IdempotentAIOperation:
    def __init__(self, cache_store):
        self.cache = cache_store  # Redis, DynamoDB, etc.

    def idempotency_key(self, operation, inputs):
        """Generate a deterministic key for this operation + inputs"""
        content = json.dumps({
            "operation": operation,
            "inputs": inputs,
        }, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()

    async def execute_once(self, key, operation_fn, *args, **kwargs):
        """Execute an operation at most once for a given idempotency key"""

        # Check if already executed
        cached = await self.cache.get(f"idempotent:{key}")
        if cached:
            return json.loads(cached)

        # Acquire lock to prevent concurrent execution
        lock = await self.cache.acquire_lock(f"lock:{key}", ttl=300)
        if not lock:
            # Another worker is executing this - wait for result
            return await self.wait_for_result(key, timeout=300)

        try:
            result = await operation_fn(*args, **kwargs)

            # Cache the result
            await self.cache.set(
                f"idempotent:{key}",
                json.dumps(result),
                ex=86400,  # 24-hour TTL
            )

            return result
        finally:
            await self.cache.release_lock(f"lock:{key}")

# Usage: Ensure an email is only generated and sent once
idempotent = IdempotentAIOperation(redis_client)
key = idempotent.idempotency_key("welcome_email", {"user_id": "123"})
email_content = await idempotent.execute_once(
    key,
    generate_personalized_email,
    user_id="123",
)
```

### Caching LLM Responses

Beyond idempotency, caching identical requests saves cost and reduces latency:

```python
class LLMCache:
    def __init__(self, store, default_ttl=3600):
        self.store = store
        self.default_ttl = default_ttl

    def cache_key(self, model, messages, temperature, **kwargs):
        """Only cache deterministic-ish requests (low temperature)"""
        if temperature > 0.1:
            return None  # Don't cache high-temperature requests

        content = json.dumps({
            "model": model,
            "messages": messages,
            "temperature": temperature,
            **{k: v for k, v in kwargs.items() if k in self.cacheable_params},
        }, sort_keys=True)
        return f"llm_cache:{hashlib.sha256(content.encode()).hexdigest()}"

    async def cached_generate(self, client, **kwargs):
        key = self.cache_key(**kwargs)
        if key:
            cached = await self.store.get(key)
            if cached:
                return json.loads(cached)

        result = await client.generate(**kwargs)

        if key:
            await self.store.set(key, json.dumps(result), ex=self.default_ttl)

        return result
```

## Feature Flags for AI

### Controlling AI Behavior in Production

Feature flags give you fine-grained control over AI behavior without deployments:

```python
class AIFeatureFlags:
    """Feature flag system for AI behavior control"""

    def __init__(self, flag_provider):
        self.flags = flag_provider  # LaunchDarkly, Flagsmith, etc.

    def get_model_config(self, feature, user_context=None):
        """Get the model configuration for a feature"""
        return {
            "model": self.flags.get_string(
                f"ai.{feature}.model",
                default="gpt-4o-mini",
                user=user_context,
            ),
            "temperature": self.flags.get_float(
                f"ai.{feature}.temperature",
                default=0.7,
            ),
            "max_tokens": self.flags.get_int(
                f"ai.{feature}.max_tokens",
                default=1000,
            ),
            "enabled": self.flags.get_bool(
                f"ai.{feature}.enabled",
                default=True,
            ),
            "system_prompt_version": self.flags.get_string(
                f"ai.{feature}.prompt_version",
                default="v1",
            ),
        }

    def get_prompt(self, feature, version=None):
        """Load versioned prompts from flag system"""
        version = version or self.get_model_config(feature)["system_prompt_version"]
        return self.flags.get_string(f"ai.{feature}.prompts.{version}")

# Usage:
flags = AIFeatureFlags(launchdarkly_client)

config = flags.get_model_config("summarization", user_context=current_user)
if config["enabled"]:
    summary = await llm.generate(
        model=config["model"],
        temperature=config["temperature"],
        max_tokens=config["max_tokens"],
        system=flags.get_prompt("summarization", config["system_prompt_version"]),
        messages=[{"role": "user", "content": document_text}],
    )
```

### Gradual Rollout

Rolling out AI features gradually reduces risk:

```python
class GradualRollout:
    def __init__(self, flag_provider):
        self.flags = flag_provider

    def should_use_new_model(self, user_id, feature):
        """Gradually roll out a new model"""
        rollout_pct = self.flags.get_float(f"ai.{feature}.new_model_pct", default=0)

        # Deterministic: same user always gets same treatment
        user_hash = int(hashlib.md5(
            f"{user_id}:{feature}".encode()
        ).hexdigest(), 16) % 100

        return user_hash < rollout_pct

    async def generate_with_rollout(self, user_id, feature, **kwargs):
        if self.should_use_new_model(user_id, feature):
            config = self.flags.get_model_config(f"{feature}.new")
            source = "new"
        else:
            config = self.flags.get_model_config(f"{feature}.current")
            source = "current"

        result = await self.llm.generate(**{**kwargs, **config})

        # Track which model served each request for analysis
        self.metrics.emit("ai_model_served", {
            "feature": feature,
            "source": source,
            "model": config["model"],
            "user_id": user_id,
        })

        return result
```

## A/B Testing AI Features

### Designing AI Experiments

A/B testing AI features is harder than testing UI changes because:
1. AI outputs are non-deterministic (same input can produce different outputs)
2. Quality is subjective and hard to measure automatically
3. Users may adapt their behavior to the AI's capabilities
4. Long-term effects (trust, reliance) differ from short-term engagement

```python
class AIExperiment:
    def __init__(self, experiment_id, variants):
        self.id = experiment_id
        self.variants = variants  # {"control": config_a, "treatment": config_b}

    def assign_user(self, user_id):
        """Deterministic assignment based on user_id"""
        hash_val = int(hashlib.sha256(
            f"{self.id}:{user_id}".encode()
        ).hexdigest(), 16)
        variant_index = hash_val % len(self.variants)
        return list(self.variants.keys())[variant_index]

    async def run(self, user_id, input_data):
        variant = self.assign_user(user_id)
        config = self.variants[variant]

        start = time.time()
        result = await self.llm.generate(**config, messages=input_data)
        latency = time.time() - start

        # Log experiment data
        self.log_exposure(user_id, variant, {
            "latency_ms": latency * 1000,
            "output_tokens": result.usage.completion_tokens,
            "input_tokens": result.usage.prompt_tokens,
            "cost": self.compute_cost(result.usage, config["model"]),
        })

        return result

    def analyze(self, metric="task_completion_rate"):
        """Analyze experiment results with statistical rigor"""
        control_data = self.get_metric_data("control", metric)
        treatment_data = self.get_metric_data("treatment", metric)

        # Check for statistical significance
        stat, p_value = scipy.stats.mannwhitneyu(control_data, treatment_data)

        # Effect size (Cohen's d)
        effect_size = (
            np.mean(treatment_data) - np.mean(control_data)
        ) / np.sqrt(
            (np.var(control_data) + np.var(treatment_data)) / 2
        )

        return {
            "control_mean": np.mean(control_data),
            "treatment_mean": np.mean(treatment_data),
            "p_value": p_value,
            "effect_size": effect_size,
            "significant": p_value < 0.05,
            "sample_size": {
                "control": len(control_data),
                "treatment": len(treatment_data),
            },
        }
```

## Architecture Decision Records for AI

### Documenting AI Architecture Decisions

AI systems have unique architectural decisions that should be documented:

```markdown
# ADR-007: LLM Provider Strategy

## Status: Accepted

## Context
We need to choose how to handle LLM provider selection for our
AI features. Options include single-provider, multi-provider with
manual switching, or automated multi-provider with routing.

## Decision
We will implement a multi-provider architecture with:
1. Primary provider: OpenAI (GPT-4o) for quality-critical paths
2. Secondary provider: Anthropic (Claude) for long-context tasks
3. Fallback provider: Local Llama for non-sensitive, high-volume tasks
4. Automated routing based on task type, cost budget, and latency SLA

## Rationale
- Avoids vendor lock-in
- Enables cost optimization per task type
- Provides resilience against single-provider outages
- Different models excel at different tasks

## Consequences
- Increased operational complexity (monitoring multiple providers)
- Need standardized prompt format that works across providers
- Must maintain provider-specific prompt optimizations
- Additional latency for routing decisions (~5ms)

## Review Date: 2025-06-01
```

Key AI-specific decisions to document:
- Model selection rationale (why this model, not that one)
- Prompt versioning strategy
- Context window management approach
- Evaluation methodology and quality thresholds
- Cost budgets and optimization strategy
- Data handling and privacy decisions
- Fallback and degradation strategy

## Observability

### Comprehensive AI Monitoring

```python
class AIObservability:
    def __init__(self, metrics_client, trace_client):
        self.metrics = metrics_client
        self.traces = trace_client

    def wrap_llm_call(self, func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            span = self.traces.start_span("llm_call", {
                "model": kwargs.get("model"),
                "feature": kwargs.get("feature_name"),
            })

            start = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start

                # Emit metrics
                self.metrics.histogram("llm.latency_ms", duration * 1000, {
                    "model": kwargs.get("model"),
                    "feature": kwargs.get("feature_name"),
                })
                self.metrics.counter("llm.tokens.input", result.usage.prompt_tokens)
                self.metrics.counter("llm.tokens.output", result.usage.completion_tokens)
                self.metrics.counter("llm.cost_cents",
                    self.compute_cost_cents(result.usage, kwargs.get("model")))
                self.metrics.counter("llm.requests.success", 1)

                span.set_attribute("tokens.total",
                    result.usage.total_tokens)
                span.set_status("ok")

                return result

            except Exception as e:
                self.metrics.counter("llm.requests.error", 1, {
                    "error_type": type(e).__name__,
                })
                span.set_status("error", str(e))
                raise
            finally:
                span.end()

        return wrapper
```

## Summary and Key Takeaways

- **Map-reduce, fan-out/fan-in, chain, and router** are the four fundamental patterns for composing LLM calls; most production AI workflows are combinations of these primitives
- **The router pattern** is the highest-leverage cost optimization: routing simple tasks to cheap models and complex tasks to expensive models can reduce costs by 50-70%
- **Error handling** for LLM calls requires type-specific strategies: exponential backoff for rate limits, input truncation for context length errors, and no retry for content policy violations
- **Idempotency** is essential for AI operations in workflows that may be retried; cache results by hashing the deterministic parts of the request
- **Feature flags** give you the ability to change models, prompts, temperatures, and enabled/disabled state without deployments, which is critical for fast iteration
- **Gradual rollout** with deterministic user assignment lets you test new models and prompts safely, rolling back instantly if metrics degrade
- **A/B testing AI** requires careful metric selection; engagement metrics alone can be misleading - measure task completion, accuracy, and user satisfaction
- **Workflow orchestration** with durable execution (Temporal, Inngest) prevents lost work when AI pipeline steps fail
- **Observability** must track latency, token usage, cost, error rates, and quality metrics per model per feature; without this visibility, cost optimization and quality improvement are impossible
- **Architecture Decision Records** are particularly valuable for AI systems because the pace of change (new models, new capabilities) makes it critical to document why decisions were made, not just what was decided

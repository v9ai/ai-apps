# Cost Optimization: Token Economics, Caching & Model Selection

The economics of large language model usage have become a strategic concern as organizations move from prototyping to production. A single GPT-4-class API call costs roughly 1000x more than a traditional database query, and unoptimized LLM pipelines can generate monthly bills that dwarf the rest of an application's infrastructure costs combined. This article provides a systematic framework for understanding, measuring, and optimizing LLM costs across the full spectrum of strategies -- from prompt engineering and caching through intelligent model routing to the build-versus-buy decision.

## Token Pricing Landscape

### Understanding the Pricing Model

LLM API pricing is denominated in tokens, typically quoted per million tokens (MTok). Most providers charge differently for input tokens (prompt) and output tokens (completion), with output tokens costing 2-5x more because they require sequential autoregressive generation.

As of early 2026, the pricing landscape spans roughly three orders of magnitude:

| Model Tier | Example Models | Input ($/MTok) | Output ($/MTok) |
|---|---|---|---|
| Frontier | Claude Opus, GPT-4.5 | $10-15 | $30-75 |
| High capability | Claude Sonnet, GPT-4o | $3-5 | $10-15 |
| Mid-tier | Claude Haiku, GPT-4o-mini | $0.25-0.80 | $1.00-4.00 |
| Lightweight | Gemini Flash, Llama 3.1 8B (hosted) | $0.03-0.10 | $0.10-0.40 |
| Self-hosted open | Llama, Mistral, Qwen on own GPUs | ~$0.05-0.30 | ~$0.15-0.80 |

The cost difference between a frontier model and a lightweight model can be 100-500x. This spread is the foundation of every cost optimization strategy: use the cheapest model that delivers acceptable quality for each task.

### Hidden Costs

Token pricing alone doesn't capture the full picture:

- **System prompts**: A 2000-token system prompt repeated on every request adds up. At $10/MTok input, that is $0.02 per request -- which at 1M requests/day is $20,000/month just for system prompts.
- **Context window loading**: RAG pipelines that stuff 10K tokens of retrieved context per request can dominate costs even when the user's query is short.
- **Retry costs**: Failed requests that are retried still incur charges for the initial attempt.
- **Structured output overhead**: JSON mode and function calling add schema tokens to both input and output.

## Prompt Caching

### Exact-Match Prompt Caching

The simplest caching strategy: if the exact same prompt has been seen before, return the cached response. This works well for applications with high prompt repetition, such as classification tasks with a fixed set of inputs or FAQ systems.

```python
import hashlib
import redis

class ExactPromptCache:
    def __init__(self, redis_client: redis.Redis, ttl_seconds: int = 3600):
        self.redis = redis_client
        self.ttl = ttl_seconds

    def _cache_key(self, messages: list[dict], model: str, params: dict) -> str:
        # Include model and generation params in cache key
        # to avoid serving wrong results
        payload = json.dumps({
            "messages": messages,
            "model": model,
            "temperature": params.get("temperature", 1.0),
            "max_tokens": params.get("max_tokens"),
        }, sort_keys=True)
        return f"llm:exact:{hashlib.sha256(payload.encode()).hexdigest()}"

    async def get_or_generate(self, messages, model, params, generate_fn):
        # Only cache deterministic requests (temperature=0)
        if params.get("temperature", 1.0) != 0:
            return await generate_fn(messages, model, params)

        key = self._cache_key(messages, model, params)
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)

        result = await generate_fn(messages, model, params)
        self.redis.setex(key, self.ttl, json.dumps(result))
        return result
```

### Provider-Side Prompt Caching

Anthropic and OpenAI offer server-side prompt caching where repeated prompt prefixes are cached on the provider's infrastructure, reducing both cost and latency. Anthropic's prompt caching charges a reduced rate for cached input tokens (typically 90% discount) and a small write fee for the initial caching.

```python
# Anthropic prompt caching -- mark the system prompt for caching
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": long_system_prompt,  # 2000+ tokens
            "cache_control": {"type": "ephemeral"}  # Cache this block
        }
    ],
    messages=[{"role": "user", "content": user_query}]
)
# First request: pays full input + cache write fee
# Subsequent requests (within TTL): pays ~10% for cached prefix
```

This is especially powerful for applications with long, stable system prompts or RAG pipelines where the retrieved context is the same across multiple user queries (e.g., when multiple users ask about the same document).

### Semantic Caching

Semantic caching extends exact-match caching to handle semantically similar queries. If a user asks "What is the capital of France?" and another asks "capital of france?", a semantic cache recognizes these as equivalent.

```python
from openai import OpenAI
import numpy as np

class SemanticCache:
    def __init__(self, embedding_client, vector_store, similarity_threshold=0.95):
        self.embedder = embedding_client
        self.store = vector_store
        self.threshold = similarity_threshold

    async def get_or_generate(self, query: str, generate_fn):
        # Embed the query
        embedding = await self.embedder.embed(query)

        # Search for similar cached queries
        results = await self.store.search(
            vector=embedding,
            top_k=1,
            threshold=self.threshold
        )

        if results and results[0].score >= self.threshold:
            return results[0].metadata["response"]

        # Cache miss: generate and store
        response = await generate_fn(query)
        await self.store.insert(
            vector=embedding,
            metadata={"query": query, "response": response}
        )
        return response
```

The risk with semantic caching is returning incorrect responses for queries that are similar but meaningfully different ("How do I delete my account?" vs. "How do I delete a file from my account?"). The similarity threshold must be set conservatively, and certain query patterns (e.g., those containing negation) may need special handling.

## Model Routing

### The Model Router Pattern

Model routing is the single most impactful cost optimization technique. The insight: 70-80% of production LLM requests are "easy" -- classification, extraction, simple Q&A, formatting -- and can be handled by a model that costs 10-50x less than the frontier model.

```python
class ModelRouter:
    def __init__(self):
        self.routes = [
            # Pattern-based routing
            Route(
                condition=lambda req: req.task_type == "classification",
                model="claude-haiku",
                reason="Classification tasks don't need frontier models"
            ),
            Route(
                condition=lambda req: req.max_tokens and req.max_tokens < 100,
                model="gpt-4o-mini",
                reason="Short outputs suggest simple tasks"
            ),
            Route(
                condition=lambda req: req.task_type == "code_generation",
                model="claude-sonnet",
                reason="Code generation benefits from stronger models"
            ),
            # Default route
            Route(
                condition=lambda req: True,
                model="claude-sonnet",
                reason="Default to mid-tier for unknown tasks"
            ),
        ]

    def select_model(self, request: LLMRequest) -> str:
        for route in self.routes:
            if route.condition(request):
                return route.model
        return self.routes[-1].model
```

### LLM-as-Judge Routing

A more sophisticated approach uses a small, fast LLM to assess query difficulty and route accordingly. The routing model costs a fraction of the frontier model, so even if it is invoked on every request, the net savings are substantial:

```python
class LLMRouter:
    def __init__(self):
        self.router_model = "gpt-4o-mini"  # Fast, cheap router
        self.router_prompt = """Classify the complexity of this user request.

        SIMPLE: factual questions, formatting, classification, extraction
        MEDIUM: multi-step reasoning, summarization, moderate code generation
        COMPLEX: novel analysis, long-form writing, complex code, math proofs

        Respond with exactly one word: SIMPLE, MEDIUM, or COMPLEX."""

    async def route(self, user_message: str) -> str:
        complexity = await self.fast_llm_call(
            self.router_model,
            self.router_prompt,
            user_message
        )

        model_map = {
            "SIMPLE": "claude-haiku",      # ~$0.25/MTok input
            "MEDIUM": "claude-sonnet",     # ~$3/MTok input
            "COMPLEX": "claude-opus",      # ~$15/MTok input
        }
        return model_map.get(complexity.strip(), "claude-sonnet")
```

Research from Martian, Unify, and others suggests that well-implemented model routing can reduce costs by 40-60% with less than 2% quality degradation compared to always using the frontier model.

### Cascading: Try Cheap First

An alternative to upfront routing is cascading: try the cheap model first, and only escalate to the expensive model if the cheap model's response fails a quality check.

```python
class CascadingRouter:
    async def generate(self, request: LLMRequest) -> LLMResponse:
        # Try the cheap model first
        cheap_response = await self.call_model("claude-haiku", request)

        # Quality check (can be rule-based or LLM-based)
        if self.passes_quality_check(request, cheap_response):
            return cheap_response

        # Escalate to the expensive model
        expensive_response = await self.call_model("claude-sonnet", request)
        return expensive_response

    def passes_quality_check(self, request, response) -> bool:
        # Rule-based checks
        if response.finish_reason == "length":
            return False  # Truncated, likely needs more capable model
        if response.confidence_score and response.confidence_score < 0.7:
            return False
        if len(response.content) < 50 and request.expected_length == "long":
            return False
        return True
```

The cascading approach has the advantage that it never degrades quality below the expensive model's level, but the disadvantage that ~20-30% of requests incur the cost of both models.

## Batch API Usage

Most providers offer batch APIs that process requests asynchronously at significant discounts (typically 50% off). OpenAI's Batch API and Anthropic's Message Batches API are the primary examples.

```python
# Anthropic Message Batches API
import anthropic

client = anthropic.Anthropic()

# Submit a batch of requests
batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": f"request-{i}",
            "params": {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1024,
                "messages": [{"role": "user", "content": prompt}]
            }
        }
        for i, prompt in enumerate(prompts)
    ]
)

# Poll for completion (batch SLA is typically 24 hours)
while batch.processing_status != "ended":
    await asyncio.sleep(60)
    batch = client.messages.batches.retrieve(batch.id)

# Retrieve results
results = client.messages.batches.results(batch.id)
```

Batch APIs are ideal for:
- Evaluation pipelines (running benchmarks across hundreds of prompts)
- Data processing (summarizing, classifying, or extracting from large document sets)
- Synthetic data generation
- Nightly analysis or reporting

They are not suitable for real-time user-facing applications.

## Token Budgeting and Monitoring

### Setting Token Budgets

A token budget defines the maximum tokens a project, team, or user can consume per time period. This prevents runaway costs from bugs, prompt injection attacks, or unexpected usage spikes:

```python
class TokenBudgetManager:
    def __init__(self, redis_client):
        self.redis = redis_client

    async def check_and_deduct(
        self,
        org_id: str,
        estimated_tokens: int,
        budget_window: str = "monthly"
    ) -> bool:
        key = f"budget:{org_id}:{budget_window}:{self._current_period()}"
        current_usage = int(self.redis.get(key) or 0)
        budget_limit = await self.get_budget_limit(org_id)

        if current_usage + estimated_tokens > budget_limit:
            raise BudgetExceededError(
                f"Organization {org_id} has used {current_usage} tokens "
                f"of {budget_limit} budget for {budget_window}"
            )

        # Atomically increment
        pipe = self.redis.pipeline()
        pipe.incrby(key, estimated_tokens)
        pipe.expire(key, self._ttl_for_window(budget_window))
        pipe.execute()
        return True
```

### Cost Monitoring Dashboard

Effective cost monitoring requires tracking multiple dimensions:

```python
@dataclass
class LLMUsageEvent:
    timestamp: datetime
    model: str
    provider: str
    org_id: str
    user_id: str
    feature: str           # Which product feature triggered this call
    prompt_tokens: int
    completion_tokens: int
    cached_tokens: int     # Tokens served from cache
    cost_usd: float        # Computed cost
    latency_ms: float
    was_routed: bool       # Whether model routing was applied
    original_model: str    # Model before routing (if different)

# Aggregate queries for dashboards
# - Cost by model, by feature, by user over time
# - Cache hit rate and savings
# - Model routing savings (cost with routing vs. without)
# - Token efficiency (useful output tokens / total tokens)
```

### Prompt Optimization for Cost

Small changes to prompts can significantly impact token costs:

1. **Minimize system prompt length**: Every token in the system prompt is repeated on every request. Reducing a system prompt from 2000 to 1000 tokens saves 50% on system prompt costs.

2. **Use structured output**: Asking for JSON output instead of prose typically produces more concise responses with less wasted tokens.

3. **Set appropriate max_tokens**: Always set `max_tokens` to a reasonable value. A request with `max_tokens=4096` that only needs 100 tokens wastes scheduling resources and can lead to higher latency.

4. **Avoid chain-of-thought when unnecessary**: CoT prompting can increase output tokens by 3-10x. Use it for complex reasoning tasks but skip it for simple extraction or classification.

```python
# Before: verbose prompt (high token count)
prompt = """You are an expert sentiment analyst. Please carefully analyze
the following customer review and determine whether the sentiment expressed
is positive, negative, or neutral. Consider the overall tone, specific
word choices, and the customer's apparent satisfaction level. Provide your
analysis in a detailed paragraph followed by your final classification."""

# After: concise prompt (low token count)
prompt = """Classify sentiment as POSITIVE, NEGATIVE, or NEUTRAL.
Reply with one word only."""
```

## Self-Hosting vs. API: The Decision Framework

### When to Self-Host

Self-hosting makes economic sense when:

1. **Volume exceeds ~$5,000-10,000/month in API costs** for a single model tier, and the workload is consistent (not bursty).

2. **Data privacy requirements** prevent sending data to third-party APIs.

3. **Latency requirements** demand co-located inference (e.g., within your VPC).

4. **Customization needs** require fine-tuned models, custom decoding strategies, or non-standard APIs.

### Cost Comparison Example

Consider serving Llama 3.1 70B for a workload of 100M tokens/day:

```
API Route (e.g., Together AI, Fireworks):
- ~$0.90/MTok output
- 100M tokens/day * $0.90/MTok = $90/day = $2,700/month

Self-Hosted (4x H100 on AWS):
- 4x p5.xlarge = ~$40/hour = $960/day = $28,800/month (on-demand)
- With reserved instances (1-year): ~$18,000/month
- With spot instances: ~$10,000/month
- Throughput: ~2000 tok/s = 172M tokens/day

Break-even analysis:
- API at 100M tok/day: $2,700/month
- Self-hosted on-demand: $28,800/month (10.7x more expensive!)
- Self-hosted needs ~1B+ tokens/day to break even with on-demand
- Self-hosted with spot needs ~370M+ tokens/day to break even
```

The break-even point is highly dependent on utilization. Self-hosted GPUs that sit idle 50% of the time effectively double in cost. API pricing bakes in the provider's utilization optimization.

### Hybrid Approach

Many organizations use a hybrid strategy:

- **Baseline load on self-hosted**: Run enough self-hosted capacity for the P50 traffic level
- **Burst to APIs**: Route overflow traffic to API providers during peaks
- **Specialized models self-hosted**: Fine-tuned or domain-specific models that aren't available via APIs
- **General models via API**: Use API providers for frontier models that are impractical to self-host

## Summary and Key Takeaways

1. **Model routing is the highest-impact optimization**: Using a cheap model for easy tasks and reserving expensive models for hard ones can reduce costs by 40-60% with minimal quality impact.

2. **Prompt caching (both client-side and provider-side)** eliminates redundant computation. Provider-side prefix caching is especially valuable for applications with long, stable system prompts.

3. **Batch APIs offer 50% discounts** for non-latency-sensitive workloads. Any pipeline that doesn't need real-time responses should use batch processing.

4. **Token budgeting and monitoring are non-negotiable** in production. Without per-feature and per-user cost tracking, it's impossible to identify optimization opportunities or detect cost anomalies.

5. **System prompt optimization** is low-hanging fruit. Since system prompts are repeated on every request, reducing their length has a multiplied cost impact.

6. **Self-hosting rarely makes sense below ~$10K/month** in API spend for a single model, unless driven by privacy or customization requirements. The operational overhead and utilization challenges of GPU management erode the theoretical cost advantage.

7. **Semantic caching is powerful but risky**: it can dramatically reduce costs for repetitive workloads but requires careful threshold tuning to avoid serving incorrect cached responses.

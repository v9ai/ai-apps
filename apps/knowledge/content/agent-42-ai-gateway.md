# AI Gateways: Rate Limiting, Fallbacks & Multi-Provider Routing

As organizations integrate LLM capabilities across multiple products and teams, the direct-to-provider API call pattern -- where each service independently manages its own API keys, retry logic, and error handling -- becomes untenable. AI gateways emerge as the centralized control plane for LLM traffic, analogous to how API gateways (Kong, Envoy) standardized REST API management a decade ago. This article examines the architecture, capabilities, and implementation patterns of AI gateways, from rate limiting and provider fallback chains through multi-provider routing to the emerging ecosystem of managed gateway solutions.

## Why AI Gateways Exist

Consider an organization with five teams, each building LLM-powered features. Without a gateway, each team independently:

- Manages API keys for OpenAI, Anthropic, Google, and self-hosted models
- Implements retry logic with exponential backoff
- Handles rate limiting and quota management
- Logs usage for cost tracking
- Implements fallback logic when a provider has an outage
- Negotiates and manages provider contracts

This leads to duplicated code, inconsistent error handling, no centralized cost visibility, and no ability to enforce organization-wide policies. An AI gateway consolidates all of this into a single layer.

```
Without Gateway:                    With Gateway:
┌────────┐                          ┌────────┐
│Service A│──┐                      │Service A│──┐
└────────┘  │  ┌──────────┐        └────────┘  │
┌────────┐  ├──│ OpenAI   │        ┌────────┐  │  ┌──────────┐  ┌──────────┐
│Service B│──┤  └──────────┘        │Service B│──┼──│AI Gateway│──│ OpenAI   │
└────────┘  │  ┌──────────┐        └────────┘  │  │          │  └──────────┘
┌────────┐  ├──│ Anthropic│        ┌────────┐  │  │          │  ┌──────────┐
│Service C│──┘  └──────────┘        │Service C│──┘  │          │──│ Anthropic│
└────────┘     ┌──────────┐        └────────┘     │          │  └──────────┘
               │ Google   │                        │          │  ┌──────────┐
               └──────────┘                        │          │──│ Google   │
                                                   └──────────┘  └──────────┘
 5 services × 3 providers =                         Single integration point
 15 integrations to manage                          Centralized policies
```

## Core Architecture

An AI gateway sits in the request path between application services and LLM providers. Its architecture resembles a reverse proxy with LLM-specific middleware:

```python
class AIGateway:
    def __init__(self):
        self.middleware_chain = [
            AuthenticationMiddleware(),
            RateLimitMiddleware(),
            CacheMiddleware(),
            RequestTransformMiddleware(),
            CostTrackingMiddleware(),
            RetryMiddleware(),
            FallbackMiddleware(),
            LoadBalancerMiddleware(),
            ResponseTransformMiddleware(),
            LoggingMiddleware(),
        ]
        self.providers = {
            "openai": OpenAIProvider(),
            "anthropic": AnthropicProvider(),
            "google": GoogleProvider(),
            "self-hosted": SelfHostedProvider(),
        }

    async def handle_request(self, request: GatewayRequest) -> GatewayResponse:
        context = RequestContext(request)

        # Execute middleware chain (pre-processing)
        for middleware in self.middleware_chain:
            result = await middleware.before_request(context)
            if result.should_short_circuit:
                return result.response  # e.g., cache hit, rate limit

        # Route to provider
        provider = context.selected_provider
        response = await provider.call(context.transformed_request)

        # Execute middleware chain (post-processing, in reverse)
        for middleware in reversed(self.middleware_chain):
            response = await middleware.after_response(context, response)

        return response
```

### Request Flow

A typical request through an AI gateway follows this path:

1. **Authentication**: Verify the caller's API key or JWT. Map to an organization, team, and user.
2. **Rate limiting**: Check per-user, per-team, and per-organization rate limits.
3. **Cache lookup**: Check if an identical (or semantically similar) request has been cached.
4. **Request transformation**: Normalize the request into the target provider's format.
5. **Cost estimation**: Estimate token count and projected cost; check against budgets.
6. **Provider selection**: Choose the optimal provider based on routing rules.
7. **Retry/fallback**: If the primary provider fails, retry or fall back to alternatives.
8. **Response transformation**: Normalize the response back to the gateway's canonical format.
9. **Logging and metrics**: Record usage, latency, cost, and quality signals.

## Rate Limiting and Throttling

### Multi-Dimensional Rate Limits

LLM rate limiting must operate on multiple dimensions simultaneously:

```python
class MultiDimensionalRateLimiter:
    def __init__(self, redis: Redis):
        self.redis = redis
        self.limits = {
            # Per-user limits
            "user_rpm": TokenBucket(rate=60, capacity=60),       # 60 req/min
            "user_tpm": TokenBucket(rate=100000, capacity=200000), # 100K tok/min
            "user_daily_cost": FixedWindow(limit=10.0, window="1d"), # $10/day

            # Per-team limits
            "team_rpm": TokenBucket(rate=500, capacity=1000),
            "team_monthly_cost": FixedWindow(limit=5000.0, window="30d"),

            # Per-provider limits (to stay within provider quotas)
            "openai_rpm": TokenBucket(rate=10000, capacity=10000),
            "anthropic_rpm": TokenBucket(rate=4000, capacity=4000),
        }

    async def check(self, request: GatewayRequest) -> RateLimitResult:
        checks = [
            self._check_limit(f"user:{request.user_id}:rpm",
                            self.limits["user_rpm"], 1),
            self._check_limit(f"user:{request.user_id}:tpm",
                            self.limits["user_tpm"], request.estimated_tokens),
            self._check_limit(f"user:{request.user_id}:daily_cost",
                            self.limits["user_daily_cost"], request.estimated_cost),
            self._check_limit(f"team:{request.team_id}:rpm",
                            self.limits["team_rpm"], 1),
            self._check_limit(f"provider:{request.provider}:rpm",
                            self.limits[f"{request.provider}_rpm"], 1),
        ]

        results = await asyncio.gather(*checks)
        violations = [r for r in results if not r.allowed]

        if violations:
            # Return the most restrictive violation
            return RateLimitResult(
                allowed=False,
                retry_after=max(v.retry_after for v in violations),
                violated_limit=violations[0].limit_name,
            )
        return RateLimitResult(allowed=True)
```

### Token-Based Rate Limiting

Unlike traditional API rate limiting that counts requests, LLM rate limiting must account for token consumption. A single request generating 4000 tokens consumes vastly more resources than one generating 50 tokens:

```python
class TokenAwareRateLimiter:
    async def check_and_reserve(self, request: GatewayRequest) -> RateLimitResult:
        estimated_input_tokens = count_tokens(request.messages, request.model)
        estimated_output_tokens = request.max_tokens or 1024
        estimated_total = estimated_input_tokens + estimated_output_tokens

        # Reserve tokens upfront
        reserved = await self.token_bucket.try_consume(estimated_total)
        if not reserved:
            return RateLimitResult(allowed=False,
                                  retry_after=self.token_bucket.time_until_available(estimated_total))

        # After response, reconcile actual vs estimated
        # Return excess reservation to the bucket
        return RateLimitResult(allowed=True,
                              reservation_id=reservation.id,
                              estimated_tokens=estimated_total)

    async def reconcile(self, reservation_id: str, actual_tokens: int):
        reservation = await self.get_reservation(reservation_id)
        excess = reservation.estimated_tokens - actual_tokens
        if excess > 0:
            await self.token_bucket.refund(excess)
```

### Graceful Degradation Under Load

When rate limits are approached, a gateway can implement graduated responses rather than hard rejections:

```python
class GracefulDegradation:
    async def apply(self, request: GatewayRequest, utilization: float) -> GatewayRequest:
        if utilization < 0.7:
            return request  # Normal operation

        elif utilization < 0.85:
            # Reduce max_tokens for non-critical requests
            if request.priority != "critical":
                request.max_tokens = min(request.max_tokens, 512)
            return request

        elif utilization < 0.95:
            # Route to cheaper/faster models
            if request.priority == "low":
                request.model = self.get_cheaper_model(request.model)
            request.max_tokens = min(request.max_tokens, 256)
            return request

        else:
            # Reject non-critical requests
            if request.priority != "critical":
                raise RateLimitError("System at capacity. Only critical requests accepted.")
            return request
```

## Provider Fallback Chains

### Fallback Configuration

A fallback chain defines the order in which providers are tried when the primary provider fails:

```python
@dataclass
class FallbackConfig:
    primary: ProviderConfig
    fallbacks: list[ProviderConfig]
    conditions: list[FallbackCondition]

# Example configuration
fallback_config = FallbackConfig(
    primary=ProviderConfig(
        provider="anthropic",
        model="claude-sonnet-4-20250514",
        timeout_ms=30000,
    ),
    fallbacks=[
        ProviderConfig(
            provider="openai",
            model="gpt-4o",
            timeout_ms=30000,
        ),
        ProviderConfig(
            provider="google",
            model="gemini-2.0-flash",
            timeout_ms=30000,
        ),
        ProviderConfig(
            provider="self-hosted",
            model="llama-3.1-70b",
            timeout_ms=60000,
        ),
    ],
    conditions=[
        FallbackCondition.ON_ERROR_5XX,
        FallbackCondition.ON_TIMEOUT,
        FallbackCondition.ON_RATE_LIMIT,
        # Do NOT fall back on 4xx client errors (bad request, auth failure)
    ]
)
```

### Circuit Breaker Pattern

Blindly retrying a failing provider wastes time and can exacerbate outages. The circuit breaker pattern tracks provider health and stops sending requests to unhealthy providers:

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60, half_open_max=3):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max = half_open_max
        self.state = "closed"          # closed, open, half_open
        self.failure_count = 0
        self.last_failure_time = None
        self.half_open_successes = 0

    async def call(self, provider_fn, request):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half_open"
                self.half_open_successes = 0
            else:
                raise CircuitOpenError(f"Circuit open, retry after "
                                      f"{self.recovery_timeout}s")

        try:
            response = await provider_fn(request)

            if self.state == "half_open":
                self.half_open_successes += 1
                if self.half_open_successes >= self.half_open_max:
                    self.state = "closed"
                    self.failure_count = 0

            return response

        except (TimeoutError, ServerError, RateLimitError) as e:
            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.failure_count >= self.failure_threshold:
                self.state = "open"

            raise

class FallbackHandler:
    def __init__(self, config: FallbackConfig):
        self.config = config
        self.circuit_breakers = {
            p.provider: CircuitBreaker()
            for p in [config.primary] + config.fallbacks
        }

    async def execute(self, request: GatewayRequest) -> GatewayResponse:
        providers = [self.config.primary] + self.config.fallbacks
        last_error = None

        for provider_config in providers:
            breaker = self.circuit_breakers[provider_config.provider]
            try:
                response = await breaker.call(
                    lambda req: self.call_provider(provider_config, req),
                    request
                )
                if provider_config != self.config.primary:
                    logger.warning(f"Served by fallback: {provider_config.provider}")
                return response

            except CircuitOpenError:
                logger.info(f"Circuit open for {provider_config.provider}, skipping")
                continue
            except Exception as e:
                last_error = e
                logger.error(f"Provider {provider_config.provider} failed: {e}")
                continue

        raise AllProvidersFailedError(
            f"All providers exhausted. Last error: {last_error}"
        )
```

## Multi-Provider Routing Strategies

### Model Mapping

Different providers offer models with similar capabilities under different names. A gateway maintains a mapping that allows applications to request capabilities rather than specific models:

```python
MODEL_MAP = {
    # Canonical name -> provider-specific models
    "best": {
        "anthropic": "claude-opus-4-20250514",
        "openai": "gpt-4.5-preview",
        "google": "gemini-2.5-pro",
    },
    "balanced": {
        "anthropic": "claude-sonnet-4-20250514",
        "openai": "gpt-4o",
        "google": "gemini-2.0-flash",
    },
    "fast": {
        "anthropic": "claude-haiku-3-5",
        "openai": "gpt-4o-mini",
        "google": "gemini-2.0-flash-lite",
    },
    "embedding": {
        "openai": "text-embedding-3-large",
        "google": "text-embedding-004",
        "self-hosted": "bge-m3",
    }
}

class ModelMapper:
    def resolve(self, canonical_name: str, provider: str) -> str:
        if canonical_name in MODEL_MAP:
            return MODEL_MAP[canonical_name].get(provider)
        # If it's already a specific model name, pass through
        return canonical_name
```

### Cost-Optimized Routing

Route to the cheapest provider that meets quality requirements:

```python
class CostOptimizedRouter:
    def __init__(self):
        # Cost per million tokens (input, output)
        self.pricing = {
            ("anthropic", "claude-sonnet"): (3.0, 15.0),
            ("openai", "gpt-4o"): (2.5, 10.0),
            ("google", "gemini-2.0-flash"): (0.10, 0.40),
            ("self-hosted", "llama-70b"): (0.20, 0.60),
        }

    async def select_provider(self, request: GatewayRequest) -> ProviderConfig:
        estimated_input = count_tokens(request.messages)
        estimated_output = request.max_tokens or 1024

        candidates = []
        for (provider, model), (input_price, output_price) in self.pricing.items():
            estimated_cost = (
                estimated_input * input_price / 1_000_000 +
                estimated_output * output_price / 1_000_000
            )

            # Check if provider is healthy
            if self.is_healthy(provider):
                candidates.append(ProviderCandidate(
                    provider=provider,
                    model=model,
                    estimated_cost=estimated_cost,
                ))

        # Sort by cost and return cheapest
        candidates.sort(key=lambda c: c.estimated_cost)
        return candidates[0] if candidates else self.default_provider
```

### Latency-Optimized Routing

Route to the provider with the lowest current latency, using a moving average of recent response times:

```python
class LatencyOptimizedRouter:
    def __init__(self):
        self.latency_tracker = {}  # provider -> ExponentialMovingAverage

    async def select_provider(self, request: GatewayRequest) -> ProviderConfig:
        candidates = []
        for provider in self.available_providers:
            avg_ttft = self.latency_tracker.get(provider, {}).get("ttft_p50", float("inf"))
            candidates.append((provider, avg_ttft))

        # Select the fastest responsive provider
        candidates.sort(key=lambda c: c[1])
        return candidates[0][0]

    def record_latency(self, provider: str, ttft_ms: float, total_ms: float):
        if provider not in self.latency_tracker:
            self.latency_tracker[provider] = ExponentialMovingAverage(alpha=0.1)
        self.latency_tracker[provider].update(ttft_ms)
```

### Hedge Routing

For latency-critical requests, send the request to multiple providers simultaneously and use the first response:

```python
class HedgeRouter:
    async def execute(self, request: GatewayRequest,
                     providers: list[ProviderConfig],
                     max_hedges: int = 2) -> GatewayResponse:
        """Send to multiple providers, use first response."""
        tasks = [
            asyncio.create_task(self.call_provider(provider, request))
            for provider in providers[:max_hedges]
        ]

        # Wait for first successful response
        done, pending = await asyncio.wait(
            tasks,
            return_when=asyncio.FIRST_COMPLETED
        )

        # Cancel remaining requests to avoid unnecessary cost
        for task in pending:
            task.cancel()

        # Return the first successful result
        for task in done:
            if not task.exception():
                return task.result()

        # All hedged requests failed; raise the first error
        raise done.pop().exception()
```

Hedge routing reduces tail latency but increases cost (paying for multiple calls). It is best reserved for high-value, latency-critical requests.

## Request/Response Transformation

### Canonical Format

The gateway defines a canonical request/response format and transforms to/from each provider's API:

```python
class RequestTransformer:
    """Transform canonical gateway format to provider-specific format."""

    def to_openai(self, request: GatewayRequest) -> dict:
        return {
            "model": request.model,
            "messages": request.messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "tools": self._transform_tools_openai(request.tools),
            "stream": request.stream,
        }

    def to_anthropic(self, request: GatewayRequest) -> dict:
        system_message = None
        messages = []

        for msg in request.messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            else:
                messages.append(msg)

        body = {
            "model": request.model,
            "messages": messages,
            "max_tokens": request.max_tokens or 1024,  # Required by Anthropic
            "temperature": request.temperature,
            "stream": request.stream,
        }

        if system_message:
            body["system"] = system_message

        if request.tools:
            body["tools"] = self._transform_tools_anthropic(request.tools)

        return body

    def to_google(self, request: GatewayRequest) -> dict:
        return {
            "contents": self._messages_to_google_contents(request.messages),
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            },
            "tools": self._transform_tools_google(request.tools),
        }
```

### Stream Normalization

Each provider has a slightly different SSE streaming format. The gateway normalizes all streams to a consistent format:

```python
class StreamNormalizer:
    async def normalize_anthropic_stream(self, raw_stream) -> AsyncIterator[StreamChunk]:
        async for event in raw_stream:
            if event.type == "content_block_delta":
                yield StreamChunk(
                    type="content",
                    content=event.delta.text,
                    model=event.model,
                )
            elif event.type == "message_delta":
                yield StreamChunk(
                    type="usage",
                    usage=Usage(
                        output_tokens=event.usage.output_tokens,
                    ),
                )
            elif event.type == "message_stop":
                yield StreamChunk(type="done")

    async def normalize_openai_stream(self, raw_stream) -> AsyncIterator[StreamChunk]:
        async for chunk in raw_stream:
            if chunk.choices[0].delta.content:
                yield StreamChunk(
                    type="content",
                    content=chunk.choices[0].delta.content,
                    model=chunk.model,
                )
            if chunk.choices[0].finish_reason:
                yield StreamChunk(type="done")
```

## Caching Layers

The gateway is the ideal location for caching because it sees all requests across all services:

```python
class GatewayCache:
    def __init__(self, redis: Redis, semantic_index=None):
        self.redis = redis
        self.semantic = semantic_index  # Optional vector store

    async def get(self, request: GatewayRequest) -> Optional[GatewayResponse]:
        # Only cache deterministic requests
        if request.temperature and request.temperature > 0:
            return None

        # Level 1: Exact match cache
        exact_key = self._exact_cache_key(request)
        cached = self.redis.get(exact_key)
        if cached:
            return GatewayResponse.from_cache(json.loads(cached))

        # Level 2: Semantic cache (if enabled)
        if self.semantic:
            similar = await self.semantic.find_similar(
                request.messages[-1]["content"],
                threshold=0.97,
            )
            if similar:
                return GatewayResponse.from_cache(similar.response)

        return None

    async def set(self, request: GatewayRequest, response: GatewayResponse):
        if request.temperature and request.temperature > 0:
            return

        exact_key = self._exact_cache_key(request)
        self.redis.setex(
            exact_key,
            3600,  # 1-hour TTL
            json.dumps(response.to_cache_dict())
        )

        if self.semantic:
            await self.semantic.index(
                text=request.messages[-1]["content"],
                response=response.to_cache_dict(),
            )
```

## The Gateway Ecosystem

### LiteLLM

LiteLLM is the most widely adopted open-source AI gateway. It provides a unified OpenAI-compatible API that routes to 100+ LLM providers:

```python
from litellm import completion

# Same interface, different providers
response = completion(
    model="anthropic/claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": "Hello"}],
    fallbacks=["openai/gpt-4o", "gemini/gemini-2.0-flash"],
    timeout=30,
)

# LiteLLM proxy server (self-hosted gateway)
# config.yaml:
"""
model_list:
  - model_name: best-model
    litellm_params:
      model: anthropic/claude-sonnet-4-20250514
      api_key: sk-ant-...
    model_info:
      max_tokens: 8192
  - model_name: best-model  # Same name = load balanced
    litellm_params:
      model: openai/gpt-4o
      api_key: sk-...

router_settings:
  routing_strategy: latency-based-routing
  allowed_fails: 3
  cooldown_time: 60
"""
```

### Portkey

Portkey provides a managed AI gateway with a focus on reliability and observability. Its "AI Gateway" product offers a configuration-driven approach:

```python
from portkey_ai import Portkey

portkey = Portkey(
    api_key="PORTKEY_API_KEY",
    config={
        "strategy": {
            "mode": "fallback",
        },
        "targets": [
            {
                "provider": "anthropic",
                "api_key": "ANTHROPIC_KEY",
                "override_params": {"model": "claude-sonnet-4-20250514"},
                "weight": 1,
            },
            {
                "provider": "openai",
                "api_key": "OPENAI_KEY",
                "override_params": {"model": "gpt-4o"},
                "weight": 1,
            },
        ],
        "cache": {"mode": "semantic", "max_age": 3600},
    }
)

response = portkey.chat.completions.create(
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=256,
)
```

### Cloudflare AI Gateway

Cloudflare's AI Gateway runs at the edge, providing caching, rate limiting, and analytics close to users with minimal latency overhead:

```javascript
// Cloudflare AI Gateway endpoint
const response = await fetch(
    "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai/chat/completions",
    {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: "Hello" }],
        }),
    }
);
```

Cloudflare's edge-based approach adds only 1-5ms of latency (compared to 20-50ms for a centralized gateway) and provides built-in analytics, caching, and rate limiting through their dashboard.

## Authentication and Access Control

### Multi-Tenant Key Management

The gateway manages provider API keys centrally, issuing its own keys to internal consumers:

```python
class GatewayAuthManager:
    async def authenticate(self, request: Request) -> AuthContext:
        gateway_key = request.headers.get("Authorization", "").replace("Bearer ", "")

        # Validate gateway key
        key_info = await self.key_store.lookup(gateway_key)
        if not key_info:
            raise AuthenticationError("Invalid gateway key")

        if key_info.is_expired:
            raise AuthenticationError("Key expired")

        return AuthContext(
            org_id=key_info.org_id,
            team_id=key_info.team_id,
            user_id=key_info.user_id,
            allowed_models=key_info.allowed_models,
            rate_limit_tier=key_info.rate_limit_tier,
            budget_limit_usd=key_info.budget_limit_usd,
        )

    def get_provider_key(self, provider: str, org_id: str) -> str:
        """Retrieve the actual provider API key (never exposed to consumers)."""
        return self.vault.get_secret(f"provider_keys/{org_id}/{provider}")
```

### Model-Level Access Control

Not all teams should have access to all models. A gateway can enforce model-level permissions:

```python
class ModelAccessControl:
    def check_access(self, auth: AuthContext, requested_model: str) -> bool:
        # Check if the model is in the user's allowed list
        if auth.allowed_models and requested_model not in auth.allowed_models:
            raise ForbiddenError(
                f"Model {requested_model} not in allowed models: "
                f"{auth.allowed_models}"
            )

        # Check cost tier restrictions
        model_tier = self.get_model_tier(requested_model)
        if model_tier == "frontier" and auth.rate_limit_tier == "basic":
            raise ForbiddenError(
                "Frontier models require 'premium' rate limit tier"
            )

        return True
```

## Summary and Key Takeaways

1. **AI gateways are the control plane for LLM traffic**, providing centralized management of provider keys, rate limiting, fallback logic, cost tracking, and request transformation across an organization.

2. **Multi-dimensional rate limiting** is essential -- limit by requests per minute, tokens per minute, and cost per day, applied at user, team, and organization levels simultaneously.

3. **Circuit breakers prevent cascading failures** when providers experience outages. Automatically stop routing to unhealthy providers and periodically probe for recovery.

4. **Provider fallback chains** should be ordered by preference (quality, cost, or latency) and triggered only on server errors and timeouts, not client errors.

5. **Request/response transformation** enables provider-agnostic applications. The gateway normalizes between OpenAI, Anthropic, and Google formats so applications code against a single API.

6. **The gateway is the optimal caching location** because it sees all traffic across all services, maximizing cache hit rates through exact-match and semantic caching.

7. **LiteLLM, Portkey, and Cloudflare AI Gateway** represent three approaches: open-source self-hosted (LiteLLM), managed SaaS (Portkey), and edge-native (Cloudflare). The right choice depends on operational maturity, latency requirements, and preference for managed vs. self-hosted infrastructure.

8. **Start with a gateway early**: retrofitting gateway patterns into an organization where teams have already built direct provider integrations is significantly harder than starting with a gateway from day one.

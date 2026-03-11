# LLM Serving: API Design, Batching & Streaming

Serving large language models in production requires solving a unique set of systems challenges that differ fundamentally from traditional ML inference. The autoregressive nature of token generation, variable-length inputs and outputs, and the sheer scale of modern models demand specialized serving architectures that balance throughput, latency, and resource utilization. This article examines the key components of LLM serving stacks, from API design patterns through continuous batching to streaming delivery mechanisms.

## The Anatomy of an LLM Serving Request

Before diving into architecture, it helps to understand what makes LLM serving distinct from serving a classifier or an image model. A single LLM request involves two phases: **prefill** (processing the entire input prompt in parallel) and **decode** (generating output tokens one at a time, each depending on all previous tokens). The prefill phase is compute-bound and parallelizable; the decode phase is memory-bandwidth-bound and inherently sequential.

This two-phase nature creates a tension that pervades every design decision in the serving stack. Prefill benefits from large batch sizes and GPU saturation, while decode benefits from low memory latency and fast KV-cache access. The ratio of input to output tokens varies wildly across requests, making static resource allocation wasteful.

### Key Metrics

- **Time to First Token (TTFT)**: How long until the first output token is generated. Dominated by prefill time.
- **Inter-Token Latency (ITL)**: Time between consecutive output tokens during decode. Determines perceived streaming speed.
- **Throughput**: Total tokens generated per second across all concurrent requests.
- **Token/dollar**: The economic efficiency metric that ultimately drives production decisions.

## API Design Patterns

### REST with Synchronous Response

The simplest pattern: client sends a request, waits for the complete response. OpenAI's `/v1/chat/completions` endpoint without streaming is the canonical example.

```python
# Simple synchronous call
import requests

response = requests.post("https://api.example.com/v1/chat/completions", json={
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Explain quicksort"}],
    "stream": False
})
result = response.json()
```

This pattern works for short outputs or background processing but creates poor user experience for longer generations. The client blocks for the entire generation time, which can be 10-30 seconds for a 1000-token response.

### Server-Sent Events (SSE) Streaming

SSE is the dominant pattern for streaming LLM responses. The server sends a stream of `data:` events, each containing a token or chunk. OpenAI, Anthropic, and most providers use this approach.

```python
# SSE streaming client
import httpx

with httpx.stream("POST", "https://api.example.com/v1/chat/completions", json={
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Explain quicksort"}],
    "stream": True
}) as response:
    for line in response.iter_lines():
        if line.startswith("data: "):
            chunk = json.loads(line[6:])
            if chunk["choices"][0]["delta"].get("content"):
                print(chunk["choices"][0]["delta"]["content"], end="")
```

SSE has several advantages: it works over standard HTTP, passes through most proxies and CDNs, supports automatic reconnection via the `Last-Event-ID` header, and is simple to implement. The trade-off is that it is unidirectional -- the client cannot send messages back on the same connection.

The SSE event format for LLM streaming typically follows this structure:

```
data: {"id":"chatcmpl-abc","choices":[{"delta":{"content":"Quick"}}]}

data: {"id":"chatcmpl-abc","choices":[{"delta":{"content":"sort"}}]}

data: {"id":"chatcmpl-abc","choices":[{"delta":{"content":" is"}}]}

data: [DONE]
```

### WebSocket Streaming

WebSockets provide bidirectional communication, which enables patterns like mid-generation cancellation, sending additional context during generation, or multiplexing multiple conversations over a single connection. Google's Gemini Multimodal Live API uses WebSockets for real-time audio/video interactions.

```javascript
const ws = new WebSocket("wss://api.example.com/v1/stream");

ws.onopen = () => {
    ws.send(JSON.stringify({
        type: "generate",
        messages: [{ role: "user", content: "Explain quicksort" }]
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "token") {
        process.stdout.write(data.content);
    } else if (data.type === "done") {
        ws.close();
    }
};
```

The trade-off is complexity: WebSockets require connection management, heartbeating, reconnection logic, and don't work well with HTTP-based load balancers without special configuration.

### gRPC Streaming

For internal microservice communication, gRPC with server-side streaming offers strong typing, efficient binary serialization via Protocol Buffers, and built-in deadline propagation. NVIDIA Triton Inference Server uses gRPC as its primary serving protocol.

```protobuf
service LLMService {
    rpc Generate(GenerateRequest) returns (stream GenerateResponse);
    rpc GenerateUnary(GenerateRequest) returns (GenerateResponse);
}

message GenerateRequest {
    string model = 1;
    repeated Message messages = 2;
    GenerationParams params = 3;
}
```

## Continuous Batching: The Orca Revolution

Traditional ML serving uses **static batching**: collect N requests, process them as a batch, return all results. This works terribly for LLM inference because requests have wildly different output lengths. In a static batch, all requests must wait for the longest one to finish, wasting GPU cycles on padding.

The Orca paper (Yu et al., 2022, "Orca: A Distributed Serving System for Transformer-Based Generative Models") introduced **continuous batching** (also called **iteration-level scheduling**). The key insight: instead of batching at the request level, batch at the iteration (token) level.

### How Continuous Batching Works

1. The scheduler maintains a pool of active requests, each with its own KV-cache.
2. At each decode iteration, the scheduler selects which requests to include in the current batch.
3. When a request finishes (generates EOS or hits max tokens), its slot is immediately freed.
4. New requests can be admitted into the batch at any iteration, without waiting for other requests to finish.

```
Static Batching:
Request A: [prefill ████████ decode ████████████████████████████]
Request B: [prefill ██ decode ██████████]  [padding ██████████████]
Request C: [prefill ████ decode ████████████████]  [padding ██████]
           |<---- all wait for Request A to finish ---->|

Continuous Batching:
Request A: [prefill ████████ decode ████████████████████████████]
Request B: [prefill ██ decode ██████████]
Request C:          [prefill ████ decode ████████████████]
Request D:                        [prefill ██ decode ████████████]
           ^ D enters when B finishes, no wasted cycles
```

This can improve throughput by 2-8x compared to static batching, depending on the variance in output lengths.

### Prefill-Decode Disaggregation

A further optimization, explored in systems like Splitwise (Patel et al., 2024) and DistServe, is to run prefill and decode on separate GPU pools. Since prefill is compute-bound and decode is memory-bound, they have different optimal hardware configurations. Prefill benefits from high-FLOPS GPUs; decode benefits from high-memory-bandwidth configurations.

```
┌─────────────────┐         ┌──────────────────┐
│   Prefill Pool   │         │   Decode Pool     │
│  (Compute-heavy) │ ──KV──> │  (Memory-heavy)   │
│  High-FLOPS GPUs │  cache  │  High-BW GPUs     │
└─────────────────┘         └──────────────────┘
```

The challenge is efficiently transferring KV-caches between pools. With large context windows (100K+ tokens), KV-caches can be gigabytes in size, making network transfer a bottleneck.

## KV-Cache Management: PagedAttention

One of the most important innovations in LLM serving is **PagedAttention**, introduced in the vLLM paper (Kwon et al., 2023, "Efficient Memory Management for Large Language Model Serving with PagedAttention"). The core problem: KV-caches are large, variably sized, and their final size is unknown at request start.

Traditional serving pre-allocates a contiguous block of GPU memory for each request's KV-cache based on the maximum sequence length. This wastes 60-80% of GPU memory on average due to internal fragmentation (allocated but unused space) and external fragmentation (gaps between allocations).

PagedAttention borrows ideas from OS virtual memory: it divides the KV-cache into fixed-size **pages** (blocks of, say, 16 tokens) and uses a page table to map logical KV-cache positions to physical GPU memory blocks. Pages are allocated on demand as the sequence grows.

```python
# Conceptual PagedAttention allocation
class KVCacheManager:
    def __init__(self, num_blocks, block_size, num_heads, head_dim):
        self.block_size = block_size  # e.g., 16 tokens per block
        self.free_blocks = list(range(num_blocks))
        # Physical KV cache: [num_blocks, 2, num_heads, block_size, head_dim]
        self.kv_cache = torch.zeros(num_blocks, 2, num_heads, block_size, head_dim)

    def allocate_block(self, request_id):
        if not self.free_blocks:
            raise RuntimeError("OOM: no free KV-cache blocks")
        block_id = self.free_blocks.pop()
        self.page_tables[request_id].append(block_id)
        return block_id
```

This achieves near-zero waste and enables advanced features like **copy-on-write** for parallel sampling (multiple completions sharing the same prompt KV-cache) and **prefix caching** (reusing KV-cache pages across requests that share a common prefix).

## Serving Stacks Compared

### vLLM

vLLM is the most widely deployed open-source LLM serving engine. Key features:
- PagedAttention for memory efficiency
- Continuous batching
- Prefix caching
- Tensor parallelism for multi-GPU serving
- OpenAI-compatible API server
- Support for speculative decoding

```bash
# Launch vLLM server
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.1-70B-Instruct \
    --tensor-parallel-size 4 \
    --max-model-len 8192 \
    --enable-prefix-caching \
    --gpu-memory-utilization 0.9
```

### Text Generation Inference (TGI)

Hugging Face's TGI is a Rust-based serving solution with a focus on safety and production readiness. It was one of the first systems to implement continuous batching and Flash Attention in production.

```bash
# Launch TGI with Docker
docker run --gpus all -p 8080:80 \
    -v $PWD/models:/data \
    ghcr.io/huggingface/text-generation-inference:latest \
    --model-id meta-llama/Llama-3.1-70B-Instruct \
    --num-shard 4 \
    --max-input-length 4096 \
    --max-total-tokens 8192
```

### NVIDIA Triton + TensorRT-LLM

For maximum performance on NVIDIA hardware, TensorRT-LLM compiles models into optimized TensorRT engines with custom CUDA kernels. Triton provides the serving infrastructure with advanced scheduling and multi-model support.

```python
# TensorRT-LLM build config
import tensorrt_llm

builder = tensorrt_llm.Builder()
network = builder.create_network()
# ... configure layers, quantization, parallelism
engine = builder.build_engine(network, builder_config)
engine.save("llama-70b-engine")
```

TensorRT-LLM typically achieves 1.5-3x higher throughput than PyTorch-based solutions on the same hardware, at the cost of longer setup time and less flexibility.

### SGLang

SGLang (Zheng et al., 2024) takes a different approach, optimizing at the programming model level. Its RadixAttention mechanism efficiently shares KV-cache across complex multi-call LLM programs (like tree-of-thought or multi-turn chat).

## Request Scheduling and Queuing

### Priority Queuing

Production systems need to handle mixed workloads: real-time chat requests (latency-sensitive) alongside batch processing (throughput-sensitive). A multi-level priority queue allows the scheduler to prefer low-latency requests:

```python
class LLMScheduler:
    def __init__(self):
        self.queues = {
            "realtime": asyncio.PriorityQueue(),   # TTFT < 500ms target
            "interactive": asyncio.PriorityQueue(), # TTFT < 2s target
            "batch": asyncio.PriorityQueue(),       # Throughput-optimized
        }

    async def schedule_next_batch(self, max_batch_tokens: int):
        batch = []
        token_budget = max_batch_tokens

        for tier in ["realtime", "interactive", "batch"]:
            while not self.queues[tier].empty() and token_budget > 0:
                request = self.queues[tier].get_nowait()
                est_tokens = estimate_tokens(request)
                if est_tokens <= token_budget:
                    batch.append(request)
                    token_budget -= est_tokens

        return batch
```

### Admission Control

When the system is overloaded, it's better to reject requests quickly with a 429 status than to accept them and deliver terrible latency. Admission control monitors queue depth, GPU utilization, and KV-cache occupancy to decide whether to accept new requests.

### Fairness and Rate Limiting

In multi-tenant scenarios, per-user rate limiting prevents a single user from monopolizing GPU resources. Token-bucket algorithms work well here, where each user has a bucket that refills at a configured rate:

```python
class TokenBucket:
    def __init__(self, rate: float, capacity: int):
        self.rate = rate          # tokens per second refill rate
        self.capacity = capacity  # max burst size
        self.tokens = capacity
        self.last_refill = time.monotonic()

    def consume(self, num_tokens: int) -> bool:
        self._refill()
        if self.tokens >= num_tokens:
            self.tokens -= num_tokens
            return True
        return False
```

## Throughput vs Latency Tradeoffs

The fundamental tradeoff in LLM serving is between throughput (tokens/second across all requests) and latency (time per individual request). Larger batches improve throughput by amortizing memory access costs but increase per-request latency due to contention.

### The Batching Sweet Spot

For a given GPU and model, there is typically a batching sweet spot where throughput is maximized without unacceptable latency degradation:

- **Batch size 1**: Minimum latency, poor GPU utilization (often <20% of theoretical FLOPS)
- **Batch size 8-32**: Good GPU utilization (60-80%), moderate latency increase
- **Batch size 64-256**: Near-peak throughput, significant latency increase, risk of KV-cache OOM

The optimal batch size depends on model size, sequence length, GPU memory, and the latency SLA. vLLM's scheduler dynamically adjusts the batch size based on these factors.

### Speculative Decoding

Speculative decoding (Leviathan et al., 2023; Chen et al., 2023) uses a small "draft" model to generate K candidate tokens, then verifies them in parallel with the large "target" model. When the draft model's predictions are correct (which happens frequently for common text patterns), this generates K tokens in the time it takes to generate ~1, achieving 2-3x decode speedup without changing output quality.

```python
# Speculative decoding pseudocode
def speculative_decode(draft_model, target_model, prompt, K=5):
    tokens = prompt
    while not done:
        # Draft model generates K candidates
        draft_tokens = draft_model.generate(tokens, num_tokens=K)

        # Target model verifies all K+1 positions in parallel
        target_logits = target_model.forward(tokens + draft_tokens)

        # Accept tokens where draft matches target distribution
        accepted = 0
        for i in range(K):
            if accept_criterion(draft_logits[i], target_logits[i]):
                accepted += 1
            else:
                # Resample from adjusted distribution
                tokens.append(resample(target_logits[i], draft_logits[i]))
                break

        tokens.extend(draft_tokens[:accepted])
```

## Production Deployment Patterns

### Health Checks and Graceful Degradation

A production LLM serving deployment needs layered health checks:

```python
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/health/ready")
async def ready():
    # Check if model is loaded and GPU is responsive
    gpu_ok = await check_gpu_health()
    model_ok = model_loaded and kv_cache_available
    queue_ok = request_queue.qsize() < MAX_QUEUE_DEPTH

    if gpu_ok and model_ok and queue_ok:
        return {"status": "ready"}
    return JSONResponse(status_code=503, content={"status": "not_ready"})
```

### Warm-up and Model Loading

Large models take minutes to load. Production deployments should:
1. Pre-load models during container startup
2. Send synthetic warm-up requests to populate CUDA caches
3. Only mark the instance as "ready" after warm-up completes
4. Use model caching (e.g., safetensors format) to reduce load times

### Observability Integration

Every serving request should emit structured telemetry:

```python
@dataclass
class InferenceMetrics:
    request_id: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    ttft_ms: float
    total_latency_ms: float
    tokens_per_second: float
    queue_wait_ms: float
    batch_size_at_schedule: int
    kv_cache_utilization: float
```

## Summary and Key Takeaways

1. **LLM inference has two distinct phases** -- prefill (compute-bound) and decode (memory-bound) -- that require different optimization strategies and can even run on different hardware pools.

2. **SSE streaming is the dominant API pattern** for LLM serving, offering a good balance of simplicity, compatibility, and user experience. WebSockets add bidirectional communication for advanced use cases like real-time voice.

3. **Continuous batching (Orca) transforms throughput** by scheduling at the iteration level rather than the request level, eliminating padding waste and enabling 2-8x throughput improvements.

4. **PagedAttention (vLLM) solves memory fragmentation** by borrowing virtual memory concepts from operating systems, enabling near-optimal GPU memory utilization for KV-caches.

5. **The throughput-latency tradeoff is fundamental** and must be navigated through dynamic batch sizing, priority scheduling, and admission control based on SLA requirements.

6. **Speculative decoding** is a free lunch for decode-bound workloads, using a small draft model to generate candidates verified in parallel by the target model.

7. **Production serving requires more than fast inference**: health checks, warm-up procedures, graceful degradation, multi-tenant fairness, and comprehensive observability are all essential components.

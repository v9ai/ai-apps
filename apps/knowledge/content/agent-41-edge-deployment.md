# Edge Deployment: On-Device Models, ONNX & WebLLM

The centralized cloud model of LLM inference -- where every token is generated on remote GPU clusters -- is increasingly challenged by latency requirements, privacy regulations, connectivity constraints, and cost pressures. Edge deployment places inference computation closer to (or directly on) the end user's device, encompassing everything from llama.cpp on a laptop to WebGPU-accelerated models in a browser tab. This article examines the runtime landscape, optimization techniques, and architectural patterns that make on-device and edge LLM inference practical, along with the trade-offs that determine when edge deployment is the right choice.

## The Case for Edge Inference

### Latency

Cloud LLM inference adds network round-trip latency (50-200ms), TLS handshake overhead, and queue wait time before the first token is even generated. For real-time applications -- autocomplete, voice assistants, interactive coding tools -- this overhead is perceptible and degrades user experience. On-device inference eliminates network latency entirely, delivering first-token times under 100ms for small models.

### Privacy

Certain use cases require that data never leaves the device. Healthcare applications processing patient records, legal tools analyzing privileged documents, and enterprise systems handling classified information all benefit from inference that operates entirely within the device's trust boundary. No API call means no data in transit, no third-party data processing agreements, and no risk of prompt data appearing in provider logs.

### Cost

Once the model is downloaded to the device, inference is "free" from a marginal cost perspective -- the user's hardware provides the compute. For applications with millions of users making frequent small requests (autocomplete, grammar checking, classification), the aggregate API cost can be substantial. Edge deployment shifts this cost to the user's existing hardware.

### Offline Capability

Edge models work without internet connectivity, enabling use cases in aircraft, remote locations, industrial environments, and mobile applications with spotty connectivity.

## On-Device Inference Runtimes

### llama.cpp

llama.cpp (Gerganov, 2023) is the most influential on-device LLM runtime. Written in C/C++ with no dependencies beyond the standard library, it runs on virtually any hardware: x86, ARM, Apple Silicon, Android, and even microcontrollers. Its GGUF model format has become the de facto standard for quantized model distribution.

Key technical features:
- **Quantization support**: 2-bit through 8-bit quantization with multiple schemes (Q4_K_M, Q5_K_S, Q8_0, etc.)
- **Platform-specific optimizations**: AVX2/AVX-512 on x86, NEON on ARM, Metal on Apple Silicon, CUDA on NVIDIA GPUs, Vulkan for cross-platform GPU
- **Memory-mapped model loading**: Maps model weights directly from disk, allowing the OS to manage memory paging
- **Speculative decoding**: Built-in support for draft model speculation

```bash
# Build llama.cpp with Metal (Apple Silicon) support
cmake -B build -DLLAMA_METAL=ON
cmake --build build --config Release

# Run inference with a quantized model
./build/bin/llama-cli \
    -m models/llama-3.1-8b-instruct-Q4_K_M.gguf \
    -p "Explain edge computing in one paragraph" \
    -n 256 \
    --temp 0.7 \
    -ngl 99    # Offload all layers to GPU
```

Performance on Apple Silicon (M3 Max 36GB / M4 Pro 24GB):

| Model | Quantization | Size | Tokens/sec |
|---|---|---|---|
| Model | Quantization | Size | M3 Max tok/s | M4 Pro tok/s |
|---|---|---|---|---|
| Llama 3.1 8B | Q4_K_M | 4.9 GB | ~55 | ~62 |
| Llama 3.1 8B | Q8_0 | 8.5 GB | ~40 | ~46 |
| Llama 3.1 70B | Q4_K_M | 40 GB | ~12 | ~14 |
| Phi-3 Mini 3.8B | Q4_K_M | 2.3 GB | ~85 | ~95 |
| Qwen 2.5 7B | Q4_K_M | 4.4 GB | ~58 | ~66 |

### MLX (Apple Silicon)

MLX is Apple's machine learning framework specifically designed for Apple Silicon's unified memory architecture, where CPU and GPU share the same memory pool -- eliminating the costly CPU-to-GPU memory transfers that bottleneck inference on discrete GPU systems. With M4-generation chips, MLX benefits from increased memory bandwidth (up to 273 GB/s on M4 Max) and a larger Neural Engine (38 TOPS on M4 vs. 18 TOPS on M3), translating directly to higher inference throughput.

```python
import mlx.core as mx
from mlx_lm import load, generate

# Load a model optimized for MLX
model, tokenizer = load("mlx-community/Llama-3.1-8B-Instruct-4bit")

# Generate text
response = generate(
    model,
    tokenizer,
    prompt="What are the advantages of edge deployment?",
    max_tokens=256,
    temp=0.7,
)
print(response)
```

MLX's key advantage over llama.cpp on Apple Silicon is its Python-first API and tight integration with the PyTorch ecosystem, making it easier to fine-tune models directly on Mac hardware. The `mlx-lm` library provides a streamlined workflow for quantization, conversion, and serving.

```python
# Quantize a model for MLX
from mlx_lm import convert

convert(
    hf_path="meta-llama/Llama-3.1-8B-Instruct",
    mlx_path="models/llama-3.1-8b-mlx-4bit",
    quantize=True,
    q_bits=4,
    q_group_size=64,
)
```

### ONNX Runtime

ONNX Runtime provides a cross-platform inference engine that runs on CPUs, GPUs, and specialized accelerators. Its strength is hardware abstraction: a single ONNX model can run on NVIDIA GPUs (via CUDA/TensorRT), Intel CPUs (via OpenVINO), Qualcomm NPUs (via QNN), and Apple Silicon (via Core ML) through execution providers.

```python
import onnxruntime as ort
import numpy as np

# Create session with appropriate execution provider
providers = [
    ("CUDAExecutionProvider", {"device_id": 0}),      # NVIDIA GPU
    ("CoreMLExecutionProvider", {}),                     # Apple Neural Engine
    ("CPUExecutionProvider", {}),                        # Fallback
]

session = ort.InferenceSession("model.onnx", providers=providers)

# Run inference
input_ids = tokenizer.encode("Hello, how are you?", return_tensors="np")
outputs = session.run(None, {"input_ids": input_ids})
```

For LLM inference specifically, ONNX Runtime GenAI extends the base runtime with autoregressive generation support, KV-cache management, and beam search:

```python
import onnxruntime_genai as og

model = og.Model("models/phi-3-mini-onnx")
tokenizer = og.Tokenizer(model)

params = og.GeneratorParams(model)
params.set_search_options(max_length=256, temperature=0.7)

prompt = "Explain ONNX Runtime"
input_tokens = tokenizer.encode(prompt)
params.input_ids = input_tokens

generator = og.Generator(model, params)
while not generator.is_done():
    generator.compute_logits()
    generator.generate_next_token()

output = tokenizer.decode(generator.get_sequence(0))
```

The ONNX ecosystem excels at model optimization through graph transformations: operator fusion, constant folding, and layout optimization can improve inference speed by 20-40% beyond what the original framework achieves.

## Browser-Based Inference

### WebLLM and WebGPU

WebLLM (MLC team, built on Apache TVM) brings LLM inference directly to the browser using WebGPU, the modern GPU API that replaces WebGL for general-purpose GPU computing. This enables truly client-side inference with no server involvement.

```javascript
import { CreateMLCEngine } from "@mlc-ai/web-llm";

// Initialize the engine (downloads and caches model on first use)
const engine = await CreateMLCEngine("Llama-3.1-8B-Instruct-q4f16_1-MLC", {
    initProgressCallback: (progress) => {
        console.log(`Loading: ${progress.text}`);
    }
});

// Use OpenAI-compatible API
const response = await engine.chat.completions.create({
    messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "What is WebGPU?" }
    ],
    temperature: 0.7,
    max_tokens: 256,
    stream: true,
});

// Stream the response
for await (const chunk of response) {
    const content = chunk.choices[0]?.delta?.content || "";
    process.stdout.write(content);
}
```

WebLLM's architecture:

```
┌─────────────────────────────────────────┐
│              Browser Tab                │
│  ┌───────────────────────────────────┐  │
│  │     JavaScript Application       │  │
│  │  (OpenAI-compatible API)         │  │
│  └────────────┬──────────────────────┘  │
│               │                         │
│  ┌────────────▼──────────────────────┐  │
│  │      WebLLM Runtime              │  │
│  │  (TVM-compiled model, WASM)      │  │
│  └────────────┬──────────────────────┘  │
│               │                         │
│  ┌────────────▼──────────────────────┐  │
│  │         WebGPU API               │  │
│  │  (GPU shader compilation)        │  │
│  └────────────┬──────────────────────┘  │
│               │                         │
└───────────────┼─────────────────────────┘
                │
    ┌───────────▼───────────────┐
    │      GPU Hardware         │
    │  (Metal/Vulkan/D3D12)     │
    └───────────────────────────┘
```

**Limitations**: WebGPU is not yet universally supported (notably absent in Firefox as of early 2026), model download sizes are large (2-8GB for useful models), and browser memory constraints limit model size. Performance is typically 60-80% of native llama.cpp on the same hardware.

### Transformers.js

Hugging Face's Transformers.js runs transformer models in the browser using ONNX Runtime Web (WASM + WebGPU backends). It focuses on smaller models for tasks like text classification, named entity recognition, and embeddings rather than full conversational LLM inference.

```javascript
import { pipeline } from "@xenova/transformers";

// Text classification in the browser
const classifier = await pipeline(
    "sentiment-analysis",
    "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
);
const result = await classifier("I love this product!");
// [{label: "POSITIVE", score: 0.9998}]

// Feature extraction (embeddings) in the browser
const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
);
const embedding = await embedder("Hello world", {
    pooling: "mean",
    normalize: true,
});
```

## Mobile Deployment

### Core ML (iOS/macOS)

Apple's Core ML framework is the primary path for deploying ML models on iOS and macOS. Models are compiled into the `.mlmodelc` format and can execute on the CPU, GPU, or Apple Neural Engine (ANE) -- a dedicated ML accelerator present in all modern Apple chips.

```swift
import CoreML

// Load the compiled model
let config = MLModelConfiguration()
config.computeUnits = .all  // Use CPU + GPU + ANE

let model = try MLModel(contentsOf: modelURL, configuration: config)

// For LLM inference, use the generate API
let input = try MLDictionaryFeatureProvider(dictionary: [
    "input_ids": MLMultiArray(inputTokens),
    "attention_mask": MLMultiArray(attentionMask),
])

let output = try model.prediction(from: input)
```

Apple's `coremltools` library converts PyTorch and TensorFlow models to Core ML format with optional quantization:

```python
import coremltools as ct

# Convert a PyTorch model to Core ML
mlmodel = ct.convert(
    traced_model,
    inputs=[ct.TensorType(shape=(1, ct.RangeDim(1, 2048)), dtype=np.int32)],
    compute_units=ct.ComputeUnit.ALL,
    minimum_deployment_target=ct.target.iOS17,
)

# Apply palettization (weight clustering) for size reduction
from coremltools.optimize.coreml import OpPalettizerConfig, OptimizationConfig

config = OptimizationConfig(
    global_config=OpPalettizerConfig(nbits=4, mode="kmeans")
)
compressed_model = ct.optimize.coreml.palettize_weights(mlmodel, config)
compressed_model.save("model_4bit.mlpackage")
```

### TensorFlow Lite / LiteRT (Android)

Google's TensorFlow Lite (recently rebranded as LiteRT) is the primary framework for on-device inference on Android. It supports GPU delegation (via OpenCL or Vulkan), NNAPI for hardware accelerator access, and hexagon DSP delegation on Qualcomm chips.

```kotlin
// Android: Load and run a TFLite model
val interpreter = Interpreter(modelFile, Interpreter.Options().apply {
    addDelegate(GpuDelegate())  // Use GPU acceleration
    setNumThreads(4)
})

val inputBuffer = ByteBuffer.allocateDirect(inputSize)
// ... fill input buffer with tokenized input

val outputBuffer = ByteBuffer.allocateDirect(outputSize)
interpreter.run(inputBuffer, outputBuffer)
```

For LLM-scale models on Android, the MediaPipe LLM Inference API provides a higher-level abstraction:

```kotlin
val llmInference = LlmInference.createFromOptions(
    context,
    LlmInference.LlmInferenceOptions.builder()
        .setModelPath("/data/local/tmp/gemma-2b-it-gpu-int4.bin")
        .setMaxTokens(1024)
        .setResultListener { partialResult, done ->
            // Handle streaming tokens
            updateUI(partialResult)
        }
        .build()
)

llmInference.generateResponseAsync("What is edge computing?")
```

## Model Optimization for Edge

### Quantization

Quantization reduces model precision from FP32/FP16 to lower bit-widths, directly reducing model size and improving inference speed. The main techniques:

**Post-Training Quantization (PTQ)**: Applied after training without fine-tuning. GPTQ (Frantar et al., 2022) and AWQ (Lin et al., 2023, "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration") are the leading methods.

```python
# AWQ quantization with autoawq
from awq import AutoAWQForCausalLM
from transformers import AutoTokenizer

model = AutoAWQForCausalLM.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")

# Calibrate with representative data
quant_config = {
    "zero_point": True,
    "q_group_size": 128,
    "w_bit": 4,
    "version": "GEMM"
}

model.quantize(tokenizer, quant_config=quant_config)
model.save_quantized("llama-3.1-8b-awq-4bit")
```

**Quality impact by bit-width** (approximate, model-dependent):

| Bit-width | Size Reduction | Quality Impact | Use Case |
|---|---|---|---|
| FP16 | 2x vs FP32 | None | Server baseline |
| INT8 | 4x vs FP32 | Negligible (<1%) | Edge with quality priority |
| INT4 | 8x vs FP32 | Small (1-3%) | Edge default sweet spot |
| INT3 | 10x vs FP32 | Moderate (3-8%) | Memory-constrained devices |
| INT2 | 16x vs FP32 | Significant (8-15%) | Extreme compression |

### Pruning

Pruning removes unnecessary weights or structures from the model. **Structured pruning** removes entire attention heads, neurons, or layers, producing a genuinely smaller model. **Unstructured pruning** zeroes out individual weights, requiring sparse matrix support for speedup.

The SparseGPT algorithm (Frantar & Alistarh, 2023) achieves 50-60% unstructured sparsity with minimal quality loss on large models:

```python
# Conceptual structured pruning: remove attention heads with lowest importance
def prune_attention_heads(model, num_heads_to_remove_per_layer=4):
    for layer in model.layers:
        head_importance = compute_head_importance(layer, calibration_data)
        heads_to_prune = head_importance.argsort()[:num_heads_to_remove_per_layer]
        layer.self_attn.prune_heads(heads_to_prune)
    return model
```

### Knowledge Distillation

Knowledge distillation trains a small "student" model to mimic the outputs of a large "teacher" model. For edge deployment, this can produce models that are both smaller and more task-specific than general-purpose quantized models.

```python
# Distillation training loop (simplified)
def distillation_step(teacher, student, input_ids, temperature=2.0, alpha=0.5):
    with torch.no_grad():
        teacher_logits = teacher(input_ids).logits

    student_logits = student(input_ids).logits

    # Soft target loss (KL divergence between teacher and student distributions)
    soft_loss = F.kl_div(
        F.log_softmax(student_logits / temperature, dim=-1),
        F.softmax(teacher_logits / temperature, dim=-1),
        reduction="batchmean"
    ) * (temperature ** 2)

    # Hard target loss (standard cross-entropy)
    hard_loss = F.cross_entropy(student_logits, input_ids[:, 1:])

    # Combined loss
    return alpha * soft_loss + (1 - alpha) * hard_loss
```

## Hybrid Edge-Cloud Architectures

Pure edge deployment limits model capability; pure cloud deployment limits latency, privacy, and offline use. Hybrid architectures combine both.

### Speculative Edge-Cloud

Use a small edge model for speculative decoding, with a cloud model as the verifier. The edge model generates draft tokens locally (fast, private), and the cloud model verifies and corrects in parallel:

```python
class HybridSpeculativeInference:
    def __init__(self, edge_model, cloud_client):
        self.edge = edge_model       # Small model running locally
        self.cloud = cloud_client    # API client for large model

    async def generate(self, prompt: str, max_tokens: int = 256):
        tokens = tokenize(prompt)
        output = []

        while len(output) < max_tokens:
            # Edge model generates K draft tokens (fast, local)
            draft_tokens = self.edge.generate(tokens, num_tokens=8)

            # Cloud model verifies in parallel (one forward pass)
            verified = await self.cloud.verify(tokens, draft_tokens)

            # Accept verified tokens
            accepted = verified.accepted_tokens
            output.extend(accepted)
            tokens.extend(accepted)

            if verified.hit_eos:
                break

        return detokenize(output)
```

### Tiered Processing

Route requests based on complexity: handle simple tasks on-device and escalate complex tasks to the cloud:

```python
class TieredInference:
    def __init__(self, edge_model, cloud_client, complexity_threshold=0.6):
        self.edge = edge_model
        self.cloud = cloud_client
        self.threshold = complexity_threshold

    async def process(self, request: str) -> str:
        # Quick complexity assessment on-device
        complexity = self.edge.assess_complexity(request)

        if complexity < self.threshold:
            # Handle locally
            return self.edge.generate(request)
        else:
            # Escalate to cloud (if connected)
            if self.is_online():
                return await self.cloud.generate(request)
            else:
                # Fallback: best-effort local generation
                return self.edge.generate(
                    request,
                    system="You may not have enough capability for this. "
                           "Do your best and note any uncertainty."
                )
```

### Edge Preprocessing + Cloud Generation

Use edge models for preprocessing tasks (embedding, classification, extraction) and cloud models only for generation:

```
User Device                          Cloud
┌─────────────────┐                 ┌──────────────────┐
│ Edge Model       │                 │ Cloud LLM         │
│ - Embed query    │──embedding──>   │ - RAG retrieval   │
│ - Classify intent│──intent────>    │ - Generate response│
│ - Extract entities│──entities──>   │                    │
│ - PII detection  │                 │                    │
│   (strip before  │                 │                    │
│    sending)      │                 │                    │
└─────────────────┘                 └──────────────────┘
```

This pattern preserves privacy by filtering PII on-device before any data reaches the cloud, while still leveraging cloud model capability for the generation task.

## Performance Benchmarking on Edge

When evaluating edge deployment options, standardize your benchmarks:

```python
@dataclass
class EdgeBenchmarkResult:
    runtime: str              # "llama.cpp", "mlx", "onnxruntime", etc.
    model: str                # Model name and size
    quantization: str         # "Q4_K_M", "4bit", "INT8", etc.
    device: str               # "M3 Max", "iPhone 15 Pro", "Pixel 8"
    model_load_time_s: float  # Time to load model into memory
    model_size_gb: float      # On-disk model size
    memory_usage_gb: float    # Peak RAM/VRAM during inference
    prefill_tok_per_s: float  # Input processing speed
    decode_tok_per_s: float   # Output generation speed
    ttft_ms: float            # Time to first token
    power_draw_w: float       # Power consumption during inference
    battery_impact: str       # Estimated battery life impact
```

## Summary and Key Takeaways

1. **llama.cpp is the universal edge runtime**: its C/C++ implementation with no dependencies runs on virtually every platform, and GGUF has become the standard format for quantized model distribution.

2. **MLX excels on Apple Silicon** by leveraging unified memory to eliminate CPU-GPU transfer overhead, with a Python-first API that simplifies development and fine-tuning workflows.

3. **WebLLM brings LLM inference to the browser** via WebGPU, enabling truly client-side applications with no server infrastructure, though model download size and browser compatibility remain limitations.

4. **INT4 quantization is the edge sweet spot**: 8x size reduction with 1-3% quality loss makes it practical to run 7-8B parameter models on consumer hardware at interactive speeds.

5. **Hybrid edge-cloud architectures** offer the best of both worlds -- use edge models for latency-sensitive preprocessing, privacy-preserving PII filtering, and offline capability, while escalating complex generation to cloud models.

6. **Mobile deployment** is maturing rapidly through Core ML (iOS) and MediaPipe/LiteRT (Android), with dedicated neural accelerators (Apple Neural Engine, Qualcomm Hexagon) providing energy-efficient inference.

7. **The edge deployment decision** hinges on four factors: latency requirements, privacy constraints, cost at scale, and offline needs. If none of these are compelling, cloud inference remains simpler to operate and offers access to larger, more capable models.

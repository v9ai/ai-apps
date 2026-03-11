# Function Calling & Tool Integration: APIs, Schemas & Execution

Function calling has emerged as the foundational mechanism through which large language models interact with external systems, transforming LLMs from text generators into capable agents. This article examines the design of function calling APIs across major providers, the role of JSON Schema in tool definitions, parallel execution strategies, sandboxing considerations, and patterns for building reliable tool pipelines that handle errors gracefully and scale to complex workflows.

## The Evolution of Function Calling

Before dedicated function calling APIs existed, developers resorted to prompt engineering: instructing the model to output JSON in a particular format, then parsing the result with fragile regex or string matching. This approach was error-prone, with models frequently producing malformed output, hallucinating function names, or embedding function calls within conversational text that resisted reliable extraction.

OpenAI's introduction of function calling in June 2023 marked a turning point. By moving tool definitions into a structured API parameter, the model could be trained to produce tool invocations as structured objects rather than freeform text. This architectural decision -- separating the tool invocation channel from the conversational channel -- solved the parsing problem and opened the door to reliable agent systems.

### How Function Calling Actually Works

At the API level, function calling involves three phases:

1. **Declaration**: The developer provides tool definitions alongside the user message
2. **Invocation**: The model returns a structured tool call instead of (or alongside) a text response
3. **Result injection**: The developer executes the function, then sends the result back as a new message

This creates a multi-turn conversation pattern where the model, runtime, and external systems collaborate:

```python
import openai

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City and state, e.g. San Francisco, CA"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"]
                    }
                },
                "required": ["location"]
            }
        }
    }
]

response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools
)

# Model returns: tool_calls=[{id: "call_abc", function: {name: "get_weather", arguments: '{"location": "Tokyo, Japan"}'}}]
```

## API Design Across Providers

### OpenAI's Function Calling

OpenAI's implementation introduced the `tools` parameter (replacing the earlier `functions` parameter) with support for multiple tool types. Key design decisions include:

- **`tool_choice`**: Controls whether the model must call a tool (`"required"`), can choose (`"auto"`), or must not (`"none"`). The `{"type": "function", "function": {"name": "specific_function"}}` form forces a specific tool.
- **Parallel tool calls**: The model can return multiple tool calls in a single response, enabling concurrent execution.
- **Strict mode**: When `"strict": true` is set on a function definition, the model's output is guaranteed to conform to the provided JSON Schema via constrained decoding.

Strict mode deserves particular attention. Without it, models occasionally produce arguments that violate the schema -- missing required fields, wrong types, or extra properties. With strict mode, OpenAI uses constrained decoding (likely a context-free grammar or finite automaton approach) to ensure every generated token leads to valid JSON conforming to the schema. The tradeoff is a slight increase in first-token latency and restrictions on supported schema features (no `oneOf`, limited recursion).

### Anthropic's Tool Use

Anthropic's tool use API follows a similar pattern but with notable differences:

```python
import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    tools=[{
        "name": "get_stock_price",
        "description": "Gets the current stock price for a given ticker symbol.",
        "input_schema": {
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "The stock ticker symbol, e.g. AAPL"
                }
            },
            "required": ["ticker"]
        }
    }],
    messages=[{"role": "user", "content": "What's Apple's stock price?"}]
)
```

Key differences from OpenAI:

- **`input_schema`** instead of `parameters` for the JSON Schema definition
- **Content blocks**: Tool calls appear as `tool_use` content blocks within the assistant message, alongside optional `text` blocks. This allows the model to explain its reasoning before or after tool invocations.
- **`tool_result` messages**: Results are sent back as user messages containing `tool_result` content blocks with matching `tool_use_id`.
- **Cache-friendly**: Tool definitions can be cached using prompt caching, reducing cost when the same tools are used across many requests.

### Google Gemini

Gemini's function calling API introduces additional concepts:

- **Function declarations** use a similar JSON Schema approach but with Google's own protobuf-derived schema format
- **Automatic function calling**: The SDK can automatically execute functions if provided with callable Python objects, creating a tighter integration loop
- **Function calling modes**: `AUTO`, `ANY` (must call at least one function), and `NONE`

## JSON Schema as the Universal Tool Language

JSON Schema (drafts 2020-12 and earlier) has become the de facto standard for defining tool interfaces. This choice is pragmatic: JSON Schema is widely adopted, has good tooling support, and maps naturally to the structured output that LLMs need to produce.

### Effective Schema Design

The quality of tool definitions directly impacts the model's ability to use them correctly. Several principles emerge from practice:

**Descriptive field names and descriptions matter enormously.** The model uses these as semantic cues. Compare:

```json
{
  "name": "q",
  "description": "Query parameter",
  "type": "string"
}
```

versus:

```json
{
  "name": "search_query",
  "description": "The search query string. Supports boolean operators (AND, OR, NOT) and phrase matching with quotes. Example: 'machine learning AND \"neural networks\"'",
  "type": "string"
}
```

The second definition gives the model enough context to construct effective queries without additional prompting.

**Enums constrain the output space.** When a parameter has a known set of valid values, using `"enum"` prevents hallucination of invalid options and enables constrained decoding optimizations:

```json
{
  "name": "priority",
  "type": "string",
  "enum": ["low", "medium", "high", "critical"],
  "description": "Task priority level"
}
```

**Nested objects model complex inputs.** Real-world tools often need structured inputs:

```json
{
  "name": "create_calendar_event",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {"type": "string"},
      "time_range": {
        "type": "object",
        "properties": {
          "start": {"type": "string", "format": "date-time"},
          "end": {"type": "string", "format": "date-time"}
        },
        "required": ["start", "end"]
      },
      "attendees": {
        "type": "array",
        "items": {"type": "string", "format": "email"}
      }
    },
    "required": ["title", "time_range"]
  }
}
```

### Schema Limitations and Workarounds

Not all JSON Schema features are supported uniformly. `$ref` for recursive schemas, `oneOf`/`anyOf` for union types, and `patternProperties` have inconsistent support. When strict mode is required, developers must often flatten schemas and use simpler constructs.

A common pattern for handling polymorphic inputs is the discriminated union:

```json
{
  "type": "object",
  "properties": {
    "action_type": {"type": "string", "enum": ["send_email", "create_task"]},
    "email_to": {"type": "string"},
    "email_body": {"type": "string"},
    "task_title": {"type": "string"},
    "task_due_date": {"type": "string"}
  },
  "required": ["action_type"]
}
```

This is less elegant than a proper union type but works reliably across providers.

## Parallel Function Calling

When a user request requires multiple independent pieces of information, sequential tool calls waste time and tokens. Parallel function calling allows the model to emit multiple tool calls in a single response:

```python
# Model response might contain:
# tool_calls = [
#     {id: "call_1", function: {name: "get_weather", arguments: '{"location": "Tokyo"}'}},
#     {id: "call_2", function: {name: "get_weather", arguments: '{"location": "London"}'}},
#     {id: "call_3", function: {name: "get_exchange_rate", arguments: '{"from": "JPY", "to": "GBP"}'}}
# ]

import asyncio

async def execute_tool_calls(tool_calls):
    tasks = []
    for call in tool_calls:
        func = tool_registry[call.function.name]
        args = json.loads(call.function.arguments)
        tasks.append(asyncio.create_task(func(**args)))
    return await asyncio.gather(*tasks)
```

The runtime executes all three calls concurrently, then sends all results back in a single message. This reduces the number of LLM round-trips and can significantly decrease end-to-end latency.

However, parallel calling introduces ordering considerations. The model must determine which calls are independent (can be parallelized) versus dependent (must be sequential). In practice, models handle this well for obvious cases but can sometimes attempt to parallelize calls that have implicit dependencies.

## Execution Sandboxing

When function calls interact with external systems, security becomes paramount. Several approaches to sandboxing exist:

### Permission Scoping

The simplest approach is restricting which tools are available based on the context:

```python
def get_tools_for_context(user_role, context):
    base_tools = [search_tool, calculator_tool]
    if user_role == "admin":
        base_tools.extend([delete_tool, modify_tool])
    if context == "readonly":
        base_tools = [t for t in base_tools if t.metadata.get("safe", False)]
    return base_tools
```

### Human-in-the-Loop Confirmation

For high-stakes operations, requiring user confirmation before execution:

```python
async def execute_with_confirmation(tool_call, user_session):
    risk_level = assess_risk(tool_call)
    if risk_level == "high":
        approved = await user_session.request_confirmation(
            f"Allow {tool_call.function.name} with args {tool_call.function.arguments}?"
        )
        if not approved:
            return {"error": "User denied execution", "tool_call_id": tool_call.id}
    return await execute(tool_call)
```

### Container-Based Isolation

For code execution tools, running in isolated containers (e.g., E2B, Docker, gVisor) prevents the agent from affecting the host system:

```python
import e2b

sandbox = e2b.Sandbox()
result = sandbox.run_code(generated_code, language="python", timeout=30)
```

## Error Handling Patterns

Robust tool pipelines must handle failures at every level. A taxonomy of tool call errors includes:

### Schema Validation Errors

The model produces arguments that don't match the schema. With strict mode this is prevented; without it, validate before execution:

```python
import jsonschema

def validate_and_execute(tool_call, tool_definitions):
    tool_def = tool_definitions[tool_call.function.name]
    args = json.loads(tool_call.function.arguments)
    try:
        jsonschema.validate(args, tool_def["parameters"])
    except jsonschema.ValidationError as e:
        return {
            "error": f"Invalid arguments: {e.message}",
            "tool_call_id": tool_call.id
        }
    return execute(tool_call)
```

### Execution Errors

The function itself fails (API timeout, rate limit, invalid input that passed schema validation):

```python
def execute_with_retry(func, args, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = func(**args)
            return {"success": True, "data": result}
        except RateLimitError:
            time.sleep(2 ** attempt)
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Max retries exceeded"}
```

### Feeding Errors Back to the Model

A critical pattern is returning error information to the model so it can self-correct:

```python
tool_result_message = {
    "role": "tool",
    "tool_call_id": tool_call.id,
    "content": json.dumps({
        "error": "FileNotFoundError: /data/report.csv not found",
        "suggestion": "Available files: /data/report_2024.csv, /data/report_2023.csv"
    })
}
# The model can then retry with the correct filename
```

This error-retry loop is one of the most powerful patterns in agent systems. Research from Microsoft (Patil et al., "Gorilla: Large Language Model Connected with Massive APIs," 2023) shows that models can effectively recover from errors when given clear error messages and contextual hints.

## Tool Result Injection and Context Management

As tool calls accumulate, the conversation context grows. Each tool call adds the assistant's invocation and the tool's result to the message history. For complex workflows with many tools, this can quickly consume the context window.

### Result Summarization

For tools that return large payloads, summarize before injecting:

```python
def inject_tool_result(raw_result, max_tokens=500):
    result_str = json.dumps(raw_result)
    if estimate_tokens(result_str) > max_tokens:
        # Truncate or summarize
        if isinstance(raw_result, list):
            return json.dumps({
                "count": len(raw_result),
                "first_5": raw_result[:5],
                "note": f"Showing 5 of {len(raw_result)} results"
            })
        return result_str[:max_tokens * 4]  # rough char estimate
    return result_str
```

### Selective History

For long-running agents, maintain only recent tool interactions in the context while summarizing earlier ones:

```python
def manage_tool_history(messages, max_tool_pairs=10):
    tool_pairs = extract_tool_call_result_pairs(messages)
    if len(tool_pairs) > max_tool_pairs:
        old_pairs = tool_pairs[:-max_tool_pairs]
        summary = summarize_tool_interactions(old_pairs)
        messages = [messages[0]]  # system message
        messages.append({"role": "user", "content": f"Previous tool interactions summary: {summary}"})
        messages.extend(flatten(tool_pairs[-max_tool_pairs:]))
    return messages
```

## Building Reliable Tool Pipelines

Production tool systems require more than just the API call. A robust pipeline includes:

### Tool Registry Pattern

```python
class ToolRegistry:
    def __init__(self):
        self._tools = {}
        self._middleware = []

    def register(self, name, func, schema, metadata=None):
        self._tools[name] = {
            "function": func,
            "schema": schema,
            "metadata": metadata or {}
        }

    def add_middleware(self, middleware_fn):
        self._middleware.append(middleware_fn)

    async def execute(self, tool_call):
        tool = self._tools.get(tool_call.function.name)
        if not tool:
            return {"error": f"Unknown tool: {tool_call.function.name}"}

        context = {"tool_call": tool_call, "tool": tool}
        for middleware in self._middleware:
            context = await middleware(context)
            if context.get("short_circuit"):
                return context["result"]

        args = json.loads(tool_call.function.arguments)
        return await tool["function"](**args)
```

### Observability

Logging every tool call with timing, inputs, outputs, and errors is essential for debugging agent behavior:

```python
async def logging_middleware(context):
    start = time.time()
    tool_call = context["tool_call"]
    logger.info(f"Tool call: {tool_call.function.name}", extra={
        "tool_name": tool_call.function.name,
        "arguments": tool_call.function.arguments,
        "call_id": tool_call.id
    })
    return context

async def timing_middleware(context):
    context["start_time"] = time.time()
    return context
```

### Rate Limiting and Cost Control

Tools that call paid APIs need rate limiting and cost tracking:

```python
class CostTracker:
    def __init__(self, budget_per_session=1.0):
        self.total_cost = 0.0
        self.budget = budget_per_session

    async def cost_middleware(self, context):
        tool = context["tool"]
        estimated_cost = tool["metadata"].get("cost_per_call", 0.0)
        if self.total_cost + estimated_cost > self.budget:
            context["short_circuit"] = True
            context["result"] = {"error": "Budget exceeded for this session"}
        return context
```

## Summary and Key Takeaways

- **Function calling APIs** have converged on a common pattern: declare tools via JSON Schema, receive structured invocations, return results as messages. The differences between OpenAI, Anthropic, and Gemini are syntactic rather than conceptual.
- **JSON Schema is the lingua franca** for tool definitions. Invest in descriptive names, thorough descriptions, and appropriate constraints (enums, required fields) to maximize the model's accuracy.
- **Strict mode / constrained decoding** eliminates schema validation errors at the cost of slight latency and schema feature restrictions. Use it in production.
- **Parallel function calling** reduces latency by allowing concurrent execution of independent tools. Design your tool set with independence in mind.
- **Error handling must be bidirectional**: catch execution errors, but also feed error information back to the model to enable self-correction.
- **Context management** becomes critical in long-running tool pipelines. Summarize large results, prune old tool interactions, and monitor context window usage.
- **Production tool systems** need middleware for logging, rate limiting, cost tracking, and security. The tool registry pattern provides a clean abstraction for these cross-cutting concerns.

The function calling interface is deceptively simple -- a few API parameters and a JSON Schema. But building reliable, secure, and efficient tool pipelines on top of it requires careful engineering across validation, execution, error handling, and observability.

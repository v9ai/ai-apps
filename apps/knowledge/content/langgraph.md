# LangGraph: Stateful Agent Orchestration with Graphs

LangGraph is a framework for building stateful, multi-step AI applications as directed graphs. Part of the LangChain ecosystem but usable independently, LangGraph models agent logic as a graph where nodes are computation steps, edges define control flow, and a shared state object flows through the entire execution. This architecture addresses the fundamental limitations of linear chain-based approaches: real-world AI workflows require branching, parallel execution, cycles, conditional routing, human-in-the-loop gates, and persistent state -- none of which fit naturally into sequential pipelines. This article covers LangGraph from first principles through production deployment, serving as the central reference for LangGraph content across this series. For foundational agent patterns, see [Agent Architectures](/agent-architectures); for multi-agent coordination, see [Multi-Agent Systems](/multi-agent-systems).

## Core Concepts

### The StateGraph Abstraction

Every LangGraph application starts with a `StateGraph` -- a directed graph parameterized by a state type. The state is a TypedDict that defines all the data flowing through the graph. Nodes are functions that read the current state and return partial updates. Edges connect nodes and define execution order.

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict

class MyState(TypedDict):
    query: str
    context: str
    answer: str

def retrieve(state: MyState) -> dict:
    """Fetch relevant context for the query."""
    docs = vector_store.search(state["query"], k=5)
    return {"context": "\n".join(docs)}

def generate(state: MyState) -> dict:
    """Generate an answer using the retrieved context."""
    answer = llm.invoke(f"Context: {state['context']}\nQuestion: {state['query']}")
    return {"answer": answer}

# Build the graph
graph = StateGraph(MyState)
graph.add_node("retrieve", retrieve)
graph.add_node("generate", generate)

graph.add_edge(START, "retrieve")
graph.add_edge("retrieve", "generate")
graph.add_edge("generate", END)

app = graph.compile()
result = app.invoke({"query": "What is context engineering?"})
```

Key design principles:
- **Nodes return partial state updates**, not the full state. LangGraph merges the returned dict into the current state.
- **State is immutable within a node** -- each node receives a snapshot and returns updates.
- **The graph is compiled** before execution, enabling validation of edges, detection of unreachable nodes, and optimization.

### State Reducers

When multiple nodes (especially parallel ones) write to the same state key, LangGraph needs to know how to merge the values. Reducers define this merge behavior:

```python
import operator
from typing import Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import AnyMessage

class AgentState(TypedDict):
    # add_messages reducer: new messages are appended, not overwritten
    messages: Annotated[list[AnyMessage], add_messages]
    # operator.add reducer: lists from parallel branches are concatenated
    results: Annotated[list[dict], operator.add]
    # No reducer: last write wins (default behavior)
    status: str
```

The `add_messages` reducer is particularly important -- it handles message deduplication by ID, enables message updates (replacing a message with the same ID), and preserves conversation ordering. This is what makes LangGraph suitable for chat-based agent loops where the message list grows over time.

Common reducers:
- `add_messages`: Append messages, deduplicate by ID (for chat/agent state)
- `operator.add`: Concatenate lists (for collecting results from parallel branches)
- Custom function: Any `(existing, new) -> merged` callable for complex merge logic

### Conditional Edges

Conditional edges route execution based on the current state. This is what enables branching logic, decision points, and loop termination:

```python
from typing import Literal

def should_continue(state: AgentState) -> Literal["tools", "end"]:
    """Route based on whether the last message contains tool calls."""
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return "end"

graph.add_conditional_edges(
    "agent",              # source node
    should_continue,      # routing function
    {                     # mapping: return value -> target node
        "tools": "tools",
        "end": END,
    }
)
```

Conditional edges are the mechanism for implementing:
- **ReAct loops**: Continue calling tools until the agent decides to respond
- **Quality gates**: Route to revision if output doesn't meet criteria
- **Error recovery**: Route to fallback logic on failure
- **Human-in-the-loop**: Route to a wait state for human approval

### Command: Combined Routing and State Updates

`Command` is a return type that combines a state update with an explicit routing directive in a single value. Instead of a node returning a plain dict (state update only) or a routing function returning a string (route only), `Command` lets a node do both atomically:

```python
from langgraph.types import Command

def triage_agent(state: AgentState) -> Command:
    """Classify the request and route to the appropriate specialist."""
    classification = classifier_llm.invoke(state["messages"])

    if classification == "billing":
        return Command(
            update={"messages": [classification_msg], "route": "billing"},
            goto="billing_agent",
        )
    elif classification == "technical":
        return Command(
            update={"messages": [classification_msg], "route": "technical"},
            goto="technical_agent",
        )
    else:
        return Command(
            update={"messages": [classification_msg]},
            goto=END,
        )

# No need for a separate conditional_edges call — the node controls routing
graph.add_node("triage", triage_agent)
graph.add_node("billing_agent", billing_node)
graph.add_node("technical_agent", technical_node)
graph.add_edge(START, "triage")
# billing_agent and technical_agent edges are determined by Command at runtime
```

`Command` is also the mechanism for resuming a graph after an `interrupt()` (see Human-in-the-Loop section):

```python
# Resume a paused graph with human input
agent.invoke(Command(resume={"approved": True}), config=config)
```

When to use `Command` vs `add_conditional_edges`:
- **`Command`**: When the routing decision is best made inside the node, alongside the state update that motivated the decision. Preferred for multi-agent handoffs where the current agent decides who handles next.
- **`add_conditional_edges`**: When routing is a pure function of state, separate from computation. Preferred when multiple nodes share the same routing logic.

### The Send() Primitive for Parallel Fan-Out

`Send()` dispatches work to a node with a specific state payload, enabling the map-reduce pattern within a graph:

```python
from langgraph.types import Send

def fan_out_tasks(state: MyState) -> list[Send]:
    """Dispatch each sub-task to a worker node in parallel."""
    return [
        Send("worker", {"task": task, "results": []})
        for task in state["sub_tasks"]
    ]

graph.add_conditional_edges("planner", fan_out_tasks)
```

When a node returns a list of `Send` objects, LangGraph executes all target nodes in parallel. Each worker receives its own state copy. Results are merged back using the configured reducer. This is conceptually MapReduce: the routing function is the map phase, workers are the compute phase, and reducers handle the reduce phase.

For a detailed example of `Send()` in practice, see the red-teaming fan-out pattern in [Red-Teaming with LangGraph](/langgraph-red-teaming).

## Prebuilt Components

LangGraph ships prebuilt components for common patterns, reducing boilerplate for standard agent architectures:

### ToolNode and tools_condition

The most common pattern -- a ReAct agent that calls tools until it has an answer:

```python
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import AnyMessage
from typing import Annotated, TypedDict

class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]

tools = [search_tool, calculator_tool, weather_tool]
tool_node = ToolNode(tools)

def call_model(state: State) -> dict:
    response = model.bind_tools(tools).invoke(state["messages"])
    return {"messages": [response]}

graph = StateGraph(State)
graph.add_node("agent", call_model)
graph.add_node("tools", tool_node)

graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", tools_condition)  # AUTO: tool_calls -> "tools", else -> END
graph.add_edge("tools", "agent")

agent = graph.compile()
```

`tools_condition` inspects the last message: if it contains tool calls, route to the `"tools"` node; otherwise, route to `END`. `ToolNode` automatically executes the requested tools and returns results as `ToolMessage` objects.

### create_react_agent

For the simplest case, LangGraph provides a one-liner that builds the entire ReAct graph:

```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(
    model=model,
    tools=[search_tool, calculator_tool],
    state_modifier="You are a helpful research assistant."  # system prompt
)

result = agent.invoke({"messages": [("user", "What's the population of Tokyo?")]})
```

This creates a compiled graph with the agent node, tool node, conditional routing, and message handling -- equivalent to the manual graph construction above but in one call.

## Persistence and Checkpointing

LangGraph's checkpointing system saves the graph state at every node, enabling pause/resume, fault tolerance, and time-travel debugging:

```python
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres import PostgresSaver

# In-memory checkpointing (development)
memory = MemorySaver()
agent = graph.compile(checkpointer=memory)

# PostgreSQL checkpointing (production)
# postgres_saver = PostgresSaver.from_conn_string("postgresql://...")
# agent = graph.compile(checkpointer=postgres_saver)

# Every invocation with a thread_id gets persistent state
config = {"configurable": {"thread_id": "user-session-42"}}
result = agent.invoke({"messages": [("user", "Research quantum computing")]}, config=config)

# Continue the same conversation later
result2 = agent.invoke({"messages": [("user", "Now summarize your findings")]}, config=config)
```

### Time-Travel Debugging

Checkpointing enables rewinding to any previous state and replaying from there -- invaluable for debugging agent failures:

```python
# Get the full state history for a thread
history = list(agent.get_state_history(config))

# Inspect state at any checkpoint
for state in history:
    print(f"Step: {state.metadata.get('step')}, Nodes: {state.metadata.get('source')}")
    print(f"Messages: {len(state.values['messages'])}")

# Resume from a specific checkpoint (time travel)
old_config = history[3].config  # go back to step 3
agent.invoke({"messages": [("user", "Try a different approach")]}, config=old_config)
```

## Cross-Thread Memory with BaseStore

Checkpoints are *per-thread* — each `thread_id` gets its own isolated state history. For knowledge that should persist *across* threads (user preferences, learned facts, long-term summaries), LangGraph provides the `BaseStore` abstraction:

```python
from langgraph.store.memory import InMemoryStore
from langgraph.store.postgres import AsyncPostgresStore
from langgraph.types import RunnableConfig
from langgraph.graph import StateGraph, START, END

# Development: in-memory store
store = InMemoryStore()

# Production: PostgreSQL-backed store
# store = AsyncPostgresStore.from_conn_string("postgresql://...")

agent = graph.compile(checkpointer=memory, store=store)

# In a node, access the store via the RunnableConfig
def personalized_agent(state: AgentState, config: RunnableConfig) -> dict:
    # store is injected via the config's get_store() accessor
    store = config["configurable"].get("__store")
    user_id = config["configurable"]["user_id"]

    # Read user preferences from the cross-thread store
    namespace = ("user_preferences", user_id)
    prefs = store.get(namespace, "preferences")
    user_prefs = prefs.value if prefs else {}

    response = llm.invoke(build_prompt(state["messages"], user_prefs))

    # Write a new preference learned during this conversation
    if learned_preference := extract_preference(response):
        store.put(namespace, "preferences", {**user_prefs, **learned_preference})

    return {"messages": [response]}
```

Store namespaces are tuples of strings — they act like a hierarchical key space. Common patterns:
- `("user_preferences", user_id)` — per-user settings
- `("memories", user_id)` — episodic memory summaries
- `("knowledge", "global")` — shared facts across all users

The distinction between checkpoints and store:
| | Checkpoint | Store |
|---|---|---|
| Scope | Single thread | Cross-thread |
| Content | Full graph state at each step | Arbitrary key-value data |
| Use case | Pause/resume, time-travel | Long-term memory, user profiles |
| Lifecycle | Tied to thread_id | Independent of execution |

## Human-in-the-Loop Patterns

LangGraph supports interrupting graph execution at specific nodes, waiting for human input, and then resuming:

### Interrupt Before/After

```python
from langgraph.types import interrupt

def sensitive_action(state: State) -> dict:
    """An action that requires human approval before executing."""
    action_plan = plan_action(state)

    # Pause execution and surface the plan to the human
    approval = interrupt({"action": action_plan, "question": "Approve this action?"})

    if approval.get("approved"):
        result = execute_action(action_plan)
        return {"messages": [{"role": "assistant", "content": f"Executed: {result}"}]}
    else:
        return {"messages": [{"role": "assistant", "content": "Action cancelled by user."}]}

# Compile with interrupt_before to pause before the node executes
agent = graph.compile(
    checkpointer=memory,
    interrupt_before=["sensitive_action"]
)

# First invocation runs until the interrupt point
result = agent.invoke({"messages": [("user", "Delete all test data")]}, config=config)
# Graph is now paused at "sensitive_action"

# Resume with human input
agent.invoke(Command(resume={"approved": True}), config=config)
```

This pattern is essential for production agent systems where certain actions (database writes, API calls, financial transactions) require human approval. The graph state is persisted at the interrupt point, so the human can take arbitrary time to respond.

### Updating State Externally with `update_state()`

Beyond `interrupt()` + `Command(resume=...)`, LangGraph lets you inject state changes into a paused or completed thread without resuming execution:

```python
# Inspect current state of a paused thread
current_state = agent.get_state(config)
print(current_state.values["messages"])
print(current_state.next)  # which nodes will run next

# Inject an external message into the state (e.g., webhook result)
agent.update_state(
    config,
    {"messages": [{"role": "tool", "content": "Payment confirmed: $47.50", "tool_call_id": "tc_123"}]},
    as_node="tools",  # attribute this update to the "tools" node
)

# Now resume — the graph sees the injected tool result as if the tools node ran
agent.invoke(None, config=config)
```

`update_state()` is used when:
- A human reviewer edits the agent's draft before continuing
- An external system (webhook, queue) delivers an async result the graph was waiting on
- You want to correct a mistake in state without replaying the full history

The `as_node` parameter controls which node's reducers are applied to the update, and determines which node LangGraph considers "next" after the injection.

## Subgraph Composition

Complex workflows benefit from hierarchical organization -- subgraphs encapsulate self-contained behaviors that can be tested independently and composed into larger systems:

```python
# Define a research subgraph
research_graph = StateGraph(ResearchState)
research_graph.add_node("search", search_node)
research_graph.add_node("summarize", summarize_node)
research_graph.add_edge(START, "search")
research_graph.add_edge("search", "summarize")
research_graph.add_edge("summarize", END)
research_subgraph = research_graph.compile()

# Define a writing subgraph
writing_graph = StateGraph(WritingState)
writing_graph.add_node("draft", draft_node)
writing_graph.add_node("edit", edit_node)
writing_graph.add_edge(START, "draft")
writing_graph.add_edge("draft", "edit")
writing_graph.add_edge("edit", END)
writing_subgraph = writing_graph.compile()

# Compose into a parent graph
parent_graph = StateGraph(ParentState)
parent_graph.add_node("research", research_subgraph)
parent_graph.add_node("write", writing_subgraph)
parent_graph.add_node("review", review_node)

parent_graph.add_edge(START, "research")
parent_graph.add_edge("research", "write")
parent_graph.add_edge("write", "review")
parent_graph.add_conditional_edges("review", route_after_review)
parent_graph.add_edge("publish", END)

app = parent_graph.compile()
```

Subgraphs run with their own internal state, but LangGraph handles state mapping between parent and child graphs. This enables:
- **Independent testing**: Each subgraph can be compiled and tested in isolation
- **Team ownership**: Different teams own different subgraphs
- **Reuse**: A research subgraph can be embedded in multiple parent workflows
- **Encapsulation**: Internal implementation can change without affecting the parent graph

## Runtime Configuration

Graphs can be parameterized at runtime using the `configurable` dict in the config. This avoids hardcoding values like model names, system prompts, or feature flags into nodes:

```python
from langchain_core.runnables import RunnableConfig

def call_model(state: AgentState, config: RunnableConfig) -> dict:
    """A node that uses configurable parameters."""
    configurable = config.get("configurable", {})

    # Read runtime parameters with defaults
    model_name = configurable.get("model", "claude-sonnet-4-6")
    system_prompt = configurable.get("system_prompt", "You are a helpful assistant.")
    temperature = configurable.get("temperature", 0.0)

    model = ChatAnthropic(model=model_name, temperature=temperature)
    response = model.invoke([SystemMessage(system_prompt)] + state["messages"])
    return {"messages": [response]}

# Pass configuration at invocation time
result = agent.invoke(
    {"messages": [("user", "Hello")]},
    config={
        "configurable": {
            "thread_id": "user-123",           # checkpointer thread
            "model": "claude-opus-4-6",        # override model
            "system_prompt": "You are a concise assistant.",
        }
    }
)
```

For structured configuration with validation, use `TypedDict` or Pydantic to define the configurable schema and annotate the graph with it:

```python
from typing import TypedDict, Optional

class GraphConfig(TypedDict, total=False):
    model: str
    system_prompt: str
    max_tokens: int
    user_id: str

# The graph's config_schema documents the expected configurable keys
graph = StateGraph(AgentState, config_schema=GraphConfig)
```

## Error Handling in Nodes

LangGraph does not automatically retry failed nodes. If a node raises an exception, the graph execution stops and the exception propagates to the caller. For resilient production graphs, handle errors explicitly:

```python
import traceback

def robust_tool_node(state: AgentState) -> dict:
    """A tool node with error handling."""
    tool_call = state["messages"][-1].tool_calls[0]

    try:
        result = execute_tool(tool_call)
        return {"messages": [ToolMessage(content=str(result), tool_call_id=tool_call["id"])]}
    except TimeoutError:
        return {"messages": [ToolMessage(
            content="Tool timed out. Try with a simpler query.",
            tool_call_id=tool_call["id"],
        )]}
    except Exception as e:
        # Return the error as a tool message so the agent can recover
        return {"messages": [ToolMessage(
            content=f"Tool error: {type(e).__name__}: {str(e)}",
            tool_call_id=tool_call["id"],
        )]}

def agent_node(state: AgentState) -> dict:
    """An agent node that handles LLM errors."""
    try:
        response = llm.invoke(state["messages"])
        return {"messages": [response]}
    except RateLimitError:
        # Back off and signal a retry
        time.sleep(5)
        response = llm.invoke(state["messages"])
        return {"messages": [response]}
```

For transient errors (rate limits, network failures), LangGraph integrates with LangChain's retry logic:

```python
from langchain_anthropic import ChatAnthropic

# Built-in retry with exponential backoff
model = ChatAnthropic(
    model="claude-sonnet-4-6",
    max_retries=3,  # automatic retry on transient errors
)
```

A common pattern for graceful degradation is a fallback node — if the primary node fails, a conditional edge routes to a simpler fallback:

```python
def should_fallback(state: AgentState) -> str:
    last_msg = state["messages"][-1]
    if getattr(last_msg, "error", None):
        return "fallback"
    return "continue"

graph.add_conditional_edges("primary_agent", should_fallback, {
    "fallback": "simple_agent",
    "continue": END,
})
```

## Streaming

LangGraph supports fine-grained streaming for real-time user experiences:

```python
# Stream individual events as the graph executes
async for event in agent.astream_events(
    {"messages": [("user", "Analyze this dataset")]},
    config=config,
    version="v2"
):
    if event["event"] == "on_chat_model_stream":
        # Token-by-token LLM output
        print(event["data"]["chunk"].content, end="", flush=True)
    elif event["event"] == "on_tool_start":
        print(f"\nCalling tool: {event['name']}")
    elif event["event"] == "on_tool_end":
        print(f"Tool result: {event['data']['output'][:100]}")

# Or stream node-level updates
async for chunk in agent.astream(
    {"messages": [("user", "Research and summarize")]},
    config=config,
    stream_mode="updates"
):
    for node_name, update in chunk.items():
        print(f"Node '{node_name}' completed with: {list(update.keys())}")
```

Stream modes:
- `"values"`: Stream the full state after each node
- `"updates"`: Stream only the state updates (deltas) from each node
- `"messages"`: Stream LLM messages token-by-token
- Event-level streaming via `astream_events` for the most granular control

### Async Nodes

For I/O-heavy graphs (LLM calls, tool invocations, database reads), define nodes as async functions to run them concurrently:

```python
import asyncio

async def async_search_node(state: AgentState) -> dict:
    """Async node — doesn't block the event loop during I/O."""
    results = await search_client.asearch(state["query"])
    return {"context": "\n".join(results)}

async def async_llm_node(state: AgentState) -> dict:
    response = await model.ainvoke(state["messages"])
    return {"messages": [response]}

# For parallel I/O within a single node:
async def parallel_fetch_node(state: AgentState) -> dict:
    """Fetch from multiple sources concurrently."""
    results = await asyncio.gather(
        web_search.ainvoke(state["query"]),
        vector_store.asearch(state["query"]),
        knowledge_base.alookup(state["query"]),
    )
    return {"context": "\n\n".join(str(r) for r in results)}

# Use .ainvoke() and .astream() when nodes are async
async def main():
    result = await agent.ainvoke({"messages": [("user", "...")]}, config=config)

    async for chunk in agent.astream(
        {"messages": [("user", "...")]},
        config=config,
        stream_mode="updates",
    ):
        print(chunk)
```

Async and sync nodes can coexist in the same graph — LangGraph handles the execution model internally.

## Common Graph Patterns

### ReAct Agent (Tool Loop)

The most common pattern: an LLM that iteratively calls tools until it can answer.

```
START → [agent] → {has_tool_calls?} → [tools] → [agent] → ... → END
```

See the prebuilt `create_react_agent` above, or build it manually with `ToolNode` and `tools_condition`.

### Corrective RAG (CRAG)

Retrieve, evaluate quality, and re-retrieve if needed:

```
START → [retrieve] → [grade_documents] → {relevant?}
    ├── yes → [generate] → [check_hallucination] → {faithful?}
    │                           ├── yes → END
    │                           └── no  → [generate] (retry)
    └── no  → [rewrite_query] → [web_search] → [generate] → END
```

For full CRAG implementation patterns, see [Advanced RAG](/advanced-rag).

### Multi-Agent Pipeline

Sequential or branching execution across specialized agents:

```
START → [research_agent] → [writer_agent] → [reviewer_agent] → {approved?}
                                     ↑                              |
                                     └──────── no ─────────────────┘
```

For multi-agent patterns including supervisor, debate, and swarm architectures, see [Multi-Agent Systems](/multi-agent-systems).

### Parallel Fan-Out/Fan-In

Process multiple items concurrently and collect results:

```
START → [planner] → Send() → [worker_1] ─┐
                            → [worker_2] ─┤──→ [aggregator] → END
                            → [worker_N] ─┘
```

For a production example of fan-out in adversarial testing, see [Red-Teaming with LangGraph](/langgraph-red-teaming).

## LangGraph Platform

LangGraph Platform provides managed infrastructure for deploying LangGraph applications:

- **LangGraph Server**: A server runtime that hosts compiled graphs as API endpoints with built-in persistence, task queuing, and streaming support
- **LangGraph Studio**: A visual debugger and IDE for inspecting graph execution, viewing state at each node, and replaying executions
- **LangGraph Cloud**: Fully managed hosting on LangChain's infrastructure

```python
# Deploying a graph as an API endpoint
# langgraph.json configuration:
# {
#   "graphs": {
#     "my_agent": "./agent.py:graph"
#   },
#   "dependencies": ["langgraph", "langchain-openai"]
# }

# Client-side: interact with a deployed graph
from langgraph_sdk import get_client

client = get_client(url="http://localhost:8123")

# Create a persistent thread
thread = await client.threads.create()

# Run the graph
run = await client.runs.create(
    thread["thread_id"],
    "my_agent",
    input={"messages": [{"role": "user", "content": "Hello"}]}
)

# Stream results
async for event in client.runs.stream(thread["thread_id"], run["run_id"]):
    print(event)
```

## When to Use LangGraph

LangGraph adds value when your application needs:

| Need | Why LangGraph |
|------|---------------|
| Cycles and loops | Conditional edges naturally express retry/revision loops |
| Persistent state | Built-in checkpointing across conversations |
| Human-in-the-loop | First-class `interrupt()` support with resume |
| Parallel execution | `Send()` primitive for map-reduce patterns |
| Complex control flow | Branching, joining, subgraphs |
| Streaming | Token-level, node-level, and event-level streaming |
| Debugging | Time-travel debugging via checkpoint history |

**When NOT to use LangGraph:**
- Simple, linear chains (use direct function composition)
- One-shot prompt → response (no state management needed)
- Applications where the overhead of graph definition isn't justified
- Teams that prefer minimal abstractions (consider OpenAI Swarm or raw function calls)

## LangGraph vs. Alternatives

| Framework | Best For | Control Flow | State | Learning Curve |
|-----------|----------|-------------|-------|----------------|
| **LangGraph** | Complex stateful agents, production workflows | Graph-based | Explicit TypedDict | Medium-High |
| **OpenAI Swarm** | Simple multi-agent handoffs, prototyping | Function returns | Implicit | Low |
| **CrewAI** | Role-based team composition | Declarative | Managed | Low-Medium |
| **AutoGen 0.4** | Event-driven multi-agent, research | Async events | Event-based | High |
| **LlamaIndex Workflows** | RAG-heavy pipelines | Event-driven | Step-based | Medium |
| **Custom code** | Full control, minimal dependencies | Your choice | Your choice | Varies |

For deeper comparison in the context of agent architectures, see [Agent Architectures](/agent-architectures). For orchestration framework comparisons in production, see [Production Patterns](/production-patterns).

## LangGraph Content Across This Series

LangGraph appears throughout this knowledge base in domain-specific contexts:

- **[Agent Architectures](/agent-architectures)**: LangGraph as a state machine framework, comparison with Swarm and other approaches
- **[Multi-Agent Systems](/multi-agent-systems)**: LangGraph for coordinating multiple specialized agents
- **[Advanced RAG](/advanced-rag)**: LangGraph for corrective and agentic RAG pipelines
- **[Red-Teaming with LangGraph](/langgraph-red-teaming)**: Graph-based adversarial testing with Send() fan-out and DeepTeam integration
- **[LLM-as-Judge](/llm-as-judge)**: DeepEval's LangGraph callback handler for agent evaluation
- **[Production Patterns](/production-patterns)**: LangGraph as orchestration infrastructure
- **[AI Engineer Roadmap](/ai-engineer-roadmap)**: LangGraph in the AI engineer's toolkit

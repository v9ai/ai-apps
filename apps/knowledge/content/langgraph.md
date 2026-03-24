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

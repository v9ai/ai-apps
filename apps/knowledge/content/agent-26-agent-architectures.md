# Agent Architectures: ReAct, Plan-and-Execute & Cognitive Frameworks

The design of agent architectures determines how language models reason, plan, and act in complex environments. From the foundational ReAct framework that interleaves reasoning with action, to sophisticated cognitive architectures that incorporate reflection, search, and hierarchical planning, the field has rapidly evolved beyond simple prompt-response patterns. This article provides a deep technical examination of the major agent architecture paradigms, their theoretical foundations, implementation patterns, and practical tradeoffs observed in production systems.

## Foundations: From Chain-of-Thought to Agents

Before examining specific architectures, it is worth understanding the conceptual progression that led to modern agent designs. Chain-of-Thought prompting (Wei et al., 2022) demonstrated that LLMs could perform multi-step reasoning when prompted to "think step by step." This was a passive capability -- the model reasoned but could not act on its reasoning.

The key insight of agent architectures is closing the loop: the model reasons about what to do, takes an action (typically a tool call), observes the result, and then reasons again. This observe-think-act cycle, borrowed from classical AI agent theory (Russell & Norvig), becomes the foundation for all modern LLM agent designs.

## ReAct: Reasoning + Acting

### The Core Framework

ReAct (Yao et al., 2022, "ReAct: Synergizing Reasoning and Acting in Language Models") introduced a deceptively simple but powerful pattern: interleave reasoning traces (thoughts) with actions and observations in a single prompt sequence.

The format follows:

```
Thought: I need to find the population of Tokyo to answer this question.
Action: search("Tokyo population 2024")
Observation: Tokyo's population is approximately 13.96 million in the city proper...
Thought: Now I have the population. The user also asked about the area, so I need to look that up.
Action: search("Tokyo area square kilometers")
Observation: Tokyo covers 2,194 square kilometers...
Thought: I now have both pieces of information to answer the question.
Action: finish("Tokyo has a population of ~14 million across 2,194 km²")
```

### Why ReAct Works

The power of ReAct comes from the synergy between reasoning and acting. The reasoning traces serve multiple purposes:

1. **Decomposition**: Complex questions are broken into sub-steps
2. **Grounding**: Each thought references specific observations, reducing hallucination
3. **Error recovery**: When an observation is unexpected, the model can reason about what went wrong and try a different approach
4. **Interpretability**: The thought traces provide a human-readable explanation of the agent's decision-making

Yao et al. showed that ReAct outperformed both pure reasoning (Chain-of-Thought without actions) and pure acting (actions without reasoning traces) on knowledge-intensive tasks (HotpotQA, FEVER) and interactive decision-making tasks (ALFWorld, WebShop).

### Implementation Pattern

A minimal ReAct loop in code:

```python
class ReActAgent:
    def __init__(self, llm, tools, max_steps=10):
        self.llm = llm
        self.tools = {t.name: t for t in tools}
        self.max_steps = max_steps

    def run(self, question: str) -> str:
        prompt = self._build_initial_prompt(question)

        for step in range(self.max_steps):
            response = self.llm.generate(prompt)

            # Parse thought and action from response
            thought, action, action_input = self._parse_response(response)
            prompt += f"\nThought: {thought}\nAction: {action}({action_input})"

            if action == "finish":
                return action_input

            # Execute tool and get observation
            tool = self.tools.get(action)
            if tool is None:
                observation = f"Error: Unknown tool '{action}'"
            else:
                observation = tool.execute(action_input)

            prompt += f"\nObservation: {observation}\n"

        return "Max steps exceeded without reaching an answer."
```

### Limitations of ReAct

ReAct's step-by-step nature means it struggles with tasks requiring long-horizon planning. Each thought considers only the immediate next action, without a global plan. This leads to:

- **Myopic behavior**: The agent may pursue dead-end paths without recognizing the need to backtrack
- **Redundant actions**: Without memory of what has already been tried, the agent may repeat failed approaches
- **Context window exhaustion**: Long reasoning chains consume the context window, eventually degrading performance

## Plan-and-Execute Architectures

### The Two-Phase Approach

Plan-and-Execute agents address ReAct's myopia by separating planning from execution into distinct phases:

1. **Planning phase**: The model creates a high-level plan with numbered steps
2. **Execution phase**: Each step is executed, potentially using a ReAct-style sub-agent
3. **Replanning**: After execution results are observed, the plan may be revised

```python
class PlanAndExecuteAgent:
    def __init__(self, planner_llm, executor_llm, tools):
        self.planner = planner_llm
        self.executor = ReActAgent(executor_llm, tools)

    def run(self, task: str) -> str:
        # Phase 1: Create plan
        plan = self.planner.generate(
            f"Create a step-by-step plan to accomplish: {task}\n"
            f"Available tools: {[t.name for t in self.tools]}\n"
            f"Return a numbered list of steps."
        )
        steps = self._parse_plan(plan)

        results = []
        for i, step in enumerate(steps):
            # Phase 2: Execute each step
            context = f"Overall task: {task}\nPrevious results: {results}\nCurrent step: {step}"
            result = self.executor.run(context)
            results.append({"step": step, "result": result})

            # Phase 3: Check if replanning is needed
            if self._should_replan(task, steps[i+1:], results):
                remaining_steps = self._replan(task, results, steps[i+1:])
                steps = steps[:i+1] + remaining_steps

        return self._synthesize_answer(task, results)
```

### Advantages Over ReAct

Plan-and-Execute provides several benefits:

- **Global coherence**: The plan provides a roadmap, preventing the agent from losing track of the overall goal
- **Efficiency**: By planning upfront, the agent avoids redundant exploration
- **Modularity**: The planner and executor can use different models (e.g., a stronger model for planning, a faster one for execution)
- **Observability**: The plan itself is a useful artifact for debugging and user communication

### The Replanning Problem

The most challenging aspect of Plan-and-Execute is knowing when and how to replan. Too much replanning degenerates into step-by-step execution (essentially ReAct). Too little means the agent stubbornly follows a plan that has become invalid.

Effective replanning heuristics include:

- **Failure detection**: Replan when a step fails and the failure affects subsequent steps
- **Information gain**: Replan when execution reveals information that materially changes the approach
- **Plan validation**: After each step, ask the planner whether the remaining steps are still valid

## Reflexion: Learning from Mistakes

### Self-Reflection as a Learning Mechanism

Reflexion (Shinn et al., 2023, "Reflexion: Language Agents with Verbal Reinforcement Learning") introduces a meta-cognitive layer: after completing a task (successfully or not), the agent generates a natural language reflection on what went well and what went wrong. These reflections are stored and provided as context in subsequent attempts.

```python
class ReflexionAgent:
    def __init__(self, actor, evaluator, reflector, memory):
        self.actor = actor          # The agent that attempts the task
        self.evaluator = evaluator  # Determines success/failure
        self.reflector = reflector  # Generates reflections
        self.memory = memory        # Stores reflections

    def run(self, task: str, max_trials: int = 3) -> str:
        for trial in range(max_trials):
            # Retrieve relevant past reflections
            reflections = self.memory.retrieve(task)

            # Attempt the task with reflection context
            trajectory = self.actor.run(task, reflections=reflections)

            # Evaluate the result
            success, feedback = self.evaluator.evaluate(task, trajectory)

            if success:
                return trajectory.final_answer

            # Generate and store reflection
            reflection = self.reflector.generate(
                f"Task: {task}\n"
                f"Attempt: {trajectory}\n"
                f"Feedback: {feedback}\n"
                f"What went wrong and what should be done differently?"
            )
            self.memory.store(task, reflection)

        return trajectory.final_answer  # Return best attempt
```

### The Power of Verbal Reinforcement

Reflexion is notable because it achieves learning without gradient updates. The "reinforcement" is entirely verbal -- stored as natural language reflections that modify the agent's behavior through in-context learning. Shinn et al. demonstrated significant improvements on coding tasks (HumanEval: 67.0% to 91.0%), decision-making (ALFWorld), and reasoning tasks through iterative reflection.

This approach is particularly valuable in production systems where fine-tuning is impractical. The reflection memory acts as a lightweight, interpretable form of experience that can be inspected, edited, and shared across agent instances.

## Language Agent Tree Search (LATS)

### Search Meets Language Agents

LATS (Zhou et al., 2023) combines the LLM agent paradigm with Monte Carlo Tree Search (MCTS), treating agent trajectories as a tree to be explored systematically rather than a single path.

The key insight is that agent decision-making at each step can be viewed as a search problem: multiple possible actions exist, and the agent should explore promising branches while being willing to backtrack from unpromising ones.

```
                    [Initial State]
                   /       |        \
            [Action A]  [Action B]  [Action C]
            /    \         |          |
      [A→D]  [A→E]    [B→F]      [C→G]
        ↓       ↓        ↓          ↓
     Score:   Score:   Score:     Score:
      0.3      0.7      0.5       0.8  ← Expand C→G further
```

The algorithm:

1. **Selection**: Use UCB1 (Upper Confidence Bound) to select which node to expand
2. **Expansion**: Generate multiple possible next actions from the selected node
3. **Simulation**: Use the LLM to estimate the value of the resulting state
4. **Backpropagation**: Update value estimates up the tree

This approach is computationally expensive (many LLM calls per decision) but excels on tasks where exploration is critical, such as complex reasoning problems and multi-step planning.

## LangGraph and State Machine Architectures

### Graphs as Agent Control Flow

LangGraph (part of the LangChain ecosystem) represents agent logic as a directed graph where nodes are computation steps and edges are transitions. This addresses a fundamental limitation of linear agent loops: real-world agent workflows often involve branching, parallel execution, cycles, and conditional logic that don't fit neatly into a sequential framework.

```python
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
    messages: list
    plan: list[str]
    current_step: int
    results: dict

def planner(state: AgentState) -> AgentState:
    """Generate or update the plan."""
    plan = llm.invoke("Create a plan for: " + state["messages"][-1])
    return {"plan": parse_steps(plan), "current_step": 0}

def executor(state: AgentState) -> AgentState:
    """Execute the current step."""
    step = state["plan"][state["current_step"]]
    result = execute_step(step, state["results"])
    return {
        "results": {**state["results"], step: result},
        "current_step": state["current_step"] + 1
    }

def should_continue(state: AgentState) -> str:
    if state["current_step"] >= len(state["plan"]):
        return "synthesize"
    if needs_replanning(state):
        return "planner"
    return "executor"

# Build the graph
graph = StateGraph(AgentState)
graph.add_node("planner", planner)
graph.add_node("executor", executor)
graph.add_node("synthesize", synthesize_answer)

graph.add_edge("planner", "executor")
graph.add_conditional_edges("executor", should_continue)
graph.add_edge("synthesize", END)

agent = graph.compile()
```

### Advantages of Graph-Based Control Flow

1. **Explicit state management**: The `AgentState` is a well-defined data structure, making it easy to persist, resume, and debug
2. **Checkpointing**: State can be saved at any node, enabling pause/resume, human-in-the-loop patterns, and time-travel debugging
3. **Streaming**: Intermediate results can be streamed to the user as the graph executes
4. **Subgraphs**: Complex behaviors can be encapsulated in subgraphs, enabling composition and reuse
5. **Parallel branches**: The graph can fork into parallel branches and join results

### State Machine Patterns for Agent Control

Beyond LangGraph, the state machine pattern is broadly applicable. Key states in a robust agent system:

```
[IDLE] → [PLANNING] → [EXECUTING] → [OBSERVING] → [DECIDING]
                ↑                                       |
                |          [REFLECTING] ←——————————————+
                |               |
                +———————————————+
                |
           [RESPONDING] → [IDLE]
```

Each state has clear entry/exit conditions, valid transitions, and error handling. This formalism prevents agents from entering undefined states and makes the system easier to reason about.

## Cognitive Architecture Patterns

### AutoGPT and Autonomous Agent Patterns

AutoGPT (Significant Gravitas, 2023) popularized the concept of fully autonomous agents that can set their own goals, create tasks, and execute them without human intervention. While the original implementation had significant reliability issues, the architectural pattern influenced subsequent work:

1. **Goal decomposition**: Break a high-level goal into a task list
2. **Task prioritization**: Order tasks by importance and dependencies
3. **Execution loop**: Execute the highest-priority task, observe results, update the task list
4. **Memory**: Store findings in long-term memory for later retrieval

The primary lesson from AutoGPT was negative: fully autonomous agents without proper guardrails tend to loop, waste resources, and produce unreliable results. Modern systems incorporate more structure, human oversight, and bounded autonomy.

### BabyAGI's Task Management Pattern

BabyAGI introduced a cleaner version of the autonomous agent pattern focused on task management:

```python
class TaskManager:
    def __init__(self, llm):
        self.task_queue = PriorityQueue()
        self.completed_tasks = []
        self.llm = llm

    def create_tasks(self, objective, last_result):
        new_tasks = self.llm.generate(
            f"Objective: {objective}\n"
            f"Last completed task result: {last_result}\n"
            f"Existing tasks: {self.task_queue.items}\n"
            f"Create new tasks if needed."
        )
        for task in parse_tasks(new_tasks):
            self.task_queue.add(task)

    def prioritize(self, objective):
        reprioritized = self.llm.generate(
            f"Reprioritize these tasks for objective '{objective}':\n"
            f"{self.task_queue.items}"
        )
        self.task_queue = parse_prioritized_queue(reprioritized)
```

### Generative Agents and Simulation

Park et al. (2023, "Generative Agents: Interactive Simulacra of Human Behavior") demonstrated a cognitive architecture for simulating believable human behavior. Their architecture includes:

- **Memory stream**: A comprehensive record of the agent's experiences
- **Retrieval**: Selecting relevant memories based on recency, importance, and relevance
- **Reflection**: Periodically synthesizing high-level observations from recent memories
- **Planning**: Creating daily plans that can be revised based on observations

While designed for simulation, this architecture has influenced practical agent design, particularly the memory and reflection components.

## Comparing Architectures: When to Use What

| Architecture | Best For | Complexity | Reliability | Cost |
|---|---|---|---|---|
| ReAct | Simple tool-use tasks, Q&A | Low | Medium | Low |
| Plan-and-Execute | Multi-step workflows | Medium | Medium-High | Medium |
| Reflexion | Tasks where learning from failure matters | Medium | High | Medium-High |
| LATS | Complex reasoning, exploration-heavy tasks | High | High | Very High |
| LangGraph/State Machine | Production systems, complex workflows | Medium-High | High | Varies |
| Autonomous (AutoGPT-style) | Open-ended exploration | High | Low | Very High |

### Decision Framework

Choose your architecture based on:

1. **Task complexity**: Simple retrieval tasks need only ReAct. Multi-step tasks with dependencies need Plan-and-Execute.
2. **Reliability requirements**: Production systems benefit from state machine formalism. Research/exploration tolerates lower reliability.
3. **Cost budget**: LATS and autonomous agents make many LLM calls. ReAct is the most economical.
4. **Latency requirements**: ReAct and Plan-and-Execute can be streamed. LATS requires completing the search before producing a result.
5. **Need for learning**: If the agent will face similar tasks repeatedly, Reflexion's learning capability adds significant value.

## Implementation Considerations

### Prompt Engineering for Agents

Each architecture requires carefully designed prompts. Key principles:

- **Role definition**: Clearly define the agent's capabilities and limitations
- **Tool descriptions**: Precise, example-rich descriptions of available tools
- **Output format**: Structured output formats (e.g., `Thought:`, `Action:`, `Plan:`) that the parser can reliably extract
- **Error recovery instructions**: Explicit guidance on what to do when actions fail

### Streaming and User Experience

Agents can take many seconds or minutes to complete. Streaming intermediate results is essential for user experience:

```python
async def stream_agent_execution(agent, task):
    async for event in agent.astream_events(task):
        if event["type"] == "thought":
            yield f"Thinking: {event['content']}\n"
        elif event["type"] == "tool_call":
            yield f"Using tool: {event['tool_name']}\n"
        elif event["type"] == "tool_result":
            yield f"Got result from {event['tool_name']}\n"
        elif event["type"] == "final_answer":
            yield f"\nAnswer: {event['content']}\n"
```

## Summary and Key Takeaways

- **ReAct** remains the foundational agent pattern: interleave reasoning with action. It is simple, interpretable, and effective for straightforward tasks. Its limitation is myopic, step-by-step decision-making.
- **Plan-and-Execute** adds global coherence by separating planning from execution. The challenge lies in knowing when to replan.
- **Reflexion** introduces learning without gradient updates, using verbal self-reflection to improve performance across trials. It is particularly valuable for iterative tasks.
- **LATS** applies tree search to agent decision-making, excelling on complex reasoning tasks at the cost of many LLM invocations.
- **State machine / graph architectures** (LangGraph) provide the engineering rigor needed for production systems: explicit state, checkpointing, error handling, and composability.
- **No single architecture dominates.** The best choice depends on the task, reliability requirements, cost constraints, and whether the agent needs to learn from experience. In practice, production systems often combine elements from multiple architectures.
- **The trend is toward more structured, controllable architectures** rather than fully autonomous agents. The lessons from AutoGPT-style systems have pushed the field toward bounded autonomy with human oversight.

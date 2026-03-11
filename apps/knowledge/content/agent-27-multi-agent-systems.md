# Multi-Agent Systems: Orchestration, Delegation & Communication

Multi-agent systems represent a paradigm shift in how we build AI applications: rather than relying on a single monolithic model to handle every aspect of a complex task, work is distributed across specialized agents that collaborate, debate, and coordinate to produce results no single agent could achieve alone. This article examines the architectural patterns, communication protocols, orchestration strategies, and practical frameworks (CrewAI, AutoGen, LangGraph) that define the multi-agent landscape, drawing on both academic research and production experience.

## Why Multiple Agents?

The motivation for multi-agent systems rests on several observations:

**Specialization improves performance.** A single prompt trying to simultaneously handle research, analysis, writing, and code generation often produces mediocre results across all dimensions. Separate agents with focused system prompts, tool sets, and even different underlying models can excel in their respective domains.

**Complex tasks have natural decomposition.** A software engineering task naturally divides into planning, implementation, testing, and review. A research task involves search, analysis, synthesis, and writing. Multi-agent systems mirror these natural divisions.

**Debate and verification improve reliability.** When one agent generates content and another critiques it, the system catches errors that a single agent would miss. This adversarial dynamic, studied extensively in multi-agent debate literature (Du et al., 2023, "Improving Factuality and Reasoning in Language Models through Multiagent Debate"), consistently improves factual accuracy and reasoning quality.

**Scalability.** Multi-agent systems can parallelize work, with different agents handling independent subtasks concurrently.

## Conversation Patterns

Multi-agent communication follows several fundamental patterns, each suited to different types of tasks.

### Sequential Pipeline

The simplest pattern: agents process the task in a fixed sequence, each building on the previous agent's output.

```
[Researcher] → [Analyst] → [Writer] → [Editor] → Final Output
```

```python
class SequentialPipeline:
    def __init__(self, agents: list):
        self.agents = agents

    async def run(self, task: str) -> str:
        result = task
        for agent in self.agents:
            result = await agent.process(result)
        return result

pipeline = SequentialPipeline([
    ResearchAgent(tools=[web_search, arxiv_search]),
    AnalysisAgent(system_prompt="Analyze research findings..."),
    WriterAgent(system_prompt="Write a clear report..."),
    EditorAgent(system_prompt="Edit for clarity and accuracy...")
])
```

**Strengths**: Simple, predictable, easy to debug. Each agent has a clear input/output contract.

**Weaknesses**: No feedback loops. If the editor finds a factual error, it cannot send the work back to the researcher. Information flows only forward.

### Hierarchical Delegation

An orchestrator agent decomposes the task and delegates subtasks to specialized worker agents:

```
              [Orchestrator]
             /    |    \     \
    [Research] [Code] [Test] [Docs]
        |        |      |       |
    [Results] [Code] [Report] [Docs]
              \    |    /      /
              [Orchestrator]
                   |
              [Final Output]
```

```python
class OrchestratorAgent:
    def __init__(self, planner_llm, worker_agents: dict):
        self.planner = planner_llm
        self.workers = worker_agents

    async def run(self, task: str) -> str:
        # Decompose task into subtasks
        plan = await self.planner.generate(
            f"Decompose this task into subtasks for these agents: "
            f"{list(self.workers.keys())}\n\nTask: {task}"
        )
        subtasks = parse_plan(plan)

        # Execute subtasks (parallelize independent ones)
        results = {}
        for batch in topological_sort(subtasks):
            batch_results = await asyncio.gather(*[
                self.workers[st.agent].process(st.description, context=results)
                for st in batch
            ])
            for st, result in zip(batch, batch_results):
                results[st.id] = result

        # Synthesize results
        return await self.planner.generate(
            f"Synthesize these results into a final answer:\n{results}"
        )
```

**Strengths**: Flexible, supports parallelism, naturally handles tasks with complex dependency structures.

**Weaknesses**: The orchestrator is a single point of failure. Its ability to decompose tasks and delegate effectively is crucial.

### Debate and Adversarial Patterns

Multiple agents argue different positions, with a judge agent synthesizing the best answer:

```python
class DebateSystem:
    def __init__(self, debaters: list, judge, num_rounds: int = 3):
        self.debaters = debaters
        self.judge = judge
        self.num_rounds = num_rounds

    async def run(self, question: str) -> str:
        # Initial positions
        positions = []
        for debater in self.debaters:
            pos = await debater.generate(
                f"Answer this question with your best reasoning: {question}"
            )
            positions.append(pos)

        # Debate rounds
        for round in range(self.num_rounds):
            new_positions = []
            for i, debater in enumerate(self.debaters):
                other_positions = [p for j, p in enumerate(positions) if j != i]
                new_pos = await debater.generate(
                    f"Question: {question}\n"
                    f"Your position: {positions[i]}\n"
                    f"Other positions: {other_positions}\n"
                    f"Revise your answer considering these other perspectives."
                )
                new_positions.append(new_pos)
            positions = new_positions

        # Judge synthesizes
        return await self.judge.generate(
            f"Question: {question}\n"
            f"Final positions from {len(positions)} agents:\n"
            + "\n---\n".join(positions) +
            f"\nSynthesize the best answer."
        )
```

Du et al. (2023) demonstrated that multi-agent debate significantly improves mathematical reasoning and factual accuracy. The mechanism is straightforward: when agents see contradictory positions, they are forced to re-examine their reasoning and correct errors.

### Roundtable Discussion

A more flexible variant where agents take turns in a group conversation, building on each other's contributions:

```python
class RoundtableDiscussion:
    def __init__(self, agents: list, moderator, max_turns: int = 10):
        self.agents = agents
        self.moderator = moderator
        self.max_turns = max_turns

    async def run(self, topic: str) -> str:
        transcript = [{"role": "moderator", "content": f"Topic: {topic}"}]

        for turn in range(self.max_turns):
            # Moderator selects next speaker
            next_speaker = await self.moderator.select_speaker(
                transcript, self.agents
            )

            # Agent contributes
            contribution = await next_speaker.generate(
                self._format_transcript(transcript, next_speaker)
            )
            transcript.append({
                "role": next_speaker.name,
                "content": contribution
            })

            # Check if discussion should conclude
            if await self.moderator.should_conclude(transcript):
                break

        return await self.moderator.summarize(transcript)
```

## Frameworks in Depth

### CrewAI

CrewAI models multi-agent systems using the metaphor of a crew with defined roles and processes:

```python
from crewai import Agent, Task, Crew, Process

researcher = Agent(
    role="Senior Research Analyst",
    goal="Uncover cutting-edge developments in AI",
    backstory="You are an expert AI researcher with deep knowledge of the field.",
    tools=[web_search, arxiv_tool],
    llm="gpt-4o"
)

writer = Agent(
    role="Tech Content Writer",
    goal="Write engaging technical content",
    backstory="You specialize in making complex AI concepts accessible.",
    llm="claude-sonnet-4-20250514"
)

research_task = Task(
    description="Research the latest developments in LLM agents",
    expected_output="A comprehensive research brief with key findings",
    agent=researcher
)

writing_task = Task(
    description="Write an article based on the research brief",
    expected_output="A polished 1500-word article",
    agent=writer,
    context=[research_task]  # This task depends on the research task
)

crew = Crew(
    agents=[researcher, writer],
    tasks=[research_task, writing_task],
    process=Process.sequential  # or Process.hierarchical
)

result = crew.kickoff()
```

CrewAI's key design decisions:

- **Role-based agent definition**: The `role`, `goal`, and `backstory` fields shape the agent's behavior through system prompts
- **Task dependency graph**: The `context` parameter creates explicit data flow between tasks
- **Process types**: Sequential (fixed order) or hierarchical (manager agent delegates)
- **Inter-agent delegation**: Agents can delegate to each other when `allow_delegation=True`

### AutoGen (Microsoft)

AutoGen takes a different approach, modeling multi-agent interactions as conversations between `ConversableAgent` instances:

```python
from autogen import ConversableAgent, GroupChat, GroupChatManager

coder = ConversableAgent(
    name="Coder",
    system_message="You are a Python developer. Write clean, tested code.",
    llm_config={"model": "gpt-4o"}
)

reviewer = ConversableAgent(
    name="Reviewer",
    system_message="You review code for bugs, security issues, and best practices.",
    llm_config={"model": "gpt-4o"}
)

executor = ConversableAgent(
    name="Executor",
    system_message="You execute Python code and report results.",
    code_execution_config={"work_dir": "workspace"},
    human_input_mode="NEVER"
)

group_chat = GroupChat(
    agents=[coder, reviewer, executor],
    messages=[],
    max_round=12,
    speaker_selection_method="auto"  # LLM selects next speaker
)

manager = GroupChatManager(groupchat=group_chat)
coder.initiate_chat(manager, message="Write a web scraper for HN front page")
```

AutoGen's distinctive features:

- **Conversation-centric**: Everything is modeled as message passing between agents
- **Flexible speaker selection**: Can be automatic (LLM-driven), round-robin, or custom
- **Built-in code execution**: The `code_execution_config` enables agents to run code directly
- **Human-in-the-loop**: `human_input_mode` controls when human input is requested
- **Nested chats**: Agents can spawn sub-conversations to handle complex subtasks

### LangGraph for Multi-Agent Systems

LangGraph models multi-agent systems as state machines with explicit control flow:

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Literal

class MultiAgentState(TypedDict):
    task: str
    research: str
    draft: str
    review: str
    final: str
    iteration: int

def research_node(state):
    result = research_agent.invoke(state["task"])
    return {"research": result}

def draft_node(state):
    result = writer_agent.invoke(
        f"Task: {state['task']}\nResearch: {state['research']}"
    )
    return {"draft": result}

def review_node(state):
    result = reviewer_agent.invoke(state["draft"])
    return {"review": result, "iteration": state["iteration"] + 1}

def route_after_review(state) -> Literal["draft", "final"]:
    if "APPROVED" in state["review"]:
        return "final"
    if state["iteration"] >= 3:
        return "final"
    return "draft"

graph = StateGraph(MultiAgentState)
graph.add_node("research", research_node)
graph.add_node("draft", draft_node)
graph.add_node("review", review_node)
graph.add_node("final", lambda s: {"final": s["draft"]})

graph.set_entry_point("research")
graph.add_edge("research", "draft")
graph.add_edge("draft", "review")
graph.add_conditional_edges("review", route_after_review)
graph.add_edge("final", END)

app = graph.compile()
```

LangGraph's advantages for multi-agent systems:

- **Explicit control flow**: No ambiguity about which agent acts when
- **Checkpointing and persistence**: State can be saved and resumed
- **Cycles with bounded iteration**: The review-revision loop has a clear termination condition
- **Subgraphs**: Each agent can internally be a subgraph with its own state machine

## Agent Role Specialization

Effective multi-agent systems require careful role design. Several principles emerge from practice:

### Principle of Minimal Authority

Each agent should have access only to the tools and information it needs. A research agent does not need database write access. A code reviewer does not need code execution capability.

```python
research_agent = Agent(
    tools=[web_search, document_reader],  # Read-only tools
    system_prompt="You research topics. You CANNOT modify data."
)

database_agent = Agent(
    tools=[sql_query, sql_insert],  # Database tools only
    system_prompt="You manage database operations. Validate all inputs."
)
```

### Clear Handoff Protocols

Agents need clear signals for when to hand off work and what information to include:

```python
class HandoffProtocol:
    @staticmethod
    def create_handoff(from_agent: str, to_agent: str,
                       task: str, context: dict, constraints: list) -> dict:
        return {
            "from": from_agent,
            "to": to_agent,
            "task": task,
            "context": context,
            "constraints": constraints,
            "timestamp": datetime.now().isoformat()
        }
```

### Complementary Capabilities

Agents should have complementary rather than overlapping capabilities. Overlap leads to ambiguity about which agent should handle a subtask and can cause coordination overhead.

## Inter-Agent Communication Protocols

### Structured Message Passing

Rather than free-form text, structured messages reduce ambiguity:

```python
@dataclass
class AgentMessage:
    sender: str
    recipient: str
    message_type: Literal["request", "response", "question", "feedback"]
    content: str
    metadata: dict
    references: list[str]  # IDs of messages this responds to

    def to_prompt_format(self) -> str:
        return (
            f"[{self.message_type.upper()} from {self.sender}]\n"
            f"{self.content}\n"
            f"[END MESSAGE]"
        )
```

### Shared Blackboard Pattern

A shared workspace where agents read from and write to a common knowledge base:

```python
class Blackboard:
    def __init__(self):
        self.entries = {}
        self.lock = asyncio.Lock()

    async def write(self, agent_id: str, key: str, value: any):
        async with self.lock:
            self.entries[key] = {
                "value": value,
                "author": agent_id,
                "timestamp": time.time()
            }

    async def read(self, key: str) -> any:
        return self.entries.get(key, {}).get("value")

    async def get_recent_entries(self, n: int = 10) -> list:
        sorted_entries = sorted(
            self.entries.items(),
            key=lambda x: x[1]["timestamp"],
            reverse=True
        )
        return sorted_entries[:n]
```

The blackboard pattern is particularly useful when agents need to share intermediate results without direct message passing, such as when a research agent discovers information that multiple other agents need.

### Event-Driven Communication

For systems where agents need to react to changes rather than being explicitly invoked:

```python
class EventBus:
    def __init__(self):
        self.subscribers = defaultdict(list)

    def subscribe(self, event_type: str, agent, handler):
        self.subscribers[event_type].append((agent, handler))

    async def publish(self, event_type: str, data: dict):
        for agent, handler in self.subscribers[event_type]:
            await handler(agent, data)

# Usage
bus = EventBus()
bus.subscribe("code_written", reviewer_agent, review_handler)
bus.subscribe("code_written", test_agent, test_handler)
bus.subscribe("review_complete", coder_agent, revision_handler)
```

## Consensus Mechanisms

When multiple agents need to agree on a decision, consensus mechanisms prevent deadlocks and ensure convergence:

### Majority Voting

The simplest approach: each agent votes, and the majority wins.

```python
async def majority_vote(agents, question, options):
    votes = await asyncio.gather(*[
        agent.vote(question, options) for agent in agents
    ])
    vote_counts = Counter(votes)
    winner = vote_counts.most_common(1)[0]
    return winner[0], winner[1] / len(votes)  # choice, confidence
```

### Weighted Voting

Agents with more expertise in the domain get more weight:

```python
async def weighted_vote(agents, question, options, weights):
    votes = await asyncio.gather(*[
        agent.vote(question, options) for agent in agents
    ])
    weighted_counts = defaultdict(float)
    for vote, weight in zip(votes, weights):
        weighted_counts[vote] += weight
    return max(weighted_counts, key=weighted_counts.get)
```

### Convergence-Based Consensus

Agents discuss until their positions converge:

```python
async def convergence_consensus(agents, question, max_rounds=5, threshold=0.8):
    positions = [await a.generate_position(question) for a in agents]

    for round in range(max_rounds):
        # Each agent sees all positions and revises
        new_positions = []
        for i, agent in enumerate(agents):
            revised = await agent.revise_position(
                question, positions[i], positions
            )
            new_positions.append(revised)

        # Check convergence using embedding similarity
        similarities = compute_pairwise_similarity(new_positions)
        if min(similarities) >= threshold:
            return synthesize(new_positions)

        positions = new_positions

    return synthesize(positions)  # Best effort after max rounds
```

## Scaling Multi-Agent Systems

### Cost Management

Multi-agent systems multiply LLM costs. Each agent invocation is at minimum one API call, and complex workflows can involve dozens:

```python
class CostAwareOrchestrator:
    def __init__(self, budget: float):
        self.budget = budget
        self.spent = 0.0

    async def invoke_agent(self, agent, task):
        estimated_cost = agent.estimate_cost(task)
        if self.spent + estimated_cost > self.budget:
            # Fall back to cheaper agent or skip
            return await self.fallback_agent.process(task)

        result = await agent.process(task)
        self.spent += result.actual_cost
        return result
```

### Dynamic Agent Spawning

For tasks of variable complexity, spawn agents on demand rather than maintaining a fixed roster:

```python
class DynamicOrchestrator:
    def __init__(self, agent_factory):
        self.factory = agent_factory
        self.active_agents = {}

    async def handle_subtask(self, subtask):
        required_capability = self.classify_subtask(subtask)

        if required_capability not in self.active_agents:
            self.active_agents[required_capability] = \
                self.factory.create(required_capability)

        return await self.active_agents[required_capability].process(subtask)
```

### Failure Isolation

When one agent fails, the system should degrade gracefully:

```python
async def resilient_execute(agent, task, fallback_agent=None, timeout=30):
    try:
        return await asyncio.wait_for(agent.process(task), timeout=timeout)
    except asyncio.TimeoutError:
        logger.warning(f"Agent {agent.name} timed out on task")
        if fallback_agent:
            return await fallback_agent.process(task)
        return {"error": "timeout", "partial_result": None}
    except Exception as e:
        logger.error(f"Agent {agent.name} failed: {e}")
        if fallback_agent:
            return await fallback_agent.process(task)
        return {"error": str(e)}
```

## Summary and Key Takeaways

- **Multi-agent systems decompose complex tasks** across specialized agents, improving both quality and enabling parallelism. The key is clear role definition with minimal overlap.
- **Four fundamental communication patterns** cover most use cases: sequential pipeline, hierarchical delegation, adversarial debate, and roundtable discussion. Choose based on task structure and reliability requirements.
- **Frameworks like CrewAI, AutoGen, and LangGraph** each take a different modeling approach -- roles/tasks, conversations, and state machines respectively. LangGraph provides the most engineering control; CrewAI offers the simplest mental model; AutoGen excels at conversational dynamics.
- **Multi-agent debate** (Du et al., 2023) demonstrably improves factual accuracy and reasoning. Consider it for any task where correctness matters.
- **Consensus mechanisms** prevent deadlocks and ensure agents converge. Simple majority voting works surprisingly well; convergence-based approaches work better for nuanced decisions.
- **Cost and latency scale multiplicatively** with agent count. Manage costs through budget caps, dynamic agent spawning, and tiered model selection. Use cheaper models for simpler sub-tasks.
- **Failure isolation is essential.** Design each agent interaction with timeouts, fallbacks, and partial result handling. A single failing agent should not bring down the entire system.
- **The trend is toward more structured multi-agent architectures** with explicit coordination protocols rather than fully autonomous agent swarms. Production systems need predictability and observability that emergent multi-agent behaviors cannot guarantee.

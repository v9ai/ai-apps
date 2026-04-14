export interface LangGraphCourse {
  id: string;
  title: string;
  url: string;
  instructor: string;
  headline: string;
  rating: number;
  reviewCount: number;
  numStudents: number;
  level: string;
  durationHours: number;
  lastUpdated: string;
}

export interface LangGraphConcept {
  id: string;
  name: string;
  icon: string;
  description: string;
  details: string[];
}

export interface LangGraphStep {
  num: number;
  title: string;
  description: string;
}

export const concepts: LangGraphConcept[] = [
  {
    id: "state-graph",
    name: "StateGraph",
    icon: "\u{1f9e9}",
    description:
      "The core abstraction. A typed state object flows through every node in the graph, accumulating information as it moves.",
    details: [
      "Define state as a TypedDict or Pydantic model",
      "Reducers control how node outputs merge into state",
      "State is the single source of truth for the entire workflow",
    ],
  },
  {
    id: "nodes",
    name: "Nodes",
    icon: "\u{2699}\u{fe0f}",
    description:
      "Python functions that receive the current state, perform work (LLM calls, tool use, computation), and return state updates.",
    details: [
      "Each node is a regular Python function",
      "Nodes can call LLMs, APIs, databases, or other tools",
      "Return a dict of state keys to update",
    ],
  },
  {
    id: "edges",
    name: "Edges",
    icon: "\u{27a1}\u{fe0f}",
    description:
      "Connections between nodes that define the execution flow. Normal edges always route to one target; conditional edges branch dynamically.",
    details: [
      "Normal edges: deterministic A \u2192 B routing",
      "Conditional edges: runtime branching based on state",
      "START and END are special sentinel nodes",
    ],
  },
  {
    id: "conditional-routing",
    name: "Conditional Routing",
    icon: "\u{1f500}",
    description:
      "Branching logic that inspects state and decides which node to execute next \u2014 the mechanism that enables agentic decision-making.",
    details: [
      "Router functions return the name of the next node",
      "Enables cycles: agents can loop until a condition is met",
      "Supports fan-out to multiple parallel branches",
    ],
  },
  {
    id: "checkpointing",
    name: "Checkpointing",
    icon: "\u{1f4be}",
    description:
      "Automatic persistence of graph state after every node execution. Enables time-travel debugging, replay, and fault tolerance.",
    details: [
      "Built-in memory, SQLite, and Postgres checkpointers",
      "Resume interrupted graphs from any checkpoint",
      "Thread-based isolation for concurrent conversations",
    ],
  },
  {
    id: "human-in-the-loop",
    name: "Human-in-the-Loop",
    icon: "\u{1f9d1}\u200d\u{1f4bb}",
    description:
      "Interrupt the graph at designated breakpoints so humans can inspect, approve, edit, or reject state before the graph continues.",
    details: [
      "interrupt_before / interrupt_after on any node",
      "Human can modify state before resuming",
      "Critical for high-stakes decisions (approvals, reviews)",
    ],
  },
  {
    id: "subgraphs",
    name: "Subgraphs",
    icon: "\u{1f4e6}",
    description:
      "Nested graphs that encapsulate a sub-workflow. Compose complex agents from smaller, testable, reusable graph modules.",
    details: [
      "Each subgraph has its own state schema",
      "Parent passes data in, subgraph returns results",
      "Enables team-of-experts and modular architectures",
    ],
  },
  {
    id: "multi-agent",
    name: "Multi-Agent Patterns",
    icon: "\u{1f916}",
    description:
      "Orchestration patterns for multiple specialized agents: supervisor delegates, teams collaborate, hierarchies scale.",
    details: [
      "Supervisor pattern: one agent routes to specialists",
      "Swarm: agents hand off to each other dynamically",
      "Hierarchical: nested supervisors manage sub-teams",
    ],
  },
];

export const steps: LangGraphStep[] = [
  {
    num: 1,
    title: "Define your State",
    description:
      "Create a TypedDict or Pydantic model that represents all the information your agent needs to track \u2014 messages, intermediate results, tool outputs, decisions.",
  },
  {
    num: 2,
    title: "Create Nodes",
    description:
      "Write Python functions for each step of your workflow. Each node receives the current state, does its work (call an LLM, query a database, run a tool), and returns updates.",
  },
  {
    num: 3,
    title: "Connect with Edges",
    description:
      "Wire nodes together using normal edges for fixed routes and conditional edges for dynamic branching. Add cycles to let agents iterate until they reach a satisfactory result.",
  },
  {
    num: 4,
    title: "Compile the Graph",
    description:
      "Call graph.compile() with an optional checkpointer for persistence. LangGraph validates the graph structure and prepares it for execution.",
  },
  {
    num: 5,
    title: "Invoke with Input",
    description:
      "Pass an initial state to graph.invoke() or stream results with graph.stream(). The graph executes nodes in order, routing through edges until it reaches END.",
  },
];

export const courses: LangGraphCourse[] = [
  {
    id: "complete-langchain-langgraph-langsmith",
    title: "The Complete LangChain, LangGraph, & LangSmith Course (2026)",
    url: "https://www.udemy.com/course/the-complete-langchain-langgraph-langsmith-course/",
    instructor: "Fikayo Adepoju",
    headline:
      "Modularize with LangChain, Build Agents with LangGraph, and Monitor with LangSmith",
    rating: 4.67,
    reviewCount: 44,
    numStudents: 373,
    level: "Beginner",
    durationHours: 29.5,
    lastUpdated: "2026-02",
  },
  {
    id: "ai-agents-langgraph",
    title: "AI Agents: Develop Autonomous AI Agents with LangGraph",
    url: "https://www.udemy.com/course/ai-agents/",
    instructor: "Paulo Dichone",
    headline:
      "Develop High-Performance, Autonomous, AI Agents, Using LangChain, LangGraph (Python)",
    rating: 4.67,
    reviewCount: 418,
    numStudents: 3719,
    level: "All Levels",
    durationHours: 3.0,
    lastUpdated: "2025-02",
  },
  {
    id: "ultimate-rag-bootcamp",
    title: "Ultimate RAG Bootcamp Using LangChain, LangGraph & LangSmith",
    url: "https://www.udemy.com/course/ultimate-rag-bootcamp-using-langchainlanggraph-langsmith/",
    instructor: "Krish Naik",
    headline:
      "Build powerful RAG pipelines: Traditional, Advanced, Multimodal & Agentic AI with LangChain, LangGraph and LangSmith",
    rating: 4.62,
    reviewCount: 2450,
    numStudents: 21138,
    level: "All Levels",
    durationHours: 31.5,
    lastUpdated: "2025-12",
  },
  {
    id: "private-agentic-rag-ollama",
    title: "Agentic AI \u2014 Private Agentic RAG with LangGraph and Ollama",
    url: "https://www.udemy.com/course/agentic-ai-private-agentic-rag-with-langgraph-and-ollama/",
    instructor: "Laxmi Kant Tiwari",
    headline:
      "LangGraph v1, Ollama, Agentic RAG, Private RAG, Corrective RAG, CRAG, Reflexion, Self-RAG, Adaptive RAG",
    rating: 4.61,
    reviewCount: 248,
    numStudents: 3377,
    level: "Advanced",
    durationHours: 16.5,
    lastUpdated: "2026-03",
  },
  {
    id: "production-ai-agents-js",
    title: "Production AI Agents with JavaScript: LangChain & LangGraph",
    url: "https://www.udemy.com/course/production-ai-agents-with-javascript-langchain-langgraph/",
    instructor: "Sangam Mukherjee",
    headline:
      "Production-grade AI agents with LangChain.js, LangGraph.js, RAG, Next.js, LangSmith & real JS/TS projects",
    rating: 4.61,
    reviewCount: 72,
    numStudents: 624,
    level: "All Levels",
    durationHours: 16.5,
    lastUpdated: "2025-12",
  },
  {
    id: "langchain-agentic-ai",
    title: "LangChain \u2014 Agentic AI Engineering with LangChain & LangGraph",
    url: "https://www.udemy.com/course/langchain/",
    instructor: "Eden Marco",
    headline:
      "Build AI Agents with LangChain and LangGraph RAG, Tools, MCP and Production-Ready Agentic AI Systems (Python)",
    rating: 4.6,
    reviewCount: 48018,
    numStudents: 166321,
    level: "Intermediate",
    durationHours: 18.0,
    lastUpdated: "2026-03",
  },
  {
    id: "langgraph-basics-to-advanced",
    title: "LangGraph: From Basics to Advanced AI Agents with LLMs",
    url: "https://www.udemy.com/course/langgraph-from-basics-to-advanced-ai-agents-with-llms/",
    instructor: "Tensor Teach",
    headline: "Learn how to build custom AI Agents with LangGraph",
    rating: 4.56,
    reviewCount: 44,
    numStudents: 966,
    level: "Intermediate",
    durationHours: 1.6,
    lastUpdated: "2025-05",
  },
  {
    id: "langgraph-eden-marco",
    title: "LangGraph \u2014 Develop LLM-Powered AI Agents with LangGraph",
    url: "https://www.udemy.com/course/langgraph/",
    instructor: "Eden Marco",
    headline:
      "Learn LangGraph by building FAST a real world LLM AI Agents (Python)",
    rating: 4.54,
    reviewCount: 3336,
    numStudents: 25140,
    level: "Advanced",
    durationHours: 7.7,
    lastUpdated: "2026-03",
  },
  {
    id: "agentic-ai-bootcamp",
    title: "Complete Agentic AI Bootcamp With LangGraph and LangChain",
    url: "https://www.udemy.com/course/complete-agentic-ai-bootcamp-with-langgraph-and-langchain/",
    instructor: "Krish Naik",
    headline:
      "Learn to build real-world AI agents, multi-agent workflows, and autonomous apps with LangGraph and LangChain",
    rating: 4.54,
    reviewCount: 4947,
    numStudents: 42641,
    level: "All Levels",
    durationHours: 38.5,
    lastUpdated: "2025-12",
  },
  {
    id: "langgraph-in-action",
    title: "LangGraph in Action: Develop Advanced AI Agents with LLMs",
    url: "https://www.udemy.com/course/langgraph-in-action-develop-advanced-ai-agents-with-llms/",
    instructor: "Markus Lang",
    headline:
      "Master the Fundamentals of AI Agents with LangGraph (Version 1.0.0)",
    rating: 4.45,
    reviewCount: 685,
    numStudents: 5089,
    level: "Intermediate",
    durationHours: 3.5,
    lastUpdated: "2026-01",
  },
];

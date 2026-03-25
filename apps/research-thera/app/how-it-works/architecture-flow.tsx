"use client";

import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./flow-dark.css";
import {
  Search,
  Brain,
  Database,
  FileText,
  RefreshCw,
  GitFork,
  BookOpen,
  Filter,
  FlaskConical,
  Layers,
  Cpu,
  MessageSquare,
  Save,
  Sparkles,
  Globe,
} from "lucide-react";

/* ─── Custom Node Components ──────────────────────────────────── *
 *
 * React Flow renders every node as a React component. We define
 * four "shapes" here — AgentNode (boxes for AI agents and steps),
 * DataStoreNode (smaller infra boxes), LoopNode (pill badges),
 * and ParallelNode (fork badges).
 *
 * <Handle> = the invisible dot where an edge (arrow) attaches.
 *   type="target" = arrow comes IN       type="source" = arrow goes OUT
 *   Position.Top / Bottom / Left / Right = which side the dot sits on
 *
 * ────────────────────────────────────────────────────────────────── */

function AgentNode({ data }: { data: Record<string, unknown> }) {
  const Icon = data.icon as React.ComponentType<{ size?: number }>;
  const color = data.color as string;
  const label = data.label as string;
  const sublabel = data.sublabel as string | undefined;

  return (
    <div
      style={{
        padding: "10px 16px",
        borderRadius: 12,
        background: `color-mix(in srgb, ${color} 14%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 45%, transparent)`,
        boxShadow: `0 0 12px color-mix(in srgb, ${color} 15%, transparent), 0 1px 3px rgba(0,0,0,0.3)`,
        minWidth: 170,
        textAlign: "center",
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `color-mix(in srgb, ${color} 22%, transparent)`,
            color, flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)", lineHeight: 1.3 }}>
            {label}
          </div>
          {sublabel && (
            <div style={{ fontSize: 10, color: "var(--gray-10)", marginTop: 1 }}>{sublabel}</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

function DataStoreNode({ data }: { data: Record<string, unknown> }) {
  const Icon = data.icon as React.ComponentType<{ size?: number }>;
  const color = data.color as string;
  const label = data.label as string;
  const sublabel = data.sublabel as string | undefined;

  return (
    <div
      style={{
        padding: "8px 14px", borderRadius: 8,
        background: `color-mix(in srgb, ${color} 10%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
        boxShadow: `0 0 8px color-mix(in srgb, ${color} 10%, transparent), 0 1px 2px rgba(0,0,0,0.25)`,
        minWidth: 140, textAlign: "center",
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <div style={{ color, flexShrink: 0, display: "flex" }}>
          <Icon size={14} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-12)" }}>{label}</div>
          {sublabel && <div style={{ fontSize: 9, color: "var(--gray-10)" }}>{sublabel}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

function LoopNode({ data }: { data: Record<string, unknown> }) {
  const color = data.color as string;
  const label = data.label as string;

  return (
    <div
      style={{
        padding: "5px 12px", borderRadius: 20,
        background: `color-mix(in srgb, ${color} 16%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        boxShadow: `0 0 10px color-mix(in srgb, ${color} 12%, transparent)`,
        display: "flex", alignItems: "center", gap: 5,
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <RefreshCw size={12} style={{ color }} />
      <span style={{ fontSize: 10, fontWeight: 600, color }}>{label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

function ParallelNode({ data }: { data: Record<string, unknown> }) {
  const color = data.color as string;
  const label = data.label as string;

  return (
    <div
      style={{
        padding: "5px 12px", borderRadius: 20,
        background: `color-mix(in srgb, ${color} 16%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        boxShadow: `0 0 10px color-mix(in srgb, ${color} 12%, transparent)`,
        display: "flex", alignItems: "center", gap: 5,
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <GitFork size={12} style={{ color }} />
      <span style={{ fontSize: 10, fontWeight: 600, color }}>{label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

/* ─── Node Types Registry ─────────────────────────────────────── */

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  dataStore: DataStoreNode,
  loop: LoopNode,
  parallel: ParallelNode,
};

/* ─── Shared Edge Defaults ────────────────────────────────────── */

const edgeDefaults = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  style: { strokeWidth: 2 },
};

/* ─── Reusable Mini-Flow Wrapper ──────────────────────────────── */

function MiniFlow({ nodes, edges, height = 280 }: { nodes: Node[]; edges: Edge[]; height?: number }) {
  const [n, , onNodesChange] = useNodesState(nodes);
  const [e, , onEdgesChange] = useEdgesState(edges);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--gray-a4)",
        background: "color-mix(in srgb, var(--color-background) 95%, var(--gray-3))",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)",
      }}
    >
      <ReactFlow
        nodes={n}
        edges={e}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.4}
        maxZoom={1.8}
        panOnScroll={false}
        proOptions={{ hideAttribution: false }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={20} size={1} color="var(--gray-a3)" />
        <Controls
          showInteractive={false}
          position="bottom-left"
        />
      </ReactFlow>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  1. PIPELINE OVERVIEW
 *
 *  The 7-node research generation pipeline at a high level.
 *  Shows the three phases: Context (load + normalize), Search
 *  (plan + fetch + enrich), and Extract & Persist.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const pipelineNodes: Node[] = [
  {
    id: "load",
    type: "agent",
    position: { x: 0, y: 60 },
    data: { label: "loadContext", sublabel: "Goal + family profile from PG", icon: FileText, color: "var(--blue-9)" },
  },
  {
    id: "normalize",
    type: "agent",
    position: { x: 240, y: 60 },
    data: { label: "normalizeGoal", sublabel: "DeepSeek clinical classification", icon: Brain, color: "var(--amber-9)" },
  },
  {
    id: "plan",
    type: "agent",
    position: { x: 490, y: 60 },
    data: { label: "planQuery", sublabel: "Up to 47 search queries", icon: Sparkles, color: "var(--orange-9)" },
  },
  {
    id: "search",
    type: "agent",
    position: { x: 0, y: 170 },
    data: { label: "search", sublabel: "~2,350 candidates from 3 sources", icon: Search, color: "var(--cyan-9)" },
  },
  {
    id: "enrich",
    type: "agent",
    position: { x: 240, y: 170 },
    data: { label: "enrichAbstracts", sublabel: "OpenAlex concurrency 15", icon: Globe, color: "var(--teal-9)" },
  },
  {
    id: "extract",
    type: "agent",
    position: { x: 490, y: 170 },
    data: { label: "extractAll", sublabel: "DeepSeek scores & gates", icon: Filter, color: "var(--red-9)" },
  },
  {
    id: "persist",
    type: "dataStore",
    position: { x: 320, y: 275 },
    data: { label: "persist + embed", sublabel: "therapy_research + pgvector 1024-dim", icon: Database, color: "var(--purple-9)" },
  },
];

const pipelineEdges: Edge[] = [
  {
    id: "e-load-norm", source: "load", target: "normalize",
    ...edgeDefaults, label: "context obj",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-norm-plan", source: "normalize", target: "plan",
    ...edgeDefaults, label: "clinicalDomain",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-plan-search", source: "plan", target: "search",
    ...edgeDefaults, label: "query lists",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-search-enrich", source: "search", target: "enrich",
    ...edgeDefaults, label: "raw candidates",
    style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" },
  },
  {
    id: "e-enrich-extract", source: "enrich", target: "extract",
    ...edgeDefaults, label: "with abstracts",
    style: { ...edgeDefaults.style, stroke: "var(--teal-8)" },
  },
  {
    id: "e-extract-persist", source: "extract", target: "persist",
    ...edgeDefaults, label: "top 20 scored",
    style: { ...edgeDefaults.style, stroke: "var(--red-8)" },
  },
];

export function PipelineFlow() {
  return <MiniFlow nodes={pipelineNodes} edges={pipelineEdges} height={370} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  2. MULTI-SOURCE SEARCH
 *
 *  planQuery fans out to three academic search APIs in parallel,
 *  then Semantic Scholar recommendations are seeded from the top
 *  paper. Everything merges into dedupe + bad-term filter.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const searchNodes: Node[] = [
  {
    id: "queries",
    type: "dataStore",
    position: { x: 200, y: 0 },
    data: { label: "Query Lists", sublabel: "15 Crossref + 20 S2 + 12 PubMed", icon: FileText, color: "var(--orange-9)" },
  },
  {
    id: "fan-out",
    type: "parallel",
    position: { x: 220, y: 60 },
    data: { label: "parallel fetch", color: "var(--cyan-9)" },
  },
  {
    id: "crossref",
    type: "agent",
    position: { x: 0, y: 110 },
    data: { label: "Crossref", sublabel: "500ms between queries", icon: BookOpen, color: "var(--cyan-9)" },
  },
  {
    id: "pubmed",
    type: "agent",
    position: { x: 220, y: 110 },
    data: { label: "PubMed / MeSH", sublabel: "1,000ms between queries", icon: FlaskConical, color: "var(--green-9)" },
  },
  {
    id: "s2",
    type: "agent",
    position: { x: 450, y: 110 },
    data: { label: "Semantic Scholar", sublabel: "1,100ms between queries", icon: Search, color: "var(--blue-9)" },
  },
  {
    id: "dedupe",
    type: "agent",
    position: { x: 200, y: 220 },
    data: { label: "Dedupe + Filter", sublabel: "Remove books, 15 bad terms", icon: Filter, color: "var(--red-9)" },
  },
];

const searchEdges: Edge[] = [
  {
    id: "e-q-fan", source: "queries", target: "fan-out",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-fan-cr", source: "fan-out", target: "crossref",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" },
  },
  {
    id: "e-fan-pm", source: "fan-out", target: "pubmed",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-fan-s2", source: "fan-out", target: "s2",
    ...edgeDefaults, animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-cr-ded", source: "crossref", target: "dedupe",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" },
  },
  {
    id: "e-pm-ded", source: "pubmed", target: "dedupe",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-s2-ded", source: "s2", target: "dedupe",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
];

export function SearchFlow() {
  return <MiniFlow nodes={searchNodes} edges={searchEdges} height={320} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  3. EXTRACT & PERSIST
 *
 *  DeepSeek scores each paper, a three-gate filter passes only
 *  high-quality results, a blended formula ranks them, and the
 *  top 20 are upserted to therapy_research + pgvector embeddings.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const extractNodes: Node[] = [
  {
    id: "candidates",
    type: "dataStore",
    position: { x: 0, y: 70 },
    data: { label: "Enriched Candidates", sublabel: "up to 300 with abstracts", icon: FileText, color: "var(--teal-9)" },
  },
  {
    id: "deepseek-extract",
    type: "agent",
    position: { x: 230, y: 0 },
    data: { label: "DeepSeek Extract", sublabel: "Batches of 6, 12 domains", icon: Brain, color: "var(--amber-9)" },
  },
  {
    id: "gate",
    type: "loop",
    position: { x: 260, y: 100 },
    data: { label: "relevance >= 0.75, confidence >= 0.55", color: "var(--red-9)" },
  },
  {
    id: "blend",
    type: "agent",
    position: { x: 230, y: 145 },
    data: { label: "Blended Score", sublabel: "0.7 x relevance + 0.3 x confidence", icon: Layers, color: "var(--orange-9)" },
  },
  {
    id: "therapy-research",
    type: "dataStore",
    position: { x: 500, y: 30 },
    data: { label: "therapy_research", sublabel: "Neon PostgreSQL", icon: Database, color: "var(--purple-9)" },
  },
  {
    id: "pgvector",
    type: "dataStore",
    position: { x: 500, y: 130 },
    data: { label: "research_embeddings", sublabel: "pgvector 1024-dim", icon: Database, color: "var(--green-9)" },
  },
];

const extractEdges: Edge[] = [
  {
    id: "e-cand-ds", source: "candidates", target: "deepseek-extract",
    ...edgeDefaults, label: "50 at a time",
    style: { ...edgeDefaults.style, stroke: "var(--teal-8)" },
  },
  {
    id: "e-ds-gate", source: "deepseek-extract", target: "gate",
    ...edgeDefaults, label: "scored JSON",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-gate-blend", source: "gate", target: "blend",
    ...edgeDefaults, label: "passed papers",
    style: { ...edgeDefaults.style, stroke: "var(--red-8)" },
  },
  {
    id: "e-blend-tr", source: "blend", target: "therapy-research",
    ...edgeDefaults, label: "top 20 upsert",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-blend-pv", source: "blend", target: "pgvector",
    ...edgeDefaults, animated: true, label: "chunk + embed",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
];

export function ExtractPersistFlow() {
  return <MiniFlow nodes={extractNodes} edges={extractEdges} height={260} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  4. RAG REACT AGENT
 *
 *  The Python LangGraph ReAct agent. DeepSeek Chat reasons over
 *  the user query, calls search_papers and get_paper_detail tools
 *  in a loop, then calls save_research_papers to persist results.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const ragNodes: Node[] = [
  {
    id: "user-query",
    type: "dataStore",
    position: { x: 0, y: 80 },
    data: { label: "User Query", sublabel: "therapy context prompt", icon: MessageSquare, color: "var(--gray-11)" },
  },
  {
    id: "deepseek-agent",
    type: "agent",
    position: { x: 200, y: 0 },
    data: { label: "DeepSeek Chat", sublabel: "create_react_agent (LangGraph)", icon: Brain, color: "var(--amber-9)" },
  },
  {
    id: "search-tool",
    type: "agent",
    position: { x: 200, y: 100 },
    data: { label: "search_papers", sublabel: "OpenAlex + Crossref + S2 + rerank", icon: Search, color: "var(--cyan-9)" },
  },
  {
    id: "detail-tool",
    type: "agent",
    position: { x: 200, y: 190 },
    data: { label: "get_paper_detail", sublabel: "Full abstract + TLDR", icon: BookOpen, color: "var(--green-9)" },
  },
  {
    id: "save-tool",
    type: "agent",
    position: { x: 480, y: 100 },
    data: { label: "save_research_papers", sublabel: "Upsert top 10 to Neon", icon: Save, color: "var(--purple-9)" },
  },
  {
    id: "react-loop",
    type: "loop",
    position: { x: 470, y: 15 },
    data: { label: "1-3 tool calls", color: "var(--amber-9)" },
  },
];

const ragEdges: Edge[] = [
  {
    id: "e-q-agent", source: "user-query", target: "deepseek-agent",
    ...edgeDefaults, label: "prompt",
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e-agent-search", source: "deepseek-agent", target: "search-tool",
    ...edgeDefaults, label: "tool call",
    style: { ...edgeDefaults.style, stroke: "var(--cyan-8)" },
  },
  {
    id: "e-agent-detail", source: "deepseek-agent", target: "detail-tool",
    ...edgeDefaults, label: "tool call",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-search-save", source: "search-tool", target: "save-tool",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--cyan-8)", strokeDasharray: "5 3" },
  },
  {
    id: "e-agent-save", source: "deepseek-agent", sourceHandle: "right", target: "save-tool", targetHandle: "left",
    ...edgeDefaults, label: "final persist",
    style: { ...edgeDefaults.style, stroke: "var(--purple-8)" },
  },
  {
    id: "e-loop-agent", source: "react-loop", target: "deepseek-agent",
    type: "smoothstep",
    style: { strokeWidth: 2, stroke: "var(--amber-8)", strokeDasharray: "5 3" },
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    animated: true,
    label: "reason + act",
  },
];

export function RagAgentFlow() {
  return <MiniFlow nodes={ragNodes} edges={ragEdges} height={300} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  5. DATA FLOW OVERVIEW
 *
 *  How user actions flow through the system: Neon Auth -> Next.js
 *  -> GraphQL -> Pipeline/Agent -> PostgreSQL -> UI polling.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const dataFlowNodes: Node[] = [
  {
    id: "user",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "Neon Auth", sublabel: "useSession() + AuthGate", icon: Cpu, color: "var(--gray-11)" },
  },
  {
    id: "graphql",
    type: "agent",
    position: { x: 230, y: 40 },
    data: { label: "Apollo GraphQL", sublabel: "Typed mutations + queries", icon: Layers, color: "var(--orange-9)" },
  },
  {
    id: "gen-job",
    type: "dataStore",
    position: { x: 480, y: 0 },
    data: { label: "generation_jobs", sublabel: "RUNNING | SUCCEEDED | FAILED", icon: Database, color: "var(--amber-9)" },
  },
  {
    id: "pipeline",
    type: "agent",
    position: { x: 480, y: 80 },
    data: { label: "7-Node Pipeline", sublabel: "TypeScript LangGraph pattern", icon: Sparkles, color: "var(--indigo-9)" },
  },
  {
    id: "ui-poll",
    type: "loop",
    position: { x: 230, y: 120 },
    data: { label: "poll every 1s", color: "var(--blue-9)" },
  },
];

const dataFlowEdges: Edge[] = [
  {
    id: "e-user-gql", source: "user", target: "graphql",
    ...edgeDefaults, label: "Bearer token",
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e-gql-job", source: "graphql", target: "gen-job",
    ...edgeDefaults, label: "createGoal mutation",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-gql-pipe", source: "graphql", target: "pipeline",
    ...edgeDefaults, label: "triggers run",
    style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" },
  },
  {
    id: "e-pipe-job", source: "pipeline", target: "gen-job",
    ...edgeDefaults, label: "writes progress %",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-job-poll", source: "gen-job", target: "ui-poll",
    ...edgeDefaults, animated: true, label: "status + progress",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
];

export function DataFlowDiagram() {
  return <MiniFlow nodes={dataFlowNodes} edges={dataFlowEdges} height={220} />;
}

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
  FileText,
  Upload,
  Database,
  Brain,
  Shield,
  Search,
  Activity,
  Stethoscope,
  RefreshCw,
  GitFork,
  Cpu,
  FlaskConical,
  ShieldCheck,
  Layers,
} from "lucide-react";

/* ── Custom Node Components ──────────────────────────────────── *
 *
 * Identical to law-adversarial dark-mode-optimized versions:
 * color-mix 14%, boxShadow glow, strokeWidth 2.
 * ────────────────────────────────────────────────────────────── */

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

/* ── Node Types Registry ─────────────────────────────────────── */

const nodeTypes: NodeTypes = {
  agent: AgentNode,
  dataStore: DataStoreNode,
  loop: LoopNode,
  parallel: ParallelNode,
};

/* ── Shared Edge Defaults ────────────────────────────────────── */

const edgeDefaults = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  style: { strokeWidth: 2 },
};

/* ── Reusable Mini-Flow Wrapper ──────────────────────────────── */

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
 *  1. INGESTION FLOW
 *
 *  PDF upload → LlamaParse → BloodTestNodeParser → embeddings.
 *  A simple left-to-right pipeline showing how blood test PDFs
 *  enter the system and get stored.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const ingestionNodes: Node[] = [
  {
    id: "upload",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "Upload PDF", sublabel: "POST /upload → R2 storage", icon: Upload, color: "var(--gray-11)" },
  },
  {
    id: "parse",
    type: "agent",
    position: { x: 260, y: 40 },
    data: { label: "LlamaParse", sublabel: "PDF → markdown tables", icon: FileText, color: "var(--orange-9)" },
  },
  {
    id: "extract",
    type: "agent",
    position: { x: 520, y: 40 },
    data: { label: "BloodTestNodeParser", sublabel: "3-tier marker extraction", icon: FlaskConical, color: "var(--crimson-9)" },
  },
  {
    id: "neon",
    type: "dataStore",
    position: { x: 790, y: 45 },
    data: { label: "Neon PostgreSQL", sublabel: "7 entity + 7 embedding tables", icon: Database, color: "var(--green-9)" },
  },
];

const ingestionEdges: Edge[] = [
  {
    id: "e-up-parse", source: "upload", target: "parse",
    ...edgeDefaults, label: "PDF bytes",
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e-parse-ext", source: "parse", target: "extract",
    ...edgeDefaults, label: "markdown",
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-ext-neon", source: "extract", target: "neon",
    ...edgeDefaults, label: "markers + 1024-dim vectors",
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },
];

export function IngestionFlow() {
  return <MiniFlow nodes={ingestionNodes} edges={ingestionEdges} height={160} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  2. LANGGRAPH PIPELINE FLOW
 *
 *  The core 4-node StateGraph: triage → retrieve → synthesize → guard.
 *  Shows intent classification flowing into retrieval routing,
 *  then synthesis with clinical safety, and finally guard audit.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const pipelineNodes: Node[] = [
  {
    id: "query",
    type: "dataStore",
    position: { x: 0, y: 55 },
    data: { label: "User Query", sublabel: "chat message", icon: Stethoscope, color: "var(--gray-11)" },
  },
  {
    id: "triage",
    type: "agent",
    position: { x: 180, y: 45 },
    data: { label: "Triage", sublabel: "DeepSeek → 8 intent classes", icon: Brain, color: "var(--indigo-9)" },
  },
  {
    id: "retrieve",
    type: "agent",
    position: { x: 420, y: 45 },
    data: { label: "Retrieve", sublabel: "intent-routed pgvector search", icon: Search, color: "var(--blue-9)" },
  },
  {
    id: "synthesize",
    type: "agent",
    position: { x: 660, y: 45 },
    data: { label: "Synthesize", sublabel: "DeepSeek + safety prompt", icon: Cpu, color: "var(--amber-9)" },
  },
  {
    id: "guard",
    type: "agent",
    position: { x: 900, y: 45 },
    data: { label: "Guard", sublabel: "5 safety rule audit", icon: ShieldCheck, color: "var(--crimson-9)" },
  },
];

const pipelineEdges: Edge[] = [
  {
    id: "e-q-tri", source: "query", target: "triage",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e-tri-ret", source: "triage", target: "retrieve",
    ...edgeDefaults, label: "intent + entities",
    style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" },
  },
  {
    id: "e-ret-syn", source: "retrieve", target: "synthesize",
    ...edgeDefaults, label: "context_chunks[]",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-syn-grd", source: "synthesize", target: "guard",
    ...edgeDefaults, label: "draft answer",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
];

export function PipelineFlow() {
  return <MiniFlow nodes={pipelineNodes} edges={pipelineEdges} height={180} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  3. RETRIEVAL ROUTING FLOW
 *
 *  Shows how the triage intent fans out to different pgvector
 *  search strategies. Marker queries hit hybrid search, trajectory
 *  adds trend data, general_health fans out to all 6 tables,
 *  and safety_refusal skips retrieval.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const retrievalNodes: Node[] = [
  {
    id: "triage-out",
    type: "dataStore",
    position: { x: 220, y: 0 },
    data: { label: "Triage Output", sublabel: "intent + entities[]", icon: Brain, color: "var(--indigo-9)" },
  },
  {
    id: "fan-badge",
    type: "parallel",
    position: { x: 235, y: 65 },
    data: { label: "intent routing", color: "var(--purple-9)" },
  },
  {
    id: "hybrid",
    type: "agent",
    position: { x: 0, y: 120 },
    data: { label: "Hybrid Search", sublabel: "0.7 cosine + 0.3 FTS", icon: Search, color: "var(--blue-9)" },
  },
  {
    id: "trend",
    type: "agent",
    position: { x: 230, y: 120 },
    data: { label: "Trend Search", sublabel: "marker trajectory over time", icon: Activity, color: "var(--green-9)" },
  },
  {
    id: "fanout",
    type: "agent",
    position: { x: 460, y: 120 },
    data: { label: "Fan-Out", sublabel: "all 7 entity tables", icon: Layers, color: "var(--amber-9)" },
  },
  {
    id: "skip",
    type: "loop",
    position: { x: 510, y: 10 },
    data: { label: "safety_refusal → skip", color: "var(--crimson-9)" },
  },
];

const retrievalEdges: Edge[] = [
  {
    id: "e-tri-fan", source: "triage-out", target: "fan-badge",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" },
  },
  {
    id: "e-fan-hyb", source: "fan-badge", target: "hybrid",
    ...edgeDefaults, animated: true, label: "markers",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-fan-trend", source: "fan-badge", target: "trend",
    ...edgeDefaults, animated: true, label: "trajectory",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-fan-all", source: "fan-badge", target: "fanout",
    ...edgeDefaults, animated: true, label: "general_health",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-tri-skip", source: "triage-out", target: "skip",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)", strokeDasharray: "5 3" },
  },
];

export function RetrievalFlow() {
  return <MiniFlow nodes={retrievalNodes} edges={retrievalEdges} height={270} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  4. SAFETY GUARD FLOW
 *
 *  The guard node audits every synthesised response against 5
 *  safety rules. Shows the audit path and disclaimer injection.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const guardNodes: Node[] = [
  {
    id: "draft",
    type: "dataStore",
    position: { x: 0, y: 50 },
    data: { label: "Synthesised Answer", sublabel: "from synthesize node", icon: Cpu, color: "var(--amber-9)" },
  },
  {
    id: "auditor",
    type: "agent",
    position: { x: 240, y: 40 },
    data: { label: "Guard Auditor", sublabel: "DeepSeek — 5 safety checks", icon: Shield, color: "var(--crimson-9)" },
  },
  {
    id: "check-badge",
    type: "loop",
    position: { x: 265, y: 120 },
    data: { label: "5 rules checked", color: "var(--crimson-9)" },
  },
  {
    id: "passed",
    type: "dataStore",
    position: { x: 490, y: 10 },
    data: { label: "Passed", sublabel: "final_answer returned", icon: ShieldCheck, color: "var(--green-9)" },
  },
  {
    id: "failed",
    type: "dataStore",
    position: { x: 490, y: 85 },
    data: { label: "Failed", sublabel: "disclaimer appended", icon: Shield, color: "var(--crimson-9)" },
  },
];

const guardEdges: Edge[] = [
  {
    id: "e-draft-aud", source: "draft", target: "auditor",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
  {
    id: "e-aud-check", source: "auditor", target: "check-badge",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },
  {
    id: "e-aud-pass", source: "auditor", target: "passed",
    ...edgeDefaults, label: "all clear",
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-aud-fail", source: "auditor", target: "failed",
    ...edgeDefaults, label: "issues found",
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)", strokeDasharray: "5 3" },
  },
];

export function GuardFlow() {
  return <MiniFlow nodes={guardNodes} edges={guardEdges} height={210} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  5. EMBEDDING STRATEGY FLOW
 *
 *  Six entity types, each with a dedicated formatter, embedded
 *  into paired pgvector tables via text-embedding-3-large 1024-dim.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const embeddingNodes: Node[] = [
  {
    id: "blood-data",
    type: "dataStore",
    position: { x: 0, y: 10 },
    data: { label: "Blood Data", sublabel: "tests · markers · health state", icon: FlaskConical, color: "var(--crimson-9)" },
  },
  {
    id: "user-entities",
    type: "dataStore",
    position: { x: 0, y: 110 },
    data: { label: "User Entities", sublabel: "conditions · meds · symptoms · appts", icon: Layers, color: "var(--indigo-9)" },
  },
  {
    id: "llamaindex",
    type: "agent",
    position: { x: 220, y: 0 },
    data: { label: "LlamaIndex Pipeline", sublabel: "BloodTestNodeParser → 3 node types", icon: Activity, color: "var(--orange-9)" },
  },
  {
    id: "direct-api",
    type: "agent",
    position: { x: 220, y: 100 },
    data: { label: "POST /embed/*", sublabel: "format → embed → upsert", icon: Upload, color: "var(--blue-9)" },
  },
  {
    id: "format-badge",
    type: "parallel",
    position: { x: 510, y: 0 },
    data: { label: "7 format_*_for_embedding()", color: "var(--purple-9)" },
  },
  {
    id: "embed",
    type: "agent",
    position: { x: 480, y: 45 },
    data: { label: "text-embedding-3-large", sublabel: "OpenAI · 1024-dim Matryoshka", icon: Brain, color: "var(--amber-9)" },
  },
  {
    id: "pgvector",
    type: "dataStore",
    position: { x: 760, y: 50 },
    data: { label: "7 pgvector tables", sublabel: "vector(1024) · BTREE on user_id", icon: Database, color: "var(--green-9)" },
  },
];

const embeddingEdges: Edge[] = [
  {
    id: "e-blood-llama", source: "blood-data", target: "llamaindex",
    ...edgeDefaults, label: "PDF + markers",
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },
  {
    id: "e-user-api", source: "user-entities", target: "direct-api",
    ...edgeDefaults, label: "entity CRUD",
    style: { ...edgeDefaults.style, stroke: "var(--indigo-8)" },
  },
  {
    id: "e-llama-embed", source: "llamaindex", target: "embed",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--orange-8)" },
  },
  {
    id: "e-api-embed", source: "direct-api", target: "embed",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },
  {
    id: "e-embed-pg", source: "embed", target: "pgvector",
    ...edgeDefaults, animated: true, label: "ON CONFLICT upsert",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },
];

export function EmbeddingFlow() {
  return <MiniFlow nodes={embeddingNodes} edges={embeddingEdges} height={230} />;
}

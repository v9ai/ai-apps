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
  Video,
  FileText,
  Brain,
  Layers,
  Puzzle,
  Database,
  Search,
  Star,
  Wrench,
  CheckCircle,
  Globe,
  Cpu,
  RefreshCw,
  GitFork,
} from "lucide-react";

/* ─── LEGO Color Palette ─────────────────────────────────────── */

const RED = "#E3000B";
const BLUE = "#006CB7";
const GREEN = "#00852B";
const ORANGE = "#FE8A18";
const YELLOW = "#FFD500";
const GRAY = "#6B6E6F";

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

/* ─── Reusable Mini-Flow Wrapper ──────────────────────────────── *
 *
 * Every sub-diagram uses this same wrapper. It creates a React Flow
 * canvas with a fixed height, dot-grid background, and zoom controls.
 *
 * `fitView` tells React Flow to automatically zoom and pan so that
 * all nodes are visible when the diagram first appears.
 *
 * We disable `panOnScroll` so the page scrolls normally — users
 * zoom with pinch or the +/- buttons instead.
 * ────────────────────────────────────────────────────────────────── */

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
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#111113",
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
        <Background gap={20} size={1} color="rgba(255,255,255,0.04)" />
        <Controls
          showInteractive={false}
          position="bottom-left"
        />
      </ReactFlow>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  1. ARCHITECTURE OVERVIEW
 *
 *  The four-layer stack: Browser -> Next.js API Routes ->
 *  LangGraph Server -> DeepSeek API.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const archNodes: Node[] = [
  {
    id: "browser",
    type: "agent",
    position: { x: 0, y: 60 },
    data: { label: "Browser", sublabel: "Next.js + PandaCSS", icon: Globe, color: YELLOW },
  },
  {
    id: "api",
    type: "agent",
    position: { x: 230, y: 60 },
    data: { label: "API Routes", sublabel: "/api/analyze, /api/topics, ...", icon: Cpu, color: RED },
  },
  {
    id: "langgraph",
    type: "agent",
    position: { x: 480, y: 60 },
    data: { label: "LangGraph Server", sublabel: "4 compiled StateGraphs", icon: Layers, color: BLUE },
  },
  {
    id: "deepseek",
    type: "dataStore",
    position: { x: 730, y: 65 },
    data: { label: "DeepSeek API", sublabel: "deepseek-chat · JSON mode", icon: Brain, color: GREEN },
  },
];

const archEdges: Edge[] = [
  {
    id: "e-br-api", source: "browser", target: "api",
    ...edgeDefaults, label: "fetch()",
    style: { ...edgeDefaults.style, stroke: YELLOW },
  },
  {
    id: "e-api-lg", source: "api", target: "langgraph",
    ...edgeDefaults, label: "POST /runs/wait",
    style: { ...edgeDefaults.style, stroke: RED },
  },
  {
    id: "e-lg-ds", source: "langgraph", target: "deepseek",
    ...edgeDefaults, label: "JSON mode",
    style: { ...edgeDefaults.style, stroke: BLUE },
  },
];

export function ArchitectureFlow() {
  return <MiniFlow nodes={archNodes} edges={archEdges} height={180} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  2. VIDEO ANALYZER PIPELINE
 *
 *  fetch_video_info -> analyze_transcript -> extract_parts ->
 *  structure_steps -> generate_scheme
 *
 *  A 5-node sequential pipeline: one utility node fetches data
 *  from YouTube, then four AI nodes progressively refine the
 *  transcript into building instructions.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const videoNodes: Node[] = [
  {
    id: "fetch",
    type: "agent",
    position: { x: 0, y: 80 },
    data: { label: "fetch_video_info", sublabel: "YouTube transcript + metadata", icon: Video, color: GRAY },
  },
  {
    id: "analyze",
    type: "agent",
    position: { x: 250, y: 0 },
    data: { label: "analyze_transcript", sublabel: "Classify model + raw steps", icon: Brain, color: RED },
  },
  {
    id: "parts",
    type: "agent",
    position: { x: 250, y: 80 },
    data: { label: "extract_parts", sublabel: "Bricks, colors, part numbers", icon: Puzzle, color: RED },
  },
  {
    id: "steps",
    type: "agent",
    position: { x: 250, y: 160 },
    data: { label: "structure_steps", sublabel: "Numbered instructions", icon: FileText, color: RED },
  },
  {
    id: "scheme",
    type: "agent",
    position: { x: 530, y: 80 },
    data: { label: "generate_scheme", sublabel: "Build phases + summary", icon: Layers, color: RED },
  },
];

const videoEdges: Edge[] = [
  {
    id: "e-fetch-analyze", source: "fetch", target: "analyze",
    ...edgeDefaults, label: "transcript",
    style: { ...edgeDefaults.style, stroke: GRAY },
  },
  {
    id: "e-analyze-parts", source: "analyze", target: "parts",
    ...edgeDefaults, label: "analysis",
    style: { ...edgeDefaults.style, stroke: RED },
  },
  {
    id: "e-parts-steps", source: "parts", target: "steps",
    ...edgeDefaults, label: "parts_list",
    style: { ...edgeDefaults.style, stroke: RED },
  },
  {
    id: "e-steps-scheme", source: "steps", target: "scheme",
    ...edgeDefaults, label: "building_steps",
    style: { ...edgeDefaults.style, stroke: RED },
  },
];

export function VideoAnalyzerFlow() {
  return <MiniFlow nodes={videoNodes} edges={videoEdges} height={280} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  3. TOPIC RESEARCH PIPELINE
 *
 *  parse_mocs -> analyze_topic -> synthesize_topic
 *
 *  A 3-node pipeline: one utility node parses Rebrickable URLs,
 *  then two AI nodes analyze and synthesize MOC builds.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const topicNodes: Node[] = [
  {
    id: "parse",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "parse_mocs", sublabel: "Rebrickable URL regex", icon: Search, color: GRAY },
  },
  {
    id: "analyze",
    type: "agent",
    position: { x: 260, y: 40 },
    data: { label: "analyze_topic", sublabel: "Mechanisms + techniques + key parts", icon: Brain, color: BLUE },
  },
  {
    id: "synthesize",
    type: "agent",
    position: { x: 540, y: 40 },
    data: { label: "synthesize_topic", sublabel: "Difficulty, starter MOC, unique approaches", icon: Layers, color: BLUE },
  },
];

const topicEdges: Edge[] = [
  {
    id: "e-parse-analyze", source: "parse", target: "analyze",
    ...edgeDefaults, label: "mocs[]",
    style: { ...edgeDefaults.style, stroke: GRAY },
  },
  {
    id: "e-analyze-synth", source: "analyze", target: "synthesize",
    ...edgeDefaults, label: "analysis",
    style: { ...edgeDefaults.style, stroke: BLUE },
  },
];

export function TopicResearchFlow() {
  return <MiniFlow nodes={topicNodes} edges={topicEdges} height={160} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  4. PART DISCOVERY PIPELINE
 *
 *  identify_part -> generate_mocs -> rank_mocs -> Neon DB
 *
 *  A 3-node AI pipeline + database write. The part number enters,
 *  is classified, MOC builds are generated, ranked, and cached.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const partNodes: Node[] = [
  {
    id: "identify",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "identify_part", sublabel: "Name, category, MOC role", icon: Search, color: GREEN },
  },
  {
    id: "generate",
    type: "agent",
    position: { x: 250, y: 40 },
    data: { label: "generate_mocs", sublabel: "15 AFOL-style MOC builds", icon: Brain, color: GREEN },
  },
  {
    id: "rank",
    type: "agent",
    position: { x: 500, y: 40 },
    data: { label: "rank_mocs", sublabel: "Top picks + community summary", icon: Star, color: GREEN },
  },
  {
    id: "neon",
    type: "dataStore",
    position: { x: 730, y: 45 },
    data: { label: "Neon DB", sublabel: "cached results", icon: Database, color: ORANGE },
  },
];

const partEdges: Edge[] = [
  {
    id: "e-id-gen", source: "identify", target: "generate",
    ...edgeDefaults, label: "part_name + category",
    style: { ...edgeDefaults.style, stroke: GREEN },
  },
  {
    id: "e-gen-rank", source: "generate", target: "rank",
    ...edgeDefaults, label: "mocs[]",
    style: { ...edgeDefaults.style, stroke: GREEN },
  },
  {
    id: "e-rank-db", source: "rank", target: "neon",
    ...edgeDefaults, label: "INSERT",
    style: { ...edgeDefaults.style, stroke: ORANGE },
  },
];

export function PartDiscoveryFlow() {
  return <MiniFlow nodes={partNodes} edges={partEdges} height={160} />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  5. MOC PARTS LIST PIPELINE
 *
 *  infer_build_type -> generate_parts -> validate_parts
 *
 *  Two AI nodes classify and generate a bill of materials, then
 *  a pure-Python node deduplicates and validates. After the graph,
 *  the API enriches parts with Rebrickable images.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const mocPartsNodes: Node[] = [
  {
    id: "infer",
    type: "agent",
    position: { x: 0, y: 40 },
    data: { label: "infer_build_type", sublabel: "12 categories (castle, vehicle, ...)", icon: Wrench, color: ORANGE },
  },
  {
    id: "gen-parts",
    type: "agent",
    position: { x: 270, y: 40 },
    data: { label: "generate_parts", sublabel: "25-40 elements from catalog", icon: Brain, color: ORANGE },
  },
  {
    id: "validate",
    type: "agent",
    position: { x: 540, y: 40 },
    data: { label: "validate_parts", sublabel: "Dedup + sum + filter (Python)", icon: CheckCircle, color: GRAY },
  },
  {
    id: "rebrickable",
    type: "dataStore",
    position: { x: 780, y: 45 },
    data: { label: "Rebrickable API", sublabel: "part images", icon: Globe, color: BLUE },
  },
];

const mocPartsEdges: Edge[] = [
  {
    id: "e-infer-gen", source: "infer", target: "gen-parts",
    ...edgeDefaults, label: "build_type + notes",
    style: { ...edgeDefaults.style, stroke: ORANGE },
  },
  {
    id: "e-gen-val", source: "gen-parts", target: "validate",
    ...edgeDefaults, label: "raw parts[]",
    style: { ...edgeDefaults.style, stroke: ORANGE },
  },
  {
    id: "e-val-rb", source: "validate", target: "rebrickable",
    ...edgeDefaults, label: "enrichment",
    style: { ...edgeDefaults.style, stroke: BLUE },
  },
];

export function MocPartsFlow() {
  return <MiniFlow nodes={mocPartsNodes} edges={mocPartsEdges} height={160} />;
}

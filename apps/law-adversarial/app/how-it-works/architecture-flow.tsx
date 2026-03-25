"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
import {
  Upload,
  Swords,
  Shield,
  Gavel,
  BookOpen,
  Scale,
  Brain,
  Database,
  Radio,
  HardDrive,
  FileText,
  RefreshCw,
  Cpu,
} from "lucide-react";

/* ─── Custom Node Components ──────────────────────────────────── */

/**
 * Every node in React Flow is a React component. We define several
 * "node types" here — each one controls how a particular kind of
 * box looks on the diagram. React Flow renders them automatically
 * when a node's `type` field matches the key in the `nodeTypes` map.
 *
 * Each node gets:
 *  - `data` — whatever you put in the node definition (label, icon, etc.)
 *  - <Handle> components — the connection points where edges attach.
 *    Position.Top / Position.Bottom / etc. controls which side the
 *    dot appears on. `type="target"` = incoming edge, `type="source"` = outgoing.
 */

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
        background: `color-mix(in srgb, ${color} 8%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
        minWidth: 180,
        textAlign: "center",
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `color-mix(in srgb, ${color} 15%, transparent)`,
            color,
            flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--gray-12)",
              lineHeight: 1.3,
            }}
          >
            {label}
          </div>
          {sublabel && (
            <div
              style={{
                fontSize: 10,
                color: "var(--gray-9)",
                marginTop: 1,
              }}
            >
              {sublabel}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function GroupNode({ data }: { data: Record<string, unknown> }) {
  const color = data.color as string;
  const label = data.label as string;
  const sublabel = data.sublabel as string | undefined;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 16,
        border: `1.5px dashed color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 4%, transparent)`,
        padding: "12px 16px",
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 10, color: "var(--gray-9)" }}>{sublabel}</div>
      )}
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
        padding: "8px 14px",
        borderRadius: 8,
        background: `color-mix(in srgb, ${color} 6%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 25%, transparent)`,
        minWidth: 140,
        textAlign: "center",
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <div style={{ color, flexShrink: 0, display: "flex" }}>
          <Icon size={14} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-12)" }}>
            {label}
          </div>
          {sublabel && (
            <div style={{ fontSize: 9, color: "var(--gray-9)" }}>{sublabel}</div>
          )}
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
        padding: "5px 12px",
        borderRadius: 20,
        background: `color-mix(in srgb, ${color} 10%, var(--color-background))`,
        border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--default-font-family, system-ui)",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <RefreshCw size={12} style={{ color }} />
      <span style={{ fontSize: 10, fontWeight: 600, color }}>{label}</span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

/* ─── Node Types Registry ─────────────────────────────────────── */

/**
 * This map tells React Flow: "when a node has type: 'agent', render
 * it using the AgentNode component." Without this, React Flow would
 * render a plain default rectangle for every node.
 */
const nodeTypes: NodeTypes = {
  agent: AgentNode,
  group: GroupNode,
  dataStore: DataStoreNode,
  loop: LoopNode,
};

/* ─── Layout Constants ────────────────────────────────────────── */

const COL_LEFT = 80;
const COL_CENTER = 320;
const COL_RIGHT = 560;

/* ─── Node & Edge Definitions ─────────────────────────────────── */

/**
 * NODES — each object is one box on the diagram.
 *
 * - `id`: unique string, used by edges to say "connect THIS to THAT"
 * - `type`: which custom component to render (see nodeTypes above)
 * - `position`: { x, y } pixel coordinates on the canvas
 * - `data`: passed to the component as props.data
 * - `parentId` + `extent: "parent"`: makes this node live inside
 *    a group node (it can't be dragged outside the group's bounds)
 *
 * The layout is roughly:
 *
 *   [Upload] → [parseBrief] → [Supabase]
 *                                 │
 *              ┌── DEBATE LOOP ───┤
 *              │  Attacker        │
 *              │  Defender        │
 *              │  Judge           │
 *              │  ↺ x3 rounds    │
 *              └──────────────────┘
 *                     │
 *              ┌── SPECIALISTS ───┐
 *              │  Citation  Juris │ ← parallel
 *              │  Rewriter        │ ← sequential
 *              └──────────────────┘
 *                     │
 *              [SSE / audit_trail] → [Browser]
 *                     │
 *              ┌── LOCAL CANDLE ──┐
 *              │  phi-3.5  Embed  │ ← optional
 *              └──────────────────┘
 */

const initialNodes: Node[] = [
  // ── INGESTION ROW ──────────────────────────────────────────
  {
    id: "upload",
    type: "agent",
    position: { x: COL_LEFT - 40, y: 0 },
    data: {
      label: "Upload Brief",
      sublabel: "PDF or DOCX",
      icon: Upload,
      color: "var(--gray-11)",
    },
  },
  {
    id: "parse",
    type: "agent",
    position: { x: COL_CENTER - 20, y: 0 },
    data: {
      label: "parseBrief()",
      sublabel: "pdf-parse + mammoth",
      icon: FileText,
      color: "var(--orange-9)",
    },
  },
  {
    id: "supabase",
    type: "dataStore",
    position: { x: COL_RIGHT, y: 5 },
    data: {
      label: "Supabase PostgreSQL",
      sublabel: "sessions · findings · audit",
      icon: Database,
      color: "var(--amber-9)",
    },
  },

  // ── DEBATE LOOP GROUP ──────────────────────────────────────
  {
    id: "debate-group",
    type: "group",
    position: { x: COL_LEFT + 30, y: 90 },
    data: {
      label: "Adversarial Debate Loop",
      sublabel: "3 rounds, sequential — each round builds on the last",
      color: "var(--crimson-9)",
    },
    style: { width: 380, height: 260 },
  },
  {
    id: "attacker",
    type: "agent",
    position: { x: 70, y: 50 },
    parentId: "debate-group",
    extent: "parent",
    data: {
      label: "Attacker",
      sublabel: "DeepSeek Reasoner",
      icon: Swords,
      color: "var(--crimson-9)",
    },
  },
  {
    id: "defender",
    type: "agent",
    position: { x: 70, y: 120 },
    parentId: "debate-group",
    extent: "parent",
    data: {
      label: "Defender",
      sublabel: "Qwen-Plus (DashScope)",
      icon: Shield,
      color: "var(--blue-9)",
    },
  },
  {
    id: "judge",
    type: "agent",
    position: { x: 70, y: 190 },
    parentId: "debate-group",
    extent: "parent",
    data: {
      label: "Judge",
      sublabel: "DeepSeek Chat or local phi-3.5",
      icon: Gavel,
      color: "var(--amber-9)",
    },
  },
  {
    id: "loop-badge",
    type: "loop",
    position: { x: 280, y: 125 },
    parentId: "debate-group",
    extent: "parent",
    data: {
      label: "x3 rounds",
      color: "var(--crimson-9)",
    },
  },

  // ── SPECIALIST GROUP ───────────────────────────────────────
  {
    id: "specialist-group",
    type: "group",
    position: { x: COL_LEFT + 30, y: 380 },
    data: {
      label: "Specialist Agents",
      sublabel: "Post-debate — enriches findings with verification",
      color: "var(--purple-9)",
    },
    style: { width: 380, height: 200 },
  },
  {
    id: "citation",
    type: "agent",
    position: { x: 15, y: 50 },
    parentId: "specialist-group",
    extent: "parent",
    data: {
      label: "Citation Verifier",
      sublabel: "DeepSeek Reasoner",
      icon: BookOpen,
      color: "var(--green-9)",
    },
  },
  {
    id: "jurisdiction",
    type: "agent",
    position: { x: 195, y: 50 },
    parentId: "specialist-group",
    extent: "parent",
    data: {
      label: "Jurisdiction Expert",
      sublabel: "DeepSeek Reasoner",
      icon: Scale,
      color: "var(--purple-9)",
    },
  },
  {
    id: "rewriter",
    type: "agent",
    position: { x: 90, y: 130 },
    parentId: "specialist-group",
    extent: "parent",
    data: {
      label: "Brief Rewriter",
      sublabel: "Qwen-Plus — runs last",
      icon: Brain,
      color: "var(--orange-9)",
    },
  },

  // ── REALTIME ROW ───────────────────────────────────────────
  {
    id: "sse",
    type: "dataStore",
    position: { x: COL_CENTER - 20, y: 610 },
    data: {
      label: "SSE Polling",
      sublabel: "2s interval · audit_trail table",
      icon: Radio,
      color: "var(--purple-9)",
    },
  },
  {
    id: "browser",
    type: "agent",
    position: { x: COL_RIGHT, y: 605 },
    data: {
      label: "Browser Client",
      sublabel: "EventSource → live updates",
      icon: Cpu,
      color: "var(--gray-11)",
    },
  },

  // ── LOCAL CANDLE GROUP ─────────────────────────────────────
  {
    id: "candle-group",
    type: "group",
    position: { x: COL_LEFT + 30, y: 680 },
    data: {
      label: "Local Candle Server",
      sublabel: "Optional — set CANDLE_BASE_URL to enable",
      color: "var(--indigo-9)",
    },
    style: { width: 380, height: 120 },
  },
  {
    id: "phi",
    type: "agent",
    position: { x: 15, y: 45 },
    parentId: "candle-group",
    extent: "parent",
    data: {
      label: "phi-3.5-mini",
      sublabel: "Judge completions (local)",
      icon: HardDrive,
      color: "var(--indigo-9)",
    },
  },
  {
    id: "embeddings",
    type: "agent",
    position: { x: 200, y: 45 },
    parentId: "candle-group",
    extent: "parent",
    data: {
      label: "Embeddings",
      sublabel: "embedText() · embedBatch()",
      icon: HardDrive,
      color: "var(--indigo-9)",
    },
  },
];

/**
 * EDGES — each object is one arrow connecting two nodes.
 *
 * - `source` / `target`: the `id` of the node the arrow starts/ends at
 * - `animated`: makes the line animate (dashed flow effect)
 * - `style.stroke`: the arrow color
 * - `label`: text shown along the edge
 * - `markerEnd`: the arrowhead at the end
 * - `type: "smoothstep"`: curved corners instead of straight lines
 *
 * React Flow figures out the path automatically based on
 * Handle positions (Top/Bottom/Left/Right) defined in the node components.
 */

const edgeDefaults = {
  type: "smoothstep" as const,
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  style: { strokeWidth: 1.5 },
};

const initialEdges: Edge[] = [
  // Ingestion flow
  {
    id: "e-upload-parse",
    source: "upload",
    target: "parse",
    ...edgeDefaults,
    label: "file bytes",
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },
  {
    id: "e-parse-supabase",
    source: "parse",
    target: "supabase",
    ...edgeDefaults,
    label: "plain text",
    style: { ...edgeDefaults.style, stroke: "var(--amber-8)" },
  },

  // Supabase → Debate
  {
    id: "e-supabase-debate",
    source: "supabase",
    target: "debate-group",
    ...edgeDefaults,
    label: "brief_text + config",
    animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },

  // Debate internal: Attacker → Defender → Judge
  {
    id: "e-attacker-defender",
    source: "attacker",
    target: "defender",
    ...edgeDefaults,
    label: "attacks",
    style: { ...edgeDefaults.style, stroke: "var(--crimson-8)" },
  },
  {
    id: "e-defender-judge",
    source: "defender",
    target: "judge",
    ...edgeDefaults,
    label: "rebuttals",
    style: { ...edgeDefaults.style, stroke: "var(--blue-8)" },
  },

  // Judge → loop badge (feedback loop)
  {
    id: "e-judge-loop",
    source: "judge",
    target: "loop-badge",
    type: "smoothstep",
    style: { strokeWidth: 1.5, stroke: "var(--amber-8)", strokeDasharray: "5 3" },
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    label: "previousFindings[]",
  },

  // Debate → Specialists
  {
    id: "e-debate-specialists",
    source: "debate-group",
    target: "specialist-group",
    ...edgeDefaults,
    label: "final findings",
    animated: true,
    style: { ...edgeDefaults.style, stroke: "var(--purple-8)" },
  },

  // Parallel badge between citation + jurisdiction
  {
    id: "e-citation-rewriter",
    source: "citation",
    target: "rewriter",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--green-8)" },
  },
  {
    id: "e-jurisdiction-rewriter",
    source: "jurisdiction",
    target: "rewriter",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--purple-8)" },
  },

  // Specialists → SSE
  {
    id: "e-specialists-sse",
    source: "specialist-group",
    target: "sse",
    ...edgeDefaults,
    label: "audit_trail writes",
    style: { ...edgeDefaults.style, stroke: "var(--purple-8)" },
  },

  // SSE → Browser
  {
    id: "e-sse-browser",
    source: "sse",
    target: "browser",
    ...edgeDefaults,
    animated: true,
    label: "EventSource stream",
    style: { ...edgeDefaults.style, stroke: "var(--gray-8)" },
  },

  // SSE → Candle
  {
    id: "e-sse-candle",
    source: "sse",
    target: "candle-group",
    ...edgeDefaults,
    style: { ...edgeDefaults.style, stroke: "var(--indigo-8)", strokeDasharray: "5 3" },
    label: "optional",
  },

  // Judge → Candle phi (conditional routing)
  {
    id: "e-judge-phi",
    source: "judge",
    target: "phi",
    type: "smoothstep",
    style: { strokeWidth: 1.5, stroke: "var(--indigo-8)", strokeDasharray: "4 4" },
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
    label: "if CANDLE_BASE_URL",
  },
];

/* ─── Main Component ──────────────────────────────────────────── */

/**
 * ArchitectureFlow — the interactive pipeline diagram.
 *
 * React Flow renders all nodes + edges onto an infinite canvas.
 * Built-in interactions:
 *   - Pan: click + drag on empty space
 *   - Zoom: scroll wheel or pinch
 *   - Select: click a node, drag to reposition it
 *   - Multi-select: Shift+click or drag a selection box
 *   - Minimap: bottom-right overview (click to navigate)
 *   - Controls: bottom-left zoom buttons + fit-view
 *
 * The `fitView` prop auto-zooms to show all nodes on mount.
 * `proOptions={{ hideAttribution: false }}` shows the React Flow
 * watermark (required for MIT license compliance in open-source).
 */
export function ArchitectureFlow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div
      style={{
        width: "100%",
        height: 540,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--gray-a4)",
        background: "var(--color-background)",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: false }}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={20} size={1} color="var(--gray-a3)" />
        <Controls
          showInteractive={false}
          style={{
            borderRadius: 8,
            border: "1px solid var(--gray-a4)",
            overflow: "hidden",
          }}
        />
        <MiniMap
          nodeStrokeWidth={2}
          maskColor="color-mix(in srgb, var(--color-background) 85%, transparent)"
          style={{
            borderRadius: 8,
            border: "1px solid var(--gray-a4)",
            overflow: "hidden",
          }}
        />
      </ReactFlow>
    </div>
  );
}

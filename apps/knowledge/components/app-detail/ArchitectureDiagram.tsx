"use client";

import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/* ── Custom node types ─────────────────────────────────────── */

function LayerLabel({ data }: NodeProps<Node<{ label: string }>>) {
  return (
    <div style={{
      fontSize: 13,
      fontWeight: 600,
      color: "var(--gray-11)",
      letterSpacing: "0.02em",
    }}>
      {data.label}
    </div>
  );
}

function ServiceNode({ data }: NodeProps<Node<{ label: string; accent?: string }>>) {
  const c = data.accent || "violet";
  return (
    <div style={{
      padding: "10px 20px",
      borderRadius: 8,
      border: `1px solid var(--${c}-6)`,
      backgroundColor: `var(--${c}-3)`,
      fontSize: 13,
      fontWeight: 500,
      color: `var(--${c}-12)`,
      whiteSpace: "nowrap",
      textAlign: "center",
    }}>
      <Handle type="target" position={Position.Top} style={{ background: `var(--${c}-8)`, width: 8, height: 8 }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ background: `var(--${c}-8)`, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  layerLabel: LayerLabel,
  service: ServiceNode,
};

/* ── Graph definition ──────────────────────────────────────── */

const GW = 720;
const GH = 140;
const SY = 60;

const nodes: Node[] = [
  /* ── Client layer ──────────────────────────────────────── */
  {
    id: "client",
    type: "group",
    position: { x: 0, y: 0 },
    data: {},
    style: {
      width: GW, height: GH,
      backgroundColor: "color-mix(in srgb, var(--violet-3) 30%, transparent)",
      border: "1px solid var(--violet-5)",
      borderRadius: 12,
    },
  },
  {
    id: "client-lbl",
    type: "layerLabel",
    position: { x: 24, y: 14 },
    parentId: "client",
    data: { label: "Client (React / Next.js)" },
    draggable: false,
    selectable: false,
    connectable: false,
  },
  {
    id: "ui",
    type: "service",
    position: { x: 50, y: SY },
    parentId: "client",
    extent: "parent",
    data: { label: "UI Layer" },
    draggable: false,
  },
  {
    id: "chat",
    type: "service",
    position: { x: 270, y: SY },
    parentId: "client",
    extent: "parent",
    data: { label: "AI Chat" },
    draggable: false,
  },
  {
    id: "recs",
    type: "service",
    position: { x: 460, y: SY },
    parentId: "client",
    extent: "parent",
    data: { label: "Smart Recommendations" },
    draggable: false,
  },

  /* ── API layer ─────────────────────────────────────────── */
  {
    id: "api",
    type: "group",
    position: { x: 0, y: 240 },
    data: {},
    style: {
      width: GW, height: GH,
      backgroundColor: "color-mix(in srgb, var(--cyan-3) 30%, transparent)",
      border: "1px solid var(--cyan-5)",
      borderRadius: 12,
    },
  },
  {
    id: "api-lbl",
    type: "layerLabel",
    position: { x: 24, y: 14 },
    parentId: "api",
    data: { label: "Node.js API Layer" },
    draggable: false,
    selectable: false,
    connectable: false,
  },
  {
    id: "rest",
    type: "service",
    position: { x: 50, y: SY },
    parentId: "api",
    extent: "parent",
    data: { label: "REST API", accent: "cyan" },
    draggable: false,
  },
  {
    id: "router",
    type: "service",
    position: { x: 270, y: SY },
    parentId: "api",
    extent: "parent",
    data: { label: "AI Router", accent: "cyan" },
    draggable: false,
  },
  {
    id: "jobs",
    type: "service",
    position: { x: 440, y: SY },
    parentId: "api",
    extent: "parent",
    data: { label: "Background Jobs Queue", accent: "cyan" },
    draggable: false,
  },
];

const edgeStyle = { stroke: "var(--violet-7)", strokeWidth: 2 };

const edges: Edge[] = [
  {
    id: "e-ui-router",
    source: "ui",
    target: "router",
    type: "smoothstep",
    animated: true,
    style: edgeStyle,
  },
  {
    id: "e-chat-router",
    source: "chat",
    target: "router",
    type: "smoothstep",
    animated: true,
    label: "SSE / WebSocket",
    labelStyle: { fontSize: 11, fontWeight: 500, fill: "var(--gray-11)" },
    labelBgStyle: { fill: "var(--gray-1)", fillOpacity: 0.9 },
    labelBgPadding: [6, 4] as [number, number],
    labelBgBorderRadius: 4,
    style: edgeStyle,
  },
  {
    id: "e-recs-router",
    source: "recs",
    target: "router",
    type: "smoothstep",
    animated: true,
    style: edgeStyle,
  },
];

/* ── Component ─────────────────────────────────────────────── */

export function ArchitectureDiagram() {
  return (
    <div style={{ height: 420, marginBottom: 24 }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.5}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        />
      </ReactFlowProvider>
    </div>
  );
}

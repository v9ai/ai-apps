"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  Handle,
  Position,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/* ── Heading parser ─────────────────────────────────────────────── */

interface Section {
  text: string;
  id: string;
  childCount: number;
}

function parseSections(md: string): Section[] {
  const sections: Section[] = [];
  const lines = md.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+)$/);
    if (!m) continue;
    const text = m[1].replace(/[*_`]/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Count ### children until next ##
    let childCount = 0;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^##\s/.test(lines[j])) break;
      if (/^###\s/.test(lines[j])) childCount++;
    }

    sections.push({ text, id, childCount });
  }

  return sections;
}

/* ── Custom node ────────────────────────────────────────────────── */

type RoadmapNodeData = {
  label: string;
  headingId: string;
  childCount: number;
  index: number;
};

function SectionNode({ data }: NodeProps<Node<RoadmapNodeData>>) {
  return (
    <div className="roadmap-node roadmap-node--main" data-heading-id={data.headingId}>
      <Handle type="target" position={Position.Left} className="roadmap-handle" />
      <Handle type="target" position={Position.Top} className="roadmap-handle" id="top" />
      <div className="roadmap-node__inner">
        <span className="roadmap-node__index">{data.index}</span>
        <span className="roadmap-node__label">{data.label}</span>
        {data.childCount > 0 && (
          <span className="roadmap-node__count">{data.childCount} topics</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="roadmap-handle" />
      <Handle type="source" position={Position.Bottom} className="roadmap-handle" id="bottom" />
    </div>
  );
}

const nodeTypes: NodeTypes = { section: SectionNode };

/* ── Layout: S-curve roadmap ────────────────────────────────────── */

const NODE_W = 220;
const NODE_H = 72;
const X_GAP = 60;
const Y_GAP = 100;
const COLS = 5;

function buildGraph(sections: Section[]): { nodes: Node<RoadmapNodeData>[]; edges: Edge[] } {
  const nodes: Node<RoadmapNodeData>[] = [];
  const edges: Edge[] = [];

  if (sections.length === 0) return { nodes, edges };

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const row = Math.floor(i / COLS);
    const colInRow = i % COLS;
    // Reverse direction on odd rows for S-curve
    const col = row % 2 === 0 ? colInRow : COLS - 1 - colInRow;
    const x = col * (NODE_W + X_GAP);
    const y = row * (NODE_H + Y_GAP);

    nodes.push({
      id: s.id,
      type: "section",
      position: { x, y },
      data: { label: s.text, headingId: s.id, childCount: s.childCount, index: i + 1 },
      style: { width: NODE_W },
    });

    if (i > 0) {
      const prevRow = Math.floor((i - 1) / COLS);
      const currRow = row;
      const isRowChange = currRow !== prevRow;

      edges.push({
        id: `e-${i}`,
        source: sections[i - 1].id,
        target: s.id,
        type: "smoothstep",
        sourceHandle: isRowChange ? "bottom" : undefined,
        targetHandle: isRowChange ? "top" : undefined,
        style: { stroke: "var(--violet-7)", strokeWidth: 2 },
        animated: false,
      });
    }
  }

  return { nodes, edges };
}

/* ── Flow wrapper ───────────────────────────────────────────────── */

function FlowInner({ nodes, edges }: { nodes: Node<RoadmapNodeData>[]; edges: Edge[] }) {
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<RoadmapNodeData>) => {
      const id = node.data.headingId;
      // Match headings by slugified text content
      const headings = document.querySelectorAll(
        ".interview-prep-md h1, .interview-prep-md h2, .interview-prep-md h3, .interview-prep-md h4, .interview-prep-md [class*='rt-Heading']",
      );
      for (const el of headings) {
        const elId = (el.textContent || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        if (elId === id) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add("roadmap-highlight");
          setTimeout(() => el.classList.remove("roadmap-highlight"), 1500);
          return;
        }
      }
    },
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.4}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
      panOnScroll
      zoomOnScroll={false}
      zoomOnPinch
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      className="roadmap-flow"
    />
  );
}

/* ── Exported component ─────────────────────────────────────────── */

export function StudyRoadmap({ markdown }: { markdown: string }) {
  const sections = useMemo(() => parseSections(markdown), [markdown]);
  const { nodes, edges } = useMemo(() => buildGraph(sections), [sections]);

  if (nodes.length < 2) return null;

  const rows = Math.ceil(sections.length / COLS);
  const height = Math.min(rows * (NODE_H + Y_GAP) + 60, 500);

  return (
    <div className="roadmap-container" style={{ height }}>
      <ReactFlowProvider>
        <FlowInner nodes={nodes} edges={edges} />
      </ReactFlowProvider>
    </div>
  );
}

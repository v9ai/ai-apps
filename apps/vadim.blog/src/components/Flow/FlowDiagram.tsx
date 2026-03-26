import React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export interface FlowDiagramProps {
  nodes: Node[];
  edges: Edge[];
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  height?: number;
  fitView?: boolean;
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
}

export default function FlowDiagram({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  height = 400,
  fitView = true,
  showMiniMap = false,
  showControls = true,
  showBackground = true,
}: FlowDiagramProps) {
  return (
    <div style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={fitView}
        colorMode="dark"
      >
        {showBackground && <Background />}
        {showControls && <Controls />}
        {showMiniMap && <MiniMap />}
      </ReactFlow>
    </div>
  );
}

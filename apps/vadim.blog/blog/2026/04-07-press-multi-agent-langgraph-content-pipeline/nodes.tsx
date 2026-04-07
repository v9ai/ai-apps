import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const handleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  background: 'rgba(255,255,255,0.3)',
  border: 'none',
};

function AllHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="t" style={handleStyle} />
      <Handle type="target" position={Position.Left} id="l" style={handleStyle} />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
      <Handle type="source" position={Position.Right} id="r" style={handleStyle} />
    </>
  );
}

const base: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.15)',
  fontSize: 12,
  lineHeight: 1.5,
  minWidth: 130,
  textAlign: 'center',
  color: '#f1f5f9',
  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  whiteSpace: 'pre-line',
};

/** Slate — pipeline entry / routing */
export function RouterNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#334155', borderColor: '#64748b' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Blue — research / data gathering */
export function ResearchNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#1d4ed8' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Purple — LLM agent nodes */
export function AgentNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#6d28d9' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Teal — quality / validation */
export function QualityNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#0f766e', borderRadius: 20 }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Amber — conditional routing */
export function DecisionNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#92400e', borderRadius: 20, borderColor: '#f59e0b' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Green — output / publish */
export function OutputNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#15803d' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Red — DeepSeek model */
export function ModelNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#991b1b', borderColor: '#ef4444' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Indigo — metric/eval */
export function MetricNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#3730a3' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

export const nodeTypes = {
  router: RouterNode,
  research: ResearchNode,
  agent: AgentNode,
  quality: QualityNode,
  decision: DecisionNode,
  output: OutputNode,
  model: ModelNode,
  metric: MetricNode,
};

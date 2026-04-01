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

/** Blue — data sources & ingestion */
export function SourceNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#1d4ed8' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Purple — ML models & training */
export function ModelNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#6d28d9' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Teal — signal types (pill shape) */
export function SignalNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#0f766e', borderRadius: 20 }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Amber — metrics, scores, outputs */
export function MetricNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#92400e' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Slate dashed — data stores */
export function StoreNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#1e293b', borderStyle: 'dashed', borderColor: 'rgba(148,163,184,0.45)' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Dark monospace — formulas & code */
export function FormulaNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#0c0a09', fontFamily: 'var(--ifm-font-family-monospace)', fontSize: 11 }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Red — Rust / production inference */
export function RustNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#991b1b', border: '2px solid #dc2626' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Green — output / result */
export function OutputNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#15803d', border: '2px solid #22c55e' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

export const nodeTypes = {
  source: SourceNode,
  model: ModelNode,
  signal: SignalNode,
  metric: MetricNode,
  store: StoreNode,
  formula: FormulaNode,
  rust: RustNode,
  output: OutputNode,
};

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
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.15)',
  fontSize: 12,
  lineHeight: 1.5,
  minWidth: 140,
  textAlign: 'center',
  color: '#f1f5f9',
  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  whiteSpace: 'pre-line',
};

/** Blue — input/output page states */
export function StateNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#1d4ed8' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Purple — neural network components */
export function ModelNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#6d28d9' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Teal pill — latent representations φ */
export function LatentNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#0f766e', borderRadius: 20, fontStyle: 'italic' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Amber — output metrics, rewards, loss values */
export function MetricNode({ data }: NodeProps) {
  return (
    <div style={{ ...base, background: '#92400e' }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

const GOAL_COLORS = [
  '#15803d', // level 0 — homepage (green)
  '#2a7e3b', // level 1 — listing
  '#4d7c0f', // level 2 — company
  '#a16207', // level 3 — team
  '#c2410c', // level 4 — about
  '#b91c1c', // level 5 — contact
  '#7f1d1d', // level 6 — lead (dark red)
];

/** Green→Red gradient by data.level (0–6) — curriculum goals */
export function GoalNode({ data }: NodeProps) {
  const level = typeof data.level === 'number' ? data.level : 0;
  return (
    <div style={{ ...base, background: GOAL_COLORS[Math.min(level, GOAL_COLORS.length - 1)] }}>
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Slate dashed border — data stores (SQLite, replay buffers) */
export function StoreNode({ data }: NodeProps) {
  return (
    <div
      style={{
        ...base,
        background: '#1e293b',
        borderStyle: 'dashed',
        borderColor: 'rgba(148,163,184,0.45)',
      }}
    >
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

/** Dark monospace — mathematical formulas */
export function FormulaNode({ data }: NodeProps) {
  return (
    <div
      style={{
        ...base,
        background: '#0c0a09',
        fontFamily: 'var(--ifm-font-family-monospace)',
        fontSize: 11,
      }}
    >
      <AllHandles />
      {String(data.label)}
    </div>
  );
}

export const nodeTypes = {
  state: StateNode,
  model: ModelNode,
  latent: LatentNode,
  metric: MetricNode,
  goal: GoalNode,
  store: StoreNode,
  formula: FormulaNode,
};

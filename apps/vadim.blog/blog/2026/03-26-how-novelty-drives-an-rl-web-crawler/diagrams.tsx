import React from 'react';
import Flow from '@site/src/components/Flow';
import { nodeTypes } from './nodes';
import type { Node, Edge } from '@xyflow/react';

const edgeLabelStyle = { fill: '#94a3b8', fontSize: 11 };
const edgeLabelBgStyle = { fill: '#1e293b', fillOpacity: 0.85 };

// ─── 1. Intrinsic Curiosity Module ──────────────────────────────────────────

export function ICMDiagram() {
  const nodes: Node[] = [
    { id: 'st',   type: 'state',  position: { x: 20,  y: 30  }, data: { label: 'State s_t\n(784-d)' } },
    { id: 'at',   type: 'state',  position: { x: 240, y: 150 }, data: { label: 'Action a_t' } },
    { id: 'st1',  type: 'state',  position: { x: 460, y: 30  }, data: { label: 'State s_{t+1}\n(784-d)' } },
    { id: 'enc1', type: 'model',  position: { x: 20,  y: 150 }, data: { label: 'FeatureEncoder' } },
    { id: 'enc2', type: 'model',  position: { x: 460, y: 150 }, data: { label: 'FeatureEncoder' } },
    { id: 'phi1', type: 'latent', position: { x: 20,  y: 270 }, data: { label: 'φ(s_t) — 256-d' } },
    { id: 'phi2', type: 'latent', position: { x: 460, y: 270 }, data: { label: 'φ(s_{t+1}) — 256-d' } },
    { id: 'fwd',  type: 'model',  position: { x: 100, y: 390 }, data: { label: 'ForwardModel' } },
    { id: 'inv',  type: 'model',  position: { x: 360, y: 390 }, data: { label: 'InverseModel\n(regularizer)' } },
    { id: 'mse',  type: 'metric', position: { x: 100, y: 510 }, data: { label: 'MSE → r_intrinsic\n(capped at 5.0)' } },
    { id: 'pred', type: 'metric', position: { x: 360, y: 510 }, data: { label: 'Predicted Action\n(noise filter)' } },
  ];

  const edges: Edge[] = [
    { id: 'e1',  source: 'st',   target: 'enc1' },
    { id: 'e2',  source: 'st1',  target: 'enc2' },
    { id: 'e3',  source: 'enc1', target: 'phi1' },
    { id: 'e4',  source: 'enc2', target: 'phi2' },
    { id: 'e5',  source: 'phi1', target: 'fwd' },
    { id: 'e6',  source: 'at',   target: 'fwd' },
    { id: 'e7',  source: 'fwd',  target: 'mse' },
    {
      id: 'e8', source: 'phi2', target: 'mse',
      label: 'compare', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle,
    },
    { id: 'e9',  source: 'phi1', target: 'inv' },
    { id: 'e10', source: 'phi2', target: 'inv' },
    { id: 'e11', source: 'inv',  target: 'pred' },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={580} />;
}

// ─── 2. Ensemble World Model + DynaTrainer ───────────────────────────────────

export function WorldModelDiagram() {
  const nodes: Node[] = [
    { id: 'input',    type: 'state',  position: { x: 220, y: 0   }, data: { label: 'State-Action Pair\n(s_t, a_t)' } },
    { id: 'net1',     type: 'model',  position: { x: 0,   y: 120 }, data: { label: 'Ensemble\nNet 1' } },
    { id: 'net2',     type: 'model',  position: { x: 120, y: 120 }, data: { label: 'Ensemble\nNet 2' } },
    { id: 'net3',     type: 'model',  position: { x: 240, y: 120 }, data: { label: 'Ensemble\nNet 3' } },
    { id: 'net4',     type: 'model',  position: { x: 360, y: 120 }, data: { label: 'Ensemble\nNet 4' } },
    { id: 'net5',     type: 'model',  position: { x: 480, y: 120 }, data: { label: 'Ensemble\nNet 5' } },
    { id: 'variance', type: 'metric', position: { x: 170, y: 260 }, data: { label: 'Ensemble Variance σ²\n→ Novelty Signal' } },
    { id: 'llm',      type: 'model',  position: { x: 460, y: 260 }, data: { label: 'LLM Planner\n(DeepSeek 3B / MLX)' } },
    { id: 'dyna',     type: 'store',  position: { x: 20,  y: 380 }, data: { label: 'DynaTrainer\n(Dyna-Q)' } },
    { id: 'tree',     type: 'model',  position: { x: 350, y: 380 }, data: { label: 'TreeSearchPlanner\n(high-σ branches)' } },
    { id: 'synth',    type: 'metric', position: { x: 20,  y: 500 }, data: { label: 'Synthetic Transitions\nratio ≤ 0.5 → DQN' } },
    { id: 'branches', type: 'goal',   position: { x: 350, y: 500 }, data: { label: 'Prioritised\nExploration Paths', level: 3 } },
  ];

  const edges: Edge[] = [
    { id: 'i1', source: 'input', target: 'net1' },
    { id: 'i2', source: 'input', target: 'net2' },
    { id: 'i3', source: 'input', target: 'net3' },
    { id: 'i4', source: 'input', target: 'net4' },
    { id: 'i5', source: 'input', target: 'net5' },
    { id: 'v1', source: 'net1',  target: 'variance' },
    { id: 'v2', source: 'net2',  target: 'variance' },
    { id: 'v3', source: 'net3',  target: 'variance' },
    { id: 'v4', source: 'net4',  target: 'variance' },
    { id: 'v5', source: 'net5',  target: 'variance' },
    { id: 'd1', source: 'variance', target: 'dyna' },
    { id: 'd2', source: 'variance', target: 'tree' },
    { id: 'l1', source: 'llm',      target: 'tree',
      label: 'semantic\nlookahead', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 's1', source: 'dyna',  target: 'synth',
      label: 'ratio ≤ 0.5', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 's2', source: 'tree',  target: 'branches' },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={570} />;
}

// ─── 3. DISCOVER Auto-Curriculum ────────────────────────────────────────────

export function DiscoverDiagram() {
  const goals: Node[] = [0, 1, 2, 3, 4, 5, 6].map((level, i) => ({
    id: `g${level}`,
    type: 'goal',
    position: { x: i * 110, y: 0 },
    data: {
      label: ['Homepage', 'Listing', 'Company', 'Team', 'About', 'Contact', 'Lead ★'][level],
      level,
    },
  }));

  const nodes: Node[] = [
    ...goals,
    { id: 'achieved', type: 'store',   position: { x: 230, y: 140 }, data: { label: 'AchievedGoalSet\n(SQLite + KNN)' } },
    { id: 'alpha',    type: 'metric',  position: { x: 540, y: 230 }, data: { label: 'Adaptive α\n(targets 50% success)' } },
    { id: 'algo',     type: 'formula', position: { x: 160, y: 260 }, data: { label: 'α·(V+β·σ) + (1-α)·(V*+β·σ*)' } },
    { id: 'next',     type: 'goal',    position: { x: 280, y: 380 }, data: { label: 'Selected Goal g\n→ DQN target', level: 3 } },
  ];

  const goalEdges: Edge[] = [0, 1, 2, 3, 4, 5].map((i) => ({
    id: `h${i}`,
    source: `g${i}`,
    target: `g${i + 1}`,
    sourceHandle: 'r',
    targetHandle: 'l',
    animated: true,
  }));

  const edges: Edge[] = [
    ...goalEdges,
    { id: 'e1', source: 'g3',      target: 'achieved',
      label: 'success', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e2', source: 'achieved', target: 'algo' },
    { id: 'e3', source: 'alpha',    target: 'algo' },
    { id: 'e4', source: 'algo',     target: 'next' },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={450} />;
}

// ─── 4. Multi-Timescale Orchestration ───────────────────────────────────────

export function OrchestrationDiagram() {
  const nodes: Node[] = [
    { id: 'trans', type: 'metric', position: { x: 210, y: 0   }, data: { label: 'Page Transition\n(s_t, a_t, s_{t+1}, r_ext)' } },
    { id: 'icm',   type: 'model',  position: { x: 0,   y: 140 }, data: { label: 'ICM\n(Per-Step)' } },
    { id: 'wm',    type: 'model',  position: { x: 210, y: 140 }, data: { label: 'World Model\n(Per-Episode)' } },
    { id: 'disc',  type: 'model',  position: { x: 430, y: 140 }, data: { label: 'DISCOVER\n(Cross-Episode)' } },
    { id: 'rcur',  type: 'metric', position: { x: 0,   y: 290 }, data: { label: 'r_curiosity\n(dense signal)' } },
    { id: 'synth', type: 'store',  position: { x: 200, y: 290 }, data: { label: 'Synthetic Transitions\n(ratio ≤ 0.5)' } },
    { id: 'goal',  type: 'goal',   position: { x: 430, y: 290 }, data: { label: 'Intermediate\nGoal g', level: 3 } },
    { id: 'dqn',   type: 'model',  position: { x: 175, y: 430 }, data: { label: 'DQN Policy\nr_total = r_ext + 0.1·r_cur' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'trans', target: 'icm',   animated: true },
    { id: 'e2', source: 'trans', target: 'wm',    animated: true },
    { id: 'e3', source: 'trans', target: 'disc',  animated: true },
    { id: 'e4', source: 'icm',   target: 'rcur' },
    { id: 'e5', source: 'wm',    target: 'synth' },
    { id: 'e6', source: 'disc',  target: 'goal' },
    { id: 'e7', source: 'rcur',  target: 'dqn' },
    { id: 'e8', source: 'synth', target: 'dqn' },
    { id: 'e9', source: 'goal',  target: 'dqn' },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={500} />;
}

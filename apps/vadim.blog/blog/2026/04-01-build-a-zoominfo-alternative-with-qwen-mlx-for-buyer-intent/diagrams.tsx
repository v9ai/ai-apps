import React from 'react';
import Flow from '@site/src/components/Flow';
import { nodeTypes } from './nodes';
import type { Node, Edge } from '@xyflow/react';

const edgeLabelStyle = { fill: '#94a3b8', fontSize: 11 };
const edgeLabelBgStyle = { fill: '#1e293b', fillOpacity: 0.85 };

// ── Diagram 1: End-to-End Pipeline ────────────────────────────

export function PipelineDiagram() {
  const nodes: Node[] = [
    { id: 'ats',      type: 'source', position: { x: 0,   y: 0   }, data: { label: 'Greenhouse ATS\n435 job postings' } },
    { id: 'neon',     type: 'store',  position: { x: 0,   y: 110 }, data: { label: 'Neon PostgreSQL\nsnapshots + posts' } },
    { id: 'export',   type: 'source', position: { x: 200, y: 50  }, data: { label: 'Label Export\n460 train examples' } },
    { id: 'lora',     type: 'model',  position: { x: 420, y: 0   }, data: { label: 'MLX LoRA\nQwen2.5-3B-4bit\nrank 8 · 15M params' } },
    { id: 'serve',    type: 'model',  position: { x: 420, y: 130 }, data: { label: 'mlx_lm.server\nlocalhost:8080' } },
    { id: 'distill',  type: 'model',  position: { x: 660, y: 0   }, data: { label: 'Distillation\n3B → 6 regressors\n60 weights + 6 biases' } },
    { id: 'rust',     type: 'rust',   position: { x: 660, y: 130 }, data: { label: 'Rust IntentClassifier\nSIMD · 256 batch' } },
    { id: 'scores',   type: 'output', position: { x: 880, y: 60  }, data: { label: 'Intent Scores\n0-100 per company' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'ats',    target: 'export', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e2', source: 'neon',   target: 'export', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e3', source: 'export', target: 'lora',   sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#8b5cf6' }, label: 'JSONL', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e4', source: 'lora',   target: 'serve',  sourceHandle: 'b', targetHandle: 't', style: { stroke: '#8b5cf6' }, label: 'adapter', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e5', source: 'lora',   target: 'distill', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#8b5cf6' }, label: 'fine-tuned', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e6', source: 'distill', target: 'rust',  sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#dc2626' }, label: 'JSON weights', labelStyle: { fill: '#f87171', fontSize: 11 }, labelBgStyle: edgeLabelBgStyle },
    { id: 'e7', source: 'rust',   target: 'scores', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#22c55e' } },
    { id: 'e8', source: 'serve',  target: 'scores', sourceHandle: 'r', targetHandle: 'l', style: { stroke: '#22c55e', strokeDasharray: '5,5' }, label: 'fallback', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={300} />;
}

// ── Diagram 2: Six Signal Types ───────────────────────────────

export function SignalsDiagram() {
  const signals = [
    { id: 'hiring',     label: 'hiring_intent\n30% · 30d decay',     x: 0,   y: 0   },
    { id: 'growth',     label: 'growth_signal\n25% · 45d decay',     x: 220, y: 0   },
    { id: 'tech',       label: 'tech_adoption\n20% · 60d decay',     x: 440, y: 0   },
    { id: 'budget',     label: 'budget_cycle\n15% · 90d decay',      x: 0,   y: 100 },
    { id: 'leadership', label: 'leadership_change\n5% · 60d decay',  x: 220, y: 100 },
    { id: 'product',    label: 'product_launch\n5% · 30d decay',     x: 440, y: 100 },
  ];

  const nodes: Node[] = [
    ...signals.map(s => ({
      id: s.id, type: 'signal' as const, position: { x: s.x, y: s.y }, data: { label: s.label },
    })),
    { id: 'decay',  type: 'formula', position: { x: 130, y: 220 }, data: { label: 'freshness = conf × e^(-0.693/half_life × days)' } },
    { id: 'agg',    type: 'metric',  position: { x: 430, y: 220 }, data: { label: 'Weighted Sum\n→ Score 0-100' } },
    { id: 'result', type: 'output',  position: { x: 630, y: 220 }, data: { label: 'Intent\nRanking' } },
  ];

  const edges: Edge[] = [
    ...signals.map(s => ({
      id: `e-${s.id}`, source: s.id, target: 'decay', sourceHandle: 'b', targetHandle: 't',
      animated: true, style: { stroke: '#14b8a6' },
    })),
    { id: 'e-agg', source: 'decay', target: 'agg', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#f59e0b' }, label: 'decayed scores', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e-out', source: 'agg', target: 'result', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#22c55e' } },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={360} />;
}

// ── Diagram 3: Distillation Architecture ──────────────────────

export function DistillDiagram() {
  const features = [
    'kw: hiring',
    'kw: tech',
    'kw: growth',
    'kw: budget',
    'kw: leader',
    'kw: product',
    'text length',
    'has URLs',
    'source type',
    'entity density',
  ];

  const nodes: Node[] = [
    { id: 'qwen',     type: 'model',   position: { x: 220, y: 0   }, data: { label: 'Qwen2.5-3B\n3,085M parameters' } },
    { id: 'lora',     type: 'model',   position: { x: 220, y: 90  }, data: { label: 'LoRA Adapter\n14.97M params (0.48%)' } },
    { id: 'labeled',  type: 'store',   position: { x: 220, y: 180 }, data: { label: 'Labeled Training Data\n460 examples' } },
    ...features.map((f, i) => ({
      id: `f${i}`, type: 'formula' as const,
      position: { x: (i % 5) * 120, y: 280 + Math.floor(i / 5) * 50 },
      data: { label: f },
    })),
    { id: 'lr0', type: 'metric', position: { x: 0,   y: 410 }, data: { label: 'LR: hiring' } },
    { id: 'lr1', type: 'metric', position: { x: 120, y: 410 }, data: { label: 'LR: tech' } },
    { id: 'lr2', type: 'metric', position: { x: 240, y: 410 }, data: { label: 'LR: growth' } },
    { id: 'lr3', type: 'metric', position: { x: 360, y: 410 }, data: { label: 'LR: budget' } },
    { id: 'lr4', type: 'metric', position: { x: 120, y: 480 }, data: { label: 'LR: leader' } },
    { id: 'lr5', type: 'metric', position: { x: 240, y: 480 }, data: { label: 'LR: product' } },
    { id: 'json',   type: 'rust',   position: { x: 160, y: 560 }, data: { label: '66 floats → JSON\nRust IntentClassifier' } },
  ];

  const edges: Edge[] = [
    { id: 'eq1', source: 'qwen', target: 'lora', sourceHandle: 'b', targetHandle: 't', style: { stroke: '#8b5cf6' } },
    { id: 'eq2', source: 'lora', target: 'labeled', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#8b5cf6' }, label: 'generate labels', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    ...features.map((_, i) => ({
      id: `ef${i}`, source: 'labeled', target: `f${i}`, sourceHandle: 'b', targetHandle: 't',
      style: { stroke: '#334155' },
    })),
    ...[0,1,2,3,4,5].map(i => ({
      id: `elr${i}`, source: `f${i}`, target: `lr${i}`, sourceHandle: 'b', targetHandle: 't',
      animated: true, style: { stroke: '#f59e0b' },
    })),
    ...[0,1,2,3,4,5].map(i => ({
      id: `ej${i}`, source: `lr${i}`, target: 'json', sourceHandle: 'b', targetHandle: 't',
      style: { stroke: '#dc2626' },
    })),
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={650} />;
}

// ── Diagram 4: Rust SIMD Batch Scoring ────────────────────────

export function ScoringDiagram() {
  const nodes: Node[] = [
    { id: 'texts',   type: 'source',  position: { x: 0,   y: 40  }, data: { label: 'Company Texts\nsnapshots + posts' } },
    { id: 'feat',    type: 'formula', position: { x: 190, y: 40  }, data: { label: 'extract_features()\n10-element vector' } },
    { id: 'clf',     type: 'rust',   position: { x: 400, y: 0   }, data: { label: 'IntentClassifier\nσ(w·x + b) per signal' } },
    { id: 'batch',   type: 'rust',   position: { x: 400, y: 110 }, data: { label: 'IntentBatch [256]\n#[repr(C, align(64))]' } },
    { id: 'decay',   type: 'formula', position: { x: 620, y: 0   }, data: { label: 'signal_freshness()\ne^(-ln2/T × days)' } },
    { id: 'weight',  type: 'metric', position: { x: 620, y: 110 }, data: { label: 'compute_scores()\nweighted dot product' } },
    { id: 'topk',    type: 'output', position: { x: 830, y: 50  }, data: { label: 'top_k()\nhot prospects' } },
  ];

  const edges: Edge[] = [
    { id: 's1', source: 'texts', target: 'feat', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#3b82f6' } },
    { id: 's2', source: 'feat',  target: 'clf',  sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#dc2626' }, label: '[f32; 10]', labelStyle: { fill: '#f87171', fontSize: 10 }, labelBgStyle: edgeLabelBgStyle },
    { id: 's3', source: 'clf',   target: 'batch', sourceHandle: 'b', targetHandle: 't', style: { stroke: '#dc2626' }, label: 'max per category', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 's4', source: 'batch', target: 'decay', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#dc2626' } },
    { id: 's5', source: 'decay', target: 'weight', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#f59e0b' } },
    { id: 's6', source: 'batch', target: 'weight', sourceHandle: 'r', targetHandle: 'l', style: { stroke: '#dc2626', strokeDasharray: '5,5' } },
    { id: 's7', source: 'weight', target: 'topk', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#22c55e' }, label: '0-100', labelStyle: { fill: '#22c55e', fontSize: 11 }, labelBgStyle: edgeLabelBgStyle },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={260} />;
}

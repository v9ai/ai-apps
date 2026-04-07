import React from 'react';
import Flow from '@site/src/components/Flow';
import { nodeTypes } from './nodes';
import type { Node, Edge } from '@xyflow/react';

const edgeLabelStyle = { fill: '#94a3b8', fontSize: 11 };
const edgeLabelBgStyle = { fill: '#1e293b', fillOpacity: 0.85 };

// ── Diagram 1: Orchestrator routing ─────────────────────────

export function OrchestratorDiagram() {
  const nodes: Node[] = [
    { id: 'start',    type: 'router',   position: { x: 300, y: 0   }, data: { label: 'START\nroute_pipeline' } },
    { id: 'article',  type: 'agent',    position: { x: 0,   y: 120 }, data: { label: 'Article\n1200-3500w' } },
    { id: 'blog',     type: 'agent',    position: { x: 200, y: 120 }, data: { label: 'Blog\ntopic discovery' } },
    { id: 'counter',  type: 'agent',    position: { x: 400, y: 120 }, data: { label: 'Counter\nrebuttal' } },
    { id: 'review',   type: 'agent',    position: { x: 600, y: 120 }, data: { label: 'Review\nquality eval' } },
    { id: 'end',      type: 'output',   position: { x: 300, y: 250 }, data: { label: 'END' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'article', sourceHandle: 'b', targetHandle: 't', style: { stroke: '#8b5cf6' }, label: 'article', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e2', source: 'start', target: 'blog',    sourceHandle: 'b', targetHandle: 't', style: { stroke: '#8b5cf6' }, label: 'blog', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e3', source: 'start', target: 'counter', sourceHandle: 'b', targetHandle: 't', style: { stroke: '#8b5cf6' }, label: 'counter', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e4', source: 'start', target: 'review',  sourceHandle: 'b', targetHandle: 't', style: { stroke: '#8b5cf6' }, label: 'review', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e5', source: 'article', target: 'end', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#22c55e' } },
    { id: 'e6', source: 'blog',    target: 'end', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#22c55e' } },
    { id: 'e7', source: 'counter', target: 'end', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#22c55e' } },
    { id: 'e8', source: 'review',  target: 'end', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#22c55e' } },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={340} />;
}

// ── Diagram 2: Article pipeline ──────────────────────────────

export function ArticlePipelineDiagram() {
  const nodes: Node[] = [
    { id: 'read',     type: 'router',   position: { x: 0,   y: 0   }, data: { label: 'read_source\n(deep-dive only)' } },
    { id: 'research', type: 'research', position: { x: 200, y: 0   }, data: { label: 'research_and_seo\n4 APIs + 16 editorial' } },
    { id: 'write',    type: 'agent',    position: { x: 440, y: 0   }, data: { label: 'write\nDeepSeek Reasoner' } },
    { id: 'xyflow',   type: 'agent',    position: { x: 640, y: 0   }, data: { label: 'xyflow\ndiagram gen' } },
    { id: 'refs',     type: 'quality',  position: { x: 440, y: 120 }, data: { label: 'check_references\nHTTP + anchor + tier' } },
    { id: 'edit',     type: 'agent',    position: { x: 640, y: 120 }, data: { label: 'edit\n5-pass review' } },
    { id: 'decide',   type: 'decision', position: { x: 440, y: 240 }, data: { label: 'APPROVE?' } },
    { id: 'publish',  type: 'output',   position: { x: 640, y: 240 }, data: { label: 'publish\ngit + Vercel' } },
    { id: 'revise',   type: 'agent',    position: { x: 200, y: 240 }, data: { label: 'revise\n(max 1 round)' } },
    { id: 'save',     type: 'output',   position: { x: 200, y: 340 }, data: { label: 'save_final\n(needs manual edit)' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'read',    target: 'research', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e2', source: 'research', target: 'write',   sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#3b82f6' }, label: 'brief + SEO', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e3', source: 'write',   target: 'xyflow',   sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#8b5cf6' } },
    { id: 'e4', source: 'xyflow',  target: 'refs',     sourceHandle: 'b', targetHandle: 'r', animated: true, style: { stroke: '#8b5cf6' } },
    { id: 'e5', source: 'refs',    target: 'edit',     sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#14b8a6' }, label: 'report', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e6', source: 'edit',    target: 'decide',   sourceHandle: 'b', targetHandle: 'r', style: { stroke: '#f59e0b' } },
    { id: 'e7', source: 'decide',  target: 'publish',  sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#22c55e' }, label: 'approved', labelStyle: { fill: '#4ade80', fontSize: 11 }, labelBgStyle: edgeLabelBgStyle },
    { id: 'e8', source: 'decide',  target: 'revise',   sourceHandle: 'l', targetHandle: 'r', style: { stroke: '#f59e0b' }, label: 'revise (r<1)', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e9', source: 'decide',  target: 'save',     sourceHandle: 'b', targetHandle: 't', style: { stroke: '#ef4444', strokeDasharray: '5,5' }, label: 'r>=1', labelStyle: { fill: '#f87171', fontSize: 11 }, labelBgStyle: edgeLabelBgStyle },
    { id: 'e10', source: 'revise', target: 'refs',     sourceHandle: 't', targetHandle: 'l', animated: true, style: { stroke: '#f59e0b' }, label: 'retry', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={430} />;
}

// ── Diagram 3: Research fan-out ──────────────────────────────

export function ResearchDiagram() {
  const nodes: Node[] = [
    { id: 'query',    type: 'router',   position: { x: 280, y: 0   }, data: { label: 'Query Expansion\noriginal + 4-word variant' } },
    { id: 'scholar',  type: 'research', position: { x: 0,   y: 110 }, data: { label: 'Semantic Scholar\n15 results' } },
    { id: 'openalex', type: 'research', position: { x: 180, y: 110 }, data: { label: 'OpenAlex\n10 results' } },
    { id: 'crossref', type: 'research', position: { x: 360, y: 110 }, data: { label: 'Crossref\n10 results' } },
    { id: 'core',     type: 'research', position: { x: 540, y: 110 }, data: { label: 'CORE\n10 results' } },
    { id: 'dedup',    type: 'quality',  position: { x: 180, y: 230 }, data: { label: 'Dedup + Rank\ntitle/DOI + recency boost' } },
    { id: 'editorial',type: 'research', position: { x: 450, y: 230 }, data: { label: 'Editorial Sources\n16 publications' } },
    { id: 'synth',    type: 'agent',    position: { x: 280, y: 340 }, data: { label: 'Researcher Agent\nDeepSeek Reasoner\nsynthesis' } },
    { id: 'brief',    type: 'output',   position: { x: 280, y: 460 }, data: { label: 'Research Brief' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'query',   target: 'scholar',  sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e2', source: 'query',   target: 'openalex', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e3', source: 'query',   target: 'crossref', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e4', source: 'query',   target: 'core',     sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e5', source: 'scholar',  target: 'dedup', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#14b8a6' } },
    { id: 'e6', source: 'openalex', target: 'dedup', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#14b8a6' } },
    { id: 'e7', source: 'crossref', target: 'dedup', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#14b8a6' } },
    { id: 'e8', source: 'core',     target: 'dedup', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#14b8a6' } },
    { id: 'e9',  source: 'dedup',     target: 'synth', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#8b5cf6' }, label: 'top 10', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
    { id: 'e10', source: 'editorial', target: 'synth', sourceHandle: 'b', targetHandle: 'r', animated: true, style: { stroke: '#8b5cf6' } },
    { id: 'e11', source: 'synth',     target: 'brief', sourceHandle: 'b', targetHandle: 't', animated: true, style: { stroke: '#22c55e' } },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={550} />;
}

// ── Diagram 4: Seven eval metrics ────────────────────────────

export function EvalsDiagram() {
  const metrics = [
    { id: 'src',   label: 'source_citation\nmin 0.70',    x: 0,   y: 0   },
    { id: 'hall',  label: 'anti_hallucination\nmin 0.70',  x: 200, y: 0   },
    { id: 'writ',  label: 'writing_quality\nmin 0.60',     x: 400, y: 0   },
    { id: 'jour',  label: 'journalistic_standards\nmin 0.70', x: 600, y: 0 },
    { id: 'seo',   label: 'seo_alignment\nmin 0.60',       x: 0,   y: 100 },
    { id: 'struc', label: 'structural_completeness\nmin 0.70', x: 200, y: 100 },
    { id: 'lead',  label: 'lead_quality\nmin 0.60',        x: 400, y: 100 },
  ];

  const nodes: Node[] = [
    ...metrics.map(m => ({
      id: m.id, type: 'metric' as const, position: { x: m.x, y: m.y }, data: { label: m.label },
    })),
    { id: 'draft', type: 'router',  position: { x: 200, y: 220 }, data: { label: 'Article Draft\n+ research brief + SEO' } },
    { id: 'score', type: 'output',  position: { x: 480, y: 220 }, data: { label: 'Overall Score\nPASS / FAIL' } },
  ];

  const edges: Edge[] = [
    ...metrics.map(m => ({
      id: `e-${m.id}`, source: 'draft', target: m.id, sourceHandle: 't', targetHandle: 'b',
      style: { stroke: '#6366f1' },
    })),
    { id: 'e-score', source: 'draft', target: 'score', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#22c55e' }, label: 'avg(7 metrics)', labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBgStyle },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={320} />;
}

// ── Diagram 5: Review pipeline ───────────────────────────────

export function ReviewDiagram() {
  const nodes: Node[] = [
    { id: 'read',    type: 'router',   position: { x: 0,   y: 60  }, data: { label: 'read_files\ndraft + brief + seo' } },
    { id: 'refs',    type: 'quality',  position: { x: 200, y: 60  }, data: { label: 'check_references' } },
    { id: 'fit',     type: 'agent',    position: { x: 400, y: 0   }, data: { label: 'publication_fit\n20 publications' } },
    { id: 'evals',   type: 'metric',   position: { x: 400, y: 130 }, data: { label: 'run_evals\n7 GEval metrics' } },
    { id: 'editor',  type: 'agent',    position: { x: 600, y: 60  }, data: { label: 'editorial_review\nDeepSeek Reasoner' } },
    { id: 'report',  type: 'output',   position: { x: 800, y: 60  }, data: { label: 'synthesize_report' } },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'read',  target: 'refs',   sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#3b82f6' } },
    { id: 'e2', source: 'refs',  target: 'fit',    sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#14b8a6' } },
    { id: 'e3', source: 'refs',  target: 'evals',  sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#14b8a6' } },
    { id: 'e4', source: 'fit',   target: 'editor', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#8b5cf6' } },
    { id: 'e5', source: 'evals', target: 'editor', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#8b5cf6' } },
    { id: 'e6', source: 'editor', target: 'report', sourceHandle: 'r', targetHandle: 'l', animated: true, style: { stroke: '#22c55e' } },
  ];

  return <Flow nodes={nodes} edges={edges} nodeTypes={nodeTypes} height={220} />;
}

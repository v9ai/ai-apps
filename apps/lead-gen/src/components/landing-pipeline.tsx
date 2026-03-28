"use client";

import { css, cx } from "styled-system/css";
import { flex, grid, container } from "styled-system/patterns";
import { badge } from "@/recipes/badge";
import { pipelineCard, iconHolder } from "@/recipes/cards";
import {
  GearIcon,
  MagnifyingGlassIcon,
  ReaderIcon,
  LinkBreak2Icon,
  BarChartIcon,
  FileTextIcon,
  CheckCircledIcon,
  ArrowRightIcon,
} from "@radix-ui/react-icons";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StageData {
  icon: React.ReactElement;
  title: string;
  description: string;
  badge: string;
  step: string;
  accentOpacity: number;
  [key: string]: unknown;
}

// ── Pipeline stage definitions ─────────────────────────────────────────────────

const PIPELINE_STAGES: StageData[] = [
  {
    icon: <GearIcon width={20} height={20} />,
    title: "system overview",
    description:
      "SQLite WAL + LanceDB HNSW + ChromaDB hybrid storage in ~15 GB footprint",
    badge: "orchestrate",
    step: "00",
    accentOpacity: 0.15,
  },
  {
    icon: <MagnifyingGlassIcon width={20} height={20} />,
    title: "rl crawler",
    description:
      "DQN agent with 448-dim state + UCB1 multi-armed bandit explores 820 domains, achieving 3\u00D7 harvest rate",
    badge: "crawl",
    step: "01",
    accentOpacity: 0.3,
  },
  {
    icon: <ReaderIcon width={20} height={20} />,
    title: "ner extraction",
    description:
      "BERT-base-cased + spaCy + BERTopic extract entities at 92.3% F1, processing ~100 pages/sec",
    badge: "extract",
    step: "02",
    accentOpacity: 0.45,
  },
  {
    icon: <LinkBreak2Icon width={20} height={20} />,
    title: "entity resolution",
    description:
      "Siamese 128-dim embeddings with SQLite CTEs deduplicate in <1ms ANN queries",
    badge: "resolve",
    step: "03",
    accentOpacity: 0.6,
  },
  {
    icon: <BarChartIcon width={20} height={20} />,
    title: "lead scoring",
    description:
      "XGBoost 50% + LogReg 25% + RF 25% ensemble scores leads with 89.7% precision",
    badge: "score",
    step: "04",
    accentOpacity: 0.75,
  },
  {
    icon: <FileTextIcon width={20} height={20} />,
    title: "report generation",
    description:
      "Agentic Lead Gen's local LLM agent (Ollama) + SQLite/ChromaDB RAG generates reports with 97% factual accuracy in 10-30s",
    badge: "report",
    step: "05",
    accentOpacity: 0.9,
  },
  {
    icon: <CheckCircledIcon width={20} height={20} />,
    title: "evaluation",
    description:
      "SHAP explanations + cascade error tracking monitor pipeline health — keeping Agentic Lead Gen accurate at scale (CER ~0.15)",
    badge: "evaluate",
    step: "06",
    accentOpacity: 1,
  },
];

// ── Custom pipeline node ───────────────────────────────────────────────────────

function PipelineNode({ data }: { data: Record<string, unknown> }) {
  const stage = data as unknown as StageData;

  return (
    <div
      className={cx(pipelineCard(), "pipeline-card-hover")}
      style={{
        borderTop: `2px solid rgba(62, 99, 221, ${stage.accentOpacity})`,
        position: "relative",
        width: 220,
        minHeight: 110,
        boxSizing: "border-box",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      {/* step watermark */}
      <span
        className={css({
          fontSize: "3xl",
          fontWeight: "bold",
          lineHeight: "none",
          letterSpacing: "tighter",
          color: "ui.border",
          position: "absolute",
          top: "3",
          right: "4",
          userSelect: "none",
        })}
      >
        {stage.step}
      </span>

      <div className={flex({ align: "center", gap: "2", mb: "3" })}>
        <div className={iconHolder()}>{stage.icon}</div>
        <span className={badge({ variant: "pipeline" })}>{stage.badge}</span>
      </div>

      <p
        className={css({
          fontSize: "sm",
          fontWeight: "semibold",
          color: "ui.heading",
          textTransform: "lowercase",
          mb: "1",
        })}
      >
        {stage.title}
      </p>

      <p
        className={css({
          fontSize: "xs",
          color: "ui.secondary",
          lineHeight: "normal",
        })}
      >
        {stage.description}
      </p>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}

const nodeTypes = { pipelineNode: PipelineNode };

// ── Flow graph definition ──────────────────────────────────────────────────────
//
// DAG layout (top-to-bottom):
//
//        [00 system overview]       ← root
//               ↓
//         [01 rl crawler]
//               ↓
//        [02 ner extraction]
//               ↓
//      [03 entity resolution]       ← branch point
//          ↙         ↘
// [04 lead scoring]  [05 report gen]
//          ↘         ↙
//         [06 evaluation]           ← sink

const NODE_POSITIONS: { x: number; y: number }[] = [
  { x: 240, y: 0 },   // 00
  { x: 240, y: 155 }, // 01
  { x: 240, y: 310 }, // 02
  { x: 240, y: 465 }, // 03
  { x: 0, y: 620 },   // 04 — left branch
  { x: 480, y: 620 }, // 05 — right branch
  { x: 240, y: 775 }, // 06 — converge
];

const FLOW_NODES: Node[] = PIPELINE_STAGES.map((stage, i) => ({
  id: stage.step,
  type: "pipelineNode",
  position: NODE_POSITIONS[i],
  data: stage as unknown as Record<string, unknown>,
}));

const EDGE_STYLE: React.CSSProperties = {
  stroke: "rgba(62, 99, 221, 0.6)",
  strokeWidth: 1.5,
  strokeDasharray: "5 3",
};

const FLOW_EDGES: Edge[] = [
  { id: "e00-01", source: "00", target: "01", animated: true, type: "smoothstep", style: EDGE_STYLE },
  { id: "e01-02", source: "01", target: "02", animated: true, type: "smoothstep", style: EDGE_STYLE },
  { id: "e02-03", source: "02", target: "03", animated: true, type: "smoothstep", style: EDGE_STYLE },
  { id: "e03-04", source: "03", target: "04", animated: true, type: "smoothstep", style: EDGE_STYLE },
  { id: "e03-05", source: "03", target: "05", animated: true, type: "smoothstep", style: EDGE_STYLE },
  { id: "e04-06", source: "04", target: "06", animated: true, type: "smoothstep", style: EDGE_STYLE },
  { id: "e05-06", source: "05", target: "06", animated: true, type: "smoothstep", style: EDGE_STYLE },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function LandingPipeline() {
  return (
    <section
      id="pipeline"
      className={css({
        pb: { base: "sectionMobile", lg: "section" },
        scrollMarginTop: "56px",
      })}
    >
      <div className={container({ maxW: "breakpoint-lg" })}>
        {/* section header */}
        <div className={flex({ align: "center", gap: "2", mb: "2" })}>
          <BarChartIcon
            width={14}
            height={14}
            className={css({ color: "accent.primary" })}
          />
          <span
            className={css({
              fontSize: "sm",
              fontWeight: "bold",
              color: "ui.secondary",
              textTransform: "lowercase",
              letterSpacing: "wide",
            })}
          >
            agentic lead gen — pipeline modules
          </span>
        </div>

        <p
          className={css({
            fontSize: { base: "base", md: "lg" },
            color: "ui.tertiary",
            mb: "5",
            lineHeight: "relaxed",
            letterSpacing: "snug",
            maxW: "560px",
          })}
        >
          from raw web pages to qualified B2B leads — seven autonomous modules,
          zero cloud dependencies. this is the Agentic Lead Gen pipeline.
        </p>

        {/* ── Desktop: ReactFlow DAG ─────────────────────────────────────── */}
        <div
          className={css({ display: { base: "none", md: "block" } })}
          style={{ height: 560 }}
        >
          <ReactFlow
            nodes={FLOW_NODES}
            edges={FLOW_EDGES}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.06 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            colorMode="dark"
            style={{ background: "transparent" }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="rgba(255,255,255,0.04)"
            />
          </ReactFlow>
        </div>

        {/* ── Mobile: vertical stack ─────────────────────────────────────── */}
        <div
          className={grid({
            columns: 1,
            gap: "3",
            display: { base: "grid", md: "none" },
          })}
        >
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.title} className="pipeline-card-animated">
              {i > 0 && (
                <div className={flex({ justify: "center", mb: "3" })}>
                  <ArrowRightIcon
                    width={16}
                    height={16}
                    className={cx(
                      css({
                        color: "ui.dim",
                        transform: "rotate(90deg)",
                      }),
                      "pipeline-arrow-flow",
                    )}
                    data-pipeline-arrow={i - 1}
                  />
                </div>
              )}
              <div
                className={cx(pipelineCard(), "pipeline-card-hover")}
                style={{
                  borderTop: `2px solid rgba(62, 99, 221, ${stage.accentOpacity})`,
                  position: "relative",
                }}
              >
                <span
                  className={css({
                    fontSize: "3xl",
                    fontWeight: "bold",
                    lineHeight: "none",
                    letterSpacing: "tighter",
                    color: "ui.border",
                    position: "absolute",
                    top: "3",
                    right: "4",
                    userSelect: "none",
                  })}
                >
                  {stage.step}
                </span>
                <div className={flex({ align: "center", gap: "2", mb: "3" })}>
                  <div className={iconHolder()}>{stage.icon}</div>
                  <span className={badge({ variant: "pipeline" })}>
                    {stage.badge}
                  </span>
                </div>
                <p
                  className={css({
                    fontSize: "sm",
                    fontWeight: "semibold",
                    color: "ui.heading",
                    textTransform: "lowercase",
                    mb: "1",
                  })}
                >
                  {stage.title}
                </p>
                <p
                  className={css({
                    fontSize: "xs",
                    color: "ui.secondary",
                    lineHeight: "normal",
                  })}
                >
                  {stage.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

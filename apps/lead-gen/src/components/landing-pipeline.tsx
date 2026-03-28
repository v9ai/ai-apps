"use client";

import { useMemo } from "react";
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
    title: "System Overview",
    description:
      "SQLite WAL + LanceDB HNSW + ChromaDB hybrid storage in ~15 GB footprint",
    badge: "orchestrate",
    step: "00",
    accentOpacity: 0.15,
  },
  {
    icon: <MagnifyingGlassIcon width={20} height={20} />,
    title: "RL Crawler",
    description:
      "DQN agent with 448-dim state + UCB1 multi-armed bandit explores 820 domains, achieving 3\u00D7 harvest rate",
    badge: "crawl",
    step: "01",
    accentOpacity: 0.3,
  },
  {
    icon: <ReaderIcon width={20} height={20} />,
    title: "NER Extraction",
    description:
      "BERT-base-cased + spaCy + BERTopic extract entities at 92.3% F1, processing ~100 pages/sec",
    badge: "extract",
    step: "02",
    accentOpacity: 0.45,
  },
  {
    icon: <LinkBreak2Icon width={20} height={20} />,
    title: "Entity Resolution",
    description:
      "Siamese 128-dim embeddings with SQLite CTEs deduplicate in <1ms ANN queries",
    badge: "resolve",
    step: "03",
    accentOpacity: 0.6,
  },
  {
    icon: <BarChartIcon width={20} height={20} />,
    title: "Lead Scoring",
    description:
      "XGBoost 50% + LogReg 25% + RF 25% ensemble scores leads with 89.7% precision",
    badge: "score",
    step: "04",
    accentOpacity: 0.75,
  },
  {
    icon: <FileTextIcon width={20} height={20} />,
    title: "Report Generation",
    description:
      "Agentic Lead Gen's local LLM agent (Ollama) + SQLite/ChromaDB RAG generates reports with 97% factual accuracy in 10-30s",
    badge: "report",
    step: "05",
    accentOpacity: 0.9,
  },
  {
    icon: <CheckCircledIcon width={20} height={20} />,
    title: "Evaluation",
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

// ── Per-module diagram ─────────────────────────────────────────────────────────

function ModuleDiagram({ stage }: { stage: StageData }) {
  const nodes = useMemo<Node[]>(
    () => [
      {
        id: stage.step,
        type: "pipelineNode",
        position: { x: 0, y: 0 },
        data: stage as unknown as Record<string, unknown>,
      },
    ],
    // stage is a module-level constant — deps array is intentionally empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div
      style={{ height: 196 }}
      className={css({
        border: "1px solid",
        borderColor: "ui.border",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 150ms ease",
        _hover: { borderColor: "ui.borderHover" },
      })}
    >
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
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
          gap={20}
          size={1}
          color="rgba(255,255,255,0.04)"
        />
      </ReactFlow>
    </div>
  );
}

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
        {/* ── Two-column vertical split on desktop ── */}
        <div
          className={css({
            display: { base: "block", md: "grid" },
            gridTemplateColumns: { md: "200px 1fr", lg: "240px 1fr" },
            gap: { md: "8", lg: "12" },
            alignItems: "start",
          })}
        >
          {/* ── Left: sticky header + module index ── */}
          <div
            className={css({
              position: { md: "sticky" },
              top: { md: "80px" },
              mb: { base: "5", md: "0" },
              borderRight: { md: "1px solid" },
              borderRightColor: { md: "ui.border" },
              pr: { md: "6", lg: "8" },
            })}
          >
            <div className={flex({ align: "center", gap: "2", mb: "3" })}>
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
                fontSize: { base: "base", md: "xs" },
                color: "ui.tertiary",
                lineHeight: "relaxed",
                letterSpacing: "snug",
                mb: "5",
              })}
            >
              From raw web pages to qualified B2B leads — seven autonomous modules,
              zero cloud dependencies.
            </p>

          </div>

          {/* ── Right: module cards ── */}
          <div>
            {/* ── Desktop: 2-column grid of individual module diagrams ──── */}
            <div
              className={css({
                display: { base: "none", md: "grid" },
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "3",
              })}
            >
              {PIPELINE_STAGES.map((stage, i) => (
                <div
                  key={stage.step}
                  className={css({
                    // span full width for the last (7th) card
                    gridColumn: i === 6 ? "1 / -1" : undefined,
                  })}
                >
                  <ModuleDiagram stage={stage} />
                </div>
              ))}
            </div>

            {/* ── Mobile: vertical stack ───────────────────────────────── */}
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
        </div>
      </div>
    </section>
  );
}

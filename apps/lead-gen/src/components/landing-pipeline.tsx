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

/**
 * Scrapus 7-module B2B lead generation pipeline.
 *
 * Pipeline visualization with micro-interactions:
 *  #1 — Staggered card entrance + scanline glitch on hover (pipeline-card-animated, pipeline-card-hover)
 *  #4 — Arrow sequential pulse showing data flow (pipeline-arrow-flow)
 */

const PIPELINE_STAGES = [
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
      "Ollama + SQLite/ChromaDB RAG generates reports with 97% factual accuracy in 10-30s",
    badge: "report",
    step: "05",
    accentOpacity: 0.9,
  },
  {
    icon: <CheckCircledIcon width={20} height={20} />,
    title: "evaluation",
    description:
      "SHAP explanations + cascade error tracking monitor pipeline health (CER ~0.15)",
    badge: "evaluate",
    step: "06",
    accentOpacity: 1,
  },
] as const;

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
        {/* --- section header --- */}
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
            pipeline modules
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
          from raw web pages to scored B2B leads with generated reports. seven modules, zero cloud dependencies.
        </p>

        {/* --- desktop: horizontal flow (#1: stagger + glitch, #4: arrow pulse) --- */}
        <div
          className={flex({
            align: "stretch",
            gap: "3",
            display: { base: "none", md: "flex" },
          })}
        >
          {PIPELINE_STAGES.map((stage, i) => (
            <div
              key={stage.title}
              className={cx(
                flex({
                  align: "stretch",
                  gap: "3",
                  flex: "1",
                  minWidth: "0",
                }),
                "pipeline-card-animated",
              )}
            >
              {i > 0 && (
                <div
                  className={flex({
                    align: "center",
                    justify: "center",
                    flexShrink: 0,
                  })}
                >
                  <ArrowRightIcon
                    width={18}
                    height={18}
                    className={cx(
                      css({ color: "ui.dim" }),
                      "pipeline-arrow-flow",
                    )}
                    data-pipeline-arrow={i - 1}
                  />
                </div>
              )}
              <div className={css({ flex: "1", minWidth: "0" })}>
                <div
                  className={cx(pipelineCard(), "pipeline-card-hover")}
                  style={{
                    borderTop: `2px solid rgba(62, 99, 221, ${stage.accentOpacity})`,
                    position: "relative",
                  }}
                >
                  {/* step number watermark */}
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
                  <div
                    className={flex({
                      align: "center",
                      gap: "2",
                      mb: "3",
                    })}
                  >
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
            </div>
          ))}
        </div>

        {/* --- mobile: vertical stack --- */}
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
                {/* step number watermark */}
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
                <div
                  className={flex({ align: "center", gap: "2", mb: "3" })}
                >
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

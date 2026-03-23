"use client";

import { useState } from "react";
import { css } from "styled-system/css";

const LEGO_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

/* ── Data ─────────────────────────────────────────────────────────────── */

interface PipelineNode {
  name: string;
  description: string;
  isAI: boolean;
  inputs?: string[];
  outputs?: string[];
  detail?: string;
}

interface Pipeline {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  apiRoute: string;
  apiMethod: string;
  requestBody: string;
  stateType: string;
  nodes: PipelineNode[];
}

const PIPELINES: Pipeline[] = [
  {
    id: "analyze_video",
    title: "Video Analyzer",
    subtitle: "Extract building instructions from YouTube LEGO videos",
    color: "#E3000B",
    apiRoute: "POST /api/analyze",
    apiMethod: "POST",
    requestBody: '{ "youtubeUrl": "https://youtube.com/watch?v=..." }',
    stateType: `BricksState {
  youtube_url: str
  video_info: { video_id, title, author, thumbnail_url }
  transcript: str
  analysis: { model_name, model_type, raw_steps[] }
  parts_list: [{ name, quantity, color, part_number }]
  building_steps: [{ step_number, description, parts_used[], notes }]
  scheme: { phases[], summary }
  error: str | None
}`,
    nodes: [
      {
        name: "fetch_video_info",
        description: "Fetches video metadata and transcript from YouTube",
        isAI: false,
        inputs: ["youtube_url"],
        outputs: ["video_info", "transcript"],
        detail:
          "Uses youtube-transcript-api to pull the full transcript and yt-dlp metadata for title, author, and thumbnail URL.",
      },
      {
        name: "analyze_transcript",
        description:
          "Classifies the LEGO model and extracts raw building steps from the transcript",
        isAI: true,
        outputs: ["analysis"],
        detail:
          "Sends the first 8,000 characters of transcript to DeepSeek with a system prompt for LEGO expertise. Returns model_name, model_type, and raw_steps[].",
      },
      {
        name: "extract_parts",
        description:
          "Identifies all LEGO bricks needed with colors, quantities, and part numbers",
        isAI: true,
        outputs: ["parts_list"],
        detail:
          "Uses the analysis + first 4,000 chars of transcript. LLM identifies specific LEGO elements using standard naming conventions (e.g. '2x4 Brick', '3001').",
      },
      {
        name: "structure_steps",
        description:
          "Organizes raw steps into numbered instructions with part references",
        isAI: true,
        outputs: ["building_steps"],
        detail:
          "Cross-references raw_steps with the first 30 parts to produce step_number, description, parts_used[], and notes for each step.",
      },
      {
        name: "generate_scheme",
        description:
          "Groups steps into logical build phases with a high-level summary",
        isAI: true,
        outputs: ["scheme"],
        detail:
          "Receives the first 20 structured steps and produces named phases with step ranges (e.g. 'Chassis: steps 1-5') plus a 2-3 sentence build summary.",
      },
    ],
  },
  {
    id: "research_topic",
    title: "Topic Research",
    subtitle: "Analyze MOC builds for a LEGO mechanism or technique",
    color: "#006CB7",
    apiRoute: "POST /api/topics",
    apiMethod: "POST",
    requestBody:
      '{ "topicName": "Steering", "mocUrls": ["https://rebrickable.com/mocs/MOC-..."] }',
    stateType: `TopicState {
  topic_name: str
  moc_urls: [str]
  mocs: [{ moc_id, designer, name, url }]
  analysis: { mechanism_description, technique_categories[], key_parts[] }
  synthesis: { summary, difficulty_range, recommended_start_moc,
               common_techniques[], unique_approaches[] }
  error: str | None
}`,
    nodes: [
      {
        name: "parse_mocs",
        description: "Parses Rebrickable MOC URLs into structured metadata",
        isAI: false,
        inputs: ["topic_name", "moc_urls"],
        outputs: ["mocs"],
        detail:
          "Regex extracts MOC IDs, designer names, and build names from Rebrickable URLs. Skips invalid URLs gracefully.",
      },
      {
        name: "analyze_topic",
        description:
          "Identifies common mechanisms, techniques, and key parts across MOC builds",
        isAI: true,
        outputs: ["analysis"],
        detail:
          "LLM acts as a LEGO mechanism expert, comparing all MOCs to find shared construction patterns, categorize techniques, and identify the most important parts.",
      },
      {
        name: "synthesize_topic",
        description:
          "Creates a topic summary with difficulty range, recommended starter MOC, and unique approaches",
        isAI: true,
        outputs: ["synthesis"],
        detail:
          "LLM curates the analysis into a builder-friendly summary: difficulty spectrum, which MOC to start with, and what makes each build unique.",
      },
    ],
  },
  {
    id: "part_mocs",
    title: "Part Discovery",
    subtitle: "Discover MOC build ideas for a given LEGO part",
    color: "#00852B",
    apiRoute: "GET /api/parts/:partNum/discover-mocs",
    apiMethod: "GET",
    requestBody: "No body — part number in URL path",
    stateType: `PartMocsState {
  part_num: str
  part_name: str
  part_category: "brick" | "plate" | "tile" | "slope" | ...
  part_description: str
  mocs: [{ moc_id, name, designer, year, num_parts,
            image_url, moc_url, description }]
  ranked_mocs: [{ ...moc, top_pick: bool }]
  ranking_summary: str
  error: str | None
}`,
    nodes: [
      {
        name: "identify_part",
        description:
          "Classifies the part from its number — name, category, typical colors, and MOC role",
        isAI: true,
        inputs: ["part_num"],
        outputs: ["part_name", "part_category", "part_description"],
        detail:
          "Cross-references a built-in catalog of 40+ common LEGO elements. If the part is known, the catalog hint anchors the LLM; otherwise it classifies from scratch.",
      },
      {
        name: "generate_mocs",
        description:
          "Generates 15 plausible community MOC builds that prominently feature this part",
        isAI: true,
        outputs: ["mocs"],
        detail:
          "LLM generates diverse AFOL-style MOC builds with realistic names, designers, part counts (50-3000), and years (2018-2025). Each includes how the part is used.",
      },
      {
        name: "rank_mocs",
        description:
          "Ranks MOCs by creativity and relevance, surfaces top picks with community context",
        isAI: true,
        outputs: ["ranked_mocs", "ranking_summary"],
        detail:
          'LLM selects top picks and writes a community summary. Top picks are flagged with top_pick: true and sorted first. Results are cached in Neon DB.',
      },
    ],
  },
  {
    id: "moc_parts",
    title: "MOC Parts List",
    subtitle: "Generate a realistic parts list for any MOC build",
    color: "#FE8A18",
    apiRoute: "POST /api/favorites/:mocId/extract-parts",
    apiMethod: "POST",
    requestBody: "No body — MOC ID in URL path, auth required",
    stateType: `MocPartsState {
  moc_id: str
  moc_name: str
  designer: str
  image_url: str | None
  build_type: "castle" | "vehicle" | "spaceship" | ...
  build_notes: str
  parts: [{ partNum, name, color, qty, imageUrl }]
  source: "ai"
  error: str | None
}`,
    nodes: [
      {
        name: "infer_build_type",
        description:
          "Classifies the MOC category and describes construction style",
        isAI: true,
        inputs: ["moc_id", "moc_name", "designer"],
        outputs: ["build_type", "build_notes"],
        detail:
          "Classifies into one of 12 categories: castle, vehicle, spaceship, technic, mech, train, building, animal, city, pirate, modular, or other. Describes dominant colors, sub-assemblies, and scale.",
      },
      {
        name: "generate_parts",
        description:
          "Produces a 25-40 element bill of materials using real part numbers from a category-specific catalog",
        isAI: true,
        outputs: ["parts"],
        detail:
          "Each build category has a curated hints catalog of real LEGO part numbers. The LLM is constrained to only use parts from that catalog, with realistic quantities (structural: 6-20x, detail: 2-6x, accent: 1-3x).",
      },
      {
        name: "validate_parts",
        description:
          "Deduplicates by partNum + color, sums quantities, and filters invalid entries",
        isAI: false,
        outputs: ["parts"],
        detail:
          "Pure Python: groups by (partNum, color) key, merges quantities, strips entries with empty part numbers. After validation, the API enriches parts with Rebrickable images.",
      },
    ],
  },
];

const ARCHITECTURE_LAYERS = [
  {
    label: "Browser",
    color: "#FFD500",
    items: ["Next.js React UI", "PandaCSS styles", "Client components"],
  },
  {
    label: "Next.js API Routes",
    color: "#E3000B",
    items: [
      "/api/analyze",
      "/api/topics",
      "/api/parts/:id/discover-mocs",
      "/api/favorites/:id/extract-parts",
    ],
  },
  {
    label: "LangGraph Server",
    color: "#006CB7",
    items: [
      "4 compiled StateGraphs",
      "POST /runs/wait endpoint",
      "Async Python execution",
    ],
  },
  {
    label: "DeepSeek API",
    color: "#00852B",
    items: [
      "deepseek-chat model",
      "JSON mode responses",
      "Temperature 0.2",
    ],
  },
];

/* ── Components ───────────────────────────────────────────────────────── */

function ExpandButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={css({
        fontSize: "xs",
        fontWeight: "700",
        fontFamily: "display",
        color: "ink.faint",
        bg: "transparent",
        border: "1px solid",
        borderColor: "plate.border",
        cursor: "pointer",
        px: "2",
        py: "0.5",
        rounded: "md",
        transition: "all 0.15s ease",
        _hover: { color: "ink.secondary", borderColor: "plate.borderHover" },
      })}
    >
      {expanded ? "Less" : "More"}
    </button>
  );
}

function NodeBox({
  node,
  color,
  index,
}: {
  node: PipelineNode;
  color: string;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={css({
        bg: "plate.surface",
        border: "2px solid",
        borderColor: "plate.border",
        rounded: "brick",
        px: "4",
        py: "3",
        position: "relative",
        transition: "all 0.2s ease",
        _hover: {
          borderColor: "plate.borderHover",
          boxShadow: "brick.hover",
        },
      })}
    >
      {/* Node header */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "2",
          mb: "2",
        })}
      >
        <div
          className={css({
            w: "6",
            h: "6",
            rounded: "stud",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "xs",
            fontWeight: "900",
            fontFamily: "display",
            color: "white",
            flexShrink: 0,
            boxShadow: "stud",
          })}
          style={{ background: color }}
        >
          {index + 1}
        </div>
        <span
          className={css({
            fontFamily: "mono",
            fontSize: "sm",
            fontWeight: "700",
            color: "ink.primary",
            flex: 1,
          })}
        >
          {node.name}
        </span>
        {node.isAI && (
          <span
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              color: "white",
              bg: "rgba(254,138,24,0.85)",
              px: "2",
              py: "0.5",
              rounded: "md",
              lineHeight: 1,
            })}
          >
            AI
          </span>
        )}
        {node.detail && (
          <ExpandButton
            expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          />
        )}
      </div>

      {/* Description */}
      <p
        className={css({
          fontSize: "sm",
          color: "ink.secondary",
          lineHeight: "1.5",
          mb: "2",
        })}
      >
        {node.description}
      </p>

      {/* Expanded detail */}
      {expanded && node.detail && (
        <p
          className={css({
            fontSize: "xs",
            color: "ink.muted",
            lineHeight: "1.6",
            mb: "2",
            pl: "3",
            borderLeft: "2px solid",
            borderColor: "plate.border",
          })}
        >
          {node.detail}
        </p>
      )}

      {/* I/O tags */}
      <div className={css({ display: "flex", flexWrap: "wrap", gap: "1.5" })}>
        {node.inputs?.map((inp) => (
          <span
            key={inp}
            className={css({
              fontSize: "xs",
              fontFamily: "mono",
              fontWeight: "600",
              color: "#00852B",
              bg: "rgba(0,133,43,0.1)",
              border: "1px solid rgba(0,133,43,0.2)",
              px: "2",
              py: "0.5",
              rounded: "md",
            })}
          >
            {inp}
          </span>
        ))}
        {node.outputs?.map((out) => (
          <span
            key={out}
            className={css({
              fontSize: "xs",
              fontFamily: "mono",
              fontWeight: "600",
              color: "#006CB7",
              bg: "rgba(0,108,183,0.1)",
              border: "1px solid rgba(0,108,183,0.2)",
              px: "2",
              py: "0.5",
              rounded: "md",
            })}
          >
            {out}
          </span>
        ))}
      </div>
    </div>
  );
}

function EdgeArrow({ color }: { color: string }) {
  return (
    <div className={css({ display: "flex", justifyContent: "center", py: "1" })}>
      <div className={css({ w: "2px", h: "6", position: "relative" })} style={{ background: color }}>
        <div
          style={{
            position: "absolute",
            bottom: -4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: `6px solid ${color}`,
          }}
        />
      </div>
    </div>
  );
}

function TerminalBadge({ label }: { label: string }) {
  return (
    <div className={css({ display: "flex", justifyContent: "center" })}>
      <span
        className={css({
          fontFamily: "mono",
          fontSize: "xs",
          fontWeight: "700",
          color: "ink.faint",
          bg: "plate.surface",
          border: "1.5px solid",
          borderColor: "plate.border",
          px: "3",
          py: "1",
          rounded: "full",
        })}
      >
        {label}
      </span>
    </div>
  );
}

function PipelineCard({ pipeline }: { pipeline: Pipeline }) {
  const [showState, setShowState] = useState(false);

  return (
    <section
      className={css({
        bg: "plate.raised",
        border: "2px solid",
        borderColor: "plate.border",
        rounded: "brick",
        boxShadow: "brick",
        overflow: "hidden",
      })}
    >
      {/* Header bar */}
      <div
        className={css({
          px: "5",
          py: "4",
          borderBottom: "2px solid",
          borderColor: "plate.border",
          position: "relative",
        })}
      >
        <div
          className={css({ position: "absolute", top: 0, left: 0, right: 0, h: "3px" })}
          style={{ background: pipeline.color }}
        />
        <div
          className={css({
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "3",
          })}
        >
          <div>
            <h2
              className={css({
                fontSize: "xl",
                fontWeight: "900",
                fontFamily: "display",
                letterSpacing: "-0.02em",
                color: "ink.primary",
              })}
            >
              {pipeline.title}
            </h2>
            <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
              {pipeline.subtitle}
            </p>
          </div>
          <span
            className={css({
              fontFamily: "mono",
              fontSize: "xs",
              fontWeight: "600",
              color: "ink.faint",
              bg: "plate.surface",
              border: "1px solid",
              borderColor: "plate.border",
              px: "2",
              py: "0.5",
              rounded: "md",
              whiteSpace: "nowrap",
              flexShrink: 0,
              mt: "1",
            })}
          >
            {pipeline.id}
          </span>
        </div>

        {/* API route + request */}
        <div className={css({ mt: "3", display: "flex", flexDir: "column", gap: "2" })}>
          <div className={css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" })}>
            <span
              className={css({
                fontFamily: "mono",
                fontSize: "xs",
                fontWeight: "800",
                px: "2",
                py: "0.5",
                rounded: "md",
                lineHeight: 1,
              })}
              style={{
                color: pipeline.apiMethod === "GET" ? "#00852B" : "#E3000B",
                background:
                  pipeline.apiMethod === "GET"
                    ? "rgba(0,133,43,0.1)"
                    : "rgba(227,0,11,0.1)",
                border: `1px solid ${pipeline.apiMethod === "GET" ? "rgba(0,133,43,0.2)" : "rgba(227,0,11,0.2)"}`,
              }}
            >
              {pipeline.apiMethod}
            </span>
            <span
              className={css({
                fontFamily: "mono",
                fontSize: "xs",
                fontWeight: "600",
                color: "ink.secondary",
              })}
            >
              {pipeline.apiRoute.replace(/^(GET|POST)\s+/, "")}
            </span>
          </div>
          <code
            className={css({
              fontFamily: "mono",
              fontSize: "xs",
              color: "ink.faint",
              bg: "plate.surface",
              border: "1px solid",
              borderColor: "plate.border",
              px: "2.5",
              py: "1.5",
              rounded: "md",
              display: "block",
              overflowX: "auto",
              whiteSpace: "pre",
            })}
          >
            {pipeline.requestBody}
          </code>
        </div>

        {/* State type toggle */}
        <button
          onClick={() => setShowState(!showState)}
          className={css({
            mt: "3",
            fontSize: "xs",
            fontWeight: "700",
            fontFamily: "display",
            color: "ink.faint",
            bg: "transparent",
            border: "1px solid",
            borderColor: "plate.border",
            cursor: "pointer",
            px: "3",
            py: "1",
            rounded: "md",
            transition: "all 0.15s ease",
            _hover: { color: "ink.secondary", borderColor: "plate.borderHover" },
          })}
        >
          {showState ? "Hide" : "Show"} State Type
        </button>
        {showState && (
          <pre
            className={css({
              mt: "2",
              fontFamily: "mono",
              fontSize: "xs",
              color: "ink.secondary",
              bg: "plate.surface",
              border: "1px solid",
              borderColor: "plate.border",
              px: "3",
              py: "2.5",
              rounded: "md",
              overflowX: "auto",
              lineHeight: "1.6",
            })}
          >
            {pipeline.stateType}
          </pre>
        )}
      </div>

      {/* Flow */}
      <div className={css({ px: "5", py: "4", display: "flex", flexDir: "column" })}>
        <TerminalBadge label="START" />
        <EdgeArrow color={pipeline.color} />

        {pipeline.nodes.map((node, i) => (
          <div key={node.name}>
            <NodeBox node={node} color={pipeline.color} index={i} />
            {i < pipeline.nodes.length - 1 && <EdgeArrow color={pipeline.color} />}
          </div>
        ))}

        <EdgeArrow color={pipeline.color} />
        <TerminalBadge label="END" />
      </div>
    </section>
  );
}

function ArchitectureSection() {
  return (
    <section className={css({ mb: "12" })}>
      <h2
        className={css({
          fontSize: "2xl",
          fontWeight: "900",
          fontFamily: "display",
          letterSpacing: "-0.02em",
          color: "ink.primary",
          textAlign: "center",
          mb: "6",
        })}
      >
        Architecture
      </h2>

      <div
        className={css({
          maxW: "2xl",
          mx: "auto",
          display: "flex",
          flexDir: "column",
          gap: "0",
        })}
      >
        {ARCHITECTURE_LAYERS.map((layer, i) => (
          <div key={layer.label}>
            <div
              className={css({
                bg: "plate.raised",
                border: "2px solid",
                borderColor: "plate.border",
                rounded: "brick",
                overflow: "hidden",
                position: "relative",
              })}
            >
              <div
                className={css({
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  w: "4px",
                })}
                style={{ background: layer.color }}
              />
              <div className={css({ pl: "6", pr: "4", py: "3" })}>
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                    mb: "1",
                  })}
                >
                  <div
                    className={css({
                      w: "5",
                      h: "5",
                      rounded: "stud",
                      boxShadow: "stud",
                      flexShrink: 0,
                    })}
                    style={{ background: layer.color }}
                  />
                  <span
                    className={css({
                      fontWeight: "800",
                      fontFamily: "display",
                      fontSize: "sm",
                      color: "ink.primary",
                    })}
                  >
                    {layer.label}
                  </span>
                </div>
                <div
                  className={css({
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1.5",
                    mt: "1.5",
                    pl: "7",
                  })}
                >
                  {layer.items.map((item) => (
                    <span
                      key={item}
                      className={css({
                        fontSize: "xs",
                        fontFamily: "mono",
                        fontWeight: "600",
                        color: "ink.muted",
                        bg: "plate.surface",
                        border: "1px solid",
                        borderColor: "plate.border",
                        px: "2",
                        py: "0.5",
                        rounded: "md",
                      })}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Connector arrow between layers */}
            {i < ARCHITECTURE_LAYERS.length - 1 && (
              <div className={css({ display: "flex", justifyContent: "center", py: "1" })}>
                <div
                  className={css({
                    w: "2px",
                    h: "5",
                    bg: "plate.border",
                    position: "relative",
                  })}
                >
                  <div
                    className={css({
                      position: "absolute",
                      bottom: "-3px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      w: 0,
                      h: 0,
                      borderLeft: "4px solid transparent",
                      borderRight: "4px solid transparent",
                      borderTop: "5px solid",
                      borderTopColor: "plate.border",
                    })}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Data flow explanation */}
      <div
        className={css({
          mt: "6",
          maxW: "2xl",
          mx: "auto",
          bg: "plate.surface",
          border: "1px solid",
          borderColor: "plate.border",
          rounded: "brick",
          px: "4",
          py: "3",
        })}
      >
        <p className={css({ fontSize: "sm", color: "ink.secondary", lineHeight: "1.6" })}>
          <strong className={css({ color: "ink.primary", fontWeight: "700" })}>
            Request flow:
          </strong>{" "}
          The browser calls a Next.js API route, which forwards the request to
          the LangGraph server via{" "}
          <code
            className={css({
              fontFamily: "mono",
              fontSize: "xs",
              bg: "plate.raised",
              px: "1.5",
              py: "0.5",
              rounded: "sm",
            })}
          >
            POST /runs/wait
          </code>
          . LangGraph executes the compiled StateGraph — each node runs
          sequentially, passing state forward. AI nodes call the DeepSeek API
          with JSON mode for structured output. The final state is returned as
          JSON through the full chain back to the browser.
        </p>
      </div>
    </section>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  return (
    <main className={css({ mx: "auto", maxW: "6xl", px: "4", py: "12" })}>
      {/* Hero */}
      <div className={css({ mb: "10", textAlign: "center" })}>
        <h1
          className={css({
            fontSize: "4xl",
            fontWeight: "900",
            fontFamily: "display",
            letterSpacing: "-0.03em",
            color: "ink.primary",
          })}
        >
          How It Works
        </h1>
        <p
          className={css({
            mt: "3",
            fontSize: "md",
            color: "ink.muted",
            maxW: "2xl",
            mx: "auto",
            lineHeight: "1.6",
          })}
        >
          Bricks uses four LangGraph pipelines powered by DeepSeek to analyze
          videos, research topics, discover builds, and generate parts lists.
          Each pipeline is a directed graph of sequential nodes.
        </p>

        {/* Legend */}
        <div
          className={css({
            mt: "6",
            display: "inline-flex",
            gap: "4",
            flexWrap: "wrap",
            justifyContent: "center",
            bg: "plate.surface",
            border: "1px solid",
            borderColor: "plate.border",
            rounded: "brick",
            px: "4",
            py: "2.5",
          })}
        >
          <div className={css({ display: "flex", alignItems: "center", gap: "1.5" })}>
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "white",
                bg: "rgba(254,138,24,0.85)",
                px: "2",
                py: "0.5",
                rounded: "md",
                lineHeight: 1,
              })}
            >
              AI
            </span>
            <span className={css({ fontSize: "xs", color: "ink.secondary" })}>
              LLM-powered node
            </span>
          </div>
          <div className={css({ display: "flex", alignItems: "center", gap: "1.5" })}>
            <span
              className={css({
                fontSize: "xs",
                fontFamily: "mono",
                fontWeight: "600",
                color: "#00852B",
                bg: "rgba(0,133,43,0.1)",
                border: "1px solid rgba(0,133,43,0.2)",
                px: "2",
                py: "0.5",
                rounded: "md",
              })}
            >
              input
            </span>
            <span className={css({ fontSize: "xs", color: "ink.secondary" })}>
              State input
            </span>
          </div>
          <div className={css({ display: "flex", alignItems: "center", gap: "1.5" })}>
            <span
              className={css({
                fontSize: "xs",
                fontFamily: "mono",
                fontWeight: "600",
                color: "#006CB7",
                bg: "rgba(0,108,183,0.1)",
                border: "1px solid rgba(0,108,183,0.2)",
                px: "2",
                py: "0.5",
                rounded: "md",
              })}
            >
              output
            </span>
            <span className={css({ fontSize: "xs", color: "ink.secondary" })}>
              State output
            </span>
          </div>
        </div>
      </div>

      {/* Architecture */}
      <ArchitectureSection />

      {/* Pipelines */}
      <h2
        className={css({
          fontSize: "2xl",
          fontWeight: "900",
          fontFamily: "display",
          letterSpacing: "-0.02em",
          color: "ink.primary",
          textAlign: "center",
          mb: "6",
        })}
      >
        Pipelines
      </h2>
      <div
        className={css({
          display: "grid",
          gap: "8",
          md: { gridTemplateColumns: "1fr 1fr" },
        })}
      >
        {PIPELINES.map((p) => (
          <PipelineCard key={p.id} pipeline={p} />
        ))}
      </div>

      {/* Tech stack footer */}
      <div className={css({ mt: "12", textAlign: "center" })}>
        <div
          className={css({
            h: "2px",
            mb: "8",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(254,138,24,0.3) 20%, rgba(254,138,24,0.5) 50%, rgba(254,138,24,0.3) 80%, transparent 100%)",
          })}
        />
        <p className={css({ fontSize: "sm", color: "ink.faint", fontWeight: "600" })}>
          Built with LangGraph + DeepSeek + Next.js + PandaCSS
        </p>
        <div className={css({ mt: "3", display: "flex", justifyContent: "center", gap: "1" })}>
          {LEGO_COLORS.map((color, i) => (
            <div
              key={i}
              className={css({ w: "2.5", h: "2.5", rounded: "stud", boxShadow: "stud" })}
              style={{ background: color }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

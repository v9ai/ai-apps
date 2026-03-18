import type { ReactNode } from "react";

// ─── Types ─────────────────────────────────────────────────────────

interface Paper {
  slug: string;
  number: number;
  title: string;
  category: string;
  wordCount: number;
  readingTimeMin: number;
  authors?: string;
  year?: number;
  venue?: string;
  finding?: string;
  relevance?: string;
  url?: string;
  categoryColor?: string;
}

interface PipelineAgent {
  name: string;
  icon?: ReactNode;
  color?: string;
  description: string;
  researchBasis?: string;
  paperIndices?: number[];
  codeSnippet?: string;
  dataFlow?: string;
}

interface Stat {
  number: string;
  label: string;
  source?: string;
  paperIndex?: number;
}

interface TechnicalDetailItem {
  label: string;
  value: string;
  metadata?: Record<string, string>;
}

interface TechnicalDetail {
  type: "table" | "card-grid" | "code" | "diagram";
  heading: string;
  description?: string;
  items?: TechnicalDetailItem[];
  code?: string;
}

interface ExtraSection {
  heading: string;
  content: string;
  codeBlock?: string;
}

interface HowItWorksProps {
  papers: Paper[];
  title?: string;
  onPaperClick?: (paper: Paper) => void;
  agents?: PipelineAgent[];
  stats?: Stat[];
  subtitle?: string;
  story?: string;
  children?: ReactNode;
  technicalDetails?: TechnicalDetail[];
  extraSections?: ExtraSection[];
}

export type { Paper, PipelineAgent, Stat, HowItWorksProps, TechnicalDetail, TechnicalDetailItem, ExtraSection };

// ─── Shared styles ────────────────────────────────────────────────

const prose: React.CSSProperties = {
  maxWidth: 900,
  margin: "0 auto",
  padding: "0 1.25rem",
  paddingBottom: "4rem",
  lineHeight: 1.75,
  fontSize: "1.05rem",
};

const cardBorder = "1px solid var(--gray-a3, rgba(0,0,0,0.08))";
const cardRadius = "10px";
const subtleBg = "var(--gray-a2, rgba(0,0,0,0.03))";
const mutedColor = "var(--gray-a8, rgba(0,0,0,0.5))";
const faintColor = "var(--gray-a6, rgba(0,0,0,0.35))";

const sectionHeading: React.CSSProperties = {
  fontSize: "1.3rem",
  fontWeight: 700,
  margin: "3rem 0 1rem",
  letterSpacing: "-0.01em",
};

const preBlock: React.CSSProperties = {
  margin: 0,
  padding: "0.875rem 1rem",
  backgroundColor: "var(--gray-a2, rgba(0,0,0,0.025))",
  borderRadius: "8px",
  fontSize: "0.8rem",
  overflow: "auto",
  lineHeight: 1.6,
  border: cardBorder,
};

// ─── Metadata tags renderer ──────────────────────────────────────

function MetadataTags({ metadata }: { metadata: Record<string, string> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.35rem" }}>
      {Object.entries(metadata).map(([k, v]) => (
        <span
          key={k}
          style={{
            fontSize: "0.7rem",
            padding: "0.1rem 0.45rem",
            borderRadius: "4px",
            backgroundColor: subtleBg,
            color: mutedColor,
            border: cardBorder,
            whiteSpace: "nowrap",
          }}
        >
          <strong style={{ fontWeight: 600 }}>{k}:</strong> {v}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export function HowItWorks({
  papers,
  title = "How It Works",
  agents,
  stats,
  subtitle,
  story,
  children,
  technicalDetails,
  extraSections,
}: HowItWorksProps) {
  const sorted = [...papers].sort((a, b) => a.number - b.number);

  return (
    <div style={prose}>
      {/* Header */}
      {title && (
        <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "2.5rem 0 0", letterSpacing: "-0.02em" }}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p style={{ color: mutedColor, margin: "0.5rem 0 0", fontSize: "1.1rem", lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}

      {/* Story — styled callout */}
      {story && (
        <div
          style={{
            margin: "2rem 0 0",
            padding: "1.25rem 1.5rem",
            borderLeft: "3px solid var(--indigo-9, #3451b2)",
            backgroundColor: "var(--indigo-a2, rgba(52,81,178,0.03))",
            borderRadius: "0 8px 8px 0",
            fontSize: "0.975rem",
            lineHeight: 1.8,
            color: "var(--gray-12, #111)",
          }}
        >
          {story}
        </div>
      )}

      {/* Stats — flex-wrap grid of cards */}
      {stats && stats.length > 0 && (
        <>
          <h3 style={sectionHeading}>Key Metrics</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {stats.map((s, i) => (
              <div
                key={i}
                style={{
                  flex: "1 1 180px",
                  padding: "1rem 1.125rem",
                  border: cardBorder,
                  borderRadius: cardRadius,
                  background: "var(--color-background, #fff)",
                }}
              >
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 800,
                    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                    color: "var(--indigo-11, #3451b2)",
                    lineHeight: 1.2,
                  }}
                >
                  {s.number}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--gray-11, #333)", marginTop: "0.25rem", lineHeight: 1.4 }}>
                  {s.label}
                </div>
                {s.source && (
                  <div style={{ fontSize: "0.7rem", color: faintColor, marginTop: "0.35rem", fontStyle: "italic" }}>
                    {s.source}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Papers — 2-column CSS grid of cards */}
      {sorted.length > 0 && (
        <>
          <h3 style={sectionHeading}>Technical Foundations</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "0.75rem" }}>
            {sorted.map((paper) => (
              <div
                key={paper.slug}
                style={{
                  padding: "1.125rem",
                  border: cardBorder,
                  borderRadius: cardRadius,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "9999px",
                      backgroundColor: paper.categoryColor ?? "var(--gray-9)",
                      color: "white",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {paper.category}
                  </span>
                  {paper.year && (
                    <span style={{ fontSize: "0.75rem", color: faintColor }}>{paper.year}</span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem" }}>{paper.title}</div>
                {paper.authors && (
                  <div style={{ fontSize: "0.825rem", color: mutedColor }}>{paper.authors}</div>
                )}
                {paper.finding && (
                  <p style={{ fontSize: "0.85rem", margin: "0.5rem 0 0.25rem", lineHeight: 1.5 }}>
                    <strong style={{ color: "var(--gray-12, #111)" }}>Core capability:</strong> {paper.finding}
                  </p>
                )}
                {paper.relevance && (
                  <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0", lineHeight: 1.5, color: mutedColor }}>
                    <strong style={{ color: "var(--gray-11, #333)" }}>In this app:</strong> {paper.relevance}
                  </p>
                )}
                {paper.url && (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.8rem",
                      marginTop: "auto",
                      paddingTop: "0.5rem",
                      color: "var(--indigo-11, #3451b2)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    Docs →
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Agents — numbered cards with connector line */}
      {agents && agents.length > 0 && (
        <>
          <h3 style={sectionHeading}>Pipeline Stages</h3>
          <div style={{ position: "relative", paddingLeft: "2rem" }}>
            {/* Vertical connector line */}
            <div
              style={{
                position: "absolute",
                left: "0.7rem",
                top: "1.25rem",
                bottom: "1.25rem",
                width: "2px",
                backgroundColor: "var(--gray-a4, rgba(0,0,0,0.1))",
                borderRadius: "1px",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {agents.map((agent, i) => (
                <div
                  key={agent.name}
                  style={{
                    position: "relative",
                    padding: "1.125rem",
                    border: cardBorder,
                    borderRadius: cardRadius,
                    background: "var(--color-background, #fff)",
                  }}
                >
                  {/* Number dot on the connector line */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-2.7rem",
                      top: "1.125rem",
                      width: "1.4rem",
                      height: "1.4rem",
                      borderRadius: "50%",
                      backgroundColor: "var(--indigo-9, #3451b2)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: "0 0 0 3px var(--color-background, #fff)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong style={{ fontSize: "1.05rem" }}>{agent.name}</strong>
                  </div>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem", lineHeight: 1.65, color: "var(--gray-11, #333)" }}>
                    {agent.description}
                  </p>
                  {agent.researchBasis && (
                    <p
                      style={{
                        margin: "0 0 0.5rem",
                        fontSize: "0.8rem",
                        fontStyle: "italic",
                        color: faintColor,
                      }}
                    >
                      Research basis: {agent.researchBasis}
                    </p>
                  )}
                  {agent.dataFlow && (
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: "0.775rem",
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                        color: "var(--indigo-11, #3451b2)",
                        backgroundColor: "var(--indigo-a2, rgba(52,81,178,0.04))",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "5px",
                        margin: "0.25rem 0",
                        border: "1px solid var(--indigo-a3, rgba(52,81,178,0.08))",
                      }}
                    >
                      {agent.dataFlow}
                    </div>
                  )}
                  {agent.codeSnippet && (
                    <pre style={{ ...preBlock, marginTop: "0.625rem" }}>
                      <code>{agent.codeSnippet}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Technical Details */}
      {technicalDetails &&
        technicalDetails.length > 0 &&
        technicalDetails.map((td, i) => (
          <div key={i} style={{ margin: "2.5rem 0 0" }}>
            <h3 style={{ ...sectionHeading, margin: "0 0 0.5rem" }}>{td.heading}</h3>
            {td.description && (
              <p style={{ margin: "0 0 0.875rem", color: mutedColor, fontSize: "0.925rem" }}>{td.description}</p>
            )}
            {td.type === "table" && td.items && (() => {
              // Collect all unique metadata keys across items
              const metaKeys = Array.from(
                new Set(td.items.flatMap((item) => (item.metadata ? Object.keys(item.metadata) : [])))
              );
              return (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "0.625rem 0.75rem",
                            borderBottom: "2px solid var(--gray-a4, rgba(0,0,0,0.1))",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: mutedColor,
                          }}
                        >
                          Metric
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "0.625rem 0.75rem",
                            borderBottom: "2px solid var(--gray-a4, rgba(0,0,0,0.1))",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: mutedColor,
                          }}
                        >
                          Formula
                        </th>
                        {metaKeys.map((key) => (
                          <th
                            key={key}
                            style={{
                              textAlign: "left",
                              padding: "0.625rem 0.75rem",
                              borderBottom: "2px solid var(--gray-a4, rgba(0,0,0,0.1))",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: mutedColor,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {td.items.map((item, j) => (
                        <tr
                          key={j}
                          style={{
                            backgroundColor: j % 2 === 1 ? subtleBg : "transparent",
                          }}
                        >
                          <td
                            style={{
                              padding: "0.625rem 0.75rem",
                              borderBottom: `1px solid var(--gray-a3, rgba(0,0,0,0.06))`,
                              fontWeight: 600,
                            }}
                          >
                            {item.label}
                          </td>
                          <td
                            style={{
                              padding: "0.625rem 0.75rem",
                              borderBottom: `1px solid var(--gray-a3, rgba(0,0,0,0.06))`,
                              fontFamily: "'SF Mono', 'Fira Code', monospace",
                              fontSize: "0.8rem",
                            }}
                          >
                            {item.value}
                          </td>
                          {metaKeys.map((key) => (
                            <td
                              key={key}
                              style={{
                                padding: "0.625rem 0.75rem",
                                borderBottom: `1px solid var(--gray-a3, rgba(0,0,0,0.06))`,
                                fontSize: "0.8rem",
                              }}
                            >
                              {item.metadata?.[key] ?? "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
            {td.type === "card-grid" && td.items && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {td.items.map((item, j) => (
                  <div
                    key={j}
                    style={{
                      padding: "1rem",
                      border: cardBorder,
                      borderRadius: cardRadius,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: "0.25rem", fontSize: "0.95rem" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--gray-11, #333)", lineHeight: 1.5 }}>
                      {item.value}
                    </div>
                    {item.metadata && <MetadataTags metadata={item.metadata} />}
                  </div>
                ))}
              </div>
            )}
            {(td.type === "code" || td.type === "diagram") && td.code && (
              <div style={{ border: cardBorder, borderRadius: cardRadius, overflow: "hidden" }}>
                <div
                  style={{
                    padding: "0.4rem 0.875rem",
                    backgroundColor: "var(--gray-a3, rgba(0,0,0,0.05))",
                    borderBottom: cardBorder,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: faintColor,
                  }}
                >
                  {td.type === "diagram" ? "architecture" : "code"}
                </div>
                <pre
                  style={{
                    ...preBlock,
                    border: "none",
                    borderRadius: 0,
                    whiteSpace: td.type === "diagram" ? "pre" : "pre-wrap",
                  }}
                >
                  <code>{td.code}</code>
                </pre>
              </div>
            )}
          </div>
        ))}

      {/* Extra Sections */}
      {extraSections &&
        extraSections.length > 0 &&
        extraSections.map((section, i) => (
          <div key={i}>
            <hr
              style={{
                border: "none",
                borderTop: "1px solid var(--gray-a3, rgba(0,0,0,0.08))",
                margin: "2.75rem 0",
              }}
            />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 0.75rem" }}>
              {section.heading}
            </h3>
            <p style={{ margin: 0, lineHeight: 1.75, color: "var(--gray-11, #333)" }}>{section.content}</p>
            {section.codeBlock && (
              <pre style={{ ...preBlock, marginTop: "0.875rem" }}>
                <code>{section.codeBlock}</code>
              </pre>
            )}
          </div>
        ))}

      {/* Children passthrough */}
      {children}
    </div>
  );
}

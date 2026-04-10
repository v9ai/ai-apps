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
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 3vw, 4rem)",
  paddingBottom: "4rem",
  lineHeight: 1.75,
  fontSize: "1.05rem",
};

const cardBorder = "1px solid var(--gray-a3, rgba(0,0,0,0.08))";
const cardRadius = "12px";
const subtleBg = "var(--gray-a2, rgba(0,0,0,0.03))";
const mutedColor = "var(--gray-a8, rgba(0,0,0,0.5))";
const faintColor = "var(--gray-a6, rgba(0,0,0,0.35))";

const sectionHeading: React.CSSProperties = {
  fontSize: "1.35rem",
  fontWeight: 700,
  margin: "3.5rem 0 0.5rem",
  letterSpacing: "-0.02em",
  color: "var(--gray-12, #111)",
};

const sectionSubtitle: React.CSSProperties = {
  margin: "0 0 1.25rem",
  color: mutedColor,
  fontSize: "0.925rem",
  lineHeight: 1.6,
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
  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
};

const mono = "'SF Mono', 'Fira Code', 'Cascadia Code', monospace";

// ─── Metadata tags renderer ──────────────────────────────────────

function MetadataTags({ metadata }: { metadata: Record<string, string> }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.5rem" }}>
      {Object.entries(metadata).map(([k, v]) => (
        <span
          key={k}
          className="hiw-meta-tag"
          style={{
            fontSize: "0.7rem",
            padding: "0.15rem 0.5rem",
            borderRadius: "6px",
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

// ─── Section wrapper ─────────────────────────────────────────────

function Section({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <section id={id} style={{ position: "relative" }}>
      {children}
    </section>
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
        <h2
          style={{
            fontSize: "2.25rem",
            fontWeight: 800,
            margin: "2.5rem 0 0",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <p style={{ color: mutedColor, margin: "0.75rem 0 0", fontSize: "1.1rem", lineHeight: 1.65 }}>
          {subtitle}
        </p>
      )}

      {/* Story — styled callout with gradient overlay */}
      {story && (
        <div
          className="hiw-story"
          style={{
            margin: "2.25rem 0 0",
            padding: "1.5rem 1.75rem",
            borderLeft: "3px solid var(--indigo-9, #3451b2)",
            backgroundColor: "var(--indigo-a2, rgba(52,81,178,0.03))",
            borderRadius: "0 12px 12px 0",
            fontSize: "0.975rem",
            lineHeight: 1.85,
            color: "var(--gray-12, #111)",
            position: "relative",
          }}
        >
          <span style={{ position: "relative", zIndex: 1 }}>{story}</span>
        </div>
      )}

      {/* Stats — responsive grid of cards */}
      {stats && stats.length > 0 && (
        <Section id="hiw-metrics">
          <h3 style={sectionHeading}>Key Metrics</h3>
          <p style={sectionSubtitle}>Numbers that define the architecture</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {stats.map((s, i) => (
              <div
                key={i}
                className="hiw-stat-card"
                style={{
                  padding: "1.125rem 1.25rem",
                  border: cardBorder,
                  borderRadius: cardRadius,
                  background: "var(--color-background, #fff)",
                }}
              >
                <div
                  className="hiw-stat-number"
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    fontFamily: mono,
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.number}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--gray-11, #333)",
                    marginTop: "0.35rem",
                    lineHeight: 1.45,
                  }}
                >
                  {s.label}
                </div>
                {s.source && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: faintColor,
                      marginTop: "0.4rem",
                      fontStyle: "italic",
                      lineHeight: 1.4,
                    }}
                  >
                    {s.source}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Papers — responsive grid of cards */}
      {sorted.length > 0 && (
        <Section id="hiw-foundations">
          <h3 style={sectionHeading}>Technical Foundations</h3>
          <p style={sectionSubtitle}>
            {sorted.length} technologies powering the platform
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "0.75rem",
            }}
          >
            {sorted.map((paper) => (
              <div
                key={paper.slug}
                className="hiw-paper-card"
                style={{
                  padding: "1.25rem",
                  border: cardBorder,
                  borderRadius: cardRadius,
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--color-background, #fff)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.625rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.6rem",
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
                    <span style={{ fontSize: "0.7rem", color: faintColor }}>{paper.year}</span>
                  )}
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: faintColor,
                      fontFamily: mono,
                    }}
                  >
                    #{paper.number}
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "1.05rem",
                    marginBottom: "0.15rem",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {paper.title}
                </div>
                {paper.authors && (
                  <div style={{ fontSize: "0.8rem", color: mutedColor }}>{paper.authors}</div>
                )}
                {paper.finding && (
                  <p
                    style={{
                      fontSize: "0.85rem",
                      margin: "0.6rem 0 0.25rem",
                      lineHeight: 1.55,
                    }}
                  >
                    <strong style={{ color: "var(--indigo-11, #3451b2)" }}>Core:</strong>{" "}
                    {paper.finding}
                  </p>
                )}
                {paper.relevance && (
                  <p
                    style={{
                      fontSize: "0.825rem",
                      margin: "0.25rem 0 0",
                      lineHeight: 1.55,
                      color: mutedColor,
                    }}
                  >
                    <strong style={{ color: "var(--gray-11, #333)" }}>In this app:</strong>{" "}
                    {paper.relevance}
                  </p>
                )}
                {paper.url && (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hiw-paper-link"
                    style={{
                      fontSize: "0.8rem",
                      marginTop: "auto",
                      paddingTop: "0.625rem",
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
        </Section>
      )}

      {/* Pipeline Stages — numbered cards with animated connector */}
      {agents && agents.length > 0 && (
        <Section id="hiw-pipeline">
          <h3 style={sectionHeading}>Pipeline Stages</h3>
          <p style={sectionSubtitle}>
            {agents.length} stages from PDF upload to guarded response
          </p>
          <div style={{ position: "relative", paddingLeft: "2.25rem" }}>
            {/* Vertical connector line with gradient */}
            <div
              className="hiw-pipeline-connector"
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "1.25rem",
                bottom: "1.25rem",
                width: "2px",
                borderRadius: "1px",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {agents.map((agent, i) => (
                <div
                  key={agent.name}
                  className="hiw-pipeline-card"
                  tabIndex={0}
                  style={{
                    position: "relative",
                    padding: "1.25rem 1.25rem 1rem",
                    border: cardBorder,
                    borderRadius: cardRadius,
                    background: "var(--color-background, #fff)",
                    cursor: "default",
                  }}
                >
                  {/* Number dot on the connector line */}
                  <div
                    className="hiw-pipeline-dot"
                    style={{
                      position: "absolute",
                      left: "-2.85rem",
                      top: "1.25rem",
                      width: "1.5rem",
                      height: "1.5rem",
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
                  <div style={{ marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <strong style={{ fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
                      {agent.name}
                    </strong>
                    {agent.researchBasis && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "4px",
                          backgroundColor: subtleBg,
                          color: faintColor,
                          border: cardBorder,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {agent.researchBasis}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      margin: "0 0 0.5rem",
                      fontSize: "0.9rem",
                      lineHeight: 1.65,
                      color: "var(--gray-11, #333)",
                    }}
                  >
                    {agent.description}
                  </p>
                  {agent.dataFlow && (
                    <div
                      className="hiw-data-flow"
                      style={{
                        display: "inline-block",
                        fontSize: "0.775rem",
                        fontFamily: mono,
                        color: "var(--indigo-11, #3451b2)",
                        backgroundColor: "var(--indigo-a2, rgba(52,81,178,0.04))",
                        padding: "0.35rem 0.65rem",
                        borderRadius: "6px",
                        margin: "0.25rem 0 0",
                        border: "1px solid var(--indigo-a3, rgba(52,81,178,0.08))",
                      }}
                    >
                      {agent.dataFlow}
                    </div>
                  )}
                  {agent.codeSnippet && (
                    <pre className="hiw-pipeline-code" style={{ ...preBlock, border: "none", backgroundColor: "var(--gray-a2)" }}>
                      <code>{agent.codeSnippet}</code>
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Technical Details */}
      {technicalDetails &&
        technicalDetails.length > 0 &&
        technicalDetails.map((td, i) => (
          <Section key={i}>
            <div style={{ margin: "2.75rem 0 0" }}>
              <h3 style={{ ...sectionHeading, margin: "0 0 0.35rem" }}>{td.heading}</h3>
              {td.description && <p style={sectionSubtitle}>{td.description}</p>}

              {/* Table */}
              {td.type === "table" &&
                td.items &&
                (() => {
                  const metaKeys = Array.from(
                    new Set(
                      td.items.flatMap((item) =>
                        item.metadata ? Object.keys(item.metadata) : []
                      )
                    )
                  );
                  const thStyle: React.CSSProperties = {
                    textAlign: "left",
                    padding: "0.7rem 0.875rem",
                    borderBottom: "2px solid var(--gray-a4, rgba(0,0,0,0.1))",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: mutedColor,
                  };
                  return (
                    <div
                      style={{
                        overflowX: "auto",
                        border: cardBorder,
                        borderRadius: cardRadius,
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "0.85rem",
                        }}
                      >
                        <thead>
                          <tr>
                            <th style={thStyle}>Metric</th>
                            <th style={thStyle}>Formula</th>
                            {metaKeys.map((key) => (
                              <th key={key} style={{ ...thStyle, whiteSpace: "nowrap" }}>
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {td.items.map((item, j) => (
                            <tr
                              key={j}
                              className="hiw-table-row"
                              style={{
                                backgroundColor:
                                  j % 2 === 1 ? subtleBg : "transparent",
                              }}
                            >
                              <td
                                style={{
                                  padding: "0.7rem 0.875rem",
                                  borderBottom: `1px solid var(--gray-a3, rgba(0,0,0,0.06))`,
                                  fontWeight: 600,
                                }}
                              >
                                {item.label}
                              </td>
                              <td
                                style={{
                                  padding: "0.7rem 0.875rem",
                                  borderBottom: `1px solid var(--gray-a3, rgba(0,0,0,0.06))`,
                                  fontFamily: mono,
                                  fontSize: "0.8rem",
                                }}
                              >
                                {item.value}
                              </td>
                              {metaKeys.map((key) => (
                                <td
                                  key={key}
                                  style={{
                                    padding: "0.7rem 0.875rem",
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

              {/* Card grid */}
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
                      className="hiw-detail-card"
                      style={{
                        padding: "1.125rem",
                        border: cardBorder,
                        borderRadius: cardRadius,
                        background: "var(--color-background, #fff)",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: "0.3rem",
                          fontSize: "0.95rem",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--gray-11, #333)",
                          lineHeight: 1.55,
                        }}
                      >
                        {item.value}
                      </div>
                      {item.metadata && <MetadataTags metadata={item.metadata} />}
                    </div>
                  ))}
                </div>
              )}

              {/* Code / Diagram */}
              {(td.type === "code" || td.type === "diagram") && td.code && (
                <div
                  className="hiw-code-block"
                  style={{
                    border: cardBorder,
                    borderRadius: cardRadius,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "var(--gray-a3, rgba(0,0,0,0.05))",
                      borderBottom: cardBorder,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: faintColor,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor:
                          td.type === "diagram"
                            ? "var(--indigo-9)"
                            : "var(--green-9)",
                        display: "inline-block",
                      }}
                    />
                    {td.type === "diagram" ? "architecture" : "code"}
                  </div>
                  <pre
                    style={{
                      ...preBlock,
                      border: "none",
                      borderRadius: 0,
                      whiteSpace: td.type === "diagram" ? "pre" : "pre-wrap",
                      fontSize: td.type === "diagram" ? "0.72rem" : "0.8rem",
                    }}
                  >
                    <code>{td.code}</code>
                  </pre>
                </div>
              )}
            </div>
          </Section>
        ))}

      {/* Extra Sections */}
      {extraSections &&
        extraSections.length > 0 &&
        extraSections.map((section, i) => (
          <div key={i} className="hiw-extra-section" style={{ paddingLeft: "1.25rem" }}>
            <hr className="hiw-separator" style={{ marginLeft: "-1.25rem" }} />
            <h3
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                margin: "0 0 0.75rem",
                letterSpacing: "-0.01em",
              }}
            >
              {section.heading}
            </h3>
            <p
              style={{
                margin: 0,
                lineHeight: 1.8,
                color: "var(--gray-11, #333)",
                fontSize: "0.95rem",
              }}
            >
              {section.content}
            </p>
            {section.codeBlock && (
              <pre
                className="hiw-code-block"
                style={{ ...preBlock, marginTop: "0.875rem" }}
              >
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

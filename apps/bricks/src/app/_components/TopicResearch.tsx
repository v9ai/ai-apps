"use client";

import { useState } from "react";
import { css } from "styled-system/css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TopicResult {
  mocs: Array<{
    moc_id: string;
    designer: string;
    name: string;
    url: string;
  }>;
  analysis: {
    mechanism_description: string;
    technique_categories: Array<{
      name: string;
      description: string;
      moc_ids: string[];
    }>;
    key_parts: Array<{
      name: string;
      part_number: string;
      role: string;
    }>;
  };
  synthesis: {
    summary: string;
    difficulty_range: string;
    recommended_start_moc: string;
    common_techniques: string[];
    unique_approaches: Array<{
      moc_id: string;
      name: string;
      approach: string;
    }>;
  };
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PHASE_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

const STUD_COLORS = [
  "#E3000B",
  "#006CB7",
  "#00852B",
  "#FE8A18",
  "#FFD500",
  "#8B4798",
  "#003A70",
  "#58AB41",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TopicResearch({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [topicName, setTopicName] = useState("");
  const [mocUrlsText, setMocUrlsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopicResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleResearch() {
    const name = topicName.trim();
    const urls = mocUrlsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!name || urls.length === 0) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const resp = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName: name, mocUrls: urls }),
      });
      const data = await resp.json();
      if (!resp.ok || data.error) {
        setError(data.error || "Research failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      const resp = await fetch("/api/research/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicName,
          mocUrls: mocUrlsText.split("\n").map((l) => l.trim()).filter(Boolean),
          mocs: result.mocs,
          analysis: result.analysis,
          synthesis: result.synthesis,
        }),
      });
      if (resp.ok) setSaved(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  /* Build a quick lookup: moc_id -> approach text */
  const approachMap = new Map(
    result?.synthesis?.unique_approaches?.map((u) => [u.moc_id, u.approach]) ??
      [],
  );

  return (
    <section className={css({ mt: "16" })}>
      {/* ── Section divider ── */}
      <div
        className={css({
          h: "2px",
          mb: "10",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(0,108,183,0.3) 20%, rgba(0,108,183,0.5) 50%, rgba(0,108,183,0.3) 80%, transparent 100%)",
        })}
      />

      {/* ── Section title ── */}
      <div className={css({ mb: "6", textAlign: "center" })}>
        <div
          className={css({
            display: "flex",
            justifyContent: "center",
            gap: "2",
            mb: "3",
          })}
        >
          {["#006CB7", "#FFD500", "#00852B"].map((color, i) => (
            <div
              key={i}
              className={css({
                w: "3",
                h: "3",
                rounded: "stud",
                boxShadow: "stud",
              })}
              style={{ background: color }}
            />
          ))}
        </div>
        <h2
          className={css({
            fontSize: "2xl",
            fontWeight: "900",
            fontFamily: "display",
            letterSpacing: "-0.02em",
            color: "ink.primary",
          })}
        >
          Topic Research
        </h2>
        <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
          Analyze a building technique across multiple Rebrickable MOCs
        </p>
      </div>

      {/* ── Input form ── */}
      <div
        className={css({
          display: "flex",
          flexDir: "column",
          gap: "2",
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          p: "3",
          boxShadow: "brick",
          transition: "all 0.2s ease",
          _focusWithin: {
            borderColor: "lego.blue",
            boxShadow: "brick.hover",
          },
        })}
      >
        <input
          type="text"
          value={topicName}
          onChange={(e) => setTopicName(e.target.value)}
          placeholder="Spring Shooters, Tank Treads, etc."
          disabled={loading}
          className={css({
            bg: "transparent",
            px: "3",
            py: "2",
            fontSize: "sm",
            color: "ink.primary",
            outline: "none",
            border: "none",
            _placeholder: { color: "ink.faint" },
          })}
        />

        <textarea
          value={mocUrlsText}
          onChange={(e) => setMocUrlsText(e.target.value)}
          placeholder="Paste Rebrickable MOC URLs, one per line..."
          disabled={loading}
          rows={4}
          className={css({
            bg: "transparent",
            px: "3",
            py: "2",
            fontSize: "sm",
            color: "ink.primary",
            outline: "none",
            border: "none",
            borderTop: "1px solid",
            borderColor: "plate.border",
            resize: "vertical",
            fontFamily: "body",
            lineHeight: "1.7",
            _placeholder: { color: "ink.faint" },
          })}
        />

        <div className={css({ display: "flex", justifyContent: "flex-end" })}>
          <button
            onClick={handleResearch}
            disabled={loading || !topicName.trim() || !mocUrlsText.trim()}
            className={css({
              rounded: "lg",
              bg: "lego.blue",
              px: "6",
              py: "2.5",
              fontSize: "sm",
              fontWeight: "800",
              fontFamily: "display",
              color: "white",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #004A80, 0 3px 6px rgba(0,0,0,0.3)",
              _hover: {
                bg: "#0080E0",
                transform: "translateY(-1px)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #004A80, 0 5px 10px rgba(0,0,0,0.35)",
              },
              _active: {
                transform: "translateY(1px)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 0 #004A80, 0 1px 3px rgba(0,0,0,0.2)",
              },
              _disabled: { opacity: 0.5, cursor: "not-allowed" },
            })}
          >
            {loading ? "Researching..." : "Research"}
          </button>
        </div>
      </div>

      {/* ── Loading spinner ── */}
      {loading && (
        <div className={css({ mt: "10", textAlign: "center" })}>
          <div
            className={css({
              mx: "auto",
              w: "12",
              h: "12",
              rounded: "stud",
              bg: "lego.blue",
              boxShadow: "stud",
              animation: "spin 1s linear infinite",
            })}
          />
          <p
            className={css({
              mt: "4",
              fontSize: "sm",
              fontWeight: "600",
              color: "ink.muted",
            })}
          >
            Researching MOCs and analyzing techniques...
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div
          className={css({
            mt: "6",
            rounded: "brick",
            border: "2px solid",
            borderColor: "rgba(227, 0, 11, 0.3)",
            bg: "rgba(227, 0, 11, 0.08)",
            px: "4",
            py: "3",
            fontSize: "sm",
            fontWeight: "500",
            color: "#FF6B6B",
            boxShadow: "plate",
          })}
        >
          {error}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div
          className={css({
            mt: "10",
            display: "flex",
            flexDir: "column",
            gap: "10",
          })}
        >
          {/* ─── Topic header ─── */}
          <div>
            <div
              className={css({
                display: "flex",
                alignItems: "center",
                gap: "3",
                flexWrap: "wrap",
              })}
            >
              <h2
                className={css({
                  fontSize: "2xl",
                  fontWeight: "900",
                  fontFamily: "display",
                  letterSpacing: "-0.02em",
                  color: "ink.primary",
                })}
              >
                {topicName}
              </h2>
              {isLoggedIn && (
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className={css({
                    rounded: "lg",
                    bg: saved ? "lego.green" : "lego.blue",
                    px: "4",
                    py: "1.5",
                    fontSize: "xs",
                    fontWeight: "800",
                    fontFamily: "display",
                    color: "white",
                    cursor: "pointer",
                    border: "none",
                    transition: "all 0.15s ease",
                    boxShadow:
                      saved
                        ? "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #005A1A, 0 3px 6px rgba(0,0,0,0.3)"
                        : "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #004A80, 0 3px 6px rgba(0,0,0,0.3)",
                    _hover: {
                      transform: "translateY(-1px)",
                    },
                    _disabled: { opacity: 0.6, cursor: "not-allowed", transform: "none" },
                  })}
                >
                  {saved ? "Saved!" : saving ? "Saving..." : "Save Research"}
                </button>
              )}
              {result.synthesis?.difficulty_range && (
                <span
                  className={css({
                    fontSize: "xs",
                    fontWeight: "700",
                    color: "lego.orange",
                    bg: "rgba(254, 138, 24, 0.1)",
                    px: "2.5",
                    py: "1",
                    rounded: "md",
                  })}
                >
                  {result.synthesis.difficulty_range}
                </span>
              )}
            </div>
            {result.synthesis?.summary && (
              <p
                className={css({
                  mt: "4",
                  fontSize: "sm",
                  color: "ink.secondary",
                  lineHeight: "1.7",
                  bg: "plate.surface",
                  rounded: "brick",
                  px: "4",
                  py: "3",
                  border: "1px solid",
                  borderColor: "plate.border",
                  boxShadow: "plate",
                })}
              >
                {result.synthesis.summary}
              </p>
            )}
          </div>

          {/* ─── MOC cards grid ─── */}
          {result.mocs && result.mocs.length > 0 && (
            <div>
              {/* Section header */}
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "2",
                  mb: "4",
                })}
              >
                <div
                  className={css({
                    w: "5",
                    h: "5",
                    rounded: "stud",
                    bg: "lego.yellow",
                    boxShadow: "stud",
                    flexShrink: 0,
                  })}
                />
                <h2
                  className={css({
                    fontSize: "md",
                    fontWeight: "800",
                    fontFamily: "display",
                    color: "ink.primary",
                    letterSpacing: "-0.01em",
                  })}
                >
                  MOCs Analyzed
                </h2>
                <span
                  className={css({
                    fontSize: "xs",
                    fontWeight: "700",
                    color: "lego.yellow",
                    bg: "rgba(255, 213, 0, 0.1)",
                    px: "2",
                    py: "0.5",
                    rounded: "md",
                  })}
                >
                  {result.mocs.length} builds
                </span>
              </div>

              <div
                className={css({
                  display: "grid",
                  gap: "3",
                  lg: { gridTemplateColumns: "1fr 1fr" },
                })}
              >
                {result.mocs.map((moc, i) => (
                  <div
                    key={moc.moc_id}
                    className={css({
                      bg: "plate.surface",
                      rounded: "brick",
                      border: "1px solid",
                      borderColor: "plate.border",
                      boxShadow: "plate",
                      px: "4",
                      py: "3",
                      transition: "all 0.15s ease",
                      _hover: {
                        bg: "plate.hover",
                        borderColor: "plate.borderHover",
                        transform: "translateY(-1px)",
                        boxShadow: "brick",
                      },
                    })}
                  >
                    <div
                      className={css({
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "3",
                      })}
                    >
                      {/* Stud index marker */}
                      <div
                        className={css({
                          w: "7",
                          h: "7",
                          rounded: "stud",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "xs",
                          fontWeight: "900",
                          fontFamily: "display",
                          color: "white",
                          boxShadow: "stud",
                          flexShrink: 0,
                        })}
                        style={{
                          background:
                            PHASE_COLORS[i % PHASE_COLORS.length],
                        }}
                      >
                        {i + 1}
                      </div>

                      <div className={css({ flex: 1, minW: 0 })}>
                        <div
                          className={css({
                            fontSize: "sm",
                            fontWeight: "700",
                            fontFamily: "display",
                            color: "ink.primary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          })}
                        >
                          {moc.name}
                        </div>
                        <div
                          className={css({
                            fontSize: "xs",
                            color: "ink.muted",
                            mt: "0.5",
                          })}
                        >
                          by {moc.designer}
                        </div>
                        <a
                          href={moc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={css({
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "1",
                            mt: "1.5",
                            fontSize: "xs",
                            fontWeight: "600",
                            color: "lego.blue",
                            textDecoration: "none",
                            _hover: { textDecoration: "underline" },
                          })}
                        >
                          View on Rebrickable &#8599;
                        </a>
                        {approachMap.has(moc.moc_id) && (
                          <p
                            className={css({
                              mt: "2",
                              fontSize: "xs",
                              color: "ink.secondary",
                              lineHeight: "1.6",
                              bg: "rgba(255,255,255,0.03)",
                              rounded: "md",
                              px: "2.5",
                              py: "1.5",
                              border: "1px solid",
                              borderColor: "plate.border",
                            })}
                          >
                            {approachMap.get(moc.moc_id)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Mechanism Analysis ─── */}
          {result.analysis && (
            <div>
              {/* Section header */}
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "2",
                  mb: "4",
                })}
              >
                <div
                  className={css({
                    w: "5",
                    h: "5",
                    rounded: "stud",
                    bg: "lego.orange",
                    boxShadow: "stud",
                    flexShrink: 0,
                  })}
                />
                <h2
                  className={css({
                    fontSize: "md",
                    fontWeight: "800",
                    fontFamily: "display",
                    color: "ink.primary",
                    letterSpacing: "-0.01em",
                  })}
                >
                  Mechanism Analysis
                </h2>
              </div>

              {result.analysis.mechanism_description && (
                <p
                  className={css({
                    mb: "5",
                    fontSize: "sm",
                    color: "ink.secondary",
                    lineHeight: "1.7",
                    bg: "plate.surface",
                    rounded: "brick",
                    px: "4",
                    py: "3",
                    border: "1px solid",
                    borderColor: "plate.border",
                    boxShadow: "plate",
                  })}
                >
                  {result.analysis.mechanism_description}
                </p>
              )}

              {/* Technique categories timeline */}
              {result.analysis.technique_categories &&
                result.analysis.technique_categories.length > 0 && (
                  <div
                    className={css({
                      display: "flex",
                      flexDir: "column",
                      gap: "0",
                    })}
                  >
                    {result.analysis.technique_categories.map((cat, i) => {
                      const color =
                        PHASE_COLORS[i % PHASE_COLORS.length];
                      const isLast =
                        i ===
                        result.analysis.technique_categories.length - 1;

                      return (
                        <div
                          key={i}
                          className={css({ display: "flex", gap: "4" })}
                        >
                          {/* Timeline track */}
                          <div
                            className={css({
                              display: "flex",
                              flexDir: "column",
                              alignItems: "center",
                              w: "8",
                              flexShrink: 0,
                            })}
                          >
                            {/* Stud marker */}
                            <div
                              className={css({
                                w: "8",
                                h: "8",
                                rounded: "stud",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "xs",
                                fontWeight: "900",
                                fontFamily: "display",
                                color: "white",
                                boxShadow: "stud",
                                flexShrink: 0,
                              })}
                              style={{ background: color }}
                            >
                              {i + 1}
                            </div>
                            {/* Connector line */}
                            {!isLast && (
                              <div
                                className={css({
                                  w: "2px",
                                  flex: 1,
                                  minH: "4",
                                  opacity: 0.2,
                                })}
                                style={{ background: color }}
                              />
                            )}
                          </div>

                          {/* Category content */}
                          <div
                            className={css({
                              pb: isLast ? "0" : "5",
                              flex: 1,
                            })}
                          >
                            <h3
                              className={css({
                                fontSize: "sm",
                                fontWeight: "700",
                                fontFamily: "display",
                                color: "ink.primary",
                              })}
                            >
                              {cat.name}
                            </h3>
                            <p
                              className={css({
                                mt: "1",
                                fontSize: "xs",
                                color: "ink.muted",
                                lineHeight: "1.6",
                              })}
                            >
                              {cat.description}
                            </p>
                            {cat.moc_ids && cat.moc_ids.length > 0 && (
                              <div
                                className={css({
                                  mt: "1.5",
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "1.5",
                                })}
                              >
                                {cat.moc_ids.map((id) => (
                                  <span
                                    key={id}
                                    className={css({
                                      display: "inline-block",
                                      fontSize: "xs",
                                      fontWeight: "600",
                                      px: "2",
                                      py: "0.5",
                                      rounded: "md",
                                      bg: "rgba(255,255,255,0.04)",
                                      border: "1px solid",
                                      borderColor: "plate.border",
                                    })}
                                    style={{ color }}
                                  >
                                    {id}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          )}

          {/* ─── Key Parts ─── */}
          {result.analysis?.key_parts &&
            result.analysis.key_parts.length > 0 && (
              <div>
                {/* Section header */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                    mb: "4",
                  })}
                >
                  <div
                    className={css({
                      w: "5",
                      h: "5",
                      rounded: "stud",
                      bg: "lego.green",
                      boxShadow: "stud",
                      flexShrink: 0,
                    })}
                  />
                  <h2
                    className={css({
                      fontSize: "md",
                      fontWeight: "800",
                      fontFamily: "display",
                      color: "ink.primary",
                      letterSpacing: "-0.01em",
                    })}
                  >
                    Key Parts
                  </h2>
                  <span
                    className={css({
                      fontSize: "xs",
                      fontWeight: "700",
                      color: "lego.green",
                      bg: "rgba(0, 133, 43, 0.1)",
                      px: "2",
                      py: "0.5",
                      rounded: "md",
                    })}
                  >
                    {result.analysis.key_parts.length} parts
                  </span>
                </div>

                <div
                  className={css({
                    display: "flex",
                    flexDir: "column",
                    gap: "1.5",
                  })}
                >
                  {result.analysis.key_parts.map((part, i) => {
                    const studColor =
                      STUD_COLORS[i % STUD_COLORS.length];
                    return (
                      <div
                        key={i}
                        className={css({
                          display: "flex",
                          alignItems: "center",
                          gap: "3",
                          bg: "plate.surface",
                          rounded: "brick",
                          px: "3",
                          py: "2.5",
                          border: "1px solid",
                          borderColor: "plate.border",
                          boxShadow: "plate",
                          transition: "all 0.15s ease",
                          _hover: {
                            bg: "plate.hover",
                            borderColor: "plate.borderHover",
                            transform: "translateY(-1px)",
                            boxShadow: "brick",
                          },
                        })}
                      >
                        {/* Color swatch stud */}
                        <div
                          className={css({
                            w: "6",
                            h: "6",
                            rounded: "stud",
                            flexShrink: 0,
                            boxShadow: "stud",
                            border: "1px solid rgba(255,255,255,0.1)",
                          })}
                          style={{ background: studColor }}
                        />

                        {/* Part info */}
                        <div className={css({ flex: 1, minW: 0 })}>
                          <div
                            className={css({
                              fontSize: "sm",
                              fontWeight: "600",
                              color: "ink.primary",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            })}
                          >
                            {part.name}
                          </div>
                          <div
                            className={css({
                              fontSize: "xs",
                              color: "ink.muted",
                              mt: "0.5",
                            })}
                          >
                            {part.part_number
                              ? `#${part.part_number}`
                              : ""}
                            {part.part_number && part.role
                              ? " \u00B7 "
                              : ""}
                            {part.role}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* ─── Common Techniques ─── */}
          {result.synthesis?.common_techniques &&
            result.synthesis.common_techniques.length > 0 && (
              <div>
                {/* Section header */}
                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                    mb: "4",
                  })}
                >
                  <div
                    className={css({
                      w: "5",
                      h: "5",
                      rounded: "stud",
                      bg: "lego.red",
                      boxShadow: "stud",
                      flexShrink: 0,
                    })}
                  />
                  <h2
                    className={css({
                      fontSize: "md",
                      fontWeight: "800",
                      fontFamily: "display",
                      color: "ink.primary",
                      letterSpacing: "-0.01em",
                    })}
                  >
                    Common Techniques
                  </h2>
                </div>

                <div
                  className={css({
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "2",
                  })}
                >
                  {result.synthesis.common_techniques.map(
                    (technique, i) => (
                      <span
                        key={i}
                        className={css({
                          rounded: "md",
                          bg: "plate.surface",
                          border: "1px solid",
                          borderColor: "plate.border",
                          px: "3",
                          py: "1.5",
                          fontSize: "xs",
                          fontWeight: "600",
                          color: "ink.secondary",
                          boxShadow: "plate",
                          transition: "all 0.15s ease",
                          _hover: {
                            bg: "plate.hover",
                            borderColor: "plate.borderHover",
                            transform: "translateY(-1px)",
                            boxShadow: "brick",
                          },
                        })}
                      >
                        {technique}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}

          {/* ─── Recommended starting MOC ─── */}
          {result.synthesis?.recommended_start_moc && (
            <div
              className={css({
                bg: "plate.surface",
                rounded: "brick",
                border: "1px solid",
                borderColor: "plate.border",
                boxShadow: "plate",
                px: "4",
                py: "3",
                display: "flex",
                alignItems: "center",
                gap: "3",
              })}
            >
              <div
                className={css({
                  w: "5",
                  h: "5",
                  rounded: "stud",
                  bg: "lego.green",
                  boxShadow: "stud",
                  flexShrink: 0,
                })}
              />
              <div>
                <span
                  className={css({
                    fontSize: "xs",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "ink.muted",
                  })}
                >
                  Recommended starting build
                </span>
                <div
                  className={css({
                    mt: "0.5",
                    fontSize: "sm",
                    fontWeight: "600",
                    color: "ink.primary",
                  })}
                >
                  {result.synthesis.recommended_start_moc}
                </div>
              </div>
            </div>
          )}

          {/* ─── Result error (partial) ─── */}
          {result.error && (
            <div
              className={css({
                rounded: "brick",
                border: "2px solid",
                borderColor: "rgba(227, 0, 11, 0.3)",
                bg: "rgba(227, 0, 11, 0.08)",
                px: "4",
                py: "3",
                fontSize: "sm",
                fontWeight: "500",
                color: "#FF6B6B",
                boxShadow: "plate",
              })}
            >
              {result.error}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

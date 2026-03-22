"use client";

import { useEffect, useState } from "react";
import { css } from "styled-system/css";

interface SavedItem {
  id: number;
  topicName: string;
  mocs: Array<{ moc_id: string; designer: string; name: string; url: string }>;
  analysis: {
    mechanism_description?: string;
    key_parts?: Array<{
      name: string;
      part_number: string;
      role: string;
      image_url?: string;
    }>;
  };
  synthesis: {
    summary?: string;
    difficulty_range?: string;
  };
  createdAt: string;
}

const STUD_COLORS = ["#FE8A18", "#006CB7", "#00852B", "#E3000B", "#FFD500"];

export function SavedResearch() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/research")
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    const resp = await fetch(`/api/research/${id}`, { method: "DELETE" });
    if (resp.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  }

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <section className={css({ mt: "16" })}>
      {/* Divider */}
      <div
        className={css({
          h: "2px",
          mb: "10",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(254,138,24,0.3) 20%, rgba(254,138,24,0.5) 50%, rgba(254,138,24,0.3) 80%, transparent 100%)",
        })}
      />

      {/* Section header */}
      <div className={css({ mb: "6", textAlign: "center" })}>
        <div
          className={css({
            display: "flex",
            justifyContent: "center",
            gap: "2",
            mb: "3",
          })}
        >
          {["#FE8A18", "#FFD500", "#E3000B"].map((color, i) => (
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
          My Research
        </h2>
        <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
          {items.length} saved {items.length === 1 ? "topic" : "topics"}
        </p>
      </div>

      {/* Cards */}
      <div className={css({ display: "flex", flexDir: "column", gap: "3" })}>
        {items.map((item, i) => {
          const isExpanded = expanded === item.id;
          return (
            <div
              key={item.id}
              className={css({
                bg: "plate.surface",
                rounded: "brick",
                border: "1px solid",
                borderColor: isExpanded ? "plate.borderHover" : "plate.border",
                boxShadow: isExpanded ? "brick" : "plate",
                overflow: "hidden",
                transition: "all 0.15s ease",
              })}
            >
              {/* Card header */}
              <div
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "3",
                  px: "4",
                  py: "3",
                  cursor: "pointer",
                  _hover: { bg: "plate.hover" },
                })}
                onClick={() => setExpanded(isExpanded ? null : item.id)}
              >
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
                  style={{ background: STUD_COLORS[i % STUD_COLORS.length] }}
                >
                  {item.mocs.length}
                </div>
                <div className={css({ flex: 1, minW: 0 })}>
                  <div
                    className={css({
                      fontSize: "sm",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "ink.primary",
                    })}
                  >
                    {item.topicName}
                  </div>
                  <div className={css({ fontSize: "xs", color: "ink.muted", mt: "0.5" })}>
                    {item.synthesis?.difficulty_range && (
                      <span>{item.synthesis.difficulty_range} · </span>
                    )}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className={css({
                    fontSize: "xs",
                    fontWeight: "600",
                    color: "ink.faint",
                    bg: "transparent",
                    border: "none",
                    cursor: "pointer",
                    px: "2",
                    py: "1",
                    rounded: "md",
                    transition: "all 0.15s",
                    _hover: { color: "lego.red", bg: "rgba(227,0,11,0.08)" },
                  })}
                >
                  Delete
                </button>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div
                  className={css({
                    px: "4",
                    pb: "4",
                    borderTop: "1px solid",
                    borderColor: "plate.border",
                  })}
                >
                  {/* Summary */}
                  {item.synthesis?.summary && (
                    <p
                      className={css({
                        mt: "3",
                        fontSize: "sm",
                        color: "ink.secondary",
                        lineHeight: "1.7",
                      })}
                    >
                      {item.synthesis.summary}
                    </p>
                  )}

                  {/* MOCs list */}
                  <div className={css({ mt: "4" })}>
                    <h3
                      className={css({
                        fontSize: "xs",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "ink.muted",
                        mb: "2",
                      })}
                    >
                      MOCs
                    </h3>
                    <div className={css({ display: "flex", flexDir: "column", gap: "1.5" })}>
                      {item.mocs.map((moc) => (
                        <div
                          key={moc.moc_id}
                          className={css({
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "sm",
                          })}
                        >
                          <span className={css({ color: "ink.primary", fontWeight: "500" })}>
                            {moc.name}
                          </span>
                          <a
                            href={moc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={css({
                              fontSize: "xs",
                              color: "lego.blue",
                              textDecoration: "none",
                              _hover: { textDecoration: "underline" },
                            })}
                          >
                            {moc.moc_id} &#8599;
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key parts with images */}
                  {item.analysis?.key_parts && item.analysis.key_parts.length > 0 && (
                    <div className={css({ mt: "4" })}>
                      <h3
                        className={css({
                          fontSize: "xs",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "ink.muted",
                          mb: "2",
                        })}
                      >
                        Key Parts
                      </h3>
                      <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>
                        {item.analysis.key_parts.map((part, j) => (
                          <div
                            key={j}
                            className={css({
                              display: "flex",
                              alignItems: "center",
                              gap: "2",
                              bg: "plate.raised",
                              rounded: "lg",
                              px: "2.5",
                              py: "1.5",
                              border: "1px solid",
                              borderColor: "plate.border",
                            })}
                          >
                            {part.image_url ? (
                              <img
                                src={part.image_url}
                                alt={part.name}
                                className={css({
                                  w: "8",
                                  h: "8",
                                  objectFit: "contain",
                                  rounded: "md",
                                  bg: "white",
                                  p: "0.5",
                                  flexShrink: 0,
                                })}
                              />
                            ) : (
                              <div
                                className={css({
                                  w: "4",
                                  h: "4",
                                  rounded: "stud",
                                  bg: "lego.orange",
                                  boxShadow: "stud",
                                  flexShrink: 0,
                                })}
                              />
                            )}
                            <div>
                              <div className={css({ fontSize: "xs", fontWeight: "600", color: "ink.primary" })}>
                                {part.name}
                              </div>
                              {part.part_number && (
                                <div className={css({ fontSize: "xs", color: "ink.faint" })}>
                                  #{part.part_number}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

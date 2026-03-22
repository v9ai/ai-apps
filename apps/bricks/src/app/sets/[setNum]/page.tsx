"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { css } from "styled-system/css";

interface SetPart {
  partNum: string;
  name: string;
  imageUrl: string | null;
  colorId: number;
  colorName: string;
  colorRgb: string;
  quantity: number;
  isSpare: boolean;
}

interface SetMoc {
  mocId: string;
  name: string;
  year: number;
  numParts: number;
  imageUrl: string | null;
  mocUrl: string;
  designer: string;
}

interface SetDetail {
  setNum: string;
  name: string;
  year: number;
  themeId: number;
  themeName: string;
  numParts: number;
  imageUrl: string | null;
  setUrl: string;
  parts: SetPart[];
  partsCount: number;
  mocs: SetMoc[];
}

export default function SetPage() {
  const { setNum } = useParams<{ setNum: string }>();
  const [set, setSet] = useState<SetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpares, setShowSpares] = useState(false);

  useEffect(() => {
    fetch(`/api/sets/${encodeURIComponent(setNum)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Set not found");
        }
        return res.json();
      })
      .then((data) => setSet(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setNum]);

  if (loading) {
    return (
      <main className={css({ mx: "auto", maxW: "3xl", px: "4", py: "16", textAlign: "center" })}>
        <div
          className={css({
            mx: "auto",
            w: "12",
            h: "12",
            rounded: "stud",
            bg: "lego.orange",
            boxShadow: "stud",
            animation: "spin 1s linear infinite",
          })}
        />
      </main>
    );
  }

  if (error || !set) {
    return (
      <main className={css({ mx: "auto", maxW: "3xl", px: "4", py: "16" })}>
        <a
          href="/"
          className={css({
            fontSize: "sm",
            fontWeight: "700",
            fontFamily: "display",
            color: "ink.muted",
            textDecoration: "none",
            _hover: { color: "lego.orange" },
          })}
        >
          &larr; Back
        </a>
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
          })}
        >
          {error || "Set not found"}
        </div>
      </main>
    );
  }

  const mainParts = set.parts.filter((p) => !p.isSpare);
  const spareParts = set.parts.filter((p) => p.isSpare);
  const displayParts = showSpares ? set.parts : mainParts;
  const totalPieces = mainParts.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <main className={css({ mx: "auto", maxW: "3xl", px: "4", py: "12" })}>
      {/* Back link */}
      <a
        href="/"
        className={css({
          fontSize: "sm",
          fontWeight: "700",
          fontFamily: "display",
          color: "ink.muted",
          textDecoration: "none",
          _hover: { color: "lego.orange" },
        })}
      >
        &larr; Back
      </a>

      {/* Set card */}
      <div
        className={css({
          mt: "6",
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          boxShadow: "brick",
          overflow: "hidden",
        })}
      >
        {/* Set image */}
        {set.imageUrl && (
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bg: "white",
              p: "8",
              borderBottom: "2px solid",
              borderColor: "plate.border",
            })}
          >
            <img
              src={set.imageUrl}
              alt={set.name}
              className={css({
                maxW: "400px",
                maxH: "300px",
                objectFit: "contain",
              })}
            />
          </div>
        )}

        <div className={css({ p: "6" })}>
          {/* Set number badge + title */}
          <div className={css({ display: "flex", alignItems: "flex-start", gap: "4", mb: "6" })}>
            <div
              className={css({
                w: "14",
                h: "14",
                rounded: "stud",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "xs",
                fontWeight: "900",
                fontFamily: "display",
                color: "white",
                bg: "lego.red",
                boxShadow: "stud",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              })}
            >
              {set.year}
            </div>
            <div>
              <h1
                className={css({
                  fontSize: "2xl",
                  fontWeight: "900",
                  fontFamily: "display",
                  letterSpacing: "-0.03em",
                  color: "ink.primary",
                  lineHeight: 1.2,
                })}
              >
                {set.name}
              </h1>
              <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
                Set #{set.setNum}
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "3",
              mb: "6",
            })}
          >
            {[
              { label: "Theme", value: set.themeName },
              { label: "Year", value: String(set.year) },
              { label: "Parts", value: `${set.numParts} pcs` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className={css({
                  bg: "plate.raised",
                  rounded: "lg",
                  px: "4",
                  py: "3",
                  border: "1px solid",
                  borderColor: "plate.border",
                })}
              >
                <span
                  className={css({
                    display: "block",
                    fontSize: "xs",
                    fontWeight: "800",
                    fontFamily: "display",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "ink.faint",
                    mb: "1",
                  })}
                >
                  {label}
                </span>
                <span
                  className={css({
                    fontSize: "sm",
                    fontWeight: "700",
                    fontFamily: "display",
                    color: "ink.primary",
                  })}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* External link */}
          <a
            href={set.setUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "2",
              rounded: "brick",
              bg: "lego.red",
              px: "5",
              py: "2.5",
              fontSize: "sm",
              fontWeight: "800",
              fontFamily: "display",
              color: "white",
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)",
              _hover: {
                bg: "#FF1A1A",
                transform: "translateY(-1px)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #A30008, 0 5px 10px rgba(0,0,0,0.35)",
              },
            })}
          >
            View on Rebrickable &rarr;
          </a>
        </div>
      </div>

      {/* Parts list */}
      {set.parts.length > 0 && (
        <div
          className={css({
            mt: "6",
            bg: "plate.surface",
            rounded: "brick",
            border: "2px solid",
            borderColor: "plate.border",
            boxShadow: "brick",
            p: "6",
          })}
        >
          <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "4" })}>
            <h2
              className={css({
                fontSize: "sm",
                fontWeight: "900",
                fontFamily: "display",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "ink.muted",
              })}
            >
              Parts ({totalPieces} pcs / {set.partsCount} unique)
            </h2>
            {spareParts.length > 0 && (
              <button
                onClick={() => setShowSpares(!showSpares)}
                className={css({
                  fontSize: "xs",
                  fontWeight: "700",
                  fontFamily: "display",
                  color: "ink.faint",
                  bg: "transparent",
                  border: "none",
                  cursor: "pointer",
                  _hover: { color: "lego.orange" },
                })}
              >
                {showSpares ? "Hide spares" : `+ ${spareParts.length} spares`}
              </button>
            )}
          </div>

          <div className={css({ display: "flex", flexDir: "column", gap: "1.5" })}>
            {displayParts.map((part, i) => (
              <Link
                key={`${part.partNum}-${part.colorId}-${i}`}
                href={`/parts/${encodeURIComponent(part.partNum)}`}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "3",
                  bg: part.isSpare ? "rgba(254,138,24,0.05)" : "plate.raised",
                  rounded: "lg",
                  px: "3",
                  py: "2",
                  border: "1px solid",
                  borderColor: part.isSpare ? "rgba(254,138,24,0.2)" : "plate.border",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  _hover: {
                    bg: "plate.hover",
                    borderColor: "plate.borderHover",
                    transform: "translateY(-1px)",
                    boxShadow: "brick",
                  },
                })}
              >
                {/* Part image or color stud */}
                {part.imageUrl ? (
                  <img
                    src={part.imageUrl}
                    alt={part.name}
                    className={css({
                      w: "10",
                      h: "10",
                      objectFit: "contain",
                      rounded: "md",
                      bg: "white",
                      flexShrink: 0,
                    })}
                  />
                ) : (
                  <div
                    className={css({
                      w: "10",
                      h: "10",
                      rounded: "stud",
                      flexShrink: 0,
                      boxShadow: "stud",
                    })}
                    style={{ background: `#${part.colorRgb}` }}
                  />
                )}

                {/* Part info */}
                <div className={css({ flex: 1, minW: 0 })}>
                  <span
                    className={css({
                      fontSize: "sm",
                      fontWeight: "600",
                      color: "ink.primary",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {part.name}
                  </span>
                  <div className={css({ display: "flex", alignItems: "center", gap: "2", mt: "0.5" })}>
                    <div
                      className={css({
                        w: "3",
                        h: "3",
                        rounded: "full",
                        flexShrink: 0,
                        border: "1px solid rgba(255,255,255,0.1)",
                      })}
                      style={{ background: `#${part.colorRgb}` }}
                    />
                    <span className={css({ fontSize: "xs", color: "ink.muted" })}>
                      {part.colorName} · #{part.partNum}
                      {part.isSpare ? " · spare" : ""}
                    </span>
                  </div>
                </div>

                {/* Quantity */}
                <div
                  className={css({
                    fontSize: "sm",
                    fontWeight: "800",
                    fontFamily: "display",
                    color: "lego.yellow",
                    bg: "rgba(255, 213, 0, 0.08)",
                    px: "2.5",
                    py: "1",
                    rounded: "md",
                    minW: "8",
                    textAlign: "center",
                    flexShrink: 0,
                  })}
                >
                  ×{part.quantity}
                </div>
              </Link>
            ))}
          </div>

          {set.partsCount > set.parts.length && (
            <p className={css({ mt: "3", fontSize: "xs", color: "ink.faint", textAlign: "center" })}>
              Showing {set.parts.length} of {set.partsCount} unique parts
            </p>
          )}
        </div>
      )}

      {/* MOC Alternates */}
      {set.mocs.length > 0 && (
        <div
          className={css({
            mt: "6",
            bg: "plate.surface",
            rounded: "brick",
            border: "2px solid",
            borderColor: "plate.border",
            boxShadow: "brick",
            p: "6",
          })}
        >
          <h2
            className={css({
              fontSize: "sm",
              fontWeight: "900",
              fontFamily: "display",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "ink.muted",
              mb: "4",
            })}
          >
            Alternate Builds ({set.mocs.length})
          </h2>

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "3",
            })}
          >
            {set.mocs.map((moc) => (
              <a
                key={moc.mocId}
                href={moc.mocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={css({
                  bg: "plate.raised",
                  rounded: "brick",
                  border: "1px solid",
                  borderColor: "plate.border",
                  boxShadow: "plate",
                  overflow: "hidden",
                  textDecoration: "none",
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
                    alignItems: "center",
                    justifyContent: "center",
                    bg: "white",
                    p: "4",
                    h: "120px",
                  })}
                >
                  {moc.imageUrl ? (
                    <img
                      src={moc.imageUrl}
                      alt={moc.name}
                      className={css({
                        maxW: "100%",
                        maxH: "100%",
                        objectFit: "contain",
                      })}
                    />
                  ) : (
                    <div
                      className={css({
                        w: "10",
                        h: "10",
                        rounded: "stud",
                        bg: "lego.green",
                        boxShadow: "stud",
                      })}
                    />
                  )}
                </div>

                <div className={css({ p: "3" })}>
                  <span
                    className={css({
                      fontSize: "sm",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "ink.primary",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {moc.name}
                  </span>
                  <span className={css({ fontSize: "xs", color: "ink.muted", display: "block", mt: "0.5" })}>
                    by {moc.designer}
                  </span>

                  <div className={css({ display: "flex", gap: "2", mt: "2" })}>
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
                      MOC
                    </span>
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
                      {moc.numParts} pcs
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

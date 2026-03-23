"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";

interface MocPart {
  partNum: string;
  name: string;
  imageUrl: string | null;
  colorId: number;
  colorName: string;
  colorRgb: string;
  quantity: number;
  isSpare: boolean;
}

interface MocDetail {
  mocId: string;
  name: string;
  year: number | null;
  numParts: number | null;
  imageUrl: string | null;
  mocUrl: string;
  designer: string | null;
  parts: MocPart[];
  partsCount: number;
  pdfUrl: string | null;
}

export default function MocPage() {
  const { mocId } = useParams<{ mocId: string }>();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [moc, setMoc] = useState<MocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpares, setShowSpares] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Check if this MOC is already favorited
  useEffect(() => {
    if (!session) return;
    fetch("/api/favorites")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.items?.some((f: { mocId: string }) => f.mocId === mocId)) {
          setIsFavorited(true);
        }
      })
      .catch(() => {});
  }, [session, mocId]);

  const toggleFavorite = useCallback(async () => {
    if (!moc || favLoading) return;
    setFavLoading(true);
    try {
      if (isFavorited) {
        const res = await fetch("/api/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mocId: moc.mocId }),
        });
        if (res.ok) setIsFavorited(false);
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mocId: moc.mocId,
            name: moc.name,
            designer: moc.designer || "Unknown",
            url: moc.mocUrl,
          }),
        });
        if (res.ok) setIsFavorited(true);
      }
    } finally {
      setFavLoading(false);
    }
  }, [moc, isFavorited, favLoading]);

  useEffect(() => {
    // Forward search params to the API so it has MOC metadata
    const apiParams = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      apiParams.set(key, value);
    }
    const qs = apiParams.toString();
    fetch(`/api/mocs/${encodeURIComponent(mocId)}${qs ? `?${qs}` : ""}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "MOC not found");
        }
        return res.json();
      })
      .then((data) => setMoc(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mocId, searchParams]);

  if (loading) {
    return (
      <main className={css({ mx: "auto", maxW: "3xl", px: "4", py: "16", textAlign: "center" })}>
        <div
          className={css({
            mx: "auto",
            w: "12",
            h: "12",
            rounded: "stud",
            bg: "lego.green",
            boxShadow: "stud",
            animation: "spin 1s linear infinite",
          })}
        />
      </main>
    );
  }

  if (error || !moc) {
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
          {error || "MOC not found"}
        </div>
      </main>
    );
  }

  const mainParts = moc.parts.filter((p) => !p.isSpare);
  const spareParts = moc.parts.filter((p) => p.isSpare);
  const displayParts = showSpares ? moc.parts : mainParts;
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

      {/* MOC card */}
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
        {/* MOC image */}
        {moc.imageUrl && (
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
              src={moc.imageUrl}
              alt={moc.name}
              className={css({
                maxW: "400px",
                maxH: "300px",
                objectFit: "contain",
              })}
            />
          </div>
        )}

        <div className={css({ p: "6" })}>
          {/* MOC badge + title */}
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
                bg: "lego.green",
                boxShadow: "stud",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              })}
            >
              MOC
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
                {moc.name}
              </h1>
              {moc.designer && (
                <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
                  by {moc.designer}
                </p>
              )}
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
              { label: "MOC ID", value: moc.mocId },
              { label: "Designer", value: moc.designer },
              { label: "Year", value: moc.year ? String(moc.year) : null },
              { label: "Parts", value: moc.numParts ? `${moc.numParts} pcs` : null },
            ].filter((item): item is { label: string; value: string } => item.value != null).map(({ label, value }) => (
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

          {/* Action buttons */}
          <div className={css({ display: "flex", gap: "3", flexWrap: "wrap" })}>
            <a
              href={moc.mocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "2",
                rounded: "brick",
                bg: "lego.green",
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
                  "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #005A1B, 0 3px 6px rgba(0,0,0,0.3)",
                _hover: {
                  bg: "#00A333",
                  transform: "translateY(-1px)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #005A1B, 0 5px 10px rgba(0,0,0,0.35)",
                },
              })}
            >
              View on Rebrickable &rarr;
            </a>

            {session && (
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                className={css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2",
                  rounded: "brick",
                  bg: isFavorited ? "lego.red" : "lego.orange",
                  px: "5",
                  py: "2.5",
                  fontSize: "sm",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isFavorited
                    ? "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #A30008, 0 3px 6px rgba(0,0,0,0.3)"
                    : "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #B56A00, 0 3px 6px rgba(0,0,0,0.3)",
                  _hover: {
                    bg: isFavorited ? "#FF1A1A" : "#FF9F2E",
                    transform: "translateY(-1px)",
                  },
                  _disabled: { opacity: 0.5, cursor: "not-allowed" },
                })}
              >
                {favLoading ? "..." : isFavorited ? "Remove from Favorites" : "Add to Favorites"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PDF Instructions */}
      {moc.pdfUrl && (
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
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: "4",
              py: "2",
              bg: "#323639",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            })}
          >
            <span
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "#ccc",
              })}
            >
              {moc.name} — Instructions
            </span>
            <a
              href={moc.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={css({
                fontSize: "xs",
                fontWeight: "700",
                fontFamily: "display",
                color: "lego.orange",
                textDecoration: "none",
                _hover: { textDecoration: "underline" },
              })}
            >
              Open in new tab
            </a>
          </div>
          <iframe
            src={moc.pdfUrl}
            title={`${moc.name} instructions`}
            className={css({
              w: "100%",
              h: "85vh",
              display: "block",
              border: "none",
              bg: "#525659",
            })}
          />
        </div>
      )}

      {/* Parts list */}
      {moc.parts.length > 0 && (
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
              Parts ({totalPieces} pcs / {moc.partsCount} unique)
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
                  x{part.quantity}
                </div>
              </Link>
            ))}
          </div>

          {moc.partsCount > moc.parts.length && (
            <p className={css({ mt: "3", fontSize: "xs", color: "ink.faint", textAlign: "center" })}>
              Showing {moc.parts.length} of {moc.partsCount} unique parts
            </p>
          )}
        </div>
      )}
    </main>
  );
}

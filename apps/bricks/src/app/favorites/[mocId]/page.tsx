"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { css } from "styled-system/css";
import { useSession } from "@/lib/auth-client";
import { mocImageUrl } from "@/lib/moc-image";

import { PartsEditor, type Part } from "../../_components/PartsEditor";

interface Favorite {
  id: number;
  mocId: string;
  designer: string;
  name: string;
  url: string;
  pdfUrl: string | null;
  parts: Part[];
  createdAt: string;
}

interface DiscoveredMoc {
  moc_id: string;
  name: string;
  year: number | null;
  num_parts: number;
  image_url: string | null;
  moc_url: string;
  designer: string;
  top_pick?: boolean;
}

interface DiscoveryResult {
  partNum: string;
  partName: string;
  mocs: DiscoveredMoc[];
  summary: string;
}

const LEGO_COLORS = ["#E3000B", "#FFD500", "#006CB7", "#00852B", "#FE8A18"];

function looksLikePdf(url: string): boolean {
  try {
    return new URL(url, "http://localhost").pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return url.toLowerCase().endsWith(".pdf");
  }
}

function colorFromId(mocId: string) {
  const num = parseInt(mocId.replace("MOC-", ""), 10) || 0;
  return LEGO_COLORS[num % LEGO_COLORS.length];
}

export default function FavoriteDetailPage() {
  const { mocId } = useParams<{ mocId: string }>();
  const { data: session, isPending: authPending } = useSession();
  const [fav, setFav] = useState<Favorite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  // PDF URL input state
  const [pdfInput, setPdfInput] = useState("");
  const [saving, setSaving] = useState(false);

  // MOC discovery state
  const [discoveries, setDiscoveries] = useState<DiscoveryResult[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryPartNum, setDiscoveryPartNum] = useState("");
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const discoverMocsForPart = useCallback(async (partNum: string) => {
    setDiscovering(true);
    setDiscoveryError(null);
    try {
      const res = await fetch(`/api/parts/${encodeURIComponent(partNum)}/discover-mocs`);
      if (!res.ok) {
        const data = await res.json();
        setDiscoveryError(data.error || "Discovery failed");
        return;
      }
      const data = await res.json();
      setDiscoveries((prev) => {
        const filtered = prev.filter((d) => d.partNum !== data.partNum);
        return [...filtered, { partNum: data.partNum, partName: data.partName, mocs: data.mocs, summary: data.summary }];
      });
    } catch {
      setDiscoveryError("Network error during discovery");
    } finally {
      setDiscovering(false);
    }
  }, []);

  async function handleDiscoverAll() {
    if (!fav?.parts?.length) return;
    setDiscoveries([]);
    for (const part of fav.parts) {
      await discoverMocsForPart(part.partNum);
    }
  }

  async function handleDiscoverSingle() {
    const trimmed = discoveryPartNum.trim();
    if (!trimmed) return;
    await discoverMocsForPart(trimmed);
    setDiscoveryPartNum("");
  }

  useEffect(() => {
    if (authPending) return;
    if (!session) {
      setLoading(false);
      setError("Sign in to view favorites.");
      return;
    }

    fetch(`/api/favorites/${mocId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load");
        }
        return res.json();
      })
      .then((data) => {
        setFav(data.item);
        setPdfInput(data.item.pdfUrl || "");
        // Auto-extract parts via LangGraph when none are stored yet.
        // Run async without blocking the page render.
        if (!data.item.parts || data.item.parts.length === 0) {
          setExtracting(true);
          fetch(`/api/favorites/${data.item.mocId}/extract-parts`, { method: "POST" })
            .then(async (res) => {
              if (res.ok) {
                const extractData = await res.json();
                setFav(extractData.item);
              }
            })
            .catch(() => { /* non-fatal */ })
            .finally(() => setExtracting(false));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [mocId, session, authPending]);

  async function handleSavePdf() {
    if (!fav) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/favorites/${fav.mocId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: pdfInput.trim() || null }),
      });
      const data = await res.json();
      if (res.ok) setFav(data.item);
    } finally {
      setSaving(false);
    }
  }

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

  if (error) {
    return (
      <main className={css({ mx: "auto", maxW: "3xl", px: "4", py: "16" })}>
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
          })}
        >
          {error}
        </div>
      </main>
    );
  }

  if (!fav) return null;

  const color = colorFromId(fav.mocId);

  return (
    <main className={css({ mx: "auto", maxW: "3xl", px: "4", py: "12" })}>
      {/* Back link */}
      <a
        href="/favorites"
        className={css({
          fontSize: "sm",
          fontWeight: "700",
          fontFamily: "display",
          color: "ink.muted",
          textDecoration: "none",
          _hover: { color: "lego.orange" },
        })}
      >
        &larr; All Favorites
      </a>

      {/* Hero card */}
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
        <img
          src={mocImageUrl(fav.mocId)}
          alt={fav.name}
          className={css({
            w: "100%",
            objectFit: "contain",
            borderBottom: "2px solid",
            borderColor: "plate.border",
            bg: "#1a1a1a",
          })}
        />

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
                fontSize: "sm",
                fontWeight: "900",
                fontFamily: "display",
                color: "white",
                boxShadow: "stud",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              })}
              style={{ background: color }}
            >
              {fav.mocId.replace("MOC-", "")}
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
                {fav.name}
              </h1>
              <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
                by {fav.designer}
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "3",
              mb: "6",
            })}
          >
            {[
              { label: "MOC ID", value: fav.mocId },
              { label: "Designer", value: fav.designer },
              {
                label: "Saved on",
                value: new Date(fav.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              },
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

          {/* Action button */}
          <a
            href={fav.url}
            target="_blank"
            rel="noopener noreferrer"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "2",
              rounded: "brick",
              bg: "lego.blue",
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
                "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #004A80, 0 3px 6px rgba(0,0,0,0.3)",
              _hover: {
                bg: "#0080D0",
                transform: "translateY(-1px)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 0 #004A80, 0 5px 10px rgba(0,0,0,0.35)",
              },
            })}
          >
            View on Rebrickable &rarr;
          </a>
        </div>
      </div>

      {/* PDF Instructions section */}
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
          Building Instructions (PDF)
        </h2>

        {/* PDF URL input */}
        <div
          className={css({
            display: "flex",
            gap: "2",
            bg: "plate.raised",
            rounded: "lg",
            border: "1.5px solid",
            borderColor: "plate.border",
            p: "2",
            transition: "all 0.2s ease",
            _focusWithin: {
              borderColor: "lego.orange",
            },
          })}
        >
          <input
            type="url"
            value={pdfInput}
            onChange={(e) => setPdfInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSavePdf()}
            placeholder="Paste PDF URL from Rebrickable or any public link..."
            className={css({
              flex: 1,
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
          <button
            onClick={handleSavePdf}
            disabled={saving}
            className={css({
              rounded: "lg",
              bg: "lego.green",
              px: "4",
              py: "2",
              fontSize: "sm",
              fontWeight: "800",
              fontFamily: "display",
              color: "white",
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #005A1B, 0 3px 6px rgba(0,0,0,0.3)",
              _hover: {
                bg: "#00A333",
                transform: "translateY(-1px)",
              },
              _disabled: { opacity: 0.5, cursor: "not-allowed" },
            })}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* PDF viewer or download link */}
        {fav.pdfUrl ? (
          looksLikePdf(fav.pdfUrl) ? (
            <div
              className={css({
                mt: "4",
                rounded: "lg",
                overflow: "hidden",
                border: "2px solid",
                borderColor: "plate.border",
                bg: "#525659",
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
                  {fav.name} — Instructions
                </span>
                <a
                  href={fav.pdfUrl}
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
                src={fav.pdfUrl}
                title={`${fav.name} instructions`}
                className={css({
                  w: "100%",
                  h: "85vh",
                  display: "block",
                  border: "none",
                })}
              />
            </div>
          ) : (
            <a
              href={fav.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={css({
                display: "inline-flex",
                alignItems: "center",
                gap: "2",
                mt: "4",
                rounded: "brick",
                bg: "lego.orange",
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
                  "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #B56A00, 0 3px 6px rgba(0,0,0,0.3)",
                _hover: {
                  bg: "#FF9F2E",
                  transform: "translateY(-1px)",
                },
              })}
            >
              Download Instructions &darr;
            </a>
          )
        ) : (
          <p className={css({ mt: "3", fontSize: "sm", color: "ink.faint" })}>
            Paste a direct PDF link to view inline, or any download link.
          </p>
        )}
      </div>

      {/* Parts list */}
      <PartsEditor mocId={fav.mocId} initialParts={fav.parts ?? []} autoExtracting={extracting} />

      {/* Discover Related MOCs */}
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
          Discover Related MOCs
        </h2>

        <p className={css({ fontSize: "sm", color: "ink.faint", mb: "4" })}>
          Find MOC builds that share parts with this design. Enter a part number or discover from all parts above.
        </p>

        {/* Discovery input */}
        <div
          className={css({
            display: "flex",
            gap: "2",
            flexWrap: "wrap",
            bg: "plate.raised",
            rounded: "lg",
            border: "1.5px solid",
            borderColor: "plate.border",
            p: "2",
            mb: "4",
            _focusWithin: { borderColor: "lego.orange" },
          })}
        >
          <input
            value={discoveryPartNum}
            onChange={(e) => setDiscoveryPartNum(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDiscoverSingle()}
            placeholder="Part # (e.g. 3001)"
            disabled={discovering}
            className={css({
              flex: 1,
              minW: "120px",
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
          <button
            onClick={handleDiscoverSingle}
            disabled={discovering || !discoveryPartNum.trim()}
            className={css({
              rounded: "lg",
              bg: "lego.blue",
              px: "4",
              py: "2",
              fontSize: "sm",
              fontWeight: "800",
              fontFamily: "display",
              color: "white",
              cursor: "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #004A80, 0 3px 6px rgba(0,0,0,0.3)",
              _hover: { bg: "#0080D0", transform: "translateY(-1px)" },
              _disabled: { opacity: 0.5, cursor: "not-allowed" },
            })}
          >
            {discovering ? "Discovering..." : "Discover"}
          </button>
        </div>

        {/* Discover All button */}
        {fav.parts && fav.parts.length > 0 && (
          <button
            onClick={handleDiscoverAll}
            disabled={discovering}
            className={css({
              w: "100%",
              py: "3",
              mb: "4",
              bg: "plate.raised",
              rounded: "brick",
              border: "1.5px solid",
              borderColor: "plate.border",
              fontSize: "sm",
              fontWeight: "700",
              fontFamily: "display",
              color: "ink.secondary",
              cursor: "pointer",
              transition: "all 0.15s ease",
              _hover: { borderColor: "plate.borderHover", bg: "plate.hover" },
              _disabled: { opacity: 0.5, cursor: "not-allowed" },
            })}
          >
            {discovering
              ? "Discovering..."
              : `Discover MOCs for all ${fav.parts.length} parts`}
          </button>
        )}

        {discoveryError && (
          <div
            className={css({
              mb: "4",
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
            {discoveryError}
          </div>
        )}

        {/* Discovery results */}
        {discoveries.map((disc) => (
          <div key={disc.partNum} className={css({ mb: "6" })}>
            <div className={css({ display: "flex", alignItems: "center", gap: "2", mb: "3" })}>
              <Link
                href={`/parts/${encodeURIComponent(disc.partNum)}`}
                className={css({
                  fontSize: "sm",
                  fontWeight: "800",
                  fontFamily: "display",
                  color: "lego.orange",
                  textDecoration: "none",
                  _hover: { textDecoration: "underline" },
                })}
              >
                #{disc.partNum}
              </Link>
              <span className={css({ fontSize: "sm", fontWeight: "700", color: "ink.primary" })}>
                {disc.partName}
              </span>
              <span className={css({ fontSize: "xs", color: "ink.faint", fontWeight: "700" })}>
                {disc.mocs.length} MOCs
              </span>
            </div>

            {disc.summary && (
              <p className={css({ fontSize: "sm", color: "ink.muted", mb: "3", lineHeight: "1.5" })}>
                {disc.summary}
              </p>
            )}

            {disc.mocs.length === 0 ? (
              <p className={css({ fontSize: "sm", color: "ink.faint" })}>
                No MOC builds found for this part.
              </p>
            ) : (
              <div
                className={css({
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "3",
                })}
              >
                {disc.mocs.map((moc) => (
                  <Link
                    key={moc.moc_id}
                    href={`/mocs/${encodeURIComponent(moc.moc_id)}?${new URLSearchParams({ name: moc.name, designer: moc.designer, ...(moc.year ? { year: String(moc.year) } : {}), numParts: String(moc.num_parts), ...(moc.image_url ? { imageUrl: moc.image_url } : {}), ...(moc.moc_url ? { mocUrl: moc.moc_url } : {}) }).toString()}`}
                    className={css({
                      bg: "plate.raised",
                      rounded: "brick",
                      border: moc.top_pick ? "2px solid" : "1px solid",
                      borderColor: moc.top_pick ? "lego.orange" : "plate.border",
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
                      {moc.image_url ? (
                        <img
                          src={moc.image_url}
                          alt={moc.name}
                          className={css({ maxW: "100%", maxH: "100%", objectFit: "contain" })}
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
                      {moc.top_pick && (
                        <span
                          className={css({
                            display: "inline-block",
                            fontSize: "xs",
                            fontWeight: "800",
                            color: "lego.orange",
                            bg: "rgba(254,138,24,0.1)",
                            px: "2",
                            py: "0.5",
                            rounded: "md",
                            mb: "1",
                          })}
                        >
                          Top Pick
                        </span>
                      )}
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
                        {moc.year && (
                          <span
                            className={css({
                              fontSize: "xs",
                              fontWeight: "700",
                              color: "lego.blue",
                              bg: "rgba(0, 108, 183, 0.1)",
                              px: "2",
                              py: "0.5",
                              rounded: "md",
                            })}
                          >
                            {moc.year}
                          </span>
                        )}
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
                          {moc.num_parts} pcs
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading spinner */}
        {discovering && discoveries.length === 0 && (
          <div className={css({ textAlign: "center", py: "8" })}>
            <div
              className={css({
                mx: "auto",
                w: "8",
                h: "8",
                rounded: "stud",
                bg: "lego.green",
                boxShadow: "stud",
                animation: "spin 1s linear infinite",
              })}
            />
            <p className={css({ mt: "3", fontSize: "sm", color: "ink.faint" })}>
              Running MOC discovery pipeline...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

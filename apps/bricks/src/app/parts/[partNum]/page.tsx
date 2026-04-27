"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { css } from "styled-system/css";
import SpikeLightMatrixInfoRO from "./SpikeLightMatrixInfoRO";

interface PartColor {
  id: number;
  name: string;
  imageUrl: string | null;
  numSets: number;
}

interface PartDetail {
  partNum: string;
  name: string;
  imageUrl: string | null;
  categoryId: number | null;
  colors: PartColor[];
  isSet?: boolean;
}

interface PartSet {
  setNum: string;
  name: string;
  year: number;
  numParts: number;
  imageUrl: string | null;
}

interface Moc {
  mocId: string;
  name: string;
  year: number;
  numParts: number;
  imageUrl: string | null;
  mocUrl: string;
  designer: string;
  topPick?: boolean;
}

export default function PartPage() {
  const { partNum } = useParams<{ partNum: string }>();
  const [part, setPart] = useState<PartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<PartColor | null>(null);
  const [sets, setSets] = useState<PartSet[]>([]);
  const [setsCount, setSetsCount] = useState(0);
  const [setsLoading, setSetsLoading] = useState(false);
  const [setsPage, setSetsPage] = useState(1);
  const [hasMoreSets, setHasMoreSets] = useState(false);
  const [mocs, setMocs] = useState<Moc[]>([]);
  const [mocsLoading, setMocsLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/parts/${encodeURIComponent(partNum)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Part not found");
        }
        return res.json();
      })
      .then((data) => {
        setPart(data);
        if (data.colors?.length > 0) {
          setSelectedColor(data.colors[0]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [partNum]);

  useEffect(() => {
    if (!selectedColor || selectedColor.numSets === 0) {
      setSets([]);
      setSetsCount(0);
      setSetsPage(1);
      setHasMoreSets(false);
      return;
    }

    const controller = new AbortController();
    setSetsLoading(true);
    setSetsPage(1);

    fetch(
      `/api/parts/${encodeURIComponent(partNum)}/sets?colorId=${selectedColor.id}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load sets");
        return res.json();
      })
      .then((data) => {
        setSets(data.sets);
        setSetsCount(data.count);
        setHasMoreSets(data.sets.length < data.count);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setSets([]);
          setSetsCount(0);
        }
      })
      .finally(() => setSetsLoading(false));

    return () => controller.abort();
  }, [selectedColor, partNum]);

  // Fetch MOC alternates after sets are loaded
  useEffect(() => {
    if (sets.length === 0 || setsLoading) {
      setMocs([]);
      return;
    }

    const controller = new AbortController();
    setMocsLoading(true);

    fetch(`/api/parts/${encodeURIComponent(partNum)}/mocs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setNums: sets.map((s) => s.setNum) }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data) => setMocs(data.mocs ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") setMocs([]);
      })
      .finally(() => setMocsLoading(false));

    return () => controller.abort();
  }, [sets, setsLoading, partNum]);

  async function loadMoreSets() {
    if (!selectedColor) return;
    const nextPage = setsPage + 1;
    setSetsLoading(true);
    try {
      const res = await fetch(
        `/api/parts/${encodeURIComponent(partNum)}/sets?colorId=${selectedColor.id}&page=${nextPage}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSets((prev) => [...prev, ...data.sets]);
      setSetsPage(nextPage);
      setHasMoreSets(sets.length + data.sets.length < data.count);
    } finally {
      setSetsLoading(false);
    }
  }

  if (loading) {
    return (
      <main className={css({ mx: "auto", maxW: "100%", px: "4", py: "16", textAlign: "center" })}>
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

  if (error || !part) {
    return (
      <main className={css({ mx: "auto", maxW: "100%", px: "4", py: "16" })}>
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
          {error || "Part not found"}
        </div>
      </main>
    );
  }

  const displayImage = selectedColor?.imageUrl || part.imageUrl;

  return (
    <main className={css({ mx: "auto", maxW: "100%", px: "4", py: "12" })}>
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

      {/* Part card */}
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
        {/* Part image */}
        {displayImage && (
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
              src={displayImage}
              alt={part.name}
              className={css({
                maxW: "280px",
                maxH: "280px",
                objectFit: "contain",
              })}
            />
          </div>
        )}

        <div className={css({ p: "6" })}>
          {/* Part number badge + title */}
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
                bg: "lego.blue",
                boxShadow: "stud",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              })}
            >
              {part.partNum}
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
                {part.name}
              </h1>
              <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
                Part #{part.partNum}
              </p>
            </div>
          </div>

          {/* External link */}
          <a
            href={part.isSet ? `https://rebrickable.com/sets/${part.partNum}-1/` : `https://rebrickable.com/parts/${part.partNum}/`}
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

      {/* Romanian info for special Pybricks parts */}
      {part.partNum === "45608" && <SpikeLightMatrixInfoRO />}

      {/* Colors section */}
      {part.colors.length > 0 && (
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
            Available Colors ({part.colors.length})
          </h2>

          <div
            className={css({
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "2",
            })}
          >
            {part.colors.map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color)}
                className={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "2",
                  bg: "plate.raised",
                  rounded: "lg",
                  border: "2px solid",
                  borderColor: selectedColor?.id === color.id ? "lego.orange" : "plate.border",
                  px: "3",
                  py: "2",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "left",
                  _hover: {
                    borderColor: "plate.borderHover",
                    bg: "plate.hover",
                  },
                })}
              >
                {color.imageUrl ? (
                  <img
                    src={color.imageUrl}
                    alt={color.name}
                    className={css({
                      w: "8",
                      h: "8",
                      objectFit: "contain",
                      rounded: "md",
                      bg: "white",
                      flexShrink: 0,
                    })}
                  />
                ) : (
                  <div
                    className={css({
                      w: "8",
                      h: "8",
                      rounded: "stud",
                      bg: "ink.faint",
                      flexShrink: 0,
                      boxShadow: "stud",
                    })}
                  />
                )}
                <div className={css({ minW: 0 })}>
                  <span
                    className={css({
                      fontSize: "xs",
                      fontWeight: "700",
                      fontFamily: "display",
                      color: "ink.primary",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {color.name}
                  </span>
                  <span className={css({ fontSize: "xs", color: "ink.faint" })}>
                    {color.numSets} sets
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MOCs section */}
      {(mocsLoading || mocs.length > 0) && (
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
            MOC Builds ({mocsLoading ? "..." : mocs.length})
          </h2>

          {mocsLoading ? (
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
                Finding MOC builds...
              </p>
            </div>
          ) : (
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "4",
              })}
            >
              {mocs.map((moc) => (
                <Link
                  key={moc.mocId}
                  href={`/mocs/${encodeURIComponent(moc.mocId)}?${new URLSearchParams({ name: moc.name, designer: moc.designer, year: String(moc.year), numParts: String(moc.numParts), ...(moc.imageUrl ? { imageUrl: moc.imageUrl } : {}), ...(moc.mocUrl ? { mocUrl: moc.mocUrl } : {}) }).toString()}`}
                  className={css({
                    bg: "plate.raised",
                    rounded: "brick",
                    border: moc.topPick ? "2px solid" : "1px solid",
                    borderColor: moc.topPick ? "lego.orange" : "plate.border",
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
                      h: "200px",
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
                    {moc.topPick && (
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
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sets section */}
      {selectedColor && selectedColor.numSets > 0 && (
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
            Sets with this part in {selectedColor.name} ({setsCount})
          </h2>

          {setsLoading && sets.length === 0 ? (
            <div className={css({ textAlign: "center", py: "8" })}>
              <div
                className={css({
                  mx: "auto",
                  w: "8",
                  h: "8",
                  rounded: "stud",
                  bg: "lego.orange",
                  boxShadow: "stud",
                  animation: "spin 1s linear infinite",
                })}
              />
              <p className={css({ mt: "3", fontSize: "sm", color: "ink.faint" })}>
                Loading sets...
              </p>
            </div>
          ) : sets.length === 0 ? (
            <p className={css({ fontSize: "sm", color: "ink.faint" })}>
              No sets found for this color.
            </p>
          ) : (
            <>
              <div
                className={css({
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "3",
                })}
              >
                {sets.map((set) => (
                  <Link
                    key={set.setNum}
                    href={`/sets/${encodeURIComponent(set.setNum)}`}
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
                    {/* Set image */}
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
                      {set.imageUrl ? (
                        <img
                          src={set.imageUrl}
                          alt={set.name}
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
                            bg: "lego.red",
                            boxShadow: "stud",
                          })}
                        />
                      )}
                    </div>

                    {/* Set info */}
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
                        {set.name}
                      </span>
                      <span className={css({ fontSize: "xs", color: "ink.muted", display: "block", mt: "0.5" })}>
                        #{set.setNum}
                      </span>

                      {/* Badges */}
                      <div className={css({ display: "flex", gap: "2", mt: "2" })}>
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
                          {set.year}
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
                          {set.numParts} pcs
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Load more */}
              {hasMoreSets && (
                <button
                  onClick={loadMoreSets}
                  disabled={setsLoading}
                  className={css({
                    w: "100%",
                    mt: "3",
                    py: "3",
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
                    _hover: {
                      borderColor: "plate.borderHover",
                      bg: "plate.hover",
                    },
                    _disabled: { opacity: 0.5, cursor: "not-allowed" },
                  })}
                >
                  {setsLoading ? "Loading..." : "Load More Sets"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}

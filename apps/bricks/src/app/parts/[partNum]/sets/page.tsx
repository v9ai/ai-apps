"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { css } from "styled-system/css";

interface PartSummary {
  partNum: string;
  name: string;
  imageUrl: string | null;
}

interface AggregatedSet {
  setNum: string;
  name: string;
  year: number;
  numParts: number;
  imageUrl: string | null;
  colors: { id: number; name: string }[];
}

export default function PartAllSetsPage() {
  const { partNum } = useParams<{ partNum: string }>();
  const [part, setPart] = useState<PartSummary | null>(null);
  const [sets, setSets] = useState<AggregatedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`/api/parts/${encodeURIComponent(partNum)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Part not found")))),
      fetch(`/api/parts/${encodeURIComponent(partNum)}/all-sets`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load sets")))),
    ])
      .then(([partData, setsData]) => {
        setPart({ partNum: partData.partNum, name: partData.name, imageUrl: partData.imageUrl });
        setSets(setsData.sets);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [partNum]);

  if (loading) {
    return (
      <main className={css({ mx: "auto", maxW: "100%", px: "4", py: "16", textAlign: "center" })}>
        <div
          className={css({
            mx: "auto",
            w: "10",
            h: "10",
            rounded: "stud",
            bg: "lego.orange",
            boxShadow: "stud",
            animation: "spin 1s linear infinite",
          })}
        />
        <p className={css({ mt: "4", fontSize: "sm", color: "ink.muted" })}>Loading all sets...</p>
      </main>
    );
  }

  if (error || !part) {
    return (
      <main className={css({ mx: "auto", maxW: "100%", px: "4", py: "16", textAlign: "center" })}>
        <p className={css({ fontSize: "md", color: "lego.red", fontWeight: "700" })}>
          {error ?? "Part not found"}
        </p>
        <Link
          href={`/parts/${encodeURIComponent(partNum)}`}
          className={css({ mt: "4", display: "inline-block", fontSize: "sm", color: "lego.blue" })}
        >
          &larr; Back to part
        </Link>
      </main>
    );
  }

  return (
    <main className={css({ mx: "auto", maxW: "100%", px: "4", py: "12" })}>
      <Link
        href={`/parts/${encodeURIComponent(partNum)}`}
        className={css({
          fontSize: "sm",
          fontWeight: "700",
          fontFamily: "display",
          color: "ink.muted",
          textDecoration: "none",
          _hover: { color: "lego.orange" },
        })}
      >
        &larr; Back to part
      </Link>

      <div
        className={css({
          mt: "6",
          bg: "plate.surface",
          rounded: "brick",
          border: "2px solid",
          borderColor: "plate.border",
          boxShadow: "brick",
          p: "6",
          display: "flex",
          alignItems: "center",
          gap: "4",
        })}
      >
        {part.imageUrl && (
          <div
            className={css({
              flexShrink: 0,
              w: "20",
              h: "20",
              bg: "white",
              rounded: "brick",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: "2",
            })}
          >
            <img
              src={part.imageUrl}
              alt={part.name}
              className={css({ maxW: "100%", maxH: "100%", objectFit: "contain" })}
            />
          </div>
        )}
        <div>
          <h1
            className={css({
              fontSize: "xl",
              fontWeight: "900",
              fontFamily: "display",
              letterSpacing: "-0.02em",
              color: "ink.primary",
              lineHeight: 1.2,
            })}
          >
            {part.name}
          </h1>
          <p className={css({ mt: "1", fontSize: "sm", color: "ink.muted" })}>
            Part #{part.partNum} · {sets.length} sets across all colors
          </p>
        </div>
      </div>

      {sets.length === 0 ? (
        <p className={css({ mt: "8", fontSize: "sm", color: "ink.faint", textAlign: "center" })}>
          No sets found for this part.
        </p>
      ) : (
        <div
          className={css({
            mt: "6",
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
                    className={css({ maxW: "100%", maxH: "100%", objectFit: "contain" })}
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

                <div className={css({ display: "flex", gap: "2", mt: "2", flexWrap: "wrap" })}>
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

                {set.colors.length > 0 && (
                  <div
                    className={css({
                      mt: "2",
                      fontSize: "xs",
                      color: "ink.faint",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {set.colors.map((c) => c.name).join(", ")}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

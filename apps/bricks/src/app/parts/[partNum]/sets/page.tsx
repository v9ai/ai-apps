"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { css } from "styled-system/css";

interface PartSummary {
  partNum: string;
  name: string;
  imageUrl: string | null;
}

type Currency = "USD" | "EUR" | "GBP";

interface AggregatedSet {
  setNum: string;
  name: string;
  year: number;
  numParts: number;
  imageUrl: string | null;
  colors: { id: number; name: string }[];
  usdRetail: number | null;
  gbpRetail: number | null;
  eurRetail: number | null;
  usdMarket: number | null;
  gbpMarket: number | null;
  eurMarket: number | null;
  displayPrice: number | null;
  displayCurrency: Currency | null;
}

const CURRENCY_SYMBOL: Record<Currency, string> = { USD: "$", EUR: "€", GBP: "£" };

function formatPrice(cents: number | null, currency: Currency | null = "USD"): string | null {
  if (cents == null || currency == null) return null;
  return `${CURRENCY_SYMBOL[currency]}${(cents / 100).toFixed(2)}`;
}

type Sort = "priceAsc" | "priceDesc" | "partsAsc" | "partsDesc";

const SORT_VALUES: readonly Sort[] = ["priceAsc", "priceDesc", "partsAsc", "partsDesc"] as const;

export default function PartAllSetsPage() {
  const { partNum } = useParams<{ partNum: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortParam = searchParams.get("sort");
  const sort: Sort = (SORT_VALUES as readonly string[]).includes(sortParam ?? "")
    ? (sortParam as Sort)
    : "priceAsc";
  const [part, setPart] = useState<PartSummary | null>(null);
  const [sets, setSets] = useState<AggregatedSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      fetch(`/api/parts/${encodeURIComponent(partNum)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Part not found")))),
      fetch(`/api/parts/${encodeURIComponent(partNum)}/all-sets?sort=${sort}`, { signal: controller.signal })
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
  }, [partNum, sort]);

  const setSort = (next: Sort) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("sort", next);
    router.replace(`/parts/${encodeURIComponent(partNum)}/sets?${sp.toString()}`, { scroll: false });
  };

  if (loading && !part) {
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

      <div
        className={css({
          mt: "4",
          display: "flex",
          gap: "2",
          alignItems: "center",
        })}
      >
        <span className={css({ fontSize: "xs", fontWeight: "700", color: "ink.muted", textTransform: "uppercase", letterSpacing: "0.05em" })}>
          Sort
        </span>
        {([
          ["priceAsc", "Cheapest first"],
          ["priceDesc", "Most expensive first"],
          ["partsAsc", "Fewest pieces first"],
          ["partsDesc", "Most pieces first"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSort(value)}
            disabled={loading && sort === value}
            className={css({
              fontSize: "xs",
              fontWeight: "700",
              fontFamily: "display",
              px: "3",
              py: "1.5",
              rounded: "md",
              border: "1px solid",
              cursor: "pointer",
              transition: "all 0.15s ease",
              bg: sort === value ? "lego.orange" : "plate.raised",
              borderColor: sort === value ? "lego.orange" : "plate.border",
              color: sort === value ? "white" : "ink.primary",
              _hover: {
                borderColor: sort === value ? "lego.orange" : "plate.borderHover",
                bg: sort === value ? "lego.orange" : "plate.hover",
              },
            })}
          >
            {label}
          </button>
        ))}
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
                      color: set.displayPrice != null ? "lego.green" : "ink.faint",
                      bg: set.displayPrice != null ? "rgba(0, 175, 79, 0.12)" : "rgba(255,255,255,0.04)",
                      px: "2",
                      py: "0.5",
                      rounded: "md",
                    })}
                    title={
                      set.displayPrice != null
                        ? [
                            formatPrice(set.usdRetail, "USD") && `Retail USD ${formatPrice(set.usdRetail, "USD")}`,
                            formatPrice(set.eurRetail, "EUR") && `Retail EUR ${formatPrice(set.eurRetail, "EUR")}`,
                            formatPrice(set.gbpRetail, "GBP") && `Retail GBP ${formatPrice(set.gbpRetail, "GBP")}`,
                            formatPrice(set.usdMarket, "USD") && `Market USD ${formatPrice(set.usdMarket, "USD")}`,
                            formatPrice(set.eurMarket, "EUR") && `Market EUR ${formatPrice(set.eurMarket, "EUR")}`,
                            formatPrice(set.gbpMarket, "GBP") && `Market GBP ${formatPrice(set.gbpMarket, "GBP")}`,
                          ]
                            .filter(Boolean)
                            .join("\n")
                        : "Price unavailable"
                    }
                  >
                    {formatPrice(set.displayPrice, set.displayCurrency) ?? "no price"}
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

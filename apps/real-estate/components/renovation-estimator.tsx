"use client";

import { useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RenovationItem {
  category: string;
  description: string;
  cost_eur: number;
  priority: string;
}

interface RenovationScope {
  scope: string;
  items: RenovationItem[];
  total_cost_eur: number;
  cost_per_m2: number;
  duration_weeks: number;
}

interface RenovationROI {
  renovation_cost: number;
  pre_renovation_value: number;
  post_renovation_value: number;
  uplift_pct: number;
  roi_pct: number;
  payback_months: number;
}

interface RenovationEstimatorProps {
  size_m2: number;
  condition: string;
  city: string;
  purchasePrice: number;
  pricePerM2: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

const SCOPES = ["cosmetic", "standard", "full"] as const;

const SCOPE_LABELS: Record<string, string> = {
  cosmetic: "Cosmetic",
  standard: "Standard",
  full: "Full",
};

const SCOPE_DESC: Record<string, string> = {
  cosmetic: "Paint, floors, fixtures",
  standard: "Kitchen, bath, rewiring",
  full: "Gut renovation, everything new",
};

const PRIORITY_COLOR: Record<string, string> = {
  essential: "var(--red-9)",
  recommended: "var(--amber-9)",
  optional: "var(--gray-8)",
};

const CATEGORY_ICONS: Record<string, string> = {
  walls: "\u25A3",
  flooring: "\u2B1A",
  kitchen: "\u2616",
  bathroom: "\u2B1B",
  electrical: "\u26A1",
  plumbing: "\u2B55",
  windows: "\u25FB",
  doors: "\u25AE",
  other: "\u2022",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `\u20AC${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20AC${(n / 1_000).toFixed(1)}K`;
  return `\u20AC${n.toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RenovationEstimator({
  size_m2,
  condition,
  city,
  purchasePrice,
  pricePerM2,
}: RenovationEstimatorProps) {
  const [activeScope, setActiveScope] = useState<string>(
    condition === "needs_renovation" ? "full" : "cosmetic",
  );
  const [renovation, setRenovation] = useState<RenovationScope | null>(null);
  const [roi, setRoi] = useState<RenovationROI | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${ANALYZER_URL}/renovation/roi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        size_m2,
        condition,
        city,
        scope: activeScope,
        current_price_per_m2: pricePerM2,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRenovation(data.renovation);
        setRoi(data.roi);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to estimate");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [size_m2, condition, city, activeScope, pricePerM2]);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "20px 20px 16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--gray-7)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            Renovation Estimator
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-12)" }}>
            {size_m2}m{"\u00B2"} &middot; {city}
          </div>
        </div>
      </div>

      {/* Scope pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {SCOPES.map((s) => {
          const active = activeScope === s;
          return (
            <button
              key={s}
              onClick={() => setActiveScope(s)}
              style={{
                flex: "1 1 0",
                padding: "10px 8px",
                borderRadius: 8,
                border: active
                  ? "1px solid var(--accent-7)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: active
                  ? "rgba(99,102,241,0.10)"
                  : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: active ? "var(--accent-11)" : "var(--gray-11)",
                  marginBottom: 2,
                }}
              >
                {SCOPE_LABELS[s]}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: active ? "var(--accent-9)" : "var(--gray-7)",
                }}
              >
                {SCOPE_DESC[s]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 0",
            color: "var(--gray-7)",
            fontSize: 12,
          }}
        >
          Estimating...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 11,
            color: "var(--red-9)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {renovation && roi && !loading && (
        <>
          {/* Summary stat cards */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              {
                label: "Total Cost",
                value: fmtEur(renovation.total_cost_eur),
                accent: "var(--gray-12)",
              },
              {
                label: "Cost/m\u00B2",
                value: `\u20AC${renovation.cost_per_m2}`,
                accent: "var(--gray-12)",
              },
              {
                label: "Duration",
                value: `${renovation.duration_weeks} weeks`,
                accent: "var(--gray-12)",
              },
              {
                label: "ROI",
                value: `${roi.roi_pct > 0 ? "+" : ""}${roi.roi_pct}%`,
                accent: roi.roi_pct > 0 ? "var(--green-9)" : "var(--red-9)",
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  flex: "1 1 0",
                  minWidth: 100,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--gray-7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: card.accent,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* Itemized breakdown table */}
          <div
            style={{
              background: "rgba(255,255,255,0.01)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "20px 1fr 2fr auto",
                gap: 0,
                fontSize: 11,
              }}
            >
              {/* Header */}
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "grid",
                  gridTemplateColumns: "20px 1fr 2fr auto",
                  padding: "8px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--gray-7)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <span />
                <span>Category</span>
                <span>Description</span>
                <span style={{ textAlign: "right" }}>Cost</span>
              </div>

              {/* Rows */}
              {renovation.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    gridColumn: "1 / -1",
                    display: "grid",
                    gridTemplateColumns: "20px 1fr 2fr auto",
                    padding: "8px 12px",
                    borderBottom:
                      idx < renovation.items.length - 1
                        ? "1px solid rgba(255,255,255,0.03)"
                        : "none",
                    alignItems: "center",
                  }}
                >
                  {/* Priority dot */}
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: PRIORITY_COLOR[item.priority] ?? "var(--gray-7)",
                      display: "inline-block",
                    }}
                  />
                  {/* Category */}
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--gray-11)",
                      textTransform: "capitalize",
                    }}
                  >
                    {CATEGORY_ICONS[item.category] ?? "\u2022"}{" "}
                    {item.category}
                  </span>
                  {/* Description */}
                  <span style={{ color: "var(--gray-9)" }}>
                    {item.description}
                  </span>
                  {/* Cost */}
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--gray-12)",
                      fontVariantNumeric: "tabular-nums",
                      textAlign: "right",
                    }}
                  >
                    {fmtEur(item.cost_eur)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Before / After value comparison bar */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--gray-7)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 10,
              }}
            >
              Value Comparison
            </div>

            {/* Before bar */}
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 11, color: "var(--gray-9)" }}>Before renovation</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--gray-11)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtEur(roi.pre_renovation_value)}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: "var(--gray-4)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "var(--gray-7)",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>

            {/* After bar */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 11, color: "var(--gray-9)" }}>After renovation</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--green-9)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtEur(roi.post_renovation_value)}{" "}
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--green-9)" }}>
                    (+{roi.uplift_pct}%)
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: "var(--gray-4)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: roi.post_renovation_value > 0
                      ? `${Math.min((roi.post_renovation_value / roi.pre_renovation_value) * 100, 100)}%`
                      : "0%",
                    height: "100%",
                    background: "var(--green-9)",
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          </div>

          {/* ROI calculation card */}
          <div
            style={{
              background:
                roi.roi_pct > 0
                  ? "rgba(34, 197, 94, 0.04)"
                  : "rgba(239, 68, 68, 0.04)",
              border: `1px solid ${roi.roi_pct > 0 ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)"}`,
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--gray-7)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 4,
                  }}
                >
                  Return on Investment
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: roi.roi_pct > 0 ? "var(--green-9)" : "var(--red-9)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {roi.roi_pct > 0 ? "+" : ""}
                  {roi.roi_pct}%
                </div>
              </div>

              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--gray-7)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 2,
                    }}
                  >
                    Payback
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--gray-12)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {roi.payback_months} mo
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "var(--gray-7)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 2,
                    }}
                  >
                    Value Added
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--green-9)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtEur(roi.post_renovation_value - roi.pre_renovation_value)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Priority legend */}
          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 12,
              paddingTop: 10,
            }}
          >
            {(["essential", "recommended", "optional"] as const).map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: PRIORITY_COLOR[p],
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--gray-8)",
                    textTransform: "capitalize",
                  }}
                >
                  {p}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

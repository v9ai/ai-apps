"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Listing {
  title: string;
  price_eur: number | null;
  size_m2: number | null;
  price_per_m2: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  zone: string | null;
  city: string;
  condition: string;
  features: string[];
  parking_included: boolean | null;
  parking_price_eur: number | null;
}

interface Valuation {
  verdict: "undervalued" | "fair" | "overvalued";
  confidence: number;
  fair_value_eur_per_m2: number | null;
  price_deviation_pct: number | null;
  reasoning: string;
  key_factors: string[];
  investment_score: number | null;
  risk_factors: string[];
  opportunity_factors: string[];
  recommendation: "strong_buy" | "buy" | "hold" | "avoid" | null;
  market_context: string | null;
  rental_estimate_eur: number | null;
  rental_yield_pct: number | null;
  negotiation_margin_pct: number | null;
  total_cost_eur: number | null;
  liquidity: "high" | "medium" | "low" | null;
  price_trend: "rising" | "stable" | "declining" | null;
  score_breakdown?: {
    price_score: number;
    location_score: number;
    condition_score: number;
    market_score: number;
  };
  fair_price_eur?: number;
}

interface WatchlistItem {
  url: string;
  label: string | null;
  listing: Listing;
  valuation: Valuation;
  source: string;
  analyzed_at: string;
  added_at: string;
  last_checked_at: string;
  alert_threshold_pct: number;
  prev_price_eur: number | null;
  prev_price_per_m2: number | null;
}

interface Alert {
  id: number;
  watchlist_url: string;
  field: string;
  old_value: string;
  new_value: string;
  detected_at: string;
  seen: boolean;
}

/* ------------------------------------------------------------------ */
/*  Color helpers (matching analyzer theme)                            */
/* ------------------------------------------------------------------ */

const VERDICT_COLORS: Record<string, string> = {
  undervalued: "var(--green-9)",
  fair: "var(--blue-9)",
  overvalued: "var(--red-9)",
};

const VERDICT_BG: Record<string, string> = {
  undervalued: "rgba(34, 197, 94, 0.12)",
  fair: "rgba(59, 130, 246, 0.12)",
  overvalued: "rgba(239, 68, 68, 0.12)",
};

const VERDICT_BORDER: Record<string, string> = {
  undervalued: "rgba(34, 197, 94, 0.5)",
  fair: "rgba(59, 130, 246, 0.5)",
  overvalued: "rgba(239, 68, 68, 0.5)",
};

const VERDICT_LABEL: Record<string, string> = {
  undervalued: "Undervalued",
  fair: "Fair Price",
  overvalued: "Overvalued",
};

const REC_LABEL: Record<string, string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  avoid: "Avoid",
};

const REC_COLOR: Record<string, string> = {
  strong_buy: "var(--green-9)",
  buy: "var(--green-9)",
  hold: "var(--amber-9)",
  avoid: "var(--red-9)",
};

const TREND_ICON: Record<string, string> = {
  rising: "\u2197",
  stable: "\u2192",
  declining: "\u2198",
};

const TREND_COLOR: Record<string, string> = {
  rising: "var(--green-9)",
  stable: "var(--gray-9)",
  declining: "var(--red-9)",
};

const FIELD_LABEL: Record<string, string> = {
  price_eur: "Price",
  price_per_m2: "Price/m\u00B2",
  verdict: "Verdict",
};

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function deviationColor(pct: number | null): string {
  if (pct == null) return "var(--gray-9)";
  if (pct < -10) return "var(--green-9)";
  if (pct > 10) return "var(--red-9)";
  return "var(--gray-9)";
}

function scoreColor(score: number): string {
  if (score >= 7) return "var(--green-9)";
  if (score >= 5) return "var(--amber-9)";
  return "var(--red-9)";
}

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `\u20AC${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20AC${(n / 1_000).toFixed(0)}K`;
  return `\u20AC${n.toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Mini Trend Indicator (sparkline-style)                             */
/* ------------------------------------------------------------------ */

function TrendIndicator({ trend }: { trend: "rising" | "stable" | "declining" | null }) {
  if (!trend) return null;

  // SVG mini sparkline shapes per trend
  const paths: Record<string, string> = {
    rising: "M0 14 L6 10 L12 11 L18 7 L24 5 L30 2",
    stable: "M0 8 L6 9 L12 7 L18 8 L24 7 L30 8",
    declining: "M0 2 L6 5 L12 7 L18 10 L24 11 L30 14",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <svg width="30" height="16" viewBox="0 0 30 16" fill="none" style={{ flexShrink: 0 }}>
        <path
          d={paths[trend]}
          stroke={TREND_COLOR[trend]}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: TREND_COLOR[trend],
          textTransform: "capitalize",
        }}
      >
        {TREND_ICON[trend]}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function AlertsBanner({
  alerts,
  items,
  onMarkRead,
}: {
  alerts: Alert[];
  items: WatchlistItem[];
  onMarkRead: () => void;
}) {
  const unseen = alerts.filter((a) => !a.seen);
  if (unseen.length === 0) return null;

  const itemByUrl = Object.fromEntries(items.map((i) => [i.url, i]));

  return (
    <div
      style={{
        background: "rgba(234, 179, 8, 0.06)",
        border: "1px solid rgba(234, 179, 8, 0.2)",
        borderRadius: 12,
        padding: "14px 18px",
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--amber-11)",
            letterSpacing: "0.02em",
          }}
        >
          {unseen.length} price change{unseen.length > 1 ? "s" : ""} detected
        </span>
        <button
          onClick={onMarkRead}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--gray-11)",
            cursor: "pointer",
          }}
        >
          Mark all read
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {unseen.slice(0, 5).map((a) => {
          const item = itemByUrl[a.watchlist_url];
          const displayLabel =
            item?.label || item?.listing?.zone || item?.listing?.city || a.watchlist_url;
          return (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "var(--gray-11)",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--amber-9)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                {displayLabel}
              </span>
              <span style={{ color: "var(--gray-8)" }}>
                {FIELD_LABEL[a.field] || a.field}:
              </span>
              <span style={{ color: "var(--red-9)", textDecoration: "line-through" }}>
                {a.field === "verdict" ? a.old_value : `\u20AC${Number(a.old_value).toLocaleString()}`}
              </span>
              <span style={{ color: "var(--green-9)" }}>
                {a.field === "verdict" ? a.new_value : `\u20AC${Number(a.new_value).toLocaleString()}`}
              </span>
              <span style={{ color: "var(--gray-7)", marginLeft: "auto", flexShrink: 0 }}>
                {timeAgo(a.detected_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Portfolio Summary Header                                           */
/* ------------------------------------------------------------------ */

function PortfolioSummary({ items }: { items: WatchlistItem[] }) {
  if (items.length === 0) return null;

  const totalValue = items.reduce((sum, i) => sum + (i.listing.price_eur ?? 0), 0);

  const scores = items
    .map((i) => i.valuation.investment_score)
    .filter((s): s is number => s != null);
  const avgScore = scores.length > 0
    ? scores.reduce((s, d) => s + d, 0) / scores.length
    : null;

  const verdictCounts = { undervalued: 0, fair: 0, overvalued: 0 };
  for (const i of items) {
    if (i.valuation.verdict in verdictCounts) {
      verdictCounts[i.valuation.verdict as keyof typeof verdictCounts]++;
    }
  }

  // Potential savings: sum of absolute price_deviation for undervalued items
  // price_deviation_pct is negative for undervalued, so savings = |dev%| * price / 100
  const potentialSavings = items.reduce((sum, i) => {
    if (
      i.valuation.verdict === "undervalued" &&
      i.valuation.price_deviation_pct != null &&
      i.listing.price_eur != null
    ) {
      return sum + Math.abs(i.valuation.price_deviation_pct / 100) * i.listing.price_eur;
    }
    return sum;
  }, 0);

  const statCard = (
    label: string,
    value: React.ReactNode,
    sub: string,
    accent?: string,
  ) => (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 140,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "var(--gray-7)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: accent ?? "var(--gray-12)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--gray-7)", marginTop: 4 }}>{sub}</div>
    </div>
  );

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Summary row */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        {statCard(
          "Portfolio Value",
          fmtEur(totalValue),
          `${items.length} listing${items.length !== 1 ? "s" : ""} tracked`,
        )}
        {statCard(
          "Avg Investment Score",
          avgScore != null ? avgScore.toFixed(1) : "--",
          avgScore != null ? (avgScore >= 7 ? "Strong" : avgScore >= 5 ? "Moderate" : "Weak") : "No data",
          avgScore != null ? scoreColor(avgScore) : undefined,
        )}
        {statCard(
          "Potential Savings",
          potentialSavings > 0 ? fmtEur(Math.round(potentialSavings)) : "--",
          potentialSavings > 0
            ? `across ${verdictCounts.undervalued} undervalued`
            : "No undervalued items",
          potentialSavings > 0 ? "var(--green-9)" : undefined,
        )}
      </div>

      {/* Verdict distribution bar */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "var(--gray-7)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            flexShrink: 0,
          }}
        >
          Breakdown
        </span>

        {/* Visual bar */}
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
            background: "var(--gray-4)",
          }}
        >
          {(["undervalued", "fair", "overvalued"] as const).map((v) => {
            const pct = items.length > 0 ? (verdictCounts[v] / items.length) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={v}
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: VERDICT_COLORS[v],
                  transition: "width 0.3s ease",
                }}
              />
            );
          })}
        </div>

        {/* Legend counts */}
        <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
          {(["undervalued", "fair", "overvalued"] as const).map((v) => (
            <div key={v} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: VERDICT_COLORS[v],
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--gray-12)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {verdictCounts[v]}
              </span>
              <span style={{ fontSize: 10, color: "var(--gray-8)" }}>
                {VERDICT_LABEL[v].toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Listing Card (compact, verdict accent border)                      */
/* ------------------------------------------------------------------ */

function ListingCard({
  item,
  onRemove,
  onReanalyze,
  reanalyzing,
}: {
  item: WatchlistItem;
  onRemove: (url: string) => void;
  onReanalyze: (url: string) => void;
  reanalyzing: string | null;
}) {
  const { listing, valuation } = item;
  const displayLabel = item.label || listing.zone || listing.city;
  const isReanalyzing = reanalyzing === item.url;

  return (
    <div
      style={{
        position: "relative",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${VERDICT_BORDER[valuation.verdict]}`,
        borderRadius: 10,
        padding: "14px 16px 12px",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.035)";
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Row 1: Label + Verdict badge + Trend */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
          minHeight: 20,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--gray-12)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: "1 1 0",
            minWidth: 0,
          }}
        >
          {displayLabel}
        </span>
        {listing.rooms != null && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 3,
              background: "rgba(255,255,255,0.06)",
              color: "var(--gray-9)",
              flexShrink: 0,
            }}
          >
            {listing.rooms}R
          </span>
        )}
        {listing.size_m2 != null && (
          <span
            style={{
              fontSize: 10,
              color: "var(--gray-7)",
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {listing.size_m2}m{"\u00B2"}
          </span>
        )}
        <TrendIndicator trend={valuation.price_trend} />
      </div>

      {/* Row 2: Price + Deviation + Verdict */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        {listing.price_eur != null && (
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--gray-12)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em",
            }}
          >
            {"\u20AC"}{listing.price_eur.toLocaleString()}
          </span>
        )}
        {listing.price_per_m2 != null && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--gray-9)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {"\u20AC"}{listing.price_per_m2.toLocaleString()}/m{"\u00B2"}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {valuation.price_deviation_pct != null && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: deviationColor(valuation.price_deviation_pct),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {valuation.price_deviation_pct > 0 ? "+" : ""}
            {valuation.price_deviation_pct.toFixed(1)}%
          </span>
        )}
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 99,
            background: VERDICT_BG[valuation.verdict],
            color: VERDICT_COLORS[valuation.verdict],
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            flexShrink: 0,
          }}
        >
          {VERDICT_LABEL[valuation.verdict]}
        </span>
      </div>

      {/* Row 3: Score bar + Recommendation + Yield */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        {/* Investment score mini bar */}
        {valuation.investment_score != null && (
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "var(--gray-7)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Score
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: scoreColor(valuation.investment_score),
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {valuation.investment_score.toFixed(1)}
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "var(--gray-4)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${valuation.investment_score * 10}%`,
                  height: "100%",
                  background: scoreColor(valuation.investment_score),
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Recommendation pill */}
        {valuation.recommendation && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${REC_COLOR[valuation.recommendation] ?? "var(--gray-6)"}`,
              color: REC_COLOR[valuation.recommendation] ?? "var(--gray-9)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {REC_LABEL[valuation.recommendation] ?? valuation.recommendation}
          </span>
        )}

        {/* Yield */}
        {valuation.rental_yield_pct != null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--gray-9)",
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
            }}
          >
            {valuation.rental_yield_pct.toFixed(1)}% yield
          </span>
        )}
      </div>

      {/* Row 4: Footer - timestamp + action buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingTop: 8,
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--gray-7)" }}>
          {timeAgo(item.last_checked_at)}
        </span>
        <span style={{ flex: 1 }} />

        {/* Re-analyze button */}
        <button
          onClick={() => onReanalyze(item.url)}
          disabled={isReanalyzing}
          title="Re-analyze this listing"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 5,
            padding: "3px 8px",
            fontSize: 10,
            fontWeight: 600,
            color: isReanalyzing ? "var(--gray-7)" : "var(--gray-9)",
            cursor: isReanalyzing ? "wait" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isReanalyzing) {
              e.currentTarget.style.borderColor = "var(--accent-7)";
              e.currentTarget.style.color = "var(--accent-11)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = isReanalyzing ? "var(--gray-7)" : "var(--gray-9)";
          }}
        >
          {isReanalyzing ? "..." : "\u21BB"}
        </button>

        {/* View Details link */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 5,
            padding: "3px 8px",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--accent-11)",
            textDecoration: "none",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-7)";
            e.currentTarget.style.background = "rgba(var(--accent-9-rgb, 99, 102, 241), 0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          View {"\u2192"}
        </a>

        {/* Remove button */}
        <button
          onClick={() => onRemove(item.url)}
          title="Remove from watchlist"
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 5,
            padding: "3px 8px",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--gray-7)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
            e.currentTarget.style.color = "var(--red-9)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "var(--gray-7)";
          }}
        >
          {"\u2715"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState() {
  const features = [
    { icon: "\u{1F4C9}", title: "Price Monitoring", desc: "Get alerted when listing prices change" },
    { icon: "\u{1F50D}", title: "AI Valuation", desc: "Investment scores and fair value estimates" },
    { icon: "\u{1F4CA}", title: "Market Trends", desc: "Track price movements across zones" },
  ];

  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px 56px",
      }}
    >
      {/* Icon cluster */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.12))",
          border: "1px solid rgba(99,102,241,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: 28,
        }}
      >
        {"\u{1F3E0}"}
      </div>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "var(--gray-12)",
          margin: "0 0 6px",
          letterSpacing: "-0.02em",
        }}
      >
        Start building your property watchlist
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "var(--gray-8)",
          maxWidth: 400,
          margin: "0 auto 28px",
          lineHeight: 1.5,
        }}
      >
        Analyze listings, track price changes over time, and receive alerts
        when deals improve. Paste a URL above or start from the Analyzer.
      </p>

      {/* CTA */}
      <Link
        href="/analyzer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "linear-gradient(135deg, var(--accent-9), #ec4899)",
          border: "none",
          borderRadius: 8,
          padding: "10px 24px",
          fontSize: 13,
          fontWeight: 700,
          color: "#fff",
          textDecoration: "none",
          transition: "opacity 0.15s, transform 0.15s",
        }}
      >
        Open Analyzer {"\u2192"}
      </Link>

      {/* Feature cards */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: 36,
        }}
      >
        {features.map((f) => (
          <div
            key={f.title}
            style={{
              flex: "0 1 180px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: "16px 14px",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 6 }}>{f.icon}</div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--gray-11)",
                marginBottom: 3,
              }}
            >
              {f.title}
            </div>
            <div style={{ fontSize: 11, color: "var(--gray-7)", lineHeight: 1.4 }}>
              {f.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function PortfolioPanel() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);

  // Add form state
  const [addUrl, setAddUrl] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setAlerts(data.alerts ?? []);
    } catch {
      setError("Failed to load watchlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemove = async (url: string) => {
    setItems((prev) => prev.filter((i) => i.url !== url));
    await fetch(`/api/portfolio?url=${encodeURIComponent(url)}`, { method: "DELETE" });
  };

  const handleMarkRead = async () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, seen: true })));
    await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_alerts_read" }),
    });
  };

  const handleReanalyze = async (url: string) => {
    setReanalyzing(url);
    try {
      const analyzeRes = await fetch(`${ANALYZER_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!analyzeRes.ok) throw new Error(`Backend returned ${analyzeRes.status}`);
      const analysis = await analyzeRes.json();

      // Update saved analysis
      await fetch("/api/save-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysis),
      });

      // Update watchlist entry
      await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysis),
      });

      await fetchData();
    } catch {
      // Silent fail for re-analysis — the old data remains
    } finally {
      setReanalyzing(null);
    }
  };

  const handleAdd = async () => {
    if (!addUrl.trim()) return;
    setAdding(true);
    setAddError(null);

    try {
      // First check if already analyzed in the main analysis_results table
      const savedRes = await fetch("/api/save-analysis");
      const saved = await savedRes.json();
      let analysis = (saved.data?.items as Array<{ url: string }> | undefined)?.find((r) => r.url === addUrl.trim());

      // If not found, call the Python backend to analyze
      if (!analysis) {
        const analyzeRes = await fetch(`${ANALYZER_URL}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: addUrl.trim() }),
        });
        if (!analyzeRes.ok) throw new Error(`Backend returned ${analyzeRes.status}`);
        analysis = await analyzeRes.json();

        // Save to analysis_results too
        await fetch("/api/save-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analysis),
        });
      }

      // Now add to watchlist
      const payload = {
        ...analysis,
        label: addLabel.trim() || null,
      };

      const addRes = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!addRes.ok) throw new Error("Failed to save to watchlist");

      setAddUrl("");
      setAddLabel("");
      await fetchData();
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : `Analysis failed. Make sure the backend is running (${ANALYZER_URL}).`
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      {/* Topbar */}
      <div className="yc-topbar">
        <Link href="/">
          <span className="yc-topbar-logo" />
          REAL ESTATE AI RESEARCH
        </Link>
        <Link href="/analyzer">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Analyzer</span>
        </Link>
        <Link href="/dashboard">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Dashboard</span>
        </Link>
        <Link href="/trends">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Trends</span>
        </Link>
        <Link href="/portfolio">
          <span style={{ fontSize: 13, color: "var(--accent-11)" }}>Portfolio</span>
        </Link>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 64px" }}>
        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--gray-12)",
              margin: 0,
            }}
          >
            Portfolio Watchlist
          </h1>
          {!loading && items.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--gray-7)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {items.length} listing{items.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--gray-8)", margin: "0 0 24px" }}>
          Track saved listings, monitor price changes, and manage alerts.
        </p>

        {/* Add listing form */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--gray-7)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 8,
            }}
          >
            Add Listing
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="url"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="Paste listing URL (999.md or imobiliare.ro)"
              style={{
                flex: "1 1 300px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--gray-4)",
                color: "var(--gray-12)",
                padding: "9px 12px",
                borderRadius: 6,
                fontSize: 12,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-7)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--gray-4)")}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="Label (optional)"
              style={{
                flex: "0 1 140px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--gray-4)",
                color: "var(--gray-12)",
                padding: "9px 12px",
                borderRadius: 6,
                fontSize: 12,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent-7)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--gray-4)")}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !addUrl.trim()}
              style={{
                flex: "0 0 auto",
                background: adding
                  ? "var(--gray-4)"
                  : "linear-gradient(135deg, var(--accent-9), #ec4899)",
                border: "none",
                borderRadius: 6,
                padding: "9px 18px",
                fontSize: 12,
                fontWeight: 700,
                color: "#fff",
                cursor: adding ? "wait" : "pointer",
                opacity: !addUrl.trim() ? 0.5 : 1,
                transition: "opacity 0.15s, transform 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {adding ? "Analyzing..." : "Add to Watchlist"}
            </button>
          </div>
          {addError && (
            <div style={{ fontSize: 11, color: "var(--red-9)", marginTop: 6 }}>
              {addError}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "var(--gray-7)",
              fontSize: 13,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: "2px solid var(--gray-4)",
                borderTopColor: "var(--accent-9)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            Loading watchlist...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 20,
              fontSize: 12,
              color: "var(--red-9)",
            }}
          >
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && <EmptyState />}

        {/* Content */}
        {!loading && !error && items.length > 0 && (
          <>
            {/* Alerts */}
            <AlertsBanner alerts={alerts} items={items} onMarkRead={handleMarkRead} />

            {/* Portfolio summary header */}
            <PortfolioSummary items={items} />

            {/* Cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 12,
              }}
            >
              {items.map((item) => (
                <ListingCard
                  key={item.url}
                  item={item}
                  onRemove={handleRemove}
                  onReanalyze={handleReanalyze}
                  reanalyzing={reanalyzing}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

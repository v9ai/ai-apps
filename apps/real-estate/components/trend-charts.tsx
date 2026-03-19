"use client";

import { useState, useMemo } from "react";
import type {
  ZoneStat,
  VerdictCount,
  Opportunity,
  TrendsData,
} from "@/app/api/trends/route";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (n: number) => n.toLocaleString();

function barColor(ratio: number): string {
  // 0 = green (cheap), 1 = red (expensive)
  const r = Math.round(40 + ratio * 200);
  const g = Math.round(180 - ratio * 140);
  const b = Math.round(80 - ratio * 40);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Returns a color from a green-to-warm gradient based on ratio (0=cheapest, 1=most expensive) */
function zoneBarGradient(ratio: number): { from: string; to: string } {
  if (ratio < 0.25) return { from: "#059669", to: "#10b981" };
  if (ratio < 0.5) return { from: "#0d9488", to: "#2dd4bf" };
  if (ratio < 0.75) return { from: "#d97706", to: "#f59e0b" };
  return { from: "#dc2626", to: "#ef4444" };
}

const VERDICT_COLORS: Record<string, string> = {
  undervalued: "#22c55e",
  fair: "#6366f1",
  overvalued: "#ef4444",
};

const VERDICT_LABELS: Record<string, string> = {
  undervalued: "Undervalued",
  fair: "Fair",
  overvalued: "Overvalued",
};

const REC_COLORS: Record<string, string> = {
  strong_buy: "#22c55e",
  buy: "#14b8a6",
  hold: "#f59e0b",
  avoid: "#ef4444",
};

const REC_LABELS: Record<string, string> = {
  strong_buy: "Strong Buy",
  buy: "Buy",
  hold: "Hold",
  avoid: "Avoid",
};

/* ------------------------------------------------------------------ */
/*  Summary statistics (computed from data)                            */
/* ------------------------------------------------------------------ */

interface SummaryStats {
  mostUndervaluedZone: { zone: string; city: string; avgPrice: number } | null;
  hottestMarket: { zone: string; city: string; count: number } | null;
  bestOpportunity: Opportunity | null;
  totalListings: number;
  totalZones: number;
  avgPricePerM2: number;
}

function computeSummary(
  zones: ZoneStat[],
  opportunities: Opportunity[]
): SummaryStats {
  const totalListings = zones.reduce((s, z) => s + z.sample_count, 0);
  const totalZones = zones.length;
  const avgPricePerM2 =
    totalListings > 0
      ? Math.round(
          zones.reduce((s, z) => s + z.avg_price_per_m2 * z.sample_count, 0) /
            totalListings
        )
      : 0;

  // Most undervalued zone = cheapest avg price per m2
  const sortedByPrice = [...zones].sort(
    (a, b) => a.avg_price_per_m2 - b.avg_price_per_m2
  );
  const cheapest = sortedByPrice[0] ?? null;

  // Hottest market = most listings
  const sortedByCount = [...zones].sort(
    (a, b) => b.sample_count - a.sample_count
  );
  const hottest = sortedByCount[0] ?? null;

  // Best opportunity = largest negative deviation
  const bestOpp = opportunities.length > 0 ? opportunities[0] : null;

  return {
    mostUndervaluedZone: cheapest
      ? { zone: cheapest.zone, city: cheapest.city, avgPrice: cheapest.avg_price_per_m2 }
      : null,
    hottestMarket: hottest
      ? { zone: hottest.zone, city: hottest.city, count: hottest.sample_count }
      : null,
    bestOpportunity: bestOpp,
    totalListings,
    totalZones,
    avgPricePerM2,
  };
}

/* ------------------------------------------------------------------ */
/*  SummaryDashboard                                                   */
/* ------------------------------------------------------------------ */

function SummaryDashboard({
  stats,
}: {
  stats: SummaryStats;
}) {
  const cards: {
    label: string;
    value: string;
    sub: string;
    accent: string;
    bgAccent: string;
  }[] = [];

  if (stats.mostUndervaluedZone) {
    cards.push({
      label: "Most Undervalued Zone",
      value: stats.mostUndervaluedZone.zone,
      sub: `${stats.mostUndervaluedZone.city} -- \u20AC${fmt(stats.mostUndervaluedZone.avgPrice)}/m\u00B2`,
      accent: "#22c55e",
      bgAccent: "rgba(34,197,94,0.08)",
    });
  }

  if (stats.hottestMarket) {
    cards.push({
      label: "Hottest Market",
      value: stats.hottestMarket.zone,
      sub: `${stats.hottestMarket.city} -- ${stats.hottestMarket.count} listing${stats.hottestMarket.count !== 1 ? "s" : ""}`,
      accent: "#f59e0b",
      bgAccent: "rgba(245,158,11,0.08)",
    });
  }

  if (stats.bestOpportunity) {
    const opp = stats.bestOpportunity;
    cards.push({
      label: "Best Investment Opportunity",
      value: `${Number(opp.price_deviation_pct).toFixed(1)}% below fair value`,
      sub: `${opp.city}${opp.zone !== "Unknown" ? ` / ${opp.zone}` : ""}${opp.price_eur != null ? ` -- \u20AC${fmt(opp.price_eur)}` : ""}`,
      accent: "#6366f1",
      bgAccent: "rgba(99,102,241,0.08)",
    });
  }

  if (cards.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cards.length}, 1fr)`,
        gap: 12,
        marginBottom: 28,
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            position: "relative",
            background: card.bgAccent,
            border: `1px solid ${card.accent}33`,
            borderRadius: 14,
            padding: "18px 20px",
            overflow: "hidden",
          }}
        >
          {/* Decorative top bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: card.accent,
              borderRadius: "14px 14px 0 0",
            }}
          />
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: card.accent,
              marginBottom: 8,
            }}
          >
            {card.label}
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--gray-12)",
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
              marginBottom: 4,
            }}
          >
            {card.value}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--gray-9)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {card.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CitySelector                                                       */
/* ------------------------------------------------------------------ */

function CitySelector({
  cities,
  selected,
  onSelect,
}: {
  cities: string[];
  selected: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 32 }}>
      <button
        onClick={() => onSelect("__all__")}
        style={{
          padding: "6px 16px",
          borderRadius: 99,
          border: "1px solid",
          borderColor:
            selected === "__all__"
              ? "var(--accent-9)"
              : "rgba(255,255,255,0.08)",
          background:
            selected === "__all__"
              ? "var(--accent-3)"
              : "rgba(255,255,255,0.04)",
          color:
            selected === "__all__" ? "var(--accent-11)" : "var(--gray-10)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
          backdropFilter: "blur(8px)",
        }}
      >
        All Cities
      </button>
      {cities.map((city) => (
        <button
          key={city}
          onClick={() => onSelect(city)}
          style={{
            padding: "6px 16px",
            borderRadius: 99,
            border: "1px solid",
            borderColor:
              selected === city
                ? "var(--accent-9)"
                : "rgba(255,255,255,0.08)",
            background:
              selected === city
                ? "var(--accent-3)"
                : "rgba(255,255,255,0.04)",
            color:
              selected === city ? "var(--accent-11)" : "var(--gray-10)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
            backdropFilter: "blur(8px)",
          }}
        >
          {city}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  KeyInsight callout                                                  */
/* ------------------------------------------------------------------ */

function KeyInsight({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 16px",
        marginTop: 16,
        borderRadius: 10,
        background: "rgba(99,102,241,0.06)",
        border: "1px solid rgba(99,102,241,0.15)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 1 }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <div style={{ fontSize: 12, color: "var(--gray-11)", lineHeight: 1.5 }}>
        <span style={{ fontWeight: 700, color: "#818cf8", marginRight: 4 }}>
          Key Insight:
        </span>
        {text}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ZonePriceBarChart (horizontal bars)                                */
/* ------------------------------------------------------------------ */

function ZonePriceBarChart({ zones }: { zones: ZoneStat[] }) {
  if (zones.length === 0)
    return (
      <SectionCard
        title="Average Price per m\u00B2 by Zone"
        description="Compare pricing across neighborhoods to identify affordable and premium areas."
      >
        <EmptyState message="No zone data available yet. Analyze some listings to populate trends." />
      </SectionCard>
    );

  const sorted = [...zones].sort(
    (a, b) => b.avg_price_per_m2 - a.avg_price_per_m2
  );
  const maxPrice = Math.max(...sorted.map((z) => z.avg_price_per_m2));
  const minPrice = Math.min(...sorted.map((z) => z.avg_price_per_m2));
  const priceRange = maxPrice - minPrice;

  // Compute insight
  const spread = maxPrice > 0 ? ((priceRange / minPrice) * 100).toFixed(0) : "0";
  const cheapestZone = sorted[sorted.length - 1];
  const insightText =
    sorted.length >= 2
      ? `Prices vary by ${spread}% across zones. ${cheapestZone.zone} offers the lowest average at \u20AC${fmt(cheapestZone.avg_price_per_m2)}/m\u00B2, making it a strong candidate for value investments.`
      : `${sorted[0].zone} averages \u20AC${fmt(sorted[0].avg_price_per_m2)}/m\u00B2 across ${sorted[0].sample_count} listing${sorted[0].sample_count !== 1 ? "s" : ""}.`;

  return (
    <SectionCard
      title="Average Price per m\u00B2 by Zone"
      description="Horizontal bars show relative pricing. Green zones are more affordable; warm tones indicate premium pricing."
      badge={`${sorted.length} zone${sorted.length !== 1 ? "s" : ""}`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sorted.map((zone, i) => {
          const ratio =
            priceRange > 0
              ? (zone.avg_price_per_m2 - minPrice) / priceRange
              : 0;
          const widthPct = Math.max(12, maxPrice > 0 ? (zone.avg_price_per_m2 / maxPrice) * 100 : 0);
          const gradient = zoneBarGradient(ratio);
          const hasDuplicate = sorted.some(
            (z, j) => j !== i && z.zone === zone.zone && z.city !== zone.city
          );
          return (
            <div key={`${zone.city}-${zone.zone}-${i}`}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 5,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--gray-12)",
                    }}
                  >
                    {zone.zone}
                  </span>
                  {hasDuplicate && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--gray-7)",
                        fontWeight: 400,
                      }}
                    >
                      {zone.city}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "var(--gray-12)",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {"\u20AC"}{fmt(zone.avg_price_per_m2)}
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--gray-8)" }}>
                      /m{"\u00B2"}
                    </span>
                  </span>
                </div>
              </div>
              <div
                style={{
                  position: "relative",
                  height: 32,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
                    borderRadius: 8,
                    transition: "width 0.6s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 10,
                    paddingLeft: 10,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.9)",
                      textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {zone.sample_count} listing{zone.sample_count !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              {/* Min-max range */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 3,
                  fontSize: 10,
                  color: "var(--gray-7)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span>min {"\u20AC"}{fmt(zone.min_price_per_m2)}</span>
                <span>max {"\u20AC"}{fmt(zone.max_price_per_m2)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <KeyInsight text={insightText} />
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  PriceDistributionChart                                             */
/* ------------------------------------------------------------------ */

function PriceDistributionChart({ zones }: { zones: ZoneStat[] }) {
  if (zones.length === 0) return null;

  // Build simple histogram buckets from zone data
  const allPrices = zones.flatMap((z) => {
    const prices: number[] = [z.avg_price_per_m2];
    if (z.min_price_per_m2 !== z.avg_price_per_m2) prices.push(z.min_price_per_m2);
    if (z.max_price_per_m2 !== z.avg_price_per_m2) prices.push(z.max_price_per_m2);
    return prices;
  });

  if (allPrices.length < 2) return null;

  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP;
  if (range === 0) return null;

  const bucketCount = Math.min(8, allPrices.length);
  const bucketSize = range / bucketCount;
  const buckets: { label: string; count: number }[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const lo = minP + i * bucketSize;
    const hi = lo + bucketSize;
    const count = allPrices.filter(
      (p) => p >= lo && (i === bucketCount - 1 ? p <= hi : p < hi)
    ).length;
    buckets.push({
      label: `${"\u20AC"}${fmt(Math.round(lo))}`,
      count,
    });
  }

  const maxCount = Math.max(...buckets.map((b) => b.count));

  return (
    <SectionCard
      title="Price Distribution"
      description="How prices cluster across your analyzed listings."
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          height: 120,
          paddingTop: 8,
        }}
      >
        {buckets.map((b, i) => {
          const heightPct = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              {b.count > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--gray-9)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {b.count}
                </span>
              )}
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(4, heightPct)}%`,
                  background: `linear-gradient(180deg, var(--accent-9), var(--accent-7))`,
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.4s ease",
                  minHeight: b.count > 0 ? 8 : 2,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          gap: 4,
          marginTop: 4,
        }}
      >
        {buckets.map((b, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 9,
              color: "var(--gray-7)",
              fontVariantNumeric: "tabular-nums",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {b.label}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  VerdictRingChart (SVG donut)                                       */
/* ------------------------------------------------------------------ */

function VerdictRingChart({ verdicts }: { verdicts: VerdictCount[] }) {
  if (verdicts.length === 0)
    return (
      <SectionCard
        title="Verdict Breakdown"
        description="Distribution of valuations across all analyzed properties."
      >
        <EmptyState message="No verdict data yet." />
      </SectionCard>
    );

  const total = verdicts.reduce((s, v) => s + v.count, 0);
  const radius = 60;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  const center = radius + stroke;
  const size = center * 2;

  let offset = 0;
  const segments = verdicts.map((v) => {
    const pct = v.count / total;
    const dashLen = pct * circumference;
    const dashGap = circumference - dashLen;
    const seg = {
      ...v,
      pct,
      dasharray: `${dashLen} ${dashGap}`,
      dashoffset: -offset,
      color: VERDICT_COLORS[v.verdict] ?? "var(--gray-7)",
    };
    offset += dashLen;
    return seg;
  });

  // Insight
  const undervalued = segments.find((s) => s.verdict === "undervalued");
  const overvalued = segments.find((s) => s.verdict === "overvalued");
  let insightText = "";
  if (undervalued && overvalued) {
    const ratio = (undervalued.count / overvalued.count).toFixed(1);
    insightText =
      undervalued.count > overvalued.count
        ? `The market leans favorable for buyers -- ${ratio}x more undervalued listings than overvalued.`
        : `More properties are overvalued than undervalued. Consider waiting or negotiating aggressively.`;
  } else if (undervalued) {
    insightText = `${(undervalued.pct * 100).toFixed(0)}% of analyzed properties are undervalued -- a buyer-friendly market signal.`;
  }

  return (
    <SectionCard
      title="Verdict Breakdown"
      description="How analyzed properties distribute across valuation categories."
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          flexWrap: "wrap",
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          ))}
          {/* center label */}
          <text
            x={center}
            y={center - 6}
            textAnchor="middle"
            fill="var(--gray-12)"
            fontSize="22"
            fontWeight="800"
          >
            {total}
          </text>
          <text
            x={center}
            y={center + 12}
            textAnchor="middle"
            fill="var(--gray-8)"
            fontSize="10"
            fontWeight="600"
          >
            TOTAL
          </text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {segments.map((seg, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: seg.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: "var(--gray-11)" }}>
                {VERDICT_LABELS[seg.verdict] ?? seg.verdict}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--gray-12)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {seg.count}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--gray-8)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                ({(seg.pct * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
      {insightText && <KeyInsight text={insightText} />}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  TopZonesTable                                                      */
/* ------------------------------------------------------------------ */

function TopZonesTable({ zones }: { zones: ZoneStat[] }) {
  if (zones.length === 0) return null;

  // Rank by price ascending (cheapest = best investment potential)
  const sorted = [...zones].sort(
    (a, b) => a.avg_price_per_m2 - b.avg_price_per_m2
  );

  return (
    <SectionCard
      title="Zones Ranked by Price"
      description="Ordered from most affordable to most expensive. Lower-priced zones with healthy sample counts may signal investment potential."
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              {["#", "City", "Zone", "Avg /m\u00B2", "Min", "Max", "Listings"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === "#" ? "center" : "left",
                      padding: "8px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--gray-8)",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((z, i) => (
              <tr
                key={`${z.city}-${z.zone}-${i}`}
                style={{
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.03)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td
                  style={{
                    textAlign: "center",
                    padding: "8px 10px",
                    color: "var(--gray-7)",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  {i + 1}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    color: "var(--gray-11)",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  {z.city}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    fontWeight: 600,
                    color: "var(--gray-12)",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  {z.zone}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    fontWeight: 700,
                    color: "var(--gray-12)",
                    fontVariantNumeric: "tabular-nums",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  {"\u20AC"}{fmt(z.avg_price_per_m2)}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    color: "var(--gray-9)",
                    fontVariantNumeric: "tabular-nums",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  {"\u20AC"}{fmt(z.min_price_per_m2)}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    color: "var(--gray-9)",
                    fontVariantNumeric: "tabular-nums",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  {"\u20AC"}{fmt(z.max_price_per_m2)}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    color: "var(--gray-9)",
                    fontVariantNumeric: "tabular-nums",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  {z.sample_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  OpportunitiesList (deal feed)                                      */
/* ------------------------------------------------------------------ */

function OpportunitiesList({ opportunities }: { opportunities: Opportunity[] }) {
  if (opportunities.length === 0)
    return (
      <SectionCard
        title="Deal Feed"
        description="Top opportunities ranked by price deviation from fair value."
      >
        <EmptyState message="No opportunities found yet. Analyze listings to discover undervalued properties." />
      </SectionCard>
    );

  // Insight
  const avgDeviation =
    opportunities.reduce((s, o) => s + Number(o.price_deviation_pct), 0) /
    opportunities.length;
  const strongBuys = opportunities.filter(
    (o) => o.recommendation === "strong_buy"
  ).length;
  let insightText = `Average deviation across top ${opportunities.length} opportunities is ${avgDeviation.toFixed(1)}%.`;
  if (strongBuys > 0) {
    insightText += ` ${strongBuys} of these are rated Strong Buy.`;
  }

  return (
    <SectionCard
      title="Deal Feed"
      description="Properties with the largest negative price deviation from estimated fair value. These represent the best potential bargains in the analyzed market."
      badge={`${opportunities.length} deal${opportunities.length !== 1 ? "s" : ""}`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {opportunities.map((opp, i) => {
          const isGoodDeal = opp.price_deviation_pct < 0;
          const deviationAbs = Math.abs(Number(opp.price_deviation_pct));
          const verdictColor = VERDICT_COLORS[opp.verdict] ?? "var(--gray-7)";
          const recColor = opp.recommendation
            ? REC_COLORS[opp.recommendation] ?? "var(--gray-7)"
            : null;

          return (
            <a
              key={opp.url}
              href={opp.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                padding: "16px 20px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = isGoodDeal
                  ? "rgba(34,197,94,0.3)"
                  : "rgba(255,255,255,0.12)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 24px rgba(0,0,0,0.25)";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              }}
            >
              {/* Left accent stripe */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: verdictColor,
                  borderRadius: "14px 0 0 14px",
                }}
              />

              {/* Top row: rank + title + verdict badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--gray-7)",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 20,
                  }}
                >
                  #{i + 1}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--gray-12)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {opp.title || "Untitled listing"}
                </span>
                {/* Verdict badge */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 99,
                    background: `${verdictColor}1a`,
                    color: verdictColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    flexShrink: 0,
                    border: `1px solid ${verdictColor}33`,
                  }}
                >
                  {VERDICT_LABELS[opp.verdict] ?? opp.verdict}
                </span>
              </div>

              {/* Location row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  fontSize: 12,
                  color: "var(--gray-8)",
                  marginBottom: 12,
                  paddingLeft: 30,
                }}
              >
                <span>{opp.city}</span>
                {opp.zone !== "Unknown" && (
                  <>
                    <span style={{ color: "var(--gray-6)" }}>/</span>
                    <span>{opp.zone}</span>
                  </>
                )}
                {opp.size_m2 != null && (
                  <>
                    <span style={{ color: "var(--gray-6)" }}>--</span>
                    <span>{opp.size_m2} m{"\u00B2"}</span>
                  </>
                )}
                {opp.rooms != null && (
                  <>
                    <span style={{ color: "var(--gray-6)" }}>--</span>
                    <span>
                      {opp.rooms} room{opp.rooms !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
                {opp.condition && (
                  <>
                    <span style={{ color: "var(--gray-6)" }}>--</span>
                    <span>{opp.condition}</span>
                  </>
                )}
              </div>

              {/* Metrics row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  paddingLeft: 30,
                  flexWrap: "wrap",
                }}
              >
                {/* Price */}
                {opp.price_eur != null && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--gray-7)",
                      }}
                    >
                      Price
                    </span>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "var(--gray-12)",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {"\u20AC"}{fmt(opp.price_eur)}
                    </span>
                  </div>
                )}

                {/* Price per m2 */}
                {opp.price_per_m2 != null && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--gray-7)",
                      }}
                    >
                      Per m{"\u00B2"}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--gray-11)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {"\u20AC"}{fmt(Math.round(opp.price_per_m2))}
                    </span>
                  </div>
                )}

                {/* Deviation */}
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--gray-7)",
                    }}
                  >
                    Deviation
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: isGoodDeal ? "#22c55e" : "#ef4444",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {isGoodDeal ? "-" : "+"}{deviationAbs.toFixed(1)}%
                  </span>
                </div>

                {/* Investment score */}
                {opp.investment_score != null && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--gray-7)",
                      }}
                    >
                      Score
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        fontVariantNumeric: "tabular-nums",
                        color:
                          Number(opp.investment_score) >= 7
                            ? "#22c55e"
                            : Number(opp.investment_score) >= 5
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    >
                      {Number(opp.investment_score).toFixed(1)}/10
                    </span>
                  </div>
                )}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Recommendation badge */}
                {opp.recommendation && recColor && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "5px 14px",
                      borderRadius: 99,
                      background: `${recColor}1a`,
                      color: recColor,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      border: `1px solid ${recColor}33`,
                    }}
                  >
                    {REC_LABELS[opp.recommendation] ??
                      opp.recommendation.replace("_", " ")}
                  </span>
                )}

                {/* Analyze arrow */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--gray-8)",
                  }}
                >
                  <span>View</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="7" y1="17" x2="17" y2="7" />
                    <polyline points="7 7 17 7 17 17" />
                  </svg>
                </div>
              </div>
            </a>
          );
        })}
      </div>
      <KeyInsight text={insightText} />
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 24,
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: description ? 8 : 16,
        }}
      >
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--gray-12)",
            letterSpacing: "-0.01em",
            margin: 0,
          }}
        >
          {title}
        </h3>
        {badge && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 99,
              background: "rgba(255,255,255,0.06)",
              color: "var(--gray-10)",
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p
          style={{
            fontSize: 12,
            color: "var(--gray-8)",
            margin: "0 0 16px 0",
            lineHeight: 1.5,
            maxWidth: 560,
          }}
        >
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "32px 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>
        {/* Chart icon using CSS */}
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--gray-7)" }}
        >
          <path d="M3 3v18h18" />
          <path d="M7 16l4-4 4 4 5-5" />
        </svg>
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--gray-7)",
          margin: 0,
          lineHeight: 1.5,
          maxWidth: 400,
          marginInline: "auto",
        }}
      >
        {message}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function TrendCharts({ data }: { data: TrendsData }) {
  const cities = useMemo(() => {
    const set = new Set<string>();
    data.zoneStats.forEach((z) => set.add(z.city));
    data.verdictCounts.forEach((v) => set.add(v.city));
    data.opportunities.forEach((o) => set.add(o.city));
    return Array.from(set).sort();
  }, [data]);

  const [selectedCity, setSelectedCity] = useState<string>("__all__");

  const filteredZones = useMemo(
    () =>
      selectedCity === "__all__"
        ? data.zoneStats
        : data.zoneStats.filter((z) => z.city === selectedCity),
    [data.zoneStats, selectedCity]
  );

  const filteredVerdicts = useMemo(
    () =>
      selectedCity === "__all__"
        ? // Merge across cities
          Object.values(
            data.verdictCounts.reduce(
              (acc, v) => {
                if (!acc[v.verdict])
                  acc[v.verdict] = { city: "All", verdict: v.verdict, count: 0 };
                acc[v.verdict].count += v.count;
                return acc;
              },
              {} as Record<string, VerdictCount>
            )
          )
        : data.verdictCounts.filter((v) => v.city === selectedCity),
    [data.verdictCounts, selectedCity]
  );

  const filteredOpportunities = useMemo(
    () =>
      selectedCity === "__all__"
        ? data.opportunities
        : data.opportunities.filter((o) => o.city === selectedCity),
    [data.opportunities, selectedCity]
  );

  const summary = useMemo(
    () => computeSummary(filteredZones, filteredOpportunities),
    [filteredZones, filteredOpportunities]
  );

  const hasAnyData =
    data.zoneStats.length > 0 ||
    data.verdictCounts.length > 0 ||
    data.opportunities.length > 0;

  if (!hasAnyData) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 64px" }}>
        <EmptyState message="No trend data available yet. Use the Price Analyzer to analyze some listings, then check back here to see market trends and insights." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 64px" }}>
      {cities.length > 1 && (
        <CitySelector
          cities={cities}
          selected={selectedCity}
          onSelect={setSelectedCity}
        />
      )}

      {/* Summary statistics */}
      <SummaryDashboard stats={summary} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ gridColumn: filteredZones.length > 0 ? "1 / 2" : "1 / -1" }}>
          <ZonePriceBarChart zones={filteredZones} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <VerdictRingChart verdicts={filteredVerdicts} />
          <PriceDistributionChart zones={filteredZones} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <TopZonesTable zones={filteredZones} />
      </div>

      <OpportunitiesList opportunities={filteredOpportunities} />

      {/* Responsive override for small screens */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="grid-template-columns: repeat("] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

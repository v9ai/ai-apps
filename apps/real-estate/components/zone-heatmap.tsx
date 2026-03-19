"use client";

import { useState, useMemo, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ZoneData {
  zone: string;
  avg_price_per_m2: number;
  listing_count: number;
  avg_deviation_pct: number;
  avg_investment_score: number;
  verdict_breakdown: { undervalued: number; fair: number; overvalued: number };
}

interface ZoneHeatmapProps {
  city: string;
  zones: ZoneData[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type SortKey = "price" | "count" | "deviation" | "investment";

/** Interpolate between two RGB triples at ratio t in [0,1]. */
function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

/** Map a normalized value [0,1] to a green -> amber -> red gradient. */
function priceColor(t: number): string {
  const green: [number, number, number] = [34, 197, 94];   // #22c55e
  const amber: [number, number, number] = [245, 158, 11];  // #f59e0b
  const red: [number, number, number] = [239, 68, 68];     // #ef4444

  if (t <= 0.5) {
    return lerpRgb(green, amber, t * 2);
  }
  return lerpRgb(amber, red, (t - 0.5) * 2);
}

/** Return a background color with adjustable alpha for cells. */
function priceColorAlpha(t: number, alpha: number): string {
  const green: [number, number, number] = [34, 197, 94];
  const amber: [number, number, number] = [245, 158, 11];
  const red: [number, number, number] = [239, 68, 68];

  let r: number, g: number, b: number;
  if (t <= 0.5) {
    const s = t * 2;
    r = Math.round(green[0] + (amber[0] - green[0]) * s);
    g = Math.round(green[1] + (amber[1] - green[1]) * s);
    b = Math.round(green[2] + (amber[2] - green[2]) * s);
  } else {
    const s = (t - 0.5) * 2;
    r = Math.round(amber[0] + (red[0] - amber[0]) * s);
    g = Math.round(amber[1] + (red[1] - amber[1]) * s);
    b = Math.round(amber[2] + (red[2] - amber[2]) * s);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Extract city name from zone string (assumes "Zone, City" or "Zone - City" or just "Zone"). */
function extractCity(zone: string): string {
  const dashParts = zone.split(" - ");
  if (dashParts.length > 1) return dashParts[dashParts.length - 1].trim();
  const commaParts = zone.split(",");
  if (commaParts.length > 1) return commaParts[commaParts.length - 1].trim();
  return "";
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

function Tooltip({ zone, style }: { zone: ZoneData; style: React.CSSProperties }) {
  const total =
    zone.verdict_breakdown.undervalued +
    zone.verdict_breakdown.fair +
    zone.verdict_breakdown.overvalued;
  const pctU = total > 0 ? (zone.verdict_breakdown.undervalued / total) * 100 : 0;
  const pctF = total > 0 ? (zone.verdict_breakdown.fair / total) * 100 : 0;
  const pctO = total > 0 ? (zone.verdict_breakdown.overvalued / total) * 100 : 0;

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 50,
        minWidth: 260,
        padding: "16px 18px",
        borderRadius: 12,
        background: "rgba(24, 24, 27, 0.98)", // zinc-900
        border: "1px solid #3f3f46", // zinc-700
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
        pointerEvents: "none",
        ...style,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15, color: "#fafafa", marginBottom: 10 }}>
        {zone.zone}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg price/m2</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fafafa" }}>
            {"\u20AC"}{fmt(zone.avg_price_per_m2)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Deviation</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color:
                zone.avg_deviation_pct < -5
                  ? "#4ade80"
                  : zone.avg_deviation_pct > 5
                    ? "#f87171"
                    : "#a1a1aa",
            }}
          >
            {zone.avg_deviation_pct > 0 ? "+" : ""}
            {zone.avg_deviation_pct.toFixed(1)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Investment score</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color:
                zone.avg_investment_score >= 7
                  ? "#4ade80"
                  : zone.avg_investment_score >= 5
                    ? "#fbbf24"
                    : "#f87171",
            }}
          >
            {zone.avg_investment_score.toFixed(1)}/10
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Listings</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fafafa" }}>
            {zone.listing_count}
          </div>
        </div>
      </div>

      {/* verdict breakdown bar */}
      <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Verdict breakdown</div>
      <div
        style={{
          display: "flex",
          height: 10,
          borderRadius: 5,
          overflow: "hidden",
          marginBottom: 6,
          background: "rgba(255,255,255,0.05)",
        }}
      >
        {pctU > 0 && (
          <div style={{ width: `${pctU}%`, background: "#4ade80", transition: "width 0.3s" }} />
        )}
        {pctF > 0 && (
          <div style={{ width: `${pctF}%`, background: "#facc15", transition: "width 0.3s" }} />
        )}
        {pctO > 0 && (
          <div style={{ width: `${pctO}%`, background: "#f87171", transition: "width 0.3s" }} />
        )}
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#a1a1aa" }}>
        <span>
          <span style={{ color: "#4ade80" }}>{"\u25CF"}</span> {zone.verdict_breakdown.undervalued} under
        </span>
        <span>
          <span style={{ color: "#facc15" }}>{"\u25CF"}</span> {zone.verdict_breakdown.fair} fair
        </span>
        <span>
          <span style={{ color: "#f87171" }}>{"\u25CF"}</span> {zone.verdict_breakdown.overvalued} over
        </span>
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: "#71717a" }}>
        {zone.listing_count} listing{zone.listing_count !== 1 ? "s" : ""} analyzed
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail panel (shown on click)                                      */
/* ------------------------------------------------------------------ */

function ZoneDetailPanel({
  zone,
  minPrice,
  maxPrice,
  onClose,
}: {
  zone: ZoneData;
  minPrice: number;
  maxPrice: number;
  onClose: () => void;
}) {
  const total =
    zone.verdict_breakdown.undervalued +
    zone.verdict_breakdown.fair +
    zone.verdict_breakdown.overvalued;
  const pctU = total > 0 ? (zone.verdict_breakdown.undervalued / total) * 100 : 0;
  const pctF = total > 0 ? (zone.verdict_breakdown.fair / total) * 100 : 0;
  const pctO = total > 0 ? (zone.verdict_breakdown.overvalued / total) * 100 : 0;
  const priceRange = maxPrice - minPrice || 1;
  const t = (zone.avg_price_per_m2 - minPrice) / priceRange;

  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #3f3f46",
        borderRadius: 12,
        padding: "20px 24px",
        marginBottom: 16,
        position: "relative",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid #3f3f46",
          borderRadius: 6,
          color: "#a1a1aa",
          cursor: "pointer",
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          lineHeight: 1,
          transition: "background 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)";
          (e.currentTarget as HTMLButtonElement).style.color = "#fafafa";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa";
        }}
      >
        {"\u2715"}
      </button>

      <div style={{ fontWeight: 700, fontSize: 18, color: "#fafafa", marginBottom: 4 }}>
        {zone.zone}
      </div>
      <div style={{ fontSize: 12, color: "#71717a", marginBottom: 16 }}>
        Detailed zone statistics
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid #27272a",
          }}
        >
          <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Avg Price/m2</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fafafa" }}>
            {"\u20AC"}{fmt(zone.avg_price_per_m2)}
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid #27272a",
          }}
        >
          <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Deviation</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color:
                zone.avg_deviation_pct < -5
                  ? "#4ade80"
                  : zone.avg_deviation_pct > 5
                    ? "#f87171"
                    : "#a1a1aa",
            }}
          >
            {zone.avg_deviation_pct > 0 ? "+" : ""}
            {zone.avg_deviation_pct.toFixed(1)}%
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid #27272a",
          }}
        >
          <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Investment</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color:
                zone.avg_investment_score >= 7
                  ? "#4ade80"
                  : zone.avg_investment_score >= 5
                    ? "#fbbf24"
                    : "#f87171",
            }}
          >
            {zone.avg_investment_score.toFixed(1)}/10
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: "14px 16px",
            border: "1px solid #27272a",
          }}
        >
          <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Listings</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fafafa" }}>
            {zone.listing_count}
          </div>
        </div>
      </div>

      {/* Price position bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Price position in market
        </div>
        <div
          style={{
            position: "relative",
            height: 12,
            borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            overflow: "visible",
          }}
        >
          {/* Gradient fill */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: "100%",
              borderRadius: 6,
              background: `linear-gradient(to right, ${priceColor(0)}, ${priceColor(0.5)}, ${priceColor(1)})`,
              opacity: 0.3,
            }}
          />
          {/* Position marker */}
          <div
            style={{
              position: "absolute",
              top: -2,
              left: `${Math.min(Math.max(t * 100, 2), 98)}%`,
              transform: "translateX(-50%)",
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: priceColor(t),
              border: "2px solid #fafafa",
              boxShadow: `0 0 8px ${priceColorAlpha(t, 0.6)}`,
              transition: "left 0.3s",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#71717a" }}>
          <span>{"\u20AC"}{fmt(minPrice)}</span>
          <span>{"\u20AC"}{fmt(maxPrice)}</span>
        </div>
      </div>

      {/* Verdict breakdown */}
      <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Verdict breakdown
      </div>
      <div
        style={{
          display: "flex",
          height: 14,
          borderRadius: 7,
          overflow: "hidden",
          marginBottom: 8,
          background: "rgba(255,255,255,0.04)",
        }}
      >
        {pctU > 0 && (
          <div
            style={{
              width: `${pctU}%`,
              background: "#4ade80",
              transition: "width 0.3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "#052e16",
            }}
          >
            {pctU >= 15 ? `${Math.round(pctU)}%` : ""}
          </div>
        )}
        {pctF > 0 && (
          <div
            style={{
              width: `${pctF}%`,
              background: "#facc15",
              transition: "width 0.3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "#422006",
            }}
          >
            {pctF >= 15 ? `${Math.round(pctF)}%` : ""}
          </div>
        )}
        {pctO > 0 && (
          <div
            style={{
              width: `${pctO}%`,
              background: "#f87171",
              transition: "width 0.3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "#450a0a",
            }}
          >
            {pctO >= 15 ? `${Math.round(pctO)}%` : ""}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#a1a1aa" }}>
        <span>
          <span style={{ color: "#4ade80" }}>{"\u25CF"}</span> {zone.verdict_breakdown.undervalued} undervalued
        </span>
        <span>
          <span style={{ color: "#facc15" }}>{"\u25CF"}</span> {zone.verdict_breakdown.fair} fair
        </span>
        <span>
          <span style={{ color: "#f87171" }}>{"\u25CF"}</span> {zone.verdict_breakdown.overvalued} overvalued
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Legend                                                              */
/* ------------------------------------------------------------------ */

function Legend({ min, max }: { min: number; max: number }) {
  const stops = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    return priceColor(t);
  });
  const gradient = `linear-gradient(to right, ${stops.join(", ")})`;
  const q1 = min + (max - min) * 0.25;
  const mid = (min + max) / 2;
  const q3 = min + (max - min) * 0.75;

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          fontSize: 10,
          color: "#a1a1aa",
          marginBottom: 8,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Price intensity ({"\u20AC"}/m2)
      </div>
      <div
        style={{
          height: 14,
          borderRadius: 7,
          background: gradient,
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.3)",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500 }}>
          {"\u20AC"}{fmt(min)}
        </span>
        <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500 }}>
          {"\u20AC"}{fmt(q1)}
        </span>
        <span style={{ fontSize: 11, color: "#a1a1aa", fontWeight: 600 }}>
          {"\u20AC"}{fmt(mid)}
        </span>
        <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500 }}>
          {"\u20AC"}{fmt(q3)}
        </span>
        <span style={{ fontSize: 11, color: "#71717a", fontWeight: 500 }}>
          {"\u20AC"}{fmt(max)}
        </span>
      </div>
      {/* Color meaning labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>Cheapest</span>
        <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>Most Expensive</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary row                                                        */
/* ------------------------------------------------------------------ */

function SummaryRow({
  zones,
  cheapest,
  mostExpensive,
  onSelect,
}: {
  zones: ZoneData[];
  cheapest: ZoneData;
  mostExpensive: ZoneData;
  onSelect: (zone: ZoneData) => void;
}) {
  const totalListings = zones.reduce((s, z) => s + z.listing_count, 0);
  const weightedSum = zones.reduce((s, z) => s + z.avg_price_per_m2 * z.listing_count, 0);
  const avgPrice = totalListings > 0 ? weightedSum / totalListings : 0;
  const avgDeviation =
    zones.length > 0
      ? zones.reduce((s, z) => s + z.avg_deviation_pct, 0) / zones.length
      : 0;
  const avgInvestment =
    zones.length > 0
      ? zones.reduce((s, z) => s + z.avg_investment_score, 0) / zones.length
      : 0;

  const cardStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 180,
    borderRadius: 10,
    padding: "14px 16px",
    border: "1px solid #27272a",
    cursor: "default",
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          fontSize: 10,
          color: "#a1a1aa",
          marginBottom: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Market Summary
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {/* Overall average */}
        <div
          style={{
            ...cardStyle,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontSize: 10, color: "#a1a1aa", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Market Average
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fafafa" }}>
            {"\u20AC"}{fmt(avgPrice)}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.6 }}>/m2</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "#71717a" }}>
            <span>Avg dev: <span style={{ color: avgDeviation < 0 ? "#4ade80" : avgDeviation > 0 ? "#f87171" : "#a1a1aa", fontWeight: 600 }}>{avgDeviation > 0 ? "+" : ""}{avgDeviation.toFixed(1)}%</span></span>
            <span>Avg inv: <span style={{ color: avgInvestment >= 7 ? "#4ade80" : avgInvestment >= 5 ? "#fbbf24" : "#f87171", fontWeight: 600 }}>{avgInvestment.toFixed(1)}</span></span>
          </div>
        </div>

        {/* Cheapest zone */}
        <div
          onClick={() => onSelect(cheapest)}
          style={{
            ...cardStyle,
            background: "rgba(34, 197, 94, 0.08)",
            borderColor: "rgba(34, 197, 94, 0.25)",
            cursor: "pointer",
            transition: "background 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "rgba(34, 197, 94, 0.14)";
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "rgba(34, 197, 94, 0.08)";
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          }}
        >
          <div style={{ fontSize: 10, color: "#4ade80", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Cheapest Zone
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fafafa", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cheapest.zone}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80" }}>
            {"\u20AC"}{fmt(cheapest.avg_price_per_m2)}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>/m2</span>
          </div>
        </div>

        {/* Most expensive zone */}
        <div
          onClick={() => onSelect(mostExpensive)}
          style={{
            ...cardStyle,
            background: "rgba(239, 68, 68, 0.08)",
            borderColor: "rgba(239, 68, 68, 0.25)",
            cursor: "pointer",
            transition: "background 0.15s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "rgba(239, 68, 68, 0.14)";
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = "rgba(239, 68, 68, 0.08)";
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          }}
        >
          <div style={{ fontSize: 10, color: "#f87171", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Most Expensive
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fafafa", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {mostExpensive.zone}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#f87171" }}>
            {"\u20AC"}{fmt(mostExpensive.avg_price_per_m2)}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>/m2</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sort button                                                        */
/* ------------------------------------------------------------------ */

function SortButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        background: active ? "#3f3f46" : "transparent",
        color: active ? "#fafafa" : "#a1a1aa",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ZoneHeatmap({ city, zones }: ZoneHeatmapProps) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [cityFilter, setCityFilter] = useState<string>("all");

  // Extract unique cities from zone names
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    zones.forEach((z) => {
      const c = extractCity(z.zone);
      if (c) citySet.add(c);
    });
    return Array.from(citySet).sort();
  }, [zones]);

  const showCityFilter = cities.length > 1;

  const filteredZones = useMemo(() => {
    if (cityFilter === "all" || !showCityFilter) return zones;
    return zones.filter((z) => extractCity(z.zone) === cityFilter);
  }, [zones, cityFilter, showCityFilter]);

  const { sorted, minPrice, maxPrice, maxCount, cheapest, mostExpensive } = useMemo(() => {
    const s = [...filteredZones].sort((a, b) => {
      switch (sortKey) {
        case "price":
          return b.avg_price_per_m2 - a.avg_price_per_m2;
        case "count":
          return b.listing_count - a.listing_count;
        case "deviation":
          return a.avg_deviation_pct - b.avg_deviation_pct; // most undervalued first
        case "investment":
          return b.avg_investment_score - a.avg_investment_score;
        default:
          return 0;
      }
    });
    const prices = filteredZones.map((z) => z.avg_price_per_m2);
    const counts = filteredZones.map((z) => z.listing_count);
    const minP = prices.length > 0 ? Math.min(...prices) : 0;
    const maxP = prices.length > 0 ? Math.max(...prices) : 0;

    const cheap = filteredZones.length > 0
      ? filteredZones.reduce((min, z) => (z.avg_price_per_m2 < min.avg_price_per_m2 ? z : min), filteredZones[0])
      : filteredZones[0];
    const expensive = filteredZones.length > 0
      ? filteredZones.reduce((max, z) => (z.avg_price_per_m2 > max.avg_price_per_m2 ? z : max), filteredZones[0])
      : filteredZones[0];

    return {
      sorted: s,
      minPrice: minP,
      maxPrice: maxP,
      maxCount: counts.length > 0 ? Math.max(...counts) : 1,
      cheapest: cheap,
      mostExpensive: expensive,
    };
  }, [filteredZones, sortKey]);

  const priceRange = maxPrice - minPrice || 1;

  /** Compute min-height proportional to sample count. */
  const cellMinHeight = useCallback(
    (count: number): number => {
      const ratio = count / maxCount;
      // Scale between 80px (few listings) and 130px (most listings)
      return Math.round(80 + ratio * 50);
    },
    [maxCount],
  );

  /** Compute grid span: more listings = larger cell (1 or 2 cols). */
  function colSpan(count: number): number {
    return count / maxCount >= 0.5 ? 2 : 1;
  }

  const handleCellClick = useCallback((zone: ZoneData) => {
    setSelectedZone((prev) => (prev?.zone === zone.zone ? null : zone));
  }, []);

  if (zones.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: "#09090b", // zinc-950
        borderRadius: 12,
        padding: "24px 24px 20px",
        border: "1px solid #27272a", // zinc-800
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "#fafafa",
              lineHeight: 1.3,
            }}
          >
            Zone Heatmap — {city}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#71717a" }}>
            {filteredZones.length} zone{filteredZones.length !== 1 ? "s" : ""} ·{" "}
            {filteredZones.reduce((s, z) => s + z.listing_count, 0)} total listings
            {cityFilter !== "all" && showCityFilter && (
              <span style={{ color: "#a1a1aa" }}> · filtered by {cityFilter}</span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* City filter */}
          {showCityFilter && (
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setSelectedZone(null);
              }}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid #3f3f46",
                borderRadius: 8,
                background: "#18181b",
                color: "#fafafa",
                cursor: "pointer",
                outline: "none",
                appearance: "auto",
              }}
            >
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Sort toggle */}
          <div
            style={{
              display: "inline-flex",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid #3f3f46", // zinc-700
            }}
          >
            <SortButton label="Price" active={sortKey === "price"} onClick={() => setSortKey("price")} />
            <SortButton label="Count" active={sortKey === "count"} onClick={() => setSortKey("count")} />
            <SortButton label="Deviation" active={sortKey === "deviation"} onClick={() => setSortKey("deviation")} />
            <SortButton label="Investment" active={sortKey === "investment"} onClick={() => setSortKey("investment")} />
          </div>
        </div>
      </div>

      {/* Detail panel (shown when a zone is clicked) */}
      {selectedZone && (
        <ZoneDetailPanel
          zone={selectedZone}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {/* Grid heatmap */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gridAutoFlow: "dense",
          gap: 8,
        }}
      >
        {sorted.map((zone) => {
          const t = (zone.avg_price_per_m2 - minPrice) / priceRange;
          const bg = priceColorAlpha(t, 0.85);
          const borderClr = priceColorAlpha(t, 0.5);
          const span = colSpan(zone.listing_count);
          const isHovered = hoveredZone === zone.zone;
          const isSelected = selectedZone?.zone === zone.zone;
          const isCheapest = zone.zone === cheapest?.zone;
          const isMostExpensive = zone.zone === mostExpensive?.zone;
          const { undervalued, fair, overvalued } = zone.verdict_breakdown;

          return (
            <div
              key={zone.zone}
              onMouseEnter={() => setHoveredZone(zone.zone)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => handleCellClick(zone)}
              style={{
                position: "relative",
                gridColumn: `span ${span}`,
                borderRadius: 10,
                padding: "14px 14px 12px",
                background: bg,
                border: isSelected
                  ? "2px solid #fafafa"
                  : isCheapest
                    ? "2px solid rgba(34, 197, 94, 0.5)"
                    : isMostExpensive
                      ? "2px solid rgba(239, 68, 68, 0.5)"
                      : `1px solid ${borderClr}`,
                cursor: "pointer",
                transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
                transform: isHovered ? "scale(1.03)" : "scale(1)",
                boxShadow: isHovered
                  ? `0 0 0 1px rgba(250,250,250,0.3), 0 8px 24px rgba(0,0,0,0.4)`
                  : isSelected
                    ? `0 0 0 1px #fafafa, 0 4px 16px rgba(0,0,0,0.3)`
                    : "none",
                minHeight: cellMinHeight(zone.listing_count),
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Cheapest / Most Expensive badge */}
              {(isCheapest || isMostExpensive) && (
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    right: 8,
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "2px 8px 3px",
                    borderRadius: "0 0 6px 6px",
                    background: isCheapest ? "#22c55e" : "#ef4444",
                    color: isCheapest ? "#052e16" : "#450a0a",
                  }}
                >
                  {isCheapest ? "Cheapest" : "Top Price"}
                </div>
              )}

              {/* Zone name */}
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#fafafa",
                  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  marginBottom: 4,
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {zone.zone}
              </div>

              {/* Avg price */}
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#fff",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  lineHeight: 1.2,
                }}
              >
                {"\u20AC"}{fmt(zone.avg_price_per_m2)}
                <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>/m2</span>
              </div>

              {/* Deviation indicator */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color:
                    zone.avg_deviation_pct < -5
                      ? "#bbf7d0"
                      : zone.avg_deviation_pct > 5
                        ? "#fecaca"
                        : "rgba(255,255,255,0.7)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  marginTop: 2,
                }}
              >
                {zone.avg_deviation_pct > 0 ? "+" : ""}
                {zone.avg_deviation_pct.toFixed(1)}% dev
              </div>

              {/* Bottom row: listing count badge + mini verdict dots */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                {/* Listing count badge */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    background: "rgba(0,0,0,0.35)",
                    borderRadius: 10,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  {zone.listing_count}
                  <span style={{ fontWeight: 400, opacity: 0.7 }}>
                    listing{zone.listing_count !== 1 ? "s" : ""}
                  </span>
                </span>

                {/* Mini verdict dots */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {undervalued > 0 && (
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "rgba(255,255,255,0.85)" }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#4ade80",
                          display: "inline-block",
                          boxShadow: "0 0 3px rgba(74,222,128,0.5)",
                        }}
                      />
                      {undervalued}
                    </span>
                  )}
                  {fair > 0 && (
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "rgba(255,255,255,0.85)" }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#facc15",
                          display: "inline-block",
                          boxShadow: "0 0 3px rgba(250,204,21,0.5)",
                        }}
                      />
                      {fair}
                    </span>
                  )}
                  {overvalued > 0 && (
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 10, color: "rgba(255,255,255,0.85)" }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#f87171",
                          display: "inline-block",
                          boxShadow: "0 0 3px rgba(248,113,113,0.5)",
                        }}
                      />
                      {overvalued}
                    </span>
                  )}
                </div>
              </div>

              {/* Tooltip (absolute, shown on hover) */}
              {isHovered && !isSelected && (
                <Tooltip
                  zone={zone}
                  style={{
                    top: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <Legend min={minPrice} max={maxPrice} />

      {/* Summary row */}
      {filteredZones.length > 0 && cheapest && mostExpensive && (
        <SummaryRow
          zones={filteredZones}
          cheapest={cheapest}
          mostExpensive={mostExpensive}
          onSelect={(z) => setSelectedZone((prev) => (prev?.zone === z.zone ? null : z))}
        />
      )}
    </div>
  );
}

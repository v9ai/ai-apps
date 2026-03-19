"use client";

import {
  BOROUGHS,
  TIER_LABEL,
  TIER_COLOR,
  fmt,
  fmtK,
  fmtGBP,
  type Borough,
} from "@/lib/london-data";

const TIER_ORDER = [
  "prime",
  "inner_premium",
  "inner",
  "outer",
  "outer_affordable",
] as const;

type Tier = (typeof TIER_ORDER)[number];

/* ── trend helpers ───────────────────────────────────────────────────────── */

function trendColor(trend: Borough["trend"]) {
  if (trend === "rising") return "#22c55e";
  if (trend === "stable") return "#3b82f6";
  return "#ef4444";
}

function trendLabel(trend: Borough["trend"]) {
  if (trend === "rising") return "Rising";
  if (trend === "stable") return "Stable";
  return "Declining";
}

/* ── per-tier stats ──────────────────────────────────────────────────────── */

interface TierStats {
  tier: Tier;
  boroughs: Borough[];
  minPM2: number;
  maxPM2: number;
  avgPM2: number;
  avgPrice: number;
  avgYield: number;
  avgGrowth: number;
  trendCounts: Record<Borough["trend"], number>;
  topPerformer: Borough;
}

function computeTierStats(): TierStats[] {
  return TIER_ORDER.map((tier) => {
    const boroughs = BOROUGHS.filter((b) => b.tier === tier).sort(
      (a, b) => b.avgPricePerM2 - a.avgPricePerM2,
    );

    const prices = boroughs.map((b) => b.avgPricePerM2);
    const minPM2 = Math.min(...prices);
    const maxPM2 = Math.max(...prices);

    const totalPM2 = boroughs.reduce((s, b) => s + b.avgPricePerM2, 0);
    const avgPM2 = Math.round(totalPM2 / boroughs.length);

    const totalPrice = boroughs.reduce((s, b) => s + b.avgPrice, 0);
    const avgPrice = Math.round(totalPrice / boroughs.length);

    const avgYield =
      boroughs.reduce((s, b) => s + (b.yieldLow + b.yieldHigh) / 2, 0) /
      boroughs.length;

    const avgGrowth =
      boroughs.reduce((s, b) => s + b.growth1y, 0) / boroughs.length;

    const trendCounts: Record<Borough["trend"], number> = {
      rising: 0,
      stable: 0,
      declining: 0,
    };
    for (const b of boroughs) trendCounts[b.trend]++;

    const topPerformer = boroughs.reduce((top, b) =>
      b.growth1y > top.growth1y ? b : top,
    );

    return {
      tier,
      boroughs,
      minPM2,
      maxPM2,
      avgPM2,
      avgPrice,
      avgYield,
      avgGrowth,
      trendCounts,
      topPerformer,
    };
  });
}

/* ── mini bar chart (pure SVG) ───────────────────────────────────────────── */

function MiniBarChart({ boroughs }: { boroughs: Borough[] }) {
  const maxPM2 = Math.max(...boroughs.map((b) => b.avgPricePerM2));
  const barW = 18;
  const gap = 3;
  const maxH = 50;
  const labelH = 18;
  const svgW = boroughs.length * (barW + gap) - gap;
  const svgH = maxH + labelH;

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="mt-1"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      {boroughs.map((b, i) => {
        const h = Math.max(4, (b.avgPricePerM2 / maxPM2) * maxH);
        const x = i * (barW + gap);
        const y = maxH - h;
        const label = b.name.slice(0, 3).toUpperCase();

        return (
          <g key={b.name}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
              fill={trendColor(b.trend)}
              opacity={0.85}
            />
            <title>
              {b.name}: {fmtGBP(b.avgPricePerM2)}/m² ({b.growth1y > 0 ? "+" : ""}
              {b.growth1y}%)
            </title>
            <text
              x={x + barW / 2}
              y={maxH + 12}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={8}
              fontFamily="monospace"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── price range bar ─────────────────────────────────────────────────────── */

function PriceRangeBar({
  min,
  max,
  avg,
  color,
}: {
  min: number;
  max: number;
  avg: number;
  color: string;
}) {
  const range = max - min || 1;
  const avgPct = ((avg - min) / range) * 100;

  return (
    <div className="relative mt-1 mb-2">
      <div className="flex justify-between mb-0.5" style={{ fontSize: 10 }}>
        <span className="text-slate-500">{fmtGBP(min)}</span>
        <span className="text-slate-500">{fmtGBP(max)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: "100%", backgroundColor: color, opacity: 0.2 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2"
          style={{
            left: `clamp(4px, ${avgPct}%, calc(100% - 8px))`,
            borderColor: color,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}66`,
          }}
          title={`Avg: ${fmtGBP(avg)}/m²`}
        />
      </div>
      <div
        className="text-center mt-0.5"
        style={{ fontSize: 10, color: color }}
      >
        avg {fmtGBP(avg)}/m²
      </div>
    </div>
  );
}

/* ── trend pills ─────────────────────────────────────────────────────────── */

function TrendPills({
  counts,
}: {
  counts: Record<Borough["trend"], number>;
}) {
  const items: { trend: Borough["trend"]; count: number }[] = [
    { trend: "rising", count: counts.rising },
    { trend: "stable", count: counts.stable },
    { trend: "declining", count: counts.declining },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mt-1" style={{ fontSize: 11 }}>
      {items
        .filter((i) => i.count > 0)
        .map((i) => (
          <span
            key={i.trend}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: `${trendColor(i.trend)}18`,
              color: trendColor(i.trend),
            }}
          >
            {i.count} {trendLabel(i.trend)}
          </span>
        ))}
    </div>
  );
}

/* ── single tier card ────────────────────────────────────────────────────── */

function TierCard({ stats }: { stats: TierStats }) {
  const color = TIER_COLOR[stats.tier];
  const label = TIER_LABEL[stats.tier];

  return (
    <div
      className="rounded-lg p-3 transition-all duration-200 hover:scale-[1.01]"
      style={{
        backgroundColor: `${color}0a`,
        borderLeft: `3px solid ${color}`,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderRight: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget.style.borderLeftColor = color);
        e.currentTarget.style.boxShadow = `0 0 12px ${color}22`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget.style.borderLeftColor = color);
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-white" style={{ fontSize: 13 }}>
            {label}
          </span>
        </div>
        <span className="text-slate-500" style={{ fontSize: 11 }}>
          {stats.boroughs.length} boroughs
        </span>
      </div>

      {/* Price range bar */}
      <PriceRangeBar
        min={stats.minPM2}
        max={stats.maxPM2}
        avg={stats.avgPM2}
        color={color}
      />

      {/* Key stats grid */}
      <div
        className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2"
        style={{ fontSize: 11 }}
      >
        <div className="text-slate-500">
          Avg/m²{" "}
          <span className="text-slate-300 font-medium">
            {fmtGBP(stats.avgPM2)}
          </span>
        </div>
        <div className="text-slate-500">
          Avg price{" "}
          <span className="text-slate-300 font-medium">
            {fmtK(stats.avgPrice)}
          </span>
        </div>
        <div className="text-slate-500">
          Avg yield{" "}
          <span className="text-slate-300 font-medium">
            {stats.avgYield.toFixed(1)}%
          </span>
        </div>
        <div className="text-slate-500">
          Avg growth{" "}
          <span
            className="font-medium"
            style={{
              color: stats.avgGrowth > 0 ? "#22c55e" : "#ef4444",
            }}
          >
            {stats.avgGrowth > 0 ? "+" : ""}
            {stats.avgGrowth.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="mb-2 overflow-x-auto">
        <MiniBarChart boroughs={stats.boroughs} />
      </div>

      {/* Trend distribution */}
      <TrendPills counts={stats.trendCounts} />

      {/* Top performer */}
      <div
        className="mt-2 flex items-center gap-1.5 rounded px-2 py-1"
        style={{
          backgroundColor: "rgba(34,197,94,0.08)",
          fontSize: 11,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9.5L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" fill="#22c55e" />
        </svg>
        <span className="text-slate-400">Top:</span>
        <span className="text-green-400 font-medium truncate">
          {stats.topPerformer.name}
        </span>
        <span className="text-green-500 ml-auto whitespace-nowrap">
          +{stats.topPerformer.growth1y}%
        </span>
      </div>
    </div>
  );
}

/* ── main export ─────────────────────────────────────────────────────────── */

export function TierSummary() {
  const tierStats = computeTierStats();

  return (
    <section>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {tierStats.map((stats) => (
          <TierCard key={stats.tier} stats={stats} />
        ))}
      </div>
    </section>
  );
}

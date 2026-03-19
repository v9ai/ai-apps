"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as BarTooltip,
  Legend,
  ErrorBar,
} from "recharts";
import { BOROUGHS, RENTAL_DATA, TIER_COLOR, TIER_LABEL, fmt, type Borough } from "@/lib/london-data";

const PALETTE = ["#8b5cf6", "#22c55e", "#f59e0b", "#3b82f6"];

const DIMENSION_LABELS = [
  "Price Affordability",
  "Growth",
  "Yield",
  "Value",
  "Momentum",
] as const;

const DEFAULT_SELECTION = ["Hackney", "Greenwich", "Tower Hamlets", "Newham"];

/* ── Precompute global max values for normalization ──────────────────── */
const maxPricePerM2 = Math.max(...BOROUGHS.map((b) => b.avgPricePerM2));
const maxGrowth = Math.max(...BOROUGHS.map((b) => b.growth1y));
const maxYield = Math.max(...BOROUGHS.map((b) => (b.yieldLow + b.yieldHigh) / 2));
const maxAvgPrice = Math.max(...BOROUGHS.map((b) => b.avgPrice));

function scoreMomentum(trend: Borough["trend"]): number {
  if (trend === "rising") return 10;
  if (trend === "stable") return 6;
  return 3; // declining
}

function computeScores(b: Borough) {
  return {
    "Price Affordability": Math.round((10 - (b.avgPricePerM2 / maxPricePerM2) * 10) * 10) / 10,
    Growth: Math.round(((b.growth1y / maxGrowth) * 10) * 10) / 10,
    Yield: Math.round((((b.yieldLow + b.yieldHigh) / 2 / maxYield) * 10) * 10) / 10,
    Value: Math.round((10 - (b.avgPrice / maxAvgPrice) * 10) * 10) / 10,
    Momentum: scoreMomentum(b.trend),
  };
}

/* ── Shared tooltip container style ────────────────────────────────── */
const tooltipBoxStyle: CSSProperties = {
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  backgroundColor: "#18181b",
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: 8,
  paddingBottom: 8,
  fontSize: 12,
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3)",
};

const tooltipTitleStyle: CSSProperties = {
  marginBottom: 4,
  fontWeight: 600,
  color: "#d4d4d8",
};

/* ── Custom Radar Tooltip ────────────────────────────────────────────── */
function RadarTooltipContent({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={tooltipBoxStyle}>
      <p style={tooltipTitleStyle}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

/* ── Custom Bar Tooltip ──────────────────────────────────────────────── */
function RentalTooltipContent({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={tooltipBoxStyle}>
      <p style={tooltipTitleStyle}>{label}</p>
      {payload.map((entry: any) => {
        const item = entry.payload;
        const isOneBr = entry.dataKey === "r1Mid";
        const low = isOneBr ? item.r1Low : item.r2Low;
        const high = isOneBr ? item.r1High : item.r2High;
        return (
          <p key={entry.dataKey} style={{ color: entry.fill }}>
            {entry.name}: {"\u00A3"}{fmt(Math.round(entry.value))}/mo
            <span style={{ marginLeft: 4, color: "#71717a" }}>
              ({"\u00A3"}{fmt(low)} - {"\u00A3"}{fmt(high)})
            </span>
          </p>
        );
      })}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────── */
export function InvestmentRadar() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);

  const toggle = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, name];
    });
  };

  /* Radar chart data: one entry per dimension */
  const radarData = useMemo(() => {
    const selectedBoroughs = BOROUGHS.filter((b) => selected.includes(b.name));
    return DIMENSION_LABELS.map((dim) => {
      const entry: Record<string, string | number> = { dimension: dim };
      selectedBoroughs.forEach((b) => {
        const scores = computeScores(b);
        entry[b.name] = scores[dim];
      });
      return entry;
    });
  }, [selected]);

  /* Rental bar chart data */
  const rentalData = useMemo(() => {
    return RENTAL_DATA.map((r) => ({
      area: r.area,
      r1Mid: (r.r1Low + r.r1High) / 2,
      r2Mid: (r.r2Low + r.r2High) / 2,
      r1Low: r.r1Low,
      r1High: r.r1High,
      r2Low: r.r2Low,
      r2High: r.r2High,
      r1Err: [(r.r1Low + r.r1High) / 2 - r.r1Low, r.r1High - (r.r1Low + r.r1High) / 2],
      r2Err: [(r.r2Low + r.r2High) / 2 - r.r2Low, r.r2High - (r.r2Low + r.r2High) / 2],
    }));
  }, []);

  const selectedBoroughs = BOROUGHS.filter((b) => selected.includes(b.name));

  const sectionStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 32,
  };

  const cardStyle: CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.05)",
    backgroundColor: "rgba(24,24,27,0.6)",
    padding: 24,
  };

  const headingStyle: CSSProperties = {
    marginBottom: 4,
    fontSize: 18,
    fontWeight: 600,
    color: "#f4f4f5",
  };

  const subtextStyle: CSSProperties = {
    marginBottom: 16,
    fontSize: 14,
    color: "#a1a1aa",
  };

  const pillContainerStyle: CSSProperties = {
    marginBottom: 24,
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  };

  const pillBaseStyle: CSSProperties = {
    borderRadius: 9999,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 4,
    paddingBottom: 4,
    fontSize: 12,
    fontWeight: 500,
    border: "none",
    transition: "all 0.15s ease",
  };

  return (
    <section style={sectionStyle}>
      {/* ── Borough Comparison Radar ─────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={headingStyle}>
          Borough Investment Radar
        </h3>
        <p style={subtextStyle}>
          Select up to 4 boroughs to compare across 5 investment dimensions (all normalized 0-10).
        </p>

        {/* Pill selector */}
        <div style={pillContainerStyle}>
          {BOROUGHS.map((b) => {
            const isSelected = selected.includes(b.name);
            const idx = selected.indexOf(b.name);
            const pillColor = isSelected ? PALETTE[idx] : undefined;
            const disabled = !isSelected && selected.length >= 4;

            const pillStyle: CSSProperties = isSelected
              ? {
                  ...pillBaseStyle,
                  backgroundColor: pillColor,
                  color: "#ffffff",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)",
                  cursor: "pointer",
                }
              : {
                  ...pillBaseStyle,
                  border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "#27272a",
                  color: "#a1a1aa",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.4 : 1,
                };

            return (
              <button
                key={b.name}
                onClick={() => toggle(b.name)}
                style={pillStyle}
                disabled={disabled}
              >
                {b.name}
              </button>
            );
          })}
        </div>

        {/* Radar Chart */}
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 10]}
              tick={{ fill: "#71717a", fontSize: 10 }}
              tickCount={6}
              stroke="#3f3f46"
            />
            {selectedBoroughs.map((b) => {
              const idx = selected.indexOf(b.name);
              return (
                <Radar
                  key={b.name}
                  name={b.name}
                  dataKey={b.name}
                  stroke={PALETTE[idx]}
                  fill={PALETTE[idx]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              );
            })}
            <RechartsTooltip content={<RadarTooltipContent />} />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12, color: "#d4d4d8" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Rental Comparison Bar Chart ──────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={headingStyle}>
          Rental Comparison by Area
        </h3>
        <p style={subtextStyle}>
          Monthly rent midpoints with low-high range indicators.
        </p>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={rentalData}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="area"
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              angle={-30}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickFormatter={(v: number) => `\u00A3${fmt(v)}`}
              label={{
                value: "\u00A3/month",
                angle: -90,
                position: "insideLeft",
                fill: "#71717a",
                fontSize: 11,
                offset: -5,
              }}
            />
            <BarTooltip content={<RentalTooltipContent />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#d4d4d8" }}
            />
            <Bar dataKey="r1Mid" name="1 Bedroom" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
              <ErrorBar dataKey="r1Err" width={4} strokeWidth={1.5} stroke="#8b5cf6" />
            </Bar>
            <Bar dataKey="r2Mid" name="2 Bedroom" fill="#14b8a6" radius={[4, 4, 0, 0]}>
              <ErrorBar dataKey="r2Err" width={4} strokeWidth={1.5} stroke="#14b8a6" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

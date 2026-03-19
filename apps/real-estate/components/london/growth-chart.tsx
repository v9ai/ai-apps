"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { BOROUGHS, GROWTH_FORECASTS, TIER_COLOR, fmt } from "@/lib/london-data";

/* ── trend → bar colour ───────────────────────────────────────────────── */
const TREND_COLOR: Record<string, string> = {
  rising: "#22c55e",
  stable: "#3b82f6",
  declining: "#ef4444",
};

/* ── Borough growth data, sorted descending ───────────────────────────── */
const growthData = [...BOROUGHS]
  .sort((a, b) => b.growth1y - a.growth1y)
  .map((b) => ({
    name: b.name,
    growth: b.growth1y,
    trend: b.trend,
    tier: b.tier,
  }));

/* ── Forecast range data ──────────────────────────────────────────────── */
const forecastData = GROWTH_FORECASTS.map((f) => ({
  area: f.area,
  low: f.low,
  range: f.high - f.low,
  high: f.high,
  source: f.source,
}));

/* ── Custom tooltip for borough chart ─────────────────────────────────── */
function GrowthTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: (typeof growthData)[number] }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#1c1c1e",
        border: "1px solid #333",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, color: "#e5e5e5", margin: 0 }}>{d.name}</p>
      <p style={{ color: TREND_COLOR[d.trend], margin: "4px 0 0" }}>
        {d.growth > 0 ? "+" : ""}
        {d.growth}% &middot;{" "}
        <span style={{ textTransform: "capitalize" }}>{d.trend}</span>
      </p>
    </div>
  );
}

/* ── Custom tooltip for forecast chart ────────────────────────────────── */
function ForecastTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: (typeof forecastData)[number] }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#1c1c1e",
        border: "1px solid #333",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, color: "#e5e5e5", margin: 0 }}>{d.area}</p>
      <p style={{ color: "#14b8a6", margin: "4px 0 0" }}>
        {d.low}% &ndash; {d.high}%
      </p>
      <p style={{ color: "#888", margin: "2px 0 0", fontSize: 11 }}>
        {d.source}
      </p>
    </div>
  );
}

/* ── Section wrapper ──────────────────────────────────────────────────── */
const heading: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "var(--gray-12)",
  marginBottom: 16,
};

const card: React.CSSProperties = {
  background: "var(--gray-2, #1c1c1e)",
  border: "1px solid var(--gray-4, #2a2a2c)",
  borderRadius: 12,
  padding: "20px 16px",
  marginBottom: 24,
};

/* ── Component ────────────────────────────────────────────────────────── */
export function GrowthChart() {
  return (
    <div>
      {/* ─── Borough Growth 1-Year ─────────────────────────────────── */}
      <div style={card}>
        <h3 style={heading}>Borough Price Growth (1-Year %)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={growthData}
            margin={{ top: 8, right: 12, bottom: 60, left: 4 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#888" }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#888" }}
              tickFormatter={(v: number) => `${v}%`}
              width={44}
            />
            <Tooltip
              content={<GrowthTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="growth" radius={[3, 3, 0, 0]} maxBarSize={22}>
              {growthData.map((d, i) => (
                <Cell key={i} fill={TREND_COLOR[d.trend]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 16,
            justifyContent: "center",
            marginTop: 8,
            fontSize: 12,
            color: "#888",
          }}
        >
          {Object.entries(TREND_COLOR).map(([label, color]) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: color,
                  display: "inline-block",
                }}
              />
              <span style={{ textTransform: "capitalize" }}>{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── Forecast Range Chart ──────────────────────────────────── */}
      <div style={card}>
        <h3 style={heading}>Growth Forecasts 2025-2026 (Low &ndash; High %)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={forecastData}
            layout="vertical"
            margin={{ top: 4, right: 40, bottom: 4, left: 160 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#888" }}
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, "dataMax + 1"]}
            />
            <YAxis
              type="category"
              dataKey="area"
              tick={{ fontSize: 12, fill: "#ccc" }}
              width={150}
            />
            <Tooltip
              content={<ForecastTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            {/* Invisible base bar from 0 to low */}
            <Bar
              dataKey="low"
              stackId="range"
              fill="transparent"
              radius={0}
              maxBarSize={20}
            />
            {/* Visible range bar from low to high */}
            <Bar
              dataKey="range"
              stackId="range"
              fill="#14b8a6"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Source labels */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 20px",
            marginTop: 12,
            fontSize: 11,
            color: "#666",
          }}
        >
          {forecastData.map((d) => (
            <span key={d.area}>
              {d.area}: <span style={{ color: "#888" }}>{d.source}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

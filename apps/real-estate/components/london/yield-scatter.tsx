"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Label,
} from "recharts";
import {
  BOROUGHS,
  TIER_COLOR,
  TIER_LABEL,
  fmtK,
  type Borough,
} from "@/lib/london-data";

/* ── scatter point shape ─────────────────────────────────────────────────── */

type ScatterPoint = {
  x: number;
  y: number;
  z: number;
  name: string;
  tier: Borough["tier"];
  yieldLow: number;
  yieldHigh: number;
  avgPrice: number;
  growth1y: number;
};

/* ── data transform ──────────────────────────────────────────────────────── */

const TIERS = [
  "prime",
  "inner_premium",
  "inner",
  "outer",
  "outer_affordable",
] as const;

function buildScatterData(): Record<string, ScatterPoint[]> {
  const maxPrice = Math.max(...BOROUGHS.map((b) => b.avgPrice));
  const minPrice = Math.min(...BOROUGHS.map((b) => b.avgPrice));
  const range = maxPrice - minPrice || 1;

  const grouped: Record<string, ScatterPoint[]> = {};

  for (const tier of TIERS) {
    grouped[tier] = BOROUGHS.filter((b) => b.tier === tier).map((b) => ({
      x: b.growth1y,
      y: +((b.yieldLow + b.yieldHigh) / 2).toFixed(2),
      z: ((b.avgPrice - minPrice) / range) * 340 + 60, // normalized into [60, 400]
      name: b.name,
      tier: b.tier,
      yieldLow: b.yieldLow,
      yieldHigh: b.yieldHigh,
      avgPrice: b.avgPrice,
      growth1y: b.growth1y,
    }));
  }

  return grouped;
}

function medianOf(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/* ── custom tooltip ──────────────────────────────────────────────────────── */

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: 210,
      }}
    >
      <p
        style={{
          margin: 0,
          fontWeight: 600,
          fontSize: 14,
          color: "var(--gray-12)",
        }}
      >
        {d.name}
      </p>
      <div
        style={{
          marginTop: 6,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          fontSize: 13,
          color: "var(--gray-9)",
        }}
      >
        <span>
          Growth: {d.growth1y > 0 ? "+" : ""}
          {d.growth1y.toFixed(1)}%
        </span>
        <span>
          Yield: {d.yieldLow.toFixed(1)}&ndash;{d.yieldHigh.toFixed(1)}%
        </span>
        <span>Avg price: {fmtK(d.avgPrice)}</span>
        <span
          style={{
            marginTop: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: TIER_COLOR[d.tier],
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12 }}>{TIER_LABEL[d.tier]}</span>
        </span>
      </div>
    </div>
  );
}

/* ── quadrant labels ─────────────────────────────────────────────────────── */

const QUADRANT_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  pointerEvents: "none",
};

function QuadrantLabels({
  medGrowth,
  medYield,
}: {
  medGrowth: number;
  medYield: number;
}) {
  return (
    <g>
      {/* Top-right: High Yield + High Growth */}
      <text
        x="95%"
        y="8%"
        textAnchor="end"
        style={QUADRANT_STYLE}
        fill="#22c55e"
      >
        High Yield + High Growth
      </text>
      {/* Top-left: High Yield + Low Growth */}
      <text
        x="5%"
        y="8%"
        textAnchor="start"
        style={QUADRANT_STYLE}
        fill="#f59e0b"
      >
        High Yield + Low Growth
      </text>
      {/* Bottom-right: Low Yield + High Growth */}
      <text
        x="95%"
        y="96%"
        textAnchor="end"
        style={QUADRANT_STYLE}
        fill="#14b8a6"
      >
        Low Yield + High Growth
      </text>
      {/* Bottom-left: Low Yield + Low Growth */}
      <text
        x="5%"
        y="96%"
        textAnchor="start"
        style={QUADRANT_STYLE}
        fill="#ef4444"
      >
        Low Yield + Low Growth
      </text>
    </g>
  );
}

/* ── legend formatter ────────────────────────────────────────────────────── */

function renderLegend(props: any) {
  const { payload } = props;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 16,
        flexWrap: "wrap",
        paddingTop: 8,
      }}
    >
      {payload?.map((entry: any) => (
        <span
          key={entry.value}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--gray-9)",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: entry.color,
              flexShrink: 0,
            }}
          />
          {entry.value}
        </span>
      ))}
    </div>
  );
}

/* ── component ───────────────────────────────────────────────────────────── */

export function YieldScatter() {
  const grouped = buildScatterData();

  const allGrowths = BOROUGHS.map((b) => b.growth1y);
  const allYields = BOROUGHS.map((b) => (b.yieldLow + b.yieldHigh) / 2);

  const medGrowth = +medianOf(allGrowths).toFixed(2);
  const medYield = +medianOf(allYields).toFixed(2);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "16px 8px 8px 0",
      }}
    >
      <ResponsiveContainer width="100%" height={450}>
        <ScatterChart margin={{ top: 24, right: 32, bottom: 16, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
          />

          <XAxis
            type="number"
            dataKey="x"
            name="Growth"
            unit="%"
            tick={{ fill: "var(--gray-9)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          >
            <Label
              value="Annual Growth (%)"
              position="insideBottom"
              offset={-8}
              style={{ fill: "var(--gray-9)", fontSize: 12 }}
            />
          </XAxis>

          <YAxis
            type="number"
            dataKey="y"
            name="Yield"
            unit="%"
            tick={{ fill: "var(--gray-9)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickLine={false}
          >
            <Label
              value="Avg Gross Yield (%)"
              angle={-90}
              position="insideLeft"
              offset={10}
              style={{ fill: "var(--gray-9)", fontSize: 12, textAnchor: "middle" }}
            />
          </YAxis>

          <ZAxis type="number" dataKey="z" range={[60, 400]} />

          {/* Quadrant reference lines */}
          <ReferenceLine
            x={medGrowth}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="4 4"
          />
          <ReferenceLine
            y={medYield}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="4 4"
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.1)" }}
          />

          <Legend content={renderLegend} />

          {/* One Scatter series per tier */}
          {TIERS.map((tier) => (
            <Scatter
              key={tier}
              name={TIER_LABEL[tier]}
              data={grouped[tier]}
              fill={TIER_COLOR[tier]}
              fillOpacity={0.85}
            />
          ))}

          {/* Quadrant labels drawn on top */}
          <QuadrantLabels medGrowth={medGrowth} medYield={medYield} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

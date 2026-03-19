"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BOROUGHS, TIER_LABEL, TIER_COLOR, fmt, type Borough } from "@/lib/london-data";

const TIER_ORDER = [
  "prime",
  "inner_premium",
  "inner",
  "outer",
  "outer_affordable",
] as const;

function groupByTier() {
  const groups: Record<string, Borough[]> = {};
  for (const tier of TIER_ORDER) {
    groups[tier] = BOROUGHS.filter((b) => b.tier === tier).sort(
      (a, b) => b.avgPricePerM2 - a.avgPricePerM2,
    );
  }
  return groups;
}

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

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Borough }>;
}) {
  if (!active || !payload?.length) return null;
  const b = payload[0].payload;

  const avgPriceDisplay =
    b.avgPrice >= 1_000_000
      ? `\u00A3${(b.avgPrice / 1_000_000).toFixed(1)}M`
      : `\u00A3${Math.round(b.avgPrice / 1000)}K`;

  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: 200,
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
        {b.name}
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
        <span>\u00A3{fmt(b.avgPricePerM2)}/m\u00B2</span>
        <span>{avgPriceDisplay} avg property price</span>
        <span>
          {b.yieldLow.toFixed(1)}&ndash;{b.yieldHigh.toFixed(1)}% yield
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 2,
          }}
        >
          <span
            style={{
              background: trendColor(b.trend),
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "1px 8px",
              borderRadius: 9999,
              lineHeight: "18px",
            }}
          >
            {trendLabel(b.trend)}
          </span>
          <span style={{ fontSize: 12, color: "var(--gray-9)" }}>
            {b.growth1y > 0 ? "+" : ""}
            {b.growth1y.toFixed(1)}% YoY
          </span>
        </span>
      </div>
    </div>
  );
}

export function BoroughBarChart() {
  const grouped = groupByTier();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {TIER_ORDER.map((tier) => {
        const boroughs = grouped[tier];
        if (!boroughs.length) return null;
        const chartHeight = boroughs.length * 36 + 40;

        return (
          <section key={tier}>
            <h3
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 15,
                fontWeight: 600,
                color: "var(--gray-12)",
                margin: "0 0 12px 0",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: TIER_COLOR[tier],
                  flexShrink: 0,
                }}
              />
              {TIER_LABEL[tier]}
            </h3>

            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "12px 8px 4px 0",
              }}
            >
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={boroughs}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) =>
                      `\u00A3${fmt(v)}`
                    }
                    tick={{ fill: "var(--gray-9)", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ fill: "var(--gray-12)", fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="avgPricePerM2" radius={[0, 4, 4, 0]} barSize={22}>
                    {boroughs.map((b) => (
                      <Cell key={b.name} fill={TIER_COLOR[tier]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        );
      })}
    </div>
  );
}

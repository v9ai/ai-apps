"use client";

import { useState } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import {
  BOROUGHS,
  TIER_COLOR,
  TIER_LABEL,
  fmt,
  type Borough,
} from "@/lib/london-data";

/* ── types ─────────────────────────────────────────────────────────────────── */

type SizeMetric = "price" | "yield" | "growth";

type TreemapLeaf = Borough & {
  name: string;
  size: number;
  fill: string;
};

type TreemapGroup = {
  name: string;
  children: TreemapLeaf[];
};

/* ── metric helpers ────────────────────────────────────────────────────────── */

const METRIC_OPTIONS: { key: SizeMetric; label: string }[] = [
  { key: "price", label: "Avg Price" },
  { key: "yield", label: "Yield" },
  { key: "growth", label: "Growth" },
];

function sizeFor(b: Borough, metric: SizeMetric): number {
  switch (metric) {
    case "price":
      return b.avgPrice;
    case "yield":
      return (b.yieldLow + b.yieldHigh) / 2;
    case "growth":
      return Math.max(0.5, b.growth1y);
  }
}

function metricDisplay(b: Borough, metric: SizeMetric): string {
  switch (metric) {
    case "price":
      return `\u00A3${fmt(b.avgPricePerM2)}/m\u00B2`;
    case "yield":
      return `${((b.yieldLow + b.yieldHigh) / 2).toFixed(1)}%`;
    case "growth":
      return `${b.growth1y > 0 ? "+" : ""}${b.growth1y.toFixed(1)}%`;
  }
}

/* ── build hierarchy ───────────────────────────────────────────────────────── */

const TIERS = [
  "prime",
  "inner_premium",
  "inner",
  "outer",
  "outer_affordable",
] as const;

function buildTreeData(metric: SizeMetric): TreemapGroup[] {
  return TIERS.map((tier) => ({
    name: TIER_LABEL[tier],
    children: BOROUGHS.filter((b) => b.tier === tier).map((b) => ({
      ...b,
      size: sizeFor(b, metric),
      fill: TIER_COLOR[tier],
    })),
  }));
}

/* ── custom content renderer ───────────────────────────────────────────────── */

function CustomCell(props: any) {
  const { x, y, width, height, name, fill, root } = props;

  // Skip tier group nodes (they have children) — only render leaves
  if (root?.children && props.depth < 2) return null;
  if (width < 4 || height < 4) return null;

  const fontSize = Math.min(
    14,
    Math.max(9, Math.min(width / 10, height / 5)),
  );
  const showLabel = width > 40 && height > 28;
  const showMetric = width > 60 && height > 42;

  // Find the borough to get the metric display
  const borough = BOROUGHS.find((b) => b.name === name);
  const metric =
    (props as any).__metric ?? "price"; // fallback
  const metricText = borough ? metricDisplay(borough, metric) : "";

  // Truncate name if cell is too small
  const maxChars = Math.max(3, Math.floor(width / (fontSize * 0.6)));
  const displayName =
    name && name.length > maxChars
      ? name.slice(0, maxChars - 1) + "\u2026"
      : name;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        fill={fill}
        fillOpacity={0.8}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={1}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showMetric ? fontSize * 0.5 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontSize={fontSize}
          fontWeight={600}
          style={{
            textShadow: "0 1px 3px rgba(0,0,0,0.6)",
            pointerEvents: "none",
          }}
        >
          {displayName}
        </text>
      )}
      {showMetric && (
        <text
          x={x + width / 2}
          y={y + height / 2 + fontSize * 0.9}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.85)"
          fontSize={Math.max(8, fontSize - 2)}
          fontWeight={400}
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {metricText}
        </text>
      )}
    </g>
  );
}

/* ── custom tooltip ────────────────────────────────────────────────────────── */

const TREND_ICON: Record<string, string> = {
  rising: "\u2191",
  stable: "\u2192",
  declining: "\u2193",
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: any[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d?.tier) return null;

  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "10px 14px",
        minWidth: 220,
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

      {/* tier badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginTop: 6,
          fontSize: 12,
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
        <span style={{ color: TIER_COLOR[d.tier], fontWeight: 500 }}>
          {TIER_LABEL[d.tier]}
        </span>
      </span>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          fontSize: 13,
          color: "var(--gray-9)",
        }}
      >
        <span>
          Price/m\u00B2:{" "}
          <span style={{ color: "var(--gray-12)" }}>
            \u00A3{fmt(d.avgPricePerM2)}
          </span>
        </span>
        <span>
          Avg price:{" "}
          <span style={{ color: "var(--gray-12)" }}>
            \u00A3{fmt(d.avgPrice)}
          </span>
        </span>
        <span>
          Yield:{" "}
          <span style={{ color: "var(--gray-12)" }}>
            {d.yieldLow.toFixed(1)}&ndash;{d.yieldHigh.toFixed(1)}%
          </span>
        </span>
        <span>
          Growth:{" "}
          <span
            style={{
              color:
                d.growth1y > 0
                  ? "#22c55e"
                  : d.growth1y < 0
                    ? "#ef4444"
                    : "var(--gray-12)",
            }}
          >
            {d.growth1y > 0 ? "+" : ""}
            {d.growth1y.toFixed(1)}%
          </span>
        </span>
        <span>
          Trend:{" "}
          <span style={{ color: "var(--gray-12)" }}>
            {TREND_ICON[d.trend]} {d.trend}
          </span>
        </span>
      </div>
    </div>
  );
}

/* ── component ─────────────────────────────────────────────────────────────── */

export function YieldTreemap() {
  const [metric, setMetric] = useState<SizeMetric>("price");
  const data = buildTreeData(metric);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "16px 8px 12px",
      }}
    >
      {/* metric toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 4,
          marginBottom: 16,
        }}
      >
        {METRIC_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setMetric(opt.key)}
            style={{
              padding: "5px 14px",
              fontSize: 13,
              fontWeight: metric === opt.key ? 600 : 400,
              borderRadius: 6,
              border:
                metric === opt.key
                  ? "1px solid rgba(255,255,255,0.2)"
                  : "1px solid rgba(255,255,255,0.08)",
              background:
                metric === opt.key
                  ? "rgba(255,255,255,0.1)"
                  : "transparent",
              color:
                metric === opt.key
                  ? "var(--gray-12)"
                  : "var(--gray-9)",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* treemap */}
      <ResponsiveContainer width="100%" height={450}>
        <Treemap
          data={data}
          dataKey="size"
          nameKey="name"
          stroke="rgba(255,255,255,0.1)"
          content={<CustomCell __metric={metric} />}
          isAnimationActive={false}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>

      {/* tier legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          flexWrap: "wrap",
          paddingTop: 12,
        }}
      >
        {TIERS.map((tier) => (
          <span
            key={tier}
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
                borderRadius: 3,
                background: TIER_COLOR[tier],
                opacity: 0.8,
                flexShrink: 0,
              }}
            />
            {TIER_LABEL[tier]}
          </span>
        ))}
      </div>
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ELIZABETH_LINE, type ElizabethLineStation } from "@/lib/london-data";

/* ── Computed averages ─────────────────────────────────────────────────── */

const avgGrowth =
  ELIZABETH_LINE.reduce((s, st) => s + st.growthYoY, 0) /
  ELIZABETH_LINE.length;

const avgRentalUplift =
  ELIZABETH_LINE.reduce((s, st) => s + st.rentalUpliftPct, 0) /
  ELIZABETH_LINE.length;

/* ── Custom tooltip ────────────────────────────────────────────────────── */

type TooltipPayloadEntry = {
  payload: ElizabethLineStation;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
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
        minWidth: 200,
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--gray-12)" }}>
        {d.name}
      </p>
      <p style={{ margin: 0, color: "var(--gray-9)" }}>{d.borough}</p>
      <p style={{ margin: 0, color: "#8b5cf6" }}>
        Price Growth: +{d.growthYoY}% YoY
      </p>
      <p style={{ margin: 0, color: "#14b8a6" }}>
        Rental Uplift: {d.rentalUplift} since 2022
      </p>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function ElizabethLineChart() {
  const sorted = [...ELIZABETH_LINE].sort((a, b) => b.growthYoY - a.growthYoY);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Grouped bar chart ───────────────────────────────────────── */}
      <section
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: "20px 16px 8px",
        }}
      >
        <h3
          style={{
            margin: "0 0 4px 0",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--gray-12)",
          }}
        >
          Elizabeth Line Price Impact
        </h3>
        <p
          style={{
            margin: "0 0 16px 0",
            fontSize: 13,
            color: "var(--gray-9)",
          }}
        >
          YoY price growth vs rental uplift at Crossrail stations since 2022
        </p>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={sorted}
            margin={{ top: 8, right: 16, bottom: 56, left: 0 }}
          >
            <XAxis
              dataKey="name"
              angle={-35}
              textAnchor="end"
              interval={0}
              tick={{ fontSize: 11, fill: "var(--gray-11)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--gray-11)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: 12, color: "var(--gray-11)" }}
            />
            <Bar
              dataKey="growthYoY"
              name="Price Growth YoY"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              dataKey="rentalUpliftPct"
              name="Rental Uplift Since 2022"
              fill="#14b8a6"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* ── Station cards grid ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {sorted.map((s) => (
          <div
            key={s.name}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: "14px 16px",
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
              {s.name}
            </p>
            <p
              style={{
                margin: "2px 0 10px",
                fontSize: 12,
                color: "var(--gray-9)",
              }}
            >
              {s.borough}
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background: "rgba(34,197,94,0.12)",
                  color: "#22c55e",
                }}
              >
                +{s.growthYoY}% YoY
              </span>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background: "rgba(20,184,166,0.12)",
                  color: "#14b8a6",
                }}
              >
                {s.rentalUplift} rent
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Key insight box ──────────────────────────────────────────── */}
      <div
        style={{
          background: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 10,
          padding: "16px 20px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--gray-12)",
          }}
        >
          Elizabeth Line stations have driven an average{" "}
          <strong style={{ color: "#8b5cf6" }}>
            +{avgGrowth.toFixed(1)}%
          </strong>{" "}
          price growth YoY and{" "}
          <strong style={{ color: "#14b8a6" }}>
            +{Math.round(avgRentalUplift)}%
          </strong>{" "}
          rental uplift since opening in 2022. Ealing Broadway leads with +9.0%
          growth.
        </p>
      </div>
    </div>
  );
}

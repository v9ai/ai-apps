"use client";

import { useState } from "react";
import { Badge, Box, Flex, Text } from "@radix-ui/themes";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type CashFlowYear = {
  year: number;
  gross_rent: number;
  vacancy_loss: number;
  effective_rent: number;
  management_cost: number;
  maintenance_cost: number;
  insurance: number;
  tax: number;
  total_expenses: number;
  noi: number;
  debt_service: number;
  cash_flow: number;
  cumulative_cash_flow: number;
  property_value: number;
  equity: number;
  total_return: number;
};

type CashFlowSummary = {
  total_investment: number;
  irr: number | null;
  cash_on_cash_year1: number;
  equity_multiple: number;
  breakeven_month: number | null;
  avg_annual_return_pct: number;
};

type CashFlowProjection = {
  years: CashFlowYear[];
  summary: CashFlowSummary;
};

const S = {
  glass: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: "24px 28px",
  },
  secLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: "var(--gray-8)",
    marginBottom: 16,
  } as React.CSSProperties,
  metricTile: {
    textAlign: "center" as const,
    padding: "16px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "var(--gray-8)",
    marginBottom: 6,
  } as React.CSSProperties,
  metricValue: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums" as const,
    lineHeight: 1.1,
  } as React.CSSProperties,
  metricSub: { fontSize: 11, color: "var(--gray-8)", marginTop: 4 },
};

const GRID_STROKE = "rgba(255,255,255,0.06)";
const AXIS_COLOR = "var(--gray-8)";

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(0)}k`
      : String(n);

const tooltipStyle = {
  backgroundColor: "rgba(20,20,30,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 12,
};

type Tab = "growth" | "income";

export function CashFlowChart({ data }: { data: CashFlowProjection }) {
  const [tab, setTab] = useState<Tab>("growth");
  const { years, summary } = data;

  const lineData = years.map((y) => ({
    name: `Yr ${y.year}`,
    "Cumulative CF": y.cumulative_cash_flow,
    "Property Value": y.property_value,
    Equity: y.equity,
    "Total Return": y.total_return,
  }));

  const barData = years.map((y) => ({
    name: `Yr ${y.year}`,
    "Effective Rent": y.effective_rent,
    Expenses: y.total_expenses,
    "Debt Service": y.debt_service,
    "Net Cash Flow": y.cash_flow,
  }));

  return (
    <Flex direction="column" gap="5">
      {/* Summary metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 12,
        }}
      >
        <MetricTile
          label="IRR"
          value={summary.irr != null ? `${summary.irr.toFixed(1)}%` : "N/A"}
          color={
            summary.irr != null && summary.irr > 8
              ? "var(--green-9)"
              : summary.irr != null && summary.irr > 4
                ? "var(--amber-9)"
                : "var(--red-9)"
          }
        />
        <MetricTile
          label="Cash on Cash Y1"
          value={`${summary.cash_on_cash_year1.toFixed(1)}%`}
          color={
            summary.cash_on_cash_year1 > 6
              ? "var(--green-9)"
              : summary.cash_on_cash_year1 > 3
                ? "var(--amber-9)"
                : "var(--red-9)"
          }
        />
        <MetricTile
          label="Equity Multiple"
          value={`${summary.equity_multiple.toFixed(2)}x`}
          color={
            summary.equity_multiple > 2
              ? "var(--green-9)"
              : summary.equity_multiple > 1.5
                ? "var(--amber-9)"
                : "var(--red-9)"
          }
        />
        <MetricTile
          label="Breakeven"
          value={
            summary.breakeven_month != null
              ? `${summary.breakeven_month} mo`
              : "N/A"
          }
          sub={
            summary.breakeven_month != null
              ? `${(summary.breakeven_month / 12).toFixed(1)} years`
              : undefined
          }
        />
        <MetricTile
          label="Avg Annual Return"
          value={`${summary.avg_annual_return_pct.toFixed(1)}%`}
          color={
            summary.avg_annual_return_pct > 8
              ? "var(--green-9)"
              : "var(--iris-9)"
          }
        />
        <MetricTile
          label="Total Investment"
          value={`\u20AC${summary.total_investment.toLocaleString()}`}
        />
      </div>

      {/* Tab selector */}
      <Flex gap="2">
        <TabButton active={tab === "growth"} onClick={() => setTab("growth")}>
          Growth
        </TabButton>
        <TabButton active={tab === "income"} onClick={() => setTab("income")}>
          Income vs Expenses
        </TabButton>
      </Flex>

      {/* Charts */}
      <div style={S.glass}>
        <div style={S.secLabel}>
          {tab === "growth"
            ? "Cumulative Cash Flow, Property Value & Equity"
            : "Annual Income vs Expenses"}
        </div>
        <ResponsiveContainer width="100%" height={340}>
          {tab === "growth" ? (
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="name"
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_STROKE }}
              />
              <YAxis
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_STROKE }}
                tickFormatter={fmt}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `\u20AC${Number(v).toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line
                type="monotone"
                dataKey="Cumulative CF"
                stroke="var(--green-9)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Property Value"
                stroke="var(--blue-9)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Equity"
                stroke="var(--iris-9)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Total Return"
                stroke="var(--amber-9)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          ) : (
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                dataKey="name"
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_STROKE }}
              />
              <YAxis
                tick={{ fill: AXIS_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_STROKE }}
                tickFormatter={fmt}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `\u20AC${Number(v).toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar
                dataKey="Effective Rent"
                fill="var(--green-9)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Expenses"
                fill="var(--red-9)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Debt Service"
                fill="var(--amber-9)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Net Cash Flow"
                fill="var(--iris-9)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Year-by-year table */}
      <div style={S.glass}>
        <div style={S.secLabel}>Year-by-Year Breakdown</div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <thead>
              <tr>
                {[
                  "Year",
                  "Gross Rent",
                  "NOI",
                  "Debt Service",
                  "Cash Flow",
                  "Cumulative",
                  "Prop Value",
                  "Equity",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "right",
                      padding: "8px 10px",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--gray-8)",
                      fontWeight: 600,
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year}>
                  {[
                    y.year,
                    y.gross_rent,
                    y.noi,
                    y.debt_service,
                    y.cash_flow,
                    y.cumulative_cash_flow,
                    y.property_value,
                    y.equity,
                  ].map((v, i) => (
                    <td
                      key={i}
                      style={{
                        textAlign: "right",
                        padding: "7px 10px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        color:
                          i >= 4 && typeof v === "number" && v < 0
                            ? "var(--red-9)"
                            : "var(--gray-11)",
                      }}
                    >
                      {i === 0
                        ? v
                        : `\u20AC${(v as number).toLocaleString()}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Flex>
  );
}

function MetricTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div style={S.metricTile}>
      <div style={S.metricLabel}>{label}</div>
      <div style={{ ...S.metricValue, color: color || "var(--gray-12)" }}>
        {value}
      </div>
      {sub && <div style={S.metricSub}>{sub}</div>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px",
        borderRadius: 8,
        border: "1px solid",
        borderColor: active ? "var(--iris-9)" : "rgba(255,255,255,0.08)",
        background: active ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
        color: active ? "var(--iris-11)" : "var(--gray-9)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

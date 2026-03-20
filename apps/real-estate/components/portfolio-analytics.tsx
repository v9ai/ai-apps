"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Topbar } from "@/components/topbar";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AllocationItem {
  label: string;
  count: number;
  total_value: number;
  percentage: number;
}

interface YieldDistribution {
  bucket: string;
  count: number;
}

interface PortfolioSummary {
  total_value: number;
  total_items: number;
  avg_yield: number | null;
  avg_score: number | null;
  avg_deviation: number | null;
  allocation_by_city: AllocationItem[];
  allocation_by_verdict: AllocationItem[];
  yield_distribution: YieldDistribution[];
  best_performer: { url: string; label: string | null; score: number; yield: number | null } | null;
  worst_performer: { url: string; label: string | null; score: number; yield: number | null } | null;
}

interface PerformancePoint {
  date: string;
  total_value: number;
  avg_price_per_m2: number;
}

interface PortfolioPerformance {
  data_points: PerformancePoint[];
  value_change_pct: number | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ANALYZER_URL = process.env.NEXT_PUBLIC_ANALYZER_URL ?? "http://localhost:8005";

const PIE_COLORS = [
  "var(--iris-9)",
  "var(--green-9)",
  "var(--amber-9)",
  "var(--red-9)",
  "var(--blue-9)",
  "var(--pink-9)",
  "var(--teal-9)",
  "var(--orange-9)",
];

const VERDICT_COLORS: Record<string, string> = {
  undervalued: "#22c55e",
  fair: "#6366f1",
  overvalued: "#ef4444",
  unknown: "#6b7280",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtEur(n: number): string {
  if (n >= 1_000_000) return `\u20AC${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `\u20AC${(n / 1_000).toFixed(0)}K`;
  return `\u20AC${n.toLocaleString()}`;
}

function scoreColor(score: number): string {
  if (score >= 7) return "var(--green-9)";
  if (score >= 5) return "var(--amber-9)";
  return "var(--red-9)";
}

/* ------------------------------------------------------------------ */
/*  Glass Card                                                         */
/* ------------------------------------------------------------------ */

function GlassCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 24,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "var(--gray-12)",
          letterSpacing: "-0.01em",
          margin: "0 0 16px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 160,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "var(--gray-7)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: accent ?? "var(--gray-12)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--gray-7)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.85)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
        color: "var(--gray-12)",
      }}
    >
      {label && <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} style={{ color: "var(--gray-10)" }}>
          {entry.name}: {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function PortfolioAnalytics() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, perfRes] = await Promise.all([
        fetch(`${ANALYZER_URL}/portfolio/analytics`),
        fetch(`${ANALYZER_URL}/portfolio/performance`),
      ]);
      if (!summaryRes.ok) throw new Error(`Analytics: HTTP ${summaryRes.status}`);
      if (!perfRes.ok) throw new Error(`Performance: HTTP ${perfRes.status}`);
      const [summaryData, perfData] = await Promise.all([summaryRes.json(), perfRes.json()]);
      setSummary(summaryData);
      setPerformance(perfData);
    } catch {
      setError("Failed to load portfolio analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <Topbar />
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 64px" }}>
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gray-7)", fontSize: 13 }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: "2px solid var(--gray-4)",
                borderTopColor: "var(--accent-9)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            Loading analytics...
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div>
        <Topbar />
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 64px" }}>
          <div
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              padding: "14px 18px",
              fontSize: 12,
              color: "var(--red-9)",
            }}
          >
            {error ?? "No analytics data available."}
          </div>
        </div>
      </div>
    );
  }

  // Prepare scatter data: score vs deviation
  const scatterData = summary.allocation_by_city.length > 0
    ? summary.allocation_by_city.map((c) => ({
        name: c.label,
        count: c.count,
        value: c.total_value,
      }))
    : [];

  return (
    <div>
      <Topbar />
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 64px" }}>
        {/* Header */}
        <div style={{ marginBottom: 4 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--gray-12)",
              margin: 0,
            }}
          >
            Portfolio Analytics
          </h1>
          <p style={{ fontSize: 13, color: "var(--gray-8)", margin: "4px 0 24px" }}>
            Aggregated insights across your tracked listings.
          </p>
        </div>

        {/* Summary cards row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <StatCard
            label="Total Value"
            value={fmtEur(summary.total_value)}
            sub={`${summary.total_items} listing${summary.total_items !== 1 ? "s" : ""}`}
          />
          <StatCard
            label="Weighted Avg Yield"
            value={summary.avg_yield != null ? `${summary.avg_yield.toFixed(1)}%` : "--"}
            sub={summary.avg_yield != null ? (summary.avg_yield >= 6 ? "Strong" : summary.avg_yield >= 4 ? "Moderate" : "Low") : "No data"}
            accent={summary.avg_yield != null ? (summary.avg_yield >= 6 ? "var(--green-9)" : summary.avg_yield >= 4 ? "var(--amber-9)" : "var(--red-9)") : undefined}
          />
          <StatCard
            label="Avg Score"
            value={summary.avg_score != null ? summary.avg_score.toFixed(1) : "--"}
            sub={summary.avg_score != null ? (summary.avg_score >= 7 ? "Strong" : summary.avg_score >= 5 ? "Moderate" : "Weak") : "No data"}
            accent={summary.avg_score != null ? scoreColor(summary.avg_score) : undefined}
          />
          <StatCard
            label="Avg Deviation"
            value={summary.avg_deviation != null ? `${summary.avg_deviation > 0 ? "+" : ""}${summary.avg_deviation.toFixed(1)}%` : "--"}
            sub={summary.avg_deviation != null ? (summary.avg_deviation < -5 ? "Below market" : summary.avg_deviation > 5 ? "Above market" : "Near market") : "No data"}
            accent={summary.avg_deviation != null ? (summary.avg_deviation < -5 ? "var(--green-9)" : summary.avg_deviation > 5 ? "var(--red-9)" : "var(--gray-9)") : undefined}
          />
        </div>

        {/* Charts grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Pie Chart: allocation by city */}
          <GlassCard title="Allocation by City">
            {summary.allocation_by_city.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--gray-7)", fontSize: 12 }}>
                No data
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={summary.allocation_by_city}
                      dataKey="total_value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      strokeWidth={0}
                    >
                      {summary.allocation_by_city.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  {summary.allocation_by_city.map((item, i) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: PIE_COLORS[i % PIE_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 11, color: "var(--gray-11)" }}>{item.label}</span>
                      <span style={{ fontSize: 10, color: "var(--gray-7)", fontVariantNumeric: "tabular-nums" }}>
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Bar Chart: yield distribution */}
          <GlassCard title="Yield Distribution">
            {summary.yield_distribution.every((d) => d.count === 0) ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--gray-7)", fontSize: 12 }}>
                No yield data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.yield_distribution} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="bucket" tick={{ fill: "var(--gray-8)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--gray-8)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="count" name="Listings" radius={[4, 4, 0, 0]}>
                    {summary.yield_distribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Scatter: value by city */}
          <GlassCard title="City Value vs Count">
            {scatterData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--gray-7)", fontSize: 12 }}>
                No data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="count" name="Listings" tick={{ fill: "var(--gray-8)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="value" name="Value" tick={{ fill: "var(--gray-8)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtEur(v)} />
                  <Tooltip content={<DarkTooltip />} />
                  <Scatter data={scatterData} fill="var(--iris-9)" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </GlassCard>

          {/* Verdict allocation pie */}
          <GlassCard title="Allocation by Verdict">
            {summary.allocation_by_verdict.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--gray-7)", fontSize: 12 }}>
                No data
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={summary.allocation_by_verdict}
                      dataKey="total_value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      strokeWidth={0}
                    >
                      {summary.allocation_by_verdict.map((item) => (
                        <Cell key={item.label} fill={VERDICT_COLORS[item.label] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  {summary.allocation_by_verdict.map((item) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: VERDICT_COLORS[item.label] ?? "#6b7280",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 11, color: "var(--gray-11)", textTransform: "capitalize" }}>{item.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-12)", fontVariantNumeric: "tabular-nums" }}>
                        {item.count}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--gray-7)" }}>({item.percentage.toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Best / Worst performers */}
        {(summary.best_performer || summary.worst_performer) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {summary.best_performer && (
              <div
                style={{
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.15)",
                  borderRadius: 14,
                  padding: "18px 20px",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#22c55e", marginBottom: 8 }}>
                  Best Performer
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gray-12)", marginBottom: 4 }}>
                  {summary.best_performer.label ?? "Unlabeled"}
                </div>
                <div style={{ fontSize: 12, color: "var(--gray-9)" }}>
                  Score: {summary.best_performer.score.toFixed(1)}
                  {summary.best_performer.yield != null && ` | Yield: ${summary.best_performer.yield.toFixed(1)}%`}
                </div>
              </div>
            )}
            {summary.worst_performer && (
              <div
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: 14,
                  padding: "18px 20px",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#ef4444", marginBottom: 8 }}>
                  Worst Performer
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--gray-12)", marginBottom: 4 }}>
                  {summary.worst_performer.label ?? "Unlabeled"}
                </div>
                <div style={{ fontSize: 12, color: "var(--gray-9)" }}>
                  Score: {summary.worst_performer.score.toFixed(1)}
                  {summary.worst_performer.yield != null && ` | Yield: ${summary.worst_performer.yield.toFixed(1)}%`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance over time */}
        {performance && performance.data_points.length > 0 && (
          <GlassCard title={`Portfolio Value Over Time${performance.value_change_pct != null ? ` (${performance.value_change_pct > 0 ? "+" : ""}${performance.value_change_pct.toFixed(1)}%)` : ""}`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={performance.data_points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: "var(--gray-8)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--gray-8)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtEur(v)} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="total_value" name="Total Value" fill="var(--iris-9)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        )}

        {/* Responsive override */}
        <style>{`
          @media (max-width: 768px) {
            div[style*="grid-template-columns: 1fr 1fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

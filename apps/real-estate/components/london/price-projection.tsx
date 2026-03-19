"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  BOROUGHS,
  TIER_COLOR,
  TIER_LABEL,
  fmt,
  fmtGBP,
  type Borough,
} from "@/lib/london-data";

/* ── Constants ─────────────────────────────────────────────────────────────── */

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030] as const;

const DEFAULT_BOROUGHS = [
  "Hackney",
  "Newham",
  "Greenwich",
  "Ealing",
  "Tower Hamlets",
];

type Scenario = "conservative" | "baseline" | "optimistic";
type Metric = "total" | "perm2";

const SCENARIO_MULTIPLIER: Record<Scenario, number> = {
  conservative: 0.5,
  baseline: 1.0,
  optimistic: 1.5,
};

const SCENARIO_LABELS: Record<Scenario, string> = {
  conservative: "Conservative",
  baseline: "Baseline",
  optimistic: "Optimistic",
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function compound(base: number, rate: number, years: number): number {
  return base * Math.pow(1 + rate / 100, years);
}

function growthColor(pct: number): string {
  if (pct >= 25) return "#22c55e";
  if (pct >= 15) return "#f59e0b";
  return "#ef4444";
}

function fmtYAxis(v: number): string {
  if (v >= 1_000_000) return `\u00A3${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `\u00A3${Math.round(v / 1000)}K`;
  return `\u00A3${Math.round(v)}`;
}

/* ── Custom Tooltip ────────────────────────────────────────────────────────── */

function ProjectionTooltip({
  active,
  payload,
  label,
  selectedBoroughs,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: number;
  selectedBoroughs: Borough[];
  metric: Metric;
}) {
  if (!active || !payload?.length || label === undefined) return null;

  // Filter out area data keys — only show the baseline lines
  const lines = payload.filter(
    (p) => !p.dataKey.endsWith("_high") && !p.dataKey.endsWith("_low")
  );

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-xs shadow-xl">
      <p className="mb-2 font-semibold text-zinc-200">{label}</p>
      {lines.map((entry) => {
        const borough = selectedBoroughs.find((b) => b.name === entry.dataKey);
        if (!borough) return null;
        const base =
          metric === "total" ? borough.avgPrice : borough.avgPricePerM2;
        const yearsFromBase = label - 2025;
        const cumGrowth =
          yearsFromBase === 0
            ? 0
            : ((entry.value - base) / base) * 100;
        return (
          <p
            key={entry.dataKey}
            className="flex items-center gap-2"
            style={{ color: entry.color }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-zinc-300">{entry.dataKey}:</span>{" "}
            {fmtGBP(Math.round(entry.value))}
            {yearsFromBase > 0 && (
              <span className="ml-1 text-zinc-500">
                ({cumGrowth > 0 ? "+" : ""}
                {cumGrowth.toFixed(1)}%)
              </span>
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────────────── */

export function PriceProjection() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_BOROUGHS);
  const [scenario, setScenario] = useState<Scenario>("baseline");
  const [metric, setMetric] = useState<Metric>("total");

  const toggle = (name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= 6) return prev;
      return [...prev, name];
    });
  };

  const selectedBoroughs = useMemo(
    () => BOROUGHS.filter((b) => selected.includes(b.name)),
    [selected]
  );

  /* ── Chart data: one row per year ─────────────────────────────────── */
  const chartData = useMemo(() => {
    return YEARS.map((year) => {
      const n = year - 2025;
      const row: Record<string, number> = { year };

      selectedBoroughs.forEach((b) => {
        const base = metric === "total" ? b.avgPrice : b.avgPricePerM2;
        const rateBaseline = b.growth1y * SCENARIO_MULTIPLIER[scenario];
        const rateCons = b.growth1y * SCENARIO_MULTIPLIER.conservative;
        const rateOpt = b.growth1y * SCENARIO_MULTIPLIER.optimistic;

        row[b.name] = compound(base, rateBaseline, n);
        row[`${b.name}_low`] = compound(base, rateCons, n);
        row[`${b.name}_high`] = compound(base, rateOpt, n);
      });

      return row;
    });
  }, [selectedBoroughs, scenario, metric]);

  /* ── Summary table data ───────────────────────────────────────────── */
  const summaryData = useMemo(() => {
    return selectedBoroughs
      .map((b) => {
        const base = metric === "total" ? b.avgPrice : b.avgPricePerM2;
        const rate = b.growth1y * SCENARIO_MULTIPLIER[scenario];
        const projected = compound(base, rate, 5);
        const growthPct = ((projected - base) / base) * 100;
        const cagr = (Math.pow(projected / base, 1 / 5) - 1) * 100;
        return {
          name: b.name,
          tier: b.tier,
          base,
          projected,
          growthPct,
          cagr,
        };
      })
      .sort((a, b) => b.growthPct - a.growthPct);
  }, [selectedBoroughs, scenario, metric]);

  /* ── Key insight ──────────────────────────────────────────────────── */
  const topBorough = summaryData[0];

  return (
    <section className="space-y-6">
      {/* ── Controls ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6">
        <h3 className="mb-1 text-lg font-semibold text-zinc-100">
          5-Year Price Projection
        </h3>
        <p className="mb-5 text-sm text-zinc-400">
          Compound growth projection based on current annual growth rates.
          Select up to 6 boroughs.
        </p>

        {/* Borough pills */}
        <div className="mb-5 flex flex-wrap gap-2">
          {BOROUGHS.map((b) => {
            const isSelected = selected.includes(b.name);
            return (
              <button
                key={b.name}
                onClick={() => toggle(b.name)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? "text-white shadow-md"
                    : "border border-white/10 bg-zinc-800 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                } ${
                  !isSelected && selected.length >= 6
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer"
                }`}
                style={
                  isSelected
                    ? { backgroundColor: TIER_COLOR[b.tier] }
                    : undefined
                }
                disabled={!isSelected && selected.length >= 6}
              >
                {b.name}
              </button>
            );
          })}
        </div>

        {/* Scenario + Metric toggles */}
        <div className="mb-6 flex flex-wrap items-center gap-6">
          {/* Scenario */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Scenario:</span>
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {(Object.keys(SCENARIO_LABELS) as Scenario[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    scenario === s
                      ? "bg-zinc-700 text-zinc-100"
                      : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {SCENARIO_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Metric */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Metric:</span>
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              <button
                onClick={() => setMetric("total")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  metric === "total"
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Total Price
              </button>
              <button
                onClick={() => setMetric("perm2")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  metric === "perm2"
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Price per m2
              </button>
            </div>
          </div>
        </div>

        {/* ── Chart ───────────────────────────────────────────────── */}
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 20, bottom: 8, left: 16 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="year"
              tick={{ fill: "#a1a1aa", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickFormatter={fmtYAxis}
              width={70}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <Tooltip
              content={
                <ProjectionTooltip
                  selectedBoroughs={selectedBoroughs}
                  metric={metric}
                />
              }
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12, color: "#d4d4d8" }}
            />

            {selectedBoroughs.map((b) => (
              <Area
                key={`${b.name}_band`}
                dataKey={`${b.name}_high`}
                baseValue="dataMin"
                type="monotone"
                fill={TIER_COLOR[b.tier]}
                fillOpacity={0.1}
                stroke="none"
                legendType="none"
                name={`${b.name} range`}
                activeDot={false}
              />
            ))}

            {selectedBoroughs.map((b) => (
              <Area
                key={`${b.name}_band_low`}
                dataKey={`${b.name}_low`}
                baseValue="dataMin"
                type="monotone"
                fill="var(--gray-2, #1c1c1e)"
                fillOpacity={1}
                stroke="none"
                legendType="none"
                name={`${b.name} range low`}
                activeDot={false}
              />
            ))}

            {selectedBoroughs.map((b) => (
              <Line
                key={b.name}
                dataKey={b.name}
                type="monotone"
                stroke={TIER_COLOR[b.tier]}
                strokeWidth={2}
                dot={{ r: 3, fill: TIER_COLOR[b.tier] }}
                activeDot={{ r: 5 }}
                name={b.name}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Key Insight ─────────────────────────────────────────────── */}
      {topBorough && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: TIER_COLOR[topBorough.tier],
                color: "#fff",
              }}
            >
              1
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                Top Projected Appreciation
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                At current growth rates, <span className="font-semibold text-zinc-200">{topBorough.name}</span> could
                see a{" "}
                <span
                  className="font-semibold"
                  style={{ color: growthColor(topBorough.growthPct) }}
                >
                  {topBorough.growthPct.toFixed(1)}%
                </span>{" "}
                price increase by 2030, from{" "}
                <span className="text-zinc-300">
                  {fmtGBP(Math.round(topBorough.base))}
                </span>{" "}
                to{" "}
                <span className="text-zinc-300">
                  {fmtGBP(Math.round(topBorough.projected))}
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Table ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6">
        <h3 className="mb-4 text-sm font-semibold text-zinc-200">
          Projection Summary ({SCENARIO_LABELS[scenario]})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-zinc-500">
                <th className="pb-2 pr-4 font-medium">Borough</th>
                <th className="pb-2 pr-4 text-right font-medium">
                  Current {metric === "total" ? "Price" : "/m2"}
                </th>
                <th className="pb-2 pr-4 text-right font-medium">
                  2030 Projected
                </th>
                <th className="pb-2 pr-4 text-right font-medium">5Y Growth</th>
                <th className="pb-2 text-right font-medium">Annual CAGR</th>
              </tr>
            </thead>
            <tbody>
              {summaryData.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: TIER_COLOR[row.tier] }}
                      />
                      <span className="text-zinc-300">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-zinc-400">
                    {fmtGBP(Math.round(row.base))}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-zinc-300">
                    {fmtGBP(Math.round(row.projected))}
                  </td>
                  <td
                    className="py-2.5 pr-4 text-right font-medium"
                    style={{ color: growthColor(row.growthPct) }}
                  >
                    +{row.growthPct.toFixed(1)}%
                  </td>
                  <td
                    className="py-2.5 text-right font-medium"
                    style={{ color: growthColor(row.growthPct) }}
                  >
                    {row.cagr.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

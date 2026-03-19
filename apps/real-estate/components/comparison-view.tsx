"use client";

// ---------------------------------------------------------------------------
// ComparisonView — side-by-side investment comparison with SVG radar chart
// ---------------------------------------------------------------------------

interface ComparisonItem {
  url: string;
  city: string;
  zone: string;
  price_eur: number;
  price_per_m2: number;
  rooms: number;
  size_m2: number;
  condition: string;
  deviation_pct: number;
  investment_score: number;
  verdict: string;
  rental_yield_pct: number | null;
  score_breakdown: {
    price_score: number;
    location_score: number;
    condition_score: number;
    market_score: number;
  } | null;
}

interface ComparisonViewProps {
  items: ComparisonItem[]; // 2-4 items
}

// -- Palette ----------------------------------------------------------------

const ITEM_COLORS = [
  { fill: "rgba(59,130,246,0.25)", stroke: "#3b82f6", text: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/40", dot: "#3b82f6", label: "blue" },
  { fill: "rgba(34,197,94,0.20)", stroke: "#22c55e", text: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/40", dot: "#22c55e", label: "green" },
  { fill: "rgba(245,158,11,0.20)", stroke: "#f59e0b", text: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/40", dot: "#f59e0b", label: "amber" },
  { fill: "rgba(168,85,247,0.20)", stroke: "#a855f7", text: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/40", dot: "#a855f7", label: "purple" },
];

// -- Formatting helpers -----------------------------------------------------

function fmtEur(v: number): string {
  return "\u20AC" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtPct(v: number, showSign = false): string {
  const sign = showSign && v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function fmtScore(v: number): string {
  return v.toFixed(1);
}

// -- Radar chart helpers ----------------------------------------------------

const AXES = ["Price", "Location", "Condition", "Market"] as const;
const AXIS_KEYS: readonly (keyof NonNullable<ComparisonItem["score_breakdown"]>)[] = [
  "price_score",
  "location_score",
  "condition_score",
  "market_score",
];

function scoreToPoint(
  axisIndex: number,
  score: number,
  cx: number,
  cy: number,
  radius: number,
): [number, number] {
  const angle = (Math.PI * 2 * axisIndex) / AXES.length - Math.PI / 2;
  const r = (score / 10) * radius;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function RadarChart({ items }: { items: ComparisonItem[] }) {
  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 140;
  const gridLevels = [2, 4, 6, 8, 10];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[380px] mx-auto"
      role="img"
      aria-label="Radar chart comparing listing scores"
    >
      {/* Grid rings */}
      {gridLevels.map((level) => {
        const points = AXES.map((_, i) => scoreToPoint(i, level, cx, cy, radius));
        return (
          <polygon
            key={`grid-${level}`}
            points={points.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke="#374151"
            strokeWidth={level === 10 ? 1.5 : 0.5}
            strokeDasharray={level === 10 ? undefined : "3,3"}
          />
        );
      })}

      {/* Axis lines */}
      {AXES.map((_, i) => {
        const [ex, ey] = scoreToPoint(i, 10, cx, cy, radius);
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={ex}
            y2={ey}
            stroke="#4b5563"
            strokeWidth={0.75}
          />
        );
      })}

      {/* Data polygons */}
      {items.map((item, idx) => {
        if (!item.score_breakdown) return null;
        const color = ITEM_COLORS[idx % ITEM_COLORS.length];
        const points = AXIS_KEYS.map((key, ai) =>
          scoreToPoint(ai, item.score_breakdown![key], cx, cy, radius),
        );
        return (
          <g key={idx}>
            <polygon
              points={points.map(([x, y]) => `${x},${y}`).join(" ")}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={2}
            />
            {points.map(([x, y], pi) => (
              <circle
                key={pi}
                cx={x}
                cy={y}
                r={3.5}
                fill={color.dot}
                stroke="#111827"
                strokeWidth={1}
              />
            ))}
          </g>
        );
      })}

      {/* Axis labels */}
      {AXES.map((label, i) => {
        const [lx, ly] = scoreToPoint(i, 11.8, cx, cy, radius);
        return (
          <text
            key={`label-${i}`}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#9ca3af"
            fontSize={12}
            fontWeight={600}
          >
            {label}
          </text>
        );
      })}

      {/* Grid level numbers */}
      {gridLevels.map((level) => {
        const [, y] = scoreToPoint(0, level, cx, cy, radius);
        return (
          <text
            key={`num-${level}`}
            x={cx + 8}
            y={y}
            fill="#6b7280"
            fontSize={9}
            dominantBaseline="central"
          >
            {level}
          </text>
        );
      })}
    </svg>
  );
}

// -- Winner logic -----------------------------------------------------------

type WinnerCategory = {
  title: string;
  winnerIdx: number;
  value: string;
};

function computeWinners(items: ComparisonItem[]): WinnerCategory[] {
  const winners: WinnerCategory[] = [];

  // Best Value -- lowest deviation_pct
  const bestValueIdx = items.reduce((best, item, i) =>
    item.deviation_pct < items[best].deviation_pct ? i : best, 0);
  winners.push({
    title: "Best Value",
    winnerIdx: bestValueIdx,
    value: fmtPct(items[bestValueIdx].deviation_pct, true),
  });

  // Best Investment -- highest investment_score
  const bestInvestIdx = items.reduce((best, item, i) =>
    item.investment_score > items[best].investment_score ? i : best, 0);
  winners.push({
    title: "Best Investment",
    winnerIdx: bestInvestIdx,
    value: `${fmtScore(items[bestInvestIdx].investment_score)}/10`,
  });

  // Best Yield
  const yieldItems = items.filter((it) => it.rental_yield_pct != null);
  if (yieldItems.length > 0) {
    const bestYieldIdx = items.reduce((best, item, i) => {
      if (item.rental_yield_pct == null) return best;
      if (best === -1) return i;
      return item.rental_yield_pct > (items[best].rental_yield_pct ?? 0) ? i : best;
    }, -1);
    if (bestYieldIdx >= 0) {
      winners.push({
        title: "Best Yield",
        winnerIdx: bestYieldIdx,
        value: fmtPct(items[bestYieldIdx].rental_yield_pct!),
      });
    }
  }

  // Best Location
  const locItems = items.filter((it) => it.score_breakdown != null);
  if (locItems.length > 0) {
    const bestLocIdx = items.reduce((best, item, i) => {
      if (!item.score_breakdown) return best;
      if (best === -1) return i;
      return item.score_breakdown.location_score > (items[best].score_breakdown?.location_score ?? 0) ? i : best;
    }, -1);
    if (bestLocIdx >= 0) {
      winners.push({
        title: "Best Location",
        winnerIdx: bestLocIdx,
        value: `${fmtScore(items[bestLocIdx].score_breakdown!.location_score)}/10`,
      });
    }
  }

  // Best Condition
  const condItems = items.filter((it) => it.score_breakdown != null);
  if (condItems.length > 0) {
    const bestCondIdx = items.reduce((best, item, i) => {
      if (!item.score_breakdown) return best;
      if (best === -1) return i;
      return item.score_breakdown.condition_score > (items[best].score_breakdown?.condition_score ?? 0) ? i : best;
    }, -1);
    if (bestCondIdx >= 0) {
      winners.push({
        title: "Best Condition",
        winnerIdx: bestCondIdx,
        value: `${fmtScore(items[bestCondIdx].score_breakdown!.condition_score)}/10`,
      });
    }
  }

  return winners;
}

/** Determine overall best: which property index wins the most categories */
function computeOverallBest(items: ComparisonItem[]): { idx: number; wins: number; total: number } {
  const winners = computeWinners(items);
  const tally = new Map<number, number>();
  for (const w of winners) {
    tally.set(w.winnerIdx, (tally.get(w.winnerIdx) ?? 0) + 1);
  }
  let bestIdx = 0;
  let bestCount = 0;
  for (const [idx, count] of tally) {
    if (count > bestCount) {
      bestIdx = idx;
      bestCount = count;
    }
  }
  return { idx: bestIdx, wins: bestCount, total: winners.length };
}

// -- Metric bars ------------------------------------------------------------

type MetricDef = {
  label: string;
  unit: string;
  getValue: (item: ComparisonItem) => number | null;
  /** "low" = lower is better, "high" = higher is better */
  bestIs: "low" | "high";
  format: (v: number) => string;
};

const METRICS: MetricDef[] = [
  {
    label: "Price / m\u00B2",
    unit: "\u20AC",
    getValue: (it) => it.price_per_m2,
    bestIs: "low",
    format: (v) => fmtEur(v),
  },
  {
    label: "Deviation",
    unit: "%",
    getValue: (it) => it.deviation_pct,
    bestIs: "low",
    format: (v) => fmtPct(v, true),
  },
  {
    label: "Investment Score",
    unit: "/10",
    getValue: (it) => it.investment_score,
    bestIs: "high",
    format: (v) => fmtScore(v),
  },
  {
    label: "Rental Yield",
    unit: "%",
    getValue: (it) => it.rental_yield_pct,
    bestIs: "high",
    format: (v) => fmtPct(v),
  },
  {
    label: "Size",
    unit: "m\u00B2",
    getValue: (it) => it.size_m2,
    bestIs: "high",
    format: (v) => `${v} m\u00B2`,
  },
];

function MetricBars({ metric, items }: { metric: MetricDef; items: ComparisonItem[] }) {
  const values = items.map((it) => metric.getValue(it));
  const nonNull = values.filter((v): v is number => v != null);
  if (nonNull.length === 0) return null;

  const absMax = Math.max(...nonNull.map(Math.abs), 1);
  const bestVal = metric.bestIs === "low" ? Math.min(...nonNull) : Math.max(...nonNull);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {metric.label}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const v = values[idx];
          if (v == null) return (
            <div key={idx} className="flex items-center gap-2 h-6">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ITEM_COLORS[idx % ITEM_COLORS.length].dot }} />
              <span className="text-xs text-gray-600">N/A</span>
            </div>
          );
          const pct = Math.min(100, (Math.abs(v) / absMax) * 100);
          const isWinner = v === bestVal;
          const color = ITEM_COLORS[idx % ITEM_COLORS.length];

          return (
            <div key={idx} className="flex items-center gap-2 h-6">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color.dot }} />
              <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden relative">
                <div
                  className="h-full rounded transition-all duration-300"
                  style={{
                    width: `${Math.max(pct, 4)}%`,
                    backgroundColor: isWinner ? color.stroke : `${color.stroke}66`,
                  }}
                />
              </div>
              <span className={`text-xs font-mono w-24 text-right shrink-0 tabular-nums ${isWinner ? "text-white font-bold" : "text-gray-400"}`}>
                {metric.format(v)}
                {isWinner && " \u2713"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Verdict helpers --------------------------------------------------------

function verdictColor(verdict: string): string {
  if (verdict === "undervalued") return "text-green-400";
  if (verdict === "overvalued") return "text-red-400";
  return "text-blue-400";
}

function verdictBg(verdict: string): string {
  if (verdict === "undervalued") return "bg-green-500/15 border-green-500/30";
  if (verdict === "overvalued") return "bg-red-500/15 border-red-500/30";
  return "bg-blue-500/15 border-blue-500/30";
}

// -- Side-by-side table helpers ---------------------------------------------

/**
 * Determines the "winner" column index for a numeric metric row.
 * Returns -1 if there are fewer than 2 valid values.
 */
function findWinnerIdx(
  items: ComparisonItem[],
  getValue: (it: ComparisonItem) => number | null,
  bestIs: "low" | "high",
): number {
  const vals = items.map(getValue);
  const nonNull = vals.map((v, i) => (v != null ? { v, i } : null)).filter(Boolean) as { v: number; i: number }[];
  if (nonNull.length < 2) return -1;
  if (bestIs === "low") {
    return nonNull.reduce((best, cur) => (cur.v < best.v ? cur : best)).i;
  }
  return nonNull.reduce((best, cur) => (cur.v > best.v ? cur : best)).i;
}

/**
 * Color for a cell value relative to the winner.
 * Winner = green, worst = red, middle = default gray.
 */
function cellWinnerClass(idx: number, winnerIdx: number, isWorst: boolean): string {
  if (winnerIdx < 0) return "text-gray-300";
  if (idx === winnerIdx) return "text-green-400 font-semibold";
  if (isWorst) return "text-red-400";
  return "text-gray-300";
}

function findWorstIdx(
  items: ComparisonItem[],
  getValue: (it: ComparisonItem) => number | null,
  bestIs: "low" | "high",
): number {
  const vals = items.map(getValue);
  const nonNull = vals.map((v, i) => (v != null ? { v, i } : null)).filter(Boolean) as { v: number; i: number }[];
  if (nonNull.length < 2) return -1;
  if (bestIs === "low") {
    return nonNull.reduce((best, cur) => (cur.v > best.v ? cur : best)).i;
  }
  return nonNull.reduce((best, cur) => (cur.v < best.v ? cur : best)).i;
}

// -- Section header ---------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <tr>
      <td
        colSpan={100}
        className="px-4 pt-5 pb-2"
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            {title}
          </span>
          <span className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent" />
        </div>
      </td>
    </tr>
  );
}

// -- Comparison table row ---------------------------------------------------

function ComparisonRow({
  label,
  items,
  render,
  getValue,
  bestIs,
  colorFn,
}: {
  label: string;
  items: ComparisonItem[];
  render: (item: ComparisonItem) => string;
  getValue?: (item: ComparisonItem) => number | null;
  bestIs?: "low" | "high";
  colorFn?: (item: ComparisonItem, idx: number, winnerIdx: number, worstIdx: number) => string;
}) {
  const winnerIdx = getValue && bestIs ? findWinnerIdx(items, getValue, bestIs) : -1;
  const worstIdx = getValue && bestIs ? findWorstIdx(items, getValue, bestIs) : -1;

  return (
    <tr className="group hover:bg-white/[0.02] transition-colors">
      <td className="text-xs text-gray-500 font-medium px-4 py-2.5 whitespace-nowrap w-40">
        {label}
      </td>
      {items.map((item, idx) => {
        let cls = "text-gray-300";
        if (colorFn) {
          cls = colorFn(item, idx, winnerIdx, worstIdx);
        } else if (winnerIdx >= 0) {
          cls = cellWinnerClass(idx, winnerIdx, idx === worstIdx);
        }

        return (
          <td
            key={idx}
            className={`px-4 py-2.5 text-sm tabular-nums ${cls} ${
              idx === winnerIdx ? "relative" : ""
            }`}
          >
            <span className="flex items-center gap-1.5">
              {render(item)}
              {idx === winnerIdx && (
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] shrink-0"
                  style={{
                    backgroundColor: `${ITEM_COLORS[idx % ITEM_COLORS.length].stroke}22`,
                    color: ITEM_COLORS[idx % ITEM_COLORS.length].stroke,
                  }}
                  title="Best"
                  aria-label="Winner"
                >
                  {"\u2713"}
                </span>
              )}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

// -- Main Component ---------------------------------------------------------

export function ComparisonView({ items }: ComparisonViewProps) {
  if (items.length < 2) return null;

  const winners = computeWinners(items);
  const hasRadarData = items.some((it) => it.score_breakdown != null);
  const overall = computeOverallBest(items);
  const overallColor = ITEM_COLORS[overall.idx % ITEM_COLORS.length];

  return (
    <div className="w-full space-y-6">

      {/* -- Best Overall banner ------------------------------------------- */}
      <div
        className="relative overflow-hidden rounded-xl border px-5 py-4"
        style={{
          borderColor: `${overallColor.stroke}40`,
          background: `linear-gradient(135deg, ${overallColor.stroke}12, ${overallColor.stroke}06)`,
        }}
      >
        <div className="flex items-center gap-4">
          {/* Trophy circle */}
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full shrink-0 text-lg"
            style={{
              backgroundColor: `${overallColor.stroke}20`,
              color: overallColor.stroke,
              boxShadow: `0 0 20px ${overallColor.stroke}15`,
            }}
          >
            {"\u2B50"}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
              Best Overall
            </div>
            <div className="text-lg font-bold text-white tracking-tight">
              {items[overall.idx].zone || items[overall.idx].city}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Wins {overall.wins} of {overall.total} categories &middot;{" "}
              Score {fmtScore(items[overall.idx].investment_score)}/10 &middot;{" "}
              {items[overall.idx].verdict.charAt(0).toUpperCase() + items[overall.idx].verdict.slice(1)}
            </div>
          </div>
          {/* Verdict pill */}
          <div className="ml-auto shrink-0">
            <span
              className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${verdictBg(items[overall.idx].verdict)} ${verdictColor(items[overall.idx].verdict)}`}
            >
              {items[overall.idx].verdict.charAt(0).toUpperCase() + items[overall.idx].verdict.slice(1)}
            </span>
          </div>
        </div>
        {/* Decorative glow */}
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ backgroundColor: overallColor.stroke }}
        />
      </div>

      {/* -- Legend --------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {items.map((item, idx) => {
          const color = ITEM_COLORS[idx % ITEM_COLORS.length];
          const isOverall = idx === overall.idx;
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all ${color.bg} ${color.border} ${
                isOverall ? "ring-1 ring-white/20" : ""
              }`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: color.dot }}
              />
              <span className={`text-sm font-medium ${color.text}`}>
                {item.zone || item.city}
              </span>
              <span className="text-xs text-gray-500 tabular-nums">
                {item.rooms}r / {item.size_m2}m\u00B2
              </span>
              {isOverall && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 border border-gray-600 rounded px-1.5 py-0.5 ml-1">
                  Best
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* -- Winner badges -------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {winners.map((w) => {
          const color = ITEM_COLORS[w.winnerIdx % ITEM_COLORS.length];
          return (
            <div
              key={w.title}
              className={`rounded-lg border px-3 py-2.5 text-center ${color.bg} ${color.border}`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                {w.title}
              </div>
              <div className={`text-sm font-bold ${color.text}`}>
                {items[w.winnerIdx].zone || items[w.winnerIdx].city}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 tabular-nums">{w.value}</div>
            </div>
          );
        })}
      </div>

      {/* -- Radar chart ---------------------------------------------------- */}
      {hasRadarData && (
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 text-center mb-2 uppercase tracking-wide">
            Score Breakdown
          </h3>
          <RadarChart items={items} />
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {items.map((item, idx) => {
              const color = ITEM_COLORS[idx % ITEM_COLORS.length];
              return (
                <div key={idx} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color.dot }}
                  />
                  <span className="text-xs text-gray-400">
                    {item.zone || item.city}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -- Metric comparison bars ----------------------------------------- */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">
          Metric Comparison
        </h3>
        {METRICS.map((m) => (
          <MetricBars key={m.label} metric={m} items={items} />
        ))}
      </div>

      {/* -- Side-by-side details table ------------------------------------- */}
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">

            {/* Sticky column headers */}
            <thead className="sticky top-0 z-10">
              <tr
                className="border-b border-gray-700/50"
                style={{ backgroundColor: "rgba(17, 24, 39, 0.95)", backdropFilter: "blur(8px)" }}
              >
                <th className="text-left text-xs text-gray-500 font-medium px-4 py-3 w-40">
                  Metric
                </th>
                {items.map((item, idx) => {
                  const color = ITEM_COLORS[idx % ITEM_COLORS.length];
                  const isOverall = idx === overall.idx;
                  return (
                    <th
                      key={idx}
                      className="text-left px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color.dot }}
                        />
                        <span className={`text-xs font-semibold ${color.text}`}>
                          {item.zone || item.city}
                        </span>
                        {isOverall && (
                          <span
                            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${color.stroke}20`,
                              color: color.stroke,
                            }}
                          >
                            Best
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-normal mt-0.5 tabular-nums">
                        {fmtEur(item.price_eur)} &middot; {item.rooms}r &middot; {item.size_m2}m&sup2;
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-800/40">

              {/* ---- Property Details ---- */}
              <SectionHeader title="Property Details" />

              <ComparisonRow
                label="City"
                items={items}
                render={(it) => it.city}
              />
              <ComparisonRow
                label="Zone"
                items={items}
                render={(it) => it.zone || "\u2014"}
              />
              <ComparisonRow
                label="Price"
                items={items}
                render={(it) => fmtEur(it.price_eur)}
                getValue={(it) => it.price_eur}
                bestIs="low"
              />
              <ComparisonRow
                label="Price / m\u00B2"
                items={items}
                render={(it) => fmtEur(it.price_per_m2)}
                getValue={(it) => it.price_per_m2}
                bestIs="low"
              />
              <ComparisonRow
                label="Size"
                items={items}
                render={(it) => `${it.size_m2} m\u00B2`}
                getValue={(it) => it.size_m2}
                bestIs="high"
              />
              <ComparisonRow
                label="Rooms"
                items={items}
                render={(it) => String(it.rooms)}
                getValue={(it) => it.rooms}
                bestIs="high"
              />
              <ComparisonRow
                label="Condition"
                items={items}
                render={(it) => it.condition}
              />

              {/* ---- Valuation ---- */}
              <SectionHeader title="Valuation" />

              <ComparisonRow
                label="Deviation"
                items={items}
                render={(it) => fmtPct(it.deviation_pct, true)}
                getValue={(it) => it.deviation_pct}
                bestIs="low"
                colorFn={(it, idx, winnerIdx, worstIdx) => {
                  if (winnerIdx >= 0 && idx === winnerIdx) return "text-green-400 font-semibold";
                  if (it.deviation_pct > 5) return "text-red-400";
                  if (it.deviation_pct < -5) return "text-green-400";
                  return "text-gray-300";
                }}
              />
              <ComparisonRow
                label="Verdict"
                items={items}
                render={(it) => it.verdict.charAt(0).toUpperCase() + it.verdict.slice(1)}
                colorFn={(it) => verdictColor(it.verdict)}
              />

              {/* ---- Investment Metrics ---- */}
              <SectionHeader title="Investment Metrics" />

              <ComparisonRow
                label="Inv. Score"
                items={items}
                render={(it) => `${fmtScore(it.investment_score)} / 10`}
                getValue={(it) => it.investment_score}
                bestIs="high"
                colorFn={(it, idx, winnerIdx) => {
                  if (winnerIdx >= 0 && idx === winnerIdx) return "text-green-400 font-semibold";
                  if (it.investment_score >= 7) return "text-green-400";
                  if (it.investment_score < 5) return "text-red-400";
                  return "text-gray-300";
                }}
              />
              <ComparisonRow
                label="Rental Yield"
                items={items}
                render={(it) =>
                  it.rental_yield_pct != null ? fmtPct(it.rental_yield_pct) : "\u2014"
                }
                getValue={(it) => it.rental_yield_pct}
                bestIs="high"
                colorFn={(it, idx, winnerIdx) => {
                  if (it.rental_yield_pct == null) return "text-gray-600";
                  if (winnerIdx >= 0 && idx === winnerIdx) return "text-green-400 font-semibold";
                  if (it.rental_yield_pct >= 6) return "text-green-400";
                  if (it.rental_yield_pct < 4) return "text-red-400";
                  return "text-gray-300";
                }}
              />

              {/* ---- Score Breakdown ---- */}
              <SectionHeader title="Score Breakdown" />

              <ComparisonRow
                label="Price Score"
                items={items}
                render={(it) =>
                  it.score_breakdown ? fmtScore(it.score_breakdown.price_score) : "\u2014"
                }
                getValue={(it) => it.score_breakdown?.price_score ?? null}
                bestIs="high"
              />
              <ComparisonRow
                label="Location Score"
                items={items}
                render={(it) =>
                  it.score_breakdown ? fmtScore(it.score_breakdown.location_score) : "\u2014"
                }
                getValue={(it) => it.score_breakdown?.location_score ?? null}
                bestIs="high"
              />
              <ComparisonRow
                label="Condition Score"
                items={items}
                render={(it) =>
                  it.score_breakdown ? fmtScore(it.score_breakdown.condition_score) : "\u2014"
                }
                getValue={(it) => it.score_breakdown?.condition_score ?? null}
                bestIs="high"
              />
              <ComparisonRow
                label="Market Score"
                items={items}
                render={(it) =>
                  it.score_breakdown ? fmtScore(it.score_breakdown.market_score) : "\u2014"
                }
                getValue={(it) => it.score_breakdown?.market_score ?? null}
                bestIs="high"
              />

              {/* ---- Link row ---- */}
              <tr>
                <td className="text-xs text-gray-500 font-medium px-4 py-2.5">Link</td>
                {items.map((item, idx) => (
                  <td key={idx} className="px-4 py-2.5">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all"
                    >
                      Open listing
                    </a>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -- Detail row helper (kept for backward compat if needed externally) ------

function DetailRow({
  label,
  items,
  render,
  colorFn,
}: {
  label: string;
  items: ComparisonItem[];
  render: (item: ComparisonItem) => string;
  colorFn?: (item: ComparisonItem) => string;
}) {
  return (
    <tr>
      <td className="text-xs text-gray-500 font-medium px-4 py-2">{label}</td>
      {items.map((item, idx) => (
        <td
          key={idx}
          className={`px-4 py-2 text-sm ${colorFn ? colorFn(item) : "text-gray-300"}`}
        >
          {render(item)}
        </td>
      ))}
    </tr>
  );
}

export type { ComparisonItem, ComparisonViewProps };

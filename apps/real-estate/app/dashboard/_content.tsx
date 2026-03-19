"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Types (mirrors _content.tsx in analyzer)                          */
/* ------------------------------------------------------------------ */

type Listing = {
  title: string;
  price_eur: number | null;
  size_m2: number | null;
  price_per_m2: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  zone: string | null;
  city: string;
  condition: string;
  features: string[];
  parking_included: boolean | null;
  parking_price_eur: number | null;
};

type Valuation = {
  verdict: "undervalued" | "fair" | "overvalued";
  confidence: number;
  fair_value_eur_per_m2: number | null;
  price_deviation_pct: number | null;
  investment_score: number | null;
  recommendation: string | null;
};

export type AnalysisRow = {
  url: string;
  source: string;
  listing: Listing;
  valuation: Valuation;
  analyzed_at: string;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

type SortKey =
  | "city"
  | "title"
  | "price"
  | "price_m2"
  | "rooms"
  | "deviation"
  | "score"
  | "verdict"
  | "confidence"
  | "recommendation"
  | "date";

type SortDir = "asc" | "desc";

const VERDICT_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  undervalued: { bg: "rgba(34,197,94,0.10)", text: "#4ade80", border: "rgba(34,197,94,0.22)", dot: "#22c55e" },
  fair:        { bg: "rgba(234,179,8,0.10)",  text: "#facc15", border: "rgba(234,179,8,0.22)",  dot: "#eab308" },
  overvalued:  { bg: "rgba(239,68,68,0.10)",  text: "#f87171", border: "rgba(239,68,68,0.22)",  dot: "#ef4444" },
};

const VERDICT_LABEL: Record<string, string> = {
  undervalued: "UNDER",
  fair: "FAIR",
  overvalued: "OVER",
};

const REC_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  strong_buy:  { text: "#34d399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.20)" },
  buy:         { text: "#4ade80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.20)" },
  hold:        { text: "#facc15", bg: "rgba(250,204,21,0.10)", border: "rgba(250,204,21,0.20)" },
  sell:        { text: "#fb923c", bg: "rgba(251,146,60,0.10)", border: "rgba(251,146,60,0.20)" },
  strong_sell: { text: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.20)" },
};

const REC_LABEL: Record<string, string> = {
  strong_buy: "STRONG BUY",
  buy: "BUY",
  hold: "HOLD",
  sell: "SELL",
  strong_sell: "STRONG SELL",
};

function fmt(n: number | null | undefined): string {
  if (n == null) return "--";
  return n.toLocaleString("en-US");
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "--";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DashboardContent({ rows }: { rows: AnalysisRow[] }) {
  /* --- filter state --- */
  const [cityFilter, setCityFilter] = useState("all");
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [recFilter, setRecFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [roomsFilter, setRoomsFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  /* --- sort state --- */
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* --- derived data --- */
  const cities = useMemo(() => {
    const set = new Set(rows.map((r) => r.listing.city).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const roomOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.listing.rooms).filter((r): r is number => r != null));
    return Array.from(set).sort((a, b) => a - b);
  }, [rows]);

  const recommendations = useMemo(() => {
    const set = new Set(rows.map((r) => r.valuation.recommendation).filter((r): r is string => r != null));
    return Array.from(set).sort();
  }, [rows]);

  /* --- filtering --- */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (cityFilter !== "all" && r.listing.city !== cityFilter) return false;
      if (verdictFilter !== "all" && r.valuation.verdict !== verdictFilter) return false;
      if (recFilter !== "all" && r.valuation.recommendation !== recFilter) return false;
      if (minPrice && r.listing.price_eur != null && r.listing.price_eur < Number(minPrice))
        return false;
      if (maxPrice && r.listing.price_eur != null && r.listing.price_eur > Number(maxPrice))
        return false;
      if (roomsFilter !== "all" && r.listing.rooms !== Number(roomsFilter)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const title = r.listing.title?.toLowerCase() ?? "";
        const zone = r.listing.zone?.toLowerCase() ?? "";
        const city = r.listing.city?.toLowerCase() ?? "";
        if (!title.includes(q) && !zone.includes(q) && !city.includes(q)) return false;
      }
      return true;
    });
  }, [rows, cityFilter, verdictFilter, recFilter, minPrice, maxPrice, roomsFilter, searchQuery]);

  /* --- sorting --- */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      switch (sortKey) {
        case "city":
          va = `${a.listing.city} ${a.listing.zone ?? ""}`;
          vb = `${b.listing.city} ${b.listing.zone ?? ""}`;
          break;
        case "title":
          va = a.listing.title?.toLowerCase() ?? "";
          vb = b.listing.title?.toLowerCase() ?? "";
          break;
        case "price":
          va = a.listing.price_eur ?? 0;
          vb = b.listing.price_eur ?? 0;
          break;
        case "price_m2":
          va = a.listing.price_per_m2 ?? 0;
          vb = b.listing.price_per_m2 ?? 0;
          break;
        case "rooms":
          va = a.listing.rooms ?? 0;
          vb = b.listing.rooms ?? 0;
          break;
        case "deviation":
          va = a.valuation.price_deviation_pct ?? 0;
          vb = b.valuation.price_deviation_pct ?? 0;
          break;
        case "score":
          va = a.valuation.investment_score ?? 0;
          vb = b.valuation.investment_score ?? 0;
          break;
        case "verdict": {
          const order = { undervalued: 0, fair: 1, overvalued: 2 };
          va = order[a.valuation.verdict] ?? 1;
          vb = order[b.valuation.verdict] ?? 1;
          break;
        }
        case "confidence":
          va = a.valuation.confidence ?? 0;
          vb = b.valuation.confidence ?? 0;
          break;
        case "recommendation": {
          const recOrder: Record<string, number> = { strong_buy: 0, buy: 1, hold: 2, sell: 3, strong_sell: 4 };
          va = recOrder[a.valuation.recommendation ?? ""] ?? 5;
          vb = recOrder[b.valuation.recommendation ?? ""] ?? 5;
          break;
        }
        case "date":
          va = a.analyzed_at;
          vb = b.analyzed_at;
          break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  /* --- KPI stats --- */
  const kpis = useMemo(() => {
    const total = filtered.length;

    const scores = filtered
      .map((r) => r.valuation.investment_score)
      .filter((s): s is number => s != null);
    const avgScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : null;

    const undervalued = filtered.filter((r) => r.valuation.verdict === "undervalued").length;
    const fair = filtered.filter((r) => r.valuation.verdict === "fair").length;
    const overvalued = filtered.filter((r) => r.valuation.verdict === "overvalued").length;

    const deviations = filtered
      .map((r) => r.valuation.price_deviation_pct)
      .filter((d): d is number => d != null);
    const avgDeviation = deviations.length
      ? deviations.reduce((s, v) => s + v, 0) / deviations.length
      : null;

    const prices = filtered
      .map((r) => r.listing.price_per_m2)
      .filter((p): p is number => p != null);
    const avgPriceM2 = prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : null;

    const bestScore = scores.length ? Math.max(...scores) : null;

    return { total, avgScore, undervalued, fair, overvalued, avgDeviation, avgPriceM2, bestScore };
  }, [filtered]);

  /* --- date range --- */
  const dateRange = useMemo(() => {
    if (rows.length === 0) return null;
    const dates = rows.map((r) => new Date(r.analyzed_at).getTime()).filter((d) => !isNaN(d));
    if (dates.length === 0) return null;
    const earliest = new Date(Math.min(...dates));
    const latest = new Date(Math.max(...dates));
    const fmtDate = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${fmtDate(earliest)} -- ${fmtDate(latest)}`;
  }, [rows]);

  /* --- active filters count --- */
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (cityFilter !== "all") c++;
    if (verdictFilter !== "all") c++;
    if (recFilter !== "all") c++;
    if (minPrice) c++;
    if (maxPrice) c++;
    if (roomsFilter !== "all") c++;
    if (searchQuery) c++;
    return c;
  }, [cityFilter, verdictFilter, recFilter, minPrice, maxPrice, roomsFilter, searchQuery]);

  /* --- sort toggle --- */
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  function SortHeader({ label, col, align }: { label: string; col: SortKey; align?: "center" | "right" }) {
    const active = sortKey === col;
    return (
      <th
        onClick={() => toggleSort(col)}
        style={{
          cursor: "pointer",
          userSelect: "none",
          whiteSpace: "nowrap",
          padding: "10px 12px",
          textAlign: align ?? "left",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: active ? "#e2e8f0" : "rgba(148,163,184,0.7)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.4)",
          position: "sticky",
          top: 0,
          zIndex: 2,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <span style={{
            display: "inline-flex",
            flexDirection: "column",
            fontSize: 8,
            lineHeight: 1,
            gap: 0,
            opacity: active ? 1 : 0.3,
          }}>
            <span style={{ color: active && sortDir === "asc" ? "#818cf8" : "rgba(148,163,184,0.5)" }}>
              {"\u25B2"}
            </span>
            <span style={{ color: active && sortDir === "desc" ? "#818cf8" : "rgba(148,163,184,0.5)" }}>
              {"\u25BC"}
            </span>
          </span>
        </span>
      </th>
    );
  }

  /* --- shared styles --- */
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#e2e8f0",
    padding: "6px 10px",
    fontSize: 12,
    outline: "none",
    minWidth: 0,
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none" as const,
    paddingRight: 26,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
  };

  /* --- verdict distribution bar --- */
  const verdictTotal = kpis.undervalued + kpis.fair + kpis.overvalued;
  const underPct = verdictTotal ? (kpis.undervalued / verdictTotal) * 100 : 0;
  const fairPct = verdictTotal ? (kpis.fair / verdictTotal) * 100 : 0;
  const overPct = verdictTotal ? (kpis.overvalued / verdictTotal) * 100 : 0;

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh" }}>
      {/* ---- Topbar ---- */}
      <div className="yc-topbar">
        <Link href="/">
          <span className="yc-topbar-logo" />
          REAL ESTATE AI RESEARCH
        </Link>
        <Link href="/analyzer">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Analyzer</span>
        </Link>
        <Link href="/dashboard">
          <span style={{ fontSize: 13, color: "var(--accent-11)" }}>Dashboard</span>
        </Link>
        <Link href="/trends">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Trends</span>
        </Link>
        <Link href="/portfolio">
          <span style={{ fontSize: 13, opacity: 0.7 }}>Portfolio</span>
        </Link>
      </div>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "28px 24px 64px" }}>

        {/* ---- Header ---- */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                margin: "0 0 4px",
                color: "#f1f5f9",
              }}
            >
              Market Dashboard
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "rgba(148,163,184,0.7)" }}>
                {rows.length} listing{rows.length !== 1 ? "s" : ""} analyzed
              </span>
              {dateRange && (
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(148,163,184,0.5)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {dateRange}
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", fontVariantNumeric: "tabular-nums" }}>
            {sorted.length !== rows.length && (
              <span>Showing {sorted.length} of {rows.length}</span>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/*  KPI CARDS                                                       */}
        {/* ================================================================ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Total Listings */}
          <KpiCard
            label="Total Listings"
            value={String(kpis.total)}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
            }
            accentColor="#818cf8"
          />

          {/* Avg Investment Score */}
          <KpiCard
            label="Avg Investment Score"
            value={kpis.avgScore != null ? kpis.avgScore.toFixed(1) : "--"}
            suffix="/10"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            }
            accentColor={
              kpis.avgScore != null
                ? kpis.avgScore >= 7 ? "#4ade80" : kpis.avgScore >= 5 ? "#facc15" : "#f87171"
                : "#a78bfa"
            }
          />

          {/* Verdict Distribution */}
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(148,163,184,0.6)" }}>
                Verdict Split
              </span>
            </div>
            {/* Stacked bar */}
            <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 8, background: "rgba(255,255,255,0.04)" }}>
              {underPct > 0 && <div style={{ width: `${underPct}%`, background: "#22c55e", transition: "width 0.3s" }} />}
              {fairPct > 0 && <div style={{ width: `${fairPct}%`, background: "#eab308", transition: "width 0.3s" }} />}
              {overPct > 0 && <div style={{ width: `${overPct}%`, background: "#ef4444", transition: "width 0.3s" }} />}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "#4ade80", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {kpis.undervalued}
                <span style={{ fontWeight: 400, color: "rgba(74,222,128,0.6)", marginLeft: 3, fontSize: 10 }}>under</span>
              </span>
              <span style={{ color: "#facc15", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {kpis.fair}
                <span style={{ fontWeight: 400, color: "rgba(250,204,21,0.6)", marginLeft: 3, fontSize: 10 }}>fair</span>
              </span>
              <span style={{ color: "#f87171", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {kpis.overvalued}
                <span style={{ fontWeight: 400, color: "rgba(248,113,113,0.6)", marginLeft: 3, fontSize: 10 }}>over</span>
              </span>
            </div>
          </div>

          {/* Avg Deviation % */}
          <KpiCard
            label="Avg Price Deviation"
            value={kpis.avgDeviation != null ? `${kpis.avgDeviation > 0 ? "+" : ""}${kpis.avgDeviation.toFixed(1)}%` : "--"}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
              </svg>
            }
            accentColor={
              kpis.avgDeviation != null
                ? kpis.avgDeviation < -3 ? "#4ade80" : kpis.avgDeviation > 3 ? "#f87171" : "#facc15"
                : "#94a3b8"
            }
          />

          {/* Avg Price/m2 */}
          <KpiCard
            label="Avg Price / m\u00B2"
            value={kpis.avgPriceM2 != null ? `\u20AC${Math.round(kpis.avgPriceM2).toLocaleString()}` : "--"}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
            accentColor="#818cf8"
          />
        </div>

        {/* ================================================================ */}
        {/*  FILTER BAR                                                      */}
        {/* ================================================================ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            padding: "10px 14px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            marginBottom: 16,
          }}
        >
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            color: "rgba(148,163,184,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginRight: 4,
          }}>
            Filters
          </span>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search title, zone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, width: 190, paddingLeft: 26 }}
            />
          </div>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)", margin: "0 2px" }} />

          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Verdicts</option>
            <option value="undervalued">Undervalued</option>
            <option value="fair">Fair</option>
            <option value="overvalued">Overvalued</option>
          </select>

          <select value={recFilter} onChange={(e) => setRecFilter(e.target.value)} style={selectStyle}>
            <option value="all">All Signals</option>
            {recommendations.map((r) => (
              <option key={r} value={r}>{REC_LABEL[r] ?? r}</option>
            ))}
          </select>

          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)", margin: "0 2px" }} />

          <input
            type="number"
            placeholder="Min \u20AC"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            style={{ ...inputStyle, width: 90 }}
          />
          <span style={{ fontSize: 11, color: "rgba(148,163,184,0.3)" }}>{"\u2013"}</span>
          <input
            type="number"
            placeholder="Max \u20AC"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            style={{ ...inputStyle, width: 90 }}
          />

          <select value={roomsFilter} onChange={(e) => setRoomsFilter(e.target.value)} style={selectStyle}>
            <option value="all">Rooms</option>
            {roomOptions.map((r) => <option key={r} value={r}>{r}R</option>)}
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setCityFilter("all");
                setVerdictFilter("all");
                setRecFilter("all");
                setMinPrice("");
                setMaxPrice("");
                setRoomsFilter("all");
                setSearchQuery("");
              }}
              style={{
                background: "rgba(129,140,248,0.08)",
                border: "1px solid rgba(129,140,248,0.15)",
                borderRadius: 6,
                color: "#818cf8",
                fontSize: 11,
                fontWeight: 600,
                padding: "5px 10px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* ================================================================ */}
        {/*  TABLE                                                           */}
        {/* ================================================================ */}
        {sorted.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              color: "rgba(148,163,184,0.5)",
              fontSize: 13,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div>No listings match the current filters.</div>
          </div>
        ) : (
          <div
            style={{
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
              background: "rgba(0,0,0,0.2)",
            }}
          >
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
                    <SortHeader label="Title" col="title" />
                    <SortHeader label="City / Zone" col="city" />
                    <SortHeader label="Price (\u20AC)" col="price" align="right" />
                    <SortHeader label="\u20AC/m\u00B2" col="price_m2" align="right" />
                    <SortHeader label="Rms" col="rooms" align="center" />
                    <SortHeader label="Dev %" col="deviation" align="right" />
                    <SortHeader label="Score" col="score" align="center" />
                    <SortHeader label="Verdict" col="verdict" align="center" />
                    <SortHeader label="Signal" col="recommendation" align="center" />
                    <SortHeader label="Conf" col="confidence" align="center" />
                    <SortHeader label="Date" col="date" />
                    <th
                      style={{
                        padding: "10px 12px",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "rgba(148,163,184,0.5)",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: "rgba(0,0,0,0.4)",
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        width: 40,
                      }}
                    />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => {
                    const v = row.valuation;
                    const l = row.listing;
                    const vs = VERDICT_STYLES[v.verdict] ?? VERDICT_STYLES.fair;
                    const devColor =
                      v.price_deviation_pct != null
                        ? v.price_deviation_pct < -5
                          ? "#4ade80"
                          : v.price_deviation_pct > 5
                            ? "#f87171"
                            : "rgba(226,232,240,0.7)"
                        : "rgba(148,163,184,0.4)";
                    const scoreColor =
                      v.investment_score != null
                        ? v.investment_score >= 7
                          ? "#4ade80"
                          : v.investment_score >= 5
                            ? "#facc15"
                            : "#f87171"
                        : "rgba(148,163,184,0.4)";
                    const rc = REC_COLORS[v.recommendation ?? ""] ?? null;

                    const rowBg = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";

                    return (
                      <tr
                        key={`${row.url}-${i}`}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: rowBg,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "rgba(129,140,248,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = rowBg;
                        }}
                      >
                        {/* Title */}
                        <td
                          style={{
                            padding: "9px 12px",
                            maxWidth: 240,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "#e2e8f0",
                            fontWeight: 500,
                            fontSize: 12,
                          }}
                          title={l.title}
                        >
                          {l.title || "--"}
                        </td>
                        {/* City / Zone */}
                        <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 12 }}>
                            {l.city}
                          </span>
                          {l.zone && (
                            <span style={{ color: "rgba(148,163,184,0.5)", marginLeft: 5, fontSize: 11 }}>
                              {l.zone}
                            </span>
                          )}
                        </td>
                        {/* Price */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            fontWeight: 600,
                            color: "#e2e8f0",
                          }}
                        >
                          {l.price_eur != null ? fmt(l.price_eur) : "--"}
                        </td>
                        {/* Price/m2 */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            color: "rgba(226,232,240,0.7)",
                          }}
                        >
                          {l.price_per_m2 != null ? fmt(Math.round(l.price_per_m2)) : "--"}
                        </td>
                        {/* Rooms */}
                        <td style={{ padding: "9px 12px", textAlign: "center", color: "rgba(226,232,240,0.7)" }}>
                          {l.rooms ?? "--"}
                        </td>
                        {/* Deviation */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "right",
                            color: devColor,
                            fontWeight: 600,
                          }}
                        >
                          {fmtPct(v.price_deviation_pct)}
                        </td>
                        {/* Score */}
                        <td
                          style={{
                            padding: "9px 12px",
                            textAlign: "center",
                            fontWeight: 700,
                            color: scoreColor,
                          }}
                        >
                          {v.investment_score != null ? v.investment_score.toFixed(1) : "--"}
                        </td>
                        {/* Verdict */}
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 4,
                              background: vs.bg,
                              color: vs.text,
                              border: `1px solid ${vs.border}`,
                              letterSpacing: "0.06em",
                            }}
                          >
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: vs.dot,
                              boxShadow: `0 0 6px ${vs.dot}`,
                              flexShrink: 0,
                            }} />
                            {VERDICT_LABEL[v.verdict] ?? v.verdict}
                          </span>
                        </td>
                        {/* Recommendation */}
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          {v.recommendation && rc ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "3px 7px",
                                borderRadius: 4,
                                background: rc.bg,
                                color: rc.text,
                                border: `1px solid ${rc.border}`,
                                letterSpacing: "0.04em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {REC_LABEL[v.recommendation] ?? v.recommendation}
                            </span>
                          ) : (
                            <span style={{ color: "rgba(148,163,184,0.3)", fontSize: 11 }}>--</span>
                          )}
                        </td>
                        {/* Confidence */}
                        <td style={{ padding: "9px 12px", textAlign: "center" }}>
                          {v.confidence != null ? (
                            <span style={{ color: "rgba(148,163,184,0.6)", fontSize: 11 }}>
                              {(v.confidence * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span style={{ color: "rgba(148,163,184,0.3)" }}>--</span>
                          )}
                        </td>
                        {/* Date */}
                        <td
                          style={{
                            padding: "9px 12px",
                            fontSize: 11,
                            color: "rgba(148,163,184,0.5)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(row.analyzed_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        {/* View link */}
                        <td style={{ padding: "9px 12px" }}>
                          <Link
                            href={`/analyzer?url=${encodeURIComponent(row.url)}`}
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#818cf8",
                              textDecoration: "none",
                              transition: "color 0.15s",
                              opacity: 0.8,
                            }}
                          >
                            {"\u2192"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Table footer */}
            <div
              style={{
                padding: "8px 14px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(0,0,0,0.3)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "rgba(148,163,184,0.4)" }}>
                {sorted.length} row{sorted.length !== 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: 10, color: "rgba(148,163,184,0.25)", letterSpacing: "0.04em" }}>
                SORT: {sortKey.toUpperCase()} {sortDir === "asc" ? "\u25B2" : "\u25BC"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================ */
/*  KPI Card                                                        */
/* ================================================================ */

function KpiCard({
  label,
  value,
  suffix,
  icon,
  accentColor,
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "rgba(148,163,184,0.6)",
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: accentColor,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {suffix && (
          <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(148,163,184,0.4)" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
